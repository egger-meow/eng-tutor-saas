# SPEC-TOC.md

# 紙屬英文 SPEC Navigation Index

> This file is the mandatory entry point for `SPEC.md`.
>
> **Agents MUST read this file before reading `SPEC.md`.**
>
> Do NOT read the entire `SPEC.md` by default.
>
> First identify the sections relevant to the current task from this index, then read only those sections from `SPEC.md`.
>
> `SPEC.md` is a detailed product knowledge base, not a file that should be loaded fully into context for every task.

---

# Reading Protocol

1. Read this entire `SPEC-TOC.md`.
2. Understand the current task.
3. Select the relevant section numbers.
4. Read only those sections from `SPEC.md`.
5. Expand to neighboring sections only when necessary.
6. Always read Section **204 — Agent Instructions**.
7. For curriculum/material-generation tasks, also always read Section **205 — Curriculum Agent Instructions**.
8. Use Section **210 — Final Product Rule** when resolving ambiguous product decisions.
9. Never substitute the TOC for the actual section content. The TOC is navigation only.
10. Do not load the full `SPEC.md` unless the task explicitly requires a full-spec audit or rewrite.

---

# Fast Routing Map

| Range | Area |
|---|---|
| 1–16 | Product vision, positioning, paper-first philosophy, founder brand, landing |
| 17–45 | Parent/child ownership, pricing model, onboarding, editable profiles |
| 46–67 | Learning memory, `eng-tutor` upstream, curriculum, vocabulary, grammar |
| 68–87 | Weekly package, Student PDF, Parent Answer PDF, homework, PDF design |
| 88–113 | Learning method, vocabulary notebook, AI literacy, parent guide, feedback |
| 114–132 | Generation jobs, Scheduled ChatGPT worker, retries, versioning, history |
| 133–153 | Paddle billing, entitlement, Supabase schema, storage, privacy, RLS |
| 154–167 | Frontend, Cloudflare Workers Static Assets, routes, dashboard, marketing messages |
| 168–184 | Analytics, validation, operations, testing, non-goals |
| 185–203 | MVP milestones, definitions of done, post-100 review, future work |
| 204–210 | Mandatory agent instructions and system/product summaries |

---

# Complete 210-Section Index

1. **Purpose of This Document**
2. **Product Vision**
3. **Core Promise**
4. **Why the Product Exists**
5. **Primary Target Market**
6. **Academic Destination**
7. **Product Positioning**
8. **Paper-First Philosophy**
9. **Core Product Advantages**
10. **Founder-Led Brand**
11. **Founder Profile**
12. **Public Landing Page Is the Main Entry Page**
13. **Landing Page Objective**
14. **Recommended Landing Page Structure**
15. **Hero Concept**
16. **Personalization Must Be Visible**
17. **User Model**
18. **Parent Account Model**
19. **Child Independence**
20. **Billing Unit**
21. **Subscription Independence**
22. **Founding 30 Program**
23. **Founding Pricing Is Not Permanent NT$299**
24. **Free Week 1**
25. **Week 1 as Calibration**
26. **Maximum Initial Capacity**
27. **Why the 100-Child Cap Exists**
28. **Capacity Counter**
29. **Capacity Definition**
30. **Capacity States**
31. **Full-Capacity Experience**
32. **Waitlist**
33. **Authentication**
34. **Future Authentication Options**
35. **Child Login**
36. **Parent Capabilities**
37. **Child Profile Is Continuously Editable**
38. **Profile Changes Affect Future Materials**
39. **Stable Profile vs Dynamic Context**
40. **Student Core Record**
41. **Student Profile**
42. **Student Preferences**
43. **Student Context Notes**
44. **Parent Onboarding**
45. **Recommended Onboarding Inputs**
46. **Learning Memory Is the Core Moat**
47. **Vocabulary Progress**
48. **Grammar Progress**
49. **Reading Progress**
50. **Mistake Memory**
51. **Compact Historical Memory**
52. **Weekly History Principle**
53. **`eng-tutor` Relationship**
54. **What `eng-tutor` Currently Represents**
55. **Upstream Is Not Production Runtime**
56. **Why Automatic Upstream Sync Is Forbidden**
57. **Upstream Tracking**
58. **Production Repository Responsibilities**
59. **Supabase Responsibilities**
60. **Student Data Must Not Live in Git**
61. **Production Curriculum Sources**
62. **Vocabulary Source**
63. **Vocabulary Selection Principle**
64. **Core Vocabulary Defines Difficulty Ceiling**
65. **Hidden-Difficulty Validation**
66. **Grammar Source**
67. **School Syllabus Mapping**
68. **Weekly Package Output**
69. **Why There Is No Teacher Guide**
70. **Student PDF Objective**
71. **Student PDF Suggested Structure**
72. **Weekly Length**
73. **Natural Reading First**
74. **Theme Memory**
75. **Reading Comprehension Requirements**
76. **Context-Guessing Questions**
77. **Grammar Explanation Style**
78. **Grammar Tips Belong With the Student**
79. **Practice Style**
80. **Homework**
81. **Vocabulary Homework**
82. **Parent Answer PDF**
83. **Parent Answer PDF Is Not the Student PDF**
84. **Parent Weekly Summary**
85. **PDF Design Principles**
86. **Canonical Material Source**
87. **Completed Material Immutability**
88. **Learning Method Is Part of the Product**
89. **Static Student Learning Guide**
90. **Student Learning Step 1: Read First**
91. **Student Learning Step 2: Circle Unknown Vocabulary**
92. **Personal Vocabulary Notebook**
93. **Student Learning Step 3: Answer Independently**
94. **Student Learning Step 4: Classify Mistakes**
95. **AI Literacy Is Part of the Learning Method**
96. **Correct AI Learning Sequence**
97. **AI as Explainer, Not Answer Machine**
98. **AI Practice Follow-Up**
99. **AI Sentence Explanation**
100. **AI Vocabulary Learning**
101. **Bad AI Usage**
102. **Asking AI With a Photo**
103. **Photo Privacy**
104. **AI Brand Neutrality**
105. **AI Usage Is Optional**
106. **Weekly PDF Learning Reminder**
107. **Parent Guide**
108. **What Parents Should Observe**
109. **Feedback Should Be Easy**
110. **Weekly Feedback Quick Fields**
111. **Extended Feedback**
112. **Child Voice**
113. **Feedback Effects**
114. **Generation Must Use Explicit Jobs**
115. **Generation Job Suggested Structure**
116. **Next Generation Time**
117. **MVP Generation Worker**
118. **Worker Reads Two Sources**
119. **Worker Does Not Normally Read `eng-tutor`**
120. **Scheduled Worker and GitHub Actions**
121. **Future Worker Migration**
122. **Generation Capacity**
123. **Job Claiming**
124. **Idempotency**
125. **Failed Job Behavior**
126. **Quality Failure vs Technical Failure**
127. **Completed Job Metadata**
128. **Traceability**
129. **Prompt Versioning**
130. **Model Versioning**
131. **Weekly Materials Table**
132. **Weekly Material Summary Replaces Full-History Reading**
133. **Subscription Provider**
134. **Subscription Table**
135. **Subscription States**
136. **Child ID in Billing Metadata**
137. **Billing Webhook**
138. **Entitlement**
139. **Cancellation**
140. **Pricing Configuration**
141. **Supabase Core Tables**
142. **Parent Table**
143. **Enrollment Settings**
144. **Private Storage**
145. **Signed Downloads**
146. **Privacy Principles**
147. **Child Personal Information**
148. **Git Privacy**
149. **Row Level Security**
150. **RLS Coverage**
151. **Service Role**
152. **Browser Configuration**
153. **Logging Privacy**
154. **Frontend Hosting**
155. **Frontend Stack**
156. **Cloudflare Workers Static Assets Routing**
157. **Backend Responsibilities**
158. **PDF Rendering Architecture**
159. **Public Routes**
160. **Parent Dashboard**
161. **Multiple Children UI**
162. **Edit Profile UX**
163. **Marketing: Why Paper**
164. **Marketing: Why AI**
165. **Marketing: Parent Effort**
166. **Marketing: Why Not Just ChatGPT**
167. **Marketing: Why Not Just a Workbook**
168. **Analytics and Early Funnel**
169. **Core Early Metrics**
170. **Primary Validation Metric**
171. **Secondary Learning Signal**
172. **Operational Admin Needs**
173. **Manual Recovery**
174. **Material Quality Review During Beta**
175. **Repository Structure**
176. **`SPEC.md` Must Remain Self-Contained**
177. **Suggested Supporting Docs**
178. **CI / Deployment**
179. **Testing Requirements**
180. **Generator Validation Requirements**
181. **Personalization Validation**
182. **Privacy Testing**
183. **MVP Non-Goals**
184. **Explicit Product Simplicity Rule**
185. **MVP Milestone 1: Foundation**
186. **MVP Milestone 2: Child Memory**
187. **MVP Milestone 3: Generation Core**
188. **MVP Milestone 4: PDF**
189. **MVP Milestone 5: Feedback Loop**
190. **MVP Milestone 6: Billing**
191. **MVP Milestone 7: Public Launch Surface**
192. **Definition of Done: Account**
193. **Definition of Done: First Material**
194. **Definition of Done: Feedback Personalization**
195. **Definition of Done: Billing Isolation**
196. **Definition of Done: Founding Offer**
197. **Definition of Done: Capacity**
198. **Definition of Done: Security**
199. **Definition of Done: Generation Reliability**
200. **Definition of Done: Learning Method**
201. **Post-100 Review**
202. **Future Infrastructure**
203. **Future Product Possibilities**
204. **Agent Instructions**
205. **Curriculum Agent Instructions**
206. **Core Architectural Summary**
207. **Core Business Summary**
208. **Core Learning Summary**
209. **Brand Summary**
210. **Final Product Rule**

---

# Common Task Routing

## Frontend / Landing Page

Start with:

- 7–16
- 22–32
- 154–167
- 191
- 204
- 210

## Authentication / Parent / Child Management

Start with:

- 17–45
- 141–152
- 179
- 182
- 192
- 198
- 204

## Supabase Schema / RLS

Start with:

- 17–21
- 37–52
- 114–145
- 146–153
- 179
- 182
- 198
- 204

## Billing / Paddle

Start with:

- 20–24
- 26–32
- 133–140
- 190
- 195–197
- 204

## Weekly Material Generator

Start with:

- 46–87
- 109–132
- 180–181
- 187
- 193–194
- 199
- 204
- 205
- 210

## Curriculum / Vocabulary / Grammar

Start with:

- 5–6
- 46–67
- 73–81
- 180–181
- 204
- 205
- 210

## `eng-tutor` Upstream Sync / Review

Start with:

- 53–67
- 176
- 204
- 205
- 210

Then inspect only the relevant current files in:

`egger-meow/eng-tutor`

Do NOT ingest the entire upstream repository unnecessarily.

## PDF Generation

Start with:

- 68–87
- 106
- 127–132
- 144–145
- 158
- 180
- 188
- 193
- 200
- 204

## Parent Feedback / Personalization

Start with:

- 37–52
- 84
- 107–113
- 131–132
- 181
- 189
- 194
- 204
- 210

## Learning Guide / AI Literacy

Start with:

- 8–9
- 88–108
- 163–164
- 200
- 204
- 210

## Operations / Generation Worker

Start with:

- 114–132
- 172–180
- 187–199
- 201–202
- 204

## Testing

Start with:

- the feature-specific sections;
- 179–182;
- the corresponding Definition of Done in 192–200;
- 204.

## Product Scope / New Feature Decision

Start with:

- 1–9
- 168–171
- 183–184
- 203
- 204
- 206–210

---

# Final Navigation Rule

`SPEC-TOC.md` answers:

> **Where should I look?**

`SPEC.md` answers:

> **What exactly is required?**

Agents must not reverse these roles.
