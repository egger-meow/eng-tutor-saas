# Release 1.8.2: controlled context sizing

This is a reproducible comparison of real prompt-builder strings with explicitly synthetic sizing inputs. It does not measure production executions, verified research, teaching quality, hidden system/tool context, or billed tokens. No fabricated biography/science claims are used as grounding.

Matched baseline: same release and evidence before presentation compaction. 1542245 → 1490327 characters (3.37% reduction), including one optional repair per case.

Savings come only from whitespace in retrieved CAP cards, duplicate delivery memory, and runtime removal of build hashes / legacy conversion implementations. Current schema definitions, teaching rules, per-item precedent refs, feedback and repair evidence remain available.

| Scenario | CAP cards | Before chars | After chars |
|---|---:|---:|---:|
| keshi: Acoustic Production & Songwriting Decisions | 3 | 195081 | 188285 |
| K-pop: 2NE1 & IU Live Vocal & Stage Preparation | 3 | 195819 | 189023 |
| Animation: Your Name (Kimi no Na wa) Art & Lighting | 0 | 184826 | 179276 |
| Movie Adaptation: Book to Screen Creative Condensation | 3 | 195852 | 189056 |
| Character Choice: Chihiro in Spirited Away | 3 | 194992 | 188196 |
| Science Mechanism: Robotics Vision & Sensor Calibration | 3 | 194866 | 188028 |
| Format Variety: Evidence Matrix & Deductive Flowchart | 3 | 195890 | 189094 |
| Current vs Evergreen: James Webb Telescope Deep Field Discoveries | 0 | 184919 | 179369 |

Actual local executions now write `.runtime/private-generation/<job>/prompt-metrics.json`: every attempted model input, stage, status, UTF-8 bytes and SHA-256, including planning and author repairs. These private runtime records are not committed. Provider-reported usage and tool-result sizes require separate instrumentation; character counts must not be described as token savings.
