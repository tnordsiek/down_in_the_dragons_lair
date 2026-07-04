import { monsterDefinitions } from '../data/monsters';
import { getTileAt } from '../engine/core/board';
import type {
  BoardPosition,
  GameAction,
  GameState,
  Player,
  Rotation,
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
import { getDiscoveredHealingPositions } from '../engine/rules/abilities';
import { hasActiveHeroAbility } from '../engine/rules/abilities';
import { isHealingPosition } from '../engine/rules/healing';
import { canStoreItem } from '../engine/rules/inventory';
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

export const heuristicAiAgent: AiAgent = {
  chooseAction(ctx) {
    return chooseHeuristicAiAction(ctx.state, ctx.legalActions);
  },
};

export function chooseHeuristicAiAction(
  state: GameState,
  legalActions = getLegalAiActions(state),
  baseConfig: AiHeuristicConfig = aiHeuristicConfig,
  staleActionCount = 0,
): GameAction {
  if (legalActions.length === 0) {
    throw new Error('AI has no legal actions');
  }

  const isDesperate = staleActionCount >= baseConfig.staleActionThreshold;
  const config: AiHeuristicConfig = isDesperate
    ? {
        ...baseConfig,
        minimumRepeatCombatWinChance: 0,
        minimumDragonWinChance: 0,
      }
    : baseConfig;

  if (config.mistakeRate > 0) {
    const rng = restoreSeededRng(state.rng);

    if (rng.next() < config.mistakeRate) {
      return legalActions[rng.nextInt(legalActions.length)];
    }
  }

  const activePlayer = state.players[state.activePlayerIndex];

  if (activePlayer.skipNextTurn) {
    return requireAction(legalActions, 'endTurn');
  }

  const openChestAction = legalActions.find(
    (action) => action.type === 'openChest',
  );

  if (openChestAction) {
    return openChestAction;
  }

  const healingSpellAction = chooseHealingSpellAction(
    state,
    legalActions,
    config,
  );

  if (healingSpellAction) {
    return healingSpellAction;
  }

  if (
    state.phase === 'optional_monster_combat' ||
    state.phase === 'combat' ||
    state.phase === 'optional_post_combat' ||
    state.phase === 'combat_curse_target' ||
    state.phase === 'combat_blade_reroll' ||
    state.phase === 'combat_valkyrie_reroll' ||
    state.phase === 'combat_witch_sacrifice' ||
    state.phase === 'combat_flame_spells'
  ) {
    return chooseCombatAction(state, legalActions, config);
  }

  if (state.phase === 'loot_resolution') {
    return chooseLootAction(state, legalActions);
  }

  if (state.phase === 'resolve_room_token') {
    return requireAction(legalActions, 'resolveRoomToken');
  }

  if (state.phase === 'resolve_room_token_seeress_choice') {
    return (
      legalActions.find(
        (action) =>
          action.type === 'chooseSeeressRoomToken' && action.choiceIndex === 0,
      ) ?? requireAction(legalActions, 'chooseSeeressRoomToken')
    );
  }

  if (state.phase === 'choose_pending_tile_rotation') {
    return choosePlacementAction(state, legalActions);
  }

  const groundLootAction = chooseGroundLootAction(state, legalActions);

  if (groundLootAction) {
    return groundLootAction;
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

  const forcedDragonEndgameAction = chooseForcedDragonEndgameAction(
    state,
    legalActions,
    config,
  );

  if (forcedDragonEndgameAction) {
    return forcedDragonEndgameAction;
  }

  const movementAction = chooseMovementAction(
    state,
    legalActions,
    config,
    isDesperate,
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

function chooseForcedDragonEndgameAction(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
): GameAction | undefined {
  const activePlayer = state.players[state.activePlayerIndex];

  if (!shouldForceDragonEndgame(state, activePlayer, config)) {
    return undefined;
  }

  const dragonTile = state.board.find((tile) => tile.roomToken?.id === 'dragon');

  if (!dragonTile) {
    return undefined;
  }

  const moveActions = legalActions.filter(
    (action) => action.type === 'movePlayer',
  );
  const directDragonMove = moveActions.find(
    (action) =>
      action.target.boardX === dragonTile.boardX &&
      action.target.boardY === dragonTile.boardY,
  );

  if (directDragonMove) {
    return directDragonMove;
  }

  return moveActions
    .slice()
    .sort((left, right) => {
      const leftDistance =
        shortestKnownPathDistance(state, left.target, dragonTile) ?? Number.POSITIVE_INFINITY;
      const rightDistance =
        shortestKnownPathDistance(state, right.target, dragonTile) ?? Number.POSITIVE_INFINITY;

      return leftDistance - rightDistance || actionOrder(left) - actionOrder(right);
    })[0];
}

function chooseCombatAction(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
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
    return chooseCombatFlameSpellAction(state, legalActions);
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
    const automaticFlameBonus = getAutomaticFlameSpellCount(activePlayer);
    const winChance = estimateCombatWinChance(
      activePlayer,
      monster.strength,
      automaticFlameBonus,
    );
    const minimumWinChance =
      monster.id === 'dragon'
        ? config.minimumDragonWinChance
        : config.minimumRepeatCombatWinChance;

    if (
      monster.id === 'dragon' &&
      shouldForceDragonEndgame(state, activePlayer, config)
    ) {
      return startCombatAction;
    }

    if (winChance >= minimumWinChance) {
      return startCombatAction;
    }

    const movementAction = chooseMovementAction(state, legalActions, config);

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
  const automaticFlameBonus = getAutomaticFlameSpellCount(activePlayer);
  const winChance = estimateCombatWinChance(
    activePlayer,
    monster.strength,
    automaticFlameBonus,
  );

  if (state.phase === 'optional_post_combat') {
    const minimumWinChance =
      monster.id === 'dragon'
        ? config.minimumDragonWinChance
        : config.minimumRepeatCombatWinChance;

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
  const automaticFlameBonus = getAutomaticFlameSpellCount(activePlayer);
  const winChance = estimateCombatWinChance(
    activePlayer,
    monster.strength,
    automaticFlameBonus,
  );
  const minimumWinChance =
    monster.id === 'dragon'
      ? config.minimumDragonWinChance
      : config.minimumRepeatCombatWinChance;

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

  if (monster.strength <= 9) {
    return requireAction(legalActions, 'resolveCombatWithoutFlameSpells');
  }

  const winningChoice = spellChoices.find((flameSpellCount) => {
    if (!state.combat?.rolledDice) {
      return false;
    }

    const total = calculateCombatTotal(
      activePlayer,
      state.combat.rolledDice,
      flameSpellCount +
        (state.combat.pendingWitchSacrificeBonus ?? 0) +
        (state.combat.pendingSeeressBonus ?? 0),
    );

    return (
      getCombatOutcomeForPlayer(activePlayer, total, monster.strength) ===
      'victory'
    );
  });

  return winningChoice
    ? {
        type: 'resolveCombatWithFlameSpells',
        flameSpellCount: winningChoice,
      }
    : requireAction(legalActions, 'resolveCombatWithoutFlameSpells');
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
    .sort((left, right) => right.treasurePoints - left.treasurePoints)[0]?.id;
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
  isDesperate = false,
): GameAction | undefined {
  const movementActions = legalActions.filter(
    (action) =>
      action.type === 'movePlayer' ||
      action.type === 'declareExplorationDirection' ||
      action.type === 'swapWitchPosition',
  );

  if (movementActions.length === 0) {
    return undefined;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const objectiveTiles = getObjectiveTiles(state, activePlayer, config);
  const sortedActions = movementActions
    .slice()
    .sort(
      (left, right) =>
        scoreMovementAction(state, right, config, objectiveTiles, isDesperate) -
          scoreMovementAction(state, left, config, objectiveTiles, isDesperate) ||
        actionOrder(left) - actionOrder(right),
    );
  const bestAction = sortedActions[0];

  if (
    !state.lastMoveFrom ||
    bestAction.type !== 'movePlayer' ||
    !isBacktrackMove(bestAction, state.lastMoveFrom)
  ) {
    return bestAction;
  }

  return (
    sortedActions.find(
      (action) =>
        action.type !== 'movePlayer' ||
        !isBacktrackMove(action, state.lastMoveFrom!),
    ) ?? bestAction
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

function scoreMovementAction(
  state: GameState,
  action: GameAction,
  config: AiHeuristicConfig,
  objectiveTiles: GameState['board'],
  isDesperate: boolean,
): number {
  const activePlayer = state.players[state.activePlayerIndex];
  const targetPosition = getActionTargetPosition(state, action);

  if (!targetPosition) {
    return 0;
  }

  const healingNeeded = needsHealing(activePlayer, config) && !isDesperate;

  if (healingNeeded) {
    const healingDistance = distanceToNearestHealing(state, targetPosition);

    if (healingDistance !== undefined) {
      return config.knownHealingBonus - healingDistance;
    }
  }

  if (action.type === 'declareExplorationDirection') {
    return config.exploreTileBonus;
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
  const currentObjectiveDistance = distanceToNearestObjective(
    state,
    activePlayer.position,
    objectiveTiles,
    config,
  );
  const targetObjectiveDistance = distanceToNearestObjective(
    state,
    targetPosition,
    objectiveTiles,
    config,
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
    const winChance = estimateCombatWinChance(activePlayer, monster.strength);
    const minimumDesirableWinChance = isDesperate
      ? 0
      : Math.max(
          0.5,
          monster.id === 'dragon'
            ? config.minimumDragonWinChance
            : config.minimumRepeatCombatWinChance,
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
    currentObjectiveDistance !== undefined &&
    targetObjectiveDistance !== undefined
  ) {
    if (targetObjectiveDistance < currentObjectiveDistance) {
      score +=
        config.objectiveProgressBonus +
        currentObjectiveDistance -
        targetObjectiveDistance;
    } else if (targetObjectiveDistance > currentObjectiveDistance) {
      score -= 1;
    }
  }

  if (
    state.lastMoveFrom &&
    targetPosition.boardX === state.lastMoveFrom.boardX &&
    targetPosition.boardY === state.lastMoveFrom.boardY
  ) {
    score += config.backtrackPenalty;
  }

  return score;
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

  if (hasActiveHeroAbility(player, 'hero_rogue')) {
    return false;
  }

  const monster = monsterDefinitions[tile.roomToken.id];
  const automaticFlameBonus = getAutomaticFlameSpellCount(player);
  const winChance = estimateCombatWinChance(
    player,
    monster.strength,
    automaticFlameBonus,
  );
  const minimumWinChance =
    monster.id === 'dragon'
      ? config.minimumDragonWinChance
      : config.minimumRepeatCombatWinChance;

  return winChance >= minimumWinChance;
}

function objectivePriority(
  tile: GameState['board'][number],
  config: AiHeuristicConfig,
): number {
  return tile.roomToken?.id === 'dragon' ? config.dragonObjectiveBonus : 0;
}

function shouldForceDragonEndgame(
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
        const key = positionKey(nextPosition);
        const targetTile = getTileAt(state.board, nextPosition);

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
