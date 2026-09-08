# Production release consistency policy

Applies to every generation release, including prompt-only changes. These are mandatory delivery requirements, not a claim that automated gates already exist. Perform and record checks manually where automation is absent.

## Version authority

Use packages/generator/src/engine-version.ts and CURRENT_ENGINE_MANIFEST as the single desired release manifest. Review Schema, Prompt, Engine, Worker, Renderer and quality-profile versions independently; increment affected components and explain unchanged ones. Recompile changed prompts/rules and record bundle version and computed SHA-256. Do not reuse a release identifier for different component versions or bundle contents.

Consumers should import or derive versions from the manifest. Check separately deployed SQL and runtime consumers against it. Preserve historical migrations, prompts and immutable packet metadata; never mass-replace historical versions.

Fresh production GET /contract identifies the deployed active authoring contract. A repository manifest is desired state, not deployment proof. Reusable executor prompts must resolve versions dynamically and verify the matching bundle hash. Never infer active versions from completed materials or conversation memory. Claims bind their contract and fingerprint; submissions follow their own immutable snapshot even after a later activation.

## Mandatory release sequence

1. Prepare the target manifest, bundle and compatibility inventory. Update affected consumers and docs; freeze the tested source revision and artifact hashes.
2. Run relevant tests, type checks, builds, database migration tests and synthetic canonical/PDF verification. Exercise actual validators with valid target-schema packages and invalid version combinations; source-text assertions alone are insufficient.
3. Commit and push. Deploy required migrations, Edge Functions, workers and workflow/runtime artifacts. Deploy compatible consumers before activating new claims. If the current mechanism cannot separate deployment and activation safely, provide reviewed sequencing before activation; do not assume cross-service atomicity.
4. Verify deployed identities and behavior. Exercise real submission, validation and rendering code with isolated synthetic fixtures, rollback or an isolated test environment. Do not claim learner jobs, publish learner-visible fixtures or send notifications merely for release testing. If production behavior cannot safely be verified, record the limitation and leave activation incomplete.
5. Activate only after required consumers pass. Freshly read back production contract, bundle hash, migrations and running consumer identities. Verify contract binding in both claim entry points using isolated fixtures. On failed post-activation checks, prevent new use through the reviewed recovery mechanism and investigate; never relabel existing packets.
6. Record evidence before declaring production delivery complete. Push success, migration-list agreement, a deploy command or a metadata string alone is insufficient.

## Compatibility inventory

| Consumer | Required verification |
| --- | --- |
| Compiler/bundle and local, scheduled, manual, normal and Week 1 authors | Correct stages, manifest values, source revision, bundle hash and dynamic contract resolution |
| Normal and Week 1 claim RPCs | Matching release/contract, bound into the actual fingerprint snapshot |
| Submit RPC and pre-submit/canonical validators | Valid target schema accepted; unsupported schema, mismatched versions and wrong fingerprints rejected |
| Week 1 publisher and Finisher | Target package passes applicable integrity/semantic checks without stale version gates; deployed identities recorded |
| Renderer and completion integration | Supported layouts render correct Student/Parent artifacts; completion tested with isolated data |
| Historical packets and in-flight attempts | Supported historical reading/rendering retained; old claims keep immutable contracts and contents |
| Deployment surfaces | Required migrations applied; Edge Function, worker and workflow revisions/artifacts verified |

Explicitly test the failure case where a new schema is authored but a verifier accepts only its predecessor. Test release switching with an existing claim. Maintain an explicit compatibility policy; do not accept arbitrary historical schemas merely to make tests pass.

## Evidence and completion

Store a concise record in docs/evaluations/ with source commit, manifest values/hash, bundle version/hash, compatibility results, deployed revisions, applied migrations, fresh production comparison, historical/in-flight results, activation outcome and recovery reference. Exclude learner payloads and credentials.

Missing required evidence means release verification is incomplete. Automated CI/deployment enforcement is separate implementation work. Existing version synchronization tests provide partial coverage only; this document does not implement a registry, activation transaction or automated release gate.
