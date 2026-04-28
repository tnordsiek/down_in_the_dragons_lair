import { describe, expect, it } from 'vitest';

import { createNewGame } from './createGame';

describe('createNewGame', () => {
  it('initializes a valid game with unique heroes and finite stacks', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 3,
      seed: 'setup-seed',
    });

    expect(state.players).toHaveLength(4);
    expect(new Set(state.players.map((player) => player.heroId)).size).toBe(4);
    expect(state.players.every((player) => player.hp === 5)).toBe(true);
    expect(state.board).toEqual([
      expect.objectContaining({
        blueprintId: 'start_cross_healing',
        boardX: 0,
        boardY: 0,
      }),
    ]);
    expect(state.tileStack).toHaveLength(79);
    expect(state.tokenBag).toHaveLength(53);
    expect(state.remainingSteps).toBe(4);
  });

  it('is reproducible for player order, start player and draw stacks', () => {
    const first = createNewGame({
      humanHeroId: 'hero_thief',
      aiCount: 4,
      seed: 'same-seed',
    });
    const second = createNewGame({
      humanHeroId: 'hero_thief',
      aiCount: 4,
      seed: 'same-seed',
    });

    expect(first.players.map((player) => player.heroId)).toEqual(
      second.players.map((player) => player.heroId),
    );
    expect(first.activePlayerIndex).toBe(second.activePlayerIndex);
    expect(first.tileStack).toEqual(second.tileStack);
    expect(first.tokenBag).toEqual(second.tokenBag);
  });

  it('rejects invalid AI counts', () => {
    expect(() =>
      createNewGame({ humanHeroId: 'hero_mage', aiCount: 0, seed: 'seed' }),
    ).toThrow(/aiCount/);
    expect(() =>
      createNewGame({ humanHeroId: 'hero_mage', aiCount: 5, seed: 'seed' }),
    ).toThrow(/aiCount/);
  });
});
