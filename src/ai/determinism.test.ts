import { beforeAll, describe, expect, it } from 'vitest';

import type { GameState } from '../engine/core/types';
import { serializeGameState } from '../engine/serialization/json';
import { seededGame, traceAutoplay } from '../test/scenarios';

/**
 * Full-stream determinism guard.
 *
 * Setup reproducibility is covered in createGame.test.ts, but nothing pins that
 * the ENTIRE action stream is reproducible. A structural refactor can silently
 * introduce non-determinism — Map/Set iteration order, object key ordering,
 * stray Date.now()/Math.random(). Replaying the same seed twice and requiring
 * byte-identical results is a cheap, sharp detector for exactly that class of bug.
 *
 * The heavy autoplay runs live in beforeAll (with a generous timeout) so the
 * assertions stay fast and the suite survives coverage instrumentation.
 */

const SEEDS = ['det-1', 'det-2'];

type Replay = { seed: string; first: GameState; second: GameState; counts: [number, number] };

describe('full-stream determinism', () => {
  let replays: Replay[] = [];

  beforeAll(() => {
    replays = SEEDS.map((seed) => {
      const first = traceAutoplay(seededGame({ seed, aiCount: 2, poolScale: 0.5 }), {
        maxActions: 250,
      });
      const second = traceAutoplay(seededGame({ seed, aiCount: 2, poolScale: 0.5 }), {
        maxActions: 250,
      });

      return {
        seed,
        first: first.finalState,
        second: second.finalState,
        counts: [first.actionCount, second.actionCount],
      };
    });
  }, 120000);

  it('replays an identical action stream and end state for the same seed', () => {
    for (const replay of replays) {
      expect(replay.counts[1]).toBe(replay.counts[0]);
      expect(replay.second).toEqual(replay.first);
      // Serialized form must be byte-identical (catches key-ordering drift).
      expect(serializeGameState(replay.second)).toBe(serializeGameState(replay.first));
    }
  });

  it('produces identical fresh games for the same seed and options', () => {
    const a = seededGame({ seed: 'det-fresh', aiCount: 3, poolScale: 1 });
    const b = seededGame({ seed: 'det-fresh', aiCount: 3, poolScale: 1 });

    expect(serializeGameState(a)).toBe(serializeGameState(b));
  });
});
