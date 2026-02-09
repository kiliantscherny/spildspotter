# Spild Spotter

AI-powered recipes to reduce food waste from Danish supermarkets (Netto, Bilka, Føtex).

## What it does

- **Chat Assistant** — Ask about clearance items at your local store, get recipe ideas
- **AI Recipe Builder** — Step-by-step wizard: pick a store, set preferences, get a tailored recipe
- **Location-aware** — Finds nearest stores using your location
- **Fresh data** — Clearance data refreshed twice daily from the Salling Group API

## Tech Stack

- **Frontend**: Next.js 16, shadcn/ui, Tailwind CSS
- **Backend**: FastAPI (Python)
- **AI**: Google Gemini
- **Data**: dlt pipeline, DuckDB, Salling Group API
- **Deployment**: Railway (Docker), GitHub Actions (scheduled refreshes)

## Local Development

### Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Node.js 22+
- [just](https://github.com/casey/just) (optional, for task runner)

### Setup

1. Create a `.env` file:

   ```
   SALLING_FOOD_WASTE_SOURCE__ACCESS_TOKEN=your_salling_api_token
   GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=your_base64_key
   GCP_PROJECT_NAME=your_project
   GCP_PROJECT_LOCATION=europe-west1
   ```

   Get a Salling API token at https://developer.sallinggroup.com/

2. Run the data pipeline:

   ```bash
   just pipeline
   ```

3. Start the app:

   ```bash
   just web-install
   just web-all
   ```

   Frontend: http://localhost:3000 | Backend: http://localhost:8000

### Docker

```bash
just docker-build       # Full build (~13 min, all zip codes)
just docker-build-test  # Test build (~1 min, 20 zip codes)
just docker-run         # Run container locally on :3000
```

### All Commands

```
just pipeline          # Run dlt data pipeline
just web               # Start Next.js frontend
just web-backend       # Start FastAPI backend
just web-all           # Start both frontend and backend
just web-install       # Install all dependencies
just docker-build      # Build Docker image
just docker-build-test # Fast test build (20 zip codes)
just docker-run        # Run Docker container
just clean             # Clean generated files
```

## Project Structure

```
├── salling_food_waste_pipeline.py   # dlt pipeline (Salling API → DuckDB)
├── Dockerfile                       # Multi-stage Docker build
├── start.sh                         # Container startup script
├── web/
│   ├── src/
│   │   ├── app/                     # Next.js pages & API routes
│   │   ├── components/              # React components (chat, recipe, ui)
│   │   ├── hooks/                   # Custom hooks
│   │   └── lib/                     # API client, utilities
│   └── backend/
│       └── main.py                  # FastAPI backend (Gemini AI, DuckDB queries)
├── sources/food_waste/              # DuckDB database
├── .github/workflows/redeploy.yml   # Scheduled data refresh
├── .dlt/config.toml                 # dlt configuration
└── justfile                         # Task runner commands
```
