import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export const INSTALL_ASSET_PAIRS = [
  ["skills/setup-dev-skills/domain.md", "docs/agents/domain.md"],
  ["skills/setup-dev-skills/feature-list.md", "docs/agents/feature-list.md"],
  ["skills/setup-dev-skills/triage-labels.md", "docs/agents/triage-labels.md"],
  ["skills/setup-dev-skills/check-feature-coverage.mjs", "scripts/check-feature-coverage.mjs"],
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function parseSkillMetadata(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match)
    return { validFrontmatter: false, name: null, description: "", body: "", modelInvoked: true };
  const [, frontmatter, body] = match;
  return {
    validFrontmatter: true,
    name: frontmatter.match(/^name:\s*["']?([^\s"']+)["']?\s*$/m)?.[1] ?? null,
    description:
      frontmatter
        .match(/^description:\s*(.+)$/m)?.[1]
        ?.trim()
        .replace(/^(["'])(.*)\1$/, "$2") ?? "",
    body,
    modelInvoked: !/^disable-model-invocation:\s*true\s*$/m.test(frontmatter),
  };
}

export function discoverRepositorySkills(root) {
  const skillsDirectory = join(root, "skills");
  return readdirSync(skillsDirectory)
    .filter((name) => {
      const directory = join(skillsDirectory, name);
      return statSync(directory).isDirectory() && existsSync(join(directory, "SKILL.md"));
    })
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const directory = join(skillsDirectory, name);
      const main = readFileSync(join(directory, "SKILL.md"), "utf8");
      return {
        name,
        directory,
        relPath: `./skills/${name}`,
        main,
        metadata: parseSkillMetadata(main),
      };
    });
}

export function loadSkillCatalog(skillsDirectory) {
  const root = dirname(skillsDirectory);
  const skills = new Map();
  for (const skill of discoverRepositorySkills(root)) {
    const name = skill.metadata.name;
    if (!name) throw new Error(`${skill.directory} does not declare a skill name`);
    if (skills.has(name)) throw new Error(`Duplicate skill name: ${name}`);
    skills.set(name, skill.directory);
  }
  return skills;
}

export function loadRepositoryMetadata(root) {
  const codexMetadata = loadCodexMetadata(root);
  const paths = {
    ...codexMetadata.paths,
    claudePlugin: join(root, ".claude-plugin", "plugin.json"),
    agentsIndex: join(root, ".agents", "skills.json"),
    readme: join(root, "skills", "README.md"),
    router: join(root, "skills", "ask-dev-skills", "SKILL.md"),
  };
  const installAssets = INSTALL_ASSET_PAIRS.map(([source, target]) => {
    const sourcePath = join(root, source);
    const targetPath = join(root, target);
    const sourceContent = readFileSync(sourcePath, "utf8");
    const targetContent = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : null;
    return {
      source,
      target,
      sourcePath,
      targetPath,
      sourceContent,
      targetContent,
      equal: sourceContent === targetContent,
    };
  });
  return {
    ...codexMetadata,
    paths,
    skills: discoverRepositorySkills(root),
    claudePlugin: readJson(paths.claudePlugin),
    agentsIndex: readJson(paths.agentsIndex),
    readme: readFileSync(paths.readme, "utf8"),
    router: readFileSync(paths.router, "utf8"),
    installAssets,
  };
}

export function loadCodexMetadata(root) {
  const paths = {
    packageJson: join(root, "package.json"),
    rootPlugin: join(root, "plugin.json"),
    codexPlugin: join(root, ".codex-plugin", "plugin.json"),
  };
  const packageJson = readJson(paths.packageJson);
  return {
    root,
    paths,
    packageJson,
    version: packageJson.version,
    rootPlugin: readJson(paths.rootPlugin),
    codexPlugin: readJson(paths.codexPlugin),
  };
}

function interfaceErrors(label, value, errors) {
  for (const field of ["displayName", "shortDescription", "longDescription"]) {
    if (!value?.[field]) errors.push(`${label} 缺少 \`${field}\``);
  }
}

export function validateMetadataModel(model) {
  const errors = validateCodexMetadataModel(model);
  const expectedPaths = model.skills.map((skill) => skill.relPath);
  if (model.claudePlugin.name !== model.packageJson.name) {
    errors.push("`.claude-plugin/plugin.json` 的 `name` 与 `package.json` 不一致");
  }
  if (model.claudePlugin.version !== model.version) {
    errors.push("`.claude-plugin/plugin.json` 的 `version` 与 `package.json` 不一致");
  }

  const actualClaudeSkills = Array.isArray(model.claudePlugin.skills)
    ? model.claudePlugin.skills
    : [];
  if (
    actualClaudeSkills.length !== expectedPaths.length ||
    actualClaudeSkills.some((value, index) => value !== expectedPaths[index])
  ) {
    errors.push(
      "`.claude-plugin/plugin.json` 的 `skills` 清单内容或顺序未与实际目录同步；运行 `npm run sync`",
    );
  }

  for (const entry of model.agentsIndex?.entries ?? []) {
    if (
      typeof entry.path !== "string" ||
      (entry.path !== "skills" && !entry.path.startsWith("skills/"))
    ) {
      errors.push("`.agents/skills.json` 包含无效的 skill 根路径");
      continue;
    }
    if (model.root) {
      const resolvedEntry = resolve(model.root, entry.path);
      if (!expectedPaths.some((path) => resolve(model.root, path).startsWith(resolvedEntry))) {
        errors.push(`\`.agents/skills.json\` 的路径没有包含任何 skill：\`${entry.path}\``);
      }
    }
  }

  for (const skill of model.skills) {
    if (!model.readme.includes(`./${skill.name}/SKILL.md`)) {
      errors.push(`\`skills/README.md\` 缺少 skill 条目：\`${skill.name}\``);
    }
    if (skill.name !== "ask-dev-skills" && !model.router.includes(skill.name)) {
      errors.push(`\`skills/ask-dev-skills/SKILL.md\` 路由未覆盖：\`${skill.name}\``);
    }
  }
  for (const asset of model.installAssets ?? []) {
    if (!asset.equal) errors.push(`安装资产未同步：\`${asset.source}\` → \`${asset.target}\``);
  }
  return errors;
}

export function validateCodexMetadataModel(model) {
  const errors = [];
  if (model.rootPlugin.name !== model.packageJson.name) {
    errors.push("`plugin.json` 的 `name` 与 `package.json` 不一致");
  }
  if (model.codexPlugin.name !== model.packageJson.name) {
    errors.push("`.codex-plugin/plugin.json` 的 `name` 与 `package.json` 不一致");
  }
  if (!model.codexPlugin.description) {
    errors.push("`.codex-plugin/plugin.json` 缺少必填字段 `description`");
  }
  for (const [label, manifest] of [
    ["`plugin.json`", model.rootPlugin],
    ["`.codex-plugin/plugin.json`", model.codexPlugin],
  ]) {
    if (manifest.version !== model.version) {
      errors.push(`${label} 的 \`version\` 与 \`package.json\` 不一致`);
    }
  }
  interfaceErrors(
    "`plugin.json` 的 `extensions.com.openai.interface`",
    model.rootPlugin.extensions?.["com.openai"]?.interface,
    errors,
  );
  interfaceErrors(
    "`.codex-plugin/plugin.json` 的 `interface`",
    model.codexPlugin.interface,
    errors,
  );
  if (typeof model.codexPlugin.skills !== "string") {
    errors.push("`.codex-plugin/plugin.json` 的 `skills` 必须是字符串路径");
  } else if (model.root) {
    const skillsPath = isAbsolute(model.codexPlugin.skills)
      ? model.codexPlugin.skills
      : resolve(model.root, model.codexPlugin.skills);
    if (skillsPath !== resolve(model.root, "skills")) {
      errors.push("`.codex-plugin/plugin.json` 的 `skills` 必须指向仓库 `skills` 目录");
    } else if (!existsSync(skillsPath) || !statSync(skillsPath).isDirectory()) {
      errors.push("`.codex-plugin/plugin.json` 指定的 `skills` 路径不存在或不是目录");
    }
  }
  return errors;
}

export function buildMetadataUpdates(model) {
  const updates = [];
  const expectedPaths = model.skills.map((skill) => skill.relPath);
  const manifests = [
    [model.paths?.rootPlugin, { ...model.rootPlugin, version: model.version }],
    [model.paths?.codexPlugin, { ...model.codexPlugin, version: model.version }],
    [
      model.paths?.claudePlugin,
      { ...model.claudePlugin, version: model.version, skills: expectedPaths },
    ],
  ];
  for (const [path, value] of manifests) {
    if (!path) continue;
    const content = `${JSON.stringify(value, null, 2)}\n`;
    if (readFileSync(path, "utf8") !== content) updates.push({ path, content });
  }
  for (const asset of model.installAssets ?? []) {
    if (!asset.equal) updates.push({ path: asset.targetPath, content: asset.sourceContent });
  }
  return updates;
}

export function relativeMetadataPath(model, path) {
  return relative(model.root, path).replace(/\\/g, "/");
}
