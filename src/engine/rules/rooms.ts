import { monsterDefinitions } from '../../data/monsters';
import { getTileAt, samePosition } from '../core/board';
import type {
  CombatContext,
  GameState,
  PlacedTile,
  Token,
} from '../core/types';

export function resolveRoomToken(state: GameState): GameState {
  const activePlayer = state.players[state.activePlayerIndex];
  const tile = getTileAt(state.board, activePlayer.position);

  if (!tile) {
    throw new Error('Active player is not on a discovered tile');
  }

  if (tile.roomToken || state.tokenBag.length === 0) {
    return {
      ...state,
      phase: state.remainingSteps > 0 ? 'await_move' : 'turn_end',
    };
  }

  const [token, ...remainingTokenBag] = state.tokenBag;
  const board = state.board.map((boardTile) =>
    samePosition(boardTile, tile)
      ? { ...boardTile, roomToken: token }
      : boardTile,
  );

  if (token.kind === 'chest') {
    return {
      ...state,
      phase: 'turn_end',
      board,
      tokenBag: remainingTokenBag,
    };
  }

  return {
    ...state,
    phase: 'combat',
    board,
    tokenBag: remainingTokenBag,
    combat: createCombatContext(state, tile, token),
  };
}

function createCombatContext(
  state: GameState,
  tile: PlacedTile,
  token: Token,
): CombatContext {
  const monster =
    monsterDefinitions[token.id as keyof typeof monsterDefinitions];

  if (!monster) {
    throw new Error(`Token is not a monster: ${token.id}`);
  }

  return {
    playerId: state.players[state.activePlayerIndex].id,
    monsterId: monster.id,
    position: { boardX: tile.boardX, boardY: tile.boardY },
    enteredFrom:
      state.lastMoveFrom ?? state.players[state.activePlayerIndex].position,
  };
}
