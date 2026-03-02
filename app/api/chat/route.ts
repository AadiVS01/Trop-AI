import { NextRequest, NextResponse } from "next/server";
import { searchProducts, NormalizedProduct } from "@/lib/shopping/serpProvider";
import { findMatchingGuides, Guide } from "@/lib/guides/guideService";
import { searchFlights, searchHotels, FlightResult, HotelResult } from "@/lib/travel/serpTravelProvider";
import { fetchTrendingDeals, searchLootProducts, LootDeal } from "@/lib/deals/lootProvider";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ResponsePayload =
    | { type: "chat"; reply: string }
    | { type: "products"; query: string; products: NormalizedProduct[]; followUp: string }
    | { type: "guide"; guide: Guide; bundles: { category: string; products: NormalizedProduct[] }[] }
    | { type: "flights"; flights: FlightResult[]; followUp: string }
    | { type: "hotels"; hotels: HotelResult[]; followUp: string }
    | { type: "loot"; deals: LootDeal[]; query?: string; followUp: string };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(messages: object[], temperature = 0.3): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not set");

    const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, temperature }),
    });

    if (!res.ok) throw new Error(`Groq error: ${res.status}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
}

function buildContextSummary(history: ChatMessage[]): string {
    return history
        .slice(-8)
        .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 300)}`)
        .join("\n");
}

export async function POST(req: NextRequest) {
    try {
        const { message, history } = await req.json() as {
            message: string;
            history: ChatMessage[];
        };

        if (!message?.trim()) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const contextSummary = buildContextSummary(history);

        // Step 1: Classify intent and extract variables
        const classifyMessages = [
            {
                role: "system",
                content: `You are a travel and shopping intent classifier for an Indian assistant (TROP).
TROP is EXCLUSIVELY for shopping (products, deals, loot) and travel booking (flights, hotels, trains, buses).
If the user asks about ANYTHING else (e.g., general knowledge, cooking, sports, science, life advice, or "what is an apple"), you MUST return the "out_of_scope" intent.

Given context and message, return JSON ONLY.

Rules:
- If use says "i want to travel" or "plan a trip" WITHOUT mentioning Flight, Train, or Bus, use "travel_generic".
- If user HAS mentioned a mode (e.g. "book a flight"), you MUST use that specific intent (e.g. "flight"), NOT "travel_generic".
- Do NOT trigger "loot" or "search" for simple acknowledgments like "ok", "yes", "sure", "thanks", "fine". These should be "chat".
- Only use "loot" or "search" if it's a NEW request for products.

Intents:
1. "flight" — user wants a flight. Even if cities/dates are missing, use this. Returns: {"intent":"flight", "from":"<IATA|unknown>", "to":"<IATA|unknown>", "date":"YYYY-MM-DD|unknown", "return_date":"YYYY-MM-DD|none"}
   - Resolve city/state to 3-letter IATA airport codes (Pune: PNQ, Delhi: DEL, Mumbai: BOM).
   - Resolve partial dates based on Today: Feb 28, 2026.
2. "hotel" — {"intent":"hotel", "location":"<city|unknown>", "check_in":"YYYY-MM-DD|unknown", "check_out":"YYYY-MM-DD|unknown", "max_price":<number|null>}
   - Extract destination and dates.
3. "train" — {"intent":"train", "from":"<station/city|unknown>", "to":"<station/city|unknown>", "date":"YYYY-MM-DD|unknown"}
4. "bus" — {"intent":"bus", "from":"<city|unknown>", "to":"<city|unknown>", "date":"YYYY-MM-DD|unknown"}
5. "travel_generic" — user wants a trip/holiday but has NOT mentioned if it's a Flight, Train, or Bus.
6. "guide" — {"intent":"guide", "category":"fashion|health|furniture|unknown", "query":"<query>", "guideId":"<id|none>", "stepIndex":<number|null>}
7. "search" — {"intent":"search", "query":"<query>"}
8. "loot" — {"intent":"loot", "query":"<query|none>"}
9. "chat" — greetings, polite talk, or simple acknowledgments ("ok", "got it").
10. "out_of_scope" — anything not shopping or travel.
11. "clarify" — {"intent":"clarify", "reply":"<question for missing info>"}`,
            },
            ...(contextSummary ? [{ role: "user", content: `Recent context:\n${contextSummary}` }] : []),
            { role: "user", content: message },
        ];

        const classifyRaw = await callGroq(classifyMessages, 0.0);
        let parsed: any = {};
        try {
            parsed = JSON.parse(classifyRaw.replace(/```json|```/g, "").trim());
        } catch {
            parsed = { intent: "chat" };
        }

        const intent = parsed.intent || "chat";

        // Step 2-1: Travel Generic Flow
        if (intent === "travel_generic") {
            return NextResponse.json({
                type: "chat",
                reply: "I'd love to help you plan your trip! 🌍 Where are we going? And would you like me to find you a **Flight**, **Train**, or **Bus**? ✈️🚂🚌"
            });
        }

        // Step 2a: Flight Flow
        if (intent === "flight") {
            const { from, to, date, return_date } = parsed;
            if (!from || !to || !date || from === "unknown" || to === "unknown") {
                return NextResponse.json({ type: "chat", reply: "I'd love to help you find a flight! Where are you flying from and where to? (and what dates?) ✈️" });
            }
            const flights = await searchFlights(from, to, date, return_date !== "none" ? return_date : undefined);
            return NextResponse.json({
                type: "flights",
                flights,
                followUp: flights.length > 0 ? "Those are the best current options! Should I help you find a hotel at your destination? 🏨" : "I couldn't find any direct results. Want to try a different date?"
            });
        }

        // Step 2b: Hotel Flow
        if (intent === "hotel") {
            let { location, check_in, check_out, max_price } = parsed;

            // Intelligence: If check_in is provided but check_out isn't, default to 1 night stay
            if (check_in && check_in !== "unknown" && (!check_out || check_out === "unknown")) {
                try {
                    const d = new Date(check_in);
                    d.setDate(d.getDate() + 1);
                    check_out = d.toISOString().split('T')[0];
                } catch {
                    check_out = undefined;
                }
            }

            if (!location || location === "unknown") {
                return NextResponse.json({ type: "chat", reply: "Which city are you looking for hotels in? 🏨" });
            }
            if (!check_in || check_in === "unknown") {
                return NextResponse.json({ type: "chat", reply: `When are you planning to visit ${location}? (I'll find you the best deals for those dates!) 🗓️` });
            }

            const hotels = await searchHotels(location, check_in, check_out, max_price);
            return NextResponse.json({
                type: "hotels",
                hotels,
                followUp: hotels.length > 0
                    ? `Found these stays in ${location} within your budget! Let me know if you want to see other options.`
                    : `I couldn't find any hotels in ${location} under ₹${max_price} for those dates. Want to try a slightly higher budget or different dates?`
            });
        }

        // Step 2bc: Train & Bus Flow
        if (intent === "train") {
            const { from, to, date } = parsed;
            if (!from || !to || !date || from === "unknown" || to === "unknown") {
                return NextResponse.json({ type: "chat", reply: "I can help with train bookings! Just let me know the stations and the date. 🚂" });
            }
            const { searchTrains } = await import("@/lib/travel/serpTravelProvider");
            const trains = await searchTrains(from, to, date);
            return NextResponse.json({
                type: "flights", // Reuse flights UI for train results
                flights: trains,
                followUp: "I've found the best booking links and some exclusive loots for your journey! 🚂🔥"
            });
        }

        if (intent === "bus") {
            const { from, to, date } = parsed;
            if (!from || !to || !date || from === "unknown" || to === "unknown") {
                return NextResponse.json({ type: "chat", reply: "Tell me where you want to go by bus and when! 🚌" });
            }
            const { searchBuses } = await import("@/lib/travel/serpTravelProvider");
            const buses = await searchBuses(from, to, date);
            return NextResponse.json({
                type: "hotels", // Reuse hotel-style UI for bus cards
                hotels: buses,
                followUp: "Here are the best bus options and trending loots! 🚌✨"
            });
        }

        // Step 2c: Guide Flow (Iterative)
        if (intent === "guide") {
            const { category, query, guideId, stepIndex } = parsed;
            let guide: Guide | undefined;

            if (guideId && guideId !== "none") {
                guide = (await import("@/lib/guides/guideService")).getGuideById(guideId);
            }

            if (!guide) {
                const matches = findMatchingGuides(query !== "none" ? query : message, category !== "unknown" ? category : undefined);
                guide = matches[0];
            }

            if (guide) {
                const index = typeof stepIndex === "number" ? stepIndex : 0;
                const safeIndex = Math.min(Math.max(0, index), guide.steps.length - 1);
                const step = guide.steps[safeIndex];

                const bundle = {
                    category: step.name,
                    products: (await searchProducts(step.query)).slice(0, 5)
                };

                // The reply should be context-aware
                const nextStep = guide.steps[safeIndex + 1];
                const followUp = nextStep
                    ? `That's the ${step.name}. Ready to look at the next step: ${nextStep.name}?`
                    : `That's the final piece for your ${guide.name}! Need help with anything else?`;

                return NextResponse.json({
                    type: "guide",
                    guide,
                    bundles: [bundle],
                    reply: followUp
                });
            }
        }

        // Step 2d: Loot Flow
        if (intent === "loot") {
            const query = parsed.query && parsed.query !== "none" ? parsed.query : undefined;
            const deals = await fetchTrendingDeals(query);
            return NextResponse.json({
                type: "loot",
                deals,
                query,
                followUp: deals.length > 0
                    ? "These are the hottest loot deals right now! Move fast, they usually expire in minutes. 🔥"
                    : "I couldn't find any specific live loot for that right now. Checking these other trending deals instead..."
            });
        }

        // Step 2e: Search Flow
        if (intent === "search" && parsed.query) {
            const [products, loots] = await Promise.all([
                searchProducts(parsed.query),
                searchLootProducts(parsed.query)
            ]);
            // Merge results: Loot deals first (if any), then regular results
            const combined = [...loots, ...products].slice(0, 10);
            return NextResponse.json({
                type: "products",
                query: parsed.query,
                products: combined,
                followUp: loots.length > 0
                    ? "I found some exclusive flash deals for this! Look for the 🔥 LOOT badge."
                    : "Found these! Want to refine further?"
            });
        }

        // Step 2e: Clarify
        if (intent === "clarify" && parsed.reply) {
            return NextResponse.json({ type: "chat", reply: parsed.reply });
        }

        // Step 2f: Out of scope
        if (intent === "out_of_scope") {
            return NextResponse.json({
                type: "chat",
                reply: "I'm TROP, your dedicated AI assistant for **Shopping** and **Trip Booking**! 🛍️✈️ I can help you find deals, book flights, hotels, trains, or buses, and find the best products. I don't have information on other topics yet. How can I help you with your next purchase or journey? 😊"
            });
        }

        // Step 2g: Regular chat
        const restrictedHistory = [
            {
                role: "system",
                content: "You are TROP, an AI assistant specialized ONLY in shopping and travel booking. Politely decline any questions outside these two domains. Always steer the conversation back to shopping or travel planning."
            },
            ...history,
            { role: "user", content: message }
        ];
        const reply = await callGroq(restrictedHistory, 0.8);
        return NextResponse.json({ type: "chat", reply });

    } catch (e: any) {
        console.error("API Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
