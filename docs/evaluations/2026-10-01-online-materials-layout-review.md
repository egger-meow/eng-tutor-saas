# Online materials: overall layout review and repairs

Date: 2026-10-01. Scope: the prior three source-review findings plus responsive layout inspection and repairs. No generation, grading, quota, publication, database or Edge Function contracts changed.

## Repairs

- Browser Back/Forward now uses the same pending-save guard as internal navigation. Managed history traversals return to the original entry without unmounting the reader. Older or native hash entries preserve the mounted draft and restore its URL. URL token scrubbing preserves route history metadata and updates the routing snapshot.
- Next-material rejections keep the request action available. Only authoritative success marks the packet as requested. Monthly-limit and temporary rejections can be retried without reloading or re-entering feedback.
- Reader downloads request a fresh authorized PDF URL through the existing recovery/download helper, show preparation/failure messages, and record the existing download signal. Switching to the printable preview reloads its URL.
- Immediate answer/self-check saves read the new state synchronously; conflict resolution cancels an outstanding debounce.
- Navigation switches to a compact menu before labels become crowded. Desktop parent labels remain on one line; the email is truncated. Open parent menus scroll within the viewport. New-child navigation points to child records and has stable unique item keys.
- The mobile landing shortcuts wrap visibly; narrow pricing and founder-offer content no longer clips. Reader chapter buttons wrap. Mobile question layers use less padding, question numbers stay on one line, and structured tables retain usable input widths with their own horizontal scroll. The reader toolbar clears the parent header.
- The sample introduction uses less empty space and has one main landmark. Printable mode controls wrap on narrow screens.
- Pricing/subscription descriptions explicitly separate immutable submission, optional parent feedback and the next-material request; no copy implies feedback automatically requests another packet.

## Local evidence

- `pnpm test`: 188 files, 1,632 tests passed. Generated CAP timestamp changes were inspected and restored.
- `pnpm typecheck`, `pnpm build`: passed. `pnpm lint`: no errors, three existing Fast Refresh warnings.
- Existing focused navigation, onboarding, billing and pricing tests were run after the final small corrections.
- `node scripts/test-online-materials-browser.mjs`: passed at 320, 390, 820 and 1,440px. Synthetic RPC coverage includes pending saves, concurrent tabs, conflict resolution, offline Back/Forward restoration, a fresh reader download despite an expired URL prop, generic/monthly-limit rejection retries, immutable submission, optional feedback and bounded analytics payloads.
- `node scripts/test-public-demo-browser.mjs`: passed at phone/tablet/desktop sizes; local answers remain isolated from learner APIs.
- `node scripts/review-layout-browser.mjs after`: screenshot inspection of public landing/sample/guide/about/legal/waitlist pages, a synthetic dashboard using the real child-card components, all three profile form steps and the real subscription page with synthetic service responses. Widths: 320, 390, 820, 1,440px. Measurements assert no document-level horizontal overflow and no uncaught page errors. Structured tables intentionally scroll inside their wrappers.

Screenshot evidence is local and ignored under `.runtime/layout-review/before/` and `.runtime/layout-review/after/`; the review script is committed for reproducibility. Browser viewports and speech stubs do not prove physical-device keyboard/TTS/printing behavior. Synthetic dashboard data does not prove real-account end-to-end behavior or production personalization.

## Production delivery

- Source commit `68758607327593e60671dd639b5aecdeb1f838ee` pushed normally to `origin/main`.
- [CI run 36827830350](https://github.com/egger-meow/eng-tutor-saas/actions/runs/36827830350): verification job `110257401493` and production deployment job `110258011724` both succeeded. Linux CI ran the final lint, complete tests, typecheck and build.
- Fresh production `/sample` returned HTTP 200 with `/assets/index-CfuOSdrx.js` and `/assets/index-BJsRHrEr.css`. Read-back confirmed the history guard marker, corrected optional-feedback/request copy and question-number styles.
- Live anonymous landing/sample screenshots at 320, 390, 820 and 1,440px passed document-overflow assertions. Evidence: `.runtime/layout-review/production/` (eight screenshots). These contain public pages only.
- Existing anonymous production demo smoke passed at 390×844: answer retention after reload, partial submission/results, read-only answers and return to login. Observed service calls were limited to enrollment state and public funnel events, with no student-answer traffic.
- Final local screenshot review completed 44 page/viewport combinations, plus the additional profile steps and reader screenshots, with no uncaught page errors or document-level overflow. Files and synthetic fixtures remain ignored; the repeatable review script is committed.

This change has no pending Supabase migration or Edge deployment.

The previously recorded physical-device, real-family learning loop, next-packet adaptation, actual missing-PDF reconstruction and first retention-scheduler acceptance gates remain separate. They are verification gates and are not claimed complete by layout screenshots.
