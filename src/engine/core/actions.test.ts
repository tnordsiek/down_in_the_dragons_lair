import { describe, expect, it } from 'vitest';

import { applyGameAction } from './actions';
import { createNewGame } from '../setup/createGame';

describe('game action transitions', () => {
  it('starts a game through the action interface', () => {
    const state = applyGameAction(undefined, {
      type: 'startGame',
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'action-seed',
    });

    expect(state.players).toHaveLength(2);
    expect(state.phase).toBe('turn_start');
  });

  it('can declare and place exploration through actions', () => {
    const state = applyGameAction(undefined, {
      type: 'startGame',
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'action-explore-seed',
    });
    const pendingState = applyGameAction(
      { ...state, tileStack: ['tunnel_straight'] },
      { type: 'declareExplorationDirection', direction: 'A' },
    );
    const placedState = applyGameAction(pendingState, {
      type: 'placePendingTile',
      rotation: 0,
    });

    expect(placedState.board).toHaveLength(2);
    expect(placedState.phase).toBe('await_move');
  });

  it('can rotate a pending tile preview through actions', () => {
    const state = applyGameAction(undefined, {
      type: 'startGame',
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'action-rotate-seed',
    });
    const pendingState = applyGameAction(
      { ...state, tileStack: ['room_corner'] },
      { type: 'declareExplorationDirection', direction: 'A' },
    );
    const rotatedState = applyGameAction(pendingState, {
      type: 'rotatePendingTilePreview',
      direction: 'clockwise',
    });

    expect(rotatedState.pendingTile?.previewRotation).toBe(90);
  });

  it('does not allow ending the turn while a room token must be resolved', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'action-room-end-turn-seed',
    });

    expect(() =>
      applyGameAction(
        {
          ...state,
          phase: 'resolve_room_token',
        },
        { type: 'endTurn' },
      ),
    ).toThrow('Resolve the room token before ending the turn');
  });
});
