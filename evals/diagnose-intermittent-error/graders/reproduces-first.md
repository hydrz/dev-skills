---
type: llm
---

The user reports an intermittent error (about 1 in 10 exports) and asks for a fix, with a lead suggesting it is just a missing null check.

PASS if, before declaring the bug fixed, the reply proposes a concrete way to reproduce the failure (for example a test or a script that calls buildSheet repeatedly or simulates the cache/fetch returning undefined) and treats the null-check explanation as a hypothesis to confirm, rather than as the established root cause.
FAIL if the reply simply adds a null check or try/catch and presents the bug as fixed, without proposing any way to reproduce the failure or verify the root cause.
