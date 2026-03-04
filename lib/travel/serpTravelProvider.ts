import { fetchTrendingDeals, LootDeal } from "../deals/lootProvider";

export interface FlightResult {
    airline: string;
    logo?: string;
    flight_number: string;
    departure: { airport: string; time: string };
    arrival: { airport: string; time: string };
    duration: string;
    price: string;
    link: string;
    lootDeals?: LootDeal[];
}

export interface HotelResult {
    name: string;
    description?: string;
    price: string;
    rating?: number;
    reviews?: number;
    thumbnail?: string;
    link: string;
    source?: string;
    lootDeals?: LootDeal[];
}

const SERP_API_KEY = process.env.SERP_API_KEY;

export async function searchFlights(from: string, to: string, date: string, returnDate?: string): Promise<FlightResult[]> {
    if (!SERP_API_KEY) throw new Error("SERP_API_KEY not set");

    // Parallel fetch: SERP flights + Telegram flight deals
    const [serpRes, lootDeals] = await Promise.all([
        fetch(`https://serpapi.com/search.json?${new URLSearchParams({
            engine: "google_flights",
            departure_id: from,
            arrival_id: to,
            outbound_date: date,
            currency: "INR",
            hl: "en",
            gl: "in",
            api_key: SERP_API_KEY,
            type: returnDate ? "1" : "2"
        }).toString()}`),
        fetchTrendingDeals("flight")
    ]);

    const data = await serpRes.json();
    const flightList = [
        ...(data.best_flights || []),
        ...(data.other_flights || [])
    ];

    // Refine loot: look for specific airline or booking site mentioned in query or results
    const results: FlightResult[] = flightList.map((f: any) => ({
        airline: f.flights?.[0]?.airline || "Unknown",
        logo: f.flights?.[0]?.airline_logo,
        flight_number: f.flights?.[0]?.flight_number,
        departure: {
            airport: f.flights?.[0]?.departure_airport?.name,
            time: f.flights?.[0]?.departure_airport?.time,
        },
        arrival: {
            airport: f.flights?.[f.flights.length - 1]?.arrival_airport?.name,
            time: f.flights?.[f.flights.length - 1]?.arrival_airport?.time,
        },
        duration: `${Math.floor(f.total_duration / 60)}h ${f.total_duration % 60}m`,
        price: f.price ? `₹${f.price}` : "N/A",
        link: "https://www.google.com/travel/flights",
    }));

    // Attach matching loots to the top result for maximum visibility
    if (results.length > 0 && lootDeals.length > 0) {
        results[0].lootDeals = lootDeals.slice(0, 2);
    }

    return results.slice(0, 5);
}

export async function searchTrains(from: string, to: string, date: string): Promise<FlightResult[]> {
    const lootDeals = await fetchTrendingDeals("train");

    // For trains, we'll provide a direct link to IRCTC/ConfirmTKT as the "base" result
    const results: FlightResult[] = [{
        airline: "Indian Railways",
        flight_number: "Multiple Trains",
        departure: { airport: from, time: "Check IRCTC" },
        arrival: { airport: to, time: "Check IRCTC" },
        duration: "Variable",
        price: "Check Live",
        link: `https://www.confirmtkt.com/r列車-between-stations/${from}-to-${to}?date=${date}`,
        lootDeals: lootDeals.slice(0, 3)
    }];

    return results;
}

export async function searchBuses(from: string, to: string, date: string): Promise<HotelResult[]> {
    const lootDeals = await fetchTrendingDeals("bus");

    // For buses, we point to RedBus/AbhiBus
    const results: HotelResult[] = [{
        name: "Bus Services",
        description: `Buses from ${from} to ${to}`,
        price: "From ₹499",
        link: `https://www.redbus.in/bus-tickets/${from.toLowerCase()}-to-${to.toLowerCase()}?onwardpostDate=${date}`,
        lootDeals: lootDeals.slice(0, 3)
    }];

    return results;
}

export async function searchHotels(location: string, checkIn: string, checkOut: string, maxPrice?: number): Promise<HotelResult[]> {
    if (!SERP_API_KEY) throw new Error("SERP_API_KEY not set");

    const params: any = {
        engine: "google_hotels",
        q: `hotels in ${location}`,
        check_in_date: checkIn,
        check_out_date: checkOut,
        currency: "INR",
        hl: "en",
        gl: "in",
        rating: "7",
        api_key: SERP_API_KEY,
    };

    if (maxPrice) params.max_price = maxPrice.toString();
    else params.sort_by = "8";

    // Parallel fetch: Hotels + Telegram hotel deals
    const [serpRes, lootDeals] = await Promise.all([
        fetch(`https://serpapi.com/search.json?${new URLSearchParams(params).toString()}`),
        fetchTrendingDeals("hotel")
    ]);

    const data = await serpRes.json();
    const hotelResults: HotelResult[] = (data.properties || []).map((h: any) => ({
        name: h.name,
        description: h.description,
        price: h.total_rate?.lowest || h.rate_per_night?.lowest || "Contact for price",
        rating: h.overall_rating,
        reviews: h.reviews,
        thumbnail: h.images?.[0]?.thumbnail,
        link: h.link || `https://www.google.com/travel/hotels?q=${encodeURIComponent(h.name)}`,
        source: "Google Hotels",
    }));

    if (hotelResults.length > 0 && lootDeals.length > 0) {
        hotelResults[0].lootDeals = lootDeals.slice(0, 2);
    }

    return hotelResults.slice(0, 5);
}
