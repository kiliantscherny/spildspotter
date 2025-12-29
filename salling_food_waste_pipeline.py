"""A `dlt` pipeline to ingest data from the Salling Group Food Waste API.

This pipeline fetches heavily discounted food items nearing expiration dates
from Danish stores (Føtex, Netto, Basalt, Bilka) via the Salling Group API.

API Documentation: https://developer.sallinggroup.com/api-reference
"""

import time

import dlt
import requests


@dlt.source
def salling_food_waste_source(
    zip_codes: list[str] | None = None,
):
    """
    Define dlt resources from Salling Group Food Waste API endpoints.

    Args:
        zip_codes: List of Danish zip codes to search for stores with food waste items.
                   Default is ["8000"] (Aarhus). Examples: ["2100", "5000", "8000"].
    """
    if zip_codes is None:
        zip_codes = ["8000"]

    access_token = dlt.secrets["salling_food_waste_source.access_token"]

    @dlt.resource(
        name="food_waste_stores",
        primary_key="store__id",
        write_disposition="replace",
    )
    def food_waste_stores_resource():
        """Fetch food waste data from stores across multiple zip codes."""
        headers = {
            "Authorization": f"Bearer {access_token}",
        }
        base_url = "https://api.sallinggroup.com/v1/food-waste/"
        seen_store_ids = set()

        for i, zip_code in enumerate(zip_codes):
            # Rate limiting: wait between requests (except for the first one)
            if i > 0:
                time.sleep(2.0)

            # Retry with exponential backoff for rate limiting
            max_retries = 5
            success = False
            for attempt in range(max_retries):
                try:
                    response = requests.get(
                        base_url,
                        headers=headers,
                        params={"zip": zip_code},
                        timeout=30,
                    )
                    if response.status_code == 429:
                        wait_time = (2**attempt) * 2  # 2, 4, 8, 16, 32 seconds
                        print(
                            f"Rate limited on zip {zip_code}, waiting {wait_time}s..."
                        )  # noqa: T201
                        time.sleep(wait_time)
                        continue
                    if response.status_code >= 500:
                        # Server error - skip this zip code
                        print(
                            f"Server error {response.status_code} for zip {zip_code}, skipping..."
                        )  # noqa: T201
                        break
                    response.raise_for_status()
                    success = True
                    break
                except requests.exceptions.RequestException as e:
                    print(f"Request error for zip {zip_code}: {e}")  # noqa: T201
                    if attempt < max_retries - 1:
                        time.sleep(2**attempt)
                        continue
                    break

            if not success:
                continue

            stores = response.json()

            for store_data in stores:
                store_id = store_data["store"]["id"]
                # Deduplicate stores that appear in multiple zip code results
                if store_id not in seen_store_ids:
                    seen_store_ids.add(store_id)
                    store_data["queried_zip_code"] = zip_code

                    # Transform coordinates array [lon, lat] into separate fields
                    coords = store_data["store"].get("coordinates", [])
                    if coords and len(coords) >= 2:
                        store_data["store"]["longitude"] = coords[0]
                        store_data["store"]["latitude"] = coords[1]
                    # Remove the original array to avoid the nested table
                    store_data["store"].pop("coordinates", None)

                    yield store_data

    return food_waste_stores_resource


pipeline = dlt.pipeline(
    pipeline_name="salling_food_waste_pipeline",
    destination=dlt.destinations.duckdb(
        "evidence-app/sources/food_waste/salling_food_waste.duckdb"
    ),
    dataset_name="salling_food_waste_pipeline",
    progress="log",
    dev_mode=False,
)


# List of Danish zip codes to fetch food waste data from
ZIP_CODES = [
    "1000",  # Copenhagen K
    "2100",  # Copenhagen Ø
    "2200",  # Copenhagen N
    "2300",  # Copenhagen S
    "2400",  # Copenhagen NV
    "2500",  # Valby
    "2600",  # Glostrup
    "2700",  # Brønshøj
    "2800",  # Kongens Lyngby
    "2900",  # Hellerup
    "3000",  # Helsingør
    "4000",  # Roskilde
    "5000",  # Odense C
    "6000",  # Kolding
    "7000",  # Fredericia
    "8000",  # Aarhus C
    "9000",  # Aalborg
]


if __name__ == "__main__":
    load_info = pipeline.run(salling_food_waste_source(zip_codes=ZIP_CODES))
    print(load_info)  # noqa: T201
