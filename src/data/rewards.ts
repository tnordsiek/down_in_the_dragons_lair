import type { MonsterId, RewardDefinition } from '../engine/core/types';

export const monsterRewards = {
  kitchen_rat: { type: 'weapon', bonus: 1 },
  creepy_spider: { type: 'spell', spellKind: 'healing' },
  mummified_priest: { type: 'spell', spellKind: 'flame' },
  skeleton_key_guardian: { type: 'key' },
  skeleton_soldier: { type: 'weapon', bonus: 2 },
  skeleton_lord: { type: 'weapon', bonus: 3 },
  soulburner: { type: 'treasure', points: 1 },
  dragon: { type: 'treasure', points: 1.5 },
} as const satisfies Record<MonsterId, RewardDefinition>;

export const treasurePointValues = {
  treasure_chest: 1,
  soulburner_treasure: 1,
  dragon_hoard: 1.5,
} as const;
