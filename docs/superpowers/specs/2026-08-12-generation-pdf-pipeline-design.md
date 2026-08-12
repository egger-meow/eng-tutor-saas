# Generation and PDF Pipeline Design

## Objective

Build the first executable vertical slice for one synthetic child: accept a canonical weekly lesson document, validate its educational and structural rules, and deterministically render separate Student and Parent Answer A4 PDFs. This slice proves the repository-side pipeline before a ChatGPT Work schedule or privileged Supabase writes are enabled.

## System Boundary

ChatGPT Work is the future generation worker. It will claim an eligible Supabase job, assemble child context, and produce JSON conforming to the versioned lesson schema. It must not control PDF layout or bypass validation.

The repository owns:

1. the canonical TypeScript/JSON lesson contract;
2. deterministic structural and answer-integrity validation;
3. Student and Parent HTML rendering from the same validated document;
4. Chromium-based PDF rendering and artifact checks.

The initial command uses committed synthetic fixture data and writes local artifacts only. Storage upload, job completion, retries, and scheduling remain outside this slice.

## Canonical Lesson Document

The document contains immutable generation metadata, a personalization summary, learning objectives, 7-15 core vocabulary items, a reading passage, grammar instruction, numbered answerable exercises, homework, and parent-only guidance. Every answerable item has one stable `questionId`; answers are stored only in the parent-answer portion and must cover the exact set of question IDs.

Student and Parent PDFs are projections of the same document rather than separately generated text. This prevents drift and makes a later regeneration traceable to the same job, rule version, schema version, and input fingerprint.

## Components

- `packages/generator`: schema types, parsing, validation, fixtures, and a CLI that coordinates the local vertical slice.
- `packages/pdf`: HTML templates, print CSS, escaping, Chromium rendering, and PDF artifact inspection.
- `output/pdf/`: ignored local output using stable names such as `synthetic-week-1-student.pdf` and `synthetic-week-1-parent-answer.pdf`.

Zod will validate input shape at runtime. Playwright Chromium will render HTML/CSS to A4 PDFs because it provides stronger pagination, bilingual font handling, and maintainable templates than direct PDF drawing. The browser dependency is repository tooling, not part of the public web bundle.

## Data Flow

```text
synthetic lesson JSON
  -> schema parse
  -> educational and answer-integrity validation
  -> Student HTML + Parent Answer HTML
  -> Chromium A4 rendering
  -> PDF signature/page/text checks
  -> two local artifacts
```

Validation is fail-closed. Invalid input produces a structured list of actionable issues and no final PDFs. Rendering uses a temporary directory and moves artifacts to their stable output paths only after both files pass inspection, preventing a half-published pair.

## Rendering Contract

Both PDFs use black-and-white, printer-friendly A4 styling, consistent margins, page numbers, readable section hierarchy, and explicit page-break rules. The Student PDF includes instructions, lesson content, questions, and writing space but no answer keys or parent notes. The Parent Answer PDF includes the lesson identity, personalization rationale, all questions with matching answers/explanations, and parent guidance.

HTML output must escape all lesson content. Templates may apply layout but may not invent or modify curriculum content.

## Verification

Automated tests cover valid parsing, vocabulary bounds, required sections, duplicate/missing/extra answer IDs, student-answer isolation, deterministic filenames, HTML escaping, and failure atomicity. The vertical-slice command must create two non-empty `%PDF` files. Final verification renders every PDF page to PNG for visual inspection and extracts text to confirm expected headings, question IDs, and the absence of answer-only content from the Student PDF.

## Deferred Work

This design does not add an LLM API, ChatGPT schedule, Supabase service credentials, storage upload, queue mutation, feedback-driven Week 2, or production curriculum breadth. Those integrate only after this local pipeline is proven and retain the queue rules in `docs/generation-workflow.md`.
