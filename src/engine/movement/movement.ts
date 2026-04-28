import { getTileAt, hasTileAt } from '../core/board';
import type { GameState, TileSide } from '../core/types';
import { adjacentPosition, canExit, canTilesConnect } from './topology';

export function getActivePlayer(state: GameState) {
  return state.players[state.activePlayerIndex];
}

export function getLegalKnownMoveDirections(state: GameState): TileSide[] {
  const activePlayer = getActivePlayer(state);
  const originTile = getTileAt(state.board, activePlayer.position);

  if (!originTile || state.remainingSteps <= 0) {
    return [];
  }

  return (['A', 'B', 'C', 'D'] as TileSide[]).filter((direction) => {
    const targetPosition = adjacentPosition(activePlayer.position, direction);
    const targetTile = getTileAt(state.board, targetPosition);

    return (
      targetTile !== undefined &&
      canTilesConnect(originTile, targetTile, direction)
    );
  });
}

export function getLegalExplorationDirections(state: GameState): TileSide[] {
  const activePlayer = getActivePlayer(state);
  const originTile = getTileAt(state.board, activePlayer.position);

  if (
    !originTile ||
    state.remainingSteps <= 0 ||
    state.tileStack.length === 0
  ) {
    return [];
  }

  return (['A', 'B', 'C', 'D'] as TileSide[]).filter((direction) => {
    const targetPosition = adjacentPosition(activePlayer.position, direction);

    return (
      canExit(originTile, direction) && !hasTileAt(state.board, targetPosition)
    );
  });
}
