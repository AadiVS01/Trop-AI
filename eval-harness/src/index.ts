import { evaluateModel } from './evaluation/evaluator.js';
import type { ModelMetrics } from './evaluation/evaluator.js';
import { STAGE_1_PROMPT, STAGE_2_PROMPT } from './evaluation/prompt.js';
import { writeFileSync } from 'fs';

const MODELS = [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'qwen/qwen3-32b',
    'openai/gpt-oss-20b'
];

async function main() {
    console.log('----------------------------------------');
    console.log('AI Constraint Extraction Evaluation');
    console.log('Domain Focus: Indian Market & Travel');
    console.log('----------------------------------------');

    console.log('\n>>> STAGE 1: ZERO-SHOT EVALUATION <<<');
    const stage1Results = await runEvaluation(MODELS, STAGE_1_PROMPT);
    printResultsTable(stage1Results, 'STAGE 1: ZERO-SHOT');
    saveResults(stage1Results, 'stage1');

    console.log('\n>>> STAGE 2: FEW-SHOT EVALUATION <<<');
    const stage2Results = await runEvaluation(MODELS, STAGE_2_PROMPT);
    printResultsTable(stage2Results, 'STAGE 2: FEW-SHOT');
    saveResults(stage2Results, 'stage2');
}

async function runEvaluation(models: string[], prompt: string): Promise<ModelMetrics[]> {
    const results: ModelMetrics[] = [];
    for (const model of models) {
        try {
            const metrics = await evaluateModel(model, prompt);
            results.push(metrics);
        } catch (error) {
            console.error(`Failed to evaluate model ${model}:`, error);
        }
    }
    return results;
}

function saveResults(results: ModelMetrics[], suffix: string) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `results-${suffix}-${timestamp}.json`;
        writeFileSync(filename, JSON.stringify(results, null, 2));
        console.log(`\nResults saved to ${filename}`);
    } catch (err) {
        console.error('Failed to save JSON results:', err);
    }
}

function printResultsTable(results: ModelMetrics[], title: string) {
    console.log('\n\n' + '='.repeat(80));
    console.log(title);
    console.log('='.repeat(80));

    const header = `| ${'Model'.padEnd(23)} | ${'JSON %'.padEnd(8)} | ${'Field %'.padEnd(8)} | ${'Match %'.padEnd(8)} | ${'Consist'.padEnd(8)} | ${'Lat(ms)'.padEnd(8)} |`;
    console.log(header);
    console.log('-'.repeat(header.length));

    for (const r of results) {
        const row = `| ${r.modelName.padEnd(23)} | ${r.jsonValidityRate.toFixed(1).padEnd(8)} | ${r.fieldAccuracy.toFixed(1).padEnd(8)} | ${r.exactMatchRate.toFixed(1).padEnd(8)} | ${r.consistencyScore.toFixed(2).padEnd(8)} | ${Math.round(r.avgLatency).toString().padEnd(8)} |`;
        console.log(row);
    }
    console.log('-'.repeat(header.length));
}

main().catch(console.error);
