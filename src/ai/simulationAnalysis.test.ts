import { describe, expect, it } from 'vitest';

import type {
  RawSimulationResult,
  SummarySimulationResult,
} from './batchSimulation';
import {
  serializeRawSimulationResults,
  serializeSummarySimulationResults,
} from './batchSimulation';
import { createEmptySimulationDiagnostics } from './simulationDiagnostics';
import {
  buildAnalysisSummary,
  parseAnalysisCliArgs,
  parseRawCsv,
  parseSummaryCsv,
  serializeAnalysisSummary,
} from './simulationAnalysis';

const rawCsv = serializeRawSimulationResults(createRawResults());
const summaryCsv = serializeSummarySimulationResults(createSummaryResults());

describe('simulation analysis', () => {
  it('builds issue-oriented rows while preserving hero ranking context', () => {
    const rows = buildAnalysisSummary(parseSummaryCsv(summaryCsv), parseRawCsv(rawCsv));

    expect(rows.some((row) => row.issueType === 'nonTerminatingGame')).toBe(true);
    expect(rows.some((row) => row.issueType === 'seeressChoiceBlind')).toBe(true);
    expect(rows.some((row) => row.issueType === 'missedChestWithKey')).toBe(true);
    expect(rows.some((row) => row.issueType === 'none')).toBe(true);

    const timeoutRow = rows.find(
      (row) =>
        row.scenarioId === 'duel_mage_rogue' &&
        row.heroId === 'hero_mage' &&
        row.issueType === 'nonTerminatingGame',
    );
    expect(timeoutRow).toEqual(
      expect.objectContaining({
        problemKind: 'termination',
        lastPhaseBeforeAbort: 'await_move',
        lastActionTypeBeforeAbort: 'movePlayer',
        firstSeed: 's2#1',
      }),
    );
  });

  it('serializes analysis rows with problem metadata and reproducible seeds', () => {
    const rows = buildAnalysisSummary(parseSummaryCsv(summaryCsv), parseRawCsv(rawCsv));
    const analysisCsv = serializeAnalysisSummary(rows);

    expect(analysisCsv).toContain('issueType,problemTitle,issueCount,issueRate');
    expect(analysisCsv).toContain('avgMissedHealingPriority');
    expect(analysisCsv).toContain('avgLegacyObjectiveBypass');
    expect(analysisCsv).toContain('likelyCodeArea');
    expect(analysisCsv).toContain('strategicPriority');
    expect(analysisCsv).toContain('expectedObjectiveType');
    expect(analysisCsv).toContain('lastPhaseBeforeAbort');
    expect(analysisCsv).toContain('seeressChoiceBlind');
    expect(analysisCsv).toContain('missedChestWithKey');
    expect(analysisCsv).toContain('nonTerminatingGame');
    expect(analysisCsv).toContain('s2#1');
  });

  it('parses required cli arguments for analysis output', () => {
    expect(
      parseAnalysisCliArgs([
        '--summary=scripts/example-output-summary.csv',
        '--raw=scripts/example-output-raw.csv',
        '--out=scripts/example-analysis-summary.csv',
      ]),
    ).toEqual({
      summaryPath: 'scripts/example-output-summary.csv',
      rawPath: 'scripts/example-output-raw.csv',
      outputPath: 'scripts/example-analysis-summary.csv',
    });
  });
});

function createRawResults(): RawSimulationResult[] {
  const mageNormalOne = createEmptySimulationDiagnostics();
  mageNormalOne.missedHealingPriority = 1;
  const mageNormalTwo = createEmptySimulationDiagnostics();
  mageNormalTwo.missedHealingPriority = 1;
  mageNormalTwo.stalledTurns = 1;
  const bladeNormalOne = createEmptySimulationDiagnostics();
  const bladeNormalTwo = createEmptySimulationDiagnostics();

  const mageEasyTimeout = createEmptySimulationDiagnostics();
  mageEasyTimeout.nonTerminatingGame = 1;
  mageEasyTimeout.backtrackLoops = 2;
  const mageEasyClean = createEmptySimulationDiagnostics();
  const rogueEasy = createEmptySimulationDiagnostics();
  rogueEasy.missedChestWithKey = 1;

  const seeressIssue = createEmptySimulationDiagnostics();
  seeressIssue.seeressChoiceBlind = 1;
  const seeressClean = createEmptySimulationDiagnostics();
  const bladeIssue = createEmptySimulationDiagnostics();
  const bladeClean = createEmptySimulationDiagnostics();

  return [
    {
      scenarioId: 'duel_mage_blade',
      gameIndex: 1,
      seed: 's1#1',
      difficulty: 'normal',
      poolScale: 0.5,
      playerCount: 2,
      actionCount: 320,
      turnCount: 52,
      completed: true,
      terminationReason: 'completed',
      defeatedDragonByHeroId: 'hero_blade',
      winnerHeroIds: ['hero_blade'],
      lastPhase: 'game_over',
      lastActionType: 'resolveCombat',
      actionsSinceLastProgress: 0,
      maxActionsWithoutProgress: 3,
      timeoutActiveHeroId: '',
      players: [
        createPlayerResult('hero_mage', 2, 2, 0, 0, 3, false, mageNormalOne),
        createPlayerResult('hero_blade', 4.5, 2, 3, 0, 3, false, bladeNormalOne),
      ],
    },
    {
      scenarioId: 'duel_mage_blade',
      gameIndex: 2,
      seed: 's1#2',
      difficulty: 'normal',
      poolScale: 0.5,
      playerCount: 2,
      actionCount: 190,
      turnCount: 31,
      completed: true,
      terminationReason: 'completed',
      defeatedDragonByHeroId: 'hero_mage',
      winnerHeroIds: ['hero_blade'],
      lastPhase: 'game_over',
      lastActionType: 'resolveCombat',
      actionsSinceLastProgress: 0,
      maxActionsWithoutProgress: 2,
      timeoutActiveHeroId: '',
      players: [
        createPlayerResult('hero_mage', 2.5, 2, 3, 1, 4, false, mageNormalTwo),
        createPlayerResult('hero_blade', 3, 2, 1, 0, 5, true, bladeNormalTwo),
      ],
    },
    {
      scenarioId: 'duel_mage_rogue',
      gameIndex: 1,
      seed: 's2#1',
      difficulty: 'easy',
      poolScale: 0.5,
      playerCount: 2,
      actionCount: 20000,
      turnCount: 3998,
      completed: false,
      terminationReason: 'action_limit',
      defeatedDragonByHeroId: '',
      winnerHeroIds: [],
      lastPhase: 'await_move',
      lastActionType: 'movePlayer',
      actionsSinceLastProgress: 1,
      maxActionsWithoutProgress: 5,
      timeoutActiveHeroId: 'hero_mage',
      players: [
        createPlayerResult('hero_mage', 0, 0, 0, 0, 5, false, mageEasyTimeout),
        createPlayerResult('hero_rogue', 0, 1, 0, 0, 4, false, rogueEasy),
      ],
    },
    {
      scenarioId: 'duel_mage_rogue',
      gameIndex: 2,
      seed: 's2#2',
      difficulty: 'easy',
      poolScale: 0.5,
      playerCount: 2,
      actionCount: 240,
      turnCount: 41,
      completed: true,
      terminationReason: 'completed',
      defeatedDragonByHeroId: 'hero_mage',
      winnerHeroIds: ['hero_mage'],
      lastPhase: 'game_over',
      lastActionType: 'resolveCombat',
      actionsSinceLastProgress: 0,
      maxActionsWithoutProgress: 1,
      timeoutActiveHeroId: '',
      players: [
        createPlayerResult('hero_mage', 2.5, 2, 1, 0, 1, true, mageEasyClean),
        createPlayerResult('hero_rogue', 0, 2, 3, 1, 4, false, createEmptySimulationDiagnostics()),
      ],
    },
    {
      scenarioId: 'duel_seeress_blade',
      gameIndex: 1,
      seed: 's3#1',
      difficulty: 'normal',
      poolScale: 0.5,
      playerCount: 2,
      actionCount: 250,
      turnCount: 59,
      completed: true,
      terminationReason: 'completed',
      defeatedDragonByHeroId: 'hero_seeress',
      winnerHeroIds: ['hero_seeress'],
      lastPhase: 'game_over',
      lastActionType: 'resolveCombatWithFlameSpells',
      actionsSinceLastProgress: 0,
      maxActionsWithoutProgress: 4,
      timeoutActiveHeroId: '',
      players: [
        createPlayerResult('hero_seeress', 2.5, 2, 0, 0, 4, false, seeressIssue),
        createPlayerResult('hero_blade', 0, 0, 0, 0, 5, false, bladeIssue),
      ],
    },
    {
      scenarioId: 'duel_seeress_blade',
      gameIndex: 2,
      seed: 's3#2',
      difficulty: 'normal',
      poolScale: 0.5,
      playerCount: 2,
      actionCount: 230,
      turnCount: 54,
      completed: true,
      terminationReason: 'completed',
      defeatedDragonByHeroId: 'hero_seeress',
      winnerHeroIds: ['hero_seeress'],
      lastPhase: 'game_over',
      lastActionType: 'resolveCombat',
      actionsSinceLastProgress: 0,
      maxActionsWithoutProgress: 3,
      timeoutActiveHeroId: '',
      players: [
        createPlayerResult('hero_seeress', 3, 2, 1, 0, 4, false, seeressClean),
        createPlayerResult('hero_blade', 1, 1, 0, 0, 4, false, bladeClean),
      ],
    },
  ];
}

function createSummaryResults(): SummarySimulationResult[] {
  return [
    {
      scenarioId: 'duel_mage_blade',
      difficulty: 'normal',
      poolScale: 0.5,
      playerCount: 2,
      heroSlot: 1,
      heroId: 'hero_mage',
      games: 2,
      completedGames: 2,
      timeoutGames: 0,
      winCount: 0,
      dragonSlayerCount: 1,
      avgTreasurePoints: 2.25,
      minTreasurePoints: 2,
      maxTreasurePoints: 2.5,
      avgWeaponCount: 2,
      avgSpellCount: 1.5,
      avgKeyCount: 0.5,
      avgHp: 3.5,
      cursedRate: 0,
      avgTurnCount: 41.5,
      minTurnCount: 31,
      maxTurnCount: 52,
      avgActionCount: 255,
      avgActionsSinceLastProgress: 0,
      avgMaxActionsWithoutProgress: 2.5,
      avgStalledTurns: 0.5,
      avgBacktrackLoops: 0,
      avgHealingMisses: 1,
      avgAvoidableRiskFights: 0,
      avgObjectiveBypass: 0,
      avgSeeressChoiceBlind: 0,
      avgWitchSwapLowValue: 0,
    },
    {
      scenarioId: 'duel_mage_blade',
      difficulty: 'normal',
      poolScale: 0.5,
      playerCount: 2,
      heroSlot: 2,
      heroId: 'hero_blade',
      games: 2,
      completedGames: 2,
      timeoutGames: 0,
      winCount: 2,
      dragonSlayerCount: 1,
      avgTreasurePoints: 3.75,
      minTreasurePoints: 3,
      maxTreasurePoints: 4.5,
      avgWeaponCount: 2,
      avgSpellCount: 2,
      avgKeyCount: 0,
      avgHp: 4,
      cursedRate: 0.5,
      avgTurnCount: 41.5,
      minTurnCount: 31,
      maxTurnCount: 52,
      avgActionCount: 255,
      avgActionsSinceLastProgress: 0,
      avgMaxActionsWithoutProgress: 2.5,
      avgStalledTurns: 0,
      avgBacktrackLoops: 0,
      avgHealingMisses: 0,
      avgAvoidableRiskFights: 0,
      avgObjectiveBypass: 0,
      avgSeeressChoiceBlind: 0,
      avgWitchSwapLowValue: 0,
    },
    {
      scenarioId: 'duel_mage_rogue',
      difficulty: 'easy',
      poolScale: 0.5,
      playerCount: 2,
      heroSlot: 1,
      heroId: 'hero_mage',
      games: 2,
      completedGames: 1,
      timeoutGames: 1,
      winCount: 1,
      dragonSlayerCount: 1,
      avgTreasurePoints: 1.25,
      minTreasurePoints: 0,
      maxTreasurePoints: 2.5,
      avgWeaponCount: 1,
      avgSpellCount: 0.5,
      avgKeyCount: 0,
      avgHp: 3,
      cursedRate: 0.5,
      avgTurnCount: 2019.5,
      minTurnCount: 41,
      maxTurnCount: 3998,
      avgActionCount: 10120,
      avgActionsSinceLastProgress: 0.5,
      avgMaxActionsWithoutProgress: 3,
      avgStalledTurns: 0,
      avgBacktrackLoops: 1,
      avgHealingMisses: 0,
      avgAvoidableRiskFights: 0,
      avgObjectiveBypass: 0,
      avgSeeressChoiceBlind: 0,
      avgWitchSwapLowValue: 0,
    },
    {
      scenarioId: 'duel_mage_rogue',
      difficulty: 'easy',
      poolScale: 0.5,
      playerCount: 2,
      heroSlot: 2,
      heroId: 'hero_rogue',
      games: 2,
      completedGames: 1,
      timeoutGames: 1,
      winCount: 0,
      dragonSlayerCount: 0,
      avgTreasurePoints: 0,
      minTreasurePoints: 0,
      maxTreasurePoints: 0,
      avgWeaponCount: 1.5,
      avgSpellCount: 1.5,
      avgKeyCount: 0.5,
      avgHp: 4,
      cursedRate: 0,
      avgTurnCount: 2019.5,
      minTurnCount: 41,
      maxTurnCount: 3998,
      avgActionCount: 10120,
      avgActionsSinceLastProgress: 0.5,
      avgMaxActionsWithoutProgress: 3,
      avgStalledTurns: 0,
      avgBacktrackLoops: 0,
      avgHealingMisses: 0,
      avgAvoidableRiskFights: 0,
      avgObjectiveBypass: 0.5,
      avgSeeressChoiceBlind: 0,
      avgWitchSwapLowValue: 0,
    },
    {
      scenarioId: 'duel_seeress_blade',
      difficulty: 'normal',
      poolScale: 0.5,
      playerCount: 2,
      heroSlot: 1,
      heroId: 'hero_seeress',
      games: 2,
      completedGames: 2,
      timeoutGames: 0,
      winCount: 2,
      dragonSlayerCount: 2,
      avgTreasurePoints: 2.75,
      minTreasurePoints: 2.5,
      maxTreasurePoints: 3,
      avgWeaponCount: 2,
      avgSpellCount: 0.5,
      avgKeyCount: 0,
      avgHp: 4,
      cursedRate: 0,
      avgTurnCount: 56.5,
      minTurnCount: 54,
      maxTurnCount: 59,
      avgActionCount: 240,
      avgActionsSinceLastProgress: 0,
      avgMaxActionsWithoutProgress: 3.5,
      avgStalledTurns: 0,
      avgBacktrackLoops: 0,
      avgHealingMisses: 0,
      avgAvoidableRiskFights: 0,
      avgObjectiveBypass: 0,
      avgSeeressChoiceBlind: 0.5,
      avgWitchSwapLowValue: 0,
    },
    {
      scenarioId: 'duel_seeress_blade',
      difficulty: 'normal',
      poolScale: 0.5,
      playerCount: 2,
      heroSlot: 2,
      heroId: 'hero_blade',
      games: 2,
      completedGames: 2,
      timeoutGames: 0,
      winCount: 0,
      dragonSlayerCount: 0,
      avgTreasurePoints: 0.5,
      minTreasurePoints: 0,
      maxTreasurePoints: 1,
      avgWeaponCount: 0.5,
      avgSpellCount: 0,
      avgKeyCount: 0,
      avgHp: 4.5,
      cursedRate: 0,
      avgTurnCount: 56.5,
      minTurnCount: 54,
      maxTurnCount: 59,
      avgActionCount: 240,
      avgActionsSinceLastProgress: 0,
      avgMaxActionsWithoutProgress: 3.5,
      avgStalledTurns: 0,
      avgBacktrackLoops: 0,
      avgHealingMisses: 0,
      avgAvoidableRiskFights: 0,
      avgObjectiveBypass: 0,
      avgSeeressChoiceBlind: 0,
      avgWitchSwapLowValue: 0,
    },
  ];
}

function createPlayerResult(
  heroId: RawSimulationResult['players'][number]['heroId'],
  treasurePoints: number,
  weaponCount: number,
  spellCount: number,
  keyCount: number,
  hp: number,
  isCursed: boolean,
  diagnostics: RawSimulationResult['players'][number]['diagnostics'],
): RawSimulationResult['players'][number] {
  return {
    heroId,
    treasurePoints,
    weaponCount,
    spellCount,
    keyCount,
    hp,
    isCursed,
    diagnostics,
  };
}
