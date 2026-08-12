# Parent Portal UI/UX Redesign

## Goal

Redesign the existing parent portal as a premium, trustworthy education product while preserving authentication, child management, private Student PDF and Parent Answer PDF downloads, material history, and feedback submission. The interface should feel 70% educational publisher or private academy, 20% modern technology product, and 10% warm and child-friendly. AI remains invisible infrastructure rather than the brand identity.

## Experience Principles

1. Lead with the child and this week's learning, not metrics or system activity.
2. Present digital tools as support for a paper-first learning routine.
3. Make personalization visible through concise, concrete explanations.
4. Keep parent effort low: tell us, print, observe, and provide short feedback.
5. Separate each child's profile, materials, schedule, subscription, and history.
6. Use calm editorial hierarchy instead of card grids, glass effects, gradients, or dashboard chrome.

## Visual Direction

The selected direction is **Editorial Learning Journal**: warm paper surfaces, deep ink and navy typography, restrained botanical green actions, and small terracotta-gold accents. It combines the authority of an educational publisher with the clarity of a modern product.

The interface should use generous whitespace, fine rules, strong typographic hierarchy, and occasional paper-like sections. Cards are reserved for genuinely bounded objects such as a child's current weekly packet; ordinary sections use spacing and dividers instead.

Do not use AI-themed gradients, glowing effects, glassmorphism, cartoon fonts, emoji icons, KPI grids, achievement badges, or decorative motion.

## Reusable Design System

### Color tokens

| Token | Value | Purpose |
|---|---:|---|
| `--color-canvas` | `#F6F2E9` | Warm page background |
| `--color-paper` | `#FFFDF8` | Primary reading surface |
| `--color-ink` | `#172238` | Headings and primary text |
| `--color-text` | `#343A40` | Body copy |
| `--color-muted` | `#62645F` | Supporting text |
| `--color-rule` | `#D8D1C3` | Borders and dividers |
| `--color-action` | `#355C4A` | Primary actions and focus |
| `--color-accent` | `#B77942` | Restrained warm emphasis |

Success, warning, and error colors use low-saturation semantic variants and always include text or an icon. Component code consumes semantic tokens rather than raw colors.

### Typography and rhythm

- Display and section headings: `Noto Serif TC`, then a system serif fallback.
- Interface and body copy: `Noto Sans TC`, then a system sans-serif fallback.
- Minimum mobile body size: 16px with 1.55–1.7 line height.
- Spacing follows a 4/8px scale; page sections use 32, 48, or 64px separation.
- Controls have 8–10px radii; bounded content surfaces have at most 12px radii.
- Shadows are exceptional. Surface hierarchy normally comes from tone, rules, and whitespace.
- Motion lasts 150–220ms, communicates state change, and respects `prefers-reduced-motion`.
- Interactive targets are at least 44px, keyboard focus is visible, and text contrast meets WCAG AA.

## Information Architecture

### Public experience

- `/`: public landing page and authentication entry
- `/about`: founder story and credentials
- `/guide`: paper-first learning and responsible AI guide
- `/billing`: plans, per-child subscription state, and cancellation
- `/waitlist`: shown when the 100-child service capacity is full

The root page is not a standalone login screen. Its content order is:

1. Core promise and free Week 1 CTA
2. How weekly personalization works
3. Before-and-after feedback example
4. Student PDF and Parent Answer PDF explanation
5. Why learning returns to paper
6. How AI supports thinking without doing the child's work
7. Parent's lightweight weekly role
8. Progress continuity and curriculum direction
9. Founder trust summary with link to `/about`
10. Founding 30 offer, standard plan, and real capacity counter
11. FAQ and final signup/login CTA

Authentication appears inline or in a focused sheet while the parent retains the marketing context. Existing Email OTP / Magic Link behavior remains unchanged.

### Authenticated experience

- `/dashboard`: selected child's current learning week
- `/children/new`: onboarding
- `/children/:id`: child overview
- `/children/:id/edit`: editable learning profile
- `/children/:id/materials`: material history
- `/feedback/:materialId`: focused weekly feedback
- `/billing`: subscriptions grouped by child

Desktop uses a restrained top navigation. Mobile uses no more than four labeled primary destinations. A persistent child switcher changes the active child context; it never merges sibling materials or progress.

## Parent Dashboard

The first viewport answers four questions: which child is selected, what is this week's material, what should the parent do now, and when is the next delivery.

The hierarchy is:

1. Child identity, grade, and profile shortcut
2. **This week's learning** with theme, week, and short learning focus
3. Primary Student PDF download
4. Secondary Parent Answer PDF download
5. Feedback status, cutoff, and clear next action
6. “How this week was personalized” summary
7. Next delivery date and generation state in parent-friendly language
8. Recent material history

Loading, empty, error, and full-capacity states provide a recovery action. The dashboard contains no KPI charts, AI badges, or operational queue terminology.

## Child Profile and Onboarding

Onboarding is a mobile-first six-step flow designed to take only a few minutes:

1. **About the child** — nickname and grade
2. **Current level** — approximate overall, reading, vocabulary, and grammar levels
3. **School context** — textbook version, current unit or chapter, and upcoming test
4. **Interests** — interest chips, favorite topics, and disliked topics with free-text escape hatches
5. **Study routine** — weekly available minutes and realistic session preference
6. **Goals and review** — learning goals, known weak areas, parent expectations, notes, and final summary

Each step contains one decision group, a visible “Step X of 6” indicator, Back and Continue actions, inline validation after blur, and a clear optional-field label. Draft progress is retained locally during the session. The parent may leave optional details incomplete, but the minimum generation context must be completed before free Week 1 generation.

The same fields remain editable after onboarding. Profile editing states clearly that changes affect future materials only and never mutate completed PDFs. Dynamic school progress and interests are visually separated from more stable level and study settings.

## Founder Page

`/about` establishes personal trust without pretending to be a large institution. It includes:

- a founder portrait with descriptive alternative text;
- a concise teaching and product philosophy;
- accurate education, tutoring, software, and AI/data background;
- a CAP examination results section with a legible evidence image when supplied;
- a link to the founder's personal website or portfolio;
- a visible contact email using a normal mail link;
- a short explanation of why this product was created.

The landing page shows a compact founder introduction and links to the full page. Public claims and supporting images must be supplied and verified by the founder before publication. Sensitive identifiers on score documents must be redacted before upload.

## Plans, Subscription, and Capacity

Pricing is centralized rather than repeated as literals across components:

- standard: NT$499 per month per child;
- first 30 eligible children: free personalized Week 1, then NT$299 for the first paid month, then NT$499 per month;
- initial service capacity: 100 active children.

The landing page explains that billing and founding status belong to each child. The capacity counter uses real service state, never synthetic scarcity. At 100 active children, activation becomes a waitlist CTA while existing families continue normally.

The authenticated billing page groups subscription status and actions by child. It shows trial, active, past-due, cancellation, and entitlement states in plain language. Provider implementation remains behind a server-verified boundary; the UI never treats browser state as payment authority.

## Component and Data Boundaries

The redesign splits the current page into focused units:

- `AppShell`, `PublicHeader`, and `ParentNavigation`
- `ChildSwitcher` and `ChildIdentity`
- `WeeklyLearningPanel`, `DeliveryStatus`, and `PersonalizationSummary`
- `MaterialActions`, `MaterialHistory`, and `MaterialHistoryItem`
- `FeedbackSummary` and `FeedbackForm`
- `OnboardingLayout`, `OnboardingProgress`, and one component per step
- `ProfileSummary`, `ProfileSection`, and `ProfileEditor`
- `FounderSummary`, `FounderProfile`, `PricingSection`, and `CapacityStatus`

Feature components receive typed data and callbacks. Supabase access remains in `src/lib/` modules. Route-level components coordinate loading and mutation but do not contain the full UI implementation.

## Preserved Behavior and Data Flow

- Email OTP / Magic Link authentication remains intact.
- Child create, edit, and archive operations preserve parent ownership boundaries.
- Student and Parent PDFs continue to use short-lived signed downloads.
- Material history remains child-specific.
- Feedback retains its quick fields and optional details, affects future materials only, and does not regenerate completed packets.
- Completed PDFs remain immutable.
- No service-role key or private child data enters the frontend bundle or repository.

## Error Handling and Accessibility

Every asynchronous action has loading, success, and actionable error feedback. Form errors appear next to their fields and focus moves to the first invalid field after submission. Empty states explain the next action. Destructive child archival requires confirmation.

Semantic headings, landmarks, native controls, labeled icons, keyboard navigation, `aria-live` status messages, zoom support, reduced motion, and 375px mobile layouts are required. The score evidence image on the founder page needs meaningful alt text plus an adjacent text summary.

## Verification

Implementation is complete only when:

- all existing parent flows still pass;
- dashboard state is verified for zero, one, and multiple children;
- sibling data never leaks across the child switcher;
- onboarding works at 375px, tablet, and desktop widths;
- keyboard and visible-focus navigation cover all primary flows;
- both PDF downloads and feedback submission work from the redesigned UI;
- profile edits affect future generation context without changing historical material;
- landing pricing and capacity use centralized, real configuration;
- founder claims, links, email, portrait, and redacted score evidence are reviewed before public release;
- direct URL refreshes remain compatible with GitHub Pages routing.

## Delivery Sequence

1. Introduce tokens, typography, shared primitives, and route structure without changing behavior.
2. Extract existing child, material, download, and feedback flows into reusable components.
3. Build the child-centric dashboard and child switcher.
4. Build profile data access and the six-step onboarding/edit experience.
5. Build the public landing, founder, guide, pricing, capacity, and waitlist surfaces.
6. Add the per-child billing experience after provider configuration is validated.
7. Run responsive, accessibility, ownership, and hosted end-to-end verification before scheduling production generation work.
