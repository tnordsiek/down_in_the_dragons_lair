import { create } from 'zustand';

import { applyGameAction } from '../engine/core/actions';
import { createPlayerEventFields } from '../engine/core/events';
import type { GameAction, GameState, HeroId } from '../engine/core/types';
import {
  getLegalExplorationDirections,
  getLegalKnownMoves,
} from '../engine/movement/movement';
import {
  clearPersistedGameState,
  loadPersistedGameState,
  savePersistedGameState,
} from './persistence';
import {
  loadAudioSettings,
  saveAudioSettings,
} from './audioSettings';

export type PendingAudioCue = {
  id: number;
  assetId: string;
};

type SetupState = {
  selectedHeroId: HeroId;
  aiCount: number;
  seed: string;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  gameState?: GameState;
  hasSavedGame: boolean;
  lastError?: string;
  persistenceError?: string;
  pendingAudioCues: PendingAudioCue[];
  setSelectedHeroId: (heroId: HeroId) => void;
  setAiCount: (aiCount: number) => void;
  setSeed: (seed: string) => void;
  toggleMusicEnabled: () => void;
  toggleSfxEnabled: () => void;
  clearPendingAudioCues: () => void;
  startGame: () => void;
  resumeSavedGame: () => void;
  dispatch: (action: GameAction) => void;
  resetGame: () => void;
  clearSavedGame: () => void;
};

const persistedGameState = loadPersistedGameState();
const initialGameState =
  persistedGameState?.ok === true ? persistedGameState.state : undefined;
const initialPersistenceError =
  persistedGameState?.ok === false ? persistedGameState.error : undefined;
const initialAudioSettings = loadAudioSettings();

export const useSetupStore = create<SetupState>((set) => ({
  selectedHeroId: 'hero_mage',
  aiCount: 1,
  seed: 'v1-local-seed',
  musicEnabled: initialAudioSettings.musicEnabled,
  sfxEnabled: initialAudioSettings.sfxEnabled,
  gameState: initialGameState,
  hasSavedGame: initialGameState !== undefined,
  persistenceError: initialPersistenceError,
  pendingAudioCues: [],
  setSelectedHeroId: (selectedHeroId) => set({ selectedHeroId }),
  setAiCount: (aiCount) => set({ aiCount }),
  setSeed: (seed) => set({ seed }),
  toggleMusicEnabled: () =>
    set((state) => {
      const musicEnabled = !state.musicEnabled;

      saveAudioSettings({
        musicEnabled,
        sfxEnabled: state.sfxEnabled,
      });

      return { musicEnabled };
    }),
  toggleSfxEnabled: () =>
    set((state) => {
      const sfxEnabled = !state.sfxEnabled;

      saveAudioSettings({
        musicEnabled: state.musicEnabled,
        sfxEnabled,
      });

      return { sfxEnabled };
    }),
  clearPendingAudioCues: () => set({ pendingAudioCues: [] }),
  startGame: () =>
    set((state) => {
      const gameState = applyGameAction(undefined, {
        type: 'startGame',
        humanHeroId: state.selectedHeroId,
        aiCount: state.aiCount,
        seed: state.seed,
      });
      savePersistedGameState(gameState);

      return {
        gameState,
        hasSavedGame: true,
        lastError: undefined,
        persistenceError: undefined,
        pendingAudioCues: [],
      };
    }),
  resumeSavedGame: () =>
    set(() => {
      const persistedState = loadPersistedGameState();

      if (!persistedState) {
        return {
          gameState: undefined,
          hasSavedGame: false,
          persistenceError: undefined,
          lastError: 'No saved game found',
        };
      }

      if (!persistedState.ok) {
        return {
          gameState: undefined,
          hasSavedGame: false,
          persistenceError: persistedState.error,
          lastError: persistedState.error,
        };
      }

      return {
        gameState: persistedState.state,
        hasSavedGame: true,
        lastError: undefined,
        persistenceError: undefined,
        pendingAudioCues: [],
      };
    }),
  dispatch: (action) =>
    set((state) => {
      try {
        const previousGameState = state.gameState;
        const nextState = applyGameAction(previousGameState, action);
        const pendingAudioCues = collectPendingAudioCues(
          action,
          previousGameState,
          nextState,
        );
        const actingPlayer = state.gameState?.players[state.gameState.activePlayerIndex];
        const gameState = appendUiEvent(
          nextState,
          actionMessage(action, previousGameState, nextState),
          action,
          actingPlayer,
        );

        savePersistedGameState(gameState);

        return {
          gameState,
          hasSavedGame: true,
          lastError: undefined,
          persistenceError: undefined,
          pendingAudioCues,
        };
      } catch (error) {
        return {
          lastError: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  resetGame: () =>
    set(() => ({
      gameState: undefined,
      hasSavedGame: loadPersistedGameState()?.ok === true,
      lastError: undefined,
      pendingAudioCues: [],
    })),
  clearSavedGame: () =>
    set(() => {
      clearPersistedGameState();

      return {
        gameState: undefined,
        hasSavedGame: false,
        lastError: undefined,
        persistenceError: undefined,
        pendingAudioCues: [],
      };
    }),
}));

function appendUiEvent(
  state: GameState,
  message: string | undefined,
  action?: GameAction,
  actingPlayer = state.players[state.activePlayerIndex],
): GameState {
  if (!message) {
    return state;
  }

  return {
    ...state,
    eventLog: [
      ...state.eventLog,
      {
        id: `event-${state.eventLog.length}`,
        type: 'ui_action',
        message,
        ...createPlayerEventFields(actingPlayer),
        action: action ? { actionType: action.type } : undefined,
      },
    ],
  };
}

function actionMessage(
  action: GameAction,
  previousState?: GameState,
  nextState?: GameState,
): string | undefined {
  switch (action.type) {
    case 'movePlayer':
      return `Moved to ${action.target.boardX},${action.target.boardY}`;
    case 'declareExplorationDirection':
      return `Explored ${action.direction}`;
    case 'rotatePendingTilePreview':
      return `Rotated preview ${action.direction}`;
    case 'placePendingTile':
      return `Placed tile at ${action.rotation} degrees`;
    case 'resolveRoomToken':
    case 'chooseOracleRoomToken':
      return undefined;
    case 'startOptionalCombat':
      return 'Started combat';
    case 'resolveCombat':
    case 'useSwordswomanReroll':
    case 'useWarriorReroll':
    case 'declineWarriorReroll':
    case 'useWarlockSacrifice':
    case 'declineWarlockSacrifice':
    case 'resolveCombatWithoutFlameSpells':
    case 'resolveCombatWithFlameSpells':
      return undefined;
    case 'openChest':
      return 'Opened chest';
    case 'beginLoot':
      return nextState?.phase === 'loot_resolution' &&
        previousState?.phase !== 'loot_resolution'
        ? 'Started loot'
        : 'Took loot';
    case 'takeLoot':
      return 'Took loot';
    case 'leaveLoot':
      return 'Left loot on tile';
    case 'swapLoot':
      return 'Swapped loot';
    case 'useHealingSpell':
      return 'Used healing spell';
    case 'swapWarlockPosition':
      return 'Swapped warlock position';
    case 'endTurn':
      return 'Ended turn';
    case 'startGame':
      return undefined;
  }
}

export function getUiLegalActions(state: GameState) {
  return {
    knownMoves: getLegalKnownMoves(state),
    explorationDirections: getLegalExplorationDirections(state),
  };
}

let nextPendingAudioCueId = 0;

function collectPendingAudioCues(
  action: GameAction,
  previousState: GameState | undefined,
  nextState: GameState,
): PendingAudioCue[] {
  const assetIds = new Set<string>();

  switch (action.type) {
    case 'movePlayer': {
      const move = previousState
        ? getLegalKnownMoves(previousState).find(
            (candidate) =>
              candidate.target.boardX === action.target.boardX &&
              candidate.target.boardY === action.target.boardY,
          )
        : undefined;

      if (move?.kind === 'teleport') {
        assetIds.add('sfx_teleport');
      }
      break;
    }
    case 'placePendingTile':
      assetIds.add('sfx_tile_place');
      break;
    case 'resolveCombat':
    case 'useSwordswomanReroll':
    case 'useWarriorReroll':
    case 'resolveCombatWithoutFlameSpells':
    case 'resolveCombatWithFlameSpells':
      assetIds.add('sfx_combat_roll');
      break;
    case 'openChest':
      assetIds.add('sfx_chest_open');
      break;
    case 'useHealingSpell':
      assetIds.add('sfx_heal');
      break;
    default:
      break;
  }

  if (previousState) {
    const nextEvents = nextState.eventLog.slice(previousState.eventLog.length);

    for (const event of nextEvents) {
      if (event.type === 'room_resolved' && event.room?.tokenKind === 'monster') {
        assetIds.add('sfx_monster_reveal');
      }

      if (event.type === 'combat_resolved' && event.combat) {
        assetIds.add(
          event.combat.outcome === 'victory'
            ? 'sfx_combat_win'
            : event.combat.outcome === 'draw'
              ? 'sfx_combat_draw'
              : 'sfx_combat_loss',
        );
      }
    }

    if (
      action.type !== 'useHealingSpell' &&
      nextState.players.some((player, index) => {
        const previousPlayer = previousState.players[index];

        return (
          player.hp > previousPlayer.hp ||
          (!player.isCursed && previousPlayer.isCursed)
        );
      })
    ) {
      assetIds.add('sfx_heal');
    }

    if (
      previousState.phase !== 'game_over' &&
      nextState.phase === 'game_over'
    ) {
      assetIds.add('sfx_game_over');
    }
  }

  return Array.from(assetIds, (assetId) => ({
    id: nextPendingAudioCueId++,
    assetId,
  }));
}
