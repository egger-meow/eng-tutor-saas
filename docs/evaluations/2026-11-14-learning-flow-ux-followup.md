# Learning-flow UX follow-up — 2026-11-14

## Delivered web changes

- `/children/:id/materials` now displays that owned child's released materials using the existing history, download, progress and feedback components. It includes the latest packet, preserves pagination, excludes future packets and never falls back to another child for an unavailable ID. Dashboard and profile pages link to this surface.
- History pagination failures retain the loaded materials and expose a recoverable error rather than an unhandled rejection.
- The reader's optional feedback explicitly asks for completion including paper work. Without an existing value, saving requires a parent choice; online response counts are shown separately. Existing parent values and optional details are preserved. The dashboard feedback form explains the source of its online-derived suggested option.
- A compact chapter selector remains available after the main toolbar scrolls away. It disappears while typing and in the submission/feedback area, preserves keyboard focus on the destination, and uses existing reduced-motion-aware chapter jumps.
- Student-facing instruction/stage names use simpler language; the three learning stages no longer repeat their numbers.

## Verification

- Web unit suite: 75 files / 430 tests passed; TypeScript, web build and focused lint passed (existing Fast Refresh warnings remain).
- Four-viewport synthetic online regression covers submission, optional feedback choice/preservation, no extra requests from saving feedback, and quick chapter navigation. Synthetic transport tests do not establish production delivery or physical-device behavior.
- Local browser with authorized internal production data: 320, 390 and 1440 px history, chapter jumps, feedback and existing completion preservation. Invalid child IDs show no sibling history. Injected history failure recovered through retry. No page errors or horizontal overflow were observed. No additional production submission, feedback save or next-packet request was made during this follow-up.
- Private screenshots and JSON evidence: `output/pax-ux-followup-2026-11-14/`. Deployment acceptance is recorded there separately after CI and production readback.

## Printable layout candidate — not activated

`scripts/preview-print-layout.mts` creates local before/after PDFs from an explicitly supplied canonical JSON. It performs no database access, upload, queue operation or canonical edit, and is not called by any production renderer/publisher.

The inspected packet's candidate uses 26 mm structured writing cells (previously about 12 mm), removes internal response-unit badges, labels practice/homework questions consistently with the web numbering, and removes redundant self-check spacing. It preserves question prose, all handwriting lines, base font sizes and line pitch. Student output is eight pages rather than nine; parent output remains four pages. Both variants pass PDF bounds/text checks and were rasterized for visual review. This is evidence for this packet, not a universal pagination guarantee.

Private artifacts: `output/pdf/print-ux-preview/`. Existing published PDFs remain unchanged. Activation requires the independent renderer release/compatibility process in `docs/production-release-policy.md`; this follow-up does not change the desired/active generation manifest or claim a production PDF release.

## Internal scheduling finding

Production readback identified two distinct pending jobs: an automatic date-keyed internal-test cadence job and a later explicit source-material request. The deployed `require_feedback_request_for_followup_job()` intentionally permits internal-test cadence jobs without a parent request, while suppressing that legacy cadence insert for normal children. This explains coexistence in the internal test account; it is not evidence that ordinary families receive duplicate requested packets. No jobs were canceled, relabeled or reset. A policy change to internal-test scheduling remains separate from this UI patch.

Physical mobile devices, software keyboard behavior, screen-reader conformance, actual paper printing and real student participant research remain outside this evidence.

