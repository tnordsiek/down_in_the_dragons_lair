import type { GameState } from '../engine/core/types';
import { getTileAt } from '../engine/core/board';

const validPhases = new Set<GameState['phase']>([
  'setup',
  'turn_start',
  'turn_skip',
  'await_move',
  'draw_pending_tile',
  'choose_pending_tile_rotation',
  'place_pending_tile',
  'resolve_room_token',
  'resolve_room_token_seeress_choice',
  'optional_monster_combat',
  'combat',
  'combat_blade_reroll',
  'combat_valkyrie_reroll',
  'combat_witch_sacrifice',
  'combat_flame_spells',
  'combat_curse_target',
  'loot_resolution',
  'optional_post_combat',
  'turn_end',
  'game_over',
]);

/**
 * Hard structural invariants that must hold for ANY reachable game state.
 *
 * This is the backbone of the refactor safety net: it is applied after every
 * action of a full autoplay game (see invariants.fuzz.test.ts). It only asserts
 * facts that are true by construction today, so a failure signals a real
 * regression rather than an over-strict expectation. Throws with a descriptive
 * message including the offending value.
 */
export function assertStateInvariants(state: GameState): void {
  const fail = (message: string): never => {
    throw new Error(
      `State invariant violated: ${message}\nphase=${state.phase} activePlayerIndex=${state.activePlayerIndex}`,
    );
  };

  if (state.schemaVersion !== 2) {
    fail(`unexpected schemaVersion ${String(state.schemaVersion)}`);
  }

  if (!validPhases.has(state.phase)) {
    fail(`unknown phase ${String(state.phase)}`);
  }

  if (state.players.length < 2 || state.players.length > 5) {
    fail(`player count out of range: ${state.players.length}`);
  }

  if (
    !Number.isInteger(state.activePlayerIndex) ||
    state.activePlayerIndex < 0 ||
    state.activePlayerIndex >= state.players.length
  ) {
    fail(`activePlayerIndex out of range: ${state.activePlayerIndex}`);
  }

  if (state.remainingSteps < 0 || state.remainingSteps > 4) {
    fail(`remainingSteps out of range: ${state.remainingSteps}`);
  }

  const seenPlayerIds = new Set<string>();

  for (const player of state.players) {
    if (seenPlayerIds.has(player.id)) {
      fail(`duplicate player id: ${player.id}`);
    }
    seenPlayerIds.add(player.id);

    if (player.hp < 0 || player.hp > player.maxHp) {
      fail(`hp out of range for ${player.id}: ${player.hp}/${player.maxHp}`);
    }

    if (player.treasurePoints < 0) {
      fail(
        `negative treasurePoints for ${player.id}: ${player.treasurePoints}`,
      );
    }

    if (player.inventory.weapons.length > 2) {
      fail(
        `weapon capacity exceeded for ${player.id}: ${player.inventory.weapons.length}`,
      );
    }

    if (player.inventory.spells.length > 3) {
      fail(
        `spell capacity exceeded for ${player.id}: ${player.inventory.spells.length}`,
      );
    }

    if (player.inventory.keyCount !== 0 && player.inventory.keyCount !== 1) {
      fail(
        `keyCount must be 0 or 1 for ${player.id}: ${player.inventory.keyCount}`,
      );
    }

    if (!getTileAt(state.board, player.position)) {
      fail(
        `player ${player.id} stands on a missing tile: ${player.position.boardX},${player.position.boardY}`,
      );
    }
  }

  // Board positions must be unique.
  const seenPositions = new Set<string>();
  for (const tile of state.board) {
    const key = `${tile.boardX},${tile.boardY}`;
    if (seenPositions.has(key)) {
      fail(`duplicate board position: ${key}`);
    }
    seenPositions.add(key);
  }

  // There is never more than one dragon present across the bag and the board.
  const dragonsInBag = state.tokenBag.filter(
    (token) => token.id === 'dragon',
  ).length;
  const dragonsOnBoard = state.board.filter(
    (tile) => tile.roomToken?.id === 'dragon',
  ).length;
  if (dragonsInBag + dragonsOnBoard > 1) {
    fail(
      `more than one dragon present: bag=${dragonsInBag} board=${dragonsOnBoard}`,
    );
  }

  // Combat context must reference the active player and a real tile.
  if (state.combat) {
    if (!getTileAt(state.board, state.combat.position)) {
      fail(
        `combat position has no tile: ${state.combat.position.boardX},${state.combat.position.boardY}`,
      );
    }
  }

  // Game over must carry a consistent victory record.
  if (state.phase === 'game_over') {
    if (!state.victory) {
      fail('phase is game_over but victory is undefined');
    } else {
      const { winnerPlayerIds } = state.victory;

      if (winnerPlayerIds.length === 0) {
        fail('victory has no winners');
      }

      const maxTreasure = Math.max(
        ...state.players.map((player) => player.treasurePoints),
      );

      for (const winnerId of winnerPlayerIds) {
        const winner = state.players.find((player) => player.id === winnerId);

        if (!winner) {
          fail(`winner id is not a player: ${winnerId}`);
        } else if (winner.treasurePoints !== maxTreasure) {
          fail(
            `winner ${winnerId} does not hold the max treasure (${winner.treasurePoints} != ${maxTreasure})`,
          );
        }
      }
    }
  } else if (state.victory) {
    fail('victory is set but phase is not game_over');
  }
}
