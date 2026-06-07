export type TutorialVisualId =
  | 'player-cards'
  | 'turn-actions'
  | 'movement'
  | 'exploration'
  | 'tile-rotation'
  | 'room-token'
  | 'combat-dice'
  | 'inventory'
  | 'chest'
  | 'healing'
  | 'turn-order'
  | 'scoreboard';

/**
 * Hero-independent walkthrough of the game flow. The actual step CONTENT lives
 * in the i18n bundles (`src/i18n/en.ts` / `de.ts` under `tutorialSteps`) and is
 * typed as `TutorialStep[]`. This module only owns the shared types so both the
 * translations and `TutorialVisual` stay in sync.
 */
export type TutorialStep = {
  id: string;
  title: string;
  intro: string;
  bullets?: string[];
  visual?: TutorialVisualId;
};
