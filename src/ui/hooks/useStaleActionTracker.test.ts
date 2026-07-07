import { describe, expect, it } from 'vitest';

import type { GameAction, GameState } from '../../engine/core/types';
import { createNewGame } from '../../engine/setup/createGame';
import { createSeedScopedStaleTracker } from './useStaleActionTracker';

function baseState(seed: string): GameState {
  return createNewGame({
    humanHeroId: 'hero_mage',
    aiCount: 1,
    seed,
  });
}

describe('createSeedScopedStaleTracker', () => {
  it('keeps the same tracker across repeated requests for the same seed', () => {
    const scoped = createSeedScopedStaleTracker();
    const before = baseState('scoped-tracker-same-seed');
    // A fully explored move back and forth is non-progress and increments the counter.
    const after: GameState = {
      ...before,
      tileStack: [],
      tokenBag: [],
      lastMoveFrom: { boardX: 1, boardY: 0 },
    };
    const action: GameAction = {
      type: 'movePlayer',
      target: { boardX: 1, boardY: 0 },
    };

    const stateWithoutStacks: GameState = {
      ...before,
      tileStack: [],
      tokenBag: [],
    };
    scoped.forSeed(before.rng.seed).record(stateWithoutStacks, after, action);

    expect(scoped.forSeed(before.rng.seed).staleActionCount).toBe(1);
  });

  it('starts a fresh tracker when the seed changes', () => {
    const scoped = createSeedScopedStaleTracker();
    const before = baseState('scoped-tracker-first-game');
    const stateWithoutStacks: GameState = {
      ...before,
      tileStack: [],
      tokenBag: [],
    };
    const after: GameState = {
      ...stateWithoutStacks,
      lastMoveFrom: { boardX: 1, boardY: 0 },
    };
    const action: GameAction = {
      type: 'movePlayer',
      target: { boardX: 1, boardY: 0 },
    };

    scoped.forSeed(before.rng.seed).record(stateWithoutStacks, after, action);
    expect(scoped.forSeed(before.rng.seed).staleActionCount).toBe(1);

    expect(scoped.forSeed('scoped-tracker-second-game').staleActionCount).toBe(0);
    // And returning to the old seed does NOT resurrect the old tracker either —
    // a seed change always means a new game.
    expect(scoped.forSeed(before.rng.seed).staleActionCount).toBe(0);
  });

  it('tracks recently vacated tiles per player', () => {
    const scoped = createSeedScopedStaleTracker();
    const before = baseState('scoped-tracker-positions');
    const mover = before.players[0];
    const after: GameState = {
      ...before,
      players: before.players.map((player, index) =>
        index === 0
          ? { ...player, position: { boardX: 1, boardY: 0 } }
          : player,
      ),
    };
    const action: GameAction = {
      type: 'movePlayer',
      target: { boardX: 1, boardY: 0 },
    };

    scoped.forSeed(before.rng.seed).record(before, after, action);

    expect(scoped.forSeed(before.rng.seed).recentPositionKeysFor(mover.id)).toEqual([
      '0,0',
    ]);
    expect(
      scoped.forSeed(before.rng.seed).recentPositionKeysFor(before.players[1].id),
    ).toEqual([]);
  });
});
