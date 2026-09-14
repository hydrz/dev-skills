---
"dev-skills": patch
---

`implement-spec` 新增 `review-package.mjs`，把提交列表、stat 摘要和带上下文的 diff 写入一个文件，并拒绝不是祖先的 BASE 和空范围，评审和复审都用它生成材料。`diagnosing-bugs` 新增 `TEST-POLLUTION.md` 和 `scripts/find-polluter.mjs`：逐个运行测试找出留下多余文件的测试，或二分查找让另一个测试一起运行才失败的测试。两个脚本只依赖 Node.js 标准库，Windows 上可以直接运行。
