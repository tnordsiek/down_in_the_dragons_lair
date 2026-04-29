import type { GameState } from '../core/types';
import { applyHealingIfOnHealingTile } from '../rules/healing';

export function endTurn(state: GameState): GameState {
  const activePlayerSkipsTurn =
    state.players[state.activePlayerIndex].skipNextTurn;
  const recoveredState = recoverUnconsciousActivePlayer(state);
  const healedState = activePlayerSkipsTurn
    ? recoveredState
    : applyHealingIfOnHealingTile(recoveredState);
  const activePlayerIndex =
    (healedState.activePlayerIndex + 1) % healedState.players.length;

  return {
    ...healedState,
    phase: 'turn_start',
    activePlayerIndex,
    remainingSteps: 4,
    pendingTile: undefined,
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
