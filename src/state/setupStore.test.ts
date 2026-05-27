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
        opponentSelectionMode: 'random',
        selectedOpponentHeroIds: [],
        seed: 'v1-local-seed',
        poolScale: 1,
        musicEnabled: true,
        sfxEnabled: true,
        movementPointsEnabled: true,
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

  it('passes manual opponent picks into the started game', () => {
    act(() => {
      useSetupStore.setState({
        selectedHeroId: 'hero_mage',
        aiCount: 2,
        opponentSelectionMode: 'manual',
        selectedOpponentHeroIds: ['hero_rogue'],
      });
      useSetupStore.getState().startGame();
    });

    expect(
      useSetupStore.getState().gameState?.players.map((player) => player.heroId),
    ).toEqual(['hero_mage', 'hero_rogue', expect.any(String)]);
  });

  it('passes the configured pool scale into the started game', () => {
    act(() => {
      useSetupStore.setState({
        poolScale: 1.5,
      });
      useSetupStore.getState().startGame();
    });

    expect(useSetupStore.getState().gameState?.tileStack).toHaveLength(121);
    expect(useSetupStore.getState().gameState?.tokenBag).toHaveLength(80);
  });

  it('trims selected opponents when the AI count is reduced', () => {
    act(() => {
      useSetupStore.setState({
        aiCount: 3,
        selectedOpponentHeroIds: ['hero_rogue', 'hero_blade', 'hero_witch'],
      });
      useSetupStore.getState().setAiCount(2);
    });

    expect(useSetupStore.getState().selectedOpponentHeroIds).toEqual([
      'hero_rogue',
      'hero_blade',
    ]);
  });

  it('removes the human hero from manual opponent picks when the hero changes', () => {
    act(() => {
      useSetupStore.setState({
        selectedHeroId: 'hero_mage',
        aiCount: 2,
        selectedOpponentHeroIds: ['hero_rogue', 'hero_blade'],
      });
      useSetupStore.getState().setSelectedHeroId('hero_rogue');
    });

    expect(useSetupStore.getState().selectedOpponentHeroIds).toEqual([
      'hero_blade',
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
