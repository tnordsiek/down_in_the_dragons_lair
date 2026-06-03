import { useId, useState } from 'react';

import { useSetupStore } from '../../state/setupStore';

type SettingsMenuProps = {
  onNewGame?: () => void;
  newGameTitle?: string;
};

export function SettingsMenu({ onNewGame, newGameTitle }: SettingsMenuProps) {
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

  return (
    <div className="relative">
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={open ? 'Close settings menu' : 'Open settings menu'}
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
                New Game
              </button>
            ) : null}
            <ToggleMenuButton
              label={`Music ${musicEnabled ? 'on' : 'off'}`}
              pressed={musicEnabled}
              onClick={toggleMusicEnabled}
            />
            <ToggleMenuButton
              label={`Sound ${sfxEnabled ? 'on' : 'off'}`}
              pressed={sfxEnabled}
              onClick={toggleSfxEnabled}
            />
            <ToggleMenuButton
              label={`Movement Points ${movementPointsEnabled ? 'on' : 'off'}`}
              pressed={movementPointsEnabled}
              onClick={toggleMovementPointsEnabled}
            />
          </div>
        </div>
      ) : null}
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
