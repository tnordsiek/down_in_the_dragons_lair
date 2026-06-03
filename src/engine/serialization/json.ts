import type { GameState } from '../core/types';

export const currentGameStateSchemaVersion = 2;

const validHeroIds = new Set([
  'hero_mage',
  'hero_valkyrie',
  'hero_witch',
  'hero_rogue',
  'hero_blade',
  'hero_seeress',
]);

const validPhases = new Set([
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

const validCombatSources = new Set(['movement', 'witch_swap']);
const validTurnContinuationReasons = new Set(['blade_on_six']);
const validActionTypes = new Set([
  'startGame',
  'movePlayer',
  'declareExplorationDirection',
  'rotatePendingTilePreview',
  'placePendingTile',
  'resolveRoomToken',
  'chooseSeeressRoomToken',
  'startOptionalCombat',
  'resolveCombat',
  'selectCurseTarget',
  'useBladeReroll',
  'useValkyrieReroll',
  'declineValkyrieReroll',
  'useWitchSacrifice',
  'declineWitchSacrifice',
  'resolveCombatWithoutFlameSpells',
  'resolveCombatWithFlameSpells',
  'openChest',
  'beginLoot',
  'takeLoot',
  'leaveLoot',
  'swapLoot',
  'useHealingSpell',
  'swapWitchPosition',
  'endTurn',
]);

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeGameState(serializedState: string): GameState {
  const parsed = JSON.parse(serializedState) as Partial<GameState>;

  if (parsed.schemaVersion !== currentGameStateSchemaVersion) {
    throw new Error(`Unsupported game state schema: ${parsed.schemaVersion}`);
  }

  validateGameState(parsed);

  return parsed as GameState;
}

function validateGameState(state: Partial<GameState>): void {
  if (!state.phase || !validPhases.has(state.phase)) {
    throw new Error(`Unsupported game phase: ${String(state.phase)}`);
  }

  for (const player of state.players ?? []) {
    if (!validHeroId(player.heroId)) {
      throw new Error(
        `Unsupported heroId in saved game: ${String(player.heroId)}`,
      );
    }
  }

  if (state.combat?.source && !validCombatSources.has(state.combat.source)) {
    throw new Error(
      `Unsupported combat source in saved game: ${state.combat.source}`,
    );
  }

  if (
    state.turnContinuationReason &&
    !validTurnContinuationReasons.has(state.turnContinuationReason)
  ) {
    throw new Error(
      `Unsupported turn continuation reason in saved game: ${state.turnContinuationReason}`,
    );
  }

  for (const event of state.eventLog ?? []) {
    if (event.playerHeroId && !validHeroId(event.playerHeroId)) {
      throw new Error(
        `Unsupported event heroId in saved game: ${String(event.playerHeroId)}`,
      );
    }

    if (
      event.action?.actionType &&
      !validActionTypes.has(event.action.actionType)
    ) {
      throw new Error(
        `Unsupported action type in saved game: ${event.action.actionType}`,
      );
    }

    for (const roll of event.startPlayer?.rounds.flatMap(
      (round) => round.rolls,
    ) ?? []) {
      if (!validHeroId(roll.playerHeroId)) {
        throw new Error(
          `Unsupported start-player heroId in saved game: ${String(roll.playerHeroId)}`,
        );
      }
    }
  }
}

function validHeroId(
  heroId: unknown,
): heroId is GameState['players'][number]['heroId'] {
  return typeof heroId === 'string' && validHeroIds.has(heroId);
}
