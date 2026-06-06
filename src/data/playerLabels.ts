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

/**
 * Display name derived from the players array. In Solo games (exactly one human)
 * this matches {@link playerName} ("Human" / "AI 1"). In Hotseat games (more than
 * one human) human players are numbered "Player 1" / "Player 2" / ...
 */
export function playerDisplayName(player: Player, players: Player[]): string {
  const humans = players.filter((entry) => entry.kind === 'human');

  if (player.kind === 'human') {
    if (humans.length <= 1) {
      return 'Human';
    }

    return `Player ${humans.indexOf(player) + 1}`;
  }

  const ais = players.filter((entry) => entry.kind === 'ai');

  return `AI ${ais.indexOf(player) + 1}`;
}

export function playerHeroLabelFor(player: Player, players: Player[]): string {
  return `${heroDisplayNames[player.heroId]} (${playerDisplayName(player, players)})`;
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
