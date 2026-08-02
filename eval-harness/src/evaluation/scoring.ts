import { ExtractionSchema } from '../dataset/types.js';
import type { ExtractionResult } from '../dataset/types.js';

export interface ScoringResult {
    isValidJson: boolean;
    domainMatch: boolean;
    fieldAccuracy: number;
    isExactMatch: boolean;
    parsedOutput: ExtractionResult | null;
    validationErrors?: string[];
}

export function scoreOutput(output: string, expected: ExtractionResult): ScoringResult {
    let parsed: unknown;
    try {
        parsed = JSON.parse(output);
    } catch (e) {
        return {
            isValidJson: false,
            domainMatch: false,
            fieldAccuracy: 0,
            isExactMatch: false,
            parsedOutput: null,
            validationErrors: [`JSON Parse Error: ${(e as Error).message}`],
        };
    }

    const validation = ExtractionSchema.safeParse(parsed);
    if (!validation.success) {
        return {
            isValidJson: false, // Schema mismatch counts as invalid for this strict harness
            domainMatch: false,
            fieldAccuracy: 0,
            isExactMatch: false,
            parsedOutput: null,
            validationErrors: validation.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`),
        };
    }

    const actual = validation.data;
    const domainMatch = actual.domain === expected.domain;

    const { correct, total } = calculateFieldAccuracy(actual, expected);
    const fieldAccuracy = total > 0 ? correct / total : 1;

    const isExactMatch = JSON.stringify(actual) === JSON.stringify(expected);

    return {
        isValidJson: true,
        domainMatch,
        fieldAccuracy,
        isExactMatch,
        parsedOutput: actual,
    };
}

function calculateFieldAccuracy(actual: ExtractionResult, expected: ExtractionResult): { correct: number; total: number } {
    let correct = 0;
    let total = 0;

    // Top level fields
    total++;
    if (actual.domain === expected.domain) correct++;

    total++;
    if (actual.budget === expected.budget) correct++;

    total++;
    if (actual.needs_clarification === expected.needs_clarification) correct++;

    // Domain specific constraints
    if (expected.travel_constraints) {
        const fields = ['origin', 'destination', 'duration_days', 'hotel_rating_min', 'transport_type'] as const;
        for (const field of fields) {
            total++;
            if (actual.travel_constraints && actual.travel_constraints[field] === expected.travel_constraints[field]) {
                correct++;
            }
        }
    }

    if (expected.shopping_constraints) {
        const fields = ['category', 'brand'] as const;
        for (const field of fields) {
            total++;
            if (actual.shopping_constraints && actual.shopping_constraints[field] === expected.shopping_constraints[field]) {
                correct++;
            }
        }

        // Array fields
        total++;
        if (JSON.stringify(actual.shopping_constraints?.min_specs) === JSON.stringify(expected.shopping_constraints.min_specs)) {
            correct++;
        }

        total++;
        if (JSON.stringify(actual.shopping_constraints?.preferred_features) === JSON.stringify(expected.shopping_constraints.preferred_features)) {
            correct++;
        }
    }

    return { correct, total };
}

export function calculateConsistency(outputs: (ExtractionResult | null)[]): number {
    if (outputs.length < 2) return 1;
    const first = JSON.stringify(outputs[0]);
    for (let i = 1; i < outputs.length; i++) {
        if (JSON.stringify(outputs[i]) !== first) return 0;
    }
    return 1;
}
