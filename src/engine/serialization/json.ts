import type { GameState } from '../core/types';

export const currentGameStateSchemaVersion = 1;

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeGameState(serializedState: string): GameState {
  const parsed = JSON.parse(serializedState) as Partial<GameState>;

  if (parsed.schemaVersion !== currentGameStateSchemaVersion) {
    throw new Error(`Unsupported game state schema: ${parsed.schemaVersion}`);
  }

  return parsed as GameState;
}
