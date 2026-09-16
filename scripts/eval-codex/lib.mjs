import {
  copyRequiredSkills,
  discoverCases,
  evaluateRegexGrader,
  findSkills,
  parseMarkdownWithFrontmatter,
  primarySkillForCase,
  requiredSkillsForCase,
} from "../eval-core.lib.mjs";
import {
  escapeHtml,
  formatSummaryTable,
  generateHtmlReport,
  isGraderIndicator,
} from "../eval-report.lib.mjs";
import { summarizeResults } from "../eval-cli-shared.lib.mjs";

export {
  copyRequiredSkills,
  discoverCases,
  escapeHtml,
  evaluateRegexGrader,
  findSkills,
  formatSummaryTable,
  generateHtmlReport,
  isGraderIndicator,
  parseMarkdownWithFrontmatter,
  primarySkillForCase,
  requiredSkillsForCase,
  summarizeResults,
};

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
