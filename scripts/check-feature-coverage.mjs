#!/usr/bin/env node
// 检查功能清单和规格的覆盖情况。只依赖 Node.js 标准库。
//
// 用法：
//   node scripts/check-feature-coverage.mjs <功能清单.md> [规格.md ...]
//
// 小功能没有独立清单时，把规格文件作为第一个参数：脚本读取其中的“功能项”一节。
// 发现问题时逐条输出并以退出码 1 结束；没有问题时退出码为 0。

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const FEATURE_COLUMNS = ["编号", "类型", "名称", "需覆盖状态", "设计依据", "任务", "结论"];
const FEATURE_TYPES = new Set(["核心页面", "普通页面", "功能", "后台任务", "第三方对接"]);
const PAGE_TYPES = new Set(["核心页面", "普通页面"]);
const CONCLUSIONS = new Set(["待定", "已确定", "不做"]);
const NFR_COLUMNS = ["编号", "要求", "指标与目标值", "验证方式", "任务"];

/** 按顶层的顿号或逗号拆分，忽略全角和半角括号内部的分隔符。 */
export function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "（" || char === "(") depth += 1;
    if (char === "）" || char === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && (char === "、" || char === "，" || char === ",")) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** 拆出“名称（括注）”中的名称和括注。 */
export function splitAnnotation(text) {
  const match = /^(.*?)[（(](.*)[）)]$/.exec(text.trim());
  if (!match) return { name: text.trim(), note: null };
  return { name: match[1].trim(), note: match[2].trim() };
}

function splitRow(line) {
  const cells = [];
  let current = "";
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === "\\" && body[i + 1] === "|") {
      current += "|";
      i += 1;
    } else if (body[i] === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += body[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

/** 读取某个二级标题下的第一张表。标题不存在时返回 null。 */
export function readTable(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  let inCode = false;
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().startsWith("```")) inCode = !inCode;
    if (!inCode && lines[i].trim() === `## ${heading}`) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return null;

  const rows = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith("## ")) break;
    if (!line.startsWith("|")) {
      if (rows.length > 0) break;
      continue;
    }
    rows.push(splitRow(line));
  }
  if (rows.length < 2) return { header: rows[0] ?? [], rows: [] };

  const [header, , ...body] = rows;
  return {
    header,
    rows: body.map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ""]))),
  };
}

function readField(markdown, name) {
  const match = new RegExp(`^${name}[：:]\\s*(.+)$`, "m").exec(markdown);
  return match ? match[1].trim() : null;
}

/** 解析任务列，例如“T09（默认、支付中）、T11（失败）”，返回每个状态对应的任务。 */
export function parseTaskCoverage(text) {
  const coverage = new Map();
  for (const entry of splitTopLevel(text)) {
    const { name, note } = splitAnnotation(entry);
    if (!note) continue;
    for (const state of splitTopLevel(note)) {
      if (!coverage.has(state)) coverage.set(state, []);
      coverage.get(state).push(name);
    }
  }
  return coverage;
}

function isPlaceholder(text) {
  const value = text.trim();
  return value === "" || value === "无" || value.includes("回填") || /^<.*>$/.test(value);
}

/** 检查功能清单，返回问题列表。 */
export function checkFeatureList(markdown, source = "功能清单") {
  const problems = [];
  const table = readTable(markdown, "功能项");
  if (!table) {
    return [`${source}：找不到“## 功能项”一节。`];
  }

  const missing = FEATURE_COLUMNS.filter((column) => !table.header.includes(column));
  if (missing.length > 0) {
    return [`${source}：功能项表缺少列：${missing.join("、")}。`];
  }

  const currentBatch = readField(markdown, "当前批次");
  const batchOrder = readField(markdown, "批次顺序");
  const knownBatches = batchOrder ? new Set(splitTopLevel(batchOrder)) : null;
  if (currentBatch && !table.header.includes("批次")) {
    problems.push(`${source}：写了当前批次，但功能项表缺少“批次”列。`);
  }
  if (currentBatch && knownBatches && !knownBatches.has(currentBatch)) {
    problems.push(`${source}：当前批次“${currentBatch}”不在批次顺序中。`);
  }

  const seen = new Set();
  for (const row of table.rows) {
    const id = row["编号"];
    const label = `${id || "（无编号）"} ${row["名称"]}`.trim();

    if (!/^F-\d{3}$/.test(id)) problems.push(`${label}：编号应为 F- 加三位数字。`);
    if (seen.has(id)) problems.push(`${label}：编号重复。`);
    seen.add(id);
    if (!FEATURE_TYPES.has(row["类型"])) problems.push(`${label}：类型“${row["类型"]}”不合法。`);
    if (!CONCLUSIONS.has(row["结论"])) problems.push(`${label}：结论“${row["结论"]}”不合法。`);

    const itemBatch = row["批次"] ?? "";
    if (currentBatch && knownBatches && itemBatch && !knownBatches.has(itemBatch)) {
      problems.push(`${label}：批次“${itemBatch}”不在批次顺序中。`);
    }
    if (row["结论"] === "不做") continue;

    const states = splitTopLevel(row["需覆盖状态"]).map(splitAnnotation);
    const currentStates = states
      .filter(({ note }) => {
        if (!currentBatch) return true;
        return note ? note === currentBatch : itemBatch === currentBatch;
      })
      .map(({ name }) => name);
    if (currentStates.length === 0) continue;

    if (row["结论"] === "待定") {
      problems.push(`${label}：当前批次的功能项结论仍是“待定”。`);
      continue;
    }

    if (PAGE_TYPES.has(row["类型"])) {
      const basis = row["设计依据"].trim();
      if (isPlaceholder(basis)) {
        problems.push(`${label}：页面缺少设计依据。`);
      } else if (row["类型"] === "核心页面" && !/\]\(|https?:\/\//.test(basis)) {
        problems.push(`${label}：核心页面的设计依据应链接到设计稿、原型截图或视觉规格。`);
      } else if (row["类型"] === "普通页面" && /设计系统/.test(basis) && !/参照/.test(basis)) {
        problems.push(`${label}：只写“按设计系统实现”不算设计依据，需要写明参照哪个页面。`);
      }
    }

    const coverage = parseTaskCoverage(row["任务"]);
    const uncovered = currentStates.filter((state) => !coverage.has(state));
    if (uncovered.length > 0) {
      problems.push(`${label}：以下状态没有任务覆盖：${uncovered.join("、")}。`);
    }
  }
  return problems;
}

/** 检查规格中的非功能需求，返回问题列表。规格没有这一节时不报错。 */
export function checkNonFunctional(markdown, source = "规格") {
  const table = readTable(markdown, "非功能需求");
  if (!table || table.rows.length === 0) return [];

  const missing = NFR_COLUMNS.filter((column) => !table.header.includes(column));
  if (missing.length > 0) {
    return [`${source}：非功能需求表缺少列：${missing.join("、")}。`];
  }

  const problems = [];
  const seen = new Set();
  for (const row of table.rows) {
    const id = row["编号"];
    const label = `${source} ${id || "（无编号）"} ${row["要求"]}`.trim();
    if (!/^N-\d{2}$/.test(id)) problems.push(`${label}：编号应为 N- 加两位数字。`);
    if (seen.has(id)) problems.push(`${label}：编号重复。`);
    seen.add(id);
    if (isPlaceholder(row["指标与目标值"])) problems.push(`${label}：缺少可测量的目标值。`);
    if (isPlaceholder(row["验证方式"])) problems.push(`${label}：缺少验证方式。`);
    if (isPlaceholder(row["任务"])) problems.push(`${label}：没有任务覆盖。`);
  }
  return problems;
}

export function run(argv) {
  if (argv.length === 0) {
    return {
      code: 2,
      output: "用法：node check-feature-coverage.mjs <功能清单.md> [规格.md ...]",
    };
  }

  const [listPath, ...specPaths] = argv;
  const problems = [];
  try {
    const listMarkdown = readFileSync(listPath, "utf8");
    problems.push(...checkFeatureList(listMarkdown, path.basename(listPath)));
    problems.push(...checkNonFunctional(listMarkdown, path.basename(listPath)));
    for (const specPath of specPaths) {
      problems.push(...checkNonFunctional(readFileSync(specPath, "utf8"), path.basename(specPath)));
    }
  } catch (error) {
    return { code: 2, output: `读取文件失败：${error.message}` };
  }

  if (problems.length === 0) {
    return { code: 0, output: "覆盖检查通过：当前批次的功能项和非功能需求都有任务覆盖。" };
  }
  return {
    code: 1,
    output: [`覆盖检查发现 ${problems.length} 个问题：`, ...problems.map((p) => `- ${p}`)].join(
      "\n",
    ),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = run(process.argv.slice(2));
  console.log(result.output);
  process.exitCode = result.code;
}
