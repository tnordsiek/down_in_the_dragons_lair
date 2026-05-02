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
      screen.getByRole('button', { name: 'Start Game' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Hero')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Choose a hero, set the opposition, and enter the dungeon.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Code powered by Codex')).toBeInTheDocument();
    expect(screen.getByText('Graphics powered by Gemini')).toBeInTheDocument();
    expect(
      screen.getByText('Concept and AI Direction by fnord GAMES (2026)'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('img', {
        name: 'Wortmarke oder kompaktes Logo fuer den Startscreen',
      }).length,
    ).toBeGreaterThan(0);
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

  it('uses a full-width game layout with a fixed right sidebar', () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    });

    const board = screen.getByLabelText('Dungeon board');
    const layout = board.closest('main')?.firstElementChild;
    const actionsHeading = screen.getByRole('heading', { name: 'Actions' });
    const sidebar = actionsHeading.closest('aside');

    expect(layout).toHaveClass(
      'grid',
      'w-full',
      'lg:grid-cols-[minmax(0,1fr)_22rem]',
    );
    expect(layout).not.toHaveClass('max-w-7xl');
    expect(sidebar).toHaveClass('lg:w-[22rem]', 'lg:justify-self-end');
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
