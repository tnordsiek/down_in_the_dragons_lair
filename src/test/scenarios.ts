import { chooseHeuristicAiAction } from '../ai/heuristicAgent';
import { getLegalAiActions } from '../ai/legalActions';
import { applyGameAction } from '../engine/core/actions';
import type { GameState, HeroId } from '../engine/core/types';
import { createNewGame } from '../engine/setup/createGame';

export type SeededGameOptions = {
  humanHeroId?: HeroId;
  aiCount?: number;
  seed?: string;
  poolScale?: number;
  selectedAiHeroIds?: HeroId[];
};

/**
 * Deterministic fresh game. Thin wrapper around createNewGame so the behavior
 * tests share one set of sensible defaults.
 */
export function seededGame(options: SeededGameOptions = {}): GameState {
  return createNewGame({
    humanHeroId: options.humanHeroId ?? 'hero_mage',
    aiCount: options.aiCount ?? 1,
    seed: options.seed ?? 'scenario-seed',
    poolScale: options.poolScale,
    selectedAiHeroIds: options.selectedAiHeroIds,
  });
}

export type AutoplayTrace = {
  /** Final state once the game reaches game_over (or the action cap). */
  finalState: GameState;
  /** Number of actions applied to reach the final state. */
  actionCount: number;
  /** Sampled intermediate states visited along the way (incl. the start state). */
  sampledStates: GameState[];
};

/**
 * Drive a full heuristic-AI game to its end while sampling intermediate states.
 *
 * This re-implements the autoplay loop locally (rather than depending on
 * autoplay.ts) so that the sampling stays a pure test helper. With a fixed seed
 * the resulting trace is fully reproducible, which makes it usable both as a
 * golden source and as a generator of realistic states for property tests.
 */
export function traceAutoplay(
  seedOrState: string | GameState,
  options: { sampleEvery?: number; maxActions?: number } = {},
): AutoplayTrace {
  const sampleEvery = options.sampleEvery ?? 1;
  const maxActions = options.maxActions ?? 20000;
  let current =
    typeof seedOrState === 'string'
      ? seededGame({ seed: seedOrState })
      : seedOrState;

  const sampledStates: GameState[] = [current];
  let actionCount = 0;

  while (current.phase !== 'game_over' && actionCount < maxActions) {
    const legalActions = getLegalAiActions(current);
    const action = chooseHeuristicAiAction(current, legalActions);
    current = applyGameAction(current, action);
    actionCount += 1;

    if (actionCount % sampleEvery === 0) {
      sampledStates.push(current);
    }
  }

  return { finalState: current, actionCount, sampledStates };
}
