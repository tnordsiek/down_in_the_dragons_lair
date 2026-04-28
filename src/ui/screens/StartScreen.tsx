import { useAsset } from '../../data/assets';
import { useSetupStore } from '../../state/setupStore';

export function StartScreen() {
  const heroId = useSetupStore((state) => state.selectedHeroId);
  const aiCount = useSetupStore((state) => state.aiCount);
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
          <p className="text-sm text-stone-300">Milestone 1 scaffold</p>
        </header>

        <div className="grid gap-8 py-12 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <h1 className="max-w-3xl font-display text-5xl leading-tight text-amber-100 sm:text-6xl">
              Down in the Dragon&apos;s Lair
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-200">
              A deterministic browser dungeon board game foundation with
              replaceable asset IDs, ready for the rule engine.
            </p>
          </div>

          <div className="border border-stone-700 bg-stone-900/80 p-5">
            <h2 className="text-base font-semibold text-amber-100">
              Setup placeholder
            </h2>
            <dl className="mt-4 grid gap-3 text-sm text-stone-300">
              <div className="flex justify-between gap-4">
                <dt>Selected hero</dt>
                <dd className="font-mono text-stone-100">{heroId}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>AI opponents</dt>
                <dd className="font-mono text-stone-100">{aiCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Asset source</dt>
                <dd className="font-mono text-stone-100">manifest</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
