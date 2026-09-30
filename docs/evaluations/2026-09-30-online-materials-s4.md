# S4 student and parent UI — 2026-09-30

Scope: improve the existing authenticated learning flow and student projection
renderer. No new student account, pen-stroke storage, paid speech service,
generation release, database migration or Edge deployment is introduced.

Implemented:

- Dashboard/history primary entry is “查看／繼續本週教材”, with authorized
  ready/draft/submitted/next-requested progress and a retryable uncertain state.
  Generating/prepared states and the single next-delivery horizon remain intact.
  Unreleased packets have no feedback CTA. Sibling panel heading IDs are unique.
- Reader submission load errors lock answer editing and submission until retry.
  Submitted toolbars describe the immutable submission rather than a draft.
  Results link back to question prompts; ungraded and unanswered meanings are
  explicit. Reading and device speech remain enabled after submission.
- Pending saves/conflicts block in-app navigation and PDF switching; document
  exits use the browser unsaved-work warning. Hook cleanup flushes pending saves
  as a best effort on an in-app browser-history exit. This does not guarantee
  recovery if the browser/process is terminated or offline work is abandoned.
- Direct feedback pages resolve one owned released packet independently of
  paginated history, with retry and material/dashboard return paths. Existing
  interactive feedback edits save only feedback. The next request is independent;
  historical paper feedback retains its established request behavior.
- Optional reader feedback loads existing observations before enabling editing,
  preserving prior mistake and child-comment fields. Skip writes no feedback.
- Structured table/organizer/sequence responses retain stable response IDs and
  accessible input labels. Unknown projected formats retain prose and a written
  fallback. No canonical source is queried. Internal/answer fields are excluded
  from generic fallback presentation as defense in depth.
- Phone toolbar stays in document flow; focused tablet inputs release sticky
  positioning. Input font is 16px; speech/buttons have 44px targets, visible focus,
  wrapping and reduced-motion support. Printable student output stays blank;
  parent answer PDF compatibility remains pending the S5 output-interface work.
- Device speech exposes English voice selection, stop/error/unsupported states,
  shared speaking state across sections, stale callback invalidation and long-text
  chunks. Speech tests mock the device engine; no real audio claim is made.
  API reference: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
- Scoped email links explain that online answering requires the owning parent
  account; existing matching-owner redirect and narrow token access are preserved.

Verification:

- Focused renderer/route tests: 25 cases passed. Full regression: 184 files /
  1,621 tests passed; log `.runtime/online-materials-s4-vitest.log`.
- Typecheck and complete build passed. Lint has no errors; the three pre-existing
  Fast Refresh warnings remain.
- `node scripts/test-online-materials-browser.mjs`: phone 390×844, tablet
  820×1180, desktop 1440×1000 synthetic browser fixtures passed. Coverage includes
  submission-read failure/retry, progress retry, speech switching, structured and
  unknown responses, slow/in-flight saves, pending-navigation guard, two tabs,
  offline restoration, whole submission, locked answers with enabled speech,
  skip/no fabricated feedback, quota limit, explicit next request, reload,
  existing feedback preservation and no next request on feedback save.
- The harness now imports the production `index.css` and `App.css`; the previous
  S2 harness had omitted base styles/tokens. Styled screenshots were inspected.
  Local screenshots: `.runtime/online-materials/{phone,tablet,desktop}.png`.

Acceptance still pending: physical phone/tablet keyboard and real device audio,
authenticated production learning loop, and the S3 next-packet pedagogical
explanation. Viewport simulation and mocked speech/RPCs do not satisfy those
gates. S5–S7 remain separate stages.

Production delivery read-back:

- Source `23540c743052e0c079a8f05aa5ce9fdb5402ad4e` pushed to main.
- GitHub CI run `36704974064`: `verify` and `deploy-production` both success.
  https://github.com/egger-meow/eng-tutor-saas/actions/runs/36704974064
- Public homepage and `/assets/index-B_uZ3GVA.js` both return HTTP 200. The
  served asset contains the new primary entry, submission retry, unknown-format
  fallback, optional-feedback preservation, speech failure and navigation guard.
  This confirms deployed client code, not an authenticated learning-loop test.
- Local read-only metadata confirms feedback RLS, authenticated feedback SELECT,
  owned released-material lookup and the exact feedback-save RPC execution grant.
- No migration or Edge Function changed in S4, so no additional Supabase
  deployment is required. No real learner records were used for acceptance.
