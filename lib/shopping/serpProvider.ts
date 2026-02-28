export interface RawProduct {
    title: string;
    price?: string;
    extracted_price?: number;
    rating?: number;
    reviews?: number;
    product_id?: string;
    product_link?: string;
    link?: string;
    serpapi_product_api?: string;
    serpapi_immersive_product_api?: string;
    thumbnail?: string;
    source?: string;
}

export interface NormalizedProduct {
    id: string;
    title: string;
    price?: number;
    priceStr?: string;
    rating?: number;
    reviews?: number;
    productUrl?: string;
    resolveUrl?: string;
    productId?: string;
    thumbnail?: string;
    source?: string;
    coupon?: string;
}

export async function searchProducts(query: string): Promise<NormalizedProduct[]> {
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) throw new Error("SERP_API_KEY is not defined");

    const params = new URLSearchParams({
        engine: "google_shopping",
        q: query,
        gl: "in",
        api_key: apiKey,
    });

    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`);

    const data = await res.json();
    const raw: RawProduct[] = Array.isArray(data.shopping_results) ? data.shopping_results : [];


    const normalized = raw.map((p, i) => ({
        id: `${i}-${p.title?.slice(0, 20) ?? "product"}`,
        title: p.title ?? "Unknown",
        price: p.extracted_price,
        priceStr: p.price,
        rating: p.rating,
        reviews: p.reviews,
        productUrl: p.link ?? p.product_link,
        resolveUrl: p.serpapi_immersive_product_api ?? p.serpapi_product_api,
        productId: p.product_id,
        thumbnail: p.thumbnail,
        source: p.source,
    }));

    // Sort by trust score: rating × log(1 + reviews); unrated go last
    return normalized
        .sort((a, b) => {
            const scoreA = (a.rating ?? 0) * Math.log1p(a.reviews ?? 0);
            const scoreB = (b.rating ?? 0) * Math.log1p(b.reviews ?? 0);
            return scoreB - scoreA;
        })
        .slice(0, 10);
}
