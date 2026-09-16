#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMetadataUpdates,
  loadRepositoryMetadata,
  relativeMetadataPath,
  validateMetadataModel,
} from "./repository-metadata.lib.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const isCheckMode = process.argv.includes("--check");

const model = loadRepositoryMetadata(repoRoot);
const updates = buildMetadataUpdates(model);
const structuralErrors = validateMetadataModel(model).filter(
  (error) =>
    !error.includes("version") &&
    !error.includes("skills 清单") &&
    !error.startsWith("安装资产未同步"),
);

if (isCheckMode) {
  for (const update of updates) {
    console.error(`[FAIL] \`${relativeMetadataPath(model, update.path)}\` 需要同步`);
  }
} else {
  for (const update of updates) {
    mkdirSync(dirname(update.path), { recursive: true });
    writeFileSync(update.path, update.content, "utf8");
    console.log(`[OK] 已同步 \`${relativeMetadataPath(model, update.path)}\``);
  }
}

for (const error of structuralErrors) console.error(`[FAIL] ${error}`);

if (updates.length === 0 && structuralErrors.length === 0) {
  console.log(`[OK] 元数据、skill 清单与 ${model.installAssets.length} 组安装资产已对齐`);
}

if ((isCheckMode && updates.length > 0) || structuralErrors.length > 0) {
  console.error("\n元数据检查失败！运行 `npm run sync` 自动修复生成内容，或补齐相应文档。");
  process.exitCode = 1;
}
