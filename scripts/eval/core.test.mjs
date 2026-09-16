import assert from "node:assert/strict";
import test from "node:test";

import { parseMarkdownWithFrontmatter, requiredSkillsForCase } from "./core.lib.mjs";

test("评测核心独立解析用例并选择所需 skill", () => {
  const document = parseMarkdownWithFrontmatter(
    "---\ntags: [tdd]\nrequired_skills: [tdd, writing-chinese]\n---\n执行任务\n",
  );
  const evalCase = { name: "example", metadata: document.attributes };
  const skills = new Map([
    ["tdd", "skills/tdd"],
    ["writing-chinese", "skills/writing-chinese"],
  ]);

  assert.equal(document.body, "执行任务");
  assert.deepEqual(requiredSkillsForCase(evalCase, skills), ["tdd", "writing-chinese"]);
});
