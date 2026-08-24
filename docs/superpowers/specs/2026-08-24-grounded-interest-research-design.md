# Grounded Interest Research Design

Date: 2026-08-24  
Status: Approved for implementation

## Objective

Upgrade weekly curriculum from interest-themed generated reading to real-world-grounded, interest-driven English learning. A factual reading must teach specific, checkable knowledge while continuing to serve demonstrated learning needs, school progress, CAP progression, feedback, workload, and the lexical ceiling.

The implementation preserves the existing production lifecycle:

```text
Claim -> Plan -> Author -> Critic -> Repair -> Submit -> Finisher
```

Its authoring interpretation becomes:

```text
Claim Batch -> Grounding Research -> Plan -> Author -> Critic -> Repair -> Submit -> Finisher
```

The GitHub Actions finisher remains a deterministic consumer of immutable canonical submissions. Claiming, submission, PDF rendering, private storage, transactional completion, input fingerprints, authoring retries, and technical retry behavior are unchanged.

## Architecture

### Canonical contract

Introduce `CurriculumPackageSchema` version `2.3.0`. Add one required top-level `grounding` object to the canonical package. It belongs to the curriculum package rather than to ChatGPT Scheduled Work or a particular search vendor.

The grounding object contains:

- `topic`: the specific teachable subject or angle;
- `knowledgeType`: a stable, executor-independent category string;
- `temporalMode`: either `evergreen` or `current`;
- `researchedAt`: an ISO timestamp;
- `sources`: compact source records with stable IDs, URL, title, publisher, optional publication date, and access date;
- `facts`: approved factual propositions with stable IDs, text, supporting source IDs, and a classification distinguishing verified fact from explicitly marked inference;
- `claims`: mappings from actual authored prose to one or more approved fact IDs. Every claim contains a stable ID, `factIds`, a canonical field `location`, and the exact `text` present at that location.

This shape separates source discovery, extracted facts, and authored claims. It closes the auditable provenance chain:

```text
Source -> Fact -> Claim -> Actual lesson prose
```

Deterministic validation can prove that the location exists, the declared text occurs in that canonical field, and every referenced fact exists, without pretending deterministic code can prove semantic truth.

Every new production `2.3.0` package requires real grounding. `grounding` is never nullable and has no `not-applicable` mode. A grammar-heavy week may contain limited non-grounded language practice, but its primary reading still uses a researched real-world context. This prevents an optional-grounding escape hatch from restoring generic fictional filler.

`temporalMode` is explicit rather than inferred. For `current` grounding, every supporting source used for current-event facts requires `publishedAt`; `researchedAt` is always required; and the critic must verify freshness and date awareness. `evergreen` grounding still records `researchedAt`, while `publishedAt` remains optional when the source has no meaningful publication date.

Schema `2.2.0`, `2.1.0`, and `2.0.0` remain readable as immutable legacy material through existing compatibility paths. New production authoring and submission use only `2.3.0`. The bridge's version allow-list changes only as required to accept the new canonical schema; storage and lifecycle semantics do not change.

### Batch research stage

After exactly one authoritative batch claim, Scheduled Work inspects only curriculum-relevant interests and topic needs. It builds a batch-level discovery plan and may deduplicate broad public-topic exploration. Each claimed job then receives an isolated research brief.

Research follows a normal funnel:

1. Explore several specific angles.
2. Select an angle using interest relevance, learning-target fit, age appropriateness, lexical feasibility, evidence quality, novelty, and teachability.
3. Drill down into the selected entity, event, mechanism, history, system, or cultural context.
4. Verify important propositions with appropriate sources.
5. Create the per-job grounding object before lesson planning and authoring.

Only public, non-private topic terms may enter web queries. Child names, IDs, feedback, profile details, school information, level, and learner history never enter search queries or external sites. Broad discovery may be shared, but briefs, authored content, and learner context are never shared between children.

### Pedagogical integration

Grounding serves the existing planning priority:

```text
learning need -> target -> genre/information structure -> researched real-world topic
```

The planner chooses a specific grounded topic only after diagnosing learner needs. Grounding must not override prerequisites, school progress, CAP coverage, feedback, workload, or lexical difficulty.

The author may use only approved facts for externally checkable claims. It rewrites facts into original level-appropriate educational prose, does not copy source structure or wording, and does not add unsupported statistics, dates, quotations, events, biographies, transactions, scientific claims, or fictional-work details.

Interest-grounded factual readings normally carry at least 3-5 concrete factual propositions. This is a semantic quality baseline, not a mechanical keyword counter. Genres or learning targets that legitimately require a different structure must record a specific justification in quality evidence.

### Critic and repair

The critic evaluates grounding together with CAP authenticity, vocabulary ceiling, grammar, answer entailment, personalization, cognitive load, self-study continuity, and print usability. It must answer whether the learner actually learned something specific, real, and informative about the interest.

Critical failures include:

- generic noun-skinning where grounded treatment was appropriate;
- unsupported factual details;
- source records that do not support extracted facts;
- claims without approved fact mappings;
- stale or undated recent-event research;
- copied or source-shaped prose;
- protected dialogue, scripts, subtitles, manga text, or excessive plot retelling;
- grounding that hijacks rather than serves the learning plan.

Repair changes all dependent fragments together. Valid research and unaffected authored content are preserved on retry. Re-research occurs only when rejection concerns grounding, accuracy, freshness, topic quality, source adequacy, or a changed passage dependency.

### Deterministic validation

Repository validation fails closed on properties it can prove deterministically:

- Schema `2.3.0` shape and required grounding metadata;
- valid source URLs and ISO dates;
- unique stable source, fact, and claim IDs;
- every fact references existing sources;
- every authored claim references existing facts;
- every claim `location` resolves to an allowed canonical authored-prose field;
- every claim `text` occurs exactly within the resolved canonical field;
- every source/fact/claim is used as required by the contract;
- `current` grounding requires publication dates for sources supporting current-event facts;
- required grounding critical-check evidence exists and passes;
- production authoring bundle metadata and source hashes match the new contract.

Deterministic validation does not count factual-looking words or claim to verify that prose is true. Semantic support, factual density, source quality, copyright transformation, and genericity remain author/critic quality obligations with regression fixtures.

### Learner-facing output

Grounding provenance is internal audit metadata. Student and Parent PDFs remain deterministic projections of the educational lesson and do not expose engineering-style citations. The existing optional learner-facing `sourceNote` remains compact and may be used only when pedagogically helpful; it is not the provenance authority.

### Production and future executor compatibility

The Scheduled Work contract gains a third authorized input: public web research for non-private curriculum topics. Arbitrary browsing and any external transmission of private learner context are prohibited. The exact claim, bridge, retry, immutable-attempt, input-fingerprint, submission, and finisher rules remain unchanged.

The future OpenAI Responses API with `web_search` may replace the research executor. It will produce the same grounding object and obey the same curriculum and privacy rules, so no canonical schema redesign is needed during that migration.

## Source and copyright policy

Prefer official organizations, primary sources, reputable news/science/educational publications, and reliable reference sources. Wikipedia or Wikimedia may support discovery and cross-checking but must not become the narrative template.

Research extracts propositions, not prose. Authoring independently reorganizes and rewrites educational content. It avoids unnecessary quotation and substantial reproduction. For copyrighted fictional works, it uses limited factual or cultural context and never reproduces protected dialogue, scripts, subtitles, manga text, or long plot summaries.

## Test strategy

Regression coverage includes:

- basketball, anime, and technology examples contrasting generic failures with grounded packages;
- canonical validation and provenance survival;
- source/fact/claim referential-integrity failures;
- unsupported-claim and generic-personalization quality failures;
- copyright-safe examples without copied source prose;
- privacy-safe search-query construction that requires no private context;
- targeted retry preservation of valid grounding;
- compiled production bundle inclusion and hash determinism;
- legacy package compatibility;
- deterministic Student and Parent PDF rendering;
- unchanged finisher claiming, submission, upload, completion, and technical retry behavior.

Verification runs focused tests first, then repository test, typecheck, lint, build, bundle compilation/check, canonical validation, synthetic generation, and PDF determinism checks.

## Database decision

No new grounding table is planned. The immutable canonical curriculum JSON already provides the required audit record. A migration is permitted only to update the bridge's accepted canonical schema version or a tightly coupled validation contract. Such a migration must preserve all job, attempt, fingerprint, claim, submission, completion, and retry invariants.

## Explicit non-goals

- No Responses API migration.
- No new production research service.
- No scheduler-side rendering, upload, or completion.
- No finisher lifecycle redesign.
- No learner-facing engineering citation system.
- No automated upstream `eng-tutor` dependency.
- No real production generation runs during implementation or verification.
