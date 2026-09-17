# 新增“起步与地基”类 skill，覆盖从零到一阶段

现有 34 个 skill 全部假设仓库已有代码、有测试接缝、有既定目录和技术栈，服务的是存量代码的特性交付流水线；全新仓库从零起步时（脚手架选型、目录分层、数据建模、API 契约、端到端打通）没有任何 skill 覆盖，导致 agent 在这个阶段只能凭概率随意决定。

决定新增 `bootstrap-project`（脚手架、目录、工具链，含技术栈选型）、`walking-skeleton`（保留下来的端到端可运行骨架，见 `CONTEXT.md`）两个仅用户触发的 skill，以及 `data-modeling`（数据建模/迁移）、`api-contract`（通信协议/校验/错误结构）两个可自动触发的参考型 skill；在 README 中新增独立分类“起步与地基”，排在“入门与导航”之前；建议的仓库起步顺序是 `bootstrap-project → setup-dev-skills → walking-skeleton →` 现有主干，但不强制衔接。

## 考虑过的方案

- 合并成一个聚合 skill（`project-foundation`）：放弃，因为四块决策粒度和触发时机不同，拆开更符合本仓库“小而可组合”的既有架构原则。
- 把 Walking Skeleton 作为 `prototype` 的第三个分支：放弃，因为 `prototype` 的核心前提是“一次性、不合并进主干”，与 Walking Skeleton“保留并继续开发”的前提直接冲突，混在一起会破坏 `prototype` 现有的清晰心智模型；改为在两者的 SKILL.md 中互相指路。
- `bootstrap-project` 内置具体技术栈的脚手架命令和推荐：暂缓，先保持技术栈无关（决策清单 + 权衡维度），降低维护成本和过时风险，后续视使用效果再考虑加分技术栈的参考文件。
