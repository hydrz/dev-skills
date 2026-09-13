# 效率

通用工作流工具，不限于代码。

## 用户调用

只有你键入名字才会触发（Claude Code：`disable-model-invocation: true`）。

- **[grill-me](./grill-me/SKILL.md)**：被无情拷问一个计划或设计，无状态。
- **[handoff](./handoff/SKILL.md)**：把当前对话压缩成交接文档，交给另一个 agent。
- **[teach](./teach/SKILL.md)**：以当前目录为有状态工作区，分多次会话学一个主题。
- **[to-questionnaire](./to-questionnaire/SKILL.md)**：把你独自答不了的决定变成给别人填的问卷。
- **[wait-what](./wait-what/SKILL.md)**：刚才那段没看懂，让 agent 重讲。

## 模型调用

agent 或你都能触发（description 带触发词，agent 会在合适时用上）。

- **[grilling](./grilling/SKILL.md)**：拷问原语：规模分档、按轮处理设计树前沿。
- **[writing-for-agents](./writing-for-agents/SKILL.md)**：为 agent 写文档：skill、AGENTS.md / CLAUDE.md，以及如何测试 skill。
