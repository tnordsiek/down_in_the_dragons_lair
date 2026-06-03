import { getTileAt, samePosition } from '../core/board';
import type { BoardPosition, GameState } from '../core/types';
import {
  getActiveTileMonsterCombat,
  hasActiveHeroAbility,
} from '../rules/abilities';
import { getZeroStepFollowUpPhase } from '../turns/continuation';
import { getLegalKnownMoves } from './movement';

export function moveActivePlayer(
  state: GameState,
  target: BoardPosition,
): GameState {
  const legalMove = getLegalKnownMoves(state).find((move) =>
    samePosition(move.target, target),
  );

  if (!legalMove) {
    throw new Error(`Illegal move target: ${target.boardX},${target.boardY}`);
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const targetPosition = legalMove.target;
  const targetTile = getTileAt(state.board, targetPosition);

  if (!targetTile) {
    throw new Error(
      `Known move target is missing: ${targetPosition.boardX},${targetPosition.boardY}`,
    );
  }

  const remainingSteps = state.remainingSteps - 1;
  const targetMonster =
    targetTile.roomToken?.kind === 'monster' ? targetTile.roomToken : undefined;
  const canIgnoreMonster =
    targetMonster !== undefined &&
    hasActiveHeroAbility(activePlayer, 'hero_rogue');
  const players = state.players.map((player, index) =>
    index === state.activePlayerIndex
      ? { ...player, position: targetPosition }
      : player,
  );
  const optionalCombat = canIgnoreMonster
    ? getActiveTileMonsterCombat({
        ...state,
        players,
        activePlayerIndex: state.activePlayerIndex,
        lastMoveFrom: activePlayer.position,
      })
    : undefined;
  const zeroStepFollowUpState = {
    ...state,
    players,
    lastMoveFrom: activePlayer.position,
    remainingSteps,
  };

  return {
    ...state,
    phase:
      targetMonster && !canIgnoreMonster
        ? 'combat'
        : targetMonster && canIgnoreMonster
          ? 'optional_monster_combat'
          : remainingSteps > 0
            ? 'await_move'
            : getZeroStepFollowUpPhase(zeroStepFollowUpState),
    players,
    lastMoveFrom: activePlayer.position,
    remainingSteps,
    combat:
      targetMonster && !canIgnoreMonster
        ? {
            playerId: activePlayer.id,
            monsterId: targetMonster.id,
            position: targetPosition,
            enteredFrom: activePlayer.position,
          }
        : optionalCombat,
  };
}
