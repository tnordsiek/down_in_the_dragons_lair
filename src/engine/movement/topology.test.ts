import { describe, expect, it } from 'vitest';

import { tileBlueprints } from '../../data/tiles';
import { createPosition, createTestTile } from '../../test/gameStateFactory';
import {
  adjacentPosition,
  canTilesConnect,
  getLegalRotationsForEntry,
  getPlacedTileOpenSides,
  oppositeSide,
  rotateOpenSides,
  rotateSide,
} from './topology';

describe('tile topology helpers', () => {
  it('moves and rotates sides consistently around the board', () => {
    expect(adjacentPosition(createPosition(2, 3), 'A')).toEqual(
      createPosition(2, 2),
    );
    expect(adjacentPosition(createPosition(2, 3), 'D')).toEqual(
      createPosition(1, 3),
    );
    expect(rotateSide('A', 90)).toBe('B');
    expect(rotateSide('B', 180)).toBe('D');
    expect(oppositeSide('C')).toBe('A');
  });

  it('rotates open sides and placed tiles by their current rotation', () => {
    expect(rotateOpenSides(['A', 'B'], 90)).toEqual(['B', 'C']);
    expect(
      getPlacedTileOpenSides(
        createTestTile({
          blueprintId: 'tunnel_corner',
          rotation: 180,
        }),
      ),
    ).toEqual(['C', 'D']);
  });

  it('connects tiles only when both sides stay open toward each other', () => {
    const origin = createTestTile({
      blueprintId: 'tunnel_straight',
      rotation: 0,
    });
    const connectedTarget = createTestTile({
      tileInstanceId: 'tile-1',
      blueprintId: 'tunnel_corner',
      rotation: 90,
    });
    const blockedTarget = createTestTile({
      tileInstanceId: 'tile-2',
      blueprintId: 'tunnel_corner',
      rotation: 0,
    });

    expect(canTilesConnect(origin, connectedTarget, 'A')).toBe(true);
    expect(canTilesConnect(origin, blockedTarget, 'A')).toBe(false);
  });

  it('returns every legal rotation that leaves the entry side open', () => {
    expect(
      getLegalRotationsForEntry(tileBlueprints.tunnel_straight, 'A'),
    ).toEqual([0, 180]);
    expect(
      getLegalRotationsForEntry(tileBlueprints.tunnel_corner, 'D'),
    ).toEqual([180, 270]);
  });
});
