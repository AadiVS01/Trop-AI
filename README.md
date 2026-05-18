# TROP

AI assistant for the Indian market focused on shopping, deals, and travel bookings (flights, hotels, trains, buses). The app routes user intent, fetches live results, and presents them in a unified chat UI. A separate eval harness tests constraint extraction prompts across multiple models.

## What it does

- Shopping search with Google Shopping (SerpAPI) and Amazon (RapidAPI)
- Live travel lookups for flights, hotels (Google + Agoda), trains (IRCTC), and buses
- Loot deals pulled from Telegram channels with a SerpAPI fallback
- Intent classification and routing via Groq
- Evaluation harness for constraint extraction prompts

## Structure

- app/: Next.js UI and API routes
- lib/: data providers (shopping, travel, deals) and chat handlers
- scripts/: Telegram auth utilities
- eval-harness/: prompt evaluation runner and datasets

## Quick start

1) Install dependencies

```bash
pnpm install
```

2) Create .env in the repo root

```bash
GROQ_API_KEY=your_groq_key
SERP_API_KEY=your_serpapi_key
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=your_rapidapi_amazon_host
RAPIDAPI_HOST_AGODA=your_rapidapi_agoda_host
RAPIDAPI_HOST_IRCTC=your_rapidapi_irctc_host
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=your_telegram_hash
TELEGRAM_SESSION=your_telegram_session
```

3) Run the app

```bash
pnpm dev
```

Open http://localhost:3000

## Environment variables

Required for core features:

- GROQ_API_KEY: Groq API for intent classification and chat
- SERP_API_KEY: SerpAPI for Google Shopping, Hotels, Flights, and fallback loot search
- RAPIDAPI_KEY: RapidAPI key for Amazon, Agoda, and IRCTC
- RAPIDAPI_HOST: RapidAPI host for Amazon product APIs
- RAPIDAPI_HOST_AGODA: RapidAPI host for Agoda hotel APIs
- RAPIDAPI_HOST_IRCTC: RapidAPI host for IRCTC train availability

Optional (enables richer loot search via Telegram):

- TELEGRAM_API_ID
- TELEGRAM_API_HASH
- TELEGRAM_SESSION

If Telegram variables are missing, loot search falls back to SerpAPI web search.

## Telegram session setup (optional)

Run the helper to generate a session string:

```bash
pnpm tsx scripts/telegram-auth.ts
```

Copy the printed session string into TELEGRAM_SESSION in .env.

## API routes

- POST /api/chat: main chat entry point, intent classification, and routing
- GET /api/resolve?id=...: resolve product sellers from SerpAPI

## Eval harness

The eval harness compares Stage 1 (zero-shot) and Stage 2 (few-shot) prompts on a dataset.

```bash
cd eval-harness
pnpm install
pnpm start
```

Results are saved as JSON in the eval-harness working directory.

## Development notes

- UI lives in app/page.tsx
- Providers live in lib/shopping, lib/travel, lib/deals
- The classifier prompt and routing logic live in app/api/chat/route.ts
