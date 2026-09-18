---
name: setup-deep-modules
description: 为已经存在明确模块边界的代码库配置可执行的边界与循环依赖检查，让跨模块调用只经过明确的公开入口。
disable-model-invocation: true
---

# 配置深模块边界检查

把 `codebase-design` 中约定的模块接口变成静态检查。适用于已经存在明确业务模块或 package 边界的代码库；边界尚未确定时，先设计模块，不用工具替代架构决策。

## 流程

### 1. 识别真实边界

读取 workspace/包管理配置、语言自身的模块系统配置（TypeScript 的 `tsconfig`/package exports、Python 的 `pyproject.toml`、Go 的 `go.mod`、Java 的构建模块描述符等）、现有 import/包引用路径和测试布局。列出候选模块、公开入口、内部目录，以及允许的依赖方向。调用 `codebase-design` 核对这些边界是否代表真实接缝，而不是为了通过检查人为增加的层级。

**完成条件：** 每个受保护模块都有明确公开入口；无法解释的跨模块依赖已列为待决问题，不用宽泛例外掩盖。

### 2. 按语言生态选择检查器

仓库已有边界检查工具（dependency-cruiser、eslint import 规则、Nx、Turborepo、import-linter、ArchUnit、depguard 等）时扩展现有工具。没有时，按语言选默认方案：

- **TypeScript / JavaScript**：dependency-cruiser，本 skill 附带 [dependency-cruiser.config.cjs](dependency-cruiser.config.cjs) 作为起点；它假设每个模块的根文件是公开入口、子目录是内部实现，实际结构不符合时按需修改，不强行迁移目录。
- **Python**：import-linter（`.importlinter` 契约文件）。
- **Go**：包内可见性（未导出标识符）为主，跨模块依赖限制用 `golangci-lint` 的 `depguard`。
- **Java / Kotlin**：ArchUnit 测试用例。
- **Rust**：`pub(crate)` 可见性 + `cargo-deny` 的 `bans`/`sources` 规则。
- 语言生态没有以上任何一种，且需要自定义规则时，才考虑手写脚本静态分析 import 图。

按实际结构配置：

- 外部代码只能通过模块公开入口访问；
- 模块内部可以自由组织，不要求每层都增加接口；
- 测试默认通过公开接口验证行为，只有明确的白盒测试目录可以例外；
- 禁止循环依赖，或为暂时保留的既有循环建立带原因的精确基线；
- 规则使用窄路径，不依赖会在不同操作系统或嵌套 package 下误匹配的假设。

把检查命令接入现有 lint 或 CI 入口。

**完成条件：** 配置覆盖已确认的模块，并能解释每条例外的所有者和移除条件。

### 3. 变红验证

按 `CONTEXT.md` 的"变红"方法证明规则真的会咬合：

1. 当前代码通过，或只报告已经记录的基线问题；
2. 在可恢复的临时改动中加入一条禁止的深层依赖，确认检查失败（变红）且指出正确规则；
3. 撤销临时改动，确认检查恢复通过。

随后运行类型检查/编译和受影响测试。临时违规只用于验证，不进入最终 diff。

**完成条件：** 已亲眼观察通过、变红、恢复通过；最终工作区没有测试用违规，开发文档说明了公开入口和本地检查命令。
