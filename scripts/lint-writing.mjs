#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "evals",
  ".scratch",
  ".worktrees",
  ".claude",
  ".agents",
]);

// 包含正反例说明、必须引用反例词汇的文档清单
const EXAMPLE_EXEMPT_FILES = new Set([
  "docs/chinese-writing.md",
  "docs/chinese-localization-audit.md",
]);

export const WRITING_RULES = [
  {
    id: "half-width-punctuation",
    // 匹配汉字后面直接跟英文逗号、分号、问号、叹号（明显属于输入法未切换的标点残余）
    regex: /[\u4e00-\u9fa5][,;!?]/,
    message: "中文汉字后紧随半角标点，应改用中文全角标点（如“，”、“；”、“！”、“？”）",
  },
  {
    id: "half-width-colon",
    // 匹配汉字后紧跟英文冒号且后面跟空格或行尾（如“注意: ”、“说明:”），避免影响类似“文件:行号”或 URL 的技术简记
    regex: /[\u4e00-\u9fa5]:(?:\s|$)/,
    message: "中文说明后紧随半角冒号，应改用中文全角冒号“：”",
  },
  {
    id: "half-width-parentheses",
    // 匹配中文解释使用半角小括号（如“(前置依赖)”）
    regex: /\([\u4e00-\u9fa5]{2,}\)/,
    message: "中文解释说明建议使用全角括号“（）”而非半角括号",
  },
  {
    id: "anti-slop",
    // 匹配 docs/chinese-writing.md 中明令不推荐的生硬机翻黑话与情绪强化词
    regex: /(无情拷问|阻塞边|自主伸手|把迷雾毕业|台账扛过)/,
    message: "包含不推荐的生硬机翻黑话或情绪强化词，请参考 docs/chinese-writing.md 进行改写",
  },
];

/**
 * 收集目录下的所有 Markdown 文件
 */
export function collectMarkdownFiles(dir, fileList = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (IGNORED_DIRECTORIES.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectMarkdownFiles(fullPath, fileList);
    } else if (stat.isFile() && entry.endsWith(".md")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * 校验一段 Markdown 文本中的中文写作规范
 */
export function lintWritingText(text, options = {}) {
  const errors = [];
  const lines = text.split(/\r?\n/);

  let inCodeBlock = false;
  let codeFenceChar = null;
  let codeFenceLength = 0;
  let inFrontmatter = false;
  let disabledBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // 1. 处理 YAML frontmatter（仅在文件开头）
    if (i === 0 && trimmed === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (trimmed === "---") {
        inFrontmatter = false;
      }
      continue;
    }

    // 2. 处理代码块（精确支持 ``` 和 ~~~ 围栏，且支持嵌套多反引号代码块）
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (!inCodeBlock) {
      if (fenceMatch) {
        inCodeBlock = true;
        codeFenceChar = fenceMatch[1][0];
        codeFenceLength = fenceMatch[1].length;
        continue;
      }
    } else {
      if (
        fenceMatch &&
        fenceMatch[1][0] === codeFenceChar &&
        fenceMatch[1].length >= codeFenceLength
      ) {
        inCodeBlock = false;
        codeFenceChar = null;
        codeFenceLength = 0;
      }
      continue;
    }

    // 3. 忽略表格对齐分割线与 Markdown 分割线（---, ***, ___）
    if (
      /^---+$/.test(trimmed) ||
      /^\|?(\s*:?-+:?\s*\|)+\s*$/.test(trimmed) ||
      /^([-*_])\s*(?:\1\s*){2,}$/.test(trimmed)
    ) {
      continue;
    }

    // 4. 处理块级与行级豁免指令
    if (line.includes("<!-- lint-disable -->")) {
      disabledBlock = true;
      continue;
    }
    if (line.includes("<!-- lint-enable -->")) {
      disabledBlock = false;
      continue;
    }
    if (disabledBlock || line.includes("<!-- lint-disable-line -->")) {
      continue;
    }

    // 5. 文本清理与脱敏：
    // - 剥离 HTML 注释
    let clean = line.replace(/<!--[\s\S]*?-->/g, " ");
    // - 剥离 Markdown 链接中的 URL，只保留文字 [label](url) -> [label]
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, "[$1]");
    // - 剥离行内代码（替换为带空格的中性占位符，避免前后中文字符意外拼接）
    clean = clean.replace(/(`+).*?\1/g, " x ");
    // - 剥离 HTML 标签
    clean = clean.replace(/<[^>]+>/g, " ");

    // 6. 执行规则检查
    for (const rule of WRITING_RULES) {
      if (rule.id === "anti-slop" && options.exemptSlop) {
        continue;
      }
      const matches = [...clean.matchAll(new RegExp(rule.regex, "g"))];
      for (const match of matches) {
        errors.push({
          line: lineNum,
          rule: rule.id,
          message: rule.message,
          match: match[0],
          rawLine: trimmed,
        });
      }
    }
  }

  return errors;
}

/**
 * 校验单个 Markdown 文件
 */
export function lintWritingFile(filePath, root = defaultRoot) {
  const relPath = relative(root, filePath).replace(/\\/g, "/");
  if (EXAMPLE_EXEMPT_FILES.has(relPath)) {
    return [];
  }
  const content = readFileSync(filePath, "utf8");
  const rawErrors = lintWritingText(content);
  return rawErrors.map((err) => ({
    ...err,
    file: relPath,
  }));
}

/**
 * 校验整个仓库内的所有 Markdown 文档
 */
export function lintWritingAll(root = defaultRoot) {
  const files = collectMarkdownFiles(root);
  const allErrors = [];

  for (const file of files) {
    const fileErrors = lintWritingFile(file, root);
    allErrors.push(...fileErrors);
  }

  return {
    errors: allErrors,
    fileCount: files.length,
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const { errors, fileCount } = lintWritingAll(defaultRoot);

  if (errors.length > 0) {
    console.error(`\n中文写作规范检查发现 ${errors.length} 处违规：\n`);
    for (const err of errors) {
      console.error(`[FAIL] ${err.file}:${err.line} [${err.rule}] ${err.message}`);
      console.error(`       匹配内容: "${err.match}"`);
      console.error(`       原文: ${err.rawLine}\n`);
    }
    process.exit(1);
  } else {
    console.log(`[OK] 所有文档中文写作规范检查通过 (${fileCount} 个文件)`);
  }
}
