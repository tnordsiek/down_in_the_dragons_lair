import { describe, expect, it } from 'vitest';

import type { GameState } from '../core/types';
import { deserializeGameState, serializeGameState } from './json';

describe('game state serialization foundation', () => {
  it('round-trips the serializable game state shape', () => {
    const state: GameState = {
      schemaVersion: 2,
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
          type: 'game_started',
          message: 'Game started. Mage (Human) takes the first turn.',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (Human)',
          startPlayer: {
            rounds: [
              {
                roundType: 'initial',
                rolls: [
                  {
                    playerId: 'player_human',
                    playerHeroId: 'hero_mage',
                    playerLabel: 'Mage (Human)',
                    roll: 6,
                  },
                  {
                    playerId: 'player_ai_1',
                    playerHeroId: 'hero_rogue',
                    playerLabel: 'Rogue (AI 1)',
                    roll: 4,
                  },
                ],
              },
            ],
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

  it('rejects saved states with renamed-away hero ids', () => {
    expect(() =>
      deserializeGameState(
        JSON.stringify({
          schemaVersion: 2,
          phase: 'turn_start',
          players: [
            {
              id: 'player_human',
              kind: 'human',
              heroId: 'hero_swordsman',
            },
          ],
          board: [],
          tileStack: [],
          tokenBag: [],
          activePlayerIndex: 0,
          remainingSteps: 4,
          eventLog: [],
          rng: { seed: 'legacy', state: 1 },
        }),
      ),
    ).toThrow(/Unsupported heroId in saved game/);
  });

  it('rejects saved states with renamed-away action or phase strings', () => {
    expect(() =>
      deserializeGameState(
        JSON.stringify({
          schemaVersion: 2,
          phase: 'combat_swordsman_reroll',
          players: [],
          board: [],
          tileStack: [],
          tokenBag: [],
          activePlayerIndex: 0,
          remainingSteps: 0,
          eventLog: [
            {
              id: 'event-0',
              type: 'ui_action',
              message: 'legacy',
              action: { actionType: 'swapWarlockPosition' },
            },
          ],
          rng: { seed: 'legacy', state: 1 },
        }),
      ),
    ).toThrow(/Unsupported game phase/);
  });
});
