import { describe, expect, it } from 'vitest';

import {
  createPosition,
  createTestPlayer,
  createTestState,
  createTestTile,
} from '../../test/gameStateFactory';
import {
  getActivePlayer,
  getActivePlayerAbility,
  getActiveTileMonsterCombat,
  getDiscoveredHealingPositions,
  hasActiveHeroAbility,
  hasMonsterOnActiveTile,
} from './abilities';

/**
 * Direct unit coverage for the small, stable hero-ability accessors that the
 * rest of the engine relies on. These are read-only helpers, so testing them in
 * isolation complements the behavioral net without coupling to mutating logic.
 */

describe('hero ability helpers', () => {
  it('gates abilities on hero identity and curse status', () => {
    const witch = createTestPlayer({ heroId: 'hero_witch' });
    const cursedWitch = createTestPlayer({ heroId: 'hero_witch', isCursed: true });

    expect(hasActiveHeroAbility(witch, 'hero_witch')).toBe(true);
    expect(hasActiveHeroAbility(witch, 'hero_blade')).toBe(false);
    expect(hasActiveHeroAbility(cursedWitch, 'hero_witch')).toBe(false);
  });

  it('reads the active player and its ability through state', () => {
    const state = createTestState({
      activePlayerIndex: 1,
      players: [
        createTestPlayer({ id: 'player_human', heroId: 'hero_mage' }),
        createTestPlayer({ id: 'player_ai_1', kind: 'ai', heroId: 'hero_rogue' }),
      ],
    });

    expect(getActivePlayer(state).id).toBe('player_ai_1');
    expect(getActivePlayerAbility(state, 'hero_rogue')).toBe(true);
    expect(getActivePlayerAbility(state, 'hero_mage')).toBe(false);
  });

  it('collects discovered healing tile positions', () => {
    const state = createTestState({
      board: [
        createTestTile({ boardX: 0, boardY: 0, blueprintId: 'start_cross_healing' }),
        createTestTile({
          tileInstanceId: 'tile-heal',
          boardX: 1,
          boardY: 0,
          blueprintId: 'healing_corner',
        }),
        createTestTile({
          tileInstanceId: 'tile-tunnel',
          boardX: 2,
          boardY: 0,
          blueprintId: 'tunnel_cross',
        }),
      ],
    });

    expect(getDiscoveredHealingPositions(state)).toEqual([
      { boardX: 0, boardY: 0 },
      { boardX: 1, boardY: 0 },
    ]);
  });

  it('detects a monster on the active tile and builds its combat context', () => {
    const monsterTileState = createTestState({
      activePlayerIndex: 0,
      lastMoveFrom: createPosition(0, 0),
      players: [
        createTestPlayer({ id: 'player_human', position: createPosition(1, 0) }),
      ],
      board: [
        createTestTile({ boardX: 0, boardY: 0 }),
        createTestTile({
          tileInstanceId: 'tile-monster',
          boardX: 1,
          boardY: 0,
          roomToken: { id: 'skeleton_lord', kind: 'monster' },
        }),
      ],
    });

    expect(hasMonsterOnActiveTile(monsterTileState)).toBe(true);
    expect(getActiveTileMonsterCombat(monsterTileState)).toEqual({
      playerId: 'player_human',
      monsterId: 'skeleton_lord',
      position: createPosition(1, 0),
      enteredFrom: createPosition(0, 0),
    });
  });

  it('returns no combat context when the active tile has no monster', () => {
    const safeState = createTestState({
      players: [createTestPlayer({ id: 'player_human', position: createPosition(0, 0) })],
      board: [createTestTile({ boardX: 0, boardY: 0 })],
    });

    expect(hasMonsterOnActiveTile(safeState)).toBe(false);
    expect(getActiveTileMonsterCombat(safeState)).toBeUndefined();
  });
});
