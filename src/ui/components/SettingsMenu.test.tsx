import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { SettingsMenu } from './SettingsMenu';
import { useSetupStore } from '../../state/setupStore';

describe('SettingsMenu', () => {
  afterEach(() => {
    cleanup();
    useSetupStore.setState({
      musicEnabled: true,
      sfxEnabled: true,
      movementPointsEnabled: true,
    });
    window.localStorage.clear();
  });

  it('opens and closes the menu, reflecting aria-expanded', () => {
    render(<SettingsMenu />);

    const toggle = screen.getByRole('button', { name: 'Open settings menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    const openToggle = screen.getByRole('button', {
      name: 'Close settings menu',
    });
    expect(openToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Music on' })).toBeInTheDocument();

    fireEvent.click(openToggle);

    expect(
      screen.getByRole('button', { name: 'Open settings menu' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Music on' })).toBeNull();
  });

  it('toggles the movement-points setting from the menu', () => {
    useSetupStore.setState({ movementPointsEnabled: true });
    render(<SettingsMenu />);

    fireEvent.click(screen.getByRole('button', { name: 'Open settings menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Movement Points on' }));

    expect(useSetupStore.getState().movementPointsEnabled).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Movement Points off' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('invokes the onNewGame handler from the menu', () => {
    const onNewGame = vi.fn();
    render(<SettingsMenu onNewGame={onNewGame} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open settings menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));

    expect(onNewGame).toHaveBeenCalledTimes(1);
  });
});
