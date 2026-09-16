import assert from "node:assert/strict";
import test from "node:test";

import { lintWritingAll, lintWritingText } from "../lint-writing.mjs";

test("detects half-width punctuation after Chinese characters", () => {
  const bad = "开发任务,请先确认。";
  const errors = lintWritingText(bad);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].rule, "half-width-punctuation");

  const good = "开发任务，请先确认。";
  assert.equal(lintWritingText(good).length, 0);

  const badQuestion = "这项设计确定了吗?";
  assert.equal(lintWritingText(badQuestion)[0]?.rule, "half-width-punctuation");

  const goodQuestion = "这项设计确定了吗？";
  assert.equal(lintWritingText(goodQuestion).length, 0);
});

test("detects half-width colon in Chinese explanations", () => {
  const bad = "注意: 请在提交前运行测试。";
  const errors = lintWritingText(bad);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].rule, "half-width-colon");

  const good = "注意：请在提交前运行测试。";
  assert.equal(lintWritingText(good).length, 0);

  // 技术标记（如“文件:行号”无后续空格）不应误报
  const techNotation = "定位到 文件:行号 并检查代码。";
  assert.equal(lintWritingText(techNotation).length, 0);
});

test("detects half-width parentheses used for Chinese explanations", () => {
  const bad = "检查核心模块(包含前置依赖)的状态。";
  const errors = lintWritingText(bad);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].rule, "half-width-parentheses");

  const good = "检查核心模块（包含前置依赖）的状态。";
  assert.equal(lintWritingText(good).length, 0);

  // 编号与 Markdown 链接不应误报
  const listParen = "(1) 第一步执行迁移；(2) 第二步运行校验。";
  assert.equal(lintWritingText(listParen).length, 0);

  const link = "[参考文档](https://example.com/docs)";
  assert.equal(lintWritingText(link).length, 0);
});

test("detects non-recommended machine-translation and slop phrases", () => {
  const bad1 = "逐轮无情拷问设计方案。";
  assert.equal(lintWritingText(bad1)[0]?.rule, "anti-slop");

  const bad2 = "每项任务必须声明自己的阻塞边。";
  assert.equal(lintWritingText(bad2)[0]?.rule, "anti-slop");

  const bad3 = "模型自主伸手去用它。";
  assert.equal(lintWritingText(bad3)[0]?.rule, "anti-slop");

  const bad4 = "将台账扛过上下文压缩。";
  assert.equal(lintWritingText(bad4)[0]?.rule, "anti-slop");

  const bad5 = "把迷雾毕业成新工单。";
  assert.equal(lintWritingText(bad5)[0]?.rule, "anti-slop");

  const good = "逐轮压力测试并澄清方案，明确各项任务的前置依赖。";
  assert.equal(lintWritingText(good).length, 0);
});

test("allows slashes with spaces between Chinese words without false alarm", () => {
  // 斜杠技术项或并列项（如“技能 / 命令”、“输入 / 输出”）不应报错
  const slashPhrase = "依赖 / 提供，或输入 / 输出。";
  assert.equal(lintWritingText(slashPhrase).length, 0);

  const header = "| 技能 / 命令 | 说明 |";
  assert.equal(lintWritingText(header).length, 0);
});

test("allows legal Chinese dashes and hyphenated arguments without false alarm", () => {
  // 破折号是国标法定标点，不应一刀切禁止
  const emDash = "软件工程的核心原则——始终保持测试可运行。";
  assert.equal(lintWritingText(emDash).length, 0);

  const singleDash = "设计方案—实施步骤—完成验证。";
  assert.equal(lintWritingText(singleDash).length, 0);
});

test("skips YAML frontmatter, code fences and nested blocks correctly", () => {
  const markdown = [
    "---",
    "title: 测试",
    "description: 描述(带括号)不在此处报",
    "---",
    "",
    "# 正文",
    "",
    "```markdown",
    "注意: 代码块内的半角冒号不应该报错",
    "输入 / 输出 也不会报错",
    "```",
    "",
    "~~~bash",
    'echo "无情拷问"',
    "~~~",
    "",
    "````markdown",
    "嵌套代码块展示：",
    "```",
    "注意: 内部代码",
    "```",
    "````",
  ].join("\n");

  assert.equal(lintWritingText(markdown).length, 0);
});

test("supports lint-disable inline and block comments", () => {
  const lineDisabled = "引述原文: 存在无情拷问 <!-- lint-disable-line -->";
  assert.equal(lintWritingText(lineDisabled).length, 0);

  const blockDisabled = `
<!-- lint-disable -->
引述外部标准:
输入 / 输出 与 阻塞边
<!-- lint-enable -->
`;
  assert.equal(lintWritingText(blockDisabled).length, 0);
});

test("current repository passes the complete writing lint", () => {
  const { errors, fileCount } = lintWritingAll();
  assert.equal(errors.length, 0, `发现违规: ${JSON.stringify(errors, null, 2)}`);
  assert.ok(fileCount > 50, `应该检查至少 50 个 Markdown 文件，实际检查了 ${fileCount} 个`);
});
