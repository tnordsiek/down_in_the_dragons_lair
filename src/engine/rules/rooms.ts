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
import { getZeroStepFollowUpPhase } from '../turns/continuation';

export type ResolveRoomTokenOptions = {
  seeressChoiceIndex?: 0 | 1;
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
    const zeroStepFollowUpState = {
      ...state,
      board: state.board,
    };

    return {
      ...state,
      phase:
        state.remainingSteps > 0
          ? 'await_move'
          : getZeroStepFollowUpPhase(zeroStepFollowUpState),
    };
  }

  if (shouldPauseForSeeressRoomChoice(state)) {
    return {
      ...state,
      phase: 'resolve_room_token_seeress_choice',
      tokenBag: state.tokenBag.slice(2),
      pendingSeeressRoomChoice: {
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
    options.seeressChoiceIndex,
    draw.seeressDrawnTokenIds,
  );
}

export function chooseSeeressRoomToken(
  state: GameState,
  choiceIndex: 0 | 1,
): GameState {
  if (
    state.phase !== 'resolve_room_token_seeress_choice' ||
    !state.pendingSeeressRoomChoice
  ) {
    throw new Error('Seeress room choice can only resolve during pending choice');
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const tile = getTileAt(state.board, activePlayer.position);

  if (!tile) {
    throw new Error('Active player is not on a discovered tile');
  }

  if (tile.roomToken) {
    throw new Error('Seeress room choice requires an unresolved room');
  }

  const drawnTokens = state.pendingSeeressRoomChoice.drawnTokens;
  const returnedIndex = choiceIndex === 0 ? 1 : 0;
  const reinsertion = reinsertReturnedSeeressToken(
    state,
    state.tokenBag,
    drawnTokens[returnedIndex],
  );

  return completeRoomTokenResolution(
    {
      ...state,
      pendingSeeressRoomChoice: undefined,
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
  seeressChoiceIndex?: 0 | 1,
  seeressDrawnTokenIds?: [Token['id'], Token['id']],
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
        : `Resolved room and found ${monsterDefinitions[token.id].displayName}`,
    ...createPlayerEventFields(activePlayer, state.players),
    room: {
      tokenId: token.id,
      tokenKind: token.kind,
      position: activePlayer.position,
      seeressChoiceIndex,
      seeressDrawnTokenIds,
    },
  } as const;

  if (token.kind === 'chest') {
    const zeroStepFollowUpState = {
      ...state,
      board,
      tokenBag: remainingTokenBag,
      pendingSeeressRoomChoice: undefined,
    };

    return appendGameEvent({
      ...state,
      phase:
        state.remainingSteps > 0
          ? 'await_move'
          : getZeroStepFollowUpPhase(zeroStepFollowUpState),
      board,
      tokenBag: remainingTokenBag,
      pendingSeeressRoomChoice: undefined,
    }, roomEvent);
  }

  const thiefMayIgnoreMonster = hasActiveHeroAbility(activePlayer, 'hero_rogue');
  const combat = createCombatContext(state, tile, token);

  return appendGameEvent({
    ...state,
    phase: thiefMayIgnoreMonster ? 'optional_monster_combat' : 'combat',
    board,
    tokenBag: remainingTokenBag,
    pendingSeeressRoomChoice: undefined,
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
  seeressDrawnTokenIds?: [Token['id'], Token['id']];
  rng: GameState['rng'];
} {
  if (
    hasActiveHeroAbility(getActivePlayer(state), 'hero_seeress') &&
    state.tokenBag.length > 1
  ) {
    const drawnTokens = state.tokenBag.slice(0, 2);
    const choiceIndex = options.seeressChoiceIndex ?? 0;
    const returnedIndex = choiceIndex === 0 ? 1 : 0;
    const reinsertion = reinsertReturnedSeeressToken(
      state,
      state.tokenBag.slice(2),
      drawnTokens[returnedIndex],
    );

    return {
      token: drawnTokens[choiceIndex],
      remainingTokenBag: reinsertion.tokenBag,
      seeressDrawnTokenIds: [drawnTokens[0].id, drawnTokens[1].id],
      rng: reinsertion.rng,
    };
  }

  const [token, ...remainingTokenBag] = state.tokenBag;

  return { token, remainingTokenBag, rng: state.rng };
}

function shouldPauseForSeeressRoomChoice(state: GameState): boolean {
  const activePlayer = getActivePlayer(state);

  return (
    activePlayer.kind === 'human' &&
    hasActiveHeroAbility(activePlayer, 'hero_seeress') &&
    state.tokenBag.length > 1
  );
}

function reinsertReturnedSeeressToken(
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
  if (token.kind !== 'monster') {
    throw new Error(`Token is not a monster: ${token.id}`);
  }

  const monster = monsterDefinitions[token.id];

  return {
    playerId: state.players[state.activePlayerIndex].id,
    monsterId: monster.id,
    position: { boardX: tile.boardX, boardY: tile.boardY },
    enteredFrom:
      state.lastMoveFrom ?? state.players[state.activePlayerIndex].position,
  };
}
