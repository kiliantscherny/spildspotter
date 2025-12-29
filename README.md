# Spild Spotter

An interactive dashboard that visualizes food waste clearance data from Salling Group stores (Føtex, Netto, Bilka) across Denmark. This tool helps shoppers find discounted items approaching their expiration date, contributing to food waste reduction.

## What it does

- **Browse clearance items**: View thousands of discounted products across Danish stores
- **Store locations**: Interactive map showing stores with clearance items and busyness levels
- **Product insights**: Category breakdowns and discount distributions
- **Customer flow data**: See typical store busyness patterns to plan your visit
- **Filter by location**: Focus on specific cities and store brands

## Tech Stack

- **Evidence.dev**: BI framework for creating the dashboard
- **dlt (data load tool)**: Data pipeline for ingesting Salling Group API data
- **DuckDB**: Embedded database for data storage
- **Salling Group API**: Real-time food waste data source

## Setup

1. **Install dependencies:**

   ```bash
   uv sync
   ```

2. **Configure API keys:**

   Create `.dlt/secrets.toml`:

   ```toml
   [salling_food_waste_source]
   access_token = "your_salling_api_token"
   ```

   Get your Salling Group API token from: https://developer.sallinggroup.com/

3. **Run the data pipeline:**

   ```bash
   uv run python salling_food_waste_pipeline.py
   ```

4. **Download product images (optional):**

   ```bash
   uv run python download_product_images.py
   ```

5. **Launch the Evidence app:**
   ```bash
   cd evidence-app
   npm install
   npm run dev
   ```

## Project Structure

```
├── salling_food_waste_pipeline.py  # Data ingestion from Salling API
├── download_product_images.py      # Downloads product images
├── evidence-app/                   # Evidence dashboard
│   ├── pages/                      # Dashboard pages
│   ├── sources/                    # Database connections
│   └── static/                     # Static assets (images)
├── .dlt/
│   ├── config.toml                 # dlt configuration
│   └── secrets.toml                # API keys (not in git)
├── pyproject.toml                  # Python dependencies
└── README.md
```

## Data Pipeline

The pipeline fetches data from the Salling Group Food Waste API and stores it in DuckDB:

- **Clearances**: Product details, prices, discounts, stock levels
- **Stores**: Store information, locations, opening hours
- **Busyness data**: Typical customer flow patterns by hour
