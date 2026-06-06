import { useId, useState } from 'react';

import type { AiDifficulty } from '../../engine/core/types';
import type { Locale } from '../../i18n/types';
import { useSetupStore } from '../../state/setupStore';
import { useTranslation } from '../../i18n/useTranslation';

type SettingsMenuProps = {
  onNewGame?: () => void;
  newGameTitle?: string;
};

export function SettingsMenu({ onNewGame, newGameTitle }: SettingsMenuProps) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const musicEnabled = useSetupStore((state) => state.musicEnabled);
  const sfxEnabled = useSetupStore((state) => state.sfxEnabled);
  const movementPointsEnabled = useSetupStore(
    (state) => state.movementPointsEnabled,
  );
  const toggleMusicEnabled = useSetupStore((state) => state.toggleMusicEnabled);
  const toggleSfxEnabled = useSetupStore((state) => state.toggleSfxEnabled);
  const toggleMovementPointsEnabled = useSetupStore(
    (state) => state.toggleMovementPointsEnabled,
  );
  const difficulty = useSetupStore((state) => state.difficulty);
  const setDifficulty = useSetupStore((state) => state.setDifficulty);
  const locale = useSetupStore((state) => state.locale);
  const setLocale = useSetupStore((state) => state.setLocale);

  return (
    <div className="relative">
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={open ? t.settingsMenu.closeSettings : t.settingsMenu.openSettings}
        className="inline-flex h-11 w-11 items-center justify-center rounded-forged border border-obsidian-600 bg-obsidian-950/90 text-parchment-50 shadow-forged transition-colors hover:border-torch-500 hover:text-torch-200"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="sr-only">Settings</span>
        <span aria-hidden="true" className="flex flex-col gap-1">
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
        </span>
      </button>
      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+0.5rem)] z-30 min-w-[16rem] rounded-forged border border-obsidian-700 bg-obsidian-900/95 p-2 shadow-forged"
          id={menuId}
        >
          <div className="flex flex-col gap-1">
            {onNewGame ? (
              <button
                className="w-full rounded-forged border border-obsidian-600 px-3 py-2 text-left text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
                onClick={onNewGame}
                title={newGameTitle}
                type="button"
              >
                {t.settingsMenu.newGame}
              </button>
            ) : null}
            <ToggleMenuButton
              label={t.settingsMenu.music(musicEnabled)}
              pressed={musicEnabled}
              onClick={toggleMusicEnabled}
            />
            <ToggleMenuButton
              label={t.settingsMenu.sound(sfxEnabled)}
              pressed={sfxEnabled}
              onClick={toggleSfxEnabled}
            />
            <ToggleMenuButton
              label={t.settingsMenu.movementPoints(movementPointsEnabled)}
              pressed={movementPointsEnabled}
              onClick={toggleMovementPointsEnabled}
            />
            <DifficultyMenuRow
              difficulty={difficulty}
              onSelect={setDifficulty}
              t={t}
            />
            <LanguageMenuRow locale={locale} onSelect={setLocale} t={t} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

import type { Translations } from '../../i18n/en';

const DIFFICULTY_OPTIONS: AiDifficulty[] = ['easy', 'normal', 'hard'];
const LOCALE_OPTIONS: Locale[] = ['en', 'de'];

function DifficultyMenuRow({
  difficulty,
  onSelect,
  t,
}: {
  difficulty: AiDifficulty;
  onSelect: (d: AiDifficulty) => void;
  t: Translations;
}) {
  const difficultyLabels: Record<AiDifficulty, string> = {
    easy: t.settingsMenu.easy,
    normal: t.settingsMenu.normal,
    hard: t.settingsMenu.hard,
  };

  return (
    <div className="flex items-center gap-2 rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50">
      <span className="flex-1">{t.settingsMenu.difficulty}</span>
      <div className="flex gap-1">
        {DIFFICULTY_OPTIONS.map((opt) => (
          <button
            key={opt}
            aria-pressed={difficulty === opt}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              difficulty === opt
                ? 'bg-torch-600 text-parchment-50'
                : 'text-parchment-300 hover:text-torch-200'
            }`}
            onClick={() => onSelect(opt)}
            type="button"
          >
            {difficultyLabels[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}

function LanguageMenuRow({
  locale,
  onSelect,
  t,
}: {
  locale: Locale;
  onSelect: (l: Locale) => void;
  t: Translations;
}) {
  return (
    <div className="flex items-center gap-2 rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50">
      <span className="flex-1">{t.settingsMenu.language}</span>
      <div className="flex gap-1">
        {LOCALE_OPTIONS.map((opt) => (
          <button
            key={opt}
            aria-pressed={locale === opt}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              locale === opt
                ? 'bg-torch-600 text-parchment-50'
                : 'text-parchment-300 hover:text-torch-200'
            }`}
            onClick={() => onSelect(opt)}
            type="button"
          >
            {opt.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleMenuButton({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className="w-full rounded-forged border border-obsidian-600 px-3 py-2 text-left text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
