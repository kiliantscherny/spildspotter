"""Gradio chat app for food waste recipe recommendations.

This app connects to the Salling Food Waste DuckDB database and provides
recipe recommendations based on clearance items from selected stores.
"""

import base64
import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Generator

import duckdb
import gradio as gr
import pandas as pd
from google import genai
from google.genai import types
from google.oauth2 import service_account
from PIL import Image

# Database configuration
DB_PATH = "sources/food_waste/salling_food_waste.duckdb"
SCHEMA_NAME = "salling_data"


def get_service_account_credentials():
    """Get GCP service account credentials from base64-encoded environment variable.

    Expects GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 environment variable containing
    base64-encoded JSON service account key.

    Raises:
        ValueError: If GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is not set
    """
    encoded_key = os.getenv("GOOGLE_SERVICE_ACCOUNT_KEY_BASE64")

    if not encoded_key:
        raise ValueError(
            "GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 environment variable not set. "
            "Please set it to a base64-encoded service account JSON key. "
        )

    # Decode base64 and parse JSON
    decoded_key = base64.b64decode(encoded_key)
    service_account_info = json.loads(decoded_key)

    # Create credentials from dictionary
    credentials = service_account.Credentials.from_service_account_info(
        service_account_info,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    return credentials


@lru_cache(maxsize=1)
def get_stores() -> list[dict]:
    """Fetch all stores from the database (cached for performance)."""
    conn = duckdb.connect(DB_PATH, read_only=True)
    try:
        stores = conn.execute(f"""
            SELECT DISTINCT
                id,
                name,
                brand,
                address__street,
                address__city,
                address__zip
            FROM {SCHEMA_NAME}.all_stores
            ORDER BY brand, name
        """).fetchdf()
        return stores.to_dict("records")
    finally:
        conn.close()


@lru_cache(maxsize=128)
def get_store_details(store_id: str) -> dict | None:
    """Fetch store details from all_stores table (source of truth for store data)."""
    conn = duckdb.connect(DB_PATH, read_only=True)
    try:
        result = conn.execute(
            f"""
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
        """,
            [store_id],
        ).fetchdf()
        if len(result) == 0:
            return None
        return result.to_dict("records")[0]
    finally:
        conn.close()


@lru_cache(maxsize=128)
def get_store_clearances(store_id: str) -> tuple[dict, ...]:
    """Fetch clearance items for a specific store (cached for performance)."""
    conn = duckdb.connect(DB_PATH, read_only=True)
    try:
        clearances = conn.execute(
            f"""
            SELECT
                c.product__description,
                c.product__categories__en,
                c.product__image,
                CAST(c.offer__new_price AS DOUBLE) AS offer__new_price,
                CAST(c.offer__original_price AS DOUBLE) AS offer__original_price,
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
        """,
            [store_id],
        ).fetchdf()
        # Return as tuple of dicts for caching (lists aren't hashable)
        return tuple(clearances.to_dict("records"))
    finally:
        conn.close()


def sanitize_text(text: str | None) -> str:
    """Sanitize text to ensure it's valid UTF-8."""
    if text is None:
        return ""
    # Encode to UTF-8 and decode back, replacing problematic characters
    return text.encode("utf-8", errors="replace").decode("utf-8")


def get_clearances_dataframe(store_id: str) -> pd.DataFrame:
    """Get clearance items formatted as a DataFrame for display."""
    if not store_id:
        return pd.DataFrame()

    clearances = get_store_clearances(store_id)
    if not clearances:
        return pd.DataFrame()

    # Format the data for display
    data = []
    for item in clearances:
        image_url = item.get("product__image")

        # Use placeholder for invalid/missing images
        if not image_url or len(image_url) < 20 or image_url.endswith("/image"):
            image_url = "https://placehold.co/600x400?text=No+Product+Image"

        data.append(
            {
                "Image": image_url,
                "Product": sanitize_text(item.get("product__description")) or "Unknown",
                "Category": sanitize_text(item.get("product__categories__en")) or "N/A",
                "New Price (DKK)": f"{item.get('offer__new_price', 0):.2f}",
                "Original Price (DKK)": f"{item.get('offer__original_price', 0):.2f}",
                "Discount": f"{item.get('offer__percent_discount', 0):.0f}%",
                "Stock": f"{item.get('offer__stock', 0):.1f} {sanitize_text(item.get('offer__stock_unit')) or ''}",
            }
        )

    return pd.DataFrame(data)


def format_clearance_items(clearances: list[dict]) -> str:
    """Format clearance items into a readable string for the LLM."""
    if not clearances:
        return "No clearance items currently available at this store."

    lines = []
    for item in clearances:
        description = sanitize_text(item.get("product__description")) or "Unknown item"
        category = sanitize_text(item.get("product__categories__en")) or "Uncategorized"
        new_price = item.get("offer__new_price", 0) or 0
        original_price = item.get("offer__original_price", 0) or 0
        discount = (
            item.get("offer__percent_discount")
            # or item.get("offer__percent_discount__v_double")
            or 0
        )
        stock = item.get("offer__stock", 0) or 0
        stock_unit = sanitize_text(item.get("offer__stock_unit")) or "units"

        lines.append(
            f"- {description} ({category}): {new_price:.2f} DKK "
            f"(was {original_price:.2f} DKK, {discount:.0f}% off), "
            f"~{stock:.2f} {stock_unit} available"
        )

    return "\n".join(lines)


def build_system_prompt(
    store_name: str, store_brand: str, clearances: list[dict]
) -> str:
    """Build the system prompt with store context and clearance items."""
    store_name = sanitize_text(store_name)
    store_brand = sanitize_text(store_brand)
    items_text = format_clearance_items(clearances)

    return f"""CRITICAL LANGUAGE INSTRUCTION:
You MUST respond in English.

IMPORTANT: Product names in the clearance items list may be in Danish (e.g. "Hakket Oksekød", "Gnocchi").
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


def chat_response(
    message: str,
    history: list[dict],
    store_id: str,
) -> Generator[str, None, None]:
    """Generate a streaming chat response using Gemini."""
    if not store_id:
        yield "Please select a store first to see available clearance items."
        return

    # Fetch store details from all_stores table (source of truth)
    store_details = get_store_details(store_id)
    if not store_details:
        yield "Store not found. Please select a valid store."
        return

    store_name = store_details.get("name", "Unknown Store")
    store_brand = store_details.get("brand", "")

    # Fetch clearances for this store
    clearances = get_store_clearances(store_id)
    if not clearances:
        yield "No clearance items found at this store. Try selecting a different store."
        return

    # Build system prompt
    system_prompt = build_system_prompt(store_name, store_brand, clearances)

    # Call Gemini API with streaming
    try:
        # Load service account credentials from env var or file
        credentials = get_service_account_credentials()

        # Create Gemini client with service account
        client = genai.Client(
            vertexai=True,
            project=os.getenv("GCP_PROJECT_NAME"),
            location=os.getenv(key="GCP_PROJECT_LOCATION"),
            credentials=credentials,
        )

        # Build conversation history for Gemini
        contents = []

        # Add conversation history
        for msg in history:
            role = "model" if msg["role"] == "assistant" else "user"

            # Handle different content formats (string or list of parts)
            content = msg["content"]
            if isinstance(content, str):
                # Simple text message
                text = content
            elif isinstance(content, list):
                # Multimodal content - extract text from parts
                text = " ".join(
                    part.get("text", "") if isinstance(part, dict) else str(part)
                    for part in content
                )
            else:
                text = str(content)

            contents.append(types.Content(role=role, parts=[types.Part(text=text)]))

        # Add current message (handle string or list format)
        if isinstance(message, str):
            message_text = message
        elif isinstance(message, list):
            # Multimodal content - extract text from parts
            message_text = " ".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in message
            )
        else:
            message_text = str(message)

        contents.append(
            types.Content(role="user", parts=[types.Part(text=message_text)])
        )

        # Generate response with streaming
        response = client.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=4096,
            ),
        )

        response_text = ""
        for chunk in response:
            if chunk.text:
                response_text += chunk.text
                yield response_text

            # Check if response was cut off due to length
            if hasattr(chunk, "candidates") and chunk.candidates:
                finish_reason = chunk.candidates[0].finish_reason
                if finish_reason and finish_reason != "STOP":
                    import sys

                    print(
                        f"Response ended with finish_reason: {finish_reason}",
                        file=sys.stderr,
                    )

    except Exception as e:
        import traceback

        traceback.print_exc()
        yield f"Error communicating with Gemini: {e!r}"


@lru_cache(maxsize=1)
def get_brands() -> list[str]:
    """Get all unique store brands."""
    conn = duckdb.connect(DB_PATH, read_only=True)
    try:
        brands = conn.execute(f"""
            SELECT DISTINCT brand
            FROM {SCHEMA_NAME}.all_stores s
            INNER JOIN {SCHEMA_NAME}.food_waste_stores fw
                ON s.id = fw.store__id
            ORDER BY brand
        """).fetchdf()
        return brands["brand"].tolist()
    finally:
        conn.close()


@lru_cache(maxsize=10)
def get_stores_by_brand(brand: str) -> list[tuple[str, str]]:
    """Get stores filtered by brand."""
    conn = duckdb.connect(DB_PATH, read_only=True)
    try:
        stores = conn.execute(
            f"""
            SELECT DISTINCT
                id,
                name,
                address__street,
                address__city,
                address__zip
            FROM {SCHEMA_NAME}.all_stores
            WHERE brand = ?
            ORDER BY address__city, name
        """,
            [brand],
        ).fetchdf()

        choices = []
        for _, store in stores.iterrows():
            # Format: "City - Store Name, Street"
            label = f"{store['address__city']} - {store['name']}, {store['address__street']}"
            choices.append((label, store["id"]))

        return choices
    finally:
        conn.close()


def get_store_info(store_id: str) -> str:
    """Get formatted info about selected store's clearance items."""
    if not store_id:
        return "Select a store to see available clearance items."

    # Fetch store details from all_stores table (source of truth)
    store_details = get_store_details(store_id)
    if not store_details:
        return "Store not found. Please select a valid store."

    store_name = store_details.get("name", "Unknown")
    store_brand = store_details.get("brand", "")

    # Fetch clearances for this store
    clearances = get_store_clearances(store_id)
    if not clearances:
        return "No clearance items currently available at this store."

    header = f"### {store_brand.upper()} - {store_name}\n"
    header += f"**{len(clearances)} clearance items available**\n\n"

    items = []
    for item in clearances:
        description = item.get("product__description") or "Unknown item"
        new_price = item.get("offer__new_price", 0)
        original_price = item.get("offer__original_price", 0)
        discount = (
            item.get("offer__percent_discount")
            # or item.get("offer__percent_discount__v_double")
            or 0
        )

        items.append(
            f"- **{description}**: {new_price:.2f} DKK ~~{original_price:.2f}~~ ({discount:.0f}% off)"
        )

    return header + "\n".join(items)


# Custom CSS for an eco-friendly, modern look with dark mode support
custom_css = """
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

/* Light mode (default) */
:root {
    --eco-green-dark: #2d5a27;
    --eco-green-medium: #4a7c42;
    --eco-green-light: #8bc34a;
    --eco-green-pale: #c5e1a5;
    --bg-primary: #fafaf9;
    --bg-card: #ffffff;
    --border-color: #e5e7eb;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

* {
    font-family: 'DM Sans', system-ui, -apple-system, sans-serif !important;
}

.gradio-container {
    max-width: 1400px !important;
    margin: 0 auto !important;
}

.main-header {
    background: #ffffff;
    padding: 2rem;
    border-radius: 16px;
    text-align: center;
    box-shadow: var(--shadow-lg);
    border: 2px solid #2563eb;
    align-items: center;
}

.header-logo img {
    height: 80px;
    margin-bottom: 1rem;
}

.header-text h1 {
    color: #2563eb !important;
    margin: 0;
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: -0.5px;
    font-family: 'JetBrains Mono', monospace !important;
}

.header-text p {
    color: #2563eb !important;
    margin: 0.75rem 0 0 0;
    font-size: 1.125rem;
    font-weight: 400;
    font-family: 'JetBrains Mono', monospace !important;
}

/* Align dropdown with header */
.gradio-container .gradio-row:first-of-type {
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
}

.sidebar-card {
    background: var(--bg-card) !important;
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid var(--border-color) !important;
    box-shadow: var(--shadow-sm);
    margin-bottom: 1rem;
    color: var(--text-primary) !important;
}

.sidebar-card * {
    color: var(--text-primary) !important;
}

.offers-table-container {
    background: var(--bg-card) !important;
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid var(--border-color) !important;
    box-shadow: var(--shadow-sm);
    margin-top: 2rem;
}

.offers-table-container h3 {
    color: var(--eco-green-dark) !important;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
}

.chat-panel {
    border: 2px solid #2563eb;
    border-radius: 16px;
    padding: 1rem;
    background: repeating-linear-gradient(
        45deg,
        #ffffff,
        #ffffff 10px,
        #dbeafe 10px,
        #dbeafe 20px
    );
}

button[variant="primary"] {
    background: #4a7c42 !important;
    border-color: #4a7c42 !important;
}

button[variant="primary"]:hover {
    background: #2d5a27 !important;
    border-color: #2d5a27 !important;
}

/* Ensure dataframe text is visible in dark mode */
.dataframe {
    color: var(--text-primary) !important;
}

.dataframe * {
    color: var(--text-primary) !important;
}
"""


def create_app() -> tuple[gr.Blocks, str, gr.themes.Base]:
    """Create the Gradio application and return app, css, and theme."""

    custom_theme = gr.themes.Soft(
        primary_hue="green",
        secondary_hue="emerald",
        neutral_hue="slate",
    )

    logo_path = Path(__file__).parent / "static" / "spildspotter-logo.png"
    logo_image = Image.open(logo_path)

    with gr.Blocks(title="Food Waste Recipe Assistant") as app:
        # Header with logo
        with gr.Row(elem_classes=["main-header"]):
            gr.Image(
                value=logo_image,
                show_label=False,
                interactive=False,
                container=False,
                elem_classes=["header-logo"],
                buttons=[],
            )
            gr.HTML(
                """
                <div class="header-text">
                    <h1>Food Waste Recipe Assistant</h1>
                    <p>Get recipe ideas from discounted supermarket items</p>
                </div>
                """
            )

        # Store selection filters
        with gr.Row():
            with gr.Column(scale=1):
                brand_dropdown = gr.Dropdown(
                    label="Select Brand",
                    choices=[(b.title(), b) for b in get_brands()],
                    value=None,
                    info="Choose a store brand",
                    allow_custom_value=False,
                    container=True,
                )
            with gr.Column(scale=2):
                store_dropdown = gr.Dropdown(
                    label="Select Store",
                    choices=[],
                    value=None,
                    info="First select a brand",
                    filterable=True,
                    allow_custom_value=False,
                    container=True,
                    interactive=False,  # Disabled until brand is selected
                )

        # Main chat area
        with gr.Row():
            with gr.Column(scale=1):
                chatbot = gr.Chatbot(
                    label="Recipe Assistant",
                    height=500,
                    placeholder="<strong>Food Waste Recipe Assistant</strong><br>Select a store and ask me for recipe ideas!",
                    elem_classes=["chat-panel"],
                )

                msg = gr.Textbox(
                    label="Your message",
                    placeholder="Ask for recipe ideas based on the clearance items...",
                    lines=1,  # Single line makes Enter submit by default
                    max_lines=10,  # Can expand up to 10 lines with Shift+Enter
                )

                with gr.Row():
                    submit = gr.Button("Send", variant="primary")
                    clear = gr.Button("Clear Chat")

        # Example prompts
        gr.Examples(
            examples=[
                ["What recipes can I make with the pork items?"],
                ["Suggest a quick dinner recipe using clearance items"],
                ["Hvad kan jeg lave med de tilgangelige varer?"],
                ["Give me a budget-friendly meal plan for tonight"],
            ],
            inputs=msg,
        )

        # Offers table
        with gr.Column(elem_classes=["offers-table-container"]):
            gr.HTML("<h3>Current Clearance Offers</h3>")
            offers_table = gr.DataFrame(
                value=pd.DataFrame(
                    columns=[
                        "Image",
                        "Product",
                        "Category",
                        "New Price (DKK)",
                        "Original Price (DKK)",
                        "Discount",
                        "Stock",
                    ]
                ),
                label="Select a store to see available discounted items",
                interactive=False,
                wrap=True,
                datatype=["image", "str", "str", "str", "str", "str", "str"],  # type: ignore
                column_widths=[
                    "80px",
                    "200px",
                    "120px",
                    "100px",
                    "100px",
                    "80px",
                    "100px",
                ],
                show_search="search",
            )

        # Event handlers (must be after all components are defined)
        def update_store_choices(brand):
            """Update store dropdown choices when brand is selected."""
            if not brand:
                return gr.Dropdown(
                    choices=[],
                    value=None,
                    interactive=False,
                    info="First select a brand",
                )

            stores = get_stores_by_brand(brand)
            return gr.Dropdown(
                choices=stores,
                value=None,
                interactive=True,
                info=f"Select a {brand.title()} store",
            )

        def update_offers_table(store_id):
            """Update offers table when store changes."""
            return get_clearances_dataframe(store_id)

        def user(user_message, history):
            """Add user message to chat history."""
            return "", history + [{"role": "user", "content": user_message}]

        def bot(history, store_id):
            """Generate and stream bot response."""
            if not store_id:
                history.append(
                    {
                        "role": "assistant",
                        "content": "Please select a store first to see available clearance items.",
                    }
                )
                yield history
                return

            # Get the last user message (extract text from content)
            last_message_content = history[-1]["content"]
            if isinstance(last_message_content, str):
                user_message = last_message_content
            elif isinstance(last_message_content, list):
                # Extract text from list of content parts
                user_message = " ".join(
                    part.get("text", "") if isinstance(part, dict) else str(part)
                    for part in last_message_content
                )
            else:
                user_message = str(last_message_content)

            # Get previous messages (exclude the last user message)
            previous_history = history[:-1]

            # Generate streaming response
            response_gen = chat_response(user_message, previous_history, store_id)

            # Add empty assistant message
            history.append({"role": "assistant", "content": ""})

            # Stream the response
            for partial in response_gen:
                history[-1]["content"] = partial
                yield history

        # Connect brand dropdown to update store choices
        brand_dropdown.change(
            fn=update_store_choices,
            inputs=[brand_dropdown],
            outputs=[store_dropdown],
        )

        # Connect store dropdown to update offers table
        store_dropdown.change(
            fn=update_offers_table,
            inputs=[store_dropdown],
            outputs=[offers_table],
        )

        submit.click(
            fn=user,
            inputs=[msg, chatbot],
            outputs=[msg, chatbot],
            queue=False,
        ).then(
            fn=bot,
            inputs=[chatbot, store_dropdown],
            outputs=[chatbot],
        )

        msg.submit(
            fn=user,
            inputs=[msg, chatbot],
            outputs=[msg, chatbot],
            queue=False,
        ).then(
            fn=bot,
            inputs=[chatbot, store_dropdown],
            outputs=[chatbot],
        )

        clear.click(
            fn=lambda: [],
            outputs=[chatbot],
        )

    return app, custom_css, custom_theme


if __name__ == "__main__":
    app, css, theme = create_app()
    app.launch(
        css=css,
        theme=theme,
    )
