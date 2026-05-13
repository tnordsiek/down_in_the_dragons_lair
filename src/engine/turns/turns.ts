import type { GameState } from '../core/types';
import { applyHealingIfOnHealingTile } from '../rules/healing';

export function endTurn(state: GameState): GameState {
  if (state.phase === 'loot_resolution') {
    throw new Error('Resolve or leave pending loot before ending the turn');
  }

  if (state.phase === 'resolve_room_token') {
    throw new Error('Resolve the room token before ending the turn');
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const resolvedCurrentState =
    activePlayer.skipNextTurn && state.phase === 'turn_skip'
    ? recoverUnconsciousActivePlayer(state)
    : applyHealingIfOnHealingTile(state);
  const activePlayerIndex =
    (resolvedCurrentState.activePlayerIndex + 1) %
    resolvedCurrentState.players.length;
  const nextActivePlayer = resolvedCurrentState.players[activePlayerIndex];

  return {
    ...resolvedCurrentState,
    phase: nextActivePlayer.skipNextTurn ? 'turn_skip' : 'turn_start',
    activePlayerIndex,
    remainingSteps: nextActivePlayer.skipNextTurn ? 0 : 4,
    pendingTile: undefined,
    pendingLoot: undefined,
    lastMoveFrom: undefined,
    combat: undefined,
  };
}

function recoverUnconsciousActivePlayer(state: GameState): GameState {
  const activePlayer = state.players[state.activePlayerIndex];

  if (!activePlayer.skipNextTurn) {
    return state;
  }

  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.activePlayerIndex
        ? { ...player, hp: Math.max(1, player.hp), skipNextTurn: false }
        : player,
    ),
  };
}
