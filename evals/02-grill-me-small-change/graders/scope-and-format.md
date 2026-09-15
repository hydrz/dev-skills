---
type: llm
focus: last_message
weight: 1
---
Adding a loading state to a login button is a tiny, self-contained UI change to an existing flow — the smallest tier of scope.

The response should:
- Treat this as a small scope — ask only the handful of questions that genuinely change the outcome (e.g. what the loading state looks like, whether the button should be disabled during the request, how to handle errors), grouped in numbered form with a recommended answer and short rationale. Asking several such questions together in one round is fine as long as each is a real, distinct, outcome-relevant decision — do not penalize the response merely for the count of questions.
- NOT claim to have written, created, or edited any local files, and not jump straight into implementing before the user answers.

Fail only if it treats this as an architectural effort (e.g. proposes a whole state-management overhaul, insists on confirming unrelated systems), asks questions with no bearing on this specific change, or claims to have already implemented/edited files.
