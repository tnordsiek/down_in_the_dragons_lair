import { describe, expect, it } from 'vitest';

import {
  serializeRawSimulationResults,
  serializeSummarySimulationResults,
  type RawSimulationResult,
  type SummarySimulationResult,
} from './batchSimulation';
import { createEmptySimulationDiagnostics } from './simulationDiagnostics';
import {
  buildAnalysisSummary,
  parseRawCsv,
  parseSummaryCsv,
  serializeAnalysisSummary,
} from './simulationAnalysis';
import {
  parseAnalysisSummaryCsv,
  parseReportCliArgs,
  renderSimulationReport,
} from './simulationReport';

const analysisCsv = serializeAnalysisSummary(
  buildAnalysisSummary(
    parseSummaryCsv(serializeSummarySimulationResults(createSummaryResults())),
    parseRawCsv(serializeRawSimulationResults(createRawResults())),
  ),
);

describe('simulation report', () => {
  it('parses required cli arguments for report generation', () => {
    expect(
      parseReportCliArgs([
        '--analysis=scripts/example-analysis-summary.csv',
        '--out=scripts/example-analysis-report.html',
      ]),
    ).toEqual({
      analysisPath: 'scripts/example-analysis-summary.csv',
      outputPath: 'scripts/example-analysis-report.html',
    });
  });

  it('renders one section per scenario with scorecards and fix-oriented problem cards', () => {
    const html = renderSimulationReport(parseAnalysisSummaryCsv(analysisCsv));

    expect(html).toContain('Simulation Diagnostics Report');
    expect(html).toContain('duel_mage_rogue');
    expect(html).toContain('Heldinnen-Scorecard');
    expect(html).toContain('Problems To Fix');
    expect(html).toContain('Partie terminiert nicht');
    expect(html).toContain('Seherin waehlt Token blind');
    expect(html).toContain('s2#1');
    expect(html).toContain('Last Phase Before Abort');
  });

  it('renders deterministic html for identical analysis input', () => {
    const rows = parseAnalysisSummaryCsv(analysisCsv);

    expect(renderSimulationReport(rows)).toEqual(renderSimulationReport(rows));
  });
});

function createRawResults(): RawSimulationResult[] {
  const timeoutDiag = createEmptySimulationDiagnostics();
  timeoutDiag.nonTerminatingGame = 1;
  const cleanDiag = createEmptySimulationDiagnostics();
  const seeressDiag = createEmptySimulationDiagnostics();
  seeressDiag.seeressChoiceBlind = 1;

  return [
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
        createPlayerResult('hero_mage', 0, 0, 0, 0, 5, false, timeoutDiag),
        createPlayerResult('hero_rogue', 0, 1, 0, 0, 4, false, cleanDiag),
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
        createPlayerResult('hero_seeress', 2.5, 2, 0, 0, 4, false, seeressDiag),
        createPlayerResult('hero_blade', 0, 0, 0, 0, 5, false, cleanDiag),
      ],
    },
  ];
}

function createSummaryResults(): SummarySimulationResult[] {
  return [
    {
      scenarioId: 'duel_mage_rogue',
      difficulty: 'easy',
      poolScale: 0.5,
      playerCount: 2,
      heroSlot: 1,
      heroId: 'hero_mage',
      games: 1,
      completedGames: 0,
      timeoutGames: 1,
      winCount: 0,
      dragonSlayerCount: 0,
      avgTreasurePoints: 0,
      minTreasurePoints: 0,
      maxTreasurePoints: 0,
      avgWeaponCount: 0,
      avgSpellCount: 0,
      avgKeyCount: 0,
      avgHp: 5,
      cursedRate: 0,
      avgTurnCount: 3998,
      minTurnCount: 3998,
      maxTurnCount: 3998,
      avgActionCount: 20000,
      avgActionsSinceLastProgress: 1,
      avgMaxActionsWithoutProgress: 5,
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
      heroSlot: 2,
      heroId: 'hero_rogue',
      games: 1,
      completedGames: 0,
      timeoutGames: 1,
      winCount: 0,
      dragonSlayerCount: 0,
      avgTreasurePoints: 0,
      minTreasurePoints: 0,
      maxTreasurePoints: 0,
      avgWeaponCount: 1,
      avgSpellCount: 0,
      avgKeyCount: 0,
      avgHp: 4,
      cursedRate: 0,
      avgTurnCount: 3998,
      minTurnCount: 3998,
      maxTurnCount: 3998,
      avgActionCount: 20000,
      avgActionsSinceLastProgress: 1,
      avgMaxActionsWithoutProgress: 5,
      avgStalledTurns: 0,
      avgBacktrackLoops: 0,
      avgHealingMisses: 0,
      avgAvoidableRiskFights: 0,
      avgObjectiveBypass: 0,
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
      games: 1,
      completedGames: 1,
      timeoutGames: 0,
      winCount: 1,
      dragonSlayerCount: 1,
      avgTreasurePoints: 2.5,
      minTreasurePoints: 2.5,
      maxTreasurePoints: 2.5,
      avgWeaponCount: 2,
      avgSpellCount: 0,
      avgKeyCount: 0,
      avgHp: 4,
      cursedRate: 0,
      avgTurnCount: 59,
      minTurnCount: 59,
      maxTurnCount: 59,
      avgActionCount: 250,
      avgActionsSinceLastProgress: 0,
      avgMaxActionsWithoutProgress: 4,
      avgStalledTurns: 0,
      avgBacktrackLoops: 0,
      avgHealingMisses: 0,
      avgAvoidableRiskFights: 0,
      avgObjectiveBypass: 0,
      avgSeeressChoiceBlind: 1,
      avgWitchSwapLowValue: 0,
    },
    {
      scenarioId: 'duel_seeress_blade',
      difficulty: 'normal',
      poolScale: 0.5,
      playerCount: 2,
      heroSlot: 2,
      heroId: 'hero_blade',
      games: 1,
      completedGames: 1,
      timeoutGames: 0,
      winCount: 0,
      dragonSlayerCount: 0,
      avgTreasurePoints: 0,
      minTreasurePoints: 0,
      maxTreasurePoints: 0,
      avgWeaponCount: 0,
      avgSpellCount: 0,
      avgKeyCount: 0,
      avgHp: 5,
      cursedRate: 0,
      avgTurnCount: 59,
      minTurnCount: 59,
      maxTurnCount: 59,
      avgActionCount: 250,
      avgActionsSinceLastProgress: 0,
      avgMaxActionsWithoutProgress: 4,
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
