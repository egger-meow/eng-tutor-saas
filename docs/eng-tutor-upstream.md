# eng-tutor Upstream Policy

## Role

[`egger-meow/eng-tutor`](https://github.com/egger-meow/eng-tutor) is a research and validation source. Its weekly materials, prompts, curriculum tables, scripts, and student-specific notes are not production dependencies of this service.

The observed upstream default branch is `student/Jonathan`, which reinforces that it contains student-oriented working data. Never copy personal notes or learner records into this repository.

## Intake Process

1. Review a specific upstream technique or rule.
2. Separate the reusable principle from student-specific content.
3. Validate it against this product's CAP alignment, privacy model, and packet contract.
4. Port the smallest useful rule into `docs/product-rules.md` or a versioned generator asset.
5. Record the source commit, rationale, adaptation, reviewer, and date below.

## Change Log

| Date | Upstream commit | Area | Adaptation | Status |
| --- | --- | --- | --- | --- |
| 2026-08-12 | Initial repository review | Workflow | Adopted paper-first weekly continuity as a product principle; no files or student data copied | Accepted |

There is no automated sync. Production generation must continue working if the upstream repository is unavailable or changes structure.
