import { describe, expect, it } from 'vitest';

import type { GameState } from '../core/types';
import { createNewGame } from '../setup/createGame';
import { castHealingSpell } from './spells';

describe('spell rules', () => {
  it('uses a healing spell without spending movement steps or ending the turn', () => {
    const state = withActiveHealingSpell(
      createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'healing-spell-seed',
      }),
    );
    const targetPlayer = state.players.find(
      (_, index) => index !== state.activePlayerIndex,
    )!;
    const damagedTarget = {
      ...state,
      phase: 'await_move' as const,
      remainingSteps: 2,
      players: state.players.map((player) =>
        player.id === targetPlayer.id
          ? {
              ...player,
              hp: 1,
              isCursed: true,
              position: { boardX: 3, boardY: 3 },
            }
          : player,
      ),
    };
    const resolved = castHealingSpell(damagedTarget, {
      targetPlayerId: targetPlayer.id,
      healingPosition: { boardX: 0, boardY: 0 },
    });
    const healedTarget = resolved.players.find(
      (player) => player.id === targetPlayer.id,
    );

    expect(resolved.phase).toBe('await_move');
    expect(resolved.remainingSteps).toBe(2);
    expect(
      resolved.players[resolved.activePlayerIndex].inventory.spells,
    ).toHaveLength(0);
    expect(healedTarget).toEqual(
      expect.objectContaining({
        hp: 5,
        isCursed: false,
        position: { boardX: 0, boardY: 0 },
      }),
    );
  });

  it('removes exactly one healing spell and keeps other spells', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'healing-consume-seed',
    });
    const state: GameState = {
      ...base,
      phase: 'await_move',
      players: base.players.map((player, index) =>
        index === base.activePlayerIndex
          ? {
              ...player,
              hp: 1,
              inventory: {
                ...player.inventory,
                spells: [
                  { type: 'spell', spellKind: 'healing' },
                  { type: 'spell', spellKind: 'flame' },
                  { type: 'spell', spellKind: 'healing' },
                ],
              },
            }
          : player,
      ),
    };
    const caster = state.players[state.activePlayerIndex];

    const resolved = castHealingSpell(state, {
      targetPlayerId: caster.id,
      healingPosition: { boardX: 0, boardY: 0 },
    });
    const resolvedSpells = resolved.players[resolved.activePlayerIndex].inventory.spells;

    expect(resolvedSpells).toHaveLength(2);
    expect(resolvedSpells.filter((spell) => spell.spellKind === 'healing')).toHaveLength(1);
    expect(resolvedSpells.some((spell) => spell.spellKind === 'flame')).toBe(true);
    expect(resolved.players[resolved.activePlayerIndex].hp).toBe(5);
  });

  it('throws when the caster has no healing spell', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'healing-missing-seed',
    });

    expect(() =>
      castHealingSpell(
        { ...state, phase: 'await_move' },
        {
          targetPlayerId: state.players[state.activePlayerIndex].id,
          healingPosition: { boardX: 0, boardY: 0 },
        },
      ),
    ).toThrow(/healing spell is required/i);
  });

  it('throws when the destination is not a discovered healing tile', () => {
    const state = withActiveHealingSpell(
      createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'healing-destination-seed',
      }),
    );

    expect(() =>
      castHealingSpell(
        { ...state, phase: 'await_move' },
        {
          targetPlayerId: state.players[state.activePlayerIndex].id,
          healingPosition: { boardX: 99, boardY: 99 },
        },
      ),
    ).toThrow(/healing tile/i);
  });
});

function withActiveHealingSpell(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.activePlayerIndex
        ? {
            ...player,
            inventory: {
              ...player.inventory,
              spells: [{ type: 'spell', spellKind: 'healing' }],
            },
          }
        : player,
    ),
  };
}
