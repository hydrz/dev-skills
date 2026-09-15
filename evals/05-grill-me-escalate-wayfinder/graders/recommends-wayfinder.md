---
type: llm
focus: last_message
weight: 1
---
This request spans multiple independent business subsystems (acquisition, retention, monetization) that are unlikely to be fully worked through in one grilling session.

The response should:
- Recognize that the scope is too broad/multi-module for a single grilling session.
- Recommend the user run /wayfinder to build a decision map and split the work into batches, rather than attempting to grill all three subsystems exhaustively in this one session.
- NOT claim to have written or edited any files.

Fail if the response just barrels ahead asking questions about all three subsystems as if it were a normal small/architectural grilling session, with no mention of the scope being too large or of /wayfinder.
