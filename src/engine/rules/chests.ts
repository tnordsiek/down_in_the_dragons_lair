import { treasurePointValues } from '../../data/rewards';
import { getTileAt, samePosition } from '../core/board';
import type { GameState } from '../core/types';

export function openChest(state: GameState): GameState {
  const activePlayer = state.players[state.activePlayerIndex];
  const tile = getTileAt(state.board, activePlayer.position);

  if (!tile || tile.roomToken?.id !== 'treasure_chest') {
    throw new Error('No treasure chest on active player tile');
  }

  if (activePlayer.inventory.keyCount < 1) {
    throw new Error('A key is required to open a treasure chest');
  }

  return {
    ...state,
    phase: 'turn_end',
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
}
