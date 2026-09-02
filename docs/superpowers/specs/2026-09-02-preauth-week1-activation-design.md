# Pre-auth Week 1 Activation Design

Date: 2026-09-02

## Problem

The current landing-first onboarding still treats Magic Link authentication as the moment a first-time child becomes canonical and the Week 1 generation pipeline begins. That leaves a conversion cliff after a parent has already completed the full child profile and submitted a reachable Email address.

For the current customer-development stage, the intended product rule changes to:

> For a first-time parent, completing the child questionnaire and successfully submitting an Email is enough to start Week 1. Clicking the Magic Link is optional for starting the material and exists primarily to let the parent enter the dashboard and manage the child.

Existing parents must not silently create another child merely by repeating the public landing flow.

## Goals

1. Start Week 1 for a genuine first-time parent immediately after the Email Magic Link dispatch succeeds.
2. Reuse the existing canonical child, beta entitlement, capacity, explicit generation-job, authoring, Finisher, Storage, and material-email pipelines.
3. Keep Magic Link authentication as the ownership-verification and dashboard-access path, not the Week 1 activation gate.
4. Preserve the existing returning-parent safeguard: an Email whose account already has an active child must authenticate and explicitly confirm before another child is created.
5. Keep the public acquisition funnel truthful: `auth_complete` becomes a secondary engagement event rather than a required first-time conversion step.
6. Preserve privacy, idempotency, one-child-one-subscription semantics, capacity authority, and RLS.

## Non-goals

- No second lead-generation queue.
- No duplicate pre-auth `children` schema.
- No alternate PDF renderer or material-delivery system.
- No bypass of the 100-child service-capacity authority.
- No automatic second-child creation for returning parents.
- No change to paid billing, Founder-seat allocation, or post-Week-1 subscription semantics.

## Recommended Architecture

Use the existing private onboarding handoff as a short-lived orchestration record, but split the current one-step handoff into three lifecycle moments:

1. **Prepare** the completed landing draft before Auth dispatch.
2. **Activate** a first-time child immediately after `signInWithOtp` reports successful Magic Link dispatch.
3. **Finalize ownership** when the parent eventually authenticates.

The browser remains unprivileged. Narrow `SECURITY DEFINER` RPCs own all access to `auth.users`, the private handoff, and pre-auth provisioning decisions.

### Why preparation happens before `signInWithOtp`

Supabase passwordless signup may create a new `auth.users` row as part of `signInWithOtp`. Therefore the system must capture whether the Email already belonged to an account with an active child **before** requesting the Magic Link. Otherwise a new account and an old account become indistinguishable after dispatch.

The browser must not receive an `existing_account` / `has_child` boolean. That state stays server-side to avoid turning the landing form into an account-enumeration endpoint.

## Pending Onboarding State

Extend `private_generation.pending_onboardings` rather than creating a second public data model.

Add enough internal state to distinguish:

- `prepared`: validated draft stored, no Email dispatch success recorded yet;
- `preauth_started`: first-time child was provisioned after successful Magic Link dispatch;
- `awaiting_existing_parent_confirmation`: an existing active-child account submitted the landing flow, so nothing was provisioned;
- `consumed`: authenticated ownership finalization completed.

Recommended columns or equivalent state:

- `provisioned_child_id uuid null`
- `preauth_started_at timestamptz null`
- `requires_additional_child_confirmation boolean not null default false`
- `anonymous_id text null`
- optional `session_id text null` for first-party funnel stitching

The existing `child_id` / `consumed_by` fields remain the authenticated binding record. `provisioned_child_id` is intentionally separate so a first-time child may exist before the handoff is authenticated/consumed without violating the current consumed-row invariant.

The table remains private, RLS-deny/direct-grants-revoked, token-hash protected, and short-lived.

## Server-side Flow

### 1. Prepare pending onboarding

The public landing form calls a narrow preparation RPC with:

- normalized parent Email;
- completed child draft;
- legal-version identifiers;
- anonymous analytics ID;
- optional session ID.

The RPC performs the existing draft validation and stores a new opaque-token handoff.

Before the Auth request is sent, it also records internally whether the normalized Email currently maps to an Auth user who already owns at least one active child.

This decision is never returned to the anonymous caller.

Only one live pending onboarding per normalized Email remains allowed. Re-submission replaces/refreshed the pending draft and token rather than creating unlimited live handoffs.

### 2. Dispatch Magic Link

The browser then calls the existing Supabase `signInWithOtp` path with the prepared handoff token in the redirect URL.

If Auth returns an error:

- no canonical child is created;
- no beta subscription is created;
- no generation job is created;
- the UI reports the send failure;
- the prepared handoff may expire naturally or be replaced by retry.

### 3. Start first-time Week 1 after dispatch success

Only after `signInWithOtp` returns success, the browser calls an activation RPC with the opaque handoff token.

The activation RPC locks the handoff row and is idempotent.

If the handoff was marked as belonging to an account with an active child at preparation time:

- do **not** create another child;
- do **not** create a beta subscription;
- do **not** enqueue Week 1;
- leave the draft intact for the authenticated returning-parent confirmation flow;
- return only a generic accepted state that does not expose account existence.

Otherwise the RPC:

1. Finds the Auth user created/resolved by the successful passwordless request for the handoff Email.
2. Verifies the parent profile exists.
3. Creates exactly one canonical `public.children` row owned by that parent.
4. Writes the completed `child_profiles` state using the same semantics as authenticated onboarding.
5. Lets the existing child-insert/beta-capacity trigger decide whether the child receives a beta trial or enters the waitlist.
6. Lets the existing subscription trigger create the explicit initial Week 1 generation job when eligible.
7. Stores `provisioned_child_id` and `preauth_started_at` on the handoff.
8. Scrubs no pre-auth profile data yet, because the later authenticated finalization still needs a durable binding record and returning-parent drafts still require confirmation.

The activation RPC must never manufacture a generation job directly. Week 1 must continue to enter through the canonical subscription/entitlement trigger and explicit `generation_jobs` queue.

### Capacity-full result

Capacity remains authoritative.

If child creation places the new child into `waitlist` rather than beta entitlement:

- the child is still canonical and owned by the Auth user;
- no Week 1 generation job exists;
- the success UI must not promise that Week 1 is already being prepared;
- the UI shows the existing capacity/waitlist truth instead.

This race-safe server result overrides optimistic landing-page copy.

## Authenticated Magic Link Finalization

`finalize_pending_onboarding(token)` becomes a binding/finalization function, not always a creator.

### First-time child already provisioned

After the matching Email authenticates:

- verify authenticated Email matches the handoff Email;
- verify `provisioned_child_id` belongs to that Auth user;
- set the canonical consumed/binding fields;
- apply legal acceptance to the parent profile;
- scrub the pre-auth Email and draft payload;
- return the same already-created child ID;
- navigate directly to the child management page.

It must not create a second child or a second generation job.

### Returning parent with active child

The existing safeguard remains:

- authenticated finalization detects confirmation is required;
- UI asks whether the completed landing draft represents another child;
- `confirm_additional_child_onboarding()` creates the additional child only after explicit confirmation, then reuses the same canonical beta/capacity/Week-1 pipeline;
- discard deletes/scrubs the unconsumed draft and returns the parent to the existing child.

## Landing UX and Copy

The final Email step should focus on the promised product outcome, not on authentication mechanics.

Recommended primary copy:

**孩子資料完成（第 3/3 步已完成）**

## 最後留下 Email，第一週做好直接寄給你

孩子資料已經完成。留下家長 Email 後，我們就會開始準備第一週教材；教材完成後會直接寄到這個 Email。

Primary button:

**開始準備第一週教材**

After a successful first-time activation:

## 完成了，第一週教材已開始準備

教材完成後會直接寄到你的 Email，不需要一直留在網站上。

Secondary text may say that the just-sent secure link can be used to enter the parent area and view/manage the child. The secure-login Email is an additional convenience, not the main success message.

For the generic accepted state that may also represent an existing-parent safeguard, copy must remain truthful without revealing account existence, for example:

> 資料已收到。第一週教材完成後會寄到這個 Email；如果這個 Email 原本已有孩子，請用剛寄出的安全連結確認是否新增另一位孩子。

If capacity is full, use the existing waitlist/capacity copy instead of promising material preparation.

## Magic Link Email

Keep the existing Supabase passwordless email mechanism.

The template should work for both onboarding and direct existing-user login. It may state:

- if the recipient just completed child information, the data has been received and Week 1 will be emailed when ready (subject to returning-parent confirmation/capacity truth);
- the secure link lets the parent enter the parent area and view/manage child information;
- if the recipient only requested login, the same link simply logs them in.

Do not introduce a second welcome-email service solely for this change.

The later material-release email remains unchanged in authority: when the Finisher completes and releases Week 1, the existing material-email pipeline sends the actual packet notification/scoped access email.

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

`auth_complete` is no longer a required sequential acquisition step. It becomes a secondary engagement/account-access signal after Email submission.

The Admin conversion UI must not calculate first-time conversion as though `auth_complete` were required between Email and child creation.

The returning-parent/additional-child funnel remains separate.

For a pre-auth first-time provision, `child_created` and `onboarding_complete` should be recorded from the authoritative activation result, stitched to the stored anonymous/session attribution without placing child-profile PII in analytics metadata.

## Security and Abuse Controls

This change deliberately accepts a lower acquisition threshold, but it must preserve bounded abuse controls:

1. A child is not provisioned until the passwordless Email API reports successful dispatch.
2. One live pending onboarding per normalized Email remains enforced.
3. Activation is token-bound, row-locked, and idempotent.
4. The server, not the browser, decides whether this was an existing active-child account at preparation time.
5. The browser receives no account-existence boolean.
6. Capacity remains authoritative, so pre-auth acquisition cannot bypass the 100-child gate.
7. Founder seats are not allocated at child creation; existing Founder checkout rules remain unchanged.
8. Pre-auth data remains private and absent from Git/log metadata.
9. Repeated activation/finalization cannot create duplicate children, subscriptions, or jobs.
10. A returning parent with an active child cannot create an additional child without authenticated explicit confirmation.

This design intentionally accepts that a valid but never-clicked first-time Email may consume one beta service slot and one Week 1 authoring job. That is a product decision for the current customer-development phase.

## Error Handling

- **Draft validation failure:** stay on the form and show field/server validation.
- **Magic Link dispatch failure:** no child/job; allow retry.
- **Activation retry/network uncertainty:** safe retry of the same token returns the same result.
- **Auth user/profile not yet visible immediately after dispatch:** activation must fail safely with a retryable result; it must not create partial child state.
- **Capacity race:** canonical server result may become waitlist even if the landing page previously showed capacity available.
- **Magic Link opened after pre-auth provision:** bind existing child; never duplicate.
- **Magic Link opened by mismatched Email identity:** reject finalization and expose no child data.
- **Existing-parent confirmation discarded:** no second child/job is created.

## Tests

### Database / contract

Add regression coverage that proves:

- prepare records the existing-active-child decision before Auth creation without exposing it through direct table access;
- successful first-time activation creates exactly one child/profile;
- canonical beta/capacity logic runs exactly once;
- eligible first-time activation produces exactly one initial generation job through the existing trigger path;
- capacity-full activation creates the canonical waiting state and no generation job;
- activation retry returns/reuses the same child and never duplicates job/subscription state;
- existing-active-child Email activation does not create a child/job before auth confirmation;
- authenticated finalization of a pre-provisioned first-time child returns that same child and scrubs pending PII;
- mismatched authenticated Email cannot claim the provisioned child;
- confirmed additional-child path still works exactly once;
- discard path still creates no child;
- anon/authenticated direct table access to pending onboarding remains denied.

### Frontend

Add focused tests that prove:

- final-step copy promises Week 1 email delivery rather than requiring Magic Link to start;
- `signInWithOtp` success is followed by activation;
- `signInWithOtp` failure never calls activation;
- first-time started result renders the Week-1-preparing success state;
- capacity/waitlist result renders truthful capacity copy;
- direct existing-user login remains unchanged;
- Magic Link callback for an already-provisioned child navigates to that child without creating another;
- returning-parent confirmation UI remains intact.

### Admin analytics

Update funnel tests so:

- `auth_complete` is not required in the first-time sequential funnel;
- Email → child-created conversion is valid before auth;
- auth completion remains visible as a secondary metric;
- returning-parent events remain excluded from first-time acquisition conversion.

## SPEC Changes Required During Implementation

Update the existing numbered sections without renumbering:

- **24 Free Week 1**: Email-dispatch success becomes the first-time Week 1 activation boundary; Magic Link becomes optional for starting material.
- **33 Authentication**: canonical first child may be provisioned to the Auth identity before the parent opens the Magic Link, but ownership access remains unavailable until authentication.
- **44 Parent Onboarding**: first generation begins after successful Email submission for first-time accounts; auth is no longer a required predecessor.
- **145 Signed Downloads** if needed only to clarify that material email remains the delivery notification while dashboard login is optional.
- **168 Analytics and Early Funnel**: remove `auth_complete` from the required sequential acquisition path.
- **172 Operational Admin Needs**: Admin funnel must reflect the new sequence.
- **179 Testing Requirements**: update finalization-only assumptions and add pre-auth activation/idempotency coverage.
- **192 Definition of Done: Account**: first-time child/material activation begins after Email dispatch; Magic Link proves dashboard access and binds/cleans the handoff.
- **193 Definition of Done: First Material**: eligible first-time child can enter the generation queue without requiring Magic Link click.
- **198 Definition of Done: Security**: pre-auth-provisioned child remains inaccessible through browser ownership APIs until authenticated, while the private handoff remains protected.

No section renumbering or TOC-title change is expected.

## Rollout and Verification

Implementation should use TDD and a forward-only Supabase migration.

Before merge:

- `pnpm lint`
- `pnpm test`
- `pnpm test:db`
- `pnpm typecheck`
- `pnpm build`

After merge, apply the migration chain to the production Supabase project, verify remote migration history and RPC privileges/read-after-write behavior, then verify the production web deploy.

A final manual smoke should cover:

1. brand-new Email that never opens the Magic Link but still receives a generated Week 1 material email;
2. brand-new Email that opens the Magic Link and sees the already-created child;
3. existing parent with one active child who submits another landing draft and receives the explicit confirmation screen before any second child/job exists;
4. capacity-full behavior.
