import type { GameAction, GameState } from './types';
import {
  drawPendingTileForExploration,
  placePendingTile,
} from '../movement/exploration';
import { moveActivePlayer } from '../movement/performMove';
import { createNewGame } from '../setup/createGame';
import { endTurn } from '../turns/turns';

export function applyGameAction(
  state: GameState | undefined,
  action: GameAction,
): GameState {
  if (action.type === 'startGame') {
    return createNewGame({
      humanHeroId: action.humanHeroId,
      aiCount: action.aiCount,
      seed: action.seed,
    });
  }

  if (!state) {
    throw new Error(`Action ${action.type} requires an existing game state`);
  }

  switch (action.type) {
    case 'movePlayer':
      return moveActivePlayer(state, action.direction);
    case 'declareExplorationDirection':
      return drawPendingTileForExploration(state, action.direction);
    case 'placePendingTile':
      return placePendingTile(state, action.rotation);
    case 'endTurn':
      return endTurn(state);
  }
}
