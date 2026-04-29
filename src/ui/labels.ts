import { heroDisplayNames, monsterDisplayNames } from '../data/displayNames';
import type { HeroId, MonsterId, TileSide } from '../engine/core/types';

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
