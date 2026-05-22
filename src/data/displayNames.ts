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
  kitchen_rat: 'Kitchen Rat',
  creepy_spider: 'Creepy Spider',
  mummified_priest: 'Mummified Priest',
  skeleton_key_guardian: 'Skeleton Key Guardian',
  skeleton_soldier: 'Skeleton Soldier',
  skeleton_lord: 'Skeleton Lord',
  soulburner: 'Soulburner',
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
