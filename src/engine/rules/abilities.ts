import { getTileAt } from '../core/board';
import type { CombatContext, GameState, HeroId, Player } from '../core/types';

export function hasActiveHeroAbility(player: Player, heroId: HeroId): boolean {
  return player.heroId === heroId && !player.isCursed;
}

export function getActivePlayer(state: GameState): Player {
  return state.players[state.activePlayerIndex];
}

export function getActivePlayerAbility(
  state: GameState,
  heroId: HeroId,
): boolean {
  return hasActiveHeroAbility(getActivePlayer(state), heroId);
}

export function getDiscoveredHealingPositions(state: GameState) {
  return state.board
    .filter((tile) => {
      const blueprintId = tile.blueprintId;

      return (
        blueprintId === 'start_cross_healing' ||
        blueprintId === 'healing_corner'
      );
    })
    .map((tile) => ({ boardX: tile.boardX, boardY: tile.boardY }));
}

export function hasMonsterOnActiveTile(state: GameState): boolean {
  const activePlayer = getActivePlayer(state);
  const tile = getTileAt(state.board, activePlayer.position);

  return tile?.roomToken?.kind === 'monster';
}

export function getActiveTileMonsterCombat(state: GameState): CombatContext | undefined {
  const activePlayer = getActivePlayer(state);
  const tile = getTileAt(state.board, activePlayer.position);

  if (tile?.roomToken?.kind !== 'monster') {
    return undefined;
  }

  return {
    playerId: activePlayer.id,
    monsterId: tile.roomToken.id,
    position: activePlayer.position,
    enteredFrom: state.lastMoveFrom ?? activePlayer.position,
  };
}
