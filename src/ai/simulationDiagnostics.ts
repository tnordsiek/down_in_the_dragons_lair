import { monsterDefinitions } from '../data/monsters';
import { tileBlueprints } from '../data/tiles';
import { getTileAt } from '../engine/core/board';
import type {
  BoardPosition,
  GameAction,
  GamePhase,
  GameState,
  HeroId,
  Item,
  Player,
} from '../engine/core/types';
import { getReachableExplorationTargets, getReachableKnownMovePaths } from '../engine/movement/reachable';
import { moveActivePlayer } from '../engine/movement/performMove';
import { adjacentPosition, canTilesConnect } from '../engine/movement/topology';
import {
  getDiscoveredHealingPositions,
  hasActiveHeroAbility,
} from '../engine/rules/abilities';
import { isHealingPosition } from '../engine/rules/healing';
import { canOpenChest } from '../engine/rules/chests';
import {
  getDifficultyConfig,
  type AiHeuristicConfig,
} from './config';
import {
  estimateCombatWinChance,
  getEffectiveAiHeuristicConfig,
} from './heuristicAgent';

export const simulationIssueTypes = [
  'stalledTurns',
  'backtrackLoops',
  'missedHealingPriority',
  'missedChestWithKey',
  'missedUpgradeLoot',
  'missedExplorationProgress',
  'missedWinningDragonWindow',
  'avoidableRiskFights',
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
  missedHealingPriority: {
    title: 'Heldin ignoriert vorrangige Heilung',
    suggestedArea: 'healing',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Kritisch verletzte oder verfluchte Heldinnen sollten verfuegbare Heilung vor anderen Zielen priorisieren.',
    recommendedTest:
      'Unit-/Szenariotest fuer Heilentscheidung plus Batch-Regression',
    severityWeight: 0.7,
  },
  missedChestWithKey: {
    title: 'Heldin laesst Schatztruhe trotz Schluessel liegen',
    suggestedArea: 'movement',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Eine erreichbare Schatztruhe sollte mit vorhandenem Schluessel vor Exploration als Fallback-Ziel und vor niedriger priorisierten Bewegungsoptionen gewaehlt werden.',
    recommendedTest:
      'Szenariotest fuer Truhen-Priorisierung mit Schluessel plus Batch-Regression',
    severityWeight: 0.7,
  },
  missedUpgradeLoot: {
    title: 'Heldin verpasst nuetzliches Upgrade-Loot',
    suggestedArea: 'movement',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Verbessernde Waffen oder Zauber sollten verfolgt werden, wenn sie die Heldin wirklich verbessern und das Rennen dorthin noch plausibel ist.',
    recommendedTest:
      'Szenariotest fuer Upgrade-Loot-Rennen plus Batch-Regression',
    severityWeight: 0.62,
  },
  missedExplorationProgress: {
    title: 'Heldin verpasst sicheren Fortschritt',
    suggestedArea: 'movement',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Ohne dringenderes strategisches Ziel sollte die AI Exploration nur als Fallback nutzen und dabei sichere neue Tiles aufdecken. Schlagbare Monster werden als eigenes Ziel bewertet.',
    recommendedTest:
      'Explorations-/Monsterfortschrittstest plus Batch-Regression',
    severityWeight: 0.48,
  },
  missedWinningDragonWindow: {
    title: 'Heldin verpasst spielentscheidendes Drachenfenster',
    suggestedArea: 'combat',
    likelyCodeArea: 'src/ai/heuristicAgent.ts',
    expectedBehavior:
      'Ein erreichbarer Drachensieg sollte priorisiert werden, wenn die Siegchance gut genug ist und +1.5 Punkte den Endscore mindestens sichern.',
    recommendedTest:
      'Endgame-Szenariotest fuer Drachenfenster plus Batch-Regression',
    severityWeight: 0.88,
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
      'Der Hexen-Tausch sollte nur gewaehlt werden, wenn er messbaren Fortschritt oder Sicherheit gegenueber normaler Bewegung bringt.',
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
    missedHealingPriority: 0,
    missedChestWithKey: 0,
    missedUpgradeLoot: 0,
    missedExplorationProgress: 0,
    missedWinningDragonWindow: 0,
    avoidableRiskFights: 0,
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
  staleActionCount = 0,
): SimulationIssueType[] {
  const issues: SimulationIssueType[] = [];
  const activePlayer = state.players[state.activePlayerIndex];
  const effectiveConfig = getEffectiveAiHeuristicConfig(
    config,
    staleActionCount,
  );

  if (isStalledTurn(action, legalActions)) {
    issues.push('stalledTurns');
  }

  if (action.type === 'movePlayer' && isBacktrackMove(state, action)) {
    issues.push('backtrackLoops');
  }

  const priorityIssue = detectPriorityGoalIssue(
    state,
    action,
    legalActions,
    activePlayer,
    effectiveConfig,
  );
  if (priorityIssue) {
    issues.push(priorityIssue);
  }

  if (isAvoidableRiskFight(state, action, activePlayer, effectiveConfig)) {
    issues.push('avoidableRiskFights');
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
  const config = getDifficultyConfig(before.difficulty);
  const fullyExplored =
    before.tileStack.length === 0 &&
    before.tokenBag.length === 0 &&
    after.tileStack.length === 0 &&
    after.tokenBag.length === 0;

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

  if (
    fullyExplored &&
    (action.type === 'movePlayer' || action.type === 'swapWitchPosition')
  ) {
    return isAdvancingEndgameObjective(before, after, config);
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

type PriorityIssueType = Extract<
  SimulationIssueType,
  | 'missedHealingPriority'
  | 'missedChestWithKey'
  | 'missedUpgradeLoot'
  | 'missedExplorationProgress'
  | 'missedWinningDragonWindow'
>;

type ReachableTarget = {
  position: BoardPosition;
};

type PriorityOpportunity = {
  issueType: PriorityIssueType;
  isSatisfied: () => boolean;
};

function detectPriorityGoalIssue(
  state: GameState,
  action: GameAction,
  legalActions: readonly GameAction[],
  activePlayer: Player,
  config: AiHeuristicConfig,
): PriorityIssueType | undefined {
  const opportunity = getHighestPriorityOpportunity(
    state,
    action,
    legalActions,
    activePlayer,
    config,
  );

  if (!opportunity || opportunity.isSatisfied()) {
    return undefined;
  }

  return opportunity.issueType;
}

function getHighestPriorityOpportunity(
  state: GameState,
  action: GameAction,
  legalActions: readonly GameAction[],
  activePlayer: Player,
  config: AiHeuristicConfig,
): PriorityOpportunity | undefined {
  const fullyExplored = state.tileStack.length === 0;

  const healingOpportunity = createHealingOpportunity(
    state,
    action,
    legalActions,
    activePlayer,
    config,
  );
  if (healingOpportunity) {
    return healingOpportunity;
  }

  const chestOpportunity = createChestOpportunity(
    state,
    action,
    activePlayer,
  );
  if (chestOpportunity) {
    return chestOpportunity;
  }

  const lootOpportunity = createUpgradeLootOpportunity(
    state,
    action,
    activePlayer,
  );
  if (lootOpportunity) {
    return lootOpportunity;
  }

  const dragonOpportunity = createWinningDragonOpportunity(
    state,
    action,
    activePlayer,
    config,
  );
  if (dragonOpportunity) {
    return dragonOpportunity;
  }

  if (fullyExplored) {
    return undefined;
  }

  return createExplorationOpportunity(state, action, activePlayer, config);
}

function createHealingOpportunity(
  state: GameState,
  action: GameAction,
  legalActions: readonly GameAction[],
  activePlayer: Player,
  config: AiHeuristicConfig,
): PriorityOpportunity | undefined {
  const needsUrgentHealing =
    activePlayer.hp <= config.criticalHp || activePlayer.isCursed;
  if (!needsUrgentHealing) {
    return undefined;
  }

  const healSelfAvailable = legalActions.some(
    (candidate) =>
      candidate.type === 'useHealingSpell' &&
      candidate.targetPlayerId === activePlayer.id,
  );
  if (healSelfAvailable) {
    return {
      issueType: 'missedHealingPriority',
      isSatisfied: () =>
        action.type === 'useHealingSpell' &&
        action.targetPlayerId === activePlayer.id,
    };
  }

  if (
    isHealingPosition(state, activePlayer) &&
    state.healingEndTurnSource !== 'combat_retreat_blocked'
  ) {
    return {
      issueType: 'missedHealingPriority',
      isSatisfied: () => action.type === 'endTurn',
    };
  }

  if (
    isHealingPosition(state, activePlayer) &&
    state.healingEndTurnSource === 'combat_retreat_blocked'
  ) {
    return undefined;
  }

  const reachableHealingTargets = collectReachableTargets(state).filter((target) =>
    isHealingTarget(state, target.position),
  );
  if (reachableHealingTargets.length === 0) {
    return undefined;
  }

  return {
    issueType: 'missedHealingPriority',
    isSatisfied: () =>
      actionAdvancesToAnyTarget(state, action, reachableHealingTargets) ||
      actionUsesWitchSwapToAnyTarget(state, action, reachableHealingTargets),
  };
}

function isAdvancingEndgameObjective(
  before: GameState,
  after: GameState,
  config: AiHeuristicConfig,
): boolean {
  const beforeActive = before.players[before.activePlayerIndex];
  const afterActive =
    after.players.find((player) => player.id === beforeActive.id) ?? beforeActive;
  const targetPositions = collectEndgameObjectiveTargets(
    before,
    beforeActive,
    config,
  );

  if (targetPositions.length === 0) {
    return false;
  }

  const beforeDistance = minimumStrategicDistanceToTargets(
    before,
    beforeActive,
    beforeActive.position,
    targetPositions,
  );
  const afterDistance = minimumStrategicDistanceToTargets(
    after,
    beforeActive,
    afterActive.position,
    targetPositions,
  );

  return (
    beforeDistance !== undefined &&
    afterDistance !== undefined &&
    afterDistance < beforeDistance
  );
}

function collectEndgameObjectiveTargets(
  state: GameState,
  activePlayer: Player,
  config: AiHeuristicConfig,
): BoardPosition[] {
  const healingTargets = needsHealing(activePlayer, config)
    ? getDiscoveredHealingPositions(state)
    : [];
  const chestTargets =
    activePlayer.inventory.keyCount > 0
      ? state.board
          .filter((tile) => tile.roomToken?.id === 'treasure_chest')
          .map((tile) => ({ boardX: tile.boardX, boardY: tile.boardY }))
      : [];
  const lootTargets = state.board
    .filter((tile) => {
      const item = tile.looseItems[0];
      return (
        !!item &&
        isMeaningfulUpgradeItem(activePlayer, item) &&
        isLootRacePlausible(
          state,
          activePlayer,
          { boardX: tile.boardX, boardY: tile.boardY },
        )
      );
    })
    .map((tile) => ({ boardX: tile.boardX, boardY: tile.boardY }));
  const combatTargets = state.board.flatMap((tile) => {
    if (tile.roomToken?.kind !== 'monster') {
      return [];
    }

    const monster = monsterDefinitions[tile.roomToken.id];
    const winChance = estimateCombatWinChance(activePlayer, monster.strength);
    const threshold =
      monster.id === 'dragon'
        ? config.minimumDragonWinChance
        : config.minimumRepeatCombatWinChance;

    if (winChance >= threshold) {
      return [{ boardX: tile.boardX, boardY: tile.boardY }];
    }

    if (monster.id === 'dragon' && winChance > 0) {
      return [{ boardX: tile.boardX, boardY: tile.boardY }];
    }

    return [];
  });

  return [...healingTargets, ...chestTargets, ...lootTargets, ...combatTargets].filter(
    (position, index, positions) =>
      positions.findIndex((candidate) => positionsEqual(candidate, position)) === index,
  );
}

function minimumStrategicDistanceToTargets(
  state: GameState,
  player: Player,
  from: BoardPosition,
  targets: readonly BoardPosition[],
): number | undefined {
  const distances = targets.flatMap((target) => {
    const distance = shortestStrategicDistance(
      state,
      { ...player, position: from },
      target,
    );

    return distance === undefined ? [] : [distance];
  });

  return distances.length > 0 ? Math.min(...distances) : undefined;
}

function createChestOpportunity(
  state: GameState,
  action: GameAction,
  activePlayer: Player,
): PriorityOpportunity | undefined {
  if (activePlayer.inventory.keyCount === 0) {
    return undefined;
  }

  if (canOpenChest(state)) {
    return {
      issueType: 'missedChestWithKey',
      isSatisfied: () => action.type === 'openChest',
    };
  }

  const reachableChestTargets = collectReachableTargets(state).filter((target) => {
    const tile = getTileAt(state.board, target.position);
    return tile?.roomToken?.id === 'treasure_chest';
  });

  if (reachableChestTargets.length === 0) {
    return undefined;
  }

  return {
    issueType: 'missedChestWithKey',
    isSatisfied: () =>
      actionAdvancesToAnyTarget(state, action, reachableChestTargets) ||
      actionUsesWitchSwapToAnyTarget(state, action, reachableChestTargets),
  };
}

function createUpgradeLootOpportunity(
  state: GameState,
  action: GameAction,
  activePlayer: Player,
): PriorityOpportunity | undefined {
  const currentTile = getTileAt(state.board, activePlayer.position);
  const currentItem = currentTile?.looseItems[0];
  if (currentItem && isMeaningfulUpgradeItem(activePlayer, currentItem)) {
    return {
      issueType: 'missedUpgradeLoot',
      isSatisfied: () => action.type === 'beginLoot',
    };
  }

  const reachableLootTargets = collectReachableTargets(state).filter((target) => {
    const tile = getTileAt(state.board, target.position);
    const item = tile?.looseItems[0];
    return (
      !!item &&
      isMeaningfulUpgradeItem(activePlayer, item) &&
      isLootRacePlausible(state, activePlayer, target.position)
    );
  });

  if (reachableLootTargets.length === 0) {
    return undefined;
  }

  return {
    issueType: 'missedUpgradeLoot',
    isSatisfied: () =>
      actionAdvancesToAnyTarget(state, action, reachableLootTargets) ||
      actionUsesWitchSwapToAnyTarget(state, action, reachableLootTargets),
  };
}

function createWinningDragonOpportunity(
  state: GameState,
  action: GameAction,
  activePlayer: Player,
  config: AiHeuristicConfig,
): PriorityOpportunity | undefined {
  if (!isWinningDragonWindow(state, activePlayer, config)) {
    return undefined;
  }

  if (
    state.combat?.monsterId === 'dragon' &&
    (state.phase === 'combat' || state.phase === 'optional_post_combat')
  ) {
    return {
      issueType: 'missedWinningDragonWindow',
      isSatisfied: () => action.type === 'resolveCombat',
    };
  }

  if (
    state.combat?.monsterId === 'dragon' &&
    state.phase === 'optional_monster_combat'
  ) {
    return {
      issueType: 'missedWinningDragonWindow',
      isSatisfied: () => action.type === 'startOptionalCombat',
    };
  }

  const reachableDragonTargets = collectReachableTargets(state).filter((target) => {
    const tile = getTileAt(state.board, target.position);
    return tile?.roomToken?.id === 'dragon';
  });
  if (reachableDragonTargets.length === 0) {
    return undefined;
  }

  return {
    issueType: 'missedWinningDragonWindow',
    isSatisfied: () =>
      actionAdvancesToAnyTarget(state, action, reachableDragonTargets) ||
      actionUsesWitchSwapToAnyTarget(state, action, reachableDragonTargets),
  };
}

function createExplorationOpportunity(
  state: GameState,
  action: GameAction,
  activePlayer: Player,
  config: AiHeuristicConfig,
): PriorityOpportunity | undefined {
  const reachableMonsterTargets = collectReachableTargets(state).filter((target) => {
    const tile = getTileAt(state.board, target.position);
    if (tile?.roomToken?.kind !== 'monster') {
      return false;
    }

    const monster = monsterDefinitions[tile.roomToken.id];
    const threshold =
      monster.id === 'dragon'
        ? config.minimumDragonWinChance
        : config.minimumRepeatCombatWinChance;

    return estimateCombatWinChance(activePlayer, monster.strength) >= threshold;
  });

  const reachableExplorationTargets = getReachableExplorationTargets(state);
  if (
    reachableMonsterTargets.length === 0 &&
    reachableExplorationTargets.length === 0
  ) {
    return undefined;
  }

  return {
    issueType: 'missedExplorationProgress',
    isSatisfied: () =>
      actionAdvancesToAnyTarget(state, action, reachableMonsterTargets) ||
      actionUsesWitchSwapToAnyTarget(state, action, reachableMonsterTargets) ||
      actionAdvancesToAnyExplorationTarget(action, reachableExplorationTargets),
  };
}

function collectReachableTargets(state: GameState): ReachableTarget[] {
  const reachablePositions = [
    state.players[state.activePlayerIndex].position,
    ...getReachableKnownMovePaths(state).map((entry) => entry.position),
  ];

  const uniquePositions = reachablePositions.filter(
    (position, index, positions) =>
      positions.findIndex((candidate) => positionsEqual(candidate, position)) === index,
  );

  return uniquePositions.map((position) => ({
    position,
  }));
}

function actionAdvancesToAnyTarget(
  state: GameState,
  action: GameAction,
  targets: readonly ReachableTarget[],
): boolean {
  if (action.type !== 'movePlayer') {
    return false;
  }

  let nextState: GameState;
  try {
    nextState = moveActivePlayer(state, action.target);
  } catch {
    return false;
  }
  const nextPosition = nextState.players[nextState.activePlayerIndex]?.position;

  return targets.some((target) => {
    if (nextPosition && positionsEqual(nextPosition, target.position)) {
      return true;
    }

    return getReachableKnownMovePaths(nextState).some((entry) =>
      positionsEqual(entry.position, target.position),
    );
  });
}

function actionUsesWitchSwapToAnyTarget(
  state: GameState,
  action: GameAction,
  targets: readonly ReachableTarget[],
): boolean {
  if (action.type !== 'swapWitchPosition') {
    return false;
  }

  const targetPlayer = state.players.find(
    (player) => player.id === action.targetPlayerId,
  );
  if (!targetPlayer) {
    return false;
  }

  return targets.some((target) => positionsEqual(target.position, targetPlayer.position));
}

function actionAdvancesToAnyExplorationTarget(
  action: GameAction,
  targets: ReturnType<typeof getReachableExplorationTargets>,
): boolean {
  if (action.type === 'declareExplorationDirection') {
    return targets.some(
      (target) =>
        target.path.length === 0 && target.direction === action.direction,
    );
  }

  if (action.type !== 'movePlayer') {
    return false;
  }

  return targets.some(
    (target) =>
      target.path[0] !== undefined &&
      positionsEqual(target.path[0].target, action.target),
  );
}

function isMeaningfulUpgradeItem(player: Player, item: Item): boolean {
  if (item.type === 'key') {
    return false;
  }

  if (item.type === 'weapon') {
    if (player.inventory.weapons.length < 2) {
      return true;
    }

    const weakestWeaponBonus = Math.min(
      ...player.inventory.weapons.map((weapon) => weapon.bonus),
    );
    return item.bonus > weakestWeaponBonus;
  }

  if (player.inventory.spells.length < 3) {
    return true;
  }

  const priority = item.spellKind === 'flame' ? 2 : 1;
  const lowestPriority = Math.min(
    ...player.inventory.spells.map((spell) => (spell.spellKind === 'flame' ? 2 : 1)),
  );

  return priority > lowestPriority;
}

function isLootRacePlausible(
  state: GameState,
  activePlayer: Player,
  targetPosition: BoardPosition,
): boolean {
  const activeArrival = estimateArrivalWindow(state, activePlayer, targetPosition);
  if (!activeArrival) {
    return false;
  }

  for (const player of state.players) {
    if (player.id === activePlayer.id) {
      continue;
    }

    const competitorArrival = estimateArrivalWindow(
      state,
      player,
      targetPosition,
    );
    if (
      competitorArrival &&
      compareArrivalWindows(competitorArrival, activeArrival) < 0
    ) {
      return false;
    }
  }

  return true;
}

type ArrivalWindow = {
  completionTurnOffset: number;
  stepsUsedOnArrivalTurn: number;
};

function estimateArrivalWindow(
  state: GameState,
  player: Player,
  target: BoardPosition,
): ArrivalWindow | undefined {
  const distance = shortestStrategicDistance(state, player, target);
  if (distance === undefined) {
    return undefined;
  }

  const turnOffsetToFirstTurn = getTurnOffsetFromActive(state, player.id);
  const stepsPerTurn = 4;
  const firstTurnBudget =
    player.id === state.players[state.activePlayerIndex]?.id
      ? state.remainingSteps
      : stepsPerTurn;

  if (distance <= firstTurnBudget) {
    return {
      completionTurnOffset: turnOffsetToFirstTurn,
      stepsUsedOnArrivalTurn: distance,
    };
  }

  const remainingDistance = distance - firstTurnBudget;
  const additionalTurnsNeeded = Math.ceil(remainingDistance / stepsPerTurn);

  return {
    completionTurnOffset:
      turnOffsetToFirstTurn + additionalTurnsNeeded * state.players.length,
    stepsUsedOnArrivalTurn:
      ((remainingDistance - 1) % stepsPerTurn) + 1,
  };
}

function getTurnOffsetFromActive(state: GameState, playerId: string): number {
  const playerIndex = state.players.findIndex((player) => player.id === playerId);
  if (playerIndex === -1) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    (playerIndex - state.activePlayerIndex + state.players.length) %
    state.players.length
  );
}

function compareArrivalWindows(left: ArrivalWindow, right: ArrivalWindow): number {
  if (left.completionTurnOffset !== right.completionTurnOffset) {
    return left.completionTurnOffset - right.completionTurnOffset;
  }

  return left.stepsUsedOnArrivalTurn - right.stepsUsedOnArrivalTurn;
}

function isWinningDragonWindow(
  state: GameState,
  activePlayer: Player,
  config: AiHeuristicConfig,
): boolean {
  const dragonWinChance = estimateCombatWinChance(
    activePlayer,
    monsterDefinitions.dragon.strength,
  );
  if (dragonWinChance < config.minimumDragonWinChance) {
    return false;
  }

  const projectedScore = activePlayer.treasurePoints + 1.5;
  const highestOtherScore = Math.max(
    0,
    ...state.players
      .filter((player) => player.id !== activePlayer.id)
      .map((player) => player.treasurePoints),
  );

  return projectedScore >= highestOtherScore;
}

function shortestStrategicDistance(
  state: GameState,
  player: Player,
  target: BoardPosition,
): number | undefined {
  const startTile = getTileAt(state.board, player.position);
  if (!startTile) {
    return undefined;
  }

  const teleportTiles = state.board.filter(
    (tile) => tile.discovered && tileBlueprints[tile.blueprintId].category === 'teleport',
  );
  const targetKey = positionKey(target);
  const visited = new Set([positionKey(player.position)]);
  let frontier = [{ position: player.position, distance: 0 }];

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
        const key = positionKey(nextPosition);
        const targetTile = getTileAt(state.board, nextPosition);

        if (!targetTile || visited.has(key)) {
          continue;
        }

        const canMoveToTarget =
          hasActiveHeroAbility(player, 'hero_mage') ||
          canTilesConnect(originTile, targetTile, direction);
        if (!canMoveToTarget) {
          continue;
        }

        visited.add(key);
        nextFrontier.push({
          position: nextPosition,
          distance: entry.distance + 1,
        });
      }

      if (tileBlueprints[originTile.blueprintId].category === 'teleport') {
        for (const tile of teleportTiles) {
          const key = positionKey(tile);
          if (visited.has(key) || positionsEqual(tile, entry.position)) {
            continue;
          }

          visited.add(key);
          nextFrontier.push({
            position: { boardX: tile.boardX, boardY: tile.boardY },
            distance: entry.distance + 1,
          });
        }
      }
    }

    frontier = nextFrontier;
  }

  return undefined;
}

function positionsEqual(left: BoardPosition, right: BoardPosition): boolean {
  return left.boardX === right.boardX && left.boardY === right.boardY;
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

function isHealingTarget(state: GameState, position: BoardPosition): boolean {
  return getDiscoveredHealingPositions(state).some((healingPosition) =>
    positionsEqual(healingPosition, position),
  );
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
