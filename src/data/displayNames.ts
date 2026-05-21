import type {
  HeroId,
  MonsterId,
  SpellKind,
  WeaponBonus,
} from '../engine/core/types';

export const heroDisplayNames = {
  hero_mage: 'Mage',
  hero_valkyrie: 'Valkyrie',
  hero_witch: 'Witch',
  hero_rogue: 'Rogue',
  hero_blade: 'Blade',
  hero_seeress: 'Seeress',
} as const satisfies Record<HeroId, string>;

export const monsterDisplayNames = {
  giant_rat: 'Giant Rat',
  giant_spider: 'Giant Spider',
  mummy: 'Mummy',
  skeleton_turnkey: 'Skeleton Turnkey',
  skeleton_warrior: 'Skeleton Valkyrie',
  skeleton_king: 'Skeleton King',
  fallen: 'Fallen',
  dragon: 'Dragon',
} as const satisfies Record<MonsterId, string>;

export const spellDisplayNames = {
  flame: 'Flame',
  healing: 'Healing',
} as const satisfies Record<SpellKind, string>;

export const weaponDisplayNames = {
  1: 'Weapon +1',
  2: 'Weapon +2',
  3: 'Weapon +3',
} as const satisfies Record<WeaponBonus, string>;
