# S3 student performance context — 2026-09-30

This stage adds a private, claim-time input projection; it does not change the
generation release, prompts, canonical output schema, publisher or PDF contract.
The production active contract before delivery was `rel_1.9.1`, prompt `2.14.1`,
schema `2.6.0`, bundle SHA-256
`d72ca08a83b41c34f64d703541f34d6120d629bc2b0d4919037a749808591211`.

`learningMemory.studentPerformanceEvidence` is `student-performance-v1`:

- Three recent immutable submissions, prioritizing the request's source packet.
- At most twelve incorrect or answered ungraded details / 44,000 UTF-8 detail
  bytes. Prompt, options, response, layout and reading excerpts are bounded;
  truncation, omitted and unresolved counts are explicit.
- Stable material/question/response-unit identities and server grading statuses.
  Answered opening/adaptive reflections remain ungraded evidence.
- Correct and unanswered items contribute counts only. Unanswered means
  completion, not weakness; open answers are not automatically incorrect.
  Unverified skill attribution stays unknown; no mastery inference or counter
  increments. Older submission counts are disjoint from recent submissions.
- Both claim paths freeze the existing input before fingerprinting. Subsequent
  context reads preserve the entire snapshot, including old claims' absent data.
- Evidence stays in private authoring inputs. All response/context prose is in
  privacy-screened `*Note` fields, including structured response-unit notes.
  No child answers are sent to public research or committed as production data.

Verification uses explicitly synthetic fixtures:

- All fourteen SQL suites pass: mixed grading statuses, stable structured IDs,
  family/cutoff isolation, bounded history, reflection, actual normal/Week1
  claims, frozen context/fingerprint and historical in-flight compatibility.
- Complete migration function rename/parameter binding and grants replay in a
  local rollback transaction.
- Full Vitest: 183 files / 1,618 tests pass; typecheck passes. Focused adapter
  tests cover private packet planning, manual/author/repair presentations,
  compact-context preservation, optional feedback and public-research rejection.
- Existing author and Critic rules require relevant learner memory to influence
  the next package and its parent-facing adjustment explanation. This stage
  proves evidence delivery, not a newly generated production packet's pedagogy.

Production delivery read-back:

- Source `a9d5e685d202a516755a9e7ce5f15a1bb777fb35` pushed to main.
- Remote migration history confirms `20260930052407` applied.
- Active contract after delivery equals the contract above; no new release was
  activated. Browser roles cannot execute the private evidence/context functions.
- `supabase/tests/student-performance-production-readback.sql` passes both
  locally and against production: isolated synthetic mixed-status evidence,
  submission without parent feedback, claimed-context loading, snapshot replay
  and wrong-worker denial. Transaction rolled back; no queue claim or publication.
- GitHub run `36675424508`: verify and deploy-production jobs both success.

Remaining acceptance: observe an authorized next production packet using this
evidence and review its actual adjustment explanation. Physical device/audio/
virtual-keyboard and authenticated production learning-loop acceptance from S2
also remain unverified. S4–S7 are not implemented by this stage.
