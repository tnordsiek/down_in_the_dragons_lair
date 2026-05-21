import { describe, expect, it } from 'vitest';

import { playerHeroLabel } from '../../data/playerLabels';
import { createNewGame } from '../setup/createGame';
import {
  drawPendingTileForExploration,
  hasPendingTileAtTarget,
  placePendingTile,
  rotatePendingTilePreview,
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
    const expectedPlayerLabel = playerHeroLabel(
      state.players[state.activePlayerIndex],
      state.activePlayerIndex,
    );

    expect(pendingState.pendingTile).toEqual(
      expect.objectContaining({
        blueprintId: 'tunnel_straight',
        previewRotation: 0,
        legalRotations: [0, 180],
      }),
    );
    expect(hasPendingTileAtTarget(pendingState)).toBe(true);
    expect(pendingState.eventLog.at(-1)).toEqual(
      expect.objectContaining({
        type: 'tile_drawn',
        message: 'Drew tunnel_straight for exploration A',
        playerLabel: expectedPlayerLabel,
        exploration: expect.objectContaining({
          blueprintId: 'tunnel_straight',
          direction: 'A',
          legalRotations: [0, 180],
        }),
      }),
    );
  });

  it('rotates the preview tile and skips invalid orientations', () => {
    const state = {
      ...createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'preview-rotation-seed',
      }),
      tileStack: ['room_corner' as const],
    };
    const pendingState = drawPendingTileForExploration(state, 'A');
    const clockwise = rotatePendingTilePreview(pendingState, 'clockwise');
    const counterclockwise = rotatePendingTilePreview(
      pendingState,
      'counterclockwise',
    );

    expect(pendingState.pendingTile?.previewRotation).toBe(0);
    expect(clockwise.pendingTile?.previewRotation).toBe(90);
    expect(counterclockwise.pendingTile?.previewRotation).toBe(180);
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
    const expectedPlayerLabel = playerHeroLabel(
      state.players[state.activePlayerIndex],
      state.activePlayerIndex,
    );

    expect(placedState.pendingTile).toBeUndefined();
    expect(placedState.board).toHaveLength(2);
    expect(placedState.players[placedState.activePlayerIndex].position).toEqual(
      {
        boardX: 0,
        boardY: -1,
      },
    );
    expect(placedState.remainingSteps).toBe(3);
    expect(placedState.eventLog.at(-1)).toEqual(
      expect.objectContaining({
        type: 'tile_placed',
        message: 'Placed tunnel_straight at 0,-1',
        playerLabel: expectedPlayerLabel,
        exploration: expect.objectContaining({
          blueprintId: 'tunnel_straight',
          placedRotation: 0,
          target: { boardX: 0, boardY: -1 },
        }),
      }),
    );
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
