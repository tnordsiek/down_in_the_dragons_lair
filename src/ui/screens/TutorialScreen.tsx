import { useState } from 'react';

import { useAsset } from '../../data/assets';
import { useSetupStore } from '../../state/setupStore';
import { useTranslation } from '../../i18n/useTranslation';
import { FooterMeta } from '../components/FooterMeta';
import { TutorialVisual } from '../tutorial/TutorialVisual';

export function TutorialScreen() {
  const t = useTranslation();
  const exitTutorial = useSetupStore((state) => state.exitTutorial);
  const background = useAsset('bg_start_screen');
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = t.tutorialSteps;
  const stepCount = tutorialSteps.length;
  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === stepCount - 1;

  const goBack = () => setCurrentStep((current) => Math.max(0, current - 1));
  const goNext = () =>
    setCurrentStep((current) => Math.min(stepCount - 1, current + 1));

  return (
    <main
      className="min-h-screen bg-stone-wall text-parchment-50"
      data-asset-id={background.assetId}
    >
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-obsidian-700 pb-3 shadow-[0_2px_0_rgba(196,132,42,0.2)]">
          <h1 className="font-display text-2xl text-torch-200 sm:text-3xl">
            {t.tutorialScreen.title}
          </h1>
          <button
            className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
            data-asset-id="ui_button_secondary"
            onClick={exitTutorial}
          >
            {t.tutorialScreen.exitTutorial}
          </button>
        </header>

        <div className="mt-6 flex flex-1 flex-col">
          <p
            className="text-xs uppercase tracking-[0.2em] text-parchment-200"
            aria-live="polite"
          >
            {t.tutorialScreen.stepOf(currentStep + 1, stepCount)}
          </p>

          <section className="mt-3 flex-1 rounded-forged border border-obsidian-700 bg-obsidian-900/80 p-5 shadow-forged">
            <h2 className="font-display text-xl font-semibold text-torch-200">
              {step.title}
            </h2>
            <div
              className={`mt-3 grid gap-5 ${
                step.visual ? 'lg:grid-cols-2 lg:items-start' : ''
              }`}
            >
              <div>
                <p className="leading-6 text-parchment-100">{step.intro}</p>
                {step.bullets && step.bullets.length > 0 ? (
                  <ul className="mt-4 grid gap-2">
                    {step.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex gap-2 text-sm leading-5 text-parchment-200"
                      >
                        <span aria-hidden="true" className="text-torch-300">
                          •
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {step.visual ? (
                <div data-testid="tutorial-visual">
                  <TutorialVisual visual={step.visual} />
                </div>
              ) : null}
            </div>
          </section>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              className="rounded-forged border border-obsidian-600 px-4 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200 disabled:cursor-not-allowed disabled:opacity-40"
              data-asset-id="ui_button_secondary"
              disabled={isFirstStep}
              onClick={goBack}
            >
              {t.tutorialScreen.back}
            </button>
            {isLastStep ? (
              <button
                className="rounded-forged bg-torch-300 px-4 py-2 font-semibold text-obsidian-950 shadow-forged transition-colors hover:bg-torch-400"
                data-asset-id="ui_button_primary"
                onClick={exitTutorial}
              >
                {t.tutorialScreen.backToStart}
              </button>
            ) : (
              <button
                className="rounded-forged bg-torch-300 px-4 py-2 font-semibold text-obsidian-950 shadow-forged transition-colors hover:bg-torch-400"
                data-asset-id="ui_button_primary"
                onClick={goNext}
              >
                {t.tutorialScreen.next}
              </button>
            )}
          </div>
        </div>

        <FooterMeta align="left" layout="flow" />
      </section>
    </main>
  );
}
