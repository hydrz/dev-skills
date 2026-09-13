# 协作与思考 skill

用于方案澄清、知识传递、持续学习和跨会话协作，不限于软件开发。

## 仅用户触发

只有用户显式输入名称才会运行。

- **[`/grill-me`](./grill-me/SKILL.md)｜无状态方案追问**：逐轮澄清并压力测试计划或设计，不向本地写入文件。
- **[`/handoff`](./handoff/SKILL.md)｜会话交接**：把当前对话整理成可供另一个 agent 继续工作的文档。
- **[`/teach`](./teach/SKILL.md)｜持续学习**：把当前目录作为可以跨会话延续的学习工作区。
- **[`/to-questionnaire`](./to-questionnaire/SKILL.md)｜生成外部问卷**：把必须由其他人回答的问题整理成可发送的问卷。
- **[`/wait-what`](./wait-what/SKILL.md)｜换种方式解释**：用更平实的语言重新解释上一段内容。

## 可自动触发

agent 会在合适场景主动使用，用户也可以显式调用。

- **[`grilling`](./grilling/SKILL.md)｜方案追问方法**：按问题之间的依赖关系逐轮澄清决策，并在实施前获得明确确认。
- **[`writing-for-agents`](./writing-for-agents/SKILL.md)｜agent 文档写作**：编写和测试 skill、`AGENTS.md`、`CLAUDE.md` 及其他供 agent 使用的文档。
