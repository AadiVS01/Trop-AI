import { NextResponse } from "next/server";
import { searchProducts, NormalizedProduct } from "@/lib/shopping/serpProvider";
import { searchAmazonProducts } from "@/lib/shopping/amazonProvider";
import { searchFlights, searchHotels } from "@/lib/travel/serpTravelProvider";
import { fetchTrendingDeals, searchLootProducts } from "@/lib/deals/lootProvider";
import { findMatchingGuides, Guide, getGuideById } from "@/lib/guides/guideService";

export interface ParsedFlightIntent {
    from?: string;
    to?: string;
    date?: string;
    return_date?: string;
}

export interface ParsedHotelIntent {
    location?: string;
    check_in?: string;
    check_out?: string;
    max_price?: number;
}

export interface ParsedTrainIntent {
    from?: string;
    to?: string;
    date?: string;
}

export interface ParsedSearchIntent {
    query: string;
    brand?: string;
    max_price?: number;
}

export interface ParsedLootIntent {
    query?: string;
}

export interface ParsedGuideIntent {
    category?: string;
    query?: string;
    guideId?: string;
    stepIndex?: number;
}

export async function handleFlight(parsed: ParsedFlightIntent) {
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

export async function handleHotel(parsed: ParsedHotelIntent) {
    const { location, check_in, max_price } = parsed;
    let computedCheckOut = parsed.check_out;

    if (check_in && check_in !== "unknown" && (!computedCheckOut || computedCheckOut === "unknown")) {
        try {
            const d = new Date(check_in);
            d.setDate(d.getDate() + 1);
            computedCheckOut = d.toISOString().split('T')[0];
        } catch {
            computedCheckOut = undefined;
        }
    }
    if (!location || location === "unknown") {
        return NextResponse.json({ type: "chat", reply: "Which city are you looking for hotels in? 🏨" });
    }
    if (!check_in || check_in === "unknown") {
        return NextResponse.json({ type: "chat", reply: `When are you planning to visit ${location}? (I'll find you the best deals for those dates!) 🗓️` });
    }
    const { searchAgodaHotels } = await import("@/lib/travel/agodaProvider");

    const [googleHotels, agodaHotels] = await Promise.all([
        searchHotels(location, check_in, computedCheckOut, max_price),
        searchAgodaHotels(location, check_in, computedCheckOut)
    ]);

    const combined = [...agodaHotels, ...googleHotels].slice(0, 10);

    return NextResponse.json({
        type: "hotels",
        hotels: combined,
        followUp: combined.length > 0
            ? `Found these stays in ${location} from Google and Agoda! Let me know if you want to see other options.`
            : `I couldn't find any hotels in ${location} under ₹${max_price} for those dates. Want to try a slightly higher budget or different dates?`
    });
}

export async function handleTrain(parsed: ParsedTrainIntent) {
    const { from, to, date } = parsed;
    const missingFrom = !from || from === "unknown";
    const missingTo = !to || to === "unknown";
    const missingDate = !date || date === "unknown";

    if (missingFrom || missingTo || missingDate) {
        if (missingFrom && missingTo) {
            return NextResponse.json({ type: "chat", reply: "I'd love to help you book a train! Where are you departing from and where to? (and what date?) 🚂" });
        }
        if (missingFrom) {
            return NextResponse.json({ type: "chat", reply: `Got it! Traveling to ${to}. Which station or city are you departing from? 🚂` });
        }
        if (missingTo) {
            return NextResponse.json({ type: "chat", reply: `Got it! Departing from ${from}. What destination station or city are you heading to? 🚂` });
        }
        if (missingDate) {
            return NextResponse.json({ type: "chat", reply: `Got it! Train from ${from} to ${to}. What date would you like to travel? 🗓️` });
        }
    }
    const { searchTrains } = await import("@/lib/travel/trainProvider");
    const trains = await searchTrains(from!, to!, date!);
    return NextResponse.json({
        type: "trains",
        trains,
        followUp: trains.length > 0
            ? "I've found the best live availability for your journey! 🚂🔥"
            : "I couldn't find any live train availability for those stations. Want to try different dates or stations?"
    });
}

function calculateTrustScore(p: NormalizedProduct): number {
    const lootBoost = p.source?.includes("LOOT") ? 15 : 0;
    const rating = p.rating ?? 0;
    const reviews = p.reviews ?? 0;
    // High star ratings with high review counts get highest priority
    return lootBoost + (rating * Math.log1p(reviews));
}

function filterAndRankProducts(products: NormalizedProduct[], targetBrand?: string): NormalizedProduct[] {
    // Sort all products by Star Rating and Review Count trust score descending
    const sortedByRating = [...products].sort((a, b) => calculateTrustScore(b) - calculateTrustScore(a));

    if (!targetBrand || targetBrand === "none" || targetBrand === "unknown") {
        return sortedByRating;
    }

    const brandLower = targetBrand.toLowerCase().trim();
    const brandMatches: NormalizedProduct[] = [];
    const nonMatches: NormalizedProduct[] = [];

    for (const p of sortedByRating) {
        if (p.title.toLowerCase().includes(brandLower)) {
            brandMatches.push(p);
        } else {
            nonMatches.push(p);
        }
    }

    // Prioritize high-rated brand matches first, followed by remaining high-rated items
    return brandMatches.length > 0 ? [...brandMatches, ...nonMatches] : sortedByRating;
}

export async function handleSearch(parsed: ParsedSearchIntent) {
    const query = parsed.query;
    const [amazonProducts, serpProducts, loots] = await Promise.all([
        searchAmazonProducts(query),
        searchProducts(query),
        searchLootProducts(query)
    ]);

    // Deduplicate by product title similarity / URL
    const seen = new Set<string>();
    const allProducts: NormalizedProduct[] = [];

    for (const p of [...loots, ...amazonProducts, ...serpProducts]) {
        const key = p.title.toLowerCase().trim();
        if (!seen.has(key)) {
            seen.add(key);
            allProducts.push(p);
        }
    }

    // Rank by Rating, Review count trust score, and target brand
    const ranked = filterAndRankProducts(allProducts, parsed.brand).slice(0, 10);

    return NextResponse.json({
        type: "products",
        query: query,
        products: ranked,
        followUp: loots.length > 0
            ? "I found some exclusive flash deals for this! Look for the 🔥 LOOT badge."
            : "Found these high-rated options for you! Anything specific you're looking for?"
    });
}

export async function handleLoot(parsed: ParsedLootIntent) {
    const query = parsed.query && parsed.query !== "none" ? parsed.query : undefined;
    const deals = await fetchTrendingDeals(query);

    // If a specific product query returned 0 Telegram flash deals, automatically fall back to multi-provider search (Amazon + SerpAPI + Loot)
    if (query && deals.length === 0) {
        console.log(`[Loot Handler] No live flash deals found for "${query}". Falling back to full multi-provider search (Amazon + SerpAPI)...`);
        return handleSearch({ query });
    }

    return NextResponse.json({
        type: "loot",
        deals,
        query,
        followUp: deals.length > 0
            ? "These are the hottest loot deals right now! Move fast, they usually expire in minutes. 🔥"
            : "I couldn't find any live loot deals right now. Want to search for regular product prices?"
    });
}

export async function handleGuide(parsed: ParsedGuideIntent, message: string) {
    const { category, query, guideId, stepIndex } = parsed;
    let guide: Guide | undefined;

    if (guideId && guideId !== "none") {
        guide = getGuideById(guideId);
    }

    if (!guide) {
        const matches = findMatchingGuides(query !== "none" ? (query || message) : message, category !== "unknown" ? category : undefined);
        guide = matches[0];
    }

    if (guide) {
        const index = typeof stepIndex === "number" ? stepIndex : 0;
        const safeIndex = Math.min(Math.max(0, index), guide.steps.length - 1);
        const step = guide.steps[safeIndex];
        const bundle = {
            category: step.name,
            products: (await searchProducts(step.query)).slice(0, 5)
        };
        const nextStep = guide.steps[safeIndex + 1];
        const followUp = nextStep
            ? `That's the ${step.name}. Ready to look at the next step: ${nextStep.name}?`
            : `That's the final piece for your ${guide.name}! Need help with anything else?`;

        return NextResponse.json({
            type: "guide",
            guide,
            bundles: [bundle],
            reply: followUp
        });
    }
    return NextResponse.json({ type: "chat", reply: "I couldn't find a specific guide for that, but I can help you search for individual items!" });
}
