import { describe, expect, it } from 'vitest';

import { createSeededRng } from '../../utils/rng';
import type { GameState, PlacedTile } from '../core/types';
import { createNewGame } from '../setup/createGame';
import { openChest } from './chests';
import { chooseSeeressRoomToken, resolveRoomToken } from './rooms';

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

  it('keeps the turn open after discovering a chest at zero steps when a loose item is available', () => {
    const state = createRoomState(
      {
        id: 'treasure_chest',
        kind: 'chest',
      },
      { remainingSteps: 0, roomTileLooseItems: [{ type: 'key' as const }] },
    );
    const resolved = resolveRoomToken(state);

    expect(resolved.phase).toBe('await_move');
  });

  it('starts combat when a monster token is drawn', () => {
    const state = createRoomState({
      id: 'kitchen_rat',
      kind: 'monster',
    });
    const resolved = resolveRoomToken(state);

    expect(resolved.phase).toBe('combat');
    expect(resolved.combat).toEqual(
      expect.objectContaining({ monsterId: 'kitchen_rat' }),
    );
    expect(resolved.eventLog.at(-1)).toEqual(
      expect.objectContaining({
        type: 'room_resolved',
        room: expect.objectContaining({
          tokenId: 'kitchen_rat',
          tokenKind: 'monster',
        }),
      }),
    );
  });

  it('gives an uncursed rogue optional combat when a monster token is drawn', () => {
    const state = createRoomState(
      {
        id: 'kitchen_rat',
        kind: 'monster',
      },
      { heroId: 'hero_rogue' },
    );
    const resolved = resolveRoomToken(state);

    expect(resolved.phase).toBe('optional_monster_combat');
    expect(resolved.combat).toEqual(
      expect.objectContaining({ monsterId: 'kitchen_rat' }),
    );
  });

  it('pauses for a human seeress choice when two or more tokens are available', () => {
    const state = createRoomState(
      { id: 'kitchen_rat', kind: 'monster' },
      {
        heroId: 'hero_seeress',
        tokenBag: [
          { id: 'kitchen_rat', kind: 'monster' },
          { id: 'treasure_chest', kind: 'chest' },
          { id: 'dragon', kind: 'monster' },
        ],
      },
    );
    const pending = resolveRoomToken(state);

    expect(pending.phase).toBe('resolve_room_token_seeress_choice');
    expect(pending.pendingSeeressRoomChoice).toEqual({
      drawnTokens: [
        { id: 'kitchen_rat', kind: 'monster' },
        { id: 'treasure_chest', kind: 'chest' },
      ],
      position: { boardX: 0, boardY: -1 },
    });
    expect(pending.tokenBag).toEqual([{ id: 'dragon', kind: 'monster' }]);
  });

  it('resolves the chosen seeress token and returns the other token to the bag', () => {
    const state = createRoomState(
      { id: 'kitchen_rat', kind: 'monster' },
      {
        heroId: 'hero_seeress',
        tokenBag: [
          { id: 'kitchen_rat', kind: 'monster' },
          { id: 'treasure_chest', kind: 'chest' },
          { id: 'dragon', kind: 'monster' },
        ],
      },
    );
    const pending = resolveRoomToken(state);
    const resolved = chooseSeeressRoomToken(pending, 1);

    expect(resolved.phase).toBe('await_move');
    expect(
      resolved.board.find((tile) => tile.boardX === 0 && tile.boardY === -1)
        ?.roomToken,
    ).toEqual({ id: 'treasure_chest', kind: 'chest' });
    expect(resolved.tokenBag).toEqual([
      { id: 'dragon', kind: 'monster' },
      { id: 'kitchen_rat', kind: 'monster' },
    ]);
    expect(resolved.eventLog.at(-1)).toEqual(
      expect.objectContaining({
        type: 'room_resolved',
        room: expect.objectContaining({
          tokenId: 'treasure_chest',
          seeressChoiceIndex: 1,
          seeressDrawnTokenIds: ['kitchen_rat', 'treasure_chest'],
        }),
      }),
    );
  });

  it('reinserts the returned seeress token uniformly instead of forcing it to the top in direct resolution', () => {
    const state = createRoomState(
      { id: 'kitchen_rat', kind: 'monster' },
      {
        heroId: 'hero_seeress',
        seed: 'seeress-reinsert-5',
        tokenBag: [
          { id: 'kitchen_rat', kind: 'monster' },
          { id: 'treasure_chest', kind: 'chest' },
          { id: 'dragon', kind: 'monster' },
          { id: 'mummified_priest', kind: 'monster' },
        ],
      },
    );
    const aiSeeressState = {
      ...state,
      rng: createSeededRng('seeress-reinsert-5').snapshot(),
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, kind: 'ai' as const } : player,
      ),
    };
    const resolved = resolveRoomToken(aiSeeressState, { seeressChoiceIndex: 1 });

    expect(resolved.tokenBag).toEqual([
      { id: 'kitchen_rat', kind: 'monster' },
      { id: 'dragon', kind: 'monster' },
      { id: 'mummified_priest', kind: 'monster' },
    ]);
    expect(
      resolved.tokenBag.filter((token) => token.id === 'kitchen_rat'),
    ).toHaveLength(1);
    expect(resolved.rng).not.toEqual(aiSeeressState.rng);
  });

  it('reinserts the returned seeress token uniformly after a human seeress choice', () => {
    const state = createRoomState(
      { id: 'kitchen_rat', kind: 'monster' },
      {
        heroId: 'hero_seeress',
        seed: 'seeress-reinsert-5',
        tokenBag: [
          { id: 'kitchen_rat', kind: 'monster' },
          { id: 'treasure_chest', kind: 'chest' },
          { id: 'dragon', kind: 'monster' },
          { id: 'mummified_priest', kind: 'monster' },
        ],
      },
    );
    const pending = resolveRoomToken(state);
    const resolved = chooseSeeressRoomToken(
      {
        ...pending,
        rng: createSeededRng('seeress-reinsert-5').snapshot(),
      },
      1,
    );

    expect(resolved.tokenBag).toEqual([
      { id: 'kitchen_rat', kind: 'monster' },
      { id: 'dragon', kind: 'monster' },
      { id: 'mummified_priest', kind: 'monster' },
    ]);
    expect(
      resolved.tokenBag.filter((token) => token.id === 'kitchen_rat'),
    ).toHaveLength(1);
    expect(resolved.rng).not.toEqual(state.rng);
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
  overrides: Partial<Pick<GameState, 'remainingSteps'>> & {
    heroId?: 'hero_mage' | 'hero_rogue' | 'hero_seeress';
    tokenBag?: GameState['tokenBag'];
    seed?: string;
    roomTileLooseItems?: PlacedTile['looseItems'];
  } = {},
): GameState {
  const base = createNewGame({
    humanHeroId: overrides.heroId ?? 'hero_mage',
    aiCount: 1,
    seed: overrides.seed ?? `room-${token.id}`,
  });
  const roomTile: PlacedTile = {
    tileInstanceId: 'tile-room',
    blueprintId: 'room_cross',
    rotation: 0,
    boardX: 0,
    boardY: -1,
    discovered: true,
    looseItems: overrides.roomTileLooseItems ?? [],
  };

  return {
    ...base,
    activePlayerIndex: 0,
    phase: 'resolve_room_token',
    board: [...base.board, roomTile],
    players: base.players.map((player, index) =>
      index === 0
        ? { ...player, position: { boardX: 0, boardY: -1 } }
        : player,
    ),
    tokenBag: overrides.tokenBag ?? [token],
    remainingSteps: overrides.remainingSteps ?? 3,
    lastMoveFrom: { boardX: 0, boardY: 0 },
  };
}
