# Justfile for Salling Food Waste App

# Default recipe - show available commands
default:
    @just --list

# Run the full pipeline: fetch data, download images, build sources, and start dev server
all: pipeline images sources dev

# Run the dlt pipeline to fetch food waste data
pipeline:
    uv run salling_food_waste_pipeline.py

# Download product images from the database
images:
    uv run download_product_images.py

# Build Evidence sources
sources:
    cd ./evidence-app && npm run sources

# Start Evidence development server
dev:
    cd ./evidence-app && npm run dev

# Run pipeline and images, then build sources
build: pipeline images sources

# Clean up generated files
clean:
    rm -rf evidence-app/sources/food_waste/salling_food_waste_pipeline.duckdb
    rm -rf evidence-app/static/product-images/*.jpg
    rm -rf .dlt/
