# Online materials: strict UI/UX acceptance

Date: 2026-10-01. Continuation of the overall layout review. Acceptance remains conditional; passing browser automation is not physical-device or real-family learning-loop acceptance.

## Confirmed findings repaired

1. At 200% root text size, the 20rem document minimum grew to 640px. Use a fixed 320px minimum, allow the compact header to wrap, constrain legal-content grid items and wrap long contact addresses. Fix the onboarding action specificity that preserved a 9rem minimum on small phones.
2. Compact menus were visually collapsed but their links remained keyboard reachable. Closed menus now use visibility:hidden. Escape closes either menu and returns focus to its toggle; aria-controls connects the controls. Open menus and focused header controls remain on screen. Active parent links use aria-current.
3. Self-check rendered duplicate checkbox semantics and unnamed native inputs. It now uses one named native checkbox inside a clickable label, with keyboard Space support and read-only locking.
4. Onboarding secondary inputs lacked accessible names, and radio roles lacked arrow-key navigation. Name the fields, support roving keyboard selection, and expose selected minute/textbook states. Keyboard level exploration does not auto-advance the public questionnaire.
5. Reader feedback showed optional typing immediately. Put comments inside an initially collapsed native details element; existing comments and other feedback fields are preserved. Reader and profile form headings now have an appropriate page/section hierarchy. Reader text inputs respect enlarged root text while retaining a 16px minimum.
6. A historical production organizer had row labels but no response-unit IDs, making it impossible to answer online. Keep the original table and add a question-level written response with the immutable question ID. The existing submission RPC reads that ID before response-unit aggregation; no canonical content, grading or schema changes are needed.
7. The authenticated production dashboard showed internal skill IDs, Schema versions and internal rationale. Extend the existing parent-facing filter and apply it to timeline prose. Show three personalization notes initially, with the remainder available on demand. Use a unique summary heading ID for each child. Do not mutate stored summaries.
8. Actual child overview displayed the enum “developing”. Reuse the onboarding label “基礎正在建立”. Billing and onboarding descriptions now explain the user-facing flow and separate submission, optional feedback and an explicit next request.

## Verification evidence

- Full workspace tests: 188 files / 1,634 tests passed. Two meaningful regressions cover legacy structured-response compatibility and withholding internal timeline notes while retaining useful learning text.
- Workspace typecheck, lint and build passed. Lint retains three pre-existing Fast Refresh warnings. Later heading/copy/profile edits passed focused tests and web type checking; production CI validates the final committed source.
- Reader browser suite: 320, 390, 820 and 1440 CSS pixel widths passed. It exercises load failure, autosave, keyboard answering, conflicts, offline/back/forward guards, fresh PDF authorization, submission locking, optional feedback, rejected next requests and successful retry. All service responses are synthetic.
- Public demo browser suite: phone/tablet/desktop passed; local-only answering, reload recovery, partial submission, results and locked controls remain intact.
- `scripts/accept-uiux-browser.mjs`: 48 route/step/viewport scenarios at 320×900, 390×844, 844×390 and 1280×900, with reduced motion and 200% root text. Checks menu Escape/focus, closed-menu visibility, field names, keyboard grade choice, native checkbox toggling, legacy typing and document reflow. These are focused checks, not a complete WCAG audit or screen-reader certification.
- The existing layout script produced 44 normal-size page/viewport measurements plus profile-step screenshots, all without document overflow or uncaught page errors. Public pages are actual local route components; parent dashboard/billing/form use labelled synthetic responses.
- Screenshots and machine-readable results remain git-ignored in `.runtime/uiux-acceptance/{before,after}/`, `.runtime/layout-review/acceptance/` and `.runtime/layout-review/after/`. Actual screenshots were visually inspected, including large text on small phones, mobile legal pages, profile steps and reader practice.
- Existing signed-in Edge production session: read-only dashboard → current material → billing → child records inspected. The live organizer and internal dashboard prose reproduced findings 6–8. A 390 CSS pixel viewport was verified against innerWidth; the user's existing browser zoom required scaling the temporary physical viewport. No real answers/profile fields were changed; no packet was submitted, next packet requested, terms accepted, subscription changed or checkout performed. Real names/IDs and authenticated screenshots are not committed.

## Acceptance gates still open

| Gate | Status / reason |
|---|---|
| Service terms match the current learning flow | NOT ACCEPTED: PDF/Paper-First and fixed-weekly wording remain. Concrete proposed wording and consent-version impact are in `2026-10-01-service-description-review.md`; scope decision requested. |
| Physical phone/tablet keyboard, speech output and home printing | NOT VERIFIED: desktop-browser responsive emulation cannot establish those outcomes. |
| Real-family submit → optional feedback → next packet → actual second-packet usage | NOT VERIFIED: live checks were read-only; synthetic RPCs do not establish the production write/generation loop. |
| Production personalization / missing-object reconstruction / retention scheduler execution | NOT REVERIFIED in this UI task. Source and UI tests do not establish those separate operational gates. |
| Complete screen-reader accessibility conformance | NOT VERIFIED: focused keyboard/DOM checks are not a screen-reader audit. |

## Delivery

Source commit, CI deployment and post-deploy public/authenticated readback will be recorded after delivery. No migrations, Edge Functions or generation-release versions changed in this task.
