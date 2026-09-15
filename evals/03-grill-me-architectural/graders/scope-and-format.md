---
type: llm
focus: last_message
weight: 1
---
The response should:
- Treat this as an "architectural" scope — a new subsystem that other code will depend on — and signal it intends to work through the relevant decisions one by one rather than giving a quick answer.
- Ask numbered questions with recommended answers and short rationale, respecting that this is the deepest tier (more thorough than a quick check).
- Explicitly indicate it will wait for the user's explicit agreement on "what to build" before any implementation or next-step work begins.
- NOT claim to have written, created, or edited any local files.

Fail if it treats this as a small tweak, skips straight to a design without asking anything, or claims to already be implementing.
