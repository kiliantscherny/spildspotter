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
    npm run sources

# Start Evidence development server
dev:
    npm run dev

# Run pipeline and images, then build sources
build: pipeline images sources

# Start web app frontend (Next.js)
web:
    cd web && npm run dev

# Start web app backend (FastAPI)
web-backend:
    cd web/backend && uv run uvicorn main:app --reload --port 8000

# Start both web app frontend and backend
web-all:
    cd web && npm run dev:all

# Install web app dependencies
web-install:
    cd web && npm install
    cd web/backend && uv sync

# Build Docker image (extracts token from .env automatically)
docker-build:
    #!/usr/bin/env bash
    TOKEN=$(grep SALLING_FOOD_WASTE_SOURCE__ACCESS_TOKEN .env | cut -d'"' -f2)
    docker build --build-arg "SALLING_FOOD_WASTE_SOURCE__ACCESS_TOKEN=$TOKEN" -t spildspotter .

# Fast test build (only 20 zip codes instead of ~314, takes ~1min instead of ~13min)
docker-build-test:
    #!/usr/bin/env bash
    TOKEN=$(grep SALLING_FOOD_WASTE_SOURCE__ACCESS_TOKEN .env | cut -d'"' -f2)
    docker build --build-arg "SALLING_FOOD_WASTE_SOURCE__ACCESS_TOKEN=$TOKEN" --build-arg "PIPELINE_TEST_LIMIT=20" -t spildspotter .

# Run Docker container locally
docker-run:
    docker run -p 3000:3000 -e PORT=3000 -e HOSTNAME=0.0.0.0 \
        --env-file .env \
        spildspotter

# Clean up generated files
clean:
    rm -rf sources/food_waste/salling_food_waste_pipeline.duckdb
    rm -rf static/product-images/*.jpg
    rm -rf .dlt/
