import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildMetadataUpdates,
  INSTALL_ASSET_PAIRS,
  loadCodexMetadata,
  loadRepositoryMetadata,
  validateCodexMetadataModel,
  validateMetadataModel,
} from "../repository-metadata.lib.mjs";

function validModel() {
  const interfaceMetadata = {
    displayName: "Dev Skills",
    shortDescription: "Short",
    longDescription: "Long",
  };
  return {
    root: path.resolve("."),
    version: "1.0.0",
    skills: [
      { name: "alpha", relPath: "./skills/alpha" },
      { name: "beta", relPath: "./skills/beta" },
    ],
    rootPlugin: {
      name: "dev-skills",
      version: "1.0.0",
      extensions: { "com.openai": { interface: interfaceMetadata } },
    },
    codexPlugin: {
      name: "dev-skills",
      version: "1.0.0",
      description: "Description",
      skills: "./skills/",
      interface: interfaceMetadata,
    },
    claudePlugin: {
      name: "dev-skills",
      version: "1.0.0",
      skills: ["./skills/alpha", "./skills/beta"],
    },
    packageJson: { name: "dev-skills", version: "1.0.0" },
    agentsIndex: { entries: [{ path: "skills" }] },
    readme: "./alpha/SKILL.md\n./beta/SKILL.md",
    router: "alpha\nbeta",
    installAssets: [{ source: "template", target: "installed", equal: true }],
  };
}

test("元数据模型统一检查接口字段、skill 顺序和安装资产", () => {
  const model = validModel();
  delete model.codexPlugin.interface.longDescription;
  model.claudePlugin.skills.reverse();
  model.installAssets[0].equal = false;

  const errors = validateMetadataModel(model).join("\n");
  assert.match(errors, /longDescription/);
  assert.match(errors, /skills` 清单.*顺序/);
  assert.match(errors, /安装资产.*template.*installed/);
});

test("完整且同步的元数据模型没有诊断", () => {
  assert.deepEqual(validateMetadataModel(validModel()), []);
});

test("Codex 定向校验不受其他宿主元数据影响", () => {
  const model = validModel();
  model.claudePlugin.skills = [];
  model.installAssets[0].equal = false;
  assert.deepEqual(validateCodexMetadataModel(model), []);
});

test("Codex 清单要求 description 和真实的 skills 目录", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "invalid-codex-metadata-"));
  await writeFile(path.join(root, "skills"), "not a directory", "utf8");
  const model = validModel();
  model.root = root;
  delete model.codexPlugin.description;

  const errors = validateCodexMetadataModel(model).join("\n");
  assert.match(errors, /description/);
  assert.match(errors, /skills.*不存在或不是目录/);
});

test("Codex 定向加载不要求其他宿主文件", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "codex-metadata-"));
  const write = async (relativePath, value) => {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(value), "utf8");
  };
  const interfaceMetadata = {
    displayName: "Dev Skills",
    shortDescription: "Short",
    longDescription: "Long",
  };
  await write("package.json", { name: "dev-skills", version: "1.0.0" });
  await write("plugin.json", {
    name: "dev-skills",
    version: "1.0.0",
    extensions: { "com.openai": { interface: interfaceMetadata } },
  });
  await write(".codex-plugin/plugin.json", {
    name: "dev-skills",
    version: "1.0.0",
    description: "Description",
    skills: "./skills/",
    interface: interfaceMetadata,
  });
  await mkdir(path.join(root, "skills"));
  assert.deepEqual(validateCodexMetadataModel(loadCodexMetadata(root)), []);
});

test("缺失的安装资产会形成可应用的同步更新", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "repository-metadata-"));
  const write = async (relativePath, content) => {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  };
  const interfaceMetadata = {
    displayName: "Dev Skills",
    shortDescription: "Short",
    longDescription: "Long",
  };
  await write("package.json", JSON.stringify({ name: "dev-skills", version: "1.0.0" }));
  await write(
    "plugin.json",
    JSON.stringify({
      name: "dev-skills",
      version: "1.0.0",
      extensions: { "com.openai": { interface: interfaceMetadata } },
    }),
  );
  await write(
    ".codex-plugin/plugin.json",
    JSON.stringify({
      name: "dev-skills",
      version: "1.0.0",
      description: "Description",
      skills: "./skills/",
      interface: interfaceMetadata,
    }),
  );
  await write(
    ".claude-plugin/plugin.json",
    JSON.stringify({ name: "dev-skills", version: "1.0.0", skills: ["./skills/ask-dev-skills"] }),
  );
  await write(".agents/skills.json", JSON.stringify({ entries: [{ path: "skills" }] }));
  await write(
    "skills/ask-dev-skills/SKILL.md",
    "---\nname: ask-dev-skills\ndescription: 路由。\n---\n\n# 路由\n",
  );
  await write("skills/README.md", "./ask-dev-skills/SKILL.md\n");
  for (const [source, target] of INSTALL_ASSET_PAIRS) {
    await write(source, `${source}\n`);
    if (!target.endsWith("check-feature-coverage.mjs")) await write(target, `${source}\n`);
  }

  const model = loadRepositoryMetadata(root);
  const update = buildMetadataUpdates(model).find((entry) =>
    entry.path.endsWith("check-feature-coverage.mjs"),
  );
  assert.equal(update.content, "skills/setup-dev-skills/check-feature-coverage.mjs\n");
});
