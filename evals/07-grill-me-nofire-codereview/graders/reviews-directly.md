---
type: llm
focus: last_message
weight: 1
---
The user asked for a direct code review of a small snippet and did not type /grill-me. The response should review the code directly (point out things like the O(n) loop being fine but a comprehension/sum being cleaner, or naming) and must NOT switch into the grilling skill's structured numbered-round Q&A format (no "❓ **Q1 ·" headers, no sizing-tier framing).

Fail if the response asks the user grilling-style consensus questions about the code instead of just reviewing it.
