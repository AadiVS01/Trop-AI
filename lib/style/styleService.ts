import templatesData from "./outfitTemplates.json";

export interface OutfitItem {
    category: string;
    query: string;
}

export interface Look {
    name: string;
    stylistNote: string;
    items: OutfitItem[];
}

export interface OutfitTemplate {
    id: string;
    name: string;
    gender: string;
    occasion: string;
    style: string;
    tags?: string[];
    description: string;
    items?: OutfitItem[]; // For backward compatibility if any old ones exist
    looks?: Look[];
}

const templates: OutfitTemplate[] = templatesData as OutfitTemplate[];

export function findMatchingTemplates(gender?: string, occasion?: string, style?: string): OutfitTemplate[] {
    return templates.filter(t => {
        // Gender match: exact or unisex or unknown
        const genderMatch = !gender || gender === "unknown" ||
            t.gender.toLowerCase() === gender.toLowerCase() ||
            t.gender === "unisex";

        // Occasion/Style match: check occasion, style, and tags
        const searchTerms = [occasion, style].filter(Boolean).map(s => s!.toLowerCase());

        if (searchTerms.length === 0) return true;

        const templateTerms = [
            t.occasion.toLowerCase(),
            t.style.toLowerCase(),
            ...(t.tags || []).map(tag => tag.toLowerCase())
        ];

        // If any user term matches any template term, it's a candidate
        const termMatch = searchTerms.some(term =>
            templateTerms.some(tTerm => tTerm.includes(term) || term.includes(tTerm))
        );

        return genderMatch && termMatch;
    });
}

export function getTemplateById(id: string): OutfitTemplate | undefined {
    return templates.find(t => t.id === id);
}

/**
 * Returns a specific coordinated look from a template.
 * If multiple looks exist, it currently returns the first one.
 */
export function getBestLook(template: OutfitTemplate): Look | undefined {
    if (template.looks && template.looks.length > 0) {
        return template.looks[0];
    }
    return undefined;
}
