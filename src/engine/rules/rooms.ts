import { monsterDefinitions } from '../../data/monsters';
import { getTileAt, samePosition } from '../core/board';
import { appendGameEvent, createPlayerEventFields } from '../core/events';
import type {
  CombatContext,
  GameState,
  PlacedTile,
  Token,
} from '../core/types';
import { getActivePlayer, hasActiveHeroAbility } from './abilities';

export type ResolveRoomTokenOptions = {
  oracleChoiceIndex?: 0 | 1;
};

export function resolveRoomToken(
  state: GameState,
  options: ResolveRoomTokenOptions = {},
): GameState {
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

  const draw = drawRoomToken(state, options);
  const token = draw.token;
  const remainingTokenBag = draw.remainingTokenBag;
  const board = state.board.map((boardTile) =>
    samePosition(boardTile, tile)
      ? { ...boardTile, roomToken: token }
      : boardTile,
  );
  const roomEvent = {
    type: 'room_resolved',
    message:
      token.kind === 'chest'
        ? 'Resolved room and found a treasure chest'
        : `Resolved room and found ${monsterDefinitions[token.id as keyof typeof monsterDefinitions].displayName}`,
    ...createPlayerEventFields(activePlayer),
    room: {
      tokenId: token.id,
      tokenKind: token.kind,
      position: activePlayer.position,
      oracleChoiceIndex: options.oracleChoiceIndex,
    },
  } as const;

  if (token.kind === 'chest') {
    return appendGameEvent({
      ...state,
      phase: state.remainingSteps > 0 ? 'await_move' : 'turn_end',
      board,
      tokenBag: remainingTokenBag,
    }, roomEvent);
  }

  return appendGameEvent({
    ...state,
    phase: 'combat',
    board,
    tokenBag: remainingTokenBag,
    combat: createCombatContext(state, tile, token),
  }, roomEvent);
}

function drawRoomToken(
  state: GameState,
  options: ResolveRoomTokenOptions,
): { token: Token; remainingTokenBag: Token[] } {
  if (
    hasActiveHeroAbility(getActivePlayer(state), 'hero_oracle') &&
    state.tokenBag.length > 1
  ) {
    const drawnTokens = state.tokenBag.slice(0, 2);
    const choiceIndex = options.oracleChoiceIndex ?? 0;
    const returnedIndex = choiceIndex === 0 ? 1 : 0;

    return {
      token: drawnTokens[choiceIndex],
      remainingTokenBag: [
        drawnTokens[returnedIndex],
        ...state.tokenBag.slice(2),
      ],
    };
  }

  const [token, ...remainingTokenBag] = state.tokenBag;

  return { token, remainingTokenBag };
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
