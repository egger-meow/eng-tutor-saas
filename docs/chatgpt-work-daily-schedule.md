# ChatGPT Work Daily Generation Schedule

This is the operational contract for the future daily ChatGPT Work schedule. The schedule reads this repository at run time and must use the current `main` commit. It must not invent a second queue, write PDFs itself, or call the legacy `complete` command for a new delivery.

## Daily procedure

1. Read `AGENTS.md`, `docs/SPEC.md`, `docs/product-rules.md`, `docs/generation-workflow.md`, and the current `packages/generator/prompts/2.0.0/` bundle.
2. Run `pnpm worker claim --worker chatgpt-work-daily` with server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
3. For every claimed job, run `pnpm worker prompt-v2 --worker chatgpt-work-daily --job <job-id>` and treat its output as the sole generation context. Do not load another child's data or every historical PDF.
4. Produce one JSON file conforming to `CurriculumPackageSchema`. Run plan, author, deterministic validation, independent critic, and targeted repair in that order. A generic or placeholder answer is a failure.
5. Save the package as a temporary local file and run `pnpm audit:curriculum <package-file>`. A critical finding blocks completion.
6. Run `pnpm worker complete-v2 --worker chatgpt-work-daily --job <job-id> --package <package-file>`. Never run `complete` for a new v2 job.
7. Record the job result and observation-write result. Continue other jobs after one failure; do not silently retry a critical-quality failure.

## Quality obligations

- Student PDF must be self-study-first: Traditional Chinese instructions, worked examples, gradual release, genuine reading, CAP transfer, writing space, and retrieval practice.
- Parent PDF must primarily be answers, reasoning, likely misconceptions, follow-up checks, and a compact explanation of what changed.
- Interests personalize the reading vehicle; learning state, school progress, mistakes, feedback, and quality trends determine what is taught next.
- `trackingDelta` is a hypothesis record, never proof of mastery.
- Repeated quality trends are evidence for a reviewed prompt/rubric change. Do not mutate production prompts during the daily run.
- If `feedback_missing` is true, continue from existing state without assuming the child completed the previous packet successfully.

## End-of-run report

Report claimed, completed, mandatory overflow, waiting-for-feedback, failed, deferred, observation-write failures, oldest deadline, and the commit SHA used. Include job IDs and sanitized failure paths; never include secrets, raw child data, or full prompt transcripts in chat.

## Activation gate

Enable this schedule only after one hosted staging job has completed through `complete-v2`, private Student/Parent downloads have been ownership-tested, feedback has appeared in the next context, and the resulting PDFs have been inspected page by page.
