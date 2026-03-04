import { NextResponse } from "next/server";
import { searchProducts, NormalizedProduct } from "@/lib/shopping/serpProvider";
import { searchAmazonProducts } from "@/lib/shopping/amazonProvider";
import { searchFlights, searchHotels, FlightResult, HotelResult } from "@/lib/travel/serpTravelProvider";
import { fetchTrendingDeals, searchLootProducts, LootDeal } from "@/lib/deals/lootProvider";
import { findMatchingGuides, Guide, getGuideById } from "@/lib/guides/guideService";

export async function handleFlight(parsed: any) {
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

export async function handleHotel(parsed: any) {
    let { location, check_in, check_out, max_price } = parsed;
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
    const { searchAgodaHotels } = await import("@/lib/travel/agodaProvider");

    const [googleHotels, agodaHotels] = await Promise.all([
        searchHotels(location, check_in, check_out, max_price),
        searchAgodaHotels(location, check_in, check_out)
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

export async function handleTrain(parsed: any) {
    const { from, to, date } = parsed;
    if (!from || !to || !date || from === "unknown" || to === "unknown") {
        return NextResponse.json({ type: "chat", reply: "I can help with train bookings! Just let me know the stations and the date. 🚂" });
    }
    const { searchTrains } = await import("@/lib/travel/trainProvider");
    const trains = await searchTrains(from, to, date);
    return NextResponse.json({
        type: "trains",
        trains,
        followUp: trains.length > 0
            ? "I've found the best live availability for your journey! 🚂🔥"
            : "I couldn't find any live train availability for those stations. Want to try different dates or stations?"
    });
}

export async function handleBus(parsed: any) {
    const { from, to, date } = parsed;
    if (!from || !to || !date || from === "unknown" || to === "unknown") {
        return NextResponse.json({ type: "chat", reply: "Tell me where you want to go by bus and when! 🚌" });
    }
    const { searchBuses } = await import("@/lib/travel/serpTravelProvider");
    const buses = await searchBuses(from, to, date);
    return NextResponse.json({
        type: "hotels",
        hotels: buses,
        followUp: "Here are the best bus options and trending loots! 🚌✨"
    });
}

export async function handleSearch(parsed: any) {
    const query = parsed.query;
    const [amazonProducts, serpProducts, loots] = await Promise.all([
        searchAmazonProducts(query),
        searchProducts(query),
        searchLootProducts(query)
    ]);

    // Prioritize Amazon and Loot results
    const combined = [...loots, ...amazonProducts, ...serpProducts].slice(0, 10);

    return NextResponse.json({
        type: "products",
        query: query,
        products: combined,
        followUp: loots.length > 0
            ? "I found some exclusive flash deals for this! Look for the 🔥 LOOT badge."
            : "Found these high-rated options for you! Anything specific you're looking for?"
    });
}

export async function handleLoot(parsed: any) {
    const query = parsed.query && parsed.query !== "none" ? parsed.query : undefined;
    const deals = await fetchTrendingDeals(query);
    return NextResponse.json({
        type: "loot",
        deals,
        query,
        followUp: deals.length > 0
            ? "These are the hottest loot deals right now! Move fast, they usually expire in minutes. 🔥"
            : "I couldn't find any specific live loot for that right now. Checking these other trending deals instead..."
    });
}

export async function handleGuide(parsed: any, message: string) {
    const { category, query, guideId, stepIndex } = parsed;
    let guide: Guide | undefined;

    if (guideId && guideId !== "none") {
        guide = getGuideById(guideId);
    }

    if (!guide) {
        const matches = findMatchingGuides(query !== "none" ? query : message, category !== "unknown" ? category : undefined);
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
