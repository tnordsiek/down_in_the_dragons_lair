import type { GameState } from '../core/types';
import { applyHealingIfOnHealingTile } from '../rules/healing';

export function endTurn(state: GameState): GameState {
  const healedState = applyHealingIfOnHealingTile(state);
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
