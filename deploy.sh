#!/bin/bash

# Deployment script for Google Cloud Run
# This script builds and deploys the Gradio app to Cloud Run

set -e  # Exit on error

# Configuration
PROJECT_ID="${GCP_PROJECT_NAME}"
SERVICE_NAME="spildspotter-app"
REGION="${GCP_PROJECT_LOCATION:-europe-west1}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}   Deploying to Google Cloud Run    ${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if required env vars are set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: GCP_PROJECT_NAME environment variable is not set${NC}"
    exit 1
fi

if [ -z "$GOOGLE_SERVICE_ACCOUNT_KEY_BASE64" ]; then
    echo -e "${RED}Error: GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Configuration validated"
echo -e "  Project: ${PROJECT_ID}"
echo -e "  Service: ${SERVICE_NAME}"
echo -e "  Region: ${REGION}"
echo ""

# Set the project
echo -e "${BLUE}Setting GCP project...${NC}"
gcloud config set project "${PROJECT_ID}"

# Build the Docker image
echo -e "${BLUE}Building Docker image...${NC}"
gcloud builds submit --tag "${IMAGE_NAME}"

# Deploy to Cloud Run
echo -e "${BLUE}Deploying to Cloud Run...${NC}"
gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --allow-unauthenticated \
    --set-env-vars "GCP_PROJECT_NAME=${PROJECT_ID}" \
    --set-env-vars "GCP_PROJECT_LOCATION=${REGION}" \
    --set-env-vars "GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=${GOOGLE_SERVICE_ACCOUNT_KEY_BASE64}" \
    --memory 2Gi \
    --cpu 2 \
    --timeout 3600 \
    --concurrency 80 \
    --min-instances 0 \
    --max-instances 10 \
    --no-cpu-throttling

# Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --format 'value(status.url)')

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}   Deployment Successful! 🎉        ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "Service URL: ${SERVICE_URL}"
echo ""
