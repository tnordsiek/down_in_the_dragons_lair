import { describe, expect, it } from 'vitest';

import type { GameState, PlacedTile } from '../engine/core/types';
import { resolveRoomToken } from '../engine/rules/rooms';
import { createNewGame } from '../engine/setup/createGame';
import { getLegalAiActions } from './legalActions';

describe('AI legal actions', () => {
  it('includes teleport move targets when standing on a portal', () => {
    const state = createPortalState();

    expect(getLegalAiActions(state)).toContainEqual({
      type: 'movePlayer',
      target: { boardX: 2, boardY: 0 },
    });
  });

  it('includes ground loot and loot-resolution actions when an item is available', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'loot-actions-seed',
    });
    const groundLootState: GameState = {
      ...state,
      phase: 'await_move',
      activePlayerIndex: 0,
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, position: { boardX: 0, boardY: 0 } } : player,
      ),
      board: [
        {
          ...state.board[0],
          looseItems: [{ type: 'weapon', bonus: 1 }],
        },
      ],
    };

    expect(getLegalAiActions(groundLootState)).toContainEqual({
      type: 'beginLoot',
    });

    const lootResolutionState: GameState = {
      ...groundLootState,
      phase: 'loot_resolution',
      pendingLoot: {
        source: 'ground_item',
        position: { boardX: 0, boardY: 0 },
        item: { type: 'weapon', bonus: 1 },
      },
    };

    expect(getLegalAiActions(lootResolutionState)).toContainEqual({
      type: 'takeLoot',
    });
    expect(getLegalAiActions(lootResolutionState)).toContainEqual({
      type: 'leaveLoot',
    });
  });

  it('keeps movement and end-turn actions legal after resolving a chest with steps remaining', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'chest-actions-seed',
    });
    const roomTile: PlacedTile = {
      tileInstanceId: 'tile-room',
      blueprintId: 'room_cross',
      rotation: 0,
      boardX: 0,
      boardY: -1,
      discovered: true,
      looseItems: [],
    };
    const resolvedChestState = resolveRoomToken({
      ...base,
      phase: 'resolve_room_token',
      board: [...base.board, roomTile],
      players: base.players.map((player, index) =>
        index === base.activePlayerIndex
          ? { ...player, position: { boardX: 0, boardY: -1 } }
          : player,
      ),
      tokenBag: [{ id: 'treasure_chest', kind: 'chest' }],
      remainingSteps: 3,
      lastMoveFrom: { boardX: 0, boardY: 0 },
    });

    expect(resolvedChestState.phase).toBe('await_move');
    expect(getLegalAiActions(resolvedChestState)).toEqual(
      expect.arrayContaining([
        { type: 'endTurn' },
        expect.objectContaining({ type: 'movePlayer' }),
        expect.objectContaining({ type: 'declareExplorationDirection' }),
      ]),
    );
  });

  it('allows only room resolution while a room token is pending', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'pending-room-actions-seed',
    });

    expect(
      getLegalAiActions({
        ...state,
        phase: 'resolve_room_token',
      }),
    ).toEqual([{ type: 'resolveRoomToken' }]);
  });

  it('does not offer healing spell actions during combat', () => {
    const state = withHealingSpell(createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'healing-combat-seed',
    }));

    expect(
      getLegalAiActions({
        ...state,
        phase: 'combat',
        combat: {
          playerId: state.players[state.activePlayerIndex].id,
          monsterId: 'giant_rat',
          position: { boardX: 0, boardY: 0 },
          enteredFrom: { boardX: 0, boardY: -1 },
        },
      }).some((action) => action.type === 'useHealingSpell'),
    ).toBe(false);
  });

  it('does not offer healing spell actions during loot resolution', () => {
    const state = withHealingSpell(createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'healing-loot-seed',
    }));

    expect(
      getLegalAiActions({
        ...state,
        phase: 'loot_resolution',
        pendingLoot: {
          source: 'ground_item',
          position: { boardX: 0, boardY: 0 },
          item: { type: 'weapon', bonus: 1 },
        },
      }).some((action) => action.type === 'useHealingSpell'),
    ).toBe(false);
  });

  it('offers flame-spell combat resolution choices when a rolled combat can still improve', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'flame-combat-actions-seed',
    });

    expect(
      getLegalAiActions({
        ...state,
        phase: 'combat_flame_spells',
        activePlayerIndex: 0,
        players: state.players.map((player, index) =>
          index === 0
            ? {
                ...player,
                heroId: 'hero_warrior',
                inventory: {
                  ...player.inventory,
                  spells: [{ type: 'spell', spellKind: 'flame' }],
                },
              }
            : player,
        ),
        combat: {
          playerId: state.players[0].id,
          monsterId: 'giant_rat',
          position: { boardX: 0, boardY: 0 },
          enteredFrom: { boardX: 0, boardY: -1 },
          rolledDice: [2, 3],
          pendingBaseOutcome: 'draw',
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        { type: 'resolveCombatWithoutFlameSpells' },
        { type: 'resolveCombatWithFlameSpells', flameSpellCount: 1 },
      ]),
    );
  });

  it('offers healing spell actions during free movement phases', () => {
    const state = withHealingSpell(createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'healing-await-move-seed',
    }));

    expect(
      getLegalAiActions({
        ...state,
        phase: 'await_move',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'useHealingSpell' }),
      ]),
    );
  });

  it('allows only end turn during a skipped unconscious turn', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'skip-turn-actions-seed',
    });

    expect(
      getLegalAiActions({
        ...state,
        phase: 'turn_skip',
        activePlayerIndex: 0,
        players: state.players.map((player, index) =>
          index === 0
            ? {
                ...player,
                hp: 0,
                skipNextTurn: true,
              }
            : player,
        ),
      }),
    ).toEqual([{ type: 'endTurn' }]);
  });
});

function createPortalState(): GameState {
  const state = createNewGame({
    humanHeroId: 'hero_mage',
    aiCount: 1,
    seed: 'portal-ai-seed',
  });

  return {
    ...state,
    phase: 'await_move',
    activePlayerIndex: 0,
    players: state.players.map((player, index) =>
      index === 0
        ? { ...player, position: { boardX: 0, boardY: 0 } }
        : player,
    ),
    board: [
      {
        tileInstanceId: 'tile-portal-origin',
        blueprintId: 'teleport_straight',
        rotation: 90,
        boardX: 0,
        boardY: 0,
        discovered: true,
        looseItems: [],
      },
      {
        tileInstanceId: 'tile-portal-target',
        blueprintId: 'teleport_straight',
        rotation: 90,
        boardX: 2,
        boardY: 0,
        discovered: true,
        looseItems: [],
      },
    ],
  };
}

function withHealingSpell(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.activePlayerIndex
        ? {
            ...player,
            inventory: {
              ...player.inventory,
              spells: [{ type: 'spell', spellKind: 'healing' }],
            },
          }
        : player,
    ),
  };
}
