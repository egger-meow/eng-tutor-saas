# 紙屬英文 Product & Technical Specification

> Working name: **紙屬英文**
> Status: MVP product contract
> Primary market: Taiwan
> Primary customer: Parents of junior-high students
> Primary learner: Junior-high students, with optional entry from Grade 6 before junior high
> Long-term academic target: Taiwan junior-high English and CAP / 國中教育會考 capability
> Standard prices: **NT$499 / child / month** or **NT$4,999 / child / year**

---

# 1. Purpose of This Document

This file is the canonical product and technical specification for 紙屬英文.

All coding agents, contributors, product changes, schema changes, curriculum changes, generation changes, and frontend decisions must treat this document as the primary contract.

Supporting documents may elaborate on individual areas, but they must not silently override this specification.

When implementation details conflict with this file:

> **SPEC.md wins unless the product decision is explicitly changed.**

This document intentionally includes both:

* product requirements;
* system architecture;
* learning philosophy;
* curriculum principles;
* business rules;
* operational rules;
* marketing requirements.

The goal is to prevent future agents from reducing 紙屬英文 into a generic AI worksheet generator.

---

# 2. Product Vision

紙屬英文 is a personalized weekly English learning subscription for Taiwanese junior-high students.

Every week, each child receives a printable English learning package that is generated specifically for that child based on:

* current English ability;
* school progress;
* textbook version;
* vocabulary history;
* grammar history;
* reading performance;
* recent mistakes;
* previous material history;
* parent feedback;
* current interests;
* recent changes in interests;
* available weekly study time.

The fundamental product loop is:

```text
Understand the child
↓
Generate this week's personalized material
↓
Child reads and writes on paper
↓
Parent observes
↓
Parent submits feedback
↓
Learning memory updates
↓
Next week's material changes
↺
```

The system should become increasingly useful as learning history accumulates.

---

# 3. Core Promise

The central promise is:

> **每週一份，只屬於你孩子的英文教材。**

Supporting concept:

> **AI 在幕後，學習回到紙上。**

The product is not primarily:

* an AI chatbot;
* an online course;
* a question bank;
* a static workbook;
* a tutoring marketplace;
* a gamified education app.

The product should feel like:

> **a personal workbook that keeps rewriting itself as the child grows.**

---

# 4. Why the Product Exists

Traditional workbooks are designed for thousands of students at once.

Generic AI can generate questions, but normally requires a parent to repeatedly:

* explain the child;
* write prompts;
* remember previous mistakes;
* control difficulty;
* track school progress;
* check repeated vocabulary;
* check repeated article themes;
* generate printable material;
* maintain continuity.

紙屬英文 turns that recurring work into a system.

The parent should not need to become:

> a prompt engineer for their child's English education.

The service handles the continuity.

---

# 5. Primary Target Market

Initial market:

* Taiwan;
* junior-high English;
* Grade 7 to Grade 9;
* optionally Grade 6 students preparing to enter junior high.

The product should not artificially restrict content by grade label.

A Grade 7 student with stronger English should receive harder material than a weaker Grade 8 student when appropriate.

Difficulty is determined primarily by:

* actual demonstrated level;
* history;
* mistakes;
* feedback;
* curriculum progress.

---

# 6. Academic Destination

The long-term academic destination is:

> **Taiwan junior-high English proficiency aligned with CAP expectations.**

CAP alignment is not interpreted as:

> every worksheet must look like a full CAP mock exam.

Instead, the system progressively develops:

* vocabulary;
* grammar;
* natural-context language understanding;
* reading comprehension;
* detail identification;
* inference;
* main-idea recognition;
* contextual vocabulary guessing;
* mistake analysis;
* independent learning ability.

The product does not promise specific CAP scores.

---

# 7. Product Positioning

Avoid positioning primarily as:

> AI Worksheet Generator

Avoid positioning primarily as:

> AI Tutor

Preferred public positioning:

> **每週一份，只屬於你孩子的英文教材。**

Secondary messages:

> 根據孩子的程度、學校進度、興趣與上週表現，每週重新調整。

> AI 在幕後，孩子面前主要是紙、筆、閱讀與思考。

> 不只是給答案，更讓孩子逐漸學會怎麼自己學。

---

# 8. Paper-First Philosophy

The child should not be required to spend the entire learning session inside a website or app.

Digital systems should perform the tasks where software is strongest:

* remembering;
* analyzing;
* adapting;
* generating;
* tracking;
* organizing.

The learning session should primarily involve:

* printed paper;
* a pen or pencil;
* reading;
* writing;
* thinking;
* marking mistakes;
* taking notes.

Preferred product philosophy:

> **科技負責個人化，不負責讓孩子多看一個螢幕。**

This is not a claim that all online learning is bad.

The principle is:

> digital where useful, paper where useful.

---

# 9. Core Product Advantages

The landing page and marketing system should maintain an extensible set of product pillars.

Initial pillars:

## 9.1 Truly Personalized Every Week

The material is not generated once for an entire semester.

Every week can change based on the latest child state.

## 9.2 Continuous Learning Memory

The system remembers what the child has:

* learned;
* struggled with;
* repeated;
* mastered;
* recently encountered.

## 9.3 Parent Feedback Changes the Next Week

Parent feedback is not merely an analytics survey.

It directly becomes future generation context.

## 9.4 Paper-First Learning

The child's main learning surface is paper.

## 9.5 CAP-Oriented Long-Term Direction

Weekly themes may be fun and personalized, but progression has an academic backbone.

## 9.6 Learn How to Learn With AI

The product teaches students to use AI to understand mistakes rather than outsource thinking.

## 9.7 Self-Study Guidance

The worksheet must teach the child what to do, rather than assuming a tutor is sitting beside them.

---

# 10. Founder-Led Brand

During the first stage, 紙屬英文 should be a founder-led brand.

Do not pretend the product is already a large anonymous education corporation.

Parents are trusting the system to influence what their child studies.

Early trust should come from:

```text
Real founder
+
real background
+
clear teaching philosophy
+
transparent methodology
+
actual sample material
```

The website should contain a section such as:

> **為什麼我做紙屬英文**

or:

> **誰在做這套教材？**

The founder section may communicate relevant and verifiable background such as:

* Taiwan academic experience;
* junior-high CAP performance;
* university / graduate-school background;
* tutoring experience;
* software engineering experience;
* AI / data background;
* systems and products previously built;
* motivation for creating 紙屬英文.

Founder credentials should be connected to product philosophy rather than displayed as random status symbols.

---

# 11. Founder Profile

The website should support:

```text
/about
```

The founder page may link to the founder's existing personal website or portfolio.

The landing page should provide enough information to establish trust without becoming a full résumé.

Any claim displayed publicly must be accurate and verifiable.

---

# 12. Public Landing Page Is the Main Entry Page

For MVP, do not create a disconnected corporate marketing website and separate login product.

The root page should serve both purposes:

```text
Public marketing page
↓
Explain why the product matters
↓
Show how personalization works
↓
Explain paper-first learning
↓
Explain AI-learning method
↓
Show pricing / capacity
↓
CTA
↓
Signup / Login
```

The product experience begins before authentication.

---

# 13. Landing Page Objective

Before the parent signs up, the page should answer:

1. What does my child receive?
2. How is it different from a normal workbook?
3. How is it different from asking ChatGPT myself?
4. Why does the material change each week?
5. Why is it printed?
6. What does the parent need to do?
7. What role does AI play?
8. How much does it cost?
9. Can I try it?
10. Is enrollment currently open?
11. Who created the system?

---

# 14. Recommended Landing Page Structure

Recommended order:

```text
Hero
↓
Core promise
↓
How personalization works
↓
Before / after feedback example
↓
What the child receives
↓
Paper-first philosophy
↓
Learning with AI
↓
How parents participate
↓
CAP direction
↓
Founder story
↓
Founding offer
↓
Current capacity
↓
FAQ
↓
Signup / Login CTA
```

The exact visual layout may change.

The information hierarchy should remain.

---

# 15. Hero Concept

Recommended concept:

```text
每週一份，只屬於你孩子的英文教材。

根據程度、學校進度、興趣，
以及上週真的學得怎麼樣，
每週重新調整。

孩子不用再多開一個學習 App。
印下來，拿起筆，開始學。

[免費產生第一週]
```

Possible supporting bullets:

```text
✓ 對齊國中英文與會考能力
✓ 每週依實際回饋調整
✓ 可列印學生教材
✓ 家長另有完整答案
✓ 紙本學習 + 正確 AI 使用習慣
```

---

# 16. Personalization Must Be Visible

Personalization must not only exist inside the backend.

Parents must be able to see how it changed the material.

Example marketing demonstration:

```text
上週狀況

閱讀：太簡單
文法：do / does 常錯
學校：開始現在進行式
最近興趣：NBA

↓

下一週

閱讀難度 ↑
do / does 再安排 spaced review
加入現在進行式
文章情境改用 NBA
```

A similar summary may appear in the parent dashboard or Parent Answer PDF.

If the system is personalized but looks generic, users will not perceive the value.

---

# 17. User Model

There are three conceptual roles.

## 17.1 Parent

The authenticated paying user.

## 17.2 Child

The learner.

The child does not require a separate login in MVP.

## 17.3 Admin / Operator

Manages operational issues and generation failures.

The admin interface may initially rely on Supabase Dashboard and internal tools.

---

# 18. Parent Account Model

One authenticated parent can manage multiple children.

Example:

```text
Parent account
├── Child A
├── Child B
└── Child C
```

The account belongs to the parent.

The educational product belongs to each child.

---

# 19. Child Independence

Every child must have independent:

* profile;
* preferences;
* learning history;
* vocabulary history;
* grammar history;
* reading level;
* weekly summaries;
* feedback;
* materials;
* generation schedule;
* generation jobs;
* subscription;
* pricing status;
* founding status.

Sibling data must never become mixed merely because they share a parent.

---

# 20. Billing Unit

Billing is per child.

Standard pricing:

> **NT$499 / month / child** or **NT$4,999 / year / child**

Example:

```text
Parent
├── Jonathan
│   └── NT$499/month
└── Emily
    └── NT$4,999/year
```

Do not model the entire family as one generic subscription in MVP.

---

# 21. Subscription Independence

Every subscribed child should have an independent payment subscription.

This allows:

* different start dates;
* separate cancellation;
* separate payment state;
* separate future plans;
* separate promotions.

Do not use a single subscription with `quantity = number of children` for MVP.

---

# 22. Founding 30 Program

The first 30 eligible children form the founding cohort.

The founding offer is:

```text
First 30 children

Week 1:
Free personalized generation

First paid month:
NT$299

After first paid month:
NT$499/month
```

The Founding 30 paid discount applies only when the child chooses the monthly plan. The annual plan remains NT$4,999/year and does not consume or redeem a founding discount.

Founding status belongs to the child, not merely the parent account.

Example:

```text
Parent joins early

Child A:
founding = true

Parent adds Child B six months later:
founding = false
```

---

# 23. Founding Pricing Is Not Permanent NT$299

Unless explicitly changed later:

> NT$299 applies only to the first paid month.

From the second paid month:

> NT$499/month.

Annual billing is not a discounted founding period. It is a separate standard plan at NT$4,999/year.

The founding offer is designed to:

* reduce first-use friction;
* allow parents to see real material;
* reward early adoption;
* generate early feedback.

It is not intended to permanently reduce ARPU.

---

# 24. Free Week 1

For the founding cohort, the ideal entry flow is:

```text
Landing
↓
Free Week 1 CTA
↓
Parent login
↓
Create child
↓
Complete profile
↓
Week 1 generation
↓
Download
↓
Use at home
↓
Provide feedback
↓
Decide whether to subscribe
```

The goal is to allow a parent to evaluate:

> the actual personalized product.

Not merely screenshots or demo copy.

---

# 25. Week 1 as Calibration

MVP does not require a large online placement test.

Initial level is estimated from:

* parent description;
* school grade;
* textbook version;
* school progress;
* known strengths;
* known weaknesses;
* interests;
* Week 1 performance.

Week 1 partly functions as a calibration packet.

After Week 1 feedback, the system should be willing to make a substantial difficulty adjustment.

A future short placement assessment may be added later.

It is not an MVP blocker.

---

# 26. Maximum Initial Capacity

The system should intentionally cap early service at:

> **100 active service children**

This is a real operational cap.

It is not fake scarcity.

---

# 27. Why the 100-Child Cap Exists

The first 100 children are a controlled production phase.

During this stage the team needs to observe:

* generation quality;
* PDF quality;
* personalization quality;
* feedback rates;
* model failures;
* repeated content;
* subscription behavior;
* parent confusion;
* operational workload;
* retention.

If the product reaches 100 active children:

> that is evidence strong enough to justify upgrading the system before opening further enrollment.

---

# 28. Capacity Counter

The landing page may display:

```text
目前服務名額
37 / 100
```

The counter must reflect real system state.

Never generate random scarcity numbers.

---

# 29. Capacity Definition

Capacity is counted by child.

Not by parent.

Example:

```text
50 parents
×
2 active children each
=
100 active child slots
```

Children currently eligible for active service may count toward capacity, including qualifying founding trial children when they occupy generation capacity.

Archived or expired children do not count.

---

# 30. Capacity States

Suggested enrollment states:

* `open`
* `nearly_full`
* `waitlist`
* `closed`

When under capacity:

> new eligible children may join.

When capacity reaches 100:

> new child activation is disabled.

Existing customers continue normally.

---

# 31. Full-Capacity Experience

When enrollment is full:

```text
目前 100 / 100，暫停加入。

我們會先把教材品質、生成系統與服務能力升級好，
再開下一批。

[加入候補名單]
```

Do not automatically raise the cap from 100 to 1,000 simply because demand appears.

100 is an intentional product review checkpoint.

---

# 32. Waitlist

MVP may support a lightweight waitlist.

Suggested fields:

```text
waitlist

id
email
created_at
source
status
```

Notification may initially be manual.

A complex referral or waitlist-ranking system is not required.

---

# 33. Authentication

Authentication provider:

> **Supabase Auth**

MVP login methods:

* Email OTP;
* or Email Magic Link.

Traditional passwords are not required for MVP.

---

# 34. Future Authentication Options

Possible future options:

* Google OAuth;
* LINE Login.

These are not MVP blockers.

---

# 35. Child Login

MVP does not require the child to have an account.

The parent owns the dashboard.

The child primarily interacts with:

* printed Student PDF;
* personal notebook;
* optional external AI tools when appropriate.

---

# 36. Parent Capabilities

A parent can:

* authenticate;
* create children;
* edit child profile;
* edit current interests;
* update school progress;
* add context notes;
* start a child's subscription;
* cancel subscription;
* see billing state;
* download current material;
* download historical material;
* download Parent Answer PDF;
* submit feedback;
* view next generation date;
* see simple personalization summaries;
* archive a child.

---

# 37. Child Profile Is Continuously Editable

A child profile is not frozen after onboarding.

Children change.

Examples:

* starts watching a new anime;
* stops playing Minecraft;
* becomes interested in NBA;
* changes favorite game;
* school moves to a new chapter;
* parent notices a new weakness;
* reading becomes too easy;
* exam preparation begins.

Parents must be able to update this information at any time.

---

# 38. Profile Changes Affect Future Materials

Editing a profile must NOT immediately regenerate existing materials.

Correct behavior:

```text
Parent changes interest
↓
Student state updates
↓
Current PDF remains unchanged
↓
Next generation reads new state
```

Completed material is immutable.

---

# 39. Stable Profile vs Dynamic Context

The data model should distinguish relatively stable information from fast-changing information.

## Stable profile examples

* grade;
* textbook version;
* baseline level;
* learning goals;
* weekly time budget.

## Dynamic context examples

* current interests;
* recent anime;
* current games;
* school chapter;
* upcoming exam;
* recent mistakes;
* parent observations.

---

# 40. Student Core Record

Suggested logical structure:

```text
students

id
parent_id
nickname
grade
textbook_version
status
next_generation_at
created_at
updated_at
```

Use nickname by default.

Do not require a legal name.

---

# 41. Student Profile

Suggested logical fields:

```text
student_profiles

student_id
baseline_level
reading_level
vocabulary_level
grammar_level
learning_goals
weekly_time_budget
school_progress
parent_expectations
created_at
updated_at
```

Level representations may initially use simple categorical values.

---

# 42. Student Preferences

Suggested structure:

```text
student_preferences

student_id
interests
favorite_games
favorite_anime
favorite_sports
favorite_topics
disliked_topics
preferred_story_style
updated_at
```

Exact implementation may use arrays, JSONB, or normalized records.

The interface should remain simple for parents.

---

# 43. Student Context Notes

Parents need an escape hatch for information that does not fit a form.

Suggested structure:

```text
student_context_notes

id
student_id
note
created_at
```

Examples:

```text
最近孩子說閱讀太簡單。
```

```text
下星期學校要考 Unit 2。
```

```text
最近一直搞混 do 和 does。
```

```text
最近開始看新的動漫。
```

---

# 44. Parent Onboarding

Recommended initial flow:

```text
Landing
↓
Email authentication
↓
Create child
↓
Child profile
↓
Learning context
↓
Founding eligibility / pricing
↓
First generation
↓
Dashboard
```

The initial form should ideally take only a few minutes.

---

# 45. Recommended Onboarding Inputs

Core fields:

* child nickname;
* grade;
* textbook version;
* approximate English level;
* current school progress;
* main goals;
* weekly available study time;
* interests.

Optional fields:

* favorite anime;
* favorite games;
* sports;
* known weak areas;
* parent expectations;
* upcoming tests;
* free-text notes.

---

# 46. Learning Memory Is the Core Moat

The long-term defensible asset is not merely the prompt.

It is accumulated learning history.

Over time, the system should know:

* words introduced;
* words repeatedly missed;
* words reviewed;
* words likely mastered;
* grammar taught;
* grammar repeatedly confused;
* reading difficulty trajectory;
* recently used article themes;
* successful themes;
* disliked themes;
* recurring mistake patterns;
* completion history;
* school progress;
* parent observations.

---

# 47. Vocabulary Progress

Suggested structure:

```text
student_vocab_progress

id
student_id
vocab_id
status
first_seen_at
last_seen_at
times_seen
times_correct
times_incorrect
mastery_score
last_material_id
notes
```

Possible statuses:

* `new`
* `learning`
* `reviewing`
* `mastered`

MVP does not require a sophisticated machine-learning mastery model.

Simple interpretable rules are acceptable.

---

# 48. Grammar Progress

Suggested structure:

```text
student_grammar_progress

id
student_id
grammar_topic_id
status
first_seen_at
last_seen_at
times_reviewed
mastery_score
notes
```

Possible statuses:

* `not_started`
* `learning`
* `reviewing`
* `mastered`

---

# 49. Reading Progress

Reading difficulty should be tracked separately from grade.

The system should be able to represent:

* current reading level;
* recent difficulty feedback;
* comprehension accuracy;
* whether reading is trending too easy or too hard.

The first implementation may use simple categories or numeric levels.

---

# 50. Mistake Memory

Repeated mistakes deserve structured memory when practical.

Examples:

* third-person singular;
* do / does;
* be verb confusion;
* tense switching;
* article usage;
* context-guessing weakness.

Do not rely only on free-text historical feedback when a recurring pattern can be represented structurally.

---

# 51. Compact Historical Memory

Production generation must preserve the efficiency principle validated in `eng-tutor`.

As weeks accumulate:

> generation must not require rereading every old full worksheet.

Instead maintain compact history.

Equivalent database concepts should include:

* weekly article theme;
* article hook;
* grammar focus;
* vocabulary summary;
* difficulty;
* feedback summary;
* key mistakes;
* extension idea;
* generated date.

---

# 52. Weekly History Principle

The previous `weekly-index.csv` concept becomes structured production data.

The generation context builder should normally load:

* current profile;
* current preferences;
* current learning state;
* compact weekly history;
* recent feedback;
* relevant mistake summaries.

It should NOT normally load:

> every historical Student PDF in full.

Old full material should only be loaded when there is a specific reason.

---

# 53. `eng-tutor` Relationship

Existing repository:

```text
egger-meow/eng-tutor
```

Role:

> **Curriculum and material-generation R&D upstream.**

The existing project is used to test ideas through real tutoring.

---

# 54. What `eng-tutor` Currently Represents

Relevant reusable principles include:

* learner-specific state;
* curriculum tracking;
* vocabulary tracking;
* grammar tracking;
* school syllabus mapping;
* weekly compact indexing;
* token-efficient history;
* interest-driven reading themes;
* CAP-oriented reading questions;
* 7-15 meaningful core words;
* grammar patterns placed where the learner can use them;
* retrieval-practice homework;
* printable PDF workflow;
* explicit separation between reusable rules and learner state.

These principles should inform the production engine.

---

# 55. Upstream Is Not Production Runtime

The production worker must NOT fetch `eng-tutor` every time a lesson is generated.

Wrong:

```text
Generate Week 8
↓
Fetch Jonathan branch
↓
Copy whatever exists today
```

Correct:

```text
eng-tutor experiment
↓
Review
↓
Validated rule
↓
Intentional port
↓
Production repository version
↓
Normal production generation
```

---

# 56. Why Automatic Upstream Sync Is Forbidden

`eng-tutor` is an experimental environment.

A temporary experiment should not automatically affect 100 paying children.

Examples:

* trying 30 homework questions;
* temporarily changing article difficulty;
* testing a new grammar format.

Production only receives intentionally reviewed improvements.

---

# 57. Upstream Tracking

Production repository should include:

```text
docs/eng-tutor-upstream.md
```

It should record:

* last reviewed upstream commit;
* imported principles;
* relevant source files;
* intentional production differences;
* rejected experiments;
* date of review.

---

# 58. Production Repository Responsibilities

Production GitHub repository owns:

* frontend;
* production prompts;
* curriculum definitions;
* generation rules;
* PDF source templates;
* PDF renderer;
* Supabase migrations;
* Supabase functions;
* billing integration code;
* deployment workflows;
* documentation.

Production repository is:

> **rules and code.**

---

# 59. Supabase Responsibilities

Supabase is:

> **customer state and child memory.**

It owns:

* authentication;
* parents;
* children;
* profiles;
* preferences;
* context notes;
* feedback;
* vocabulary progress;
* grammar progress;
* reading state;
* subscriptions;
* generation jobs;
* material metadata;
* compact weekly history;
* operational settings;
* waitlist;
* private file storage.

---

# 60. Student Data Must Not Live in Git

Never commit real child information into the production repository.

Do not reproduce the old student-branch model in the SaaS.

Production architecture:

```text
GitHub
=
rules

Supabase
=
children
```

---

# 61. Production Curriculum Sources

Shared curriculum assets should live in the production repository.

Examples:

```text
generator/curriculum/
├── vocab-master-2000.*
├── grammar-master.*
└── school-syllabus.*
```

The implementation format may differ from the original CSV/Markdown format.

The content model should preserve the same purpose.

---

# 62. Vocabulary Source

Vocabulary progression should use an official / appropriate junior-high common-vocabulary foundation, including the existing 1200 + 800 concept used by `eng-tutor`.

Do not blindly force all weekly words to come from a fixed list when a useful topic word is genuinely needed.

A small number of useful extension words may be allowed when clearly identified.

---

# 63. Vocabulary Selection Principle

Each weekly main reading should normally introduce approximately:

> **7 to 15 meaningful core vocabulary items.**

Do not fill the quota with words the child clearly already knows.

Do not choose artificially easy words merely because the learner is in Grade 7.

Do not choose obscure words only to make the worksheet appear advanced.

---

# 64. Core Vocabulary Defines Difficulty Ceiling

One of the strongest generation constraints:

> **The hardest meaningful vocabulary in the packet should generally be represented by the week's declared core vocabulary.**

Except for necessary proper nouns:

* article text;
* questions;
* answer choices;
* grammar examples;
* practice;
* homework

must not quietly introduce substantially harder unknown words that are not taught.

If a difficult word is necessary:

1. make it a core word;
2. or rewrite using simpler language.

---

# 65. Hidden-Difficulty Validation

Before finalizing a packet, generation should conceptually inspect:

* article;
* questions;
* options;
* examples;
* homework.

For any possibly unfamiliar non-core word:

* confirm it is already known;
* simplify it;
* or promote it to the week's vocabulary.

This requirement prevents the common AI worksheet failure:

> supposedly teaching 10 words while secretly requiring 25 more.

---

# 66. Grammar Source

Grammar progression should use a junior-high grammar framework and actual school progress.

Selection should consider:

* textbook version;
* school chapter;
* existing curriculum order;
* prior grammar status;
* recent mistakes;
* feedback;
* prerequisite concepts.

Do not advance mechanically when a foundational concept remains weak.

---

# 67. School Syllabus Mapping

The system should support common Taiwanese junior-high textbook versions.

At minimum the data model should allow textbook-version-aware progression.

The generator should be able to reconcile:

```text
general grammar sequence
+
actual school textbook progress
+
child mastery
```

The school syllabus guides the order.

It does not completely override demonstrated learner needs.

---

# 68. Weekly Package Output

Each weekly production package contains:

1. **Student PDF**
2. **Parent Answer PDF**

No teacher guide is required for the subscription MVP.

---

# 69. Why There Is No Teacher Guide

The original tutoring system is teacher-led.

紙屬英文 is primarily self-study.

The SaaS output should therefore move useful teaching explanation into:

* Student PDF;
* Parent Answer PDF;
* static learning guide.

A separate tutor-facing guide adds unnecessary product complexity.

---

# 70. Student PDF Objective

The Student PDF should be usable without a tutor sitting next to the learner.

It must explain:

* what to do;
* what to notice;
* how to approach the section;
* useful patterns;
* examples where necessary.

It should not merely contain questions.

---

# 71. Student PDF Suggested Structure

A weekly packet may contain:

```text
1. This week's goal
2. Reading / natural dialogue
3. Core vocabulary
4. Vocabulary guidance
5. Reading comprehension
6. Grammar explanation
7. Grammar patterns / shortcuts
8. Guided practice
9. Error correction / application
10. Additional challenge or production
11. Weekly review
12. Homework / retrieval practice
```

Exact section names may vary.

---

# 72. Weekly Length

The initial design target is approximately:

> **8-12 printable A4 pages**

This is a guideline, not a rigid quota.

Packet length should also respect:

* learner level;
* weekly time budget;
* difficulty;
* age;
* amount of new content.

Do not inflate pages merely to look valuable.

---

# 73. Natural Reading First

Reading passages should feel like actual language.

Avoid unnatural sentences written only to force a grammar structure into every line.

Good themes include:

* games;
* anime;
* sports;
* school life;
* technology;
* science;
* everyday situations;
* stories;
* travel;
* culture.

Interest is a hook.

It is not permission to turn every week into repetitive fan fiction.

---

# 74. Theme Memory

The system should remember:

* recent article theme;
* scenario;
* recurring character;
* article hook.

Avoid repeating essentially the same story every week.

Previous themes may intentionally return if:

* the context changes;
* it supports continuity;
* it connects naturally to new grammar.

---

# 75. Reading Comprehension Requirements

Across weekly packets, reading comprehension should include a useful mixture of:

* detail;
* sequence when appropriate;
* inference;
* main idea;
* guessing vocabulary from context;
* author's message / purpose when level-appropriate.

The system should not mechanically require every category in exactly equal numbers every week.

The overall curriculum should preserve CAP-style thinking.

---

# 76. Context-Guessing Questions

Guess-from-context questions should preferably use a declared core word.

Do not introduce a completely new difficult word solely for the purpose of asking the learner to guess it.

---

# 77. Grammar Explanation Style

Grammar should be explained in a way that a junior-high learner can use.

Prioritize:

* recognizable patterns;
* quick decision rules;
* minimal but accurate terminology;
* common confusion comparison;
* clear examples;
* error correction.

Example philosophy:

> first teach the learner how to recognize what kind of answer is missing, then give the formal pattern.

---

# 78. Grammar Tips Belong With the Student

Useful memory tricks and patterns should primarily appear in the Student PDF.

Do not hide the best explanation inside an internal guide.

The learner needs it.

---

# 79. Practice Style

Practice should include a useful mixture of:

* contextual choice;
* ordering;
* error correction;
* short production;
* reading-linked questions;
* application.

Avoid pages of isolated mechanical fill-in exercises unless repetition is intentionally needed.

---

# 80. Homework

Each normal weekly packet should end with retrieval-oriented homework.

Week 1 may use lighter homework because it is partly calibration.

Homework should primarily review material already introduced during the week.

It should not suddenly teach a new difficult concept.

---

# 81. Vocabulary Homework

Vocabulary review may combine:

* matching;
* meaning recognition;
* contextual fill-in;
* word choice;
* short translation;
* simple production.

The goal is retrieval several days after initial exposure.

---

# 82. Parent Answer PDF

The Parent Answer PDF contains:

* complete answers;
* concise explanations;
* reading answers;
* vocabulary answers;
* grammar answers;
* homework answers;
* useful mistake explanations;
* suggested observation points.

---

# 83. Parent Answer PDF Is Not the Student PDF

Answers must not appear inside the normal Student PDF.

The parent should separately access the answer file.

---

# 84. Parent Weekly Summary

The Parent Answer PDF or dashboard may include:

```text
本週學習重點
```

and:

```text
為什麼這週這樣調整
```

Example:

```text
- 上週閱讀偏簡單，本週提高一階
- do / does 再次加入複習
- 配合學校加入現在進行式
- 文章採用最近喜歡的 NBA 主題
```

This makes personalization visible.

---

# 85. PDF Design Principles

PDFs should be:

* A4;
* home-printable;
* readable in grayscale;
* not dependent on heavy full-page color;
* clear when printed on ordinary printers;
* easy to write on;
* generous enough for answers;
* visually organized but not distracting.

Avoid design that looks good only on a screen.

---

# 86. Canonical Material Source

The system should maintain a canonical structured source for every generated packet before PDF rendering.

Possible forms:

* structured JSON;
* validated Markdown;
* equivalent document model.

PDF should be a deterministic rendering step from that source.

The exact format is an implementation decision.

---

# 87. Completed Material Immutability

After a weekly packet is released:

> edits to profile or feedback must not mutate that historical packet.

If regeneration is required:

* create a new revision;
* preserve the original audit trail.

Do not silently overwrite history.

---

# 88. Learning Method Is Part of the Product

紙屬英文 should teach students:

> **how to use the packet.**

This learning method is mostly static.

It does not need to be regenerated every week.

---

# 89. Static Student Learning Guide

Recommended route:

```text
/guide
```

The guide should explain an effective learning loop.

---

# 90. Student Learning Step 1: Read First

Students should first try reading without immediately looking up every unknown word.

They should:

* read;
* use context;
* notice what they understand;
* circle unknown words;
* mark confusing sentences.

The goal is to identify difficulty before removing it.

---

# 91. Student Learning Step 2: Circle Unknown Vocabulary

The child should actively mark words that are genuinely unfamiliar.

The system may encourage:

> not every printed word needs to become a memorization item.

Focus on useful and repeated unknown words.

---

# 92. Personal Vocabulary Notebook

Students should be encouraged to keep a small physical English notebook.

Possible entry:

```text
word

meaning

sentence from the packet

my own sentence

why I forgot / misunderstood it
```

The notebook becomes:

> the child's personal weak-vocabulary record.

---

# 93. Student Learning Step 3: Answer Independently

The learner should attempt the question before checking the answer.

Recommended flow:

```text
Try
↓
Finish section
↓
Check
↓
Mark mistake
↓
Understand why
```

---

# 94. Student Learning Step 4: Classify Mistakes

For meaningful wrong answers, students should identify a reason.

Example categories:

* vocabulary unknown;
* grammar misunderstanding;
* misunderstood passage;
* confused options;
* careless reading;
* knew concept but forgot;
* did not understand question.

A short handwritten note is enough.

---

# 95. AI Literacy Is Part of the Learning Method

Modern students should learn:

> how to use AI for learning.

The product's position is not:

> ban AI.

It is also not:

> let AI do the homework.

Preferred philosophy:

> **先自己想，再用 AI 放大學習。**

---

# 96. Correct AI Learning Sequence

Recommended sequence:

```text
Try the question independently
↓
Check the answer
↓
Still don't understand why
↓
Ask AI for explanation
↓
Explain it again in your own words
↓
Try a similar question
```

---

# 97. AI as Explainer, Not Answer Machine

The system should explicitly teach:

> Ask AI "why", not merely "what is the answer?"

Good example:

```text
我選 B，但答案是 C。

不要直接只告訴我答案，
請用國中生看得懂的方式解釋
為什麼 B 錯、C 對。
```

---

# 98. AI Practice Follow-Up

Good example:

```text
我不懂為什麼這裡要用 does。

先解釋規則，
再給我兩題類似題，
不要先給答案。
```

---

# 99. AI Sentence Explanation

Good example:

```text
我看不懂這個句子。

不要直接翻譯整篇文章，
先幫我拆這句的文法結構，
再用簡單一點的方式說明。
```

---

# 100. AI Vocabulary Learning

Good example:

```text
我一直記不住 although。

可以用例句、情境和記憶方式
讓我真的懂這個字嗎？
```

---

# 101. Bad AI Usage

Discourage:

```text
幫我把整份作業寫完。
```

The product should normalize:

> AI as tutor / explainer / practice partner.

Not AI as answer copier.

---

# 102. Asking AI With a Photo

Students may photograph a wrong question and ask an external AI tool.

The learning guide should tell them:

1. photograph only the relevant question;
2. avoid personal information;
3. explain which option they originally selected;
4. ask why the reasoning was wrong;
5. ask for another similar question.

---

# 103. Photo Privacy

Students should be reminded not to upload:

* full name;
* phone number;
* address;
* school ID;
* unrelated personal information

when using third-party AI tools.

---

# 104. AI Brand Neutrality

The learning method may mention tools such as:

* ChatGPT;
* Gemini;
* other suitable AI assistants.

The product must not depend on one external consumer chatbot for this learning method.

---

# 105. AI Usage Is Optional

A student does not need to use AI every week.

AI literacy is:

> an educational advantage and recommended method.

It is not mandatory usage tracking.

---

# 106. Weekly PDF Learning Reminder

The full learning guide lives on the website.

The weekly Student PDF may include a small reminder:

```text
這份教材怎麼用？

1. 先自己讀
2. 圈起不會的字
3. 先作答再對答案
4. 錯題找出「為什麼」
5. 真的不懂，再請 AI 解釋
```

Optionally include a QR code or short link to `/guide`.

---

# 107. Parent Guide

The website should also contain a parent-facing learning guide.

The parent does not need to become an English tutor.

The parent role is:

```text
Provide structure
↓
Give answer access after completion
↓
Observe
↓
Submit feedback
```

---

# 108. What Parents Should Observe

Parents may notice:

* Was it too easy?
* Was it too hard?
* How much was completed?
* Which section was repeatedly wrong?
* Which article interested the child?
* What did the child complain about?
* What did the child enjoy?
* What is school currently teaching?
* Is there an upcoming exam?

---

# 109. Feedback Should Be Easy

Feedback is essential, but must not become homework for the parent.

A parent should be able to submit minimal useful feedback in roughly seconds.

Required quick fields should remain small.

Optional fields can be detailed.

The default interface must use progressive disclosure:

* quick feedback is visible immediately;
* quick feedback requires no typing;
* optional observations remain collapsed until the parent chooses to add detail;
* quick feedback alone is a complete, valid submission.

The weekly experience should feel like a brief check-in, not a questionnaire or homework for the parent.

---

# 110. Weekly Feedback Quick Fields

Recommended quick fields:

```text
difficulty
completion_rate
weak_area
```

Prefer tap-friendly choices over open text inputs for these fields.

Difficulty:

* `too_easy`
* `good`
* `too_hard`

Completion:

* `0`
* `25`
* `50`
* `75`
* `100`

Weak area:

* `vocabulary`
* `grammar`
* `reading`
* `mixed`
* `none`

---

# 111. Extended Feedback

Optional fields should include:

* mistakes;
* difficult points;
* child comments;
* parent observations;
* current school progress;
* upcoming exam;
* new interest;
* changed interest;
* free-text context.

Keep these fields behind one clearly labeled optional-details control. When expanded, use short prompts and examples so the parent knows what is useful, while allowing any field to remain blank. Existing detailed feedback should expand automatically when the parent returns to edit it.

Suggested logical structure:

```text
weekly_feedback

id
student_id
material_id
difficulty
completion_rate
weak_area
mistakes_text
child_comments
parent_comments
school_progress_update
interest_update
created_at
```

---

# 112. Child Voice

The product should preserve a lightweight way for parents to report what the child actually says.

Examples:

```text
文章太幼稚了。
```

```text
這篇很好看。
```

```text
文法完全看不懂。
```

```text
單字都會。
```

This can be valuable context for personalization.

---

# 113. Feedback Effects

Feedback affects:

> future materials only.

Submitting feedback must not trigger immediate regeneration.

Each promised next delivery already has a generation job. Feedback submitted on or before that job's cutoff makes the job eligible for the normal worker queue; it does not create a second job. Feedback submitted after the cutoff is reserved for the following cycle.

Correct flow:

```text
Week 4
↓
Feedback
↓
Memory update
↓
Next scheduled Week 5 generation
```

---

# 114. Generation Must Use Explicit Jobs

Do NOT generate materials merely because some database row changed.

Profile updates, interest updates, and feedback inserts do not directly equal generation requests.

Use an explicit queue:

```text
generation_jobs
```

---

# 115. Generation Job Suggested Structure

```text
generation_jobs

id
student_id
target_week
scheduled_for
status
reason
idempotency_key
attempt_count
rule_version
created_at
started_at
completed_at
error_code
error_message
```

Possible statuses:

* `pending`
* `processing`
* `completed`
* `failed`
* `canceled`

Possible reasons:

* `initial_generation`
* `weekly_generation`
* `manual_retry`
* `admin_regeneration`

---

# 116. Next Generation Time

Every active child should have a weekly generation cadence represented through:

```text
next_generation_at
```

or equivalent scheduled-job logic.

The system should distribute generation workload rather than accidentally scheduling all 100 students at one exact moment when avoidable.

`next_generation_at` is an operational state representing an internal generation deadline. It is not automatically a parent-facing delivery date; its meaning must be interpreted according to the current material and job state. If an unreleased prepared material already exists, that material's `release_at` is the authoritative parent-visible delivery date rather than an advanced generation deadline for a subsequent cycle.


---

# 117. MVP Generation Worker

Initial intended orchestrator:

> **Scheduled ChatGPT / ChatGPT Work scheduled task**

The task may run daily.

Its job is to:

1. read due `generation_jobs`;
2. claim eligible jobs;
3. read production generation rules;
4. load permitted child state from Supabase;
5. generate canonical material source;
6. produce or invoke deterministic PDF rendering;
7. store outputs privately;
8. write material metadata;
9. update job status;
10. record actionable failures.

---

# 118. Worker Reads Two Sources

Normal production generation combines:

## Source A: Production repository

Contains:

* curriculum;
* prompt;
* material rules;
* validation rules;
* output schema;
* PDF style rules.

## Source B: Supabase

Contains:

* current child profile;
* current preferences;
* school progress;
* learning memory;
* compact weekly history;
* recent feedback;
* current job;
* subscription entitlement.

Concept:

```text
Production rules
+
child state
=
next packet
```

---

# 119. Worker Does Not Normally Read `eng-tutor`

Normal weekly generation reads:

> the production repository.

Not the experimental upstream repository.

`eng-tutor` is reviewed during curriculum-engine development.

Not during every customer generation.

---

# 120. Scheduled Worker and GitHub Actions

For MVP:

> GitHub Actions should primarily handle CI, validation, build, and frontend deployment.

It should not independently create extra weekly lessons behind the scheduled worker's back.

This avoids two competing generation systems.

---

# 121. Future Worker Migration

Scheduled ChatGPT is not a permanent architectural dependency.

After validation, the worker may intentionally migrate to:

```text
backend scheduler / cron
↓
generation_jobs
↓
LLM API
↓
generation engine
↓
PDF renderer
↓
Supabase
```

A future GitHub Actions based job runner may also be evaluated if appropriate.

That migration must be explicit.

The frontend and core database model should not depend on which worker implementation is currently used.

---

# 122. Generation Capacity

Operational job limits should be configurable.

Do not permanently hardcode an arbitrary number such as 15 jobs/day as a product rule.

The actual worker limit should be chosen so all promised weekly materials are produced on time.

The public product cap is:

> 100 active children.

The internal job-processing limit is an operational setting.

The default normal capacity is 15 jobs per daily run. It is not a delivery cap:

* jobs at or beyond their generation deadline are mandatory;
* every mandatory job is claimed even when the count exceeds normal capacity;
* when mandatory work is below capacity, eligible normal work fills the remaining slots;
* unused capacity never causes a job that is still waiting for feedback to run early.

Each child has an independent rolling cadence. A successful delivery schedules the next `release_at` exactly seven days after the existing release anchor, not seven days after generation happens to finish. The feedback cutoff is 48 hours before release and the generation deadline is 24 hours before release.

---

# 123. Job Claiming

A worker must claim a job before processing it.

A job with a preceding `source_material_id` is eligible only when qualifying feedback was submitted by `feedback_cutoff_at`, or that cutoff has passed. When the cutoff passes without feedback, generation continues from existing learning state and records `feedback_missing = true`; missing feedback must not be interpreted as successful completion.

Claim priority is mandatory work first, then earliest `generation_due_at`, then oldest creation time. Claiming must remain atomic under concurrent workers.

Two workers or retries must not successfully generate the same target release twice unintentionally.

Use:

* atomic state transition;
* idempotency key;
* appropriate unique constraints.

---

# 124. Idempotency

Retries must not produce accidental duplicate materials.

A generation target should have a stable key such as:

```text
student_id + target_week + generation_revision
```

or equivalent.

---

# 125. Failed Job Behavior

Failures must never silently disappear.

On failure:

```text
status = failed
attempt_count += 1
error_code = ...
error_message = ...
```

Operator must be able to:

* inspect;
* retry;
* cancel;
* regenerate.

---

# 126. Quality Failure vs Technical Failure

A lesson may technically generate but still be poor.

The system should distinguish:

* technical failure;
* quality rejection.

Future operator flow should allow:

* reject;
* regenerate;
* replace.

During early beta, manual quality inspection is acceptable.

---

# 127. Completed Job Metadata

Every completed generation should preserve:

* job ID;
* student ID;
* target week;
* prompt / rule version;
* generator version;
* model identifier;
* generation timestamp;
* relevant input snapshot identifiers;
* artifact paths.

---

# 128. Traceability

If a parent reports:

> Week 8 is weird.

An operator should be able to determine:

* which rules generated it;
* which model generated it;
* which feedback was available;
* which profile state was used;
* which curriculum state was used.

---

# 129. Prompt Versioning

Production prompt files belong in Git.

Do not place the primary prompt only inside a mutable database field for MVP.

Git provides:

* history;
* review;
* rollback;
* commit identifiers.

Every material should record the relevant git-based rule / prompt version.

---

# 130. Model Versioning

Every material should record the model used.

Do not assume "latest model" is sufficient for auditability.

---

# 131. Weekly Materials Table

Suggested logical structure:

```text
weekly_materials

id
student_id
week_number
revision
generation_job_id
status

student_pdf_path
parent_answer_pdf_path
source_path_or_payload_reference

article_theme
article_hook
grammar_topics
vocabulary_summary
learning_adjustment_summary

prompt_version
generator_version
model_name

generated_at
released_at
created_at
```

---

# 132. Weekly Material Summary Replaces Full-History Reading

`weekly_materials` should contain enough compact metadata to support future generation without opening historical PDFs.

Suggested summary fields include:

* theme;
* hook;
* grammar topic;
* core vocabulary;
* difficulty;
* major mistakes;
* extension idea;
* parent feedback summary.

---

# 133. Subscription Provider

Initial planned provider:

> **Paddle**

Reason:

* recurring subscriptions;
* suitable SaaS billing workflow;
* Merchant of Record model;
* low setup complexity for early product validation.

Provider availability, pricing, Taiwan support, and current commercial requirements must be revalidated immediately before real billing launch.

Do not hardcode assumptions that may change over time.

---

# 134. Subscription Table

Suggested logical structure:

```text
subscriptions

id
student_id
provider
provider_customer_id
provider_subscription_id
status
plan_code
price_twd
founding_status
current_period_start
current_period_end
cancel_at_period_end
created_at
updated_at
```

---

# 135. Subscription States

Possible internal states:

* `trial`
* `active`
* `past_due`
* `canceled`
* `expired`

Additional provider-specific states may be mapped internally.

---

# 136. Child ID in Billing Metadata

When supported by the billing provider, attach a stable child identifier through provider metadata / custom data.

Webhook processing must be able to map the payment event back to the correct child safely.

Never rely only on a parent's email to determine which child's subscription changed.

---

# 137. Billing Webhook

Billing webhook must:

* verify provider signature;
* remain server-side;
* update subscription state idempotently;
* never trust arbitrary browser-submitted subscription status.

---

# 138. Entitlement

Generation eligibility should use an explicit entitlement decision.

Examples:

* founding free Week 1;
* first-month active subscription;
* standard active subscription.

The generator should not infer entitlement merely from the existence of a `students` row.

---

# 139. Cancellation

Recommended behavior:

* cancellation stops future paid entitlement after the current paid period;
* already generated historical materials remain accessible to the owning parent while the account remains available;
* future generations stop when entitlement ends.

Exact legal/refund language must be displayed appropriately before paid launch.

---

# 140. Pricing Configuration

Do not scatter price numbers across components.

Maintain centralized product configuration for:

* standard monthly price;
* standard annual price;
* founding first-month price;
* founding cohort size;
* capacity.

Initial values:

```text
standard_monthly_price = 499 TWD
standard_annual_price = 4999 TWD
founding_first_month_price = 299 TWD
founding_child_limit = 30
service_child_capacity = 100
```

---

# 141. Supabase Core Tables

Expected logical entities:

```text
parents
students
student_profiles
student_preferences
student_context_notes

student_vocab_progress
student_grammar_progress
student_learning_state

weekly_feedback
weekly_materials

generation_jobs
subscriptions

enrollment_settings
waitlist
```

The final physical schema may normalize or combine some entities if ownership and semantics remain clear.

---

# 142. Parent Table

Suggested:

```text
parents

id
user_id
display_name
created_at
updated_at
```

`user_id` links to Supabase Auth.

---

# 143. Enrollment Settings

Suggested concept:

```text
enrollment_settings

capacity
status
founding_limit
founding_used
updated_at
```

Active count should preferably be computed from authoritative child / entitlement state rather than manually typed when practical.

---

# 144. Private Storage

Generated material belongs in private Supabase Storage.

Example:

```text
students/{student_id}/{week}/{revision}/student.pdf
students/{student_id}/{week}/{revision}/answer.pdf
```

Exact naming may change.

---

# 145. Signed Downloads

Parent downloads should use authenticated access or short-lived signed URLs.

Do not expose permanent public PDF URLs.

---

# 146. Privacy Principles

The product deals with minors.

Data minimization is mandatory.

Do not require information merely because it might be interesting.

---

# 147. Child Personal Information

Prefer:

* nickname;
* grade;
* textbook version;
* learning information.

Avoid requiring:

* legal name;
* exact home address;
* exact birthdate;
* school ID;
* unnecessary school identification.

---

# 148. Git Privacy

Never commit:

* real child profile;
* parent email;
* private feedback;
* generated private PDFs;
* subscriptions;
* authentication data.

The production repo can remain private during MVP, but privacy rules must still assume Git is not a customer database.

---

# 149. Row Level Security

RLS is required for exposed Supabase data.

A parent must only access records that belong to their own children.

Equivalent ownership rule:

```text
auth user
↓
parent
↓
owned student
↓
owned child resources
```

---

# 150. RLS Coverage

Ownership protections apply to:

* students;
* profiles;
* preferences;
* context notes;
* feedback;
* materials;
* subscriptions;
* signed file access.

---

# 151. Service Role

Supabase service-role credentials are server-only.

Never expose them to:

* browser JavaScript;
* public repository;
* static GitHub Pages bundle.

---

# 152. Browser Configuration

The browser may receive only intentionally public Supabase client configuration such as:

* Supabase project URL;
* publishable / anon key.

Security must come from:

> authentication + RLS.

Not from pretending client configuration is secret.

---

# 153. Logging Privacy

Operational logs should prefer opaque IDs.

Avoid logging:

* full lesson content;
* parent free-text feedback;
* personal child details

unless genuinely necessary for debugging.

---

# 154. Frontend Hosting

Initial frontend hosting:

> **GitHub Pages**

This is acceptable because the MVP frontend can be a static SPA.

---

# 155. Frontend Stack

Recommended:

* React;
* Vite;
* TypeScript.

The exact UI library is not a core product contract.

---

# 156. GitHub Pages Routing

Routing must work correctly when directly opening internal URLs.

Implementation may use:

* GitHub Pages compatible SPA fallback;
* hash routing;
* equivalent static-host-safe routing.

Do not ship a dashboard where browser refresh produces a GitHub 404.

---

# 157. Backend Responsibilities

GitHub Pages must not contain privileged backend logic.

Backend / server-side responsibilities include:

* billing webhooks;
* privileged admin actions;
* generation orchestration helpers;
* signed file logic where necessary;
* service-role database access.

Use Supabase Edge Functions or another appropriate server-side component.

---

# 158. PDF Rendering Architecture

PDF generation should be treated as its own deterministic component.

The existing `eng-tutor` Playwright/Chromium renderer is a useful upstream reference.

Production implementation may port or redesign it.

Requirements:

* server-side or trusted-job execution;
* A4;
* repeatable layout;
* no secrets in client;
* no committing child source to Git.

The exact execution environment should be chosen during implementation based on Chromium / rendering support.

---

# 159. Public Routes

Recommended MVP routes:

```text
/
```

Landing / marketing / login entry.

```text
/dashboard
```

Parent dashboard.

```text
/children/new
```

Create child.

```text
/children/:id
```

Child overview.

```text
/children/:id/edit
```

Edit profile and preferences.

```text
/children/:id/materials
```

Material history.

```text
/feedback/:materialId
```

Weekly feedback.

```text
/guide
```

Student / parent learning guide.

```text
/about
```

Founder story.

```text
/billing
```

Billing overview.

```text
/waitlist
```

Capacity-full state.

Additional legal routes may be required before paid launch.

---

# 160. Parent Dashboard

Main dashboard should be child-centric.

Example:

```text
我的孩子

Jonathan
國一 | 翰林
訂閱中

本週教材
[下載學生教材]

家長答案
[下載答案]

下一次交付
8月19日（三）開放下一份教材

本週回饋已收到。

[編輯孩子資料]
```

## Temporal Horizon Invariant

The parent dashboard has a maximum temporal horizon of the **current learning state plus exactly one immediate next parent-visible event**.

* The dashboard displays the current released material (Week N) and the immediate next delivery (Week N+1). It must never expose `Week N+2` or subsequent internal queue cycles while the parent is operating on Week N.
* When an unreleased prepared material exists, its `release_at` is the authoritative next-delivery date.
* Later queued cycles, queue jobs, and generation deadlines are internal operational state and must not leak into the parent card.
* When a prepared material exists alongside a released current material, there is exactly one unified next-delivery surface rendered in the card.
* Feedback copy must remain neutral and factual (e.g. `本週回饋已收到。`) without asserting unprovable causal promises about already-generated materials.

---

# 161. Multiple Children UI

Multiple children should appear as independent cards or sections.

Each shows:

* grade;
* subscription status;
* current week;
* immediate next parent-visible delivery;
* feedback status.

Never make the parent guess which child a PDF belongs to.


---

# 162. Edit Profile UX

Editing should clearly state:

> 更新會影響之後產生的教材，不會改掉已經產出的教材。

Interests should be easy to add/remove.

Free text should remain available.

---

# 163. Marketing: Why Paper

The landing page may explain:

* paper reduces competing digital distractions during the study session;
* learners can annotate naturally;
* handwriting supports active work;
* completed work is visible to parents;
* students do not need to navigate another app.

Avoid exaggerated scientific claims without evidence.

---

# 164. Marketing: Why AI

The message is not:

> AI will study for your child.

Preferred message:

> **讓孩子提早學會怎麼用 AI 學習，而不是用 AI 交作業。**

---

# 165. Marketing: Parent Effort

A core value proposition:

> Parents do not need to design worksheets every week.

Parent responsibilities remain lightweight:

```text
Tell us about the child
↓
Print
↓
Observe
↓
Give short feedback
```

---

# 166. Marketing: Why Not Just ChatGPT

The website may explain the difference without attacking ChatGPT.

A generic chatbot starts from a prompt.

紙屬英文 maintains:

* curriculum;
* progress;
* previous themes;
* previous mistakes;
* weekly history;
* feedback;
* printable structure;
* future scheduling.

The value is:

> **continuity and educational systemization.**

---

# 167. Marketing: Why Not Just a Workbook

A static workbook is consistent but generic.

紙屬英文 aims to be:

> consistent and personal.

Example:

```text
一本參考書不知道孩子上週把 do / does 全做錯。

紙屬英文知道。
```

---

# 168. Analytics and Early Funnel

MVP should measure at least:

```text
landing view
→ signup
→ child created
→ profile completed
→ Week 1 generated
→ Student PDF downloaded
→ feedback submitted
→ paid conversion
→ month 2 retention
```

---

# 169. Core Early Metrics

Important metrics:

* signup conversion;
* profile completion;
* Week 1 generation success;
* PDF download rate;
* feedback submission rate;
* founding free-to-paid conversion;
* month-1 to month-2 retention;
* active children;
* generation failure rate;
* regeneration rate.

---

# 170. Primary Validation Metric

The most important early product signal is not number of generated PDFs.

It is:

> **Do parents keep using and paying after experiencing multiple weekly cycles?**

---

# 171. Secondary Learning Signal

Another important signal:

> Does Week 2 visibly become more appropriate after Week 1 feedback?

If not, the product's central personalization promise is not working.

---

# 172. Operational Admin Needs

During beta, operator must be able to inspect:

* active children;
* pending jobs;
* overdue jobs;
* failed jobs;
* generation attempts;
* subscription state;
* storage artifacts;
* feedback;
* capacity.

A polished admin app is not required initially.

Supabase Dashboard plus targeted internal tooling is acceptable.

---

# 173. Manual Recovery

Operator needs the ability to:

* retry failed generation;
* cancel a stuck job;
* regenerate a bad packet;
* inspect relevant input state;
* fix mistaken profile state;
* adjust next-generation schedule.

---

# 174. Material Quality Review During Beta

For the first users, manual spot checks are encouraged.

The early 100-child cap exists partly to keep this operationally possible.

---

# 175. Repository Structure

Recommended initial structure:

```text
/
├── SPEC.md
├── README.md
├── AGENTS.md
│
├── apps/
│   └── web/
│       ├── src/
│       └── ...
│
├── generator/
│   ├── prompts/
│   │   └── weekly-material.md
│   ├── curriculum/
│   │   ├── vocab-master.*
│   │   ├── grammar-master.*
│   │   └── school-syllabus.*
│   ├── schemas/
│   ├── validators/
│   └── ...
│
├── pdf/
│   ├── templates/
│   ├── styles/
│   └── ...
│
├── supabase/
│   ├── migrations/
│   └── functions/
│
├── docs/
│   └── eng-tutor-upstream.md
│
└── .github/
    └── workflows/
```

Exact implementation can evolve.

---

# 176. `SPEC.md` Must Remain Self-Contained

Supporting documentation may exist for implementation detail.

However, critical product behavior must remain discoverable here.

Do not repeat the previous failure mode:

> reduce SPEC.md to ten paragraphs and hide the actual product inside scattered docs.

---

# 177. Suggested Supporting Docs

Optional future elaboration:

```text
docs/architecture.md
docs/data-model.md
docs/generation-workflow.md
docs/product-rules.md
docs/eng-tutor-upstream.md
docs/operations.md
```

These documents elaborate.

They do not replace the canonical decisions above.

---

# 178. CI / Deployment

GitHub Actions may handle:

* lint;
* tests;
* type checking;
* frontend build;
* migration validation;
* deployment to GitHub Pages.

MVP lesson generation remains orchestrated separately.

---

# 179. Testing Requirements

At minimum test:

* authentication ownership;
* RLS;
* parent with multiple children;
* no sibling state leakage;
* job idempotency;
* generation eligibility;
* founding pricing state;
* 100-child capacity enforcement;
* billing webhook idempotency;
* private file access;
* feedback ownership;
* profile edit behavior;
* historical packet immutability.

---

# 180. Generator Validation Requirements

Automated or semi-automated validation should eventually check:

* required sections exist;
* no student answers leak into Student PDF;
* answer key covers all answerable questions;
* declared core vocabulary count reasonable;
* vocabulary appears in expected places;
* no obvious hidden hard vocabulary;
* grammar focus matches selected topic;
* PDF renders successfully;
* Homework exists;
* material metadata exists.

---

# 181. Personalization Validation

Week N generation should demonstrably use relevant current state.

Tests should verify that changing:

* interest;
* difficulty feedback;
* grammar mistake;
* school progress

can alter appropriate future output.

---

# 182. Privacy Testing

Test explicitly that:

* Parent A cannot query Parent B's child;
* siblings do not share learning progress;
* unsigned public PDF URLs do not work;
* service-role credentials never appear in frontend bundles.

---

# 183. MVP Non-Goals

Do NOT add the following without an explicit later decision:

* native iOS app;
* native Android app;
* student social network;
* public student profiles;
* chatroom;
* live tutor marketplace;
* real-time AI tutor chat;
* built-in general-purpose chatbot;
* video lessons;
* livestream classes;
* streaks;
* points;
* badges;
* leaderboards;
* referral program;
* sibling discount;
* family bundle;
* teacher dashboard;
* school dashboard;
* school SIS integration;
* automatic grading from photographed worksheets;
* full online placement exam;
* automatic `eng-tutor` synchronization;
* real-time regeneration after each profile edit;
* huge analytics dashboard;
* multiple payment providers at launch;
* monthly progress report at MVP;
* LINE bot at MVP.

---

# 184. Explicit Product Simplicity Rule

When considering a feature, ask:

> **Does this materially improve the loop between the child's current state and next week's paper material?**

If not:

> it is probably not MVP.

---

# 185. MVP Milestone 1: Foundation

Build:

* repository structure;
* frontend shell;
* Supabase connection;
* Auth;
* parents;
* students;
* RLS.

Success:

> one parent can create and safely manage multiple children.

---

# 186. MVP Milestone 2: Child Memory

Build:

* profile;
* preferences;
* context notes;
* basic learning state;
* editable child page.

Success:

> parent can continuously update who the child currently is.

---

# 187. MVP Milestone 3: Generation Core

Build:

* generation job model;
* generation context builder;
* production prompt;
* curriculum data;
* Student source;
* Parent Answer source.

Success:

> one job creates one valid personalized weekly package.

---

# 188. MVP Milestone 4: PDF

Build:

* deterministic Student PDF;
* deterministic Parent Answer PDF;
* private storage;
* authenticated download.

Success:

> parent can print both files reliably.

---

# 189. MVP Milestone 5: Feedback Loop

Build:

* quick feedback;
* extended feedback;
* memory update;
* next-week personalization.

Success:

> Week 2 visibly reflects Week 1 feedback.

---

# 190. MVP Milestone 6: Billing

Build:

* Paddle checkout;
* subscription metadata;
* webhook;
* child entitlement;
* founding offer;
* standard pricing.

Success:

> subscription state controls future generation correctly.

---

# 191. MVP Milestone 7: Public Launch Surface

Build:

* landing page;
* product explanation;
* founder section;
* AI-learning explanation;
* paper-first explanation;
* pricing;
* real capacity counter;
* Founding 30 CTA;
* waitlist state.

Success:

> an unfamiliar parent can understand and start without manual explanation.

---

# 192. Definition of Done: Account

A parent can:

1. open the website;
2. authenticate;
3. create Child A;
4. create Child B;
5. edit both;
6. never see cross-child state contamination.

---

# 193. Definition of Done: First Material

For an eligible child:

1. profile exists;
2. generation job exists;
3. worker claims job;
4. production rules are read;
5. child state is read;
6. canonical packet source is generated;
7. Student PDF renders;
8. Parent Answer PDF renders;
9. both are stored privately;
10. parent can download them;
11. metadata records generation version.

---

# 194. Definition of Done: Feedback Personalization

After Week 1:

1. parent reports difficulty;
2. parent reports completion;
3. parent reports mistakes;
4. parent optionally reports child comment;
5. parent changes current interest;
6. Week 2 is scheduled;
7. Week 2 uses relevant new state;
8. personalization summary makes the change visible.

---

# 195. Definition of Done: Billing Isolation

If Parent A has:

```text
Child A active
Child B canceled
```

then:

* Child A continues generating;
* Child B stops generating when entitlement ends;
* histories remain independent.

For either monthly or annual checkout, the browser chooses only a semantic plan. The backend maps that plan to an allowlisted Paddle price, and a verified webhook must validate the price, currency, amount, and billing interval before granting entitlement.

---

# 196. Definition of Done: Founding Offer

For an eligible founding child:

```text
Week 1 free
↓
First paid month 299
↓
Following paid months 499
```

If the child chooses annual billing, the charge is 4,999/year and founding eligibility is neither applied nor redeemed by that annual checkout.

The transition must be traceable and not depend on manual memory.

---

# 197. Definition of Done: Capacity

When capacity is below 100:

> activation can proceed.

When active service reaches 100:

* new activation stops;
* existing service continues;
* landing shows full state;
* visitor can join waitlist.

The displayed count is real.

---

# 198. Definition of Done: Security

The beta is not ready until:

* RLS is enabled and tested;
* private PDFs are actually private;
* one family cannot read another family's state;
* service-role keys are server-only;
* real child data is absent from Git.

---

# 199. Definition of Done: Generation Reliability

The operator can:

* see pending work;
* see failures;
* identify child/job by opaque ID;
* retry safely;
* avoid duplicate material;
* inspect version metadata.

---

# 200. Definition of Done: Learning Method

A new parent can find a clear guide explaining:

* how the child should read;
* how to mark unknown words;
* how to use a notebook;
* how to review wrong answers;
* how to use AI correctly;
* how the parent should provide feedback.

---

# 201. Post-100 Review

Reaching 100 active children triggers an intentional product and infrastructure review.

Review areas:

* worker architecture;
* model/API costs;
* scheduled ChatGPT reliability;
* generation latency;
* PDF rendering capacity;
* support workload;
* material QA;
* subscription economics;
* Paddle cost;
* Taiwan local payment alternatives;
* Supabase plan;
* logging / observability;
* automation;
* retention.

Only after review should the service cap be raised.

---

# 202. Future Infrastructure

Possible post-validation worker:

```text
Scheduler
↓
Supabase generation_jobs
↓
API worker
↓
LLM
↓
validator
↓
PDF renderer
↓
Supabase Storage
```

The architecture should allow migration without rewriting the parent product.

---

# 203. Future Product Possibilities

After validation, possible features include:

* monthly progress reports;
* exam review packs;
* winter / summer packs;
* sibling discount;
* LINE notifications;
* Google login;
* short placement assessment;
* richer mastery modeling;
* automatic mistake-photo analysis;
* parent progress charts.

None are prerequisites for MVP.

---

# 204. Agent Instructions

Any coding agent entering the repository must:

1. Read `SPEC.md`.
2. Treat it as the product contract.
3. Inspect existing code before major architecture changes.
4. For curriculum or generator changes, check `docs/eng-tutor-upstream.md`.
5. When useful, inspect the latest relevant files in `egger-meow/eng-tutor`.
6. Never create runtime dependency on `eng-tutor`.
7. Never commit real child data.
8. Preserve parent ownership boundaries.
9. Preserve one-child-one-subscription semantics.
10. Preserve paper-first philosophy.
11. Preserve feedback-driven personalization.
12. Preserve explicit generation jobs.
13. Preserve compact historical memory.
14. Preserve generation versioning.
15. Avoid adding non-goal features without explicit instruction.

---

# 205. Curriculum Agent Instructions

For weekly-material work specifically:

1. Do not generate a generic worksheet.
2. Read production curriculum rules.
3. Read child level and state.
4. Read compact previous-week history.
5. Read recent feedback.
6. Avoid theme repetition.
7. Choose meaningful vocabulary.
8. Keep hidden vocabulary difficulty controlled.
9. Use natural language.
10. Include CAP-style reading thinking.
11. Explain grammar for self-study.
12. Include retrieval practice.
13. Produce Student and Parent outputs separately.
14. Record why this week differs from the previous week.

---

# 206. Core Architectural Summary

```text
                 eng-tutor
              R&D upstream
                   │
            reviewed improvements
                   │
                   ▼
         Production GitHub repo
     rules / prompts / curriculum / web
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
GitHub Pages                Worker
Parent frontend        Scheduled ChatGPT MVP
       │                       │
       └───────────┬───────────┘
                   ▼
                Supabase
     Auth / child memory / feedback
     jobs / subscriptions / materials
                   │
                   ▼
           Private weekly PDFs
```

---

# 207. Core Business Summary

```text
Parent account
↓
one or more children
↓
each child has independent subscription
↓
499 TWD / month / child
or 4,999 TWD / year / child
```

Founding cohort:

```text
First 30 children
↓
Week 1 free
↓
First paid month 299
↓
Then 499/month
```

Early service capacity:

```text
100 active children maximum
↓
Capacity reached
↓
Pause new enrollment
↓
Upgrade system
↓
Open next cohort later
```

---

# 208. Core Learning Summary

```text
Personalized packet
↓
Child reads
↓
Marks unknown words
↓
Answers independently
↓
Checks answer
↓
Finds why mistakes happened
↓
Uses AI when explanation is needed
↓
Records useful learning
↓
Parent observes
↓
Parent gives feedback
↓
Next packet changes
```

---

# 209. Brand Summary

紙屬英文 should ultimately communicate:

> **不是多一個叫孩子盯著螢幕的學習 App。**

> **也不是每週叫 AI 隨機出一份題目。**

It is:

> **一套真的會記得孩子、每週重新替他做教材的學習系統。**

And the learning philosophy is:

> **AI 不替孩子思考。AI 幫孩子更會思考。**

---

# 210. Final Product Rule

When uncertain about a product decision, prioritize this loop:

> **了解這個孩子 → 做出更適合他的教材 → 讓他真的動筆學 → 看見他哪裡卡住 → 下一週做得更好。**

Everything else is secondary.
