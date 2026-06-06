import { useSetupStore } from '../state/setupStore';
import { en } from './en';
import { de } from './de';
import type { Locale } from './types';
import type { Translations } from './en';

const translations: Record<Locale, Translations> = { en, de };

export function useTranslation(): Translations {
  const locale = useSetupStore((state) => state.locale);
  return translations[locale];
}
