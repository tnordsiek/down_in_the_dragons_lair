import { describe, expect, it } from 'vitest';

import { applyGameAction } from './actions';

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
});
