import { readFile } from 'node:fs/promises';

import {
  parseSimulationConfigCsv,
  parseSimulationCliArgs,
  runBatchSimulation,
  serializeRawSimulationResults,
  serializeSummarySimulationResults,
  writeSimulationOutputs,
} from './batchSimulation';
import {
  buildAnalysisSummary,
  serializeAnalysisSummary,
  writeAnalysisSummary,
} from './simulationAnalysis';
import { renderSimulationReport, writeSimulationReport } from './simulationReport';

export interface SimulationPipelineCliOptions {
  readonly configPath: string;
  readonly rawPath: string;
  readonly summaryPath: string;
  readonly analysisPath: string;
  readonly reportPath: string;
}

export interface SimulationPipelineResult {
  readonly scenarioCount: number;
  readonly gameCount: number;
  readonly analysisRowCount: number;
  readonly rawPath: string;
  readonly summaryPath: string;
  readonly analysisPath: string;
  readonly reportPath: string;
}

export function parseSimulationPipelineCliArgs(
  args: readonly string[],
): SimulationPipelineCliOptions {
  const base = parseSimulationCliArgs(args);
  const options = new Map<string, string>();

  for (const arg of args) {
    const separatorIndex = arg.indexOf('=');
    if (!arg.startsWith('--') || separatorIndex === -1) {
      continue;
    }

    options.set(arg.slice(2, separatorIndex), arg.slice(separatorIndex + 1).trim());
  }

  return {
    ...base,
    analysisPath: requireCliOption(options, 'analysis'),
    reportPath: requireCliOption(options, 'report'),
  };
}

export async function runSimulationPipeline(
  options: SimulationPipelineCliOptions,
): Promise<SimulationPipelineResult> {
  const configCsv = await readFile(options.configPath, 'utf8');
  const scenarios = parseSimulationConfigCsv(configCsv);
  const simulationResults = runBatchSimulation(scenarios);
  const rawCsv = serializeRawSimulationResults(simulationResults.rawResults);
  const summaryCsv = serializeSummarySimulationResults(
    simulationResults.summaryResults,
  );

  await writeSimulationOutputs(
    options.rawPath,
    rawCsv,
    options.summaryPath,
    summaryCsv,
  );

  const analysisRows = buildAnalysisSummary(
    simulationResults.summaryResults.map((row) => ({
      ...row,
      winRate: row.winCount / row.games,
      timeoutRate: row.timeoutGames / row.games,
      dragonSlayerRate: row.dragonSlayerCount / row.games,
    })),
    simulationResults.rawResults.flatMap((result) =>
      result.players.map((player, index) => ({
        scenarioId: result.scenarioId,
        gameIndex: result.gameIndex,
        seed: result.seed,
        difficulty: result.difficulty,
        poolScale: result.poolScale,
        playerCount: result.playerCount,
        turnCount: result.turnCount,
        actionCount: result.actionCount,
        heroSlot: index + 1,
        heroId: player.heroId,
        treasurePoints: player.treasurePoints,
        weaponCount: player.weaponCount,
        spellCount: player.spellCount,
        keyCount: player.keyCount,
        hp: player.hp,
        isCursed: player.isCursed,
        isWinner: result.winnerHeroIds.includes(player.heroId),
        defeatedDragon: result.defeatedDragonByHeroId === player.heroId,
        completed: result.completed,
        terminationReason: result.terminationReason,
        lastPhase: result.lastPhase,
        lastActionType: result.lastActionType,
        actionsSinceLastProgress: result.actionsSinceLastProgress,
        maxActionsWithoutProgress: result.maxActionsWithoutProgress,
        timedOutWhileActive: result.timeoutActiveHeroId === player.heroId,
        issueCounts: player.diagnostics,
      })),
    ),
  );
  const analysisCsv = serializeAnalysisSummary(analysisRows);

  await writeAnalysisSummary(options.analysisPath, analysisCsv);

  const html = renderSimulationReport(analysisRows);
  await writeSimulationReport(options.reportPath, html);

  return {
    scenarioCount: scenarios.length,
    gameCount: simulationResults.rawResults.length,
    analysisRowCount: analysisRows.length,
    rawPath: options.rawPath,
    summaryPath: options.summaryPath,
    analysisPath: options.analysisPath,
    reportPath: options.reportPath,
  };
}

function requireCliOption(options: Map<string, string>, key: string): string {
  const value = options.get(key);
  if (!value) {
    throw new Error(`Missing required --${key}=... argument`);
  }

  return value;
}
