---
type: llm
---

PASS only if the rewrite is understandable to a customer-service colleague without assuming software-engineering knowledge, while preserving: the P99 latency threshold of more than 2 seconds; temporary suspension of calls to the downstream interface; cached results as the fallback; and a maximum recovery time of 10 minutes.

It may retain P99 or RTO only if it immediately explains the term in plain Chinese. FAIL if it drops a threshold or behavior, invents a new operational detail, or leaves the passage dependent on unexplained jargon.
