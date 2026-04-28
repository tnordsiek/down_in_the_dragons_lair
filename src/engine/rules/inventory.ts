import type { Item, PlacedTile, Player, RewardDefinition } from '../core/types';

export function rewardToItem(reward: RewardDefinition): Item | undefined {
  switch (reward.type) {
    case 'weapon':
      return { type: 'weapon', bonus: reward.bonus };
    case 'spell':
      return { type: 'spell', spellKind: reward.spellKind };
    case 'key':
      return { type: 'key' };
    case 'treasure':
      return undefined;
  }
}

export function applyRewardToPlayer(
  player: Player,
  tile: PlacedTile,
  reward: RewardDefinition,
): { player: Player; tile: PlacedTile } {
  if (reward.type === 'treasure') {
    return {
      player: {
        ...player,
        treasurePoints: player.treasurePoints + reward.points,
      },
      tile,
    };
  }

  const item = rewardToItem(reward);

  if (!item) {
    return { player, tile };
  }

  if (item.type === 'weapon') {
    if (player.inventory.weapons.length < 2) {
      return {
        player: {
          ...player,
          inventory: {
            ...player.inventory,
            weapons: [...player.inventory.weapons, item],
          },
        },
        tile,
      };
    }

    return { player, tile: leaveItemOnTile(tile, item) };
  }

  if (item.type === 'spell') {
    if (player.inventory.spells.length < 3) {
      return {
        player: {
          ...player,
          inventory: {
            ...player.inventory,
            spells: [...player.inventory.spells, item],
          },
        },
        tile,
      };
    }

    return { player, tile: leaveItemOnTile(tile, item) };
  }

  if (player.inventory.keyCount === 0) {
    return {
      player: {
        ...player,
        inventory: {
          ...player.inventory,
          keyCount: 1,
        },
      },
      tile,
    };
  }

  return { player, tile: leaveItemOnTile(tile, item) };
}

function leaveItemOnTile(tile: PlacedTile, item: Item): PlacedTile {
  return {
    ...tile,
    looseItems: [...tile.looseItems, item],
  };
}
