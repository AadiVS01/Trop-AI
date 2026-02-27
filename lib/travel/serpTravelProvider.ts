export interface FlightResult {
    airline: string;
    logo?: string;
    flight_number: string;
    departure: { airport: string; time: string };
    arrival: { airport: string; time: string };
    duration: string;
    price: string;
    link: string;
}

export interface HotelResult {
    name: string;
    description?: string;
    price: string;
    rating?: number;
    reviews?: number;
    thumbnail?: string;
    link: string;
}

const SERP_API_KEY = process.env.SERP_API_KEY;

export async function searchFlights(from: string, to: string, date: string, returnDate?: string): Promise<FlightResult[]> {
    if (!SERP_API_KEY) throw new Error("SERP_API_KEY not set");

    const params = new URLSearchParams({
        engine: "google_flights",
        departure_id: from,
        arrival_id: to,
        outbound_date: date,
        currency: "INR",
        hl: "en",
        gl: "in",
        api_key: SERP_API_KEY,
    });

    if (returnDate) {
        params.append("return_date", returnDate);
        params.append("type", "1"); // Round trip
    } else {
        params.append("type", "2"); // One way
    }
    console.log(`✈️ Flight Search: ${from} -> ${to} on ${date} (Return: ${returnDate || 'N/A'})`);
    const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    const data = await res.json();

    // Mapping SerpAPI's google_flights structure - combine best and other flights
    const flightList = [
        ...(data.best_flights || []),
        ...(data.other_flights || [])
    ];

    const results: FlightResult[] = flightList.map((f: any) => ({
        airline: f.flights?.[0]?.airline || "Unknown",
        logo: f.flights?.[0]?.airline_logo,
        flight_number: f.flights?.[0]?.flight_number,
        departure: {
            airport: f.flights?.[0]?.departure_airport?.name,
            time: f.flights?.[0]?.departure_airport?.time,
        },
        arrival: {
            airport: f.flights?.[f.flights.length - 1]?.arrival_airport?.name, // Last leg for connections
            time: f.flights?.[f.flights.length - 1]?.arrival_airport?.time,
        },
        duration: `${Math.floor(f.total_duration / 60)}h ${f.total_duration % 60}m`,
        price: f.price ? `₹${f.price}` : "N/A",
        link: "https://www.google.com/travel/flights",
    }));

    return results.slice(0, 5);
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
        rating: "7", // Filter for 3.5+ stars (quality baseline)
        api_key: SERP_API_KEY,
    };

    if (maxPrice) {
        params.max_price = maxPrice.toString();
    } else {
        params.sort_by = "8"; // If no price limit, prioritize highest rating
    }

    console.log(`🏨 Hotel Search: ${location} | ${checkIn} to ${checkOut || 'N/A'} | Budget: ${maxPrice || 'None'}`);

    const res = await fetch(`https://serpapi.com/search.json?${new URLSearchParams(params).toString()}`);
    const data = await res.json();

    if (data.properties && data.properties.length > 0) {
        console.log(`✅ Found ${data.properties.length} hotels. First link preview: ${data.properties[0].link?.slice(0, 100)}...`);
    } else {
        console.log(`⚠️ No hotels found in raw SerpAPI response. Error: ${data.error || 'None'}`);
    }

    const results: HotelResult[] = (data.properties || []).map((h: any) => ({
        name: h.name,
        description: h.description,
        price: h.total_rate?.lowest || h.rate_per_night?.lowest || "Contact for price",
        rating: h.overall_rating,
        reviews: h.reviews,
        thumbnail: h.images?.[0]?.thumbnail,
        link: h.link || `https://www.google.com/travel/hotels?q=${encodeURIComponent(h.name)}`,
    }));

    return results.slice(0, 5);
}
