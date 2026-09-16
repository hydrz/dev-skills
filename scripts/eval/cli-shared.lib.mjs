// 引擎无关的 CLI 机制：参数解析骨架、--quick 展开、并发池、退出码判定、
// aggregate-result.json 组装。codex.run.mjs 和 antigravity.run.mjs
// 共用这里的逻辑，各自只保留"怎么调用自己的 CLI、怎么解析自己的输出格式"。

// 按 { flag: { key, type, default? } } 形式的选项表解析 argv。
// type 为 "boolean" 时不消费下一个 token，其余类型会取下一个 token 作为取值。
export function parseOptionsFromSpec(argv, spec) {
  const options = {};
  for (const definition of Object.values(spec)) {
    if ("default" in definition) options[definition.key] = definition.default;
  }

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const definition = spec[flag];
    if (!definition) {
      throw new Error(
        `Unknown option: ${flag}. In Windows PowerShell, npm drops a bare --; use: npm run <script> '--' ${flag}`,
      );
    }

    if (definition.type === "boolean") {
      options[definition.key] = true;
      continue;
    }

    index += 1;
    if (index >= argv.length) throw new Error(`${flag} requires a value`);
    const raw = argv[index];
    options[definition.key] = definition.type === "number" ? Number(raw) : raw;
  }

  return options;
}

// --quick 是 --runs 1 --ablation none 的简写，落地在解析之后、校验之前。
export function applyQuickShortcut(options) {
  if (options.quick) {
    options.runs = 1;
    options.ablation = "none";
  }
  return options;
}

export function validateCommonOptions(options) {
  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new Error("--runs must be a positive integer");
  }
  if (!["none", "with-without"].includes(options.ablation)) {
    throw new Error("--ablation must be none or with-without");
  }
  if (Number.isNaN(options.threshold) || options.threshold < 0 || options.threshold > 1) {
    throw new Error("--threshold must be a number between 0 and 1");
  }
  if (
    !Number.isInteger(options.concurrency) ||
    options.concurrency < 1 ||
    options.concurrency > 8
  ) {
    throw new Error("--concurrency must be an integer between 1 and 8");
  }
  return options;
}

export function commonAggregateOptions(options) {
  return {
    casePattern: options.casePattern,
    tag: options.tag ?? null,
    runs: options.runs,
    ablation: options.ablation,
    concurrency: options.concurrency,
    model: options.model ?? null,
    judgeModel: options.judgeModel ?? options.model ?? null,
    threshold: options.threshold,
    skipLlmGraders: options.skipLlmGraders,
  };
}

// 固定并发度的任务池：结果按 items 的原始下标写回，保证产物里 case 顺序不受调度影响；
// 终端进度行谁先完成谁先打印，允许交错。
export async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function lane() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const laneCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: laneCount }, lane));
  return results;
}

// 监听 SIGINT/SIGTERM，记录第一次收到的信号；调用方在任务循环的每个边界检查
// controller.signal，收到信号后停止调度新任务，让已经在跑的 run 跑完再收尾。
export function createInterruptController() {
  const controller = { signal: null };
  const record = (signal) => {
    if (!controller.signal) controller.signal = signal;
  };
  process.on("SIGINT", () => record("SIGINT"));
  process.on("SIGTERM", () => record("SIGTERM"));
  return controller;
}

// 退出码语义对齐官方：0 全部达标；1 有 case 未达阈值/用例加载失败；
// 2 + partial 用于"suite 中途崩溃/鉴权失败没跑完"（这里没有官方的成本上限概念）；
// 130/143 分别对应 SIGINT/SIGTERM 中断。
export function exitCodeFor({ interruptSignal = null, crashed = false, belowThreshold = false }) {
  if (interruptSignal === "SIGINT") return 130;
  if (interruptSignal === "SIGTERM") return 143;
  if (crashed) return 2;
  if (belowThreshold) return 1;
  return 0;
}

function toRunEntry(result) {
  return {
    run: result.run,
    error: result.error ?? null,
    score: result.score ?? null,
    perfect: result.perfect ?? false,
    durationSeconds: result.durationSeconds ?? null,
    graders: result.graders ?? [],
  };
}

// 组装仓库自定义的 aggregate-result.json 顶层结构：两个 runner 的产物字段一致，
// 但不追求逐字段照抄官方 schema（官方的 costUsd/mocks 等概念在这里不适用）。
export function buildAggregateResult({
  engine,
  engineVersion,
  generatedAt,
  options,
  results,
  ablation,
  partial = false,
  partialReason = null,
}) {
  const isTwoArm = ablation === "with-without";
  const byCase = new Map();
  for (const result of results) {
    if (!byCase.has(result.case)) byCase.set(result.case, { with: [], without: [] });
    byCase.get(result.case)[result.arm].push(result);
  }

  const cases = [];
  for (const [name, arms] of byCase) {
    const withScores = arms.with.map((r) => r.score).filter((s) => typeof s === "number");
    const withoutScores = arms.without.map((r) => r.score).filter((s) => typeof s === "number");
    const meanWith = withScores.length
      ? withScores.reduce((sum, s) => sum + s, 0) / withScores.length
      : null;
    const meanWithout = withoutScores.length
      ? withoutScores.reduce((sum, s) => sum + s, 0) / withoutScores.length
      : null;

    cases.push({
      name,
      aggregates: {
        score: meanWith,
        delta: isTwoArm && meanWith != null && meanWithout != null ? meanWith - meanWithout : null,
      },
      arms: {
        with: arms.with.map(toRunEntry),
        without: isTwoArm ? arms.without.map(toRunEntry) : [],
      },
    });
  }

  const scoredCases = cases.filter((c) => typeof c.aggregates.score === "number");
  const overallScore = scoredCases.length
    ? scoredCases.reduce((sum, c) => sum + c.aggregates.score, 0) / scoredCases.length
    : null;
  const casesPassed = scoredCases.filter(
    (c) => c.aggregates.score >= (options.threshold ?? 1.0),
  ).length;
  const deltas = cases.map((c) => c.aggregates.delta).filter((d) => typeof d === "number");
  const meanDelta = deltas.length ? deltas.reduce((sum, d) => sum + d, 0) / deltas.length : null;

  return {
    schemaVersion: 1,
    engine,
    engineVersion,
    generatedAt,
    options,
    partial,
    partialReason,
    aggregates: {
      overallScore,
      casesPassed,
      casesTotal: cases.length,
      meanDelta,
    },
    cases,
  };
}

// 两个 runner 共用的按 case/arm 汇总，供汇总表和 HTML 报告使用（不是 aggregate-result.json 的 schema）。
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

// 两个 runner 共用的 --dry-run 输出形状。
export function buildDryRunReport(
  cases,
  skills,
  { primarySkillForCase, requiredSkillsForCase, graderCompatibility },
) {
  const report = {
    cases: cases.map((evalCase) => ({
      name: evalCase.name,
      skill: primarySkillForCase(evalCase, skills),
      skills: requiredSkillsForCase(evalCase, skills),
      graders: evalCase.graders.map((grader) => ({
        name: grader.name,
        type: grader.type,
        compatibility: graderCompatibility(grader),
      })),
    })),
    summary: { cases: cases.length, graders: {} },
  };

  for (const grader of report.cases.flatMap((entry) => entry.graders)) {
    report.summary.graders[grader.compatibility] =
      (report.summary.graders[grader.compatibility] ?? 0) + 1;
  }
  return report;
}
