import { tileBlueprints } from '../../data/tiles';
import { getTileAt, hasTileAt } from '../core/board';
import { samePosition } from '../core/board';
import type { GameState, KnownMove, PlacedTile, TileSide } from '../core/types';
import { getActivePlayer, hasActiveHeroAbility } from '../rules/abilities';
import { isMainTurnActionPhase } from '../turns/turns';
import { adjacentPosition, canExit, canTilesConnect } from './topology';

export function getLegalKnownMoves(state: GameState): KnownMove[] {
  const activePlayer = getActivePlayer(state);
  const originTile = getTileAt(state.board, activePlayer.position);

  if (
    !originTile ||
    state.remainingSteps <= 0 ||
    !isMainTurnActionPhase(state.phase)
  ) {
    return [];
  }

  const legalMoves = new Map<string, KnownMove>();

  for (const direction of ['A', 'B', 'C', 'D'] as TileSide[]) {
    const targetPosition = adjacentPosition(activePlayer.position, direction);
    const targetTile = getTileAt(state.board, targetPosition);

    if (targetTile === undefined) {
      continue;
    }

    const canMoveToTarget =
      hasActiveHeroAbility(activePlayer, 'hero_mage') ||
      canTilesConnect(originTile, targetTile, direction);

    if (!canMoveToTarget) {
      continue;
    }

    legalMoves.set(`${targetPosition.boardX},${targetPosition.boardY}`, {
      target: targetPosition,
      direction,
      kind: 'adjacent',
    });
  }

  if (isTeleportTile(originTile)) {
    for (const tile of state.board) {
      if (
        !tile.discovered ||
        !isTeleportTile(tile) ||
        samePosition(tile, activePlayer.position)
      ) {
        continue;
      }

      const targetPosition = { boardX: tile.boardX, boardY: tile.boardY };
      const key = `${targetPosition.boardX},${targetPosition.boardY}`;

      if (!legalMoves.has(key)) {
        legalMoves.set(key, {
          target: targetPosition,
          kind: 'teleport',
        });
      }
    }
  }

  return [...legalMoves.values()];
}

export function getLegalKnownMoveDirections(state: GameState): TileSide[] {
  return getLegalKnownMoves(state)
    .filter((move) => move.direction !== undefined)
    .map((move) => move.direction!);
}

export function getLegalExplorationDirections(state: GameState): TileSide[] {
  const activePlayer = getActivePlayer(state);
  const originTile = getTileAt(state.board, activePlayer.position);

  if (
    !originTile ||
    state.remainingSteps <= 0 ||
    state.tileStack.length === 0 ||
    !['turn_start', 'await_move', 'optional_monster_combat'].includes(
      state.phase,
    )
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

function isTeleportTile(tile: PlacedTile): boolean {
  return tileBlueprints[tile.blueprintId].category === 'teleport';
}
