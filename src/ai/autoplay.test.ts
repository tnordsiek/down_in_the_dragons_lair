import { describe, expect, it } from 'vitest';

import { createNewGame } from '../engine/setup/createGame';
import { createTestPlayer, createTestState, createTestTile } from '../test/gameStateFactory';
import { playAiControlledTurn, playAiGameToEnd } from './autoplay';

describe('AI autoplay control flow', () => {
  it('stops an AI-controlled turn once the active player changes', () => {
    const state = createTestState({
      phase: 'turn_end',
      activePlayerIndex: 1,
      players: [
        createTestPlayer({ id: 'player_human' }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
        }),
      ],
      board: [
        createTestTile({ boardX: 0, boardY: 0 }),
        createTestTile({ tileInstanceId: 'tile-1', boardX: 1, boardY: 0 }),
      ],
    });

    const result = playAiControlledTurn(state);

    expect(result.actionCount).toBe(1);
    expect(result.state.activePlayerIndex).toBe(0);
    expect(result.state.phase).toBe('turn_start');
  });

  it('throws when the AI turn action budget is exhausted', () => {
    const state = createTestState({
      phase: 'turn_end',
      activePlayerIndex: 1,
      players: [
        createTestPlayer({ id: 'player_human' }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
        }),
      ],
    });

    expect(() => playAiControlledTurn(state, 0)).toThrow(/AI turn exceeded 0 actions/);
  });

  it('returns immediately for a finished game', () => {
    const state = createTestState({
      phase: 'game_over',
    });

    expect(playAiGameToEnd(state)).toEqual({
      state,
      actionCount: 0,
    });
  });

  it('throws the guard error when the overall AI game action budget is too small', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'autoplay-guard',
    });

    expect(() => playAiGameToEnd(state, 0)).toThrow(
      /AI game did not finish within 0 actions/,
    );
  });
});
