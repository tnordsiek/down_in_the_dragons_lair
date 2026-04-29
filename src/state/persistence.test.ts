import { beforeEach, describe, expect, it } from 'vitest';

import { createNewGame } from '../engine/setup/createGame';
import {
  clearPersistedGameState,
  loadPersistedGameState,
  persistedGameStateKey,
  savePersistedGameState,
} from './persistence';

describe('game state persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and loads a complete game state', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 2,
      seed: 'persist-roundtrip',
    });

    savePersistedGameState(state);

    expect(loadPersistedGameState()).toEqual({ ok: true, state });
  });

  it('clears persisted state', () => {
    const state = createNewGame({
      humanHeroId: 'hero_thief',
      aiCount: 1,
      seed: 'persist-clear',
    });

    savePersistedGameState(state);
    clearPersistedGameState();

    expect(loadPersistedGameState()).toBeUndefined();
  });

  it('removes unsupported or malformed versions without throwing', () => {
    window.localStorage.setItem(
      persistedGameStateKey,
      JSON.stringify({ schemaVersion: 999 }),
    );

    const result = loadPersistedGameState();

    expect(result).toEqual({
      ok: false,
      error: 'Unsupported game state schema: 999',
    });
    expect(window.localStorage.getItem(persistedGameStateKey)).toBeNull();
  });
});
