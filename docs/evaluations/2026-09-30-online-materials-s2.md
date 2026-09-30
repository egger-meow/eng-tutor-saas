# S2 submission boundary verification

All UI fixtures are synthetic. No learner records or credentials are stored here.

Changes: enforce whole-packet submission before feedback for new materials at
the shared feedback-write trigger, including the legacy RPC and direct owner
writes. Legacy requests require released materials and return idempotently
before quota checks. Single-choice grading accepts only an unambiguous option;
duplicate/out-of-range/conflicting keys remain ungraded. After submission,
canonical answers are visible for unanswered and open items as well. Unanswered
items remain unanswered. Reader locks answer controls, displays the immutable
submission snapshot, and retains reading and device speech controls.

Historical paper fixtures explicitly retain legacy feedback behavior. The local
9/19 migration filename was aligned to the verified production version
20260919134227; production migration history was not repaired or rewritten.

Verification so far:

- 14 SQL suites pass, including new legacy/direct-write gate regressions.
- Reader tests: 9 pass. Full Vitest run: 181 suites pass; two failures were stale
  references to the renamed migration and have been updated for re-verification.
- Browser fixture: phone 390x844, tablet 820x1180, desktop 1440x1000 pass slow
  in-flight autosave, two-tab conflict resolution, offline recovery, submission,
  answer reveal, locked inputs with enabled TTS controls, skip without fake
  feedback, quota message, next request/reload and horizontal overflow checks.
  RPCs are mocked in this browser suite; real SQL is verified separately.
  Screenshots are in ignored `.runtime/online-materials/`.
- These are emulated viewports, not physical phone/tablet acceptance. Audio
  output quality and virtual keyboard behavior remain unverified on real devices.
- Fresh GitHub remote main was 840ea882e654aed1969f10c9db06eaa163efa731.
- Production dry-run lists the S1 projection, S1 draft hardening, S2 submission,
  and S2 boundary migrations. Deployment read-back will be recorded below.
