import { treasurePointValues } from '../../data/rewards';
import { getTileAt, samePosition } from '../core/board';
import type { GameState } from '../core/types';
import { getContinuationPhaseAfterAction } from '../turns/continuation';

export function openChest(state: GameState): GameState {
  if (state.phase !== 'turn_start' && state.phase !== 'await_move') {
    throw new Error('Cannot open chest outside of movement phases');
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const tile = getTileAt(state.board, activePlayer.position);

  if (!tile || tile.roomToken?.id !== 'treasure_chest') {
    throw new Error('No treasure chest on active player tile');
  }

  if (activePlayer.inventory.keyCount < 1) {
    throw new Error('A key is required to open a treasure chest');
  }

  const updatedState: GameState = {
    ...state,
    players: state.players.map((player, index) =>
      index === state.activePlayerIndex
        ? {
            ...player,
            treasurePoints:
              player.treasurePoints + treasurePointValues.treasure_chest,
            inventory: { ...player.inventory, keyCount: 0 },
          }
        : player,
    ),
    board: state.board.map((boardTile) =>
      samePosition(boardTile, tile)
        ? { ...boardTile, roomToken: undefined }
        : boardTile,
    ),
  };
  const phase = getContinuationPhaseAfterAction(updatedState);

  return {
    ...updatedState,
    phase,
    turnContinuationReason:
      phase === 'await_move' ? updatedState.turnContinuationReason : undefined,
  };
}
