import { FlightResult } from "./serpTravelProvider";

export interface TrainClassAvailability {
    class: string;
    availability: string;
    fare: string;
    prediction?: string;
    displayStatus: string;
    predictionPercent?: number;
}

export interface TrainResult {
    trainNumber: string;
    trainName: string;
    departure: { time: string; airport: string };
    arrival: { time: string; airport: string };
    duration: string;
    classAvailability: TrainClassAvailability[];
    price: string;
    link: string;
    source: string;
}

export async function searchTrains(from: string, to: string, date: string): Promise<TrainResult[]> {
    console.log(`[TrainSearch] Starting search: ${from} -> ${to} on ${date}`);

    try {
        console.log(`[TrainSearch] Resolving station codes for: ${from}, ${to}`);
        const [sourceCode, destCode] = await Promise.all([
            getStationCode(from),
            getStationCode(to)
        ]);

        if (!sourceCode || !destCode) {
            console.warn(`[TrainSearch] Could not resolve codes: ${from}->${sourceCode}, ${to}->${destCode}`);
            return [];
        }

        const apiKey = process.env.RAPIDAPI_KEY;
        const host = process.env.RAPIDAPI_HOST_IRCTC;

        if (!apiKey || !host) {
            console.error("[TrainSearch] Missing RapidAPI configuration for IRCTC.");
            return [];
        }

        const formattedDate = formatDateForIRCTC(date);
        const url = `https://${host}/trainAvailability?source=${sourceCode}&destination=${destCode}&date=${formattedDate}`;
        console.log(`[TrainSearch] Fetching from RapidAPI: ${url}`);

        const res = await fetch(url, {
            method: "GET",
            headers: {
                "x-rapidapi-key": apiKey,
                "x-rapidapi-host": host,
            },
        });

        if (res.ok) {
            const json = await res.json();
            const trains = json.data || json.results || [];
            console.log(`[TrainSearch] Found ${trains.length} trains via IRCTC API.`);

            return trains.map((t: any) => ({
                trainNumber: t.trainNumber || t.train_number,
                trainName: t.trainName || t.train_name,
                departure: { time: t.departure || "Check", airport: t.from?.code || sourceCode },
                arrival: { time: t.arrival || "Check", airport: t.to?.code || destCode },
                duration: t.duration || "Variable",
                classAvailability: t.classAvailability || [],
                price: t.classAvailability?.[0]?.fare ? `₹${t.classAvailability[0].fare}` : "Check",
                // Booking link still points to Ixigo for superior UX
                link: `https://www.ixigo.com/trains/search-pwa/from/${sourceCode}/to/${destCode}/${formattedDate}`,
                source: "IRCTC API",
            }));
        }

        return [];
    } catch (error) {
        console.error("[TrainSearch] Critical error:", error);
        return [];
    }
}

async function getStationCode(query: string): Promise<string | null> {
    console.log(`[StationCode] Resolving mapping for: "${query}"`);
    try {
        const normalizedQuery = query.toUpperCase().trim();

        // Tier 0: Check Learned Mappings (Memory)
        try {
            const learned = require("./learned_stations.json");
            if (learned[normalizedQuery]) {
                console.log(`[StationCode] Found learned mapping: ${normalizedQuery} -> ${learned[normalizedQuery]}`);
                return learned[normalizedQuery];
            }
        } catch (e) { /* Ignore missing file */ }

        // Tier 1: Extract code from parentheses if present (e.g. "Ernakulam (ERS)")
        const codeMatch = normalizedQuery.match(/\(([^)]+)\)/);
        if (codeMatch && codeMatch[1]) {
            const extractedCode = codeMatch[1].trim();
            console.log(`[StationCode] Extracted code from query: ${extractedCode}`);
            return extractedCode;
        }

        const groupedStations = require("./stations.json");

        // Tier 2: State-level matching (Suggesting primary hub for the state)
        if (groupedStations[normalizedQuery]) {
            const stateStations = groupedStations[normalizedQuery];
            // Find "primary" station (usually JUNCTION or biggest name)
            const primary = stateStations.find((s: any) => s.name.includes(" JN")) || stateStations[0];
            console.log(`[StationCode] Query matches state "${normalizedQuery}". Suggesting primary hub: ${primary.name} (${primary.code})`);
            return primary.code;
        }

        // Tier 3: Search within all states for exact names or codes
        for (const state in groupedStations) {
            const stations = groupedStations[state];

            // Check for exact code match
            const codeOnlyMatch = stations.find((s: any) => s.code === normalizedQuery);
            if (codeOnlyMatch) return codeOnlyMatch.code;

            // Check for exact name match (normalized)
            const exactNameMatch = stations.find((s: any) =>
                s.name === normalizedQuery ||
                s.name.replace(/ JN\.?| TOWN| CITY/g, "").trim() === normalizedQuery
            );
            if (exactNameMatch) return exactNameMatch.code;

            // Fuzzy/Substring matching
            const fuzzyMatch = stations.find((s: any) => {
                const cleanName = s.name.replace(/ JN\.?| TOWN| CITY/g, "").trim();
                return cleanName.includes(normalizedQuery) ||
                    normalizedQuery.includes(cleanName) ||
                    s.name.includes(normalizedQuery) ||
                    normalizedQuery.includes(s.name);
            });
            if (fuzzyMatch) {
                console.log(`[StationCode] Found fuzzy match: ${fuzzyMatch.name} -> ${fuzzyMatch.code}`);
                return fuzzyMatch.code;
            }
        }

        console.warn(`[StationCode] No local match found for "${query}"`);
        return null;
    } catch (e) {
        console.error("[StationCode] Error resolving station:", e);
        return null;
    }
}

function formatDateForIRCTC(dateStr: string): string {
    // Input: YYYY-MM-DD
    // Output: DD-MM-YYYY
    try {
        const [y, m, d] = dateStr.split("-");
        if (!y || !m || !d) return dateStr;
        return `${d}-${m}-${y}`;
    } catch {
        return dateStr;
    }
}
