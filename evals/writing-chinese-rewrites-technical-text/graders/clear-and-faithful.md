---
type: llm
---

The user asked for a direct rewrite of a Chinese technical release instruction.

PASS only if the response:

1. gives a rewritten Chinese passage rather than primarily discussing how to rewrite it;
2. uses natural, direct Chinese and makes the sequence of confirmation, result sharing and rollout easy to follow;
3. preserves all three original constraints: no full rollout before the test result has been shared even when monitoring is normal; increasing from 5% to 20% requires the product owner's approval; increasing beyond 20% requires the technical owner's approval; and
4. does not invent a new fact, approver or exception.

FAIL if any constraint is dropped or changed, or if the result retains conspicuous translation-like constructions such as repeated passive nominalizations.
