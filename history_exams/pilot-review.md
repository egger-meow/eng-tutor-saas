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
- **Primary Skill**: `information_integration`
- **Secondary Skills**: `vocabulary_in_context`, `grammar_in_context`
- **Cognitive Depth Target**: `D2_single_step_inference`
- **Language Difficulty**: `A1_elementary`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multimodal_text_and_graphic`
- **Reasoning Operations**: `Use 'who are exercising' to exclude the students who are sitting and resting from the comparison set.`, `Inspect the three exercising students and identify the one visible attribute shared by all three.`, `Reject attributes that are worn by only one exercising student or that belong mainly to the non-exercising students.`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: The item combines grammatical subset filtering with visual attribute intersection: the learner must first decide who counts as 'students who are exercising' and then test each noun against every person in that subset.
- **Why The Question Works**: Several answer choices are visibly present somewhere in the scene, so superficial picture scanning is insufficient. Only glasses remain true for all of the students who satisfy the stem's activity condition.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `partial_truth` | Caps appear in the scene, including on students who are sitting, but a cap is not shared by all three exercising students. | Scanning the whole picture for a visible object without first applying the relative-clause filter. | 115 page 2, Q1 illustration: exercising and resting students |
| **(B)** | ✅ **YES** | *N/A (Correct Answer)* | The three students actively exercising in the picture are the badminton players and the student jumping rope, and all three are wearing glasses. Therefore B is the only option that satisfies the word 'all' after the exercising subset is correctly identified. | *None* | 115 page 2, Q1 illustration: three exercising students |
| **(C)** | ❌ No | `unsupported_world_knowledge` | The exercising students are not all wearing jackets; treating jackets as ordinary sportswear imports a plausible idea instead of checking the drawing. | Replacing direct visual verification with an expectation about what people might wear while exercising. | 115 page 2, Q1 illustration: upper-body clothing |
| **(D)** | ❌ No | `partial_truth` | Pants are not common to the entire exercising subset because the exercising badminton girl is shown in a skirt rather than pants. | Checking only some target figures and failing to enforce the universal quantifier 'all'. | 115 page 2, Q1 illustration: lower-body clothing |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Retain a grammatical condition equivalent to 'who are exercising'.*
  - *Retain a universal quantifier such as 'all' so every target figure must be checked.*
  - *Keep multiple visible answer attributes in the scene to prevent direct object naming.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Add another non-exercising figure who also wears glasses so subset filtering becomes even more important.*
  - *Ask which option is true of exactly the exercising students but not the resting students, creating a two-set comparison without harder vocabulary.*
- **Student Failure Modes**:
  - *Including the students sitting on the bench when interpreting 'students who are exercising'.*
  - *Choosing an attribute after seeing it on one or two students instead of checking every exercising student.*
  - *Ignoring the quantifier 'all' and treating a partial match as sufficient.*
- **Targeted Misconceptions**:
  - *Every person visible in a picture is automatically part of the grammatical subject set.*
  - *A visually salient attribute can answer an 'all' question even when one target person lacks it.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `1fc1a875fd4db3f122a2742db21b6bf80b7154acd9d03a0a3fc64dc3b08b6a2a`
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
> The Best Fruit Tea You Can Make at Home
> Things to get ready: 3-4 teabags (green or black tea), half an apple, half a peach, half a pear, 20 mL lemon juice, 1,200 mL water, 30 g sugar.
> Note: Most fruits are good for making fruit tea, but not papayas or bananas.
> How to make fruit tea: boil water; steep the teabags for 2-3 minutes and remove them; cut fruit into small pieces; put the fruit into the hot tea for 5-6 minutes; add sugar and lemon juice and stir for at least 10 seconds.
> Now enjoy the tea!

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
- **Reasoning Operations**: `Read the note excluding papayas and bananas.`, `Check every fruit in each option.`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Only one option contains neither explicitly forbidden fruit.
- **Why The Question Works**: Each distractor violates the visual rule with at least one listed fruit.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `other` | Papaya is explicitly excluded. | Checking only part of a set. | page 4 infographic |
| **(B)** | ❌ No | `other` | Banana is explicitly excluded. | Treating one acceptable member as sufficient. | page 4 infographic |
| **(C)** | ✅ **YES** | *N/A (Correct Answer)* | Apples, oranges, and strawberries are allowed because the note excludes only papayas and bananas; C is correct. | *None* | history_exams/assets/115/page-4.png |
| **(D)** | ❌ No | `other` | Both banana and papaya are excluded. | Missing a negative rule. | page 4 infographic |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Keep the exclusion rule and multi-item options.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Add a second independent ingredient constraint.*
- **Student Failure Modes**:
  - *Checking only one fruit in each option.*
  - *Missing the word 'not'.*
- **Targeted Misconceptions**:
  - *A set answer must satisfy every constraint.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `16c8292be34e3e9aa999227613b02f608fb0e4b6d075d6bc90b3e747658db904`
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
- **Primary Skill**: `local_inference`
- **Secondary Skills**: `information_integration`
- **Cognitive Depth Target**: `D3_multi_step_synthesis`
- **Language Difficulty**: `A2_basic`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multimodal_text_and_graphic`
- **Reasoning Operations**: `Compare Hawkins's school and work promises.`, `Abstract the repeated gap between claims and ability.`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Both episodes show unrealistic promises followed by failure.
- **Why The Question Works**: The answer must generalize across panels, not repeat one event.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `unsupported_world_knowledge` | The comic is about Hawkins's own inflated claims, not seeing good in others. | Choosing a generic positive trait. | page 5 comic |
| **(B)** | ❌ No | `unsupported_world_knowledge` | No panel concerns lateness. | Inventing a workplace detail. | page 5 comic |
| **(C)** | ❌ No | `reversed_cause_effect` | He insists on his own plans rather than blindly following others. | Confusing overconfidence with conformity. | page 5 comic |
| **(D)** | ✅ **YES** | *N/A (Correct Answer)* | Hawkins repeatedly talks about outcomes he cannot deliver, so D is correct. | *None* | history_exams/assets/115/page-5.png |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Keep two parallel failures.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Make the second episode less explicit.*
- **Student Failure Modes**:
  - *Using one panel only.*
  - *Mistaking confidence for competence.*
- **Targeted Misconceptions**:
  - *Character traits can require cross-episode abstraction.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `06adab5850321ec896c1d0191b590082602248ede458a32caf5db47d22f802fb`
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
- **Secondary Skills**: `information_integration`, `local_inference`
- **Cognitive Depth Target**: `D2_single_step_inference`
- **Language Difficulty**: `A2_basic`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multimodal_text_and_graphic`
- **Reasoning Operations**: `Use election and firing outcomes as context.`, `Map the repeated phrase to the shared result.`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: The phrase appears after two unmistakable failures.
- **Why The Question Works**: Repeated visual context disambiguates an unfamiliar idiom.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `partial_truth` | He does not voluntarily give up either attempt. | Confusing failure with quitting. | page 5 comic |
| **(B)** | ✅ **YES** | *N/A (Correct Answer)* | Hawkins failed badly in both cases, so 'bombed' means failed at it; B is correct. | *None* | history_exams/assets/115/page-5.png |
| **(C)** | ❌ No | `reversed_cause_effect` | The scenes show negative consequences, not being fine with them. | Ignoring outcome polarity. | page 5 comic |
| **(D)** | ❌ No | `unsupported_world_knowledge` | Carefulness is not the shared meaning. | Substituting a behavior for contextual meaning. | page 5 comic |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Keep both failures.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Remove one explicit failure label.*
- **Student Failure Modes**:
  - *Using the literal noun meaning of bomb.*
  - *Reading only one occurrence.*
- **Targeted Misconceptions**:
  - *Idioms can be decoded from repeated outcome frames.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `d93ebacc99ee9c7aed3d9400d8957903c889e3a9f1846878ff3bf16fe82b8be9`
- **Critic Audit Notes**: Passed 100% of factual grounding and evidence cross-check audits without repair.

---

## Question 26 [Official Answer: `C`]

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
- **Secondary Skills**: `local_inference`, `information_integration`, `sequence_cause_consequence`
- **Cognitive Depth Target**: `D3_multi_step_synthesis`
- **Language Difficulty**: `A2_basic`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multimodal_text_and_graphic`
- **Reasoning Operations**: `Establish facing direction from Family Library being in front.`, `Trace each route step-by-step.`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Correctness depends on orientation, road continuity, landmarks, and turn order.
- **Why The Question Works**: All routes mention real places and sound plausible until traced.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `other` | The left-first sequence does not reach the Rose Garden from the oriented start. | Not tracing turns. | page 6 map |
| **(B)** | ❌ No | `other` | Passing Sir Archie's House then Main House does not match the needed progression. | Choosing familiar landmarks without route continuity. | page 6 map |
| **(C)** | ✅ **YES** | *N/A (Correct Answer)* | From the Main House with the Family Library ahead, the route that matches the map goes right toward the Farmyard, then right and straight, then left to the Rose Garden; C is correct. | *None* | history_exams/assets/115/page-6.png |
| **(D)** | ❌ No | `other` | The Butterfly Garden and Rabbit's Temple chain runs away from the Rose Garden route. | Following a scenic chain rather than geometry. | page 6 map |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Keep orientation and map geometry.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Remove one landmark cue.*
- **Student Failure Modes**:
  - *Ignoring the facing-direction sentence.*
  - *Checking landmarks but not turns.*
- **Targeted Misconceptions**:
  - *Map questions require orientation plus continuity.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `bf38930d1d8c5dc02588c34195b3b7a774132f78441c78aa0c33ade81a38b496`
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
- **Secondary Skills**: `information_integration`, `other_uncertain`
- **Cognitive Depth Target**: `D3_multi_step_synthesis`
- **Language Difficulty**: `A2_basic`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multimodal_text_and_graphic`
- **Reasoning Operations**: `Trace bottles through sea-glass formation.`, `Connect the endpoint to artistic reuse.`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: The title compresses transformation plus reuse into a metaphor.
- **Why The Question Works**: The correct answer must include both the new material and its new function.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `reversed_cause_effect` | Sea glass is not remade into bottles. | Assuming reuse means restoration to the original product. | page 10 diagram |
| **(B)** | ❌ No | `unsupported_world_knowledge` | No wish-making is mentioned. | Importing beach folklore. | page 10 diagram |
| **(C)** | ❌ No | `unsupported_world_knowledge` | No sea-animal homes appear in the process. | Choosing a plausible environmental story. | page 10 diagram |
| **(D)** | ✅ **YES** | *N/A (Correct Answer)* | Discarded bottles become sea glass and are then used in art pieces, giving them a 'second life'; D is correct. | *None* | history_exams/assets/115/page-10.png |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Keep transformation and reuse endpoint.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Make the title less explicit.*
- **Student Failure Modes**:
  - *Taking the title literally.*
  - *Stopping before the art endpoint.*
- **Targeted Misconceptions**:
  - *Titles can summarize a multi-stage conceptual arc.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `1e8e894229eccd2f94b5393bdb23dcbd3e0447a1689c3b09da08ba1c60c1f18d`
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
- **Secondary Skills**: `information_integration`, `purpose_speaker_intent`, `main_idea`
- **Cognitive Depth Target**: `D3_multi_step_synthesis`
- **Language Difficulty**: `A2_basic`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multi_paragraph_global`
- **Reasoning Operations**: `Infer Adams's concern from her conclusion.`, `Infer Eggertsson's comparatively optimistic stance from his rebuttal and evidence.`, `Map the two stances to the combined option.`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: Cross-document stance comparison selects the asymmetric answer: Adams is worried, Eggertsson is not.
- **Why The Question Works**: Both writers discuss the same risk and acknowledge work remains, so learners must distinguish concern about extinction from support for improvement.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `overgeneralization` | It ignores Adams's explicit worry that Icelandic may soon be given up for English. | Collapsing two authors into a shared neutral stance because they discuss the same topic. | The Future of Icelandic ending |
| **(B)** | ❌ No | `overgeneralization` | Eggertsson acknowledges improvement is needed but argues Icelandic is not currently in such danger, so he is not worried in the same way Adams is. | Treating any call for improvement as equivalent to fear of language death. | Our Future with Icelandic |
| **(C)** | ✅ **YES** | *N/A (Correct Answer)* | Adams warns Iceland may give up Icelandic soon, while Eggertsson argues the situation is not that bad and provides evidence of safety, so C is correct. | *None* | both Icelandic articles |
| **(D)** | ❌ No | `reversed_cause_effect` | This reverses the authors' positions: Adams is the pessimistic writer, Eggertsson the reassuring one. | Remembering the stance contrast but assigning it to the wrong author. | both article conclusions |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Keep one clearly pessimistic conclusion and one evidence-based reassuring conclusion.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Make both authors acknowledge counterarguments and require separating final stance from concessions.*
- **Student Failure Modes**:
  - *Equating 'more should be done' with 'worried the language will disappear'.*
  - *Remembering a contrast but swapping authors.*
- **Targeted Misconceptions**:
  - *Writers who cover the same problem necessarily share the same stance.*
  - *A nuanced optimistic writer cannot still advocate additional action.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `22c0475e9084ba622fd3dec64decf868fd69c1488b172b51f7b339d71d256fcc`
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
- **Primary Skill**: `local_inference`
- **Secondary Skills**: `sequence_cause_consequence`, `pragmatic_meaning`
- **Cognitive Depth Target**: `D4_evaluative_pragmatic`
- **Language Difficulty**: `A2_basic`
- **Evidence Necessity**: `essential`
- **Evidence Span**: `multi_paragraph_global`
- **Reasoning Operations**: `Infer the consequence of boiled seeds: genuine growth was impossible.`, `Compare Wong's empty pot with other children's plants.`, `Infer the moral trait being tested.`

#### Question Mechanism & Pedagogical Function
- **Mechanism**: The story's reveal turns an apparently failed growing task into a hidden character test; the empty pot demonstrates honesty.
- **Why The Question Works**: Readers must reinterpret the entire story after the reveal, a classic reversal that supports high cognitive depth with simple vocabulary.

### 3. Option-by-Option Micro-Analysis

| Option | Correct? | Strategy / Mechanism | Pedagogical Rationale | Misconception Targeted | Evidence Reference |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **(A)** | ❌ No | `partial_truth` | Wong may appear wise in hindsight, but the test directly reveals truthfulness, not superior knowledge; he did not know the seeds were boiled. | Equating a good outcome with wisdom regardless of what the character knew. | 115-p40-43 |
| **(B)** | ❌ No | `unsupported_world_knowledge` | Physical strength plays no role in planting, reporting, or the king's reveal. | Choosing a stereotypical leadership trait not tested by the story. | 115-p40-43 |
| **(C)** | ✅ **YES** | *N/A (Correct Answer)* | Because boiled seeds could not grow, Wong is the only child whose empty pot truthfully reflects what happened. The king therefore values him as honest; C is correct. | *None* | 115-p40-43 climax |
| **(D)** | ❌ No | `grammatically_plausible_contextually_wrong` | Popularity is associated with Sung's crowd approval, but the king rejects the children with impressive plants and accepts Wong's unpopular empty pot. | Treating social approval as evidence of moral suitability. | 115-p40-43 |

### 4. Difficulty Adjustment & Diagnostic Dimensions
- **Can Simplify Language Without Breaking Mechanism**: ✅ Yes
- **Simplification Constraints**:
  - *Preserve impossible-to-grow seeds, false successful plants, and one truthful empty pot.*
- **Can Increase Cognitive Depth Without Increasing Vocabulary**: ✅ Yes
- **Depth Adjustment Strategies**:
  - *Remove the king's explicit statement that no plants could grow and require inference from the boiling fact alone.*
- **Student Failure Modes**:
  - *Reading the king's seed challenge literally as a gardening contest even after the reveal.*
  - *Choosing a generic positive leadership trait instead of the specific trait evidenced by the plot.*
- **Targeted Misconceptions**:
  - *A narrative reveal does not require reinterpretation of earlier events.*
  - *Any positive trait is equally supported if a character becomes king.*

### 5. Quality Control & Critic Audit
- **Critic Status**: `passed`
- **Analysis Confidence**: `high`
- **Content Hash**: `404af889d44d53f921846396652ad513b4a3d3a7eb4d3d9bbe1d4482445dc50e`
- **Critic Audit Notes**: Passed 100% of factual grounding and evidence cross-check audits without repair.

---

