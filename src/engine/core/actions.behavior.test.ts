import { describe, expect, it } from 'vitest';

import {
  createPosition,
  createTestPlayer,
  createTestState,
  createTestTile,
} from '../../test/gameStateFactory';
import { assertStateInvariants } from '../../test/invariants';
import { applyGameAction } from './actions';
import type { GameState } from './types';

/**
 * Characterization tests driven exclusively through the public action
 * dispatcher. These lock in the observable behavior of subsystems that have no
 * co-located unit tests (chests, witch swap, healing on turn end, monster
 * triggering in performMove). Because they only touch applyGameAction(), they
 * survive internal refactors that rename or relocate the underlying helpers.
 */

describe('dispatcher behavior: openChest', () => {
  function chestState(overrides: Partial<GameState> = {}): GameState {
    return createTestState({
      phase: 'await_move',
      remainingSteps: 3,
      players: [
        createTestPlayer({
          id: 'player_human',
          heroId: 'hero_blade',
          inventory: { weapons: [], spells: [], keyCount: 1 },
        }),
        createTestPlayer({ id: 'player_ai_1', kind: 'ai', heroId: 'hero_rogue' }),
      ],
      board: [
        createTestTile({
          boardX: 0,
          boardY: 0,
          roomToken: { id: 'treasure_chest', kind: 'chest' },
        }),
      ],
      ...overrides,
    });
  }

  it('consumes the key, awards treasure and clears the chest', () => {
    const next = applyGameAction(chestState(), { type: 'openChest' });

    expect(next.players[0].inventory.keyCount).toBe(0);
    expect(next.players[0].treasurePoints).toBe(1);
    expect(next.board[0].roomToken).toBeUndefined();
    // Without a continuation reason, opening a chest ends the turn.
    expect(next.phase).toBe('turn_end');
  });

  it('keeps the turn open under a blade_on_six continuation', () => {
    const next = applyGameAction(
      chestState({ turnContinuationReason: 'blade_on_six', remainingSteps: 2 }),
      { type: 'openChest' },
    );

    expect(next.phase).toBe('await_move');
    expect(next.turnContinuationReason).toBe('blade_on_six');
    expect(next.players[0].treasurePoints).toBe(1);
  });

  it('throws when the active player has no key', () => {
    const state = chestState({
      players: [
        createTestPlayer({
          id: 'player_human',
          heroId: 'hero_blade',
          inventory: { weapons: [], spells: [], keyCount: 0 },
        }),
        createTestPlayer({ id: 'player_ai_1', kind: 'ai', heroId: 'hero_rogue' }),
      ],
    });

    expect(() => applyGameAction(state, { type: 'openChest' })).toThrow(/key/i);
  });

  it('throws when there is no chest on the active tile', () => {
    const state = chestState({ board: [createTestTile({ boardX: 0, boardY: 0 })] });

    expect(() => applyGameAction(state, { type: 'openChest' })).toThrow(
      /treasure chest/i,
    );
  });
});

describe('dispatcher behavior: swapWitchPosition', () => {
  function witchState(overrides: Partial<GameState> = {}): GameState {
    return createTestState({
      phase: 'turn_start',
      remainingSteps: 4,
      players: [
        createTestPlayer({ id: 'player_human', heroId: 'hero_witch' }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
          position: createPosition(2, 0),
        }),
      ],
      board: [
        createTestTile({ boardX: 0, boardY: 0 }),
        createTestTile({ tileInstanceId: 'tile-target', boardX: 2, boardY: 0 }),
      ],
      ...overrides,
    });
  }

  it('swaps the two players and consumes all remaining steps', () => {
    const next = applyGameAction(witchState(), {
      type: 'swapWitchPosition',
      targetPlayerId: 'player_ai_1',
    });

    expect(next.players[0].position).toEqual(createPosition(2, 0));
    expect(next.players[1].position).toEqual(createPosition(0, 0));
    expect(next.remainingSteps).toBe(0);
    expect(next.lastMoveFrom).toEqual(createPosition(0, 0));
    expect(next.combat).toBeUndefined();
  });

  it('enters combat when the witch lands on a monster tile', () => {
    const next = applyGameAction(
      witchState({
        board: [
          createTestTile({ boardX: 0, boardY: 0 }),
          createTestTile({
            tileInstanceId: 'tile-target',
            boardX: 2,
            boardY: 0,
            roomToken: { id: 'skeleton_soldier', kind: 'monster' },
          }),
        ],
      }),
      { type: 'swapWitchPosition', targetPlayerId: 'player_ai_1' },
    );

    expect(next.phase).toBe('combat');
    expect(next.combat).toMatchObject({
      playerId: 'player_human',
      monsterId: 'skeleton_soldier',
      source: 'witch_swap',
      position: createPosition(2, 0),
      enteredFrom: createPosition(0, 0),
    });
  });

  it('throws when the active hero is not an uncursed witch', () => {
    const cursedWitch = witchState({
      players: [
        createTestPlayer({ id: 'player_human', heroId: 'hero_witch', isCursed: true }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
          position: createPosition(2, 0),
        }),
      ],
    });

    expect(() =>
      applyGameAction(cursedWitch, {
        type: 'swapWitchPosition',
        targetPlayerId: 'player_ai_1',
      }),
    ).toThrow(/witch/i);
  });

  it('throws outside of turn_start', () => {
    expect(() =>
      applyGameAction(witchState({ phase: 'await_move' }), {
        type: 'swapWitchPosition',
        targetPlayerId: 'player_ai_1',
      }),
    ).toThrow(/turn start/i);
  });
});

describe('dispatcher behavior: healing on endTurn', () => {
  it('fully heals the active player when ending the turn on a healing tile', () => {
    const state = createTestState({
      phase: 'await_move',
      remainingSteps: 0,
      players: [
        createTestPlayer({
          id: 'player_human',
          heroId: 'hero_blade',
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
        // start_cross_healing grants healing
        createTestTile({ boardX: 0, boardY: 0, blueprintId: 'start_cross_healing' }),
        createTestTile({ tileInstanceId: 'tile-far', boardX: 5, boardY: 5 }),
      ],
    });

    const next = applyGameAction(state, { type: 'endTurn' });

    expect(next.players[0].hp).toBe(5);
    expect(next.players[0].isCursed).toBe(false);
    expect(next.players[0].skipNextTurn).toBe(false);
    expect(next.activePlayerIndex).toBe(1);
  });

  it('does not heal when ending the turn off a healing tile', () => {
    const state = createTestState({
      phase: 'await_move',
      remainingSteps: 0,
      players: [
        createTestPlayer({
          id: 'player_human',
          heroId: 'hero_blade',
          hp: 2,
          position: createPosition(1, 0),
        }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_rogue',
          position: createPosition(5, 5),
        }),
      ],
      board: [
        createTestTile({ boardX: 1, boardY: 0, blueprintId: 'tunnel_cross' }),
        createTestTile({ tileInstanceId: 'tile-far', boardX: 5, boardY: 5 }),
      ],
    });

    const next = applyGameAction(state, { type: 'endTurn' });

    expect(next.players[0].hp).toBe(2);
  });
});

describe('dispatcher behavior: movePlayer monster triggering', () => {
  function movementState(activeHeroId: 'hero_blade' | 'hero_rogue'): GameState {
    return createTestState({
      phase: 'await_move',
      remainingSteps: 2,
      players: [
        createTestPlayer({
          id: 'player_human',
          heroId: activeHeroId,
          position: createPosition(0, 0),
        }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_mage',
          position: createPosition(9, 9),
        }),
      ],
      board: [
        createTestTile({ boardX: 0, boardY: 0, blueprintId: 'tunnel_cross' }),
        createTestTile({
          tileInstanceId: 'tile-monster',
          boardX: 1,
          boardY: 0,
          blueprintId: 'room_cross',
          roomToken: { id: 'kitchen_rat', kind: 'monster' },
        }),
        createTestTile({ tileInstanceId: 'tile-far', boardX: 9, boardY: 9 }),
      ],
    });
  }

  it('forces combat when a non-rogue moves onto a monster tile', () => {
    const next = applyGameAction(movementState('hero_blade'), {
      type: 'movePlayer',
      target: createPosition(1, 0),
    });

    expect(next.phase).toBe('combat');
    expect(next.combat).toMatchObject({
      playerId: 'player_human',
      monsterId: 'kitchen_rat',
      position: createPosition(1, 0),
      enteredFrom: createPosition(0, 0),
    });
    expect(next.remainingSteps).toBe(1);
  });

  it('offers optional combat when a rogue moves onto a monster tile', () => {
    const next = applyGameAction(movementState('hero_rogue'), {
      type: 'movePlayer',
      target: createPosition(1, 0),
    });

    expect(next.phase).toBe('optional_monster_combat');
    expect(next.combat).toMatchObject({
      monsterId: 'kitchen_rat',
      position: createPosition(1, 0),
    });
  });

  it('throws on an illegal (non-adjacent, disconnected) move target', () => {
    expect(() =>
      applyGameAction(movementState('hero_blade'), {
        type: 'movePlayer',
        target: createPosition(9, 9),
      }),
    ).toThrow(/illegal move/i);
  });
});

describe('dispatcher behavior: movePlayer phase transitions', () => {
  function emptyMovementState(remainingSteps: number): GameState {
    return createTestState({
      phase: 'await_move',
      remainingSteps,
      players: [
        createTestPlayer({
          id: 'player_human',
          heroId: 'hero_blade',
          position: createPosition(0, 0),
        }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_mage',
          position: createPosition(9, 9),
        }),
      ],
      board: [
        createTestTile({ boardX: 0, boardY: 0, blueprintId: 'tunnel_cross' }),
        createTestTile({
          tileInstanceId: 'tile-empty',
          boardX: 1,
          boardY: 0,
          blueprintId: 'tunnel_cross',
        }),
        createTestTile({ tileInstanceId: 'tile-far', boardX: 9, boardY: 9 }),
      ],
    });
  }

  it('stays in await_move with steps remaining', () => {
    const next = applyGameAction(emptyMovementState(2), {
      type: 'movePlayer',
      target: createPosition(1, 0),
    });

    expect(next.phase).toBe('await_move');
    expect(next.remainingSteps).toBe(1);
    expect(next.players[0].position).toEqual(createPosition(1, 0));
  });

  it('ends the turn after the last step with no follow-up actions', () => {
    const next = applyGameAction(emptyMovementState(1), {
      type: 'movePlayer',
      target: createPosition(1, 0),
    });

    expect(next.phase).toBe('turn_end');
    expect(next.remainingSteps).toBe(0);
  });
});

describe('dispatcher behavior: defeating the dragon', () => {
  function dragonCombatState(): GameState {
    return createTestState({
      phase: 'combat',
      remainingSteps: 1,
      players: [
        createTestPlayer({
          id: 'player_human',
          heroId: 'hero_rogue',
          position: createPosition(1, 0),
          inventory: {
            weapons: [
              { type: 'weapon', bonus: 3 },
              { type: 'weapon', bonus: 3 },
            ],
            spells: [],
            keyCount: 0,
          },
        }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_mage',
          position: createPosition(0, 0),
        }),
      ],
      board: [
        createTestTile({ boardX: 0, boardY: 0 }),
        createTestTile({
          tileInstanceId: 'tile-dragon',
          boardX: 1,
          boardY: 0,
          blueprintId: 'room_cross',
          roomToken: { id: 'dragon', kind: 'monster' },
        }),
      ],
      combat: {
        playerId: 'player_human',
        monsterId: 'dragon',
        position: createPosition(1, 0),
        enteredFrom: createPosition(0, 0),
      },
    });
  }

  it('ends the game with a consistent victory when the dragon is beaten', () => {
    // Two +3 weapons plus a forced [6,6] roll = 18 > dragon strength 15.
    const next = applyGameAction(dragonCombatState(), {
      type: 'resolveCombat',
      dice: [6, 6],
    });

    expect(next.phase).toBe('game_over');
    expect(next.victory).toBeDefined();
    expect(next.victory?.defeatedDragonByPlayerId).toBe('player_human');
    expect(next.victory?.winnerPlayerIds).toContain('player_human');
    // The defeater scored the dragon hoard and so is the unique winner.
    expect(next.players[0].treasurePoints).toBeGreaterThan(0);
    expect(next.board.find((tile) => tile.boardX === 1)?.roomToken).toBeUndefined();
    expect(() => assertStateInvariants(next)).not.toThrow();
  });

  it('does not end the game when the dragon roll falls short', () => {
    const next = applyGameAction(dragonCombatState(), {
      type: 'resolveCombat',
      dice: [1, 1],
    });

    expect(next.phase).not.toBe('game_over');
    expect(next.victory).toBeUndefined();
    expect(() => assertStateInvariants(next)).not.toThrow();
  });
});

describe('dispatcher behavior: combat retreat branches', () => {
  it('reincarnates a valkyrie defeated to 0 HP onto a healing tile', () => {
    const state = createTestState({
      phase: 'combat',
      remainingSteps: 1,
      players: [
        createTestPlayer({
          id: 'player_human',
          heroId: 'hero_valkyrie',
          hp: 1,
          position: createPosition(1, 0),
        }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_mage',
          position: createPosition(0, 0),
        }),
      ],
      board: [
        createTestTile({ boardX: 0, boardY: 0, blueprintId: 'start_cross_healing' }),
        createTestTile({
          tileInstanceId: 'tile-monster',
          boardX: 1,
          boardY: 0,
          blueprintId: 'room_cross',
          roomToken: { id: 'skeleton_lord', kind: 'monster' },
        }),
      ],
      combat: {
        playerId: 'player_human',
        monsterId: 'skeleton_lord',
        position: createPosition(1, 0),
        enteredFrom: createPosition(0, 0),
      },
    });

    // Valkyrie always pauses for a reroll on a non-victory; decline keeps the defeat.
    const afterRoll = applyGameAction(state, {
      type: 'resolveCombat',
      dice: [1, 1],
    });
    expect(afterRoll.phase).toBe('combat_valkyrie_reroll');

    const next = applyGameAction(afterRoll, { type: 'declineValkyrieReroll' });

    expect(next.players[0].hp).toBe(next.players[0].maxHp);
    expect(next.players[0].position).toEqual(createPosition(0, 0));
    expect(next.players[0].skipNextTurn).toBe(false);
    expect(next.phase).toBe('turn_end');
    expect(() => assertStateInvariants(next)).not.toThrow();
  });

  it('retreats a witch defeated after a witch_swap to a BFS-found non-monster tile', () => {
    const state = createTestState({
      phase: 'combat',
      remainingSteps: 0,
      players: [
        createTestPlayer({
          id: 'player_human',
          heroId: 'hero_witch',
          hp: 5,
          position: createPosition(1, 0),
        }),
        createTestPlayer({
          id: 'player_ai_1',
          kind: 'ai',
          heroId: 'hero_mage',
          position: createPosition(2, 0),
        }),
      ],
      board: [
        // enteredFrom is a monster tile, so a correct fallback must NOT return here.
        createTestTile({
          tileInstanceId: 'tile-entered',
          boardX: 0,
          boardY: 0,
          blueprintId: 'room_cross',
          roomToken: { id: 'skeleton_soldier', kind: 'monster' },
        }),
        createTestTile({
          tileInstanceId: 'tile-monster',
          boardX: 1,
          boardY: 0,
          blueprintId: 'room_cross',
          roomToken: { id: 'skeleton_lord', kind: 'monster' },
        }),
        // The only connected non-monster tile — the expected fallback target.
        createTestTile({
          tileInstanceId: 'tile-safe',
          boardX: 2,
          boardY: 0,
          blueprintId: 'room_cross',
        }),
      ],
      combat: {
        playerId: 'player_human',
        monsterId: 'skeleton_lord',
        position: createPosition(1, 0),
        enteredFrom: createPosition(0, 0),
        source: 'witch_swap',
      },
    });

    const next = applyGameAction(state, { type: 'resolveCombat', dice: [1, 1] });

    // Fallback BFS skips the monster tile at enteredFrom and lands on the safe tile.
    expect(next.players[0].position).toEqual(createPosition(2, 0));
    expect(next.phase).toBe('turn_end');
    expect(() => assertStateInvariants(next)).not.toThrow();
  });
});

describe('dispatcher guard: missing state', () => {
  it('requires an existing game state for non-start actions', () => {
    expect(() => applyGameAction(undefined, { type: 'endTurn' })).toThrow(
      /requires an existing game state/i,
    );
  });

  it('creates a fresh game from a startGame action without prior state', () => {
    const next = applyGameAction(undefined, {
      type: 'startGame',
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'dispatch-start',
    });

    expect(next.phase).toBe('turn_start');
    expect(next.players.length).toBeGreaterThanOrEqual(2);
  });
});
