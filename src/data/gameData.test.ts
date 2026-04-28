import { describe, expect, it } from 'vitest';

import { monsterDefinitions, monsterIds } from './monsters';
import { monsterRewards } from './rewards';
import {
  drawableTileCount,
  tileBlueprints,
  tilePoolCounts,
  totalTileCount,
} from './tiles';
import { createTokenBag, totalTokenCount } from './tokens';

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

  it('covers every monster with a reward mapping and monster definition', () => {
    expect(monsterIds).toHaveLength(8);

    for (const monsterId of monsterIds) {
      expect(monsterDefinitions[monsterId].reward).toEqual(
        monsterRewards[monsterId],
      );
    }
  });
});
