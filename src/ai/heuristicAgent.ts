import { monsterDefinitions } from '../data/monsters';
import { getTileAt } from '../engine/core/board';
import type {
  BoardPosition,
  GameAction,
  GameState,
  Player,
  Rotation,
} from '../engine/core/types';
import {
  calculateCombatTotal,
  getCombatOutcomeForPlayer,
} from '../engine/combat/combat';
import {
  adjacentPosition,
  canExit,
  canTilesConnect,
} from '../engine/movement/topology';
import { getDiscoveredHealingPositions } from '../engine/rules/abilities';
import { hasActiveHeroAbility } from '../engine/rules/abilities';
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
  config: AiHeuristicConfig = aiHeuristicConfig,
): GameAction {
  if (legalActions.length === 0) {
    throw new Error('AI has no legal actions');
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

  if (state.phase === 'combat' || state.phase === 'optional_post_combat') {
    return chooseCombatAction(state, legalActions, config);
  }

  if (state.phase === 'resolve_room_token') {
    return requireAction(legalActions, 'resolveRoomToken');
  }

  if (state.phase === 'choose_pending_tile_rotation') {
    return choosePlacementAction(state, legalActions);
  }

  const movementAction = chooseMovementAction(state, legalActions, config);

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
  const candidates = state.players
    .filter(
      (player) =>
        player.id === activePlayer.id &&
        (player.hp <= config.criticalHp || player.isCursed),
    )
    .sort((left, right) => left.hp - right.hp);
  const target = candidates[0];

  return target
    ? healingActions.find(
        (action) =>
          action.type === 'useHealingSpell' &&
          action.targetPlayerId === target.id,
      )
    : undefined;
}

function chooseCombatAction(
  state: GameState,
  legalActions: GameAction[],
  config: AiHeuristicConfig,
): GameAction {
  const combatAction = requireAction(legalActions, 'resolveCombat');

  if (!state.combat) {
    return combatAction;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const monster = monsterDefinitions[state.combat.monsterId];
  const availableFlameSpells = activePlayer.inventory.spells.filter(
    (spell) => spell.spellKind === 'flame',
  ).length;
  const flameSpellCount = chooseFlameSpellCount(
    activePlayer,
    monster.strength,
    availableFlameSpells,
  );
  const winChance = estimateCombatWinChance(
    activePlayer,
    monster.strength,
    flameSpellCount,
  );

  if (state.phase === 'optional_post_combat') {
    const minimumWinChance =
      monster.id === 'dragon'
        ? config.minimumDragonWinChance
        : config.minimumRepeatCombatWinChance;

    if (winChance < minimumWinChance) {
      return requireAction(legalActions, 'endTurn');
    }
  }

  return {
    ...combatAction,
    flameSpellCount,
    useWarriorReroll: hasActiveHeroAbility(activePlayer, 'hero_warrior'),
    useWarlockSacrifice:
      hasActiveHeroAbility(activePlayer, 'hero_warlock') &&
      activePlayer.hp > config.criticalHp,
    curseTargetPlayerId: chooseCurseTargetPlayerId(state, activePlayer),
  };
}

function chooseFlameSpellCount(
  player: Player,
  monsterStrength: number,
  availableFlameSpells: number,
): number {
  if (availableFlameSpells === 0) {
    return 0;
  }

  const baseAverageTotal = calculateCombatTotal(player, [3, 4]);
  const needed = Math.max(0, monsterStrength + 1 - baseAverageTotal);

  return Math.min(availableFlameSpells, needed);
}

function chooseCurseTargetPlayerId(
  state: GameState,
  activePlayer: Player,
): string | undefined {
  if (state.combat?.monsterId !== 'mummy') {
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
): GameAction | undefined {
  const movementActions = legalActions.filter(
    (action) =>
      action.type === 'movePlayer' ||
      action.type === 'declareExplorationDirection' ||
      action.type === 'swapWarlockPosition',
  );

  if (movementActions.length === 0) {
    return undefined;
  }

  return movementActions
    .slice()
    .sort(
      (left, right) =>
        scoreMovementAction(state, right, config) -
          scoreMovementAction(state, left, config) ||
        actionOrder(left) - actionOrder(right),
    )[0];
}

function scoreMovementAction(
  state: GameState,
  action: GameAction,
  config: AiHeuristicConfig,
): number {
  const activePlayer = state.players[state.activePlayerIndex];
  const targetPosition = getActionTargetPosition(state, action);

  if (action.type === 'swapWarlockPosition') {
    return config.exploreTileBonus - 1;
  }

  if (!targetPosition) {
    return 0;
  }

  const needsHealing =
    activePlayer.hp < config.preferHealingBelowHp || activePlayer.isCursed;

  if (needsHealing) {
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
    activePlayer,
  );
  const targetObjectiveDistance = distanceToNearestObjective(
    state,
    targetPosition,
    activePlayer,
  );
  let score = 0;

  if (
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
    const monster =
      monsterDefinitions[
        targetTile.roomToken.id as keyof typeof monsterDefinitions
      ];
    const winChance = estimateCombatWinChance(activePlayer, monster.strength);

    score +=
      winChance >= 0.5 ? config.exploreRoomBonus : config.knownMonsterPenalty;

    if (monster.id === 'dragon' && winChance < config.minimumDragonWinChance) {
      score += config.knownMonsterPenalty;
    }
  }

  if (needsHealing && isHealingTarget(state, targetPosition)) {
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
  player: Player,
): number | undefined {
  const distances = state.board.flatMap((tile) => {
    if (!isObjectiveTile(tile, player)) {
      return [];
    }

    const distance = shortestKnownPathDistance(state, position, tile);

    return distance === undefined ? [] : [distance - objectivePriority(tile)];
  });

  return distances.length > 0 ? Math.min(...distances) : undefined;
}

function isObjectiveTile(
  tile: GameState['board'][number],
  player: Player,
): boolean {
  if (tile.roomToken?.id === 'treasure_chest') {
    return player.inventory.keyCount > 0;
  }

  if (tile.roomToken?.kind !== 'monster') {
    return false;
  }

  if (hasActiveHeroAbility(player, 'hero_thief')) {
    return false;
  }

  return true;
}

function objectivePriority(tile: GameState['board'][number]): number {
  return tile.roomToken?.id === 'dragon'
    ? aiHeuristicConfig.dragonObjectiveBonus
    : 0;
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
  const distances = getDiscoveredHealingPositions(state).map(
    (healingPosition) =>
      Math.abs(healingPosition.boardX - position.boardX) +
      Math.abs(healingPosition.boardY - position.boardY),
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

function actionOrder(action: GameAction): number {
  const order = [
    'openChest',
    'useHealingSpell',
    'resolveCombat',
    'resolveRoomToken',
    'placePendingTile',
    'movePlayer',
    'declareExplorationDirection',
    'swapWarlockPosition',
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
