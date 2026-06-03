import { heroDisplayNames, monsterDisplayNames } from '../data/displayNames';
import {
  playerHeroLabel as sharedPlayerHeroLabel,
  playerName as sharedPlayerName,
} from '../data/playerLabels';
import type { HeroId, MonsterId, Player, TileSide } from '../engine/core/types';

export const sideLabels = {
  A: 'North',
  B: 'East',
  C: 'South',
  D: 'West',
} as const satisfies Record<TileSide, string>;

export function heroName(heroId: HeroId): string {
  return heroDisplayNames[heroId];
}

export function monsterName(monsterId: MonsterId): string {
  return monsterDisplayNames[monsterId];
}

export function playerName(_player: Player, playerIndex: number): string {
  return sharedPlayerName(playerIndex);
}

export function playerHeroLabel(player: Player, playerIndex: number): string {
  return sharedPlayerHeroLabel(player, playerIndex);
}

export function formatTreasurePoints(points: number): string {
  return Number.isInteger(points) ? `${points}` : points.toFixed(1);
}
