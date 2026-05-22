import { describe, expect, it } from 'vitest';

import {
  createPosition,
  createTestPlayer,
  createTestState,
  createTestTile,
} from '../../test/gameStateFactory';
import {
  beginGroundLoot,
  canStoreItem,
  createCombatRewardLoot,
  leavePendingLoot,
  rewardToItem,
  swapPendingLoot,
  takePendingLoot,
} from './inventory';

describe('inventory and loot rules', () => {
  it('maps combat rewards to items and skips pure treasure rewards', () => {
    expect(rewardToItem({ type: 'weapon', bonus: 2 })).toEqual({
      type: 'weapon',
      bonus: 2,
    });
    expect(rewardToItem({ type: 'spell', spellKind: 'healing' })).toEqual({
      type: 'spell',
      spellKind: 'healing',
    });
    expect(rewardToItem({ type: 'key' })).toEqual({ type: 'key' });
    expect(rewardToItem({ type: 'treasure', points: 2 })).toBeUndefined();
    expect(
      createCombatRewardLoot({ type: 'treasure', points: 2 }, createPosition(0, 0)),
    ).toBeUndefined();
  });

  it('enforces separate inventory capacity limits by item type', () => {
    const player = createTestPlayer({
      inventory: {
        weapons: [
          { type: 'weapon', bonus: 1 },
          { type: 'weapon', bonus: 2 },
        ],
        spells: [
          { type: 'spell', spellKind: 'flame' },
          { type: 'spell', spellKind: 'healing' },
          { type: 'spell', spellKind: 'flame' },
        ],
        keyCount: 1,
      },
    });

    expect(canStoreItem(player, { type: 'weapon', bonus: 3 })).toBe(false);
    expect(canStoreItem(player, { type: 'spell', spellKind: 'healing' })).toBe(
      false,
    );
    expect(canStoreItem(player, { type: 'key' })).toBe(false);
  });

  it('takes ground loot immediately when the active player has free capacity', () => {
    const state = createTestState({
      phase: 'await_move',
      remainingSteps: 2,
      board: [
        createTestTile({
          looseItems: [{ type: 'weapon', bonus: 3 }],
        }),
      ],
    });

    const resolved = beginGroundLoot(state);

    expect(resolved.phase).toBe('turn_end');
    expect(resolved.players[0].inventory.weapons).toEqual([
      { type: 'weapon', bonus: 3 },
    ]);
    expect(resolved.board[0].looseItems).toEqual([]);
  });

  it('enters loot resolution when ground loot cannot be stored immediately', () => {
    const state = createTestState({
      phase: 'await_move',
      board: [
        createTestTile({
          looseItems: [{ type: 'weapon', bonus: 3 }],
        }),
      ],
      players: [
        createTestPlayer({
          inventory: {
            weapons: [
              { type: 'weapon', bonus: 1 },
              { type: 'weapon', bonus: 2 },
            ],
            spells: [],
            keyCount: 0,
          },
        }),
      ],
    });

    const resolved = beginGroundLoot(state);

    expect(resolved.phase).toBe('loot_resolution');
    expect(resolved.pendingLoot).toEqual({
      source: 'ground_item',
      position: createPosition(0, 0),
      item: { type: 'weapon', bonus: 3 },
    });
  });

  it('swaps a pending loot item into the chosen slot and drops the previous item on the tile', () => {
    const state = createTestState({
      phase: 'loot_resolution',
      pendingLoot: {
        source: 'ground_item',
        position: createPosition(0, 0),
        item: { type: 'weapon', bonus: 3 },
      },
      board: [
        createTestTile({
          looseItems: [{ type: 'weapon', bonus: 3 }],
        }),
      ],
      players: [
        createTestPlayer({
          inventory: {
            weapons: [
              { type: 'weapon', bonus: 1 },
              { type: 'weapon', bonus: 2 },
            ],
            spells: [],
            keyCount: 0,
          },
        }),
      ],
    });

    const resolved = swapPendingLoot(state, {
      kind: 'weapon',
      index: 1,
    });

    expect(resolved.phase).toBe('turn_end');
    expect(resolved.players[0].inventory.weapons).toEqual([
      { type: 'weapon', bonus: 1 },
      { type: 'weapon', bonus: 3 },
    ]);
    expect(resolved.board[0].looseItems).toEqual([{ type: 'weapon', bonus: 2 }]);
    expect(resolved.pendingLoot).toBeUndefined();
  });

  it('leaves a combat reward visible on the tile when the player declines it', () => {
    const state = createTestState({
      phase: 'loot_resolution',
      pendingLoot: {
        source: 'combat_reward',
        position: createPosition(0, 0),
        item: { type: 'key' },
      },
      board: [createTestTile({ looseItems: [] })],
    });

    const resolved = leavePendingLoot(state);

    expect(resolved.phase).toBe('turn_end');
    expect(resolved.board[0].looseItems).toEqual([{ type: 'key' }]);
  });

  it('throws useful errors for invalid pending loot actions', () => {
    const noPendingState = createTestState({
      phase: 'loot_resolution',
      pendingLoot: undefined,
    });
    const fullInventoryState = createTestState({
      phase: 'loot_resolution',
      pendingLoot: {
        source: 'combat_reward',
        position: createPosition(0, 0),
        item: { type: 'weapon', bonus: 3 },
      },
      board: [createTestTile({ looseItems: [] })],
      players: [
        createTestPlayer({
          inventory: {
            weapons: [
              { type: 'weapon', bonus: 1 },
              { type: 'weapon', bonus: 2 },
            ],
            spells: [],
            keyCount: 0,
          },
        }),
      ],
    });

    expect(() => takePendingLoot(noPendingState)).toThrow(/No pending loot/i);
    expect(() => takePendingLoot(fullInventoryState)).toThrow(
      /Inventory capacity is full/i,
    );
    expect(() =>
      swapPendingLoot(fullInventoryState, { kind: 'spell', index: 0 }),
    ).toThrow(/Swap slot must match/i);
  });
});
