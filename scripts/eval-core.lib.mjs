import { cp, mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadSkillCatalog } from "./repository-metadata.lib.mjs";

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    return inner ? inner.split(",").map((entry) => parseScalar(entry)) : [];
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  return value;
}

function parseFrontmatter(source) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const separator = line.indexOf(":", indent);
    if (separator < 0) throw new Error(`Unsupported frontmatter line: ${line}`);
    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const key = line.slice(indent, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    const parent = stack.at(-1).value;
    if (!rawValue) {
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }
  return root;
}

export function parseMarkdownWithFrontmatter(source) {
  const normalized = source.replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) return { attributes: {}, body: normalized.trim() };
  const closing = normalized.indexOf("\n---", 4);
  if (closing < 0) throw new Error("Frontmatter is missing a closing delimiter");
  return {
    attributes: parseFrontmatter(normalized.slice(4, closing)),
    body: normalized.slice(closing + 4).trim(),
  };
}

export async function evaluateRegexGrader(grader, run) {
  let target = run.finalResponse ?? "";
  if (grader.target?.source === "file") {
    if (!run.workspace) return { status: "failed", reason: "The grader requires a workspace file" };
    try {
      target = await readFile(
        new URL(grader.target.path, `file:///${run.workspace.replaceAll("\\", "/")}/`),
        "utf8",
      );
    } catch (error) {
      return { status: "failed", reason: `Unable to read ${grader.target.path}: ${error.message}` };
    }
  }
  try {
    const matched = new RegExp(grader.pattern, grader.flags ?? "").test(target);
    return {
      status: matched ? "passed" : "failed",
      reason: matched ? "Pattern matched" : "Pattern did not match",
    };
  } catch (error) {
    return { status: "failed", reason: `Invalid regular expression: ${error.message}` };
  }
}

function globPattern(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replaceAll("*", ".*").replaceAll("?", ".")}$`);
}

export async function discoverCases(evalsDirectory, filters = {}) {
  const entries = await readdir(evalsDirectory, { withFileTypes: true });
  const matcher = globPattern(filters.casePattern ?? "*");
  const cases = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.name === "results" || entry.name === "codex") continue;
    if (!matcher.test(entry.name)) continue;
    const caseDirectory = path.join(evalsDirectory, entry.name);
    let promptDocument;
    try {
      promptDocument = parseMarkdownWithFrontmatter(
        await readFile(path.join(caseDirectory, "prompt.md"), "utf8"),
      );
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    const tags = promptDocument.attributes.tags ?? [];
    if (filters.tag && !tags.includes(filters.tag)) continue;
    const graders = [];
    try {
      const graderEntries = await readdir(path.join(caseDirectory, "graders"), {
        withFileTypes: true,
      });
      for (const graderEntry of graderEntries.sort((left, right) =>
        left.name.localeCompare(right.name),
      )) {
        if (!graderEntry.isFile() || !graderEntry.name.endsWith(".md")) continue;
        const graderDocument = parseMarkdownWithFrontmatter(
          await readFile(path.join(caseDirectory, "graders", graderEntry.name), "utf8"),
        );
        graders.push({
          name: graderEntry.name.slice(0, -3),
          ...graderDocument.attributes,
          rubric: graderDocument.body,
        });
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    cases.push({
      name: entry.name,
      directory: caseDirectory,
      metadata: promptDocument.attributes,
      prompt: promptDocument.body,
      graders,
    });
  }
  return cases;
}

export async function findSkills(skillsDirectory) {
  return loadSkillCatalog(skillsDirectory);
}

export function requiredSkillsForCase(evalCase, skills) {
  const configured = evalCase.metadata.required_skills;
  const names = Array.isArray(configured)
    ? configured
    : [(evalCase.metadata.tags ?? []).find((tag) => skills.has(tag))].filter(Boolean);
  for (const name of names) {
    if (!skills.has(name)) throw new Error(`${evalCase.name} requires unknown skill: ${name}`);
  }
  return [...new Set(names)];
}

export function primarySkillForCase(evalCase, skills) {
  return (
    (evalCase.metadata.tags ?? []).find((tag) => skills.has(tag)) ??
    requiredSkillsForCase(evalCase, skills)[0] ??
    null
  );
}

export async function copyRequiredSkills(workspace, evalCase, skills) {
  const names = requiredSkillsForCase(evalCase, skills);
  for (const name of names) {
    const destination = path.join(workspace, ".agents", "skills", name);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(skills.get(name), destination, { recursive: true });
  }
  return names;
}
