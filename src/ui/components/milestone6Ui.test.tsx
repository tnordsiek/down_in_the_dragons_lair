import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createNewGame } from '../../engine/setup/createGame';
import type { GameState } from '../../engine/core/types';
import { ActionPanel } from './ActionPanel';
import { BoardView } from './BoardView';
import { EndScreen } from './EndScreen';
import { EventLog } from './EventLog';
import { PlayerPanel } from './PlayerPanel';

const noopActions = {
  onMove: vi.fn(),
  onExplore: vi.fn(),
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
              isCursed: true,
              skipNextTurn: true,
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
    expect(
      screen.getByText('Resolved combat and gained treasure'),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Key' })).toHaveAttribute(
      'src',
      '/assets/items/item_key.png',
    );
    expect(screen.getByRole('img', { name: 'Weapon +2' })).toHaveAttribute(
      'src',
      '/assets/items/item_weapon_2.png',
    );
    expect(screen.getByRole('img', { name: 'flame spell' })).toHaveAttribute(
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

  it('renders mapped hero and monster images on the board', () => {
    const state = createUiState({
      board: [
        {
          ...baseBoard()[0],
          rotation: 90,
          roomToken: { id: 'giant_rat', kind: 'monster' },
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
    expect(screen.getByRole('img', { name: 'Giant Rat' })).toHaveAttribute(
      'src',
      '/assets/monsters/token_giant_rat.png',
    );
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
    expect(onMove).toHaveBeenCalledWith('A');
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
    expect(onMovePath).toHaveBeenCalledWith(['B', 'B']);
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

    Object.defineProperty(board, 'clientWidth', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(board, 'clientHeight', {
      configurable: true,
      value: 600,
    });

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

    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('translate(136px, 112px)'),
    );

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

    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('translate(212px, 112px) scale(1)'),
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

    fireEvent.wheel(board, { deltaY: -100 });
    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(1.1)'),
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
      expect.stringContaining('translate(40px, 25px)'),
    );
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
      screen.getByRole('button', { name: 'Focus Mage on map' }),
    );

    expect(onFocusPosition).toHaveBeenCalledOnce();
    expect(onFocusPosition).toHaveBeenCalledWith({ boardX: 0, boardY: 0 });
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
