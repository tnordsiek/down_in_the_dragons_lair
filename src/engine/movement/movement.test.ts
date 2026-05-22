import { describe, expect, it } from 'vitest';

import type { GameState, PlacedTile } from '../core/types';
import { createNewGame } from '../setup/createGame';
import {
  getLegalExplorationDirections,
  getLegalKnownMoves,
  getLegalKnownMoveDirections,
} from './movement';
import { moveActivePlayer } from './performMove';
import { getReachableKnownMovePaths } from './reachable';

describe('movement rules', () => {
  it('exposes unexplored directions from the start tile before drawing', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'movement-seed',
    });

    expect(getLegalExplorationDirections(state)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('moves between known connected tiles', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'known-move-seed',
    });
    const neighborTile: PlacedTile = {
      tileInstanceId: 'tile-1',
      blueprintId: 'tunnel_straight',
      rotation: 0,
      boardX: 0,
      boardY: -1,
      discovered: true,
      looseItems: [],
    };
    const withKnownNeighbor = {
      ...state,
      board: [...state.board, neighborTile],
    };

    expect(getLegalKnownMoveDirections(withKnownNeighbor)).toContain('A');
    const movedState = moveActivePlayer(withKnownNeighbor, {
      boardX: 0,
      boardY: -1,
    });

    expect(movedState.players[movedState.activePlayerIndex].position).toEqual({
      boardX: 0,
      boardY: -1,
    });
  });

  it('allows teleporting to another discovered portal for one step', () => {
    const state = createPortalState({
      remainingSteps: 2,
    });

    expect(getLegalKnownMoves(state)).toContainEqual({
      target: { boardX: 2, boardY: 0 },
      kind: 'teleport',
    });

    const movedState = moveActivePlayer(state, { boardX: 2, boardY: 0 });

    expect(movedState.players[movedState.activePlayerIndex].position).toEqual({
      boardX: 2,
      boardY: 0,
    });
    expect(movedState.remainingSteps).toBe(1);
    expect(movedState.phase).toBe('await_move');
  });

  it('does not offer teleporting without another discovered portal', () => {
    const state = createPortalState({
      board: createPortalBoard().slice(0, 2),
    });

    expect(
      getLegalKnownMoves(state).some((move) => move.kind === 'teleport'),
    ).toBe(false);
  });

  it('includes teleport steps in reachable known move paths', () => {
    const state = createPortalState({
      remainingSteps: 2,
      board: [
        ...createPortalBoard(),
        {
          tileInstanceId: 'tile-east-of-portal',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 3,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    const reachableMoves = getReachableKnownMovePaths(state);
    const farTarget = reachableMoves.find(
      (move) => move.position.boardX === 3 && move.position.boardY === 0,
    );

    expect(farTarget?.path.map((step) => step.kind)).toEqual([
      'teleport',
      'adjacent',
    ]);
  });

  it('keeps move and exploration options available during optional monster combat', () => {
    const state = createNewGame({
      humanHeroId: 'hero_rogue',
      aiCount: 1,
      seed: 'optional-monster-move-seed',
    });

    const optionalCombatState: GameState = {
      ...state,
      phase: 'optional_monster_combat',
      remainingSteps: 2,
      board: [
        {
          ...state.board[0],
          roomToken: { id: 'kitchen_rat', kind: 'monster' },
        },
      ],
      combat: {
        playerId: state.players[0].id,
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: 0 },
      },
    };

    expect(getLegalExplorationDirections(optionalCombatState)).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
  });
});

function createPortalState(overrides: Partial<GameState> = {}): GameState {
  const state = createNewGame({
    humanHeroId: 'hero_mage',
    aiCount: 1,
    seed: 'portal-move-seed',
  });

  return {
    ...state,
    phase: 'await_move',
    activePlayerIndex: 0,
    players: state.players.map((player, index) =>
      index === 0
        ? { ...player, position: { boardX: 0, boardY: 0 } }
        : player,
    ),
    board: createPortalBoard(),
    ...overrides,
  };
}

function createPortalBoard(): PlacedTile[] {
  return [
    {
      tileInstanceId: 'tile-origin-portal',
      blueprintId: 'teleport_straight',
      rotation: 90,
      boardX: 0,
      boardY: 0,
      discovered: true,
      looseItems: [],
    },
    {
      tileInstanceId: 'tile-west',
      blueprintId: 'tunnel_straight',
      rotation: 90,
      boardX: -1,
      boardY: 0,
      discovered: true,
      looseItems: [],
    },
    {
      tileInstanceId: 'tile-target-portal',
      blueprintId: 'teleport_straight',
      rotation: 90,
      boardX: 2,
      boardY: 0,
      discovered: true,
      looseItems: [],
    },
  ];
}
