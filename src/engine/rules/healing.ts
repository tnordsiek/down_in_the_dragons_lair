import { tileBlueprints } from '../../data/tiles';
import { getTileAt } from '../core/board';
import type { GameState, HealingEndTurnSource, Player } from '../core/types';

export function healPlayer(player: Player): Player {
  return {
    ...player,
    hp: player.maxHp,
    isCursed: false,
    skipNextTurn: false,
  };
}

export function isHealingPosition(state: GameState, player: Player): boolean {
  const tile = getTileAt(state.board, player.position);

  const blueprint = tile ? tileBlueprints[tile.blueprintId] : undefined;

  return blueprint !== undefined && 'grantsHealing' in blueprint
    ? blueprint.grantsHealing === true
    : false;
}

export function applyHealingIfOnHealingTile(state: GameState): GameState {
  const activePlayer = state.players[state.activePlayerIndex];

  if (
    !isHealingPosition(state, activePlayer) ||
    !canHealAtTurnEnd(state.healingEndTurnSource)
  ) {
    return state;
  }

  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.activePlayerIndex ? healPlayer(player) : player,
    ),
  };
}

function canHealAtTurnEnd(source?: HealingEndTurnSource): boolean {
  return source === undefined || source !== 'combat_retreat_blocked';
}
