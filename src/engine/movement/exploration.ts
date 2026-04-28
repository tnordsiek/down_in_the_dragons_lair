import { tileBlueprints } from '../../data/tiles';
import { restoreSeededRng } from '../../utils/rng';
import { getTileAt } from '../core/board';
import type {
  GameState,
  PendingTileDraw,
  TileBlueprintId,
  TileSide,
} from '../core/types';
import { shuffle } from '../setup/createGame';
import { getLegalExplorationDirections } from './movement';
import {
  adjacentPosition,
  getLegalRotationsForEntry,
  oppositeSide,
} from './topology';

export function drawPendingTileForExploration(
  state: GameState,
  direction: TileSide,
): GameState {
  if (!getLegalExplorationDirections(state).includes(direction)) {
    throw new Error(`Illegal exploration direction: ${direction}`);
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const origin = activePlayer.position;
  const target = adjacentPosition(origin, direction);
  const entrySide = oppositeSide(direction);
  const skippedBlueprintIds: TileBlueprintId[] = [];
  const remainingStack = [...state.tileStack];

  while (remainingStack.length > 0) {
    const blueprintId = remainingStack.shift()!;
    const legalRotations = getLegalRotationsForEntry(
      tileBlueprints[blueprintId],
      entrySide,
    );

    if (legalRotations.length > 0) {
      return {
        ...state,
        phase: 'choose_pending_tile_rotation',
        tileStack: remainingStack,
        pendingTile: {
          origin,
          target,
          direction,
          blueprintId,
          legalRotations,
          skippedBlueprintIds,
        },
      };
    }

    skippedBlueprintIds.push(blueprintId);
  }

  throw new Error('No placeable tile found in tile stack');
}

export function placePendingTile(
  state: GameState,
  rotation: PendingTileDraw['legalRotations'][number],
): GameState {
  const pendingTile = state.pendingTile;

  if (!pendingTile) {
    throw new Error('No pending tile to place');
  }

  if (!pendingTile.legalRotations.includes(rotation)) {
    throw new Error(`Illegal pending tile rotation: ${rotation}`);
  }

  const rng = restoreSeededRng(state.rng);
  const returnedSkippedTiles = shuffle(pendingTile.skippedBlueprintIds, rng);
  const placedTile = {
    tileInstanceId: `tile-${state.board.length}`,
    blueprintId: pendingTile.blueprintId,
    rotation,
    boardX: pendingTile.target.boardX,
    boardY: pendingTile.target.boardY,
    discovered: true,
    looseItems: [],
  };
  const players = state.players.map((player, index) =>
    index === state.activePlayerIndex
      ? { ...player, position: pendingTile.target }
      : player,
  );
  const blueprint = tileBlueprints[pendingTile.blueprintId];
  const remainingSteps = state.remainingSteps - 1;

  return {
    ...state,
    phase:
      blueprint.category === 'room'
        ? 'resolve_room_token'
        : remainingSteps > 0
          ? 'await_move'
          : 'turn_end',
    players,
    board: [...state.board, placedTile],
    tileStack: [...returnedSkippedTiles, ...state.tileStack],
    pendingTile: undefined,
    remainingSteps,
    rng: rng.snapshot(),
  };
}

export function hasPendingTileAtTarget(state: GameState): boolean {
  return (
    state.pendingTile !== undefined &&
    getTileAt(state.board, state.pendingTile.target) === undefined
  );
}
