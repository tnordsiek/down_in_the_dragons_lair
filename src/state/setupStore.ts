import { create } from 'zustand';

import { heroDisplayNames } from '../data/displayNames';
import { applyGameAction } from '../engine/core/actions';
import { createPlayerEventFields } from '../engine/core/events';
import type { GameAction, GameState, HeroId } from '../engine/core/types';
import {
  getLegalExplorationDirections,
  getLegalKnownMoves,
} from '../engine/movement/movement';
import { hasActiveHeroAbility } from '../engine/rules/abilities';
import { getCombatFlameSpellChoices } from '../engine/combat/combat';
import { canOpenChest } from '../engine/rules/chests';
import { canStoreItem } from '../engine/rules/inventory';
import { isMainTurnActionPhase } from '../engine/turns/turns';
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

export type OpponentSelectionMode = 'random' | 'manual';

let nextPendingAudioCueId = 0;

type SetupState = {
  selectedHeroId: HeroId;
  aiCount: number;
  opponentSelectionMode: OpponentSelectionMode;
  selectedOpponentHeroIds: HeroId[];
  seed: string;
  poolScale: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  movementPointsEnabled: boolean;
  tutorialActive: boolean;
  gameState?: GameState;
  hasSavedGame: boolean;
  lastError?: string;
  persistenceError?: string;
  pendingAudioCues: PendingAudioCue[];
  setSelectedHeroId: (heroId: HeroId) => void;
  setAiCount: (aiCount: number) => void;
  setOpponentSelectionMode: (mode: OpponentSelectionMode) => void;
  toggleSelectedOpponentHeroId: (heroId: HeroId) => void;
  setSeed: (seed: string) => void;
  setPoolScale: (poolScale: number) => void;
  toggleMusicEnabled: () => void;
  toggleSfxEnabled: () => void;
  toggleMovementPointsEnabled: () => void;
  clearPendingAudioCues: () => void;
  startTutorial: () => void;
  exitTutorial: () => void;
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
  opponentSelectionMode: 'random',
  selectedOpponentHeroIds: [],
  seed: 'v1-local-seed',
  poolScale: 1,
  musicEnabled: initialAudioSettings.musicEnabled,
  sfxEnabled: initialAudioSettings.sfxEnabled,
  movementPointsEnabled: initialAudioSettings.movementPointsEnabled,
  tutorialActive: false,
  gameState: initialGameState,
  hasSavedGame: initialGameState !== undefined,
  persistenceError: initialPersistenceError,
  pendingAudioCues: [],
  setSelectedHeroId: (selectedHeroId) =>
    set((state) => ({
      selectedHeroId,
      selectedOpponentHeroIds: sanitizeSelectedOpponentHeroIds(
        state.selectedOpponentHeroIds,
        selectedHeroId,
        state.aiCount,
      ),
    })),
  setAiCount: (aiCount) =>
    set((state) => ({
      aiCount,
      selectedOpponentHeroIds: sanitizeSelectedOpponentHeroIds(
        state.selectedOpponentHeroIds,
        state.selectedHeroId,
        aiCount,
      ),
    })),
  setOpponentSelectionMode: (opponentSelectionMode) =>
    set({ opponentSelectionMode }),
  toggleSelectedOpponentHeroId: (heroId) =>
    set((state) => {
      if (heroId === state.selectedHeroId) {
        return {};
      }

      const isSelected = state.selectedOpponentHeroIds.includes(heroId);
      if (isSelected) {
        return {
          selectedOpponentHeroIds: state.selectedOpponentHeroIds.filter(
            (selectedHeroId) => selectedHeroId !== heroId,
          ),
        };
      }

      if (state.selectedOpponentHeroIds.length >= state.aiCount) {
        return {};
      }

      return {
        selectedOpponentHeroIds: [...state.selectedOpponentHeroIds, heroId],
      };
    }),
  setSeed: (seed) => set({ seed }),
  setPoolScale: (poolScale) => set({ poolScale }),
  toggleMusicEnabled: () =>
    set((state) => {
      const musicEnabled = !state.musicEnabled;

      saveAudioSettings({
        musicEnabled,
        sfxEnabled: state.sfxEnabled,
        movementPointsEnabled: state.movementPointsEnabled,
      });

      return {
        musicEnabled,
        pendingAudioCues: [createPendingAudioCue('sfx_button_click')],
      };
    }),
  toggleSfxEnabled: () =>
    set((state) => {
      const sfxEnabled = !state.sfxEnabled;

      saveAudioSettings({
        musicEnabled: state.musicEnabled,
        sfxEnabled,
        movementPointsEnabled: state.movementPointsEnabled,
      });

      return {
        sfxEnabled,
        pendingAudioCues: [createPendingAudioCue('sfx_button_click')],
      };
    }),
  toggleMovementPointsEnabled: () =>
    set((state) => {
      const movementPointsEnabled = !state.movementPointsEnabled;

      saveAudioSettings({
        musicEnabled: state.musicEnabled,
        sfxEnabled: state.sfxEnabled,
        movementPointsEnabled,
      });

      return {
        movementPointsEnabled,
        pendingAudioCues: [createPendingAudioCue('sfx_button_click')],
      };
    }),
  clearPendingAudioCues: () => set({ pendingAudioCues: [] }),
  startTutorial: () =>
    set({
      tutorialActive: true,
      lastError: undefined,
      pendingAudioCues: [createPendingAudioCue('sfx_button_click')],
    }),
  exitTutorial: () =>
    set({
      tutorialActive: false,
      pendingAudioCues: [createPendingAudioCue('sfx_button_click')],
    }),
  startGame: () =>
    set((state) => {
      const gameState = applyGameAction(undefined, {
        type: 'startGame',
        humanHeroId: state.selectedHeroId,
        aiCount: state.aiCount,
        seed: state.seed,
        poolScale: state.poolScale,
        selectedAiHeroIds:
          state.opponentSelectionMode === 'manual'
            ? state.selectedOpponentHeroIds
            : undefined,
      });
      savePersistedGameState(gameState);

      return {
        gameState,
        hasSavedGame: true,
        lastError: undefined,
        persistenceError: undefined,
        pendingAudioCues: [createPendingAudioCue('sfx_button_click')],
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
        pendingAudioCues: [createPendingAudioCue('sfx_button_click')],
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
    set((state) => {
      const isGameOver = state.gameState?.phase === 'game_over';
      if (isGameOver) {
        clearPersistedGameState();
      }
      return {
        gameState: undefined,
        hasSavedGame: !isGameOver && loadPersistedGameState()?.ok === true,
        lastError: undefined,
        pendingAudioCues: [createPendingAudioCue('sfx_button_click')],
      };
    }),
  clearSavedGame: () =>
    set(() => {
      clearPersistedGameState();

      return {
        gameState: undefined,
        hasSavedGame: false,
        lastError: undefined,
        persistenceError: undefined,
        pendingAudioCues: [createPendingAudioCue('sfx_button_click')],
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
        ...createPlayerEventFields(actingPlayer, state.players),
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
    case 'chooseSeeressRoomToken':
      return undefined;
    case 'startOptionalCombat':
      return 'Started combat';
    case 'resolveCombat':
    case 'selectCurseTarget':
    case 'useBladeReroll':
    case 'useValkyrieReroll':
    case 'declineValkyrieReroll':
    case 'useWitchSacrifice':
    case 'declineWitchSacrifice':
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
    case 'swapWitchPosition': {
      const targetPlayer = previousState?.players.find(
        (player) => player.id === action.targetPlayerId,
      );

      return targetPlayer
        ? `Swapped with ${heroDisplayNames[targetPlayer.heroId]} to ${targetPlayer.position.boardX},${targetPlayer.position.boardY}`
        : 'Swapped witch position';
    }
    case 'endTurn':
      return 'Ended turn';
    case 'startGame':
      return undefined;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function getUiLegalActions(state: GameState) {
  const activePlayer = state.players[state.activePlayerIndex];
  const pendingLoot = state.pendingLoot;
  const hasHealingSpell = activePlayer.inventory.spells.some(
    (spell) => spell.spellKind === 'healing',
  );

  return {
    knownMoves: getLegalKnownMoves(state),
    explorationDirections: getLegalExplorationDirections(state),
    witchSwapTargets:
      state.phase === 'turn_start' &&
      state.remainingSteps === 4 &&
      hasActiveHeroAbility(activePlayer, 'hero_witch')
        ? state.players.filter((player) => player.id !== activePlayer.id)
        : [],
    canOpenChest: canOpenChest(state),
    canTakePendingLoot:
      pendingLoot !== undefined && canStoreItem(activePlayer, pendingLoot.item),
    combatFlameSpellChoices: getCombatFlameSpellChoices(state),
    canUseHealingSpell: hasHealingSpell && isMainTurnActionPhase(state.phase),
  };
}

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
    case 'useBladeReroll':
    case 'useValkyrieReroll':
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
    case 'selectCurseTarget':
      assetIds.add('sfx_curse_apply');
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
    ...createPendingAudioCue(assetId),
  }));
}

function createPendingAudioCue(assetId: string): PendingAudioCue {
  return {
    id: nextPendingAudioCueId++,
    assetId,
  };
}

function sanitizeSelectedOpponentHeroIds(
  selectedOpponentHeroIds: HeroId[],
  selectedHeroId: HeroId,
  aiCount: number,
): HeroId[] {
  return selectedOpponentHeroIds
    .filter((heroId) => heroId !== selectedHeroId)
    .slice(0, aiCount);
}
