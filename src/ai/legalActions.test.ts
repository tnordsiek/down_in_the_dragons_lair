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
