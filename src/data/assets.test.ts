import { describe, expect, it } from 'vitest';

import { assets, getAsset, getAssetUrl } from './assets';

describe('asset manifest runtime mapping', () => {
  const requiredV1AssetIds = [
    'tile_start_cross_healing',
    'tile_tunnel_straight',
    'tile_tunnel_corner',
    'tile_tunnel_t_junction',
    'tile_tunnel_cross',
    'tile_room_straight',
    'tile_room_corner',
    'tile_room_t_junction',
    'tile_room_cross',
    'tile_healing_corner',
    'tile_teleport_straight',
    'token_treasure_chest',
    'token_giant_rat',
    'token_giant_spider',
    'token_mummy',
    'token_skeleton_turnkey',
    'token_skeleton_warrior',
    'token_skeleton_king',
    'token_fallen',
    'token_dragon',
    'item_weapon_1',
    'item_weapon_2',
    'item_weapon_3',
    'item_spell_flame',
    'item_spell_healing',
    'item_key',
    'status_curse',
    'status_unconscious',
    'hero_mage_portrait',
    'hero_warrior_portrait',
    'hero_warlock_portrait',
    'hero_thief_portrait',
    'hero_swordsman_portrait',
    'hero_oracle_portrait',
    'hero_mage_token',
    'hero_warrior_token',
    'hero_warlock_token',
    'hero_thief_token',
    'hero_swordsman_token',
    'hero_oracle_token',
    'ui_logo_wordmark',
    'ui_icon_move',
    'ui_icon_attack',
    'ui_icon_heal',
    'ui_icon_inventory',
    'ui_icon_log',
    'bg_start_screen',
    'bg_game_table',
    'bg_end_screen',
    'sfx_tile_place',
    'sfx_chest_open',
    'sfx_monster_reveal',
    'sfx_combat_roll',
    'sfx_combat_win',
    'sfx_combat_draw',
    'sfx_combat_loss',
    'sfx_heal',
    'sfx_game_over',
  ];

  it('resolves visual and audio assets by stable assetId', () => {
    expect(getAsset('bg_start_screen').category).toBe('background');
    expect(getAsset('sfx_tile_place').category).toBe('audio');
  });

  it('maps final hero and monster png assets to public URLs', () => {
    expect(getAssetUrl('hero_mage_token')).toBe(
      '/assets/heroes/token_hero_mage.png',
    );
    expect(getAssetUrl('token_skeleton_turnkey')).toBe(
      '/assets/monsters/token_skeleton_keyguardian.png',
    );
    expect(getAssetUrl('tile_tunnel_cross')).toBe(
      '/assets/tiles/tile_tunnel_cross.png',
    );
  });

  it('keeps asset IDs unique', () => {
    const assetIds = assets.map((asset) => asset.assetId);

    expect(new Set(assetIds).size).toBe(assetIds.length);
  });

  it('covers the early V1 placeholder asset IDs from the asset spec', () => {
    const assetIds = new Set(assets.map((asset) => asset.assetId));

    expect(requiredV1AssetIds.every((assetId) => assetIds.has(assetId))).toBe(
      true,
    );
  });
});
