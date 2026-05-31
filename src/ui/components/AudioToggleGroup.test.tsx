import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { AudioToggleGroup } from './AudioToggleGroup';
import { useSetupStore } from '../../state/setupStore';

describe('AudioToggleGroup', () => {
  afterEach(() => {
    cleanup();
    useSetupStore.setState({ musicEnabled: true, sfxEnabled: true });
    window.localStorage.clear();
  });

  it('reflects and toggles the music setting', () => {
    useSetupStore.setState({ musicEnabled: true });
    render(<AudioToggleGroup />);

    const musicButton = screen.getByRole('button', { name: 'Music on' });
    expect(musicButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(musicButton);

    expect(useSetupStore.getState().musicEnabled).toBe(false);
    expect(screen.getByRole('button', { name: 'Music off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('reflects and toggles the audio-effects setting', () => {
    useSetupStore.setState({ sfxEnabled: true });
    render(<AudioToggleGroup />);

    const sfxButton = screen.getByRole('button', { name: 'Audio Effects on' });
    expect(sfxButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(sfxButton);

    expect(useSetupStore.getState().sfxEnabled).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Audio Effects off' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });
});
