import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  simulationIssueMetadata,
  simulationIssueTypes,
  type SimulationIssueType,
} from './simulationDiagnostics';

export interface AnalysisCliOptions {
  readonly summaryPath: string;
  readonly rawPath: string;
  readonly outputPath: string;
}

export interface SummaryInputRow {
  readonly scenarioId: string;
  readonly difficulty: string;
  readonly poolScale: number;
  readonly playerCount: number;
  readonly heroSlot: number;
  readonly heroId: string;
  readonly games: number;
  readonly completedGames: number;
  readonly timeoutGames: number;
  readonly winCount: number;
  readonly dragonSlayerCount: number;
  readonly winRate: number;
  readonly timeoutRate: number;
  readonly dragonSlayerRate: number;
  readonly avgTreasurePoints: number;
  readonly minTreasurePoints: number;
  readonly maxTreasurePoints: number;
  readonly avgWeaponCount: number;
  readonly avgSpellCount: number;
  readonly avgKeyCount: number;
  readonly avgHp: number;
  readonly cursedRate: number;
  readonly avgTurnCount: number;
  readonly minTurnCount: number;
  readonly maxTurnCount: number;
  readonly avgActionCount: number;
  readonly avgActionsSinceLastProgress: number;
  readonly avgMaxActionsWithoutProgress: number;
  readonly avgStalledTurns: number;
  readonly avgBacktrackLoops: number;
  readonly avgHealingMisses: number;
  readonly avgAvoidableRiskFights: number;
  readonly avgObjectiveBypass: number;
  readonly avgSeeressChoiceBlind: number;
  readonly avgWitchSwapLowValue: number;
}

export interface RawHeroRow {
  readonly scenarioId: string;
  readonly gameIndex: number;
  readonly seed: string;
  readonly difficulty: string;
  readonly poolScale: number;
  readonly playerCount: number;
  readonly turnCount: number;
  readonly actionCount: number;
  readonly heroSlot: number;
  readonly heroId: string;
  readonly treasurePoints: number;
  readonly weaponCount: number;
  readonly spellCount: number;
  readonly keyCount: number;
  readonly hp: number;
  readonly isCursed: boolean;
  readonly isWinner: boolean;
  readonly defeatedDragon: boolean;
  readonly completed: boolean;
  readonly terminationReason: string;
  readonly lastPhase: string;
  readonly lastActionType: string;
  readonly actionsSinceLastProgress: number;
  readonly maxActionsWithoutProgress: number;
  readonly timedOutWhileActive: boolean;
  readonly issueCounts: Record<SimulationIssueType, number>;
}

export type AnalysisIssueType = SimulationIssueType | 'none';

export interface AnalysisSummaryRow extends SummaryInputRow {
  rankWinRate: number;
  rankDragonSlayerRate: number;
  rankTreasure: number;
  rankSurvival: number;
  rankSpeed: number;
  normalizedTreasure: number;
  normalizedHp: number;
  normalizedSpeed: number;
  balanceScore: number;
  medianTreasurePoints: number;
  medianTurnCount: number;
  zeroPointRate: number;
  lowHpRate: number;
  issueType: AnalysisIssueType;
  problemTitle: string;
  issueCount: number;
  issueRate: number;
  severityScore: number;
  comparisonDelta: number;
  firstSeed: string;
  worstSeed: string;
  suggestedArea: string;
  likelyCodeArea: string;
  expectedBehavior: string;
  observedBehavior: string;
  recommendedTest: string;
  problemKind: 'heuristic' | 'rule' | 'termination' | '';
  lastPhaseBeforeAbort: string;
  lastActionTypeBeforeAbort: string;
  maxObservedActionsWithoutProgress: number;
}

export function parseAnalysisCliArgs(args: readonly string[]): AnalysisCliOptions {
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
    summaryPath: requireCliOption(options, 'summary'),
    rawPath: requireCliOption(options, 'raw'),
    outputPath: requireCliOption(options, 'out'),
  };
}

export function parseSummaryCsv(csvText: string): SummaryInputRow[] {
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
  }));
}

export function parseRawCsv(csvText: string): RawHeroRow[] {
  const rows = parseCsvRows(csvText);
  const header = rows[0] ?? [];
  const requiredColumns = [
    'scenarioId',
    'gameIndex',
    'seed',
    'difficulty',
    'poolScale',
    'playerCount',
    'actionCount',
    'turnCount',
    'completed',
    'terminationReason',
    'defeatedDragonByHeroId',
    'winnerHeroIds',
    'lastPhase',
    'lastActionType',
    'actionsSinceLastProgress',
    'maxActionsWithoutProgress',
    'timeoutActiveHeroId',
  ];

  for (const column of requiredColumns) {
    if (!header.includes(column)) {
      throw new Error(`Raw CSV is missing required column ${column}`);
    }
  }

  const objects = readCsvObjects(rows, header);
  const result: RawHeroRow[] = [];

  for (const record of objects) {
    const winnerHeroIds = splitListField(record.winnerHeroIds);
    const defeatedDragonByHeroId = record.defeatedDragonByHeroId;
    const completed = record.completed === 'true';

    for (let slot = 1; slot <= 5; slot += 1) {
      const heroId = record[`slot${slot}HeroId`];
      if (!heroId) {
        continue;
      }

      result.push({
        scenarioId: record.scenarioId,
        gameIndex: parseNumber(record.gameIndex, 'gameIndex'),
        seed: record.seed,
        difficulty: record.difficulty,
        poolScale: parseNumber(record.poolScale, 'poolScale'),
        playerCount: parseNumber(record.playerCount, 'playerCount'),
        turnCount: parseNumber(record.turnCount, 'turnCount'),
        actionCount: parseNumber(record.actionCount, 'actionCount'),
        heroSlot: slot,
        heroId,
        treasurePoints: parseNumber(
          record[`slot${slot}TreasurePoints`],
          `slot${slot}TreasurePoints`,
        ),
        weaponCount: parseNumber(
          record[`slot${slot}WeaponCount`],
          `slot${slot}WeaponCount`,
        ),
        spellCount: parseNumber(
          record[`slot${slot}SpellCount`],
          `slot${slot}SpellCount`,
        ),
        keyCount: parseNumber(record[`slot${slot}KeyCount`], `slot${slot}KeyCount`),
        hp: parseNumber(record[`slot${slot}Hp`], `slot${slot}Hp`),
        isCursed: record[`slot${slot}IsCursed`] === 'true',
        isWinner: winnerHeroIds.includes(heroId),
        defeatedDragon: defeatedDragonByHeroId === heroId,
        completed,
        terminationReason: record.terminationReason,
        lastPhase: record.lastPhase,
        lastActionType: record.lastActionType,
        actionsSinceLastProgress: parseNumber(
          record.actionsSinceLastProgress,
          'actionsSinceLastProgress',
        ),
        maxActionsWithoutProgress: parseNumber(
          record.maxActionsWithoutProgress,
          'maxActionsWithoutProgress',
        ),
        timedOutWhileActive:
          !completed && record.timeoutActiveHeroId === heroId,
        issueCounts: Object.fromEntries(
          simulationIssueTypes.map((issueType) => [
            issueType,
            parseNumber(
              record[`slot${slot}${capitalize(issueType)}`],
              `slot${slot}${capitalize(issueType)}`,
            ),
          ]),
        ) as Record<SimulationIssueType, number>,
      });
    }
  }

  return result;
}

export function buildAnalysisSummary(
  summaryRows: readonly SummaryInputRow[],
  rawRows: readonly RawHeroRow[],
): AnalysisSummaryRow[] {
  const rawByScenarioHero = new Map<string, RawHeroRow[]>();

  for (const row of rawRows) {
    const key = createScenarioHeroKey(row.scenarioId, row.heroId);
    const currentRows = rawByScenarioHero.get(key) ?? [];
    currentRows.push(row);
    rawByScenarioHero.set(key, currentRows);
  }

  const groupedByScenario = new Map<string, SummaryInputRow[]>();
  for (const row of summaryRows) {
    const currentRows = groupedByScenario.get(row.scenarioId) ?? [];
    currentRows.push(row);
    groupedByScenario.set(row.scenarioId, currentRows);
  }

  const analysisRows: AnalysisSummaryRow[] = [];

  for (const [scenarioId, scenarioRows] of groupedByScenario) {
    const treasureValues = scenarioRows.map((row) => row.avgTreasurePoints);
    const hpValues = scenarioRows.map((row) => row.avgHp);
    const speedValues = scenarioRows.map((row) => row.avgTurnCount);

    const normalizedTreasure = createNormalizer(treasureValues, true);
    const normalizedHp = createNormalizer(hpValues, true);
    const normalizedSpeed = createNormalizer(speedValues, false);

    const heroSummaries = scenarioRows.map((row) => {
      const detailRows =
        rawByScenarioHero.get(createScenarioHeroKey(scenarioId, row.heroId)) ?? [];

      if (detailRows.length !== row.games) {
        throw new Error(
          `Raw and summary row count mismatch for ${scenarioId}/${row.heroId}: expected ${row.games}, received ${detailRows.length}`,
        );
      }

      const treasurePoints = detailRows.map((detail) => detail.treasurePoints);
      const turnCounts = detailRows.map((detail) => detail.turnCount);
      const sortedByTreasure = [...detailRows].sort((left, right) => {
        if (right.treasurePoints !== left.treasurePoints) {
          return right.treasurePoints - left.treasurePoints;
        }

        if (left.turnCount !== right.turnCount) {
          return left.turnCount - right.turnCount;
        }

        return left.seed.localeCompare(right.seed);
      });

      return {
        ...row,
        rankWinRate: 0,
        rankDragonSlayerRate: 0,
        rankTreasure: 0,
        rankSurvival: 0,
        rankSpeed: 0,
        normalizedTreasure: normalizedTreasure(row.avgTreasurePoints),
        normalizedHp: normalizedHp(row.avgHp),
        normalizedSpeed: normalizedSpeed(row.avgTurnCount),
        balanceScore: 0,
        medianTreasurePoints: median(treasurePoints),
        medianTurnCount: median(turnCounts),
        zeroPointRate:
          detailRows.filter((detail) => detail.treasurePoints === 0).length / row.games,
        lowHpRate: detailRows.filter((detail) => detail.hp <= 2).length / row.games,
        bestSeed: sortedByTreasure[0]?.seed ?? '',
        worstSeed: [...sortedByTreasure].reverse()[0]?.seed ?? '',
        detailRows,
      };
    });

    assignRanks(heroSummaries, 'rankWinRate', (row) => row.winRate, true);
    assignRanks(
      heroSummaries,
      'rankDragonSlayerRate',
      (row) => row.dragonSlayerRate,
      true,
    );
    assignRanks(
      heroSummaries,
      'rankTreasure',
      (row) => row.avgTreasurePoints,
      true,
    );
    assignRanks(heroSummaries, 'rankSurvival', (row) => row.avgHp, true);
    assignRanks(heroSummaries, 'rankSpeed', (row) => row.avgTurnCount, false);

    for (const row of heroSummaries) {
      row.balanceScore = roundToFourDecimals(
        0.35 * row.winRate +
          0.2 * (1 - row.timeoutRate) +
          0.2 * row.dragonSlayerRate +
          0.15 * row.normalizedTreasure +
          0.1 * row.normalizedHp,
      );
    }

    const issueRatesByHero = new Map<string, Record<SimulationIssueType, number>>();
    for (const row of heroSummaries) {
      issueRatesByHero.set(
        row.heroId,
        Object.fromEntries(
          simulationIssueTypes.map((issueType) => [
            issueType,
            row.detailRows.filter((detail) => detail.issueCounts[issueType] > 0).length /
              row.games,
          ]),
        ) as Record<SimulationIssueType, number>,
      );
    }

    for (const row of heroSummaries) {
      const issueRows = buildIssueRowsForHero(row, heroSummaries, issueRatesByHero);
      analysisRows.push(...issueRows);
    }
  }

  return analysisRows.sort((left, right) => {
    if (left.scenarioId !== right.scenarioId) {
      return left.scenarioId.localeCompare(right.scenarioId);
    }

    if (left.heroSlot !== right.heroSlot) {
      return left.heroSlot - right.heroSlot;
    }

    return left.issueType.localeCompare(right.issueType);
  });
}

export function serializeAnalysisSummary(
  analysisRows: readonly AnalysisSummaryRow[],
): string {
  const header = [
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

  const rows = analysisRows.map((row) => [
    row.scenarioId,
    row.difficulty,
    formatNumber(row.poolScale),
    String(row.playerCount),
    String(row.heroSlot),
    row.heroId,
    String(row.games),
    String(row.completedGames),
    String(row.timeoutGames),
    String(row.winCount),
    String(row.dragonSlayerCount),
    formatNumber(row.winRate),
    formatNumber(row.timeoutRate),
    formatNumber(row.dragonSlayerRate),
    formatNumber(row.avgTreasurePoints),
    formatNumber(row.minTreasurePoints),
    formatNumber(row.maxTreasurePoints),
    formatNumber(row.avgWeaponCount),
    formatNumber(row.avgSpellCount),
    formatNumber(row.avgKeyCount),
    formatNumber(row.avgHp),
    formatNumber(row.cursedRate),
    formatNumber(row.avgTurnCount),
    formatNumber(row.minTurnCount),
    formatNumber(row.maxTurnCount),
    formatNumber(row.avgActionCount),
    formatNumber(row.avgActionsSinceLastProgress),
    formatNumber(row.avgMaxActionsWithoutProgress),
    formatNumber(row.avgStalledTurns),
    formatNumber(row.avgBacktrackLoops),
    formatNumber(row.avgHealingMisses),
    formatNumber(row.avgAvoidableRiskFights),
    formatNumber(row.avgObjectiveBypass),
    formatNumber(row.avgSeeressChoiceBlind),
    formatNumber(row.avgWitchSwapLowValue),
    String(row.rankWinRate),
    String(row.rankDragonSlayerRate),
    String(row.rankTreasure),
    String(row.rankSurvival),
    String(row.rankSpeed),
    formatNumber(row.normalizedTreasure),
    formatNumber(row.normalizedHp),
    formatNumber(row.normalizedSpeed),
    formatNumber(row.balanceScore),
    formatNumber(row.medianTreasurePoints),
    formatNumber(row.medianTurnCount),
    formatNumber(row.zeroPointRate),
    formatNumber(row.lowHpRate),
    row.issueType,
    row.problemTitle,
    String(row.issueCount),
    formatNumber(row.issueRate),
    formatNumber(row.severityScore),
    formatNumber(row.comparisonDelta),
    row.firstSeed,
    row.worstSeed,
    row.suggestedArea,
    row.likelyCodeArea,
    row.expectedBehavior,
    row.observedBehavior,
    row.recommendedTest,
    row.problemKind,
    row.lastPhaseBeforeAbort,
    row.lastActionTypeBeforeAbort,
    String(row.maxObservedActionsWithoutProgress),
  ]);

  return serializeCsv([header, ...rows]);
}

export async function writeAnalysisSummary(
  outputPath: string,
  csvText: string,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, csvText, 'utf8');
}

function buildIssueRowsForHero(
  row: SummaryWithDetails,
  scenarioRows: readonly SummaryWithDetails[],
  issueRatesByHero: Map<string, Record<SimulationIssueType, number>>,
): AnalysisSummaryRow[] {
  const issueRows: AnalysisSummaryRow[] = [];
  const heroIssueRates = issueRatesByHero.get(row.heroId)!;

  for (const issueType of simulationIssueTypes) {
    const issueCount = row.detailRows.reduce(
      (total, detail) => total + detail.issueCounts[issueType],
      0,
    );
    const affectedGames = row.detailRows.filter(
      (detail) => detail.issueCounts[issueType] > 0,
    );
    if (issueCount === 0) {
      continue;
    }

    const metadata = simulationIssueMetadata[issueType];
    const issueRate = heroIssueRates[issueType];
    const scenarioAverageRate = average(
      scenarioRows.map(
        (scenarioRow) => issueRatesByHero.get(scenarioRow.heroId)![issueType],
      ),
    );
    const comparisonDelta = roundToFourDecimals(issueRate - scenarioAverageRate);
    const worstDetail = [...affectedGames].sort((left, right) => {
      if (right.issueCounts[issueType] !== left.issueCounts[issueType]) {
        return right.issueCounts[issueType] - left.issueCounts[issueType];
      }

      return right.maxActionsWithoutProgress - left.maxActionsWithoutProgress;
    })[0];
    const timeoutDetails = affectedGames.filter((detail) => detail.timedOutWhileActive);

    issueRows.push({
      ...stripDetailRows(row),
      issueType,
      problemTitle: metadata.title,
      issueCount,
      issueRate,
      severityScore: roundToFourDecimals(
        Math.max(0, issueRate * metadata.severityWeight + comparisonDelta),
      ),
      comparisonDelta,
      firstSeed: affectedGames[0]?.seed ?? '',
      worstSeed: worstDetail?.seed ?? '',
      suggestedArea: metadata.suggestedArea,
      likelyCodeArea: metadata.likelyCodeArea,
      expectedBehavior: metadata.expectedBehavior,
      observedBehavior: buildObservedBehavior(issueType, row.heroId, issueRate, worstDetail),
      recommendedTest: metadata.recommendedTest,
      problemKind: issueType === 'nonTerminatingGame' ? 'termination' : 'heuristic',
      lastPhaseBeforeAbort:
        timeoutDetails[0]?.lastPhase ??
        (issueType === 'nonTerminatingGame' ? worstDetail?.lastPhase ?? '' : ''),
      lastActionTypeBeforeAbort:
        timeoutDetails[0]?.lastActionType ??
        (issueType === 'nonTerminatingGame'
          ? worstDetail?.lastActionType ?? ''
          : ''),
      maxObservedActionsWithoutProgress: Math.max(
        ...affectedGames.map((detail) => detail.maxActionsWithoutProgress),
      ),
    });
  }

  if (issueRows.length > 0) {
    return issueRows;
  }

  return [
    {
      ...stripDetailRows(row),
      issueType: 'none',
      problemTitle: 'Keine priorisierten Probleme erkannt',
      issueCount: 0,
      issueRate: 0,
      severityScore: 0,
      comparisonDelta: 0,
      firstSeed: '',
      worstSeed: '',
      suggestedArea: '',
      likelyCodeArea: '',
      expectedBehavior: '',
      observedBehavior:
        'Fuer diese Heldin wurden in den ausgewerteten Seeds keine priorisierten Diagnoseprobleme gefunden.',
      recommendedTest: '',
      problemKind: '',
      lastPhaseBeforeAbort: '',
      lastActionTypeBeforeAbort: '',
      maxObservedActionsWithoutProgress: Math.max(
        ...row.detailRows.map((detail) => detail.maxActionsWithoutProgress),
      ),
    },
  ];
}

function buildObservedBehavior(
  issueType: SimulationIssueType,
  heroId: string,
  issueRate: number,
  worstDetail: RawHeroRow | undefined,
): string {
  const rateText = `${Math.round(issueRate * 100)}%`;

  switch (issueType) {
    case 'stalledTurns':
      return `${heroId} beendet in ${rateText} der beobachteten Partien Zuege trotz verfuegbarer Fortschrittsoptionen.`;
    case 'backtrackLoops':
      return `${heroId} faellt in ${rateText} der beobachteten Partien in Rueckwaertsbewegungen zurueck.`;
    case 'healingMisses':
      return `${heroId} verpasst in ${rateText} der beobachteten Partien naheliegende Heilung.`;
    case 'avoidableRiskFights':
      return `${heroId} startet in ${rateText} der beobachteten Partien optionale Kaempfe unterhalb der Risiko-Schwelle.`;
    case 'objectiveBypass':
      return `${heroId} ignoriert in ${rateText} der beobachteten Partien erreichbare Ziele.`;
    case 'seeressChoiceBlind':
      return `${heroId} waehlt Raum-Token in ${rateText} der beobachteten Partien blind ueber Index 0.`;
    case 'witchSwapLowValue':
      return `${heroId} verwendet in ${rateText} der beobachteten Partien einen Hexen-Tausch ohne messbaren Positionsgewinn.`;
    case 'nonTerminatingGame':
      return `${heroId} terminiert fuer Seed ${worstDetail?.seed ?? ''} nicht; letzter Zustand ${worstDetail?.lastPhase ?? ''} nach ${worstDetail?.actionCount ?? 0} Aktionen.`;
  }
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

function splitListField(value: string): string[] {
  if (value.trim().length === 0) {
    return [];
  }

  return value
    .split('|')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Value ${label} must be numeric, received "${value}"`);
  }

  return parsed;
}

function createScenarioHeroKey(scenarioId: string, heroId: string): string {
  return `${scenarioId}::${heroId}`;
}

function createNormalizer(
  values: readonly number[],
  higherIsBetter: boolean,
): (value: number) => number {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (minValue === maxValue) {
    return () => 0.5;
  }

  return (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue);
    return roundToFourDecimals(higherIsBetter ? normalized : 1 - normalized);
  };
}

function assignRanks<T, K extends keyof T>(
  rows: T[],
  field: K,
  getValue: (row: T) => number,
  higherIsBetter: boolean,
): void {
  const distinctValues = [...new Set(rows.map(getValue))].sort((left, right) =>
    higherIsBetter ? right - left : left - right,
  );

  const rankByValue = new Map<number, number>();
  distinctValues.forEach((value, index) => {
    rankByValue.set(value, index + 1);
  });

  for (const row of rows) {
    row[field] = (rankByValue.get(getValue(row)) ?? rows.length) as T[K];
  }
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return roundToFourDecimals((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return sorted[middle] ?? 0;
}

function serializeCsv(rows: readonly (readonly string[])[]): string {
  return `${rows
    .map((row) =>
      row
        .map((value) => {
          if (/[",\r\n]/.test(value)) {
            return `"${value.replaceAll('"', '""')}"`;
          }

          return value;
        })
        .join(','),
    )
    .join('\n')}\n`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
}

function roundToFourDecimals(value: number): number {
  return Number.parseFloat(value.toFixed(4));
}

function requireCliOption(options: Map<string, string>, key: string): string {
  const value = options.get(key);
  if (!value) {
    throw new Error(`Missing required --${key}=... argument`);
  }

  return value;
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;
}

interface SummaryWithDetails extends SummaryInputRow {
  rankWinRate: number;
  rankDragonSlayerRate: number;
  rankTreasure: number;
  rankSurvival: number;
  rankSpeed: number;
  normalizedTreasure: number;
  normalizedHp: number;
  normalizedSpeed: number;
  balanceScore: number;
  medianTreasurePoints: number;
  medianTurnCount: number;
  zeroPointRate: number;
  lowHpRate: number;
  bestSeed: string;
  worstSeed: string;
  detailRows: RawHeroRow[];
}

function stripDetailRows(row: SummaryWithDetails): Omit<SummaryWithDetails, 'detailRows'> {
  const { detailRows: _detailRows, ...rest } = row;
  return rest;
}
