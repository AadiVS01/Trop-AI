import { NextRequest, NextResponse } from "next/server";

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
    try {
        const { message, history } = await req.json() as {
            message: string;
            history: Message[];
        };

        if (!message?.trim()) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
        }

        const messages = [
            ...history,
            { role: "user", content: message },
        ];

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error(`Groq request failed: ${response.status}`);
        }

        const data = await response.json();
        const reply: string = data?.choices?.[0]?.message?.content ?? "";

        return NextResponse.json({ reply });
    } catch {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
