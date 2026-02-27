import { NextRequest, NextResponse } from "next/server";
import { searchProducts, NormalizedProduct } from "@/lib/shopping/serpProvider";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ResponsePayload =
    | { type: "chat"; reply: string }
    | { type: "products"; query: string; products: NormalizedProduct[] };

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

export async function POST(req: NextRequest) {
    try {
        const { message, history } = await req.json() as {
            message: string;
            history: ChatMessage[];
        };

        if (!message?.trim()) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Step 1: Ask LLM to classify intent and extract product query if shopping
        const classifyMessages = [
            {
                role: "system",
                content: `You are an intent classifier. Given a user message, respond with JSON only.
If the user is searching for products to buy, return: {"intent":"search","query":"<clean product search query>"}
Otherwise return: {"intent":"chat"}
No explanation, no markdown. Pure JSON.`,
            },
            { role: "user", content: message },
        ];

        const classifyRaw = await callGroq(classifyMessages, 0.0);

        let intent = "chat";
        let searchQuery = "";
        try {
            const parsed = JSON.parse(classifyRaw.replace(/```json|```/g, "").trim());
            intent = parsed.intent ?? "chat";
            searchQuery = parsed.query ?? "";
        } catch {
            intent = "chat";
        }

        // Step 2a: Product search
        if (intent === "search" && searchQuery) {
            const products = await searchProducts(searchQuery);
            const payload: ResponsePayload = {
                type: "products",
                query: searchQuery,
                products,
            };
            return NextResponse.json(payload);
        }

        // Step 2b: Regular chat
        const chatMessages = [
            ...history,
            { role: "user", content: message },
        ];
        const reply = await callGroq(chatMessages, 0.7);
        const payload: ResponsePayload = { type: "chat", reply };
        return NextResponse.json(payload);

    } catch {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
