import { positionKey } from '../core/board';
import type { BoardPosition, GameState, KnownMove, TileSide } from '../core/types';
import { moveActivePlayer } from './performMove';
import {
  getLegalExplorationDirections,
  getLegalKnownMoves,
} from './movement';
import { adjacentPosition } from './topology';

export type ReachableKnownMove = {
  path: KnownMove[];
  position: BoardPosition;
};

export function getReachableKnownMovePaths(
  state: GameState,
): ReachableKnownMove[] {
  if (state.remainingSteps <= 0) {
    return [];
  }

  const origin = state.players[state.activePlayerIndex].position;
  const queue: Array<{ path: KnownMove[]; state: GameState }> = [
    { path: [], state },
  ];
  const visited = new Set<string>([positionKey(origin)]);
  const reachableMoves = new Map<string, ReachableKnownMove>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const legalMoves = getLegalKnownMoves(current.state);

    for (const move of legalMoves) {
      const nextState = moveActivePlayer(current.state, move.target);
      const nextPosition =
        nextState.players[nextState.activePlayerIndex].position;
      const nextPath = [...current.path, move];
      const key = positionKey(nextPosition);

      if (!reachableMoves.has(key)) {
        reachableMoves.set(key, { path: nextPath, position: nextPosition });
      }

      if (
        (nextState.phase === 'await_move' ||
          nextState.phase === 'optional_monster_combat') &&
        nextState.remainingSteps > 0 &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push({ path: nextPath, state: nextState });
      }
    }
  }

  return [...reachableMoves.values()];
}

export type ReachableExplorationTarget = {
  path: KnownMove[];
  position: BoardPosition;
  direction: TileSide;
};

export function getReachableExplorationTargets(
  state: GameState,
): ReachableExplorationTarget[] {
  if (state.remainingSteps <= 0 || state.tileStack.length === 0) {
    return [];
  }

  const origin = state.players[state.activePlayerIndex].position;
  const queue: Array<{ path: KnownMove[]; state: GameState }> = [
    { path: [], state },
  ];
  const visitedMovement = new Set<string>([positionKey(origin)]);
  const explorationTargets = new Map<string, ReachableExplorationTarget>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentPosition =
      current.state.players[current.state.activePlayerIndex].position;

    for (const direction of getLegalExplorationDirections(current.state)) {
      const emptyPosition = adjacentPosition(currentPosition, direction);
      const key = positionKey(emptyPosition);

      if (!explorationTargets.has(key)) {
        explorationTargets.set(key, {
          path: current.path,
          position: emptyPosition,
          direction,
        });
      }
    }

    const legalMoves = getLegalKnownMoves(current.state);

    for (const move of legalMoves) {
      const nextState = moveActivePlayer(current.state, move.target);
      const nextPosition =
        nextState.players[nextState.activePlayerIndex].position;
      const nextPath = [...current.path, move];
      const key = positionKey(nextPosition);

      if (
        (nextState.phase === 'await_move' ||
          nextState.phase === 'optional_monster_combat') &&
        nextState.remainingSteps > 0 &&
        !visitedMovement.has(key)
      ) {
        visitedMovement.add(key);
        queue.push({ path: nextPath, state: nextState });
      }
    }
  }

  return [...explorationTargets.values()];
}
