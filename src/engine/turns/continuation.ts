import { getTileAt } from '../core/board';
import type { GameState } from '../core/types';
import { getDiscoveredHealingPositions } from '../rules/abilities';

export function getContinuationPhaseAfterAction(
  state: GameState,
): GameState['phase'] {
  if (!state.turnContinuationReason) {
    return 'turn_end';
  }

  if (state.remainingSteps > 0) {
    return 'await_move';
  }

  return hasNonMovementFollowUpAction(state) ? 'await_move' : 'turn_end';
}

function hasNonMovementFollowUpAction(state: GameState): boolean {
  const activePlayer = state.players[state.activePlayerIndex];
  const activeTile = getTileAt(state.board, activePlayer.position);
  const hasHealingSpell = activePlayer.inventory.spells.some(
    (spell) => spell.spellKind === 'healing',
  );

  return (
    (activeTile?.looseItems.length ?? 0) > 0 ||
    (hasHealingSpell && getDiscoveredHealingPositions(state).length > 0)
  );
}
