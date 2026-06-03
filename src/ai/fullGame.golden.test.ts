import { beforeAll, describe, expect, it } from 'vitest';

import type { GameState, HeroId } from '../engine/core/types';
import { assertStateInvariants } from '../test/invariants';
import { seededGame, traceAutoplay } from '../test/scenarios';

/**
 * Golden behavioral fingerprint of bounded deterministic autoplay.
 *
 * Playing a full heuristic-AI game to the dragon is both slow (late-game
 * pathfinding is super-linear in board size) and not guaranteed to terminate,
 * which makes "play to game_over" a poor regression target. Instead we run a
 * FIXED number of AI actions for several seeds — fully deterministic — and snapshot
 * a compact fingerprint of the resulting state. Any refactor that preserves
 * behavior must reproduce these fingerprints byte for byte. The dedicated
 * victory path is covered separately (see actions.behavior.test.ts).
 */

const STEP_BOUND = 200;

type GameConfig = {
  seed: string;
  humanHeroId: HeroId;
  aiCount: number;
  poolScale?: number;
};

// Each hero as the human, player counts spread across 2–5, both pool scales —
// widening the branchy engine surface captured in the fingerprint.
const CONFIGS: GameConfig[] = [
  { seed: 'golden-mage', humanHeroId: 'hero_mage', aiCount: 1, poolScale: 0.5 },
  {
    seed: 'golden-valkyrie',
    humanHeroId: 'hero_valkyrie',
    aiCount: 2,
    poolScale: 0.5,
  },
  {
    seed: 'golden-witch',
    humanHeroId: 'hero_witch',
    aiCount: 3,
    poolScale: 0.5,
  },
  {
    seed: 'golden-rogue',
    humanHeroId: 'hero_rogue',
    aiCount: 4,
    poolScale: 0.5,
  },
  { seed: 'golden-blade', humanHeroId: 'hero_blade', aiCount: 2, poolScale: 1 },
  {
    seed: 'golden-seeress',
    humanHeroId: 'hero_seeress',
    aiCount: 1,
    poolScale: 1,
  },
];

function fingerprint(
  config: GameConfig,
  state: GameState,
  actionCount: number,
) {
  return {
    seed: config.seed,
    humanHeroId: config.humanHeroId,
    aiCount: config.aiCount,
    poolScale: config.poolScale ?? 1,
    actionCount,
    phase: state.phase,
    activePlayerIndex: state.activePlayerIndex,
    boardSize: state.board.length,
    tileStackSize: state.tileStack.length,
    tokenBagSize: state.tokenBag.length,
    eventCount: state.eventLog.length,
    rngState: state.rng.state,
    players: state.players.map((player) => ({
      id: player.id,
      hero: player.heroId,
      hp: player.hp,
      treasurePoints: player.treasurePoints,
      weapons: player.inventory.weapons.length,
      spells: player.inventory.spells.length,
      keyCount: player.inventory.keyCount,
      isCursed: player.isCursed,
      skipNextTurn: player.skipNextTurn,
      position: player.position,
    })),
  };
}

describe('golden bounded autoplay', () => {
  let states: { config: GameConfig; state: GameState; actionCount: number }[] =
    [];

  beforeAll(() => {
    states = CONFIGS.map((config) => {
      const trace = traceAutoplay(seededGame(config), {
        maxActions: STEP_BOUND,
      });
      return {
        config,
        state: trace.finalState,
        actionCount: trace.actionCount,
      };
    });
  }, 120000);

  it('keeps every bounded state internally consistent', () => {
    for (const { state } of states) {
      expect(() => assertStateInvariants(state)).not.toThrow();
    }
  });

  it('produces a stable behavioral fingerprint per configuration', () => {
    const fingerprints = states.map(({ config, state, actionCount }) =>
      fingerprint(config, state, actionCount),
    );

    expect(fingerprints).toMatchSnapshot();
  });
});
