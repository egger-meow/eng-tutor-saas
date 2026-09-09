# Bundle hash erratum verification — 2026-09-10

Source correction: `2aae4ec`; production migration: `20260909181131` (local and remote history match).

The compiled bundle bytes are unchanged: SHA-256 `227bd0953d6062695023846327b8ab4e0391082ac7967c8ab0282ffeaee58340`. This repairs a transcription error, not a generation release; component versions and bundle content remain unchanged.

- 13 bridge contract tests passed, including digest computation from real bundle bytes.
- Production rollback behavior checks passed: current hash identity, exact legacy correction, rejection of altered legacy contracts and missing hashes, unchanged unknown 64-character hashes, and service-role-only access.
- Fresh production active contract returned the exact computed 64-character digest.
- Both previously blocked owned claims were recovered read-only. Their original contracts and fingerprints remain unchanged. The server resolver mapped both to the exact local bundle bytes. Both remain unsubmitted.
- No claim, release, submission, PDF generation or publisher invocation was performed.
- Private per-job resolution records and read-back evidence are saved under `.runtime/automation-20260910-recovery/`.

The migration CLI reported successful application with a Docker catalog-cache warning. Independent production queries and migration history verified deployment. End-to-end authoring/submission is still pending; this verification establishes removal of the hash blocker, not completed curricula.
