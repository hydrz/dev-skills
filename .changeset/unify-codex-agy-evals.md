---
"dev-skills": patch
---

统一 `eval:codex`、`eval:agy` 与 `eval:claude` 的输入参数和输出格式：`--ablation` 替代 `--arm`、新增 `--concurrency`/`--quick`、退出码对齐官方语义，两者都输出 `aggregate-result.json`。移除 Codex/Antigravity 评测中把技能正文注入 prompt 的做法，改为纯原生技能发现；修复由此暴露出的多个问题：grill-me 评测用例缺少技能标签、`skill-fired` grader 匹配错了技能名、agy 的 `--sandbox` 参数用法、agy 经 shell 转发时多行 prompt 被打散、agy 报告页时间戳解析崩溃，以及报告页把"不支持判定"错误渲染成红色失败。
