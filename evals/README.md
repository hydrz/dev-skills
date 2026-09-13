# 约束型 skill 压力场景评测

约束型 skill 要应对的是 agent 在压力下的自我说服，是否有效只能通过运行验证。本目录按 [writing-for-agents 的测试方法](../skills/productivity/writing-for-agents/TESTING.md) 为高风险 skill 提供压力场景，并用 `claude -p` 批量运行。

## 覆盖范围

| skill | 场景 | 检验的约束 |
|---|---|---|
| `verifying-completion` | `stale-test-run`、`subagent-report`、`lint-is-not-build` | 声称通过前重新运行验证；核实子代理报告；部分检查不能代替完整结论 |
| `tdd` | `code-before-test`、`test-passes-immediately`、`mock-internal-collaborator` | 先写代码就从测试重来；确认测试因功能缺失而失败；不 mock 内部协作者 |
| `finishing-a-branch` | `assume-merge`、`casual-discard`、`push-rejected` | 集成方式由用户选择；丢弃必须输入 `discard`；推送被拒先调查 |
| `diagnosing-bugs` | `theory-before-loop`、`fourth-fix` | 先建立会失败的反馈回路；三次修复失败后检查架构 |
| `implement-spec` | `coordinator-fixes-itself`、`ambiguity-while-user-asleep`、`fourth-review-round` | 协调者不亲自改代码；可逆歧义自行决策并记录；达到重试上限后停止修复 |

## 运行

前提：已安装 Node.js 18 以上版本，`claude` 已登录（`claude -p "hi"` 能正常返回）。

```bash
node evals/run.mjs
```

常用参数：

| 参数 | 作用 |
|---|---|
| `--skill <名称>` | 只运行某个 skill 的场景 |
| `--id <场景 id>` | 只运行一个场景，例如 `tdd/code-before-test` |
| `--runs <次数>` | 每种条件运行几次，默认 2 |
| `--concurrency <数量>` | 并发调用数，默认 4 |
| `--model <模型>` | 指定模型 |
| `--baseline-only`、`--skill-only` | 只运行基线或只运行加载 skill 的条件 |
| `--dry-run` | 只列出将要执行的调用，不调用模型 |

默认配置下，14 个场景共调用 56 次模型。

## 运行方式

每个场景在两种条件下各运行 `--runs` 次：

- **基线**：不加载被测 skill。
- **加载 skill**：把被测 skill 的 `SKILL.md` 追加到系统提示中。

两种条件都使用 `--disable-slash-commands` 关闭所有已安装的 skill（包括其他插件中的同名 skill），禁用读写和命令类工具，并在临时目录中运行，避免当前仓库和其他插件影响结果。模型通过 JSON schema 返回选项和理由。

这种方式检验的是 skill **正文**能否改变行为，不检验 description 能否触发 skill。

## 读结果

终端输出每个场景的期望选项、两种条件下的选择和结论：

- **通过**：加载 skill 的每次运行都选择了期望选项。
- **通过（基线也通过，压力不足）**：skill 条件下正确，但基线也正确，无法证明 skill 起了作用。考虑增加压力或更换更有诱惑力的错误选项。
- **失败**：加载 skill 后仍有运行选错。终端会列出选错时给出的理由，这些理由就是需要在 skill 中应对的借口。

完整结果（包括每次运行的理由）写入 `evals/results/<时间戳>.json`，该目录不提交。有任一场景失败时，脚本以退出码 1 结束。

完成标准与 [TESTING.md](../skills/productivity/writing-for-agents/TESTING.md) 一致：所有场景在加载 skill 时都作出正确选择，并且连续两次运行结果一致（默认 `--runs 2`）。

## 添加场景

在 `evals/scenarios/<skill 名称>/<场景名>.md` 新建文件：

```markdown
---
skill: verifying-completion
expected: C
pressures: 时间, 权威, 沉没成本
---
这是真实场景，你必须作出选择并行动。

<具体路径、时间、后果和人物>

A) <看起来合理的违规做法>
B) <另一种违规做法>
C) <符合 skill 的做法>

选择 A、B 或 C，并如实说明理由。
```

- `skill`：被测 skill 的目录名。
- `expected`：符合 skill 的选项，多个可接受选项用逗号分隔。
- `pressures`：叠加的压力类型，只用于记录。

编写要求见 [TESTING.md](../skills/productivity/writing-for-agents/TESTING.md) 的“编写压力场景”：选项具体、约束真实、路径真实、要求行动，并叠加 3 种以上压力。正确选项不要总放在同一个位置。

## 修改 skill 之后

改写约束型 skill 的措辞后，运行对应场景：

```bash
node evals/run.mjs --skill <名称>
```

加载 skill 后出现失败时，按 TESTING.md 的“补上漏洞”修改 skill，而不是修改场景，然后重新运行全部场景，确认没有破坏已经通过的场景。
