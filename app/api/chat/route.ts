import { NextRequest, NextResponse } from "next/server";
import { searchProducts, NormalizedProduct } from "@/lib/shopping/serpProvider";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ResponsePayload =
    | { type: "chat"; reply: string }
    | { type: "products"; query: string; products: NormalizedProduct[]; followUp: string };

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

        // Step 1: Classify intent with context
        const classifyMessages = [
            {
                role: "system",
                content: `You are a shopping intent classifier for an Indian shopping assistant.
Given recent conversation and the latest message, return JSON only — no markdown, no explanation.

Choose one of three intents:

1. "search" — user has given enough info to search (product + at least one qualifier like color/gender/budget/style).
   Return: {"intent":"search","query":"<complete self-contained English search query combining all context>"}

2. "clarify" — user wants to buy something but hasn't given enough detail yet (e.g. just said "tshirt" or "shoes").
   Return: {"intent":"clarify","reply":"<a short friendly question asking 1-2 clarifying things like color, gender, budget, occasion>"}
   Ask at most 2 questions. Keep it natural and brief.

3. "chat" — not a shopping request.
   Return: {"intent":"chat"}

Important: if previous messages already clarified details (color, budget etc.), treat this as "search" and incorporate that context into the query.`,
            },
            ...(contextSummary ? [{ role: "user", content: `Recent conversation:\n${contextSummary}` }] : []),
            { role: "user", content: `Latest message: ${message}` },
        ];

        const classifyRaw = await callGroq(classifyMessages, 0.0);

        let intent = "chat";
        let searchQuery = "";
        let clarifyReply = "";
        try {
            const parsed = JSON.parse(classifyRaw.replace(/```json|```/g, "").trim());
            intent = parsed.intent ?? "chat";
            searchQuery = parsed.query ?? "";
            clarifyReply = parsed.reply ?? "";
        } catch {
            intent = "chat";
        }

        // Step 2a: Ask clarifying question — return as chat bubble
        if (intent === "clarify" && clarifyReply) {
            const payload: ResponsePayload = { type: "chat", reply: clarifyReply };
            return NextResponse.json(payload);
        }

        // Step 2b: Product search
        if (intent === "search" && searchQuery) {
            const products = await searchProducts(searchQuery);
            const followUp = products.length > 0
                ? "Did you find what you were looking for? I can refine by color, size, brand, or budget 🙂"
                : "Hmm, nothing came up. Want to try a different search or adjust the budget?";
            const payload: ResponsePayload = {
                type: "products",
                query: searchQuery,
                products,
                followUp,
            };
            return NextResponse.json(payload);
        }

        // Step 2c: Regular chat
        const chatMessages = [
            {
                role: "system",
                content: `You are a friendly, helpful shopping and lifestyle assistant for India.
Be concise and conversational — 2-3 sentences max. Sound like a knowledgeable friend helping them shop.`,
            },
            ...history,
            { role: "user", content: message },
        ];
        const reply = await callGroq(chatMessages, 0.8);
        const payload: ResponsePayload = { type: "chat", reply };
        return NextResponse.json(payload);

    } catch {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
