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

# Start Gradio AI app
ai:
    uv run app.py

# Run pipeline and images, then build sources
build: pipeline images sources

# Start shadcn chat frontend (Next.js)
shadcn:
    cd shadcn-chat && npm run dev

# Start shadcn chat backend (FastAPI)
shadcn-backend:
    cd shadcn-chat/backend && uv run uvicorn main:app --reload --port 8000

# Start both shadcn frontend and backend
shadcn-all:
    cd shadcn-chat && npm run dev:all

# Install shadcn chat dependencies
shadcn-install:
    cd shadcn-chat && npm install
    cd shadcn-chat/backend && uv sync

# Clean up generated files
clean:
    rm -rf sources/food_waste/salling_food_waste_pipeline.duckdb
    rm -rf static/product-images/*.jpg
    rm -rf .dlt/
