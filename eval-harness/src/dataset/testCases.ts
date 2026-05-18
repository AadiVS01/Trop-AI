import type { TestCase } from './types.js';

export const testCases: TestCase[] = [
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
    }
];
