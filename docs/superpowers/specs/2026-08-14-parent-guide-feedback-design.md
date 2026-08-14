# Parent Guide and Product Feedback Design

## Goal

Give logged-in parents one clear place to learn the intended learning workflow and send product-level feedback without affecting a child's weekly personalization feedback.

## Experience

Add one parent-navigation destination, **使用說明與回饋**. The page contains a short parent guide followed by a product feedback form.

The guide explains: let the child attempt work first; reveal the parent answer after completion; use AI to explain an incorrect answer rather than provide answers; safely photograph only the relevant question and exclude personal data; and use the weekly feedback flow to report learning observations.

The form has a required category (`bug`, `flow`, `materials`, or `other`) and a required free-text message. It gives an accessible success or error status and remains on the page after submission.

## Data and Privacy

Create `public.product_feedback` with `parent_id`, `category`, `message`, timestamps, validation checks, RLS, and authenticated grants. A parent may insert and read only their own rows. The browser supplies `parent_id`; the insert policy verifies it matches `auth.uid()`. There is no email delivery, no service-role client code, and no link to generation or child learning memory.

## Boundaries

Existing `public.feedback` remains exclusively material-specific feedback used by the personalization pipeline. Product feedback neither changes material data nor creates a generation job.

## Verification

Add route and client validation tests, run web lint/typecheck/build and the database smoke suite, and review the migration's RLS/grants against the repository's existing ownership policy pattern.
