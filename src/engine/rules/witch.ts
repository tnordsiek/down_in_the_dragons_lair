import { getTileAt } from '../core/board';
import type { GameState } from '../core/types';
import { getZeroStepFollowUpPhase } from '../turns/continuation';
import { hasActiveHeroAbility } from './abilities';

export function swapWitchPosition(
  state: GameState,
  targetPlayerId: string,
): GameState {
  const activePlayer = state.players[state.activePlayerIndex];
  const targetPlayer = state.players.find(
    (player) => player.id === targetPlayerId,
  );

  if (!hasActiveHeroAbility(activePlayer, 'hero_witch')) {
    throw new Error('Only an uncursed witch can swap positions');
  }

  if (state.phase !== 'turn_start') {
    throw new Error('Witch position swap is only allowed at turn start');
  }

  if (!targetPlayer || targetPlayer.id === activePlayer.id) {
    throw new Error('Witch position swap requires another hero target');
  }

  const activeOriginalPosition = activePlayer.position;
  const targetOriginalPosition = targetPlayer.position;
  const targetTile = getTileAt(state.board, targetOriginalPosition);
  const targetMonster =
    targetTile?.roomToken?.kind === 'monster'
      ? targetTile.roomToken
      : undefined;
  const players = state.players.map((player, index) => {
    if (index === state.activePlayerIndex) {
      return { ...player, position: targetOriginalPosition };
    }

    if (player.id === targetPlayer.id) {
      return { ...player, position: activeOriginalPosition };
    }

    return player;
  });
  const swappedState = {
    ...state,
    players,
    remainingSteps: 0,
    lastMoveFrom: activeOriginalPosition,
    healingEndTurnSource: 'witch_swap' as const,
  } satisfies GameState;

  return {
    ...swappedState,
    phase: targetMonster ? 'combat' : getZeroStepFollowUpPhase(swappedState),
    combat: targetMonster
      ? {
          playerId: activePlayer.id,
          monsterId: targetMonster.id,
          position: targetOriginalPosition,
          enteredFrom: activeOriginalPosition,
          source: 'witch_swap',
        }
      : undefined,
  };
}
