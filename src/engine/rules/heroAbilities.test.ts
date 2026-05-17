import { describe, expect, it } from 'vitest';

import type {
  GameState,
  HeroId,
  MonsterId,
  PlacedTile,
  Player,
  Token,
} from '../core/types';
import {
  startOptionalCombat,
  declineWarlockSacrifice,
  declineWarriorReroll,
  resolveCombat,
  resolveCombatWithFlameSpells,
  useSwordswomanReroll,
  useWarlockSacrifice,
  useWarriorReroll,
} from '../combat/combat';
import {
  getLegalExplorationDirections,
  getLegalKnownMoveDirections,
} from '../movement/movement';
import { moveActivePlayer } from '../movement/performMove';
import { createNewGame } from '../setup/createGame';
import { endTurn } from '../turns/turns';
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
      dice: [2, 3],
    });

    expect(resolved.phase).toBe('loot_resolution');
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
    const pending = resolveCombat(combatState, {
      dice: [2, 2],
    });

    expect(pending.phase).toBe('combat_flame_spells');

    const resolved = resolveCombatWithFlameSpells(pending, 1);

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
  it('offers a reroll after a failed combat without taking loss from the first roll', () => {
    const state = createCombatState('hero_warrior', 'giant_rat');
    const pending = resolveCombat(state, {
      dice: [1, 1],
    });
    const resolved = useWarriorReroll(pending, {
      dice: [6, 6],
    });
    const activePlayer = resolved.players[resolved.activePlayerIndex];

    expect(activePlayer.hp).toBe(5);
    expect(resolved.phase).toBe('loot_resolution');
    expect(resolved.pendingLoot?.item).toEqual({ type: 'weapon', bonus: 1 });
    expect(
      resolved.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeUndefined();
  });

  it('offers the reroll after a draw and lets the warrior keep the original result', () => {
    const state = withActivePlayer(
      createCombatState('hero_warrior', 'giant_rat'),
      (player) => ({
        ...player,
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      }),
    );
    const pending = resolveCombat(state, { dice: [2, 3] });

    expect(pending.phase).toBe('combat_warrior_reroll');
    expect(pending.combat).toEqual(
      expect.objectContaining({
        initialRolledDice: [2, 3],
        initialBaseOutcome: 'draw',
      }),
    );

    const declined = declineWarriorReroll(pending);

    expect(declined.phase).toBe('combat_flame_spells');
    expect(declined.combat).toEqual(
      expect.objectContaining({
        rolledDice: [2, 3],
        pendingBaseOutcome: 'draw',
      }),
    );
  });

  it('moves to a healing tile instead of becoming unconscious on last HP loss', () => {
    const state = withActivePlayer(
      createCombatState('hero_warrior', 'giant_rat'),
      (player) => ({
        ...player,
        hp: 1,
      }),
    );
    const pending = resolveCombat(state, { dice: [1, 1] });
    const resolved = declineWarriorReroll(pending);
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
  it('offers sacrificing 1 HP for +1 after a non-winning roll', () => {
    const state = createCombatState('hero_warlock', 'giant_rat');
    const pending = resolveCombat(state, {
      dice: [2, 3],
    });
    const resolved = useWarlockSacrifice(pending);
    const activePlayer = resolved.players[resolved.activePlayerIndex];

    expect(activePlayer.hp).toBe(4);
    expect(
      resolved.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeUndefined();
  });

  it('lets the warlock keep the original draw before flame spells', () => {
    const state = withActivePlayer(
      createCombatState('hero_warlock', 'giant_rat'),
      (player) => ({
        ...player,
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      }),
    );
    const pending = resolveCombat(state, { dice: [2, 3] });

    expect(pending.phase).toBe('combat_warlock_sacrifice');

    const declined = declineWarlockSacrifice(pending);

    expect(declined.phase).toBe('combat_flame_spells');
    expect(declined.combat).toEqual(
      expect.objectContaining({
        rolledDice: [2, 3],
        pendingBaseOutcome: 'draw',
        pendingWarlockSacrificeBonus: 0,
      }),
    );
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
    });

    expect(resolved.players[resolved.activePlayerIndex].hp).toBe(5);
    expect(
      resolved.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeDefined();
  });
});

describe('hero_thief abilities', () => {
  it('wins combat draws and gets optional combat on monster tiles while uncursed', () => {
    const drawState = createCombatState('hero_thief', 'giant_rat');
    const resolvedDraw = resolveCombat(drawState, { dice: [2, 3] });

    expect(
      resolvedDraw.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeUndefined();

    const moveState = createKnownMovementState('hero_thief', {
      targetHasMonster: true,
      targetConnects: true,
    });
    const moved = moveActivePlayer(moveState, { boardX: 0, boardY: -1 });

    expect(moved.phase).toBe('optional_monster_combat');
    expect(moved.combat).toEqual(
      expect.objectContaining({ monsterId: 'giant_rat' }),
    );
  });

  it('may start or skip combat after discovering a monster', () => {
    const roomState = createRoomState('hero_thief', [
      { id: 'giant_rat', kind: 'monster' },
    ]);
    const resolvedRoom = resolveRoomToken(roomState);

    expect(resolvedRoom.phase).toBe('optional_monster_combat');
    expect(startOptionalCombat(resolvedRoom).phase).toBe('combat');
    expect(endTurn(resolvedRoom).phase).toBe('turn_start');
  });

  it('keeps optional combat available when starting the turn on a monster tile', () => {
    const moved = moveActivePlayer(
      createKnownMovementState('hero_thief', {
        targetHasMonster: true,
        targetConnects: true,
      }),
      { boardX: 0, boardY: -1 },
    );
    const nextTurn = endTurn({
      ...moved,
      players: moved.players.map((player, index) =>
        index === 1
          ? { ...player, skipNextTurn: true, hp: 0 }
          : player,
      ),
    });
    const thiefTurn = endTurn(nextTurn);

    expect(thiefTurn.phase).toBe('optional_monster_combat');
    expect(thiefTurn.combat).toEqual(
      expect.objectContaining({ monsterId: 'giant_rat' }),
    );
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
    const moved = moveActivePlayer(cursedMoveState, {
      boardX: 0,
      boardY: -1,
    });

    expect(moved.phase).toBe('combat');
  });

  it('must still fight at turn start while cursed on a monster tile', () => {
    const moved = moveActivePlayer(
      withActivePlayer(
        createKnownMovementState('hero_thief', {
          targetHasMonster: true,
          targetConnects: true,
        }),
        (player) => ({ ...player, isCursed: true }),
      ),
      { boardX: 0, boardY: -1 },
    );
    const nextTurn = endTurn({
      ...moved,
      players: moved.players.map((player, index) =>
        index === 1
          ? { ...player, skipNextTurn: true, hp: 0 }
          : player,
      ),
    });
    const thiefTurn = endTurn(nextTurn);

    expect(thiefTurn.phase).toBe('combat');
    expect(thiefTurn.combat).toEqual(
      expect.objectContaining({ monsterId: 'giant_rat' }),
    );
  });
});

describe('hero_swordsman abilities', () => {
  it('rerolls ones and continues after a won combat with a six', () => {
    const state = createCombatState('hero_swordsman', 'giant_rat');
    const pending = resolveCombat(state, {
      dice: [1, 1],
    });
    const resolved = useSwordswomanReroll(pending, {
      dice: [6, 2],
    });

    expect(pending.phase).toBe('combat_swordsman_reroll');
    expect(resolved.phase).toBe('loot_resolution');
    expect(resolved.pendingLoot?.item).toEqual({ type: 'weapon', bonus: 1 });
    expect(
      resolved.board.find((tile) => tile.roomToken?.id === 'giant_rat'),
    ).toBeUndefined();
    expect(resolved.turnContinuationReason).toBe('swordsman_on_six');
  });

  it('can keep the turn open at zero steps when a six leaves follow-up actions available', () => {
    const state = withActivePlayer(
      {
        ...createCombatState('hero_swordsman', 'fallen'),
        remainingSteps: 0,
      },
      (player) => ({
        ...player,
        inventory: {
          ...player.inventory,
          weapons: [
            { type: 'weapon', bonus: 3 },
            { type: 'weapon', bonus: 3 },
          ],
          spells: [{ type: 'spell', spellKind: 'healing' }],
        },
      }),
    );
    const resolved = resolveCombat(state, { dice: [6, 6] });

    expect(resolved.phase).toBe('await_move');
    expect(resolved.remainingSteps).toBe(0);
  });

  it('retreats like other heroes after draw or defeat', () => {
    const state = createCombatState('hero_swordsman', 'giant_rat');
    const resolved = resolveCombat(state, { dice: [2, 3] });

    expect(resolved.phase).toBe('turn_end');
    expect(resolved.combat).toBeUndefined();
    expect(resolved.players[resolved.activePlayerIndex]).toEqual(
      expect.objectContaining({
        hp: 5,
        position: { boardX: 1, boardY: 0 },
      }),
    );
    expect(resolved.eventLog.at(-1)?.combat).toEqual(
      expect.objectContaining({
        outcome: 'draw',
        retreatPosition: { boardX: 1, boardY: 0 },
      }),
    );
  });

  it('keeps moving after a draw with a six once she has retreated', () => {
    const state = createCombatState('hero_swordsman', 'skeleton_turnkey');
    const pending = resolveCombat(state, { dice: [6, 1] });
    const resolved = useSwordswomanReroll(pending, { dice: [2, 2] });

    expect(pending.phase).toBe('combat_swordsman_reroll');
    expect(resolved.phase).toBe('await_move');
    expect(resolved.players[resolved.activePlayerIndex]).toEqual(
      expect.objectContaining({
        hp: 5,
        position: { boardX: 1, boardY: 0 },
      }),
    );
    expect(resolved.turnContinuationReason).toBe('swordsman_on_six');
  });

  it('keeps moving after a defeat with a six while she still has HP left', () => {
    const state = createCombatState('hero_swordsman', 'dragon');
    const pending = resolveCombat(state, { dice: [6, 1] });
    const resolved = useSwordswomanReroll(pending, { dice: [2, 2] });

    expect(resolved.phase).toBe('await_move');
    expect(resolved.players[resolved.activePlayerIndex]).toEqual(
      expect.objectContaining({
        hp: 4,
        skipNextTurn: false,
        position: { boardX: 1, boardY: 0 },
      }),
    );
    expect(resolved.turnContinuationReason).toBe('swordsman_on_six');
  });

  it('ends the turn after a defeat with a six if she falls to 0 HP', () => {
    const state = withActivePlayer(
      createCombatState('hero_swordsman', 'dragon'),
      (player) => ({
        ...player,
        hp: 1,
      }),
    );
    const pending = resolveCombat(state, { dice: [6, 1] });
    const resolved = useSwordswomanReroll(pending, { dice: [2, 2] });

    expect(resolved.phase).toBe('turn_end');
    expect(resolved.players[resolved.activePlayerIndex]).toEqual(
      expect.objectContaining({
        hp: 0,
        skipNextTurn: true,
        position: { boardX: 1, boardY: 0 },
      }),
    );
    expect(resolved.turnContinuationReason).toBeUndefined();
  });

  it('must re-enter the monster tile to fight again after a draw', () => {
    const state = createCombatState('hero_swordsman', 'skeleton_turnkey');
    const retriedState = useSwordswomanReroll(
      resolveCombat(state, { dice: [6, 1] }),
      { dice: [2, 2] },
    );
    const movedBack = moveActivePlayer(retriedState, { boardX: 1, boardY: -1 });

    expect(retriedState.phase).toBe('await_move');
    expect(movedBack.phase).toBe('combat');
    expect(movedBack.combat).toEqual(
      expect.objectContaining({
        monsterId: 'skeleton_turnkey',
        enteredFrom: { boardX: 1, boardY: 0 },
      }),
    );
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
