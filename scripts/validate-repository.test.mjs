import assert from "node:assert/strict";
import test from "node:test";

import { findSecretShapes, validateRepository, validateSkillText } from "./validate-repository.mjs";

test("validates a complete skill", () => {
  const text = `---\nname: example\ndescription: 示例 skill。\n---\n\n# 示例\n`;
  assert.deepEqual(validateSkillText(text, "example"), []);
});

test("reports malformed, mismatched and empty skills", () => {
  assert.match(validateSkillText("# missing", "example")[0], /frontmatter/);
  const errors = validateSkillText("---\nname: wrong\ndescription: 示例\n---\n", "example").join(
    "\n",
  );
  assert.match(errors, /目录名/);
  assert.match(errors, /正文为空/);
});

test("detects common credential shapes without storing a credential fixture", () => {
  const githubToken = "gh" + "p_" + "a".repeat(24);
  const openaiKey = "sk" + "-" + "b".repeat(24);
  assert.deepEqual(findSecretShapes(githubToken), ["GitHub token"]);
  assert.deepEqual(findSecretShapes(openaiKey), ["OpenAI key"]);
  assert.deepEqual(findSecretShapes("TOKEN_FROM_ENV"), []);
});

test("current repository passes the complete static validation", () => {
  assert.deepEqual(validateRepository(), []);
});
