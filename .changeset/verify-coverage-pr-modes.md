---
"dev-skills": minor
---

新增覆盖检查脚本 `check-feature-coverage.mjs`，由 `setup-dev-skills` 复制到项目，`to-tickets` 发布前和 `implement-spec` 预检、最终验证时运行；任务覆盖、评审和完成验证只核对当前批次，并纳入非功能需求；页面每个状态都要有可以重复运行的自动化检查；`tdd`、`implement` 沿用规格中确定的测试层次和接缝；`implement-spec` 支持每项任务一个 PR 和合并授权；缺少截图工具时生成用户可在本机运行的命令。
