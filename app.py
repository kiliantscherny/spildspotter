"""Gradio chat app for food waste recipe recommendations.

This app connects to the Salling Food Waste DuckDB database and provides
recipe recommendations based on clearance items from selected stores.
"""

from typing import Generator

import duckdb
import gradio as gr
from openai import OpenAI

# Database configuration
DB_PATH = "salling_food_waste_pipeline.duckdb"


def get_latest_schema(conn: duckdb.DuckDBPyConnection) -> str:
    """Get the most recent dataset schema from the database."""
    result = conn.execute("""
        SELECT DISTINCT table_schema 
        FROM information_schema.tables 
        WHERE table_schema LIKE '%dataset%' 
          AND table_schema NOT LIKE '%staging%' 
        ORDER BY table_schema DESC 
        LIMIT 1
    """).fetchone()
    if not result:
        raise ValueError("No dataset schema found in database")
    return result[0]


def get_stores() -> list[dict]:
    """Fetch all stores from the database."""
    conn = duckdb.connect(DB_PATH, read_only=True)
    try:
        schema = get_latest_schema(conn)
        stores = conn.execute(f"""
            SELECT DISTINCT
                store__id,
                store__name,
                store__brand,
                store__address__street,
                store__address__city,
                store__address__zip
            FROM {schema}.food_waste_stores
            ORDER BY store__brand, store__name
        """).fetchdf()
        return stores.to_dict("records")
    finally:
        conn.close()


def get_store_clearances(store_id: str) -> list[dict]:
    """Fetch clearance items for a specific store."""
    conn = duckdb.connect(DB_PATH, read_only=True)
    try:
        schema = get_latest_schema(conn)
        clearances = conn.execute(
            f"""
            SELECT 
                c.product__description,
                c.product__categories__en,
                c.offer__new_price,
                c.offer__original_price,
                c.offer__percent_discount,
                c.offer__percent_discount__v_double,
                c.offer__stock,
                c.offer__stock_unit,
                c.offer__end_time,
                s.store__name,
                s.store__brand
            FROM {schema}.food_waste_stores__clearances c
            JOIN {schema}.food_waste_stores s 
                ON c._dlt_root_id = s._dlt_id
            WHERE s.store__id = ?
            ORDER BY c.offer__end_time ASC
        """,
            [store_id],
        ).fetchdf()
        return clearances.to_dict("records")
    finally:
        conn.close()


def sanitize_text(text: str | None) -> str:
    """Sanitize text to ensure it's valid UTF-8."""
    if text is None:
        return ""
    # Encode to UTF-8 and decode back, replacing problematic characters
    return text.encode("utf-8", errors="replace").decode("utf-8")


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
            or item.get("offer__percent_discount__v_double")
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

    return f"""You are a helpful culinary assistant specializing in reducing food waste. 
You help users create delicious recipes using discounted clearance items from Danish supermarkets.

The user is currently looking at clearance items from: {store_name} ({store_brand})

Here are the currently available clearance items at this store:

{items_text}

Your role:
1. Suggest creative, practical recipes using the available clearance items
2. Prioritize items that expire soonest (they appear first in the list)
3. Consider combining multiple clearance items when possible
4. Provide clear, step-by-step cooking instructions
5. Suggest approximate cooking times and serving sizes
6. Be encouraging about reducing food waste

Keep responses concise but helpful. Focus on the clearance items available, 
but you can suggest common pantry staples to complement them.
Respond in the same language the user writes in (Danish or English)."""


def chat_response(
    message: str,
    history: list[dict],
    store_id: str,
    api_key: str,
) -> Generator[str, None, None]:
    """Generate a streaming chat response."""
    if not store_id:
        yield "Please select a store first to see available clearance items."
        return

    if not api_key:
        yield "Please enter your OpenAI API key to use the chat feature."
        return

    # Fetch store info and clearances
    clearances = get_store_clearances(store_id)
    if not clearances:
        yield "No clearance items found at this store. Try selecting a different store."
        return

    store_name = clearances[0].get("store__name", "Unknown Store")
    store_brand = clearances[0].get("store__brand", "")

    # Build messages for the API
    system_prompt = build_system_prompt(store_name, store_brand, clearances)
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (Gradio 6 uses dicts: {"role": "...", "content": "..."})
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current message
    messages.append({"role": "user", "content": message})

    # Call OpenAI API with streaming
    try:
        client = OpenAI(api_key=api_key)
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            stream=True,
            max_tokens=1024,
        )

        response_text = ""
        for chunk in stream:
            if chunk.choices[0].delta.content:
                response_text += chunk.choices[0].delta.content
                yield response_text

    except Exception as e:
        import traceback

        traceback.print_exc()
        yield f"Error communicating with OpenAI: {e!r}"


def create_store_dropdown_choices() -> list[tuple[str, str]]:
    """Create dropdown choices for store selection."""
    stores = get_stores()
    choices = []
    for store in stores:
        label = f"{store['store__brand'].upper()} - {store['store__name']} ({store['store__address__city']})"
        choices.append((label, store["store__id"]))
    return choices


def get_store_info(store_id: str) -> str:
    """Get formatted info about selected store's clearance items."""
    if not store_id:
        return "Select a store to see available clearance items."

    clearances = get_store_clearances(store_id)
    if not clearances:
        return "No clearance items currently available at this store."

    store_name = clearances[0].get("store__name", "Unknown")
    store_brand = clearances[0].get("store__brand", "")

    header = f"### {store_brand.upper()} - {store_name}\n"
    header += f"**{len(clearances)} clearance items available**\n\n"

    items = []
    for item in clearances:
        description = item.get("product__description") or "Unknown item"
        new_price = item.get("offer__new_price", 0)
        original_price = item.get("offer__original_price", 0)
        discount = (
            item.get("offer__percent_discount")
            or item.get("offer__percent_discount__v_double")
            or 0
        )

        items.append(
            f"- **{description}**: {new_price:.2f} DKK ~~{original_price:.2f}~~ ({discount:.0f}% off)"
        )

    return header + "\n".join(items)


# Custom CSS for a clean, modern look
custom_css = """
:root {
    --primary-color: #2d5a27;
    --secondary-color: #4a7c42;
    --accent-color: #8bc34a;
    --bg-dark: #1a1a1a;
    --bg-card: #242424;
    --text-primary: #e8e8e8;
    --text-secondary: #a0a0a0;
}

.gradio-container {
    max-width: 1200px !important;
    font-family: 'DM Sans', system-ui, sans-serif;
}

.main-header {
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    text-align: center;
}

.main-header h1 {
    color: white;
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.5px;
}

.main-header p {
    color: rgba(255,255,255,0.85);
    margin: 0.5rem 0 0 0;
    font-size: 1rem;
}

.store-info-panel {
    background: var(--bg-card);
    border-radius: 10px;
    padding: 1rem;
    border: 1px solid rgba(139, 195, 74, 0.2);
}

.chatbot {
    border-radius: 10px !important;
}
"""


def create_app() -> gr.Blocks:
    """Create the Gradio application."""

    with gr.Blocks(title="Food Waste Recipe Assistant") as app:
        # Header
        gr.HTML("""
            <div class="main-header">
                <h1>Food Waste Recipe Assistant</h1>
                <p>Get recipe ideas from discounted supermarket items</p>
            </div>
        """)

        with gr.Row():
            # Left sidebar
            with gr.Column(scale=1):
                api_key = gr.Textbox(
                    label="OpenAI API Key",
                    type="password",
                    placeholder="sk-...",
                    info="Required for recipe suggestions",
                )

                store_dropdown = gr.Dropdown(
                    label="Select Store",
                    choices=create_store_dropdown_choices(),
                    value=None,
                    info="Choose a store to see clearance items",
                )

                store_info = gr.Markdown(
                    value="Select a store to see available clearance items.",
                    elem_classes=["store-info-panel"],
                )

            # Main chat area
            with gr.Column(scale=2):
                chatbot = gr.Chatbot(
                    label="Recipe Assistant",
                    height=500,
                )

                msg = gr.Textbox(
                    label="Your message",
                    placeholder="Ask for recipe ideas based on the clearance items...",
                    lines=2,
                    max_lines=4,
                )

                with gr.Row():
                    submit = gr.Button("Send", variant="primary")
                    clear = gr.Button("Clear Chat")

        # Event handlers
        store_dropdown.change(
            fn=get_store_info,
            inputs=[store_dropdown],
            outputs=[store_info],
        )

        def respond(message, history, store_id, api_key):
            """Handle chat submission."""
            history = history or []

            response_gen = chat_response(message, history, store_id, api_key)
            partial_response = ""

            for partial in response_gen:
                partial_response = partial
                yield (
                    history
                    + [
                        {"role": "user", "content": message},
                        {"role": "assistant", "content": partial_response},
                    ],
                    "",
                )

        submit.click(
            fn=respond,
            inputs=[msg, chatbot, store_dropdown, api_key],
            outputs=[chatbot, msg],
        )

        msg.submit(
            fn=respond,
            inputs=[msg, chatbot, store_dropdown, api_key],
            outputs=[chatbot, msg],
        )

        clear.click(
            fn=lambda: [],
            outputs=[chatbot],
        )

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

    return app


if __name__ == "__main__":
    app = create_app()
    app.launch()
