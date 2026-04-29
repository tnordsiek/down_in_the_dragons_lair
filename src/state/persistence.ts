import type { GameState } from '../engine/core/types';
import {
  deserializeGameState,
  serializeGameState,
} from '../engine/serialization/json';

export const persistedGameStateKey = 'down-in-the-dragons-lair.gameState.v1';

export type PersistedGameStateResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string };

export function savePersistedGameState(state: GameState): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  storage.setItem(persistedGameStateKey, serializeGameState(state));
}

export function loadPersistedGameState(): PersistedGameStateResult | undefined {
  const storage = getLocalStorage();

  if (!storage) {
    return undefined;
  }

  const serializedState = storage.getItem(persistedGameStateKey);

  if (!serializedState) {
    return undefined;
  }

  try {
    return { ok: true, state: deserializeGameState(serializedState) };
  } catch (error) {
    storage.removeItem(persistedGameStateKey);

    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function clearPersistedGameState(): void {
  getLocalStorage()?.removeItem(persistedGameStateKey);
}

function getLocalStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
