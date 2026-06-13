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
    'token_kitchen_rat',
    'token_creepy_spider',
    'token_mummified_priest',
    'token_skeleton_key_guardian',
    'token_skeleton_soldier',
    'token_skeleton_lord',
    'token_soulburner',
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
    'hero_valkyrie_portrait',
    'hero_witch_portrait',
    'hero_rogue_portrait',
    'hero_blade_portrait',
    'hero_seeress_portrait',
    'hero_mage_token',
    'hero_valkyrie_token',
    'hero_witch_token',
    'hero_rogue_token',
    'hero_blade_token',
    'hero_seeress_token',
    'ui_logo_wordmark',
    'ui_logo_header',
    'ui_dice_01',
    'ui_dice_02',
    'ui_dice_03',
    'ui_dice_04',
    'ui_dice_05',
    'ui_dice_06',
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
    'sfx_teleport',
    'sfx_game_over',
    'music_menu_loop',
    'music_game_loop',
    'music_end_screen',
  ];

  it('resolves visual and audio assets by stable assetId', () => {
    expect(getAsset('bg_start_screen').category).toBe('background');
    expect(getAsset('sfx_tile_place').category).toBe('audio');
  });

  it('maps final hero and monster webp assets to public URLs', () => {
    expect(getAssetUrl('hero_mage_token')).toBe(
      '/assets/heroes/token_hero_mage.webp',
    );
    expect(getAssetUrl('token_skeleton_key_guardian')).toBe(
      '/assets/monsters/token_skeleton_key_guardian.webp',
    );
    expect(getAssetUrl('token_treasure_chest')).toBe(
      '/assets/monsters/token_treasure_chest.webp',
    );
    expect(getAssetUrl('item_weapon_1')).toBe('/assets/items/item_knife_1.webp');
    expect(getAssetUrl('status_curse')).toBe('/assets/status/status_curse.webp');
    expect(getAssetUrl('tile_tunnel_cross')).toBe(
      '/assets/tiles/tile_tunnel_cross.webp',
    );
    expect(getAssetUrl('ui_logo_header')).toBe('/assets/ui/ui_logo_header.webp');
    expect(getAssetUrl('ui_dice_06')).toBe('/assets/ui/ui_dice_06.webp');
    expect(getAssetUrl('music_game_loop')).toBe(
      '/assets/sounds/music_game_loop.ogg',
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
