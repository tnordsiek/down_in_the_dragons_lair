import type { BoardPosition, PlacedTile } from './types';

export function positionKey(position: BoardPosition): string {
  return `${position.boardX},${position.boardY}`;
}

export function samePosition(
  left: BoardPosition,
  right: BoardPosition,
): boolean {
  return left.boardX === right.boardX && left.boardY === right.boardY;
}

export function getTileAt(
  board: PlacedTile[],
  position: BoardPosition,
): PlacedTile | undefined {
  return board.find((tile) =>
    samePosition({ boardX: tile.boardX, boardY: tile.boardY }, position),
  );
}

export function hasTileAt(
  board: PlacedTile[],
  position: BoardPosition,
): boolean {
  return getTileAt(board, position) !== undefined;
}
