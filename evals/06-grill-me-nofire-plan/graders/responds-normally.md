---
type: llm
focus: last_message
weight: 1
---
The user did not type /grill-me — they just asked casually for an opinion on an idea. The response should answer normally/conversationally (an opinion, tradeoffs, maybe a few clarifying questions) and should NOT switch into the grilling skill's structured numbered-round Q&A format (no "❓ **Q1 ·" style headers, no explicit "sizing tier" framing like 可行性验证/小范围改动/架构级).

Fail if the response imposes the grilling skill's structured question format despite the user never invoking /grill-me.
