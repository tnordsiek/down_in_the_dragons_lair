import { useState } from 'react';

import { useAsset } from '../../data/assets';
import { useSetupStore } from '../../state/setupStore';
import { FooterMeta } from '../components/FooterMeta';
import { TutorialVisual } from '../tutorial/TutorialVisual';
import { tutorialSteps } from '../tutorialSteps';

export function TutorialScreen() {
  const exitTutorial = useSetupStore((state) => state.exitTutorial);
  const background = useAsset('bg_start_screen');
  const [currentStep, setCurrentStep] = useState(0);

  const stepCount = tutorialSteps.length;
  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === stepCount - 1;

  const goBack = () => setCurrentStep((current) => Math.max(0, current - 1));
  const goNext = () =>
    setCurrentStep((current) => Math.min(stepCount - 1, current + 1));

  return (
    <main
      className="min-h-screen bg-stone-950 text-stone-100"
      data-asset-id={background.assetId}
    >
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-stone-800 pb-3">
          <h1 className="font-display text-2xl text-amber-100 sm:text-3xl">
            How to Play
          </h1>
          <button
            className="border border-stone-600 px-3 py-2 text-sm text-stone-100"
            data-asset-id="ui_button_secondary"
            onClick={exitTutorial}
          >
            Exit Tutorial
          </button>
        </header>

        <div className="mt-6 flex flex-1 flex-col">
          <p
            className="text-xs uppercase tracking-[0.2em] text-stone-400"
            aria-live="polite"
          >
            Step {currentStep + 1} of {stepCount}
          </p>

          <section className="mt-3 flex-1 border border-stone-700 bg-stone-900/80 p-5">
            <h2 className="text-xl font-semibold text-amber-100">
              {step.title}
            </h2>
            <div
              className={`mt-3 grid gap-5 ${
                step.visual ? 'lg:grid-cols-2 lg:items-start' : ''
              }`}
            >
              <div>
                <p className="leading-6 text-stone-200">{step.intro}</p>
                {step.bullets && step.bullets.length > 0 ? (
                  <ul className="mt-4 grid gap-2">
                    {step.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex gap-2 text-sm leading-5 text-stone-300"
                      >
                        <span aria-hidden="true" className="text-amber-300">
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
              className="border border-stone-600 px-4 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              data-asset-id="ui_button_secondary"
              disabled={isFirstStep}
              onClick={goBack}
            >
              Back
            </button>
            {isLastStep ? (
              <button
                className="bg-amber-300 px-4 py-2 font-semibold text-stone-950"
                data-asset-id="ui_button_primary"
                onClick={exitTutorial}
              >
                Back to Start
              </button>
            ) : (
              <button
                className="bg-amber-300 px-4 py-2 font-semibold text-stone-950"
                data-asset-id="ui_button_primary"
                onClick={goNext}
              >
                Next
              </button>
            )}
          </div>
        </div>

        <FooterMeta align="left" layout="flow" />
      </section>
    </main>
  );
}
