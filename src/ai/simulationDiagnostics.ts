import { monsterDefinitions } from '../data/monsters';
import { getTileAt } from '../engine/core/board';
import type {
  BoardPosition,
  GameAction,
  GamePhase,
  GameState,
  HeroId,
  Player,
} from '../engine/core/types';
import { adjacentPosition, canTilesConnect } from '../engine/movement/topology';
import {
  getDiscoveredHealingPositions,
  hasActiveHeroAbility,
} from '../engine/rules/abilities';
import type { AiHeuristicConfig } from './config';
import { estimateCombatWinChance } from './heuristicAgent';

export const simulationIssueTypes = [
  'stalledTurns',
  'backtrackLoops',
  'healingMisses',
  'avoidableRiskFights',
  'objectiveBypass',
  'seeressChoiceBlind',
  'witchSwapLowValue',
  'nonTerminatingGame',
] as const;

export type SimulationIssueType = (typeof simulationIssueTypes)[number];

export type SimulationPlayerDiagnostics = Record<SimulationIssueType, number>;

export interface SimulationTimeoutSnapshot {
  readonly activeHeroId: HeroId;
  readonly phase: GamePhase;
  readonly lastActionType: GameAction['type'] | '';
  readonly actionsSinceLastProgress: number;
}

export interface SimulationIssueMetadata {
  readonly title: string;
  readonly suggestedArea:
    | 'healing'
    | 'movement'
    | 'combat'
    | 'hero_ability'
    | 'rules'
    | 'termination';
  readonly likelyCodeArea: string;
  readonly expectedBehavior: string;
  readonly recommendedTest: string;
  readonly severityWeight: number;
}

export const simulationIssueMetadata: Record<
  SimulationIssueType,
  SimulationIssueMetadata
> = {
  stalledTurns: {
    title: 'Heldin beendet Zuege ohne Fortschritt',
    suggestedArea: 'movement',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Die AI sollte bei verfuegbaren Fortschrittsoptionen nicht ohne Not den Zug beenden.',
    recommendedTest:
      'Szenariotest plus Batch-Regression auf sinkende stalledTurns-Rate',
    severityWeight: 0.4,
  },
  backtrackLoops: {
    title: 'Heldin faellt in Rueckwaerts-Schleifen',
    suggestedArea: 'movement',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Rueckwaertsbewegungen sollten nur bei klarem Zielnutzen gegenueber Alternativen gewaehlt werden.',
    recommendedTest:
      'Seed-basierter Bewegungstest plus Batch-Regression auf sinkende backtrackLoops',
    severityWeight: 0.45,
  },
  healingMisses: {
    title: 'Heldin verpasst naheliegende Heilung',
    suggestedArea: 'healing',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Kritisch verletzte oder verfluchte Heldinnen sollten Heilzauber oder Heilfelder priorisieren.',
    recommendedTest:
      'Unit-/Szenariotest fuer Heilentscheidung plus Batch-Regression',
    severityWeight: 0.7,
  },
  avoidableRiskFights: {
    title: 'Heldin startet vermeidbare Risikokaempfe',
    suggestedArea: 'combat',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Optionale Kaempfe unterhalb der Risiko-Schwelle sollten nur in klaren Sonderfaellen gestartet werden.',
    recommendedTest:
      'Combat-Entscheidungstest mit Seed plus Batch-Regression',
    severityWeight: 0.75,
  },
  objectiveBypass: {
    title: 'Heldin ignoriert erreichbare Ziele',
    suggestedArea: 'movement',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Erreichbare Heilung, Truhen oder der finale Drache sollten nicht systematisch umgangen werden.',
    recommendedTest:
      'Szenariotest fuer Zielpriorisierung plus Batch-Regression',
    severityWeight: 0.55,
  },
  seeressChoiceBlind: {
    title: 'Seherin waehlt Token blind',
    suggestedArea: 'hero_ability',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Die Seherin sollte beide Raum-Token-Optionen heuristisch bewerten statt pauschal Index 0 zu waehlen.',
    recommendedTest:
      'Hero-Ability-Szenariotest mit reproduzierbarem Seed plus Batch-Regression',
    severityWeight: 0.85,
  },
  witchSwapLowValue: {
    title: 'Hexen-Tausch liefert keinen Positionsgewinn',
    suggestedArea: 'hero_ability',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Der Hexen-Tausch sollte nur gewaehlt werden, wenn er messbaren Fortschritt oder Sicherheit bringt.',
    recommendedTest:
      'Seed-basierter Hexen-Tauschtest plus Batch-Regression',
    severityWeight: 0.65,
  },
  nonTerminatingGame: {
    title: 'Partie terminiert nicht',
    suggestedArea: 'termination',
    likelyCodeArea: 'src/ai/heuristicAgent.ts / src/engine',
    expectedBehavior:
      'Simulationen sollten ohne Deadlock oder Endlosschleife vor dem Aktionslimit enden.',
    recommendedTest:
      'Batch-/Fuzz-Test mit Timeout-Reproduktion und sinkender Timeout-Rate',
    severityWeight: 1,
  },
};

export function createEmptySimulationDiagnostics(): SimulationPlayerDiagnostics {
  return {
    stalledTurns: 0,
    backtrackLoops: 0,
    healingMisses: 0,
    avoidableRiskFights: 0,
    objectiveBypass: 0,
    seeressChoiceBlind: 0,
    witchSwapLowValue: 0,
    nonTerminatingGame: 0,
  };
}

export function detectSimulationIssues(
  state: GameState,
  action: GameAction,
  legalActions: readonly GameAction[],
  config: AiHeuristicConfig,
): SimulationIssueType[] {
  const issues: SimulationIssueType[] = [];
  const activePlayer = state.players[state.activePlayerIndex];

  if (isStalledTurn(action, legalActions)) {
    issues.push('stalledTurns');
  }

  if (action.type === 'movePlayer' && isBacktrackMove(state, action)) {
    issues.push('backtrackLoops');
  }

  if (isHealingMiss(state, action, activePlayer, config)) {
    issues.push('healingMisses');
  }

  if (isAvoidableRiskFight(state, action, activePlayer, config)) {
    issues.push('avoidableRiskFights');
  }

  if (isObjectiveBypass(state, action, legalActions, activePlayer)) {
    issues.push('objectiveBypass');
  }

  if (
    state.phase === 'resolve_room_token_seeress_choice' &&
    isBlindSeeressChoice(state, action)
  ) {
    issues.push('seeressChoiceBlind');
  }

  if (
    action.type === 'swapWitchPosition' &&
    isLowValueWitchSwap(state, activePlayer, action.targetPlayerId, config)
  ) {
    issues.push('witchSwapLowValue');
  }

  return issues;
}

export function isMeaningfulProgress(
  before: GameState,
  after: GameState,
  action: GameAction,
): boolean {
  if (after.phase === 'game_over') {
    return true;
  }

  if (after.board.length > before.board.length) {
    return true;
  }

  if (
    action.type === 'openChest' ||
    action.type === 'takeLoot' ||
    action.type === 'swapLoot'
  ) {
    return true;
  }

  if (action.type === 'movePlayer') {
    return (
      !before.lastMoveFrom ||
      action.target.boardX !== before.lastMoveFrom.boardX ||
      action.target.boardY !== before.lastMoveFrom.boardY
    );
  }

  const beforeActive = before.players[before.activePlayerIndex];
  const afterPlayer =
    after.players.find((player) => player.id === beforeActive.id) ??
    beforeActive;

  return (
    afterPlayer.hp > beforeActive.hp ||
    afterPlayer.treasurePoints > beforeActive.treasurePoints ||
    afterPlayer.inventory.keyCount > beforeActive.inventory.keyCount ||
    afterPlayer.inventory.weapons.length >
      beforeActive.inventory.weapons.length ||
    afterPlayer.inventory.spells.length > beforeActive.inventory.spells.length
  );
}

/**
 * `isMeaningfulProgress()` only rejects moving straight back to the
 * immediately preceding tile. A 3+ tile cycle (e.g. shuttling around a
 * junction while waiting for healing that never arrives) never repeats the
 * same "previous" position and therefore always looks like progress, letting
 * a game oscillate forever. This tracker layers two safeguards on top so
 * such cycles are recognised as stalling too, which is what lets the
 * `staleActionCount` escape hatch in `chooseHeuristicAiAction` actually
 * engage and stay engaged:
 *
 * - A short recent-position memory: revisiting a tile seen a few moves ago
 *   doesn't count as progress.
 * - Once the dungeon is fully explored (no tiles/tokens left), merely
 *   walking to a not-recently-seen tile is no longer treated as progress
 *   either — with nothing left to discover, only an actual state change
 *   (combat outcome, hp, loot, game over) counts. Otherwise a single step
 *   towards a distant objective resets the counter and drops the AI straight
 *   back into over-cautious "wait and see" behaviour for another full
 *   threshold's worth of turns, producing a slow sawtooth that never
 *   actually reaches the objective in time.
 * - An exploration-specific counter that only resets when the tile stack
 *   actually shrinks. A player stuck fighting/healing near an unfavourable
 *   monster racks up genuine hp/treasure swings turn after turn — each one
 *   individually "progress" by `isMeaningfulProgress()` — while never
 *   advancing the dungeon at all. That churn keeps resetting
 *   `actionsSinceLastProgress` forever, so the escape hatch never trips even
 *   though the game is provably going nowhere. `staleActionCount` reports
 *   the larger of the two counters so either kind of stall is caught.
 */
export function createStaleActionTracker(
  recentPositionWindow = 6,
  explorationStallThreshold = 150,
) {
  let actionsSinceLastProgress = 0;
  let recentPositionKeys: string[] = [];
  let lastTileStackSize: number | undefined;
  let actionsSinceTileStackShrink = 0;

  return {
    get staleActionCount(): number {
      const explorationStalled =
        actionsSinceTileStackShrink >= explorationStallThreshold;

      return explorationStalled
        ? Math.max(actionsSinceLastProgress, actionsSinceTileStackShrink)
        : actionsSinceLastProgress;
    },
    record(before: GameState, after: GameState, action: GameAction): void {
      let progressed = isMeaningfulProgress(before, after, action);
      const isFullyExplored =
        before.tileStack.length === 0 && before.tokenBag.length === 0;

      if (
        progressed &&
        isFullyExplored &&
        (action.type === 'movePlayer' ||
          action.type === 'declareExplorationDirection' ||
          action.type === 'swapWitchPosition')
      ) {
        progressed = false;
      }

      if (progressed && action.type === 'movePlayer') {
        const activePlayerId = before.players[before.activePlayerIndex]?.id;
        const activePlayerAfter = after.players.find(
          (player) => player.id === activePlayerId,
        );
        const key = activePlayerAfter
          ? `${activePlayerAfter.position.boardX},${activePlayerAfter.position.boardY}`
          : undefined;

        if (key) {
          if (recentPositionKeys.includes(key)) {
            progressed = false;
          } else {
            recentPositionKeys.push(key);

            if (recentPositionKeys.length > recentPositionWindow) {
              recentPositionKeys.shift();
            }
          }
        }
      }

      if (progressed) {
        actionsSinceLastProgress = 0;
        recentPositionKeys = [];
      } else {
        actionsSinceLastProgress += 1;
      }

      if (lastTileStackSize === undefined) {
        lastTileStackSize = before.tileStack.length;
      }

      if (after.tileStack.length < lastTileStackSize) {
        actionsSinceTileStackShrink = 0;
      } else {
        actionsSinceTileStackShrink += 1;
      }

      lastTileStackSize = after.tileStack.length;
    },
  };
}

function isStalledTurn(
  action: GameAction,
  legalActions: readonly GameAction[],
): boolean {
  if (action.type !== 'endTurn') {
    return false;
  }

  return legalActions.some(
    (candidate) =>
      candidate.type === 'movePlayer' ||
      candidate.type === 'declareExplorationDirection' ||
      candidate.type === 'openChest' ||
      candidate.type === 'beginLoot',
  );
}

function isBacktrackMove(
  state: GameState,
  action: Extract<GameAction, { type: 'movePlayer' }>,
): boolean {
  return (
    !!state.lastMoveFrom &&
    action.target.boardX === state.lastMoveFrom.boardX &&
    action.target.boardY === state.lastMoveFrom.boardY
  );
}

function isHealingMiss(
  state: GameState,
  action: GameAction,
  activePlayer: Player,
  config: AiHeuristicConfig,
): boolean {
  if (action.type === 'useHealingSpell') {
    return false;
  }

  if (state.phase !== 'turn_start' && state.phase !== 'await_move') {
    return false;
  }

  const needsUrgentHealing =
    activePlayer.hp <= config.criticalHp || activePlayer.isCursed;
  if (!needsUrgentHealing) {
    return false;
  }

  const hasHealingSpell = activePlayer.inventory.spells.some(
    (spell) => spell.spellKind === 'healing',
  );
  const knownHealing = getDiscoveredHealingPositions(state).length > 0;

  return hasHealingSpell || knownHealing;
}

function isAvoidableRiskFight(
  state: GameState,
  action: GameAction,
  activePlayer: Player,
  config: AiHeuristicConfig,
): boolean {
  if (
    state.phase !== 'optional_monster_combat' ||
    action.type !== 'startOptionalCombat' ||
    !state.combat
  ) {
    return false;
  }

  const monster = monsterDefinitions[state.combat.monsterId];
  const winChance = estimateCombatWinChance(activePlayer, monster.strength);
  const threshold =
    monster.id === 'dragon'
      ? config.minimumDragonWinChance
      : config.minimumRepeatCombatWinChance;

  return winChance < threshold;
}

function isObjectiveBypass(
  state: GameState,
  action: GameAction,
  legalActions: readonly GameAction[],
  activePlayer: Player,
): boolean {
  const objectiveMoveExists = legalActions.some(
    (candidate) =>
      candidate.type === 'movePlayer' &&
      isObjectiveTarget(state, candidate.target, activePlayer),
  );
  const objectiveExploreExists = legalActions.some(
    (candidate) => candidate.type === 'declareExplorationDirection',
  );

  if (!objectiveMoveExists && !objectiveExploreExists) {
    return false;
  }

  if (action.type === 'movePlayer') {
    return !isObjectiveTarget(state, action.target, activePlayer);
  }

  return action.type === 'endTurn' || action.type === 'swapWitchPosition';
}

function isObjectiveTarget(
  state: GameState,
  position: Player['position'],
  activePlayer: Player,
): boolean {
  const tile = getTileAt(state.board, position);
  if (!tile) {
    return false;
  }

  if (
    tile.roomToken?.id === 'treasure_chest' &&
    activePlayer.inventory.keyCount > 0
  ) {
    return true;
  }

  if (tile.roomToken?.id === 'dragon') {
    return true;
  }

  return getDiscoveredHealingPositions(state).some(
    (healingPosition) =>
      healingPosition.boardX === position.boardX &&
      healingPosition.boardY === position.boardY,
  );
}

function isBlindSeeressChoice(
  state: GameState,
  action: GameAction,
): boolean {
  if (action.type !== 'chooseSeeressRoomToken' || action.choiceIndex !== 0) {
    return false;
  }

  const drawnTokens = state.pendingSeeressRoomChoice?.drawnTokens;
  return !!drawnTokens && drawnTokens[0].id !== drawnTokens[1].id;
}

function isLowValueWitchSwap(
  state: GameState,
  activePlayer: Player,
  targetPlayerId: string,
  config: AiHeuristicConfig,
): boolean {
  if (!hasActiveHeroAbility(activePlayer, 'hero_witch')) {
    return false;
  }

  const targetPlayer = state.players.find(
    (player) => player.id === targetPlayerId,
  );
  if (!targetPlayer) {
    return false;
  }

  const currentObjectiveDistance = distanceToNearestObjective(
    state,
    activePlayer.position,
  );
  const swappedObjectiveDistance = distanceToNearestObjective(
    state,
    targetPlayer.position,
  );
  const currentHealingDistance = distanceToNearestHealing(
    state,
    activePlayer.position,
  );
  const swappedHealingDistance = distanceToNearestHealing(
    state,
    targetPlayer.position,
  );

  const objectiveImproves =
    swappedObjectiveDistance !== undefined &&
    (currentObjectiveDistance === undefined ||
      swappedObjectiveDistance < currentObjectiveDistance);
  const healingImproves =
    needsHealing(activePlayer, config) &&
    swappedHealingDistance !== undefined &&
    (currentHealingDistance === undefined ||
      swappedHealingDistance < currentHealingDistance);

  return !objectiveImproves && !healingImproves;
}

function distanceToNearestObjective(
  state: GameState,
  position: Player['position'],
): number | undefined {
  const objectiveDistances = state.board.flatMap((tile) => {
    if (
      tile.roomToken?.id !== 'treasure_chest' &&
      tile.roomToken?.id !== 'dragon'
    ) {
      return [];
    }

    const distance = shortestKnownPathDistance(state, position, tile);
    return distance === undefined ? [] : [distance];
  });

  return objectiveDistances.length > 0
    ? Math.min(...objectiveDistances)
    : undefined;
}

function distanceToNearestHealing(
  state: GameState,
  position: Player['position'],
): number | undefined {
  const distances = getDiscoveredHealingPositions(state).flatMap(
    (healingPosition) => {
      const distance = shortestKnownPathDistance(
        state,
        position,
        healingPosition,
      );
      return distance === undefined ? [] : [distance];
    },
  );

  return distances.length > 0 ? Math.min(...distances) : undefined;
}

function needsHealing(player: Player, config: AiHeuristicConfig): boolean {
  return player.hp < config.preferHealingBelowHp || player.isCursed;
}

function shortestKnownPathDistance(
  state: GameState,
  from: BoardPosition,
  target: BoardPosition,
): number | undefined {
  const startTile = getTileAt(state.board, from);
  if (!startTile) {
    return undefined;
  }

  const targetKey = positionKey(target);
  const visited = new Set([positionKey(from)]);
  let frontier = [{ position: from, distance: 0 }];

  while (frontier.length > 0) {
    const nextFrontier: typeof frontier = [];

    for (const entry of frontier) {
      if (positionKey(entry.position) === targetKey) {
        return entry.distance;
      }

      const originTile = getTileAt(state.board, entry.position);
      if (!originTile) {
        continue;
      }

      for (const direction of ['A', 'B', 'C', 'D'] as const) {
        const nextPosition = adjacentPosition(entry.position, direction);
        const targetTile = getTileAt(state.board, nextPosition);
        const key = positionKey(nextPosition);

        if (
          !targetTile ||
          visited.has(key) ||
          !canTilesConnect(originTile, targetTile, direction)
        ) {
          continue;
        }

        visited.add(key);
        nextFrontier.push({
          position: nextPosition,
          distance: entry.distance + 1,
        });
      }
    }

    frontier = nextFrontier;
  }

  return undefined;
}

function positionKey(position: BoardPosition): string {
  return `${position.boardX},${position.boardY}`;
}
