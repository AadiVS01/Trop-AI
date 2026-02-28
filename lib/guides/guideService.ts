import guidesData from "./guides.json";

export interface GuideStep {
    name: string;
    description: string;
    query: string;
}

export interface Guide {
    id: string;
    name: string;
    category: string;
    gender?: string;
    occasion?: string;
    style?: string;
    tags?: string[];
    description: string;
    steps: GuideStep[];
}

const guides: Guide[] = guidesData as Guide[];

export function findMatchingGuides(query?: string, category?: string, gender?: string): Guide[] {
    return guides.filter(g => {
        // Category match
        if (category && g.category.toLowerCase() !== category.toLowerCase()) return false;

        // Gender match (optional)
        if (gender && g.gender && g.gender !== "unisex" && g.gender.toLowerCase() !== gender.toLowerCase()) return false;

        // Search terms match
        if (!query) return true;
        const q = query.toLowerCase();

        const matches = [
            g.name.toLowerCase(),
            g.category.toLowerCase(),
            g.description.toLowerCase(),
            ...(g.tags || []).map(t => t.toLowerCase())
        ].some(term => term.includes(q) || q.includes(term));

        return matches;
    });
}

export function getGuideById(id: string): Guide | undefined {
    return guides.find(g => g.id === id);
}
