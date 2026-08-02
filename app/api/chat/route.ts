import { NextRequest, NextResponse } from "next/server";
import { validateEnv, getCurrentDateStr } from "@/lib/utils/env";
import * as handlers from "@/lib/chat/handlers";

type ChatMessage = { role: "user" | "assistant"; content: string };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(messages: object[], model = "llama-3.1-8b-instant", temperature = 0.3, retries = 2): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not set");

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const res = await fetch(GROQ_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({ model, messages, temperature }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`Groq error: ${res.status}`);
            const data = await res.json();
            return data?.choices?.[0]?.message?.content ?? "";
        } catch (err: unknown) {
            if (attempt === retries) throw err;
            console.warn(`[Groq API] Connection attempt ${attempt + 1} failed. Retrying in ${(attempt + 1)}s...`);
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
    return "";
}

function countConstraints(parsed: Record<string, unknown>): number {
    if (!parsed || typeof parsed !== "object") return 0;
    let count = 0;
    
    // Ignore intent and other metadata/clarification keys
    const ignoreKeys = new Set(["intent", "reply", "guideId", "stepIndex"]);
    
    for (const [key, value] of Object.entries(parsed)) {
        if (ignoreKeys.has(key)) continue;
        if (value !== null && value !== undefined && value !== "unknown" && value !== "none" && value !== "") {
            count++;
        }
    }
    return count;
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
TROP is EXCLUSIVELY for shopping (products, deals, loot) and travel booking (flights, hotels, trains).
If the user asks about ANYTHING else (e.g., general knowledge, cooking, sports, science, life advice, or "what is an apple"), you MUST return the "out_of_scope" intent.

Given context and message, return JSON ONLY.

Rules:
- CRITICAL: Always merge details from "Recent context" with the latest message. If "Recent context" has departure/destination cities or travel intent, carry them forward.
- CRITICAL: Always convert natural language dates (e.g., "30th august", "tomorrow", "next Friday", "aug 30") into standard "YYYY-MM-DD" format using Today (${today}).
- If user says "i want to travel" or "plan a trip" WITHOUT mentioning Flight or Train, use "travel_generic".
- If user HAS mentioned a mode (e.g. "book a flight" or "train from..."), use that specific intent ("flight" or "train").
- Do NOT trigger "loot" or "search" for simple acknowledgments like "ok", "yes", "sure", "thanks", "fine". These should be "chat".

Intents:
1. "flight" — user wants a flight. Returns: {"intent":"flight", "from":"<IATA|unknown>", "to":"<IATA|unknown>", "date":"YYYY-MM-DD|unknown", "return_date":"YYYY-MM-DD|none"}
   - Resolve city/state to 3-letter IATA airport codes (Pune: PNQ, Delhi: DEL, Mumbai: BOM, Kerala/Kochi: COK).
2. "hotel" — {"intent":"hotel", "location":"<city|unknown>", "check_in":"YYYY-MM-DD|unknown", "check_out":"YYYY-MM-DD|unknown", "max_price":<number|null>}
3. "train" — {"intent":"train", "from":"<station/city|unknown>", "to":"<station/city|unknown>", "date":"YYYY-MM-DD|unknown"}
4. "travel_generic" — user wants a trip/holiday but has NOT mentioned if it's a Flight or Train.
6. "guide" — {"intent":"guide", "category":"fashion|health|furniture|unknown", "query":"<query>", "guideId":"<id|none>", "stepIndex":<number|null>}
7. "search" — {"intent":"search", "query":"<query>", "brand":"<brand name|none>", "max_price":<number|null>}
   - Dynamically extract any brand mentioned by the user (e.g. "adidas", "nike", "apple", "zara", "seiko", "nothing", etc.). If no brand is specified, return "none".
8. "loot" — {"intent":"loot", "query":"<query|none>"} — Use ONLY when user explicitly asks for "deals", "loot", "offers", "coupons", or "discounts" (e.g., "show me deals", "best offers").
9. "chat" — greetings, polite talk, or simple acknowledgments ("ok", "got it").
10. "out_of_scope" — anything not shopping or travel.
11. "clarify" — {"intent":"clarify", "reply":"<question for missing info>"}`,
            },
            ...(contextSummary ? [{ role: "user", content: `Recent context:\n${contextSummary}` }] : []),
            { role: "user", content: message },
        ];

        // Step 1: Classify intent and extract variables using the cheap model first
        let modelUsed = "llama-3.1-8b-instant";
        let classifyRaw = await callGroq(classifyMessages, modelUsed, 0.0);
        let parsed: Record<string, unknown> = {};
        try {
            parsed = JSON.parse(classifyRaw.replace(/```json|```/g, "").trim());
        } catch {
            parsed = { intent: "chat" };
        }

        const constraintCount = countConstraints(parsed);
        console.log(`[Hybrid Routing] Cheap model (${modelUsed}) extracted ${constraintCount} constraints.`);

        // Step 2: Escalate to the expert model if it's a complex query (> 3 constraints)
        if (constraintCount > 3) {
            modelUsed = "llama-3.3-70b-versatile";
            console.log(`[Hybrid Routing] Escalating to expert model (${modelUsed}) for complex query.`);
            classifyRaw = await callGroq(classifyMessages, modelUsed, 0.0);
            try {
                parsed = JSON.parse(classifyRaw.replace(/```json|```/g, "").trim());
            } catch {
                parsed = { intent: "chat" };
            }
        }

        const intent = (parsed.intent as string) || "chat";

        // Route to specialized handlers
        switch (intent) {
            case "travel_generic":
                return NextResponse.json({
                    type: "chat",
                    reply: "I'd love to help you plan your trip! 🌍 Where are we going? And would you like me to find you a **Flight** or **Train**? ✈️🚂"
                });
            case "flight":
                return handlers.handleFlight(parsed as handlers.ParsedFlightIntent);
            case "hotel":
                return handlers.handleHotel(parsed as handlers.ParsedHotelIntent);
            case "train":
                return handlers.handleTrain(parsed as handlers.ParsedTrainIntent);
            case "guide":
                return handlers.handleGuide(parsed as handlers.ParsedGuideIntent, message);
            case "loot":
                return handlers.handleLoot(parsed as handlers.ParsedLootIntent);
            case "search":
                return handlers.handleSearch(parsed as unknown as handlers.ParsedSearchIntent);
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
                const reply = await callGroq(restrictedHistory, "llama-3.3-70b-versatile", 0.8);
                return NextResponse.json({ type: "chat", reply });
        }
    } catch (e: unknown) {
        const err = e as Error;
        console.error("API Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
