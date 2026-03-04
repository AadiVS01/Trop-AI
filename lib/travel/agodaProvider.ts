import { HotelResult } from "./serpTravelProvider";

export interface AgodaAutocompleteResult {
    cityId: number;
    cityName: string;
    countryName: string;
}

export interface AgodaHotel {
    hotelId: number;
    hotelName: string;
    starRating: number;
    address: string;
    price: number;
    currency: string;
    imageUrl: string;
    reviewRating: number;
    reviewCount: number;
}

export async function searchAgodaHotels(location: string, checkIn: string, checkOut: string): Promise<HotelResult[]> {
    const apiKey = process.env.RAPIDAPI_KEY;
    const host = process.env.RAPIDAPI_HOST_AGODA;

    if (!apiKey || !host) {
        throw new Error("Agoda API credentials are not defined");
    }

    try {
        // Step 1: Auto-complete to find City ID
        const autoRes = await fetch(`https://${host}/hotels/auto-complete?query=${encodeURIComponent(location)}`, {
            method: "GET",
            headers: {
                "x-rapidapi-key": apiKey,
                "x-rapidapi-host": host,
            },
        });

        if (!autoRes.ok) throw new Error(`Agoda Autocomplete error: ${autoRes.status}`);
        const autoData = await autoRes.json();
        const city = autoData.data?.find((item: any) => item.cityId !== undefined);

        if (!city?.cityId) {
            console.warn(`Could not find Agoda city ID for: ${location}`);
            return [];
        }

        // Step 2: Search Hotels with City ID
        const searchParams = new URLSearchParams({
            cityId: city.cityId.toString(),
            checkIn: checkIn,
            checkOut: checkOut,
            adults: "2",
            rooms: "1",
            pageNumber: "1",
            pageSize: "10",
        });

        const searchRes = await fetch(`https://${host}/hotels/search?${searchParams}`, {
            method: "GET",
            headers: {
                "x-rapidapi-key": apiKey,
                "x-rapidapi-host": host,
            },
        });

        if (!searchRes.ok) throw new Error(`Agoda Search error: ${searchRes.status}`);
        const searchData = await searchRes.json();
        const rawHotels: any[] = searchData.data?.hotels || [];

        return rawHotels.map((h) => ({
            name: h.hotelName,
            description: `${h.starRating} Star Hotel in ${city.cityName}`,
            price: `₹${h.price}`,
            rating: h.reviewRating,
            reviews: h.reviewCount,
            thumbnail: h.imageUrl,
            link: `https://www.agoda.com/search?city=${city.cityId}&hotel_id=${h.hotelId}`,
            source: "Agoda",
        }));

    } catch (error) {
        console.error("Agoda search error:", error);
        return [];
    }
}
