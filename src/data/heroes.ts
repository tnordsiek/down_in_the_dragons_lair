import type { HeroDefinition, HeroId } from '../engine/core/types';
import { heroDisplayNames } from './displayNames';

export const heroDefinitions = {
  hero_mage: {
    id: 'hero_mage',
    displayName: heroDisplayNames.hero_mage,
    passiveRules: [
      'flame_spells_are_not_consumed',
      'can_move_through_walls_on_discovered_tiles',
    ],
    activeRules: [],
  },
  hero_warrior: {
    id: 'hero_warrior',
    displayName: heroDisplayNames.hero_warrior,
    passiveRules: [
      'may_reroll_one_lost_combat',
      'last_hp_loss_moves_to_healing_tile',
    ],
    activeRules: [],
  },
  hero_warlock: {
    id: 'hero_warlock',
    displayName: heroDisplayNames.hero_warlock,
    passiveRules: [],
    activeRules: [
      'sacrifice_hp_for_combat_bonus_once',
      'swap_position_at_turn_start_for_all_steps',
    ],
  },
  hero_thief: {
    id: 'hero_thief',
    displayName: heroDisplayNames.hero_thief,
    passiveRules: ['combat_draws_are_wins', 'may_ignore_monsters'],
    activeRules: [],
  },
  hero_swordsman: {
    id: 'hero_swordsman',
    displayName: heroDisplayNames.hero_swordsman,
    passiveRules: [
      'reroll_ones_until_not_one',
      'six_allows_post_combat_continuation',
    ],
    activeRules: ['may_attack_same_monster_again_after_draw_or_loss'],
  },
  hero_oracle: {
    id: 'hero_oracle',
    displayName: heroDisplayNames.hero_oracle,
    passiveRules: [
      'combat_bonus_after_first_step',
      'draw_two_room_tokens_choose_one',
    ],
    activeRules: [],
  },
} as const satisfies Record<HeroId, HeroDefinition>;

export const heroIds = Object.keys(heroDefinitions) as HeroId[];
