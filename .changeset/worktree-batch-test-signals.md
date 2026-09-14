---
"dev-skills": patch
---

`implement` 和 `implement-spec` 新增工作树准备说明：先检测是否已在工作树中（排除子模块），优先使用运行环境自带的工具，用 git 创建时确认目录已被忽略并安装依赖，沙箱拒绝时的退路。`finishing-a-branch` 改用 `git rev-parse --path-format=absolute` 识别工作树，修复 Windows Git Bash 下在子目录中把普通仓库误判为工作树的问题。`implement-spec` 支持把同类小改动合成一个批次派发和评审。`tdd` 的测试警示信号清单补充读取源码文本、只测框架、断言 mock 和 mock 过多等情况。
