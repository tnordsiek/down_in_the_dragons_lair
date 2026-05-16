import { beforeEach, describe, expect, it } from 'vitest';

import {
  getDefaultAudioSettings,
  loadAudioSettings,
  persistedAudioSettingsKey,
  saveAudioSettings,
} from './audioSettings';

describe('audio settings persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses enabled defaults when no settings are saved', () => {
    expect(loadAudioSettings()).toEqual(getDefaultAudioSettings());
  });

  it('saves and loads both audio flags', () => {
    saveAudioSettings({ musicEnabled: false, sfxEnabled: true });

    expect(loadAudioSettings()).toEqual({
      musicEnabled: false,
      sfxEnabled: true,
    });
  });

  it('drops malformed persisted settings without throwing', () => {
    window.localStorage.setItem(
      persistedAudioSettingsKey,
      JSON.stringify({ musicEnabled: 'nope', sfxEnabled: false }),
    );

    expect(loadAudioSettings()).toEqual({
      musicEnabled: true,
      sfxEnabled: true,
    });
    expect(window.localStorage.getItem(persistedAudioSettingsKey)).toBeNull();
  });
});
