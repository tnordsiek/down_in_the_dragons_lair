import { getTileAt } from '../engine/core/board';
import type {
  BoardPosition,
  GameAction,
  GameState,
  Player,
} from '../engine/core/types';
import {
  getLegalExplorationDirections,
  getLegalKnownMoveDirections,
} from '../engine/movement/movement';
import { adjacentPosition } from '../engine/movement/topology';
import { getDiscoveredHealingPositions } from '../engine/rules/abilities';
import { hasActiveHeroAbility } from '../engine/rules/abilities';

export function getLegalAiActions(state: GameState): GameAction[] {
  if (state.phase === 'game_over') {
    return [];
  }

  const activePlayer = state.players[state.activePlayerIndex];

  if (activePlayer.skipNextTurn) {
    return [{ type: 'endTurn' }];
  }

  const actions: GameAction[] = [];

  actions.push(...getLegalHealingSpellActions(state, activePlayer));

  if (state.phase === 'turn_start') {
    actions.push(...getLegalWarlockSwapActions(state, activePlayer));
  }

  if (canOpenChest(state, activePlayer)) {
    actions.push({ type: 'openChest' });
  }

  if (state.phase === 'choose_pending_tile_rotation' && state.pendingTile) {
    actions.push(
      ...state.pendingTile.legalRotations.map((rotation) => ({
        type: 'placePendingTile' as const,
        rotation,
      })),
    );
    return actions;
  }

  if (state.phase === 'resolve_room_token') {
    actions.push({ type: 'resolveRoomToken' });
    return actions;
  }

  if (state.phase === 'combat' || state.phase === 'optional_post_combat') {
    if (state.combat) {
      actions.push({ type: 'resolveCombat' });
    }

    if (state.phase === 'optional_post_combat') {
      actions.push({ type: 'endTurn' });
    }

    return actions;
  }

  if (state.phase === 'turn_start' || state.phase === 'await_move') {
    actions.push(
      ...getLegalKnownMoveDirections(state).map((direction) => ({
        type: 'movePlayer' as const,
        direction,
      })),
      ...getLegalExplorationDirections(state).map((direction) => ({
        type: 'declareExplorationDirection' as const,
        direction,
      })),
    );
  }

  actions.push({ type: 'endTurn' });

  return actions;
}

function getLegalHealingSpellActions(
  state: GameState,
  activePlayer: Player,
): GameAction[] {
  const hasHealingSpell = activePlayer.inventory.spells.some(
    (spell) => spell.spellKind === 'healing',
  );

  if (!hasHealingSpell) {
    return [];
  }

  const healingPositions = getDiscoveredHealingPositions(state);

  return state.players.flatMap((player) =>
    healingPositions.map((healingPosition) => ({
      type: 'useHealingSpell' as const,
      targetPlayerId: player.id,
      healingPosition,
    })),
  );
}

function getLegalWarlockSwapActions(
  state: GameState,
  activePlayer: Player,
): GameAction[] {
  if (!hasActiveHeroAbility(activePlayer, 'hero_warlock')) {
    return [];
  }

  return state.players
    .filter((player) => player.id !== activePlayer.id)
    .map((player) => ({
      type: 'swapWarlockPosition' as const,
      targetPlayerId: player.id,
    }));
}

function canOpenChest(state: GameState, activePlayer: Player): boolean {
  const activeTile = getTileAt(state.board, activePlayer.position);

  return (
    activeTile?.roomToken?.id === 'treasure_chest' &&
    activePlayer.inventory.keyCount > 0
  );
}

export function getActionTargetPosition(
  state: GameState,
  action: GameAction,
): BoardPosition | undefined {
  if (
    action.type !== 'movePlayer' &&
    action.type !== 'declareExplorationDirection'
  ) {
    return undefined;
  }

  return adjacentPosition(
    state.players[state.activePlayerIndex].position,
    action.direction,
  );
}
