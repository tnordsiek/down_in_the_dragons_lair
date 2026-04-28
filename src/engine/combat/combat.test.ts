import { describe, expect, it } from 'vitest';

import type { GameState, MonsterId, PlacedTile } from '../core/types';
import { createNewGame } from '../setup/createGame';
import { endTurn } from '../turns/turns';
import {
  calculateCombatTotal,
  getCombatOutcome,
  resolveCombat,
} from './combat';

describe('combat resolution', () => {
  it('wins only when total combat strength is strictly greater', () => {
    const player = createCombatState('giant_rat').players[0];

    expect(calculateCombatTotal(player, [2, 3])).toBe(5);
    expect(getCombatOutcome(5, 5)).toBe('draw');
    expect(getCombatOutcome(6, 5)).toBe('victory');
  });

  it('resolves a draw as retreat without HP loss', () => {
    const state = createCombatState('giant_rat');
    const resolved = resolveCombat(state, { dice: [2, 3] });
    const activePlayer = resolved.players[resolved.activePlayerIndex];

    expect(activePlayer.hp).toBe(5);
    expect(activePlayer.position).toEqual({ boardX: 1, boardY: 0 });
    expect(resolved.phase).toBe('turn_end');
  });

  it('resolves a defeat as retreat with one HP loss', () => {
    const state = createCombatState('giant_rat');
    const resolved = resolveCombat(state, { dice: [1, 1] });
    const activePlayer = resolved.players[resolved.activePlayerIndex];

    expect(activePlayer.hp).toBe(4);
    expect(activePlayer.position).toEqual({ boardX: 1, boardY: 0 });
    expect(resolved.phase).toBe('turn_end');
  });

  it('marks the player unconscious when losing the last HP', () => {
    const state = withActivePlayer(
      createCombatState('giant_rat'),
      (player) => ({
        ...player,
        hp: 1,
      }),
    );
    const resolved = resolveCombat(state, { dice: [1, 1] });
    const activePlayer = resolved.players[resolved.activePlayerIndex];

    expect(activePlayer.hp).toBe(0);
    expect(activePlayer.skipNextTurn).toBe(true);
  });

  it('leaves overflow equipment on the combat tile', () => {
    const state = withActivePlayer(
      createCombatState('giant_rat'),
      (player) => ({
        ...player,
        inventory: {
          ...player.inventory,
          weapons: [
            { type: 'weapon', bonus: 2 },
            { type: 'weapon', bonus: 3 },
          ],
        },
      }),
    );
    const resolved = resolveCombat(state, { dice: [6, 6] });
    const combatTile = resolved.board.find(
      (tile) => tile.boardX === 1 && tile.boardY === -1,
    );

    expect(combatTile?.looseItems).toEqual([{ type: 'weapon', bonus: 1 }]);
  });

  it('moves the single curse to the selected target after defeating a mummy', () => {
    const state = createCombatState('mummy');
    const activePlayer = state.players[state.activePlayerIndex];
    const target = state.players.find(
      (player) => player.id !== activePlayer.id,
    )!;
    const resolved = resolveCombat(state, {
      dice: [6, 6],
      curseTargetPlayerId: target.id,
    });

    expect(
      resolved.players
        .filter((player) => player.isCursed)
        .map((player) => player.id),
    ).toEqual([target.id]);
  });

  it('heals and removes curse when ending a turn on a healing tile', () => {
    const state = withActivePlayer(
      createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'heal-seed',
      }),
      (player) => ({
        ...player,
        hp: 2,
        isCursed: true,
      }),
    );
    const activePlayerId = state.players[state.activePlayerIndex].id;
    const ended = endTurn(state);
    const healedPlayer = ended.players.find(
      (player) => player.id === activePlayerId,
    );

    expect(healedPlayer).toEqual(
      expect.objectContaining({
        hp: 5,
        isCursed: false,
      }),
    );
  });

  it('ends the game immediately after dragon defeat and scores all players', () => {
    const dragonState = createCombatState('dragon');
    const otherPlayerIndex = dragonState.activePlayerIndex === 0 ? 1 : 0;
    const state = withActivePlayer(
      withPlayerTreasure(dragonState, otherPlayerIndex, 2),
      (player) => ({
        ...player,
        inventory: {
          ...player.inventory,
          weapons: [
            { type: 'weapon', bonus: 3 },
            { type: 'weapon', bonus: 3 },
          ],
        },
      }),
    );
    const activePlayerId = state.players[state.activePlayerIndex].id;
    const resolved = resolveCombat(state, { dice: [6, 6] });

    expect(resolved.phase).toBe('game_over');
    expect(
      resolved.players.find((player) => player.id === activePlayerId)
        ?.treasurePoints,
    ).toBe(1.5);
    expect(resolved.victory?.defeatedDragonByPlayerId).toBe(activePlayerId);
    expect(resolved.victory?.winnerPlayerIds).toEqual([
      state.players[otherPlayerIndex].id,
    ]);
  });
});

function createCombatState(monsterId: MonsterId): GameState {
  const base = createNewGame({
    humanHeroId: 'hero_mage',
    aiCount: 1,
    seed: `combat-${monsterId}`,
  });
  const activePlayer = base.players[base.activePlayerIndex];
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

  return {
    ...base,
    phase: 'combat',
    board: [...base.board, originTile, combatTile],
    players: base.players.map((player, index) =>
      index === base.activePlayerIndex
        ? { ...player, position: { boardX: 1, boardY: -1 } }
        : player,
    ),
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

function withActivePlayer(
  state: GameState,
  update: (
    player: GameState['players'][number],
  ) => GameState['players'][number],
): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.activePlayerIndex ? update(player) : player,
    ),
  };
}

function withPlayerTreasure(
  state: GameState,
  playerIndex: number,
  treasurePoints: number,
): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === playerIndex ? { ...player, treasurePoints } : player,
    ),
  };
}
