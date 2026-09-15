---
type: llm
focus: last_message
weight: 1
---
The response should:
- Explicitly identify this as a "feasibility check" scope (able to describe in a couple sentences what needs to be verified and how), not treat it as a small-change or architectural redesign.
- Ask 2-3 numbered questions (e.g. Q1, Q2), each with a recommended answer and a short one-line rationale.
- NOT claim to have written, created, or edited any local files.
- NOT proceed to implement or verify anything before the user has answered — it should stop and wait for the user's response, not assume answers.

Fail if the response dumps an unstructured list of questions with no recommendations, or if it starts acting (implementing, running verification) without first getting the user's answers.
