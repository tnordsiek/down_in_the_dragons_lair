import { heroDisplayNames } from './displayNames';
import type { Player } from '../engine/core/types';

export function playerName(playerIndex: number): string {
  if (playerIndex === 0) {
    return 'Human';
  }

  return `AI ${playerIndex}`;
}

export function playerHeroLabel(player: Player, playerIndex: number): string {
  return `${heroDisplayNames[player.heroId]} (${playerName(playerIndex)})`;
}

export function findPlayerIndexById(
  players: Player[],
  playerId: string,
): number {
  return players.findIndex((player) => player.id === playerId);
}

export function playerHeroLabelById(
  players: Player[],
  playerId: string,
): string | undefined {
  const playerIndex = findPlayerIndexById(players, playerId);

  if (playerIndex < 0) {
    return undefined;
  }

  return playerHeroLabel(players[playerIndex], playerIndex);
}
