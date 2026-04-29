import { describe, expect, it } from 'vitest';

import type {
  GameState,
  HeroId,
  MonsterId,
  PlacedTile,
  Player,
  Token,
} from '../core/types';
import { resolveCombat } from '../combat/combat';
import {
  getLegalExplorationDirections,
  getLegalKnownMoveDirections,
} from '../movement/movement';
import { moveActivePlayer } from '../movement/performMove';
import { createNewGame } from '../setup/createGame';
import { resolveRoomToken } from './rooms';
import { swapWarlockPosition } from './warlock';

describe('hero_mage abilities', () => {
  it('does not consume flame spells and moves through walls only on discovered tiles', () => {
    const combatState = withActivePlayer(
      createCombatState('hero_mage', 'giant_rat'),
      (player) => ({
        ...player,
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      }),
    );
    const resolved = resolveCombat(combatState, {
      dice: [3, 3],
      flameSpellCount: 1,
    });

    expect(
      resolved.players[resolved.activePlayerIndex].inventory.spells,
    ).toHaveLength(1);

    const movementState = createKnownMovementState('hero_mage', {
      targetHasMonster: false,
      targetConnects: false,
    });

    expect(getLegalKnownMoveDirections(movementState)).toContain('A');
    const explorationState = {
      ...movementState,
      players: movementState.players.map((player, index) =>
        index === movementState.activePlayerIndex
          ? { ...player, position: { boardX: 0, boardY: -1 } }
          : player,
      ),
    };

    expect(getLegalExplorationDirections(explorationState)).not.toContain('C');
  });

  it('disables mage benefits while cursed', () => {
    const combatState = withActivePlayer(
      createCombatState('hero_mage', 'giant_rat'),
      (player) => ({
        ...player,
        isCursed: true,
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      }),
    );
    const resolved = resolveCombat(combatState, {
      dice: [3, 3],
      flameSpellCount: 1,
    });

    expect(
      resolved.players[resolved.activePlayerIndex].inventory.spells,
    ).toHaveLength(0);

    const movementState = withActivePlayer(
      createKnownMovementState('hero_mage', {
        targetHasMonster: false,
        targetConnects: false,
      }),
      (player) => ({ ...player, isCursed: true }),
    );

    expect(getLegalKnownMoveDirections(movementState)).not.toContain('A');
  });
});

describe('hero_warrior abilities', () => {
  it('rerolls a failed combat without taking loss from the first roll', () => {
    const state = createCombatState('hero_warrior', 'giant_rat');
    const resolved = resolveCombat(state, {
      dice: [1, 1],
      useWarriorReroll: true,
      warriorRerollDice: [6, 6],
    });
    const activePlayer = resolved.players[resolved.activePlayerIndex];

    expect(activePlayer.hp).toBe(5);
    expect(resolved.phase).toBe('turn_end');
    expect(
      resolved.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeUndefined();
  });

  it('moves to a healing tile instead of becoming unconscious on last HP loss', () => {
    const state = withActivePlayer(
      createCombatState('hero_warrior', 'giant_rat'),
      (player) => ({
        ...player,
        hp: 1,
      }),
    );
    const resolved = resolveCombat(state, { dice: [1, 1] });
    const activePlayer = resolved.players[resolved.activePlayerIndex];

    expect(activePlayer).toEqual(
      expect.objectContaining({
        hp: 5,
        skipNextTurn: false,
        position: { boardX: 0, boardY: 0 },
      }),
    );
  });

  it('uses standard unconscious handling while cursed', () => {
    const state = withActivePlayer(
      createCombatState('hero_warrior', 'giant_rat'),
      (player) => ({
        ...player,
        hp: 1,
        isCursed: true,
      }),
    );
    const resolved = resolveCombat(state, { dice: [1, 1] });
    const activePlayer = resolved.players[resolved.activePlayerIndex];

    expect(activePlayer).toEqual(
      expect.objectContaining({
        hp: 0,
        skipNextTurn: true,
        position: { boardX: 1, boardY: 0 },
      }),
    );
  });
});

describe('hero_warlock abilities', () => {
  it('sacrifices 1 HP for +1 exactly once in combat', () => {
    const state = createCombatState('hero_warlock', 'giant_rat');
    const resolved = resolveCombat(state, {
      dice: [2, 3],
      useWarlockSacrifice: true,
    });
    const activePlayer = resolved.players[resolved.activePlayerIndex];

    expect(activePlayer.hp).toBe(4);
    expect(
      resolved.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeUndefined();
  });

  it('swaps positions only at turn start and spends all four steps', () => {
    const state = createSwapState(false);
    const target = state.players.find(
      (player) => player.id !== 'player_human',
    )!;
    const resolved = swapWarlockPosition(state, target.id);

    expect(resolved.players[resolved.activePlayerIndex].position).toEqual(
      target.position,
    );
    expect(resolved.remainingSteps).toBe(0);
    expect(resolved.phase).toBe('turn_end');
    expect(() =>
      swapWarlockPosition({ ...state, phase: 'await_move' }, target.id),
    ).toThrow(/turn start/);
  });

  it('disables swap and sacrifice while cursed', () => {
    const cursedSwapState = createSwapState(true);
    const target = cursedSwapState.players.find(
      (player) => player.id !== 'player_human',
    )!;

    expect(() => swapWarlockPosition(cursedSwapState, target.id)).toThrow(
      /warlock/,
    );

    const cursedCombatState = withActivePlayer(
      createCombatState('hero_warlock', 'giant_rat'),
      (player) => ({
        ...player,
        isCursed: true,
      }),
    );
    const resolved = resolveCombat(cursedCombatState, {
      dice: [2, 3],
      useWarlockSacrifice: true,
    });

    expect(resolved.players[resolved.activePlayerIndex].hp).toBe(5);
    expect(
      resolved.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeDefined();
  });
});

describe('hero_thief abilities', () => {
  it('wins combat draws and can ignore monsters while uncursed', () => {
    const drawState = createCombatState('hero_thief', 'giant_rat');
    const resolvedDraw = resolveCombat(drawState, { dice: [2, 3] });

    expect(
      resolvedDraw.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeUndefined();

    const moveState = createKnownMovementState('hero_thief', {
      targetHasMonster: true,
      targetConnects: true,
    });
    const moved = moveActivePlayer(moveState, 'A');

    expect(moved.phase).toBe('await_move');
    expect(moved.combat).toBeUndefined();
  });

  it('loses monster-ignore and draw-win abilities while cursed', () => {
    const cursedDrawState = withActivePlayer(
      createCombatState('hero_thief', 'giant_rat'),
      (player) => ({
        ...player,
        isCursed: true,
      }),
    );
    const resolvedDraw = resolveCombat(cursedDrawState, { dice: [2, 3] });

    expect(resolvedDraw.phase).toBe('turn_end');
    expect(
      resolvedDraw.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeDefined();

    const cursedMoveState = withActivePlayer(
      createKnownMovementState('hero_thief', {
        targetHasMonster: true,
        targetConnects: true,
      }),
      (player) => ({ ...player, isCursed: true }),
    );
    const moved = moveActivePlayer(cursedMoveState, 'A');

    expect(moved.phase).toBe('combat');
  });
});

describe('hero_swordsman abilities', () => {
  it('rerolls ones and continues after a won combat with a six', () => {
    const state = createCombatState('hero_swordsman', 'giant_rat');
    const resolved = resolveCombat(state, {
      dice: [1, 1],
      swordsmanOneRerolls: [6, 2],
    });

    expect(resolved.phase).toBe('await_move');
    expect(
      resolved.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeUndefined();
  });

  it('may keep the same monster available after draw or defeat', () => {
    const state = createCombatState('hero_swordsman', 'giant_rat');
    const resolved = resolveCombat(state, { dice: [2, 3] });

    expect(resolved.phase).toBe('optional_post_combat');
    expect(resolved.combat?.monsterId).toBe('giant_rat');
  });

  it('uses standard dice and post-combat flow while cursed', () => {
    const state = withActivePlayer(
      createCombatState('hero_swordsman', 'giant_rat'),
      (player) => ({
        ...player,
        isCursed: true,
      }),
    );
    const resolved = resolveCombat(state, {
      dice: [1, 1],
      swordsmanOneRerolls: [6, 6],
    });

    expect(resolved.phase).toBe('turn_end');
    expect(resolved.combat).toBeUndefined();
  });
});

describe('hero_oracle abilities', () => {
  it('gets +1 only when combat happens after the first step', () => {
    const state = {
      ...createCombatState('hero_oracle', 'giant_rat'),
      remainingSteps: 3,
    };
    const resolved = resolveCombat(state, { dice: [2, 3] });

    expect(
      resolved.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeUndefined();

    const noBonusState = {
      ...createCombatState('hero_oracle', 'giant_rat'),
      remainingSteps: 2,
    };
    const noBonusResolved = resolveCombat(noBonusState, { dice: [2, 3] });

    expect(noBonusResolved.phase).toBe('turn_end');
    expect(
      noBonusResolved.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeDefined();
  });

  it('draws two room tokens, resolves one and returns the other to the finite bag', () => {
    const state = createRoomState('hero_oracle', [
      { id: 'dragon', kind: 'monster' },
      { id: 'treasure_chest', kind: 'chest' },
    ]);
    const resolved = resolveRoomToken(state, { oracleChoiceIndex: 1 });
    const room = resolved.board.find(
      (tile) => tile.boardX === 0 && tile.boardY === -1,
    );

    expect(room?.roomToken).toEqual({ id: 'treasure_chest', kind: 'chest' });
    expect(resolved.tokenBag).toEqual([{ id: 'dragon', kind: 'monster' }]);
  });

  it('uses the normal single-token draw while cursed', () => {
    const state = withActivePlayer(
      createRoomState('hero_oracle', [
        { id: 'dragon', kind: 'monster' },
        { id: 'treasure_chest', kind: 'chest' },
      ]),
      (player) => ({
        ...player,
        isCursed: true,
      }),
    );
    const resolved = resolveRoomToken(state, { oracleChoiceIndex: 1 });
    const room = resolved.board.find(
      (tile) => tile.boardX === 0 && tile.boardY === -1,
    );

    expect(room?.roomToken).toEqual({ id: 'dragon', kind: 'monster' });
    expect(resolved.tokenBag).toEqual([
      { id: 'treasure_chest', kind: 'chest' },
    ]);
  });
});

function createCombatState(heroId: HeroId, monsterId: MonsterId): GameState {
  const base = createNewGame({
    humanHeroId: heroId,
    aiCount: 1,
    seed: `${heroId}-${monsterId}`,
  });
  const originTile: PlacedTile = {
    tileInstanceId: 'tile-origin',
    blueprintId: 'tunnel_cross',
    rotation: 0,
    boardX: 1,
    boardY: 0,
    discovered: true,
    looseItems: [],
  };
  const combatTile: PlacedTile = {
    tileInstanceId: 'tile-combat',
    blueprintId: 'room_straight',
    rotation: 0,
    boardX: 1,
    boardY: -1,
    discovered: true,
    looseItems: [],
    roomToken: { id: monsterId, kind: 'monster' },
  };
  const activePlayer = {
    ...base.players[0],
    position: { boardX: 1, boardY: -1 },
  };

  return {
    ...base,
    activePlayerIndex: 0,
    phase: 'combat',
    board: [...base.board, originTile, combatTile],
    players: [activePlayer, ...base.players.slice(1)],
    remainingSteps: 3,
    lastMoveFrom: { boardX: 1, boardY: 0 },
    combat: {
      playerId: activePlayer.id,
      monsterId,
      position: { boardX: 1, boardY: -1 },
      enteredFrom: { boardX: 1, boardY: 0 },
    },
  };
}

function createKnownMovementState(
  heroId: HeroId,
  options: { targetHasMonster: boolean; targetConnects: boolean },
): GameState {
  const base = createNewGame({
    humanHeroId: heroId,
    aiCount: 1,
    seed: `${heroId}-movement`,
  });
  const targetTile: PlacedTile = {
    tileInstanceId: 'tile-known-target',
    blueprintId: 'tunnel_corner',
    rotation: options.targetConnects ? 90 : 0,
    boardX: 0,
    boardY: -1,
    discovered: true,
    looseItems: [],
    roomToken: options.targetHasMonster
      ? { id: 'giant_rat', kind: 'monster' }
      : undefined,
  };

  return {
    ...base,
    activePlayerIndex: 0,
    phase: 'await_move',
    board: [...base.board, targetTile],
    remainingSteps: 4,
  };
}

function createSwapState(cursed: boolean): GameState {
  const base = createNewGame({
    humanHeroId: 'hero_warlock',
    aiCount: 1,
    seed: 'warlock-swap',
  });
  const targetTile: PlacedTile = {
    tileInstanceId: 'tile-target',
    blueprintId: 'tunnel_cross',
    rotation: 0,
    boardX: 2,
    boardY: 0,
    discovered: true,
    looseItems: [],
  };

  return {
    ...base,
    activePlayerIndex: 0,
    phase: 'turn_start',
    board: [...base.board, targetTile],
    players: [
      {
        ...base.players[0],
        isCursed: cursed,
        position: { boardX: 0, boardY: 0 },
      },
      { ...base.players[1], position: { boardX: 2, boardY: 0 } },
    ],
    remainingSteps: 4,
  };
}

function createRoomState(heroId: HeroId, tokenBag: Token[]): GameState {
  const base = createNewGame({
    humanHeroId: heroId,
    aiCount: 1,
    seed: `${heroId}-room`,
  });
  const roomTile: PlacedTile = {
    tileInstanceId: 'tile-room',
    blueprintId: 'room_cross',
    rotation: 0,
    boardX: 0,
    boardY: -1,
    discovered: true,
    looseItems: [],
  };

  return {
    ...base,
    activePlayerIndex: 0,
    phase: 'resolve_room_token',
    board: [...base.board, roomTile],
    players: base.players.map((player, index) =>
      index === 0 ? { ...player, position: { boardX: 0, boardY: -1 } } : player,
    ),
    tokenBag,
    remainingSteps: 3,
    lastMoveFrom: { boardX: 0, boardY: 0 },
  };
}

function withActivePlayer(
  state: GameState,
  update: (player: Player) => Player,
): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.activePlayerIndex ? update(player) : player,
    ),
  };
}
