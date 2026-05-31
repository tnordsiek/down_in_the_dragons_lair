import { useId, useState } from 'react';

import { getAssetUrl, useAsset } from '../../data/assets';
import { heroDefinitions, heroIds } from '../../data/heroes';
import type { HeroId } from '../../engine/core/types';
import { useSetupStore } from '../../state/setupStore';
import { FooterMeta } from '../components/FooterMeta';
import { SettingsMenu } from '../components/SettingsMenu';

const heroPreviewAbilities: Record<HeroId, [string, string]> = {
  hero_mage: [
    'Fireball spells are not consumed.',
    'May move through walls on discovered tiles.',
  ],
  hero_valkyrie: [
    'May reroll both combat dice once after a draw or defeat.',
    'Losing the last HP sends the Valkyrie to a healing tile.',
  ],
  hero_witch: [
    'May sacrifice 1 HP for +1 combat strength in a fight.',
    'May swap position with another player at turn start.',
  ],
  hero_rogue: [
    'Combat draws count as wins.',
    'May ignore monsters while moving.',
  ],
  hero_blade: [
    'Rerolls every die showing 1 until none remain.',
    'A final rolled 6 keeps the turn open for remaining movement and actions.',
  ],
  hero_seeress: [
    'Draws two room tokens and chooses one.',
    'Gains +1 combat strength in a fight after the first step is spent.',
  ],
};

export function StartScreen() {
  const [advancedSetupVisible, setAdvancedSetupVisible] = useState(false);
  const advancedSetupId = useId();
  const heroId = useSetupStore((state) => state.selectedHeroId);
  const aiCount = useSetupStore((state) => state.aiCount);
  const opponentSelectionMode = useSetupStore(
    (state) => state.opponentSelectionMode,
  );
  const selectedOpponentHeroIds = useSetupStore(
    (state) => state.selectedOpponentHeroIds,
  );
  const seed = useSetupStore((state) => state.seed);
  const poolScale = useSetupStore((state) => state.poolScale);
  const hasSavedGame = useSetupStore((state) => state.hasSavedGame);
  const lastError = useSetupStore((state) => state.lastError);
  const persistenceError = useSetupStore((state) => state.persistenceError);
  const setSelectedHeroId = useSetupStore((state) => state.setSelectedHeroId);
  const setAiCount = useSetupStore((state) => state.setAiCount);
  const setOpponentSelectionMode = useSetupStore(
    (state) => state.setOpponentSelectionMode,
  );
  const toggleSelectedOpponentHeroId = useSetupStore(
    (state) => state.toggleSelectedOpponentHeroId,
  );
  const setSeed = useSetupStore((state) => state.setSeed);
  const setPoolScale = useSetupStore((state) => state.setPoolScale);
  const startGame = useSetupStore((state) => state.startGame);
  const startTutorial = useSetupStore((state) => state.startTutorial);
  const resumeSavedGame = useSetupStore((state) => state.resumeSavedGame);
  const clearSavedGame = useSetupStore((state) => state.clearSavedGame);
  const background = useAsset('bg_start_screen');
  const logo = useAsset('ui_logo_wordmark');
  const logoUrl = getAssetUrl(logo.assetId);
  const heroPortraitUrl = getAssetUrl(`${heroId}_portrait`);
  const heroAbilityLines = heroPreviewAbilities[heroId];
  const availableOpponentHeroIds = heroIds.filter((id) => id !== heroId);
  const selectionLimitReached = selectedOpponentHeroIds.length >= aiCount;

  return (
    <main
      className="min-h-screen bg-stone-wall text-parchment-50"
      data-asset-id={background.assetId}
    >
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-2 sm:px-8">
        <header className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <div className="justify-self-start">
            <SettingsMenu />
          </div>
          <p className="justify-self-center text-center font-display text-[1.5rem] leading-9 text-parchment-100">
            Choose a hero, set the opposition, and enter the dungeon...
          </p>
          <div className="justify-self-end">
            <button
              className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
              data-asset-id="ui_button_secondary"
              onClick={startTutorial}
            >
              How to Play
            </button>
          </div>
        </header>

        <div className="grid flex-1 gap-8 pt-6 md:grid-cols-[1fr_0.95fr] md:items-start">
          <div className="flex min-h-[22rem] flex-col items-center pt-4 text-center">
            <h1 className="sr-only">Down in the Dragon&apos;s Lair</h1>
            {logoUrl ? (
              <img
                className="max-h-[18rem] w-full object-contain lg:max-h-[30rem]"
                data-asset-id={logo.assetId}
                src={logoUrl}
                alt="Down in the Dragon's Lair"
              />
            ) : (
              <h1 className="max-w-3xl font-display text-5xl leading-tight text-amber-100 sm:text-6xl">
                Down in the Dragon&apos;s Lair
              </h1>
            )}
            {hasSavedGame ? (
              <div className="mt-5 w-full rounded-forged border border-stone-700 bg-stone-900/80 p-4 text-left shadow-forged">
                <p className="font-display text-lg font-semibold text-amber-100">
                  Saved game available
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-forged bg-torch-300 px-3 py-2 text-sm font-semibold text-obsidian-950 shadow-forged transition-colors hover:bg-torch-400"
                    data-asset-id="ui_button_primary"
                    onClick={resumeSavedGame}
                  >
                    Resume Game
                  </button>
                  <button
                    className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
                    data-asset-id="ui_button_secondary"
                    onClick={clearSavedGame}
                  >
                    Discard Save
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid content-start gap-5">
            <section
              className="w-full rounded-forged border border-stone-700 bg-stone-900/80 p-4 text-left shadow-forged"
              data-asset-id={`${heroId}_portrait`}
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-start">
                <div className="mx-auto flex w-full flex-col items-center justify-center gap-2 sm:mx-0">
                  <p className="font-display text-lg font-semibold text-amber-100">
                    Chosen Hero
                  </p>
                  {heroPortraitUrl ? (
                    <img
                      className="max-h-40 w-full object-contain"
                      src={heroPortraitUrl}
                      alt={heroDefinitions[heroId].displayName}
                    />
                  ) : (
                    <span className="text-5xl font-display text-amber-100">
                      {heroDefinitions[heroId].displayName.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="grid gap-1">
                    <h2 className="font-display text-lg font-semibold text-amber-100">
                      {heroDefinitions[heroId].displayName}
                    </h2>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {heroAbilityLines.map((ability, index) => (
                      <div
                        className="rounded-carve border border-stone-700 bg-stone-950/80 px-2.5 py-2 shadow-carve"
                        key={ability}
                      >
                        <p className="text-[10px] uppercase tracking-[0.14em] text-torch-500">
                          Ability {index + 1}
                        </p>
                        <p className="mt-0.5 text-sm leading-5 text-parchment-100">
                          {ability}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div data-asset-id="bg_panel_texture">
              <div
                className="rounded-forged border border-stone-700 bg-stone-900/80 p-4 shadow-forged"
                data-asset-id="ui_modal_frame"
              >
                <h2 className="font-display text-base font-semibold text-amber-100">
                  Game Setup
                </h2>
                {lastError || persistenceError ? (
                  <p className="mt-3 rounded-carve border border-blood-500/50 bg-blood-900 p-2 text-sm text-blood-200">
                    {lastError ?? persistenceError}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-2 text-sm text-parchment-200">
                    Hero
                    <select
                      className="rounded-forged border border-obsidian-600 bg-obsidian-950 px-3 py-2 text-parchment-50 shadow-carve"
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

                  <label className="grid gap-2 text-sm text-parchment-200">
                    AI Opponents
                    <input
                      aria-label="AI Opponents"
                      className="accent-amber-300"
                      max={4}
                      min={1}
                      type="range"
                      value={aiCount}
                      onChange={(event) => setAiCount(Number(event.target.value))}
                    />
                    <span className="font-mono text-stone-100">{aiCount}</span>
                  </label>

                  <fieldset className="grid gap-2 text-sm text-parchment-200">
                    <legend>Opponent Selection</legend>
                    <label className="flex items-center gap-2">
                      <input
                        checked={opponentSelectionMode === 'random'}
                        className="accent-amber-300"
                        name="opponent-selection-mode"
                        type="radio"
                        onChange={() => setOpponentSelectionMode('random')}
                      />
                      <span>Random Opponents</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        checked={opponentSelectionMode === 'manual'}
                        className="accent-amber-300"
                        name="opponent-selection-mode"
                        type="radio"
                        onChange={() => setOpponentSelectionMode('manual')}
                      />
                      <span>Choose Opponents</span>
                    </label>
                  </fieldset>

                  {opponentSelectionMode === 'manual' ? (
                    <fieldset className="grid gap-2 text-sm text-parchment-200">
                      <legend>
                        Opponents ({selectedOpponentHeroIds.length}/{aiCount})
                      </legend>
                      <div className="grid gap-2">
                        {availableOpponentHeroIds.map((id) => {
                          const checked = selectedOpponentHeroIds.includes(id);
                          const disabled = !checked && selectionLimitReached;

                          return (
                            <label
                              key={id}
                              className={`flex items-center justify-between gap-3 rounded-forged border px-3 py-2 ${
                                disabled
                                  ? 'border-obsidian-800 bg-obsidian-950/60 text-stone-500'
                                  : 'border-obsidian-700 bg-obsidian-950 text-parchment-100'
                              }`}
                            >
                              <span>{heroDefinitions[id].displayName}</span>
                              <input
                                aria-label={heroDefinitions[id].displayName}
                                checked={checked}
                                className="accent-amber-300"
                                data-testid={`opponent-checkbox-${id}`}
                                disabled={disabled}
                                type="checkbox"
                                onChange={() => toggleSelectedOpponentHeroId(id)}
                              />
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-stone-400">
                        Any unselected opponents will be filled at random from the
                        remaining heroes.
                      </p>
                    </fieldset>
                  ) : null}

                  <button
                    aria-controls={advancedSetupId}
                    aria-expanded={advancedSetupVisible}
                    className="rounded-forged border border-obsidian-600 bg-obsidian-950 px-3 py-2 text-left text-sm font-semibold text-amber-100 transition-colors hover:border-torch-500"
                    type="button"
                    onClick={() =>
                      setAdvancedSetupVisible((current) => !current)
                    }
                  >
                    {advancedSetupVisible
                      ? 'Hide Advanced Setup'
                      : 'Show Advanced Setup'}
                  </button>

                  {advancedSetupVisible ? (
                    <div className="grid gap-3" id={advancedSetupId}>
                      <label className="grid gap-2 text-sm text-parchment-200">
                        Token and Tile Factor
                        <input
                          aria-label="Token and Tile Factor"
                          className="accent-amber-300"
                          min={1}
                          max={5}
                          step={0.5}
                          type="range"
                          value={poolScale}
                          onChange={(event) =>
                            setPoolScale(Number(event.target.value))
                          }
                        />
                        <span className="font-mono text-stone-100">
                          {poolScale.toFixed(1)}x
                        </span>
                        <span className="text-xs text-stone-400">
                          Counts are rounded up. The dragon always remains unique.
                        </span>
                      </label>

                      <label className="grid gap-2 text-sm text-parchment-200">
                        Seed
                        <input
                          className="rounded-forged border border-obsidian-600 bg-obsidian-950 px-3 py-2 font-mono text-parchment-50 shadow-carve"
                          value={seed}
                          onChange={(event) => setSeed(event.target.value)}
                        />
                      </label>
                    </div>
                  ) : null}

                  <button
                    className="rounded-forged bg-torch-300 px-4 py-3 font-semibold text-obsidian-950 shadow-forged transition-colors hover:bg-torch-400"
                    data-asset-id="ui_button_primary"
                    onClick={startGame}
                  >
                    {hasSavedGame ? 'Start New Game' : 'Start Game'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-left text-xs text-stone-400 md:flex-row md:items-end md:justify-between">
          <div className="leading-5">
            <p>Code powered by Codex & Claude</p>
            <p>Graphics powered by Nano Banana</p>
            <p>Concept and AI Direction by fnord GAMES (2026)</p>
          </div>
          <FooterMeta align="right" layout="flow" />
        </div>
      </section>
    </main>
  );
}
