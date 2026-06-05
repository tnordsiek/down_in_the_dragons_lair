import { describe, expect, it } from 'vitest';

import {
  createPosition,
  createTestPlayer,
  createTestState,
  createTestTile,
} from '../../test/gameStateFactory';
import { endTurn, isEndTurnBlockedPhase } from './turns';

describe('turn ending', () => {
  it('marks the expected phases as blocked for end-turn actions', () => {
    expect(isEndTurnBlockedPhase('combat')).toBe(true);
    expect(isEndTurnBlockedPhase('loot_resolution')).toBe(true);
    expect(isEndTurnBlockedPhase('resolve_room_token')).toBe(true);
    expect(isEndTurnBlockedPhase('await_move')).toBe(false);
    expect(isEndTurnBlockedPhase('turn_start')).toBe(false);
  });

  it('recovers a skipped unconscious player before advancing to the next turn', () => {
    const state = createTestState({
      phase: 'turn_skip',
      activePlayerIndex: 0,
      remainingSteps: 0,
      players: [
        createTestPlayer({
          id: 'player_human',
          hp: 0,
          skipNextTurn: true,
        }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
        }),
      ],
    });

    const nextState = endTurn(state);

    expect(nextState.players[0].hp).toBe(1);
    expect(nextState.players[0].skipNextTurn).toBe(false);
    expect(nextState.activePlayerIndex).toBe(1);
    expect(nextState.phase).toBe('turn_start');
    expect(nextState.remainingSteps).toBe(4);
  });

  it('clears transient turn state while advancing to the next player', () => {
    const state = createTestState({
      phase: 'turn_end',
      activePlayerIndex: 0,
      remainingSteps: 0,
      lastMoveFrom: createPosition(0, -1),
      turnContinuationReason: 'blade_on_six',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: createPosition(0, 0),
        enteredFrom: createPosition(0, -1),
      },
      pendingLoot: {
        source: 'combat_reward',
        position: createPosition(0, 0),
        item: { type: 'key' },
      },
      players: [
        createTestPlayer({
          id: 'player_human',
          position: createPosition(0, 0),
        }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
          position: createPosition(1, 0),
        }),
      ],
      board: [
        createTestTile({ boardX: 0, boardY: 0 }),
        createTestTile({
          tileInstanceId: 'tile-1',
          boardX: 1,
          boardY: 0,
        }),
      ],
    });

    const nextState = endTurn(state);

    expect(nextState.activePlayerIndex).toBe(1);
    expect(nextState.phase).toBe('turn_start');
    expect(nextState.pendingLoot).toBeUndefined();
    expect(nextState.combat).toBeUndefined();
    expect(nextState.lastMoveFrom).toBeUndefined();
    expect(nextState.turnContinuationReason).toBeUndefined();
  });

  it('rotates the active player across more than two players', () => {
    const state = createTestState({
      phase: 'turn_end',
      activePlayerIndex: 2,
      players: [
        createTestPlayer({ id: 'player_human' }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
        }),
        createTestPlayer({
          id: 'player_ai_2',
          kind: 'ai',
          heroId: 'hero_blade',
        }),
      ],
    });

    const next = endTurn(state);

    // Wraps from the last player back to index 0.
    expect(next.activePlayerIndex).toBe(0);
    expect(next.phase).toBe('turn_start');
    expect(next.remainingSteps).toBe(4);
  });

  it('skips a queued unconscious next player by entering turn_skip with zero steps', () => {
    const state = createTestState({
      phase: 'turn_end',
      activePlayerIndex: 0,
      players: [
        createTestPlayer({ id: 'player_human' }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
          hp: 0,
          skipNextTurn: true,
        }),
      ],
    });

    const next = endTurn(state);

    expect(next.activePlayerIndex).toBe(1);
    expect(next.phase).toBe('turn_skip');
    expect(next.remainingSteps).toBe(0);
    // The skip flag is only cleared when the skipped player's turn is ended.
    expect(next.players[1].skipNextTurn).toBe(true);
  });

  it('heals the active player on a healing tile before advancing the turn', () => {
    const state = createTestState({
      phase: 'turn_end',
      activePlayerIndex: 0,
      remainingSteps: 0,
      players: [
        createTestPlayer({
          id: 'player_human',
          hp: 1,
          isCursed: true,
          position: createPosition(0, 0),
        }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
          position: createPosition(5, 5),
        }),
      ],
      board: [
        createTestTile({
          boardX: 0,
          boardY: 0,
          blueprintId: 'start_cross_healing',
        }),
        createTestTile({ tileInstanceId: 'tile-far', boardX: 5, boardY: 5 }),
      ],
    });

    const next = endTurn(state);

    expect(next.players[0].hp).toBe(5);
    expect(next.players[0].isCursed).toBe(false);
  });

  it('heals the active player who ends the turn without moving on a healing tile', () => {
    const state = createTestState({
      phase: 'turn_start',
      activePlayerIndex: 0,
      remainingSteps: 4,
      players: [
        createTestPlayer({
          id: 'player_human',
          hp: 2,
          isCursed: true,
          position: createPosition(0, 0),
        }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
          position: createPosition(5, 5),
        }),
      ],
      board: [
        createTestTile({
          boardX: 0,
          boardY: 0,
          blueprintId: 'start_cross_healing',
        }),
        createTestTile({ tileInstanceId: 'tile-far', boardX: 5, boardY: 5 }),
      ],
    });

    const next = endTurn(state);

    expect(next.players[0].hp).toBe(5);
    expect(next.players[0].isCursed).toBe(false);
  });

  it('does not heal the active player after a blocked combat retreat onto a healing tile', () => {
    const state = createTestState({
      phase: 'turn_end',
      activePlayerIndex: 0,
      remainingSteps: 0,
      healingEndTurnSource: 'combat_retreat_blocked',
      players: [
        createTestPlayer({
          id: 'player_human',
          hp: 2,
          isCursed: true,
          position: createPosition(0, 0),
        }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
          position: createPosition(5, 5),
        }),
      ],
      board: [
        createTestTile({
          boardX: 0,
          boardY: 0,
          blueprintId: 'start_cross_healing',
        }),
        createTestTile({ tileInstanceId: 'tile-far', boardX: 5, boardY: 5 }),
      ],
    });

    const next = endTurn(state);

    expect(next.players[0].hp).toBe(2);
    expect(next.players[0].isCursed).toBe(true);
  });

  it('blocks ending the turn while combat is unresolved', () => {
    const state = createTestState({ phase: 'combat' });

    expect(() => endTurn(state)).toThrow(/combat/i);
  });

  it('starts optional rogue combat when the next uncursed rogue is standing on a monster', () => {
    const state = createTestState({
      phase: 'turn_end',
      players: [
        createTestPlayer({ id: 'player_human' }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
          position: createPosition(1, 0),
        }),
      ],
      board: [
        createTestTile({ boardX: 0, boardY: 0 }),
        createTestTile({
          tileInstanceId: 'tile-monster',
          boardX: 1,
          boardY: 0,
          roomToken: { id: 'kitchen_rat', kind: 'monster' },
        }),
      ],
    });

    const nextState = endTurn(state);

    expect(nextState.phase).toBe('optional_monster_combat');
    expect(nextState.combat).toEqual({
      playerId: 'player_ai_1',
      monsterId: 'kitchen_rat',
      position: createPosition(1, 0),
      enteredFrom: createPosition(1, 0),
    });
  });
});
