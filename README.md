```

                        ███████╗██████╗ ██╗██╗     ██████╗                         
                        ██╔════╝██╔══██╗██║██║     ██╔══██╗                        
                        ███████╗██████╔╝██║██║     ██║  ██║                        
                        ╚════██║██╔═══╝ ██║██║     ██║  ██║                        
                        ███████║██║     ██║███████╗██████╔╝                        
                        ╚══════╝╚═╝     ╚═╝╚══════╝╚═════╝                         
                                                                                 
                        ███████╗██████╗  ██████╗ ████████╗████████╗███████╗██████╗ 
                        ██╔════╝██╔══██╗██╔═══██╗╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
                        ███████╗██████╔╝██║   ██║   ██║      ██║   █████╗  ██████╔╝
                        ╚════██║██╔═══╝ ██║   ██║   ██║      ██║   ██╔══╝  ██╔══██╗
                        ███████║██║     ╚██████╔╝   ██║      ██║   ███████╗██║  ██║
                        ╚══════╝╚═╝      ╚═════╝    ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝
                                                                       
```

<p align="center">
<a href="https://github.com/j178/prek"><img src="https://img.shields.io/badge/prek-enabled-brightgreen?logo=pre-commit&logoColor=white" alt="prek" style="max-width:100%;"></a>
<a href="https://github.com/astral-sh/uv"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/uv/main/assets/badge/v0.json" alt="uv" style="max-width:100%;"></a>
<a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff" style="max-width:100%;"></a>
<a href="https://github.com/astral-sh/ty"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ty/main/assets/badge/v0.json" alt="ty" style="max-width:100%;"></a>
<a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white" alt="Next.js" style="max-width:100%;"></a>
<a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI" style="max-width:100%;"></a>
<a href="https://duckdb.org/"><img src="https://img.shields.io/badge/DuckDB-FFF000?logo=duckdb&logoColor=black" alt="DuckDB" style="max-width:100%;"></a>
<a href="https://railway.com/"><img src="https://img.shields.io/badge/Railway-0B0D0E?logo=railway&logoColor=white" alt="Railway" style="max-width:100%;"></a>
<a href="https://gemini.google.com/"><img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?logo=googlegemini&logoColor=fff&style=plastic" alt="Google Gemini" style="max-width:100%;"></a>
<br>
<a href="https://github.com/kiliantscherny/spildspotter/actions/workflows/railway_deploy.yml"><img src="https://github.com/kiliantscherny/spildspotter/actions/workflows/railway_deploy.yml/badge.svg" alt="Deploy to Railway" style="max-width:100%;"></a>
</p>

AI-powered recipes to reduce food waste from Danish supermarkets (Netto, Bilka, Føtex). Browse clearance items at your local store, get recipe ideas from an AI chat assistant, or use the step-by-step recipe builder.

## Features

| Feature | Description |
| --- | --- |
| **Chat Assistant** | Ask about clearance items at your local store and get recipe ideas |
| **AI Recipe Builder** | Step-by-step wizard: pick a store, set preferences, get a tailored recipe |

## Tech Stack

| Category | Technology |
| --- | --- |
| **Frontend** | [Next.js 16](https://nextjs.org/), [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/) |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/) (Python) |
| **AI** | [Google Gemini](https://ai.google.dev/) |
| **Data** | [dlt](https://dlthub.com/) pipeline, [DuckDB](https://duckdb.org/), [Salling Group API](https://developer.sallinggroup.com/) |
| **Deployment** | [Railway](https://railway.com/) (Docker), [GitHub Actions](https://github.com/features/actions) (scheduled refreshes) |

## Prerequisites

> [!CAUTION]
> It is **strongly recommended** to use `uv` for managing the project.

- Python >= 3.13
- Node.js 22+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- [just](https://github.com/casey/just) (optional, for task runner)

## Installation

After cloning the repository, create and activate a virtual environment:

```bash
uv venv
source .venv/bin/activate
```

Install dependencies:

```bash
uv sync
```

## Configuration

Create a `.env` file in the project root:

```env
SALLING_FOOD_WASTE_SOURCE__ACCESS_TOKEN=your_salling_api_token
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=your_base64_key
GCP_PROJECT_NAME=your_project
GCP_PROJECT_LOCATION=europe-west1
```

Get a Salling API token at https://developer.sallinggroup.com/

## Usage

### Local Development

```bash
just pipeline      # Run dlt data pipeline
just web-install   # Install frontend + backend dependencies
just web-all       # Start both frontend and backend
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

## Development

### Code Quality

The project uses Ruff for linting and formatting, and ty for type checking:

```bash
ruff format .
ruff check .
ty check .
```

### Pre-commit Hooks

The project uses pre-commit hooks powered by [Prek](https://github.com/j178/prek).

```bash
uv tool install prek
prek install
```

Run hooks manually:

```bash
prek run -a
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
├── .github/workflows/               # Scheduled data refresh
├── .dlt/config.toml                 # dlt configuration
└── justfile                         # Task runner commands
```

## Deployment

The app is deployed on [Railway](https://railway.com/) as a single Docker service. A multi-stage Dockerfile fetches fresh clearance data at build time, builds the Next.js frontend, and bundles everything into a slim runtime image.

GitHub Actions triggers a redeploy twice daily (9am and 3pm CET) to refresh the data. Railway performs blue-green deploys for zero downtime.
