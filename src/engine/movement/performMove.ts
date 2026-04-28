import { getTileAt } from '../core/board';
import type { GameState, TileSide } from '../core/types';
import { getLegalKnownMoveDirections } from './movement';
import { adjacentPosition } from './topology';

export function moveActivePlayer(
  state: GameState,
  direction: TileSide,
): GameState {
  if (!getLegalKnownMoveDirections(state).includes(direction)) {
    throw new Error(`Illegal move direction: ${direction}`);
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const targetPosition = adjacentPosition(activePlayer.position, direction);
  const targetTile = getTileAt(state.board, targetPosition);

  if (!targetTile) {
    throw new Error(`Known move target is missing: ${direction}`);
  }

  const remainingSteps = state.remainingSteps - 1;
  const players = state.players.map((player, index) =>
    index === state.activePlayerIndex
      ? { ...player, position: targetPosition }
      : player,
  );

  return {
    ...state,
    phase: remainingSteps > 0 ? 'await_move' : 'turn_end',
    players,
    remainingSteps,
  };
}
