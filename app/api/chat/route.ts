import { NextRequest, NextResponse } from "next/server";
import { validateEnv, getCurrentDateStr } from "@/lib/utils/env";
import * as handlers from "@/lib/chat/handlers";

type ChatMessage = { role: "user" | "assistant"; content: string };

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
        validateEnv();
        const { message, history } = await req.json() as {
            message: string;
            history: ChatMessage[];
        };

        if (!message?.trim()) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const contextSummary = buildContextSummary(history);
        const today = getCurrentDateStr();

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
   - Resolve partial dates based on Today: ${today}.
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

        // Route to specialized handlers
        switch (intent) {
            case "travel_generic":
                return NextResponse.json({
                    type: "chat",
                    reply: "I'd love to help you plan your trip! 🌍 Where are we going? And would you like me to find you a **Flight**, **Train**, or **Bus**? ✈️🚂🚌"
                });
            case "flight":
                return handlers.handleFlight(parsed);
            case "hotel":
                return handlers.handleHotel(parsed);
            case "train":
                return handlers.handleTrain(parsed);
            case "bus":
                return handlers.handleBus(parsed);
            case "guide":
                return handlers.handleGuide(parsed, message);
            case "loot":
                return handlers.handleLoot(parsed);
            case "search":
                return handlers.handleSearch(parsed);
            case "clarify":
                return NextResponse.json({ type: "chat", reply: parsed.reply });
            case "out_of_scope":
                return NextResponse.json({
                    type: "chat",
                    reply: "I'm TROP, your dedicated AI assistant for **Shopping** and **Trip Booking**! 🛍️✈️ I can help you find deals, book flights, hotels, trains, or buses, and find the best products. I don't have information on other topics yet. How can I help you with your next purchase or journey? 😊"
                });
            default:
                const restrictedHistory = [
                    {
                        role: "system",
                        content: `You are TROP, an AI assistant specialized ONLY in shopping and travel booking. Today is ${today}. Politely decline any questions outside these two domains. Always steer the conversation back to shopping or travel planning.`
                    },
                    ...history,
                    { role: "user", content: message }
                ];
                const reply = await callGroq(restrictedHistory, 0.8);
                return NextResponse.json({ type: "chat", reply });
        }
    } catch (e: any) {
        console.error("API Error:", e);
        return NextResponse.json({ error: "Internal Server Error", details: e.message }, { status: 500 });
    }
}
