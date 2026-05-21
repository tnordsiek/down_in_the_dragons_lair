import { monsterDefinitions } from '../../data/monsters';
import { restoreSeededRng } from '../../utils/rng';
import { getTileAt, samePosition } from '../core/board';
import { appendGameEvent, createPlayerEventFields } from '../core/events';
import type {
  CombatContext,
  GameState,
  PlacedTile,
  Token,
} from '../core/types';
import {
  getActivePlayer,
  getActiveTileMonsterCombat,
  hasActiveHeroAbility,
} from './abilities';

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

  if (shouldPauseForOracleRoomChoice(state)) {
    return {
      ...state,
      phase: 'resolve_room_token_oracle_choice',
      tokenBag: state.tokenBag.slice(2),
      pendingOracleRoomChoice: {
        drawnTokens: [state.tokenBag[0], state.tokenBag[1]],
        position: activePlayer.position,
      },
    };
  }

  const draw = drawRoomToken(state, options);
  return completeRoomTokenResolution(
    {
      ...state,
      rng: draw.rng,
    },
    tile,
    draw.token,
    draw.remainingTokenBag,
    options.oracleChoiceIndex,
    draw.oracleDrawnTokenIds,
  );
}

export function chooseOracleRoomToken(
  state: GameState,
  choiceIndex: 0 | 1,
): GameState {
  if (
    state.phase !== 'resolve_room_token_oracle_choice' ||
    !state.pendingOracleRoomChoice
  ) {
    throw new Error('Oracle room choice can only resolve during pending choice');
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const tile = getTileAt(state.board, activePlayer.position);

  if (!tile) {
    throw new Error('Active player is not on a discovered tile');
  }

  if (tile.roomToken) {
    throw new Error('Oracle room choice requires an unresolved room');
  }

  const drawnTokens = state.pendingOracleRoomChoice.drawnTokens;
  const returnedIndex = choiceIndex === 0 ? 1 : 0;
  const reinsertion = reinsertReturnedOracleToken(
    state,
    state.tokenBag,
    drawnTokens[returnedIndex],
  );

  return completeRoomTokenResolution(
    {
      ...state,
      pendingOracleRoomChoice: undefined,
      rng: reinsertion.rng,
    },
    tile,
    drawnTokens[choiceIndex],
    reinsertion.tokenBag,
    choiceIndex,
    [drawnTokens[0].id, drawnTokens[1].id],
  );
}

function completeRoomTokenResolution(
  state: GameState,
  tile: PlacedTile,
  token: Token,
  remainingTokenBag: Token[],
  oracleChoiceIndex?: 0 | 1,
  oracleDrawnTokenIds?: [Token['id'], Token['id']],
): GameState {
  const activePlayer = state.players[state.activePlayerIndex];
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
    ...createPlayerEventFields(activePlayer, state.players),
    room: {
      tokenId: token.id,
      tokenKind: token.kind,
      position: activePlayer.position,
      oracleChoiceIndex,
      oracleDrawnTokenIds,
    },
  } as const;

  if (token.kind === 'chest') {
    return appendGameEvent({
      ...state,
      phase: state.remainingSteps > 0 ? 'await_move' : 'turn_end',
      board,
      tokenBag: remainingTokenBag,
      pendingOracleRoomChoice: undefined,
    }, roomEvent);
  }

  const thiefMayIgnoreMonster = hasActiveHeroAbility(activePlayer, 'hero_thief');
  const combat = createCombatContext(state, tile, token);

  return appendGameEvent({
    ...state,
    phase: thiefMayIgnoreMonster ? 'optional_monster_combat' : 'combat',
    board,
    tokenBag: remainingTokenBag,
    pendingOracleRoomChoice: undefined,
    combat:
      thiefMayIgnoreMonster
        ? getActiveTileMonsterCombat({
            ...state,
            board,
            tokenBag: remainingTokenBag,
          }) ?? combat
        : combat,
  }, roomEvent);
}

function drawRoomToken(
  state: GameState,
  options: ResolveRoomTokenOptions,
): {
  token: Token;
  remainingTokenBag: Token[];
  oracleDrawnTokenIds?: [Token['id'], Token['id']];
  rng: GameState['rng'];
} {
  if (
    hasActiveHeroAbility(getActivePlayer(state), 'hero_oracle') &&
    state.tokenBag.length > 1
  ) {
    const drawnTokens = state.tokenBag.slice(0, 2);
    const choiceIndex = options.oracleChoiceIndex ?? 0;
    const returnedIndex = choiceIndex === 0 ? 1 : 0;
    const reinsertion = reinsertReturnedOracleToken(
      state,
      state.tokenBag.slice(2),
      drawnTokens[returnedIndex],
    );

    return {
      token: drawnTokens[choiceIndex],
      remainingTokenBag: reinsertion.tokenBag,
      oracleDrawnTokenIds: [drawnTokens[0].id, drawnTokens[1].id],
      rng: reinsertion.rng,
    };
  }

  const [token, ...remainingTokenBag] = state.tokenBag;

  return { token, remainingTokenBag, rng: state.rng };
}

function shouldPauseForOracleRoomChoice(state: GameState): boolean {
  const activePlayer = getActivePlayer(state);

  return (
    activePlayer.kind === 'human' &&
    hasActiveHeroAbility(activePlayer, 'hero_oracle') &&
    state.tokenBag.length > 1
  );
}

function reinsertReturnedOracleToken(
  state: GameState,
  tokenBag: Token[],
  returnedToken: Token,
): { tokenBag: Token[]; rng: GameState['rng'] } {
  const rng = restoreSeededRng(state.rng);
  const insertionIndex = rng.nextInt(tokenBag.length + 1);

  return {
    tokenBag: [
      ...tokenBag.slice(0, insertionIndex),
      returnedToken,
      ...tokenBag.slice(insertionIndex),
    ],
    rng: rng.snapshot(),
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
