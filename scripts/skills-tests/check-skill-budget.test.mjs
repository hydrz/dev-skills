import assert from "node:assert/strict";
import test from "node:test";

import {
  DESCRIPTION_BUDGET,
  DESCRIPTION_SOFT_LIMIT,
  checkDescriptions,
  checkSkillBudget,
  findHostBindings,
  parseSkill,
} from "../check-skill-budget.mjs";

test("distinguishes model-invoked and user-invoked skills", () => {
  const auto = parseSkill("---\nname: a\ndescription: 用于示例。\n---\n\n正文\n");
  const user = parseSkill(
    "---\nname: b\ndescription: 示例。\ndisable-model-invocation: true\n---\n\n正文\n",
  );
  assert.deepEqual(auto, { description: "用于示例。", modelInvoked: true });
  assert.equal(user.modelInvoked, false);
});

test("fails over the resident description budget and only warns on long descriptions", () => {
  const long = "字".repeat(DESCRIPTION_SOFT_LIMIT + 1);
  const withinBudget = checkDescriptions([
    { name: "a", description: long, modelInvoked: true },
    { name: "b", description: "字".repeat(5000), modelInvoked: false },
  ]);
  assert.deepEqual(withinBudget.errors, []);
  assert.equal(withinBudget.warnings.length, 1);

  const many = Array.from({ length: Math.ceil(DESCRIPTION_BUDGET / 90) + 1 }, (_, i) => ({
    name: `s${i}`,
    description: "字".repeat(90),
    modelInvoked: true,
  }));
  assert.match(checkDescriptions(many).errors[0], /超过预算/);
});

test("detects host-specific skill invocation wording", () => {
  assert.equal(findHostBindings("调用 Skill 工具，参数为 `tdd`。").length, 1);
  assert.deepEqual(findHostBindings("使用 `tdd` skill。"), []);
});

test("current repository stays within the skill budget", () => {
  assert.deepEqual(checkSkillBudget().errors, []);
});
