# Generation and PDF Pipeline Implementation Plan

> **For agentic workers:** Execute the tasks in order. Keep each task independently verifiable and commit each coherent change.

**Goal:** Produce validated, deterministic Student and Parent Answer A4 PDFs for a committed synthetic weekly lesson.

**Architecture:** A strict Zod schema and cross-document validator in `@paper-english/generator` define the canonical lesson contract. `@paper-english/pdf` renders two escaped HTML projections with Playwright Chromium, verifies the pair, and publishes both artifacts atomically through a small CLI.

**Tech Stack:** Node.js 24+, TypeScript 6, Zod 4, Playwright Chromium 1.61, Vitest 4, Poppler/Python PDF inspection.

## Global Constraints

- ChatGPT Work will eventually generate canonical JSON; no LLM API belongs in this repository slice.
- Student and Parent outputs must derive from the same validated source.
- Student output must contain no answers or parent-only guidance.
- Core vocabulary count is 7-15 and every answerable question has exactly one matching answer.
- Both PDFs are black-and-white, printer-friendly A4 artifacts; no Supabase writes occur in this slice.
- Follow the repository preference: implement directly, then run focused tests; do not use TDD.

---

### Task 1: Canonical Lesson Contract and Validator

**Files:**
- Modify: `packages/generator/package.json`
- Replace: `packages/generator/src/index.ts`
- Create: `packages/generator/src/lesson-schema.ts`
- Create: `packages/generator/src/validate-lesson.ts`
- Modify: `packages/generator/src/contracts.test.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produce `WeeklyLessonSchema`, `WeeklyLesson`, `LessonValidationIssue`, `parseWeeklyLesson(input: unknown): WeeklyLesson`, and `validateWeeklyLesson(input: unknown): { success: true; lesson: WeeklyLesson } | { success: false; issues: LessonValidationIssue[] }`.
- Use stable string IDs for `metadata.jobId`, `metadata.childId`, and every `questionId`.

- [ ] Add Zod 4 to the generator package and install workspace dependencies.
- [ ] Define strict schemas for metadata, personalization, objectives, 7-15 vocabulary items, reading, grammar, exercise groups/questions, homework, answers, and parent guidance.
- [ ] Add cross-field validation for unique question IDs and the exact equality of question-ID and answer-ID sets; return issues with stable paths and readable messages.
- [ ] Export the public contract from `index.ts`, removing the obsolete Markdown-based `GeneratedLesson` interface.
- [ ] Extend `contracts.test.ts` with valid parsing, unknown-key rejection, vocabulary bounds, duplicate IDs, missing answers, and extra answers.
- [ ] Run `pnpm test -- packages/generator/src/contracts.test.ts` and `pnpm --filter @paper-english/generator typecheck`.
- [ ] Commit as `feat: define canonical lesson schema`.

### Task 2: Safe Student and Parent HTML Projections

**Files:**
- Modify: `packages/pdf/package.json`
- Replace: `packages/pdf/src/index.ts`
- Create: `packages/pdf/src/escape-html.ts`
- Create: `packages/pdf/src/styles.ts`
- Create: `packages/pdf/src/render-html.ts`
- Modify: `packages/pdf/src/index.test.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consume `WeeklyLesson` from `@paper-english/generator`.
- Produce `renderStudentHtml(lesson: WeeklyLesson): string`, `renderParentAnswerHtml(lesson: WeeklyLesson): string`, and `artifactFilename(lesson, kind)`.

- [ ] Add the generator workspace dependency to the PDF package.
- [ ] Implement one HTML-escaping helper used for every data-derived value and add shared A4 print CSS with grayscale colors, 14 mm margins, page-break guards, hierarchy, writing space, and page counters.
- [ ] Render Student HTML with metadata, objectives, vocabulary, reading, grammar, exercises, and homework only.
- [ ] Render Parent Answer HTML with lesson identity, personalization summary, every question followed by its matching answer/explanation, and parent guidance.
- [ ] Add tests for deterministic filenames, required headings and IDs, HTML escaping, answer coverage in Parent HTML, and absence of answer text/parent guidance from Student HTML.
- [ ] Run `pnpm test -- packages/pdf/src/index.test.ts` and typecheck both packages.
- [ ] Commit as `feat: render lesson HTML projections`.

### Task 3: Chromium PDF Renderer and Atomic Pair Publication

**Files:**
- Modify: `packages/pdf/package.json`
- Create: `packages/pdf/src/render-pdf.ts`
- Create: `packages/pdf/src/render-pair.ts`
- Modify: `packages/pdf/src/index.ts`
- Create: `packages/pdf/src/render-pair.test.ts`
- Modify: `.gitignore`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produce `renderPdf(html: string): Promise<Uint8Array>` and `renderLessonPdfPair(lesson: WeeklyLesson, outputDir: string): Promise<{ studentPath: string; parentAnswerPath: string }>`.

- [ ] Add `playwright` 1.61 and a `pdf:install` script that installs Chromium only.
- [ ] Launch headless Chromium, call `page.setContent`, await `document.fonts.ready`, emulate print media, and call `page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })`; always close the browser in `finally`.
- [ ] Validate each byte array starts with `%PDF` and is non-empty, write both to a temporary directory, then rename both to stable final paths only after the pair succeeds; clean temporary files on failure.
- [ ] Ignore `output/` and `tmp/pdfs/` while retaining the repository-wide private-PDF guard.
- [ ] Add focused tests using an injected renderer for success, invalid PDF bytes, second-render failure, and no partial final artifacts.
- [ ] Run the PDF tests and `pnpm -r typecheck`.
- [ ] Commit as `feat: add atomic PDF rendering`.

### Task 4: Synthetic Vertical Slice and Operational Documentation

**Files:**
- Create: `packages/generator/src/fixtures/synthetic-week-1.ts`
- Create: `packages/generator/src/generate-synthetic.ts`
- Modify: `packages/generator/package.json`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/generation-workflow.md`

**Interfaces:**
- Produce root command `pnpm generate:synthetic`, which validates the fixture and writes `output/pdf/synthetic-week-1-student.pdf` and `output/pdf/synthetic-week-1-parent-answer.pdf`.

- [ ] Create a realistic, non-identifying Grade 7 Week 1 fixture with 7-15 core words, reading, grammar, CAP-style questions, homework, complete answers, and visible personalization rationale.
- [ ] Implement a CLI that validates before rendering, prints artifact paths and sizes on success, and exits non-zero with structured issues on validation/rendering failure.
- [ ] Document browser installation, generation, outputs, troubleshooting, and the boundary between this command and the future ChatGPT Work schedule.
- [ ] Run `pnpm generate:synthetic`; verify both files with `pdfinfo` and text extraction, then render every page with `pdftoppm -png` into `tmp/pdfs/`.
- [ ] Visually inspect all rendered pages for clipping, overlaps, blank pages, broken glyphs, hierarchy, writing space, headers, footers, and page numbers; correct templates until no defects remain.
- [ ] Confirm extracted Student text excludes every answer-only value and parent guidance, while Parent text includes all question IDs and answers.
- [ ] Run final gates: `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build`, and `git diff --check`.
- [ ] Commit as `feat: generate synthetic weekly PDF pair` and push `main`.

## Plan Self-Review

- Every design requirement maps to Tasks 1-4; Supabase/job scheduling is explicitly deferred.
- Public types flow consistently from generator schema to HTML projection to PDF pair and CLI.
- Failure atomicity is tested without requiring Chromium; the final vertical slice proves the real browser path.
- No placeholders or unstated production credentials are required.
