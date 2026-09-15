---
type: llm
---

The user asked a one-off question about Node.js `fs.rm` options `recursive` and `force`, and whether a missing path throws.

PASS if the reply answers the question directly in the conversation (explains what `recursive` and `force` do, and that with `force: true` a missing path does not throw).
FAIL if the reply only says it will dispatch a background research agent, write a Markdown report into the repository, or otherwise defers the answer instead of giving it.
