import { searchProducts, NormalizedProduct } from "../shopping/serpProvider";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram";

export interface LootDeal {
    title: string;
    description?: string;
    price?: string;
    coupon?: string;
    link: string;
    channel: string;
    timestamp?: string;
    isDirect?: boolean;
}

import CHANNELS from "./channels.json";
const SERP_API_KEY = process.env.SERP_API_KEY;

// Persistence for the Telegram client
let client: TelegramClient | null = null;

async function getTelegramClient() {
    if (client) return client;

    const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
    const apiHash = process.env.TELEGRAM_API_HASH || "";
    const session = new StringSession(process.env.TELEGRAM_SESSION || "");

    if (!apiId || !apiHash || !process.env.TELEGRAM_SESSION) {
        console.warn("[Loot] Missing Telegram API credentials. Falling back to public searches only.");
        return null;
    }

    client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.connect();
    return client;
}

export async function searchLootProducts(query: string): Promise<NormalizedProduct[]> {
    const deals = await fetchTrendingDeals(query);
    return deals.map((d, i) => ({
        id: `loot-${i}-${d.channel}`,
        title: d.title,
        priceStr: d.price,
        productUrl: d.link,
        source: `🔥 LOOT @${d.channel}`,
        thumbnail: undefined,
        productSpecs: d.timestamp ? [{ name: "Found", value: new Date(d.timestamp).toLocaleDateString() }] : undefined,
        coupon: d.coupon,
    }));
}

export async function fetchTrendingDeals(query?: string): Promise<LootDeal[]> {
    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const telegramClient = await getTelegramClient();

    let allDeals: LootDeal[] = [];

    if (telegramClient) {
        // Option A: Authenticated MTProto Scraping (Reliable)
        for (const channelName of CHANNELS) {
            try {
                const messages = await telegramClient.getMessages(channelName, { limit: 20 }) as Api.Message[];

                for (const msg of messages) {
                    if (!msg.message) continue;

                    const timestamp = msg.date * 1000;
                    if (now - timestamp > ONE_MONTH_MS) continue;

                    const rawText = msg.message;
                    const links = extractLinksFromText(rawText);
                    if (links.length === 0) continue;

                    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    const globalHeader = lines[0] || "";

                    const segments = rawText.split(/(https?:\/\/[^\s]+)/g);
                    let lastText = "";

                    for (const segment of segments) {
                        if (segment.startsWith('http')) {
                            const affiliateLink = findBestAffiliateLink([segment]);
                            if (!affiliateLink) continue;

                            const context = lastText.trim();
                            if (!context) continue;

                            const contextLines = context.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                            const rawTitle = contextLines[contextLines.length - 1] || "";

                            // 1. Smart Title: Combine global header if local title is too short/generic
                            let title = rawTitle
                                .replace(/[👉🔥✅🎯⚡️\[\]]|(?:Master\s*Link|Loot|Deal|Link)\s*[:\-]?/gi, '')
                                .replace(/(?:at|@|for|now|only|Rs\.?|₹)\s*\d+(?:,\d+)*(?:\.\d{2})?\s*$/i, '') // Remove price from end of title
                                .trim();

                            if ((title.length < 8 || ["Sofa", "Bed", "Chair", "Table", "Loot"].some(kw => title.includes(kw))) && globalHeader.length > 5 && !globalHeader.includes("http")) {
                                const cleanHeader = globalHeader.replace(/[👉🔥✅🎯⚡️\[\]]|(?:Master\s*Link|Loot|Deal|Link)\s*[:\-]?/gi, '').trim();
                                if (title && !cleanHeader.includes(title)) {
                                    title = `${cleanHeader.slice(0, 40)} - ${title}`;
                                } else if (!title) {
                                    title = cleanHeader || "Loot Deal";
                                }
                            }
                            title = title.replace(/\s*[:\-]\s*$/, '').trim();

                            // 2. Smart Price: Prioritize price after "at" or "@", ignore if preceded by "off" or "coupon"
                            let price: string | undefined;
                            const sellingPriceMatch = context.match(/(?:at|@|now|for|only)\s*(?:₹|Rs\.?)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i);
                            if (sellingPriceMatch) {
                                price = `₹${sellingPriceMatch[1]}`;
                            } else {
                                const allPrices = Array.from(context.matchAll(/(?:₹|Rs\.?)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/gi));
                                for (const m of allPrices) {
                                    const index = m.index || 0;
                                    const surrounding = context.slice(Math.max(0, index - 20), index).toLowerCase();
                                    if (!surrounding.includes("off") && !surrounding.includes("coupon") && !surrounding.includes("save")) {
                                        price = `₹${m[1]}`;
                                        break;
                                    }
                                }
                            }

                            // 3. Coupon Detection
                            const couponMatch = context.match(/(?:code|coupon|promocode|use code|apply code)[:\s-]*([A-Z0-9]{4,15})/i);
                            const coupon = couponMatch ? couponMatch[1].toUpperCase() : undefined;

                            // Skip junk results (e.g. just symbols or "Link :")
                            if (title.toLowerCase().includes("disclosure") || title.length < 3) continue;

                            allDeals.push({
                                title: title.slice(0, 100),
                                description: contextLines.slice(0, -1).join('\n').trim().slice(0, 150),
                                price,
                                coupon,
                                link: affiliateLink,
                                channel: channelName,
                                timestamp: new Date(timestamp).toISOString(),
                                isDirect: true
                            });
                        } else {
                            lastText = segment;
                        }
                    }
                }
            } catch (e) {
                console.error(`[Loot] Failed to fetch from Telegram channel ${channelName}:`, e);
            }
        }
    } else if (query && SERP_API_KEY) {
        // Option B: Fallback to SerpAPI (Public Search)
        try {
            const siteQuery = `site:t.me/s/LootAlerts OR site:t.me/s/DesiDime OR site:t.me/s/gymdeals "${query}"`;
            const params = new URLSearchParams({
                engine: "google",
                q: siteQuery,
                tbs: "qdr:m",
                api_key: SERP_API_KEY,
            });
            const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
            const data = await res.json();

            if (data.organic_results) {
                allDeals = data.organic_results.map((r: any) => ({
                    title: r.title.replace(/Telegram: Contact @\w+\s*/i, '').trim(),
                    description: r.snippet,
                    link: r.link,
                    channel: 'Search',
                    isDirect: false
                }));
            }
        } catch (e) {
            console.error("SerpAPI fallback failed:", e);
        }
    }

    // Common refinement: Sort and Filter by Query
    allDeals = allDeals.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
    });

    if (query) {
        const q = query.toLowerCase();
        return allDeals.filter(d =>
            d.title.toLowerCase().includes(q) ||
            (d.description && d.description.toLowerCase().includes(q))
        ).slice(0, 10);
    }

    return allDeals.slice(0, 10);
}

function extractLinksFromText(text: string): string[] {
    // Improved regex to avoid capturing trailing punctuation like . , ) !
    const urlRegex = /https?:\/\/[^\s\)]+(?<![\.\,\!\?\)])/g;
    return text.match(urlRegex) || [];
}

function findBestAffiliateLink(links: string[]): string | null {
    const trustedDomains = [
        'amzn', 'amazon', 'fkrt', 'flipkart', 'bit.ly', 'ddime', 'shope.ee',
        'myntra', 'ajio', 'tata-cliq', 'croma', 'reliance', 'cutt.ly',
        'shorturl', 'tinyurl', 'clnk.in', 'fkrtt.it', 'wishlink', 'pelle'
    ];
    const blacklistedDomains = ['groww', 'upstox', 'angelone', 'paytm', 'google.com/search', 't.me/'];

    return links.find(l => {
        const lower = l.toLowerCase();
        const isTrusted = trustedDomains.some(d => lower.includes(d));
        const isBlacklisted = blacklistedDomains.some(d => lower.includes(d));
        return isTrusted && !isBlacklisted && !lower.includes('t.me');
    }) || null;
}
