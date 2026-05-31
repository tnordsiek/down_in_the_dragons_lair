import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { createNewGame } from '../../engine/setup/createGame';
import { useSetupStore } from '../../state/setupStore';
import { FeedbackModal } from './FeedbackModal';

function openModal() {
  act(() => {
    useSetupStore.getState().openFeedbackModal();
  });
}

describe('FeedbackModal', () => {
  afterEach(() => {
    act(() => {
      useSetupStore.setState({
        feedbackModalOpen: false,
        gameState: undefined,
        pendingAudioCues: [],
      });
    });
    window.localStorage.clear();
    cleanup();
  });

  it('renders nothing while closed and the dialog once opened', () => {
    render(<FeedbackModal />);
    expect(screen.queryByRole('dialog')).toBeNull();

    openModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Feedback & Bug Report' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Your message' })).toBeInTheDocument();
  });

  it('hides the diagnostics opt-in when no game is running', () => {
    render(<FeedbackModal />);
    openModal();

    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByText(/entirely voluntary/i)).toBeNull();
  });

  it('shows a voluntary diagnostics opt-in with a disclaimer during a game', () => {
    act(() => {
      useSetupStore.setState({
        gameState: createNewGame({
          humanHeroId: 'hero_mage',
          aiCount: 1,
          seed: 'seed-a',
        }),
      });
    });

    render(<FeedbackModal />);
    openModal();

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText(/entirely voluntary/i)).toBeInTheDocument();
    expect(screen.getByText(/No personal data is collected/i)).toBeInTheDocument();
  });

  it('builds a mailto link from the typed message', () => {
    render(<FeedbackModal />);
    openModal();

    fireEvent.change(screen.getByRole('textbox', { name: 'Your message' }), {
      target: { value: 'My report' },
    });

    const link = screen.getByRole('link', { name: 'Open e-mail' });
    const href = link.getAttribute('href') ?? '';
    expect(href.startsWith('mailto:tnordsiek@web.de?')).toBe(true);
    expect(decodeURIComponent(href)).toContain('My report');
  });

  it('disables sending while the message is empty', () => {
    render(<FeedbackModal />);
    openModal();

    const link = screen.getByText('Open e-mail');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).not.toHaveAttribute('href');
  });

  it('closes via the Cancel button', () => {
    render(<FeedbackModal />);
    openModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
