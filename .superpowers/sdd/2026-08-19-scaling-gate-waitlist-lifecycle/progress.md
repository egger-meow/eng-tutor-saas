# SDD ledger — plan: docs/superpowers/plans/2026-08-19-scaling-gate-waitlist-lifecycle.md

## Pre-flight Plan Scan
- Task 1: Supabase Database Migration & Smoke Tests (produces schema, RLS, triggers, gating RPCs)
- Task 2: Release Notification Email Template & Dispatcher (consumes release actions, produces email dispatch)
- Task 3: Admin Console Service, API Endpoints & Types (consumes RPCs and email dispatcher, produces backend API)
- Task 4: Admin Console UI (consumes Admin API, produces interactive view)
- Task 5: Web Parent App Waitlist Library & Onboarding Messaging (consumes enrollment/waitlist data, produces client lib & onboarding copy)
- Task 6: Web Parent Dashboard & Billing Experience (consumes waitlist lib & Paddle gating, produces dashboard/billing UI)
- Task 7: End-to-End Verification & Workspace Validation

Pre-flight scan clean: All interfaces, global constraints, and task dependencies align.

## Tasks
- [x] Task 1: Supabase Database Migration for Scaling Gate Waitlist & Gating Functions
Task 1: complete (migration 20260819220000_scaling_gate_waitlist_lifecycle.sql, smoke.sql updated and pnpm test:db passing, 56/56 vitest test files passing)
- [x] Task 2: Release Notification Email Template & Dispatcher
Task 2: complete (supabase/templates/waitlist-release.html created, auth-email-templates.test.ts updated & passing)
- [x] Task 3: Admin Console Service, API Endpoints & Types
Task 3: complete (types.ts, admin-service.ts, api-handler.ts updated, 32/32 tests in admin-service.test.ts passing)
- [x] Task 4: Admin Console Waitlist Management View & Navigation
Task 4: complete (WaitlistManagementView.tsx created, Navigation.tsx & App.tsx updated, pnpm admin:build passing)
- [x] Task 5: Web Parent App Waitlist Client Library & Honest Messaging
Task 5: complete (waitlist.ts, waitlist.test.ts, enrollment.ts, CapacityStatus.tsx, WaitlistPage.tsx updated & tested)
- [x] Task 6: Web Parent Dashboard & Billing Experience for Waiting vs Released Children
Task 6: complete (ChildCard.tsx, use-parent-data.ts, BillingPage.tsx, ChildSubscription.tsx updated, 8/8 tests in ChildSubscription.test.tsx passing)
