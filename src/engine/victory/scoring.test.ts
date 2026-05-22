import { describe, expect, it } from 'vitest';

import { createTestPlayer, createTestState } from '../../test/gameStateFactory';
import { calculateWinners, createVictoryState } from './scoring';

describe('victory scoring', () => {
  it('returns every player tied for the highest treasure score', () => {
    const state = createTestState({
      players: [
        createTestPlayer({ id: 'player_human', treasurePoints: 3 }),
        createTestPlayer({ id: 'player_ai_1', kind: 'ai', treasurePoints: 5 }),
        createTestPlayer({ id: 'player_ai_2', kind: 'ai', treasurePoints: 5 }),
      ],
    });

    expect(calculateWinners(state)).toEqual(['player_ai_1', 'player_ai_2']);
  });

  it('keeps the dragon slayer separate from the point winners', () => {
    const state = createTestState({
      players: [
        createTestPlayer({ id: 'player_human', treasurePoints: 2 }),
        createTestPlayer({ id: 'player_ai_1', kind: 'ai', treasurePoints: 6 }),
      ],
    });

    expect(createVictoryState(state, 'player_human')).toEqual({
      defeatedDragonByPlayerId: 'player_human',
      winnerPlayerIds: ['player_ai_1'],
    });
  });
});
