import type { MonsterId, RewardDefinition } from '../engine/core/types';

export const monsterRewards = {
  giant_rat: { type: 'weapon', bonus: 1 },
  giant_spider: { type: 'spell', spellKind: 'healing' },
  mummy: { type: 'spell', spellKind: 'flame' },
  skeleton_turnkey: { type: 'key' },
  skeleton_warrior: { type: 'weapon', bonus: 2 },
  skeleton_king: { type: 'weapon', bonus: 3 },
  fallen: { type: 'treasure', points: 1 },
  dragon: { type: 'treasure', points: 1.5 },
} as const satisfies Record<MonsterId, RewardDefinition>;

export const treasurePointValues = {
  treasure_chest: 1,
  fallen_treasure: 1,
  dragon_hoard: 1.5,
} as const;
