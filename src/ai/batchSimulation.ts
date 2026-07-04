import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { applyGameAction } from '../engine/core/actions';
import type { AiDifficulty, GameAction, HeroId } from '../engine/core/types';
import { createNewGame } from '../engine/setup/createGame';
import { heroIds } from '../data/heroes';
import { chooseHeuristicAiAction } from './heuristicAgent';
import { getDifficultyConfig } from './config';
import { getLegalAiActions } from './legalActions';
import {
  createEmptySimulationDiagnostics,
  createStaleActionTracker,
  detectSimulationIssues,
  isMeaningfulProgress,
  simulationIssueTypes,
  type SimulationIssueType,
  type SimulationPlayerDiagnostics,
  type SimulationTimeoutSnapshot,
} from './simulationDiagnostics';

export const simulationConfigColumns = [
  'scenarioId',
  'games',
  'baseSeed',
  'difficulty',
  'poolScale',
  'heroes',
] as const;

export const simulationMaxActions = 20000;

export type SimulationConfigColumn = (typeof simulationConfigColumns)[number];

export interface SimulationScenarioConfig {
  readonly scenarioId: string;
  readonly games: number;
  readonly baseSeed: string;
  readonly difficulty: AiDifficulty;
  readonly poolScale: number;
  readonly heroes: HeroId[];
}

export interface SimulatedPlayerResult {
  readonly heroId: HeroId;
  readonly treasurePoints: number;
  readonly weaponCount: number;
  readonly spellCount: number;
  readonly keyCount: number;
  readonly hp: number;
  readonly isCursed: boolean;
  readonly diagnostics: SimulationPlayerDiagnostics;
}

export interface RawSimulationResult {
  readonly scenarioId: string;
  readonly gameIndex: number;
  readonly seed: string;
  readonly difficulty: AiDifficulty;
  readonly poolScale: number;
  readonly playerCount: number;
  readonly actionCount: number;
  readonly turnCount: number;
  readonly completed: boolean;
  readonly terminationReason: 'completed' | 'action_limit';
  readonly defeatedDragonByHeroId: HeroId | '';
  readonly winnerHeroIds: HeroId[];
  readonly lastPhase: string;
  readonly lastActionType: GameAction['type'] | '';
  readonly actionsSinceLastProgress: number;
  readonly maxActionsWithoutProgress: number;
  readonly timeoutActiveHeroId: HeroId | '';
  readonly players: readonly SimulatedPlayerResult[];
}

export interface SummarySimulationResult {
  readonly scenarioId: string;
  readonly difficulty: AiDifficulty;
  readonly poolScale: number;
  readonly playerCount: number;
  readonly heroSlot: number;
  readonly heroId: HeroId;
  readonly games: number;
  readonly completedGames: number;
  readonly timeoutGames: number;
  readonly winCount: number;
  readonly dragonSlayerCount: number;
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

export interface BatchSimulationResult {
  readonly rawResults: readonly RawSimulationResult[];
  readonly summaryResults: readonly SummarySimulationResult[];
}

export interface SimulationCliOptions {
  readonly configPath: string;
  readonly rawPath: string;
  readonly summaryPath: string;
}

export function parseSimulationConfigCsv(csvText: string): SimulationScenarioConfig[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error('Simulation config CSV is empty');
  }

  const header = parseCsvLine(lines[0]);
  const expectedHeader = [...simulationConfigColumns];

  if (
    header.length !== expectedHeader.length ||
    header.some((column, index) => column !== expectedHeader[index])
  ) {
    throw new Error(
      `Simulation config header must be ${expectedHeader.join(',')}`,
    );
  }

  return lines.slice(1).map((line, index) => parseScenarioRow(line, index + 2));
}

export function runBatchSimulation(
  scenarios: readonly SimulationScenarioConfig[],
): BatchSimulationResult {
  const rawResults = scenarios.flatMap((scenario) => runScenarioSimulation(scenario));

  return {
    rawResults,
    summaryResults: summarizeSimulationResults(scenarios, rawResults),
  };
}

export function serializeRawSimulationResults(
  rawResults: readonly RawSimulationResult[],
): string {
  const header = [
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
    ...createSlotColumns('slot'),
  ];

  const rows = rawResults.map((result) => [
    result.scenarioId,
    String(result.gameIndex),
    result.seed,
    result.difficulty,
    formatNumber(result.poolScale),
    String(result.playerCount),
    String(result.actionCount),
    String(result.turnCount),
    result.completed ? 'true' : 'false',
    result.terminationReason,
    result.defeatedDragonByHeroId,
    result.winnerHeroIds.join('|'),
    result.lastPhase,
    result.lastActionType,
    String(result.actionsSinceLastProgress),
    String(result.maxActionsWithoutProgress),
    result.timeoutActiveHeroId,
    ...serializePlayerSlots(result.players),
  ]);

  return serializeCsv([header, ...rows]);
}

export function serializeSummarySimulationResults(
  summaryResults: readonly SummarySimulationResult[],
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
  ];

  const rows = summaryResults.map((result) => [
    result.scenarioId,
    result.difficulty,
    formatNumber(result.poolScale),
    String(result.playerCount),
    String(result.heroSlot),
    result.heroId,
    String(result.games),
    String(result.completedGames),
    String(result.timeoutGames),
    String(result.winCount),
    String(result.dragonSlayerCount),
    formatNumber(result.winCount / result.games),
    formatNumber(result.timeoutGames / result.games),
    formatNumber(result.dragonSlayerCount / result.games),
    formatNumber(result.avgTreasurePoints),
    formatNumber(result.minTreasurePoints),
    formatNumber(result.maxTreasurePoints),
    formatNumber(result.avgWeaponCount),
    formatNumber(result.avgSpellCount),
    formatNumber(result.avgKeyCount),
    formatNumber(result.avgHp),
    formatNumber(result.cursedRate),
    formatNumber(result.avgTurnCount),
    String(result.minTurnCount),
    String(result.maxTurnCount),
    formatNumber(result.avgActionCount),
    formatNumber(result.avgActionsSinceLastProgress),
    formatNumber(result.avgMaxActionsWithoutProgress),
    formatNumber(result.avgStalledTurns),
    formatNumber(result.avgBacktrackLoops),
    formatNumber(result.avgHealingMisses),
    formatNumber(result.avgAvoidableRiskFights),
    formatNumber(result.avgObjectiveBypass),
    formatNumber(result.avgSeeressChoiceBlind),
    formatNumber(result.avgWitchSwapLowValue),
  ]);

  return serializeCsv([header, ...rows]);
}

export async function writeSimulationOutputs(
  rawPath: string,
  rawCsv: string,
  summaryPath: string,
  summaryCsv: string,
): Promise<void> {
  await Promise.all([
    ensureParentDirectory(rawPath),
    ensureParentDirectory(summaryPath),
  ]);
  await Promise.all([
    writeFile(rawPath, rawCsv, 'utf8'),
    writeFile(summaryPath, summaryCsv, 'utf8'),
  ]);
}

export function parseSimulationCliArgs(args: readonly string[]): SimulationCliOptions {
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
    configPath: requireCliOption(options, 'config'),
    rawPath: requireCliOption(options, 'raw'),
    summaryPath: requireCliOption(options, 'summary'),
  };
}

function runScenarioSimulation(
  scenario: SimulationScenarioConfig,
): RawSimulationResult[] {
  return Array.from({ length: scenario.games }, (_, index) =>
    runSingleSimulation(scenario, index),
  );
}

function runSingleSimulation(
  scenario: SimulationScenarioConfig,
  zeroBasedGameIndex: number,
): RawSimulationResult {
  const seed = deriveSimulationSeed(scenario.baseSeed, zeroBasedGameIndex + 1);
  let current = createNewGame({
    humanHeroId: scenario.heroes[0],
    aiCount: scenario.heroes.length - 1,
    seed,
    difficulty: scenario.difficulty,
    poolScale: scenario.poolScale,
    selectedAiHeroIds: scenario.heroes.slice(1),
  });
  let actionCount = 0;
  let turnCount = current.phase === 'game_over' ? 0 : 1;
  let lastActionType: GameAction['type'] | '' = '';
  let actionsSinceLastProgress = 0;
  let maxActionsWithoutProgress = 0;
  let timeoutSnapshot: SimulationTimeoutSnapshot | undefined;
  const staleTracker = createStaleActionTracker();
  const diagnosticsByPlayerId = new Map<string, SimulationPlayerDiagnostics>(
    current.players.map((player) => [player.id, createEmptySimulationDiagnostics()]),
  );

  while (current.phase !== 'game_over' && actionCount < simulationMaxActions) {
    const config = getDifficultyConfig(current.difficulty);
    const legalActions = getLegalAiActions(current);

    if (legalActions.length === 0) {
      break;
    }

    const activePlayer = current.players[current.activePlayerIndex];
    const action = chooseHeuristicAiAction(
      current,
      legalActions,
      config,
      staleTracker.staleActionCount,
    );
    const issues = detectSimulationIssues(current, action, legalActions, config);
    const playerDiagnostics =
      diagnosticsByPlayerId.get(activePlayer.id) ??
      createEmptySimulationDiagnostics();

    for (const issue of issues) {
      playerDiagnostics[issue] += 1;
    }
    diagnosticsByPlayerId.set(activePlayer.id, playerDiagnostics);

    const next = applyGameAction(current, action);
    actionCount += 1;
    lastActionType = action.type;
    staleTracker.record(current, next, action);

    if (isMeaningfulProgress(current, next, action)) {
      actionsSinceLastProgress = 0;
    } else {
      actionsSinceLastProgress += 1;
      maxActionsWithoutProgress = Math.max(
        maxActionsWithoutProgress,
        actionsSinceLastProgress,
      );
    }

    const previousActivePlayerId = current.players[current.activePlayerIndex]?.id;
    const nextActivePlayerId = next.players[next.activePlayerIndex]?.id;
    if (
      next.phase !== 'game_over' &&
      previousActivePlayerId !== undefined &&
      nextActivePlayerId !== undefined &&
      previousActivePlayerId !== nextActivePlayerId
    ) {
      turnCount += 1;
    }

    current = next;
  }

  const completed = current.phase === 'game_over';
  if (!completed) {
    const activePlayer = current.players[current.activePlayerIndex];
    const diagnostics =
      diagnosticsByPlayerId.get(activePlayer.id) ??
      createEmptySimulationDiagnostics();
    diagnostics.nonTerminatingGame += 1;
    diagnosticsByPlayerId.set(activePlayer.id, diagnostics);
    timeoutSnapshot = {
      activeHeroId: activePlayer.heroId,
      phase: current.phase,
      lastActionType,
      actionsSinceLastProgress,
    };
  }

  const defeatedDragonPlayer = current.players.find(
    (player) => player.id === current.victory?.defeatedDragonByPlayerId,
  );
  const winnerPlayerIds = new Set(current.victory?.winnerPlayerIds ?? []);

  return {
    scenarioId: scenario.scenarioId,
    gameIndex: zeroBasedGameIndex + 1,
    seed,
    difficulty: scenario.difficulty,
    poolScale: scenario.poolScale,
    playerCount: scenario.heroes.length,
    actionCount,
    turnCount,
    completed,
    terminationReason: completed ? 'completed' : 'action_limit',
    defeatedDragonByHeroId: defeatedDragonPlayer?.heroId ?? '',
    winnerHeroIds: current.players
      .filter((player) => winnerPlayerIds.has(player.id))
      .map((player) => player.heroId),
    lastPhase: current.phase,
    lastActionType,
    actionsSinceLastProgress,
    maxActionsWithoutProgress,
    timeoutActiveHeroId: timeoutSnapshot?.activeHeroId ?? '',
    players: current.players.map((player) => ({
      heroId: player.heroId,
      treasurePoints: player.treasurePoints,
      weaponCount: player.inventory.weapons.length,
      spellCount: player.inventory.spells.length,
      keyCount: player.inventory.keyCount,
      hp: player.hp,
      isCursed: player.isCursed,
      diagnostics:
        diagnosticsByPlayerId.get(player.id) ?? createEmptySimulationDiagnostics(),
    })),
  };
}

function summarizeSimulationResults(
  scenarios: readonly SimulationScenarioConfig[],
  rawResults: readonly RawSimulationResult[],
): SummarySimulationResult[] {
  const resultsByScenario = new Map<string, RawSimulationResult[]>();

  for (const result of rawResults) {
    const currentResults = resultsByScenario.get(result.scenarioId) ?? [];
    currentResults.push(result);
    resultsByScenario.set(result.scenarioId, currentResults);
  }

  return scenarios.flatMap((scenario) => {
    const scenarioResults = resultsByScenario.get(scenario.scenarioId) ?? [];

    return scenario.heroes.map((heroId, index) => {
      const playerResults = scenarioResults.map((result) => result.players[index]);
      const completedGames = scenarioResults.filter((result) => result.completed).length;
      const timeoutGames = scenarioResults.length - completedGames;
      const winCount = scenarioResults.filter((result) =>
        result.winnerHeroIds.includes(heroId),
      ).length;
      const dragonSlayerCount = scenarioResults.filter(
        (result) => result.defeatedDragonByHeroId === heroId,
      ).length;

      return {
        scenarioId: scenario.scenarioId,
        difficulty: scenario.difficulty,
        poolScale: scenario.poolScale,
        playerCount: scenario.heroes.length,
        heroSlot: index + 1,
        heroId,
        games: scenario.games,
        completedGames,
        timeoutGames,
        winCount,
        dragonSlayerCount,
        avgTreasurePoints: average(playerResults.map((player) => player.treasurePoints)),
        minTreasurePoints: Math.min(
          ...playerResults.map((player) => player.treasurePoints),
        ),
        maxTreasurePoints: Math.max(
          ...playerResults.map((player) => player.treasurePoints),
        ),
        avgWeaponCount: average(playerResults.map((player) => player.weaponCount)),
        avgSpellCount: average(playerResults.map((player) => player.spellCount)),
        avgKeyCount: average(playerResults.map((player) => player.keyCount)),
        avgHp: average(playerResults.map((player) => player.hp)),
        cursedRate:
          playerResults.filter((player) => player.isCursed).length / scenario.games,
        avgTurnCount: average(scenarioResults.map((result) => result.turnCount)),
        minTurnCount: Math.min(...scenarioResults.map((result) => result.turnCount)),
        maxTurnCount: Math.max(...scenarioResults.map((result) => result.turnCount)),
        avgActionCount: average(
          scenarioResults.map((result) => result.actionCount),
        ),
        avgActionsSinceLastProgress: average(
          scenarioResults.map((result) => result.actionsSinceLastProgress),
        ),
        avgMaxActionsWithoutProgress: average(
          scenarioResults.map((result) => result.maxActionsWithoutProgress),
        ),
        avgStalledTurns: averageIssue(playerResults, 'stalledTurns'),
        avgBacktrackLoops: averageIssue(playerResults, 'backtrackLoops'),
        avgHealingMisses: averageIssue(playerResults, 'healingMisses'),
        avgAvoidableRiskFights: averageIssue(playerResults, 'avoidableRiskFights'),
        avgObjectiveBypass: averageIssue(playerResults, 'objectiveBypass'),
        avgSeeressChoiceBlind: averageIssue(playerResults, 'seeressChoiceBlind'),
        avgWitchSwapLowValue: averageIssue(playerResults, 'witchSwapLowValue'),
      };
    });
  });
}

function parseScenarioRow(
  line: string,
  lineNumber: number,
): SimulationScenarioConfig {
  const cells = parseCsvLine(line);
  if (cells.length !== simulationConfigColumns.length) {
    throw new Error(
      `Line ${lineNumber}: expected ${simulationConfigColumns.length} columns, received ${cells.length}`,
    );
  }

  const [scenarioId, gamesText, baseSeed, difficultyText, poolScaleText, heroesText] =
    cells;

  if (scenarioId.length === 0) {
    throw new Error(`Line ${lineNumber}: scenarioId must not be empty`);
  }

  const games = parsePositiveInteger(gamesText, 'games', lineNumber);
  const difficulty = parseDifficulty(difficultyText, lineNumber);
  const poolScale = parsePositiveNumber(poolScaleText, 'poolScale', lineNumber);
  const heroes = parseHeroes(heroesText, lineNumber);

  if (baseSeed.length === 0) {
    throw new Error(`Line ${lineNumber}: baseSeed must not be empty`);
  }

  return {
    scenarioId,
    games,
    baseSeed,
    difficulty,
    poolScale,
    heroes,
  };
}

function parseDifficulty(value: string, lineNumber: number): AiDifficulty {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return 'normal';
  }

  if (normalized === 'easy' || normalized === 'normal' || normalized === 'hard') {
    return normalized;
  }

  throw new Error(`Line ${lineNumber}: unknown difficulty "${value}"`);
}

function parseHeroes(value: string, lineNumber: number): HeroId[] {
  const heroes = value
    .split('|')
    .map((heroId) => heroId.trim())
    .filter((heroId) => heroId.length > 0);

  if (heroes.length < 2 || heroes.length > 5) {
    throw new Error(`Line ${lineNumber}: heroes must contain between 2 and 5 ids`);
  }

  if (new Set(heroes).size !== heroes.length) {
    throw new Error(`Line ${lineNumber}: heroes must be unique`);
  }

  for (const heroId of heroes) {
    if (!heroIds.includes(heroId as HeroId)) {
      throw new Error(`Line ${lineNumber}: unknown hero "${heroId}"`);
    }
  }

  return heroes as HeroId[];
}

function parsePositiveInteger(
  value: string,
  label: string,
  lineNumber: number,
): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Line ${lineNumber}: ${label} must be a positive integer`);
  }

  return parsed;
}

function parsePositiveNumber(
  value: string,
  label: string,
  lineNumber: number,
): number {
  if (value.trim().length === 0) {
    return 1;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Line ${lineNumber}: ${label} must be a positive number`);
  }

  return parsed;
}

function deriveSimulationSeed(baseSeed: string, gameIndex: number): string {
  return `${baseSeed}#${gameIndex}`;
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function averageIssue(
  players: readonly SimulatedPlayerResult[],
  issueType: Exclude<SimulationIssueType, 'nonTerminatingGame'>,
): number {
  return average(players.map((player) => player.diagnostics[issueType]));
}

function createSlotColumns(prefix: string): string[] {
  const columns: string[] = [];

  for (let slot = 1; slot <= 5; slot += 1) {
    columns.push(
      `${prefix}${slot}HeroId`,
      `${prefix}${slot}TreasurePoints`,
      `${prefix}${slot}WeaponCount`,
      `${prefix}${slot}SpellCount`,
      `${prefix}${slot}KeyCount`,
      `${prefix}${slot}Hp`,
      `${prefix}${slot}IsCursed`,
      ...simulationIssueTypes.map(
        (issueType) =>
          `${prefix}${slot}${issueType[0].toUpperCase()}${issueType.slice(1)}`,
      ),
    );
  }

  return columns;
}

function serializePlayerSlots(players: readonly SimulatedPlayerResult[]): string[] {
  const values: string[] = [];

  for (let slot = 0; slot < 5; slot += 1) {
    const player = players[slot];
    if (!player) {
      values.push('', '', '', '', '', '', '', ...simulationIssueTypes.map(() => ''));
      continue;
    }

    values.push(
      player.heroId,
      formatNumber(player.treasurePoints),
      String(player.weaponCount),
      String(player.spellCount),
      String(player.keyCount),
      String(player.hp),
      player.isCursed ? 'true' : 'false',
      ...simulationIssueTypes.map((issueType) =>
        String(player.diagnostics[issueType]),
      ),
    );
  }

  return values;
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

async function ensureParentDirectory(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

function requireCliOption(options: Map<string, string>, key: string): string {
  const value = options.get(key);
  if (!value) {
    throw new Error(`Missing required --${key}=... argument`);
  }

  return value;
}
