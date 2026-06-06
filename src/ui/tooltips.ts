import { monsterDefinitions } from '../data/monsters';
import type { Item, MonsterId } from '../engine/core/types';
import type { Translations } from '../i18n/en';

export function getMonsterTileTooltip(
  monsterId: MonsterId,
  t: Translations,
): string {
  const monster = monsterDefinitions[monsterId];

  return t.tooltips.monsterStrength(
    t.displayNames.monsters[monsterId],
    monster.strength,
  );
}

export function getChestTileTooltip(t: Translations): string {
  return t.tooltips.treasureChest;
}

export function getItemTileTooltip(item: Item, t: Translations): string {
  if (item.type === 'weapon') {
    const label = t.displayNames.weapons[item.bonus];
    return t.tooltips.weaponBonus(label, item.bonus);
  }

  if (item.type === 'spell') {
    if (item.spellKind === 'flame') {
      return t.tooltips.fireballSpell;
    }

    return t.tooltips.healingSpell;
  }

  return t.tooltips.key;
}

export function getHeroPortraitTooltip(t: Translations): string {
  return t.tooltips.heroPortrait;
}
