import type { MonsterDefinition, MonsterId } from '../engine/core/types';
import { monsterDisplayNames } from './displayNames';
import { monsterRewards } from './rewards';

export const monsterDefinitions = {
  giant_rat: {
    id: 'giant_rat',
    displayName: monsterDisplayNames.giant_rat,
    strength: 5,
    reward: monsterRewards.giant_rat,
    blocksMovement: true,
  },
  giant_spider: {
    id: 'giant_spider',
    displayName: monsterDisplayNames.giant_spider,
    strength: 6,
    reward: monsterRewards.giant_spider,
    blocksMovement: true,
  },
  mummy: {
    id: 'mummy',
    displayName: monsterDisplayNames.mummy,
    strength: 7,
    reward: monsterRewards.mummy,
    onDefeatEffect: 'curse_other_player',
    blocksMovement: true,
  },
  skeleton_turnkey: {
    id: 'skeleton_turnkey',
    displayName: monsterDisplayNames.skeleton_turnkey,
    strength: 8,
    reward: monsterRewards.skeleton_turnkey,
    blocksMovement: true,
  },
  skeleton_warrior: {
    id: 'skeleton_warrior',
    displayName: monsterDisplayNames.skeleton_warrior,
    strength: 9,
    reward: monsterRewards.skeleton_warrior,
    blocksMovement: true,
  },
  skeleton_king: {
    id: 'skeleton_king',
    displayName: monsterDisplayNames.skeleton_king,
    strength: 10,
    reward: monsterRewards.skeleton_king,
    blocksMovement: true,
  },
  fallen: {
    id: 'fallen',
    displayName: monsterDisplayNames.fallen,
    strength: 12,
    reward: monsterRewards.fallen,
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
