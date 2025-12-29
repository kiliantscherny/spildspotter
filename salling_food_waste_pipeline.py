"""A `dlt` pipeline to ingest data from the Salling Group Food Waste API.

This pipeline fetches heavily discounted food items nearing expiration dates
from Danish stores (Føtex, Netto, Basalt, Bilka) via the Salling Group API.

API Documentation: https://developer.sallinggroup.com/api-reference
"""

import dlt


@dlt.source
def salling_stores_source():
    """Fetch all stores from Salling Group Stores API."""
    access_token = dlt.secrets["salling_food_waste_source.access_token"]

    @dlt.resource(
        name="all_stores",
        primary_key="id",
        write_disposition="replace",
    )
    def all_stores_resource():
        """Fetch all stores using RESTClient with automatic retry logic."""
        import requests

        print("Fetching all stores...")  # noqa: T201

        # Use requests with retry logic (simpler than RESTClient for this case)
        max_retries = 5
        for attempt in range(max_retries):
            try:
                response = requests.get(
                    "https://api.sallinggroup.com/v2/stores",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"per_page": 1000, "country": "DK"},
                    timeout=30,
                )
                if response.status_code == 429:
                    wait_time = (2**attempt) * 2
                    print(f"Rate limited, waiting {wait_time}s...")  # noqa: T201
                    import time

                    time.sleep(wait_time)
                    continue
                response.raise_for_status()
                stores = response.json()
                break
            except requests.exceptions.RequestException as e:
                print(f"Request error: {e}")  # noqa: T201
                if attempt < max_retries - 1:
                    import time

                    time.sleep(2**attempt)
                    continue
                raise

        print(f"Found {len(stores)} stores")  # noqa: T201

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
    """Fetch clearance data for multiple zip codes."""
    access_token = dlt.secrets["salling_food_waste_source.access_token"]

    @dlt.resource(
        name="food_waste_stores",
        primary_key="store__id",
        write_disposition="replace",
    )
    def food_waste_stores_resource():
        """Fetch clearance data from stores across multiple zip codes."""
        import time

        import requests

        seen_store_ids = set()
        all_stores = []

        print(f"Fetching clearance data for {len(zip_codes)} zip codes...")  # noqa: T201
        print(
            f"Estimated time: ~{len(zip_codes) * 2 / 60:.1f} minutes (2s delay per zip code)"
        )  # noqa: T201
        print()  # noqa: T201

        # Fetch all zip codes and collect results
        for i, zip_code in enumerate(zip_codes, start=1):
            print(
                f"[{i}/{len(zip_codes)}] Processing zip code {zip_code}...\n",
                end=" ",
                flush=True,
            )  # noqa: T201

            # Rate limiting: wait between requests (except for the first one)
            if i > 1:
                time.sleep(2)  # Conservative delay to avoid spike protection quarantine

            max_retries = 5
            success = False

            for attempt in range(max_retries):
                try:
                    response = requests.get(
                        "https://api.sallinggroup.com/v1/food-waste/",
                        headers={"Authorization": f"Bearer {access_token}"},
                        params={"zip": zip_code},
                        timeout=30,
                    )
                    if response.status_code == 429:
                        # Read Retry-After header - API tells us how long to wait
                        retry_after = response.headers.get("Retry-After")
                        if retry_after:
                            wait_time = int(retry_after)
                            print(
                                f"Rate limited on zip {zip_code}, API says wait {wait_time}s (Retry-After: {retry_after})"
                            )  # noqa: T201
                        else:
                            wait_time = (2**attempt) * 2
                            print(
                                f"Rate limited on zip {zip_code}, waiting {wait_time}s (no Retry-After header)"
                            )  # noqa: T201
                        time.sleep(wait_time)
                        continue
                    if response.status_code >= 500:
                        print(
                            f"Server error {response.status_code} for zip {zip_code}, skipping..."
                        )  # noqa: T201
                        break
                    response.raise_for_status()
                    stores = response.json()
                    success = True
                    break
                except requests.exceptions.RequestException as e:
                    print(f"Request error for zip {zip_code}: {e}")  # noqa: T201
                    if attempt < max_retries - 1:
                        time.sleep(2**attempt)
                        continue
                    break

            if not success:
                print("FAILED")  # noqa: T201
                continue

            if not stores:
                print("No stores")  # noqa: T201
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

                all_stores.append(store_data)
                stores_added += 1

            # Print success message with store count
            print(
                f"OK - {stores_added} new stores (total unique: {len(seen_store_ids)})"
            )  # noqa: T201

        print(f"Fetched clearance data from {len(seen_store_ids)} unique stores")  # noqa: T201

        # Yield all stores as a single batch for maximum performance
        if all_stores:
            yield all_stores

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


if __name__ == "__main__":
    import duckdb

    # Step 1: Fetch all stores
    print("\n" + "=" * 60)  # noqa: T201
    print("STEP 1: Fetching all stores from Stores API")  # noqa: T201
    print("=" * 60 + "\n")  # noqa: T201

    load_info = pipeline.run(salling_stores_source())
    print(load_info)  # noqa: T201

    # Step 2: Extract unique zip codes from the all_stores table
    print("\n" + "=" * 60)  # noqa: T201
    print("STEP 2: Extracting unique zip codes from stores")  # noqa: T201
    print("=" * 60 + "\n")  # noqa: T201

    conn = duckdb.connect("evidence-app/sources/food_waste/salling_food_waste.duckdb")
    zip_codes_result = conn.execute("""
        SELECT DISTINCT address__zip
        FROM salling_food_waste_pipeline.all_stores
        WHERE address__zip IS NOT NULL
        ORDER BY address__zip
    """).fetchall()
    conn.close()

    zip_codes = [row[0] for row in zip_codes_result]
    print(f"Found {len(zip_codes)} unique zip codes")  # noqa: T201

    # Step 3: Fetch clearance data for all zip codes
    print("\n" + "=" * 60)  # noqa: T201
    print("STEP 3: Fetching clearance data from Food Waste API")  # noqa: T201
    print("=" * 60 + "\n")  # noqa: T201

    load_info = pipeline.run(salling_food_waste_source(zip_codes=zip_codes))
    print(load_info)  # noqa: T201

    print("\n" + "=" * 60)  # noqa: T201
    print("Pipeline completed successfully!")  # noqa: T201
    print("=" * 60 + "\n")  # noqa: T201
