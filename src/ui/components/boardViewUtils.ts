import type { BoardPosition, GameState } from '../../engine/core/types';
import { getDiscoveredHealingPositions } from '../../engine/rules/abilities';

export function getBoardSelectableHealingPositions(
  state: GameState,
): BoardPosition[] {
  return getDiscoveredHealingPositions(state);
}
