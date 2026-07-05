import type { GameAction, GameState } from '../engine/core/types';
import { getDifficultyConfig } from './config';
import { chooseHeuristicAiAction } from './heuristicAgent';
import { getLegalAiActions } from './legalActions';

export function chooseDifficultyAwareHeuristicAiAction(
  state: GameState,
  legalActions = getLegalAiActions(state),
  staleActionCount = 0,
): GameAction {
  return chooseHeuristicAiAction(
    state,
    legalActions,
    getDifficultyConfig(state.difficulty),
    staleActionCount,
  );
}
