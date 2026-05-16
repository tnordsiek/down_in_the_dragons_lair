import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { useSetupStore } from '../state/setupStore';
import { persistedGameStateKey } from '../state/persistence';
import { App } from './App';

describe('App', () => {
  const originalAudio = window.Audio;

  beforeAll(() => {
    class MockAudio {
      currentTime = 0;

      loop = false;

      pause = vi.fn();

      play = vi.fn(() => Promise.resolve());

      constructor(public src = '') {}
    }

    window.Audio = MockAudio as typeof Audio;
  });

  afterAll(() => {
    window.Audio = originalAudio;
  });

  afterEach(() => {
    act(() => {
      useSetupStore.getState().clearSavedGame();
      useSetupStore.setState({
        musicEnabled: true,
        sfxEnabled: true,
        pendingAudioCues: [],
      });
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
    expect(screen.getByRole('button', { name: 'Music on' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Audio Effects on' }),
    ).toBeInTheDocument();
    expect(screen.getByText('v1.1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprint' })).toBeInTheDocument();
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
    expect(screen.getByText('v1.1 fnord GAMES 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprint' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Center Map' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Music on' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Audio Effects on' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: "Down in the Dragon's Lair" }),
    ).toBeInTheDocument();
  });

  it('opens and closes the imprint layer from the footer', () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Imprint' }));
    });

    expect(screen.getByText('Torsten Nordsiek')).toBeInTheDocument();
    expect(screen.getByText('Taigaweg 4')).toBeInTheDocument();
    expect(screen.getByText('33739 Bielefeld')).toBeInTheDocument();
    expect(screen.getByText('Kontakt +49 (0)521 1648447')).toBeInTheDocument();
    expect(screen.getByText('E-Mail: tnordsiek@web.de')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Close imprint' }));
    });

    expect(screen.queryByText('Torsten Nordsiek')).toBeNull();
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
    const header = screen
      .getByRole('img', { name: "Down in the Dragon's Lair" })
      .closest('header');
    const centerMapButton = screen.getByRole('button', { name: 'Center Map' });
    const newGameButton = screen.getByRole('button', { name: 'New Game' });
    const musicButton = screen.getByRole('button', { name: 'Music on' });
    const sfxButton = screen.getByRole('button', { name: 'Audio Effects on' });
    const leftHeaderCell = header?.firstElementChild;
    const centerHeaderCell = header?.children[1];
    const rightHeaderCell = header?.children[2];

    expect(layout).toHaveClass(
      'grid',
      'w-full',
      'lg:grid-cols-[minmax(0,1fr)_22rem]',
    );
    expect(layout).not.toHaveClass('max-w-7xl');
    expect(sidebar).toHaveClass(
      'min-h-0',
      'lg:h-full',
      'lg:w-[22rem]',
      'lg:justify-self-end',
      'lg:overflow-y-auto',
    );
    expect(header).toHaveClass('h-[120px]', 'pb-2');
    expect(leftHeaderCell).toContainElement(musicButton);
    expect(leftHeaderCell).toContainElement(sfxButton);
    expect(leftHeaderCell).toContainElement(centerMapButton);
    expect(leftHeaderCell).toContainElement(newGameButton);
    expect(centerHeaderCell).toContainElement(
      screen.getByRole('img', { name: "Down in the Dragon's Lair" }),
    );
    expect(screen.getByRole('img', { name: "Down in the Dragon's Lair" })).toHaveClass(
      'max-h-[108px]',
      'w-auto',
      'object-contain',
    );
    expect(rightHeaderCell).toHaveClass('flex', 'items-center', 'justify-end');
    expect(header?.querySelector('.text-sm.text-stone-400')).toBeNull();
    expect(
      screen.queryByRole('img', { name: /Combat die \d:/ }),
    ).toBeNull();
  });

  it('stretches the board area to fill the available game viewport height', () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    });

    const board = screen.getByLabelText('Dungeon board');
    const boardSection = board.closest('[data-asset-id="bg_game_table"]');
    const contentColumn = boardSection?.parentElement;
    const main = board.closest('main');

    expect(main).toHaveClass('lg:h-screen');
    expect(contentColumn).toHaveClass('min-h-0', 'flex-col', 'lg:h-full');
    expect(boardSection).toHaveClass('flex', 'min-h-0', 'flex-1');
    expect(board).toHaveClass('h-full', 'flex-1');
    expect(board.closest('main')?.firstElementChild).toHaveClass('lg:min-h-0');
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

  it('keeps audio toggle state consistent between start and game screens', () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Music on' }));
      fireEvent.click(screen.getByRole('button', { name: 'Audio Effects on' }));
    });

    expect(screen.getByRole('button', { name: 'Music off' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Audio Effects off' }),
    ).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    });

    expect(screen.getByRole('button', { name: 'Music off' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Audio Effects off' }),
    ).toBeInTheDocument();
  });
});
