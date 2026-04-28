import { describe, expect, it } from 'vitest';

import type { GameState } from '../core/types';
import { deserializeGameState, serializeGameState } from './json';

describe('game state serialization foundation', () => {
  it('round-trips the serializable game state shape', () => {
    const state: GameState = {
      schemaVersion: 1,
      phase: 'setup',
      players: [],
      board: [],
      tileStack: ['tunnel_straight'],
      tokenBag: [{ id: 'treasure_chest', kind: 'chest' }],
      activePlayerIndex: 0,
      remainingSteps: 0,
      eventLog: [],
      rng: { seed: 'test-seed', state: 123 },
    };

    expect(deserializeGameState(serializeGameState(state))).toEqual(state);
  });

  it('rejects unsupported schema versions', () => {
    expect(() =>
      deserializeGameState(JSON.stringify({ schemaVersion: 999 })),
    ).toThrow(/Unsupported game state schema/);
  });
});
