# CAP English Pilot Deep Review: Exam 115

> **Purpose**: Human-in-the-loop pedagogical verification of Phase 4 representative pilot digestion.
> Inspects 8 diverse question archetypes (visual single, clause grammar, dialogue implicature, multi-modal map, cloze discourse, narrative synthesis, informational evaluation).

---

## Executive Pilot Summary
- **Target Exam**: CAP 115
- **Representative Questions Analyzed**: Q1, Q20, Q22, Q23, Q26, Q32, Q38, Q43
- **Two-Pass Engine**: Pass A (Assessment Reverse-Engineering) + Pass B (Evidence Critic & Self-Repair)
- **Status**: Analyses Present

---

## Question 1 [Official Answer: `B`]

### 1. Corpus Extraction Foundation
- **Section**: `single`
- **Evidence Mode**: `visual_only`
- **Visual Evidence Required**: ✅ Yes
- **Required Assets**:
  - Path: `history_exams/assets/115/page-2.png` | Role: `single_image` | Hash: `ad861ba81799dae9cf8ada0553fe62faabb3398fd080f5fa71956fded0fec1c7`
- **Question Stem**: Look at the picture. All of the students who are exercising are wearing _____ .
- **Options**:
  - **(A)**: caps
  - **(B)**: glasses
  - **(C)**: jackets
  - **(D)**: pants

### 2. Pedagogical Reverse-Engineering & Cognitive Architecture
- **Primary Skill**: `vocabulary_in_context`
- **Secondary Skills**: `information_integration`
- **Cognitive Depth Target**: `D1_verbatim_retrieval`
- **Language Difficulty**: `A1_elementary`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multimodal_text_and_graphic`
- **Reasoning Operations**: `Parse the restrictive relative clause syntactic constraint: "who are exercising"`, `Distinguish active exercising students (left badminton girl, middle badminton boy, middle-right jump rope girl) from inactive bench spectators (right two students)`, `Inspect physical attire features across all active students to verify invariant attribute (glasses) and reject subset/inactive attributes (caps, jackets, pants)`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Syntactic constraint filtering ("who are exercising") combined with coordinate visual entity attribute verification.
- **Why The Question Works**: Penalizes superficial image scanning by requiring grammatical filtering of candidate entities before attribute matching.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `partial_truth` | Only the girl on the far left wears a cap among exercising students; the two students sitting on the bench wear caps but they are not exercising. | Scanning for any character wearing caps without filtering by the relative clause predicate. | page-2.png: bench spectators |
| **(B)** | ✅ **YES** | *N/A (Correct Answer)* | All three students actively engaged in exercise (playing badminton and jumping rope) are clearly depicted wearing glasses on their faces. | *None* | page-2.png: 3 exercising figures |
| **(C)** | ❌ No | `unsupported_world_knowledge` | All exercising students are wearing short-sleeve athletic t-shirts, not jackets. | Assuming general outdoor sportswear includes jackets without verifying the illustration. | page-2.png: athletic attire |
| **(D)** | ❌ No | `partial_truth` | The girl playing badminton on the left wears a pleated skirt, not pants. | Overgeneralizing pants to all exercising students when one wears a skirt. | page-2.png: lower attire |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ❌ No
- **Simplification Constraints**:
  - *Relative clause is required to establish entity subset constraint.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Add multiple overlapping activities with conflicting attire configurations.*
- **Student Failure Modes**:
  - *Selecting caps (A) by confusing bench spectators with exercising students.*
  - *Selecting pants (D) by overlooking the skirt worn by the badminton player.*
- **Targeted Misconceptions**:
  - *Assuming all characters in the image are subjects of the sentence.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `3906ee180301d8b8ff5cf06f0786f6ff12da7fbdc0af081b62ac2448ffa2a922`
- **Critic Audit Notes**: Passed 100% of factual grounding and evidence cross-check audits without repair.

---

## Question 20 [Official Answer: `C`]

### 1. Corpus Extraction Foundation
- **Section**: `passage_comprehension`
- **Evidence Mode**: `text_visual`
- **Visual Evidence Required**: ✅ Yes
- **Required Assets**:
  - Path: `history_exams/assets/115/page-4.png` | Role: `infographic` | Hash: `70d561b198b36c43083c5a5e2b32f6c93f7ed6a805dc5269da341bb7c7aa6321`
- **Passage Set**: `115-p20-21` (Genre: `infographic_chart_table` | Evidence Mode: `text_visual`)
> **Passage Context Excerpt**:
> [Visual/Graphic Content in Source PDF: infographic_chart_table on page 4]

- **Question Stem**: Amanda wants to make fruit tea by following The Best Fruit Tea You Can Make at Home . She has several kinds of fruit in the kitchen: apples, bananas, oranges, papayas, pears, and strawberries. Which are some of the fruits she can use to make the fruit tea?
- **Options**:
  - **(A)**: Oranges, papayas and pears.
  - **(B)**: Apples, bananas and oranges.
  - **(C)**: Apples, oranges and strawberries.
  - **(D)**: Bananas, papayas and strawberries.

### 2. Pedagogical Reverse-Engineering & Cognitive Architecture
- **Primary Skill**: `information_integration`
- **Secondary Skills**: `explicit_detail`
- **Cognitive Depth Target**: `D2_single_step_inference`
- **Language Difficulty**: `A2_basic`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multimodal_text_and_graphic`
- **Reasoning Operations**: `Identify Amanda kitchen fruit inventory: apples, bananas, oranges, papayas, pears, strawberries`, `Read the recipe callout Note: "Most fruits are good for making fruit tea, but not papayas or bananas"`, `Apply negative constraint to eliminate candidate options containing bananas or papayas`, `Verify that option C contains only permitted fruits (apples, oranges, strawberries)`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Practical procedural reading with highlighted negative constraint callout filter.
- **Why The Question Works**: Mirrors real-world task-based reading where following practical instructions requires checking exception boxes.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `literal_keyword_matching` | Contains papayas, which the recipe Note explicitly excludes ("not papayas or bananas"). | Ignoring negative constraint callouts and picking recognizable pantry fruits. | page-4.png: Note callout box |
| **(B)** | ❌ No | `literal_keyword_matching` | Contains bananas, which the recipe Note explicitly forbids. | Failing to check each item in the triple against exclusion rules. | page-4.png: Note callout box |
| **(C)** | ✅ **YES** | *N/A (Correct Answer)* | Apples are explicitly listed under "Things to get ready", while oranges and strawberries are permitted fruits under "Most fruits are good" and neither is excluded by the Note. | *None* | page-4.png: Things to get ready & Note |
| **(D)** | ❌ No | `literal_keyword_matching` | Contains both bananas and papayas, violating both explicit exclusions. | Total omission of the Note restriction. | page-4.png: Note callout box |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Preserve explicit negative constraint in callout note.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Add conditional rules based on fruit ripeness or quantities.*
- **Student Failure Modes**:
  - *Scanning only the ingredient list at the top and missing the Note box below.*
- **Targeted Misconceptions**:
  - *Assuming all edible fruits are automatically suitable for the recipe.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `2deea7c6c95ba8039e1c353d9ed07a84f66b8c9d25efd788e4dd2d27cce2af9c`
- **Critic Audit Notes**: Passed 100% of factual grounding and evidence cross-check audits without repair.

---

## Question 22 [Official Answer: `D`]

### 1. Corpus Extraction Foundation
- **Section**: `passage_comprehension`
- **Evidence Mode**: `text_visual`
- **Visual Evidence Required**: ✅ Yes
- **Required Assets**:
  - Path: `history_exams/assets/115/page-5.png` | Role: `comic` | Hash: `46ed46e6eeb5849045cd57408af85ce12f923872ea427ff67b07f4816e446ae0`
- **Passage Set**: `115-p22-23` (Genre: `comic_strip` | Evidence Mode: `text_visual`)
> **Passage Context Excerpt**:
> th
> In 6 grade, I tried to get the students
> I totally bombed it.
> to pick me as student leader. _____
> I’ll make class hours shorter.
> And we’ll have only three
> days of school a week…
> What? That’s not
> what a student
> leader can decide.
> He doesn’t
> know anything. _____ I was the best choice,
> but why didn’t people
> know that?
> I became a salesperson when I was 23,
> I bombed it again.
> and I believed I could be Number 1. _____
> You said you would
> Hawkins, we don’t need
> sell 50 cars a month.
> your service anymore.
> Don’t worry.
> But you sold only 1
> Go pack your things…
> I’ll sell 149 cars
> car in two months.
> next month.
> Why ?
> You said that
> a year ago.

- **Question Stem**: According to the comics, what kind of person is Hawkins?
- **Options**:
  - **(A)**: He sees good things in people.
  - **(B)**: He never goes to work on time.
  - **(C)**: He blindly follows other people.
  - **(D)**: He talks about things he can’t do.

### 2. Pedagogical Reverse-Engineering & Cognitive Architecture
- **Primary Skill**: `purpose_speaker_intent`
- **Secondary Skills**: `cross_sentence_inference`, `pragmatic_meaning`
- **Cognitive Depth Target**: `D3_multi_step_synthesis`
- **Language Difficulty**: `A2_basic`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multi_paragraph_global`
- **Reasoning Operations**: `Analyze Panel 1-2 episode: Hawkins runs for 6th grade leader promising 3 school days/week (unrealistic/beyond authority), gets 2 votes, bombs election`, `Analyze Panel 3-4 episode: Hawkins works as car salesman promising to sell 50 then 149 cars/month, sells only 1, gets fired`, `Synthesize the invariant psychological trait across both episodes: boasting and making impossible promises he cannot fulfill ("talks about things he can't do")`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Cross-panel thematic induction of a personality trait through recurring behavioral failure patterns.
- **Why The Question Works**: Requires high-level characterization across distinct chronological settings rather than literal sentence extraction.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `unsupported_world_knowledge` | Hawkins exhibits self-absorption ("I was the best choice, but why didn't people know that?"), not benevolence toward others. | Projecting positive character tropes without textual basis. | page-5.png: Panel 2 speech |
| **(B)** | ❌ No | `unsupported_world_knowledge` | Punctuality is never mentioned; his failure is extreme underperformance and empty boasting. | Associating being fired with tardiness rather than performance. | page-5.png: Panel 3-4 |
| **(C)** | ❌ No | `reversed_cause_effect` | Hawkins does not conform or follow others; he makes wild unilateral promises that contradict everyone else's judgment. | Confusing being influenced by others with being rejected by others. | page-5.png: Panel 1 |
| **(D)** | ✅ **YES** | *N/A (Correct Answer)* | In 6th grade he promised 3 days of school/week (which a student leader cannot decide); as a car salesman he promised 50 and then 149 cars/month but only sold 1. Both instances synthesize the trait of making impossible promises. | *None* | page-5.png: Panels 1 & 3 |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Maintain the contrast between grandiose promise and meager outcome in both scenes.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Add subtle facial expressions or third-party reactions that require pragmatic inference.*
- **Student Failure Modes**:
  - *Fixating on the dismissal in Panel 4 and picking generic workplace faults like tardiness (B).*
- **Targeted Misconceptions**:
  - *Assuming multiple choice options must match a specific quoted line rather than an abstract synthesis.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `88f72120d001d71f7bec953f867f9beab872cdfd2a3ec84583c7929d6457bdc8`
- **Critic Audit Notes**: Passed 100% of factual grounding and evidence cross-check audits without repair.

---

## Question 23 [Official Answer: `B`]

### 1. Corpus Extraction Foundation
- **Section**: `passage_comprehension`
- **Evidence Mode**: `text_visual`
- **Visual Evidence Required**: ✅ Yes
- **Required Assets**:
  - Path: `history_exams/assets/115/page-5.png` | Role: `comic` | Hash: `46ed46e6eeb5849045cd57408af85ce12f923872ea427ff67b07f4816e446ae0`
- **Passage Set**: `115-p22-23` (Genre: `comic_strip` | Evidence Mode: `text_visual`)
> **Passage Context Excerpt**:
> th
> In 6 grade, I tried to get the students
> I totally bombed it.
> to pick me as student leader. _____
> I’ll make class hours shorter.
> And we’ll have only three
> days of school a week…
> What? That’s not
> what a student
> leader can decide.
> He doesn’t
> know anything. _____ I was the best choice,
> but why didn’t people
> know that?
> I became a salesperson when I was 23,
> I bombed it again.
> and I believed I could be Number 1. _____
> You said you would
> Hawkins, we don’t need
> sell 50 cars a month.
> your service anymore.
> Don’t worry.
> But you sold only 1
> Go pack your things…
> I’ll sell 149 cars
> car in two months.
> next month.
> Why ?
> You said that
> a year ago.

- **Question Stem**: What does it mean when we say someone bombed something?
- **Options**:
  - **(A)**: They gave it up.
  - **(B)**: They failed at it.
  - **(C)**: They were fine with it.
  - **(D)**: They were careful about it.

### 2. Pedagogical Reverse-Engineering & Cognitive Architecture
- **Primary Skill**: `vocabulary_in_context`
- **Secondary Skills**: `local_inference`
- **Cognitive Depth Target**: `D2_single_step_inference`
- **Language Difficulty**: `A2_basic`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `cross_sentence_local`
- **Reasoning Operations**: `Locate target phrase "bombed it" in Panel 2 header ("I totally bombed it") and Panel 4 header ("I bombed it again")`, `Analyze context in Panel 2: Hawkins receives only 2 votes out of 40 on the scoreboard (crushing defeat)`, `Analyze context in Panel 4: Hawkins sells only 1 car in two months and is fired by his boss`, `Synthesize the common meaning of "bombed": failed completely / suffered total failure`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Multimodal contextual grounding of informal idiom through clear narrative outcomes.
- **Why The Question Works**: Demonstrates how authentic narrative context allows students to deduce unfamiliar colloquial vocabulary without prior rote memorization.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `grammatically_plausible_contextually_wrong` | Hawkins did not give up or resign voluntarily; he actively campaigned and was rejected by voters, and wanted to stay at his job but was fired. | Confusing failing at an effort with voluntarily quitting. | page-5.png: Panel 2 & 4 |
| **(B)** | ✅ **YES** | *N/A (Correct Answer)* | In both situations (getting 2 votes in an election, selling 1 car and getting fired), Hawkins suffered complete, disastrous failure. Therefore "bombed" means "failed at it". | *None* | page-5.png: Panel 2 scoreboard & Panel 4 dismissal |
| **(C)** | ❌ No | `unsupported_world_knowledge` | Hawkins exhibits bewildered distress and confusion ("why didn't people know that?", "Why?"), demonstrating he was not fine with the outcomes. | Misinterpreting emotional valence of the character. | page-5.png: Panel 2 & 4 speech bubbles |
| **(D)** | ❌ No | `irrelevant_distractor` | Hawkins acted carelessly and boastfully, not carefully. | Selecting an arbitrary antonym of reckless behavior. | page-5.png: Panels 1 & 3 |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Preserve the target idiomatic expression in caption.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Introduce subtle partial successes to force nuance between failure and underperformance.*
- **Student Failure Modes**:
  - *Assuming "bombed" refers literally to explosives.*
  - *Confusing failing (B) with voluntarily giving up (A).*
- **Targeted Misconceptions**:
  - *Believing vocabulary questions require pre-memorized dictionary definitions rather than context clues.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `97a2ecd307713ae939a7d8e67e31a4fa49f47e251361f66d600eb8738988e891`
- **Critic Audit Notes**: Passed 100% of factual grounding and evidence cross-check audits without repair.

---

## Question 26 [Official Answer: `B`]

### 1. Corpus Extraction Foundation
- **Section**: `passage_comprehension`
- **Evidence Mode**: `spatial`
- **Visual Evidence Required**: ✅ Yes
- **Required Assets**:
  - Path: `history_exams/assets/115/page-6.png` | Role: `map` | Hash: `6efeb83f5261390f96a1cf7ce65b57912496a9dfddd60b70aab7252b3a9f552a`
- **Passage Set**: `115-p24-26` (Genre: `brochure_flyer` | Evidence Mode: `spatial`)
> **Passage Context Excerpt**:
> This is a brochure for the Marigolds’ Home.
> The Marigolds’ Home
> Opening times:
> March to October
> 10:00-17:00
> November to February
> 10:00-16:00
> Closed on Mondays
> To make sure you enjoy your visit to The Marigolds’ Home, we’d like to ask you to follow
> the rules below:
> 1. Pets are not allowed in any areas of the Marigolds’ Home.
> 2. Eating and drinking are not allowed inside the buildings, except in the café.
> 3. Picture-taking is not allowed inside Sir Archie’s House.
> 4. Please take off your shoes before entering the Rabbit’s Temple.
> Become a member and save 10% on tickets and 30% on all items in the gift shops.
> To join, visit www.themarigoldshome.com .

- **Question Stem**: After shopping at the gift shop of the Main House, Lizzy walks out and sees the Family Library in front of her. She wants to visit the Rose Garden. How can she get there?
- **Options**:
  - **(A)**: Turn left and walk past the Main House, then go straight and turn right at the corner.
  - **(B)**: Turn left and walk past Sir Archie’s House, then turn right and walk past the Main House.
  - **(C)**: Turn right and go straight to the Farmyard, then turn right and go straight, then turn left at the corner.
  - **(D)**: Turn right and walk through the Butterfly Garden, then walk past the Rabbit’s Temple and the café.

### 2. Pedagogical Reverse-Engineering & Cognitive Architecture
- **Primary Skill**: `information_integration`
- **Secondary Skills**: `discourse_relationship`
- **Cognitive Depth Target**: `D3_multi_step_synthesis`
- **Language Difficulty**: `B1_intermediate`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multimodal_text_and_graphic`
- **Reasoning Operations**: `Locate starting position on map: Main House (5) gift shop exit facing North towards Family Library (4)`, `Establish character egocentric orientation: Facing North (upward on map)`, `Locate destination: Rose Garden (9) in the southeast area of the grounds`, `Trace candidate route B: Turn left (west/around path), walk past Sir Archie's House (7), turn right and walk past the Main House towards the Rose Garden pathway`, `Verify that option B correctly describes the valid connecting pathway to the Rose Garden without blocked walls or reversed vectors`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Allocentric map navigation conditioned by an egocentric orientation anchor.
- **Why The Question Works**: Tests high-order spatial reasoning by requiring mental rotation and pathway topology tracing.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `wrong_chronology` | Turning left from facing north leads west past Main Gate and away from the eastern Rose Garden. | Confusing east/west directions from the character viewpoint. | page-6.png: West road layout |
| **(B)** | ✅ **YES** | *N/A (Correct Answer)* | From the gift shop facing Family Library (North), taking the pathway loop past Sir Archie's House (7) and navigating past the Main House leads directly into the Rose Garden (9). | *None* | page-6.png: Map pathways |
| **(C)** | ❌ No | `partial_truth` | Turning right towards Farmyard (8) leads to the northeast perimeter where pathways dead-end without direct access to Rose Garden. | Assuming all perimeter roads form an unbroken circular loop. | page-6.png: Northeast layout |
| **(D)** | ❌ No | `wrong_referent` | Butterfly Garden (2) is in the southwest quadrant, behind and to the left of someone facing north, not reached by turning right. | Reversing left and right coordinates. | page-6.png: Quadrant positions |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Preserve directional verbs (turn left/right, walk past, at the corner).*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Add one-way signs, closed gates, or time-window access constraints on pathways.*
- **Student Failure Modes**:
  - *Confusing the reader static perspective (bottom of page) with the character orientation (facing North).*
  - *Failing to trace actual drawn pathways and assuming line-of-sight walking.*
- **Targeted Misconceptions**:
  - *Treating left/right in map questions as absolute page-left/page-right rather than character-heading relative.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `fded717407b3f21b57b1116ac0652b0a38cd63f04c32c575940f93278f74e589`
- **Critic Audit Notes**: Passed 100% of factual grounding and evidence cross-check audits without repair.

---

## Question 32 [Official Answer: `D`]

### 1. Corpus Extraction Foundation
- **Section**: `passage_comprehension`
- **Evidence Mode**: `text_visual`
- **Visual Evidence Required**: ✅ Yes
- **Required Assets**:
  - Path: `history_exams/assets/115/page-10.png` | Role: `infographic` | Hash: `4b5f03053ee0c2d5132af174886436c5318a55b272398866ccb09b89005892ff`
- **Passage Set**: `115-p32-34` (Genre: `infographic_chart_table` | Evidence Mode: `text_visual`)
> **Passage Context Excerpt**:
> SEA GLASS: GLASS BOTTLES’ SECOND LIFE
> Sea glass is made from the magic of the sea. It usually comes from glass bottles
> that are thrown into the water. Each piece of sea glass looks different, and sea
> glass is often seen on art pieces. The pictures below explain how sea glass is
> born.
> Glass bottles are thrown as garbage
> 1 into the sea.
> When these bottles ride the waves of
> the sea, they hit each other or other
> 2 garbage in the sea and break into
> small pieces of glass.
> Pieces of glass are pushed by sea water
> and move along the sea floor. The
> 3 sharp pieces slowly become rounder
> and rounder.
> After tens or hundreds of years in the
> sea, the pieces of glass grow an ice-like
> 4 white color on the outside and become
> sea glass.
> Sea glass is finally pushed up to the
> 5 beach.
> Artists collect pieces of sea glass and
> 6 put them into their works.
> However, people now seldom use glass to make bottles and bowls—paper bowls
> and cups have become more popular these days. This means there are fewer
> glass items in the sea, so less and less sea glass will be found in the future.

- **Question Stem**: Why does the title say “Glass Bottles’ Second Life” ?
- **Options**:
  - **(A)**: People collect sea glass and use it to make new glass bottles.
  - **(B)**: People collect sea glass at the beach and use it to make wishes.
  - **(C)**: Glass bottles that are thrown into the sea become the homes of sea animals.
  - **(D)**: Glass bottles that are thrown into the sea become sea glass which is used in art pieces.

### 2. Pedagogical Reverse-Engineering & Cognitive Architecture
- **Primary Skill**: `main_idea`
- **Secondary Skills**: `text_structure`, `sequence_cause_consequence`
- **Cognitive Depth Target**: `D3_multi_step_synthesis`
- **Language Difficulty**: `A2_basic`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multi_paragraph_global`
- **Reasoning Operations**: `Identify the title metaphor: "Glass Bottles' Second Life"`, `Scan the 6-step lifecycle diagram: Step 1 (thrown as garbage) -> Steps 2-4 (broken, smoothed, frosted into sea glass) -> Step 5 (beached) -> Step 6 (collected by artists for artworks)`, `Synthesize why it is called a "second life": discarded garbage bottles are reborn as sea glass used in art pieces`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Metaphorical title comprehension grounded in multi-stage process infographic synthesis.
- **Why The Question Works**: Evaluates macro-level text structure comprehension, ensuring students connect the opening title to the concluding stage of the diagram.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `reversed_cause_effect` | Sea glass is collected by artists for artwork, not re-melted into commercial glass bottles. | Equating "second life" literally with factory bottle recycling. | page-10.png: Step 6 |
| **(B)** | ❌ No | `unsupported_world_knowledge` | Making wishes at the beach is never mentioned in the text or process steps. | Injecting romanticized folklore without textual grounding. | page-10.png: entire diagram |
| **(C)** | ❌ No | `unsupported_world_knowledge` | Sea animals living in bottles is unsupported by the text, which focuses on geological wave erosion and artistic collection. | Confusing environmental marine biology themes with physical sea glass formation. | page-10.png: Steps 1-6 |
| **(D)** | ✅ **YES** | *N/A (Correct Answer)* | Glass bottles thrown into the sea break and erode into smooth sea glass over centuries, which artists then collect and repurpose in art pieces, giving them a meaningful "second life". | *None* | page-10.png: Intro & Step 6 |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Maintain the 6 chronological process stages.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Introduce competing ecological perspectives in an accompanying sidebar.*
- **Student Failure Modes**:
  - *Assuming a literal recycling definition (A) rather than reading Step 6.*
  - *Selecting marine animal habitats (C) based on general ocean associations.*
- **Targeted Misconceptions**:
  - *Interpreting titles through isolated prior knowledge rather than holistic diagram synthesis.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `f5b59870266ee201a224720d81b36703336eaf5bcdf48cd61804b5ffc3d83705`
- **Critic Audit Notes**: Passed 100% of factual grounding and evidence cross-check audits without repair.

---

## Question 38 [Official Answer: `C`]

### 1. Corpus Extraction Foundation
- **Section**: `passage_comprehension`
- **Evidence Mode**: `multi_document`
- **Visual Evidence Required**: ❌ No
- **Required Assets**:
  - Path: `history_exams/assets/115/page-12.png` | Role: `full_page` | Hash: `96956ca3e7cca66f9a9f483220491b59582e737750b9caa1bbc5b0f8ea426445`
  - Path: `history_exams/assets/115/page-13.png` | Role: `full_page` | Hash: `a53a58b50b35d17afdb7c5254625a192e13ee2cf302f0799c4149307e7a52693`
- **Passage Set**: `115-p35-39` (Genre: `multi_document_comparison` | Evidence Mode: `multi_document`)
> **Passage Context Excerpt**:
> Scandinavian News
> The Future of Icelandic
> by Anna Adams
> Icelandic is a language that is spoken only in Iceland.
> It has a long history. But many Icelanders are worried that
> they’re losing Icelandic.
> The reason for their worry is the prevalence of English
> in Iceland. “I use English when I talk to my housework
> robot, use my phone, and watch movies,” said Helgi
> Atlason, an engineer. There is a reason for that. Most
> of these products use English, and few companies care to change the language into
> Icelandic because there are only a small number of Icelandic speakers (314,000 people).
> Actually, you see English everywhere in Iceland.
> Icelanders also speak and hear more English than Icelandic these days because many
> foreigners who come to live and work in Iceland speak only English. “We can’t use
> Icelandic abroad, and we’re not using it much in Iceland, either. How do you expect our
> kids will want to learn it?” said Eirikur Wilson, a teacher.
> Will Iceland one day give up Icelandic for English? It may happen soon.
> Scandinavian News
> Our Future with Icelandic
> by Gunnar Eggertsson
> Many people think Icelandic is a language in its
> sickbed and that it needs to be saved. I understand their
> worries, but does the future of our language really look
> that bad?
> According to Dr. David Clingingsmith, a language
> needs at least 35,000 speakers to be “safe” from becoming
> a dying language. There are now 314,000 Icelandic
> speakers. Also, every year Iceland spends 51.3 million Icelandic crowns (3.7 million
> US dollars) teaching Icelandic to machines: phones, computers, and robots. Icelandic
> is appearing more often in products. Most importantly, schools still teach Icelandic to
> children. Clearly, we are not giving up our first language.
> However, I’m not saying that Iceland has done enough for Icelandic. Our country
> can do a better job at getting more people to speak this beautiful language. One way to
> do so is to give more language courses to foreigners. With much more work, I’m sure
> Icelandic can grow and even reach farther into the world.

- **Question Stem**: Are Anna Adams and Gunnar Eggertsson worried about the future of Icelandic?
- **Options**:
  - **(A)**: No, they are not.
  - **(B)**: Yes, they both are.
  - **(C)**: Adams is, but Eggertsson is not.
  - **(D)**: Adams is not, but Eggertsson is.

### 2. Pedagogical Reverse-Engineering & Cognitive Architecture
- **Primary Skill**: `cross_sentence_inference`
- **Secondary Skills**: `purpose_speaker_intent`, `discourse_relationship`
- **Cognitive Depth Target**: `D3_multi_step_synthesis`
- **Language Difficulty**: `B1_intermediate`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multi_paragraph_global`
- **Reasoning Operations**: `Analyze Document 1 (Anna Adams): Documents widespread fear that Icelandic is dying due to English prevalence; ends with ominous question "Will Iceland one day give up Icelandic for English? It may happen soon" -> Adams is worried`, `Analyze Document 2 (Gunnar Eggertsson): Acknowledges public worry ("I understand their worries, but does the future... really look that bad?"), then rebuts with data (314k speakers > 35k safety threshold, 51.3M crowns spent teaching Icelandic to AI/tech, schools continue teaching) and concludes "Clearly, we are not giving up our first language" -> Eggertsson is not worried`, `Synthesize comparative stance: Adams is worried, but Eggertsson is not (Option C)`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Paired-text authorial stance comparison with rhetorical concession differentiation.
- **Why The Question Works**: Requires discerning an author genuine stance from quoted voices and rhetorical concessions across distinct viewpoints.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `partial_truth` | Ignores Adams' explicit warnings that Icelanders are losing Icelandic to English products and foreigners. | Overgeneralizing Eggertsson's optimism to both authors. | page-12.png: Article 1 |
| **(B)** | ❌ No | `partial_truth` | Conflates Eggertsson's rhetorical opening ("I understand their worries") with his actual stance, ignoring his empirical rebuttal. | Mistaking a rhetorical concession for the author's primary thesis. | page-12.png: Article 2 |
| **(C)** | ✅ **YES** | *N/A (Correct Answer)* | Adams presents the alarming perspective that English is displacing Icelandic and threatens its survival, while Eggertsson counters that 314,000 speakers, heavy machine-learning investment, and school curricula ensure Icelandic is safe and not being abandoned. | *None* | page-12.png: Articles 1 & 2 |
| **(D)** | ❌ No | `reversed_cause_effect` | Directly inverts the two authors' positions. | Transposing author attribution between paired articles. | page-12.png: Author bylines & conclusions |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Preserve the contrasting thesis and counter-argument structure.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Add a third brief perspective to create a 3-way matrix synthesis.*
- **Student Failure Modes**:
  - *Selecting (B) because Eggertsson writes "I understand their worries" in line 2 of his piece.*
  - *Transposing the two authors (D).*
- **Targeted Misconceptions**:
  - *Assuming that mentioning an opposing viewpoint means endorsing it.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `08a47a2dc3edbebb72e7287a1b0bdca19a9369ab753573a0873a53ab190441ee`
- **Critic Audit Notes**: Passed 100% of factual grounding and evidence cross-check audits without repair.

---

## Question 43 [Official Answer: `C`]

### 1. Corpus Extraction Foundation
- **Section**: `cloze`
- **Evidence Mode**: `text_only`
- **Visual Evidence Required**: ❌ No
- **Passage Set**: `115-p40-43` (Genre: `cloze_passage` | Evidence Mode: `text_only`)
> **Passage Context Excerpt**:
> A long time ago, there was an old king who had no child of his own.
> The king was worried that his land would fall into the wrong hands
> after his death, so he decided to pick a child in his land to take the
> high seat. One day, he called all the children to his castle and gave
> each of them a seed. “Come back on New Year’s Day and show me
> what you have grown,” he said to them, “and I will 40 .”
> Every child brought their seeds home carefully. One of the children,
> Wong, planted his seed in a pot. He gave it water every day and made
> sure there was sun to help it grow. 41 .
> Then, Sung, the child of the richest family in the land, told people that
> a small plant was growing from his seed. He was 42 . Everyone
> excitedly said that he would be king. Soon, one after another, more
> and more children were also saying that they had something in their
> pots. But Wong still didn’t find anything in his.
> On the big day, when Wong brought his pot to the castle, he saw all
> the other children carrying interesting plants. Some had flowers
> in the shape of a bird, and some had grasses of different colors.
> Everyone proudly showed their plants to the king, but the king
> looked unhappy until he saw Wong’s pot. “I boiled the seeds before
> I gave them out, so no plants could grow from them.” The king
> looked seriously at the children. “There is only one child who is
> 43 enough to be king.”
> Ten years later, the king died. On his deathbed, he was not worried
> because he knew Wong would be a good king.

- **Question Stem**: (Cloze blank 43)
- **Options**:
  - **(A)**: wise
  - **(B)**: strong
  - **(C)**: honest
  - **(D)**: popular

### 2. Pedagogical Reverse-Engineering & Cognitive Architecture
- **Primary Skill**: `vocabulary_in_context`
- **Secondary Skills**: `discourse_relationship`, `sequence_cause_consequence`
- **Cognitive Depth Target**: `D3_multi_step_synthesis`
- **Language Difficulty**: `A2_basic`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multi_paragraph_global`
- **Reasoning Operations**: `Follow narrative setup: King gives boiled seeds to all children to grow plants`, `Track plot twist: Boiled seeds cannot grow; other children cheated and replaced seeds with flowering plants`, `Analyze Wong's behavior: Wong watered his pot diligently but brought an empty pot with honesty`, `Resolve cloze blank 43: "There is only one child who is _____ enough to be king" -> Wong was the only "honest" child`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Narrative climax cloze resolution driven by plot twist and character moral evaluation.
- **Why The Question Works**: Transforms cloze from mechanical local syntax into deep reading comprehension of moral fable resolution.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `unsupported_world_knowledge` | Wong did not demonstrate intellectual shrewdness; his trial tested truthfulness versus deceit. | Selecting generic royal virtues ("wise king") without resolving the seed honesty test. | page-14.png: Paragraph 4 |
| **(B)** | ❌ No | `irrelevant_distractor` | Physical strength is completely unrelated to planting seeds or moral integrity. | Arbitrary adjective association. | page-14.png |
| **(C)** | ✅ **YES** | *N/A (Correct Answer)* | Because the king had boiled the seeds, no plants could legitimately grow. All other children lied by substituting fake plants, while Wong truthfully presented his empty pot, proving he was the only "honest" child. | *None* | page-14.png: Paragraph 4 |
| **(D)** | ❌ No | `reversed_cause_effect` | Sung and the other children with beautiful plants were popular with the crowd; Wong was lonely with his empty pot. | Confusing crowd popularity with the king's moral standard. | page-14.png: Paragraph 3 |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Preserve the key narrative turning point (boiled seed revelation).*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Add a subplot where another child hesitated before cheating.*
- **Student Failure Modes**:
  - *Choosing (A) wise due to the traditional fairy tale archetype of the "wise king".*
  - *Failing to connect the boiled seed clue to the honesty test.*
- **Targeted Misconceptions**:
  - *Relying on generic fairy tale tropes rather than the specific cause-and-effect mechanism of the plot.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `c056502b157a5553af684be3c15f04acf550569afb6c1b2931b67b26c46e740d`
- **Critic Audit Notes**: Passed 100% of factual grounding and evidence cross-check audits without repair.

---

