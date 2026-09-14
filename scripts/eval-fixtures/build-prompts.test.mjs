import assert from "node:assert/strict";
import test from "node:test";

import { buildPrompts, renderTemplate, skillBody } from "./build-prompts.mjs";

test("strips frontmatter from skill bodies", () => {
  const body = skillBody("to-tickets");
  assert.doesNotMatch(body, /^---/);
  assert.match(body, /^# 拆分开发任务/);
});

test("renders skill placeholders", () => {
  const rendered = renderTemplate("前\n{{skill:to-spec}}\n后");
  assert.match(rendered, /^前\n本 skill 根据当前对话/);
  assert.match(rendered, /\n后$/);
});

test("generated eval prompts match their templates and skill bodies", () => {
  const results = buildPrompts();
  assert.ok(results.length >= 2);
  for (const result of results) {
    assert.ok(
      result.upToDate,
      `${result.name}/prompt.md 已过期，运行 node scripts/eval-fixtures/build-prompts.mjs 重新生成`,
    );
  }
});
