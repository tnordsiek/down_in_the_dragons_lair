import { beforeAll, describe, expect, it } from 'vitest';

import { applyGameAction } from '../engine/core/actions';
import type { GameState } from '../engine/core/types';
import { assertStateInvariants } from '../test/invariants';
import { seededGame, traceAutoplay } from '../test/scenarios';
import { getLegalAiActions } from './legalActions';

/**
 * Properties the legal-action surface must satisfy across many real states.
 * This contract is shared by the AI and the UI, so it must survive any engine
 * refactor: every advertised action applies cleanly and keeps the state valid,
 * and a finished game offers nothing. States are sampled from bounded
 * deterministic autoplay to stay fast.
 */

const STEP_BOUND = 250;
const SEEDS = ['prop-1', 'prop-2', 'prop-3'];

describe('legal-action properties', () => {
  let states: GameState[] = [];

  beforeAll(() => {
    states = SEEDS.flatMap(
      (seed) =>
        traceAutoplay(seededGame({ seed, aiCount: 2, poolScale: 0.5 }), {
          sampleEvery: 8,
          maxActions: STEP_BOUND,
        }).sampledStates,
    );
  }, 120000);

  it('collected a non-trivial set of states across several phases', () => {
    expect(states.length).toBeGreaterThan(20);
    expect(new Set(states.map((state) => state.phase)).size).toBeGreaterThan(2);
  });

  it('every legal action applies without throwing and preserves invariants', () => {
    for (const state of states) {
      if (state.phase === 'game_over') {
        continue;
      }

      for (const action of getLegalAiActions(state)) {
        let next: GameState | undefined;
        expect(
          () => {
            next = applyGameAction(state, action);
          },
          `action ${action.type} from phase ${state.phase}`,
        ).not.toThrow();

        expect(() => assertStateInvariants(next!)).not.toThrow();
      }
    }
  });

  it('offers no legal actions in a game-over state', () => {
    const gameOver: GameState = {
      ...seededGame({ seed: 'prop-go', aiCount: 1 }),
      phase: 'game_over',
      victory: {
        defeatedDragonByPlayerId: 'player_human',
        winnerPlayerIds: ['player_human'],
      },
    };

    expect(getLegalAiActions(gameOver)).toEqual([]);
  });
});
