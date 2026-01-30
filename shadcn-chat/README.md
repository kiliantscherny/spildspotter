# Spild Spotter - shadcn/ui Chat App

A modern chat interface for the Spild Spotter food waste recipe assistant, built with Next.js and shadcn/ui.

## Features

- Modern dark theme UI with shadcn/ui components
- Store selection with search functionality
- Real-time clearance items display
- Streaming AI chat responses powered by Gemini
- Responsive design (mobile + desktop)
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
just shadcn

# Start backend only
just shadcn-backend

# Start both
just shadcn-all

# Install all dependencies
just shadcn-install
```

## Architecture

```
shadcn-chat/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/
│   │   ├── chat/         # Chat-specific components
│   │   └── ui/           # shadcn/ui components
│   ├── hooks/            # React hooks (state management)
│   ├── lib/              # Utilities and API client
│   └── types/            # TypeScript type definitions
└── backend/
    └── main.py           # FastAPI backend
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
