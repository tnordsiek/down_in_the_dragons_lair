import { getTileAt } from '../core/board';
import type { GameState, MonsterId } from '../core/types';
import { hasActiveHeroAbility } from './abilities';

export function swapWarlockPosition(
  state: GameState,
  targetPlayerId: string,
): GameState {
  const activePlayer = state.players[state.activePlayerIndex];
  const targetPlayer = state.players.find(
    (player) => player.id === targetPlayerId,
  );

  if (!hasActiveHeroAbility(activePlayer, 'hero_warlock')) {
    throw new Error('Only an uncursed warlock can swap positions');
  }

  if (state.phase !== 'turn_start') {
    throw new Error('Warlock position swap is only allowed at turn start');
  }

  if (!targetPlayer || targetPlayer.id === activePlayer.id) {
    throw new Error('Warlock position swap requires another hero target');
  }

  const activeOriginalPosition = activePlayer.position;
  const targetOriginalPosition = targetPlayer.position;
  const targetTile = getTileAt(state.board, targetOriginalPosition);
  const targetMonster =
    targetTile?.roomToken?.kind === 'monster'
      ? targetTile.roomToken
      : undefined;

  return {
    ...state,
    phase: targetMonster ? 'combat' : 'turn_end',
    players: state.players.map((player, index) => {
      if (index === state.activePlayerIndex) {
        return { ...player, position: targetOriginalPosition };
      }

      if (player.id === targetPlayer.id) {
        return { ...player, position: activeOriginalPosition };
      }

      return player;
    }),
    remainingSteps: 0,
    lastMoveFrom: activeOriginalPosition,
    combat: targetMonster
      ? {
          playerId: activePlayer.id,
          monsterId: targetMonster.id as MonsterId,
          position: targetOriginalPosition,
          enteredFrom: activeOriginalPosition,
          source: 'warlock_swap',
        }
      : undefined,
  };
}
