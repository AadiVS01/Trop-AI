import Groq from 'groq-sdk/index.mjs';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GROQ_API_KEY) {
    console.warn('WARNING: GROQ_API_KEY is not set in .env file.');
}

const groq = Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export interface CompletionResponse {
    content: string;
    latency: number;
}

export async function getModelCompletion(model: string, prompt: string): Promise<CompletionResponse> {
    const start = Date.now();
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            model: model,
            temperature: 0,
            response_format: { type: 'json_object' },
        });

        const latency = Date.now() - start;

        return {
            content: chatCompletion.choices[0]?.message?.content || '',
            latency,
        };
    } catch (error) {
        const latency = Date.now() - start;
        console.error(`Error calling model ${model}:`, error);
        return {
            content: '',
            latency,
        };
    }
}
