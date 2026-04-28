import { describe, expect, it } from 'vitest';

import { createNewGame } from '../setup/createGame';
import {
  drawPendingTileForExploration,
  hasPendingTileAtTarget,
  placePendingTile,
} from './exploration';

describe('exploration flow', () => {
  it('draws a pending tile with only legal rotations for the announced direction', () => {
    const state = {
      ...createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'explore-seed',
      }),
      tileStack: ['tunnel_straight' as const],
    };

    const pendingState = drawPendingTileForExploration(state, 'A');

    expect(pendingState.pendingTile).toEqual(
      expect.objectContaining({
        blueprintId: 'tunnel_straight',
        legalRotations: [0, 180],
      }),
    );
    expect(hasPendingTileAtTarget(pendingState)).toBe(true);
  });

  it('places a pending tile and moves the active player onto it', () => {
    const state = {
      ...createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'place-seed',
      }),
      tileStack: ['tunnel_straight' as const],
    };
    const pendingState = drawPendingTileForExploration(state, 'A');
    const placedState = placePendingTile(pendingState, 0);

    expect(placedState.pendingTile).toBeUndefined();
    expect(placedState.board).toHaveLength(2);
    expect(placedState.players[placedState.activePlayerIndex].position).toEqual(
      {
        boardX: 0,
        boardY: -1,
      },
    );
    expect(placedState.remainingSteps).toBe(3);
  });

  it('rejects illegal pending tile rotations', () => {
    const state = {
      ...createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'illegal-rotation-seed',
      }),
      tileStack: ['tunnel_straight' as const],
    };
    const pendingState = drawPendingTileForExploration(state, 'A');

    expect(() => placePendingTile(pendingState, 90)).toThrow(/Illegal/);
  });
});
