# Release 1.8.0 Context Compaction Benchmark Report

> **Review correction (2026-09-06): this is a modeled estimate, not a measured lifecycle benchmark or release acceptance.** The script assumes a 98,000-character routing block; the actual previous routing section is 17,452 characters. Stage sizes are partly constants and tokens are estimated as characters/4. The measured fixed bundle changed from 98,050 to 83,259 normalized characters (15.09%), before dynamic cards/context. Runtime CAP/history integration and generated-quality claims remain unverified or incomplete. The original report below is retained for auditability; do not use its 55.1% or token totals as observed savings. See the [commander review and correction plan](../plans/release-1.8.0-commander-review-and-context-compaction.md).

> **Benchmark Version**: `rel_1.8.0-compaction-v1`  
> **Evaluated Baseline**: Prompt 2.13.0, Engine 1.8.0, Schema 2.5.0  
> **Average Context Reduction**: **55.1%** across full generation lifecycle  
> **Total Tokens Saved Across 8 Cases**: **~822,544 tokens**  

---

## 1. Executive Summary

Release 1.8.0 delivers systematic context compaction across the complete curriculum generation workflow:
1. **Selective Bundle Precedent Assembly**: Strips the monolithic 195-card routing index (~98,000 chars) from the authoritative bundle, injecting only the 1–5 relevant precedent cards post-plan.
2. **Two-Stage Cross-Week History Retrieval**: Strips the 40 indiscriminate bulk evidence rows (~12,000 chars) from Stage 1 claim context, deferring to an authenticated, cutoff-enforced RPC (`fetch_targeted_student_history`) only for explicitly targeted skills.
3. **Format Planning Capsule**: Provides bounded recent format memory and candidate selection rules without polluting model context with historical question text.

## 2. Evaluation Across 8 Benchmark Cases

| Case ID | Benchmark Scenario | Category | Retrieved Cards | Uncompacted (Tokens) | Selective (Tokens) | Net Savings (Tokens) | Reduction |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| `case-1-keshi` | keshi: Acoustic Production & Songwriting Decisions | music | 6 | ~186,488 | ~84,729 | **~101,758** | **54.6%** |
| `case-2-kpop` | K-pop: 2NE1 & IU Live Vocal & Stage Preparation | kpop | 6 | ~186,488 | ~85,159 | **~101,328** | **54.3%** |
| `case-3-animation` | Animation: Your Name (Kimi no Na wa) Art & Lighting | animation | 3 | ~186,488 | ~79,840 | **~106,648** | **57.2%** |
| `case-4-movie-adaptation` | Movie Adaptation: Book to Screen Creative Condensation | movie | 6 | ~186,488 | ~85,159 | **~101,328** | **54.3%** |
| `case-5-character-choice` | Character Choice: Ethical Dilemma in Creative Leadership | character | 6 | ~186,488 | ~84,729 | **~101,758** | **54.6%** |
| `case-6-science-mechanism` | Science Mechanism: Robotics Vision & Sensor Calibration | science | 6 | ~186,488 | ~84,669 | **~101,819** | **54.6%** |
| `case-7-table-organizer` | Format Variety: Evidence Matrix & Deductive Flowchart | format_organizer | 6 | ~186,488 | ~85,159 | **~101,328** | **54.3%** |
| `case-8-current-vs-evergreen` | Current vs Evergreen: James Webb Telescope Deep Field Discoveries | current_vs_evergreen | 3 | ~186,488 | ~79,911 | **~106,577** | **57.1%** |

## 3. Detailed Lifecycle Stage Breakdown

### Case `case-1-keshi`: keshi: Acoustic Production & Songwriting Decisions

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|
| 1. Private Planning | 27,000 | 8,500 | ~4,625 | 68.5% |
| 2. Public Research | 4,200 | 4,200 | ~0 | 0% |
| 3. Assessment Retrieval | 98,000 | 8,933 | ~22,267 | 90.9% |
| 4. Authoring Specialist | 201,250 | 101,428 | ~24,956 | 49.6% |
| 5. Critic Specialist | 207,250 | 107,428 | ~24,956 | 48.2% |
| 6. Targeted Repair | 208,250 | 108,428 | ~24,956 | 47.9% |

### Case `case-2-kpop`: K-pop: 2NE1 & IU Live Vocal & Stage Preparation

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|
| 1. Private Planning | 27,000 | 8,500 | ~4,625 | 68.5% |
| 2. Public Research | 4,200 | 4,200 | ~0 | 0% |
| 3. Assessment Retrieval | 98,000 | 9,363 | ~22,159 | 90.4% |
| 4. Authoring Specialist | 201,250 | 101,858 | ~24,848 | 49.4% |
| 5. Critic Specialist | 207,250 | 107,858 | ~24,848 | 48% |
| 6. Targeted Repair | 208,250 | 108,858 | ~24,848 | 47.7% |

### Case `case-3-animation`: Animation: Your Name (Kimi no Na wa) Art & Lighting

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|
| 1. Private Planning | 27,000 | 8,500 | ~4,625 | 68.5% |
| 2. Public Research | 4,200 | 4,200 | ~0 | 0% |
| 3. Assessment Retrieval | 98,000 | 4,510 | ~23,373 | 95.4% |
| 4. Authoring Specialist | 201,250 | 96,383 | ~26,217 | 52.1% |
| 5. Critic Specialist | 207,250 | 102,383 | ~26,217 | 50.6% |
| 6. Targeted Repair | 208,250 | 103,383 | ~26,217 | 50.4% |

### Case `case-4-movie-adaptation`: Movie Adaptation: Book to Screen Creative Condensation

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|
| 1. Private Planning | 27,000 | 8,500 | ~4,625 | 68.5% |
| 2. Public Research | 4,200 | 4,200 | ~0 | 0% |
| 3. Assessment Retrieval | 98,000 | 9,363 | ~22,159 | 90.4% |
| 4. Authoring Specialist | 201,250 | 101,858 | ~24,848 | 49.4% |
| 5. Critic Specialist | 207,250 | 107,858 | ~24,848 | 48% |
| 6. Targeted Repair | 208,250 | 108,858 | ~24,848 | 47.7% |

### Case `case-5-character-choice`: Character Choice: Ethical Dilemma in Creative Leadership

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|
| 1. Private Planning | 27,000 | 8,500 | ~4,625 | 68.5% |
| 2. Public Research | 4,200 | 4,200 | ~0 | 0% |
| 3. Assessment Retrieval | 98,000 | 8,933 | ~22,267 | 90.9% |
| 4. Authoring Specialist | 201,250 | 101,428 | ~24,956 | 49.6% |
| 5. Critic Specialist | 207,250 | 107,428 | ~24,956 | 48.2% |
| 6. Targeted Repair | 208,250 | 108,428 | ~24,956 | 47.9% |

### Case `case-6-science-mechanism`: Science Mechanism: Robotics Vision & Sensor Calibration

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|
| 1. Private Planning | 27,000 | 8,500 | ~4,625 | 68.5% |
| 2. Public Research | 4,200 | 4,200 | ~0 | 0% |
| 3. Assessment Retrieval | 98,000 | 8,857 | ~22,286 | 91% |
| 4. Authoring Specialist | 201,250 | 101,373 | ~24,969 | 49.6% |
| 5. Critic Specialist | 207,250 | 107,373 | ~24,969 | 48.2% |
| 6. Targeted Repair | 208,250 | 108,373 | ~24,969 | 48% |

### Case `case-7-table-organizer`: Format Variety: Evidence Matrix & Deductive Flowchart

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|
| 1. Private Planning | 27,000 | 8,500 | ~4,625 | 68.5% |
| 2. Public Research | 4,200 | 4,200 | ~0 | 0% |
| 3. Assessment Retrieval | 98,000 | 9,363 | ~22,159 | 90.4% |
| 4. Authoring Specialist | 201,250 | 101,858 | ~24,848 | 49.4% |
| 5. Critic Specialist | 207,250 | 107,858 | ~24,848 | 48% |
| 6. Targeted Repair | 208,250 | 108,858 | ~24,848 | 47.7% |

### Case `case-8-current-vs-evergreen`: Current vs Evergreen: James Webb Telescope Deep Field Discoveries

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|
| 1. Private Planning | 27,000 | 8,500 | ~4,625 | 68.5% |
| 2. Public Research | 4,200 | 4,200 | ~0 | 0% |
| 3. Assessment Retrieval | 98,000 | 4,581 | ~23,355 | 95.3% |
| 4. Authoring Specialist | 201,250 | 96,454 | ~26,199 | 52.1% |
| 5. Critic Specialist | 207,250 | 102,454 | ~26,199 | 50.6% |
| 6. Targeted Repair | 208,250 | 103,454 | ~26,199 | 50.3% |

## 4. Verification Protocol

- **Post-Plan Retrieval Integrity**: Each assessment question has its intent defined before querying CAP precedent cards.
- **Immutable Cutoff**: History retrieval enforces `observed_at <= cutoffTimestamp` to prevent leakage from post-claim student submissions.
- **Deterministic Manifest Hashing**: All retrieved evidence rows are hashed using SHA-256 for complete auditability.
- **Schema 2.5 Compliance**: Uses standard response layout primitives (`lines`, `table`, `organizer`, `sequence`) without introducing schema bumps.
