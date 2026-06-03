import { describe, expect, it } from 'vitest';

import { playerHeroLabelById } from '../../data/playerLabels';
import { applyGameAction } from '../core/actions';
import type { GameState, MonsterId, PlacedTile } from '../core/types';
import { createNewGame } from '../setup/createGame';
import { endTurn } from '../turns/turns';
import {
  calculateCombatTotal,
  declineWitchSacrifice,
  declineValkyrieReroll,
  getCombatOutcome,
  resolveCombat,
  useWitchSacrifice,
  useBladeReroll,
  useValkyrieReroll,
} from './combat';

describe('combat resolution', () => {
  it('wins only when total combat strength is strictly greater', () => {
    const player = createCombatState('kitchen_rat').players[0];

    expect(calculateCombatTotal(player, [2, 3])).toBe(5);
    expect(getCombatOutcome(5, 5)).toBe('draw');
    expect(getCombatOutcome(6, 5)).toBe('victory');
  });

  it('resolves a draw as retreat without HP loss', () => {
    const state = createCombatState('kitchen_rat');
    const resolved = resolveCombat(state, { dice: [2, 3] });
    const activePlayer = resolved.players[resolved.activePlayerIndex];

    expect(activePlayer.hp).toBe(5);
    expect(activePlayer.position).toEqual({ boardX: 1, boardY: 0 });
    expect(resolved.phase).toBe('turn_end');
    expect(resolved.eventLog.at(-1)).toEqual(
      expect.objectContaining({
        type: 'combat_resolved',
        playerId: activePlayer.id,
        combat: expect.objectContaining({
          monsterId: 'kitchen_rat',
          monsterStrength: 5,
          dice: [2, 3],
          total: 5,
          outcome: 'draw',
          retreatPosition: { boardX: 1, boardY: 0 },
        }),
      }),
    );
  });

  it('does not allow ending the turn while combat is still unresolved', () => {
    const baseState = createCombatState('kitchen_rat');
    const warriorPending = resolveCombat(
      withActivePlayer(baseState, (player) => ({
        ...player,
        heroId: 'hero_valkyrie',
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      })),
      { dice: [2, 3] },
    );
    const warlockPending = resolveCombat(
      withActivePlayer(baseState, (player) => ({
        ...player,
        heroId: 'hero_witch',
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      })),
      { dice: [2, 3] },
    );
    const flamePending = declineValkyrieReroll(warriorPending);
    const swordswomanPending = resolveCombat(
      withActivePlayer(baseState, (player) => ({
        ...player,
        heroId: 'hero_blade',
      })),
      { dice: [1, 4] },
    );
    const optionalPostCombatState = {
      ...baseState,
      phase: 'optional_post_combat' as const,
    };

    expect(() => endTurn(baseState)).toThrow(/pending combat/i);
    expect(() => endTurn(swordswomanPending)).toThrow(/pending combat/i);
    expect(() => endTurn(warriorPending)).toThrow(/pending combat/i);
    expect(() => endTurn(warlockPending)).toThrow(/pending combat/i);
    expect(() => endTurn(flamePending)).toThrow(/pending combat/i);
    expect(() => endTurn(optionalPostCombatState)).toThrow(/pending combat/i);
    expect(() =>
      endTurn({
        ...baseState,
        phase: 'combat_curse_target',
      }),
    ).toThrow(/pending combat/i);
  });

  it('pauses for valkyrie reroll before flame spell selection after a valkyrie draw', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_valkyrie',
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      }),
    );
    const pending = resolveCombat(state, { dice: [2, 3] });

    expect(pending.phase).toBe('combat_valkyrie_reroll');
    expect(pending.combat).toEqual(
      expect.objectContaining({
        initialRolledDice: [2, 3],
        initialBaseOutcome: 'draw',
      }),
    );

    const afterDecline = declineValkyrieReroll(pending);

    expect(afterDecline.phase).toBe('combat_flame_spells');
    expect(afterDecline.combat).toEqual(
      expect.objectContaining({
        rolledDice: [2, 3],
        pendingBaseOutcome: 'draw',
      }),
    );

    const resolved = applyGameAction(afterDecline, {
      type: 'resolveCombatWithFlameSpells',
      flameSpellCount: 1,
    });

    expect(resolved.phase).toBe('loot_resolution');
    expect(
      resolved.players[resolved.activePlayerIndex].inventory.spells,
    ).toHaveLength(0);
    expect(resolved.eventLog.at(-1)?.combat).toEqual(
      expect.objectContaining({
        outcome: 'victory',
        flameSpellCount: 1,
      }),
    );
  });

  it('allows declining flame spell use without consuming spells', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_valkyrie',
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      }),
    );
    const pending = resolveCombat(state, { dice: [2, 3] });
    const withKeptRoll = declineValkyrieReroll(pending);
    const resolved = applyGameAction(withKeptRoll, {
      type: 'resolveCombatWithoutFlameSpells',
    });

    expect(resolved.phase).toBe('turn_end');
    expect(
      resolved.players[resolved.activePlayerIndex].inventory.spells,
    ).toHaveLength(1);
    expect(resolved.eventLog.at(-1)?.combat).toEqual(
      expect.objectContaining({
        outcome: 'draw',
        flameSpellCount: 0,
      }),
    );
  });

  it('does not pause when available flame spells still cannot avoid defeat', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_valkyrie',
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      }),
    );
    const pending = resolveCombat(state, { dice: [1, 1] });
    const resolved = useValkyrieReroll(pending, { dice: [1, 1] });

    expect(resolved.phase).toBe('turn_end');
    expect(
      resolved.players[resolved.activePlayerIndex].inventory.spells,
    ).toHaveLength(1);
  });

  it('skips the valkyrie reroll step after a valkyrie victory', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_valkyrie',
      }),
    );

    const resolved = resolveCombat(state, { dice: [6, 6] });

    expect(resolved.phase).toBe('loot_resolution');
  });

  it('offers a valkyrie reroll after a defeat', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_valkyrie',
      }),
    );

    const pending = resolveCombat(state, { dice: [1, 1] });

    expect(pending.phase).toBe('combat_valkyrie_reroll');
    expect(pending.combat).toEqual(
      expect.objectContaining({
        initialRolledDice: [1, 1],
        initialBaseOutcome: 'defeat',
      }),
    );
  });

  it('pauses for witch sacrifice before flame spell selection after a witch draw', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_witch',
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      }),
    );
    const pending = resolveCombat(state, { dice: [2, 3] });

    expect(pending.phase).toBe('combat_witch_sacrifice');
    expect(pending.combat).toEqual(
      expect.objectContaining({
        initialRolledDice: [2, 3],
        initialBaseOutcome: 'draw',
      }),
    );

    const afterDecline = declineWitchSacrifice(pending);

    expect(afterDecline.phase).toBe('combat_flame_spells');
    expect(afterDecline.combat).toEqual(
      expect.objectContaining({
        rolledDice: [2, 3],
        pendingBaseOutcome: 'draw',
        pendingWitchSacrificeBonus: 0,
      }),
    );
  });

  it('applies witch sacrifice before flame spell decisions', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_witch',
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      }),
    );
    const pending = resolveCombat(state, { dice: [2, 2] });
    const sacrificed = useWitchSacrifice(pending);

    expect(sacrificed.players[sacrificed.activePlayerIndex].hp).toBe(4);
    expect(sacrificed.phase).toBe('combat_flame_spells');
    expect(sacrificed.combat).toEqual(
      expect.objectContaining({
        rolledDice: [2, 2],
        pendingBaseOutcome: 'draw',
        pendingWitchSacrificeBonus: 1,
      }),
    );
  });

  it('skips the witch sacrifice step when sacrifice plus all flame spells still cannot win', () => {
    const state = withActivePlayer(
      createCombatState('mummified_priest'),
      (player) => ({
        ...player,
        heroId: 'hero_witch',
        inventory: {
          ...player.inventory,
          spells: [
            { type: 'spell', spellKind: 'flame' },
            { type: 'spell', spellKind: 'flame' },
          ],
        },
      }),
    );
    const resolved = resolveCombat(state, { dice: [2, 2] });

    expect(resolved.phase).toBe('turn_end');
    expect(resolved.combat).toBeUndefined();
  });

  it('keeps the witch sacrifice bonus when sacrificing down to 0 HP', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_witch',
        hp: 1,
      }),
    );
    const pending = resolveCombat(state, { dice: [2, 3] });
    const resolved = useWitchSacrifice(pending);

    expect(resolved.players[resolved.activePlayerIndex]).toEqual(
      expect.objectContaining({
        hp: 0,
        skipNextTurn: true,
      }),
    );
    expect(resolved.eventLog.at(-1)?.combat).toEqual(
      expect.objectContaining({
        outcome: 'victory',
        warlockSacrificeBonus: 1,
      }),
    );
  });

  it('skips the witch sacrifice step after a witch victory', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_witch',
      }),
    );

    const resolved = resolveCombat(state, { dice: [6, 6] });

    expect(resolved.phase).toBe('loot_resolution');
  });

  it('still offers the witch sacrifice step when sacrifice plus flame spells can eventually win', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_witch',
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'flame' }],
        },
      }),
    );

    const pending = resolveCombat(state, { dice: [1, 3] });

    expect(pending.phase).toBe('combat_witch_sacrifice');
  });

  it('resolves a defeat as retreat with one HP loss', () => {
    const state = createCombatState('kitchen_rat');
    const resolved = resolveCombat(state, { dice: [1, 1] });
    const activePlayer = resolved.players[resolved.activePlayerIndex];

    expect(activePlayer.hp).toBe(4);
    expect(activePlayer.position).toEqual({ boardX: 1, boardY: 0 });
    expect(resolved.phase).toBe('turn_end');
  });

  it('retreats the blade on defeat instead of keeping combat open', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_blade',
      }),
    );
    const resolved = resolveCombat(state, { dice: [2, 2] });

    expect(resolved.phase).toBe('turn_end');
    expect(resolved.combat).toBeUndefined();
    expect(resolved.players[resolved.activePlayerIndex]).toEqual(
      expect.objectContaining({
        hp: 4,
        position: { boardX: 1, boardY: 0 },
      }),
    );
    expect(resolved.eventLog.at(-1)?.combat).toEqual(
      expect.objectContaining({
        outcome: 'defeat',
        retreatPosition: { boardX: 1, boardY: 0 },
      }),
    );
  });

  it('pauses for blade rerolls and rerolls only dice showing 1', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_blade',
      }),
    );
    const pending = resolveCombat(state, { dice: [1, 4] });
    const resolved = useBladeReroll(pending, { dice: [6, 2] });

    expect(pending.phase).toBe('combat_blade_reroll');
    expect(pending.combat).toEqual(
      expect.objectContaining({
        initialRolledDice: [1, 4],
        rolledDice: [1, 4],
      }),
    );
    expect(resolved.eventLog.at(-1)?.combat).toEqual(
      expect.objectContaining({
        dice: [6, 4],
      }),
    );
  });

  it('repeats the blade reroll step while any die still shows 1', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_blade',
      }),
    );
    const pending = resolveCombat(state, { dice: [1, 1] });
    const rerolledOnce = useBladeReroll(pending, { dice: [1, 5] });
    const resolved = useBladeReroll(rerolledOnce, { dice: [6, 2] });

    expect(rerolledOnce.phase).toBe('combat_blade_reroll');
    expect(rerolledOnce.combat?.rolledDice).toEqual([1, 5]);
    expect(resolved.eventLog.at(-1)?.combat).toEqual(
      expect.objectContaining({
        dice: [6, 5],
      }),
    );
  });

  it('keeps the turn open after a drawn combat with a six once the blade retreats', () => {
    const state = withActivePlayer(
      createCombatState('skeleton_key_guardian'),
      (player) => ({
        ...player,
        heroId: 'hero_blade',
      }),
    );
    const pending = resolveCombat(state, { dice: [6, 1] });
    const resolved = useBladeReroll(pending, { dice: [2, 2] });

    expect(resolved.phase).toBe('await_move');
    expect(resolved.turnContinuationReason).toBe('blade_on_six');
    expect(resolved.players[resolved.activePlayerIndex]?.position).toEqual({
      boardX: 1,
      boardY: 0,
    });
    expect(resolved.eventLog.at(-1)?.combat).toEqual(
      expect.objectContaining({
        outcome: 'draw',
        dice: [6, 2],
        retreatPosition: { boardX: 1, boardY: 0 },
      }),
    );
  });

  it('keeps the turn open after a defeated combat with a six when the blade still has HP left', () => {
    const state = withActivePlayer(createCombatState('dragon'), (player) => ({
      ...player,
      heroId: 'hero_blade',
    }));
    const pending = resolveCombat(state, { dice: [6, 1] });
    const resolved = useBladeReroll(pending, { dice: [2, 2] });

    expect(resolved.phase).toBe('await_move');
    expect(resolved.turnContinuationReason).toBe('blade_on_six');
    expect(resolved.players[resolved.activePlayerIndex]).toEqual(
      expect.objectContaining({
        hp: 4,
        skipNextTurn: false,
        position: { boardX: 1, boardY: 0 },
      }),
    );
    expect(resolved.eventLog.at(-1)?.combat).toEqual(
      expect.objectContaining({
        outcome: 'defeat',
        dice: [6, 2],
        retreatPosition: { boardX: 1, boardY: 0 },
      }),
    );
  });

  it('ends the turn after a defeated combat with a six when the blade drops to 0 HP', () => {
    const state = withActivePlayer(createCombatState('dragon'), (player) => ({
      ...player,
      heroId: 'hero_blade',
      hp: 1,
    }));
    const pending = resolveCombat(state, { dice: [6, 1] });
    const resolved = useBladeReroll(pending, { dice: [2, 2] });

    expect(resolved.phase).toBe('turn_end');
    expect(resolved.turnContinuationReason).toBeUndefined();
    expect(resolved.players[resolved.activePlayerIndex]).toEqual(
      expect.objectContaining({
        hp: 0,
        skipNextTurn: true,
        position: { boardX: 1, boardY: 0 },
      }),
    );
  });

  it('marks the player unconscious when losing the last HP', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
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

  it('recovers 1 HP after skipping an unconscious turn', () => {
    const defeatedState = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        hp: 1,
      }),
    );
    const resolved = resolveCombat(defeatedState, { dice: [1, 1] });
    const unconsciousPlayerId = resolved.players[resolved.activePlayerIndex].id;

    expect(resolved.players[resolved.activePlayerIndex]).toEqual(
      expect.objectContaining({
        hp: 0,
        skipNextTurn: true,
      }),
    );

    const otherPlayersTurn = endTurn(resolved);
    const beforeSkippedTurnPlayer = otherPlayersTurn.players.find(
      (player) => player.id === unconsciousPlayerId,
    );

    expect(otherPlayersTurn.phase).toBe('turn_start');
    expect(otherPlayersTurn.activePlayerIndex).not.toBe(
      resolved.activePlayerIndex,
    );
    expect(beforeSkippedTurnPlayer).toEqual(
      expect.objectContaining({
        hp: 0,
        skipNextTurn: true,
      }),
    );

    const skippedTurnState = endTurn(otherPlayersTurn);
    const skippedActivePlayer =
      skippedTurnState.players[skippedTurnState.activePlayerIndex];

    expect(skippedTurnState.phase).toBe('turn_skip');
    expect(skippedActivePlayer.id).toBe(unconsciousPlayerId);
    expect(skippedActivePlayer).toEqual(
      expect.objectContaining({
        hp: 0,
        skipNextTurn: true,
      }),
    );

    const recoveredTurn = endTurn(skippedTurnState);
    const recoveredPlayer = recoveredTurn.players.find(
      (player) => player.id === unconsciousPlayerId,
    );

    expect(recoveredPlayer).toEqual(
      expect.objectContaining({
        hp: 1,
        skipNextTurn: false,
      }),
    );
  });

  it('moves item rewards into loot resolution instead of auto-equipping them', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
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

    expect(resolved.phase).toBe('loot_resolution');
    expect(resolved.pendingLoot?.item).toEqual({ type: 'weapon', bonus: 1 });
    expect(combatTile?.looseItems).toEqual([]);
    expect(resolved.eventLog.at(-1)).toEqual(
      expect.objectContaining({
        type: 'combat_resolved',
        playerId: resolved.players[resolved.activePlayerIndex].id,
        combat: expect.objectContaining({
          monsterId: 'kitchen_rat',
          outcome: 'victory',
          dice: [6, 6],
          total: 17,
          weaponBonus: 5,
        }),
      }),
    );
  });

  it('leaves declined combat loot visibly on the combat tile and ends the turn', () => {
    const state = resolveCombat(createCombatState('kitchen_rat'), {
      dice: [6, 6],
    });
    const resolved = applyGameAction(state, { type: 'leaveLoot' });
    const combatTile = resolved.board.find(
      (tile) => tile.boardX === 1 && tile.boardY === -1,
    );

    expect(resolved.phase).toBe('turn_end');
    expect(resolved.pendingLoot).toBeUndefined();
    expect(combatTile?.looseItems).toEqual([{ type: 'weapon', bonus: 1 }]);
  });

  it('takes ground loot immediately as a turn-ending action when inventory space is free', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        position: { boardX: 1, boardY: -1 },
      }),
    );
    const prepared = {
      ...state,
      phase: 'await_move' as const,
      combat: undefined,
      board: state.board.map((tile) =>
        tile.boardX === 1 && tile.boardY === -1
          ? {
              ...tile,
              roomToken: undefined,
              looseItems: [{ type: 'weapon' as const, bonus: 1 as const }],
            }
          : tile,
      ),
    };
    const resolved = applyGameAction(prepared, { type: 'beginLoot' });
    const activePlayer = resolved.players[resolved.activePlayerIndex];
    const combatTile = resolved.board.find(
      (tile) => tile.boardX === 1 && tile.boardY === -1,
    );

    expect(activePlayer.inventory.weapons).toContainEqual({
      type: 'weapon',
      bonus: 1,
    });
    expect(resolved.phase).toBe('turn_end');
    expect(resolved.pendingLoot).toBeUndefined();
    expect(combatTile?.looseItems).toEqual([]);
  });

  it('keeps ground loot in loot resolution when the matching inventory is full', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        position: { boardX: 1, boardY: -1 },
        inventory: {
          ...player.inventory,
          weapons: [
            { type: 'weapon', bonus: 2 },
            { type: 'weapon', bonus: 3 },
          ],
        },
      }),
    );
    const prepared = {
      ...state,
      phase: 'await_move' as const,
      combat: undefined,
      board: state.board.map((tile) =>
        tile.boardX === 1 && tile.boardY === -1
          ? {
              ...tile,
              roomToken: undefined,
              looseItems: [{ type: 'weapon' as const, bonus: 1 as const }],
            }
          : tile,
      ),
    };
    const resolved = applyGameAction(prepared, { type: 'beginLoot' });

    expect(resolved.phase).toBe('loot_resolution');
    expect(resolved.pendingLoot).toEqual({
      source: 'ground_item',
      position: { boardX: 1, boardY: -1 },
      item: { type: 'weapon', bonus: 1 },
    });
  });

  it('pauses for explicit mummified_priest curse target selection after a human victory', () => {
    const state = createCombatState('mummified_priest');
    const resolved = resolveCombat(state, {
      dice: [6, 6],
    });

    expect(resolved.phase).toBe('combat_curse_target');
    expect(resolved.combat).toEqual(
      expect.objectContaining({
        pendingResolutionPhase: 'loot_resolution',
        pendingCombatEvent: expect.objectContaining({
          outcome: 'victory',
          monsterId: 'mummified_priest',
        }),
      }),
    );
    expect(resolved.board[0].roomToken).toBeUndefined();
  });

  it('moves the single curse to the selected target after defeating a mummified_priest', () => {
    const state = createCombatState('mummified_priest');
    const activePlayer = state.players[state.activePlayerIndex];
    const target = state.players.find(
      (player) => player.id !== activePlayer.id,
    )!;
    const pending = resolveCombat(state, {
      dice: [6, 6],
    });
    const resolved = applyGameAction(pending, {
      type: 'selectCurseTarget',
      targetPlayerId: target.id,
    });

    expect(
      resolved.players
        .filter((player) => player.isCursed)
        .map((player) => player.id),
    ).toEqual([target.id]);
    expect(resolved.phase).toBe('loot_resolution');
    expect(resolved.eventLog.at(-1)?.combat).toEqual(
      expect.objectContaining({
        curseTargetPlayerId: target.id,
        curseTargetPlayerLabel: playerHeroLabelById(
          resolved.players,
          target.id,
        ),
      }),
    );
  });

  it('rejects selecting the active player as the mummified_priest curse target', () => {
    const state = createCombatState('mummified_priest');
    const pending = resolveCombat(state, { dice: [6, 6] });
    const activePlayerId = state.players[state.activePlayerIndex].id;

    expect(() =>
      applyGameAction(pending, {
        type: 'selectCurseTarget',
        targetPlayerId: activePlayerId,
      }),
    ).toThrow(/another hero target/i);
  });

  it('skips mummified_priest curse target selection when no other valid hero exists', () => {
    const state = createCombatState('mummified_priest');
    const soloState: GameState = {
      ...state,
      players: [state.players[state.activePlayerIndex]],
      activePlayerIndex: 0,
    };
    const resolved = resolveCombat(soloState, { dice: [6, 6] });

    expect(resolved.phase).toBe('loot_resolution');
    expect(resolved.players[0].isCursed).toBe(false);
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

  it('keeps the turn open for a blade victory with a six when only follow-up actions remain', () => {
    const state = withActivePlayer(
      createCombatState('soulburner'),
      (player) => ({
        ...player,
        heroId: 'hero_blade',
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
    const resolved = resolveCombat(
      {
        ...state,
        remainingSteps: 0,
      },
      { dice: [6, 6] },
    );

    expect(resolved.phase).toBe('await_move');
    expect(resolved.remainingSteps).toBe(0);
    expect(resolved.turnContinuationReason).toBe('blade_on_six');
  });

  it('continues moving after resolving combat reward loot from a blade victory with a six', () => {
    const state = withActivePlayer(
      createCombatState('kitchen_rat'),
      (player) => ({
        ...player,
        heroId: 'hero_blade',
      }),
    );
    const resolved = resolveCombat(state, { dice: [6, 6] });
    const afterLoot = applyGameAction(resolved, { type: 'leaveLoot' });

    expect(resolved.phase).toBe('loot_resolution');
    expect(afterLoot.phase).toBe('await_move');
    expect(afterLoot.remainingSteps).toBe(3);
    expect(afterLoot.turnContinuationReason).toBe('blade_on_six');
  });

  it('can trigger the blade six continuation multiple times in one turn', () => {
    const state = createChainedCombatState(['soulburner', 'soulburner']);
    const firstVictory = resolveCombat(state, { dice: [6, 6] });
    const moved = applyGameAction(firstVictory, {
      type: 'movePlayer',
      target: { boardX: 1, boardY: -2 },
    });
    const secondVictory = resolveCombat(moved, { dice: [6, 6] });

    expect(firstVictory.phase).toBe('await_move');
    expect(moved.phase).toBe('combat');
    expect(secondVictory.phase).toBe('await_move');
    expect(secondVictory.remainingSteps).toBe(2);
    expect(secondVictory.turnContinuationReason).toBe('blade_on_six');
  });

  it('does not carry a previous blade six continuation into a later non-six victory', () => {
    const state = withActivePlayer(
      createChainedCombatState(['soulburner', 'kitchen_rat']),
      (player) => ({
        ...player,
        inventory: {
          ...player.inventory,
          weapons: [{ type: 'weapon', bonus: 2 }],
        },
      }),
    );
    const firstVictory = resolveCombat(state, { dice: [6, 6] });
    const moved = applyGameAction(firstVictory, {
      type: 'movePlayer',
      target: { boardX: 1, boardY: -2 },
    });
    const secondVictory = resolveCombat(moved, { dice: [2, 2] });
    const afterLoot = applyGameAction(secondVictory, { type: 'leaveLoot' });

    expect(secondVictory.phase).toBe('loot_resolution');
    expect(secondVictory.turnContinuationReason).toBeUndefined();
    expect(afterLoot.phase).toBe('turn_end');
  });
});

function createCombatState(monsterId: MonsterId): GameState {
  const base = createNewGame({
    humanHeroId: 'hero_mage',
    aiCount: 1,
    seed: `combat-${monsterId}`,
  });
  const activePlayer = base.players[0];
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
    activePlayerIndex: 0,
    board: [...base.board, originTile, combatTile],
    players: base.players.map((player, index) =>
      index === 0 ? { ...player, position: { boardX: 1, boardY: -1 } } : player,
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

function createChainedCombatState(
  monsterIds: [MonsterId, MonsterId],
): GameState {
  const base = createCombatState(monsterIds[0]);

  return withActivePlayer(
    {
      ...base,
      board: [
        ...base.board,
        {
          tileInstanceId: 'tile-second-combat',
          blueprintId: 'room_straight',
          rotation: 0,
          boardX: 1,
          boardY: -2,
          discovered: true,
          looseItems: [],
          roomToken: { id: monsterIds[1], kind: 'monster' },
        },
      ],
      remainingSteps: 3,
    },
    (player) => ({
      ...player,
      heroId: 'hero_blade',
      inventory: {
        ...player.inventory,
        weapons: [
          { type: 'weapon', bonus: 3 },
          { type: 'weapon', bonus: 3 },
        ],
      },
    }),
  );
}
