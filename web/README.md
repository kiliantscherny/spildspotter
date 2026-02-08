# Spild Spotter - AI Recipe App

A modern web application for the Spild Spotter food waste recipe assistant, built with Next.js and shadcn/ui.

## Features

- **AI Recipe Builder**: Step-by-step wizard to find the perfect recipe
  - Location-based store selection
  - Meal type selection (breakfast, lunch, dinner, snack)
  - Dietary preferences (vegetarian, vegan, etc.)
  - Tailored recipe generation with clearance items
- **Chat Assistant**: Conversational interface for exploring clearance items
- Store selection with search and location-based suggestions
- Real-time clearance items display with prices and discounts
- Streaming AI chat responses powered by Google Gemini
- Responsive design (mobile + desktop)
- Light/dark theme support
- Markdown rendering in chat messages

## Prerequisites

- Node.js 18+
- Python 3.11+
- uv (Python package manager)
- The main project's `.env` file with GCP credentials

## Getting Started

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && uv sync
```

### 2. Run the Data Pipeline

Make sure you've run the data pipeline from the root project to populate the database:

```bash
# From the root project directory
just pipeline
```

### 3. Start the Application

**Option 1: Start both frontend and backend together**

```bash
npm run dev:all
```

**Option 2: Start separately**

```bash
# Terminal 1: Start the backend
npm run backend
# or: cd backend && uv run uvicorn main:app --reload --port 8000

# Terminal 2: Start the frontend
npm run dev
```

### 4. Open the App

Navigate to [http://localhost:3000](http://localhost:3000)

## Using Justfile Commands

From the root project directory:

```bash
# Start frontend only
just web

# Start backend only
just web-backend

# Start both
just web-all

# Install all dependencies
just web-install
```

## Architecture

```
web/
├── src/
│   ├── app/              # Next.js app router (home, chat, recipe pages)
│   ├── components/
│   │   ├── chat/         # Chat-specific components
│   │   ├── recipe/       # Recipe wizard components
│   │   ├── common/       # Shared components (brand, store selector)
│   │   └── ui/           # shadcn/ui components
│   ├── hooks/            # React hooks (state management)
│   ├── lib/              # Utilities and API client
│   └── types/            # TypeScript type definitions
└── backend/
    └── main.py           # FastAPI backend with Gemini AI
```

## Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- shadcn/ui
- TypeScript

**Backend:**
- FastAPI
- DuckDB
- Google Gemini (via Vertex AI)
