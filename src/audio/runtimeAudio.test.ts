import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RuntimeAudioController } from './runtimeAudio';

type FakeAudio = {
  src: string;
  currentTime: number;
  loop: boolean;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
};

describe('RuntimeAudioController', () => {
  let createdAudio: FakeAudio[];

  beforeEach(() => {
    createdAudio = [];
  });

  it('uses manifest asset IDs to start looping music tracks', () => {
    const controller = new RuntimeAudioController((src) => {
      const audio = createFakeAudio(src);
      createdAudio.push(audio);
      return audio;
    });

    controller.setMusicTrack('music_menu_loop');

    expect(createdAudio).toHaveLength(1);
    expect(createdAudio[0].src).toBe('/assets/sounds/music_menu_loop.ogg');
    expect(createdAudio[0].loop).toBe(true);
    expect(createdAudio[0].play).toHaveBeenCalledTimes(1);
  });

  it('stops active music when music is disabled', () => {
    const controller = new RuntimeAudioController((src) => {
      const audio = createFakeAudio(src);
      createdAudio.push(audio);
      return audio;
    });

    controller.setMusicTrack('music_game_loop');
    controller.setMusicEnabled(false);

    expect(createdAudio[0].pause).toHaveBeenCalledTimes(1);
    expect(createdAudio[0].currentTime).toBe(0);
  });

  it('suppresses effect playback when sfx are disabled', () => {
    const controller = new RuntimeAudioController((src) => {
      const audio = createFakeAudio(src);
      createdAudio.push(audio);
      return audio;
    });

    controller.setSfxEnabled(false);
    controller.playSfx('sfx_tile_place');

    expect(createdAudio).toHaveLength(0);
  });

  it('swallows failing audio playback without throwing', () => {
    const controller = new RuntimeAudioController((src) => {
      const audio = createFakeAudio(src, {
        play: vi.fn(() => {
          throw new Error('blocked');
        }),
      });
      createdAudio.push(audio);
      return audio;
    });

    expect(() => controller.playSfx('sfx_tile_place')).not.toThrow();
    expect(() => controller.setMusicTrack('music_menu_loop')).not.toThrow();
  });
});

function createFakeAudio(
  src: string,
  overrides: Partial<FakeAudio> = {},
): FakeAudio {
  return {
    src,
    currentTime: 0,
    loop: false,
    pause: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}
