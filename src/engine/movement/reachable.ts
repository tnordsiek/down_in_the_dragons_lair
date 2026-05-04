import { positionKey } from '../core/board';
import type { BoardPosition, GameState, TileSide } from '../core/types';
import { moveActivePlayer } from './performMove';
import { getLegalKnownMoveDirections } from './movement';

export type ReachableKnownMove = {
  path: TileSide[];
  position: BoardPosition;
};

export function getReachableKnownMovePaths(
  state: GameState,
): ReachableKnownMove[] {
  if (state.remainingSteps <= 0) {
    return [];
  }

  const origin = state.players[state.activePlayerIndex].position;
  const queue: Array<{ path: TileSide[]; state: GameState }> = [
    { path: [], state },
  ];
  const visited = new Set<string>([positionKey(origin)]);
  const reachableMoves = new Map<string, ReachableKnownMove>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const legalDirections = getLegalKnownMoveDirections(current.state);

    for (const direction of legalDirections) {
      const nextState = moveActivePlayer(current.state, direction);
      const nextPosition =
        nextState.players[nextState.activePlayerIndex].position;
      const nextPath = [...current.path, direction];
      const key = positionKey(nextPosition);

      if (!reachableMoves.has(key)) {
        reachableMoves.set(key, { path: nextPath, position: nextPosition });
      }

      if (
        nextState.phase === 'await_move' &&
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
