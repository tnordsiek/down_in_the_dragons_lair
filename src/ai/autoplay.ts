import { applyGameAction } from '../engine/core/actions';
import type { GameState } from '../engine/core/types';
import { getDifficultyConfig } from './config';
import { chooseHeuristicAiAction } from './heuristicAgent';
import { getLegalAiActions } from './legalActions';
import { createStaleActionTracker } from './simulationDiagnostics';

export type AiStepResult = {
  state: GameState;
  actionCount: number;
};

export function playAiControlledTurn(
  state: GameState,
  maxActions = 50,
): AiStepResult {
  let current = state;
  const startingPlayerId = state.players[state.activePlayerIndex]?.id;
  let actionCount = 0;
  const staleTracker = createStaleActionTracker();

  while (
    current.phase !== 'game_over' &&
    current.players[current.activePlayerIndex]?.id === startingPlayerId &&
    actionCount < maxActions
  ) {
    const config = getDifficultyConfig(current.difficulty);
    const action = chooseHeuristicAiAction(
      current,
      getLegalAiActions(current),
      config,
      staleTracker.staleActionCount,
    );
    const next = applyGameAction(current, action);
    staleTracker.record(current, next, action);
    current = next;
    actionCount += 1;
  }

  if (actionCount >= maxActions) {
    throw new Error(`AI turn exceeded ${maxActions} actions`);
  }

  return { state: current, actionCount };
}

export function playAiGameToEnd(
  state: GameState,
  maxActions = 20000,
): AiStepResult {
  let current = state;
  let actionCount = 0;
  const staleTracker = createStaleActionTracker();

  while (current.phase !== 'game_over' && actionCount < maxActions) {
    const config = getDifficultyConfig(current.difficulty);
    const action = chooseHeuristicAiAction(
      current,
      getLegalAiActions(current),
      config,
      staleTracker.staleActionCount,
    );
    const next = applyGameAction(current, action);
    staleTracker.record(current, next, action);
    current = next;
    actionCount += 1;
  }

  if (current.phase !== 'game_over') {
    const legalActions = getLegalAiActions(current);

    throw new Error(
      `AI game did not finish within ${maxActions} actions: ${JSON.stringify({
        phase: current.phase,
        activePlayerIndex: current.activePlayerIndex,
        activePlayer: current.players[current.activePlayerIndex],
        boardSize: current.board.length,
        tileStackSize: current.tileStack.length,
        tokenBagSize: current.tokenBag.length,
        combat: current.combat,
        pendingTile: current.pendingTile,
        legalActions,
        chosenAction:
          legalActions.length > 0
            ? chooseHeuristicAiAction(current, legalActions)
            : undefined,
      })}`,
    );
  }

  return { state: current, actionCount };
}
