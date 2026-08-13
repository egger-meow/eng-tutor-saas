# Curriculum Prompts 2.0.1

Run prompts in order: `01-plan`, `02-author`, `03-critic`, then `04-repair` only for failed sections. The release contract is documented in `docs/curriculum-quality-rubric.md`. The worker supplies validated child context and curriculum references separately. Never include secrets, raw PDFs, irrelevant history, or another child's data.

The author may not mark its own work publishable. Deterministic validation runs before and after critique. Any unresolved critical finding blocks rendering. Prompt and rubric changes require a version bump plus the regression corpus.
