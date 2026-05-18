import { getModelCompletion } from '../models/groqClient.js';
import { testCases } from '../dataset/testCases.js';
import { scoreOutput, calculateConsistency } from './scoring.js';
import type { ExtractionResult } from '../dataset/types.js';

export interface ModelMetrics {
    modelName: string;
    jsonValidityRate: number;
    domainAccuracy: number;
    fieldAccuracy: number;
    exactMatchRate: number;
    consistencyScore: number;
    avgLatency: number;
}

export async function evaluateModel(modelName: string, promptBase: string): Promise<ModelMetrics> {
    let totalJsonValid = 0;
    let totalDomainMatch = 0;
    let totalFieldAccuracy = 0;
    let totalExactMatch = 0;
    let totalLatency = 0;
    let totalConsistency = 0;

    console.log(`\nEvaluating Model: ${modelName}...`);

    for (const testCase of testCases) {
        const outputs: (ExtractionResult | null)[] = [];

        // Run 3 times for consistency
        for (let i = 0; i < 3; i++) {
            const prompt = `${promptBase}\n\nUser Message: "${testCase.input}"`;

            // Delay to avoid rate limits (30 RPM = 2000ms)
            await new Promise(r => setTimeout(r, 2000));

            const { content, latency } = await getModelCompletion(modelName, prompt);

            const score = scoreOutput(content, testCase.expected_output);

            if (i === 0) {
                totalLatency += latency;

                if (score.isValidJson) {
                    totalJsonValid++;
                } else {
                    console.log(`  [FAILED] Case ${testCase.id}: ${score.validationErrors?.join(', ') || 'Unknown Error'}`);
                }

                if (score.domainMatch) totalDomainMatch++;
                totalFieldAccuracy += score.fieldAccuracy;
                if (score.isExactMatch) totalExactMatch++;
            }

            outputs.push(score.parsedOutput);
        }

        totalConsistency += calculateConsistency(outputs);
    }

    const numCases = testCases.length;

    return {
        modelName,
        jsonValidityRate: (totalJsonValid / numCases) * 100,
        domainAccuracy: (totalDomainMatch / numCases) * 100,
        fieldAccuracy: (totalFieldAccuracy / numCases) * 100,
        exactMatchRate: (totalExactMatch / numCases) * 100,
        consistencyScore: totalConsistency / numCases,
        avgLatency: totalLatency / numCases,
    };
}
