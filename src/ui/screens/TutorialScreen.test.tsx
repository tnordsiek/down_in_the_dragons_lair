import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { App } from '../../app/App';
import { useSetupStore } from '../../state/setupStore';
import { tutorialSteps } from '../tutorialSteps';

function resetSetupStore() {
  act(() => {
    useSetupStore.getState().clearSavedGame();
    useSetupStore.setState({
      selectedHeroId: 'hero_mage',
      aiCount: 1,
      opponentSelectionMode: 'random',
      selectedOpponentHeroIds: [],
      seed: 'v1-local-seed',
      poolScale: 1,
      musicEnabled: true,
      sfxEnabled: true,
      movementPointsEnabled: true,
      tutorialActive: false,
      pendingAudioCues: [],
    });
  });
  window.localStorage.clear();
}

describe('TutorialScreen', () => {
  const originalAudio = window.Audio;

  beforeAll(() => {
    class MockAudio {
      currentTime = 0;

      loop = false;

      pause = vi.fn();

      play = vi.fn(() => Promise.resolve());

      constructor(public src = '') {}
    }

    window.Audio = MockAudio as unknown as typeof Audio;
  });

  afterAll(() => {
    window.Audio = originalAudio;
  });

  // The production initial seed is random, so reset before each test too.
  beforeEach(resetSetupStore);
  afterEach(resetSetupStore);

  const startScreenClaim =
    'Choose a hero, set the opposition, and enter the dungeon...';

  it('launches the tutorial from the start screen and shows the first step', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'How to Play' }));

    expect(
      screen.getByRole('heading', { name: 'How to Play' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Step 1 of ${tutorialSteps.length}`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: tutorialSteps[0].title }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('tutorial-visual')).toBeInTheDocument();
    expect(screen.queryByText(startScreenClaim)).toBeNull();
  });

  it('navigates forward and backward through the steps', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'How to Play' }));

    expect(
      screen.getByRole('button', { name: 'Back' }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      screen.getByText(`Step 2 of ${tutorialSteps.length}`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: tutorialSteps[1].title }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(
      screen.getByText(`Step 1 of ${tutorialSteps.length}`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: tutorialSteps[0].title }),
    ).toBeInTheDocument();
  });

  it('returns to the start screen via Back to Start on the last step', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'How to Play' }));

    for (let step = 0; step < tutorialSteps.length - 1; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }

    expect(
      screen.getByText(`Step ${tutorialSteps.length} of ${tutorialSteps.length}`),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Start' }));

    expect(screen.getByText(startScreenClaim)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start Game' }),
    ).toBeInTheDocument();
  });

  it('returns to the start screen via Exit Tutorial from any step', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'How to Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exit Tutorial' }));

    expect(screen.getByText(startScreenClaim)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start Game' }),
    ).toBeInTheDocument();
  });
});
