import { useId, useState } from 'react';

import { getAssetUrl, useAsset } from '../../data/assets';
import { heroIds } from '../../data/heroes';
import type { AiDifficulty, HeroId } from '../../engine/core/types';
import { MAX_AI, MAX_PLAYERS, useSetupStore } from '../../state/setupStore';
import { useTranslation } from '../../i18n/useTranslation';
import { generateRandomSeed } from '../../utils/randomSeed';
import { FooterMeta } from '../components/FooterMeta';
import { SettingsMenu } from '../components/SettingsMenu';

export function StartScreen() {
  const t = useTranslation();
  const [advancedSetupVisible, setAdvancedSetupVisible] = useState(false);
  const advancedSetupId = useId();
  const heroId = useSetupStore((state) => state.selectedHeroId);
  const gameMode = useSetupStore((state) => state.gameMode);
  const humanCount = useSetupStore((state) => state.humanCount);
  const selectedHumanHeroIds = useSetupStore(
    (state) => state.selectedHumanHeroIds,
  );
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
  const difficulty = useSetupStore((state) => state.difficulty);
  const setSelectedHeroId = useSetupStore((state) => state.setSelectedHeroId);
  const setGameMode = useSetupStore((state) => state.setGameMode);
  const setHumanCount = useSetupStore((state) => state.setHumanCount);
  const setHumanHeroId = useSetupStore((state) => state.setHumanHeroId);
  const setAiCount = useSetupStore((state) => state.setAiCount);
  const setDifficulty = useSetupStore((state) => state.setDifficulty);
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
  const heroAbilityLines = t.heroAbilities[heroId];
  const isHotseat = gameMode === 'hotseat';
  const humanHeroIds = isHotseat ? selectedHumanHeroIds : [heroId];
  const availableOpponentHeroIds = heroIds.filter(
    (id) => !humanHeroIds.includes(id),
  );
  const selectionLimitReached = selectedOpponentHeroIds.length >= aiCount;
  const maxAiOpponents = Math.min(MAX_AI, MAX_PLAYERS - humanCount);
  const showAiSection = !isHotseat || aiCount > 0;
  const hasDuplicateHumanHeroes =
    new Set(humanHeroIds).size !== humanHeroIds.length;

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
            {t.startScreen.tagline}
          </p>
          <div className="justify-self-end">
            <button
              className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
              data-asset-id="ui_button_secondary"
              onClick={startTutorial}
            >
              {t.startScreen.howToPlay}
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
                  {t.startScreen.savedGame}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-forged bg-torch-300 px-3 py-2 text-sm font-semibold text-obsidian-950 shadow-forged transition-colors hover:bg-torch-400"
                    data-asset-id="ui_button_primary"
                    onClick={resumeSavedGame}
                  >
                    {t.startScreen.resumeGame}
                  </button>
                  <button
                    className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
                    data-asset-id="ui_button_secondary"
                    onClick={clearSavedGame}
                  >
                    {t.startScreen.discardSave}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid content-start gap-5">
            {!isHotseat ? (
            <section
              className="w-full rounded-forged border border-stone-700 bg-stone-900/80 p-4 text-left shadow-forged"
              data-asset-id={`${heroId}_portrait`}
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-start">
                <div className="mx-auto flex w-full flex-col items-center justify-center gap-2 sm:mx-0">
                  <p className="font-display text-lg font-semibold text-amber-100">
                    {t.startScreen.chosenHero}
                  </p>
                  {heroPortraitUrl ? (
                    <img
                      className="max-h-40 w-full object-contain"
                      src={heroPortraitUrl}
                      alt={t.displayNames.heroes[heroId]}
                    />
                  ) : (
                    <span className="text-5xl font-display text-amber-100">
                      {t.displayNames.heroes[heroId].slice(0, 1)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="grid gap-1">
                    <h2 className="font-display text-lg font-semibold text-amber-100">
                      {t.displayNames.heroes[heroId]}
                    </h2>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {heroAbilityLines.map((ability, index) => (
                      <div
                        className="rounded-carve border border-stone-700 bg-stone-950/80 px-2.5 py-2 shadow-carve"
                        key={ability}
                      >
                        <p className="text-[10px] uppercase tracking-[0.14em] text-torch-500">
                          {t.startScreen.abilityLabel(index + 1)}
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
            ) : null}

            <div data-asset-id="bg_panel_texture">
              <div
                className="rounded-forged border border-stone-700 bg-stone-900/80 p-4 shadow-forged"
                data-asset-id="ui_modal_frame"
              >
                <h2 className="font-display text-base font-semibold text-amber-100">
                  {t.startScreen.gameSetup}
                </h2>
                {lastError || persistenceError ? (
                  <p className="mt-3 rounded-carve border border-blood-500/50 bg-blood-900 p-2 text-sm text-blood-200">
                    {lastError ?? persistenceError}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-3">
                  <div
                    className="grid grid-cols-2 gap-2"
                    role="group"
                    aria-label={t.startScreen.gameMode}
                  >
                    <button
                      type="button"
                      aria-pressed={!isHotseat}
                      className={`rounded-forged border px-3 py-2 text-sm font-semibold transition-colors ${
                        !isHotseat
                          ? 'border-torch-500 bg-obsidian-950 text-torch-200'
                          : 'border-obsidian-700 bg-obsidian-950/60 text-parchment-200 hover:border-torch-500'
                      }`}
                      onClick={() => setGameMode('solo')}
                    >
                      {t.startScreen.solo}
                    </button>
                    <button
                      type="button"
                      aria-pressed={isHotseat}
                      className={`rounded-forged border px-3 py-2 text-sm font-semibold transition-colors ${
                        isHotseat
                          ? 'border-torch-500 bg-obsidian-950 text-torch-200'
                          : 'border-obsidian-700 bg-obsidian-950/60 text-parchment-200 hover:border-torch-500'
                      }`}
                      onClick={() => setGameMode('hotseat')}
                    >
                      {t.startScreen.hotseat}
                    </button>
                  </div>

                  {isHotseat ? (
                    <>
                      <label className="grid gap-2 text-sm text-parchment-200">
                        {t.startScreen.humanPlayers}
                        <input
                          aria-label={t.startScreen.humanPlayers}
                          className="accent-amber-300"
                          max={MAX_PLAYERS}
                          min={2}
                          type="range"
                          value={humanCount}
                          onChange={(event) =>
                            setHumanCount(Number(event.target.value))
                          }
                        />
                        <span className="font-mono text-stone-100">
                          {humanCount}
                        </span>
                      </label>

                      <fieldset className="grid gap-2 text-sm text-parchment-200">
                        <legend>{t.startScreen.heroes}</legend>
                        {selectedHumanHeroIds.map((slotHeroId, slotIndex) => (
                          <label
                            key={slotIndex}
                            className="grid grid-cols-[auto_1fr] items-center gap-2"
                          >
                            <span className="text-parchment-200">
                              {t.startScreen.playerN(slotIndex + 1)}
                            </span>
                            <select
                              aria-label={t.startScreen.playerNHero(slotIndex + 1)}
                              className="rounded-forged border border-obsidian-600 bg-obsidian-950 px-3 py-2 text-parchment-50 shadow-carve"
                              value={slotHeroId}
                              onChange={(event) =>
                                setHumanHeroId(
                                  slotIndex,
                                  event.target.value as HeroId,
                                )
                              }
                            >
                              {heroIds
                                .filter(
                                  (id) =>
                                    id === slotHeroId ||
                                    !selectedHumanHeroIds.includes(id),
                                )
                                .map((id) => (
                                  <option key={id} value={id}>
                                    {t.displayNames.heroes[id]}
                                  </option>
                                ))}
                            </select>
                          </label>
                        ))}
                      </fieldset>
                    </>
                  ) : (
                    <label className="grid gap-2 text-sm text-parchment-200">
                      {t.startScreen.hero}
                      <select
                        className="rounded-forged border border-obsidian-600 bg-obsidian-950 px-3 py-2 text-parchment-50 shadow-carve"
                        value={heroId}
                        onChange={(event) =>
                          setSelectedHeroId(event.target.value as HeroId)
                        }
                      >
                        {heroIds.map((id) => (
                          <option key={id} value={id}>
                            {t.displayNames.heroes[id]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {!isHotseat || maxAiOpponents > 0 ? (
                    <label className="grid gap-2 text-sm text-parchment-200">
                      {t.startScreen.aiOpponents}
                      <input
                        aria-label={t.startScreen.aiOpponents}
                        className="accent-amber-300"
                        max={isHotseat ? maxAiOpponents : MAX_AI}
                        min={isHotseat ? 0 : 1}
                        type="range"
                        value={aiCount}
                        onChange={(event) =>
                          setAiCount(Number(event.target.value))
                        }
                      />
                      <span className="font-mono text-stone-100">{aiCount}</span>
                    </label>
                  ) : null}

                  {showAiSection ? (
                    <label className="grid gap-2 text-sm text-parchment-200">
                      {t.startScreen.difficulty}
                      <select
                        className="rounded-forged border border-obsidian-600 bg-obsidian-950 px-3 py-2 text-parchment-50 shadow-carve"
                        value={difficulty}
                        onChange={(event) =>
                          setDifficulty(event.target.value as AiDifficulty)
                        }
                      >
                        <option value="easy">{t.settingsMenu.easy}</option>
                        <option value="normal">{t.settingsMenu.normal}</option>
                        <option value="hard">{t.settingsMenu.hard}</option>
                      </select>
                    </label>
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
                      ? t.startScreen.hideAdvancedSetup
                      : t.startScreen.showAdvancedSetup}
                  </button>

                  {advancedSetupVisible ? (
                    <div className="grid gap-3" id={advancedSetupId}>
                      {showAiSection ? (
                        <>
                          <fieldset className="grid gap-2 text-sm text-parchment-200">
                            <legend>{t.startScreen.opponentSelection}</legend>
                            <label className="flex items-center gap-2">
                              <input
                                checked={opponentSelectionMode === 'random'}
                                className="accent-amber-300"
                                name="opponent-selection-mode"
                                type="radio"
                                onChange={() =>
                                  setOpponentSelectionMode('random')
                                }
                              />
                              <span>{t.startScreen.randomOpponents}</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                checked={opponentSelectionMode === 'manual'}
                                className="accent-amber-300"
                                name="opponent-selection-mode"
                                type="radio"
                                onChange={() =>
                                  setOpponentSelectionMode('manual')
                                }
                              />
                              <span>{t.startScreen.chooseOpponents}</span>
                            </label>
                          </fieldset>

                          {opponentSelectionMode === 'manual' ? (
                            <fieldset className="grid gap-2 text-sm text-parchment-200">
                              <legend>
                                {t.startScreen.opponents(
                                  selectedOpponentHeroIds.length,
                                  aiCount,
                                )}
                              </legend>
                              <div className="grid gap-2">
                                {availableOpponentHeroIds.map((id) => {
                                  const checked =
                                    selectedOpponentHeroIds.includes(id);
                                  const disabled =
                                    !checked && selectionLimitReached;
                                  const heroDisplayName =
                                    t.displayNames.heroes[id];

                                  return (
                                    <label
                                      key={id}
                                      className={`flex items-center justify-between gap-3 rounded-forged border px-3 py-2 ${
                                        disabled
                                          ? 'border-obsidian-800 bg-obsidian-950/60 text-stone-500'
                                          : 'border-obsidian-700 bg-obsidian-950 text-parchment-100'
                                      }`}
                                    >
                                      <span>{heroDisplayName}</span>
                                      <input
                                        aria-label={heroDisplayName}
                                        checked={checked}
                                        className="accent-amber-300"
                                        data-testid={`opponent-checkbox-${id}`}
                                        disabled={disabled}
                                        type="checkbox"
                                        onChange={() =>
                                          toggleSelectedOpponentHeroId(id)
                                        }
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                              <p className="text-xs text-stone-400">
                                {t.startScreen.opponentsHint}
                              </p>
                            </fieldset>
                          ) : null}
                        </>
                      ) : null}

                      <label className="grid gap-2 text-sm text-parchment-200">
                        {t.startScreen.tokenAndTileFactor}
                        <input
                          aria-label={t.startScreen.tokenAndTileFactor}
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
                          {t.startScreen.poolScaleHint}
                        </span>
                      </label>

                      <label className="grid gap-2 text-sm text-parchment-200">
                        {t.startScreen.seed}
                        <div className="flex items-center gap-2">
                          <input
                            className="min-w-0 flex-1 rounded-forged border border-obsidian-600 bg-obsidian-950 px-3 py-2 font-mono text-parchment-50 shadow-carve"
                            value={seed}
                            onChange={(event) => setSeed(event.target.value)}
                          />
                          <button
                            className="shrink-0 rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
                            type="button"
                            onClick={() => setSeed(generateRandomSeed())}
                          >
                            {t.startScreen.randomize}
                          </button>
                        </div>
                      </label>
                    </div>
                  ) : null}

                  {hasDuplicateHumanHeroes ? (
                    <p className="rounded-carve border border-blood-500/50 bg-blood-900 p-2 text-sm text-blood-200">
                      {t.startScreen.duplicateHeroError}
                    </p>
                  ) : null}

                  <button
                    className="rounded-forged bg-torch-300 px-4 py-3 font-semibold text-obsidian-950 shadow-forged transition-colors hover:bg-torch-400 disabled:cursor-not-allowed disabled:opacity-50"
                    data-asset-id="ui_button_primary"
                    disabled={hasDuplicateHumanHeroes}
                    onClick={startGame}
                  >
                    {hasSavedGame
                      ? t.startScreen.startNewGame
                      : t.startScreen.startGame}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-left text-xs text-stone-400 md:flex-row md:items-end md:justify-between">
          <div className="leading-5">
            <p>{t.startScreen.attributionCode}</p>
            <p>{t.startScreen.attributionGraphics}</p>
            <p>{t.startScreen.attributionConcept}</p>
          </div>
          <FooterMeta align="right" layout="flow" />
        </div>
      </section>
    </main>
  );
}
