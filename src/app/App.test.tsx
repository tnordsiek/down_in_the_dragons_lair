import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { persistedGameStateKey } from '../state/persistence';
import { useSetupStore } from '../state/setupStore';
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

    window.Audio = MockAudio as unknown as typeof Audio;
  });

  afterAll(() => {
    window.Audio = originalAudio;
  });

  afterEach(() => {
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
      screen.getByRole('radio', { name: 'Random Opponents' }),
    ).toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'Choose Opponents' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Show Advanced Setup' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Token and Tile Factor')).toBeNull();
    expect(screen.queryByText('1.0x')).toBeNull();
    expect(screen.queryByText(/Opponents \(0\/1\)/)).toBeNull();
    const startHeader = screen
      .getByRole('button', { name: 'Open settings menu' })
      .closest('header');
    const claim = screen.getByText(
      'Choose a hero, set the opposition, and enter the dungeon...',
    );

    expect(startHeader).toContainElement(claim);
    expect(claim).toHaveClass('text-[1.5rem]', 'text-center', 'leading-9');
    expect(screen.getByText('Chosen Hero')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mage' })).toBeInTheDocument();
    expect(
      screen.getByText('Fireball spells are not consumed.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('May move through walls on discovered tiles.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Code powered by Codex')).toBeInTheDocument();
    expect(
      screen.getByText('Graphics powered by Nano Banana'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Concept and AI Direction by fnord GAMES (2026)'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: "Down in the Dragon's Lair" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: "Down in the Dragon's Lair" }),
    ).toHaveClass('max-h-[18rem]', 'w-full', 'object-contain', 'lg:max-h-[30rem]');
    expect(screen.getByRole('img', { name: 'Mage' })).toBeInTheDocument();
    expect(startHeader).toContainElement(
      screen.getByRole('button', { name: 'Open settings menu' }),
    );
    expect(startHeader?.parentElement).toHaveClass('py-2');
    const startLayout = startHeader?.nextElementSibling;
    const leftColumn = startLayout?.firstElementChild;
    const rightColumn = startLayout?.children[1] as Element | undefined;
    const gameSetupHeading = screen.getByRole('heading', { name: 'Game Setup' });
    const heroPreviewHeading = screen.getByText('Chosen Hero');

    expect(startLayout).toHaveClass('md:grid-cols-[1fr_0.95fr]');
    expect(rightColumn).toContainElement(heroPreviewHeading);
    expect(rightColumn).toContainElement(gameSetupHeading);
    expect(leftColumn).not.toContainElement(heroPreviewHeading);
    expect(heroPreviewHeading).toHaveClass('text-lg', 'font-semibold', 'text-amber-100');
    expect(screen.getByRole('heading', { name: 'Mage' })).toHaveClass('text-lg');
    const portraitContainer = screen.getByRole('img', { name: 'Mage' }).parentElement;
    const heroNameHeading = screen.getByRole('heading', { name: 'Mage' });
    const heroInfoBlock = heroNameHeading.parentElement;

    expect(portraitContainer).toHaveClass(
      'w-full',
      'flex-col',
      'items-center',
      'justify-center',
    );
    expect(portraitContainer).toContainElement(heroPreviewHeading);
    expect(screen.getByRole('img', { name: 'Mage' })).toHaveClass('max-h-40');
    expect(heroInfoBlock).not.toContainElement(heroPreviewHeading);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Open settings menu' }));
    });
    expect(screen.getByRole('button', { name: 'Music on' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sound on' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Movement Points on' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New Game' })).toBeNull();
    expect(screen.getByText('v1.3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprint' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Privacy Policy' }),
    ).toBeInTheDocument();

    const creditsContainer = screen
      .getByText('Concept and AI Direction by fnord GAMES (2026)')
      .parentElement;

    expect(creditsContainer).toContainElement(screen.getByText('Code powered by Codex'));
    expect(creditsContainer?.parentElement).toContainElement(
      screen.getByRole('button', { name: 'Imprint' }),
    );
    expect(creditsContainer?.parentElement).toContainElement(
      screen.getByRole('button', { name: 'Privacy Policy' }),
    );
    expect(creditsContainer?.parentElement).toContainElement(
      screen.getByText('v1.3'),
    );

    const footerMetaContainer = screen.getByText('v1.3').parentElement;

    expect(footerMetaContainer).not.toHaveClass(
      'absolute',
      'bottom-4',
      'left-6',
      'sm:left-8',
    );
    expect(startLayout).toHaveClass('pt-6');
    expect(startLayout).not.toHaveClass('pt-10', 'py-10');
    expect(creditsContainer?.parentElement).not.toHaveClass('mt-6');
  });

  it('toggles advanced setup fields from the game setup panel', () => {
    render(<App />);

    const toggleButton = screen.getByRole('button', {
      name: 'Show Advanced Setup',
    });

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Token and Tile Factor')).toBeNull();
    expect(screen.queryByDisplayValue('v1-local-seed')).toBeNull();

    act(() => {
      fireEvent.click(toggleButton);
    });

    expect(
      screen.getByRole('button', { name: 'Hide Advanced Setup' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Token and Tile Factor')).toBeInTheDocument();
    expect(screen.getByText('1.0x')).toBeInTheDocument();
    expect(screen.getByDisplayValue('v1-local-seed')).toBeInTheDocument();

    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Hide Advanced Setup' }),
      );
    });

    expect(
      screen.getByRole('button', { name: 'Show Advanced Setup' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Token and Tile Factor')).toBeNull();
    expect(screen.queryByDisplayValue('v1-local-seed')).toBeNull();
  });

  it('updates the hero preview when a different hero is selected', () => {
    render(<App />);

    act(() => {
      fireEvent.change(screen.getByLabelText('Hero'), {
        target: { value: 'hero_witch' },
      });
    });

    expect(screen.getByRole('heading', { name: 'Witch' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Witch' })).toBeInTheDocument();
    expect(
      screen.getByText('May sacrifice 1 HP for +1 combat strength in a fight.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('May swap position with another player at turn start.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mage' })).toBeNull();
    expect(
      screen.queryByText('Fireball spells are not consumed.'),
    ).toBeNull();
  });

  it('updates the hero preview when seeress is selected', () => {
    render(<App />);

    act(() => {
      fireEvent.change(screen.getByLabelText('Hero'), {
        target: { value: 'hero_seeress' },
      });
    });

    expect(screen.getByRole('heading', { name: 'Seeress' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Seeress' })).toBeInTheDocument();
    expect(
      screen.getByText('Draws two room tokens and chooses one.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Gains +1 combat strength in a fight after the first step is spent.',
      ),
    ).toBeInTheDocument();
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
    expect(screen.getByText('v1.3 fnord GAMES 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprint' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Privacy Policy' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Center Map' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open settings menu' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: "Down in the Dragon's Lair" }),
    ).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Open settings menu' }));
    });

    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Music on' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sound on' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Movement Points on' }),
    ).toBeInTheDocument();
  });

  it('shows manual opponent checkboxes without the human hero and disables remaining picks at the limit', () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('radio', { name: 'Choose Opponents' }));
    });

    expect(screen.getByText('Opponents (0/1)')).toBeInTheDocument();
    expect(
      screen.queryByTestId('opponent-checkbox-hero_mage'),
    ).toBeNull();

    const rogueCheckbox = screen.getByTestId(
      'opponent-checkbox-hero_rogue',
    ) as HTMLInputElement;
    const bladeCheckbox = screen.getByTestId(
      'opponent-checkbox-hero_blade',
    ) as HTMLInputElement;

    expect(rogueCheckbox.disabled).toBe(false);
    expect(bladeCheckbox.disabled).toBe(false);

    act(() => {
      fireEvent.click(rogueCheckbox);
    });

    expect(screen.getByText('Opponents (1/1)')).toBeInTheDocument();
    expect(rogueCheckbox.checked).toBe(true);
    expect(bladeCheckbox.disabled).toBe(true);
    expect(bladeCheckbox.closest('label')).toHaveClass('text-stone-500');
  });

  it('fills unselected manual opponents randomly from remaining heroes on start', () => {
    render(<App />);

    act(() => {
      fireEvent.change(screen.getByLabelText('AI Opponents'), {
        target: { value: '2' },
      });
    });
    act(() => {
      fireEvent.click(screen.getByRole('radio', { name: 'Choose Opponents' }));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('opponent-checkbox-hero_rogue'));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    });

    expect(screen.getByLabelText('Dungeon board')).toBeInTheDocument();
    expect(
      useSetupStore.getState().gameState?.players.map((player) => player.heroId),
    ).toEqual(['hero_mage', 'hero_rogue', expect.any(String)]);
  });

  it('renders saved game actions under the logo instead of inside the game setup panel', () => {
    act(() => {
      useSetupStore.setState({ hasSavedGame: true });
    });
    render(<App />);

    const startHeader = screen
      .getByRole('button', { name: 'Open settings menu' })
      .closest('header');
    const startLayout = startHeader?.nextElementSibling;
    const leftColumn = startLayout?.firstElementChild;
    const gameSetupPanel = screen.getByRole('heading', {
      name: 'Game Setup',
    }).parentElement;
    const resumeButton = screen.getByRole('button', { name: 'Resume Game' });
    const discardButton = screen.getByRole('button', { name: 'Discard Save' });
    const savedGamePanel = screen.getByText('Saved game available').parentElement;
    const savedGameHeading = screen.getByText('Saved game available');

    expect(leftColumn).toContainElement(resumeButton);
    expect(leftColumn).toContainElement(discardButton);
    expect(gameSetupPanel).not.toContainElement(resumeButton);
    expect(gameSetupPanel).not.toContainElement(discardButton);
    expect(savedGamePanel).toHaveClass('border-stone-700', 'bg-stone-900/80', 'p-4');
    expect(savedGameHeading).toHaveClass('text-lg', 'font-semibold', 'text-amber-100');
  });

  it('lazy-loads and closes the imprint layer from the footer', async () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Imprint' }));
    });

    expect(screen.getByText('Loading legal notice...')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Information pursuant to § 5 DDG (German Digital Services Act)',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('Torsten Nordsiek')).toBeInTheDocument();
    expect(screen.getByText('Taigaweg 4')).toBeInTheDocument();
    expect(screen.getByText('33739 Bielefeld')).toBeInTheDocument();
    expect(screen.getByText('Phone: +49 (0)521 1648447')).toBeInTheDocument();
    expect(
      screen.getByText('E-mail: tnordsiek [at] web [dot] de'),
    ).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Close Imprint' }));
    });

    expect(screen.queryByText('Torsten Nordsiek')).toBeNull();
  });

  it('closes the legal panel when clicking outside it', async () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Imprint' }));
    });

    expect(await screen.findByText('Torsten Nordsiek')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Close Imprint' }));
    });

    expect(screen.queryByText('Torsten Nordsiek')).toBeNull();
  });

  it('switches between lazy-loaded legal panels from the footer', async () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Imprint' }));
    });

    expect(await screen.findByText('Torsten Nordsiek')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Privacy Policy' }));
    });

    expect(screen.queryByText('Torsten Nordsiek')).toBeNull();
    expect(
      await screen.findByText(
        'This Privacy Policy informs you about the processing of personal data when you play this browser game.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('E-mail: tnordsiek [at] web [dot] de'),
    ).toBeInTheDocument();
  });

  it('uses a viewport-safe legal panel for footer overlays', async () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Privacy Policy' }));
    });

    await screen.findByText(
      'This Privacy Policy informs you about the processing of personal data when you play this browser game.',
    );

    const panelHeading = screen.getAllByText('Privacy Policy')[0];
    const panel = panelHeading.parentElement;

    expect(panel).toHaveClass(
      'fixed',
      'left-1/2',
      '-translate-x-1/2',
      'sm:absolute',
      'sm:right-0',
      'sm:left-auto',
      'sm:translate-x-0',
      'w-[min(92vw,36rem)]',
      'max-w-[36rem]',
      'max-h-[min(75vh,36rem)]',
      'overflow-y-auto',
    );
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
    const actionPanel = actionsHeading.closest('section');
    const header = screen
      .getByRole('img', { name: "Down in the Dragon's Lair" })
      .closest('header');
    const centerMapButton = screen.getByRole('button', { name: 'Center Map' });
    const endTurnButton = screen.getByRole('button', { name: 'End Turn' });
    const settingsButton = screen.getByRole('button', {
      name: 'Open settings menu',
    });
    const leftHeaderCell = header?.firstElementChild;
    const centerHeaderCell = header?.children[1];
    const rightHeaderCell = header?.children[2];

    expect(layout).toHaveClass(
      'grid',
      'w-full',
      'lg:grid-cols-[minmax(0,1fr)_400px]',
    );
    expect(layout).not.toHaveClass('max-w-7xl');
    expect(sidebar).toHaveClass(
      'min-h-0',
      'lg:h-full',
      'lg:w-[400px]',
      'lg:justify-self-end',
      'lg:overflow-y-auto',
    );
    expect(header).toHaveClass('min-h-[72px]', 'pb-2', 'lg:h-[120px]');
    expect(leftHeaderCell).toContainElement(settingsButton);
    expect(leftHeaderCell).not.toContainElement(centerMapButton);
    expect(actionPanel).toContainElement(centerMapButton);
    expect(actionPanel).toContainElement(endTurnButton);
    expect(centerMapButton.className).toBe(endTurnButton.className);
    expect(screen.queryByRole('button', { name: 'New Game' })).toBeNull();
    expect(centerHeaderCell).toContainElement(
      screen.getByRole('img', { name: "Down in the Dragon's Lair" }),
    );
    expect(
      screen.getByRole('img', { name: "Down in the Dragon's Lair" }),
    ).toHaveClass(
      'max-h-[50px]',
      'w-auto',
      'object-contain',
      'lg:max-h-[108px]',
    );
    expect(rightHeaderCell).toHaveClass(
      'flex',
      'items-center',
      'justify-start',
      'gap-2',
      'lg:justify-end',
    );
    expect(header?.querySelector('.text-sm.text-stone-400')).toBeNull();
    expect(screen.queryByRole('img', { name: /Combat die \d:/ })).toBeNull();
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
      fireEvent.click(screen.getByRole('button', { name: 'Open settings menu' }));
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

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Open settings menu' }));
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    });

    expect(
      screen.getByRole('button', { name: 'Resume Game' }),
    ).toBeInTheDocument();
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

  it('rejects renamed-away hero ids from saved games without crashing the app', () => {
    window.localStorage.setItem(
      persistedGameStateKey,
      JSON.stringify({
        schemaVersion: 2,
        phase: 'turn_start',
        players: [
          {
            id: 'player_human',
            kind: 'human',
            heroId: 'hero_swordsman',
          },
        ],
        board: [],
        tileStack: [],
        tokenBag: [],
        activePlayerIndex: 0,
        remainingSteps: 4,
        eventLog: [],
        rng: { seed: 'legacy', state: 1 },
      }),
    );

    act(() => {
      useSetupStore.getState().resumeSavedGame();
    });
    render(<App />);

    expect(
      screen.getByText('Unsupported heroId in saved game: hero_swordsman'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Dungeon board')).toBeNull();
  });

  it('keeps menu toggle state consistent between start and game screens', () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Open settings menu' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Music on' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sound on' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Movement Points on' }));
    });

    expect(screen.getByRole('button', { name: 'Music off' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sound off' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Movement Points off' }),
    ).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Open settings menu' }));
    });

    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Music off' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sound off' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Movement Points off' }),
    ).toBeInTheDocument();
  });

  it('starts a game with the scaled tile and token pools selected on the setup screen', () => {
    render(<App />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Show Advanced Setup' }));
    });
    act(() => {
      fireEvent.change(screen.getByLabelText('Token and Tile Factor'), {
        target: { value: '1.5' },
      });
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    });

    expect(screen.getByLabelText('Dungeon board')).toBeInTheDocument();
    expect(useSetupStore.getState().gameState?.tileStack).toHaveLength(121);
    expect(useSetupStore.getState().gameState?.tokenBag).toHaveLength(80);
  });
});
