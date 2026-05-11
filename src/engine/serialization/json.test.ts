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
      eventLog: [
        {
          id: 'event-0',
          type: 'combat_resolved',
          message: 'Resolved combat: Victory',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (player_human)',
          combat: {
            monsterId: 'giant_rat',
            monsterStrength: 5,
            dice: [6, 6],
            total: 12,
            outcome: 'victory',
            weaponBonus: 0,
            flameSpellCount: 0,
            warlockSacrificeBonus: 0,
            oracleBonus: 0,
          },
        },
      ],
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
