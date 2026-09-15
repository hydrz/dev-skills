import { cp, mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  escapeHtml,
  formatSummaryTable,
  generateHtmlReport,
  isGraderIndicator,
} from "../eval-report.lib.mjs";

export { escapeHtml, formatSummaryTable, generateHtmlReport, isGraderIndicator };

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((entry) => parseScalar(entry));
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
    if (separator < 0) {
      throw new Error(`Unsupported frontmatter line: ${line}`);
    }

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
  if (!normalized.startsWith("---\n")) {
    return { attributes: {}, body: normalized.trim() };
  }

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
    if (!run.workspace) {
      return { status: "failed", reason: "The grader requires a workspace file" };
    }

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

export function evaluateToolOrderGrader(grader, run) {
  const changes = [];

  for (const [eventIndex, event] of (run.events ?? []).entries()) {
    if (
      event.type !== "item.completed" ||
      event.item?.type !== "file_change" ||
      event.item.status !== "completed"
    ) {
      continue;
    }

    for (const change of event.item.changes ?? []) {
      changes.push({ eventIndex, text: JSON.stringify(change) });
    }
  }

  try {
    const beforePattern = new RegExp(grader.before.input_match);
    const afterPattern = new RegExp(grader.after.input_match);
    const before = changes.find((change) => beforePattern.test(change.text));
    const after = changes.find((change) => afterPattern.test(change.text));

    if (!before || !after) {
      return { status: "failed", reason: "One or both matching file changes were not observed" };
    }
    if (before.eventIndex === after.eventIndex) {
      return { status: "inconclusive", reason: "Both files changed in the same patch event" };
    }

    return before.eventIndex < after.eventIndex
      ? { status: "passed", reason: "The expected file change happened first" }
      : { status: "failed", reason: "The file changes happened in the wrong order" };
  } catch (error) {
    return { status: "failed", reason: `Invalid tool-order matcher: ${error.message}` };
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

    const graderDirectory = path.join(caseDirectory, "graders");
    const graders = [];
    try {
      const graderEntries = await readdir(graderDirectory, { withFileTypes: true });
      for (const graderEntry of graderEntries.sort((left, right) =>
        left.name.localeCompare(right.name),
      )) {
        if (!graderEntry.isFile() || !graderEntry.name.endsWith(".md")) continue;
        const graderDocument = parseMarkdownWithFrontmatter(
          await readFile(path.join(graderDirectory, graderEntry.name), "utf8"),
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

export function buildCodexArgs(options) {
  const args = [
    "--ask-for-approval",
    "never",
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--sandbox",
    options.sandbox ?? "read-only",
    "--cd",
    options.workspace,
  ];

  if (options.model) args.push("--model", options.model);
  if (options.reasoning) {
    args.push("--config", `model_reasoning_effort=${JSON.stringify(options.reasoning)}`);
  }
  if (options.outputSchema) args.push("--output-schema", options.outputSchema);
  if (options.outputFile) args.push("--output-last-message", options.outputFile);
  if (options.json) args.push("--json");
  args.push("-");
  return args;
}

export function parseJsonl(source) {
  const events = [];
  const errors = [];
  let finalResponse = "";

  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      events.push(event);
      if (event.type === "item.completed" && event.item?.type === "agent_message") {
        finalResponse = event.item.text ?? "";
      }
    } catch (error) {
      errors.push({ line: index + 1, message: error.message, source: line });
    }
  }

  return { events, errors, finalResponse };
}

export async function findSkills(skillsDirectory) {
  const skills = new Map();

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile() && entry.name === "SKILL.md") {
        const document = parseMarkdownWithFrontmatter(await readFile(entryPath, "utf8"));
        const name = document.attributes.name;
        if (!name) throw new Error(`${entryPath} does not declare a skill name`);
        if (skills.has(name)) throw new Error(`Duplicate skill name: ${name}`);
        skills.set(name, directory);
      }
    }
  }

  await visit(skillsDirectory);
  return skills;
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

function skillBody(source) {
  return source
    .replaceAll("\r\n", "\n")
    .replace(/^---\n[\s\S]*?\n---\n+/, "")
    .trimEnd();
}

// Codex/Antigravity don't understand Claude Code's slash-command dispatch, so a prompt
// written in Claude's standard form (e.g. "/grill-me ...") would otherwise reach them as
// plain, unresolved text. For the "with" arm, inline the required skills' bodies ahead of
// the case's own prompt so those tools get the same instructions Claude resolves natively.
export async function buildEffectivePrompt(evalCase, skills, arm) {
  if (arm !== "with") return evalCase.prompt;

  const names = requiredSkillsForCase(evalCase, skills);
  if (names.length === 0) return evalCase.prompt;

  const sections = [];
  for (const name of names) {
    const source = await readFile(path.join(skills.get(name), "SKILL.md"), "utf8");
    sections.push(`## ${name}\n\n${skillBody(source)}`);
  }

  return [
    "请严格按照以下技能说明行事。",
    "",
    sections.join("\n\n"),
    "",
    "---",
    "",
    "现在请处理下面这个请求：",
    "",
    evalCase.prompt,
  ].join("\n");
}

export async function evaluateGrader(grader, run, options = {}) {
  if (grader.type === "regex") return evaluateRegexGrader(grader, run);
  if (grader.type === "tool_order") return evaluateToolOrderGrader(grader, run);
  if (grader.type === "llm") {
    if (options.evaluateLlm) return options.evaluateLlm(grader, run);
    return { status: "unsupported", reason: "LLM graders are disabled" };
  }
  if (grader.type === "tool_used" && grader.tool === "Skill") {
    return {
      status: "unsupported",
      reason: "Codex JSONL does not expose a first-class skill invocation event",
    };
  }
  return { status: "unsupported", reason: `Unsupported grader type: ${grader.type}` };
}

export function extractCodexToolCalls(events) {
  const toolCalls = [];
  for (const event of events ?? []) {
    if (event.type === "item.completed" && event.item) {
      const item = event.item;
      if (item.type === "file_change") {
        toolCalls.push({
          name: "file_change",
          duration: 0,
          parameters: { changes: item.changes },
        });
      } else if (item.type === "command_execution") {
        toolCalls.push({
          name: "command_execution",
          duration: 0,
          parameters: { command: item.command, exitCode: item.exit_code },
        });
      } else if (item.type === "mcp_call") {
        toolCalls.push({
          name: `mcp:${item.server}/${item.method}`,
          duration: 0,
          parameters: item.params ?? {},
        });
      }
    }
  }
  return toolCalls;
}

export function summarizeGraderResults(graderResults, isTwoArm = false) {
  let resultsToScore = graderResults;

  if (isTwoArm) {
    const nonIndicators = graderResults.filter(
      (g) => !isGraderIndicator(g, true) && g.scored !== false,
    );
    if (nonIndicators.length > 0) {
      resultsToScore = nonIndicators;
    }
  }

  const scored = resultsToScore.filter(
    (grader) => grader.scored !== false && ["passed", "failed"].includes(grader.status),
  );
  const passed = scored.filter((grader) => grader.status === "passed").length;
  return {
    score: scored.length ? passed / scored.length : null,
    perfect:
      scored.length > 0 &&
      graderResults.every((grader) => {
        if (isGraderIndicator(grader, isTwoArm) || grader.scored === false) return true;
        return grader.status === "passed" || grader.status === "unsupported";
      }),
  };
}

export function summarizeResults(results) {
  const cases = {};

  for (const result of results) {
    cases[result.case] ??= { with: [], without: [] };
    cases[result.case][result.arm].push(result);
  }

  for (const [caseName, arms] of Object.entries(cases)) {
    const summarized = {};
    for (const arm of ["with", "without"]) {
      if (arms[arm].length === 0) continue;
      const scores = arms[arm]
        .map((result) => result.score)
        .filter((score) => typeof score === "number");
      const durations = arms[arm]
        .map((result) => result.durationSeconds ?? 0)
        .filter((d) => typeof d === "number");
      summarized[arm] = {
        runs: arms[arm].length,
        meanScore: scores.length
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : null,
        meanDuration: durations.length
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : 0,
        perfectRuns: arms[arm].filter((result) => result.perfect).length,
      };
    }
    summarized.delta =
      summarized.with?.meanScore != null && summarized.without?.meanScore != null
        ? summarized.with.meanScore - summarized.without.meanScore
        : null;

    let failingNote = "PASS";
    for (const run of arms.with ?? []) {
      const failingGrader = (run.graders ?? []).find(
        (g) => g.status === "failed" && g.scored !== false,
      );
      if (failingGrader) {
        failingNote = `${failingGrader.name}: ${failingGrader.reason}`;
        break;
      }
    }
    summarized.notes = failingNote;

    cases[caseName] = summarized;
  }

  return { cases };
}

export function classifyRunInfrastructure(processResult, parsed) {
  if (processResult.timedOut) return { passed: false, reason: "Codex process timed out" };
  if (processResult.code !== 0) {
    return { passed: false, reason: `Codex process exited with code ${processResult.code}` };
  }
  if (parsed.errors.length > 0) {
    return { passed: false, reason: "The JSONL stream contained malformed lines" };
  }
  const failedTurn = parsed.events.find((event) => event.type === "turn.failed");
  if (failedTurn) {
    return { passed: false, reason: failedTurn.error?.message ?? "Codex turn failed" };
  }
  if (!parsed.events.some((event) => event.type === "turn.completed")) {
    return { passed: false, reason: "The JSONL stream had no turn completion event" };
  }
  return { passed: true, reason: "Codex completed the turn" };
}
