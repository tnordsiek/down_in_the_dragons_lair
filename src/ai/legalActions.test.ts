import { describe, expect, it } from 'vitest';

import type { GameState } from '../engine/core/types';
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
