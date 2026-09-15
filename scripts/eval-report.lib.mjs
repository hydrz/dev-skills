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
  let perfectRunsCount = 0;

  const threshold = options.threshold ?? 1.0;
  const hasWithout = caseEntries.some(([, c]) => c.without?.meanScore != null);

  for (const [, c] of caseEntries) {
    if (c.with?.meanScore != null) {
      totalWith += c.with.meanScore;
      countWith += 1;
      if (c.with.meanScore >= threshold) {
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
    if (r.perfect) perfectRunsCount += 1;
    const tokens = runTokens(r);
    if (tokens != null) totalTokens += tokens;
  }

  const meanWith = countWith > 0 ? totalWith / countWith : 0;
  const suiteScorePct = Math.round(meanWith * 100);
  const perfectRunsRate = runs.length > 0 ? Math.round((perfectRunsCount / runs.length) * 100) : 0;
  const meanDelta = countDelta > 0 ? totalDelta / countDelta : null;

  const runsByCase = {};
  for (const r of runs) {
    runsByCase[r.case] ??= [];
    runsByCase[r.case].push(r);
  }

  const formattedDate = new Date(timestamp).toISOString().replace("T", " ").slice(0, 16) + " UTC";

  let casesHtml = "";
  for (const [name, c] of caseEntries) {
    const caseRuns = runsByCase[name] ?? [];
    const withRuns = caseRuns.filter((r) => r.arm === "with");
    const withoutRuns = caseRuns.filter((r) => r.arm === "without");

    const withScore =
      c.with?.meanScore ??
      (withRuns.length
        ? withRuns.reduce((sum, r) => sum + (r.score ?? 0), 0) / withRuns.length
        : 0);
    const withoutScore =
      c.without?.meanScore ??
      (withoutRuns.length
        ? withoutRuns.reduce((sum, r) => sum + (r.score ?? 0), 0) / withoutRuns.length
        : null);

    const withScorePct = (withScore * 100).toFixed(1);
    const isPass = withScore >= threshold;
    const caseRegressed = !isPass;
    const delta = c.delta;
    const thresholdPct = (threshold * 100).toFixed(1);

    const deltaSign = delta != null && delta >= 0 ? "+" : "";
    const deltaClass =
      delta != null ? (delta > 0 ? "delta-pos" : delta < 0 ? "delta-neg" : "delta-zero") : "";

    const renderRun = (run) => {
      const runScorePct = ((run.score ?? 0) * 100).toFixed(1);
      const runTokensCount = runTokens(run);
      const tokensInfo = runTokensCount ? ` · ${runTokensCount.toLocaleString()} tokens` : "";

      let gradersHtml = "";
      if (run.graders && run.graders.length > 0) {
        for (const g of run.graders) {
          const isPassed = g.status === "passed";
          const chipClass = isPassed ? "chip-pass" : "chip-fail";
          const statusText = isPassed ? "✓ 通过" : "✗ 未通过";
          const isIndicator = g.scored === false;
          const details = g.details ? JSON.stringify(g.details, null, 2) : "";

          gradersHtml += `
            <details class="grader"${!isPassed ? " open" : ""}>
              <summary>
                <span class="chip ${chipClass}">${statusText}</span>
                <span class="grader-name">${escapeHtml(g.name)}</span>
                ${isIndicator ? '<span class="badge chip-warn">指示器</span>' : ""}
                ${g.type ? `<span class="badge">${escapeHtml(g.type)}</span>` : ""}
                ${g.weight != null && g.weight !== 1 ? `<span class="muted">×${g.weight}</span>` : ""}
              </summary>
              <div class="grader-body">
                ${g.reason ? `<p class="explanation">${escapeHtml(g.reason)}</p>` : ""}
                ${details ? `<div class="kv"><span>判分详情</span></div><pre class="evidence">${escapeHtml(details)}</pre>` : ""}
              </div>
            </details>
          `;
        }
      }

      let toolCallsHtml = "";
      if (run.toolCalls && run.toolCalls.length > 0) {
        let toolRows = "";
        for (const [idx, t] of run.toolCalls.entries()) {
          const paramsStr = JSON.stringify(t.parameters ?? {}, null, 2);
          toolRows += `
            <tr>
              <td>${idx + 1}</td>
              <td><code>${escapeHtml(t.name)}</code></td>
              <td class="num">${(t.duration ?? 0).toFixed(2)}s</td>
              <td><pre class="evidence"><code>${escapeHtml(paramsStr)}</code></pre></td>
            </tr>
          `;
        }
        toolCallsHtml = `
          <details class="grader" style="margin-top:6px">
            <summary><span class="badge">工具调用记录</span> <span class="muted">${run.toolCalls.length} 项</span></summary>
            <div class="grader-body">
              <div class="table-wrap">
                <table class="sub-table">
                  <thead>
                    <tr>
                      <th style="width:36px">#</th>
                      <th style="width:140px">工具 / 事件</th>
                      <th style="width:70px">耗时</th>
                      <th>详细参数 / 内容</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${toolRows}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        `;
      }

      let responseHtml = "";
      if (run.finalResponse) {
        responseHtml = `
          <details class="grader" style="margin-top:6px">
            <summary><span class="badge">模型最终回复</span> <span class="muted">展开查看全文</span></summary>
            <div class="grader-body">
              <pre class="evidence">${escapeHtml(run.finalResponse)}</pre>
            </div>
          </details>
        `;
      }

      return `
        <div class="run">
          <div class="run-head">
            <span class="run-title">轮次 ${run.run}</span>
            <span class="meter m-accent" aria-hidden="true"><span style="width:${runScorePct}%"></span></span>
            <span class="num">${Math.round(run.score * 100)}%</span>
            <span class="muted num">${(run.durationSeconds ?? 0).toFixed(1)}s${tokensInfo}</span>
          </div>
          <div class="graders">
            ${gradersHtml}
          </div>
          ${toolCallsHtml}
          ${responseHtml}
        </div>
      `;
    };

    let armsContentHtml = "";
    if (hasWithout) {
      const withPerfect = withRuns.filter((r) => r.perfect).length;
      const withoutScorePct = withoutScore != null ? (withoutScore * 100).toFixed(1) : "0.0";
      const withoutPerfect = withoutRuns.filter((r) => r.perfect).length;

      armsContentHtml = `
        <section class="arm">
          <div class="arm-head">
            <span class="arm-label">启用技能组 (WITH)</span>
            <span class="meter m-accent" aria-hidden="true"><span style="width:${withScorePct}%"></span></span>
            <span class="num">${Math.round(withScore * 100)}%</span>
            <span class="muted num">${withPerfect} / ${withRuns.length} 轮完美</span>
          </div>
          ${withRuns.map(renderRun).join("")}
        </section>
        <section class="arm">
          <div class="arm-head">
            <span class="arm-label">对照组 (WITHOUT)</span>
            <span class="meter m-base" aria-hidden="true"><span style="width:${withoutScorePct}%"></span></span>
            <span class="num">${withoutScore != null ? Math.round(withoutScore * 100) : 0}%</span>
            <span class="muted num">${withoutPerfect} / ${withoutRuns.length} 轮完美</span>
          </div>
          ${withoutRuns.map(renderRun).join("")}
        </section>
      `;
    } else {
      const withPerfect = withRuns.filter((r) => r.perfect).length;
      armsContentHtml = `
        <section class="arm">
          <div class="arm-head">
            <span class="arm-label">评测轮次</span>
            <span class="meter m-accent" aria-hidden="true"><span style="width:${withScorePct}%"></span></span>
            <span class="num">${Math.round(withScore * 100)}%</span>
            <span class="muted num">${withPerfect} / ${withRuns.length} 轮完美</span>
          </div>
          ${withRuns.map(renderRun).join("")}
        </section>
      `;
    }

    const firstRun = caseRuns[0];
    const promptText = firstRun?.prompt ?? "";

    // 汇总此 case 中出现的准则定义
    const graderMap = new Map();
    for (const r of caseRuns) {
      for (const g of r.graders ?? []) {
        if (!graderMap.has(g.name)) {
          graderMap.set(g.name, g);
        }
      }
    }
    let graderDefsHtml = "";
    for (const g of graderMap.values()) {
      graderDefsHtml += `
        <div class="grader-def">
          <div class="grader-def-head">
            <span class="grader-name">${escapeHtml(g.name)}</span>
            <span class="badge">${escapeHtml(g.type ?? "grader")}</span>
            ${g.weight != null ? `<span class="muted">权重 ×${g.weight}</span>` : ""}
          </div>
        </div>
      `;
    }

    casesHtml += `
      <article class="case ${caseRegressed ? "case-regressed" : ""}" id="case-${escapeHtml(name)}">
        <div class="case-head">
          <h2>${escapeHtml(name)}</h2>
          <span class="muted mono">evals/${escapeHtml(name)}</span>
          <span class="spacer"></span>
          <span class="meter m-accent" aria-hidden="true">
            <span style="width:${withScorePct}%"></span>
            <i class="tick" style="left:${thresholdPct}%"></i>
          </span>
          <span class="num case-score">${Math.round(withScore * 100)}%</span>
          ${delta != null ? `<span class="delta ${deltaClass}">${deltaSign}${Math.round(delta * 100)}%</span>` : ""}
        </div>

        <details class="section" open>
          <summary>评测结果</summary>
          ${armsContentHtml}
        </details>

        ${
          promptText
            ? `
        <details class="section">
          <summary>用户提示词</summary>
          <div class="md">
            <pre><code>${escapeHtml(promptText)}</code></pre>
          </div>
        </details>
        `
            : ""
        }

        ${
          graderDefsHtml
            ? `
        <details class="section">
          <summary>评分准则说明</summary>
          ${graderDefsHtml}
        </details>
        `
            : ""
        }
      </article>
    `;
  }

  const meanDeltaPct = meanDelta != null ? Math.round(meanDelta * 100) : null;
  const meanDeltaSign = meanDeltaPct != null && meanDeltaPct >= 0 ? "+" : "";
  const meanDeltaClass =
    meanDeltaPct != null
      ? meanDeltaPct > 0
        ? "delta-pos"
        : meanDeltaPct < 0
          ? "delta-neg"
          : ""
      : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(reportTitle)}</title>
<style>
:root{--plane:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink-2:#52514e;--ink-3:#6b6a64;--hairline:rgba(11,11,11,.10);--grid:#e1e0d9;--inset:rgba(11,11,11,.04);--accent:#2a78d6;--base-fill:#6b6a64;--delta-good:#006300;--good:#067d06;--warning:#8a6100;--critical:#d03b3b;
  color-scheme:light dark;
}
@media (prefers-color-scheme:dark){:root{--plane:#0d0d0d;--surface:#1a1a19;--ink:#ffffff;--ink-2:#c3c2b7;--ink-3:#898781;--hairline:rgba(255,255,255,.10);--grid:#2c2c2a;--inset:rgba(255,255,255,.05);--accent:#3987e5;--base-fill:#898781;--delta-good:#0ca30c;--good:#0ca30c;--warning:#fab219;--critical:#e06c6c;color-scheme:dark}}
:root[data-theme="dark"]{--plane:#0d0d0d;--surface:#1a1a19;--ink:#ffffff;--ink-2:#c3c2b7;--ink-3:#898781;--hairline:rgba(255,255,255,.10);--grid:#2c2c2a;--inset:rgba(255,255,255,.05);--accent:#3987e5;--base-fill:#898781;--delta-good:#0ca30c;--good:#0ca30c;--warning:#fab219;--critical:#e06c6c;color-scheme:dark}
:root[data-theme="light"]{--plane:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink-2:#52514e;--ink-3:#6b6a64;--hairline:rgba(11,11,11,.10);--grid:#e1e0d9;--inset:rgba(11,11,11,.04);--accent:#2a78d6;--base-fill:#6b6a64;--delta-good:#006300;--good:#067d06;--warning:#8a6100;--critical:#d03b3b;color-scheme:light}
*{box-sizing:border-box}
body{margin:0;background:var(--plane);color:var(--ink);
  font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;
  -webkit-text-size-adjust:100%}
.wrap{max-width:880px;margin:0 auto;padding:40px 24px 64px;display:flex;flex-direction:column;gap:20px}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
header h1{margin:2px 0 0;font-size:24px;font-weight:600;line-height:1.25;text-wrap:balance}
.meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;color:var(--ink-2);font-size:13px}
.meta .num{font-variant-numeric:tabular-nums lining-nums}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.tile{background:var(--surface);border:1px solid var(--hairline);border-radius:10px;padding:14px 16px;
  display:flex;flex-direction:column;gap:4px}
.tile .label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.tile .value{font-size:26px;font-weight:600;font-variant-numeric:tabular-nums lining-nums;line-height:1.1}
.tile.hero .value{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:48px}
.tile .sub{font-size:12px;color:var(--ink-2);font-variant-numeric:tabular-nums}
.tile .value.delta-pos{color:var(--delta-good)}
.tile .value.delta-neg{color:var(--critical)}
.toolbar{display:flex;gap:8px;justify-content:flex-end}
.toolbar button{font:12px system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink-2);
  background:var(--surface);border:1px solid var(--hairline);border-radius:6px;padding:4px 10px;cursor:pointer}
.toolbar button:hover{color:var(--ink)}
.toolbar button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.case{background:var(--surface);border:1px solid var(--hairline);border-radius:10px;padding:18px 20px;
  display:flex;flex-direction:column;gap:10px}
.case-regressed{border-left:3px solid var(--critical)}
.legend summary{cursor:pointer;font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--ink-2)}
.legend-list{margin:8px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:5px;font-size:13px;color:var(--ink-2)}
.case-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.case-head h2{margin:0;font-size:16px;font-weight:600}
.case-head .spacer{flex:1}
.case-score{font-size:15px;font-weight:600}
.mono{font:12px "SF Mono",ui-monospace,Menlo,Consolas,monospace}
.num{font-variant-numeric:tabular-nums lining-nums}
.muted{color:var(--ink-3);font-size:12px}
.meter{display:inline-block;position:relative;width:120px;height:6px;border-radius:4px;background:var(--grid);
  vertical-align:middle}
.meter>span{display:block;height:100%;border-radius:4px;max-width:100%}
.meter .tick{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--ink-3);border-radius:1px}
.m-accent>span{background:var(--accent)}
.m-base>span{background:var(--base-fill)}
.delta{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}
.delta-pos{color:var(--delta-good)}
.delta-neg{color:var(--critical)}
.delta-zero{color:var(--ink-3)}
details.section{border-top:1px solid var(--grid);padding-top:10px}
details.section>summary{cursor:pointer;font-size:12px;font-weight:600;letter-spacing:.04em;
  color:var(--ink-2);list-style-position:outside;margin-left:2px}
details.section>summary:hover{color:var(--ink)}
details.section[open]>summary{margin-bottom:8px}
.md{display:flex;flex-direction:column;gap:8px;background:var(--inset);border-radius:8px;
  padding:12px 14px;overflow-wrap:break-word}
.md>:first-child{margin-top:0}
.md pre{background:var(--inset);border:1px solid var(--hairline);padding:10px 12px;border-radius:6px;
  overflow-x:auto;font:12px/1.5 "SF Mono",ui-monospace,Menlo,Consolas,monospace}
.md pre code{background:none;padding:0;font:inherit}
.grader-def{display:flex;flex-direction:column;gap:6px;padding:8px 0}
.grader-def+.grader-def{border-top:1px solid var(--grid)}
.grader-def-head{display:flex;align-items:baseline;gap:8px}
.grader-name{font:13px "SF Mono",ui-monospace,Menlo,Consolas,monospace;font-weight:600}
.badge{font-size:10px;font-weight:600;letter-spacing:.04em;color:var(--ink-2);
  border:1px solid var(--hairline);border-radius:999px;padding:1px 8px}
.arm{display:flex;flex-direction:column;gap:8px;padding:6px 0}
.arm+.arm{border-top:1px dashed var(--grid);margin-top:4px;padding-top:12px}
.arm-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.arm-label{font-size:13px;font-weight:600}
.run{border:1px solid var(--grid);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.run-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.run-title{font-size:12px;font-weight:600;color:var(--ink-2)}
.graders{display:flex;flex-direction:column;gap:4px}
details.grader{border-radius:6px}
details.grader>summary{cursor:pointer;display:flex;align-items:baseline;gap:8px;padding:3px 4px;
  border-radius:6px;list-style:none}
details.grader>summary::-webkit-details-marker{display:none}
details.grader>summary::before{content:'▸';font-size:10px;color:var(--ink-3);flex:none;
  transition:transform .12s ease}
details.grader[open]>summary::before{transform:rotate(90deg)}
details.grader>summary:hover{background:var(--inset)}
details.grader>summary:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.grader-body{padding:6px 8px 8px 24px;display:flex;flex-direction:column;gap:6px}
.chip{font-size:11px;font-weight:600;border-radius:999px;padding:1px 8px;white-space:nowrap}
.chip-pass{color:var(--good);border:1px solid currentColor}
.chip-fail{color:var(--critical);border:1px solid currentColor}
.chip.chip-warn{color:var(--warning);border:1px solid currentColor}
.explanation{margin:0;font-size:13px;color:var(--ink-2);white-space:pre-wrap;overflow-wrap:break-word}
.kv{display:flex;gap:8px;font-size:12px;color:var(--ink-3)}
pre.evidence{margin:0;background:var(--inset);border:1px solid var(--hairline);border-radius:6px;
  padding:8px 10px;overflow-x:auto;max-height:320px;
  font:12px/1.5 "SF Mono",ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:break-word}
.table-wrap{overflow-x:auto}
.sub-table{width:100%;border-collapse:collapse;font-size:12px}
.sub-table th,.sub-table td{padding:5px 8px;text-align:left;border-bottom:1px solid var(--grid)}
.sub-table th{color:var(--ink-2);font-weight:600}
footer{color:var(--ink-3);font-size:12px;text-align:center;padding-top:8px}
@media (prefers-reduced-motion:no-preference){
  details.grader>summary,.toolbar button{transition:background .12s ease,color .12s ease}
}
@media (prefers-reduced-motion:reduce){
  details.grader>summary::before{transition:none}
}
@media print{
  :root,:root[data-theme="dark"],:root[data-theme="light"]{--plane:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink-2:#52514e;--ink-3:#6b6a64;--hairline:rgba(11,11,11,.10);--grid:#e1e0d9;--inset:rgba(11,11,11,.04);--accent:#2a78d6;--base-fill:#6b6a64;--delta-good:#006300;--good:#067d06;--warning:#8a6100;--critical:#d03b3b;color-scheme:light}
  body{background:#fff}
  .toolbar{display:none}
  .case,.run,.grader-def{break-inside:avoid}
  pre.evidence{max-height:none}
}
</style>
</head>
<body>
<div class="wrap">
<header>
  <div class="eyebrow">插件评测报告</div>
  <h1>${escapeHtml(reportTitle)}</h1>

  <div class="meta">
    <span>${formattedDate}</span>
    <span class="num">${totalDuration.toFixed(1)}s</span>
    <span class="num">${runs.length} 轮次</span>
    ${totalTokens > 0 ? `<span class="num">${totalTokens.toLocaleString()} tokens</span>` : ""}
    <span>模型: <code>${escapeHtml(options.model ?? "default")}</code></span>
    <span>裁判: <code>${escapeHtml(options.judgeModel ?? options.model ?? "default")}</code></span>
    <span class="num">阈值: ${(threshold * 100).toFixed(0)}%</span>
    <span>消融: <code>${escapeHtml(options.ablation ?? (hasWithout ? "with-without" : "none"))}</code></span>
    ${options.casePattern ? `<span>过滤: <code>${escapeHtml(options.casePattern)}</code></span>` : ""}
  </div>
</header>

<section class="tiles">
  <div class="tile hero"><span class="label">套件总分</span><span class="value">${suiteScorePct}%</span><span class="sub">用例得分均值</span></div>
  <div class="tile"><span class="label">用例通过数</span><span class="value num">${passedCount}</span><span class="sub">${passedCount} / ${caseEntries.length} ≥ ${(threshold * 100).toFixed(0)}% 阈值</span></div>
  <div class="tile"><span class="label">完美轮次率</span><span class="value num">${perfectRunsRate}%</span><span class="sub">所有准则全通的轮次比例</span></div>
  ${
    hasWithout
      ? `<div class="tile"><span class="label">平均净增量 (Δ)</span><span class="value num ${meanDeltaClass}">${meanDeltaPct != null ? `${meanDeltaSign}${meanDeltaPct}%` : "N/A"}</span><span class="sub">WITH 减去 WITHOUT 对照组</span></div>`
      : ""
  }
</section>

<details class="section legend">
  <summary>如何阅读此报告</summary>
  <ul class="legend-list">
    <li>单次运行得分是其各评分项通过的加权比例；“完美”轮次表示通过全部评分项。</li>
    <li>用例得分为其各轮次得分的均值；当用例得分达到或超过 ${(threshold * 100).toFixed(0)}% 阈值（各用例得分条上的刻度线）时判定为通过。</li>
    <li>套件总分为所有用例得分的均值。</li>
    <li>裁判投票由大语言模型独立抽样判定，多数票决定是否通过。</li>
    ${
      hasWithout
        ? `<li><strong>消融对比已开启</strong>（WITH vs WITHOUT）：展示技能带来的实际净增量，验证能力是否由插件本身提供而非模型基座自带。</li>`
        : `<li><strong>未运行基准对照</strong>（单臂评测）：仅展示绝对得分，未测量插件净增益。可使用 <code>--ablation with-without</code> 测试插件净效果。</li>`
    }
  </ul>
</details>

<div class="toolbar"><button type="button" data-act="expand">展开全部</button><button type="button" data-act="collapse">折叠全部</button></div>

${casesHtml}

<footer>由 ${escapeHtml(reportTitle)} 生成 · 评测报告架构 v1 · 得分不可跨套件横向对比</footer>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  var bar = document.querySelector('.toolbar');
  if (!bar) return;
  bar.addEventListener('click', function(e) {
    var b = e.target && e.target.closest('button');
    if (!b) return;
    var open = b.dataset.act === 'expand';
    document.querySelectorAll('details.section, details.grader').forEach(function(d) {
      d.open = open;
    });
  });
});
window.addEventListener('beforeprint', function() {
  document.querySelectorAll('details').forEach(function(d) {
    if (!d.open) { d.dataset.printOpened = '1'; d.open = true; }
  });
});
window.addEventListener('afterprint', function() {
  document.querySelectorAll('details[data-print-opened]').forEach(function(d) {
    d.open = false; delete d.dataset.printOpened;
  });
});
</script>
</body>
</html>`;
}
