# Salling Food Waste Recipe App

A recipe recommender that helps reduce food waste by suggesting recipes based on discounted items from Danish grocery stores (Føtex, Netto, Bilka, Basalt).

## Features

- 🛒 Fetches real-time food waste data from Salling Group API
- 🤖 AI-powered recipe recommendations based on available discounted items
- 🗺️ Browse stores by location
- 💰 See discounts and savings

## Setup

1. **Install dependencies:**
   ```bash
   uv sync
   ```

2. **Configure API keys:**
   
   Create `.dlt/secrets.toml`:
   ```toml
   [salling_food_waste_source]
   access_token = "your_salling_api_token"
   ```
   
   Get your Salling Group API token from: https://developer.sallinggroup.com/

3. **Run the data pipeline:**
   ```bash
   uv run python salling_food_waste_pipeline.py
   ```

4. **Launch the app:**
   ```bash
   uv run python app.py
   ```

## Project Structure

```
├── salling_food_waste_pipeline.py  # Data ingestion from Salling API
├── app.py                          # Gradio web app
├── .dlt/
│   ├── config.toml                 # dlt configuration
│   └── secrets.toml                # API keys (not in git)
├── pyproject.toml                  # Project dependencies
└── README.md
```

## Deployment

Deploy to HuggingFace Spaces:

1. Create a new Space on HuggingFace (Gradio SDK)
2. Push your code to the Space repository
3. Add secrets in Space settings for API keys

## License

MIT
