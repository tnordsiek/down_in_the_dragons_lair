import { beforeAll, describe, expect, it } from 'vitest';

import type { GameState } from '../engine/core/types';
import { assertStateInvariants } from '../test/invariants';
import { seededGame, traceAutoplay } from '../test/scenarios';

/**
 * Curated full-game golden — pins the COMPLETE deterministic trajectory of real
 * games that run all the way to a dragon defeat.
 *
 * The bounded golden (fullGame.golden.test.ts) only fingerprints the first ~200
 * actions, so mid- and late-game behavior is unpinned there. These seeds were
 * discovered to terminate quickly at poolScale 0.5 (small dungeon → the dragon is
 * found and beaten in a few hundred actions). Snapshotting their full outcome
 * locks the entire start→endgame path: any structural refactor that changes
 * observable behavior anywhere along the way breaks the snapshot.
 *
 * Assumes the heuristic AI is frozen (it is the oracle). If the AI is changed on
 * purpose, regenerate with `vitest -u`.
 */

type FinishConfig = { seed: string; aiCount: number };

// Seeds found to reach game_over fastest at poolScale 0.5 (diverse winners /
// player counts). See plan Teil 2, step 1.
const CONFIGS: FinishConfig[] = [
  { seed: 'fin-2-19', aiCount: 2 },
  { seed: 'fin-2-6', aiCount: 2 },
  { seed: 'fin-1-9', aiCount: 1 },
  { seed: 'fin-1-13', aiCount: 1 },
];

function outcome(config: FinishConfig, state: GameState, actionCount: number) {
  return {
    seed: config.seed,
    aiCount: config.aiCount,
    actionCount,
    phase: state.phase,
    eventCount: state.eventLog.length,
    boardSize: state.board.length,
    rngState: state.rng.state,
    defeatedDragonBy: state.victory?.defeatedDragonByPlayerId,
    winners: state.victory?.winnerPlayerIds,
    players: state.players.map((player) => ({
      id: player.id,
      hero: player.heroId,
      hp: player.hp,
      treasurePoints: player.treasurePoints,
      weapons: player.inventory.weapons.length,
      spells: player.inventory.spells.length,
      keyCount: player.inventory.keyCount,
      isCursed: player.isCursed,
      position: player.position,
    })),
  };
}

describe('curated full-game golden', () => {
  let finished: { config: FinishConfig; state: GameState; actionCount: number }[] = [];

  beforeAll(() => {
    finished = CONFIGS.map((config) => {
      const trace = traceAutoplay(seededGame({ ...config, poolScale: 0.5 }), {
        maxActions: 15000,
      });
      return { config, state: trace.finalState, actionCount: trace.actionCount };
    });
  }, 120000);

  it('every curated game reaches a consistent game_over with the dragon defeated', () => {
    for (const { config, state } of finished) {
      expect(state.phase, `seed ${config.seed} did not finish`).toBe('game_over');
      expect(() => assertStateInvariants(state)).not.toThrow();
      expect(state.victory).toBeDefined();

      const defeater = state.players.find(
        (player) => player.id === state.victory?.defeatedDragonByPlayerId,
      );
      expect(defeater).toBeDefined();

      const dragonLeft =
        state.tokenBag.some((token) => token.id === 'dragon') ||
        state.board.some((tile) => tile.roomToken?.id === 'dragon');
      expect(dragonLeft).toBe(false);
    }
  });

  it('pins the complete deterministic outcome of each curated game', () => {
    const outcomes = finished.map(({ config, state, actionCount }) =>
      outcome(config, state, actionCount),
    );

    expect(outcomes).toMatchSnapshot();
  });
});
