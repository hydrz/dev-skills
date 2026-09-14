---
type: llm
---

PASS if the reply proposes tasks and a coverage table in which every current-batch state is mapped to at least one task: F-005 default, insufficient balance, payment failure (默认、余额不足、支付失败); F-007 success and duplicate callback (成功、重复回调); and N-01 is mapped to a task whose acceptance mentions the P95 300 ms target or the k6 check. The offline state of F-005 (离线, V1.1) must not be assigned to any task in this split (it may be listed as deferred to V1.1). The reply must not claim the tasks were published or files were written, and should ask the user to confirm.
FAIL if any of those current-batch states or N-01 has no task, if the offline state is assigned to an MVP task, or if the reply says the tasks were published.
