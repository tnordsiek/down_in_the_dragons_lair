import type { Locale } from './types';

export const persistedLocaleKey = 'down-in-the-dragons-lair.locale.v1';

export type LocaleSettings = {
  locale: Locale;
};

const defaultLocaleSettings: LocaleSettings = {
  locale: 'en',
};

export function getDefaultLocaleSettings(): LocaleSettings {
  return { ...defaultLocaleSettings };
}

export function saveLocaleSettings(settings: LocaleSettings): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  storage.setItem(persistedLocaleKey, JSON.stringify(settings));
}

export function loadLocaleSettings(): LocaleSettings {
  const storage = getLocalStorage();

  if (!storage) {
    return getDefaultLocaleSettings();
  }

  const serializedSettings = storage.getItem(persistedLocaleKey);

  if (!serializedSettings) {
    return getDefaultLocaleSettings();
  }

  try {
    return parseLocaleSettings(JSON.parse(serializedSettings));
  } catch {
    storage.removeItem(persistedLocaleKey);

    return getDefaultLocaleSettings();
  }
}

function parseLocaleSettings(value: unknown): LocaleSettings {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as Record<string, unknown>).locale !== 'string' ||
    !(['en', 'de'] as string[]).includes(
      (value as Record<string, string>).locale,
    )
  ) {
    throw new Error('Invalid locale settings');
  }

  return {
    locale: (value as Record<string, string>).locale as Locale,
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
