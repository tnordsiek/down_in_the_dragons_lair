import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createNewGame } from '../engine/setup/createGame';
import { getUiLegalActions, useSetupStore } from './setupStore';

function resetStore() {
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
}

describe('setup store audio cues', () => {
  // Reset before each test too: the production initial seed is now random, so
  // tests must set a deterministic seed up front (not just clean up afterwards).
  beforeEach(resetStore);
  afterEach(resetStore);

  it('queues a button click cue when starting a game from the setup screen', () => {
    act(() => {
      useSetupStore.getState().startGame();
    });

    expect(useSetupStore.getState().pendingAudioCues).toEqual([
      expect.objectContaining({ assetId: 'sfx_button_click' }),
    ]);
  });

  it('refreshes the seed after starting so consecutive games differ', () => {
    const seedBefore = useSetupStore.getState().seed;

    act(() => {
      useSetupStore.getState().startGame();
    });
    const seedAfterFirst = useSetupStore.getState().seed;

    act(() => {
      useSetupStore.getState().startGame();
    });
    const seedAfterSecond = useSetupStore.getState().seed;

    expect(seedAfterFirst).not.toBe(seedBefore);
    expect(seedAfterSecond).not.toBe(seedAfterFirst);
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
      useSetupStore
        .getState()
        .gameState?.players.map((player) => player.heroId),
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

describe('getUiLegalActions affordances', () => {
  it('exposes UI affordance flags alongside the legal-move lists', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ui-affordances',
    });

    const legal = getUiLegalActions(state);

    expect(Array.isArray(legal.knownMoves)).toBe(true);
    expect(Array.isArray(legal.explorationDirections)).toBe(true);
    expect(Array.isArray(legal.combatFlameSpellChoices)).toBe(true);
    expect(typeof legal.canOpenChest).toBe('boolean');
    expect(typeof legal.canUseHealingSpell).toBe('boolean');
    // A freshly created game has no pending ground loot to resolve.
    expect(legal.canTakePendingLoot).toBe(false);
  });

  it('reports a takeable pending loot item via canTakePendingLoot', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ui-pending-loot',
    });
    const activeIndex = base.activePlayerIndex;
    const activePosition = base.players[activeIndex].position;
    // Clear the active player's spells so a healing spell is definitely storable.
    const players = base.players.map((player, index) =>
      index === activeIndex
        ? { ...player, inventory: { ...player.inventory, spells: [] } }
        : player,
    );
    const state: typeof base = {
      ...base,
      phase: 'loot_resolution',
      players,
      pendingLoot: {
        source: 'ground_item',
        position: activePosition,
        item: { type: 'spell', spellKind: 'healing' },
      },
    };

    expect(getUiLegalActions(state).canTakePendingLoot).toBe(true);
  });
});
