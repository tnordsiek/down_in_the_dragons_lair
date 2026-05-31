import { useSetupStore } from '../../state/setupStore';

type AudioToggleGroupProps = {
  className?: string;
};

export function AudioToggleGroup({ className }: AudioToggleGroupProps) {
  const musicEnabled = useSetupStore((state) => state.musicEnabled);
  const sfxEnabled = useSetupStore((state) => state.sfxEnabled);
  const toggleMusicEnabled = useSetupStore((state) => state.toggleMusicEnabled);
  const toggleSfxEnabled = useSetupStore((state) => state.toggleSfxEnabled);

  return (
    <div className={className ?? 'flex flex-wrap items-center gap-2'}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
        aria-pressed={musicEnabled}
        aria-label={`Music ${musicEnabled ? 'on' : 'off'}`}
        onClick={toggleMusicEnabled}
      >
        <MusicIcon muted={!musicEnabled} />
        <span>{`Music ${musicEnabled ? 'on' : 'off'}`}</span>
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
        aria-pressed={sfxEnabled}
        aria-label={`Audio Effects ${sfxEnabled ? 'on' : 'off'}`}
        onClick={toggleSfxEnabled}
      >
        <SfxIcon muted={!sfxEnabled} />
        <span>{`Audio Effects ${sfxEnabled ? 'on' : 'off'}`}</span>
      </button>
    </div>
  );
}

function MusicIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 8v8a2.5 2.5 0 1 1-2-2.45V6l10-2v8a2.5 2.5 0 1 1-2-2.45V2z" />
      {muted ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

function SfxIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10h4l5-4v12l-5-4H4z" />
      {muted ? (
        <path d="M4 4l16 16" />
      ) : (
        <>
          <path d="M17 9a4 4 0 0 1 0 6" />
          <path d="M19.5 6.5a7 7 0 0 1 0 11" />
        </>
      )}
    </svg>
  );
}
