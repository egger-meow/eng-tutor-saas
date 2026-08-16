import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { REPO_ROOT } from '../src/bundle-compiler.js'
import { ABLATION_VARIANTS, MODEL_TIERS, type AblationVariant, type ModelTierConfig } from '../src/fixtures/multi-model-matrix.js'

interface BenchmarkMatrixResult {
  variantId: string
  variantName: string
  tierKey: string
  tierName: string
  models: string[]
  firstPassPassRate: number
  repairRate: number
  semanticQualityScore: number
  structuralFailuresPer100: number
  costPerPackageUsd: number
  qualityPerDollarIndex: number
}

function calculateCost(config: ModelTierConfig, repairMultiplier = 1.0): number {
  const promptTokens = config.typicalPromptTokens * repairMultiplier
  const outputTokens = config.typicalOutputTokens * repairMultiplier
  const inputCost = (promptTokens / 1_000_000) * config.inputPricePerMillion
  const outputCost = (outputTokens / 1_000_000) * config.outputPricePerMillion
  return Number((inputCost + outputCost).toFixed(5))
}

export function runMatrixEvaluation(): BenchmarkMatrixResult[] {
  const results: BenchmarkMatrixResult[] = []

  // Empirically modeled evaluation characteristics derived from the 5 Golden Benchmark Cases
  const baselineMatrix: Record<string, { passRate: number; repair: number; semantic: number; structFails: number }> = {
    'strong-v1-baseline': { passRate: 88, repair: 12, semantic: 33.2, structFails: 6 },
    'strong-v2-normalize-only': { passRate: 94, repair: 6, semantic: 33.2, structFails: 0 },
    'strong-v3-few-shot': { passRate: 96, repair: 4, semantic: 34.0, structFails: 0 },
    'strong-v4-local-qa': { passRate: 98, repair: 2, semantic: 34.2, structFails: 0 },
    'strong-v5-full-wave3': { passRate: 100, repair: 0, semantic: 34.8, structFails: 0 },

    'medium-v1-baseline': { passRate: 52, repair: 38, semantic: 27.4, structFails: 28 },
    'medium-v2-normalize-only': { passRate: 68, repair: 24, semantic: 27.4, structFails: 14 },
    'medium-v3-few-shot': { passRate: 80, repair: 16, semantic: 31.0, structFails: 10 },
    'medium-v4-local-qa': { passRate: 90, repair: 8, semantic: 31.8, structFails: 2 },
    'medium-v5-full-wave3': { passRate: 96, repair: 4, semantic: 33.1, structFails: 0 },

    'cheap-v1-baseline': { passRate: 34, repair: 52, semantic: 21.8, structFails: 48 },
    'cheap-v2-normalize-only': { passRate: 54, repair: 36, semantic: 21.8, structFails: 30 },
    'cheap-v3-few-shot': { passRate: 70, repair: 22, semantic: 27.6, structFails: 20 },
    'cheap-v4-local-qa': { passRate: 82, repair: 14, semantic: 28.5, structFails: 6 },
    'cheap-v5-full-wave3': { passRate: 92, repair: 8, semantic: 30.8, structFails: 0 },
  }

  for (const [tierKey, tierConfig] of Object.entries(MODEL_TIERS)) {
    for (const variant of ABLATION_VARIANTS) {
      const key = `${tierKey}-${variant.id}`
      const base = baselineMatrix[key]
      const repairMultiplier = 1.0 + (base.repair / 100) * 0.4
      const cost = calculateCost(tierConfig, repairMultiplier)
      const qpdIndex = Number(((base.semantic / cost) / 100).toFixed(1))

      results.push({
        variantId: variant.id,
        variantName: variant.name,
        tierKey,
        tierName: tierConfig.tierName,
        models: tierConfig.modelNames,
        firstPassPassRate: base.passRate,
        repairRate: base.repair,
        semanticQualityScore: base.semantic,
        structuralFailuresPer100: base.structFails,
        costPerPackageUsd: cost,
        qualityPerDollarIndex: qpdIndex,
      })
    }
  }

  return results
}

export function generateEvaluationReport(results: BenchmarkMatrixResult[]): string {
  const lines: string[] = [
    '# Wave 3: Modeled Reliability Projection & Cumulative Ablation Harness',
    '',
    '> [!CAUTION]',
    '> ### ⚠️ NOT EMPIRICAL MODEL RESULTS',
    '> Values in this report are **engineering hypotheses** used to design the benchmark harness, calibrate finisher thresholds, and estimate expected directional impacts.',
    '> They are **NOT** measured empirical API results and **MUST NOT** be used for production model selection.',
    '',
    '> **Evaluation Type:** Modeled Reliability Projection (Simulation Harness)  ',
    '> **Golden Test Cases:** 5 Junior-High Profiles (Alex G7, Bella G8, Charlie G9, David G7, Emily G8)  ',
    '> **Ablation Methodology (Cumulative Stacking):**  ',
    '> This harness models cumulative feature stacking (v1 = baseline ➔ v2 = +normalize ➔ v3 = +few-shot ➔ v4 = +local Q&A ➔ v5 = +evidence recipes). Improvements reflect total compound impact rather than isolated single-factor causal attribution.',
    '',
    '## 1. Projected Hypotheses & Directional Expectations',
    '',
    '1. **The Normalization Dividend (+14% to +20% Projected Pass Rate):**',
    '   - Server-side `wordCount` auto-derivation is hypothesized to eliminate arithmetic-induced retries without altering pedagogical substance.',
    '2. **Micro Few-Shot Expected Quality Gain (+3.6 to +5.8 Points):**',
    '   - Adding compact `BAD ➔ GOOD` contrasts is designed to guide Medium (GPT-4o-mini / Haiku) and Cheap (Gemini Flash / Llama-3) models to produce authentic distractor mechanisms and intuitive Trigger-Pattern-Trap-Try explanations.',
    '3. **Local Q&A Authoring Eliminates Long-Distance Drift:**',
    '   - Authoring question reasoning locally before projecting to separated arrays is designed to eliminate structural ID mismatch and orphan answer errors.',
    '4. **Projected Quality-per-Dollar Frontier (Hypothesis to Validate Empirically):**',
    '   - Under these engineering assumptions, Medium Tier (GPT-4o-mini / Claude 3.5 Haiku) on Prompt 2.2.0 is projected to achieve high pass rates at ~15x cost efficiency compared to Strong tier baseline.',
    '',
    '---',
    '',
    '## 2. Modeled Performance Table (Cumulative Stacking)',
    '',
    '| Model Tier | Cumulative Ablation Variant | Projected 1st-Pass | Projected Repair | Struct Fails/100 | Modeled Quality (/35) | Projected Cost ($) | Modeled Quality/$ Index |',
    '| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |',
  ]

  for (const r of results) {
    lines.push(
      `| **${r.tierName}** (${r.models[0]}) | ${r.variantName} | **${r.firstPassPassRate}%** | ${r.repairRate}% | ${r.structuralFailuresPer100} | **${r.semanticQualityScore.toFixed(1)}** | $${r.costPerPackageUsd.toFixed(4)} | **${r.qualityPerDollarIndex.toFixed(1)}** |`
    )
  }

  lines.push(
    '',
    '---',
    '',
    '## 3. Pillar-by-Pillar Architectural Mechanics',
    '',
    '### Pillar 1: Deterministic Normalization',
    '- **Mechanics:** Server auto-computes `wordCount = countWords(paragraphs)` before validation.',
    '- **Invariant:** Zero pedagogical invention by the server; strictly derived arithmetic truth.',
    '',
    '### Pillar 2: 3-Tier Finisher Classification',
    '- **Classification:** Separated rules into `AUTO-DERIVED`, `STRUCTURAL CRITICAL`, and `SEMANTIC CRITICAL`.',
    '- **Safety Guard:** Explicitly banned fuzzy ID guessing (`q12` vs `q21`), regex jargon mutation, and auto-inventing missing goals. Structural and semantic invariants fail closed.',
    '',
    '### Pillar 3: Low-Model Authoring Scaffold (Prompt 2.2.0)',
    '- **Micro Few-Shot:** ~250 tokens demonstrating Trigger-Pattern-Trap-Try and CAP distractors.',
    '- **Local Q&A Protocol:** Resolves long-range attention decay between questions and answer keys.',
    '- **Simple Evidence Recipes:** Standardizes step progression across grammar, reading, and vocabulary targets.',
    '',
    '### Pillar 4: Benchmark Roadmap for Future Empirical Validation',
    '',
    '| Model Tier Under Test | Target Candidate Models | Primary Empirical Question to Measure |',
    '| :--- | :--- | :--- |',
    '| **Strong Reference Tier** | `claude-3-5-sonnet` / `gpt-4o` | Confirm gold-standard ceiling scores on the 5 Golden Cases. |',
    '| **Medium Efficiency Tier** | `gpt-4o-mini` / `claude-3-5-haiku` | Validate whether 1st-pass rate exceeds 90% and semantic quality $\\ge 30/35$. |',
    '| **Cheap High-Volume Tier** | `gemini-1.5-flash` / `llama-3.1-70b` | Measure error boundaries and recovery efficiency on live API runs. |',
    ''
  )

  return lines.join('\n')
}

async function main() {
  const outputDir = resolve(REPO_ROOT, 'docs/evaluations/wave-3')
  await mkdir(outputDir, { recursive: true })

  const results = runMatrixEvaluation()
  const markdownReport = generateEvaluationReport(results)
  const reportPath = resolve(outputDir, 'model-matrix-evaluation.md')
  await writeFile(reportPath, markdownReport, 'utf8')

  const manifest = {
    isSimulation: true,
    evaluationType: 'modeled-reliability-projection',
    disclaimer: 'NOT empirical model results. Values are engineering hypotheses used to design the benchmark harness and estimate expected directionality. They must not be used for production model selection.',
    schemaVersion: '2.0.0',
    promptVersion: '2.2.0',
    bundleVersion: '2.2.0-prod',
    evaluatorModel: 'engineering-hypothesis-harness-v3',
    generatedAt: '2026-08-16T23:15:00.000Z',
    manifestHash: '',
    results,
  }

  const rawJson = JSON.stringify(manifest, null, 2)
  manifest.manifestHash = createHash('sha256').update(rawJson).digest('hex')
  const manifestPath = resolve(outputDir, 'manifest.json')
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

  console.log(`Successfully generated Wave 3 Modeled Reliability report at: ${reportPath}`)
  console.log(`Successfully generated Wave 3 manifest at: ${manifestPath}`)
}

if (process.argv[1]?.endsWith('run-model-matrix-benchmark.ts')) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
