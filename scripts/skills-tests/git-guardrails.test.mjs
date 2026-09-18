import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const guardScript = "skills/git-guardrails/block-dangerous-git.sh";
const prePushScript = "skills/git-guardrails/pre-push-guard.sh";
const shellGuardScript = "skills/git-guardrails/git-guard-shell.sh";

function runBash(args, options = {}) {
  return spawnSync("bash", args, {
    cwd: root,
    encoding: "utf8",
    ...options,
  });
}

test("block-dangerous-git blocks dangerous commands passed via arguments", () => {
  const dangerousCommands = [
    ["git", "push", "--force"],
    ["git", "push", "-f", "origin", "main"],
    ["git", "push", "origin", "main", "--force-with-lease"],
    ["git", "reset", "--hard", "HEAD~1"],
    ["git", "clean", "-fd"],
    ["git", "clean", "-f"],
    ["git", "clean", "-df"],
    ["git", "clean", "-xdf"],
    ["git", "branch", "-D", "feature-x"],
    ["git", "checkout", "."],
    ["git", "restore", "."],
    ["git", "restore", "--staged", "."],
  ];

  for (const cmd of dangerousCommands) {
    const res = runBash([guardScript, ...cmd]);
    assert.equal(
      res.status,
      2,
      `Expected status 2 for command '${cmd.join(" ")}', got ${res.status}. Output: ${res.stderr}`,
    );
    assert.match(res.stderr, /Git 安全守卫拦截/);
  }
});

test("block-dangerous-git permits safe git commands and boundary cases", () => {
  const safeCommands = [
    ["git", "status"],
    ["git", "diff"],
    ["git", "commit", "-m", "fix: bug"],
    ["git", "checkout", "-b", "feature-branch"],
    ["git", "restore", "file.txt"],
    ["git", "branch", "-d", "merged-feature"],
    ["git", "push", "origin", "feature-branch"],
    // 边界用例：带 -f 结尾的分支名不应被误拦
    ["git", "push", "origin", "release-f"],
    ["git", "push", "origin", "bugfix-f"],
    // 边界用例：带 -D 的分支名与安全删除/重命名不应被误拦
    ["git", "branch", "-d", "feature-D"],
    ["git", "branch", "-m", "old-D", "new-D"],
    ["git", "branch", "issue-Dev"],
    // 边界用例：提交信息包含破坏性命令关键词不应被误拦
    ["git", "commit", "-m", "feat: handle reset --hard"],
    ["git", "commit", "-m", "docs: add push --force and clean -fd notes"],
    // 边界用例：安全文件路径与演练参数
    ["git", "checkout", "feature.branch"],
    ["git", "clean", "-n"],
  ];

  for (const cmd of safeCommands) {
    const res = runBash([guardScript, ...cmd]);
    assert.equal(
      res.status,
      0,
      `Expected status 0 for safe command '${cmd.join(" ")}', got ${res.status}. Error: ${res.stderr}`,
    );
  }
});

test("block-dangerous-git does not intercept non-git commands with keywords", () => {
  const nonGitCommands = [
    ["echo", "git push --force"],
    ["cat", "docs/reset --hard.md"],
  ];

  for (const cmd of nonGitCommands) {
    const res = runBash([guardScript, ...cmd]);
    assert.equal(res.status, 0);
  }
});

test("block-dangerous-git supports stdin JSON payload format (Claude PreToolUse)", () => {
  const payload = JSON.stringify({
    tool_input: { command: "git reset --hard HEAD~2" },
  });

  const res = runBash([guardScript], { input: payload });
  assert.equal(res.status, 2);
  assert.match(res.stderr, /git reset --hard HEAD~2/);
});

test("block-dangerous-git supports escape hatch GIT_GUARD_ALLOW=1", () => {
  const res = runBash(["-c", `GIT_GUARD_ALLOW=1 "${guardScript}" git push --force`]);
  assert.equal(res.status, 0);
  assert.match(res.stderr, /已放行本次操作/);
});

test("pre-push-guard blocks deleting protected branches", () => {
  const payload =
    "refs/heads/main 0000000000000000000000000000000000000000 refs/heads/main 1111111111111111111111111111111111111111\n";
  const res = runBash([prePushScript], { input: payload });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /禁止删除受保护分支 'refs\/heads\/main'/);
});

test("pre-push-guard permits deleting normal non-protected branches", () => {
  const payload =
    "refs/heads/feature-old 0000000000000000000000000000000000000000 refs/heads/feature-old 1111111111111111111111111111111111111111\n";
  const res = runBash([prePushScript], { input: payload });
  assert.equal(res.status, 0);
});

test("pre-push-guard respects escape hatch GIT_GUARD_ALLOW=1", () => {
  const payload =
    "refs/heads/main 0000000000000000000000000000000000000000 refs/heads/main 1111111111111111111111111111111111111111\n";
  const res = runBash(["-c", `GIT_GUARD_ALLOW=1 "${prePushScript}"`], {
    input: payload,
  });
  assert.equal(res.status, 0);
  assert.match(res.stderr, /已放行本次推送/);
});

test("git-guard-shell intercepts dangerous git commands in shell wrapper", () => {
  const dangerousShellCommands = [
    "git reset --hard",
    "git checkout .",
    "git restore .",
    "git clean -fd",
    "git branch -D old-branch",
    "git push -f origin main",
  ];

  for (const cmd of dangerousShellCommands) {
    const script = `source "${shellGuardScript}" && ${cmd}`;
    const res = runBash(["-c", script]);
    assert.equal(
      res.status,
      2,
      `Expected status 2 for '${cmd}', got ${res.status}. Output: ${res.stderr}`,
    );
    assert.match(res.stderr, /检测到破坏性高危命令/);
  }
});

test("git-guard-shell permits commit messages with dangerous keywords and safe boundary commands", () => {
  // 模拟 git 二进制，验证放行时能够正常调用底层 git
  const safeShellCommands = [
    'git commit -m "feat: handle reset --hard and push -f"',
    "git branch -d feature-D",
    "git push origin release-f",
  ];

  for (const cmd of safeShellCommands) {
    // 注入 dummy command git 以测试包装函数是否正确放行到底层命令
    const script = `
      command() { if [ "$1" = "git" ]; then return 0; fi; };
      source "${shellGuardScript}";
      ${cmd};
    `;
    const res = runBash(["-c", script]);
    assert.equal(res.status, 0, `Expected status 0 for '${cmd}', got ${res.status}`);
  }
});
