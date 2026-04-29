import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useSetupStore } from '../state/setupStore';
import { persistedGameStateKey } from '../state/persistence';
import { App } from './App';

describe('App', () => {
  afterEach(() => {
    act(() => {
      useSetupStore.getState().clearSavedGame();
    });
    window.localStorage.clear();
  });

  it('renders the setup flow', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: "Down in the Dragon's Lair",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start Game' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Hero')).toBeInTheDocument();
  });

  it('starts a game and shows board actions', () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    });

    expect(screen.getByLabelText('Dungeon board')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Actions' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
  });

  it('resumes a saved game from the setup flow', () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    });

    expect(
      screen.getByRole('button', { name: 'Resume Game' }),
    ).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Resume Game' }));
    });

    expect(screen.getByLabelText('Dungeon board')).toBeInTheDocument();
  });

  it('controls unsupported saved versions in the setup flow', () => {
    window.localStorage.setItem(
      persistedGameStateKey,
      JSON.stringify({ schemaVersion: 999 }),
    );

    act(() => {
      useSetupStore.getState().resumeSavedGame();
    });
    render(<App />);

    expect(
      screen.getByText('Unsupported game state schema: 999'),
    ).toBeInTheDocument();
  });
});
