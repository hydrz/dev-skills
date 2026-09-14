import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  discoverCases,
  evaluateRegexGrader,
  evaluateToolOrderGrader,
  findSkills,
  parseMarkdownWithFrontmatter,
  summarizeGraderResults,
  summarizeResults,
} from "../codex/lib.mjs";

export {
  discoverCases,
  evaluateRegexGrader,
  evaluateToolOrderGrader,
  findSkills,
  parseMarkdownWithFrontmatter,
  summarizeGraderResults,
  summarizeResults,
};

export function buildAgyArgs(options) {
  const args = [
    "--print",
    options.prompt,
    "--output-format",
    "json",
    "--dangerously-skip-permissions",
    "--model",
    options.model ?? "gemini-3.8-flash-low",
  ];

  if (options.timeoutMs) {
    args.push("--print-timeout", `${Math.ceil(options.timeoutMs / 1000)}s`);
  }

  return args;
}

export function parseAgyOutput(rawStdout) {
  const trimmed = rawStdout.trim();
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    return {
      finalResponse: trimmed,
      status: "ERROR",
      error: `Failed to parse agy output as JSON: ${err.message}`,
      duration: 0,
      usage: null,
    };
  }

  return {
    finalResponse: parsed.response ?? "",
    status: parsed.status ?? "UNKNOWN",
    duration: parsed.duration_seconds ?? 0,
    usage: parsed.usage ?? null,
    numTurns: parsed.num_turns ?? 1,
    conversationId: parsed.conversation_id ?? null,
  };
}

export async function initializeAgyWorkspace(workspace, evalCase, arm, skills) {
  await mkdir(workspace, { recursive: true });

  const targetSkillName = (evalCase.metadata.tags ?? []).find((tag) => skills.has(tag));
  if (!targetSkillName || arm === "without") return null;

  const skillPath = skills.get(targetSkillName);
  const targetDirectory = path.join(workspace, ".agents", "skills", targetSkillName);
  await mkdir(path.dirname(targetDirectory), { recursive: true });
  await cp(skillPath, targetDirectory, { recursive: true });

  // 写入 .agents/skills.json 索引
  const skillsJsonPath = path.join(workspace, ".agents", "skills.json");
  const skillsJson = {
    skills: {
      [targetSkillName]: {
        name: targetSkillName,
        path: `.agents/skills/${targetSkillName}/SKILL.md`,
      },
    },
  };
  await writeFile(skillsJsonPath, JSON.stringify(skillsJson, null, 2), "utf8");

  return targetSkillName;
}
