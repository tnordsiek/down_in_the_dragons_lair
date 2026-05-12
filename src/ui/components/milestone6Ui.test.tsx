import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { HeroId } from '../../engine/core/types';
import { createNewGame } from '../../engine/setup/createGame';
import type { GameState } from '../../engine/core/types';
import { ActionPanel } from './ActionPanel';
import { BoardView } from './BoardView';
import { EndScreen } from './EndScreen';
import { EventLog } from './EventLog';
import { GameScreen } from '../screens/GameScreen';
import { PlayerPanel } from './PlayerPanel';
import { useSetupStore } from '../../state/setupStore';

const noopActions = {
  onBeginLoot: vi.fn(),
  onLeaveLoot: vi.fn(),
  onMove: vi.fn(),
  onExplore: vi.fn(),
  onResolveRoom: vi.fn(),
  onResolveCombat: vi.fn(),
  onSwapLoot: vi.fn(),
  onTakeLoot: vi.fn(),
  onOpenChest: vi.fn(),
  onEndTurn: vi.fn(),
};

describe('Milestone 6 UI', () => {
  afterEach(() => {
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
          type: 'combat_resolved',
          message: 'Resolved combat and defeated Giant Rat',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (player_human)',
          combat: {
            monsterId: 'giant_rat',
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

    expect(screen.getByText('Giant Rat strength 5')).toBeInTheDocument();
    expect(screen.getByText(/2d6 \+ weapons \+2/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Resolve Combat' }),
    ).toBeInTheDocument();
    expect(screen.getByText('7 pts')).toBeInTheDocument();
    expect(screen.getByText('Mage (player_human)')).toBeInTheDocument();
    expect(
      screen.getByText('Resolved combat: Victory'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Giant Rat strength 5 · dice 6 + 4 · total 14'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('weapons +2 · flame +1 · oracle +1'),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Key' })).toHaveAttribute(
      'src',
      '/assets/items/item_key.png',
    );
    expect(screen.getByRole('img', { name: 'Weapon +2' })).toHaveAttribute(
      'src',
      '/assets/items/item_weapon_2.png',
    );
    expect(screen.getByRole('img', { name: 'Flame spell' })).toHaveAttribute(
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

  it('shows the latest resolved combat dice as header images', () => {
    const state = createUiState({
      phase: 'await_move',
      eventLog: [
        {
          id: 'event-combat-old',
          type: 'combat_resolved',
          message: 'Resolved combat against Giant Rat',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (player_human)',
          combat: {
            monsterId: 'giant_rat',
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
          message: 'Resolved combat against Giant Spider',
          playerId: 'player_human',
          playerHeroId: 'hero_mage',
          playerLabel: 'Mage (player_human)',
          combat: {
            monsterId: 'giant_spider',
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

    expect(screen.getByRole('img', { name: 'Weapon +2' })).toHaveAttribute(
      'src',
      '/assets/items/item_weapon_2.png',
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

    fireEvent.wheel(board, { deltaY: -100 });

    expect(transformLayer).toHaveAttribute(
      'style',
      expect.stringContaining('scale(1.1)'),
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
              heroId: 'hero_thief',
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
    expect(screen.getByRole('button', { name: 'Mage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thief' })).toBeInTheDocument();
    expect(screen.getByText('ATK +2')).toHaveAttribute(
      'title',
      'Current weapon bonus: +2',
    );
    expect(screen.getByText('Flame∞')).toHaveAttribute(
      'title',
      'Mage: flame spells are not consumed',
    );
    expect(screen.getByRole('button', { name: 'Focus Mage on map' })).toHaveAttribute(
      'title',
      'Mage portrait - right-click to focus on map',
    );
    expect(within(mageCard).getByText('0 pts')).toBeInTheDocument();
    expect(within(thiefCard).getByText('0 pts')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Weapon +2' })).toHaveAttribute(
      'title',
      'Weapon +2',
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

    fireEvent.click(screen.getByRole('button', { name: 'Thief' }));

    expect(screen.getByTestId('hero-info-player_ai_1')).toHaveTextContent(
      'Combat draws count as wins. The Thief may ignore monsters while moving.',
    );
  });

  it('spans the last player card across both columns for three players', () => {
    const state = createUiStateWithPlayerCount(3, [
      'hero_mage',
      'hero_warrior',
      'hero_oracle',
    ]);

    render(<PlayerPanel state={state} />);

    expect(screen.getByTestId('player-panel-grid')).toHaveClass('sm:grid-cols-2');
    expect(screen.getByTestId('player-card-player_ai_2')).toHaveClass(
      'sm:col-span-2',
    );
  });

  it('renders a two-by-two compact player grid for four players and shows the oracle bonus only when active', () => {
    const state = {
      ...createUiStateWithPlayerCount(4, [
        'hero_mage',
        'hero_warrior',
        'hero_warlock',
        'hero_oracle',
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

    fireEvent.click(screen.getByRole('button', { name: 'Oracle' }));

    expect(screen.getByTestId('hero-info-player_ai_3')).toHaveTextContent(
      'Draws two room tokens and chooses one. Gains +1 combat strength before the first step is spent.',
    );
  });

  it('shows the newest event first and still limits the log to the last eight entries', () => {
    const state = createUiState({
      eventLog: Array.from({ length: 10 }, (_, index) => ({
        id: `event-${index}`,
        type: 'ui_action',
        message: `Event ${index}`,
      })),
    });

    const { container } = render(<EventLog state={state} />);
    const entries = Array.from(container.querySelectorAll('ol > li'));

    expect(entries).toHaveLength(8);
    expect(entries[0]).toHaveTextContent('Event 9');
    expect(entries[1]).toHaveTextContent('Event 8');
    expect(entries[7]).toHaveTextContent('Event 2');
    expect(screen.queryByText('Event 1')).toBeNull();
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
  playerCount: 3 | 4,
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
