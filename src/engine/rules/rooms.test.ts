import { describe, expect, it } from 'vitest';

import type { GameState, PlacedTile } from '../core/types';
import { createNewGame } from '../setup/createGame';
import { openChest } from './chests';
import { resolveRoomToken } from './rooms';

describe('room and chest rules', () => {
  it('places a chest token from the bag, consumes it, and allows moving when steps remain', () => {
    const state = createRoomState({
      id: 'treasure_chest',
      kind: 'chest',
    });
    const resolved = resolveRoomToken(state);
    const activePlayer = resolved.players[resolved.activePlayerIndex];
    const room = resolved.board.find(
      (tile) =>
        tile.boardX === activePlayer.position.boardX &&
        tile.boardY === activePlayer.position.boardY,
    );

    expect(room?.roomToken).toEqual({ id: 'treasure_chest', kind: 'chest' });
    expect(resolved.tokenBag).toHaveLength(0);
    expect(resolved.phase).toBe('await_move');
    expect(resolved.eventLog.at(-1)).toEqual(
      expect.objectContaining({
        type: 'room_resolved',
        playerId: resolved.players[resolved.activePlayerIndex].id,
        room: expect.objectContaining({
          tokenId: 'treasure_chest',
          tokenKind: 'chest',
          position: { boardX: 0, boardY: -1 },
        }),
      }),
    );
  });

  it('ends the turn after discovering a chest when no steps remain', () => {
    const state = createRoomState(
      {
        id: 'treasure_chest',
        kind: 'chest',
      },
      { remainingSteps: 0 },
    );
    const resolved = resolveRoomToken(state);

    expect(resolved.phase).toBe('turn_end');
    expect(
      resolved.board.find((tile) => tile.boardX === 0 && tile.boardY === -1)
        ?.roomToken,
    ).toEqual({ id: 'treasure_chest', kind: 'chest' });
  });

  it('starts combat when a monster token is drawn', () => {
    const state = createRoomState({
      id: 'giant_rat',
      kind: 'monster',
    });
    const resolved = resolveRoomToken(state);

    expect(resolved.phase).toBe('combat');
    expect(resolved.combat).toEqual(
      expect.objectContaining({ monsterId: 'giant_rat' }),
    );
    expect(resolved.eventLog.at(-1)).toEqual(
      expect.objectContaining({
        type: 'room_resolved',
        room: expect.objectContaining({
          tokenId: 'giant_rat',
          tokenKind: 'monster',
        }),
      }),
    );
  });

  it('opens a chest only with a key, consuming the key and chest', () => {
    const state = createRoomState({
      id: 'treasure_chest',
      kind: 'chest',
    });
    const withChest = resolveRoomToken(state);
    const withKey = {
      ...withChest,
      players: withChest.players.map((player, index) =>
        index === withChest.activePlayerIndex
          ? {
              ...player,
              inventory: { ...player.inventory, keyCount: 1 as const },
            }
          : player,
      ),
    };
    const opened = openChest(withKey);
    const activePlayer = opened.players[opened.activePlayerIndex];
    const room = opened.board.find(
      (tile) =>
        tile.boardX === activePlayer.position.boardX &&
        tile.boardY === activePlayer.position.boardY,
    );

    expect(activePlayer.inventory.keyCount).toBe(0);
    expect(activePlayer.treasurePoints).toBe(1);
    expect(room?.roomToken).toBeUndefined();
  });
});

function createRoomState(
  token: GameState['tokenBag'][number],
  overrides: Partial<Pick<GameState, 'remainingSteps'>> = {},
): GameState {
  const base = createNewGame({
    humanHeroId: 'hero_mage',
    aiCount: 1,
    seed: `room-${token.id}`,
  });
  const roomTile: PlacedTile = {
    tileInstanceId: 'tile-room',
    blueprintId: 'room_cross',
    rotation: 0,
    boardX: 0,
    boardY: -1,
    discovered: true,
    looseItems: [],
  };

  return {
    ...base,
    phase: 'resolve_room_token',
    board: [...base.board, roomTile],
    players: base.players.map((player, index) =>
      index === base.activePlayerIndex
        ? { ...player, position: { boardX: 0, boardY: -1 } }
        : player,
    ),
    tokenBag: [token],
    remainingSteps: overrides.remainingSteps ?? 3,
    lastMoveFrom: { boardX: 0, boardY: 0 },
  };
}
