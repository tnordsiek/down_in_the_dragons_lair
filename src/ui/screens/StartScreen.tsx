import { useAsset } from '../../data/assets';
import { heroDefinitions, heroIds } from '../../data/heroes';
import type { HeroId } from '../../engine/core/types';
import { useSetupStore } from '../../state/setupStore';

export function StartScreen() {
  const heroId = useSetupStore((state) => state.selectedHeroId);
  const aiCount = useSetupStore((state) => state.aiCount);
  const seed = useSetupStore((state) => state.seed);
  const hasSavedGame = useSetupStore((state) => state.hasSavedGame);
  const lastError = useSetupStore((state) => state.lastError);
  const persistenceError = useSetupStore((state) => state.persistenceError);
  const setSelectedHeroId = useSetupStore((state) => state.setSelectedHeroId);
  const setAiCount = useSetupStore((state) => state.setAiCount);
  const setSeed = useSetupStore((state) => state.setSeed);
  const startGame = useSetupStore((state) => state.startGame);
  const resumeSavedGame = useSetupStore((state) => state.resumeSavedGame);
  const clearSavedGame = useSetupStore((state) => state.clearSavedGame);
  const background = useAsset('bg_start_screen');
  const logo = useAsset('ui_logo_wordmark');

  return (
    <main
      className="min-h-screen bg-stone-950 text-stone-100"
      data-asset-id={background.assetId}
    >
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between px-6 py-8 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <div
            aria-label={logo.purpose}
            className="h-10 w-10 border border-amber-400 bg-amber-300 text-center text-2xl font-bold leading-10 text-stone-950"
            data-asset-id={logo.assetId}
          >
            D
          </div>
          <p className="text-sm text-stone-300">Local browser game</p>
        </header>

        <div className="grid gap-8 py-12 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <h1 className="max-w-3xl font-display text-5xl leading-tight text-amber-100 sm:text-6xl">
              Down in the Dragon&apos;s Lair
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-200">
              Choose a hero, set the opposition, and enter the dungeon.
            </p>
          </div>

          <div className="border border-stone-700 bg-stone-900/80 p-5">
            <h2 className="text-base font-semibold text-amber-100">
              Game Setup
            </h2>
            {hasSavedGame ? (
              <div className="mt-4 border border-amber-400 bg-stone-950 p-3">
                <p className="text-sm text-stone-200">Saved game available</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="bg-amber-300 px-3 py-2 text-sm font-semibold text-stone-950"
                    onClick={resumeSavedGame}
                  >
                    Resume Game
                  </button>
                  <button
                    className="border border-stone-600 px-3 py-2 text-sm text-stone-100"
                    onClick={clearSavedGame}
                  >
                    Discard Save
                  </button>
                </div>
              </div>
            ) : null}
            {lastError || persistenceError ? (
              <p className="mt-4 bg-red-950 p-2 text-sm text-red-100">
                {lastError ?? persistenceError}
              </p>
            ) : null}
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm text-stone-300">
                Hero
                <select
                  className="border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100"
                  value={heroId}
                  onChange={(event) =>
                    setSelectedHeroId(event.target.value as HeroId)
                  }
                >
                  {heroIds.map((id) => (
                    <option key={id} value={id}>
                      {heroDefinitions[id].displayName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-stone-300">
                AI Opponents
                <input
                  className="accent-amber-300"
                  max={4}
                  min={1}
                  type="range"
                  value={aiCount}
                  onChange={(event) => setAiCount(Number(event.target.value))}
                />
                <span className="font-mono text-stone-100">{aiCount}</span>
              </label>

              <label className="grid gap-2 text-sm text-stone-300">
                Seed
                <input
                  className="border border-stone-600 bg-stone-950 px-3 py-2 font-mono text-stone-100"
                  value={seed}
                  onChange={(event) => setSeed(event.target.value)}
                />
              </label>

              <button
                className="bg-amber-300 px-4 py-3 font-semibold text-stone-950"
                onClick={startGame}
              >
                {hasSavedGame ? 'Start New Game' : 'Start Game'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
