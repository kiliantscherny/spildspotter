<h1 align="center"><img src="static/spildspotter-logo.png" alt="Spild Spotter Logo" width=300></h1>
<h2 align="center"> Spild Spotter </h2>
<p align="center"> AI-powered recipes to minimize food waste </p>

<div align="center">
<a href="https://github.com/kiliantscherny/spildspotter/actions/workflows/deploy.yml"><img src="https://github.com/kiliantscherny/spildspotter/actions/workflows/deploy.yml/badge.svg" alt="Deployment status"></a>
<a href="https://img.shields.io/github/stars/kiliantscherny/spildspotter"><img src="https://img.shields.io/github/stars/kiliantscherny/spildspotter" alt="GitHub stars"></a></p>
<a href="https://github.com/astral-sh/uv"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/uv/main/assets/badge/v0.json" alt="uv" style="max-width:100%;"></a>
<a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff" style="max-width:100%;"></a>
<a href="https://github.com/astral-sh/ty"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ty/main/assets/badge/v0.json" alt="ty" style="max-width:100%;"></a>
<a href="https://img.shields.io/badge/Duckdb-000000?style=for-the-badge&logo=Duckdb&logoColor=yellow"><img src="https://img.shields.io/badge/Duckdb-000000?style=for-the-badge&logo=Duckdb&logoColor=yellow" alt="duckdb" style="max-width:100%;"></a>
</div>

## Overview

Welcome to Spild Spotter, a humble side project to make data on food waste useful and actionable – with a little help from AI 🤖.

<details>
<summary><code>Watch a demo video below 📼</code></summary>

<br>

**Click the video below to open it**

<a href="https://drive.google.com/file/d/1o9FPvatsnsa-v1nfx_DJYfQhtMJD_rzK/view?usp=sharing" target="_blank" rel="noopener noreferrer">
  <img src="https://github.com/user-attachments/assets/bc067ba4-4298-4ee0-8519-98be4e4378b9" alt="Watch the video">
</a>

</details>

This project consists of two complementary applications:

### 1. [Evidence Dashboard](https://kiliantscherny.github.io/spildspotter/)

An interactive data exploration dashboard for analyzing food waste clearance data:

- **Browse clearance items**: View details about thousands of discounted products across Danish stores (Netto, Føtex, Bilka) – see what's available in your local supermarket(s) and what the price reduction is
- **Store locations**: Interactive map showing stores throughout Denmark with clearance items on sale
- **Product insights**: Category breakdowns and discount distributions per supermarket
- **Customer flow data**: See typical store busyness patterns to plan your visit

### 2. [Gradio AI App](https://spildspotter-app-450148275312.europe-west1.run.app/)

A conversational AI interface for personalized recipe recommendations based on reduced clearance items:

- **Chat with your local supermarket's data**: Ask questions about clearance items at specific stores
- **AI-powered recipes**: Get recipe suggestions based on available discounted products, factoring in budgets and meal preferences
- **Save some kroner**: Turn discounted items into inspirational meal ideas
- **Help reduce food waste**: Items that might otherwise be disposed can be reimagined into new ideas

## Tech Stack

### Shared Infrastructure

- [**dlt (data load tool)**](https://github.com/dlt-hub/dlt): Data pipeline for ingesting Salling Group API data
- [**DuckDB**](https://github.com/duckdb/duckdb): Embedded database for data storage and analytics
- [**Salling Group API**](https://developer.sallinggroup.com/api-reference): Store and food waste data source

### Evidence Dashboard

- [**Evidence**](https://github.com/evidence-dev/evidence): BI framework for creating the interactive dashboard
- [**GitHub Pages**](https://docs.github.com/en/pages): Static hosting for the Evidence dashboard

### Gradio AI App

- [**Gradio**](https://github.com/gradio-app/gradio): Python web UI framework for the chat interface
- [**Google Gemini**](https://docs.cloud.google.com/gemini/docs/resources): AI model for generating recipe recommendations
- [**Google Cloud Run**](https://cloud.google.com/): Serverless deployment for the AI app

## Setup

### Quick Start (with Just)

If you have [just](https://github.com/casey/just) installed, you can use these commands:

1. **Install dependencies:**

   ```bash
   uv sync
   npm install
   ```

2. **Configure API keys:**

   Create `.dlt/secrets.toml`:

   ```toml
   [salling_food_waste_source]
   access_token = "your_salling_api_token"
   ```

   Get your Salling Group API token from: https://developer.sallinggroup.com/

3. **Run everything:**

   ```bash
   just all
   ```

   This runs the pipeline, downloads images, builds sources, and starts the dev server.

**Available Just commands:**

- `just all` - Complete setup and start Evidence dev server
- `just pipeline` - Run the data pipeline only
- `just images` - Download product images only
- `just sources` - Build Evidence sources only
- `just dev` - Start Evidence dev server only
- `just ai` - Start Gradio AI app
- `just build` - Run pipeline, images, and build sources
- `just clean` - Clean up generated files

### Manual Setup

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
   uv run salling_food_waste_pipeline.py
   ```

4. **Download product images (optional):**

   ```bash
   uv run download_product_images.py
   ```

5. **Launch the Evidence dashboard:**

   ```bash
   npm install
   npm run sources
   npm run dev
   ```

6. **Launch the Gradio AI app (optional):**

   Set up Google Cloud credentials:

   ```bash
   export GOOGLE_SERVICE_ACCOUNT_KEY_BASE64="your_base64_encoded_key"
   export GCP_PROJECT_NAME="your_project_name"
   export GCP_PROJECT_LOCATION="your_chosen_region"
   ```

   Run the app:

   ```bash
   uv run app.py
   ```

## Project Structure

```
├── salling_food_waste_pipeline.py  # Data ingestion from Salling API
├── download_product_images.py      # Downloads product images
├── app.py                           # Gradio AI chat application
├── pages/                           # Evidence dashboard pages
├── static/                          # Static assets (images)
├── sources/food_waste/              # DuckDB database
├── evidence.config.yaml             # Evidence configuration
├── Dockerfile                       # Cloud Run deployment configuration
├── .github/workflows/deploy.yml     # CI/CD pipeline
├── .dlt/
│   ├── config.toml                  # dlt configuration
│   └── secrets.toml                 # API keys (not in git)
├── pyproject.toml                   # Python dependencies
├── package.json                     # Node.js dependencies
└── README.md
```

## Data Pipeline

The pipeline fetches data from the Salling Group Food Waste API and stores it in DuckDB:

- **Clearances**: Product details, prices, discounts, stock levels
- **Stores**: Store information, locations, opening hours
- **Busyness data**: Typical customer flow patterns by hour
