# Wave 1: Token & Context Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce LLM prompt and context token consumption by 50–70% through a compiled production authoring bundle, a server-side decision-complete context capsule in Supabase, and elimination of mechanical check duplication between TypeScript validators and the LLM critic, with zero curriculum quality regression or schema breaking changes.

**Architecture:**
1. **Production Prompt Bundle Compiler**: Build a deterministic build tool that aggregates authoritative rules (`SPEC` excerpts, `rubric.md`, `workflow.md`, `prompts/2.0.1/*`, `schema`) into a single compact artifact with cryptographic input hashes and CI drift checks.
2. **Context Capsule Migration**: Update Supabase `worker_generation_context` to distill raw database table dumps (100+ raw vocabulary/grammar rows) into categorized decision structures (`dueForReview`, `weakRecent`, `uncertain`, `recentlyMastered`, `historicalSummary`).
3. **Critic & Finisher De-duplication**: Strip syntax/format auditing from `03-critic.md` (leaving it to `audit-curriculum.ts`), sharpening the LLM critic on deep pedagogical/semantic quality.

**Tech Stack:** TypeScript, Node.js, Vitest, Zod, PostgreSQL / PLpgSQL (Supabase).

**Spec:** [docs/SPEC.md](file:///c:/IDEA/eng-tutor-saas/docs/SPEC.md) (Sections 46–87, 114–132, 204, 205, 210), [docs/chatgpt-work-daily-schedule.md](file:///c:/IDEA/eng-tutor-saas/docs/chatgpt-work-daily-schedule.md).

## Global Constraints

- Do not change curriculum output schema version (`2.0.0`) or breaking structure.
- Do not loosen any quality gates in `auditCurriculumPackage()` or `validateCurriculumPackage()`.
- Do not redesign PDF rendering or alter visual outputs in this wave.
- Preserve deterministic server-owned input fingerprinting (`sha256:...`).
- Keep all decision-relevant evidence intact while eliminating redundant boilerplate.

---

## File Structure

```text
packages/generator/
├── bundles/
│   └── production-authoring-bundle.md       # Compiled compact production rule bundle
├── scripts/
│   └── compile-production-bundle.ts         # Deterministic compiler script
├── src/
│   ├── bundle-compiler.ts                   # Core bundling and hashing engine
│   ├── bundle-compiler.test.ts              # CI drift verification & hash test
│   └── token-benchmark.test.ts              # Token regression test
└── prompts/2.0.1/
    └── 03-critic.md                         # Streamlined semantic critic

supabase/migrations/
└── 20260816223500_server_side_context_capsule.sql # Refactored worker_generation_context

docs/
└── chatgpt-work-daily-schedule.md           # Updated schedule prompt referencing compiled bundle
```

---

### Task 1: Production Prompt Bundle Compiler & Build System

**Files:**
- Create: `packages/generator/src/bundle-compiler.ts`
- Create: `packages/generator/scripts/compile-production-bundle.ts`
- Create: `packages/generator/src/bundle-compiler.test.ts`
- Modify: `packages/generator/package.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `packages/generator/prompts/2.0.1/*.md`, `docs/curriculum-quality-rubric.md`, `docs/product-rules.md`, `packages/generator/src/curriculum-package-schema.ts`.
- Produces: `packages/generator/bundles/production-authoring-bundle.md` with structured YAML frontmatter (`bundleVersion`, `sourceHashes`, `schemaVersion`, `promptVersion`, `generatedAt`).

- [ ] **Step 1: Write failing test for bundle compiler**

```typescript
// packages/generator/src/bundle-compiler.test.ts
import { describe, it, expect } from 'vitest'
import { compileProductionBundle, getBundleSourceHashes } from './bundle-compiler.js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

describe('bundle-compiler', () => {
  it('generates a deterministic production bundle with matching source hashes', async () => {
    const bundlePath = resolve(process.cwd(), 'bundles/production-authoring-bundle.md')
    const existingBundle = await readFile(bundlePath, 'utf8')
    const freshBundle = await compileProductionBundle()

    expect(freshBundle.content).toBe(existingBundle)
    expect(freshBundle.metadata.schemaVersion).toBe('2.0.0')
    expect(freshBundle.metadata.promptVersion).toBe('2.0.1')
    expect(Object.keys(freshBundle.metadata.sourceHashes).length).toBeGreaterThan(3)
  })

  it('keeps compiled bundle size within token budget (< 4500 words / ~6000 tokens)', async () => {
    const freshBundle = await compileProductionBundle()
    const wordCount = freshBundle.content.split(/\s+/u).length
    expect(wordCount).toBeLessThan(4500)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @paper-english/generator test src/bundle-compiler.test.ts`
Expected: FAIL with module not found or missing file.

- [ ] **Step 3: Implement bundle compiler engine**

```typescript
// packages/generator/src/bundle-compiler.ts
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export interface BundleMetadata {
  bundleVersion: string
  schemaVersion: string
  promptVersion: string
  sourceHashes: Record<string, string>
}

export interface CompiledBundle {
  metadata: BundleMetadata
  content: string
}

export const SOURCE_FILES = [
  'prompts/2.0.1/01-plan.md',
  'prompts/2.0.1/02-author.md',
  'prompts/2.0.1/03-critic.md',
  'prompts/2.0.1/04-repair.md',
  'src/curriculum-package-schema.ts',
  '../../docs/curriculum-quality-rubric.md',
  '../../docs/product-rules.md',
] as const

export async function getBundleSourceHashes(baseDir: string = process.cwd()): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of SOURCE_FILES) {
    const fullPath = resolve(baseDir, relativePath)
    const content = await readFile(fullPath, 'utf8')
    hashes[relativePath] = createHash('sha256').update(content).digest('hex')
  }
  return hashes
}

export async function compileProductionBundle(baseDir: string = process.cwd()): Promise<CompiledBundle> {
  const hashes = await getBundleSourceHashes(baseDir)
  const plan = await readFile(resolve(baseDir, 'prompts/2.0.1/01-plan.md'), 'utf8')
  const author = await readFile(resolve(baseDir, 'prompts/2.0.1/02-author.md'), 'utf8')
  const critic = await readFile(resolve(baseDir, 'prompts/2.0.1/03-critic.md'), 'utf8')
  const repair = await readFile(resolve(baseDir, 'prompts/2.0.1/04-repair.md'), 'utf8')

  const frontmatter = [
    '---',
    'bundleVersion: "2.0.1-prod"',
    'schemaVersion: "2.0.0"',
    'promptVersion: "2.0.1"',
    'sourceHashes:',
    ...Object.entries(hashes).map(([file, hash]) => `  "${file}": "${hash}"`),
    '---',
  ].join('\n')

  const body = [
    '# 紙屬英文 Production Authoring Bundle',
    '',
    '> This is the deterministically compiled production authoring contract for 紙屬英文.',
    '> Do not edit manually. Recompile using `pnpm compile:bundle`.',
    '',
    '## 1. Plan Instructions',
    plan.trim(),
    '',
    '## 2. Author Instructions',
    author.trim(),
    '',
    '## 3. Independent Critic Instructions',
    critic.trim(),
    '',
    '## 4. Targeted Repair Instructions',
    repair.trim(),
  ].join('\n')

  const content = `${frontmatter}\n\n${body}\n`

  return {
    metadata: {
      bundleVersion: '2.0.1-prod',
      schemaVersion: '2.0.0',
      promptVersion: '2.0.1',
      sourceHashes: hashes,
    },
    content,
  }
}
```

- [ ] **Step 4: Create compile script and generate initial bundle**

```typescript
// packages/generator/scripts/compile-production-bundle.ts
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { compileProductionBundle } from '../src/bundle-compiler.js'

const outputPath = resolve(process.cwd(), 'bundles/production-authoring-bundle.md')
await mkdir(dirname(outputPath), { recursive: true })
const bundle = await compileProductionBundle()
await writeFile(outputPath, bundle.content, 'utf8')
console.log(`Successfully compiled production bundle to ${outputPath}`)
```

- [ ] **Step 5: Add npm scripts & run tests**

Add `"compile:bundle": "tsx scripts/compile-production-bundle.ts"` in `packages/generator/package.json`.
Run compile: `pnpm --filter @paper-english/generator compile:bundle`
Run test: `pnpm --filter @paper-english/generator test src/bundle-compiler.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/generator/src/bundle-compiler.ts packages/generator/scripts/compile-production-bundle.ts packages/generator/src/bundle-compiler.test.ts packages/generator/bundles/production-authoring-bundle.md packages/generator/package.json
git commit -m "feat(generator): add deterministic production prompt bundle compiler"
```

---

### Task 2: Supabase Server-Side Context Capsule Migration

**Files:**
- Create: `supabase/migrations/20260816223500_server_side_context_capsule.sql`
- Modify: `packages/worker/src/pipeline.ts`
- Modify: `packages/worker/src/pipeline.test.ts`

**Interfaces:**
- Consumes: `child_vocab_progress`, `child_grammar_progress`, `child_learning_state`, `child_profiles`.
- Produces: `worker_generation_context` returning structured decision capsules:
  `vocabularyCapsule: { dueForReview: string[], weakRecent: string[], uncertain: string[], recentlyMastered: string[], historicalCount: number }`
  `grammarCapsule: { dueForReview: string[], weakRecent: string[], uncertain: string[], historicalCount: number }`

- [ ] **Step 1: Write migration for server-side context capsule**

```sql
-- supabase/migrations/20260816223500_server_side_context_capsule.sql

create or replace function public.worker_generation_context(job_id uuid, worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  result jsonb;
  v_vocab_due jsonb;
  v_vocab_weak jsonb;
  v_vocab_uncertain jsonb;
  v_vocab_mastered jsonb;
  v_vocab_count integer;
  v_grammar_due jsonb;
  v_grammar_weak jsonb;
  v_grammar_uncertain jsonb;
  v_grammar_count integer;
begin
  select * into claimed_job
  from public.generation_jobs as job
  where job.id = $1
    and job.status = 'claimed'
    and job.claimed_by = $2
    and job.lease_expires_at > now();

  if claimed_job.id is null then
    raise exception 'job is not actively claimed by this worker';
  end if;

  -- Distill vocabulary into decision categories
  select
    coalesce(jsonb_agg(word_id) filter (where state = 'review_due'), '[]'::jsonb),
    coalesce(jsonb_agg(word_id) filter (where state = 'weak' or mastery_score < 0.6), '[]'::jsonb),
    coalesce(jsonb_agg(word_id) filter (where state = 'uncertain'), '[]'::jsonb),
    coalesce(jsonb_agg(word_id) filter (where state = 'mastered'), '[]'::jsonb),
    count(*)
  into v_vocab_due, v_vocab_weak, v_vocab_uncertain, v_vocab_mastered, v_vocab_count
  from public.child_vocab_progress
  where child_id = claimed_job.child_id;

  -- Distill grammar into decision categories
  select
    coalesce(jsonb_agg(rule_id) filter (where state = 'review_due'), '[]'::jsonb),
    coalesce(jsonb_agg(rule_id) filter (where state = 'weak' or mastery_score < 0.6), '[]'::jsonb),
    coalesce(jsonb_agg(rule_id) filter (where state = 'uncertain'), '[]'::jsonb),
    count(*)
  into v_grammar_due, v_grammar_weak, v_grammar_uncertain, v_grammar_count
  from public.child_grammar_progress
  where child_id = claimed_job.child_id;

  select jsonb_build_object(
    'job', jsonb_build_object(
      'id', claimed_job.id, 'childId', claimed_job.child_id,
      'materialWeek', claimed_job.material_week, 'ruleVersion', claimed_job.rule_version,
      'releaseAt', claimed_job.release_at, 'feedbackCutoffAt', claimed_job.feedback_cutoff_at,
      'feedbackMissing', claimed_job.feedback_missing, 'sourceMaterialId', claimed_job.source_material_id
    ),
    'child', jsonb_build_object(
      'grade', child.grade, 'gradeStage', child.grade_stage,
      'textbookVersion', child.textbook_version, 'preferences', child.preferences
    ),
    'profile', to_jsonb(profile) - 'child_id' - 'created_at' - 'updated_at',
    'learningState', to_jsonb(state) - 'child_id' - 'updated_at',
    'vocabularyCapsule', jsonb_build_object(
      'dueForReview', v_vocab_due,
      'weakRecent', v_vocab_weak,
      'uncertain', v_vocab_uncertain,
      'recentlyMastered', v_vocab_mastered,
      'historicalCount', coalesce(v_vocab_count, 0)
    ),
    'grammarCapsule', jsonb_build_object(
      'dueForReview', v_grammar_due,
      'weakRecent', v_grammar_weak,
      'uncertain', v_grammar_uncertain,
      'historicalCount', coalesce(v_grammar_count, 0)
    ),
    'sourceMaterial', case when source_material.id is null then null else jsonb_build_object(
      'id', source_material.id, 'materialWeek', source_material.material_week,
      'generationSummary', source_material.generation_summary
    ) end,
    'feedback', case when feedback.id is null then null else to_jsonb(feedback) - 'child_id' - 'updated_at' end
  ) into result
  from public.children as child
  join public.child_profiles as profile on profile.child_id = child.id
  join public.child_learning_state as state on state.child_id = child.id
  left join public.materials as source_material on source_material.id = claimed_job.source_material_id
  left join public.feedback as feedback
    on feedback.child_id = claimed_job.child_id
    and feedback.material_id = claimed_job.source_material_id
    and feedback.created_at <= claimed_job.feedback_cutoff_at
  where child.id = claimed_job.child_id;

  return result;
end;
$$;

revoke all on function public.worker_generation_context(uuid, text) from public, anon, authenticated;
grant execute on function public.worker_generation_context(uuid, text) to service_role;
```

- [ ] **Step 2: Update pipeline context types and tests**

Update `packages/worker/src/pipeline.ts` and `pipeline.test.ts` to support both legacy and context capsule fields transparently.
Run: `pnpm --filter @paper-english/worker test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260816223500_server_side_context_capsule.sql packages/worker/src/pipeline.ts packages/worker/src/pipeline.test.ts
git commit -m "feat(supabase): migrate worker generation context to decision-complete capsule"
```

---

### Task 3: Streamline LLM Critic Prompt & De-duplicate Code Checks

**Files:**
- Modify: `packages/generator/prompts/2.0.1/03-critic.md`
- Run: `pnpm --filter @paper-english/generator compile:bundle`

**Interfaces:**
- Consumes: Semantic review guidelines.
- Produces: Focused adversarial critic prompt targeting authentic student experience, genuine non-circular reasoning, distractor quality, and depth of personalization.

- [ ] **Step 1: Update `03-critic.md` to remove deterministic syntactic auditing**

Remove mechanical checks (counting questions, checking Zod types, parsing ISO dates, verifying target ID mappings) from `03-critic.md`, keeping the 5 core pedagogical checks:
1. **Self-Study Viability**: Can a tired student proceed alone without hidden confusion?
2. **Cognitive Tension & Distractors**: Are 4-choice options genuinely tempting without silly giveaways?
3. **Explanatory Substance**: Do Chinese explanations give actionable mental models rather than tautological restatements?
4. **Age Dignity & Authenticity**: Is the reading natural, engaging, and neither childish nor pedantic?
5. **Personalization Depth**: Is the child interest woven into a genuine situation/problem rather than superficial name substitution?

- [ ] **Step 2: Recompile production bundle and verify test**

Run: `pnpm --filter @paper-english/generator compile:bundle`
Run: `pnpm --filter @paper-english/generator test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/generator/prompts/2.0.1/03-critic.md packages/generator/bundles/production-authoring-bundle.md
git commit -m "refactor(generator): sharpen critic on pedagogical quality and remove deterministic code duplication"
```

---

### Task 4: Update Scheduled Work Contract & Prompt

**Files:**
- Modify: `docs/chatgpt-work-daily-schedule.md`

**Interfaces:**
- Updates ChatGPT Scheduled Work reading instructions to ingest the single `packages/generator/bundles/production-authoring-bundle.md` rather than 11 scattered source files.

- [ ] **Step 1: Update `docs/chatgpt-work-daily-schedule.md` prompt**

Update the `CURRENT RULES — READ BEFORE CLAIM` section to read:
```text
CURRENT RULES — READ BEFORE CLAIM

Read this single compiled bundle from the current main branch and record its Git SHA:

- packages/generator/bundles/production-authoring-bundle.md

This bundle is the authoritative, deterministically compiled production ruleset. Do not read raw source files or egger-meow/eng-tutor during a production run. If GitHub is unavailable or the bundle cannot be read, claim nothing and report PRECHECK_BLOCKED.
```

- [ ] **Step 2: Verify consistency with pre-submission audit rules**

Confirm that the pre-submission audit rules and Supabase project ref (`eng-tutor`, `ykzszjrqynrhgdhoeovo`) remain intact.

- [ ] **Step 3: Commit**

```bash
git add docs/chatgpt-work-daily-schedule.md
git commit -m "docs: point chatgpt scheduled task to compiled production authoring bundle"
```

---

### Task 5: Token Regression Benchmark & Full Pipeline Verification

**Files:**
- Create: `packages/generator/src/token-benchmark.test.ts`
- Test: Full repository test suite (`pnpm test`, `pnpm generate:synthetic`)

- [ ] **Step 1: Write token benchmark test**

```typescript
// packages/generator/src/token-benchmark.test.ts
import { describe, it, expect } from 'vitest'
import { compileProductionBundle } from './bundle-compiler.js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

describe('token-benchmark', () => {
  it('verifies compiled bundle achieves > 50% token reduction compared to scattered sources', async () => {
    const bundle = await compileProductionBundle()
    const bundleWords = bundle.content.split(/\s+/u).length

    // Scattered legacy files baseline:
    const scatteredPaths = [
      '../../docs/SPEC.md',
      '../../docs/curriculum-quality-rubric.md',
      '../../docs/generation-workflow.md',
      '../../docs/product-rules.md',
      'prompts/2.0.1/01-plan.md',
      'prompts/2.0.1/02-author.md',
      'prompts/2.0.1/03-critic.md',
      'prompts/2.0.1/04-repair.md',
      'src/curriculum-package-schema.ts',
      'src/validate-curriculum-package.ts',
      'src/audit-curriculum.ts',
    ]

    let scatteredWords = 0
    for (const file of scatteredPaths) {
      try {
        const text = await readFile(resolve(process.cwd(), file), 'utf8')
        scatteredWords += text.split(/\s+/u).length
      } catch {
        // ignore missing
      }
    }

    expect(bundleWords).toBeLessThan(scatteredWords * 0.4) // At least 60% reduction
  })
})
```

- [ ] **Step 2: Run all tests and synthetic validation**

Run: `pnpm test`
Run: `pnpm --filter @paper-english/pdf generate:synthetic`
Expected: All tests PASS, synthetic PDFs render successfully.

- [ ] **Step 3: Commit**

```bash
git add packages/generator/src/token-benchmark.test.ts
git commit -m "test(generator): add token regression benchmark test"
```

---

## Verification Plan

### Automated Tests
- Run `pnpm --filter @paper-english/generator test` (bundle compiler, schema, audit, benchmark).
- Run `pnpm --filter @paper-english/worker test` (context capsule pipeline).
- Run `pnpm --filter @paper-english/pdf test` (PDF rendering integrity).
- Run `pnpm generate:synthetic` (full end-to-end PDF generation proof).

### Manual Verification
- Inspect `packages/generator/bundles/production-authoring-bundle.md` for clean markdown, correct YAML metadata, and complete instructions.
- Validate that the Scheduled Task prompt in `docs/chatgpt-work-daily-schedule.md` is copy-paste ready and references only the compiled bundle and private bridge.
