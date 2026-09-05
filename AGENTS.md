# Mandatory SPEC Reading Protocol for Agents

Before doing ANY implementation, architecture change, database migration, curriculum change, frontend change, billing change, or product behavior change in this repository, follow this protocol.

## 1. Do NOT read the full `SPEC.md` first

`SPEC.md` is intentionally very large and detailed.

It is a product knowledge base, not a document that should be loaded entirely into context for every task.

Reading all of it by default wastes context and may reduce implementation quality.

---

## 2. Read `SPEC-TOC.md` FIRST

Your first specification read MUST be:

```text
SPEC-TOC.md
```

Read the complete numbered index.

Use it to understand:

* how the product is divided;
* where the relevant requirements live;
* which sections apply to the current task.

Do not modify code before doing this.

---

## 3. Select relevant SPEC sections

After reading `SPEC-TOC.md`, determine which numbered sections of `SPEC.md` are relevant.

Before implementation, explicitly state internally or in your work plan:

```text
Relevant SPEC sections:
#...
#...
#...
```

Then read those sections from `SPEC.md`.

Do NOT read unrelated sections just because they exist.

---

## 4. Always read Section 204

Every implementation task must read:

> **Section 204 — Agent Instructions**

This section contains repository-wide behavioral requirements.

---

## 5. Curriculum / generator work must also read Section 205

If the task touches:

* weekly material generation;
* vocabulary;
* grammar;
* CAP alignment;
* reading articles;
* homework;
* Student PDF educational content;
* personalization logic;
* `eng-tutor` curriculum upstream;

you MUST also read:

> **Section 205 — Curriculum Agent Instructions**

---

## 6. Use Section 210 to resolve ambiguity

If two possible implementations both technically work, but the product direction is unclear, read:

> **Section 210 — Final Product Rule**

Prefer the implementation that better serves the core learning loop.

---

## 7. Expand context gradually

Start with the smallest reasonable section set.

If a section references another requirement that matters, read that additional section.

Do not respond to uncertainty by loading the entire SPEC.

Preferred pattern:

```text
Read TOC
↓
Read 5–10 relevant sections
↓
Inspect code
↓
Discover one dependency
↓
Read 2–3 additional sections
↓
Implement
```

Not:

```text
Read all 4000+ lines
↓
lose useful context
↓
implement from memory
```

---

## 8. Use exact numbered headings

When reading `SPEC.md`, locate content using section number and heading.

Example:

```text
# 114. Generation Must Use Explicit Jobs
```

Read until the next numbered section begins.

Do not depend on approximate keyword summaries when the actual requirement exists.

---

## 9. The TOC is not the requirement

`SPEC-TOC.md` only tells you where requirements live.

For example:

```text
64. Core Vocabulary Defines Difficulty Ceiling
```

does NOT contain enough detail by itself to implement the rule.

If Section 64 matters to your task:

> read Section 64 in `SPEC.md`.

---

## 10. Inspect the repository after reading relevant requirements

After reading the relevant SPEC sections:

1. inspect existing code;
2. inspect current schema/migrations;
3. inspect existing tests;
4. follow existing architecture where it remains compatible with SPEC.

Do not redesign working systems unnecessarily.

---

## 11. `eng-tutor` is upstream, not runtime

For curriculum/material-generation work:

1. read Sections 53–67 and 205 when relevant;
2. inspect `docs/eng-tutor-upstream.md`;
3. inspect only relevant current files from `egger-meow/eng-tutor`;
4. port validated principles deliberately.

Do NOT:

* copy the entire repository;
* blindly copy Jonathan-specific state;
* create runtime dependency on `eng-tutor`;
* automatically sync experimental upstream behavior.

---

## 12. Do not invent missing product rules

If a behavior is already defined in SPEC:

> follow it.

If a behavior is genuinely undefined:

1. check neighboring relevant sections;
2. check Section 210;
3. choose the simplest solution consistent with the product;
4. document any meaningful new assumption.

Do not silently invent a large new subsystem.

---

## 13. Respect MVP non-goals

Before adding a feature not obviously required, read:

> **Section 183 — MVP Non-Goals**

and:

> **Section 184 — Explicit Product Simplicity Rule**

Do not implement something merely because other EdTech products commonly have it.

---

## 14. Read the matching Definition of Done

For any major feature, read its relevant Definition of Done.

Examples:

### Account / multi-child

Read:

* 192
* 198

### Material generation

Read:

* 193
* 199

### Feedback / personalization

Read:

* 194

### Billing

Read:

* 195
* 196

### Capacity

Read:

* 197

### Learning guide

Read:

* 200

Implementation is not complete until the relevant Definition of Done is satisfied.

---

## 15. Full SPEC reads are exceptional

You may read the entire `SPEC.md` only when the task genuinely requires it, such as:

* full product audit;
* full SPEC refactor;
* detecting contradictions across the whole specification;
* producing a new global architecture from scratch;
* explicit user instruction to review the complete SPEC.

Even then:

> read it in sections/chunks rather than loading the entire file at once when possible.

---

## 16. Updating SPEC

If implementation requires an intentional change to the product contract:

1. update the relevant section in `SPEC.md`;
2. update `SPEC-TOC.md` if a section is added, removed, renamed, or renumbered;
3. keep section numbering and titles synchronized.

Never allow the TOC and SPEC headings to drift apart.

---

## 17. Mandatory first-step template

At the beginning of a new substantial task, use this mental workflow:

```text
1. Read SPEC-TOC.md.
2. Classify the task.
3. Identify relevant section numbers.
4. Read those sections in SPEC.md.
5. Read Section 204.
6. Read Section 205 if curriculum/generator-related.
7. Inspect relevant existing code.
8. Make the smallest implementation that satisfies SPEC.
9. Run relevant tests.
10. Check the matching Definition of Done.
```

---

# Quick Examples

## Example: "Build the parent dashboard"

Do NOT read all of SPEC.

Read approximately:

```text
17–21
36–45
141–152
159–162
179
182
192
198
204
```

Then inspect frontend and Supabase code.

---

## Example: "Generate weekly English materials"

Read approximately:

```text
46–87
109–132
180–181
187
193–194
199
204–205
210
```

Then inspect the generator and relevant `eng-tutor` upstream files.

---

## Example: "Integrate Paddle"

Read approximately:

```text
20–24
26–32
133–140
190
195–197
204
```

Then verify current Paddle behavior before implementation.

---

## Example: "Change vocabulary difficulty rules"

Read:

```text
46–67
73–81
180–181
204
205
210
```

Then inspect the latest relevant `eng-tutor` curriculum/generation files.

---

## Example: "Change landing page copy"

Read:

```text
2–16
22–32
163–167
191
204
209–210
```

There is no reason to load database retry semantics or PDF storage requirements.

---

# Final Rule

**Never begin by reading the entire `SPEC.md`.**

Begin with:

> `SPEC-TOC.md`

Then use the numbered map to retrieve only the detailed requirements needed for the current task.

Treat context window space as an engineering resource.

---

# Current Build and PDF Commands

Use repository-level scripts after following the reading protocol:

```powershell
pnpm dev
pnpm lint
pnpm test
pnpm test:db
pnpm test:e2e
pnpm typecheck
pnpm build
pnpm --filter @paper-english/pdf pdf:install
pnpm generate:synthetic
```

Source lives under `apps/web/src/`, `packages/generator/src/`, and `packages/pdf/src/`; Supabase migrations and tests live under `supabase/`. Web route pages belong in `apps/web/src/routes/`, reusable components in `apps/web/src/components/`, and browser-safe data access in `apps/web/src/lib/`. Preserve the root-based Cloudflare Workers Static Assets SPA at `https://paperbond.jjmowlab.com`; do not restore `VITE_BASE_PATH`, repository-prefixed routes, or a built `404.html` fallback. Generated PDFs belong only in the git-ignored `output/pdf/` directory. The synthetic command proves canonical validation and deterministic PDF rendering locally. Production curriculum authoring follows `docs/production-authoring.md`. The active normal executor may be local or online according to scheduler mode. Authoring executors claim and submit through the reviewed bridge. Week 1 is the sole publication exception: every first-packet submission goes to the objective-integrity-only Week 1 Fast Publisher and does not enter the normal Finisher semantic gate. Week 2+ continues through the deterministic Finisher for rendering, storage, and material completion.

# Supabase Production Delivery

After committing and pushing a completed change, if the commit includes new Supabase migrations, apply the pending migration chain to the linked production database and verify the remote migration history. If the commit includes new or changed Supabase Edge Functions, deploy the affected functions to the linked production project and verify the deployment. Treat these production deployment steps as part of the default delivery workflow unless the user explicitly opts out or production access is unavailable.
