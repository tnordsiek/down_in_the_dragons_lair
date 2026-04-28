import type {
  HeroId,
  MonsterId,
  SpellKind,
  WeaponBonus,
} from '../engine/core/types';

export const heroDisplayNames = {
  hero_mage: 'Mage',
  hero_warrior: 'Warrior',
  hero_warlock: 'Warlock',
  hero_thief: 'Thief',
  hero_swordsman: 'Swordsman',
  hero_oracle: 'Oracle',
} as const satisfies Record<HeroId, string>;

export const monsterDisplayNames = {
  giant_rat: 'giant_rat',
  giant_spider: 'giant_spider',
  mummy: 'mummy',
  skeleton_turnkey: 'skeleton_turnkey',
  skeleton_warrior: 'skeleton_warrior',
  skeleton_king: 'skeleton_king',
  fallen: 'fallen',
  dragon: 'dragon',
} as const satisfies Record<MonsterId, string>;

export const spellDisplayNames = {
  flame: 'flame',
  healing: 'healing',
} as const satisfies Record<SpellKind, string>;

export const weaponDisplayNames = {
  1: 'weapon_1',
  2: 'weapon_2',
  3: 'weapon_3',
} as const satisfies Record<WeaponBonus, string>;
