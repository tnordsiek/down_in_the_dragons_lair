import { beforeAll, describe, expect, it } from 'vitest';

import { chooseHeuristicAiAction } from '../../ai/heuristicAgent';
import { getLegalAiActions } from '../../ai/legalActions';
import { seededGame, traceAutoplay } from '../../test/scenarios';
import type { GameState } from '../core/types';
import { applyGameAction } from '../core/actions';
import { deserializeGameState, serializeGameState } from './json';

/**
 * Serialization is a refactor-stable seam: persistence and the engine both
 * depend on a JSON round-trip preserving the full game state. These tests cover
 * realistic mid-game states (not just the freshly created one) and additionally
 * verify that a deserialized state keeps playing identically — the strongest
 * guarantee that nothing meaningful is dropped on the wire. States come from
 * bounded deterministic autoplay to stay fast.
 */

const STEP_BOUND = 250;
const SEEDS = ['rt-1', 'rt-2'];

describe('game state JSON round-trip', () => {
  let states: GameState[] = [];

  beforeAll(() => {
    states = SEEDS.flatMap(
      (seed) =>
        traceAutoplay(seededGame({ seed, aiCount: 2, poolScale: 0.5 }), {
          sampleEvery: 20,
          maxActions: STEP_BOUND,
        }).sampledStates,
    );
  }, 120000);

  it('preserves a freshly created game exactly', () => {
    const state = seededGame({ seed: 'rt-fresh', aiCount: 3 });
    const restored = deserializeGameState(serializeGameState(state));

    expect(restored).toEqual(state);
  });

  it('preserves sampled mid-game states deeply', () => {
    for (const state of states) {
      const restored = deserializeGameState(serializeGameState(state));
      expect(restored).toEqual(state);
    }
  });

  it('continues identically after a round-trip', () => {
    for (const state of states) {
      if (state.phase === 'game_over') {
        continue;
      }

      const restored = deserializeGameState(serializeGameState(state));
      const action = chooseHeuristicAiAction(state, getLegalAiActions(state));

      const fromOriginal = applyGameAction(state, action);
      const fromRestored = applyGameAction(restored, action);

      expect(fromRestored).toEqual(fromOriginal);
    }
  });
});
