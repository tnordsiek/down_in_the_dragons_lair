import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { AnalysisSummaryRow } from './simulationAnalysis';

export interface ReportCliOptions {
  readonly analysisPath: string;
  readonly outputPath: string;
}

export type AnalysisCsvRow = AnalysisSummaryRow;

export function parseReportCliArgs(args: readonly string[]): ReportCliOptions {
  const options = new Map<string, string>();

  for (const arg of args) {
    if (!arg.startsWith('--')) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const separatorIndex = arg.indexOf('=');
    if (separatorIndex === -1) {
      throw new Error(`Expected --name=value argument, received ${arg}`);
    }

    const key = arg.slice(2, separatorIndex);
    const value = arg.slice(separatorIndex + 1).trim();
    if (value.length === 0) {
      throw new Error(`Argument ${arg} must not be empty`);
    }
    options.set(key, value);
  }

  return {
    analysisPath: requireCliOption(options, 'analysis'),
    outputPath: requireCliOption(options, 'out'),
  };
}

export function parseAnalysisSummaryCsv(csvText: string): AnalysisCsvRow[] {
  const rows = parseCsvRows(csvText);
  const expectedHeader = [
    'scenarioId',
    'difficulty',
    'poolScale',
    'playerCount',
    'heroSlot',
    'heroId',
    'games',
    'completedGames',
    'timeoutGames',
    'winCount',
    'dragonSlayerCount',
    'winRate',
    'timeoutRate',
    'dragonSlayerRate',
    'avgTreasurePoints',
    'minTreasurePoints',
    'maxTreasurePoints',
    'avgWeaponCount',
    'avgSpellCount',
    'avgKeyCount',
    'avgHp',
    'cursedRate',
    'avgTurnCount',
    'minTurnCount',
    'maxTurnCount',
    'avgActionCount',
    'avgActionsSinceLastProgress',
    'avgMaxActionsWithoutProgress',
    'avgStalledTurns',
    'avgBacktrackLoops',
    'avgHealingMisses',
    'avgAvoidableRiskFights',
    'avgObjectiveBypass',
    'avgSeeressChoiceBlind',
    'avgWitchSwapLowValue',
    'rankWinRate',
    'rankDragonSlayerRate',
    'rankTreasure',
    'rankSurvival',
    'rankSpeed',
    'normalizedTreasure',
    'normalizedHp',
    'normalizedSpeed',
    'balanceScore',
    'medianTreasurePoints',
    'medianTurnCount',
    'zeroPointRate',
    'lowHpRate',
    'issueType',
    'problemTitle',
    'issueCount',
    'issueRate',
    'severityScore',
    'comparisonDelta',
    'firstSeed',
    'worstSeed',
    'suggestedArea',
    'likelyCodeArea',
    'expectedBehavior',
    'observedBehavior',
    'recommendedTest',
    'problemKind',
    'lastPhaseBeforeAbort',
    'lastActionTypeBeforeAbort',
    'maxObservedActionsWithoutProgress',
  ];
  const records = readCsvObjects(rows, expectedHeader);

  return records.map((record) => ({
    scenarioId: record.scenarioId,
    difficulty: record.difficulty,
    poolScale: parseNumber(record.poolScale, 'poolScale'),
    playerCount: parseNumber(record.playerCount, 'playerCount'),
    heroSlot: parseNumber(record.heroSlot, 'heroSlot'),
    heroId: record.heroId,
    games: parseNumber(record.games, 'games'),
    completedGames: parseNumber(record.completedGames, 'completedGames'),
    timeoutGames: parseNumber(record.timeoutGames, 'timeoutGames'),
    winCount: parseNumber(record.winCount, 'winCount'),
    dragonSlayerCount: parseNumber(record.dragonSlayerCount, 'dragonSlayerCount'),
    winRate: parseNumber(record.winRate, 'winRate'),
    timeoutRate: parseNumber(record.timeoutRate, 'timeoutRate'),
    dragonSlayerRate: parseNumber(record.dragonSlayerRate, 'dragonSlayerRate'),
    avgTreasurePoints: parseNumber(record.avgTreasurePoints, 'avgTreasurePoints'),
    minTreasurePoints: parseNumber(record.minTreasurePoints, 'minTreasurePoints'),
    maxTreasurePoints: parseNumber(record.maxTreasurePoints, 'maxTreasurePoints'),
    avgWeaponCount: parseNumber(record.avgWeaponCount, 'avgWeaponCount'),
    avgSpellCount: parseNumber(record.avgSpellCount, 'avgSpellCount'),
    avgKeyCount: parseNumber(record.avgKeyCount, 'avgKeyCount'),
    avgHp: parseNumber(record.avgHp, 'avgHp'),
    cursedRate: parseNumber(record.cursedRate, 'cursedRate'),
    avgTurnCount: parseNumber(record.avgTurnCount, 'avgTurnCount'),
    minTurnCount: parseNumber(record.minTurnCount, 'minTurnCount'),
    maxTurnCount: parseNumber(record.maxTurnCount, 'maxTurnCount'),
    avgActionCount: parseNumber(record.avgActionCount, 'avgActionCount'),
    avgActionsSinceLastProgress: parseNumber(
      record.avgActionsSinceLastProgress,
      'avgActionsSinceLastProgress',
    ),
    avgMaxActionsWithoutProgress: parseNumber(
      record.avgMaxActionsWithoutProgress,
      'avgMaxActionsWithoutProgress',
    ),
    avgStalledTurns: parseNumber(record.avgStalledTurns, 'avgStalledTurns'),
    avgBacktrackLoops: parseNumber(record.avgBacktrackLoops, 'avgBacktrackLoops'),
    avgHealingMisses: parseNumber(record.avgHealingMisses, 'avgHealingMisses'),
    avgAvoidableRiskFights: parseNumber(
      record.avgAvoidableRiskFights,
      'avgAvoidableRiskFights',
    ),
    avgObjectiveBypass: parseNumber(record.avgObjectiveBypass, 'avgObjectiveBypass'),
    avgSeeressChoiceBlind: parseNumber(
      record.avgSeeressChoiceBlind,
      'avgSeeressChoiceBlind',
    ),
    avgWitchSwapLowValue: parseNumber(
      record.avgWitchSwapLowValue,
      'avgWitchSwapLowValue',
    ),
    rankWinRate: parseNumber(record.rankWinRate, 'rankWinRate'),
    rankDragonSlayerRate: parseNumber(
      record.rankDragonSlayerRate,
      'rankDragonSlayerRate',
    ),
    rankTreasure: parseNumber(record.rankTreasure, 'rankTreasure'),
    rankSurvival: parseNumber(record.rankSurvival, 'rankSurvival'),
    rankSpeed: parseNumber(record.rankSpeed, 'rankSpeed'),
    normalizedTreasure: parseNumber(record.normalizedTreasure, 'normalizedTreasure'),
    normalizedHp: parseNumber(record.normalizedHp, 'normalizedHp'),
    normalizedSpeed: parseNumber(record.normalizedSpeed, 'normalizedSpeed'),
    balanceScore: parseNumber(record.balanceScore, 'balanceScore'),
    medianTreasurePoints: parseNumber(
      record.medianTreasurePoints,
      'medianTreasurePoints',
    ),
    medianTurnCount: parseNumber(record.medianTurnCount, 'medianTurnCount'),
    zeroPointRate: parseNumber(record.zeroPointRate, 'zeroPointRate'),
    lowHpRate: parseNumber(record.lowHpRate, 'lowHpRate'),
    issueType: record.issueType as AnalysisSummaryRow['issueType'],
    problemTitle: record.problemTitle,
    issueCount: parseNumber(record.issueCount, 'issueCount'),
    issueRate: parseNumber(record.issueRate, 'issueRate'),
    severityScore: parseNumber(record.severityScore, 'severityScore'),
    comparisonDelta: parseNumber(record.comparisonDelta, 'comparisonDelta'),
    firstSeed: record.firstSeed,
    worstSeed: record.worstSeed,
    suggestedArea: record.suggestedArea,
    likelyCodeArea: record.likelyCodeArea,
    expectedBehavior: record.expectedBehavior,
    observedBehavior: record.observedBehavior,
    recommendedTest: record.recommendedTest,
    problemKind: record.problemKind as AnalysisSummaryRow['problemKind'],
    lastPhaseBeforeAbort: record.lastPhaseBeforeAbort,
    lastActionTypeBeforeAbort: record.lastActionTypeBeforeAbort,
    maxObservedActionsWithoutProgress: parseNumber(
      record.maxObservedActionsWithoutProgress,
      'maxObservedActionsWithoutProgress',
    ),
  }));
}

export function renderSimulationReport(rows: readonly AnalysisCsvRow[]): string {
  const grouped = groupByScenario(rows);
  const sections = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([scenarioId, scenarioRows]) => renderScenarioSection(scenarioId, scenarioRows))
    .join('\n');

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Simulation Diagnostics Report</title>
    <style>
      :root {
        --bg: #efe9dd;
        --panel: rgba(255, 251, 244, 0.9);
        --ink: #251b14;
        --muted: #6f6255;
        --line: #d8c8b6;
        --accent: #91471f;
        --warning: #b34e22;
        --good: #2d8659;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 28px;
        font-family: "Segoe UI", system-ui, sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(145, 71, 31, 0.18), transparent 26%),
          linear-gradient(180deg, #f7f1e8 0%, var(--bg) 100%);
      }
      main { max-width: 1320px; margin: 0 auto; }
      h1, h2, h3 { margin: 0; }
      h1 { font-size: 2.3rem; margin-bottom: 8px; }
      .intro { color: var(--muted); margin-bottom: 28px; }
      .scenario {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 24px;
        box-shadow: 0 18px 48px rgba(38, 25, 14, 0.08);
      }
      .scenario-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }
      .scenario-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip {
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 0.86rem;
        color: var(--muted);
        background: rgba(255, 255, 255, 0.7);
      }
      .panel-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 18px;
      }
      .panel {
        border: 1px solid var(--line);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.72);
        padding: 16px;
      }
      .panel h3 {
        font-size: 1rem;
        margin-bottom: 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.92rem;
      }
      th, td {
        padding: 10px 10px;
        border-bottom: 1px solid rgba(216, 200, 182, 0.7);
        text-align: left;
        vertical-align: top;
      }
      th {
        color: var(--muted);
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      tr:last-child td { border-bottom: 0; }
      .problem-card {
        border: 1px solid rgba(179, 78, 34, 0.24);
        border-radius: 16px;
        padding: 14px;
        background: rgba(255, 248, 244, 0.82);
        margin-bottom: 12px;
      }
      .problem-card:last-child { margin-bottom: 0; }
      .problem-head {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .problem-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .problem-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 16px;
      }
      .label {
        color: var(--muted);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 4px;
      }
      .value { line-height: 1.45; }
      .seed {
        font-family: Consolas, monospace;
        font-size: 0.86rem;
      }
      .severity {
        font-weight: 700;
        color: var(--warning);
      }
      .ok-note {
        color: var(--good);
        font-weight: 600;
      }
      @media (max-width: 980px) {
        body { padding: 16px; }
        .panel-grid { grid-template-columns: 1fr; }
        .problem-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Simulation Diagnostics Report</h1>
      <p class="intro">Probleme werden mit Seed, Evidenz, vermutetem Codebereich und Testhinweis so dargestellt, dass sie direkt reproduzierbar und fixbar sind.</p>
      ${sections}
    </main>
  </body>
</html>
`;
}

export async function writeSimulationReport(
  outputPath: string,
  html: string,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf8');
}

function renderScenarioSection(
  scenarioId: string,
  rows: readonly AnalysisCsvRow[],
): string {
  const heroRows = uniqueHeroRows(rows);
  const problemRows = rows
    .filter((row) => row.issueType !== 'none')
    .sort((left, right) => right.severityScore - left.severityScore);
  const metaRow = heroRows[0];

  return `<section class="scenario">
    <div class="scenario-header">
      <div>
        <h2>${escapeHtml(scenarioId)}</h2>
      </div>
      <div class="scenario-meta">
        <span class="chip">Difficulty: ${escapeHtml(metaRow.difficulty)}</span>
        <span class="chip">PoolScale: ${formatNumber(metaRow.poolScale)}</span>
        <span class="chip">Players: ${metaRow.playerCount}</span>
        <span class="chip">Games: ${metaRow.games}</span>
      </div>
    </div>
    <div class="panel-grid">
      <div class="panel">
        <h3>Heldinnen-Scorecard</h3>
        ${renderScorecard(heroRows)}
      </div>
      <div class="panel">
        <h3>Kurzfazit</h3>
        ${renderSummary(heroRows, problemRows)}
      </div>
      <div class="panel" style="grid-column: 1 / -1;">
        <h3>Problems To Fix</h3>
        ${renderProblems(problemRows)}
      </div>
    </div>
  </section>`;
}

function renderScorecard(rows: readonly AnalysisCsvRow[]): string {
  const sorted = [...rows].sort((left, right) => {
    if (right.balanceScore !== left.balanceScore) {
      return right.balanceScore - left.balanceScore;
    }

    return left.heroSlot - right.heroSlot;
  });

  return `<table>
    <thead>
      <tr>
        <th>Hero</th>
        <th>Balance</th>
        <th>Win</th>
        <th>Dragon</th>
        <th>Timeout</th>
        <th>Treasure</th>
        <th>Low HP</th>
      </tr>
    </thead>
    <tbody>
      ${sorted
        .map(
          (row) => `<tr>
            <td>${escapeHtml(row.heroId)}</td>
            <td>${formatNumber(row.balanceScore)}</td>
            <td>${formatPercent(row.winRate)}</td>
            <td>${formatPercent(row.dragonSlayerRate)}</td>
            <td>${formatPercent(row.timeoutRate)}</td>
            <td>${formatNumber(row.avgTreasurePoints)}</td>
            <td>${formatPercent(row.lowHpRate)}</td>
          </tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function renderSummary(
  heroRows: readonly AnalysisCsvRow[],
  problemRows: readonly AnalysisCsvRow[],
): string {
  const strongest = [...heroRows].sort(
    (left, right) => right.balanceScore - left.balanceScore,
  )[0];
  const highestTimeout = [...heroRows].sort(
    (left, right) => right.timeoutRate - left.timeoutRate,
  )[0];
  const topProblem = problemRows[0];

  return `<table>
    <tbody>
      <tr>
        <td><strong>Staerkste Heldin</strong></td>
        <td>${escapeHtml(strongest.heroId)} (${formatNumber(strongest.balanceScore)})</td>
      </tr>
      <tr>
        <td><strong>Hoechste Timeout-Rate</strong></td>
        <td>${escapeHtml(highestTimeout.heroId)} (${formatPercent(highestTimeout.timeoutRate)})</td>
      </tr>
      <tr>
        <td><strong>Top-Prioritaet</strong></td>
        <td>${
          topProblem
            ? `${escapeHtml(topProblem.problemTitle)} bei ${escapeHtml(topProblem.heroId)}`
            : '<span class="ok-note">Keine priorisierten Probleme erkannt</span>'
        }</td>
      </tr>
    </tbody>
  </table>`;
}

function renderProblems(rows: readonly AnalysisCsvRow[]): string {
  if (rows.length === 0) {
    return '<p class="ok-note">Keine priorisierten Problems-To-Fix-Eintraege in diesem Szenario.</p>';
  }

  return rows
    .map(
      (row) => `<article class="problem-card">
        <div class="problem-head">
          <div>
            <strong>${escapeHtml(row.problemTitle)}</strong>
            <div class="value">${escapeHtml(row.heroId)} · ${escapeHtml(row.issueType)}</div>
          </div>
          <div class="problem-meta">
            <span class="chip severity">Severity ${formatNumber(row.severityScore)}</span>
            <span class="chip">Issue Rate ${formatPercent(row.issueRate)}</span>
            <span class="chip">Delta ${formatSignedPercent(row.comparisonDelta)}</span>
          </div>
        </div>
        <div class="problem-grid">
          <div>
            <div class="label">Observed Behavior</div>
            <div class="value">${escapeHtml(row.observedBehavior)}</div>
          </div>
          <div>
            <div class="label">Expected Behavior</div>
            <div class="value">${escapeHtml(row.expectedBehavior)}</div>
          </div>
          <div>
            <div class="label">Repro Seed</div>
            <div class="value seed">${escapeHtml(row.worstSeed || row.firstSeed)}</div>
          </div>
          <div>
            <div class="label">Likely Code Area</div>
            <div class="value">${escapeHtml(row.likelyCodeArea)}</div>
          </div>
          <div>
            <div class="label">Evidence</div>
            <div class="value">Issue Count ${row.issueCount} · Max Actions Without Progress ${row.maxObservedActionsWithoutProgress}</div>
          </div>
          <div>
            <div class="label">Suggested Test</div>
            <div class="value">${escapeHtml(row.recommendedTest)}</div>
          </div>
          ${
            row.problemKind === 'termination'
              ? `<div>
                  <div class="label">Last Phase Before Abort</div>
                  <div class="value">${escapeHtml(row.lastPhaseBeforeAbort)}</div>
                </div>
                <div>
                  <div class="label">Last Action Before Abort</div>
                  <div class="value">${escapeHtml(row.lastActionTypeBeforeAbort)}</div>
                </div>`
              : ''
          }
        </div>
      </article>`,
    )
    .join('');
}

function uniqueHeroRows(rows: readonly AnalysisCsvRow[]): AnalysisCsvRow[] {
  const byHero = new Map<string, AnalysisCsvRow>();

  for (const row of rows) {
    if (!byHero.has(row.heroId)) {
      byHero.set(row.heroId, row);
    }
  }

  return [...byHero.values()].sort((left, right) => left.heroSlot - right.heroSlot);
}

function groupByScenario(rows: readonly AnalysisCsvRow[]): Map<string, AnalysisCsvRow[]> {
  const grouped = new Map<string, AnalysisCsvRow[]>();

  for (const row of rows) {
    const currentRows = grouped.get(row.scenarioId) ?? [];
    currentRows.push(row);
    grouped.set(row.scenarioId, currentRows);
  }

  return grouped;
}

function parseCsvRows(csvText: string): string[][] {
  const lines = csvText
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  return lines.map(parseCsvLine);
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted CSV value');
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function readCsvObjects(
  rows: readonly string[][],
  expectedHeader: readonly string[],
): Array<Record<string, string>> {
  const header = rows[0] ?? [];
  if (
    header.length !== expectedHeader.length ||
    header.some((column, index) => column !== expectedHeader[index])
  ) {
    throw new Error(`Unexpected CSV header. Expected ${expectedHeader.join(',')}`);
  }

  return rows.slice(1).map((row) => {
    if (row.length !== header.length) {
      throw new Error(
        `CSV row has ${row.length} columns but header has ${header.length}`,
      );
    }

    return Object.fromEntries(header.map((column, index) => [column, row[index]]));
  });
}

function parseNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Value ${label} must be numeric, received "${value}"`);
  }

  return parsed;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatSignedPercent(value: number): string {
  const percentage = Math.round(value * 100);
  return `${percentage >= 0 ? '+' : ''}${percentage}%`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function requireCliOption(options: Map<string, string>, key: string): string {
  const value = options.get(key);
  if (!value) {
    throw new Error(`Missing required --${key}=... argument`);
  }

  return value;
}
