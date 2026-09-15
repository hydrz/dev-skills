export function escapeHtml(unsafe) {
  if (unsafe == null) return "";
  return String(unsafe)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function isGraderIndicator(grader, isTwoArm = false) {
  if (!isTwoArm) return false;
  if (grader.arm === "with-only") return true;
  if (grader.type === "tool_used" && grader.tool === "Skill" && grader.arm !== "both") return true;
  return false;
}

export function runTokens(run) {
  const usage = run?.usage;
  if (!usage) return null;
  if (usage.total_tokens) return usage.total_tokens;
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  return input + output > 0 ? input + output : null;
}

// 每个 case 两组的平均 token 和差值，用来比较加载插件带来的额外成本
export function caseTokenStats(caseRuns = []) {
  const mean = (arm) => {
    const values = caseRuns
      .filter((run) => run.arm === arm)
      .map(runTokens)
      .filter((value) => value != null);
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  };
  const withTokens = mean("with");
  const withoutTokens = mean("without");
  return {
    with: withTokens,
    without: withoutTokens,
    delta: withTokens != null && withoutTokens != null ? withTokens - withoutTokens : null,
  };
}

export function formatSummaryTable(summary, options = {}) {
  const cases = summary.cases ?? {};
  const entries = Object.entries(cases);
  if (entries.length === 0) return "无评测结果";

  const maxNameLen = Math.max(30, ...entries.map(([name]) => name.length));
  const header = `${"CASE".padEnd(maxNameLen)}  WITH   W/OUT  Δ      RUNS  TIME    NOTES`;
  const divider = "-".repeat(header.length);

  const rows = [divider, header, divider];
  let totalWith = 0;
  let countWith = 0;
  let totalDelta = 0;
  let countDelta = 0;
  let totalDuration = 0;

  for (const [name, data] of entries) {
    const withScore = data.with?.meanScore != null ? data.with.meanScore.toFixed(2) : "N/A ";
    const withoutScore =
      data.without?.meanScore != null ? data.without.meanScore.toFixed(2) : "N/A ";
    let delta = "N/A  ";
    if (data.delta != null) {
      delta = (data.delta >= 0 ? `+${data.delta.toFixed(2)}` : data.delta.toFixed(2)).padEnd(5);
      totalDelta += data.delta;
      countDelta += 1;
    }
    if (data.with?.meanScore != null) {
      totalWith += data.with.meanScore;
      countWith += 1;
    }

    const runs = String(data.with?.runs ?? data.without?.runs ?? 1).padEnd(4);
    const durationSec = (
      (data.with?.meanDuration ?? 0) + (data.without?.meanDuration ?? 0)
    ).toFixed(1);
    totalDuration += Number(durationSec);
    const timeStr = `${durationSec}s`.padEnd(6);
    const isPass =
      data.with?.meanScore != null && data.with.meanScore >= (options.threshold ?? 1.0);
    const notes = data.notes ?? (isPass ? "PASS" : "FAIL");

    const caseCol =
      name.length > maxNameLen ? `${name.slice(0, maxNameLen - 3)}...` : name.padEnd(maxNameLen);
    rows.push(
      `${caseCol}  ${withScore.padEnd(5)}  ${withoutScore.padEnd(5)}  ${delta}  ${runs}  ${timeStr}  ${notes}`,
    );
  }

  rows.push(divider);
  const meanWith = countWith > 0 ? (totalWith / countWith).toFixed(2) : "N/A";
  const meanDelta =
    countDelta > 0 ? `${totalDelta >= 0 ? "+" : ""}${(totalDelta / countDelta).toFixed(2)}` : "N/A";
  rows.push(
    `${entries.length} case(s) · mean WITH: ${meanWith} · mean Δ: ${meanDelta} · total time: ${totalDuration.toFixed(1)}s`,
  );

  return rows.join("\n");
}

export function generateHtmlReport(data) {
  const { summary, runs = [], options = {}, timestamp = new Date().toISOString() } = data;
  const cases = summary.cases ?? {};
  const caseEntries = Object.entries(cases);
  const reportTitle = data.title ?? options.title ?? "Antigravity 插件评测报告";

  let totalWith = 0;
  let countWith = 0;
  let totalDelta = 0;
  let countDelta = 0;
  let totalDuration = 0;
  let totalTokens = 0;
  let passedCount = 0;

  for (const [, c] of caseEntries) {
    if (c.with?.meanScore != null) {
      totalWith += c.with.meanScore;
      countWith += 1;
      if (c.with.meanScore >= (options.threshold ?? 1.0)) {
        passedCount += 1;
      }
    }
    if (c.delta != null) {
      totalDelta += c.delta;
      countDelta += 1;
    }
    totalDuration += (c.with?.meanDuration ?? 0) + (c.without?.meanDuration ?? 0);
  }

  for (const r of runs) {
    if (r.usage?.total_tokens) {
      totalTokens += r.usage.total_tokens;
    }
  }

  const meanWith = countWith > 0 ? (totalWith / countWith).toFixed(2) : "N/A";
  const meanDelta =
    countDelta > 0 ? `${totalDelta >= 0 ? "+" : ""}${(totalDelta / countDelta).toFixed(2)}` : "N/A";
  const passRate =
    caseEntries.length > 0 ? `${Math.round((passedCount / caseEntries.length) * 100)}%` : "N/A";

  const runsByCase = {};
  for (const r of runs) {
    runsByCase[r.case] ??= [];
    runsByCase[r.case].push(r);
  }

  let tableRowsHtml = "";
  for (const [name, c] of caseEntries) {
    const withScore = c.with?.meanScore != null ? c.with.meanScore.toFixed(2) : "N/A";
    const withoutScore = c.without?.meanScore != null ? c.without.meanScore.toFixed(2) : "N/A";
    let deltaHtml = "N/A";
    if (c.delta != null) {
      const deltaClass =
        c.delta > 0 ? "badge-success" : c.delta < 0 ? "badge-danger" : "badge-neutral";
      const deltaSign = c.delta >= 0 ? "+" : "";
      deltaHtml = `<span class="badge ${deltaClass}">${deltaSign}${c.delta.toFixed(2)}</span>`;
    }
    const isPass = c.with?.meanScore != null && c.with.meanScore >= (options.threshold ?? 1.0);
    const statusBadge = isPass
      ? `<span class="badge badge-success">PASS</span>`
      : `<span class="badge badge-danger">FAIL</span>`;
    const runsCount = c.with?.runs ?? c.without?.runs ?? 1;
    const durationSec = ((c.with?.meanDuration ?? 0) + (c.without?.meanDuration ?? 0)).toFixed(1);
    const tokens = caseTokenStats(runsByCase[name]);
    const tokensHtml =
      tokens.with == null && tokens.without == null
        ? "N/A"
        : `${tokens.with ?? "N/A"} / ${tokens.without ?? "N/A"}${
            tokens.delta != null ? ` (${tokens.delta >= 0 ? "+" : ""}${tokens.delta})` : ""
          }`;

    tableRowsHtml += `
      <tr>
        <td><strong><a href="#case-${escapeHtml(name)}">${escapeHtml(name)}</a></strong></td>
        <td><code>${withScore}</code></td>
        <td><code>${withoutScore}</code></td>
        <td>${deltaHtml}</td>
        <td>${runsCount}</td>
        <td>${durationSec}s</td>
        <td><code>${tokensHtml}</code></td>
        <td>${statusBadge}</td>
        <td class="text-muted">${escapeHtml(c.notes ?? (isPass ? "PASS" : "FAIL"))}</td>
      </tr>
    `;
  }

  let caseCardsHtml = "";
  for (const [name, c] of caseEntries) {
    const caseRuns = runsByCase[name] ?? [];
    let runsContentHtml = "";

    for (const run of caseRuns) {
      let toolCallsHtml = "";
      if (run.toolCalls && run.toolCalls.length > 0) {
        let toolRows = "";
        for (const [idx, t] of run.toolCalls.entries()) {
          const paramsStr = JSON.stringify(t.parameters ?? {}, null, 2);
          toolRows += `
            <tr>
              <td>${idx + 1}</td>
              <td><code>${escapeHtml(t.name)}</code></td>
              <td>${(t.duration ?? 0).toFixed(2)}s</td>
              <td><pre class="pre-cell"><code>${escapeHtml(paramsStr)}</code></pre></td>
            </tr>
          `;
        }
        toolCallsHtml = `
          <div class="section-block">
            <h4>工具/事件记录 (${run.toolCalls.length})</h4>
            <table class="sub-table">
              <thead>
                <tr>
                  <th style="width: 40px">#</th>
                  <th style="width: 160px">工具 / 事件</th>
                  <th style="width: 80px">耗时</th>
                  <th>详细参数 / 变更</th>
                </tr>
              </thead>
              <tbody>
                ${toolRows}
              </tbody>
            </table>
          </div>
        `;
      }

      let gradersHtml = "";
      if (run.graders && run.graders.length > 0) {
        let graderRows = "";
        for (const g of run.graders) {
          const statusClass =
            g.status === "passed"
              ? "badge-success"
              : g.status === "failed"
                ? "badge-danger"
                : "badge-neutral";
          const roleBadge =
            g.scored === false
              ? `<span class="badge badge-warning">指示器 (Indicator)</span>`
              : `<span class="badge badge-neutral">计分项</span>`;
          graderRows += `
            <tr>
              <td><strong>${escapeHtml(g.name)}</strong></td>
              <td><code>${escapeHtml(g.type)}</code></td>
              <td><span class="badge ${statusClass}">${escapeHtml(g.status)}</span></td>
              <td>${roleBadge}</td>
              <td>${g.weight ?? 1}</td>
              <td>${escapeHtml(g.reason ?? "")}</td>
            </tr>
          `;
        }
        gradersHtml = `
          <div class="section-block">
            <h4>评估准则 (${run.graders.length})</h4>
            <table class="sub-table">
              <thead>
                <tr>
                  <th>准则名称</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>角色</th>
                  <th>权重</th>
                  <th>判定原因</th>
                </tr>
              </thead>
              <tbody>
                ${graderRows}
              </tbody>
            </table>
          </div>
        `;
      }

      const runStatusClass = run.perfect
        ? "badge-success"
        : run.score === 0
          ? "badge-danger"
          : "badge-warning";
      runsContentHtml += `
        <div class="run-card">
          <div class="run-header">
            <span class="badge badge-neutral">臂 (Arm): ${escapeHtml(run.arm)}</span>
            <span class="badge badge-neutral">轮次 #${run.run}</span>
            <span class="badge ${runStatusClass}">得分: ${run.score != null ? run.score.toFixed(2) : "N/A"}</span>
            <span class="badge badge-neutral">耗时: ${(run.durationSeconds ?? 0).toFixed(2)}s</span>
            ${run.usage?.total_tokens ? `<span class="badge badge-neutral">Tokens: ${run.usage.total_tokens}</span>` : ""}
          </div>

          ${gradersHtml}
          ${toolCallsHtml}

          <details class="accordion">
            <summary>查看用户提示词与模型最终回复</summary>
            <div class="accordion-content">
              <h4>用户提示词</h4>
              <pre class="code-box"><code>${escapeHtml(run.prompt ?? "")}</code></pre>
              <h4>模型最终回复</h4>
              <pre class="code-box"><code>${escapeHtml(run.finalResponse ?? "")}</code></pre>
            </div>
          </details>
        </div>
      `;
    }

    const isPass = c.with?.meanScore != null && c.with.meanScore >= (options.threshold ?? 1.0);
    const badgeHtml = isPass
      ? `<span class="badge badge-success">PASS</span>`
      : `<span class="badge badge-danger">FAIL</span>`;

    caseCardsHtml += `
      <details class="case-card" id="case-${escapeHtml(name)}" open>
        <summary class="case-summary">
          <div class="case-title">
            <span class="case-name">${escapeHtml(name)}</span>
            ${badgeHtml}
          </div>
          <div class="case-metrics">
            <span>WITH: <strong>${c.with?.meanScore != null ? c.with.meanScore.toFixed(2) : "N/A"}</strong></span>
            <span>W/OUT: <strong>${c.without?.meanScore != null ? c.without.meanScore.toFixed(2) : "N/A"}</strong></span>
            <span>Δ: <strong>${c.delta != null ? (c.delta >= 0 ? `+${c.delta.toFixed(2)}` : c.delta.toFixed(2)) : "N/A"}</strong></span>
          </div>
        </summary>
        <div class="case-body">
          ${runsContentHtml}
        </div>
      </details>
    `;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --success: #34d399;
      --success-bg: rgba(52, 211, 153, 0.15);
      --danger: #fb7185;
      --danger-bg: rgba(251, 113, 133, 0.15);
      --warning: #fbbf24;
      --warning-bg: rgba(251, 191, 36, 0.15);
      --code-bg: #0b1120;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 1.5rem;
    }
    h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .meta-line {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .kpi-card {
      background-color: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 0.5rem;
      padding: 1.25rem;
      text-align: center;
    }
    .kpi-value {
      font-size: 1.75rem;
      font-weight: 700;
      margin-top: 0.25rem;
      color: var(--primary);
    }
    .kpi-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .main-table-container {
      background-color: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 0.5rem;
      overflow-x: auto;
      margin-bottom: 2.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }
    th, td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--card-border);
    }
    th {
      background-color: rgba(0, 0, 0, 0.2);
      font-weight: 600;
      color: var(--text-muted);
    }
    tr:hover td {
      background-color: rgba(255, 255, 255, 0.02);
    }
    a {
      color: var(--primary);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-success { background-color: var(--success-bg); color: var(--success); }
    .badge-danger { background-color: var(--danger-bg); color: var(--danger); }
    .badge-warning { background-color: var(--warning-bg); color: var(--warning); }
    .badge-neutral { background-color: rgba(255, 255, 255, 0.08); color: var(--text-muted); }
    .text-muted { color: var(--text-muted); }
    .case-card {
      background-color: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 0.5rem;
      margin-bottom: 1.25rem;
      overflow: hidden;
    }
    .case-summary {
      padding: 1rem 1.25rem;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: rgba(0, 0, 0, 0.15);
      border-bottom: 1px solid transparent;
      user-select: none;
    }
    .case-card[open] .case-summary {
      border-bottom-color: var(--card-border);
    }
    .case-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .case-name {
      font-weight: 600;
      font-size: 1rem;
    }
    .case-metrics {
      display: flex;
      gap: 1.25rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .case-body {
      padding: 1.25rem;
    }
    .run-card {
      background-color: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 0.375rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .run-header {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .section-block {
      margin-top: 1rem;
    }
    h4 {
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }
    .sub-table {
      margin-bottom: 0.5rem;
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 0.25rem;
      font-size: 0.8125rem;
    }
    .sub-table th, .sub-table td {
      padding: 0.5rem 0.75rem;
    }
    .pre-cell {
      max-height: 120px;
      overflow-y: auto;
      font-size: 0.75rem;
      background-color: var(--code-bg);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    .accordion {
      margin-top: 1rem;
      border: 1px solid var(--card-border);
      border-radius: 0.375rem;
    }
    .accordion summary {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-size: 0.8125rem;
      color: var(--primary);
    }
    .accordion-content {
      padding: 0.75rem;
      border-top: 1px solid var(--card-border);
    }
    .code-box {
      background-color: var(--code-bg);
      padding: 0.75rem;
      border-radius: 0.25rem;
      overflow-x: auto;
      font-size: 0.8125rem;
      margin-bottom: 0.75rem;
      max-height: 280px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(reportTitle)}</h1>
      <div class="meta-line">
        <span>执行时间：${escapeHtml(timestamp)}</span>
        <span>被测模型：<code>${escapeHtml(options.model ?? "default")}</code></span>
        <span>裁判模型：<code>${escapeHtml(options.judgeModel ?? options.model ?? "default")}</code></span>
        <span>消融模式：<code>${escapeHtml(options.arm ?? "with")}</code></span>
        <span>通过阈值：<code>${options.threshold ?? 1.0}</code></span>
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">用例通过率</div>
        <div class="kpi-value">${passRate}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">平均 WITH 分数</div>
        <div class="kpi-value">${meanWith}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">平均净增量 (Δ)</div>
        <div class="kpi-value">${meanDelta}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">总执行轮次</div>
        <div class="kpi-value">${runs.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">总评测耗时</div>
        <div class="kpi-value">${totalDuration.toFixed(1)}s</div>
      </div>
      ${
        totalTokens > 0
          ? `
      <div class="kpi-card">
        <div class="kpi-label">Token 消耗</div>
        <div class="kpi-value">${totalTokens.toLocaleString()}</div>
      </div>
      `
          : ""
      }
    </div>

    <div class="main-table-container">
      <table>
        <thead>
          <tr>
            <th>用例名称</th>
            <th>WITH</th>
            <th>W/OUT</th>
            <th>Δ</th>
            <th>RUNS</th>
            <th>TIME</th>
            <th>TOKENS (WITH / W/OUT, Δ)</th>
            <th>STATUS</th>
            <th>NOTES</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>

    <section>
      <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">用例评测详情</h2>
      ${caseCardsHtml}
    </section>
  </div>
</body>
</html>`;
}
