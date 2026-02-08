#!/bin/bash
set -e

# Start FastAPI backend on loopback (internal only, not exposed to the internet)
cd /app/web/backend
.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 &
FASTAPI_PID=$!

# Brief wait for FastAPI to initialize
sleep 2

# Start Next.js standalone server in foreground
# PORT is set by Railway; HOSTNAME=0.0.0.0 is set in Dockerfile
cd /app
exec node server.js
