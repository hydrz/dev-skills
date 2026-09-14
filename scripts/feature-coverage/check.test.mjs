import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  checkFeatureList,
  checkNonFunctional,
  parseTaskCoverage,
  run,
  splitTopLevel,
} from "../../skills/engineering/setup-dev-skills/check-feature-coverage.mjs";

const header =
  "| 编号 | 类型 | 名称 | 角色 | 端 | 批次 | 需覆盖状态 | 设计依据 | 规格 | 任务 | 结论 |\n" +
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n";

function featureList(rows, batch = "MVP") {
  return `# 示例 功能清单\n\n当前批次：${batch}\n\n批次顺序：MVP、V1.1\n\n## 功能项\n\n${header}${rows.join("\n")}\n`;
}

test("splits top-level separators without breaking parentheses", () => {
  assert.deepEqual(splitTopLevel("默认、离线（V1.1）、失败"), ["默认", "离线（V1.1）", "失败"]);
  assert.deepEqual(splitTopLevel("T09（默认、支付中）、T11（失败）"), [
    "T09（默认、支付中）",
    "T11（失败）",
  ]);
});

test("maps task coverage to states", () => {
  const coverage = parseTaskCoverage("T09（默认、支付中）、T11（失败、默认）");
  assert.deepEqual(coverage.get("默认"), ["T09", "T11"]);
  assert.deepEqual(coverage.get("失败"), ["T11"]);
});

test("passes when every current-batch state is covered", () => {
  const markdown = featureList([
    "| F-042 | 核心页面 | 解锁面板 | 观众 | H5 | MVP | 默认、失败、离线（V1.1） | [设计稿](design/F-042.png) | 商业化（MVP） | T09（默认）、T11（失败） | 已确定 |",
    "| F-043 | 功能 | 退款 | 观众 | H5 | V1.1 | 成功 | 待补 | | | 待定 |",
  ]);
  assert.deepEqual(checkFeatureList(markdown), []);
});

test("reports uncovered states in the current batch only", () => {
  const markdown = featureList([
    "| F-042 | 核心页面 | 解锁面板 | 观众 | H5 | MVP | 默认、失败、离线（V1.1） | [设计稿](design/F-042.png) | 商业化（MVP） | T09（默认） | 已确定 |",
  ]);
  const problems = checkFeatureList(markdown);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /F-042.*失败/);
  assert.doesNotMatch(problems[0], /离线/);
});

test("checks deferred states when their batch becomes current", () => {
  const markdown = featureList(
    [
      "| F-042 | 核心页面 | 解锁面板 | 观众 | H5 | MVP | 默认、离线（V1.1） | [设计稿](design/F-042.png) | 商业化（MVP） | T09（默认） | 已确定 |",
    ],
    "V1.1",
  );
  const problems = checkFeatureList(markdown);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /离线/);
});

test("reports pending items, weak design basis and invalid values", () => {
  const markdown = featureList([
    "| F-001 | 普通页面 | 设置页 | 观众 | H5 | MVP | 默认 | 按设计系统实现 | 账户（MVP） | T01（默认） | 已确定 |",
    "| F-002 | 核心页面 | 首页 | 观众 | H5 | MVP | 默认 | 看设计 | 发现（MVP） | T02（默认） | 已确定 |",
    "| F-003 | 功能 | 搜索 | 观众 | H5 | MVP | 成功 | 规格章节 | 发现（MVP） | | 待定 |",
    "| F-3 | 页面 | 错误项 | 观众 | H5 | MVP | 默认 | | | | 完成 |",
  ]);
  const problems = checkFeatureList(markdown).join("\n");
  assert.match(problems, /F-001.*参照/);
  assert.match(problems, /F-002.*核心页面/);
  assert.match(problems, /F-003.*待定/);
  assert.match(problems, /F-3.*编号/);
  assert.match(problems, /类型“页面”不合法/);
  assert.match(problems, /结论“完成”不合法/);
});

test("skips items marked as not doing", () => {
  const markdown = featureList(["| F-050 | 功能 | 投屏 | 观众 | iOS | MVP | 成功 | | | | 不做 |"]);
  assert.deepEqual(checkFeatureList(markdown), []);
});

test("checks every batch when the list has no current batch", () => {
  const markdown = `## 功能项\n\n| 编号 | 类型 | 名称 | 需覆盖状态 | 设计依据 | 任务 | 结论 |\n| --- | --- | --- | --- | --- | --- | --- |\n| F-001 | 功能 | 导出 | 成功、失败 | 规格章节 | T01（成功） | 已确定 |\n`;
  const problems = checkFeatureList(markdown);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /失败/);
});

test("reports missing table or columns", () => {
  assert.match(checkFeatureList("# 空文件\n")[0], /找不到/);
  assert.match(checkFeatureList("## 功能项\n\n| 编号 | 名称 |\n| --- | --- |\n")[0], /缺少列/);
});

test("checks non-functional requirements in a spec", () => {
  const spec = `## 非功能需求\n\n| 编号 | 要求 | 指标与目标值 | 验证方式 | 任务 |\n| --- | --- | --- | --- | --- |\n| N-01 | 首屏 | 2.5 秒内可交互 | Lighthouse | T03 |\n| N-02 | 无障碍 | | axe | 由 \`/to-tickets\` 回填 |\n`;
  const problems = checkNonFunctional(spec).join("\n");
  assert.doesNotMatch(problems, /N-01/);
  assert.match(problems, /N-02.*目标值/);
  assert.match(problems, /N-02.*没有任务覆盖/);
  assert.deepEqual(checkNonFunctional("## 非功能需求\n\n无\n"), []);
});

test("CLI returns exit codes for pass, problems and usage", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "feature-coverage-"));
  const listPath = path.join(dir, "list.md");
  await writeFile(
    listPath,
    featureList([
      "| F-001 | 功能 | 导出 | 运营 | Web | MVP | 成功、失败 | 规格章节 | 报表（MVP） | T01（成功） | 已确定 |",
    ]),
  );
  const failing = run([listPath]);
  assert.equal(failing.code, 1);
  assert.match(failing.output, /失败/);

  await writeFile(
    listPath,
    featureList([
      "| F-001 | 功能 | 导出 | 运营 | Web | MVP | 成功、失败 | 规格章节 | 报表（MVP） | T01（成功、失败） | 已确定 |",
    ]),
  );
  assert.equal(run([listPath]).code, 0);
  assert.equal(run([]).code, 2);
});
