import { monsterDefinitions } from '../data/monsters';
import { tileBlueprints } from '../data/tiles';
import { getTileAt } from '../engine/core/board';
import type {
  BoardPosition,
  GameAction,
  GameState,
  Item,
  MonsterId,
  Player,
  Rotation,
  Token,
} from '../engine/core/types';
import { restoreSeededRng } from '../utils/rng';
import {
  calculateCombatTotal,
  getAutomaticFlameSpellCount,
  getCombatFlameSpellChoices,
  getCombatOutcomeForPlayer,
} from '../engine/combat/combat';
import {
  adjacentPosition,
  canExit,
  canTilesConnect,
} from '../engine/movement/topology';
import {
  getReachableExplorationTargets,
} from '../engine/movement/reachable';
import { getDiscoveredHealingPositions } from '../engine/rules/abilities';
import { hasActiveHeroAbility } from '../engine/rules/abilities';
import { isHealingPosition } from '../engine/rules/healing';
import { canStoreItem } from '../engine/rules/inventory';
import { isEndTurnBlockedPhase } from '../engine/turns/turns';
import { aiHeuristicConfig, type AiHeuristicConfig } from './config';
import { getActionTargetPosition, getLegalAiActions } from './legalActions';

export interface AiDecisionContext {
  state: GameState;
  playerId: string;
  legalActions: GameAction[];
}

export interface AiAgent {
  chooseAction(ctx: AiDecisionContext): GameAction;
}

type StrategicObjectiveType =
  | 'heal'
  | 'chest'
  | 'upgradeLoot'
  | 'winningDragon'
  | 'monster'
  | 'explore';

type StrategicObjective = {
  type: StrategicObjectiveType;
  targetPositions?: BoardPosition[];
  explorationTargets?: ReturnType<typeof getReachableExplorationTargets>;
};

const strategicDistanceCache = new WeakMap<GameState, Map<string, number | null>>();
const arrivalWindowCache = new WeakMap<GameState, Map<string, ArrivalWindow | null>>();

export const heuristicAiAgent: AiAgent = {
  chooseAction(ctx) {
    return chooseHeuristicAiAction(ctx.state, ctx.legalActions);
  },
};

function getDesperateRepeatCombatWinChance(
  baseConfig: AiHeuristicConfig,
): number {
  return Math.max(0.1, baseConfig.minimumRepeatCombatWinChance / 2);
}

export function getEffectiveAiHeuristicConfig(
  baseConfig: AiHeuristicConfig,
  staleActionCount = 0,
): AiHeuristicConfig {
  const isDesperate = staleActionCount >= baseConfig.staleActionThreshold;

  if (!isDesperate) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    minimumRepeatCombatWinChance:
      getDesperateRepeatCombatWinChance(baseConfig),
  };
}

function getMinimumCombatWinChance(
  monsterId: MonsterId,
  config: AiHeuristicConfig,
): number {
  return monsterId === 'dragon'
    ? config.minimumDragonWinChance
    : config.minimumRepeatCombatWinChance;
}

/**
 * Win-chance threshold at or above which the agent treats walking onto a
 * monster tile as desirable during movement scoring. In normal play the agent
 * demands a genuine coin-flip (`>= 0.5`) even when the raw combat threshold is
 * lower; only in desperation mode does it accept the bare combat threshold.
 *
 * Exported so simulation diagnostics measure "missed" monster targets with the
 * exact same yardstick the agent uses — otherwise the 0.3–0.5 band produces
 * systematic false positives (see `createExplorationOpportunity`).
 */
export function getMonsterMovementDesirabilityThreshold(
  monsterId: MonsterId,
  config: AiHeuristicConfig,
  isDesperate: boolean,
): number {
  const minimumCombatWinChance = getMinimumCombatWinChance(monsterId, config);

  return isDesperate
    ? minimumCombatWinChance
    : Math.max(0.5, minimumCombatWinChance);
}

export function estimateMonsterCombatWinChance(
  player: Player,
  monsterId: MonsterId,
): number {
  const monster = monsterDefinitions[monsterId];
  const automaticFlameBonus = getAutomaticFlameSpellCount(player);

  return estimateCombatWinChance(
    player,
    monster.strength,
    automaticFlameBonus,
  );
}

export function chooseHeuristicAiAction(
  state: GameState,
  legalActions = getLegalAiActions(state),
  baseConfig: AiHeuristicConfig = aiHeuristicConfig,
  staleActionCount = 0,
  recentPositionKeys: readonly string[] = [],
): GameAction {
  if (legalActions.length === 0) {
    throw new Error('AI has no legal actions');
  }

  const isDesperate = staleActionCount >= baseConfig.staleActionThreshold;
  const fullyExplored = state.tileStack.length === 0 && state.tokenBag.length === 0;
  const config = getEffectiveAiHeuristicConfig(baseConfig, staleActionCount);

  if (config.mistakeRate > 0) {
    const rng = restoreSeededRng(state.rng);

    if (rng.next() < config.mistakeRate) {
      return legalActions[rng.nextInt(legalActions.length)];
    }
  }

  const activePlayer = state.players[state.activePlayerIndex];

  if (activePlayer.skipNextTurn && !isEndTurnBlockedPhase(state.phase)) {
    return requireAction(legalActions, 'endTurn');
  }

  if (
    state.phase === 'combat' ||
    state.phase === 'optional_post_combat' ||
    state.phase === 'combat_curse_target' ||
    state.phase === 'combat_blade_reroll' ||
    state.phase === 'combat_valkyrie_reroll' ||
    state.phase === 'combat_witch_sacrifice' ||
    state.phase === 'combat_flame_spells'
  ) {
    return chooseCombatAction(state, legalActions, config, recentPositionKeys);
  }

  if (state.phase === 'loot_resolution') {
    return chooseLootAction(state, legalActions);
  }

  if (state.phase === 'resolve_room_token') {
    return requireAction(legalActions, 'resolveRoomToken');
  }

  if (state.phase === 'resolve_room_token_seeress_choice') {
    return chooseSeeressTokenAction(state, legalActions);
  }

  if (state.phase === 'choose_pending_tile_rotation') {
    return choosePlacementAction(state, legalActions);
  }

  const groundLootAction = chooseGroundLootAction(state, legalActions);

  if (groundLootAction) {
    return groundLootAction;
  }

  const strategicObjective = selectStrategicObjective(
    state,
    legalActions,
    config,
  );
  const objectiveAction = chooseActionForObjective(
    state,
    legalActions,
    strategicObjective,
    config,
  );

  if (objectiveAction) {
    return objectiveAction;
  }

  if (isDesperate && fullyExplored) {
    const desperateHealingSpellAction = chooseDesperateHealingSpellAction(
      state,
      legalActions,
    );

    if (desperateHealingSpellAction) {
      return desperateHealingSpellAction;
    }
  }

  if (!isDesperate) {
    const stalledEndTurnAction = chooseStalledEndTurnAction(
      state,
      legalActions,
      config,
    );

    if (stalledEndTurnAction) {
      return stalledEndTurnAction;
    }

    const healingEndTurnAction = chooseHealingEndTurnAction(
      state,
      legalActions,
      config,
    );

    if (healingEndTurnAction) {
      return healingEndTurnAction;
    }
  }

  const movementAction = chooseMovementAction(
    state,
    legalActions,
    config,
    strategicObjective,
    isDesperate,
    recentPositionKeys,
  );

  if (movementAction) {
    return movementAction;
  }

  return requireAction(legalActions, 'endTurn');
}

function chooseHealingSpellAction(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
): GameAction | undefined {
  const healingActions = legalActions.filter(
    (action) => action.type === 'useHealingSpell',
  );

  if (healingActions.length === 0) {
    return undefined;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const needsHealingNow =
    activePlayer.hp <= config.criticalHp ||
    activePlayer.isCursed ||
    activePlayer.hp < config.preferHealingBelowHp;

  return needsHealingNow
    ? healingActions.find(
        (action) =>
          action.type === 'useHealingSpell' &&
          action.targetPlayerId === activePlayer.id,
      )
    : undefined;
}

function chooseDesperateHealingSpellAction(
  state: GameState,
  legalActions: GameAction[],
): GameAction | undefined {
  const healingActions = legalActions.filter(
    (action) => action.type === 'useHealingSpell',
  );

  if (healingActions.length === 0) {
    return undefined;
  }

  const candidates = healingActions.flatMap((action) => {
    const targetPlayer = state.players.find(
      (player) => player.id === action.targetPlayerId,
    );

    return targetPlayer ? [{ action, targetPlayer }] : [];
  });

  const bestCandidate = candidates.sort((left, right) => {
    if (Number(right.targetPlayer.isCursed) !== Number(left.targetPlayer.isCursed)) {
      return Number(right.targetPlayer.isCursed) - Number(left.targetPlayer.isCursed);
    }

    const leftMissingHp = left.targetPlayer.maxHp - left.targetPlayer.hp;
    const rightMissingHp = right.targetPlayer.maxHp - right.targetPlayer.hp;

    if (rightMissingHp !== leftMissingHp) {
      return rightMissingHp - leftMissingHp;
    }

    const leftPlayerIndex = state.players.findIndex(
      (player) => player.id === left.targetPlayer.id,
    );
    const rightPlayerIndex = state.players.findIndex(
      (player) => player.id === right.targetPlayer.id,
    );

    if (leftPlayerIndex !== rightPlayerIndex) {
      return leftPlayerIndex - rightPlayerIndex;
    }

    return (
      left.action.healingPosition.boardX - right.action.healingPosition.boardX ||
      left.action.healingPosition.boardY - right.action.healingPosition.boardY
    );
  })[0];

  return bestCandidate?.action;
}

function chooseHealingEndTurnAction(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
): GameAction | undefined {
  const endTurnAction = legalActions.find((action) => action.type === 'endTurn');
  const activePlayer = state.players[state.activePlayerIndex];
  const healingNeeded = needsHealing(activePlayer, config);

  if (
    !endTurnAction ||
    !healingNeeded
  ) {
    return undefined;
  }

  if (isHealingPosition(state, activePlayer)) {
    return canReceiveHealingFromEndTurn(state) ? endTurnAction : undefined;
  }

  if (!hasHealingProgressMove(state, legalActions, activePlayer.position)) {
    return endTurnAction;
  }

  return undefined;
}

function chooseStalledEndTurnAction(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
): GameAction | undefined {
  const endTurnAction = legalActions.find((action) => action.type === 'endTurn');

  if (
    !endTurnAction ||
    state.tileStack.length > 0 ||
    state.tokenBag.length > 0 ||
    hasObjectiveProgressMove(state, legalActions, config)
  ) {
    return undefined;
  }

  return endTurnAction;
}

/**
 * The Seeress reveals both drawn room tokens and picks which one is placed.
 * Rather than blindly taking option 0, evaluate the two tokens from the active
 * player's perspective: a treasure chest is a controllable future reward and is
 * always preferred over spawning a monster; between two monsters the more
 * beatable one (higher win chance) is preferred. Ties fall back to the lower
 * index to stay deterministic.
 */
function chooseSeeressTokenAction(
  state: GameState,
  legalActions: GameAction[],
): GameAction {
  const drawnTokens = state.pendingSeeressRoomChoice?.drawnTokens;
  const activePlayer = state.players[state.activePlayerIndex];

  // A chest scores above any monster (win chance is at most 1); between two
  // monsters the higher win chance wins.
  const chestScore = 2;
  const scoreToken = (token: Token): number =>
    token.kind === 'chest'
      ? chestScore
      : estimateMonsterCombatWinChance(activePlayer, token.id);

  const preferredIndex =
    drawnTokens && scoreToken(drawnTokens[1]) > scoreToken(drawnTokens[0]) ? 1 : 0;

  return (
    legalActions.find(
      (action) =>
        action.type === 'chooseSeeressRoomToken' &&
        action.choiceIndex === preferredIndex,
    ) ?? requireAction(legalActions, 'chooseSeeressRoomToken')
  );
}

/**
 * True when ending the turn here is a deliberate choice by the agent rather
 * than giving up on available progress: either waiting for end-of-turn healing
 * (on or en route to a healing tile) or a fully explored board with no
 * objective-advancing move left. Exported so `isStalledTurn` in the
 * diagnostics does not flag these intentional waits as stalls.
 */
export function isIntentionalEndTurn(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
): boolean {
  return (
    chooseStalledEndTurnAction(state, legalActions, config) !== undefined ||
    chooseHealingEndTurnAction(state, legalActions, config) !== undefined
  );
}

function hasHealingProgressMove(
  state: GameState,
  legalActions: GameAction[],
  currentPosition: BoardPosition,
): boolean {
  const currentHealingDistance = distanceToNearestHealing(state, currentPosition);

  if (currentHealingDistance === undefined) {
    return true;
  }

  return legalActions
    .filter((action) => action.type === 'movePlayer')
    .some((action) => {
      const targetHealingDistance = distanceToNearestHealing(state, action.target);

      return (
        targetHealingDistance !== undefined &&
        targetHealingDistance < currentHealingDistance
      );
    });
}

function hasObjectiveProgressMove(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
): boolean {
  const activePlayer = state.players[state.activePlayerIndex];
  const objectiveTiles = getObjectiveTiles(state, activePlayer, config);
  const currentObjectiveDistance = distanceToNearestObjective(
    state,
    activePlayer.position,
    objectiveTiles,
    config,
  );

  if (currentObjectiveDistance === undefined) {
    return false;
  }

  return legalActions
    .filter((action) => action.type === 'movePlayer')
    .some((action) => {
      const targetObjectiveDistance = distanceToNearestObjective(
        state,
        action.target,
        objectiveTiles,
        config,
      );

      return (
        targetObjectiveDistance !== undefined &&
        targetObjectiveDistance < currentObjectiveDistance
      );
    });
}

function chooseCombatAction(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
  recentPositionKeys: readonly string[] = [],
): GameAction {
  if (state.phase === 'combat_valkyrie_reroll') {
    return chooseValkyrieRerollAction(state, legalActions, config);
  }

  if (state.phase === 'combat_blade_reroll') {
    return requireAction(legalActions, 'useBladeReroll');
  }

  if (state.phase === 'combat_witch_sacrifice') {
    return chooseWitchSacrificeAction(state, legalActions);
  }

  if (state.phase === 'combat_flame_spells') {
    return chooseCombatFlameSpellAction(state, legalActions, config);
  }

  if (state.phase === 'combat_curse_target') {
    const targetPlayerId = chooseCurseTargetPlayerId(
      state,
      state.players[state.activePlayerIndex],
    );

    return (
      legalActions.find(
        (action) =>
          action.type === 'selectCurseTarget' &&
          action.targetPlayerId === targetPlayerId,
      ) ?? requireAction(legalActions, 'selectCurseTarget')
    );
  }

  if (state.phase === 'optional_monster_combat') {
    const startCombatAction = requireAction(
      legalActions,
      'startOptionalCombat',
    );

    if (!state.combat) {
      return requireAction(legalActions, 'endTurn');
    }

    const activePlayer = state.players[state.activePlayerIndex];
    const monster = monsterDefinitions[state.combat.monsterId];
    const winChance = estimateMonsterCombatWinChance(
      activePlayer,
      monster.id,
    );
    const minimumWinChance = getMinimumCombatWinChance(monster.id, config);

    if (
      monster.id === 'dragon' &&
      shouldForceDragonEndgame(state, activePlayer, config)
    ) {
      return startCombatAction;
    }

    if (winChance >= minimumWinChance) {
      return startCombatAction;
    }

    const movementAction = chooseMovementAction(
      state,
      legalActions,
      config,
      undefined,
      false,
      recentPositionKeys,
    );

    if (movementAction) {
      return movementAction;
    }

    return requireAction(legalActions, 'endTurn');
  }

  const combatAction = requireAction(legalActions, 'resolveCombat');

  if (!state.combat) {
    return combatAction;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const monster = monsterDefinitions[state.combat.monsterId];
  const winChance = estimateMonsterCombatWinChance(
    activePlayer,
    monster.id,
  );

  if (state.phase === 'optional_post_combat') {
    const minimumWinChance = getMinimumCombatWinChance(monster.id, config);

    if (
      winChance < minimumWinChance &&
      !(
        monster.id === 'dragon' &&
        shouldForceDragonEndgame(state, activePlayer, config)
      )
    ) {
      return requireAction(legalActions, 'endTurn');
    }
  }

  return combatAction;
}

function chooseValkyrieRerollAction(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
): GameAction {
  if (!state.combat) {
    return requireAction(legalActions, 'useValkyrieReroll');
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const monster = monsterDefinitions[state.combat.monsterId];
  const winChance = estimateMonsterCombatWinChance(
    activePlayer,
    monster.id,
  );
  const minimumWinChance = getMinimumCombatWinChance(monster.id, config);

  if (winChance < minimumWinChance) {
    const declineAction = legalActions.find(
      (action) => action.type === 'declineValkyrieReroll',
    );

    if (declineAction) {
      return declineAction;
    }
  }

  return requireAction(legalActions, 'useValkyrieReroll');
}

function chooseWitchSacrificeAction(
  state: GameState,
  legalActions: GameAction[],
): GameAction {
  if (!state.combat?.initialRolledDice) {
    return requireAction(legalActions, 'declineWitchSacrifice');
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const monster = monsterDefinitions[state.combat.monsterId];
  const sacrificeTotal = calculateCombatTotal(
    activePlayer,
    state.combat.initialRolledDice,
    1 + (state.combat.pendingSeeressBonus ?? 0),
  );
  const sacrificeOutcome = getCombatOutcomeForPlayer(
    activePlayer,
    sacrificeTotal,
    monster.strength,
  );

  if (sacrificeOutcome === 'victory') {
    return requireAction(legalActions, 'useWitchSacrifice');
  }

  if (
    sacrificeOutcome === 'draw' &&
    activePlayer.inventory.spells.some((spell) => spell.spellKind === 'flame')
  ) {
    const winningWithFlame = Array.from(
      {
        length: activePlayer.inventory.spells.filter(
          (spell) => spell.spellKind === 'flame',
        ).length,
      },
      (_, index) => index + 1,
    ).some((flameSpellCount) => {
      const total = calculateCombatTotal(
        activePlayer,
        state.combat!.initialRolledDice!,
        flameSpellCount + 1 + (state.combat?.pendingSeeressBonus ?? 0),
      );

      return (
        getCombatOutcomeForPlayer(activePlayer, total, monster.strength) ===
        'victory'
      );
    });

    if (winningWithFlame) {
      return requireAction(legalActions, 'useWitchSacrifice');
    }
  }

  return requireAction(legalActions, 'declineWitchSacrifice');
}

function chooseCombatFlameSpellAction(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
): GameAction {
  const activePlayer = state.players[state.activePlayerIndex];
  const monster = state.combat
    ? monsterDefinitions[state.combat.monsterId]
    : undefined;
  const spellChoices = getCombatFlameSpellChoices(state).sort(
    (left, right) => left - right,
  );

  if (!monster || spellChoices.length === 0) {
    return requireAction(legalActions, 'resolveCombatWithoutFlameSpells');
  }

  if (hasActiveHeroAbility(activePlayer, 'hero_mage')) {
    return requireAction(legalActions, 'resolveCombatWithoutFlameSpells');
  }

  // Flame spells are the key to the dragon (strength 15). Against weaker
  // monsters spend them only to rescue an outright defeat (never to upgrade a
  // harmless draw) and only while keeping enough in reserve for a dragon that
  // is still in play. Once no dragon can appear, hoarding is pointless.
  const availableFlames = spellChoices[spellChoices.length - 1] ?? 0;
  const isWeakMonster = monster.strength <= 9;
  const flameReserve =
    isWeakMonster && isDragonThreatRemaining(state)
      ? config.flameSpellDragonReserve
      : 0;

  const outcomeWithFlames = (flameSpellCount: number): string | undefined => {
    if (!state.combat?.rolledDice) {
      return undefined;
    }

    const total = calculateCombatTotal(
      activePlayer,
      state.combat.rolledDice,
      flameSpellCount +
        (state.combat.pendingWitchSacrificeBonus ?? 0) +
        (state.combat.pendingSeeressBonus ?? 0),
    );

    return getCombatOutcomeForPlayer(activePlayer, total, monster.strength);
  };

  // Weak monsters only warrant flames when the unaided result would be a loss.
  if (isWeakMonster && outcomeWithFlames(0) !== 'defeat') {
    return requireAction(legalActions, 'resolveCombatWithoutFlameSpells');
  }

  const winningChoice = spellChoices.find(
    (flameSpellCount) =>
      availableFlames - flameSpellCount >= flameReserve &&
      outcomeWithFlames(flameSpellCount) === 'victory',
  );

  return winningChoice
    ? {
        type: 'resolveCombatWithFlameSpells',
        flameSpellCount: winningChoice,
      }
    : requireAction(legalActions, 'resolveCombatWithoutFlameSpells');
}

/**
 * A dragon is still worth hoarding flame spells for when one is present on the
 * board undefeated, or the remaining tile/token stacks could still reveal it.
 */
function isDragonThreatRemaining(state: GameState): boolean {
  const dragonOnBoard = state.board.some(
    (tile) => tile.roomToken?.id === 'dragon',
  );

  return (
    dragonOnBoard || state.tileStack.length > 0 || state.tokenBag.length > 0
  );
}

function chooseCurseTargetPlayerId(
  state: GameState,
  activePlayer: Player,
): string | undefined {
  if (state.combat?.monsterId !== 'mummified_priest') {
    return undefined;
  }

  return state.players
    .filter((player) => player.id !== activePlayer.id)
    .sort((left, right) => {
      if (right.treasurePoints !== left.treasurePoints) {
        return right.treasurePoints - left.treasurePoints;
      }

      const rightDragonChance = estimateCombatWinChance(
        right,
        monsterDefinitions.dragon.strength,
      );
      const leftDragonChance = estimateCombatWinChance(
        left,
        monsterDefinitions.dragon.strength,
      );

      if (rightDragonChance !== leftDragonChance) {
        return rightDragonChance - leftDragonChance;
      }

      return totalCombatBonus(right) - totalCombatBonus(left);
    })[0]?.id;
}

export function estimateCombatWinChance(
  player: Player,
  monsterStrength: number,
  flameSpellCount = 0,
): number {
  let wins = 0;

  for (let first = 1; first <= 6; first += 1) {
    for (let second = 1; second <= 6; second += 1) {
      const total = calculateCombatTotal(
        player,
        [first, second],
        flameSpellCount,
      );
      const outcome = getCombatOutcomeForPlayer(player, total, monsterStrength);

      if (outcome === 'victory') {
        wins += 1;
      }
    }
  }

  return wins / 36;
}

function choosePlacementAction(
  state: GameState,
  legalActions: GameAction[],
): GameAction {
  const placementActions = legalActions.filter(
    (action) => action.type === 'placePendingTile',
  );

  return placementActions
    .slice()
    .sort(
      (left, right) =>
        scorePlacementRotation(state, right.rotation) -
          scorePlacementRotation(state, left.rotation) ||
        left.rotation - right.rotation,
    )[0];
}

function scorePlacementRotation(state: GameState, rotation: Rotation): number {
  if (!state.pendingTile) {
    return 0;
  }

  const targetTile = {
    tileInstanceId: 'pending',
    blueprintId: state.pendingTile.blueprintId,
    rotation,
    boardX: state.pendingTile.target.boardX,
    boardY: state.pendingTile.target.boardY,
    discovered: true,
    looseItems: [],
  };

  return (['A', 'B', 'C', 'D'] as const).filter((direction) =>
    canExit(targetTile, direction),
  ).length;
}

function chooseMovementAction(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
  objective: StrategicObjective | undefined,
  isDesperate = false,
  recentPositionKeys: readonly string[] = [],
): GameAction | undefined {
  // Witch swaps are handled purely as objective-driven actions in
  // `chooseObjectiveSwapAction`. Excluding them here stops a swap from winning
  // generic movement scoring on local tile bonuses without a real strategic
  // gain (the source of low-value swaps).
  const movementActions = legalActions.filter(
    (action) =>
      action.type === 'movePlayer' ||
      action.type === 'declareExplorationDirection',
  );

  if (movementActions.length === 0) {
    return undefined;
  }

  const fullyExplored = state.tileStack.length === 0 && state.tokenBag.length === 0;
  const sortedActions = movementActions
    .map((action) => ({
      action,
      score: scoreMovementAction(
        state,
        action,
        config,
        objective,
        isDesperate,
        recentPositionKeys,
      ),
    }))
    .sort(
      (left, right) =>
        right.score - left.score || actionOrder(left.action) - actionOrder(right.action),
    );
  const bestAction = sortedActions[0];

  if (!bestAction) {
    return undefined;
  }

  if (objective && !Number.isFinite(bestAction.score) && fullyExplored) {
    return undefined;
  }

  if (
    !state.lastMoveFrom ||
    bestAction.action.type !== 'movePlayer' ||
    !isBacktrackMove(bestAction.action, state.lastMoveFrom)
  ) {
    return bestAction.action;
  }

  return (
    sortedActions.find(
      (entry) =>
        entry.action.type !== 'movePlayer' ||
        !isBacktrackMove(entry.action, state.lastMoveFrom!),
    )?.action ?? bestAction.action
  );
}

function chooseGroundLootAction(
  state: GameState,
  legalActions: GameAction[],
): GameAction | undefined {
  const beginLootAction = legalActions.find(
    (action) => action.type === 'beginLoot',
  );
  const activeTile = getTileAt(
    state.board,
    state.players[state.activePlayerIndex].position,
  );
  const item = activeTile?.looseItems[0];

  if (!beginLootAction || !item) {
    return undefined;
  }

  if (item.type === 'key') {
    return state.players[state.activePlayerIndex].inventory.keyCount === 0
      ? beginLootAction
      : undefined;
  }

  if (item.type === 'weapon') {
    const weapons = state.players[state.activePlayerIndex].inventory.weapons;

    if (weapons.length < 2) {
      return beginLootAction;
    }

    return weapons.some((weapon) => item.bonus > weapon.bonus)
      ? beginLootAction
      : undefined;
  }

  const spells = state.players[state.activePlayerIndex].inventory.spells;

  if (spells.length < 3) {
    return beginLootAction;
  }

  const spellPriority = {
    healing: 0,
    flame: 1,
  } as const;

  return spells.some(
    (spell) => spellPriority[item.spellKind] > spellPriority[spell.spellKind],
  )
    ? beginLootAction
    : undefined;
}

function chooseLootAction(
  state: GameState,
  legalActions: GameAction[],
): GameAction {
  const pendingLoot = state.pendingLoot;
  const activePlayer = state.players[state.activePlayerIndex];

  if (!pendingLoot) {
    return requireAction(legalActions, 'leaveLoot');
  }

  if (pendingLoot.item.type === 'key') {
    return canStoreItem(activePlayer, pendingLoot.item)
      ? requireAction(legalActions, 'takeLoot')
      : requireAction(legalActions, 'leaveLoot');
  }

  if (pendingLoot.item.type === 'weapon') {
    if (canStoreItem(activePlayer, pendingLoot.item)) {
      return requireAction(legalActions, 'takeLoot');
    }

    const worstWeapon = activePlayer.inventory.weapons
      .map((weapon, index) => ({ index, bonus: weapon.bonus }))
      .sort((left, right) => left.bonus - right.bonus)[0];

    if (worstWeapon && pendingLoot.item.bonus > worstWeapon.bonus) {
      return (
        legalActions.find(
          (action) =>
            action.type === 'swapLoot' &&
            action.inventorySlot.kind === 'weapon' &&
            action.inventorySlot.index === worstWeapon.index,
        ) ?? requireAction(legalActions, 'leaveLoot')
      );
    }

    return requireAction(legalActions, 'leaveLoot');
  }

  if (canStoreItem(activePlayer, pendingLoot.item)) {
    return requireAction(legalActions, 'takeLoot');
  }

  const spellPriority = {
    healing: 0,
    flame: 1,
  } as const;
  const worstSpell = activePlayer.inventory.spells
    .map((spell, index) => ({
      index,
      priority: spellPriority[spell.spellKind],
    }))
    .sort((left, right) => left.priority - right.priority)[0];

  if (
    worstSpell &&
    spellPriority[pendingLoot.item.spellKind] > worstSpell.priority
  ) {
    return (
      legalActions.find(
        (action) =>
          action.type === 'swapLoot' &&
          action.inventorySlot.kind === 'spell' &&
          action.inventorySlot.index === worstSpell.index,
      ) ?? requireAction(legalActions, 'leaveLoot')
    );
  }

  return requireAction(legalActions, 'leaveLoot');
}

function selectStrategicObjective(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
): StrategicObjective | undefined {
  const activePlayer = state.players[state.activePlayerIndex];
  const fullyExplored = state.tileStack.length === 0 && state.tokenBag.length === 0;

  return (
    createHealingObjective(state, legalActions, activePlayer, config) ??
    createChestObjective(state, legalActions, activePlayer) ??
    createUpgradeLootObjective(state, legalActions, activePlayer) ??
    createWinningDragonObjective(state, legalActions, activePlayer, config) ??
    createMonsterObjective(state, legalActions, activePlayer, config) ??
    (fullyExplored
      ? undefined
      : createExplorationObjective(state))
  );
}

function chooseActionForObjective(
  state: GameState,
  legalActions: GameAction[],
  objective: StrategicObjective | undefined,
  config: AiHeuristicConfig,
): GameAction | undefined {
  if (!objective) {
    return undefined;
  }

  const activePlayer = state.players[state.activePlayerIndex];

  switch (objective.type) {
    case 'heal': {
      const healingSpellAction = chooseHealingSpellAction(
        state,
        legalActions,
        config,
      );
      if (healingSpellAction) {
        return healingSpellAction;
      }

      if (
        isHealingPosition(state, activePlayer) &&
        canReceiveHealingFromEndTurn(state)
      ) {
        return legalActions.find((action) => action.type === 'endTurn');
      }

      return chooseObjectiveSwapAction(state, legalActions, objective, config);
    }
    case 'chest':
      return (
        legalActions.find((action) => action.type === 'openChest') ??
        chooseObjectiveSwapAction(state, legalActions, objective, config)
      );
    case 'upgradeLoot':
      return (
        chooseGroundLootAction(state, legalActions) ??
        chooseObjectiveSwapAction(state, legalActions, objective, config)
      );
    case 'winningDragon':
      if (
        state.phase === 'optional_monster_combat' &&
        state.combat?.monsterId === 'dragon'
      ) {
        return legalActions.find((action) => action.type === 'startOptionalCombat');
      }

      return chooseObjectiveSwapAction(state, legalActions, objective, config);
    case 'monster':
      if (
        state.phase === 'optional_monster_combat' &&
        state.combat &&
        state.combat.monsterId !== 'dragon'
      ) {
        return legalActions.find((action) => action.type === 'startOptionalCombat');
      }

      return chooseObjectiveSwapAction(state, legalActions, objective, config);
    case 'explore':
      return undefined;
  }
}

function createHealingObjective(
  state: GameState,
  legalActions: GameAction[],
  activePlayer: Player,
  config: AiHeuristicConfig,
): StrategicObjective | undefined {
  if (!needsHealing(activePlayer, config)) {
    return undefined;
  }

  const healingSpellAction = chooseHealingSpellAction(state, legalActions, config);
  if (healingSpellAction) {
    return {
      type: 'heal',
      targetPositions: [activePlayer.position],
    };
  }

  if (isHealingPosition(state, activePlayer) && canReceiveHealingFromEndTurn(state)) {
    return {
      type: 'heal',
      targetPositions: [activePlayer.position],
    };
  }

  const reachableHealingTargets = getDiscoveredHealingPositions(state);
  const targetPositions = filterAdvancingObjectiveTargets(
    state,
    legalActions,
    activePlayer,
    reachableHealingTargets,
  );

  return targetPositions.length > 0
    ? {
        type: 'heal',
        targetPositions,
      }
    : undefined;
}

function createChestObjective(
  state: GameState,
  legalActions: GameAction[],
  activePlayer: Player,
): StrategicObjective | undefined {
  if (activePlayer.inventory.keyCount === 0) {
    return undefined;
  }

  if (legalActions.some((action) => action.type === 'openChest')) {
    return {
      type: 'chest',
      targetPositions: [activePlayer.position],
    };
  }

  const reachableChestTargets = state.board
    .filter((tile) => tile.roomToken?.id === 'treasure_chest')
    .map((tile) => ({ boardX: tile.boardX, boardY: tile.boardY }));
  const targetPositions = filterAdvancingObjectiveTargets(
    state,
    legalActions,
    activePlayer,
    reachableChestTargets,
  );

  return targetPositions.length > 0
    ? {
        type: 'chest',
        targetPositions,
      }
    : undefined;
}

function createUpgradeLootObjective(
  state: GameState,
  legalActions: GameAction[],
  activePlayer: Player,
): StrategicObjective | undefined {
  if (chooseGroundLootAction(state, legalActions)) {
    return {
      type: 'upgradeLoot',
      targetPositions: [activePlayer.position],
    };
  }

  const reachableLootTargets = state.board
    .filter((tile) => {
      const item = tile.looseItems[0];

      return (
        !!item &&
        isMeaningfulUpgradeItem(activePlayer, item) &&
        isLootRacePlausible(state, activePlayer, tile, item)
      );
    })
    .map((tile) => ({ boardX: tile.boardX, boardY: tile.boardY }));
  const targetPositions = filterAdvancingObjectiveTargets(
    state,
    legalActions,
    activePlayer,
    reachableLootTargets,
  );

  return targetPositions.length > 0
    ? {
        type: 'upgradeLoot',
        targetPositions,
      }
    : undefined;
}

function createWinningDragonObjective(
  state: GameState,
  legalActions: GameAction[],
  activePlayer: Player,
  config: AiHeuristicConfig,
): StrategicObjective | undefined {
  const forcedDragonEndgame = shouldForceDragonEndgame(state, activePlayer, config);
  if (!isWinningDragonWindow(state, activePlayer, config) && !forcedDragonEndgame) {
    return undefined;
  }

  if (
    state.phase === 'optional_monster_combat' &&
    state.combat?.monsterId === 'dragon' &&
    legalActions.some((action) => action.type === 'startOptionalCombat')
  ) {
    return {
      type: 'winningDragon',
      targetPositions: [activePlayer.position],
    };
  }

  const reachableDragonTargets = state.board
    .filter((tile) => tile.roomToken?.id === 'dragon')
    .map((tile) => ({ boardX: tile.boardX, boardY: tile.boardY }));
  const targetPositions = filterAdvancingObjectiveTargets(
    state,
    legalActions,
    activePlayer,
    reachableDragonTargets,
  );

  return targetPositions.length > 0
    ? {
        type: 'winningDragon',
        targetPositions,
      }
    : undefined;
}

function createMonsterObjective(
  state: GameState,
  legalActions: GameAction[],
  activePlayer: Player,
  config: AiHeuristicConfig,
): StrategicObjective | undefined {
  if (
    state.phase === 'optional_monster_combat' &&
    state.combat?.monsterId !== 'dragon' &&
    legalActions.some((action) => action.type === 'startOptionalCombat')
  ) {
    const monsterId = state.combat?.monsterId;
    if (!monsterId) {
      return undefined;
    }

    const monster = monsterDefinitions[monsterId];
    const winChance = estimateMonsterCombatWinChance(activePlayer, monster.id);

    if (winChance >= getMinimumCombatWinChance(monster.id, config)) {
      return {
        type: 'monster',
        targetPositions: [activePlayer.position],
      };
    }
  }

  const reachableMonsterTargets = state.board
    .filter((tile) => {
      if (tile.roomToken?.kind !== 'monster' || tile.roomToken.id === 'dragon') {
        return false;
      }

      const monster = monsterDefinitions[tile.roomToken.id];
      const winChance = estimateMonsterCombatWinChance(activePlayer, monster.id);

      return winChance >= getMinimumCombatWinChance(monster.id, config);
    })
    .map((tile) => ({ boardX: tile.boardX, boardY: tile.boardY }));
  const targetPositions = filterAdvancingObjectiveTargets(
    state,
    legalActions,
    activePlayer,
    reachableMonsterTargets,
  );

  return targetPositions.length > 0
    ? {
        type: 'monster',
        targetPositions,
      }
    : undefined;
}

function createExplorationObjective(
  state: GameState,
): StrategicObjective | undefined {
  const explorationTargets = getReachableExplorationTargets(state);

  return explorationTargets.length > 0
    ? {
        type: 'explore',
        explorationTargets,
      }
    : undefined;
}

function chooseObjectiveSwapAction(
  state: GameState,
  legalActions: GameAction[],
  objective: StrategicObjective,
  config: AiHeuristicConfig,
): GameAction | undefined {
  if (!objective.targetPositions) {
    return undefined;
  }

  // Only swap toward objectives that represent a fixed board destination and
  // whose value the diagnostics also credit. Opportunistic swaps toward
  // monsters or loot are handled (or skipped) by ordinary movement instead.
  if (
    objective.type !== 'heal' &&
    objective.type !== 'chest' &&
    objective.type !== 'winningDragon'
  ) {
    return undefined;
  }

  const swapActions = legalActions.filter(
    (action) => action.type === 'swapWitchPosition',
  );
  if (swapActions.length === 0) {
    return undefined;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const targets = objective.targetPositions;
  const distanceFrom = (from: BoardPosition): number | undefined => {
    const distances = targets.flatMap((target) => {
      const distance = shortestStrategicDistanceFromPosition(
        state,
        activePlayer,
        from,
        target,
      );

      return distance === undefined ? [] : [distance];
    });

    return distances.length > 0 ? Math.min(...distances) : undefined;
  };

  const currentDistance = distanceFrom(activePlayer.position) ?? Number.POSITIVE_INFINITY;

  let bestAction: GameAction | undefined;
  let bestGain = Number.NEGATIVE_INFINITY;

  for (const action of swapActions) {
    const targetPosition = getActionTargetPosition(state, action);
    if (!targetPosition) {
      continue;
    }

    const swappedDistance = distanceFrom(targetPosition);
    if (swappedDistance === undefined) {
      continue;
    }

    const gain = currentDistance - swappedDistance;
    // Accept the swap if it meaningfully shortens the route OR lands directly
    // on the objective (reaching it this turn), which is worth it even when the
    // raw distance gain is only one step.
    const isWorthwhile =
      swappedDistance === 0 || gain >= config.witchSwapMinimumDistanceGain;

    if (isWorthwhile && gain > bestGain) {
      bestGain = gain;
      bestAction = action;
    }
  }

  return bestAction;
}

function filterAdvancingObjectiveTargets(
  state: GameState,
  legalActions: GameAction[],
  activePlayer: Player,
  targetPositions: readonly BoardPosition[],
): BoardPosition[] {
  return targetPositions.filter((targetPosition) =>
    hasAdvancingObjectiveAction(state, legalActions, activePlayer, targetPosition),
  );
}

function hasAdvancingObjectiveAction(
  state: GameState,
  legalActions: GameAction[],
  activePlayer: Player,
  targetPosition: BoardPosition,
): boolean {
  const currentDistance = shortestStrategicDistance(
    state,
    activePlayer,
    targetPosition,
  );

  if (currentDistance === undefined) {
    return false;
  }

  return legalActions.some((action) => {
    const actionTargetPosition = getActionTargetPosition(state, action);

    if (!actionTargetPosition) {
      return false;
    }

    if (positionsEqual(actionTargetPosition, targetPosition)) {
      return true;
    }

    if (
      action.type !== 'movePlayer' &&
      action.type !== 'swapWitchPosition'
    ) {
      return false;
    }

    const nextDistance = shortestStrategicDistanceFromPosition(
      state,
      activePlayer,
      actionTargetPosition,
      targetPosition,
    );

    return nextDistance !== undefined && nextDistance < currentDistance;
  });
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
  item: Item,
): boolean {
  const activeArrival = estimateArrivalWindow(state, activePlayer, targetPosition);
  if (!activeArrival) {
    return false;
  }

  for (const player of state.players) {
    if (player.id === activePlayer.id) {
      continue;
    }

    // A rival who cannot use the item will not race for it, so it does not
    // make the pursuit implausible even if that rival happens to be closer.
    if (!isMeaningfulUpgradeItem(player, item)) {
      continue;
    }

    const competitorArrival = estimateArrivalWindow(state, player, targetPosition);
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
  const cacheKey = `${player.id}|${positionKey(target)}`;
  const cachedArrivalWindow = arrivalWindowCache.get(state)?.get(cacheKey);
  if (cachedArrivalWindow !== undefined) {
    return cachedArrivalWindow ?? undefined;
  }

  const distance = shortestStrategicDistance(state, player, target);
  if (distance === undefined) {
    getOrCreateArrivalWindowCache(state).set(cacheKey, null);
    return undefined;
  }

  const turnOffsetToFirstTurn = getTurnOffsetFromActive(state, player.id);
  const stepsPerTurn = 4;
  const firstTurnBudget =
    player.id === state.players[state.activePlayerIndex]?.id
      ? state.remainingSteps
      : stepsPerTurn;

  if (distance <= firstTurnBudget) {
    const arrivalWindow = {
      completionTurnOffset: turnOffsetToFirstTurn,
      stepsUsedOnArrivalTurn: distance,
    };
    getOrCreateArrivalWindowCache(state).set(cacheKey, arrivalWindow);

    return arrivalWindow;
  }

  const remainingDistance = distance - firstTurnBudget;
  const additionalTurnsNeeded = Math.ceil(remainingDistance / stepsPerTurn);

  const arrivalWindow = {
    completionTurnOffset:
      turnOffsetToFirstTurn + additionalTurnsNeeded * state.players.length,
    stepsUsedOnArrivalTurn:
      ((remainingDistance - 1) % stepsPerTurn) + 1,
  };
  getOrCreateArrivalWindowCache(state).set(cacheKey, arrivalWindow);

  return arrivalWindow;
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

function scoreMovementAction(
  state: GameState,
  action: GameAction,
  config: AiHeuristicConfig,
  objective: StrategicObjective | undefined,
  isDesperate: boolean,
  recentPositionKeys: readonly string[] = [],
): number {
  const objectiveScore = scoreStrategicObjectiveAction(
    state,
    action,
    objective,
    config,
  );

  if (objectiveScore === Number.NEGATIVE_INFINITY) {
    return objectiveScore;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const targetPosition = getActionTargetPosition(state, action);

  if (!targetPosition) {
    return objectiveScore;
  }

  const healingNeeded = needsHealing(activePlayer, config) && !isDesperate;

  if (healingNeeded) {
    const healingDistance = distanceToNearestHealing(state, targetPosition);

    if (healingDistance !== undefined) {
      return config.knownHealingBonus - healingDistance;
    }
  }

  const targetTile = getTileAt(state.board, targetPosition);
  const currentFrontierDistance = distanceToNearestFrontier(
    state,
    activePlayer.position,
  );
  const targetFrontierDistance = distanceToNearestFrontier(
    state,
    targetPosition,
  );
  let score = 0;

  if (
    action.type !== 'swapWitchPosition' &&
    state.tileStack.length > 0 &&
    currentFrontierDistance !== undefined &&
    targetFrontierDistance !== undefined
  ) {
    if (targetFrontierDistance < currentFrontierDistance) {
      score +=
        config.exploreTileBonus +
        currentFrontierDistance -
        targetFrontierDistance;
    } else if (targetFrontierDistance > currentFrontierDistance) {
      score -= 1;
    }
  }

  if (targetTile?.roomToken?.id === 'treasure_chest') {
    score +=
      activePlayer.inventory.keyCount > 0
        ? config.knownChestBonus
        : config.knownChestBonus / 3;
  }

  if (targetTile?.roomToken?.kind === 'monster') {
    const monster = monsterDefinitions[targetTile.roomToken.id];
    const winChance = estimateMonsterCombatWinChance(activePlayer, monster.id);
    const minimumDesirableWinChance = getMonsterMovementDesirabilityThreshold(
      monster.id,
      config,
      isDesperate,
    );

    score +=
      winChance >= minimumDesirableWinChance
        ? config.exploreRoomBonus
        : config.knownMonsterPenalty;
  }

  if (healingNeeded && isHealingTarget(state, targetPosition)) {
    score += config.knownHealingBonus;
  }

  if (
    state.lastMoveFrom &&
    targetPosition.boardX === state.lastMoveFrom.boardX &&
    targetPosition.boardY === state.lastMoveFrom.boardY
  ) {
    score += config.backtrackPenalty;
  }

  // Gentle anti-cycle nudge for the 3+ tile loops the single-step backtrack
  // check misses. The immediate reversal (`lastMoveFrom`) is already penalised
  // above, so this adds only a small flat penalty for stepping back onto a tile
  // vacated two or more moves ago. It stays a local tie-breaker and never
  // outweighs a legitimate exploration step toward the frontier.
  if (recentPositionKeys.length > 0) {
    const targetKey = `${targetPosition.boardX},${targetPosition.boardY}`;
    const recencyIndex = recentPositionKeys.indexOf(targetKey);
    const stepsAgo = recentPositionKeys.length - recencyIndex; // 1 = most recent

    if (recencyIndex >= 0 && stepsAgo >= 2) {
      score += config.backtrackPenalty;
    }
  }

  return objectiveScore * 100 + score;
}

function scoreStrategicObjectiveAction(
  state: GameState,
  action: GameAction,
  objective: StrategicObjective | undefined,
  config: AiHeuristicConfig,
): number {
  if (!objective) {
    return 0;
  }

  switch (objective.type) {
    case 'heal':
    case 'chest':
    case 'upgradeLoot':
    case 'winningDragon':
    case 'monster':
      return scorePositionObjectiveAction(state, action, objective, config);
    case 'explore':
      return scoreExplorationObjectiveAction(action, objective);
  }
}

function scorePositionObjectiveAction(
  state: GameState,
  action: GameAction,
  objective: StrategicObjective,
  config: AiHeuristicConfig,
): number {
  const activePlayer = state.players[state.activePlayerIndex];
  const targetPositions = objective.targetPositions ?? [];

  if (targetPositions.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  if (action.type === 'declareExplorationDirection') {
    return Number.NEGATIVE_INFINITY;
  }

  const currentDistance = minimumStrategicDistanceToTargets(
    state,
    activePlayer,
    activePlayer.position,
    targetPositions,
  );
  const targetPosition = getActionTargetPosition(state, action);
  if (!targetPosition) {
    return Number.NEGATIVE_INFINITY;
  }

  if (
    targetPositions.some((position) => positionsEqual(position, targetPosition))
  ) {
    return config.objectiveProgressBonus + 5;
  }

  if (action.type !== 'movePlayer') {
    return Number.NEGATIVE_INFINITY;
  }

  const targetDistance = minimumStrategicDistanceToTargets(
    state,
    activePlayer,
    targetPosition,
    targetPositions,
  );

  if (currentDistance === undefined || targetDistance === undefined) {
    return Number.NEGATIVE_INFINITY;
  }

  return targetDistance < currentDistance
    ? config.objectiveProgressBonus + currentDistance - targetDistance
    : Number.NEGATIVE_INFINITY;
}

function scoreExplorationObjectiveAction(
  action: GameAction,
  objective: StrategicObjective,
): number {
  const targets = objective.explorationTargets ?? [];

  if (targets.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  if (action.type === 'declareExplorationDirection') {
    return targets.some(
      (target) => target.path.length === 0 && target.direction === action.direction,
    )
      ? 10
      : Number.NEGATIVE_INFINITY;
  }

  if (action.type !== 'movePlayer') {
    return Number.NEGATIVE_INFINITY;
  }

  const matchingTarget = targets.find(
    (target) =>
      target.path[0] !== undefined &&
      positionsEqual(target.path[0].target, action.target),
  );

  return matchingTarget
    ? 10 - matchingTarget.path.length
    : Number.NEGATIVE_INFINITY;
}

function distanceToNearestFrontier(
  state: GameState,
  position: BoardPosition,
): number | undefined {
  if (state.tileStack.length === 0) {
    return undefined;
  }

  return distanceToNearestTile(state, position, (tile) =>
    hasUnexploredExit(state, tile),
  );
}

function hasUnexploredExit(
  state: GameState,
  tile: GameState['board'][number],
): boolean {
  return (['A', 'B', 'C', 'D'] as const).some((direction) => {
    const targetPosition = adjacentPosition(tile, direction);

    return canExit(tile, direction) && !getTileAt(state.board, targetPosition);
  });
}

function distanceToNearestObjective(
  state: GameState,
  position: BoardPosition,
  objectiveTiles: GameState['board'],
  config: AiHeuristicConfig,
): number | undefined {
  const distances = objectiveTiles.flatMap((tile) => {
    const distance = shortestKnownPathDistance(state, position, tile);

    return distance === undefined ? [] : [distance - objectivePriority(tile, config)];
  });

  return distances.length > 0 ? Math.min(...distances) : undefined;
}

function getObjectiveTiles(
  state: GameState,
  player: Player,
  config: AiHeuristicConfig,
): GameState['board'] {
  const allObjectiveTiles = state.board.filter((tile) =>
    isObjectiveTile(tile, player, config),
  );
  const shouldDelayDragonObjective =
    state.tileStack.length === 0 &&
    state.tokenBag.length === 0 &&
    estimateCombatWinChance(player, monsterDefinitions.dragon.strength) <
      config.minimumDragonWinChance;

  if (!shouldDelayDragonObjective) {
    return allObjectiveTiles;
  }

  const nonDragonObjectiveTiles = allObjectiveTiles.filter(
    (tile) => tile.roomToken?.id !== 'dragon',
  );

  if (nonDragonObjectiveTiles.length > 0) {
    return nonDragonObjectiveTiles;
  }

  return shouldForceDragonEndgame(state, player, config)
    ? allObjectiveTiles.filter((tile) => tile.roomToken?.id === 'dragon')
    : [];
}

function isObjectiveTile(
  tile: GameState['board'][number],
  player: Player,
  config: AiHeuristicConfig,
): boolean {
  if (tile.roomToken?.id === 'treasure_chest') {
    return player.inventory.keyCount > 0;
  }

  if (tile.roomToken?.kind !== 'monster') {
    return false;
  }

  const monster = monsterDefinitions[tile.roomToken.id];
  const winChance = estimateMonsterCombatWinChance(player, monster.id);
  const minimumWinChance = getMinimumCombatWinChance(monster.id, config);

  return winChance >= minimumWinChance;
}

function objectivePriority(
  tile: GameState['board'][number],
  config: AiHeuristicConfig,
): number {
  return tile.roomToken?.id === 'dragon' ? config.dragonObjectiveBonus : 0;
}

export function shouldForceDragonEndgame(
  state: GameState,
  player: Player,
  config: AiHeuristicConfig,
): boolean {
  if (state.tileStack.length > 0 || state.tokenBag.length > 0) {
    return false;
  }

  const dragonTiles = state.board.filter((tile) => tile.roomToken?.id === 'dragon');

  if (dragonTiles.length === 0) {
    return false;
  }

  const otherObjectiveTiles = state.board.filter(
    (tile) =>
      tile.roomToken?.id !== 'dragon' && isObjectiveTile(tile, player, config),
  );

  if (otherObjectiveTiles.length > 0) {
    return false;
  }

  const dragonStrength = monsterDefinitions.dragon.strength;
  const playerWinChance = estimateCombatWinChance(player, dragonStrength);

  if (playerWinChance <= 0) {
    return false;
  }

  const bestDragonWinChance = Math.max(
    ...state.players.map((candidate) =>
      estimateCombatWinChance(candidate, dragonStrength),
    ),
  );

  return (
    playerWinChance >= bestDragonWinChance &&
    playerWinChance < config.minimumDragonWinChance
  );
}

function distanceToNearestTile(
  state: GameState,
  position: BoardPosition,
  predicate: (tile: GameState['board'][number]) => boolean,
): number | undefined {
  const distances = state.board.flatMap((tile) => {
    if (!predicate(tile)) {
      return [];
    }

    const distance = shortestKnownPathDistance(state, position, tile);

    return distance === undefined ? [] : [distance];
  });

  return distances.length > 0 ? Math.min(...distances) : undefined;
}

function shortestKnownPathDistance(
  state: GameState,
  from: BoardPosition,
  target: BoardPosition,
): number | undefined {
  return shortestStrategicDistanceFromPosition(
    state,
    state.players[state.activePlayerIndex],
    from,
    target,
  );
}

function shortestStrategicDistance(
  state: GameState,
  player: Player,
  target: BoardPosition,
): number | undefined {
  return shortestStrategicDistanceFromPosition(
    state,
    player,
    player.position,
    target,
  );
}

function shortestStrategicDistanceFromPosition(
  state: GameState,
  player: Player,
  from: BoardPosition,
  target: BoardPosition,
): number | undefined {
  const cacheKey = `${player.id}|${positionKey(from)}|${positionKey(target)}`;
  const cachedDistance = strategicDistanceCache.get(state)?.get(cacheKey);
  if (cachedDistance !== undefined) {
    return cachedDistance ?? undefined;
  }

  const startTile = getTileAt(state.board, from);

  if (!startTile) {
    getOrCreateStrategicDistanceCache(state).set(cacheKey, null);
    return undefined;
  }

  const teleportTiles = state.board.filter(
    (tile) => tile.discovered && tileBlueprints[tile.blueprintId].category === 'teleport',
  );
  const targetKey = positionKey(target);
  const visited = new Set([positionKey(from)]);
  let frontier = [{ position: from, distance: 0 }];

  while (frontier.length > 0) {
    const nextFrontier: typeof frontier = [];

    for (const entry of frontier) {
      if (positionKey(entry.position) === targetKey) {
        getOrCreateStrategicDistanceCache(state).set(cacheKey, entry.distance);
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

        if (
          !targetTile ||
          visited.has(key) ||
          !(
            hasActiveHeroAbility(player, 'hero_mage') ||
            canTilesConnect(originTile, targetTile, direction)
          )
        ) {
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

  getOrCreateStrategicDistanceCache(state).set(cacheKey, null);
  return undefined;
}

function positionKey(position: BoardPosition): string {
  return `${position.boardX},${position.boardY}`;
}

function distanceToNearestHealing(
  state: GameState,
  position: BoardPosition,
): number | undefined {
  const distances = getDiscoveredHealingPositions(state).flatMap(
    (healingPosition) => {
      const distance = shortestKnownPathDistance(state, position, healingPosition);

      return distance === undefined ? [] : [distance];
    },
  );

  return distances.length > 0 ? Math.min(...distances) : undefined;
}

function minimumStrategicDistanceToTargets(
  state: GameState,
  player: Player,
  from: BoardPosition,
  targets: readonly BoardPosition[],
): number | undefined {
  const distances = targets.flatMap((target) => {
    const distance = shortestStrategicDistanceFromPosition(state, player, from, target);

    return distance === undefined ? [] : [distance];
  });

  return distances.length > 0 ? Math.min(...distances) : undefined;
}

function isHealingTarget(state: GameState, position: BoardPosition): boolean {
  return getDiscoveredHealingPositions(state).some(
    (healingPosition) =>
      healingPosition.boardX === position.boardX &&
      healingPosition.boardY === position.boardY,
  );
}

function canReceiveHealingFromEndTurn(state: GameState): boolean {
  return state.healingEndTurnSource !== 'combat_retreat_blocked';
}

function positionsEqual(left: BoardPosition, right: BoardPosition): boolean {
  return left.boardX === right.boardX && left.boardY === right.boardY;
}

function totalCombatBonus(player: Player): number {
  return (
    player.inventory.weapons.reduce((sum, weapon) => sum + weapon.bonus, 0) +
    player.inventory.spells.filter((spell) => spell.spellKind === 'flame').length
  );
}

function getOrCreateStrategicDistanceCache(
  state: GameState,
): Map<string, number | null> {
  const existingCache = strategicDistanceCache.get(state);
  if (existingCache) {
    return existingCache;
  }

  const cache = new Map<string, number | null>();
  strategicDistanceCache.set(state, cache);

  return cache;
}

function getOrCreateArrivalWindowCache(
  state: GameState,
): Map<string, ArrivalWindow | null> {
  const existingCache = arrivalWindowCache.get(state);
  if (existingCache) {
    return existingCache;
  }

  const cache = new Map<string, ArrivalWindow | null>();
  arrivalWindowCache.set(state, cache);

  return cache;
}

function isBacktrackMove(
  action: Extract<GameAction, { type: 'movePlayer' }>,
  lastMoveFrom: BoardPosition,
): boolean {
  return (
    action.target.boardX === lastMoveFrom.boardX &&
    action.target.boardY === lastMoveFrom.boardY
  );
}

function needsHealing(
  player: Player,
  config: AiHeuristicConfig,
): boolean {
  return player.hp < config.preferHealingBelowHp || player.isCursed;
}

function actionOrder(action: GameAction): number {
  const order = [
    'takeLoot',
    'swapLoot',
    'leaveLoot',
    'beginLoot',
    'openChest',
    'useHealingSpell',
    'resolveCombat',
    'resolveRoomToken',
    'placePendingTile',
    'movePlayer',
    'declareExplorationDirection',
    'swapWitchPosition',
    'endTurn',
    'startGame',
  ];

  return order.indexOf(action.type);
}

function requireAction<T extends GameAction['type']>(
  legalActions: GameAction[],
  type: T,
): Extract<GameAction, { type: T }> {
  const action = legalActions.find((candidate) => candidate.type === type);

  if (!action) {
    throw new Error(`AI expected legal action: ${type}`);
  }

  return action as Extract<GameAction, { type: T }>;
}
