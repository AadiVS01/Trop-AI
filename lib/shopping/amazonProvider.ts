import { NormalizedProduct } from "./serpProvider";

export interface AmazonProduct {
    asin: string;
    product_title: string;
    product_price: string;
    unit_price?: string;
    unit_count?: number;
    product_original_price: string | null;
    currency: string;
    product_star_rating: string;
    product_num_ratings: number;
    product_url: string;
    product_photo: string;
    product_num_offers: number;
    product_minimum_offer_price: string;
    is_best_seller: boolean;
    is_amazon_choice: boolean;
    is_prime: boolean;
    delivery?: string;
    sales_volume?: string;
    product_description?: string;
}

export interface AmazonProductByCategory {
    category_name: string;
    products: AmazonProduct[];
}

export interface AmazonProductDetails extends AmazonProduct {
    about_product?: string[];
    product_information?: { [key: string]: string };
    product_photos?: string[];
    product_details?: { [key: string]: string };
    delivery?: string;
    primary_delivery_time?: string;
    product_availability?: string;
    product_condition?: string;
    sales_volume?: string;
}

export interface AmazonReview {
    review_id: string;
    review_title: string;
    review_description: string;
    review_star_rating: string;
    review_author: string;
    review_date: string;
    is_verified: boolean;
}


export async function searchAmazonProducts(query: string, country: string = "IN"): Promise<NormalizedProduct[]> {
    const apiKey = process.env.RAPIDAPI_KEY;
    const host = process.env.RAPIDAPI_HOST;

    if (!apiKey || !host) {
        throw new Error("RapidAPI credentials are not defined");
    }

    const params = new URLSearchParams({
        query: query,
        page: "1",
        country: country, // User requested India primarily, though US was in snippet
        sort_by: "RELEVANCE",
        product_condition: "ALL",
    });

    try {
        const res = await fetch(`https://${host}/search?${params}`, {
            method: "GET",
            headers: {
                "x-rapidapi-key": apiKey,
                "x-rapidapi-host": host,
            },
        });

        if (!res.ok) {
            throw new Error(`RapidAPI Amazon error: ${res.status}`);
        }

        const data = await res.json();
        const raw: AmazonProduct[] = data.data?.products || [];

        return raw.map((p) => {
            const priceVal = p.product_price ? parseFloat(p.product_price.replace(/[^0-9.]/g, "")) : 0;
            return {
                id: `amzn-${p.asin}`,
                title: p.product_title || "Amazon Product",
                price: isNaN(priceVal) ? 0 : priceVal,
                priceStr: p.product_price || "See Website",
                rating: parseFloat(p.product_star_rating) || 0,
                reviews: p.product_num_ratings || 0,
                productUrl: p.product_url,
                thumbnail: p.product_photo,
                source: "Amazon",
            };
        });
    } catch (error) {
        console.error("Amazon search error:", error);
        return [];
    }
}

export async function getAmazonBestSellers(country: string = "IN"): Promise<NormalizedProduct[]> {
    const apiKey = process.env.RAPIDAPI_KEY;
    const host = process.env.RAPIDAPI_HOST;

    if (!apiKey || !host) {
        throw new Error("RapidAPI credentials are not defined");
    }

    try {
        const res = await fetch(`https://${host}/search`, {
            method: "GET",
            headers: {
                "x-rapidapi-key": apiKey,
                "x-rapidapi-host": host,
            },
        });

        if (!res.ok) {
            throw new Error(`RapidAPI Amazon error: ${res.status}`);
        }

        const data = await res.json();
        const raw: AmazonProduct[] = data.data?.products || [];

        return raw.map((p) => {
            const priceVal = p.product_price ? parseFloat(p.product_price.replace(/[^0-9.]/g, "")) : 0;
            return {
                id: `amzn-${p.asin}`,
                title: p.product_title || "Amazon Product",
                price: isNaN(priceVal) ? 0 : priceVal,
                priceStr: p.product_price || "See Website",
                rating: parseFloat(p.product_star_rating) || 0,
                reviews: p.product_num_ratings || 0,
                productUrl: p.product_url,
                thumbnail: p.product_photo,
                source: "Amazon",
            };
        });
    } catch (error) {
        console.error("Amazon best sellers error:", error);
        return [];
    }
}

export async function getAmazonProductsByCategory(categoryId: string, country: string = "IN"): Promise<NormalizedProduct[]> {
    const apiKey = process.env.RAPIDAPI_KEY;
    const host = process.env.RAPIDAPI_HOST;

    if (!apiKey || !host) {
        throw new Error("RapidAPI credentials are not defined");
    }

    const params = new URLSearchParams({
        category_id: categoryId,
        page: "1",
        country: country,
        sort_by: "RELEVANCE",
    });

    try {
        const res = await fetch(`https://${host}/products-by-category?${params}`, {
            method: "GET",
            headers: {
                "x-rapidapi-key": apiKey,
                "x-rapidapi-host": host,
            },
        });

        if (!res.ok) {
            throw new Error(`RapidAPI Amazon error: ${res.status}`);
        }

        const data = await res.json();
        const raw: AmazonProduct[] = data.data?.products || [];

        return raw.map((p) => {
            const priceVal = p.product_price ? parseFloat(p.product_price.replace(/[^0-9.]/g, "")) : 0;
            return {
                id: `amzn-${p.asin}`,
                title: p.product_title || "Amazon Product",
                price: isNaN(priceVal) ? 0 : priceVal,
                priceStr: p.product_price || "See Website",
                rating: parseFloat(p.product_star_rating) || 0,
                reviews: p.product_num_ratings || 0,
                productUrl: p.product_url,
                thumbnail: p.product_photo,
                source: "Amazon",
            };
        });
    } catch (error) {
        console.error("Amazon products by category error:", error);
        return [];
    }
}

export async function getAmazonProductDetails(asin: string, country: string = "IN"): Promise<AmazonProductDetails | null> {
    const apiKey = process.env.RAPIDAPI_KEY;
    const host = process.env.RAPIDAPI_HOST;

    if (!apiKey || !host) {
        throw new Error("RapidAPI credentials are not defined");
    }

    try {
        const res = await fetch(`https://${host}/product-details?asin=${asin}&country=${country}`, {
            method: "GET",
            headers: {
                "x-rapidapi-key": apiKey,
                "x-rapidapi-host": host,
            },
        });

        if (!res.ok) {
            throw new Error(`RapidAPI Amazon error: ${res.status}`);
        }

        const data = await res.json();
        return data.data || null;
    } catch (error) {
        console.error("Amazon product details error:", error);
        return null;
    }
}

export async function getAmazonProductReviews(asin: string, country: string = "IN"): Promise<AmazonReview[]> {
    const apiKey = process.env.RAPIDAPI_KEY;
    const host = process.env.RAPIDAPI_HOST;

    if (!apiKey || !host) {
        throw new Error("RapidAPI credentials are not defined");
    }

    const params = new URLSearchParams({
        asin: asin,
        country: country,
        page: "1",
        sort_by: "TOP_REVIEWS",
        star_rating: "ALL",
        verified_purchases_only: "false",
        images_or_videos_only: "false",
        current_format_only: "false",
    });

    try {
        const res = await fetch(`https://${host}/product-reviews?${params}`, {
            method: "GET",
            headers: {
                "x-rapidapi-key": apiKey,
                "x-rapidapi-host": host,
            },
        });

        if (!res.ok) {
            throw new Error(`RapidAPI Amazon error: ${res.status}`);
        }

        const data = await res.json();
        return data.data?.reviews || [];
    } catch (error) {
        console.error("Amazon product reviews error:", error);
        return [];
    }
}


