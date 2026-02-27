import { NextRequest, NextResponse } from "next/server";

export interface Seller {
    name: string;
    price?: string;
    link: string;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("id");

    if (!productId) {
        return NextResponse.json({ error: "id param required" }, { status: 400 });
    }

    try {
        const apiKey = process.env.SERP_API_KEY;
        const params = new URLSearchParams({
            engine: "google_product",
            product_id: productId,
            gl: "in",
            hl: "en",
            api_key: apiKey!,
        });

        const res = await fetch(`https://serpapi.com/search.json?${params}`);
        if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`);

        const data = await res.json();

        console.log("[resolve] top-level keys:", Object.keys(data));

        const onlineSellers: Record<string, unknown>[] =
            data?.sellers_results?.online_sellers ?? [];

        console.log("[resolve] seller count:", onlineSellers.length);
        if (onlineSellers.length > 0) {
            console.log("[resolve] first seller keys:", Object.keys(onlineSellers[0]));
        }

        const sellers: Seller[] = onlineSellers
            .map((s) => ({
                name: String(s.name ?? s.store_name ?? "Store"),
                price: s.price ? String(s.price) : undefined,
                link: String(s.direct_link ?? s.link ?? s.url ?? ""),
            }))
            .filter((s) => s.link && s.link !== "undefined");

        if (sellers.length === 0) {
            return NextResponse.json({ error: "No sellers found" }, { status: 404 });
        }

        return NextResponse.json({ sellers });
    } catch (e: unknown) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
