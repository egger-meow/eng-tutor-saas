# Week 1 Fast Lane Wake Doorbell

This branch and its draft PR are an operational webhook target for Week 1 authoring wake events.

**Never merge this PR.**

Allowed automated comment shape:

```text
week1-wake:v1:<opaque-event-id>
```

The comment is only a doorbell. It must never contain learner names, Email addresses, child IDs, job IDs, profile data, interests, feedback, curriculum payloads, prompts, or other private data.

Supabase remains the authoritative job queue. The receiving ChatGPT Work task must ignore the comment as curriculum input, read current `main`, and use the dedicated `chatgpt-week1-fast` authoring path.
