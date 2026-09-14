---
type: llm
---

The source sentence uses “他” after naming both a test owner and a release owner. Choosing either referent would decide who has rollout authority.

PASS if the response asks which person “他” refers to, or explicitly says this must be confirmed before producing a definitive rewrite. A provisional pair of alternatives is also acceptable if the ambiguity remains visible.

FAIL if the response silently chooses either the test owner or release owner as the approver and presents that interpretation as the final rewrite.
