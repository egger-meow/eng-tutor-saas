# Pre-auth Week 1 Activation Design

Date: 2026-09-02

## Problem

The current landing-first onboarding still treats Magic Link authentication as the moment a first-time child becomes canonical and the Week 1 generation pipeline begins. That leaves a conversion cliff after a parent has already completed the full child profile and submitted a reachable Email address.

For the current customer-development stage, the intended product rule changes to:

> For a genuine first-time parent, completing the child questionnaire and successfully submitting an Email is enough to start Week 1. Clicking the Magic Link is optional for starting the material and exists primarily to let the parent enter the dashboard and manage the child.

An Email that already belonged to any Auth account before this landing submission must not receive unauthenticated account mutations. Existing parents therefore keep the authenticated additional-child safeguard.

## Goals

1. Start Week 1 for a genuine first-time parent immediately after the system successfully requests the Email Magic Link.
2. Reuse the existing canonical child, beta entitlement, capacity, explicit generation-job, authoring, Finisher, Storage, and material-email pipelines.
3. Keep Magic Link authentication as the ownership-access and dashboard-entry path, not the Week 1 activation gate for brand-new accounts.
4. Preserve the existing returning-parent safeguard: a pre-existing Auth account must authenticate before this landing draft can create or modify a child; if it already owns an active child, adding another child still requires explicit confirmation.
5. Keep the public acquisition funnel truthful: `auth_complete` becomes a secondary engagement event rather than a required first-time conversion step.
6. Preserve privacy, idempotency, one-child-one-subscription semantics, capacity authority, legal acceptance, and RLS.

## Non-goals

- No second lead-generation queue.
- No duplicate pre-auth `children` schema.
- No alternate PDF renderer or material-delivery system.
- No bypass of the 100-child service-capacity authority.
- No automatic second-child creation for returning parents.
- No change to paid billing, Founder-seat allocation, or post-Week-1 subscription semantics.

## Recommended Architecture

Use the existing private onboarding handoff plus one narrow Supabase Edge Function dedicated to the first-time landing submission.

The Edge Function is not a second email system. It orchestrates the existing Supabase Auth passwordless request and the existing database pipeline so the server, rather than browser JavaScript, can authoritatively know that the passwordless request succeeded before provisioning Week 1.

The lifecycle becomes:

1. **Prepare** the completed landing draft and classify whether the Email was already an Auth account.
2. **Send** the existing Supabase Magic Link from the trusted Edge Function.
3. **Activate** a brand-new account immediately after that Auth call succeeds.
4. **Finalize ownership handoff** when the parent eventually authenticates.

Direct existing-user login on the right-side landing card continues using the normal Supabase passwordless login path and does not enter this onboarding orchestration.

### Why the Edge Function is required

A browser calling `signInWithOtp()` and then an anonymous activation RPC cannot prove to the database that the Auth API actually accepted the send request. Trusting a browser-provided `sent=true` flag would let callers bypass the intended Email step and provision work directly.

The onboarding Edge Function instead performs the Auth request itself, sees the real result, and only then invokes the service-only activation helper. Browser code receives no service-role credentials and cannot call the activation helper directly.

### Why account classification happens before the Auth request

Supabase passwordless signup may create a new `auth.users` row as part of the first `signInWithOtp` request. The system therefore records whether the normalized Email already existed in `auth.users` **before** requesting the Magic Link.

Any Email that already existed is treated as returning-account state and is never mutated pre-auth. This is stricter than checking only for active children and prevents an unauthenticated visitor from attaching data to someone else's dormant or childless existing account.

The browser never receives an `account_exists`, `has_child`, or equivalent boolean, so the public form does not become an account-enumeration endpoint.

## Pending Onboarding State

Extend `private_generation.pending_onboardings` rather than creating a second public data model.

The handoff must distinguish these internal states or equivalent fields:

- `prepared`: validated draft stored before the Auth request;
- `preauth_started`: brand-new account provisioned after the trusted Auth request succeeded;
- `awaiting_existing_account_auth`: the Email existed before submission, so no child was provisioned;
- `consumed`: authenticated handoff finalization completed.

Recommended columns or equivalent state:

- `account_existed_at_prepare boolean not null default false`
- `provisioned_child_id uuid null`
- `preauth_started_at timestamptz null`
- `anonymous_id text null`
- optional `session_id text null` for first-party funnel stitching

The existing `child_id` / `consumed_by` fields remain the authenticated binding record. `provisioned_child_id` is separate so a brand-new first-time child can exist before the handoff is authenticated/consumed without violating the current consumed-row invariant.

The table remains private, RLS-enabled with no browser policies, direct grants revoked, token-hash protected, and short-lived.

Only one live pending onboarding per normalized Email remains allowed. Concurrent/repeated submissions must refresh or supersede the same live handoff rather than create unbounded pending rows.

## Edge Function Flow

Create a narrow function such as `start-landing-onboarding`.

Input:

- parent Email;
- completed child draft;
- legal-version identifiers;
- anonymous analytics ID;
- optional session ID;
- an allowed redirect origin or a server-owned redirect target.

The function must validate redirect targets against the production origin and explicitly supported local/test origins. Arbitrary caller-controlled redirect URLs are forbidden.

### 1. Prepare

The Edge Function calls a service-only preparation helper that:

- performs the existing server-side draft validation;
- normalizes the Email;
- records legal versions and analytics attribution;
- checks whether that Email already existed in `auth.users` before this request;
- stores that classification privately;
- returns an opaque raw handoff token only to the Edge Function.

The database stores only the token hash.

### 2. Request the existing Magic Link

The Edge Function uses a Supabase client configured for the ordinary passwordless Auth API, not an Admin-generated replacement email, and calls the existing `signInWithOtp` flow with the handoff token in the approved redirect URL.

This preserves the existing Supabase email delivery/template mechanism.

If the Auth request fails:

- no child is provisioned;
- no beta subscription is created;
- no generation job is created;
- the prepared handoff is deleted or left to short expiry without becoming active;
- the Edge Function returns an error and the UI allows retry.

### 3. Activate after trusted Auth success

After `signInWithOtp` returns success, the Edge Function calls a service-only activation helper with the opaque handoff token.

The activation helper locks the handoff row and is idempotent.

#### Email existed before this submission

If `account_existed_at_prepare = true`:

- do **not** create or modify any child pre-auth;
- do **not** create a beta subscription;
- do **not** enqueue Week 1;
- keep the completed draft for authenticated finalization;
- record the successful Email-submit funnel step;
- return a generic accepted response that does not disclose account existence.

After the Email owner authenticates:

- if the account has no active child, authenticated finalization may create the first active child directly;
- if it already has an active child, the existing explicit additional-child confirmation UI remains required before creating another.

#### Email was genuinely new before this submission

If `account_existed_at_prepare = false`, the successful passwordless request should now have created/resolved the new Auth user.

The activation helper:

1. Finds that Auth user by the handoff Email and verifies its parent profile exists.
2. Creates exactly one canonical `public.children` row owned by that Auth user.
3. Writes the completed child profile using the same field semantics as authenticated onboarding.
4. Applies the submitted Terms/Privacy versions to the new parent profile because service is now starting before the parent opens the Magic Link.
5. Lets the existing child-insert/beta-capacity trigger decide whether the child receives a beta trial or enters waitlist.
6. Lets the existing subscription trigger create the explicit initial Week 1 generation job when eligible.
7. Stores `provisioned_child_id` and `preauth_started_at` on the handoff.
8. Immediately scrubs the pre-auth child draft because the canonical child/profile now owns that data; retain only the normalized Email plus minimum token/binding metadata needed for the upcoming authenticated claim.
9. Records `email_submit`, `child_created`, and `onboarding_complete` in authoritative order using the stored anonymous/session attribution, without child-profile PII in analytics metadata.

The activation helper must never manufacture a generation job directly. Week 1 continues to enter through the canonical subscription/entitlement trigger and explicit `generation_jobs` queue.

### Public response

The Edge Function must not reveal whether the Email already existed.

It may return only non-sensitive delivery state such as:

- `accepted`: the submission and Magic Link request succeeded; this covers both a started brand-new child and an existing account awaiting authenticated confirmation;
- `waitlisted`: a genuinely new canonical child was created but capacity authority placed it on the waitlist, so no Week 1 job exists.

The frontend must use copy that remains truthful for `accepted` without disclosing whether the account was new or existing.

## Capacity-full Behavior

Capacity remains authoritative.

If brand-new child creation places the child into `waitlist` rather than beta entitlement:

- the child is canonical and owned by the newly created Auth identity;
- no Week 1 generation job exists;
- the success UI must not promise that Week 1 is already being prepared;
- the UI shows the existing capacity/waitlist truth instead.

This race-safe server result overrides optimistic landing-page capacity copy.

## Authenticated Magic Link Finalization

`finalize_pending_onboarding(token)` becomes primarily a binding/finalization function for the new-account path while retaining authenticated creation for returning-account paths.

### Brand-new child already provisioned

After the matching Email authenticates:

- verify authenticated Email matches the handoff Email;
- verify `provisioned_child_id` belongs to that Auth user;
- set the canonical consumed/binding fields;
- scrub the remaining pre-auth Email from the handoff;
- return the same already-created child ID;
- navigate directly to the child management page.

It must not create a second child, subscription, or generation job.

### Pre-existing account

No child was created before authentication.

After the matching Email authenticates:

- if there is no active child, finalize the completed draft as that account's active child through the canonical child/profile/beta-capacity pipeline;
- if there is at least one active child, show the existing additional-child confirmation UI;
- explicit confirmation creates the additional child exactly once;
- discard removes/scrubs the unconsumed draft and returns the parent to the existing child/dashboard.

## Landing UX and Copy

The final Email step focuses on the promised product outcome, not on authentication mechanics.

Primary copy:

**孩子資料完成（第 3/3 步已完成）**

## 最後留下 Email，第一週做好直接寄給你

孩子資料已經完成。留下家長 Email 後，我們就會開始處理第一週教材；教材完成後會直接寄到這個 Email。

Primary button:

**開始準備第一週教材**

After the Edge Function returns `accepted`, use account-neutral copy such as:

## 資料收到囉

第一週教材完成後會直接寄到這個 Email，不需要一直留在網站上。

Secondary line:

> 我們也寄了一封安全登入連結。想查看孩子資料或教材進度，可以從信箱登入；如果這個 Email 原本已有帳號，請用這封信確認剛剛填的是不是另一位孩子。

This keeps the material promise primary while making the returning-account exception truthful without revealing account status in the response.

If the Edge Function returns `waitlisted`, use the existing capacity/waitlist copy and do not promise Week 1 preparation.

## Magic Link Email

Keep the existing Supabase passwordless email mechanism and template delivery.

The shared template must still make sense for both onboarding and direct existing-user login. Suggested semantics:

- if the recipient just completed child information, the submission has been received and materials will be emailed when eligible/ready;
- the secure link lets the parent enter the parent area and view/manage child information;
- if the recipient only requested login, the same link simply logs them in.

Do not add a separate welcome-email service solely for this change.

The later material-release email remains unchanged in authority: when the Finisher completes and releases Week 1, the existing material-email pipeline sends the actual packet notification/scoped access email even if the parent never opened the earlier Magic Link.

## Analytics and Admin Funnel

The first-time acquisition funnel becomes:

```text
landing view
→ sample click
→ free trial CTA click
→ child form start
→ email submit
→ child created
→ onboarding complete
→ Week 1 generated
→ Student PDF downloaded
→ feedback submitted
→ paid conversion
→ month 2 retention
```

`auth_complete` is no longer a required sequential acquisition step. It remains a secondary account-access/engagement metric after Email submission.

For landing onboarding, the trusted server flow records `email_submit` before any server-created `child_created` / `onboarding_complete` events so timestamp order remains truthful. The browser must not duplicate those onboarding events.

The returning-parent/additional-child funnel remains separate. Existing-account submissions that are awaiting authenticated confirmation record Email submission but do not record child creation until authenticated creation actually occurs.

Admin conversion must therefore measure Email → canonical child creation without requiring auth completion in between, while still surfacing auth completion separately.

## Security and Abuse Controls

This change deliberately accepts a lower acquisition threshold but keeps ownership boundaries intact:

1. Browser JavaScript cannot call the service-only activation helper.
2. Brand-new child provisioning occurs only after the trusted Edge Function receives success from the ordinary Supabase passwordless Auth request.
3. Any Email that existed before the request is never mutated pre-auth.
4. One live pending onboarding per normalized Email remains enforced.
5. Preparation/activation are token-bound, row-locked, and idempotent.
6. The browser receives no account-existence boolean.
7. Capacity remains authoritative, so pre-auth acquisition cannot bypass the 100-child gate.
8. Founder seats are not allocated at child creation; existing Founder checkout rules remain unchanged.
9. Pre-auth data remains private and absent from Git/log metadata.
10. Repeated Edge requests, activation, or finalization cannot create duplicate children, subscriptions, or jobs.
11. A returning parent with an active child cannot create an additional child without authenticated explicit confirmation.
12. Until authentication, the browser has no session and RLS prevents access to the pre-provisioned child even though the canonical row exists.

This design intentionally accepts that a valid brand-new Email whose owner never clicks the Magic Link may consume one beta service slot and one Week 1 authoring job. That is the explicit customer-development trade-off.

## Error Handling

- **Draft validation failure:** stay on the form and show field/server validation.
- **Magic Link request failure:** no brand-new child/job; allow retry.
- **Edge/activation retry or network uncertainty:** the same live handoff/token path is idempotent and returns the same canonical result.
- **New Auth user/profile not visible immediately after Auth success:** activation fails safely with a retryable internal result; no partial child state is committed.
- **Capacity race:** canonical server result may become waitlist even if the landing page previously showed capacity available.
- **Magic Link opened after pre-auth provision:** bind the existing child; never duplicate.
- **Magic Link opened by mismatched Email identity:** reject finalization and expose no child data.
- **Existing-account submission:** no pre-auth child mutation; authenticated flow decides direct first-child creation vs additional-child confirmation.
- **Existing-parent confirmation discarded:** no second child/job is created.

## Privacy Retention

For a brand-new pre-auth-provisioned child, scrub the pending child draft immediately after the canonical child/profile transaction succeeds. Keep only the minimum Email/token/child binding required until Magic Link finalization or expiry.

For a pre-existing account, keep the completed draft only until authenticated finalize/confirm/discard or short expiry because no canonical child has yet been created.

Handoff expiry must remain at least as long as the configured Magic Link validity plus a small operational buffer while still being short-lived. Expired unconsumed rows should be cleanup-safe; expiration never deletes a canonical child that was already provisioned.

## Tests

### Edge orchestration

Prove that:

- the Edge Function validates allowed redirect origins;
- Auth send failure never invokes activation;
- Auth send success invokes activation exactly once/retry-safely;
- browser callers cannot invoke the service-only activation helper directly;
- the public response does not reveal whether the Email pre-existed.

### Database / contract

Add regression coverage that proves:

- preparation records `account_existed_at_prepare` before Auth creation and never exposes it through direct table access;
- brand-new activation creates exactly one child/profile and records legal acceptance;
- canonical beta/capacity logic runs exactly once;
- eligible brand-new activation produces exactly one initial generation job through the existing trigger path;
- capacity-full activation creates the canonical waiting state and no generation job;
- activation retry reuses the same child and never duplicates job/subscription state;
- any pre-existing Auth Email activation does not create/modify a child before auth;
- authenticated finalization of a pre-provisioned new child returns the same child and scrubs remaining pending PII;
- a pre-existing account with no active child can create the submitted child after auth;
- a pre-existing account with an active child still requires explicit additional-child confirmation;
- mismatched authenticated Email cannot claim the provisioned child/draft;
- confirmed additional-child path works exactly once;
- discard path creates no child;
- anon/authenticated direct table access to pending onboarding remains denied.

### Frontend

Add focused tests that prove:

- final-step copy promises material Email delivery rather than requiring Magic Link to start;
- landing onboarding calls the Edge orchestration endpoint rather than directly driving activation RPCs;
- accepted result renders the account-neutral material-delivery success state;
- waitlisted result renders truthful capacity copy;
- direct existing-user login remains unchanged;
- Magic Link callback for an already-provisioned child navigates to that child without creating another;
- returning-parent confirmation UI remains intact.

### Admin analytics

Update funnel tests so:

- `auth_complete` is not required in the first-time sequential funnel;
- Email → child-created conversion is valid before auth;
- auth completion remains visible as a secondary metric;
- returning-parent events remain excluded from first-time acquisition conversion;
- server-side onboarding events do not double-count client events.

## SPEC Changes Required During Implementation

Update existing numbered sections without renumbering:

- **24 Free Week 1**: trusted Email-request success becomes the brand-new-account Week 1 activation boundary; Magic Link click is optional for starting material.
- **33 Authentication**: a genuine new Auth identity may own a canonical first child before the parent opens the Magic Link, but browser ownership access remains unavailable until authentication; pre-existing accounts are never mutated pre-auth.
- **44 Parent Onboarding**: first generation may begin after successful Email submission for brand-new accounts; auth is no longer a required predecessor.
- **145 Signed Downloads** if needed only to clarify that material Email delivery works independently of whether the parent used the earlier login link.
- **168 Analytics and Early Funnel**: remove `auth_complete` from the required sequential acquisition path.
- **172 Operational Admin Needs**: Admin funnel reflects the new sequence and secondary auth metric.
- **179 Testing Requirements**: replace finalization-only assumptions with pre-auth activation/idempotency/orchestration coverage.
- **192 Definition of Done: Account**: brand-new child/material activation begins after trusted Email request; Magic Link proves dashboard access and completes handoff cleanup.
- **193 Definition of Done: First Material**: eligible brand-new child enters the generation queue without requiring Magic Link click.
- **198 Definition of Done: Security**: pre-existing accounts are never mutated pre-auth; pre-provisioned new child remains inaccessible to the browser until authentication; private handoff remains protected.

No section renumbering or TOC-title change is expected.

## Rollout and Verification

Implementation uses TDD, a forward-only Supabase migration, and the onboarding Edge Function.

Before merge:

- `pnpm lint`
- `pnpm test`
- `pnpm test:db`
- `pnpm typecheck`
- `pnpm build`

After merge:

- apply the pending migration chain to production Supabase;
- deploy the new/changed Edge Function to production;
- verify remote migration history, function deployment, RPC privileges, and read-after-write behavior;
- verify the production web deployment.

Final manual smoke cases:

1. brand-new Email that never opens the Magic Link but still receives its generated Week 1 material email;
2. brand-new Email that opens the Magic Link and sees the already-created child with no duplicate job;
3. pre-existing account with no active child: no pre-auth mutation, then authenticated child creation;
4. existing parent with one active child: no pre-auth second child/job, then explicit additional-child confirmation;
5. capacity-full behavior;
6. Auth email-send failure produces no canonical child/job.
