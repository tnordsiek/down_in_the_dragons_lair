import { describe, expect, it } from 'vitest';

import { monsterDefinitions, monsterIds } from './monsters';
import { monsterRewards } from './rewards';
import {
  getScaledTileCount,
  drawableTileCount,
  tileBlueprints,
  tilePoolCounts,
  totalTileCount,
} from './tiles';
import { createTokenBag, getScaledTokenCount, totalTokenCount } from './tokens';

describe('static game data', () => {
  it('matches the specified tile totals', () => {
    expect(totalTileCount).toBe(80);
    expect(drawableTileCount).toBe(79);
    expect(tilePoolCounts.start_cross_healing).toBe(1);
  });

  it('marks room tiles as token-spawning and non-room tiles as non-spawning', () => {
    const blueprints = Object.values(tileBlueprints);
    const roomTiles = blueprints.filter((tile) => tile.category === 'room');
    const nonRoomTiles = blueprints.filter((tile) => tile.category !== 'room');

    expect(
      roomTiles.every(
        (tile) => 'spawnsRoomToken' in tile && tile.spawnsRoomToken === true,
      ),
    ).toBe(true);
    expect(nonRoomTiles.every((tile) => !('spawnsRoomToken' in tile))).toBe(
      true,
    );
  });

  it('matches the specified finite token-bag total', () => {
    expect(totalTokenCount).toBe(53);
    expect(createTokenBag()).toHaveLength(53);
  });

  it('scales tile and token counts by factor with per-entry rounding', () => {
    expect(getScaledTileCount('room_corner', 1.5)).toBe(14);
    expect(getScaledTokenCount('skeleton_lord', 1.5)).toBe(5);
    expect(getScaledTokenCount('dragon', 5)).toBe(1);
    expect(createTokenBag(1.5)).toHaveLength(80);
  });

  it('covers every monster with a reward mapping and monster definition', () => {
    expect(monsterIds).toHaveLength(8);

    for (const monsterId of monsterIds) {
      expect(monsterDefinitions[monsterId].reward).toEqual(
        monsterRewards[monsterId],
      );
    }
  });
});
