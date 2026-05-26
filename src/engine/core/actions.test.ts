import { describe, expect, it } from 'vitest';

import { applyGameAction } from './actions';
import { createNewGame } from '../setup/createGame';

describe('game action transitions', () => {
  it('starts a game through the action interface', () => {
    const state = applyGameAction(undefined, {
      type: 'startGame',
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'action-seed',
    });

    expect(state.players).toHaveLength(2);
    expect(state.phase).toBe('turn_start');
  });

  it('passes manual AI hero selections through the action interface', () => {
    const state = applyGameAction(undefined, {
      type: 'startGame',
      humanHeroId: 'hero_mage',
      aiCount: 2,
      seed: 'action-manual-ai-seed',
      selectedAiHeroIds: ['hero_rogue'],
    });

    expect(state.players.map((player) => player.heroId)).toEqual([
      'hero_mage',
      'hero_rogue',
      expect.any(String),
    ]);
    expect(new Set(state.players.map((player) => player.heroId)).size).toBe(3);
  });

  it('can declare and place exploration through actions', () => {
    const state = applyGameAction(undefined, {
      type: 'startGame',
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'action-explore-seed',
    });
    const pendingState = applyGameAction(
      { ...state, tileStack: ['tunnel_straight'] },
      { type: 'declareExplorationDirection', direction: 'A' },
    );
    const placedState = applyGameAction(pendingState, {
      type: 'placePendingTile',
      rotation: 0,
    });

    expect(placedState.board).toHaveLength(2);
    expect(placedState.phase).toBe('await_move');
  });

  it('can rotate a pending tile preview through actions', () => {
    const state = applyGameAction(undefined, {
      type: 'startGame',
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'action-rotate-seed',
    });
    const pendingState = applyGameAction(
      { ...state, tileStack: ['room_corner'] },
      { type: 'declareExplorationDirection', direction: 'A' },
    );
    const rotatedState = applyGameAction(pendingState, {
      type: 'rotatePendingTilePreview',
      direction: 'clockwise',
    });

    expect(rotatedState.pendingTile?.previewRotation).toBe(90);
  });

  it('does not allow ending the turn while a room token must be resolved', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'action-room-end-turn-seed',
    });

    expect(() =>
      applyGameAction(
        {
          ...state,
          phase: 'resolve_room_token',
        },
        { type: 'endTurn' },
      ),
    ).toThrow('Resolve the room token before ending the turn');
  });

  it('does not allow ending the turn while a pending tile rotation must be confirmed', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'action-pending-tile-end-turn-seed',
    });

    expect(() =>
      applyGameAction(
        {
          ...state,
          phase: 'choose_pending_tile_rotation',
          pendingTile: {
            origin: { boardX: 0, boardY: 0 },
            target: { boardX: 0, boardY: -1 },
            direction: 'A',
            blueprintId: 'room_corner',
            previewRotation: 0,
            legalRotations: [0, 90],
            skippedBlueprintIds: [],
          },
        },
        { type: 'endTurn' },
      ),
    ).toThrow('Confirm the pending tile rotation before ending the turn');
  });

  it('can choose between two drawn seeress room tokens through the action interface', () => {
    const state = createNewGame({
      humanHeroId: 'hero_seeress',
      aiCount: 1,
      seed: 'action-seeress-room-seed',
    });

    const pending = applyGameAction(
      {
        ...state,
        activePlayerIndex: 0,
        phase: 'resolve_room_token',
        board: [
          ...state.board,
          {
            tileInstanceId: 'tile-room',
            blueprintId: 'room_cross',
            rotation: 0,
            boardX: 0,
            boardY: -1,
            discovered: true,
            looseItems: [],
          },
        ],
        players: state.players.map((player, index) =>
          index === 0
            ? { ...player, position: { boardX: 0, boardY: -1 } }
            : player,
        ),
        tokenBag: [
          { id: 'kitchen_rat', kind: 'monster' },
          { id: 'treasure_chest', kind: 'chest' },
        ],
        lastMoveFrom: { boardX: 0, boardY: 0 },
      },
      { type: 'resolveRoomToken' },
    );
    const chosen = applyGameAction(pending, {
      type: 'chooseSeeressRoomToken',
      choiceIndex: 1,
    });

    expect(pending.phase).toBe('resolve_room_token_seeress_choice');
    expect(chosen.phase).toBe('await_move');
    expect(
      chosen.board.find((tile) => tile.boardX === 0 && tile.boardY === -1)
        ?.roomToken,
    ).toEqual({ id: 'treasure_chest', kind: 'chest' });
  });
});
