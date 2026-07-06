import type { TestCase } from './types.js';

const baseCases: TestCase[] = [
    // TRAVEL CASES (INDIAN MARKET)
    {
        id: "travel-in-1",
        input: "I want to go to Goa from Delhi for 4 days. My budget is ₹25,000. Looking for a beachfront shack or 3 star hotel.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: 25000,
            travel_constraints: {
                origin: "Delhi",
                destination: "Goa",
                duration_days: 4,
                hotel_rating_min: 3,
                transport_type: null
            },
            shopping_constraints: null,
            needs_clarification: false
        }
    },
    {
        id: "travel-in-2",
        input: "Planning a trip to Manali from Chandigarh. Budget is 15000 rupees. We want to travel by Volvo bus.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: 15000,
            travel_constraints: {
                origin: "Chandigarh",
                destination: "Manali",
                duration_days: null,
                hotel_rating_min: null,
                transport_type: "bus"
            },
            shopping_constraints: null,
            needs_clarification: true
        }
    },
    {
        id: "travel-in-3",
        input: "Flight from Mumbai to Bangalore, staying for 2 nights. Budget around 10k.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: 10000,
            travel_constraints: {
                origin: "Mumbai",
                destination: "Bangalore",
                duration_days: 2,
                hotel_rating_min: null,
                transport_type: "flight"
            },
            shopping_constraints: null,
            needs_clarification: false
        }
    },
    {
        id: "travel-in-4",
        input: "Family trip to Kerala backwaters. Need a 5 star houseboat. Duration 5 days.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: null,
            travel_constraints: {
                origin: null,
                destination: "Kerala backwaters",
                duration_days: 5,
                hotel_rating_min: 5,
                transport_type: null
            },
            shopping_constraints: null,
            needs_clarification: true
        }
    },
    {
        id: "travel-in-5",
        input: "Spiritual trip to Varanasi from Kolkata. Train travel is preferred. Budget 8000.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: 8000,
            travel_constraints: {
                origin: "Kolkata",
                destination: "Varanasi",
                duration_days: null,
                hotel_rating_min: null,
                transport_type: "train"
            },
            shopping_constraints: null,
            needs_clarification: true
        }
    },
    // SHOPPING CASES (INDIAN MARKET)
    {
        id: "shopping-in-1",
        input: "Looking for a Tata Nexon or Punch. Budget is 12 Lakhs. Must have sunroof.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 1200000,
            travel_constraints: null,
            shopping_constraints: {
                category: "car",
                brand: "Tata",
                min_specs: ["sunroof"],
                preferred_features: ["Nexon", "Punch"]
            },
            needs_clarification: false
        }
    },
    {
        id: "shopping-in-2",
        input: "I want to buy a Samsung 5G phone under 20000. Good battery life is important.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 20000,
            travel_constraints: null,
            shopping_constraints: {
                category: "smartphone",
                brand: "Samsung",
                min_specs: ["5G"],
                preferred_features: ["good battery life"]
            },
            needs_clarification: false
        }
    },
    {
        id: "shopping-in-3",
        input: "Buying an ethnic wear set for Diwali. Budget ₹5000. Prefer FabIndia or Manyavar.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 5000,
            travel_constraints: null,
            shopping_constraints: {
                category: "ethnic wear",
                brand: null,
                min_specs: [],
                preferred_features: ["FabIndia", "Manyavar", "Diwali"]
            },
            needs_clarification: false
        }
    },
    {
        id: "shopping-in-4",
        input: "Need a new laptop for college. Budget 60,000. Want i5 processor and 16GB RAM.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 60000,
            travel_constraints: null,
            shopping_constraints: {
                category: "laptop",
                brand: null,
                min_specs: ["i5 processor", "16GB RAM"],
                preferred_features: ["college"]
            },
            needs_clarification: false
        }
    },
    {
        id: "shopping-in-5",
        input: "Searching for a Royal Enfield Classic 350. Second hand under 1.5 Lakhs.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 150000,
            travel_constraints: null,
            shopping_constraints: {
                category: "motorcycle",
                brand: "Royal Enfield",
                min_specs: ["Classic 350"],
                preferred_features: ["second hand"]
            },
            needs_clarification: false
        }
    },
    {
        id: "travel-in-6",
        input: "Weekend trip from Jaipur to Udaipur. 3 days, prefer AC bus. Budget 7000.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: 7000,
            travel_constraints: {
                origin: "Jaipur",
                destination: "Udaipur",
                duration_days: 3,
                hotel_rating_min: null,
                transport_type: "bus"
            },
            shopping_constraints: null,
            needs_clarification: false
        }
    },
    {
        id: "travel-in-7",
        input: "Need to go from Bengaluru to Hyderabad overnight by train. Budget 4000.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: 4000,
            travel_constraints: {
                origin: "Bengaluru",
                destination: "Hyderabad",
                duration_days: null,
                hotel_rating_min: null,
                transport_type: "train"
            },
            shopping_constraints: null,
            needs_clarification: true
        }
    },
    {
        id: "travel-in-8",
        input: "Flying from Pune to Dubai for 3 nights. Need a 4 star hotel. Budget 50,000.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: 50000,
            travel_constraints: {
                origin: "Pune",
                destination: "Dubai",
                duration_days: 3,
                hotel_rating_min: 4,
                transport_type: "flight"
            },
            shopping_constraints: null,
            needs_clarification: false
        }
    },
    {
        id: "travel-in-9",
        input: "Delhi to Shimla by cab. 2 days trip. No budget decided yet.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: null,
            travel_constraints: {
                origin: "Delhi",
                destination: "Shimla",
                duration_days: 2,
                hotel_rating_min: null,
                transport_type: "cab"
            },
            shopping_constraints: null,
            needs_clarification: true
        }
    },
    {
        id: "travel-in-10",
        input: "Goa from Mumbai this weekend. Prefer flight. Budget 18k for travel and stay.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: 18000,
            travel_constraints: {
                origin: "Mumbai",
                destination: "Goa",
                duration_days: null,
                hotel_rating_min: null,
                transport_type: "flight"
            },
            shopping_constraints: null,
            needs_clarification: true
        }
    },
    {
        id: "travel-in-11",
        input: "Kochi to Munnar for 2 days. Looking for a homestay, no hotel rating needed. Budget 6000.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: 6000,
            travel_constraints: {
                origin: "Kochi",
                destination: "Munnar",
                duration_days: 2,
                hotel_rating_min: null,
                transport_type: null
            },
            shopping_constraints: null,
            needs_clarification: false
        }
    },
    {
        id: "travel-in-12",
        input: "Need flights from Chennai to Kolkata. Flexible dates. Budget 9000.",
        expected_domain: "travel",
        expected_output: {
            domain: "travel",
            budget: 9000,
            travel_constraints: {
                origin: "Chennai",
                destination: "Kolkata",
                duration_days: null,
                hotel_rating_min: null,
                transport_type: "flight"
            },
            shopping_constraints: null,
            needs_clarification: true
        }
    },
    {
        id: "shopping-in-6",
        input: "Need a 1.5 ton AC under 35,000. Prefer LG. Must be 5-star rated.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 35000,
            travel_constraints: null,
            shopping_constraints: {
                category: "air conditioner",
                brand: "LG",
                min_specs: ["1.5 ton", "5-star"],
                preferred_features: []
            },
            needs_clarification: false
        }
    },
    {
        id: "shopping-in-7",
        input: "Front-load washing machine 7kg under 30000. Samsung or Bosch is fine.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 30000,
            travel_constraints: null,
            shopping_constraints: {
                category: "washing machine",
                brand: null,
                min_specs: ["front-load", "7kg"],
                preferred_features: ["Samsung", "Bosch"]
            },
            needs_clarification: false
        }
    },
    {
        id: "shopping-in-8",
        input: "Bluetooth headphones under 3000. Prefer boAt or JBL. Need good mic.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 3000,
            travel_constraints: null,
            shopping_constraints: {
                category: "headphones",
                brand: null,
                min_specs: ["bluetooth", "good mic"],
                preferred_features: ["boAt", "JBL"]
            },
            needs_clarification: false
        }
    },
    {
        id: "shopping-in-9",
        input: "Gold earrings for a wedding, budget 20000. Traditional design preferred.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 20000,
            travel_constraints: null,
            shopping_constraints: {
                category: "jewelry",
                brand: null,
                min_specs: ["gold"],
                preferred_features: ["wedding", "traditional design"]
            },
            needs_clarification: false
        }
    },
    {
        id: "shopping-in-10",
        input: "Monthly grocery staples for a family of 3. Budget 5000. Need rice, dal, oil.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 5000,
            travel_constraints: null,
            shopping_constraints: {
                category: "grocery",
                brand: null,
                min_specs: ["rice", "dal", "oil"],
                preferred_features: ["family of 3", "monthly"]
            },
            needs_clarification: false
        }
    },
    {
        id: "shopping-in-11",
        input: "Looking to buy a PS5 under 50,000. Bundle with extra controller if possible.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 50000,
            travel_constraints: null,
            shopping_constraints: {
                category: "gaming console",
                brand: "Sony",
                min_specs: ["PS5"],
                preferred_features: ["extra controller", "bundle"]
            },
            needs_clarification: false
        }
    },
    {
        id: "shopping-in-12",
        input: "Ergonomic office chair under 8000. Must have lumbar support.",
        expected_domain: "shopping",
        expected_output: {
            domain: "shopping",
            budget: 8000,
            travel_constraints: null,
            shopping_constraints: {
                category: "office chair",
                brand: null,
                min_specs: ["lumbar support"],
                preferred_features: ["ergonomic"]
            },
            needs_clarification: false
        }
    },
    // UNKNOWN DOMAIN CASES
    {
        id: "unknown-1",
        input: "Book a table for 4 at a restaurant tonight in Bandra.",
        expected_domain: "unknown",
        expected_output: {
            domain: "unknown",
            budget: null,
            travel_constraints: null,
            shopping_constraints: null,
            needs_clarification: true
        }
    },
    {
        id: "unknown-2",
        input: "Need help filing income tax returns for FY 2025-26.",
        expected_domain: "unknown",
        expected_output: {
            domain: "unknown",
            budget: null,
            travel_constraints: null,
            shopping_constraints: null,
            needs_clarification: true
        }
    },
    {
        id: "unknown-3",
        input: "Find a yoga class near me for beginners.",
        expected_domain: "unknown",
        expected_output: {
            domain: "unknown",
            budget: null,
            travel_constraints: null,
            shopping_constraints: null,
            needs_clarification: true
        }
    },
    {
        id: "unknown-4",
        input: "Please renew my driving license online.",
        expected_domain: "unknown",
        expected_output: {
            domain: "unknown",
            budget: null,
            travel_constraints: null,
            shopping_constraints: null,
            needs_clarification: true
        }
    },
    {
        id: "unknown-5",
        input: "Need a tutor for class 10 math at home.",
        expected_domain: "unknown",
        expected_output: {
            domain: "unknown",
            budget: null,
            travel_constraints: null,
            shopping_constraints: null,
            needs_clarification: true
        }
    }
];

const TARGET_TOTAL = 400;
const TARGET_SHOPPING = Math.round(TARGET_TOTAL * 0.6);
const TARGET_TRAVEL = Math.round(TARGET_TOTAL * 0.3);
const TARGET_UNKNOWN = TARGET_TOTAL - TARGET_SHOPPING - TARGET_TRAVEL;

type Domain = 'travel' | 'shopping' | 'unknown';

function createRng(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function pick<T>(rng: () => number, items: T[]): T {
    if (items.length === 0) {
        throw new Error('pick() called with empty array');
    }
    return items[Math.floor(rng() * items.length)]!;
}

function pickDifferent<T>(rng: () => number, items: T[], avoid: T): T {
    let value = pick(rng, items);
    while (value === avoid) {
        value = pick(rng, items);
    }
    return value;
}

function pickN<T>(rng: () => number, items: T[], count: number): T[] {
    const pool = [...items];
    const selected: T[] = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
        const index = Math.floor(rng() * pool.length);
        const value = pool.splice(index, 1)[0];
        if (value !== undefined) {
            selected.push(value);
        }
    }
    return selected;
}

function maybe(rng: () => number, probability: number): boolean {
    return rng() < probability;
}

function countByDomain(cases: TestCase[]) {
    return cases.reduce(
        (acc, testCase) => {
            acc[testCase.expected_domain] += 1;
            return acc;
        },
        { travel: 0, shopping: 0, unknown: 0 } as Record<Domain, number>
    );
}

function buildTravelCases(count: number, rng: () => number): TestCase[] {
    const origins = [
        'Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Jaipur',
        'Ahmedabad', 'Lucknow', 'Kochi', 'Indore', 'Bhopal', 'Chandigarh', 'Bhubaneswar',
        'Patna', 'Guwahati', 'Coimbatore', 'Mysuru', 'Nagpur'
    ];
    const destinations = [
        'Goa', 'Manali', 'Shimla', 'Munnar', 'Varanasi', 'Amritsar', 'Agra', 'Rishikesh',
        'Udaipur', 'Jaipur', 'Darjeeling', 'Ooty', 'Pondicherry', 'Kodaikanal', 'Ladakh',
        'Andaman', 'Hampi', 'Gokarna', 'Mysuru', 'Ujjain'
    ];
    const transportTypes = ['train', 'bus', 'flight', 'cab'];
    const durationOptions = [2, 3, 4, 5, 6];
    const hotelRatings = [3, 4, 5];
    const budgets = [4000, 6000, 8000, 10000, 12000, 15000, 18000, 20000, 25000, 30000, 40000];

    const cases: TestCase[] = [];
    for (let i = 0; i < count; i++) {
        const origin = pick(rng, origins);
        const destination = pickDifferent(rng, destinations, origin);
        const transport = pick(rng, transportTypes);
        const duration = pick(rng, durationOptions);
        const budget = pick(rng, budgets);
        const rating = pick(rng, hotelRatings);
        const template = Math.floor(rng() * 4);

        let input = '';
        let needsClarification = false;
        let outBudget: number | null = budget;
        let outDuration: number | null = duration;
        let outRating: number | null = null;

        if (template === 0) {
            input = `${duration}-day trip from ${origin} to ${destination}. Prefer ${transport}. Budget INR ${budget}.`;
        } else if (template === 1) {
            input = `Need to travel from ${origin} to ${destination} by ${transport}. Budget INR ${budget}.`;
            outDuration = null;
            needsClarification = true;
        } else if (template === 2) {
            input = `Plan a ${duration} day stay in ${destination} from ${origin}. Need ${rating}-star hotel. Budget INR ${budget}.`;
            outRating = rating;
        } else {
            input = `Trip from ${origin} to ${destination} for ${duration} days by ${transport}. Budget not fixed.`;
            outBudget = null;
            needsClarification = true;
        }

        cases.push({
            id: `travel-gen-${String(i + 1).padStart(3, '0')}`,
            input,
            expected_domain: 'travel',
            expected_output: {
                domain: 'travel',
                budget: outBudget,
                travel_constraints: {
                    origin,
                    destination,
                    duration_days: outDuration,
                    hotel_rating_min: outRating,
                    transport_type: transport
                },
                shopping_constraints: null,
                needs_clarification: needsClarification
            }
        });
    }

    return cases;
}

function buildShoppingCases(count: number, rng: () => number): TestCase[] {
    const categoryDefs = [
        {
            category: 'smartphone',
            brands: ['Samsung', 'OnePlus', 'Xiaomi', 'Vivo', 'Realme'],
            specs: ['5G', '128GB', 'good battery', 'AMOLED'],
            features: ['fast charging', 'good camera', 'dual SIM'],
            budgets: [15000, 20000, 25000, 30000]
        },
        {
            category: 'laptop',
            brands: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer'],
            specs: ['i5 processor', '16GB RAM', '512GB SSD'],
            features: ['student', 'lightweight', 'backlit keyboard'],
            budgets: [45000, 60000, 75000]
        },
        {
            category: 'air conditioner',
            brands: ['LG', 'Voltas', 'Daikin', 'Samsung'],
            specs: ['1.5 ton', '5-star', 'inverter'],
            features: ['low noise', 'fast cooling'],
            budgets: [28000, 35000, 42000]
        },
        {
            category: 'washing machine',
            brands: ['Samsung', 'Bosch', 'IFB', 'LG'],
            specs: ['front-load', '7kg', 'inverter'],
            features: ['quick wash', 'steam wash'],
            budgets: [22000, 30000, 38000]
        },
        {
            category: 'headphones',
            brands: ['boAt', 'JBL', 'Sony', 'Sennheiser'],
            specs: ['bluetooth', 'good mic', 'noise cancellation'],
            features: ['long battery', 'foldable'],
            budgets: [2000, 3000, 5000]
        },
        {
            category: 'motorcycle',
            brands: ['Royal Enfield', 'Bajaj', 'TVS', 'Honda'],
            specs: ['350cc', 'ABS'],
            features: ['touring', 'second hand'],
            budgets: [120000, 150000, 200000]
        },
        {
            category: 'car',
            brands: ['Tata', 'Maruti', 'Hyundai', 'Mahindra'],
            specs: ['sunroof', 'automatic'],
            features: ['SUV', 'compact'],
            budgets: [800000, 1200000, 1500000]
        },
        {
            category: 'television',
            brands: ['Sony', 'Samsung', 'LG', 'TCL'],
            specs: ['4K', '55 inch', 'HDR'],
            features: ['smart TV', 'gaming mode'],
            budgets: [30000, 45000, 60000]
        },
        {
            category: 'refrigerator',
            brands: ['LG', 'Samsung', 'Whirlpool', 'Godrej'],
            specs: ['double door', '300L'],
            features: ['convertible', 'frost free'],
            budgets: [25000, 35000, 45000]
        },
        {
            category: 'office chair',
            brands: ['Green Soul', 'Featherlite', 'Godrej'],
            specs: ['lumbar support', 'mesh back'],
            features: ['ergonomic', 'headrest'],
            budgets: [6000, 8000, 12000]
        },
        {
            category: 'grocery',
            brands: [],
            specs: ['rice', 'dal', 'oil'],
            features: ['monthly', 'family of 4'],
            budgets: [4000, 5000, 6000]
        },
        {
            category: 'jewelry',
            brands: ['Tanishq', 'Malabar', 'Kalyan'],
            specs: ['gold', '22K'],
            features: ['wedding', 'traditional design'],
            budgets: [15000, 20000, 30000]
        }
    ];

    const cases: TestCase[] = [];
    for (let i = 0; i < count; i++) {
        const def = pick(rng, categoryDefs);
        const budget = pick(rng, def.budgets);
        const brand = def.brands.length > 0 && maybe(rng, 0.7) ? pick(rng, def.brands) : null;
        const minSpecs = pickN(rng, def.specs, def.specs.length > 1 ? 2 : 1);
        const preferred = pickN(rng, def.features, def.features.length > 1 ? 2 : 1);

        const brandText = brand ? ` Prefer ${brand}.` : '';
        const specText = minSpecs.length > 0 ? ` Must have ${minSpecs.join(' and ')}.` : '';
        const featureText = preferred.length > 0 ? ` Looking for ${preferred.join(' and ')}.` : '';
        const input = `Need a ${def.category} under INR ${budget}.${brandText}${specText}${featureText}`.trim();

        cases.push({
            id: `shopping-gen-${String(i + 1).padStart(3, '0')}`,
            input,
            expected_domain: 'shopping',
            expected_output: {
                domain: 'shopping',
                budget,
                travel_constraints: null,
                shopping_constraints: {
                    category: def.category,
                    brand,
                    min_specs: minSpecs,
                    preferred_features: preferred
                },
                needs_clarification: false
            }
        });
    }

    return cases;
}

function buildUnknownCases(count: number, rng: () => number): TestCase[] {
    const prompts = [
        'Book a table for 6 at a restaurant in Indiranagar tonight.',
        'Need help filing GST returns for my small business.',
        'Find a yoga class near me for beginners in Pune.',
        'Renew my driving license online in Maharashtra.',
        'Need a tutor for class 12 physics at home in Delhi.',
        'Schedule a dentist appointment in Chennai this weekend.',
        'Apply for a passport renewal and police verification.',
        'Get tickets for a cricket match in Mumbai next month.',
        'Register a complaint about a power outage in Hyderabad.',
        'Find a cook for home meals in Bengaluru.'
    ];

    const cases: TestCase[] = [];
    for (let i = 0; i < count; i++) {
        const input = pick(rng, prompts);
        cases.push({
            id: `unknown-gen-${String(i + 1).padStart(3, '0')}`,
            input,
            expected_domain: 'unknown',
            expected_output: {
                domain: 'unknown',
                budget: null,
                travel_constraints: null,
                shopping_constraints: null,
                needs_clarification: true
            }
        });
    }

    return cases;
}

function buildTestCases(): TestCase[] {
    const rng = createRng(20260519);
    const cases = [...baseCases];
    const counts = countByDomain(cases);

    const travelNeeded = Math.max(0, TARGET_TRAVEL - counts.travel);
    const shoppingNeeded = Math.max(0, TARGET_SHOPPING - counts.shopping);
    const unknownNeeded = Math.max(0, TARGET_UNKNOWN - counts.unknown);

    cases.push(...buildTravelCases(travelNeeded, rng));
    cases.push(...buildShoppingCases(shoppingNeeded, rng));
    cases.push(...buildUnknownCases(unknownNeeded, rng));

    return cases.slice(0, TARGET_TOTAL);
}

export const testCases: TestCase[] = buildTestCases();
