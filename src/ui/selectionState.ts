// Shared UI selection-state machines used by GameScreen (owner) and ActionPanel
// (consumer) to coordinate multi-step spell/swap interactions.

export type HealingSpellSelectionState =
  | { mode: 'idle' }
  | { mode: 'select_target' }
  | { mode: 'select_tile'; targetPlayerId: string };

export type WitchSwapSelectionState =
  | { mode: 'idle' }
  | { mode: 'select_target' };
