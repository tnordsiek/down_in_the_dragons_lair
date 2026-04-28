import { getTileAt } from '../core/board';
import type { BoardPosition, GameState } from '../core/types';
import { healPlayer, isHealingPosition } from './healing';

export type UseHealingSpellOptions = {
  targetPlayerId: string;
  healingPosition: BoardPosition;
};

export function castHealingSpell(
  state: GameState,
  options: UseHealingSpellOptions,
): GameState {
  const caster = state.players[state.activePlayerIndex];
  const healingSpellIndex = caster.inventory.spells.findIndex(
    (spell) => spell.spellKind === 'healing',
  );

  if (healingSpellIndex < 0) {
    throw new Error('A healing spell is required');
  }

  const targetPlayer = state.players.find(
    (player) => player.id === options.targetPlayerId,
  );

  if (!targetPlayer) {
    throw new Error(`Unknown healing spell target: ${options.targetPlayerId}`);
  }

  const healingTile = getTileAt(state.board, options.healingPosition);

  if (
    !healingTile ||
    !isHealingPosition(state, {
      ...targetPlayer,
      position: options.healingPosition,
    })
  ) {
    throw new Error(
      'Healing spell destination must be a discovered healing tile',
    );
  }

  return {
    ...state,
    players: state.players.map((player, index) => {
      const withoutSpentSpell =
        index === state.activePlayerIndex
          ? {
              ...player,
              inventory: {
                ...player.inventory,
                spells: player.inventory.spells.filter(
                  (_, spellIndex) => spellIndex !== healingSpellIndex,
                ),
              },
            }
          : player;

      if (withoutSpentSpell.id !== options.targetPlayerId) {
        return withoutSpentSpell;
      }

      return healPlayer({
        ...withoutSpentSpell,
        position: options.healingPosition,
      });
    }),
  };
}
