# 紙屬英文 Product Specification

## 1. Product Contract

紙屬英文 is a Taiwan-focused junior-high English service that delivers one personalized, printable learning packet each week. AI operates behind the scenes; the learner experience is paper-first, calm, and free of chatbot or gamification pressure.

The service helps students build CAP-aligned reading, vocabulary, grammar, and mistake-analysis habits. It does not promise score guarantees or replace teachers.

## 2. Users and Ownership

The paying and authenticated user is a parent. A parent may manage multiple children, but every child has an independent:

- learning profile and grade;
- syllabus position and preferences;
- material and feedback history;
- generation schedule and job history;
- subscription entitlement.

Data must never leak between families or between siblings. The parent observes progress and submits lightweight feedback; the child primarily works on printed material.

## 3. Weekly Experience

Each active child receives two private PDFs:

1. A student packet containing guided reading, vocabulary, grammar, questions, and reflection prompts.
2. A parent answer packet containing answers, explanations, and suggested observation points.

The intended loop is:

1. Read before looking up answers.
2. Mark unknown words and confusing sentences.
3. Answer independently.
4. Check answers and classify mistakes.
5. Ask AI or an adult for explanations, not direct completion.
6. Parent submits short feedback after use.

Feedback changes future packets only. A completed packet is immutable and reproducible from its recorded inputs and rule version.

## 4. MVP Scope

The MVP includes:

- email OTP or magic-link parent authentication;
- child profile creation and management;
- one independent subscription per child;
- weekly material scheduling and private PDF download;
- parent feedback after a packet is used;
- generation job status and operator recovery;
- a static learning-method guide;
- responsive parent-facing web pages;
- beta capacity controls and basic operational visibility.

Pricing intent is NT$499 per child per month. Launch experiments may include Week 1 free, a first paid month at NT$299, and a founding-member offer for the first 30 customers. Billing-provider behavior and Taiwan availability must be revalidated before implementation.

## 5. Generation Contract

Supabase stores due work in `generation_jobs`. A future ChatGPT Work scheduled task runs daily, reads the versioned repository instructions, claims due jobs, reads the child's allowed context, generates both PDFs, uploads them to private Storage, and records success or failure.

The worker processes at most `daily_generation_limit` jobs per run. The value is stored in operational settings and defaults to `15`. Unclaimed jobs remain queued. Every job has an idempotency key, bounded retry state, timestamps, rule version, and actionable error details.

GitHub Actions must not generate lessons or attempt to trigger ChatGPT Work. It is limited to validation and deployment. The schedule is created only after the repository and Supabase environment are operational. See `docs/generation-workflow.md`.

## 6. Curriculum Contract

Materials follow Taiwan junior-high and CAP expectations while adapting difficulty, topic, vocabulary load, grammar focus, and scaffolding to the child. Production rules are versioned in this repository. `egger-meow/eng-tutor` is research upstream only: validated ideas are deliberately ported and recorded; production never depends on it at runtime.

Detailed constraints live in `docs/product-rules.md`.

## 7. Privacy and Security

- Never store credentials, real child data, or private generated PDFs in Git.
- Browser code receives only the Supabase URL and publishable key.
- Worker secrets remain in the authorized ChatGPT Work/Supabase environment.
- Exposed tables use explicit grants and row-level security.
- Parent ownership is checked for every child, feedback, material, and subscription operation.
- Generated files use private buckets and short-lived signed downloads.
- Logs identify records by opaque IDs and avoid lesson content or personal details.

## 8. Non-goals

The MVP does not include a student social network, native mobile apps, real-time tutoring chat, gamification, teacher dashboards, automated school integrations, or a general-purpose AI assistant. It also does not automate upstream syncing or lesson generation through GitHub Actions.

## 9. Definition of Done

The beta is ready when:

- a parent can authenticate and manage two children without state mixing;
- each child can hold an independent entitlement and weekly schedule;
- due work is created once, claimed safely, retried, and audited;
- both private PDFs can be associated with a completed job and downloaded only by the owning parent;
- Week 2 visibly incorporates permitted Week 1 history, feedback, and preferences;
- production rules and input versions make a packet traceable;
- lint, tests, type-check, build, migrations, RLS checks, and deployment checks are reproducible;
- operators can change the daily limit, inspect backlog/failures, and manually recover work.

## 10. Supporting Documents

- `docs/architecture.md` — system boundaries and deployment
- `docs/data-model.md` — records, ownership, and state
- `docs/generation-workflow.md` — future scheduled-worker runbook
- `docs/product-rules.md` — curriculum and packet constraints
- `docs/eng-tutor-upstream.md` — controlled upstream intake
- `docs/roadmap.md` — phased delivery and open decisions
