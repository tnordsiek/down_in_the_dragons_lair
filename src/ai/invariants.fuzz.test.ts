import { beforeAll, describe, expect, it } from 'vitest';

import { applyGameAction } from '../engine/core/actions';
import type { GameState, HeroId } from '../engine/core/types';
import { assertStateInvariants } from '../test/invariants';
import { seededGame } from '../test/scenarios';
import { chooseHeuristicAiAction } from './heuristicAgent';
import { getLegalAiActions } from './legalActions';

/**
 * Step-by-step invariant fuzzing across bounded deterministic games.
 *
 * Drives each game action-by-action and asserts the structural invariants after
 * EVERY step — catching invalid intermediate states, deadlocks (no legal action
 * before game_over) and crashing actions. Bounded to keep the suite fast while
 * still exercising every hero as the active player across many real phases.
 */

const STEP_BOUND = 250;

const HEROES: HeroId[] = [
  'hero_mage',
  'hero_valkyrie',
  'hero_witch',
  'hero_rogue',
  'hero_blade',
  'hero_seeress',
];

type FuzzConfig = { seed: string; humanHeroId: HeroId; aiCount: number };

const CONFIGS: FuzzConfig[] = HEROES.map((humanHeroId, index) => ({
  seed: `fuzz-${humanHeroId}`,
  humanHeroId,
  aiCount: (index % 3) + 1,
}));

function runGame(config: FuzzConfig): { steps: number; reachedEnd: boolean } {
  let current: GameState = seededGame({
    seed: config.seed,
    humanHeroId: config.humanHeroId,
    aiCount: config.aiCount,
    poolScale: 0.5,
  });

  assertStateInvariants(current);

  let step = 0;

  while (step < STEP_BOUND && current.phase !== 'game_over') {
    const legalActions = getLegalAiActions(current);

    if (legalActions.length === 0) {
      throw new Error(
        `Deadlock for ${config.seed}: no legal actions in phase ${current.phase} at step ${step}`,
      );
    }

    const action = chooseHeuristicAiAction(current, legalActions);

    try {
      current = applyGameAction(current, action);
    } catch (error) {
      throw new Error(
        `Action ${action.type} failed for ${config.seed} at step ${step}: ${
          (error as Error).message
        }`,
      );
    }

    step += 1;

    try {
      assertStateInvariants(current);
    } catch (error) {
      throw new Error(
        `Invariant broke for ${config.seed} after ${action.type} at step ${step}: ${
          (error as Error).message
        }`,
      );
    }
  }

  return { steps: step, reachedEnd: current.phase === 'game_over' };
}

describe('bounded full-game invariant fuzzing', () => {
  let runs: {
    config: FuzzConfig;
    result: { steps: number; reachedEnd: boolean };
  }[] = [];

  beforeAll(() => {
    runs = CONFIGS.map((config) => ({ config, result: runGame(config) }));
  }, 120000);

  it('holds all state invariants on every step of every game', () => {
    // runGame throws on the first violation; reaching here means all passed.
    expect(runs.length).toBe(CONFIGS.length);
  });

  it('progresses each game through many actions without deadlock', () => {
    for (const { config, result } of runs) {
      expect(
        result.steps,
        `game ${config.seed} made no progress`,
      ).toBeGreaterThan(5);
    }
  });
});
