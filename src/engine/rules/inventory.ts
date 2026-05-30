import { getTileAt, samePosition } from '../core/board';
import type {
  GameState,
  Item,
  PendingLoot,
  PlacedTile,
  Player,
  RewardDefinition,
} from '../core/types';
import { getContinuationPhaseAfterAction } from '../turns/continuation';

type LootSwapSlot =
  | { kind: 'weapon'; index: number }
  | { kind: 'spell'; index: number };

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

export function createCombatRewardLoot(
  reward: RewardDefinition,
  position: PendingLoot['position'],
): PendingLoot | undefined {
  const item = rewardToItem(reward);

  if (!item) {
    return undefined;
  }

  return {
    source: 'combat_reward',
    position,
    item,
  };
}

export function beginGroundLoot(state: GameState): GameState {
  if (state.phase !== 'turn_start' && state.phase !== 'await_move') {
    throw new Error('Ground loot can only be started during movement');
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const tile = getTileAt(state.board, activePlayer.position);
  const item = tile?.looseItems[0];

  if (!tile || !item) {
    throw new Error('No loose item on active player tile');
  }

  if (canStoreItem(activePlayer, item)) {
    const player = addItemToInventory(activePlayer, item);
    const updatedTile = {
      ...tile,
      looseItems: [],
    };

    return finalizeLootState(state, player, updatedTile, true);
  }

  return {
    ...state,
    phase: 'loot_resolution',
    pendingLoot: {
      source: 'ground_item',
      position: activePlayer.position,
      item,
    },
  };
}

export function leavePendingLoot(state: GameState): GameState {
  if (state.phase !== 'loot_resolution') {
    throw new Error('Loot can only be resolved during loot resolution');
  }

  const pendingLoot = requirePendingLoot(state);
  const isGroundItem = pendingLoot.source === 'ground_item';

  return finalizeLootState(
    state,
    state.players[state.activePlayerIndex],
    updateTileLoot(getTileAt(state.board, pendingLoot.position)!, pendingLoot),
    isGroundItem,
  );
}

export function takePendingLoot(state: GameState): GameState {
  if (state.phase !== 'loot_resolution') {
    throw new Error('Loot can only be resolved during loot resolution');
  }

  const pendingLoot = requirePendingLoot(state);
  const activePlayer = state.players[state.activePlayerIndex];

  if (!canStoreItem(activePlayer, pendingLoot.item)) {
    throw new Error('Inventory capacity is full for this item');
  }

  const player = addItemToInventory(activePlayer, pendingLoot.item);
  const tile = removePendingLootFromTile(
    getTileAt(state.board, pendingLoot.position)!,
    pendingLoot,
  );

  return finalizeLootState(state, player, tile, pendingLoot.source === 'ground_item');
}

export function swapPendingLoot(
  state: GameState,
  inventorySlot: LootSwapSlot,
): GameState {
  if (state.phase !== 'loot_resolution') {
    throw new Error('Loot can only be resolved during loot resolution');
  }

  const pendingLoot = requirePendingLoot(state);
  const activePlayer = state.players[state.activePlayerIndex];

  if (pendingLoot.item.type === 'key') {
    throw new Error('Keys cannot be swapped');
  }

  if (pendingLoot.item.type !== inventorySlot.kind) {
    throw new Error('Swap slot must match the loot item type');
  }

  const swapResult = swapInventoryItem(activePlayer, pendingLoot.item, inventorySlot);
  const tileWithRemovedPendingLoot = removePendingLootFromTile(
    getTileAt(state.board, pendingLoot.position)!,
    pendingLoot,
  );
  const tile = setTileLooseItem(tileWithRemovedPendingLoot, swapResult.droppedItem);

  return finalizeLootState(state, swapResult.player, tile, pendingLoot.source === 'ground_item');
}

export function getLootSwapChoices(player: Player, item: Item): LootSwapSlot[] {
  if (item.type === 'weapon') {
    return player.inventory.weapons.map((_, index) => ({
      kind: 'weapon' as const,
      index,
    }));
  }

  if (item.type === 'spell') {
    return player.inventory.spells.map((_, index) => ({
      kind: 'spell' as const,
      index,
    }));
  }

  return [];
}

export function canBeginGroundLoot(state: GameState): boolean {
  if (state.phase !== 'turn_start' && state.phase !== 'await_move') {
    return false;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const tile = getTileAt(state.board, activePlayer.position);

  return (tile?.looseItems.length ?? 0) > 0;
}

export function canStoreItem(player: Player, item: Item): boolean {
  if (item.type === 'weapon') {
    return player.inventory.weapons.length < 2;
  }

  if (item.type === 'spell') {
    return player.inventory.spells.length < 3;
  }

  return player.inventory.keyCount === 0;
}

function finalizeLootState(
  state: GameState,
  activePlayer: Player,
  tile: PlacedTile,
  forceEndTurn = false,
): GameState {
  const updatedState: GameState = {
    ...state,
    players: state.players.map((player, index) =>
      index === state.activePlayerIndex ? activePlayer : player,
    ),
    board: state.board.map((boardTile) =>
      samePosition(boardTile, tile) ? tile : boardTile,
    ),
    pendingLoot: undefined,
    ...(forceEndTurn ? { turnContinuationReason: undefined } : {}),
  };
  const phase = getContinuationPhaseAfterAction(updatedState);

  return {
    ...updatedState,
    phase,
    turnContinuationReason:
      phase === 'await_move' ? updatedState.turnContinuationReason : undefined,
  };
}

function requirePendingLoot(state: GameState): PendingLoot {
  if (!state.pendingLoot) {
    throw new Error('No pending loot to resolve');
  }

  const tile = getTileAt(state.board, state.pendingLoot.position);

  if (!tile) {
    throw new Error('Pending loot tile is missing');
  }

  return state.pendingLoot;
}

function updateTileLoot(tile: PlacedTile, pendingLoot: PendingLoot): PlacedTile {
  if (pendingLoot.source === 'combat_reward') {
    return setTileLooseItem(tile, pendingLoot.item);
  }

  return tile;
}

function removePendingLootFromTile(
  tile: PlacedTile,
  pendingLoot: PendingLoot,
): PlacedTile {
  if (pendingLoot.source === 'ground_item') {
    return {
      ...tile,
      looseItems: [],
    };
  }

  return tile;
}

function setTileLooseItem(tile: PlacedTile, item: Item): PlacedTile {
  return {
    ...tile,
    looseItems: [item],
  };
}

function addItemToInventory(player: Player, item: Item): Player {
  if (item.type === 'weapon') {
    return {
      ...player,
      inventory: {
        ...player.inventory,
        weapons: [...player.inventory.weapons, item],
      },
    };
  }

  if (item.type === 'spell') {
    return {
      ...player,
      inventory: {
        ...player.inventory,
        spells: [...player.inventory.spells, item],
      },
    };
  }

  return {
    ...player,
    inventory: {
      ...player.inventory,
      keyCount: 1,
    },
  };
}

function swapInventoryItem(
  player: Player,
  item: Item,
  inventorySlot: LootSwapSlot,
): { player: Player; droppedItem: Item } {
  if (inventorySlot.kind === 'weapon' && item.type === 'weapon') {
    const droppedItem = player.inventory.weapons[inventorySlot.index];

    if (!droppedItem) {
      throw new Error('Invalid weapon swap index');
    }

    return {
      player: {
        ...player,
        inventory: {
          ...player.inventory,
          weapons: player.inventory.weapons.map((weapon, index) =>
            index === inventorySlot.index ? item : weapon,
          ),
        },
      },
      droppedItem,
    };
  }

  if (inventorySlot.kind === 'spell' && item.type === 'spell') {
    const droppedItem = player.inventory.spells[inventorySlot.index];

    if (!droppedItem) {
      throw new Error('Invalid spell swap index');
    }

    return {
      player: {
        ...player,
        inventory: {
          ...player.inventory,
          spells: player.inventory.spells.map((spell, index) =>
            index === inventorySlot.index ? item : spell,
          ),
        },
      },
      droppedItem,
    };
  }

  throw new Error('Invalid loot swap');
}
