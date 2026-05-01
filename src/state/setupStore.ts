import { create } from 'zustand';

import { applyGameAction } from '../engine/core/actions';
import type { GameAction, GameState, HeroId } from '../engine/core/types';
import {
  getLegalExplorationDirections,
  getLegalKnownMoveDirections,
} from '../engine/movement/movement';
import {
  clearPersistedGameState,
  loadPersistedGameState,
  savePersistedGameState,
} from './persistence';

type SetupState = {
  selectedHeroId: HeroId;
  aiCount: number;
  seed: string;
  gameState?: GameState;
  hasSavedGame: boolean;
  lastError?: string;
  persistenceError?: string;
  setSelectedHeroId: (heroId: HeroId) => void;
  setAiCount: (aiCount: number) => void;
  setSeed: (seed: string) => void;
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

export const useSetupStore = create<SetupState>((set) => ({
  selectedHeroId: 'hero_mage',
  aiCount: 1,
  seed: 'v1-local-seed',
  gameState: initialGameState,
  hasSavedGame: initialGameState !== undefined,
  persistenceError: initialPersistenceError,
  setSelectedHeroId: (selectedHeroId) => set({ selectedHeroId }),
  setAiCount: (aiCount) => set({ aiCount }),
  setSeed: (seed) => set({ seed }),
  startGame: () =>
    set((state) => {
      const gameState = applyGameAction(undefined, {
        type: 'startGame',
        humanHeroId: state.selectedHeroId,
        aiCount: state.aiCount,
        seed: state.seed,
      });
      const persistedState = appendUiEvent(gameState, 'New game started');

      savePersistedGameState(persistedState);

      return {
        gameState: persistedState,
        hasSavedGame: true,
        lastError: undefined,
        persistenceError: undefined,
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
      };
    }),
  dispatch: (action) =>
    set((state) => {
      try {
        const gameState = appendUiEvent(
          applyGameAction(state.gameState, action),
          actionMessage(action),
        );

        savePersistedGameState(gameState);

        return {
          gameState,
          hasSavedGame: true,
          lastError: undefined,
          persistenceError: undefined,
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
    })),
  clearSavedGame: () =>
    set(() => {
      clearPersistedGameState();

      return {
        gameState: undefined,
        hasSavedGame: false,
        lastError: undefined,
        persistenceError: undefined,
      };
    }),
}));

function appendUiEvent(state: GameState, message: string): GameState {
  return {
    ...state,
    eventLog: [
      ...state.eventLog,
      {
        id: `event-${state.eventLog.length}`,
        type: 'ui_action',
        message,
      },
    ],
  };
}

function actionMessage(action: GameAction): string {
  switch (action.type) {
    case 'movePlayer':
      return `Moved ${action.direction}`;
    case 'declareExplorationDirection':
      return `Explored ${action.direction}`;
    case 'rotatePendingTilePreview':
      return `Rotated preview ${action.direction}`;
    case 'placePendingTile':
      return `Placed tile at ${action.rotation} degrees`;
    case 'resolveRoomToken':
      return 'Resolved room';
    case 'resolveCombat':
      return 'Resolved combat';
    case 'openChest':
      return 'Opened chest';
    case 'useHealingSpell':
      return 'Used healing spell';
    case 'swapWarlockPosition':
      return 'Swapped warlock position';
    case 'endTurn':
      return 'Ended turn';
    case 'startGame':
      return 'New game started';
  }
}

export function getUiLegalActions(state: GameState) {
  return {
    knownMoveDirections: getLegalKnownMoveDirections(state),
    explorationDirections: getLegalExplorationDirections(state),
  };
}
