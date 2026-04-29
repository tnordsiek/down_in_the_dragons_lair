import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createNewGame } from '../../engine/setup/createGame';
import type { GameState } from '../../engine/core/types';
import { ActionPanel } from './ActionPanel';
import { EndScreen } from './EndScreen';
import { EventLog } from './EventLog';
import { PlayerPanel } from './PlayerPanel';

const noopActions = {
  onMove: vi.fn(),
  onExplore: vi.fn(),
  onPlaceTile: vi.fn(),
  onResolveRoom: vi.fn(),
  onResolveCombat: vi.fn(),
  onOpenChest: vi.fn(),
  onEndTurn: vi.fn(),
};

describe('Milestone 6 UI', () => {
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
        legalRotations: [0, 90],
        skippedBlueprintIds: [],
      },
    });

    render(<ActionPanel state={state} {...noopActions} />);

    expect(screen.getByText('room_corner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '0 deg' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '90 deg' })).toBeInTheDocument();
  });

  it('shows combat math and loot state', () => {
    const state = createUiState({
      phase: 'combat',
      combat: {
        playerId: 'player_human',
        monsterId: 'giant_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
      eventLog: [
        {
          id: 'event-combat',
          type: 'combat',
          message: 'Resolved combat and gained treasure',
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
            }
          : player,
      ),
    });

    render(<ActionPanel state={state} {...noopActions} />);
    render(<PlayerPanel state={state} />);
    render(<EventLog state={state} />);

    expect(screen.getByText('Giant Rat strength 5')).toBeInTheDocument();
    expect(screen.getByText(/2d6 \+ weapons \+2/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Resolve Combat' }),
    ).toBeInTheDocument();
    expect(screen.getByText('7 pts')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(
      screen.getByText('Resolved combat and gained treasure'),
    ).toBeInTheDocument();
  });

  it('shows game end ranking', () => {
    const state = createUiState({
      phase: 'game_over',
      victory: {
        defeatedDragonByPlayerId: 'player_human',
        winnerPlayerIds: ['player_ai_1'],
      },
      players: createUiState().players.map((player, index) => ({
        ...player,
        treasurePoints: index === 0 ? 10 : 20,
      })),
    });

    render(<EndScreen state={state} onNewGame={vi.fn()} />);

    expect(screen.getByText('Game Over')).toBeInTheDocument();
    expect(
      screen.getByText('Dragon defeated by player_human'),
    ).toBeInTheDocument();
    expect(screen.getByText('player_ai_1')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New Game' }),
    ).toBeInTheDocument();
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
