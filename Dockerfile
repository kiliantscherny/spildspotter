# Use Python 3.13 slim image
FROM python:3.13-slim

# Set working directory
WORKDIR /app

ENV GOOGLE_PYTHON_PACKAGE_MANAGER="uv"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv venv
RUN uv sync --locked --group ai-app

# Copy application files
COPY app.py ./
COPY static/ ./static/

# Create directory and copy database
RUN mkdir -p ./sources/food_waste/
COPY sources/food_waste/salling_food_waste.duckdb ./sources/food_waste/

# Set environment variables for Cloud Run
ENV PORT=8080
ENV GRADIO_SERVER_NAME="0.0.0.0"
ENV GRADIO_SERVER_PORT="8080"

# Expose port
EXPOSE 8080

# Run the application using uv (which uses the virtual environment)
CMD ["uv", "run", "app.py"]
