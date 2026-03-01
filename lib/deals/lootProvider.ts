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
let connectionPromise: Promise<TelegramClient | null> | null = null;

async function getTelegramClient() {
    if (client) return client;
    if (connectionPromise) return connectionPromise;

    connectionPromise = (async () => {
        try {
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
            console.log("✅ [Loot] Telegram connected!");
            return client;
        } catch (e) {
            console.error("[Loot] Telegram connection failed:", e);
            connectionPromise = null;
            return null;
        }
    })();

    return connectionPromise;
}

export async function searchLootProducts(query: string): Promise<NormalizedProduct[]> {
    const deals = await fetchTrendingDeals(query);
    return deals.map((d, i) => ({
        id: `loot-${i}-${d.channel}`,
        title: d.title,
        priceStr: d.price,
        productUrl: d.link,
        source: `🔥 LOOT`,
        thumbnail: undefined,
        productSpecs: d.timestamp ? [{ name: "Found", value: new Date(d.timestamp).toLocaleDateString() }] : undefined,
        coupon: d.coupon,
    }));
}

export async function fetchTrendingDeals(query?: string): Promise<LootDeal[]> {
    const DEPTH_LIMIT_DAYS = 10;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const TARGET_CUTOFF = now - (DEPTH_LIMIT_DAYS * MS_PER_DAY);
    const MAX_MESSAGES_PER_CHANNEL = 300;

    const telegramClient = await getTelegramClient();
    let allDeals: LootDeal[] = [];

    if (telegramClient) {
        const travelQueries = ["flight", "hotel", "train", "bus"];
        const channelsToScrape = travelQueries.includes(query || "") ? ["desidime"] : CHANNELS;

        for (const channelName of channelsToScrape) {
            try {
                let channelDealsCount = 0;
                let offsetId = 0;
                console.log(`[Loot] Deep scraping @${channelName}...`);

                let entity;
                try {
                    entity = await telegramClient.getEntity(channelName);
                } catch (e) {
                    try {
                        entity = await telegramClient.getEntity(`@${channelName}`);
                    } catch (e2) {
                        console.error(`[Loot] Could not resolve entity for ${channelName}:`, e2);
                        continue;
                    }
                }

                while (channelDealsCount < MAX_MESSAGES_PER_CHANNEL) {
                    const messages = await telegramClient.getMessages(entity, {
                        limit: 100,
                        offsetId: offsetId > 0 ? offsetId : undefined
                    }) as Api.Message[];

                    if (channelName === 'desidime') {
                        console.log(`[Loot] Fetched ${messages.length} messages from @desidime`);
                        if (messages.length > 0) {
                            console.log(`[Loot] Sample msg: ${messages[0].message?.slice(0, 100)}`);
                        }
                    }

                    if (messages.length === 0) break;

                    let reachedCutoff = false;
                    for (const msg of messages) {
                        const timestamp = msg.date * 1000;
                        if (timestamp < TARGET_CUTOFF) {
                            reachedCutoff = true;
                            break;
                        }

                        if (!msg.message) continue;
                        const rawText = msg.message;
                        const segments = rawText.split(/(https?:\/\/[^\s]+)/g);
                        let lastText = "";
                        const messageLinks: { url: string, label: string, context: string }[] = [];

                        for (const segment of segments) {
                            if (segment.startsWith('http')) {
                                const label = lastText.split('\n').pop()?.trim().replace(/[:\-]$/, "").trim() || "";
                                messageLinks.push({ url: segment, label, context: lastText });
                            }
                            lastText = segment;
                        }

                        if (messageLinks.length === 0) continue;

                        const hasBuyNow = messageLinks.some(ml => ml.label.toLowerCase().includes("buy now") || ml.label.toLowerCase().includes("get deal"));
                        const hasReadMore = messageLinks.some(ml => ml.label.toLowerCase().includes("read more"));

                        if (hasBuyNow && hasReadMore && messageLinks.length <= 3) {
                            const bestLinkObj = messageLinks.find(ml => ml.label.toLowerCase().includes("buy now") || ml.label.toLowerCase().includes("get deal")) || messageLinks[0];
                            const affiliateLink = findBestAffiliateLink([bestLinkObj.url]);
                            if (affiliateLink) {
                                createAndPushDeal(rawText, affiliateLink, msg, allDeals, channelName, timestamp);
                                channelDealsCount++;
                            }
                        } else {
                            for (const ml of messageLinks) {
                                const affiliateLink = findBestAffiliateLink([ml.url]);
                                if (!affiliateLink) continue;
                                createAndPushDeal(ml.context, affiliateLink, msg, allDeals, channelName, timestamp);
                                channelDealsCount++;
                            }
                        }
                    }

                    if (reachedCutoff) break;
                    offsetId = messages[messages.length - 1].id;
                }
            } catch (e) {
                console.error(`[Loot] Failed to fetch from Telegram channel ${channelName}:`, e);
            }
        }
    } else if (query && SERP_API_KEY) {
        try {
            const siteQuery = `site:t.me/s/LootAlerts OR site:t.me/s/DesiDime OR site:t.me/s/gymdeals "${query}"`;
            const params = new URLSearchParams({ engine: "google", q: siteQuery, tbs: "qdr:m", api_key: SERP_API_KEY });
            const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
            const data = await res.json();
            if (data.organic_results) {
                allDeals = data.organic_results.map((r: any) => ({
                    title: r.title.replace(/Telegram: Contact @\w+\s*/i, '').trim(),
                    description: r.snippet, link: r.link, channel: 'Search', isDirect: false
                }));
            }
        } catch (e) { console.error("SerpAPI fallback failed:", e); }
    }

    allDeals = allDeals.sort((a, b) => (new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()));


    if (query) {
        const q = query.toLowerCase();
        let keywords: string[] = [];

        if (q === "flight") keywords = ["flight", "airline", "airindia", "indigo", "akasa", "spicejet", "vistara", "airasia", "fly", "ticket", "boarding"];
        else if (q === "hotel") keywords = ["hotel", "stay", "resort", "oyo", "mmt", "makemytrip", "booking", "accommodation"];
        else if (q === "train") keywords = ["train", "irctc", "railway", "ixigo", "confirmtkt", "redbus", "seat"];
        else if (q === "bus") keywords = ["bus", "redbus", "abhibus", "zingbus", "travels", "st", "volvo"];
        else {
            // Tokenize query: remove small words and special chars
            keywords = q.split(/\s+/)
                .map(k => k.replace(/[^\w]/g, '').trim())
                .filter(k => k.length > 2); // only words with > 2 chars

            // If query was very short (e.g. "hp"), keep it
            if (keywords.length === 0 && q.trim().length > 0) keywords = [q.trim().toLowerCase()];
        }

        const isTravelQuery = ["flight", "hotel", "train", "bus"].includes(q);
        const filtered = allDeals.filter(d => {
            const content = `${d.title} ${d.description || ""}`.toLowerCase();
            if (isTravelQuery) {
                return keywords.some(k => content.includes(k));
            } else {
                return keywords.every(k => content.includes(k));
            }
        });

        console.log(`[Loot] Query "${query}" (keywords: ${keywords.join(',')}) matched ${filtered.length}/${allDeals.length} deals.`);
        return filtered.slice(0, 30);
    }
    return allDeals.slice(0, 30);
}

function createAndPushDeal(context: string, affiliateLink: string, msg: Api.Message, allDeals: LootDeal[], channelName: string, timestamp: number) {
    const cleanContext = context.replace(/https?:\/\/[^\s]+/g, '').trim();
    const contextLines = cleanContext.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const globalHeader = (msg.message || "").split('\n')[0] || "";
    let rawTitle = contextLines[contextLines.length - 1] || "";

    const labelsToSkip = ["read more", "buy now", "get deal", "link", "click here", "grab", "loot", "deal"];
    if (labelsToSkip.some(label => rawTitle.toLowerCase().includes(label)) || rawTitle.length < 4) {
        for (let i = contextLines.length - 2; i >= 0; i--) {
            const line = contextLines[i].toLowerCase();
            if (contextLines[i].length > 5 && !labelsToSkip.some(label => line.includes(label))) {
                rawTitle = contextLines[i];
                break;
            }
        }
    }

    let title = rawTitle
        .replace(/[👉🔥✅🎯⚡️\[\]]|(?:Master\s*Link|Loot|Deal|Link)\s*[:\-]?/gi, '')
        .replace(/(?:at|@|for|now|only|Rs\.?|₹)\s*\d+(?:,\d+)*(?:\.\d{2})?\s*$/i, '')
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

    let price: string | undefined;
    const sellingPriceMatch = context.match(/(?:at|@|now|for|only)\s*(?:₹|Rs\.?)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i);
    if (sellingPriceMatch) price = `₹${sellingPriceMatch[1]}`;
    else {
        const discountMatch = context.match(/(?:₹|Rs\.?)\s*(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:OFF|Discount|off|rupees off)/i);
        if (discountMatch) price = `₹${discountMatch[1]} OFF`;
        else {
            const allPrices = Array.from(context.matchAll(/(?:₹|Rs\.?)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/gi));
            for (const m of allPrices) {
                const index = m.index || 0;
                const surrounding = context.slice(Math.max(0, index - 20), index).toLowerCase();
                if (!surrounding.includes("coupon") && !surrounding.includes("save")) {
                    price = `₹${m[1]}`;
                    break;
                }
            }
        }
    }

    const couponMatch = context.match(/(?:code|coupon|promocode|use code|apply code)[:\s-]*([A-Z0-9]{4,15})/i);
    const coupon = couponMatch ? couponMatch[1].toUpperCase() : undefined;
    if (title.toLowerCase().includes("disclosure") || title.length < 3) return;

    let description = contextLines.slice(0, -1).join('\n').trim();
    const specialMatch = context.match(/(\d+\s*rupees\s*off|holi\s*special|use\s*this\s*coupon|off)/i);
    if (specialMatch) {
        description += `\n\n📢 ${specialMatch[0].toUpperCase()}! Check this out with the link below.`;
    }

    allDeals.push({
        title: title.slice(0, 100),
        description: description.slice(0, 200),
        price,
        coupon,
        link: affiliateLink,
        channel: channelName,
        timestamp: new Date(timestamp).toISOString(),
        isDirect: true
    });
}

function findBestAffiliateLink(links: string[]): string | null {
    const retailers = ['amzn', 'amazon', 'fkrt', 'flipkart', 'myntra', 'ajio', 'tata-cliq', 'croma', 'reliance'];
    const middlemen = ['bit.ly', 'shope.ee', 'cutt.ly', 'shorturl', 'tinyurl', 'clnk.in', 'fkrtt.it', 'wishlink', 'pelle', 'ddime.in'];
    const blacklistedDomains = ['groww', 'upstox', 'angelone', 'paytm', 'google.com/search', 't.me/'];
    let bestLink: string | null = null;
    let highScore = -1;
    for (const l of links) {
        const lower = l.toLowerCase();
        if (blacklistedDomains.some(d => lower.includes(d))) continue;
        let score = 0;
        if (retailers.some(d => lower.includes(d))) score = 100;
        else if (middlemen.some(d => lower.includes(d))) score = 50;
        else score = 10;
        if (score > highScore) { highScore = score; bestLink = l; }
    }
    return bestLink;
}
function extractLinksFromText(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s\)]+(?<![\.\,\!\?\)])/g;
    return text.match(urlRegex) || [];
}
