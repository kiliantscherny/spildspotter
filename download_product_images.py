"""Download product images from the database and save them locally.

This script fetches all unique product images from the DuckDB database,
downloads them, and saves them to the Evidence app's static directory.
Uses multithreading for faster downloads.
"""

import hashlib
import os
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
from threading import Lock
from urllib.parse import urlparse

import duckdb
import requests
from PIL import Image

# Configuration
DB_PATH = "sources/food_waste/salling_food_waste.duckdb"
STATIC_DIR = Path("static/product-images")
SCHEMA_NAME = "salling_food_waste_pipeline"  # Fixed schema name from dlt pipeline
MAX_WORKERS = 10  # Number of concurrent download threads


def get_image_filename(image_url: str) -> str:
    """Generate a unique filename from the image URL.

    Uses MD5 hash of the URL to create a consistent filename.
    """
    # Create hash of URL for consistent filename
    url_hash = hashlib.md5(image_url.encode()).hexdigest()[:16]

    # Get file extension from URL
    parsed = urlparse(image_url)
    path = parsed.path
    ext = os.path.splitext(path)[1] or ".jpg"

    return f"{url_hash}{ext}"


def download_image(image_url: str, output_path: Path) -> bool:
    """Download an image and save it at original size.

    Args:
        image_url: URL of the image to download
        output_path: Path where the image should be saved

    Returns:
        True if successful, False otherwise
    """
    try:
        # Download image
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()

        # Open image
        img = Image.open(BytesIO(response.content))

        # Convert to RGB if necessary (handles RGBA, P, etc.)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Save as JPEG (no resizing)
        img.save(output_path, "JPEG", quality=85, optimize=True)

        return True

    except Exception as e:
        print(f"Error downloading {image_url}: {e}")
        return False


def process_image(image_data: tuple, lock: Lock, placeholder_path: Path) -> dict:
    """Process a single image (check if exists or download).

    Args:
        image_data: Tuple of (image_url, product_name, filename, output_path)
        lock: Thread lock for printing progress
        placeholder_path: Path to the placeholder image

    Returns:
        Dict with status and metadata
    """
    image_url, product_name, filename, output_path = image_data

    # Skip if already downloaded
    if output_path.exists():
        with lock:
            print(f"[CACHED] {filename}")
        return {
            "status": "cached",
            "url": image_url,
            "filename": filename,
            "product": product_name,
        }

    # Download image
    with lock:
        print(f"[DOWNLOADING] {product_name[:50]}...")

    success = download_image(image_url, output_path)

    if success:
        return {
            "status": "success",
            "url": image_url,
            "filename": filename,
            "product": product_name,
        }
    else:
        # Copy placeholder for failed downloads
        try:
            if placeholder_path.exists():
                shutil.copy(placeholder_path, output_path)
                with lock:
                    print(f"[PLACEHOLDER] Created fallback for {filename}")
        except Exception as e:
            with lock:
                print(f"[ERROR] Could not create placeholder copy: {e}")

        return {
            "status": "failed",
            "url": image_url,
            "filename": filename,
            "product": product_name,
        }


def main():
    """Main function to download all product images."""
    # Create static directory if it doesn't exist
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    # Connect to database
    conn = duckdb.connect(DB_PATH, read_only=True)

    try:
        # Get all unique product images
        print(f"Using schema: {SCHEMA_NAME}")
        print("Fetching product image URLs from database...")
        images = conn.execute(f"""
            SELECT DISTINCT
                product__image,
                product__description
            FROM {SCHEMA_NAME}.food_waste_stores__clearances
            WHERE product__image IS NOT NULL
              AND product__image != ''
              AND product__image NOT LIKE '%/image'
              AND LENGTH(product__image) > 20
            ORDER BY product__description
        """).fetchall()

        print(f"Found {len(images)} unique product images")
        print(f"Using {MAX_WORKERS} concurrent threads")
        print("")

        # Prepare image data for processing
        image_tasks = []
        for image_url, product_name in images:
            filename = get_image_filename(image_url)
            output_path = STATIC_DIR / filename
            image_tasks.append((image_url, product_name, filename, output_path))

        # Create a mapping file for reference
        mapping = []
        successful = 0
        failed = 0
        cached = 0
        lock = Lock()
        placeholder_path = STATIC_DIR / "placeholder.svg"

        # Download images concurrently
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            # Submit all tasks
            futures = {
                executor.submit(process_image, task, lock, placeholder_path): task
                for task in image_tasks
            }

            # Process completed tasks
            for idx, future in enumerate(as_completed(futures), 1):
                result = future.result()

                # Update counts
                if result["status"] == "success":
                    successful += 1
                    mapping.append(
                        f"{result['url']}|{result['filename']}|{result['product']}"
                    )
                elif result["status"] == "cached":
                    cached += 1
                    successful += 1
                    mapping.append(
                        f"{result['url']}|{result['filename']}|{result['product']}"
                    )
                elif result["status"] == "failed":
                    failed += 1

                # Print progress
                with lock:
                    print(
                        f"Progress: {idx}/{len(images)} | "
                        f"Success: {successful - cached} | "
                        f"Cached: {cached} | "
                        f"Failed: {failed}"
                    )

        # Save mapping file
        print("")
        mapping_file = STATIC_DIR / "image_mapping.txt"
        with open(mapping_file, "w", encoding="utf-8") as f:
            f.write("\n".join(mapping))

        print("\n" + "=" * 60)
        print("Download complete!")
        print(f"  Total images: {len(images)}")
        print(f"  Downloaded: {successful - cached}")
        print(f"  Cached (already existed): {cached}")
        print(f"  Failed: {failed}")
        print(f"  Images saved to: {STATIC_DIR}")
        print(f"  Mapping saved to: {mapping_file}")
        print("=" * 60)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
