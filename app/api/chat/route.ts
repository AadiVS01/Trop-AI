import { NextRequest, NextResponse } from "next/server";
import { searchProducts, NormalizedProduct } from "@/lib/shopping/serpProvider";
import { findMatchingTemplates, OutfitTemplate, getBestLook } from "@/lib/style/styleService";
import { searchFlights, searchHotels, FlightResult, HotelResult } from "@/lib/travel/serpTravelProvider";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ResponsePayload =
    | { type: "chat"; reply: string }
    | { type: "products"; query: string; products: NormalizedProduct[]; followUp: string }
    | { type: "outfit"; template: OutfitTemplate; stylistNote?: string; bundles: { category: string; products: NormalizedProduct[] }[] }
    | { type: "flights"; flights: FlightResult[]; followUp: string }
    | { type: "hotels"; hotels: HotelResult[]; followUp: string };

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
Given context and message, return JSON ONLY.

Intents:
1. "flight" — user wants to book or find a flight. 
   Return: {"intent":"flight", "from":"<3-letter IATA code>", "to":"<3-letter IATA code>", "date":"YYYY-MM-DD", "return_date":"YYYY-MM-DD|none"}
   Important: 
   - ALWAYS resolve city/state names to their primary 3-letter IATA airport codes (e.g. Pune: PNQ, Kerala: COK, Delhi: DEL, Mumbai: BOM).
   - Resolve partial dates (e.g. "12", "15th") based on Today: Feb 28, 2026. If the user says "12", they mean 2026-03-12.
   - RETAIN "from" and "to" from context if not mentioned in the latest message.
2. "hotel" — user wants to book or find a hotel.
   Return: {"intent":"hotel", "location":"<city>", "check_in":"YYYY-MM-DD", "check_out":"YYYY-MM-DD", "max_price":<number|null>}
   Important: 
   - RETAIN "location", "check_in", "check_out" from context if not mentioned in the latest message.
   - Extract "max_price" if specified (e.g. "less than 2k" -> 2000).
3. "outfit" — shopping/styling request.
   Return: {"intent":"outfit", "gender":"male|female|unknown", "occasion":"wedding|party|formal|casual|everyday|unknown"}
4. "search" — specific product search.
   Return: {"intent":"search", "query":"<query>"}
5. "chat" — normal talk.
   Return: {"intent":"chat"}

If info like destination or dates are missing for travel, return "clarify" with a question.
6. "clarify" — {"intent":"clarify", "reply":"<friendly question asking for missing dates/cities>"}`,
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

        // Step 2c: Outfit Flow (Existing)
        if (intent === "outfit") {
            const { gender, occasion } = parsed;
            if (gender === "unknown" && (occasion === "unknown" || !occasion)) {
                const reply = await callGroq([{ role: "system", content: "Ask for gender/occasion for an outfit bundle." }, { role: "user", content: message }], 0.7);
                return NextResponse.json({ type: "chat", reply });
            }
            const matches = findMatchingTemplates(gender, occasion);
            const template = matches[0] || (await findMatchingTemplates(gender, "everyday"))[0];
            const look = getBestLook(template);
            if (look) {
                const bundles = await Promise.all(look.items.map(async (item) => {
                    const q = (gender && gender !== "unknown") ? `${gender} ${item.query}` : item.query;
                    return { category: item.category, products: (await searchProducts(q)).slice(0, 5) };
                }));
                return NextResponse.json({ type: "outfit", template, stylistNote: look.stylistNote, bundles });
            }
        }

        // Step 2d: Search Flow
        if (intent === "search" && parsed.query) {
            const products = await searchProducts(parsed.query);
            return NextResponse.json({ type: "products", query: parsed.query, products, followUp: "Found these! Want to refine further?" });
        }

        // Step 2e: Clarify
        if (intent === "clarify" && parsed.reply) {
            return NextResponse.json({ type: "chat", reply: parsed.reply });
        }

        // Step 2f: Regular chat
        const reply = await callGroq([...history, { role: "user", content: message }], 0.8);
        return NextResponse.json({ type: "chat", reply });

    } catch (e: any) {
        console.error("API Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
