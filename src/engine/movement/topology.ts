import { tileBlueprints } from '../../data/tiles';
import type {
  BoardPosition,
  PlacedTile,
  Rotation,
  TileBlueprint,
  TileSide,
} from '../core/types';

const sideOrder: TileSide[] = ['A', 'B', 'C', 'D'];

export const rotations: Rotation[] = [0, 90, 180, 270];

export const sideDeltas: Record<TileSide, BoardPosition> = {
  A: { boardX: 0, boardY: -1 },
  B: { boardX: 1, boardY: 0 },
  C: { boardX: 0, boardY: 1 },
  D: { boardX: -1, boardY: 0 },
};

export function adjacentPosition(
  position: BoardPosition,
  direction: TileSide,
): BoardPosition {
  const delta = sideDeltas[direction];

  return {
    boardX: position.boardX + delta.boardX,
    boardY: position.boardY + delta.boardY,
  };
}

export function oppositeSide(side: TileSide): TileSide {
  return rotateSide(side, 180);
}

export function rotateSide(side: TileSide, rotation: Rotation): TileSide {
  const offset = rotation / 90;
  const index = sideOrder.indexOf(side);

  return sideOrder[(index + offset) % sideOrder.length];
}

export function rotateOpenSides(
  openSides: TileSide[],
  rotation: Rotation,
): TileSide[] {
  return openSides.map((side) => rotateSide(side, rotation));
}

export function getPlacedTileOpenSides(tile: PlacedTile): TileSide[] {
  return rotateOpenSides(
    tileBlueprints[tile.blueprintId].openSides,
    tile.rotation,
  );
}

export function canExit(tile: PlacedTile, direction: TileSide): boolean {
  return getPlacedTileOpenSides(tile).includes(direction);
}

export function canEnter(tile: PlacedTile, entrySide: TileSide): boolean {
  return getPlacedTileOpenSides(tile).includes(entrySide);
}

export function canTilesConnect(
  origin: PlacedTile,
  target: PlacedTile,
  direction: TileSide,
): boolean {
  return (
    canExit(origin, direction) && canEnter(target, oppositeSide(direction))
  );
}

export function getLegalRotationsForEntry(
  blueprint: TileBlueprint,
  entrySide: TileSide,
): Rotation[] {
  return rotations.filter((rotation) =>
    rotateOpenSides(blueprint.openSides, rotation).includes(entrySide),
  );
}
