export const persistedAudioSettingsKey =
  'down-in-the-dragons-lair.audioSettings.v1';

export type AudioSettings = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
};

const defaultAudioSettings: AudioSettings = {
  musicEnabled: true,
  sfxEnabled: true,
};

export function getDefaultAudioSettings(): AudioSettings {
  return { ...defaultAudioSettings };
}

export function saveAudioSettings(settings: AudioSettings): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  storage.setItem(persistedAudioSettingsKey, JSON.stringify(settings));
}

export function loadAudioSettings(): AudioSettings {
  const storage = getLocalStorage();

  if (!storage) {
    return getDefaultAudioSettings();
  }

  const serializedSettings = storage.getItem(persistedAudioSettingsKey);

  if (!serializedSettings) {
    return getDefaultAudioSettings();
  }

  try {
    return parseAudioSettings(JSON.parse(serializedSettings));
  } catch {
    storage.removeItem(persistedAudioSettingsKey);

    return getDefaultAudioSettings();
  }
}

function parseAudioSettings(value: unknown): AudioSettings {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as Record<string, unknown>).musicEnabled !== 'boolean' ||
    typeof (value as Record<string, unknown>).sfxEnabled !== 'boolean'
  ) {
    throw new Error('Invalid audio settings');
  }

  return {
    musicEnabled: (value as Record<string, boolean>).musicEnabled,
    sfxEnabled: (value as Record<string, boolean>).sfxEnabled,
  };
}

function getLocalStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
