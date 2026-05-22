import { act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createNewGame } from '../engine/setup/createGame';
import { useSetupStore } from './setupStore';

describe('setup store audio cues', () => {
  afterEach(() => {
    act(() => {
      useSetupStore.getState().clearSavedGame();
      useSetupStore.setState({
        selectedHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'v1-local-seed',
        musicEnabled: true,
        sfxEnabled: true,
        pendingAudioCues: [],
        lastError: undefined,
        persistenceError: undefined,
      });
    });
    window.localStorage.clear();
  });

  it('queues a button click cue when starting a game from the setup screen', () => {
    act(() => {
      useSetupStore.getState().startGame();
    });

    expect(useSetupStore.getState().pendingAudioCues).toEqual([
      expect.objectContaining({ assetId: 'sfx_button_click' }),
    ]);
  });

  it('queues a curse cue when selecting a mummified_priest curse target', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'curse-audio',
    });

    act(() => {
      useSetupStore.setState({
        gameState: {
          ...state,
          phase: 'combat_curse_target',
          combat: {
            playerId: 'player_human',
            monsterId: 'mummified_priest',
            position: { boardX: 0, boardY: 0 },
            enteredFrom: { boardX: 0, boardY: -1 },
            pendingResolutionPhase: 'await_move',
            pendingCombatEvent: {
              monsterId: 'mummified_priest',
              monsterStrength: 7,
              dice: [6, 4],
              total: 10,
              outcome: 'victory',
              weaponBonus: 0,
              flameSpellCount: 0,
              warlockSacrificeBonus: 0,
              oracleBonus: 0,
            },
          },
        },
        pendingAudioCues: [],
      });
    });

    act(() => {
      useSetupStore
        .getState()
        .dispatch({ type: 'selectCurseTarget', targetPlayerId: 'player_ai_1' });
    });

    expect(useSetupStore.getState().pendingAudioCues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assetId: 'sfx_curse_apply' }),
      ]),
    );
  });
});
