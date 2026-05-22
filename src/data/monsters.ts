import type { MonsterDefinition, MonsterId } from '../engine/core/types';
import { monsterDisplayNames } from './displayNames';
import { monsterRewards } from './rewards';

export const monsterDefinitions = {
  kitchen_rat: {
    id: 'kitchen_rat',
    displayName: monsterDisplayNames.kitchen_rat,
    strength: 5,
    reward: monsterRewards.kitchen_rat,
    blocksMovement: true,
  },
  creepy_spider: {
    id: 'creepy_spider',
    displayName: monsterDisplayNames.creepy_spider,
    strength: 6,
    reward: monsterRewards.creepy_spider,
    blocksMovement: true,
  },
  mummified_priest: {
    id: 'mummified_priest',
    displayName: monsterDisplayNames.mummified_priest,
    strength: 7,
    reward: monsterRewards.mummified_priest,
    onDefeatEffect: 'curse_other_player',
    blocksMovement: true,
  },
  skeleton_key_guardian: {
    id: 'skeleton_key_guardian',
    displayName: monsterDisplayNames.skeleton_key_guardian,
    strength: 8,
    reward: monsterRewards.skeleton_key_guardian,
    blocksMovement: true,
  },
  skeleton_soldier: {
    id: 'skeleton_soldier',
    displayName: monsterDisplayNames.skeleton_soldier,
    strength: 9,
    reward: monsterRewards.skeleton_soldier,
    blocksMovement: true,
  },
  skeleton_lord: {
    id: 'skeleton_lord',
    displayName: monsterDisplayNames.skeleton_lord,
    strength: 10,
    reward: monsterRewards.skeleton_lord,
    blocksMovement: true,
  },
  soulburner: {
    id: 'soulburner',
    displayName: monsterDisplayNames.soulburner,
    strength: 12,
    reward: monsterRewards.soulburner,
    blocksMovement: true,
  },
  dragon: {
    id: 'dragon',
    displayName: monsterDisplayNames.dragon,
    strength: 15,
    reward: monsterRewards.dragon,
    isAncientDragon: true,
    blocksMovement: true,
  },
} as const satisfies Record<MonsterId, MonsterDefinition>;

export const monsterIds = Object.keys(monsterDefinitions) as MonsterId[];
