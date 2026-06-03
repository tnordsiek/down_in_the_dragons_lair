import { spellDisplayNames, weaponDisplayNames } from '../data/displayNames';
import type { Item } from '../engine/core/types';

export function itemAssetId(item: Item): string {
  if (item.type === 'weapon') {
    return `item_weapon_${item.bonus}`;
  }

  if (item.type === 'spell') {
    return `item_spell_${item.spellKind}`;
  }

  return 'item_key';
}

export function itemLabel(item: Item): string {
  if (item.type === 'weapon') {
    return weaponDisplayNames[item.bonus];
  }

  if (item.type === 'spell') {
    return `${spellDisplayNames[item.spellKind]} spell`;
  }

  return 'Key';
}
