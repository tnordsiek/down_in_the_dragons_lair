import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HeroId } from '../../engine/core/types';
import { applyGameAction } from '../../engine/core/actions';
import { createNewGame } from '../../engine/setup/createGame';
import type { GameState } from '../../engine/core/types';
import { ActionPanel } from './ActionPanel';
import { BoardView } from './BoardView';
import { EndScreen } from './EndScreen';
import { EventLog } from './EventLog';
import { GameScreen } from '../screens/GameScreen';
import { PlayerPanel } from './PlayerPanel';
import { useSetupStore } from '../../state/setupStore';
import { getBoardSelectableHealingPositions } from './boardViewUtils';
import { heroName } from '../labels';

const noopActions = {
  healingSpellSelection: { mode: 'idle' as const },
  witchSwapSelection: { mode: 'idle' as const },
  onCancelHealingSpellSelection: vi.fn(),
  onBeginLoot: vi.fn(),
  onCancelWitchSwapSelection: vi.fn(),
  onLeaveLoot: vi.fn(),
  onFocusPortalTarget: vi.fn(),
  onMove: vi.fn(),
  onExplore: vi.fn(),
  onChooseSeeressRoomToken: vi.fn(),
  onStartOptionalCombat: vi.fn(),
  onResolveCombat: vi.fn(),
  onSelectCurseTarget: vi.fn(),
  onUseBladeReroll: vi.fn(),
  onUseValkyrieReroll: vi.fn(),
  onDeclineValkyrieReroll: vi.fn(),
  onUseWitchSacrifice: vi.fn(),
  onDeclineWitchSacrifice: vi.fn(),
  onResolveCombatWithoutFlameSpells: vi.fn(),
  onResolveCombatWithFlameSpells: vi.fn(),
  onSelectHealingSpellTarget: vi.fn(),
  onSelectWitchSwapTarget: vi.fn(),
  onStartHealingSpellSelection: vi.fn(),
  onStartWitchSwapSelection: vi.fn(),
  onSwapLoot: vi.fn(),
  onTakeLoot: vi.fn(),
  onOpenChest: vi.fn(),
  onEndTurn: vi.fn(),
};

describe('Milestone 6 UI', () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    useSetupStore.setState({
      gameState: undefined,
      hasSavedGame: false,
      lastError: undefined,
    });
  });

  it('shows legal known movement and exploration choices', () => {
    const state = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-north',
          blueprintId: 'tunnel_straight',
          rotation: 0,
          boardX: 0,
          boardY: -1,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(screen.getByText('Move')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'North' })).toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'East' })).toBeInTheDocument();
  });

  it('shows legal placement rotations for a pending tile', () => {
    const state = createUiState({
      phase: 'choose_pending_tile_rotation',
      pendingTile: {
        origin: { boardX: 0, boardY: 0 },
        target: { boardX: 1, boardY: 0 },
        direction: 'B',
        blueprintId: 'room_corner',
        previewRotation: 0,
        legalRotations: [0, 90],
        skippedBlueprintIds: [],
      },
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(screen.getByText('room_corner')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rotate the preview tile on the board, then confirm placement in the center of the tile.',
      ),
    ).toBeInTheDocument();
  });

  it('disables ending the turn while room resolution is pending', () => {
    const state = createUiState({
      phase: 'resolve_room_token',
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(screen.getByRole('button', { name: 'End Turn' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Resolve Room' }),
    ).toBeNull();
  });

  it('disables ending the turn while a pending tile rotation must be confirmed', () => {
    const state = createUiState({
      phase: 'choose_pending_tile_rotation',
      pendingTile: {
        origin: { boardX: 0, boardY: 0 },
        target: { boardX: 1, boardY: 0 },
        direction: 'B',
        blueprintId: 'room_corner',
        previewRotation: 0,
        legalRotations: [0, 90],
        skippedBlueprintIds: [],
      },
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(screen.getByRole('button', { name: 'End Turn' })).toBeDisabled();
  });

  it('shows a pending tile on the board in default orientation before placement', () => {
    const state = createUiState({
      phase: 'choose_pending_tile_rotation',
      pendingTile: {
        origin: { boardX: 0, boardY: 0 },
        target: { boardX: 1, boardY: 0 },
        direction: 'B',
        blueprintId: 'room_corner',
        previewRotation: 0,
        legalRotations: [90, 180],
        skippedBlueprintIds: [],
      },
    });

    render(<BoardView state={state} />);

    expect(
      screen.getByRole('img', { name: 'room_corner preview' }),
    ).toHaveAttribute('src', '/assets/tiles/tile_room_corner.png');
    expect(
      screen.getByRole('img', { name: 'room_corner preview' }),
    ).toHaveAttribute('style', expect.stringContaining('rotate(0deg)'));
    expect(screen.queryByText('Preview')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Confirm tile rotation' }),
    ).toBeDisabled();
  });

  it('shows an unconscious skip-turn hint in the action panel', () => {
    const state = createUiState({
      phase: 'turn_skip',
      remainingSteps: 0,
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hp: 0,
              skipNextTurn: true,
            }
          : player,
      ),
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(screen.getByText('Unconscious')).toBeInTheDocument();
    expect(
      screen.getByText('This hero is unconscious and must skip this turn.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'End the turn to finish the skipped round and recover afterward.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End Turn' })).toBeEnabled();
  });

  it('rotates a pending tile preview through board controls and confirms valid rotations', () => {
    const state = createUiState({
      phase: 'choose_pending_tile_rotation',
      pendingTile: {
        origin: { boardX: 0, boardY: 0 },
        target: { boardX: 1, boardY: 0 },
        direction: 'B',
        blueprintId: 'room_corner',
        previewRotation: 180,
        legalRotations: [90, 180],
        skippedBlueprintIds: [],
      },
    });
    const onRotatePendingTile = vi.fn();
    const onConfirmPendingTile = vi.fn();

    render(
      <BoardView
        state={state}
        onConfirmPendingTile={onConfirmPendingTile}
        onRotatePendingTile={onRotatePendingTile}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Rotate tile counterclockwise' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Rotate tile clockwise' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm tile rotation' }),
    );

    expect(onRotatePendingTile).toHaveBeenNthCalledWith(1, 'counterclockwise');
    expect(onRotatePendingTile).toHaveBeenNthCalledWith(2, 'clockwise');
    expect(onConfirmPendingTile).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: 'Confirm tile rotation' }),
    ).toBeEnabled();
    expect(
      screen
        .getByRole('img', { name: 'room_corner preview' })
        .closest('[data-asset-id="tile_room_corner"]')
        ?.querySelector('[data-asset-id="hero_mage_token"]'),
    ).toBeNull();
  });

  it('keeps pending tile rotation controls screen-sized and clickable while the board is zoomed', () => {
    const state = createUiState({
      phase: 'choose_pending_tile_rotation',
      pendingTile: {
        origin: { boardX: 0, boardY: 0 },
        target: { boardX: 1, boardY: 0 },
        direction: 'B',
        blueprintId: 'room_corner',
        previewRotation: 0,
        legalRotations: [0, 90],
        skippedBlueprintIds: [],
      },
    });
    const onRotatePendingTile = vi.fn();

    render(
      <BoardView state={state} onRotatePendingTile={onRotatePendingTile} />,
    );

    const board = screen.getByLabelText('Dungeon board');

    for (let index = 0; index < 20; index += 1) {
      fireEvent.wheel(board, { deltaY: -100 });
    }

    expect(
      screen.getByRole('button', { name: 'Rotate tile clockwise' }),
    ).toHaveAttribute('style', expect.stringContaining('width: 6px'));
    expect(
      screen.getByRole('button', { name: 'Confirm tile rotation' }),
    ).toHaveAttribute('style', expect.stringContaining('width: 6px'));

    fireEvent.click(
      screen.getByRole('button', { name: 'Rotate tile clockwise' }),
    );

    expect(onRotatePendingTile).toHaveBeenCalledOnce();
    expect(onRotatePendingTile).toHaveBeenCalledWith('clockwise');
  });

  it('shows combat math and loot state', () => {
    const state = createUiState({
      phase: 'combat',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
      eventLog: [
        {
          id: 'event-combat',
          type: 'combat_resolved',
          message: 'Resolved combat and defeated Kitchen Rat',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (Human)',
          combat: {
            monsterId: 'kitchen_rat',
            monsterStrength: 5,
            dice: [6, 4],
            total: 14,
            outcome: 'victory',
            weaponBonus: 2,
            flameSpellCount: 1,
            warlockSacrificeBonus: 0,
            oracleBonus: 1,
          },
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: {
                keyCount: 1,
                weapons: [{ type: 'weapon', bonus: 2 }],
                spells: [{ type: 'spell', spellKind: 'flame' }],
              },
              treasurePoints: 7,
              isCursed: true,
              skipNextTurn: true,
            }
          : player,
      ),
    });

    render(<ActionPanel state={state} {...noopActions} />);
    render(<PlayerPanel state={state} />);
    render(<EventLog state={state} />);

    expect(screen.getByText('Kitchen Rat strength 5')).toBeInTheDocument();
    expect(screen.getByText(/2d6 \+ weapons \+2/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Resolve Combat' }),
    ).toBeInTheDocument();
    expect(screen.getByText('7 pts')).toBeInTheDocument();
    expect(screen.getByText('Mage (Human)')).toBeInTheDocument();
    expect(
      screen.getByText('Resolved combat: Victory'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Kitchen Rat strength 5 · dice 6 + 4 · total 14'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('weapons +2 · flame +1 · seeress +1'),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Key' })).toHaveAttribute(
      'src',
      '/assets/items/item_key.png',
    );
    expect(screen.getByRole('img', { name: 'Sword +2' })).toHaveAttribute(
      'src',
      '/assets/items/item_sword_2.png',
    );
    expect(screen.getByRole('img', { name: 'Fireball spell' })).toHaveAttribute(
      'src',
      '/assets/items/item_spell_flame.png',
    );
    expect(screen.getByRole('img', { name: 'cursed' })).toHaveAttribute(
      'src',
      '/assets/status/status_curse.png',
    );
    expect(screen.getByRole('img', { name: 'unconscious' })).toHaveAttribute(
      'src',
      '/assets/status/status_unconscious.png',
    );
  });

  it('shows Seeress Sight +1 in the pre-roll combat overview when the seeress bonus is active', () => {
    const state = createUiState({
      phase: 'combat',
      remainingSteps: 3,
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
      players: createUiState().players.map((player, index) =>
        index === 0 ? { ...player, heroId: 'hero_seeress' } : player,
      ),
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(
      screen.getByText(
        '2d6 + weapons +0 + Seeress Sight +1 + fireball spells (0 available) must beat 5',
      ),
    ).toBeInTheDocument();
  });

  it('does not show Seeress Sight +1 in the pre-roll combat overview after the first step window has passed', () => {
    const state = createUiState({
      phase: 'combat',
      remainingSteps: 2,
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
      players: createUiState().players.map((player, index) =>
        index === 0 ? { ...player, heroId: 'hero_seeress' } : player,
      ),
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(
      screen.getByText('2d6 + weapons +0 + fireball spells (0 available) must beat 5'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Seeress Sight \+1/)).toBeNull();
  });

  it('does not show Seeress Sight +1 in the pre-roll combat overview while the seeress is cursed', () => {
    const state = createUiState({
      phase: 'combat',
      remainingSteps: 3,
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? { ...player, heroId: 'hero_seeress', isCursed: true }
          : player,
      ),
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(
      screen.getByText('2d6 + weapons +0 + fireball spells (0 available) must beat 5'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Seeress Sight \+1/)).toBeNull();
  });

  it('shows mummified_priest curse target choices for another hero and excludes the active player', () => {
    const state = createUiState({
      phase: 'combat_curse_target',
      combat: {
        playerId: 'player_human',
        monsterId: 'mummified_priest',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
    });
    const onSelectCurseTarget = vi.fn();

    render(
      <ActionPanel
        state={state}
        {...noopActions}
        onSelectCurseTarget={onSelectCurseTarget}
      />,
    );

    expect(screen.getByText('Mummified Priest Curse')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Mummified Priest defeated. Choose another hero to receive the curse.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rogue' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mage' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Rogue' }));

    expect(onSelectCurseTarget).toHaveBeenCalledWith('player_ai_1');
  });

  it('renders the chosen mummified_priest curse target in the event log with a player label', () => {
    const state = createUiState({
      eventLog: [
        {
          id: 'event-curse',
          type: 'combat_resolved',
          message: 'Resolved combat and defeated Mummified Priest',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (Human)',
          combat: {
            monsterId: 'mummified_priest',
            monsterStrength: 7,
            dice: [6, 4],
            total: 10,
            outcome: 'victory',
            weaponBonus: 0,
            flameSpellCount: 0,
            warlockSacrificeBonus: 0,
            oracleBonus: 0,
            curseTargetPlayerId: 'player_ai_1',
            curseTargetPlayerLabel: 'Rogue (AI 1)',
          },
        },
      ],
    });

    render(<EventLog state={state} />);

    expect(
      screen.getByText(/curse -> Rogue \(AI 1\)/),
    ).toBeInTheDocument();
  });

  it('renders start-player rolls and tiebreaks inside a single game-start log entry', () => {
    const state = createUiState({
      eventLog: [
        {
          id: 'event-start',
          type: 'game_started',
          message: 'Game started. Mage (Human) takes the first turn.',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (Human)',
          startPlayer: {
            rounds: [
              {
                roundType: 'initial',
                rolls: [
                  {
                    playerId: 'player_human',
                    playerHeroId: 'hero_mage',
                    playerLabel: 'Mage (Human)',
                    roll: 6,
                  },
                  {
                    playerId: 'player_ai_1',
                    playerHeroId: 'hero_rogue',
                    playerLabel: 'Rogue (AI 1)',
                    roll: 6,
                  },
                  {
                    playerId: 'player_ai_2',
                    playerHeroId: 'hero_valkyrie',
                    playerLabel: 'Valkyrie (AI 2)',
                    roll: 2,
                  },
                ],
              },
              {
                roundType: 'tiebreak',
                rolls: [
                  {
                    playerId: 'player_human',
                    playerHeroId: 'hero_mage',
                    playerLabel: 'Mage (Human)',
                    roll: 5,
                  },
                  {
                    playerId: 'player_ai_1',
                    playerHeroId: 'hero_rogue',
                    playerLabel: 'Rogue (AI 1)',
                    roll: 3,
                  },
                ],
              },
            ],
          },
        },
      ],
    });
    const { container } = render(<EventLog state={state} />);
    const entries = Array.from(container.querySelectorAll('ol > li'));

    expect(entries).toHaveLength(1);
    expect(screen.getByText('Mage takes the first turn')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Start rolls: Mage (Human) 6 · Rogue (AI 1) 6 · Valkyrie (AI 2) 2',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tiebreak 1: Mage (Human) 5 · Rogue (AI 1) 3'),
    ).toBeInTheDocument();
  });

  it('shows a start-player overlay with roll tables and turn order before the game begins', () => {
    const baseState = createUiStateWithPlayerCount(3, [
      'hero_mage',
      'hero_rogue',
      'hero_valkyrie',
    ]);
    const state: GameState = {
      ...baseState,
      activePlayerIndex: 1,
      eventLog: [
        {
          id: 'event-start',
          type: 'game_started',
          message: 'Game started. Rogue (AI 1) takes the first turn.',
          playerId: 'player_ai_1',
          playerHeroId: 'hero_rogue',
          playerLabel: 'Rogue (AI 1)',
          startPlayer: {
            rounds: [
              {
                roundType: 'initial' as const,
                rolls: [
                  {
                    playerId: 'player_human',
                    playerHeroId: 'hero_mage',
                    playerLabel: 'Mage (Human)',
                    roll: 4,
                  },
                  {
                    playerId: 'player_ai_1',
                    playerHeroId: 'hero_rogue',
                    playerLabel: 'Rogue (AI 1)',
                    roll: 6,
                  },
                  {
                    playerId: 'player_ai_2',
                    playerHeroId: 'hero_valkyrie',
                    playerLabel: 'Valkyrie (AI 2)',
                    roll: 6,
                  },
                ],
              },
              {
                roundType: 'tiebreak' as const,
                rolls: [
                  {
                    playerId: 'player_ai_1',
                    playerHeroId: 'hero_rogue',
                    playerLabel: 'Rogue (AI 1)',
                    roll: 5,
                  },
                  {
                    playerId: 'player_ai_2',
                    playerHeroId: 'hero_valkyrie',
                    playerLabel: 'Valkyrie (AI 2)',
                    roll: 2,
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    const overlay = screen.getByTestId('start-player-overlay');
    const tables = within(overlay).getAllByRole('table');

    expect(
      within(overlay).getByRole('heading', { name: 'Rogue begins the game' }),
    ).toBeInTheDocument();
    expect(
      within(overlay).getByText('Click anywhere to begin'),
    ).toBeInTheDocument();
    expect(tables).toHaveLength(3);
    expect(
      within(tables[0]).getByRole('columnheader', { name: 'Player' }),
    ).toBeInTheDocument();
    expect(within(tables[0]).getByText('Human')).toBeInTheDocument();
    expect(within(tables[0]).getByText('Mage')).toBeInTheDocument();
    expect(within(tables[0]).getByText('4')).toBeInTheDocument();
    expect(within(tables[1]).getByText('Valkyrie')).toBeInTheDocument();
    expect(within(tables[2]).getByText('1')).toBeInTheDocument();
    expect(within(tables[2]).getByText('AI 1')).toBeInTheDocument();
    expect(within(tables[2]).getByText('Rogue')).toBeInTheDocument();
    expect(within(tables[2]).getByText('2')).toBeInTheDocument();
    expect(within(tables[2]).getByText('AI 2')).toBeInTheDocument();
    expect(within(tables[2]).getByText('3')).toBeInTheDocument();
    expect(within(tables[2]).getByText('Human')).toBeInTheDocument();
  });

  it('dismisses the start-player overlay on click and only then allows AI auto-play', () => {
    vi.useFakeTimers();

    const baseState = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const state = {
      ...baseState,
      activePlayerIndex: 1,
      phase: 'turn_start' as const,
      players: baseState.players.map((player, index) =>
        index === 0
          ? { ...player, position: { boardX: 1, boardY: 0 } }
          : { ...player, position: { boardX: 0, boardY: 0 } },
      ),
    };

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(useSetupStore.getState().gameState?.pendingTile).toBeUndefined();

    fireEvent.click(screen.getByTestId('start-player-overlay'));
    expect(screen.queryByTestId('start-player-overlay')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(useSetupStore.getState().gameState?.pendingTile).toBeDefined();
  });

  it('shows the latest resolved combat dice as header images', () => {
    const state = createUiState({
      phase: 'await_move',
      eventLog: [
        {
          id: 'event-combat-old',
          type: 'combat_resolved',
          message: 'Resolved combat against Kitchen Rat',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (Human)',
          combat: {
            monsterId: 'kitchen_rat',
            monsterStrength: 5,
            dice: [1, 2],
            total: 6,
            outcome: 'victory',
            weaponBonus: 0,
            flameSpellCount: 0,
            warlockSacrificeBonus: 0,
            oracleBonus: 0,
          },
        },
        {
          id: 'event-combat-new',
          type: 'combat_resolved',
          message: 'Resolved combat against Creepy Spider',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (Human)',
          combat: {
            monsterId: 'creepy_spider',
            monsterStrength: 7,
            dice: [6, 4],
            total: 10,
            outcome: 'victory',
            weaponBonus: 0,
            flameSpellCount: 0,
            warlockSacrificeBonus: 0,
            oracleBonus: 0,
          },
        },
      ],
    });

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    expect(screen.getByLabelText('Latest combat dice')).toHaveClass('items-center');
    expect(screen.getByRole('img', { name: 'Combat die 1: 6' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_06.png',
    );
    expect(screen.getByRole('img', { name: 'Combat die 1: 6' })).toHaveClass(
      'max-h-[108px]',
      'w-auto',
    );
    expect(screen.getByRole('img', { name: 'Combat die 2: 4' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_04.png',
    );
    expect(
      screen.getByRole('img', { name: "Down in the Dragon's Lair" }),
    ).toHaveClass('max-h-[108px]');
  });

  it('shows the pending blade reroll dice in the header before combat resolves', () => {
    const state = createUiState({
      phase: 'combat_blade_reroll',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [1, 4],
        rolledDice: [1, 4],
        bladeRerollCount: 0,
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_blade',
            }
          : player,
      ),
      eventLog: [
        {
          id: 'event-combat-old',
          type: 'combat_resolved',
          message: 'Resolved combat against Kitchen Rat',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (Human)',
          combat: {
            monsterId: 'kitchen_rat',
            monsterStrength: 5,
            dice: [6, 6],
            total: 12,
            outcome: 'victory',
            weaponBonus: 0,
            flameSpellCount: 0,
            warlockSacrificeBonus: 0,
            oracleBonus: 0,
          },
        },
      ],
    });

    render(<GameScreen />);
    act(() => {
      useSetupStore.setState({ gameState: state });
    });

    expect(screen.getByRole('img', { name: 'Combat die 1: 1' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_01.png',
    );
    expect(screen.getByRole('img', { name: 'Combat die 2: 4' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_04.png',
    );
  });

  it('updates the header dice after a partial blade reroll', () => {
    const state = createUiState({
      phase: 'combat_blade_reroll',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [1, 1],
        rolledDice: [1, 6],
        bladeRerollCount: 1,
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_blade',
            }
          : player,
      ),
      eventLog: [
        {
          id: 'event-combat-old',
          type: 'combat_resolved',
          message: 'Resolved combat against Kitchen Rat',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (Human)',
          combat: {
            monsterId: 'kitchen_rat',
            monsterStrength: 5,
            dice: [2, 3],
            total: 5,
            outcome: 'draw',
            weaponBonus: 0,
            flameSpellCount: 0,
            warlockSacrificeBonus: 0,
            oracleBonus: 0,
          },
        },
      ],
    });

    render(<GameScreen />);
    act(() => {
      useSetupStore.setState({ gameState: state });
    });

    expect(screen.getByRole('img', { name: 'Combat die 1: 1' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_01.png',
    );
    expect(screen.getByRole('img', { name: 'Combat die 2: 6' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_06.png',
    );
  });

  it('shows valkyrie reroll dice in the header while the reroll choice is pending', () => {
    const state = createUiState({
      phase: 'combat_valkyrie_reroll',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [2, 3],
        initialBaseOutcome: 'draw',
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_valkyrie',
            }
          : player,
      ),
      eventLog: [
        {
          id: 'event-combat-old',
          type: 'combat_resolved',
          message: 'Resolved combat against Kitchen Rat',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (Human)',
          combat: {
            monsterId: 'kitchen_rat',
            monsterStrength: 5,
            dice: [6, 6],
            total: 12,
            outcome: 'victory',
            weaponBonus: 0,
            flameSpellCount: 0,
            warlockSacrificeBonus: 0,
            oracleBonus: 0,
          },
        },
      ],
    });

    render(<GameScreen />);
    act(() => {
      useSetupStore.setState({ gameState: state });
    });

    expect(screen.getByRole('img', { name: 'Combat die 1: 2' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_02.png',
    );
    expect(screen.getByRole('img', { name: 'Combat die 2: 3' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_03.png',
    );
  });

  it('shows witch sacrifice dice in the header while the sacrifice choice is pending', () => {
    const state = createUiState({
      phase: 'combat_witch_sacrifice',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [2, 3],
        initialBaseOutcome: 'draw',
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_witch',
            }
          : player,
      ),
      eventLog: [
        {
          id: 'event-combat-old',
          type: 'combat_resolved',
          message: 'Resolved combat against Kitchen Rat',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (Human)',
          combat: {
            monsterId: 'kitchen_rat',
            monsterStrength: 5,
            dice: [6, 6],
            total: 12,
            outcome: 'victory',
            weaponBonus: 0,
            flameSpellCount: 0,
            warlockSacrificeBonus: 0,
            oracleBonus: 0,
          },
        },
      ],
    });

    render(<GameScreen />);
    act(() => {
      useSetupStore.setState({ gameState: state });
    });

    expect(screen.getByRole('img', { name: 'Combat die 1: 2' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_02.png',
    );
    expect(screen.getByRole('img', { name: 'Combat die 2: 3' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_03.png',
    );
  });

  it('shows flame spell prompt dice in the header while flame spell choice is pending', () => {
    const state = createUiState({
      phase: 'combat_flame_spells',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        rolledDice: [2, 3],
        pendingBaseOutcome: 'draw',
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_valkyrie',
            }
          : player,
      ),
      eventLog: [
        {
          id: 'event-combat-old',
          type: 'combat_resolved',
          message: 'Resolved combat against Kitchen Rat',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (Human)',
          combat: {
            monsterId: 'kitchen_rat',
            monsterStrength: 5,
            dice: [6, 6],
            total: 12,
            outcome: 'victory',
            weaponBonus: 0,
            flameSpellCount: 0,
            warlockSacrificeBonus: 0,
            oracleBonus: 0,
          },
        },
      ],
    });

    render(<GameScreen />);
    act(() => {
      useSetupStore.setState({ gameState: state });
    });

    expect(screen.getByRole('img', { name: 'Combat die 1: 2' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_02.png',
    );
    expect(screen.getByRole('img', { name: 'Combat die 2: 3' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_03.png',
    );
  });

  it('disables End Turn during unresolved combat prompts but keeps it available before optional rogue combat', () => {
    const combatState = createUiState({
      phase: 'combat',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
    });
    const swordswomanState = createUiState({
      phase: 'combat_blade_reroll',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [1, 4],
        rolledDice: [1, 4],
        bladeRerollCount: 0,
      },
      players: createUiState().players.map((player, index) =>
        index === 0 ? { ...player, heroId: 'hero_blade' } : player,
      ),
    });
    const warriorState = createUiState({
      phase: 'combat_valkyrie_reroll',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [2, 3],
        initialBaseOutcome: 'draw',
      },
      players: createUiState().players.map((player, index) =>
        index === 0 ? { ...player, heroId: 'hero_valkyrie' } : player,
      ),
    });
    const warlockState = createUiState({
      phase: 'combat_witch_sacrifice',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [2, 3],
        initialBaseOutcome: 'draw',
      },
      players: createUiState().players.map((player, index) =>
        index === 0 ? { ...player, heroId: 'hero_witch' } : player,
      ),
    });
    const flameState = createUiState({
      phase: 'combat_flame_spells',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        rolledDice: [2, 3],
        pendingBaseOutcome: 'draw',
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_valkyrie',
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'flame' }],
              },
            }
          : player,
      ),
    });
    const thiefState = createUiState({
      phase: 'optional_monster_combat',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
      board: [
        {
          ...createUiState().board[0],
          roomToken: { id: 'kitchen_rat', kind: 'monster' },
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0 ? { ...player, heroId: 'hero_rogue' } : player,
      ),
    });

    const { rerender } = render(<ActionPanel state={combatState} {...noopActions} />);
    expect(screen.getByRole('button', { name: 'End Turn' })).toBeDisabled();

    rerender(<ActionPanel state={swordswomanState} {...noopActions} />);
    expect(screen.getByRole('button', { name: 'End Turn' })).toBeDisabled();

    rerender(<ActionPanel state={warriorState} {...noopActions} />);
    expect(screen.getByRole('button', { name: 'End Turn' })).toBeDisabled();

    rerender(<ActionPanel state={warlockState} {...noopActions} />);
    expect(screen.getByRole('button', { name: 'End Turn' })).toBeDisabled();

    rerender(<ActionPanel state={flameState} {...noopActions} />);
    expect(screen.getByRole('button', { name: 'End Turn' })).toBeDisabled();

    rerender(<ActionPanel state={thiefState} {...noopActions} />);
    expect(screen.getByRole('button', { name: 'End Turn' })).toBeEnabled();
  });

  it('shows the witch sacrifice bonus in the flame spell combat math after sacrificing', () => {
    const state = createUiState({
      phase: 'combat_flame_spells',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        rolledDice: [2, 2],
        pendingBaseOutcome: 'draw',
        pendingWitchSacrificeBonus: 1,
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_witch',
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'flame' }],
              },
            }
          : player,
      ),
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(
      screen.getByText(
        'Rolled 2 + 2 + weapons 0 + sacrifice 1 = 5 and currently face draw',
      ),
    ).toBeInTheDocument();
  });

  it('offers the blade reroll in the real GameScreen flow after resolving a 1', () => {
    const state = createUiState({
      phase: 'combat',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_blade',
            }
          : player,
      ),
    });

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    act(() => {
      useSetupStore.getState().dispatch({ type: 'resolveCombat', dice: [1, 4] });
    });

    expect(screen.getByRole('button', { name: 'Reroll 1s' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Combat die 1: 1' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_01.png',
    );
    expect(screen.getByRole('img', { name: 'Combat die 2: 4' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_04.png',
    );
  });

  it('keeps offering the blade reroll in the real GameScreen flow after a partial reroll', () => {
    const state = createUiState({
      phase: 'combat',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_blade',
            }
          : player,
      ),
    });

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    act(() => {
      useSetupStore.getState().dispatch({ type: 'resolveCombat', dice: [1, 1] });
    });
    act(() => {
      useSetupStore.getState().dispatch({
        type: 'useBladeReroll',
        dice: [1, 6],
      });
    });

    expect(screen.getByRole('button', { name: 'Reroll 1s' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Combat die 1: 1' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_01.png',
    );
    expect(screen.getByRole('img', { name: 'Combat die 2: 6' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_06.png',
    );
  });

  it('shows valkyrie pending dice in the real GameScreen flow after a rolled draw', () => {
    const state = createUiState({
      phase: 'combat',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_valkyrie',
            }
          : player,
      ),
    });

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    act(() => {
      useSetupStore.getState().dispatch({ type: 'resolveCombat', dice: [2, 3] });
    });

    expect(
      screen.getByRole('button', { name: 'Reroll both dice' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Combat die 1: 2' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_02.png',
    );
    expect(screen.getByRole('img', { name: 'Combat die 2: 3' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_03.png',
    );
  });

  it('shows witch pending dice in the real GameScreen flow after a rolled draw', () => {
    const state = createUiState({
      phase: 'combat',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_witch',
            }
          : player,
      ),
    });

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    act(() => {
      useSetupStore.getState().dispatch({ type: 'resolveCombat', dice: [2, 3] });
    });

    expect(
      screen.getByRole('button', { name: 'Sacrifice 1 HP for +1' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Combat die 1: 2' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_02.png',
    );
    expect(screen.getByRole('img', { name: 'Combat die 2: 3' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_03.png',
    );
  });

  it('shows flame spell pending dice in the real GameScreen flow after a rolled draw', () => {
    const state = createUiState({
      phase: 'combat',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_mage',
              isCursed: true,
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'flame' }],
              },
            }
          : player,
      ),
    });

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    act(() => {
      useSetupStore.getState().dispatch({ type: 'resolveCombat', dice: [2, 3] });
    });

    expect(
      screen.getByRole('button', { name: 'Do not use fireball spells' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Combat die 1: 2' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_02.png',
    );
    expect(screen.getByRole('img', { name: 'Combat die 2: 3' })).toHaveAttribute(
      'src',
      '/assets/ui/ui_dice_03.png',
    );
  });

  it('renders mapped hero and monster images on the board', () => {
    const state = createUiState({
      board: [
        {
          ...baseBoard()[0],
          rotation: 90,
          roomToken: { id: 'kitchen_rat', kind: 'monster' },
        },
      ],
    });

    render(<BoardView state={state} />);

    expect(
      screen.getByRole('img', { name: 'start_cross_healing' }),
    ).toHaveAttribute('src', '/assets/tiles/tile_start_cross_healing.png');
    expect(
      screen.getByRole('img', { name: 'start_cross_healing' }),
    ).toHaveAttribute('style', expect.stringContaining('rotate(90deg)'));
    expect(screen.getByRole('img', { name: 'Mage' })).toHaveAttribute(
      'src',
      '/assets/heroes/token_hero_mage.png',
    );
    expect(screen.getByRole('img', { name: 'Kitchen Rat' })).toHaveAttribute(
      'src',
      '/assets/monsters/token_kitchen_rat.png',
    );
    expect(
      screen
        .getByRole('img', { name: 'Kitchen Rat' })
        .closest('[data-asset-id="token_kitchen_rat"]'),
    ).toHaveAttribute('title', 'Kitchen Rat: Strength 5');
  });

  it('renders the dungeon grid with 1px gray separators and no tile padding', () => {
    const state = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    render(<BoardView state={state} />);

    const grid = screen.getByTestId('board-grid');
    const occupiedCell = getBoardCell('0,0');

    expect(grid).toHaveClass('grid', 'gap-px', 'bg-stone-500');
    expect(occupiedCell).toHaveClass('aspect-square', 'min-h-16', 'bg-stone-800');
    expect(occupiedCell).not.toHaveClass('border', 'p-1');
  });

  it('stacks multiple hero tokens from the top of the tile and keeps the active player in front', () => {
    const baseState = createUiStateWithPlayerCount(3, [
      'hero_mage',
      'hero_valkyrie',
      'hero_seeress',
    ]);
    const state = {
      ...baseState,
      activePlayerIndex: 2,
      players: baseState.players.map((player) => ({
        ...player,
        position: { boardX: 0, boardY: 0 },
      })),
    };

    render(<BoardView state={state} />);

    const stack = screen.getByTestId('hero-stack');
    const mageEntry = screen.getByTestId('hero-stack-entry-player_human');
    const warriorEntry = screen.getByTestId('hero-stack-entry-player_ai_1');
    const oracleEntry = screen.getByTestId('hero-stack-entry-player_ai_2');

    expect(stack).toHaveClass('absolute', 'left-1', 'top-1');
    expect(mageEntry).toHaveAttribute(
      'style',
      expect.stringContaining('top: 0px;'),
    );
    expect(warriorEntry).toHaveAttribute(
      'style',
      expect.stringContaining('top: 12px;'),
    );
    expect(oracleEntry).toHaveAttribute(
      'style',
      expect.stringContaining('top: 24px;'),
    );
    expect(mageEntry).toHaveAttribute(
      'style',
      expect.stringContaining('z-index: 1;'),
    );
    expect(oracleEntry).toHaveAttribute(
      'style',
      expect.stringContaining('z-index: 3;'),
    );
  });

  it('keeps stacked hero tokens compact for larger player counts', () => {
    const baseState = createUiStateWithPlayerCount(5, [
      'hero_mage',
      'hero_valkyrie',
      'hero_witch',
      'hero_rogue',
      'hero_seeress',
    ]);
    const state = {
      ...baseState,
      activePlayerIndex: 4,
      players: baseState.players.map((player) => ({
        ...player,
        position: { boardX: 0, boardY: 0 },
      })),
    };

    render(<BoardView state={state} />);

    expect(screen.getByTestId('hero-stack-entry-player_ai_3')).toHaveAttribute(
      'style',
      expect.stringContaining('top: 30px;'),
    );
    expect(
      screen
        .getByRole('img', { name: 'Mage' })
        .closest('[data-asset-id="hero_mage_token"]'),
    ).toHaveAttribute(
      'style',
      expect.stringContaining('height: 28px; width: 28px;'),
    );
  });

  it('renders visible loose item graphics on board tiles', () => {
    const state = createUiState({
      board: [
        {
          ...baseBoard()[0],
          looseItems: [{ type: 'weapon', bonus: 2 }],
        },
      ],
    });

    render(<BoardView state={state} />);

    expect(screen.getByRole('img', { name: 'Sword +2' })).toHaveAttribute(
      'src',
      '/assets/items/item_sword_2.png',
    );
    expect(
      screen
        .getByRole('img', { name: 'Sword +2' })
        .closest('[data-asset-id="item_weapon_2"]'),
    ).toHaveAttribute('title', 'Sword +2: Combat bonus +2');
  });

  it('highlights legal move targets on the board and moves by tile click', () => {
    const state = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-north',
          blueprintId: 'tunnel_straight',
          rotation: 0,
          boardX: 0,
          boardY: -1,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const onMove = vi.fn();

    render(<BoardView state={state} onMove={onMove} />);

    const moveTarget = screen.getByRole('button', {
      name: 'Move to tile 0,-1',
    });

    expect(moveTarget).toHaveAttribute('data-testid', 'move-target-0--1');
    expect(
      screen.queryByRole('button', { name: 'Move to tile 1,0' }),
    ).toBeNull();

    fireEvent.click(moveTarget);

    expect(onMove).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith({ boardX: 0, boardY: -1 });
  });

  it('shows reachable discovered tiles beyond one step and emits their move path', () => {
    const state = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-east-1',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-east-2',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
      remainingSteps: 2,
    });
    const onMovePath = vi.fn();

    render(<BoardView state={state} onMovePath={onMovePath} />);

    const farMoveTarget = screen.getByRole('button', {
      name: 'Move to tile 2,0',
    });

    expect(farMoveTarget).toBeInTheDocument();
    expect(farMoveTarget).toHaveClass('border-amber-100/60');

    fireEvent.click(farMoveTarget);

    expect(onMovePath).toHaveBeenCalledOnce();
    expect(onMovePath).toHaveBeenCalledWith([
      { boardX: 1, boardY: 0 },
      { boardX: 2, boardY: 0 },
    ]);
  });

  it('shows portal actions disabled without another discovered portal target', () => {
    const state = createUiState({
      board: [
        {
          tileInstanceId: 'tile-portal-origin',
          blueprintId: 'teleport_straight',
          rotation: 90,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(screen.getByText('Portal')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'No known portal target' }),
    ).toBeDisabled();
  });

  it('shows portal actions and board targets when another portal is discovered', () => {
    const state = createUiState({
      board: [
        {
          tileInstanceId: 'tile-portal-origin',
          blueprintId: 'teleport_straight',
          rotation: 90,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-portal-target',
          blueprintId: 'teleport_straight',
          rotation: 90,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const onMove = vi.fn();

    render(
      <>
        <ActionPanel state={state} {...noopActions} onMove={onMove} />
        <BoardView state={state} onMove={onMove} />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: '2,0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to tile 2,0' }));

    expect(onMove).toHaveBeenNthCalledWith(1, { boardX: 2, boardY: 0 });
    expect(onMove).toHaveBeenNthCalledWith(2, { boardX: 2, boardY: 0 });
  });

  it('focuses a portal target on right-click without moving there', () => {
    const state = createUiState({
      board: [
        {
          tileInstanceId: 'tile-portal-origin',
          blueprintId: 'teleport_straight',
          rotation: 90,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-portal-target',
          blueprintId: 'teleport_straight',
          rotation: 90,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const onMove = vi.fn();
    const onFocusPortalTarget = vi.fn();

    render(
      <ActionPanel
        state={state}
        {...noopActions}
        onFocusPortalTarget={onFocusPortalTarget}
        onMove={onMove}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '2,0' }));
    fireEvent.contextMenu(screen.getByRole('button', { name: '2,0' }));

    expect(onMove).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith({ boardX: 2, boardY: 0 });
    expect(onFocusPortalTarget).toHaveBeenCalledOnce();
    expect(onFocusPortalTarget).toHaveBeenCalledWith({ boardX: 2, boardY: 0 });
  });

  it('shows ground loot and loot-resolution actions in the panel', () => {
    const state = createUiState({
      phase: 'await_move',
      board: [
        {
          ...baseBoard()[0],
          looseItems: [{ type: 'spell', spellKind: 'healing' }],
        },
      ],
    });
    const onBeginLoot = vi.fn();

    const { rerender } = render(
      <ActionPanel
        state={state}
        {...noopActions}
        onBeginLoot={onBeginLoot}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Take Healing spell' }));
    expect(onBeginLoot).toHaveBeenCalledOnce();

    rerender(
      <ActionPanel
        state={{
          ...state,
          phase: 'loot_resolution',
          pendingLoot: {
            source: 'ground_item',
            position: { boardX: 0, boardY: 0 },
            item: { type: 'spell', spellKind: 'healing' },
          },
        }}
        {...noopActions}
      />,
    );

    expect(screen.getByRole('button', { name: 'Take' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
    expect(
      screen.getByText('Healing spell'),
    ).toBeInTheDocument();
  });

  it('shows the ground-loot button as the only prompt when inventory space is free', () => {
    const onBeginLoot = vi.fn();
    const state = createUiState({
      board: createUiState().board.map((tile) =>
        tile.boardX === 0 && tile.boardY === 0
          ? {
              ...tile,
              looseItems: [{ type: 'weapon', bonus: 1 }],
            }
          : tile,
      ),
    });

    render(
      <ActionPanel
        state={state}
        {...noopActions}
        onBeginLoot={onBeginLoot}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Take Knife +1' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Leave' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Take Knife +1' }));

    expect(onBeginLoot).toHaveBeenCalledOnce();
  });

  it('shows the loot-resolution swap choices when the matching inventory is full', () => {
    const state = createUiState({
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: {
                ...player.inventory,
                weapons: [
                  { type: 'weapon', bonus: 2 },
                  { type: 'weapon', bonus: 3 },
                ],
              },
            }
          : player,
      ),
      phase: 'loot_resolution',
      pendingLoot: {
        source: 'ground_item',
        position: { boardX: 0, boardY: 0 },
        item: { type: 'weapon', bonus: 1 },
      },
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(screen.queryByRole('button', { name: 'Take' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Swap Sword +2' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Swap Battleaxe +3' }),
    ).toBeInTheDocument();
  });

  it('shows the healing spell action only when the active hero carries one', () => {
    const withSpell = createUiState({
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'healing' }],
              },
            }
          : player,
      ),
    });
    const withoutSpell = createUiState();
    const { rerender } = render(
      <ActionPanel state={withSpell} {...noopActions} />,
    );

    expect(
      screen.getByRole('button', { name: 'Use Healing Spell' }),
    ).toBeInTheDocument();

    rerender(<ActionPanel state={withoutSpell} {...noopActions} />);

    expect(
      screen.queryByRole('button', { name: 'Use Healing Spell' }),
    ).toBeNull();
  });

  it('shows flame spell combat choices only after a rolled combat needs a decision', () => {
    const onResolveCombatWithFlameSpells = vi.fn();
    const onResolveCombatWithoutFlameSpells = vi.fn();
    const state = createUiState({
      phase: 'combat_flame_spells',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        rolledDice: [2, 3],
        pendingBaseOutcome: 'draw',
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_valkyrie',
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'flame' }],
              },
            }
          : player,
      ),
    });

    render(
      <ActionPanel
        state={state}
        {...noopActions}
        onResolveCombatWithFlameSpells={onResolveCombatWithFlameSpells}
        onResolveCombatWithoutFlameSpells={
          onResolveCombatWithoutFlameSpells
        }
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Do not use fireball spells' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Rolled 2 + 3 + weapons 0 = 5 and currently face draw'),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Use 1 Fireball Spell' }),
    );
    expect(onResolveCombatWithFlameSpells).toHaveBeenCalledWith(1);
  });

  it('shows valkyrie reroll choices before flame spell choices', () => {
    const onUseValkyrieReroll = vi.fn();
    const onDeclineValkyrieReroll = vi.fn();
    const state = createUiState({
      phase: 'combat_valkyrie_reroll',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [2, 3],
        initialBaseOutcome: 'draw',
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_valkyrie',
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'flame' }],
              },
            }
          : player,
      ),
    });

    render(
      <ActionPanel
        state={state}
        {...noopActions}
        onUseValkyrieReroll={onUseValkyrieReroll}
        onDeclineValkyrieReroll={onDeclineValkyrieReroll}
      />,
    );

    expect(
      screen.getByText('Rolled 2 + 3 + weapons 0 = 5 and currently face draw'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reroll both dice' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Keep this result' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Do not use fireball spells' }),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Reroll both dice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep this result' }));

    expect(onUseValkyrieReroll).toHaveBeenCalledTimes(1);
    expect(onDeclineValkyrieReroll).toHaveBeenCalledTimes(1);
  });

  it('shows blade reroll feedback when one or more dice show 1', () => {
    const onUseBladeReroll = vi.fn();
    const state = createUiState({
      phase: 'combat_blade_reroll',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [1, 4],
        rolledDice: [1, 4],
        bladeRerollCount: 0,
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_blade',
            }
          : player,
      ),
    });

    render(
      <ActionPanel
        state={state}
        {...noopActions}
        onUseBladeReroll={onUseBladeReroll}
      />,
    );

    expect(
      screen.getByText('Current dice 1 + 4 · reroll every die showing 1'),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Current result 1 + 4 + weapons 0 = 5 and currently faces draw',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reroll 1s' }));

    expect(onUseBladeReroll).toHaveBeenCalledTimes(1);
  });

  it('shows the current combat result after a partial blade reroll', () => {
    const state = createUiState({
      phase: 'combat_blade_reroll',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [1, 1],
        rolledDice: [1, 6],
        bladeRerollCount: 1,
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_blade',
            }
          : player,
      ),
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(
      screen.getByText(/Current dice 1 \+ 6 .* reroll every die showing 1/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Current result 1 + 6 + weapons 0 = 7 and currently faces victory',
      ),
    ).toBeInTheDocument();
  });

  it('shows witch sacrifice choices before flame spell choices', () => {
    const onUseWitchSacrifice = vi.fn();
    const onDeclineWitchSacrifice = vi.fn();
    const state = createUiState({
      phase: 'combat_witch_sacrifice',
      combat: {
        playerId: 'player_human',
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [2, 3],
        initialBaseOutcome: 'draw',
      },
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_witch',
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'flame' }],
              },
            }
          : player,
      ),
    });

    render(
      <ActionPanel
        state={state}
        {...noopActions}
        onUseWitchSacrifice={onUseWitchSacrifice}
        onDeclineWitchSacrifice={onDeclineWitchSacrifice}
      />,
    );

    expect(
      screen.getByText('Rolled 2 + 3 + weapons 0 = 5 and currently face draw'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sacrifice 1 HP for +1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Keep this result' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Do not use fireball spells' }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Sacrifice 1 HP for +1' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Keep this result' }));

    expect(onUseWitchSacrifice).toHaveBeenCalledTimes(1);
    expect(onDeclineWitchSacrifice).toHaveBeenCalledTimes(1);
  });

  it('hides the healing spell action during non-free interaction phases', () => {
    const base = createUiState({
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'healing' }],
              },
            }
          : player,
      ),
    });
    const { rerender } = render(
      <ActionPanel state={{ ...base, phase: 'combat' }} {...noopActions} />,
    );

    expect(
      screen.queryByRole('button', { name: 'Use Healing Spell' }),
    ).toBeNull();

    rerender(
      <ActionPanel
        state={{
          ...base,
          phase: 'loot_resolution',
          pendingLoot: {
            source: 'ground_item',
            position: { boardX: 0, boardY: 0 },
            item: { type: 'weapon', bonus: 1 },
          },
        }}
        {...noopActions}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Use Healing Spell' }),
    ).toBeNull();

    rerender(
      <ActionPanel
        state={{ ...base, phase: 'resolve_room_token' }}
        {...noopActions}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Use Healing Spell' }),
    ).toBeNull();

    rerender(
      <ActionPanel
        state={{
          ...base,
          phase: 'choose_pending_tile_rotation',
          pendingTile: {
            origin: { boardX: 0, boardY: 0 },
            target: { boardX: 1, boardY: 0 },
            direction: 'B',
            blueprintId: 'room_corner',
            previewRotation: 0,
            legalRotations: [0, 90],
            skippedBlueprintIds: [],
          },
        }}
        {...noopActions}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Use Healing Spell' }),
    ).toBeNull();
  });

  it('shows healing spell target choices and tile-selection hint in the panel', () => {
    const state = createUiState({
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'healing' }],
              },
            }
          : player,
      ),
    });
    const onStartHealingSpellSelection = vi.fn();
    const onSelectHealingSpellTarget = vi.fn();
    const { rerender } = render(
      <ActionPanel
        state={state}
        {...noopActions}
        onStartHealingSpellSelection={onStartHealingSpellSelection}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use Healing Spell' }));

    expect(onStartHealingSpellSelection).toHaveBeenCalledOnce();

    rerender(
      <ActionPanel
        state={state}
        {...noopActions}
        healingSpellSelection={{ mode: 'select_target' }}
        onSelectHealingSpellTarget={onSelectHealingSpellTarget}
      />,
    );

    expect(
      screen.getByText(
        'Choose which hero to teleport to a discovered healing tile.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mage' }));

    expect(onSelectHealingSpellTarget).toHaveBeenCalledWith('player_human');

    rerender(
      <ActionPanel
        state={state}
        {...noopActions}
        healingSpellSelection={{
          mode: 'select_tile',
          targetPlayerId: 'player_human',
        }}
      />,
    );

    expect(
      screen.getByText('Choose a discovered healing tile for Mage.'),
    ).toBeInTheDocument();
  });

  it('shows the witch swap action only for an uncursed human witch at turn start with all four steps', () => {
    const withSwap = createUiState({
      phase: 'turn_start',
      remainingSteps: 4,
      players: createUiState().players.map((player, index) =>
        index === 0 ? { ...player, heroId: 'hero_witch' } : player,
      ),
    });
    const cursedWitch = {
      ...withSwap,
      players: withSwap.players.map((player, index) =>
        index === 0 ? { ...player, isCursed: true } : player,
      ),
    };
    const wrongPhase = { ...withSwap, phase: 'await_move' as const };
    const wrongSteps = { ...withSwap, remainingSteps: 3 };
    const { rerender } = render(
      <ActionPanel state={withSwap} {...noopActions} />,
    );

    expect(
      screen.getByRole('button', { name: 'Swap Position' }),
    ).toBeInTheDocument();

    rerender(<ActionPanel state={cursedWitch} {...noopActions} />);
    expect(screen.queryByRole('button', { name: 'Swap Position' })).toBeNull();

    rerender(<ActionPanel state={wrongPhase} {...noopActions} />);
    expect(screen.queryByRole('button', { name: 'Swap Position' })).toBeNull();

    rerender(<ActionPanel state={wrongSteps} {...noopActions} />);
    expect(screen.queryByRole('button', { name: 'Swap Position' })).toBeNull();
  });

  it('shows witch swap target choices for every other hero and supports cancel', () => {
    const state = {
      ...createUiStateWithPlayerCount(3, [
        'hero_witch',
        'hero_rogue',
        'hero_seeress',
      ]),
      activePlayerIndex: 0,
      phase: 'turn_start' as const,
      remainingSteps: 4,
    };
    const onStartWitchSwapSelection = vi.fn();
    const onSelectWitchSwapTarget = vi.fn();
    const onCancelWitchSwapSelection = vi.fn();
    const { rerender } = render(
      <ActionPanel
        state={state}
        {...noopActions}
        onStartWitchSwapSelection={onStartWitchSwapSelection}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Swap Position' }));
    expect(onStartWitchSwapSelection).toHaveBeenCalledOnce();

    rerender(
      <ActionPanel
        state={state}
        {...noopActions}
        witchSwapSelection={{ mode: 'select_target' }}
        onSelectWitchSwapTarget={onSelectWitchSwapTarget}
        onCancelWitchSwapSelection={onCancelWitchSwapSelection}
      />,
    );

    expect(
      screen.getByText('Choose another hero to swap positions with.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rogue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seeress' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Witch' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Rogue' }));
    expect(onSelectWitchSwapTarget).toHaveBeenCalledWith('player_ai_1');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancelWitchSwapSelection).toHaveBeenCalledOnce();
  });

  it('highlights legal exploration targets on the board and explores by tile click', () => {
    const state = createUiState();
    const onExplore = vi.fn();

    render(<BoardView state={state} onExplore={onExplore} />);

    const exploreTarget = screen.getByRole('button', {
      name: 'Explore tile 1,0',
    });

    expect(exploreTarget).toHaveAttribute('data-testid', 'explore-target-1-0');
    expect(
      screen.getByRole('button', { name: 'Explore tile 0,-1' }),
    ).toBeInTheDocument();

    fireEvent.click(exploreTarget);

    expect(onExplore).toHaveBeenCalledOnce();
    expect(onExplore).toHaveBeenCalledWith('B');
  });

  it('swaps the human witch with the selected hero and writes a readable log entry', () => {
    const state = createUiState({
      phase: 'turn_start',
      remainingSteps: 4,
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-target',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0
          ? { ...player, heroId: 'hero_witch', position: { boardX: 0, boardY: 0 } }
          : { ...player, heroId: 'hero_rogue', position: { boardX: 2, boardY: 0 } },
      ),
    });

    render(<WitchSwapHarness initialState={state} />);

    fireEvent.click(screen.getByRole('button', { name: 'Swap Position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rogue' }));

    expect(screen.getByTestId('witch-phase')).toHaveTextContent('turn_end');
    expect(screen.getByTestId('witch-position')).toHaveTextContent('2,0');
    expect(screen.getByTestId('witch-target-position-player_ai_1')).toHaveTextContent(
      '0,0',
    );
    expect(screen.getByText('Swapped with Rogue to 2,0')).toBeInTheDocument();
  });

  it('keeps chest and ground-loot follow-up actions available after a human witch swap', () => {
    const chestState = createUiState({
      phase: 'turn_start',
      remainingSteps: 4,
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-target',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'treasure_chest', kind: 'chest' },
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_witch',
              position: { boardX: 0, boardY: 0 },
              inventory: {
                ...player.inventory,
                keyCount: 1,
              },
            }
          : { ...player, heroId: 'hero_rogue', position: { boardX: 2, boardY: 0 } },
      ),
    });
    const lootState = createUiState({
      phase: 'turn_start',
      remainingSteps: 4,
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-target',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [{ type: 'weapon', bonus: 1 }],
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0
          ? { ...player, heroId: 'hero_witch', position: { boardX: 0, boardY: 0 } }
          : { ...player, heroId: 'hero_rogue', position: { boardX: 2, boardY: 0 } },
      ),
    });
    const { unmount } = render(<WitchSwapHarness initialState={chestState} />);

    fireEvent.click(screen.getByRole('button', { name: 'Swap Position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rogue' }));

    expect(screen.getByTestId('witch-phase')).toHaveTextContent('await_move');
    expect(screen.getByRole('button', { name: 'Open Chest' })).toBeInTheDocument();

    unmount();
    render(<WitchSwapHarness initialState={lootState} />);

    fireEvent.click(screen.getByRole('button', { name: 'Swap Position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rogue' }));

    expect(screen.getByTestId('witch-phase')).toHaveTextContent('await_move');
    expect(
      screen.getByRole('button', { name: 'Take Knife +1' }),
    ).toBeInTheDocument();
  });

  it('starts immediate combat after a human witch swaps onto a monster tile', () => {
    const state = createUiState({
      phase: 'turn_start',
      remainingSteps: 4,
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-target',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'kitchen_rat', kind: 'monster' },
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0
          ? { ...player, heroId: 'hero_witch', position: { boardX: 0, boardY: 0 } }
          : { ...player, heroId: 'hero_rogue', position: { boardX: 2, boardY: 0 } },
      ),
    });

    render(<WitchSwapHarness initialState={state} />);

    fireEvent.click(screen.getByRole('button', { name: 'Swap Position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rogue' }));

    expect(screen.getByTestId('witch-phase')).toHaveTextContent('combat');
    expect(
      screen.getByRole('button', { name: 'Resolve Combat' }),
    ).toBeInTheDocument();
  });

  it('highlights discovered healing tiles in yellow and selects them by click', () => {
    const state = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-healing',
          blueprintId: 'healing_corner',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-tunnel',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: -1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const onSelectHealingTile = vi.fn();

    render(
      <BoardView
        state={state}
        onSelectHealingTile={onSelectHealingTile}
        selectableHealingPositions={[
          { boardX: 0, boardY: 0 },
          { boardX: 1, boardY: 0 },
        ]}
      />,
    );

    const startHealingTarget = screen.getByRole('button', {
      name: 'Select healing tile 0,0',
    });
    const secondHealingTarget = screen.getByRole('button', {
      name: 'Select healing tile 1,0',
    });

    expect(startHealingTarget).toHaveClass('border-yellow-300');
    expect(secondHealingTarget).toHaveAttribute(
      'data-testid',
      'healing-target-1-0',
    );
    expect(
      screen.queryByRole('button', { name: 'Select healing tile -1,0' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move to tile 1,0' })).toBeNull();

    fireEvent.click(secondHealingTarget);

    expect(onSelectHealingTile).toHaveBeenCalledOnce();
    expect(onSelectHealingTile).toHaveBeenCalledWith({ boardX: 1, boardY: 0 });
  });

  it('dispatches healing spell use through the integrated panel and board flow', () => {
    const state = createUiState({
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'healing' }],
              },
            }
          : {
              ...player,
              hp: 1,
              isCursed: true,
              position: { boardX: 2, boardY: 2 },
            },
      ),
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-healing',
          blueprintId: 'healing_corner',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    render(<HealingSpellHarness initialState={state} />);

    fireEvent.click(screen.getByRole('button', { name: 'Use Healing Spell' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rogue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select healing tile 1,0' }));

    expect(screen.getByTestId('healing-target-hp')).toHaveTextContent('5');
    expect(screen.getByTestId('healing-target-curse')).toHaveTextContent('false');
    expect(screen.getByTestId('healing-target-position')).toHaveTextContent('1,0');
    expect(screen.getByTestId('active-spell-count')).toHaveTextContent('0');
    expect(screen.getByTestId('phase-label')).toHaveTextContent(state.phase);
    expect(
      screen.queryByRole('button', { name: 'Select healing tile 1,0' }),
    ).toBeNull();
  });

  it('auto-resolves a discovered room into chest flow for human turns', async () => {
    const state = createUiState({
      phase: 'resolve_room_token',
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-room',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 0,
          boardY: -1,
          discovered: true,
          looseItems: [],
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0
          ? { ...player, position: { boardX: 0, boardY: -1 } }
          : player,
      ),
      tokenBag: [{ id: 'treasure_chest', kind: 'chest' }],
      remainingSteps: 3,
      lastMoveFrom: { boardX: 0, boardY: 0 },
    });

    render(<RoomAutoResolveHarness initialState={state} />);

    await waitFor(() => {
      expect(screen.getByTestId('room-phase')).toHaveTextContent('await_move');
    });

    expect(screen.getByTestId('room-token')).toHaveTextContent('treasure_chest');
    expect(screen.getByText('Move')).toBeInTheDocument();
  });

  it('auto-resolves a discovered room into combat for human turns', async () => {
    const state = createUiState({
      phase: 'resolve_room_token',
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-room',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 0,
          boardY: -1,
          discovered: true,
          looseItems: [],
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0
          ? { ...player, position: { boardX: 0, boardY: -1 } }
          : player,
      ),
      tokenBag: [{ id: 'kitchen_rat', kind: 'monster' }],
      remainingSteps: 3,
      lastMoveFrom: { boardX: 0, boardY: 0 },
    });

    render(<RoomAutoResolveHarness initialState={state} />);

    await waitFor(() => {
      expect(screen.getByTestId('room-phase')).toHaveTextContent('combat');
    });

    expect(screen.getByText('Combat')).toBeInTheDocument();
    expect(screen.getByTestId('room-monster')).toHaveTextContent('kitchen_rat');
  });

  it('shows the human seeress room choice, blocks end turn, and resolves the selected option', async () => {
    const state = createUiState({
      phase: 'resolve_room_token',
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-room',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 0,
          boardY: -1,
          discovered: true,
          looseItems: [],
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_seeress',
              kind: 'human',
              position: { boardX: 0, boardY: -1 },
            }
          : player,
      ),
      tokenBag: [
        { id: 'kitchen_rat', kind: 'monster' },
        { id: 'treasure_chest', kind: 'chest' },
        { id: 'dragon', kind: 'monster' },
      ],
      remainingSteps: 3,
      lastMoveFrom: { boardX: 0, boardY: 0 },
    });

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    await waitFor(() => {
      expect(useSetupStore.getState().gameState?.phase).toBe(
        'resolve_room_token_seeress_choice',
      );
    });

    expect(screen.getByText('Seeress Choice')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Choose option 1: Kitchen Rat' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Choose option 2: Treasure Chest' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End Turn' })).toBeDisabled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Choose option 2: Treasure Chest' }),
    );

    await waitFor(() => {
      expect(useSetupStore.getState().gameState?.phase).toBe('await_move');
    });

    expect(
      screen.getByText('Resolved room: found Treasure Chest'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Found Treasure Chest at 0,-1 · Seeress drew Kitchen Rat / Treasure Chest · Seeress chose option 2',
      ),
    ).toBeInTheDocument();
  });

  it('offers movement again after self-healing when steps remain', () => {
    const state = createUiState({
      phase: 'await_move',
      remainingSteps: 2,
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hp: 1,
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'healing' }],
              },
            }
          : player,
      ),
      board: [
        {
          ...baseBoard()[0],
          boardX: -1,
          boardY: 0,
        },
        {
          tileInstanceId: 'tile-healing',
          blueprintId: 'healing_corner',
          rotation: 180,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    render(<HealingSpellHarness initialState={state} />);

    fireEvent.click(screen.getByRole('button', { name: 'Use Healing Spell' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mage' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select healing tile 0,0' }));

    expect(screen.queryByRole('button', { name: 'Select healing tile 0,0' })).toBeNull();
    expect(screen.getByText('Move')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'East' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move to tile 1,0' })).toBeInTheDocument();
  });

  it('offers exploration again after self-healing when the healing tile can explore', () => {
    const state = createUiState({
      phase: 'await_move',
      remainingSteps: 2,
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hp: 1,
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'healing' }],
              },
            }
          : player,
      ),
      board: [
        {
          tileInstanceId: 'tile-healing',
          blueprintId: 'healing_corner',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    render(<HealingSpellHarness initialState={state} />);

    fireEvent.click(screen.getByRole('button', { name: 'Use Healing Spell' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mage' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select healing tile 1,0' }));

    expect(screen.queryByRole('button', { name: 'Select healing tile 1,0' })).toBeNull();
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'North' })).toBeInTheDocument();
  });

  it('keeps the active hero movement options after healing another hero', () => {
    const state = createUiState({
      phase: 'await_move',
      remainingSteps: 2,
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'healing' }],
              },
            }
          : {
              ...player,
              hp: 1,
              isCursed: true,
              position: { boardX: 3, boardY: 3 },
            },
      ),
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    render(<HealingSpellHarness initialState={state} />);

    fireEvent.click(screen.getByRole('button', { name: 'Use Healing Spell' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rogue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select healing tile 0,0' }));

    expect(screen.queryByRole('button', { name: 'Select healing tile 0,0' })).toBeNull();
    expect(screen.getByText('Move')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'East' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move to tile 1,0' })).toBeInTheDocument();
    expect(screen.getByTestId('healing-target-position')).toHaveTextContent('0,0');
  });

  it('extends the visible board by an unexplored row and column when a player reaches the edge', () => {
    const state = createUiState({
      board: [
        {
          ...baseBoard()[0],
          boardX: 2,
          boardY: 2,
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0
          ? { ...player, position: { boardX: 2, boardY: 2 } }
          : player,
      ),
    });

    render(<BoardView state={state} />);

    expect(screen.getByTestId('explore-target-3-2')).toBeInTheDocument();
    expect(screen.getByTestId('explore-target-2-3')).toBeInTheDocument();
  });

  it('centers the board on requested positions and can reset to the start view', () => {
    const state = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const { rerender } = render(
      <BoardView
        cameraRequest={{
          nonce: 0,
          position: { boardX: 0, boardY: 0 },
          resetZoom: true,
        }}
        state={state}
      />,
    );

    const board = screen.getByLabelText('Dungeon board');
    const transformLayer = screen.getByTestId('board-transform-layer');
    setupBoardGeometry(board, transformLayer);
    fireEvent(window, new Event('resize'));

    rerender(
      <BoardView
        cameraRequest={{
          nonce: 1,
          position: { boardX: 1, boardY: 0 },
          resetZoom: false,
        }}
        state={state}
      />,
    );
    setupBoardGeometry(board, transformLayer);

    expectCenteredOnBoard(getBoardCell('1,0'), board);

    rerender(
      <BoardView
        cameraRequest={{
          nonce: 2,
          position: { boardX: 0, boardY: 0 },
          resetZoom: true,
        }}
        state={state}
      />,
    );
    setupBoardGeometry(board, transformLayer);

    expectCenteredOnBoard(getBoardCell('0,0'), board);
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(1)'),
    );
  });

  it('supports mouse-wheel zoom and drag panning on the board', () => {
    const state = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    render(<BoardView state={state} />);

    const board = screen.getByLabelText('Dungeon board');
    const transformLayer = screen.getByTestId('board-transform-layer');
    setupBoardGeometry(board, transformLayer);
    fireEvent(window, new Event('resize'));

    fireEvent.wheel(board, { deltaY: -100 });
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('translate(-40px, -30px) scale(1.1)'),
    );

    fireEvent.pointerDown(board, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(board, {
      buttons: 1,
      clientX: 140,
      clientY: 125,
      pointerId: 1,
    });
    fireEvent.pointerUp(board, {
      clientX: 140,
      clientY: 125,
      pointerId: 1,
    });

    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('translate(0px, -5px)'),
    );
  });

  it('keeps wheel zoom after an already-applied camera request', () => {
    const state = createUiState();

    render(
      <BoardView
        cameraRequest={{
          nonce: 0,
          position: { boardX: 0, boardY: 0 },
          resetZoom: true,
        }}
        state={state}
      />,
    );

    const board = screen.getByLabelText('Dungeon board');
    const transformLayer = screen.getByTestId('board-transform-layer');
    setupBoardGeometry(board, transformLayer);
    fireEvent(window, new Event('resize'));

    fireEvent.wheel(board, { deltaY: -100 });

    expectCenteredOnBoard(getBoardCell('0,0'), board);
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(1.1)'),
    );
  });

  it('keeps the start tile centered when zooming after a centered camera reset', () => {
    const state = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    const { rerender } = render(
      <BoardView
        cameraRequest={{
          nonce: 0,
          position: { boardX: 0, boardY: 0 },
          resetZoom: true,
        }}
        state={state}
      />,
    );

    const board = screen.getByLabelText('Dungeon board');
    const transformLayer = screen.getByTestId('board-transform-layer');
    setupBoardGeometry(board, transformLayer);
    fireEvent(window, new Event('resize'));

    rerender(
      <BoardView
        cameraRequest={{
          nonce: 1,
          position: { boardX: 0, boardY: 0 },
          resetZoom: true,
        }}
        state={state}
      />,
    );
    setupBoardGeometry(board, transformLayer);

    fireEvent.wheel(board, { deltaY: -100 });

    expectCenteredOnBoard(getBoardCell('0,0'), board);
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(1.1)'),
    );
  });

  it('keeps the current center stable when a pending tile extends the board upward', () => {
    const baseState = createUiState();

    const { rerender } = render(
      <BoardView
        cameraRequest={{
          nonce: 0,
          position: { boardX: 0, boardY: 0 },
          resetZoom: true,
        }}
        state={baseState}
      />,
    );

    const board = screen.getByLabelText('Dungeon board');
    const transformLayer = screen.getByTestId('board-transform-layer');
    setupBoardGeometry(board, transformLayer);
    fireEvent(window, new Event('resize'));

    expectCenteredOnBoard(getBoardCell('0,0'), board);

    rerender(
      <BoardView
        cameraRequest={{
          nonce: 0,
          position: { boardX: 0, boardY: 0 },
          resetZoom: true,
        }}
        state={{
          ...baseState,
          pendingTile: {
            origin: { boardX: 0, boardY: 0 },
            target: { boardX: 0, boardY: -3 },
            direction: 'A',
            blueprintId: 'room_corner',
            previewRotation: 0,
            legalRotations: [0, 90],
            skippedBlueprintIds: [],
          },
        }}
      />,
    );

    setupBoardGeometry(board, transformLayer);

    expectCenteredOnBoard(getBoardCell('0,0'), board);
  });

  it('keeps the current center stable when player edge expansion adds a new left column', () => {
    const baseState = createUiState({
      board: [
        {
          ...baseBoard()[0],
          boardX: 2,
          boardY: 0,
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0
          ? { ...player, position: { boardX: 2, boardY: 0 } }
          : player,
      ),
    });

    const { rerender } = render(
      <BoardView
        cameraRequest={{
          nonce: 0,
          position: { boardX: 2, boardY: 0 },
          resetZoom: true,
        }}
        state={baseState}
      />,
    );

    const board = screen.getByLabelText('Dungeon board');
    const transformLayer = screen.getByTestId('board-transform-layer');
    setupBoardGeometry(board, transformLayer);
    fireEvent(window, new Event('resize'));

    expectCenteredOnBoard(getBoardCell('2,0'), board);

    rerender(
      <BoardView
        cameraRequest={{
          nonce: 0,
          position: { boardX: 2, boardY: 0 },
          resetZoom: true,
        }}
        state={{
          ...baseState,
          players: baseState.players.map((player, index) =>
            index === 0
              ? { ...player, position: { boardX: -2, boardY: 0 } }
              : player,
          ),
        }}
      />,
    );

    setupBoardGeometry(board, transformLayer);

    expectCenteredOnBoard(getBoardCell('2,0'), board);
  });

  it('allows deeper zooming on the board', () => {
    const state = createUiState();

    render(<BoardView state={state} />);

    const board = screen.getByLabelText('Dungeon board');
    const transformLayer = screen.getByTestId('board-transform-layer');

    for (let index = 0; index < 20; index += 1) {
      fireEvent.wheel(board, { deltaY: -100 });
    }

    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(4)'),
    );
  });

  it('stops panning as soon as the left mouse button is no longer pressed', () => {
    const state = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    render(<BoardView state={state} />);

    const board = screen.getByLabelText('Dungeon board');
    const transformLayer = screen.getByTestId('board-transform-layer');

    fireEvent.pointerDown(board, {
      button: 0,
      buttons: 1,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(board, {
      buttons: 1,
      clientX: 140,
      clientY: 125,
      pointerId: 1,
    });
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('translate(40px, 25px)'),
    );

    fireEvent.pointerMove(board, {
      buttons: 0,
      clientX: 180,
      clientY: 160,
      pointerId: 1,
    });
    fireEvent.pointerMove(board, {
      buttons: 0,
      clientX: 220,
      clientY: 200,
      pointerId: 1,
    });

    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('translate(40px, 25px)'),
    );
  });

  it('shows winners separately from the dragon slayer and keeps ranking sorted by treasure points', () => {
    const state = createUiState({
      phase: 'game_over',
      victory: {
        defeatedDragonByPlayerId: 'player_human',
        winnerPlayerIds: ['player_ai_1', 'player_ai_2'],
      },
      players: createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 2,
        seed: 'end-screen-ranking',
      }).players.map((player, index) => ({
        ...player,
        heroId:
          index === 0
            ? 'hero_mage'
            : index === 1
              ? 'hero_rogue'
              : 'hero_valkyrie',
        treasurePoints:
          index === 0
            ? 1.5
            : index === 1
              ? 3.5
              : 3.5,
      })),
    });

    render(<EndScreen state={state} onNewGame={vi.fn()} />);

    expect(screen.getByText('Game Over')).toBeInTheDocument();
    expect(screen.getByText('Shared Victory')).toBeInTheDocument();
    expect(
      screen.getByText('Rogue (AI 1) and Valkyrie (AI 2)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Dragon Slayer')).toBeInTheDocument();
    expect(screen.getAllByText('Mage (Human)')).toHaveLength(2);
    expect(
      screen.getByText('Dragon treasure worth 1.5 points is included in the final score.'),
    ).toBeInTheDocument();

    const rankingRows = [
      screen.getByTestId('end-screen-rank-player_ai_1'),
      screen.getByTestId('end-screen-rank-player_ai_2'),
      screen.getByTestId('end-screen-rank-player_human'),
    ];

    expect(within(rankingRows[0]).getByText('Rogue (AI 1)')).toBeInTheDocument();
    expect(within(rankingRows[0]).getByText('3.5 pts')).toBeInTheDocument();
    expect(within(rankingRows[1]).getByText('Valkyrie (AI 2)')).toBeInTheDocument();
    expect(within(rankingRows[1]).getByText('3.5 pts')).toBeInTheDocument();
    expect(within(rankingRows[2]).getByText('Mage (Human)')).toBeInTheDocument();
    expect(within(rankingRows[2]).getByText('1.5 pts')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New Game' }),
    ).toBeInTheDocument();
  });

  it('focuses a player position when the portrait is right-clicked', () => {
    const state = createUiState({
      players: createUiState().players.map((player, index) =>
        index === 0
          ? player
          : { ...player, position: { boardX: 1, boardY: -1 } },
      ),
    });
    const onFocusPosition = vi.fn();

    render(<PlayerPanel state={state} onFocusPosition={onFocusPosition} />);

    fireEvent.contextMenu(
      screen.getByRole('button', { name: 'Mage portrait actions' }),
    );

    expect(onFocusPosition).toHaveBeenCalledOnce();
    expect(onFocusPosition).toHaveBeenCalledWith({ boardX: 0, boardY: 0 });
  });

  it('resets zoom to default when centering the board on a hero portrait', () => {
    const state = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
      players: createUiState().players.map((player, index) =>
        index === 0
          ? player
          : { ...player, position: { boardX: 1, boardY: 0 } },
      ),
    });

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    const board = screen.getByLabelText('Dungeon board');
    const transformLayer = screen.getByTestId('board-transform-layer');
    setupBoardGeometry(board, transformLayer);
    fireEvent(window, new Event('resize'));

    fireEvent.wheel(board, { deltaY: -100 });
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(1.1)'),
    );

    fireEvent.contextMenu(
      screen.getByRole('button', { name: 'Rogue portrait actions' }),
    );

    expectCenteredOnBoard(getBoardCell('1,0'), board);
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(1)'),
    );
  });

  it('resets zoom and centers the board when a portal action is right-clicked', () => {
    const state = createUiState({
      board: [
        {
          tileInstanceId: 'tile-portal-origin',
          blueprintId: 'teleport_straight',
          rotation: 90,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-portal-target',
          blueprintId: 'teleport_straight',
          rotation: 90,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    const board = screen.getByLabelText('Dungeon board');
    const transformLayer = screen.getByTestId('board-transform-layer');
    setupBoardGeometry(board, transformLayer);
    fireEvent(window, new Event('resize'));

    fireEvent.wheel(board, { deltaY: -100 });
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(1.1)'),
    );

    fireEvent.contextMenu(screen.getByRole('button', { name: '2,0' }));

    expectCenteredOnBoard(getBoardCell('2,0'), board);
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(1)'),
    );
    expect(useSetupStore.getState().gameState?.players[0].position).toEqual({
      boardX: 0,
      boardY: 0,
    });
  });

  it('keeps center map and portrait focus correct when an AI player starts first', () => {
    vi.useFakeTimers();

    const baseState = createUiState({
      board: [
        ...baseBoard(),
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const state = {
      ...baseState,
      activePlayerIndex: 1,
      phase: 'turn_start' as const,
      players: baseState.players.map((player, index) =>
        index === 0
          ? { ...player, position: { boardX: 1, boardY: 0 } }
          : { ...player, position: { boardX: 0, boardY: 0 } },
      ),
    };

    useSetupStore.setState({
      gameState: state,
      hasSavedGame: false,
      lastError: undefined,
    });

    render(<GameScreen />);

    const board = screen.getByLabelText('Dungeon board');
    const transformLayer = screen.getByTestId('board-transform-layer');
    setupBoardGeometry(board, transformLayer);
    const initialBoardHeight = board.getBoundingClientRect().height;
    fireEvent(window, new Event('resize'));

    fireEvent.click(screen.getByTestId('start-player-overlay'));

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(useSetupStore.getState().gameState?.pendingTile).toBeDefined();

    setupBoardGeometry(board, transformLayer);
    expect(board.getBoundingClientRect().height).toBe(initialBoardHeight);
    expectCenteredOnBoard(getBoardCell('0,0'), board);
    fireEvent.click(screen.getByRole('button', { name: 'Center Map' }));

    expectCenteredOnBoard(getBoardCell('0,0'), board);
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(1)'),
    );

    fireEvent.contextMenu(
      screen.getByRole('button', { name: 'Mage portrait actions' }),
    );

    expectCenteredOnBoard(getBoardCell('1,0'), board);
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(1)'),
    );
  });

  it('renders two compact player cards side by side with permanent bonuses and tooltips', () => {
    const state = createUiState({
      players: createUiState().players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_mage',
              inventory: {
                keyCount: 1,
                weapons: [{ type: 'weapon', bonus: 2 }],
                spells: [{ type: 'spell', spellKind: 'flame' }],
              },
            }
          : {
              ...player,
              heroId: 'hero_rogue',
              isCursed: true,
              skipNextTurn: true,
            },
      ),
    });

    render(<PlayerPanel state={state} />);

    const grid = screen.getByTestId('player-panel-grid');
    const mageCard = screen.getByTestId('player-card-player_human');
    const thiefCard = screen.getByTestId('player-card-player_ai_1');

    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(screen.getByText('Mage')).toBeInTheDocument();
    expect(screen.getByText('Rogue')).toBeInTheDocument();
    expect(screen.getByText('ATK +2')).toHaveAttribute(
      'title',
      'Current weapon bonus: +2',
    );
    expect(screen.getByText('Fireball ∞')).toHaveAttribute(
      'title',
      'Mage: fireball spells are not consumed',
    );
    expect(screen.getByRole('button', { name: 'Mage portrait actions' })).toHaveAttribute(
      'title',
      'Right-click to center the map on this hero. Left-click to show the hero description.',
    );
    expect(within(mageCard).getByText('0 pts')).toBeInTheDocument();
    expect(within(thiefCard).getByText('0 pts')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sword +2' })).toHaveAttribute(
      'title',
      'Sword +2',
    );
    expect(screen.getByRole('img', { name: 'Key' })).toHaveAttribute(
      'title',
      'Key',
    );
    expect(screen.getByRole('img', { name: 'cursed' })).toHaveAttribute(
      'title',
      'Cursed: hero abilities are inactive',
    );
    expect(screen.getByRole('img', { name: 'unconscious' })).toHaveAttribute(
      'title',
      'Unconscious: this player skips the next turn',
    );
    expect(screen.queryByText('Draw = Win')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Rogue portrait actions' }),
    );

    expect(screen.getByTestId('hero-info-player_ai_1')).toHaveTextContent(
      'Combat draws count as wins. The Rogue may ignore monsters while moving.',
    );
  });

  it('spans the last player card across both columns for three players', () => {
    const state = createUiStateWithPlayerCount(3, [
      'hero_mage',
      'hero_valkyrie',
      'hero_seeress',
    ]);

    render(<PlayerPanel state={state} />);

    expect(screen.getByTestId('player-panel-grid')).toHaveClass('sm:grid-cols-2');
    expect(screen.getByTestId('player-card-player_ai_2')).toHaveClass(
      'sm:col-span-2',
    );
  });

  it('renders a two-by-two compact player grid for four players and shows the seeress bonus only when active', () => {
    const state = {
      ...createUiStateWithPlayerCount(4, [
        'hero_mage',
        'hero_valkyrie',
        'hero_witch',
        'hero_seeress',
      ]),
      activePlayerIndex: 3,
      remainingSteps: 3,
    };

    render(<PlayerPanel state={state} />);

    expect(screen.getByTestId('player-panel-grid')).toHaveClass('sm:grid-cols-2');
    expect(screen.getAllByTestId(/player-card-/)).toHaveLength(4);
    expect(screen.queryByText('+1 First Fight')).toBeNull();
    expect(screen.queryByText('Sacrifice +1')).toBeNull();
    expect(screen.queryByText('Reroll')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Seeress portrait actions' }),
    );

    expect(screen.getByTestId('hero-info-player_ai_3')).toHaveTextContent(
      'Draws two room tokens and chooses one. Gains +1 combat strength before the first step is spent.',
    );
  });

  it('closes the portrait description on the next click anywhere else in the app', () => {
    const state = createUiState();

    render(
      <>
        <PlayerPanel state={state} />
        <ActionPanel state={state} {...noopActions} />
      </>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Mage portrait actions' }),
    );
    expect(screen.getByTestId('hero-info-player_human')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));

    expect(screen.queryByTestId('hero-info-player_human')).toBeNull();
  });

  it('shows english item tooltips for healing spells and keys on tiles', () => {
    const healingState = createUiState({
      board: [
        {
          ...baseBoard()[0],
          looseItems: [{ type: 'spell', spellKind: 'healing' }],
        },
      ],
    });
    const keyState = createUiState({
      board: [
        {
          ...baseBoard()[0],
          looseItems: [{ type: 'key' }],
        },
      ],
    });

    const { rerender } = render(<BoardView state={healingState} />);

    expect(
      screen
        .getByRole('img', { name: 'Healing spell' })
        .closest('[data-asset-id="item_spell_healing"]'),
    ).toHaveAttribute(
      'title',
      'Healing Spell: Teleports a hero to a discovered healing tile',
    );

    rerender(<BoardView state={keyState} />);

    expect(
      screen.getByRole('img', { name: 'Key' }).closest('[data-asset-id="item_key"]'),
    ).toHaveAttribute('title', 'Key: Opens a treasure chest');
  });

  it('shows the newest event first and still limits the log to the last twenty entries', () => {
    const state = createUiState({
      eventLog: Array.from({ length: 25 }, (_, index) => ({
        id: `event-${index}`,
        type: 'ui_action',
        message: `Event ${index}`,
      })),
    });

    const { container } = render(<EventLog state={state} />);
    const entries = Array.from(container.querySelectorAll('ol > li'));
    const list = container.querySelector('ol');

    expect(entries).toHaveLength(20);
    expect(entries[0]).toHaveTextContent('Event 24');
    expect(entries[1]).toHaveTextContent('Event 23');
    expect(entries[19]).toHaveTextContent('Event 5');
    expect(list).toHaveClass('max-h-48', 'overflow-auto');
    expect(screen.queryByText('Event 4')).toBeNull();
    expect(screen.queryByText('Event 3')).toBeNull();
    expect(screen.queryByText('Event 2')).toBeNull();
    expect(screen.queryByText('Event 0')).toBeNull();
  });
});

function createUiState(overrides: Partial<GameState> = {}): GameState {
  const state = createNewGame({
    humanHeroId: 'hero_mage',
    aiCount: 1,
    seed: 'ui-test-seed',
  });

  return {
    ...state,
    activePlayerIndex: 0,
    players: state.players.map((player, index) =>
      index === 0
        ? {
            ...player,
            heroId: 'hero_mage',
            position: { boardX: 0, boardY: 0 },
          }
        : player,
    ),
    ...overrides,
  };
}

function baseBoard(): GameState['board'] {
  return [
    {
      tileInstanceId: 'tile-0',
      blueprintId: 'start_cross_healing',
      rotation: 0,
      boardX: 0,
      boardY: 0,
      discovered: true,
      looseItems: [],
    },
  ];
}

function createUiStateWithPlayerCount(
  playerCount: 3 | 4 | 5,
  heroIds: HeroId[],
): GameState {
  const state = createNewGame({
    humanHeroId: heroIds[0],
    aiCount: playerCount - 1,
    seed: `ui-test-${playerCount}-players`,
  });

  return {
    ...state,
    players: state.players.map((player, index) => ({
      ...player,
      heroId: heroIds[index],
      position: { boardX: index, boardY: 0 },
    })),
  };
}

function setupBoardGeometry(board: HTMLElement, transformLayer: HTMLElement) {
  const viewportWidth = 800;
  const viewportHeight = 600;
  const cellSizePx = 72;
  const cellGapPx = 1;
  const cells = Array.from(
    transformLayer.querySelectorAll<HTMLElement>('[data-board-position]'),
  );
  const positions = cells.map((cell) => parseBoardPosition(cell));
  const minX = Math.min(...positions.map((position) => position.boardX));
  const minY = Math.min(...positions.map((position) => position.boardY));
  const maxX = Math.max(...positions.map((position) => position.boardX));
  const maxY = Math.max(...positions.map((position) => position.boardY));
  const contentWidth = (maxX - minX + 1) * cellSizePx + (maxX - minX) * cellGapPx;
  const contentHeight =
    (maxY - minY + 1) * cellSizePx + (maxY - minY) * cellGapPx;

  Object.defineProperty(board, 'clientWidth', {
    configurable: true,
    value: viewportWidth,
  });
  Object.defineProperty(board, 'clientHeight', {
    configurable: true,
    value: viewportHeight,
  });
  board.getBoundingClientRect = () =>
    createRect(0, 0, viewportWidth, viewportHeight);

  transformLayer.getBoundingClientRect = () => {
    const { scale, translateX, translateY } = parseTransform(
      transformLayer.getAttribute('style') ?? '',
    );

    return createRect(
      translateX,
      translateY,
      contentWidth * scale,
      contentHeight * scale,
    );
  };

  for (const cell of cells) {
    cell.getBoundingClientRect = () => {
      const { scale, translateX, translateY } = parseTransform(
        transformLayer.getAttribute('style') ?? '',
      );
      const { boardX, boardY } = parseBoardPosition(cell);
      const offsetX = (boardX - minX) * (cellSizePx + cellGapPx);
      const offsetY = (boardY - minY) * (cellSizePx + cellGapPx);

      return createRect(
        translateX + offsetX * scale,
        translateY + offsetY * scale,
        cellSizePx * scale,
        cellSizePx * scale,
      );
    };
  }
}

function getBoardCell(position: string): HTMLElement {
  const cell = document.querySelector<HTMLElement>(
    `[data-board-position="${position}"]`,
  );

  if (!cell) {
    throw new Error(`Missing board cell ${position}`);
  }

  return cell;
}

function getElementCenter(element: HTMLElement): { x: number; y: number } {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function expectCenteredOnBoard(target: HTMLElement, board: HTMLElement) {
  const targetCenter = getElementCenter(target);
  const boardCenter = getElementCenter(board);

  expect(targetCenter.x).toBeCloseTo(boardCenter.x, 3);
  expect(targetCenter.y).toBeCloseTo(boardCenter.y, 3);
}

function parseBoardPosition(element: HTMLElement): {
  boardX: number;
  boardY: number;
} {
  const rawPosition = element.dataset.boardPosition;

  if (!rawPosition) {
    throw new Error('Missing board position data attribute');
  }

  const [boardX, boardY] = rawPosition.split(',').map(Number);

  return { boardX, boardY };
}

function parseTransform(style: string): {
  scale: number;
  translateX: number;
  translateY: number;
} {
  const translateMatch = style.match(
    /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/,
  );
  const scaleMatch = style.match(/scale\(([-\d.]+)\)/);

  return {
    scale: scaleMatch ? Number(scaleMatch[1]) : 1,
    translateX: translateMatch ? Number(translateMatch[1]) : 0,
    translateY: translateMatch ? Number(translateMatch[2]) : 0,
  };
}

function createRect(left: number, top: number, width: number, height: number) {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
}

function HealingSpellHarness({ initialState }: { initialState: GameState }) {
  const [state, setState] = useState(initialState);
  const [healingSpellSelection, setHealingSpellSelection] = useState<
    { mode: 'idle' } | { mode: 'select_target' } | { mode: 'select_tile'; targetPlayerId: string }
  >({ mode: 'idle' });
  const targetPlayer = state.players.find((player) => player.id === 'player_ai_1');
  const selectableHealingPositions =
    healingSpellSelection.mode === 'select_tile'
      ? getBoardSelectableHealingPositions(state)
      : [];

  return (
    <>
      <ActionPanel
        state={state}
        healingSpellSelection={healingSpellSelection}
        onBeginLoot={vi.fn()}
        onCancelHealingSpellSelection={() =>
          setHealingSpellSelection({ mode: 'idle' })
        }
        onEndTurn={vi.fn()}
        onExplore={vi.fn()}
        onLeaveLoot={vi.fn()}
        onMove={vi.fn()}
        onChooseSeeressRoomToken={vi.fn()}
        onOpenChest={vi.fn()}
        onStartOptionalCombat={vi.fn()}
        onResolveCombat={vi.fn()}
        onSelectCurseTarget={vi.fn()}
        onUseBladeReroll={vi.fn()}
        onUseValkyrieReroll={vi.fn()}
        onDeclineValkyrieReroll={vi.fn()}
        onUseWitchSacrifice={vi.fn()}
        onDeclineWitchSacrifice={vi.fn()}
        onResolveCombatWithoutFlameSpells={vi.fn()}
        onResolveCombatWithFlameSpells={vi.fn()}
        onSelectHealingSpellTarget={(targetPlayerId) =>
          setHealingSpellSelection({ mode: 'select_tile', targetPlayerId })
        }
        onStartHealingSpellSelection={() =>
          setHealingSpellSelection({ mode: 'select_target' })
        }
        witchSwapSelection={{ mode: 'idle' }}
        onCancelWitchSwapSelection={vi.fn()}
        onSelectWitchSwapTarget={vi.fn()}
        onStartWitchSwapSelection={vi.fn()}
        onSwapLoot={vi.fn()}
        onTakeLoot={vi.fn()}
      />
      <BoardView
        state={state}
        onSelectHealingTile={(healingPosition) => {
          if (healingSpellSelection.mode !== 'select_tile') {
            return;
          }

          const targetPlayerId = healingSpellSelection.targetPlayerId;

          flushSync(() => {
            setHealingSpellSelection({ mode: 'idle' });
          });

          setState((current) =>
            applyGameAction(current, {
              type: 'useHealingSpell',
              targetPlayerId,
              healingPosition,
            }),
          );
        }}
        selectableHealingPositions={selectableHealingPositions}
      />
      <div data-testid="healing-target-hp">{targetPlayer?.hp}</div>
      <div data-testid="healing-target-curse">{String(targetPlayer?.isCursed)}</div>
      <div data-testid="healing-target-position">
        {targetPlayer?.position.boardX},{targetPlayer?.position.boardY}
      </div>
      <div data-testid="active-spell-count">
        {state.players[state.activePlayerIndex].inventory.spells.length}
      </div>
      <div data-testid="phase-label">{state.phase}</div>
    </>
  );
}

function WitchSwapHarness({ initialState }: { initialState: GameState }) {
  const [state, setState] = useState(initialState);
  const [witchSwapSelection, setWitchSwapSelection] = useState<
    { mode: 'idle' } | { mode: 'select_target' }
  >({ mode: 'idle' });
  const activePlayer = state.players[state.activePlayerIndex];
  const otherPlayers = state.players.filter(
    (player) => player.id !== activePlayer.id,
  );

  return (
    <>
      <ActionPanel
        state={state}
        {...noopActions}
        healingSpellSelection={{ mode: 'idle' }}
        witchSwapSelection={witchSwapSelection}
        onCancelWitchSwapSelection={() =>
          setWitchSwapSelection({ mode: 'idle' })
        }
        onSelectWitchSwapTarget={(targetPlayerId) => {
          const targetPlayer = state.players.find(
            (player) => player.id === targetPlayerId,
          );

          flushSync(() => {
            setWitchSwapSelection({ mode: 'idle' });
          });

          setState((current) => {
            const nextState = applyGameAction(current, {
              type: 'swapWitchPosition',
              targetPlayerId,
            });

            return {
              ...nextState,
              eventLog: [
                ...nextState.eventLog,
                {
                  id: `event-${nextState.eventLog.length}`,
                  type: 'ui_action',
                  message: targetPlayer
                    ? `Swapped with ${heroName(targetPlayer.heroId)} to ${targetPlayer.position.boardX},${targetPlayer.position.boardY}`
                    : 'Swapped witch position',
                },
              ],
            };
          });
        }}
        onStartWitchSwapSelection={() =>
          setWitchSwapSelection({ mode: 'select_target' })
        }
      />
      <EventLog state={state} />
      <div data-testid="witch-phase">{state.phase}</div>
      <div data-testid="witch-position">
        {activePlayer.position.boardX},{activePlayer.position.boardY}
      </div>
      {otherPlayers.map((player) => (
        <div key={player.id} data-testid={`witch-target-position-${player.id}`}>
          {player.position.boardX},{player.position.boardY}
        </div>
      ))}
    </>
  );
}

function RoomAutoResolveHarness({ initialState }: { initialState: GameState }) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (
      state.phase === 'resolve_room_token' &&
      state.players[state.activePlayerIndex].kind === 'human'
    ) {
      setState((current) => applyGameAction(current, { type: 'resolveRoomToken' }));
    }
  }, [state]);

  return (
    <>
      <ActionPanel state={state} {...noopActions} />
      <div data-testid="room-phase">{state.phase}</div>
      <div data-testid="room-token">
        {state.board.find((tile) => tile.boardX === 0 && tile.boardY === -1)
          ?.roomToken?.id ?? 'none'}
      </div>
      <div data-testid="room-monster">{state.combat?.monsterId ?? 'none'}</div>
    </>
  );
}
