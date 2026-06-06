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
      humanHeroId: 'hero_rogue',
      aiCount: 4,
      seed: 'same-seed',
    });
    const second = createNewGame({
      humanHeroId: 'hero_rogue',
      aiCount: 4,
      seed: 'same-seed',
    });

    expect(first.players.map((player) => player.heroId)).toEqual(
      second.players.map((player) => player.heroId),
    );
    expect(first.activePlayerIndex).toBe(second.activePlayerIndex);
    expect(first.eventLog[0].startPlayer).toEqual(
      second.eventLog[0].startPlayer,
    );
    expect(first.tileStack).toEqual(second.tileStack);
    expect(first.tokenBag).toEqual(second.tokenBag);
  });

  it('scales drawable tiles and tokens with per-entry rounding while keeping one dragon', () => {
    const state = createNewGame({
      humanHeroId: 'hero_rogue',
      aiCount: 2,
      seed: 'scaled-pools',
      poolScale: 1.5,
    });

    expect(state.tileStack).toHaveLength(121);
    expect(state.tokenBag).toHaveLength(80);
    expect(
      state.tokenBag.filter((token) => token.id === 'dragon'),
    ).toHaveLength(1);
  });

  it('is reproducible with the same seed and pool scale', () => {
    const first = createNewGame({
      humanHeroId: 'hero_rogue',
      aiCount: 2,
      seed: 'scaled-repro',
      poolScale: 2.5,
    });
    const second = createNewGame({
      humanHeroId: 'hero_rogue',
      aiCount: 2,
      seed: 'scaled-repro',
      poolScale: 2.5,
    });

    expect(first.tileStack).toEqual(second.tileStack);
    expect(first.tokenBag).toEqual(second.tokenBag);
  });

  it('records complete start-player rolls in the initial event log', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 3,
      seed: 'setup-roll-log',
    });

    expect(state.eventLog[0]).toEqual(
      expect.objectContaining({
        type: 'game_started',
        startPlayer: expect.objectContaining({
          rounds: [
            expect.objectContaining({
              roundType: 'initial',
            }),
          ],
        }),
      }),
    );
    expect(state.eventLog[0].startPlayer?.rounds[0]?.rolls).toHaveLength(4);
  });

  it('rejects invalid AI counts', () => {
    // A single human with no AI is only one player and is rejected.
    expect(() =>
      createNewGame({ humanHeroId: 'hero_mage', aiCount: 0, seed: 'seed' }),
    ).toThrow(/player count/i);
    expect(() =>
      createNewGame({ humanHeroId: 'hero_mage', aiCount: 5, seed: 'seed' }),
    ).toThrow(/aiCount/);
  });

  it('keeps manually selected AI heroes and fills remaining slots from the seed', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 3,
      seed: 'manual-fill-seed',
      selectedAiHeroIds: ['hero_rogue'],
    });

    expect(state.players[0]?.heroId).toBe('hero_mage');
    expect(state.players[1]?.heroId).toBe('hero_rogue');
    expect(state.players).toHaveLength(4);
    expect(new Set(state.players.map((player) => player.heroId)).size).toBe(4);
  });

  it('is reproducible with the same seed and manual AI hero selection', () => {
    const first = createNewGame({
      humanHeroId: 'hero_witch',
      aiCount: 3,
      seed: 'manual-repro-seed',
      selectedAiHeroIds: ['hero_blade', 'hero_rogue'],
    });
    const second = createNewGame({
      humanHeroId: 'hero_witch',
      aiCount: 3,
      seed: 'manual-repro-seed',
      selectedAiHeroIds: ['hero_blade', 'hero_rogue'],
    });

    expect(first.players.map((player) => player.heroId)).toEqual(
      second.players.map((player) => player.heroId),
    );
  });

  it('rejects invalid manual AI hero selections', () => {
    expect(() =>
      createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 2,
        seed: 'duplicate-ai',
        selectedAiHeroIds: ['hero_rogue', 'hero_rogue'],
      }),
    ).toThrow(/unique/);
    expect(() =>
      createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'human-as-ai',
        selectedAiHeroIds: ['hero_mage'],
      }),
    ).toThrow(/human hero/);
    expect(() =>
      createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'too-many-ai-picks',
        selectedAiHeroIds: ['hero_rogue', 'hero_blade'],
      }),
    ).toThrow(/exceed aiCount/);
    expect(() =>
      createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'unknown-ai',
        selectedAiHeroIds: ['hero_archer' as never],
      }),
    ).toThrow(/Unknown AI hero/);
  });
});
