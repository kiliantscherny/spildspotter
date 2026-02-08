# =============================================================================
# Stage 1: Fetch fresh data from Salling Group API
# =============================================================================
FROM python:3.13-slim AS data-fetcher

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install pipeline dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

# Copy dlt performance config (NOT secrets - those come from env vars)
COPY .dlt/config.toml .dlt/config.toml

# Copy pipeline script
COPY salling_food_waste_pipeline.py .

# Create output directory
RUN mkdir -p sources/food_waste

# Salling API token is passed as a build arg
# Railway makes all service variables available as build args automatically
ARG SALLING_FOOD_WASTE_SOURCE__ACCESS_TOKEN
# Optional: limit zip codes for faster test builds (e.g. 5)
ARG PIPELINE_TEST_LIMIT=0

# Run pipeline to populate DuckDB with fresh data
# ARG values aren't inherited as env vars by subprocesses, so pass explicitly
RUN SALLING_FOOD_WASTE_SOURCE__ACCESS_TOKEN="${SALLING_FOOD_WASTE_SOURCE__ACCESS_TOKEN}" \
    PIPELINE_TEST_LIMIT="${PIPELINE_TEST_LIMIT}" \
    uv run python salling_food_waste_pipeline.py

# =============================================================================
# Stage 2: Build Next.js frontend
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ .

# Empty string makes client-side fetches use relative URLs (same origin via rewrites)
ENV NEXT_PUBLIC_API_URL=""

RUN npm run build

# =============================================================================
# Stage 3: Production runtime
# =============================================================================
FROM python:3.13-slim AS runner

# Install Node.js
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get purge -y curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install FastAPI backend dependencies
COPY web/backend/pyproject.toml web/backend/uv.lock ./web/backend/
RUN cd web/backend && uv sync --frozen

# Copy backend source
COPY web/backend/main.py ./web/backend/

# Copy DuckDB from data-fetcher stage
RUN mkdir -p sources/food_waste
COPY --from=data-fetcher /app/sources/food_waste/salling_food_waste.duckdb ./sources/food_waste/

# Copy Next.js standalone build
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./.next/static
COPY --from=builder /app/web/public ./public

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

CMD ["./start.sh"]
