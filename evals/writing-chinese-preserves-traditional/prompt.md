---
description: 改寫繁體中文內容時，沒有轉換要求就應保持繁體和原有語義
expected_outcome: 調用 writing-chinese；用自然的繁體中文改寫，保留驗證、匯出與管理員權限三項條件
tags: [writing-chinese, trigger, behavior]
max_turns: 8
allowed_tools: [Skill]
---

請把這段說明改寫得更自然，直接給結果：

使用者若尚未完成電子郵件驗證，系統不允許其進行資料的匯出。即便其已經登入也是如此。只有管理員能夠代替使用者發起匯出，但仍然需要留下稽核記錄。
