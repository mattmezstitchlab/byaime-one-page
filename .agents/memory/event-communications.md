---
name: Event communications
description: Decision boundaries for messages generated from confirmed timeline changes.
---

Only derive a notification audience from people and providers explicitly related to the affected timeline events and only offer contacts that contain a verifiable email address. A confirmed timeline change and the email consent are separate confirmations; scheduled messages remain cancellable and reschedulable, with provider outcomes persisted against the source event.

**Why:** A timeline ripple identifies operational impact, but it must not silently turn into an email or expose contacts that cannot be verified.

**How to apply:** Keep audience derivation in the timeline graph, keep delivery state in the relational message journal, and preserve the source event id on every event-change message.