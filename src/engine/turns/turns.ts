import type { GameState } from '../core/types';
import { getTileAt } from '../core/board';
import {
  getActiveTileMonsterCombat,
  hasActiveHeroAbility,
} from '../rules/abilities';
import { applyHealingIfOnHealingTile } from '../rules/healing';

export function isEndTurnBlockedPhase(phase: GameState['phase']): boolean {
  return (
    phase === 'loot_resolution' ||
    phase === 'resolve_room_token' ||
    phase === 'resolve_room_token_oracle_choice' ||
    phase === 'combat' ||
    phase === 'combat_swordsman_reroll' ||
    phase === 'combat_warrior_reroll' ||
    phase === 'combat_warlock_sacrifice' ||
    phase === 'combat_flame_spells' ||
    phase === 'optional_post_combat'
  );
}

export function endTurn(state: GameState): GameState {
  if (isEndTurnBlockedPhase(state.phase)) {
    if (state.phase === 'loot_resolution') {
      throw new Error('Resolve or leave pending loot before ending the turn');
    }

    if (state.phase === 'resolve_room_token') {
      throw new Error('Resolve the room token before ending the turn');
    }

    if (state.phase === 'resolve_room_token_oracle_choice') {
      throw new Error('Choose an oracle room token before ending the turn');
    }

    throw new Error('Resolve the pending combat before ending the turn');
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const resolvedCurrentState =
    activePlayer.skipNextTurn && state.phase === 'turn_skip'
    ? recoverUnconsciousActivePlayer(state)
    : applyHealingIfOnHealingTile(state);
  const activePlayerIndex =
    (resolvedCurrentState.activePlayerIndex + 1) %
    resolvedCurrentState.players.length;
  const nextActivePlayer = resolvedCurrentState.players[activePlayerIndex];
  const nextPlayerTile = getTileAt(
    resolvedCurrentState.board,
    nextActivePlayer.position,
  );
  const nextPlayerMonster = nextPlayerTile?.roomToken?.kind === 'monster';
  const nextCombat = nextPlayerMonster
    ? getActiveTileMonsterCombat({
        ...resolvedCurrentState,
        activePlayerIndex,
      })
    : undefined;
  const nextPhase = nextActivePlayer.skipNextTurn
    ? 'turn_skip'
    : nextPlayerMonster
      ? hasActiveHeroAbility(nextActivePlayer, 'hero_thief')
        ? 'optional_monster_combat'
        : 'combat'
      : 'turn_start';

  return {
    ...resolvedCurrentState,
    phase: nextPhase,
    activePlayerIndex,
    remainingSteps: nextActivePlayer.skipNextTurn ? 0 : 4,
    pendingTile: undefined,
    pendingLoot: undefined,
    lastMoveFrom: undefined,
    combat: nextCombat,
    turnContinuationReason: undefined,
  };
}

function recoverUnconsciousActivePlayer(state: GameState): GameState {
  const activePlayer = state.players[state.activePlayerIndex];

  if (!activePlayer.skipNextTurn) {
    return state;
  }

  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.activePlayerIndex
        ? { ...player, hp: Math.max(1, player.hp), skipNextTurn: false }
        : player,
    ),
  };
}
