import { monsterDefinitions } from '../data/monsters';
import type { Item, MonsterId } from '../engine/core/types';
import { itemLabel } from './items';

export function getMonsterTileTooltip(monsterId: MonsterId): string {
  const monster = monsterDefinitions[monsterId];

  return `${monster.displayName}: Strength ${monster.strength}`;
}

export function getChestTileTooltip(): string {
  return 'Treasure Chest: Opens with a key';
}

export function getItemTileTooltip(item: Item): string {
  if (item.type === 'weapon') {
    return `${itemLabel(item)}: Combat bonus +${item.bonus}`;
  }

  if (item.type === 'spell') {
    if (item.spellKind === 'flame') {
      return 'Flame Spell: Adds +1 combat strength';
    }

    return 'Healing Spell: Teleports a hero to a discovered healing tile';
  }

  return 'Key: Opens a treasure chest';
}

export function getHeroPortraitTooltip(): string {
  return 'Right-click to center the map on this hero. Left-click to show the hero description.';
}
