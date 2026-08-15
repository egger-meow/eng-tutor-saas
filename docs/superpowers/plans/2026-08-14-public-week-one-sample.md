# Public Week 1 Sample Implementation Plan

> **For agentic workers:** Execute inline in the current workspace; do not use TDD unless explicitly requested.

**Goal:** Replace the landing-page sample with a reproducible, high-quality Week 1 packet for a fictional Minecraft-loving learner, and document the production-payment release gap discovered during the review.

**Architecture:** Keep the public sample independent of Supabase and local Docker by adding a versioned curriculum fixture. Generate the public PDFs deterministically from that fixture, then use one shared content record to make the profile-to-material decisions visible in the public UI.

**Tech Stack:** TypeScript, Zod curriculum contract, Playwright PDF renderer, React/Vite, Vitest.

## Global Constraints

- No real child information may enter Git.
- Public packets are A4, printable, self-study friendly, and use separate student/parent projections.
- The public sample represents a fictional Week 1 calibration packet.
- Preserve `VITE_BASE_PATH=/eng-tutor-saas/` and the existing public sample filenames.
- Keep Paddle in sandbox; do not enable live payments in this change.

---

### Task 1: Define a reproducible fictional Week 1 curriculum packet

**Files:**

- Create: `packages/generator/src/fixtures/public-week-1-sample.ts`
- Modify: `packages/generator/src/index.ts`
- Modify: `packages/pdf/src/generate-public-sample.ts`

- [ ] Define a contract-valid, fictional Grade 7 Week 1 packet with Minecraft-building interests, reading detail/inference calibration, controlled vocabulary, `do`/`does` instruction, retrieval homework, complete answers, parent observations, and explicit personalization rationale.
- [ ] Export it as `publicWeekOneSample` and render its student and parent PDFs into the stable `apps/web/public/samples/` filenames.
- [ ] Run generator and PDF integrity tests plus the public-sample generation command.

### Task 2: Make the public profile and rationale match the packet

**Files:**

- Modify: `apps/web/src/content/sample-child.ts`
- Modify: `apps/web/src/routes/SamplePage.tsx`

- [ ] Replace the legacy profile text with the fictional learner's initial onboarding input and concise sample disclaimer.
- [ ] State the visible input-to-decision mapping: Minecraft building shapes the reading context; reading/detail evidence is calibrated; `do`/`does` is taught through construction actions; homework is intentionally light for Week 1.
- [ ] Add a focused content test if the existing web test convention supports it; otherwise rely on lint, typecheck, and production build.

### Task 3: Verify, assess release gaps, and deliver safely

**Files:**

- Modify: `docs/launch-readiness.md`

- [ ] Record that the current checkout Edge Function hard-codes Paddle sandbox and enumerate the required live-mode environment separation, live products/price IDs, webhook, website approval, legal pages, and end-to-end paid/cancel verification.
- [ ] Render the generated PDF pair and inspect every page visually for clipping, spacing, readable Chinese/English, headers, and answer separation.
- [ ] Run the focused tests, lint, typecheck, and production build. Commit and push only files authored for this work; preserve the user's pre-existing modified generator prompt files.
