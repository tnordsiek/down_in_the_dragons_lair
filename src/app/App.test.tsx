import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useSetupStore } from '../state/setupStore';
import { App } from './App';

describe('App', () => {
  afterEach(() => {
    act(() => {
      useSetupStore.getState().resetGame();
    });
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
});
