import type { GameState } from '../core/types';

export function endTurn(state: GameState): GameState {
  const activePlayerIndex =
    (state.activePlayerIndex + 1) % state.players.length;

  return {
    ...state,
    phase: 'turn_start',
    activePlayerIndex,
    remainingSteps: 4,
    pendingTile: undefined,
    combat: undefined,
  };
}
