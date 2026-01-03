"""A `dlt` pipeline to ingest data from the Salling Group Food Waste API.

This pipeline fetches heavily discounted food items nearing expiration dates
from Danish stores (Føtex, Netto, Bilka) via the Salling Group API.

API Documentation: https://developer.sallinggroup.com/api-reference
"""

import logging
import time
from typing import Any, Iterator

import dlt
from dlt.sources.helpers.rest_client import RESTClient
from dlt.sources.helpers.rest_client.paginators import SinglePagePaginator
from loguru import logger


class InterceptHandler(logging.Handler):
    """Intercept standard logging and redirect to loguru."""

    def emit(self, record: logging.LogRecord) -> None:
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def fetch_with_retry(
    client: RESTClient,
    endpoint: str,
    params: dict[str, Any] | None = None,
    max_retries: int = 5,
) -> list[dict[str, Any]]:
    """Fetch data from API with automatic retry logic and rate limit handling.

    Args:
        client: RESTClient instance configured with base URL and headers
        endpoint: API endpoint path
        params: Query parameters for the request
        max_retries: Maximum number of retry attempts

    Returns:
        List of data items from the API response

    Raises:
        Exception: If all retry attempts fail
    """
    for attempt in range(max_retries):
        try:
            response = client.get(endpoint, params=params or {})
            return response.json()
        except Exception as e:
            error_msg = str(e)

            # Check if it's a rate limit error (429)
            if "429" in error_msg:
                # Try to extract wait time from error or use exponential backoff
                wait_time = (2**attempt) * 2
                logger.warning(
                    f"Rate limited, waiting {wait_time}s before retry {attempt + 1}/{max_retries}"
                )
                time.sleep(wait_time)
                continue

            # For server errors (5xx), retry with backoff
            if any(f"{code}" in error_msg for code in range(500, 600)):
                if attempt < max_retries - 1:
                    wait_time = 2**attempt
                    logger.warning(
                        f"Server error, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})"
                    )
                    time.sleep(wait_time)
                    continue
                logger.error(f"Server error persists after {max_retries} attempts: {e}")
                return []

            # For other errors, retry with exponential backoff
            if attempt < max_retries - 1:
                wait_time = 2**attempt
                logger.warning(f"Request error: {e}, retrying in {wait_time}s")
                time.sleep(wait_time)
                continue

            logger.error(f"Request failed after {max_retries} attempts: {e}")
            raise


@dlt.source
def salling_stores_source():
    """Fetch all stores from Salling Group Stores API.

    Returns:
        DltResource containing all stores data
    """
    access_token = dlt.secrets["salling_food_waste_source.access_token"]

    @dlt.resource(
        name="all_stores",
        primary_key="id",
        write_disposition="replace",
    )
    def all_stores_resource() -> Iterator[list[dict[str, Any]]]:
        """Fetch all stores using RESTClient with automatic retry logic."""
        logger.info("Fetching all stores from Salling Group API...")

        client = RESTClient(
            base_url="https://api.sallinggroup.com/v2",
            headers={"Authorization": f"Bearer {access_token}"},
            paginator=SinglePagePaginator(),
        )

        stores = fetch_with_retry(
            client=client,
            endpoint="stores",
            params={"per_page": 1000, "country": "DK"},
        )

        logger.info(f"Found {len(stores)} stores")

        # Process all stores, then yield as batch
        processed_stores = []
        for store_data in stores:
            # Transform coordinates array [lon, lat] into separate fields
            coords = store_data.get("coordinates", [])
            if coords and len(coords) >= 2:
                store_data["longitude"] = coords[0]
                store_data["latitude"] = coords[1]
            store_data.pop("coordinates", None)
            processed_stores.append(store_data)

        # Yield entire batch at once (much faster than individual yields)
        yield processed_stores

    return all_stores_resource


@dlt.source
def salling_food_waste_source(zip_codes: list[str]):
    """Fetch clearance data for multiple zip codes.

    Args:
        zip_codes: List of zip codes to query for food waste data

    Returns:
        DltResource containing food waste store data
    """
    access_token = dlt.secrets["salling_food_waste_source.access_token"]

    @dlt.resource(
        name="food_waste_stores",
        primary_key="store__id",
        write_disposition="replace",
    )
    def food_waste_stores_resource() -> Iterator[list[dict[str, Any]]]:
        """Fetch clearance data from stores across multiple zip codes."""
        logger.debug(
            f"Starting food_waste_stores_resource with {len(zip_codes)} zip codes"
        )

        client = RESTClient(
            base_url="https://api.sallinggroup.com/v1",
            headers={"Authorization": f"Bearer {access_token}"},
            paginator=SinglePagePaginator(),
        )

        seen_store_ids = set()
        zip_codes_per_batch = (
            20  # Yield every 20 zip codes for better progress visibility
        )
        current_batch = []

        logger.debug("About to start fetching clearance data...")
        logger.info(f"Fetching clearance data for {len(zip_codes)} zip codes...")
        logger.info(
            f"Estimated time: ~{len(zip_codes) * 2 / 60:.1f} minutes (2s delay per zip code)"
        )

        # Fetch all zip codes and yield in batches
        for i, zip_code in enumerate(zip_codes, start=1):
            logger.info(f"[{i}/{len(zip_codes)}] Processing zip code {zip_code}...")

            # Rate limiting: wait between requests (except for the first one)
            if i > 1:
                time.sleep(2)  # Conservative delay to avoid spike protection quarantine

            try:
                stores = fetch_with_retry(
                    client=client,
                    endpoint="food-waste/",
                    params={"zip": zip_code},
                )
            except Exception as e:
                logger.error(f"Failed to fetch data for zip code {zip_code}: {e}")
                continue

            if not stores:
                logger.info(f"No stores found for zip code {zip_code}")
                continue

            # Process stores from this zip code
            stores_added = 0
            for store_data in stores:
                store_id = store_data["store"]["id"]

                # Deduplicate
                if store_id in seen_store_ids:
                    continue

                seen_store_ids.add(store_id)
                store_data["queried_zip_code"] = zip_code

                # Transform coordinates
                coords = store_data["store"].get("coordinates", [])
                if coords and len(coords) >= 2:
                    store_data["store"]["longitude"] = coords[0]
                    store_data["store"]["latitude"] = coords[1]
                store_data["store"].pop("coordinates", None)

                current_batch.append(store_data)
                stores_added += 1

            logger.info(
                f"Zip {zip_code}: Added {stores_added} new stores (total unique: {len(seen_store_ids)})"
            )

            # Yield batch every N zip codes to show progress
            if i % zip_codes_per_batch == 0 or i == len(zip_codes):
                if current_batch:
                    logger.info(f"Yielding batch of {len(current_batch)} stores...")
                    yield current_batch
                    current_batch = []

        logger.info(f"Fetched clearance data from {len(seen_store_ids)} unique stores")

    return food_waste_stores_resource


pipeline = dlt.pipeline(
    pipeline_name="salling_food_waste_pipeline",
    destination=dlt.destinations.duckdb("sources/food_waste/salling_food_waste.duckdb"),
    dataset_name="salling_data",
    progress="log",
    dev_mode=False,
)


if __name__ == "__main__":
    # Configure loguru to intercept standard logging (including dlt's logs)
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

    # Configure loguru logger format and level
    logger.remove()  # Remove default handler
    logger.add(
        lambda msg: print(
            msg, end=""
        ),  # Use print to output (works well with dlt's progress bars)
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
        level="INFO",  # Change to DEBUG to see debug messages
        colorize=True,
    )

    # Suppress verbose dlt internal loggers
    logging.getLogger("dlt.sources.helpers.rest_client.client").setLevel(
        logging.WARNING
    )
    logging.getLogger("dlt.load").setLevel(logging.WARNING)
    logging.getLogger("dlt.normalize").setLevel(logging.WARNING)
    logging.getLogger("dlt.pipeline").setLevel(logging.WARNING)
    logging.getLogger("dlt.pool_runner").setLevel(logging.WARNING)

    # Step 1: Fetch all stores
    logger.info("=" * 60)
    logger.info("STEP 1: Fetching all stores from Stores API")
    logger.info("=" * 60)

    load_info = pipeline.run(salling_stores_source())
    logger.info(f"Load info: {load_info}")

    # Step 2: Extract unique zip codes from the all_stores table
    logger.info("=" * 60)
    logger.info("STEP 2: Extracting unique zip codes from stores")
    logger.info("=" * 60)

    with pipeline.sql_client() as client:
        with client.execute_query("""
            SELECT DISTINCT address__zip
            FROM salling_data.all_stores
            WHERE address__zip IS NOT NULL
            ORDER BY address__zip
        """) as cursor:
            zip_codes_result = cursor.fetchall()

    zip_codes = [row[0] for row in zip_codes_result]
    logger.info(f"Found {len(zip_codes)} unique zip codes")
    logger.debug(f"Zip codes sample: {zip_codes[:5]}")

    # Step 3: Fetch clearance data for all zip codes
    logger.info("=" * 60)
    logger.info("STEP 3: Fetching clearance data from Food Waste API")
    logger.info("=" * 60)

    logger.debug(f"About to call pipeline.run with {len(zip_codes)} zip codes...")
    load_info = pipeline.run(salling_food_waste_source(zip_codes=zip_codes))
    logger.debug("Pipeline.run completed")
    logger.info(f"Load info: {load_info}")

    logger.info("=" * 60)
    logger.info("Pipeline completed successfully!")
    logger.info("=" * 60)
