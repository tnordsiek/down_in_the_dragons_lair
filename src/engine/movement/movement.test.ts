import { describe, expect, it } from 'vitest';

import type { PlacedTile } from '../core/types';
import { createNewGame } from '../setup/createGame';
import {
  getLegalExplorationDirections,
  getLegalKnownMoveDirections,
} from './movement';
import { moveActivePlayer } from './performMove';

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
    const movedState = moveActivePlayer(withKnownNeighbor, 'A');

    expect(movedState.players[movedState.activePlayerIndex].position).toEqual({
      boardX: 0,
      boardY: -1,
    });
  });
});
