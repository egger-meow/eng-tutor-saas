# Learning-flow UI/UX acceptance — 2026-11-14

An authorized internal test child was used on the production site for dashboard entry, choice/text/structured responses, autosave, pause and return, draft restoration, conflict handling, PDF switching and downloads, cancel/confirm submission, optional feedback, explicit next-packet request, and post-submission dashboard state. Test answers and screenshots remain private in git-ignored output; they are not evidence of actual student learning. Email delivery was explicitly excluded by the user.

## Repairs

- Repeated same-hash entry links notify the mounted auth panel even when the URL does not change.
- Cross-route login positioning follows initial layout/font changes until the user's first interaction; it then releases scroll control.
- Submission confirmation counts nonempty structured response units once per question, matching server statuses.
- Unsaved-work navigation blocking now explains why the action was stopped, with a visible accessible notice that clears after saving.
- Structured written responses use multiline editing and wrapping read-only output after submission.
- Chapter offsets reserve space for the site header; resume prompts display visible question numbers rather than internal IDs.
- Feedback-page heading spacing, parent navigation target heights, and canceled-subscription/Beta wording were clarified.

No historical canonical packet, PDF object, generator version, migration, Edge Function, billing entitlement, scheduling code or existing job was changed.

## Verification

- Full local suite: 211 files, 1,801 tests passed. A first sandboxed run could not access browser executables or local HTTP; rerunning with the existing normal environment passed.
- `scripts/test-landing-auth-browser.mjs`: desktop/mobile fresh header entry, repeated same-hash switching, reload, inline switching, cross-route entry, history navigation, and release of automatic scrolling after user scroll. Added to CI.
- `scripts/test-online-materials-browser.mjs`: four viewport sizes; includes structured-count confirmation and blocked-navigation feedback regressions.
- Existing public-demo and large-text/keyboard acceptance scripts were executed separately using synthetic fixtures. Such tests do not establish production ownership, device acceptance, or learner outcomes.
- Production student-PDF download hashes matched before and after the test submission. Both student and parent outputs were downloaded and rasterized for visual review.
- Production submission, feedback and next-request readback were observed; another packet's generation/completion is outside this evidence.

## Open findings

- Historical printable structured response rows are too short for complete handwritten sentences, expose response-unit identifiers, and use different question labels from the online view.
- A self-check section occupies a mostly empty printed page. These renderer changes require a separate scoped follow-up that preserves historical material immutability and verifies both PDF variants.
- This internal account had an existing future test job before the explicit request, and another pending job after the request. Investigate scheduling provenance and duplicate preparation before treating this as representative of real-family operation; no jobs were removed or reset.
- `/children/:id/materials` currently presents the child profile rather than a dedicated history surface. The dashboard remains the functioning history entry, but route/navigation semantics need reconciliation.
- Long mobile lesson navigation and adult-oriented section naming remain usability improvements, not proven data-loss bugs.

Physical mobile keyboards, actual audio output, screen-reader conformance, home paper printing, and real middle-school participant research remain unverified. Browser viewport emulation is labeled as such. Deployment is verified separately by CI jobs and production readback, not inferred from a push.
