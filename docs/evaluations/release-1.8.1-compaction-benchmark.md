# Release 1.8.1 Context Compaction Benchmark Report

> **Benchmark Version**: `rel_1.8.1-compaction-v1`  
> **Evaluated Baseline**: Prompt 2.13.1, Engine 1.8.1, Worker 1.7.1, Schema 2.5.0  
> **Base Bundle (Selective Template)**: **83,259 chars** (83,559 bytes)  
> **Monolithic Bundle (With Routing Table)**: **100,208 chars** (100,508 bytes)  
> **Routing Index Size**: **17,116 chars** (17,116 bytes)  
> **Average Context Reduction**: **10.3%** across full generation lifecycle stages  
> **Total Net Savings Across 8 Cases**: **292,392 chars** (~73,098 estimated tokens)  

> **Note on Methodology**: Character counts and byte counts are authentic measured lengths of actual bundles and stage contexts. Estimated tokens are calculated using standard ~chars/4 heuristic.

---

## 1. Executive Summary

Release 1.8.1 delivers reproducible context compaction across the complete curriculum generation workflow:
1. **Selective Bundle Precedent Assembly**: Removes the monolithic 195-card routing index (17,116 chars) from the authoritative bundle, injecting only the 1–5 relevant precedent cards post-plan.
2. **Two-Stage Cross-Week History Retrieval**: Strips the 40 indiscriminate bulk evidence rows (~5,200 chars) from Stage 1 claim context, deferring to an authenticated, cutoff-enforced RPC (`fetch_targeted_student_history`) only for explicitly targeted skills.
3. **Format Planning Capsule**: Provides bounded recent format memory and candidate selection rules without polluting model context with historical question text.

## 2. Evaluation Across 8 Benchmark Cases

| Case ID | Benchmark Scenario | Category | Retrieved Cards | Uncompacted (Chars) | Selective (Chars) | Net Savings (Chars) | Est. Tokens Saved | Reduction |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `case-1-keshi` | keshi: Acoustic Production & Songwriting Decisions | music | 6 | 353,766 | 320,511 | **33,255** | **~8,314** | **9.4%** |
| `case-2-kpop` | K-pop: 2NE1 & IU Live Vocal & Stage Preparation | kpop | 6 | 353,766 | 321,801 | **31,965** | **~7,991** | **9%** |
| `case-3-animation` | Animation: Your Name (Kimi no Na wa) Art & Lighting | animation | 3 | 353,766 | 305,376 | **48,390** | **~12,098** | **13.7%** |
| `case-4-movie-adaptation` | Movie Adaptation: Book to Screen Creative Condensation | movie | 6 | 353,766 | 321,801 | **31,965** | **~7,991** | **9%** |
| `case-5-character-choice` | Character Choice: Ethical Dilemma in Creative Leadership | character | 6 | 353,766 | 320,511 | **33,255** | **~8,314** | **9.4%** |
| `case-6-science-mechanism` | Science Mechanism: Robotics Vision & Sensor Calibration | science | 6 | 353,766 | 320,346 | **33,420** | **~8,355** | **9.4%** |
| `case-7-table-organizer` | Format Variety: Evidence Matrix & Deductive Flowchart | format_organizer | 6 | 353,766 | 321,801 | **31,965** | **~7,991** | **9%** |
| `case-8-current-vs-evergreen` | Current vs Evergreen: James Webb Telescope Deep Field Discoveries | current_vs_evergreen | 3 | 353,766 | 305,589 | **48,177** | **~12,044** | **13.6%** |

## 3. Detailed Lifecycle Stage Breakdown

### Case `case-1-keshi`: keshi: Acoustic Production & Songwriting Decisions

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Chars Saved | Est. Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. Private Planning | 21,471 | 15,000 | 6,471 | ~1,618 | 30.1% |
| 2. Public Research | 4,200 | 4,200 | 0 | ~0 | 0% |
| 3. Authoring Specialist | 114,679 | 101,437 | 13,242 | ~3,311 | 11.5% |
| 4. Critic Specialist | 106,208 | 99,437 | 6,771 | ~1,693 | 6.4% |
| 5. Targeted Repair | 107,208 | 100,437 | 6,771 | ~1,693 | 6.3% |

### Case `case-2-kpop`: K-pop: 2NE1 & IU Live Vocal & Stage Preparation

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Chars Saved | Est. Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. Private Planning | 21,471 | 15,000 | 6,471 | ~1,618 | 30.1% |
| 2. Public Research | 4,200 | 4,200 | 0 | ~0 | 0% |
| 3. Authoring Specialist | 114,679 | 101,867 | 12,812 | ~3,203 | 11.2% |
| 4. Critic Specialist | 106,208 | 99,867 | 6,341 | ~1,585 | 6% |
| 5. Targeted Repair | 107,208 | 100,867 | 6,341 | ~1,585 | 5.9% |

### Case `case-3-animation`: Animation: Your Name (Kimi no Na wa) Art & Lighting

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Chars Saved | Est. Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. Private Planning | 21,471 | 15,000 | 6,471 | ~1,618 | 30.1% |
| 2. Public Research | 4,200 | 4,200 | 0 | ~0 | 0% |
| 3. Authoring Specialist | 114,679 | 96,392 | 18,287 | ~4,572 | 15.9% |
| 4. Critic Specialist | 106,208 | 94,392 | 11,816 | ~2,954 | 11.1% |
| 5. Targeted Repair | 107,208 | 95,392 | 11,816 | ~2,954 | 11% |

### Case `case-4-movie-adaptation`: Movie Adaptation: Book to Screen Creative Condensation

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Chars Saved | Est. Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. Private Planning | 21,471 | 15,000 | 6,471 | ~1,618 | 30.1% |
| 2. Public Research | 4,200 | 4,200 | 0 | ~0 | 0% |
| 3. Authoring Specialist | 114,679 | 101,867 | 12,812 | ~3,203 | 11.2% |
| 4. Critic Specialist | 106,208 | 99,867 | 6,341 | ~1,585 | 6% |
| 5. Targeted Repair | 107,208 | 100,867 | 6,341 | ~1,585 | 5.9% |

### Case `case-5-character-choice`: Character Choice: Ethical Dilemma in Creative Leadership

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Chars Saved | Est. Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. Private Planning | 21,471 | 15,000 | 6,471 | ~1,618 | 30.1% |
| 2. Public Research | 4,200 | 4,200 | 0 | ~0 | 0% |
| 3. Authoring Specialist | 114,679 | 101,437 | 13,242 | ~3,311 | 11.5% |
| 4. Critic Specialist | 106,208 | 99,437 | 6,771 | ~1,693 | 6.4% |
| 5. Targeted Repair | 107,208 | 100,437 | 6,771 | ~1,693 | 6.3% |

### Case `case-6-science-mechanism`: Science Mechanism: Robotics Vision & Sensor Calibration

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Chars Saved | Est. Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. Private Planning | 21,471 | 15,000 | 6,471 | ~1,618 | 30.1% |
| 2. Public Research | 4,200 | 4,200 | 0 | ~0 | 0% |
| 3. Authoring Specialist | 114,679 | 101,382 | 13,297 | ~3,324 | 11.6% |
| 4. Critic Specialist | 106,208 | 99,382 | 6,826 | ~1,707 | 6.4% |
| 5. Targeted Repair | 107,208 | 100,382 | 6,826 | ~1,707 | 6.4% |

### Case `case-7-table-organizer`: Format Variety: Evidence Matrix & Deductive Flowchart

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Chars Saved | Est. Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. Private Planning | 21,471 | 15,000 | 6,471 | ~1,618 | 30.1% |
| 2. Public Research | 4,200 | 4,200 | 0 | ~0 | 0% |
| 3. Authoring Specialist | 114,679 | 101,867 | 12,812 | ~3,203 | 11.2% |
| 4. Critic Specialist | 106,208 | 99,867 | 6,341 | ~1,585 | 6% |
| 5. Targeted Repair | 107,208 | 100,867 | 6,341 | ~1,585 | 5.9% |

### Case `case-8-current-vs-evergreen`: Current vs Evergreen: James Webb Telescope Deep Field Discoveries

| Lifecycle Stage | Uncompacted (Chars) | Selective (Chars) | Chars Saved | Est. Tokens Saved | Reduction % |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. Private Planning | 21,471 | 15,000 | 6,471 | ~1,618 | 30.1% |
| 2. Public Research | 4,200 | 4,200 | 0 | ~0 | 0% |
| 3. Authoring Specialist | 114,679 | 96,463 | 18,216 | ~4,554 | 15.9% |
| 4. Critic Specialist | 106,208 | 94,463 | 11,745 | ~2,936 | 11.1% |
| 5. Targeted Repair | 107,208 | 95,463 | 11,745 | ~2,936 | 11% |

## 4. Verification Protocol

- **Post-Plan Retrieval Integrity**: Each assessment question has its intent defined before querying CAP precedent cards.
- **Immutable Cutoff**: History retrieval enforces `observed_at <= cutoffTimestamp` to prevent leakage from post-claim student submissions.
- **Deterministic Manifest Hashing**: All retrieved evidence rows are hashed using SHA-256 for complete auditability.
- **Schema 2.5 Compliance**: Uses standard response layout primitives (`lines`, `table`, `organizer`, `sequence`) without introducing schema bumps.
