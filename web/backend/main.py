"""FastAPI backend for Spild Spotter chat application."""

import base64
import json
import os
import sys
from functools import lru_cache
from pathlib import Path

import duckdb
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from google.oauth2 import service_account
from pydantic import BaseModel

# Load environment variables from .env file in the parent directory
load_dotenv(Path(__file__).parent.parent.parent / ".env")

# Database configuration - relative to parent directory
DB_PATH = str(Path(__file__).parent.parent.parent / "sources/food_waste/salling_food_waste.duckdb")
SCHEMA_NAME = "salling_data"

app = FastAPI(title="Spild Spotter API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Credentials & Client Setup
# =============================================================================


def get_service_account_credentials():
    """Get GCP service account credentials from base64-encoded environment variable."""
    encoded_key = os.getenv("GOOGLE_SERVICE_ACCOUNT_KEY_BASE64")

    if not encoded_key:
        raise ValueError(
            "GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 environment variable not set. "
            "Please set it to a base64-encoded service account JSON key."
        )

    decoded_key = base64.b64decode(encoded_key)
    service_account_info = json.loads(decoded_key)

    credentials = service_account.Credentials.from_service_account_info(
        service_account_info,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    return credentials


@lru_cache(maxsize=1)
def get_genai_client():
    """Get cached Gemini client configured for Vertex AI."""
    credentials = get_service_account_credentials()
    return genai.Client(
        vertexai=True,
        project=os.getenv("GCP_PROJECT_NAME"),
        location=os.getenv("GCP_PROJECT_LOCATION"),
        credentials=credentials,
    )


# =============================================================================
# Database Query Functions
# =============================================================================


def get_db_connection():
    """Get a read-only database connection."""
    return duckdb.connect(DB_PATH, read_only=True)


def table_exists(conn, table_name: str) -> bool:
    """Check if a table exists in the database."""
    result = conn.execute(
        f"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '{SCHEMA_NAME}' AND table_name = ?",
        [table_name],
    ).fetchone()
    return result[0] > 0


@lru_cache(maxsize=1)
def get_brands() -> tuple[str, ...]:
    """Get all unique store brands that have clearance items."""
    conn = get_db_connection()
    try:
        if not table_exists(conn, "food_waste_stores") or not table_exists(conn, "food_waste_stores__clearances"):
            # No clearance data available, return empty
            return ()

        # Only return brands that have stores with actual clearance items
        brands = conn.execute(f"""
            SELECT DISTINCT s.brand
            FROM {SCHEMA_NAME}.all_stores s
            INNER JOIN {SCHEMA_NAME}.food_waste_stores fw
                ON s.id = fw.store__id
            INNER JOIN {SCHEMA_NAME}.food_waste_stores__clearances c
                ON fw._dlt_id = c._dlt_parent_id
            WHERE CAST(c.offer__stock AS DOUBLE) > 0
            ORDER BY s.brand
        """).fetchall()
        return tuple(b[0] for b in brands)
    finally:
        conn.close()


@lru_cache(maxsize=1)
def get_all_stores() -> tuple[tuple[str, str, str, str, float | None, float | None, str], ...]:
    """Get all stores that have clearance items with stock > 0."""
    conn = get_db_connection()
    try:
        if not table_exists(conn, "food_waste_stores") or not table_exists(conn, "food_waste_stores__clearances"):
            # No clearance data available, return empty
            return ()

        # Only return stores that have actual clearance items with stock
        stores = conn.execute(f"""
            SELECT DISTINCT
                s.id,
                s.name,
                s.address__street,
                s.address__city,
                s.address__zip,
                s.brand,
                s.latitude,
                s.longitude
            FROM {SCHEMA_NAME}.all_stores s
            INNER JOIN {SCHEMA_NAME}.food_waste_stores fw
                ON s.id = fw.store__id
            INNER JOIN {SCHEMA_NAME}.food_waste_stores__clearances c
                ON fw._dlt_id = c._dlt_parent_id
            WHERE CAST(c.offer__stock AS DOUBLE) > 0
            ORDER BY s.brand, s.address__city, s.name
        """).fetchall()

        results = []
        for store in stores:
            store_id, name, street, city, zip_code, brand, lat, lng = store
            # Format brand name nicely
            display_brand = {
                "foetex": "Føtex",
                "bilka": "Bilka",
                "netto": "Netto",
            }.get(brand.lower(), brand.title())
            label = f"{display_brand} - {name}, {street}, {zip_code} {city}"
            results.append((store_id, label, city, display_brand, lat, lng, brand.lower()))

        return tuple(results)
    finally:
        conn.close()


@lru_cache(maxsize=128)
def get_store_details(store_id: str) -> dict | None:
    """Fetch store details from all_stores table."""
    conn = get_db_connection()
    try:
        result = conn.execute(f"""
            SELECT
                id,
                name,
                brand,
                address__street,
                address__city,
                address__zip
            FROM {SCHEMA_NAME}.all_stores
            WHERE id = ?
            LIMIT 1
        """, [store_id]).fetchone()
        if result is None:
            return None
        columns = ["id", "name", "brand", "street", "city", "zip"]
        return dict(zip(columns, result))
    finally:
        conn.close()


@lru_cache(maxsize=128)
def get_store_clearances(store_id: str) -> tuple[dict, ...]:
    """Fetch clearance items for a specific store."""
    conn = get_db_connection()
    try:
        if not table_exists(conn, "food_waste_stores") or not table_exists(conn, "food_waste_stores__clearances"):
            return ()

        clearances = conn.execute(f"""
            SELECT
                c.product__description,
                c.product__categories__en,
                c.product__image,
                COALESCE(
                    CAST(c.offer__new_price AS DOUBLE),
                    c.offer__new_price__v_double,
                    0
                ) AS offer__new_price,
                COALESCE(
                    CAST(c.offer__original_price AS DOUBLE),
                    0
                ) AS offer__original_price,
                CAST(c.offer__percent_discount AS DOUBLE) AS offer__percent_discount,
                CAST(c.offer__stock AS DOUBLE) AS offer__stock,
                c.offer__stock_unit,
                c.offer__end_time
            FROM {SCHEMA_NAME}.all_stores s
            INNER JOIN {SCHEMA_NAME}.food_waste_stores fw
                ON s.id = fw.store__id
            INNER JOIN {SCHEMA_NAME}.food_waste_stores__clearances c
                ON fw._dlt_id = c._dlt_parent_id
            WHERE s.id = ?
            AND CAST(c.offer__stock AS DOUBLE) > 0
            ORDER BY c.offer__end_time ASC
        """, [store_id]).fetchall()

        columns = [
            "product__description", "product__categories__en", "product__image",
            "offer__new_price", "offer__original_price", "offer__percent_discount",
            "offer__stock", "offer__stock_unit", "offer__end_time"
        ]
        return tuple(dict(zip(columns, row)) for row in clearances)
    finally:
        conn.close()


def sanitize_text(text: str | None) -> str:
    """Sanitize text to ensure it's valid UTF-8."""
    if text is None:
        return ""
    return text.encode("utf-8", errors="replace").decode("utf-8")


def to_title_case(text: str | None) -> str:
    """Convert text to title case (proper case)."""
    if text is None:
        return ""
    # First sanitize, then convert to title case
    sanitized = sanitize_text(text)
    # Handle all-caps text by converting to title case
    # This preserves already properly cased text
    if sanitized.isupper():
        return sanitized.title()
    return sanitized


def format_price(price: float) -> str:
    """Format price in Danish style: '20.- kr' or '20.34 kr'."""
    if price == int(price):
        return f"{int(price)}.- kr"
    else:
        return f"{price:.2f} kr"


def format_clearance_items(clearances: tuple[dict, ...]) -> str:
    """Format clearance items into a readable string for the LLM."""
    if not clearances:
        return "No clearance items currently available at this store."

    lines = []
    for item in clearances:
        description = to_title_case(item.get("product__description")) or "Unknown item"
        category = sanitize_text(item.get("product__categories__en")) or "Uncategorized"
        new_price = item.get("offer__new_price", 0) or 0
        original_price = item.get("offer__original_price", 0) or 0
        discount = item.get("offer__percent_discount") or 0
        stock = item.get("offer__stock", 0) or 0
        stock_unit = sanitize_text(item.get("offer__stock_unit")) or "units"

        lines.append(
            f"- {description} ({category}): {format_price(new_price)} "
            f"(was {format_price(original_price)}, {discount:.0f}% off), "
            f"~{stock:.2f} {stock_unit} available"
        )

    return "\n".join(lines)


def build_system_prompt(store_name: str, store_brand: str, clearances: tuple[dict, ...]) -> str:
    """Build the system prompt with store context and clearance items."""
    store_name = sanitize_text(store_name)
    store_brand = sanitize_text(store_brand)
    items_text = format_clearance_items(clearances)

    return f"""CRITICAL LANGUAGE INSTRUCTION:
You MUST respond in English.

IMPORTANT: Product names in the clearance items list may be in Danish (e.g. "Hakket Oksekod", "Gnocchi").
Keep these product names EXACTLY as written - do NOT translate them.
Only the recipe instructions, explanations, and general text should match the user's language.

---

You are a friendly, conversational culinary assistant specializing in reducing food waste.
You help users create delicious recipes using discounted clearance items from Danish supermarkets.

The user is currently looking at clearance items from: {store_name} ({store_brand})

CONVERSATION STYLE:
- Be natural and conversational - respond to greetings, questions, and small talk appropriately
- Only provide detailed recipes, lists, or cooking instructions when SPECIFICALLY ASKED
- If the user just says "hi", "hello", or similar - greet them warmly and ask how you can help
- Match the tone and length of your response to the user's message
- Don't automatically list all clearance items unless the user asks to see them

=== START OF CLEARANCE ITEMS (NAMES ARE IN DANISH) ===
{items_text}
=== END OF CLEARANCE ITEMS ===

WHEN PROVIDING RECIPES (only when asked):
1. Suggest creative, practical recipes using the available clearance items
2. Prioritize items that expire soonest (they appear first in the list)
3. Consider combining multiple clearance items when possible
4. Provide clear, step-by-step cooking instructions
5. Suggest approximate cooking times and serving sizes
6. Be encouraging about reducing food waste

REMEMBER: Your entire response must be in English."""


# =============================================================================
# Pydantic Models
# =============================================================================


class Store(BaseModel):
    id: str
    label: str
    city: str
    brand: str
    latitude: float | None = None
    longitude: float | None = None


class ClearanceItem(BaseModel):
    image: str
    product: str
    category: str
    new_price: str
    original_price: str
    discount: str
    stock: str


class StoreDetails(BaseModel):
    id: str
    name: str
    brand: str
    street: str
    city: str
    zip: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    store_id: str
    message: str
    history: list[ChatMessage] = []


# =============================================================================
# API Routes
# =============================================================================


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/brands", response_model=list[str])
async def list_brands():
    """Get all available brands."""
    try:
        return list(get_brands())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stores", response_model=list[Store])
async def list_stores(brand: str | None = None):
    """Get all stores, optionally filtered by brand."""
    try:
        stores = get_all_stores()
        result = [
            Store(id=s[0], label=s[1], city=s[2], brand=s[3], latitude=s[4], longitude=s[5])
            for s in stores
            if not brand or s[6] == brand.lower()
        ]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stores/{store_id}", response_model=StoreDetails | None)
async def get_store(store_id: str):
    """Get store details by ID."""
    try:
        details = get_store_details(store_id)
        if not details:
            raise HTTPException(status_code=404, detail="Store not found")
        return StoreDetails(**details)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stores/{store_id}/clearances", response_model=list[ClearanceItem])
async def get_clearances(store_id: str):
    """Get clearance items for a store."""
    try:
        clearances = get_store_clearances(store_id)
        items = []
        for item in clearances:
            image_url = item.get("product__image", "")
            if not image_url or len(image_url) < 20 or image_url.endswith("/image"):
                image_url = "https://placehold.co/80x80?text=No+Image"

            new_price = item.get("offer__new_price") or 0
            original_price = item.get("offer__original_price") or 0
            discount = item.get("offer__percent_discount") or 0
            stock = item.get("offer__stock") or 0

            items.append(
                ClearanceItem(
                    image=image_url,
                    product=to_title_case(item.get("product__description")) or "Unknown",
                    category=sanitize_text(item.get("product__categories__en")) or "",
                    new_price=f"{new_price:.2f} DKK",
                    original_price=f"{original_price:.2f} DKK",
                    discount=f"{discount:.0f}%",
                    stock=f"{stock:.1f} {sanitize_text(item.get('offer__stock_unit')) or ''}",
                )
            )
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Stream a chat response."""
    try:
        store_details = get_store_details(request.store_id)
        if not store_details:
            raise HTTPException(status_code=404, detail="Store not found")

        clearances = get_store_clearances(request.store_id)
        if not clearances:
            async def no_items_response():
                yield "No clearance items found at this store. Make sure to run the data pipeline first (`just pipeline`) to load the latest clearance data."
            return StreamingResponse(no_items_response(), media_type="text/plain")

        system_prompt = build_system_prompt(
            store_details.get("name", "Unknown Store"),
            store_details.get("brand", ""),
            clearances,
        )

        client = get_genai_client()

        # Build message history
        contents = []
        for msg in request.history:
            contents.append(
                types.Content(
                    role="user" if msg.role == "user" else "model",
                    parts=[types.Part.from_text(text=msg.content)],
                )
            )

        # Add current message
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=request.message)],
            )
        )

        # Generate streaming response
        generate_content_config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=4096,
        )

        async def generate():
            response = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=contents,
                config=generate_content_config,
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
