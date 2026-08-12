# 紙屬英文 — Product & Technical Specification

> Working name: **紙屬英文**
> Status: MVP Specification
> Primary market: Taiwan
> Primary audience: Parents of junior-high students
> Core learning goal: Junior-high English proficiency aligned toward Taiwan CAP / 國中教育會考
> Pricing target: **NT$499 / child / month**

---

# 1. Product Vision

紙屬英文是一個以「每週專屬紙本教材」為核心的英文學習訂閱服務。

產品不要求學生長時間使用網站、App 或 AI 聊天工具。

AI、學生模型、學習紀錄與教材生成系統運作在幕後；學生主要拿到的是：

* 可列印的英文教材 PDF
* 實際閱讀內容
* 單字練習
* 文法學習
* 閱讀理解
* 紙筆作答
* 每週 Homework

家長則透過網站：

* 建立孩子資料
* 更新孩子興趣、程度與學校進度
* 下載教材
* 下載答案
* 提供每週學習回饋
* 管理每個孩子的訂閱

核心理念：

> **AI 負責個人化，孩子負責真正學習。**

產品價值不是「AI 可以出題」，而是：

> 系統長期記得這個孩子學過什麼、錯過什麼、喜歡什麼、現在學校教到哪裡，並根據每週實際回饋持續調整下一份教材。

---

# 2. Target User & Scope

## 2.1 Primary target

第一階段主要服務：

* 台灣國中生
* 國一至國三
* 可接受小六升國一學生提前開始
* 家長為主要付費者與帳號持有人

核心教學終點：

> 對齊台灣國中教育會考（CAP）所需要的英文基礎能力。

不以特定年級作為絕對難度限制。

教材難度應由：

* 孩子實際程度
* 學習歷史
* 學校進度
* 家長回饋
* 錯題狀況

共同決定。

---

# 3. Core Learning Philosophy

紙屬英文延續既有 `egger-meow/eng-tutor` 所驗證的教材設計方向。

主要教學方式：

> **由自然文章與情境帶出單字、文法與閱讀理解能力。**

教材不應退化為：

* 大量孤立單字背誦
* 無情境文法填空
* 單純題庫
* 隨機 AI worksheet

教材應盡量：

* 使用自然英文情境
* 貼近學生興趣
* 使用實用且適當難度的字彙
* 在文章中自然帶入本週文法
* 逐步累積 CAP 閱讀能力
* 具備清楚的 self-study guidance

---

# 4. Relationship with `eng-tutor`

Existing repository:

`egger-meow/eng-tutor`

定位：

> **教材 R&D 實驗室與 upstream reference。**

`eng-tutor` 目前透過真實家教學生持續驗證：

* 文章難度
* 字彙挑選
* 文法順序
* CAP 題型設計
* Homework
* 教材節奏
* PDF 排版
* weekly-index 記憶策略
* 實際學生對教材的反應

## 4.1 Production repository relationship

紙屬英文的新 repository 不應重新發明一套教材邏輯。

在修改以下功能之前，開發者或 agent 應優先檢查 `eng-tutor` 最新有效設計：

* weekly material generation
* vocabulary selection
* grammar progression
* CAP alignment
* article structure
* reading comprehension design
* Homework design
* PDF generation
* historical topic avoidance
* token-efficient learning history

但：

> **Production runtime 不依賴 `eng-tutor`。**

Scheduled worker 在正常生成教材時：

* 不應 runtime fetch `eng-tutor`
* 不應自動套用 `eng-tutor` 未驗證變更
* 不應直接讀 Jonathan branch 當 production prompt

正確流程：

```text
eng-tutor
   ↓
真實教學驗證
   ↓
人工 / agent review
   ↓
port validated principle
   ↓
紙屬英文 production repo
```

## 4.2 Upstream tracking

Production repo 應保留：

`docs/eng-tutor-upstream.md`

至少記錄：

* 最後 review 的 upstream commit
* 同步了哪些設計原則
* 哪些設計刻意沒有同步
* SaaS / self-study 與真人家教模式的差異

---

# 5. Business Model

## 5.1 Account model

帳號屬於：

> **Parent**

教材與訂閱屬於：

> **Child**

一位家長可以建立多位孩子。

例如：

```text
Parent
├── Child A
│   └── Subscription A
├── Child B
│   └── Subscription B
└── Child C
    └── no subscription
```

---

# 6. Pricing

Initial target pricing:

> **NT$499 / child / month**

每位孩子獨立計價。

第一版不做：

* sibling discount
* family bundle
* student sharing
* school licenses
* teacher licenses

未來可加入折扣，但 schema 必須從一開始支援：

> subscription belongs to one child.

---

# 7. Authentication

Authentication provider:

> **Supabase Auth**

## MVP login method

優先：

* Email OTP
* 或 Email Magic Link

MVP 不要求傳統密碼。

原因：

* 降低註冊阻力
* 避免密碼管理
* 避免 forgot password UX
* Supabase 原生支援

Future authentication options:

* Google OAuth
* LINE Login

以上均不是 MVP blocker。

---

# 8. User Roles

MVP 只有兩類角色。

## 8.1 Parent

可以：

* 登入
* 建立孩子
* 修改孩子 profile
* 管理興趣與近期狀況
* 訂閱孩子方案
* 查看孩子目前教材
* 查看歷史教材
* 下載 Student PDF
* 下載 Parent Answer PDF
* 填寫每週 feedback
* 查看下一次教材產生日期
* 管理訂閱

## 8.2 Admin

可以：

* 查看所有 student
* 查看 generation jobs
* 查看 failed jobs
* 重新執行 generation
* 查看 prompt / generator versions
* 查看 subscriptions
* 必要時人工修正 student state

Admin UI 不是 MVP 第一優先。

可先使用 Supabase Dashboard。

---

# 9. Parent / Child Data Model

Recommended logical model:

```text
auth.users
    ↓
parents
    ↓
students
    ├── student_profiles
    ├── student_preferences
    ├── student_context_notes
    ├── student_vocab_progress
    ├── student_grammar_progress
    ├── weekly_feedback
    ├── weekly_materials
    ├── generation_jobs
    └── subscriptions
```

---

# 10. Parent

Suggested fields:

```text
parents

id
user_id
display_name
created_at
updated_at
```

`user_id` references Supabase `auth.users`.

---

# 11. Student

Suggested fields:

```text
students

id
parent_id
nickname
grade
textbook_version
status
created_at
updated_at
```

`nickname` should be preferred over legal full name.

Possible `status`:

* active
* paused
* archived

---

# 12. Student Profile

Longer-lived learning information.

Suggested fields:

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

Exact level representation can evolve.

MVP may use simple categorical values.

Example:

```text
baseline_level:
- needs_support
- average
- above_average
- advanced
```

---

# 13. Student Preferences

Unlike core profile data, preferences are expected to change frequently.

Example:

```text
student_preferences

student_id
interests
favorite_games
favorite_anime
favorite_sports
favorite_topics
disliked_topics
preferred_story_styles
updated_at
```

Parents must be able to edit preferences at any time.

Example updates:

* 最近開始看新的動漫
* 最近不玩 Minecraft 了
* 最近很喜歡 NBA
* 最近開始迷棒球
* 不喜歡幼稚故事
* 比較喜歡冒險故事

Profile edits:

> affect future materials only.

They must NOT automatically regenerate already-created materials.

---

# 14. Student Context Notes

Some parent observations do not fit structured fields.

Allow lightweight ongoing notes.

```text
student_context_notes

id
student_id
note
created_at
```

Example:

* 最近考試壓力比較大
* 孩子說文章太簡單
* 最近一直搞混 do / does
* 下星期學校有英文小考
* 最近開始看某部動漫

These notes become input for future material generation.

---

# 15. Learning Memory

The product's main long-term value comes from accumulated student history.

The system should progressively know:

* which vocabulary has been introduced
* which vocabulary has been reviewed
* which vocabulary is repeatedly missed
* which grammar concepts have been introduced
* which grammar concepts remain weak
* reading difficulty trend
* repeated error patterns
* preferred article themes
* recently used article themes
* school progress
* parent feedback
* completion rate
* recurring student comments

This memory should be structured where practical rather than relying solely on raw text history.

---

# 16. Vocabulary Progress

Suggested model:

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
```

Possible status:

* new
* learning
* reviewing
* mastered

Exact mastery algorithm is not required for MVP.

---

# 17. Grammar Progress

Suggested model:

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

Possible status:

* not_started
* learning
* reviewing
* mastered

---

# 18. Onboarding Flow

Initial journey:

```text
Landing
→ Parent login/signup
→ Add child
→ Fill child profile
→ Choose/start subscription
→ Create first generation job
→ Week 1 material
```

MVP onboarding should ideally take less than several minutes.

---

# 19. Initial Child Information

Required or strongly recommended fields:

* nickname
* grade
* textbook version
* approximate English level
* main learning goals
* current school progress
* interests
* approximate weekly study time

Optional:

* favorite anime
* favorite games
* sports
* parent expectations
* known weak points
* free-text context

---

# 20. Initial Assessment

A large online placement test is NOT required for MVP.

Initial level may be estimated using:

* parent description
* school progress
* initial profile
* Week 1 exercises
* Week 1 feedback

Week 1 should partly function as calibration.

The system should be willing to adjust quickly after the first feedback cycle.

Future versions may include a dedicated short initial assessment.

---

# 21. Weekly Product Output

Each active child receives one personalized weekly package.

MVP output:

## Student PDF

Designed for self-study and printing.

Should contain approximately:

1. Weekly goal / introduction
2. Reading article or natural dialogue
3. Vocabulary
4. Vocabulary guidance
5. Reading comprehension
6. Grammar explanation
7. Grammar examples
8. Guided practice
9. Additional application questions
10. Review / challenge
11. Homework

No answers in Student PDF.

---

# 22. Self-Study Guidance

This product is not a tutor-led worksheet.

Compared with `eng-tutor` teacher-led materials, the SaaS student worksheet needs more explicit guidance.

Each major section should clearly explain:

* what the student is about to do
* what to notice
* how to approach the question
* simple examples where helpful
* hints without immediately revealing answers

The material should be understandable without a tutor sitting next to the student.

---

# 23. Parent Answer PDF

Separate printable/downloadable file.

Contains:

* full answers
* concise explanations where needed
* vocabulary answers
* grammar answers
* reading comprehension answers
* Homework answers

May additionally include a short parent summary:

* this week's learning focus
* what changed from last week
* what to observe

Parent Answer PDF must not be shown directly in the student workflow by default.

---

# 24. Teacher Guide

The existing `eng-tutor` repository generates teacher guides.

The subscription product does NOT require teacher guides for MVP.

Reason:

> The core use case is self-study at home, not tutor-led instruction.

---

# 25. CAP Alignment

Material design should remain aligned with the spirit of Taiwan's junior-high English CAP.

Reading comprehension should include a reasonable mix of:

* detail
* inference
* main idea
* guessing meaning from context

Language should:

* appear in natural context
* avoid excessive isolated grammar drills
* emphasize useful junior-high English
* gradually build reading comprehension

CAP alignment is the long-term curriculum target even when the student is currently below CAP level.

---

# 26. Vocabulary Selection

Vocabulary should not be chosen purely based on grade labels.

The generator should consider:

* student actual level
* prior vocabulary progress
* previously mastered words
* recently incorrect words
* article topic
* usefulness
* CAP relevance

Already-mastered basic words may naturally appear in the article without consuming the week's "new vocabulary" quota.

---

# 27. Grammar Selection

Grammar progression should consider:

* current school textbook progress
* curriculum sequence
* prior grammar progress
* recent errors
* previous weekly materials
* parent feedback

Do not blindly advance if the student has not understood recent core grammar.

---

# 28. Article Personalization

Article themes should use student interests where helpful.

Examples:

* Minecraft
* Roblox
* anime
* NBA
* baseball
* school life
* travel
* technology
* animals

However:

> Personalization should not cause every article to become repetitive fan-fiction.

Use interests as hooks while maintaining meaningful language learning.

The system should remember recently used themes and avoid obvious repetition.

---

# 29. Weekly Feedback

Feedback is a core part of the product, not an optional analytics feature.

After using the material, the parent should be able to submit feedback.

Required or quick-select fields:

```text
difficulty
completion_rate
weak_area
```

Example difficulty:

* too_easy
* good
* too_hard

Example completion:

* 0%
* 25%
* 50%
* 75%
* 100%

Example weak area:

* vocabulary
* grammar
* reading
* mixed
* none

---

# 30. Extended Feedback

Parents may also provide:

* what the child got wrong
* what the child found difficult
* what the child said
* parent observations
* current school progress
* test/exam information
* current interests
* recently changed interests
* free-text notes

Suggested schema:

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

Most free-text fields should be optional.

The UX should allow feedback to be submitted quickly even when parents do not want to type much.

---

# 31. Feedback Effect

Feedback affects:

> future generations only.

Submitting feedback must not immediately regenerate the current material.

Example:

```text
Week 4
↓
parent feedback
↓
student model updates
↓
Week 5 generation reads updated model
```

---

# 32. Generation Scheduling

Generation is scheduled per child.

Each child should have:

```text
next_generation_at
```

or equivalent job scheduling state.

The system should NOT:

> regenerate material every time a profile row or feedback row changes.

Instead, profile changes accumulate until the next generation.

---

# 33. Generation Jobs

Use an explicit queue model.

Suggested table:

```text
generation_jobs

id
student_id
target_week
scheduled_for
status
reason
attempt_count
created_at
started_at
completed_at
error_message
```

Possible status:

* pending
* processing
* completed
* failed
* canceled

Possible reason:

* initial_generation
* weekly_generation
* manual_retry
* admin_regeneration

---

# 34. Initial Worker Architecture

For MVP, the generation worker may be:

> **Scheduled ChatGPT**

The scheduled task runs periodically, e.g. once per day.

It should:

1. query Supabase for due pending jobs
2. verify subscription eligibility
3. load relevant student context
4. load production generation rules from this repository
5. generate material
6. create PDFs
7. store output
8. update material metadata
9. mark job completed
10. capture failure information if unsuccessful

---

# 35. Important Worker Rule

Scheduled ChatGPT should NOT simply scan for new database inserts.

Only explicit due `generation_jobs` should trigger generation.

This prevents accidental generation from:

* editing profile
* changing favorite anime
* adding parent note
* submitting feedback
* updating textbook version

---

# 36. Production Runtime Inputs

A generation should use two main sources.

## Source A — Production repository

Contains:

* generation prompt
* curriculum rules
* vocabulary definitions
* grammar definitions
* CAP rules
* material format
* PDF renderer
* generator behavior

## Source B — Supabase

Contains:

* student profile
* preferences
* learning history
* feedback
* recent mistakes
* school progress
* weekly history
* generation job
* subscription state

Conceptually:

```text
Production rules
+
Student memory
+
Latest feedback
=
Next personalized weekly material
```

---

# 37. Future Worker Migration

Scheduled ChatGPT is an MVP orchestrator, not a permanent architectural requirement.

After product validation, generation should be replaceable with:

```text
GitHub Actions cron
or
backend cron
        ↓
Supabase generation_jobs
        ↓
LLM API
        ↓
generator
        ↓
PDF
        ↓
Storage
```

The database and frontend should not need major changes when replacing the worker.

---

# 38. Why Explicit Jobs Matter

The job architecture should support future:

* retry
* idempotency
* concurrency
* cost tracking
* generation logs
* manual regeneration
* model changes
* prompt version changes

---

# 39. Weekly Materials

Suggested table:

```text
weekly_materials

id
student_id
week_number
generation_job_id

student_pdf_path
answer_pdf_path

article_theme
article_hook
grammar_topics
vocabulary_summary

prompt_version
generator_version
model_name

generated_at
created_at
```

This replaces the old per-student `weekly-index.csv` concept with structured database history.

---

# 40. Generation Versioning

Every generated material should record enough metadata to reproduce or investigate it.

At minimum:

```text
prompt_version
generator_version
model_name
generated_at
```

Prompt version should ideally map to:

* git commit SHA
* prompt file version
* release identifier

This allows debugging:

> Why was this student's Week 8 material bad?

without guessing which prompt produced it.

---

# 41. Supabase Responsibilities

Supabase provides:

* Auth
* PostgreSQL
* Row Level Security
* Storage
* Edge Functions where needed

Supabase is:

> **the source of truth for customer and student state.**

GitHub must NOT be used as a student database.

---

# 42. Storage

Generated PDFs should live in Supabase Storage.

Possible path:

```text
students/{student_id}/{year-week}/student.pdf
students/{student_id}/{year-week}/answer.pdf
```

Bucket should be private.

Download access must respect parent ownership.

---

# 43. GitHub Responsibilities

Production repository contains:

* frontend source
* prompt templates
* generator logic
* curriculum resources
* PDF renderer
* Supabase migrations
* Edge Functions
* GitHub workflows
* technical documentation

No child personal data should be committed.

---

# 44. Frontend Hosting

Initial frontend hosting:

> **GitHub Pages**

Recommended frontend approach:

* Vite
* React or equivalent static SPA framework

GitHub Pages hosts the static frontend.

Dynamic functionality communicates with Supabase.

---

# 45. Backend

GitHub Pages does not run backend code.

Backend responsibilities should use Supabase / server-side infrastructure.

Examples:

* privileged operations
* Paddle webhook handling
* generation-related protected operations
* admin operations

Secrets must never be shipped to the frontend.

---

# 46. Subscription Provider

Initial provider:

> **Paddle**

Reason:

* subscription support
* Merchant of Record model
* handles much billing complexity
* suitable for MVP validation
* avoids initially building local merchant infrastructure

Long-term Taiwan-specific payment options may later be evaluated.

---

# 47. Subscription Model

Each child has an independent subscription.

Suggested table:

```text
subscriptions

id
student_id
provider
provider_customer_id
provider_subscription_id
status
plan_code
current_period_start
current_period_end
cancel_at_period_end
created_at
updated_at
```

Possible status:

* trial
* active
* past_due
* canceled
* expired

---

# 48. Subscription Eligibility

A weekly generation job should normally execute only when:

```text
subscription.status = active
```

or another explicitly eligible state.

If canceled:

* existing materials remain accessible according to product policy
* future generation stops after entitlement ends

Exact post-cancellation retention rules may be refined later.

---

# 49. Multi-Child Billing

One parent may have multiple Paddle subscriptions.

Example:

```text
Parent: mom@example.com

Child A
→ Paddle Subscription A
→ NT$499/month

Child B
→ Paddle Subscription B
→ NT$499/month
```

Do not model multiple children as a single subscription quantity for MVP.

Independent subscriptions simplify:

* separate cancellation
* different start dates
* future plan differences
* child-specific lifecycle

---

# 50. Parent Dashboard

MVP dashboard should prioritize clarity over features.

Example:

```text
我的孩子

Jonathan
國一｜翰林
訂閱中

本週教材
[下載學生教材]

家長答案
[下載答案]

下一份教材
8/16

[填寫本週回饋]
[編輯孩子資料]
```

If multiple children exist, each gets a separate card or section.

---

# 51. Edit Child Profile

Parents can edit child information at any time.

Editable information includes:

* grade
* textbook version
* current school progress
* approximate level
* learning goals
* weekly time
* interests
* favorite anime
* games
* sports
* disliked themes
* free-text notes

Profile updates should show clearly that:

> updates will affect future materials.

---

# 52. Personalization Visibility

The system should make personalization visible to the parent.

For example, future material or dashboard can show:

```text
本週調整

- 上週 do / does 容易混淆，本週再次練習
- 上週閱讀偏簡單，本週稍微提升
- 配合學校進度加入現在進行式
- 本週文章使用最近喜歡的 NBA 主題
```

This is important because the product's value must be visible.

A personalized engine that looks generic will feel generic.

---

# 53. Privacy

This product involves minors.

Privacy must be treated as a first-class requirement.

Principles:

* collect only necessary information
* prefer nickname over full legal name
* do not require home address
* do not require exact birthdate unless truly necessary
* do not require school name for MVP
* never store child data in public GitHub
* keep generated materials private
* enforce RLS
* avoid exposing internal student IDs unnecessarily

---

# 54. Row Level Security

Parents must only access students they own.

Conceptually:

```text
parent
can read/write student
ONLY IF
student.parent_id belongs to current auth user
```

Equivalent ownership rules should apply to:

* profiles
* preferences
* notes
* feedback
* materials
* subscriptions
* download permissions

Service-role access must remain server-side only.

---

# 55. Error Handling

Generation jobs must never silently disappear.

On failure:

```text
status = failed
error_message = ...
attempt_count += 1
```

The system should support manual retry.

Future versions may support automatic retry.

---

# 56. Idempotency

The same generation job should not create duplicate Week N materials when retried accidentally.

Use:

* unique generation job IDs
* unique student/week constraints where appropriate
* generation status checks

---

# 57. Material Quality Failure

If material generation completes technically but quality is clearly invalid, future tooling should support:

* admin rejection
* regeneration
* manual replacement

MVP may initially rely on manual inspection during beta.

---

# 58. Recommended Repository Structure

Initial recommendation:

```text
/
├── SPEC.md
├── README.md
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
│   ├── generate-week.*
│   └── ...
│
├── pdf/
│   ├── templates/
│   ├── styles/
│   └── build-pdf.*
│
├── supabase/
│   ├── migrations/
│   └── functions/
│       ├── paddle-webhook/
│       └── ...
│
├── docs/
│   └── eng-tutor-upstream.md
│
└── .github/
    └── workflows/
```

Exact implementation language may change.

---

# 59. MVP Scope

MVP must prove one complete learning loop.

Required:

```text
Parent signup/login
↓
Create child
↓
Edit child profile
↓
Subscribe child
↓
Create generation job
↓
Generate Week 1
↓
Student PDF
↓
Parent Answer PDF
↓
Parent downloads
↓
Parent submits feedback
↓
Student memory updates
↓
Generate Week 2 using feedback
```

If this loop works reliably, MVP is functional.

---

# 60. MVP Priorities

Priority 1:

* Auth
* Parent
* Child
* Profile
* Supabase schema
* RLS

Priority 2:

* generation_jobs
* generation pipeline
* student PDF
* parent answer PDF

Priority 3:

* feedback
* Week N personalization
* learning memory

Priority 4:

* Paddle
* subscription entitlement

Priority 5:

* polished landing page
* visual branding

---

# 61. Explicit MVP Non-Goals

Do NOT build these unless explicitly requested later:

* native iOS app
* native Android app
* student social network
* student chat
* AI chatbot for children
* live tutoring
* video lessons
* livestream classes
* gamification
* points
* streaks
* badges
* leaderboard
* LINE bot
* referral program
* sibling discount
* family bundle
* teacher dashboard
* school dashboard
* monthly report
* recommendation engine beyond current personalization
* automatic upstream synchronization
* complicated analytics dashboard
* full online placement exam
* real-time generation after every edit

Avoid adding features simply because they are common in EdTech.

---

# 62. Product Success Criteria

Early product success is not measured by model sophistication.

Initial validation should focus on:

## Acquisition

Can parents understand the product?

Can they understand:

> 每週一份專屬孩子的英文教材。

## Activation

Can a parent:

* create a child
* complete profile
* get Week 1
* print/download it

without assistance?

## Usage

Does the child actually complete meaningful parts of the worksheet?

## Feedback

Do parents provide enough feedback to improve the next week?

## Personalization

Does Week 2 visibly reflect Week 1 performance and feedback?

## Retention

Most important early metric:

> Does the parent continue paying into the next month?

---

# 63. Initial Market Validation

Recommended initial audience:

* Taiwan
* potentially starting locally around Hsinchu / Zhubei
* parents with junior-high children
* education-invested households

But the codebase should not hard-code Zhubei-specific behavior.

Zhubei is a go-to-market strategy, not a technical product constraint.

---

# 64. Product Positioning

Avoid positioning primarily as:

> AI worksheet generator

Avoid positioning primarily as:

> AI tutor

Preferred positioning:

> **每週一份，只屬於孩子的英文教材。**

Supporting concept:

> AI 在幕後，學習回到紙上。

The product should feel closer to:

> a continuously adapting personal workbook

than:

> another educational app.

---

# 65. Paper-First Principle

Students should not need to spend the learning session inside the web product.

Website responsibilities:

### Parent

* manage
* update
* download
* provide feedback
* subscribe

### Student

Main learning experience:

* printed PDF
* pencil
* reading
* writing
* thinking

Digital use is intentionally minimized.

---

# 66. Long-Term Product Moat

The defensible asset is not the generation prompt alone.

Long-term value comes from:

```text
Student profile
↓
Weekly material
↓
Actual learning result
↓
Parent feedback
↓
Learning memory
↓
Better next material
↺
```

Over months, the system accumulates unique history for each child.

That history should improve:

* vocabulary selection
* grammar review timing
* reading difficulty
* subject relevance
* repetition spacing
* material engagement

---

# 67. Migration Path After Validation

After early validation, possible upgrades include:

### Infrastructure

Replace Scheduled ChatGPT with:

* API-based worker
* GitHub Actions cron
* Supabase scheduled jobs
* dedicated backend worker

### Payments

Evaluate local Taiwan payment infrastructure if transaction volume makes Paddle fees inefficient.

### Product

Potential later features:

* monthly progress report
* sibling discount
* examination review packs
* holiday packs
* custom school test preparation
* LINE notifications
* Google login
* initial diagnostic test

None are required for initial launch.

---

# 68. Engineering Principles

Implementation should favor:

* simple architecture
* explicit state
* idempotent operations
* easy debugging
* strong data ownership boundaries
* versioned prompts
* minimal unnecessary services
* low fixed cost during MVP

Avoid premature scale engineering.

100 students should not require an enterprise architecture.

---

# 69. Agent Instructions

Any coding agent working on this repository should follow these rules:

1. Read `SPEC.md` before major product changes.
2. Treat this file as the primary product contract.
3. Do not add out-of-scope features without explicit instruction.
4. For curriculum/generator work, review `docs/eng-tutor-upstream.md`.
5. When needed, inspect the latest relevant implementation in `egger-meow/eng-tutor`.
6. Do not create runtime dependency on `eng-tutor`.
7. Never commit real child data.
8. Preserve parent → child → subscription ownership.
9. Preserve paper-first product philosophy.
10. Prefer simple MVP solutions over speculative infrastructure.

---

# 70. Initial Definition of Done

The first end-to-end milestone is complete when the following scenario works:

1. A parent opens the website.
2. Parent authenticates with email.
3. Parent creates Child A.
4. Parent fills Child A's profile and interests.
5. Child A has an active or mocked subscription.
6. A Week 1 generation job is created.
7. Worker reads production rules and Child A context.
8. Worker creates Student PDF.
9. Worker creates Parent Answer PDF.
10. Files are stored privately.
11. Parent can download both.
12. Parent submits weekly feedback.
13. Parent edits the child's interests.
14. A Week 2 generation job runs.
15. Week 2 visibly reflects:

    * Week 1 feedback
    * updated interest
    * prior learning history
16. Child B can be added under the same parent.
17. Child B maintains completely independent:

    * profile
    * subscription
    * history
    * materials
    * feedback

At that point, the core product loop exists.

---

# 71. Guiding Rule

When unsure whether to add a feature, ask:

> Does this materially improve the loop between the child's current state and next week's paper material?

If not, it is probably not MVP.

---

# 72. Summary

紙屬英文 is a subscription-based personalized English learning system for junior-high students.

The product consists of three layers:

```text
GitHub production repo
= teaching rules + generator + frontend

Supabase
= parent / child / memory / feedback / jobs / PDFs

Scheduled generation worker
= turns rules + memory into next week's material
```

`eng-tutor` remains the upstream R&D laboratory.

Production does not blindly follow it.

Every child has:

* an independent profile
* independent learning memory
* independent materials
* independent feedback
* an independent subscription

The central MVP goal is not to build a large EdTech platform.

It is to prove one recurring loop:

> **了解這個孩子 → 做出一份教材 → 孩子真的寫 → 家長回饋 → 下一份真的變得更適合他。**

# SPEC Addendum — Landing Page, Founding Offer & Capacity Gate

## A. Landing Page Is the Login Page

The public landing page and authentication entry should be the same product surface.

Do NOT build:

```text
Marketing Website
→ separate login app
```

as two disconnected experiences for MVP.

Instead:

```text
Public Landing Page
↓
Explain product value
↓
Show personalized-material concept
↓
Show paper-first philosophy
↓
Show founding offer / capacity
↓
CTA
↓
Email login/signup
```

The landing page must primarily answer:

> Why is this meaningfully better than buying another workbook or asking ChatGPT to generate worksheets?

The page should sell the product before asking the parent to create an account.

---

## B. Landing Page Core Message

Primary positioning:

> **每週一份，只屬於你孩子的英文教材。**

Supporting concept:

> **AI 在幕後，學習回到紙上。**

The page should communicate that the system remembers:

* the child's level
* school progress
* vocabulary already learned
* grammar weaknesses
* recent mistakes
* current interests
* parent feedback

And uses this information to change the next week's material.

The value proposition is not:

> AI 幫你出題。

It is:

> **每週根據孩子真的學得怎麼樣，重新做下一份教材。**

---

## C. Recommended Landing Page Story

Suggested section order:

```text
Hero
↓
What makes it different
↓
How one week works
↓
Personalization example
↓
Why paper-first
↓
What the child gets
↓
What the parent does
↓
Founding offer
↓
Current remaining capacity
↓
FAQ
↓
Signup / Login
```

---

## D. Hero Section

The first screen should communicate the product within several seconds.

Example concept:

```text
每週一份，只屬於你孩子的英文教材。

根據程度、學校進度、興趣與上週表現，
每週重新調整。

孩子不用再多開一個學習 App。
印下來，拿起筆，開始學。

[免費產生第一週]
```

Supporting points may include:

```text
✓ 對齊國中英文與會考能力
✓ 每週依回饋調整
✓ 可列印學生教材
✓ 家長另有完整答案
```

---

## E. Show Personalization Visibly

The landing page should demonstrate an example of how the same student changes over time.

Example:

```text
上週回饋

閱讀：太簡單
文法：do / does 常錯
最近興趣：NBA
學校進度：現在進行式

↓

下一週教材

- 閱讀難度提高
- do / does 安排複習題
- 加入現在進行式
- 文章改成 NBA 情境
```

This section is important.

Parents should understand:

> The product does not merely change the article topic.
> It changes the learning plan.

---

## F. Paper-First Marketing

The product should explicitly explain why the student receives printable material instead of being asked to study entirely online.

Preferred framing:

> 科技負責個人化，不負責讓孩子多看一個螢幕。

The landing page may explain:

* fewer digital distractions during learning
* easier annotation
* handwriting and written practice
* parents can see completed work
* no need for the child to navigate another platform

Avoid attacking all online education.

The message should be:

> digital where useful, paper where useful.

---

# Founding Beta

## G. First 30 Children Offer

For early validation, the system may display a founding offer for the first 30 subscribed children.

Recommended initial offer:

```text
紙屬英文 Founding 30

前 30 位孩子：
第一週可先免費產生

決定繼續後：
第一個月 NT$299

之後：
NT$499 / 月 / 每位孩子
```

Exact pricing may be adjusted before launch, but the product must support a founding cohort offer.

The intent is:

1. lower the first-use barrier
2. let parents see an actual personalized PDF
3. prove product quality before asking for full price
4. collect early feedback
5. establish initial retention data

---

## H. Free First Week

A parent should be able to create a child profile and generate the first week's material before committing to the normal monthly subscription, subject to founding-beta rules.

Possible journey:

```text
Landing
↓
免費產生第一週
↓
Login
↓
Create child
↓
Profile
↓
Week 1 generation
↓
Download / print
↓
Parent sees actual product
↓
Subscribe to continue
```

The exact billing moment may evolve.

The important product principle is:

> Let early parents evaluate the real personalized material, not only screenshots.

---

# Capacity Gate

## I. MVP Maximum: 100 Active Children

During the initial production phase, the service should intentionally cap enrollment at:

> **100 active subscribed children**

This is both:

* an operational safety limit
* a product validation milestone

The landing page should make this visible.

Example:

```text
目前系統最多服務 100 位孩子。

目前：
37 / 100

名額滿後將暫停新加入，
先把系統升級好，再繼續開放。
```

---

## J. Why the 100-Child Limit Exists

The limit should not be presented as fake scarcity.

It exists because early-stage priorities include:

* manually reviewing material quality where needed
* monitoring generation failures
* validating parent feedback loops
* measuring actual completion
* improving prompts and curriculum
* improving automation before higher scale

If 100 children are reached, that is considered strong enough validation to justify infrastructure and product upgrades.

---

## K. Enrollment State

The system should support a public enrollment state.

Example:

```text
enrollment_settings

capacity
active_child_count
status
founding_slots_total
founding_slots_used
```

Possible status:

* open
* nearly_full
* waitlist
* closed

MVP does not necessarily need this exact table if the same state can be represented more simply.

---

## L. Capacity Behavior

When active subscribed children < 100:

```text
new subscriptions allowed
```

When capacity reaches 100:

```text
new paid child subscriptions disabled
```

Existing children continue normally.

Parents may still:

* log in
* access existing materials
* provide feedback
* manage existing subscriptions

New visitors should see:

```text
目前名額已滿。

我們正在升級系統，
下一批開放時通知我。

[加入候補名單]
```

---

## M. Parent With Multiple Children

Capacity is counted by child, not parent.

Example:

```text
Parent A
├── Child 1 = 1 slot
└── Child 2 = 1 slot
```

Therefore:

> 50 parents with two subscribed children each = 100 active children.

---

# Founding Cohort Logic

## N. Founding Status Belongs to Child Subscription

Founding benefits should be associated with the child/subscription rather than only the parent.

This is consistent with the product's core billing model:

> one child = one independent learning product.

Example:

```text
Child A
founding_cohort = true
intro_price = 299

Child B added months later
founding_cohort = false
standard_price = 499
```

Exact grandfathering policy must be made explicit before launch.

---

# Pricing Policy Recommendation

## O. Recommended MVP Interpretation

For initial implementation, use:

```text
First 30 children:
- Week 1 free
- First paid month NT$299
- From second paid month onward NT$499/month

Children 31–100:
- Standard onboarding policy
- NT$499/month
```

This is preferable to permanently locking the first 30 children at NT$299 unless explicitly chosen later.

The goal is:

> reward early trial, not permanently destroy future ARPU.

---

# Signup CTA States

## P. CTA Examples

### Founding slots available

```text
免費產生第一週
前 30 位首月 NT$299
[開始建立孩子資料]
```

### Founding slots gone, capacity available

```text
每位孩子 NT$499 / 月
目前 43 / 100
[開始]
```

### Near capacity

```text
剩餘 8 個名額
[加入紙屬英文]
```

### Capacity full

```text
目前 100 / 100，暫停加入

我們會先升級教材與系統品質，
再開下一批。

[加入候補名單]
```

---

# Trust & Transparency

## Q. Capacity Must Be Real

Do not fake the active-child counter.

If the website displays:

```text
83 / 100
```

it must come from real system state or a clearly maintained administrative value.

Do not use random or artificially decreasing numbers.

The scarcity message is credible only if the limit is genuinely enforced.

---

# Revised MVP Journey

## R. Public-to-Paid Flow

```text
Public landing page
↓
Understand product
↓
See current capacity
↓
Click free Week 1 / signup
↓
Supabase Auth
↓
Create child
↓
Fill editable profile
↓
Generate first personalized material
↓
Download Student PDF + Parent Answer PDF
↓
Child uses material
↓
Parent submits feedback
↓
Subscription / founding offer
↓
Next scheduled weekly generation
```

---

# Additional Success Metrics

In addition to retention, early beta should track:

```text
landing → signup conversion

signup → child created

child created → Week 1 generated

Week 1 generated → PDF downloaded

PDF downloaded → feedback submitted

free Week 1 → paid conversion

month 1 → month 2 retention

active children / 100
```

The most important early funnel is:

> **看到 → 願意試 → 真的印 → 願意回饋 → 願意付 → 願意續。**

---

# Updated MVP Principle

The landing page is not merely authentication chrome.

It is part of the product.

Before login, the parent should already understand:

1. what the child receives
2. why it is personalized
3. why it is printed
4. how feedback changes future material
5. how much it costs
6. whether there is currently capacity
7. why the service is intentionally limited during beta

The first product experience begins before signup.

# SPEC Addendum — Learning Method, AI Literacy & Founder-Led Brand

## A. Product Teaches a Learning Method, Not Only Weekly Content

紙屬英文不應只提供：

> 每週客製化英文教材。

產品還應教學生：

> **如何使用這份教材有效學習。**

這套方法不需要每週重新生成。

它是所有學生共通的基礎學習流程，應作為網站上的固定：

* 學生使用指南
* 家長陪伴指南
* Landing page 產品優勢之一

核心概念：

> **教材會每週改變，但好的學習方法可以一直使用。**

---

# B. Recommended Student Learning Loop

學生收到每週教材後，建議依以下流程使用。

## Step 1 — 先自己讀

閱讀文章或題目時：

* 不要看到不會的字就立刻停下來
* 先嘗試從上下文猜意思
* 把不確定的單字圈起來
* 把看不懂的句子做記號

目標不是第一次就全部看懂。

而是先知道：

> 我懂什麼？我卡在哪裡？

---

# C. Build a Personal Vocabulary Notebook

建議學生準備一本自己的英文小筆記本。

遇到真正值得記住的不熟單字時，可以記錄：

```text
word

中文意思

文章中的原句

自己造一句

我為什麼會記錯 / 不會
```

不要求把教材裡每個單字全部抄一次。

重點是留下：

> **屬於自己的錯字與不熟字。**

隨著時間累積，這本筆記會逐漸變成學生自己的英文弱點資料庫。

---

# D. Complete Before Checking Answers

學生應先完成題目，再查看答案。

Recommended flow:

```text
自己作答
↓
完成一個 section
↓
對答案
↓
標記錯題
↓
理解為什麼錯
```

答案的用途不是：

> 看正確答案填回去。

而是：

> 找出自己的思考在哪一步出了問題。

---

# E. Wrong Answers Become Learning Opportunities

每一道錯題都應至少回答：

> **我為什麼會錯？**

可能原因包括：

* 單字不知道
* 文法觀念錯
* 看錯題目
* 沒讀懂文章
* 選項判斷錯
* 知道概念但粗心
* 不知道兩個選項差在哪

學生可以在錯題旁留下簡短註記。

Example:

```text
錯因：忘記第三人稱單數要用 does
```

或：

```text
錯因：although 這個字不熟
```

---

# F. AI as a Learning Tool

現代學生應逐漸學會：

> **如何使用 AI 幫助自己理解，而不是讓 AI 幫自己完成作業。**

紙屬英文應把 AI literacy 視為學習方法的一部分。

Recommended principle:

> **先自己想，再問 AI；問的是「為什麼」，不是只問答案。**

---

# G. Recommended AI Learning Flow

當學生遇到做錯或真的無法理解的題目：

```text
自己先想
↓
查看家長答案
↓
仍然不知道為什麼
↓
使用 AI 詢問
↓
重新用自己的話解釋
↓
再做一次
```

可使用：

* Gemini
* ChatGPT
* 其他適合學習的 AI assistant

紙屬英文不需要綁定單一 AI 品牌。

---

# H. Teach Students How to Ask AI

網站上的學生指南應提供一些實際問題範例。

Good:

```text
我選 B，但答案是 C。

不要直接告訴我答案，
可以用國一學生懂的方式解釋
為什麼 B 不對、C 對嗎？
```

Good:

```text
我不懂為什麼這裡要用 does 而不是 do。

先解釋規則，
再給我兩題類似題目讓我自己做。
```

Good:

```text
我看不懂這一句英文。

不要直接翻譯整篇，
請先拆解這句的文法結構。
```

Good:

```text
我一直記不住 although。

可以用例句、情境或記憶方法
幫我理解這個字嗎？
```

Avoid:

```text
幫我把這份作業全部寫完。
```

The product should encourage:

> **AI as explainer, tutor and practice partner, not answer machine.**

---

# I. Using Photos With AI

If a student wants to ask AI about a printed wrong answer, the guide may suggest:

1. 拍下該題
2. 只保留需要詢問的部分
3. 避免拍入姓名、學校、聯絡資訊等個人資料
4. 告訴 AI 自己原本選什麼
5. 要 AI 解釋錯因
6. 要 AI 再出一題類似題確認是否真的學會

Example flow:

```text
拍錯題
↓
「我原本選 B」
↓
「不要只告訴我答案」
↓
「請解釋我錯在哪」
↓
「再出一題類似的」
```

This creates a useful feedback cycle:

> **錯題 → 理解 → 再練習。**

---

# J. AI Literacy as a Product Advantage

The public website may explicitly communicate:

> 現在的孩子不只需要學英文，也需要學會怎麼使用 AI 學習。

紙屬英文的立場不是禁止 AI。

也不是讓 AI 代替思考。

Preferred message:

> **先思考，再使用 AI 放大學習。**

The system gives the child something concrete to think about first:

* reading
* vocabulary
* grammar
* questions
* mistakes

AI is then used to deepen understanding.

This creates a meaningful distinction from simply opening a chatbot with no learning structure.

---

# K. Website Learning Guide

The full learning method should live primarily on the website rather than being regenerated every week.

Suggested route:

```text
/learn-how-to-learn
```

or:

```text
/guide
```

Possible sections:

```text
如何使用每週教材

1. 先讀，不要急著查
2. 圈出真正不會的字
3. 建立自己的英文筆記本
4. 先做完再對答案
5. 每一題錯題都找出錯因
6. 不懂時學會問 AI
7. 讓 AI 解釋，不讓 AI 代寫
8. 把本週狀況告訴家長
9. 家長回饋給紙屬英文
10. 下週教材再次調整
```

---

# L. Lightweight Reminder in Weekly PDF

The full guide should not be duplicated into every weekly PDF.

However, the Student PDF may contain a small reusable reminder such as:

```text
這份教材怎麼用？

① 先自己讀
② 圈起不會的字
③ 先作答再對答案
④ 錯題一定找出「為什麼」
⑤ 真的不懂，再請 AI 解釋
```

Optionally include a QR code or short link to the full learning guide.

This reminder should remain short and should not consume significant worksheet space.

---

# M. Parent Guide

A separate static parent guide should explain the parent's role.

The parent is NOT expected to become an English teacher.

Parent responsibilities should stay lightweight:

```text
孩子完成教材
↓
提供答案
↓
觀察幾個簡單訊號
↓
填寫每週 feedback
↓
系統負責下一週調整
```

Parents should be encouraged to notice:

* 哪些地方一直錯
* 是否覺得太簡單或太難
* 哪些文章特別願意讀
* 孩子主動說了什麼
* 學校最近教到哪裡
* 最近有沒有新的興趣

The parent then transfers these observations through the feedback form.

---

# N. Parent Does Not Need to Teach Everything

A key product message:

> 家長不用會教英文，才能陪孩子學英文。

If the parent also does not know why an answer is wrong:

> let the child use AI to investigate.

The goal is not to turn the parent into a tutor.

The parent's role is primarily:

* provide structure
* observe
* encourage reflection
* submit useful feedback

---

# O. Complete Learning Loop

The complete learning system becomes:

```text
Personalized weekly material
↓
Student reads and writes
↓
Unknown words are marked
↓
Wrong answers are identified
↓
Student investigates mistakes
↓
AI helps explain difficult points
↓
Student records useful learning
↓
Parent observes
↓
Parent submits feedback
↓
Student model updates
↓
Next week's material adapts
```

This loop combines:

> personalization + paper learning + metacognition + AI literacy.

---

# P. Marketing Pillar: Learning How to Learn With AI

The landing page may present this as one of the product's major advantages.

Possible concept:

> **不是叫 AI 幫孩子寫答案，而是讓孩子學會怎麼問。**

Supporting explanation:

> 面對錯題，孩子先自己思考、對答案，再使用 AI 理解「為什麼」。
> 從國中開始建立正確的 AI 學習習慣，而不是等到大學才第一次學會怎麼用 AI。

This is a marketing message and educational philosophy, not a requirement that every child must use AI every week.

---

# Q. Core Marketing Pillars

The public website should maintain an extensible list of product advantages.

Initial pillars include:

## 1. Truly Personalized Every Week

不是一本到三年級都一樣的參考書。

每週根據孩子最新狀態重新調整。

## 2. Paper-First Learning

AI 在幕後運算。

孩子面前主要是紙、筆與真正的思考。

## 3. Continuous Parent Feedback

家長每週的觀察會影響下一份教材。

## 4. Learn How to Learn With AI

讓孩子提早學會：

> 如何把 AI 當成解釋問題與練習的工具，而不是答案產生器。

## 5. CAP-Oriented Long-Term Progress

教材不是隨機主題 worksheet。

長期能力目標持續朝國中英文與會考所需能力前進。

Additional product advantages may be added later as the product evolves.

---

# R. Founder-Led Brand

紙屬英文在早期階段應採用：

> **Founder-led brand**

而不是假裝自己已經是一間大型補教公司。

The public website should have a section such as:

```text
為什麼我做紙屬英文
```

or:

```text
誰在做這套教材？
```

The founder story should explain:

* creator background
* learning experience
* tutoring experience
* software / AI development experience
* why this product was created
* why personalized learning and AI literacy matter

---

# S. Founder Credibility

Founder credentials may be used as trust signals where accurate and verifiable.

Examples include:

* 國中教育會考成績
* academic background
* engineering / AI background
* tutoring experience
* software systems previously built
* current education / research work

The tone should be:

> Here's why I care about this problem and why I built the system this way.

Avoid presenting credentials merely as status decoration.

Connect each credential to product philosophy.

Example structure:

```text
我自己曾經走過台灣的升學體系，
也做過英文家教與軟體系統。

我一直覺得教材最大的問題不是「題目不夠多」，
而是每個孩子拿到的東西幾乎都一樣。

現在 AI 讓真正個人化的教材第一次有機會做到非常便宜。

所以我做了紙屬英文。
```

---

# T. Founder Page

The website may provide a dedicated founder/profile link.

Example:

```text
/about
```

It may link to the founder's personal website or portfolio.

This allows parents who want additional trust signals to inspect:

* background
* projects
* education
* public work
* contact information

The landing page itself should stay concise.

Do not dump an entire résumé into the hero section.

---

# U. Founder Identity as Early-Stage Trust Layer

During the first 100-child beta, founder visibility is especially valuable.

Parents are not only trusting software.

They are trusting:

> someone to influence what their child studies every week.

Therefore early-stage trust can come from:

```text
real founder
+
clear background
+
transparent philosophy
+
visible methodology
+
actual sample material
```

This is preferable to pretending the product is an anonymous large education corporation.

---

# V. Product Philosophy Summary

紙屬英文 should gradually communicate three distinct kinds of personalization:

### Content personalization

> 這週學什麼。

### Learning personalization

> 根據過去的錯誤決定接下來怎麼練。

### Learning-method education

> 教孩子怎麼閱讀、記錄錯誤、做筆記，以及使用 AI 自己解決問題。

The product is therefore not only:

> personalized content delivery.

The broader goal is:

> **讓孩子逐漸變成更會自己學的人。**
