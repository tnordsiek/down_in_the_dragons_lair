import { createNewGame } from '../../engine/setup/createGame';
import type {
  GameState,
  HeroId,
  PlacedTile,
  Player,
} from '../../engine/core/types';

/**
 * Small, engine-valid GameState fixtures used purely to render the real game
 * components (PlayerPanel, BoardView, ActionPanel) as static illustrations in
 * the tutorial. Built on top of createNewGame() — like the createUiState/
 * baseBoard helpers in milestone6Ui.test.tsx — then narrowed to the exact phase
 * a tutorial step explains.
 *
 * Board fixtures use a neutral hero (Valkyrie) as the active player so the
 * Mage's "move through walls" passive does not distort the connection-based
 * movement examples.
 */

const base = createNewGame({
  humanHeroId: 'hero_valkyrie',
  aiCount: 1,
  seed: 'tutorial-visual',
});

function withState(overrides: Partial<GameState>): GameState {
  return {
    ...base,
    activePlayerIndex: 0,
    ...overrides,
  };
}

function makePlayer(
  overrides: Partial<Player> & { id: string; heroId: HeroId },
): Player {
  return {
    kind: 'human',
    hp: 5,
    maxHp: 5,
    inventory: { weapons: [], spells: [], keyCount: 0 },
    treasurePoints: 0,
    isCursed: false,
    skipNextTurn: false,
    position: { boardX: 0, boardY: 0 },
    ...overrides,
  };
}

const startTile: PlacedTile = {
  tileInstanceId: 'tile-start',
  blueprintId: 'start_cross_healing',
  rotation: 0,
  boardX: 0,
  boardY: 0,
  discovered: true,
  looseItems: [],
};

function tunnel(boardY: number): PlacedTile {
  return {
    tileInstanceId: `tile-tunnel-${boardY}`,
    blueprintId: 'tunnel_straight',
    rotation: 0,
    boardX: 0,
    boardY,
    discovered: true,
    looseItems: [],
  };
}

const activeValkyrie = makePlayer({
  id: 'player_human',
  heroId: 'hero_valkyrie',
});

/** Two filled player cards — heroes, HP, weapon bonus, treasure points. */
export function playerCardsState(): GameState {
  return withState({
    phase: 'turn_start',
    players: [
      makePlayer({
        id: 'player_human',
        heroId: 'hero_valkyrie',
        treasurePoints: 2,
        inventory: {
          weapons: [{ type: 'weapon', bonus: 1 }],
          spells: [],
          keyCount: 0,
        },
      }),
      makePlayer({
        id: 'player_ai_1',
        kind: 'ai',
        heroId: 'hero_rogue',
        treasurePoints: 1,
      }),
    ],
  });
}

/** Action panel header showing the current phase and the 4 remaining steps. */
export function turnActionsState(): GameState {
  return withState({
    phase: 'turn_start',
    remainingSteps: 4,
    board: [startTile],
    players: [activeValkyrie],
  });
}

/**
 * A short discovered corridor with a single step left, so only the adjacent
 * tile is reachable and shows a clean move-cost badge of 1 — without the
 * "walk out and back" badge that a deeper step budget would place on the start
 * tile.
 */
export function movementState(): GameState {
  return withState({
    phase: 'await_move',
    remainingSteps: 1,
    board: [startTile, tunnel(-1), tunnel(-2)],
    players: [activeValkyrie],
  });
}

/** Only the start tile, so all four exploration targets are offered. */
export function explorationState(): GameState {
  return withState({
    phase: 'await_move',
    remainingSteps: 4,
    board: [startTile],
    players: [activeValkyrie],
  });
}

/** A pending tile awaiting rotation, with the rotate/confirm controls. */
export function tileRotationState(): GameState {
  return withState({
    phase: 'choose_pending_tile_rotation',
    remainingSteps: 3,
    board: [startTile],
    players: [activeValkyrie],
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
}

function roomTile(roomToken: PlacedTile['roomToken']): PlacedTile {
  return {
    tileInstanceId: 'tile-room',
    blueprintId: 'room_cross',
    rotation: 0,
    boardX: 0,
    boardY: -1,
    discovered: true,
    looseItems: [],
    roomToken,
  };
}

/** A discovered room guarded by a monster token. */
export function roomTokenState(): GameState {
  return withState({
    phase: 'await_move',
    remainingSteps: 3,
    board: [startTile, roomTile({ id: 'creepy_spider', kind: 'monster' })],
    players: [activeValkyrie],
  });
}

/** A player card with weapons, a spell, a key and treasure points (loot). */
export function inventoryState(): GameState {
  return withState({
    phase: 'turn_start',
    players: [
      makePlayer({
        id: 'player_human',
        heroId: 'hero_valkyrie',
        treasurePoints: 2,
        inventory: {
          weapons: [
            { type: 'weapon', bonus: 1 },
            { type: 'weapon', bonus: 2 },
          ],
          spells: [{ type: 'spell', spellKind: 'flame' }],
          keyCount: 1,
        },
      }),
    ],
  });
}

/** A discovered room holding a treasure chest token. */
export function chestState(): GameState {
  return withState({
    phase: 'await_move',
    remainingSteps: 3,
    board: [startTile, roomTile({ id: 'treasure_chest', kind: 'chest' })],
    players: [
      makePlayer({
        id: 'player_human',
        heroId: 'hero_valkyrie',
        inventory: { weapons: [], spells: [], keyCount: 1 },
      }),
    ],
  });
}

/** A wounded hero, illustrating HP that healing can restore. */
export function healingState(): GameState {
  return withState({
    phase: 'turn_start',
    players: [
      makePlayer({
        id: 'player_human',
        heroId: 'hero_valkyrie',
        hp: 2,
        inventory: {
          weapons: [],
          spells: [{ type: 'spell', spellKind: 'healing' }],
          keyCount: 0,
        },
      }),
    ],
  });
}

/** Two players with the active one highlighted (turn order / opponents). */
export function turnOrderState(): GameState {
  return withState({
    phase: 'turn_start',
    activePlayerIndex: 0,
    players: [
      makePlayer({ id: 'player_human', heroId: 'hero_valkyrie' }),
      makePlayer({ id: 'player_ai_1', kind: 'ai', heroId: 'hero_rogue' }),
    ],
  });
}

/** Differing treasure scores, illustrating how the winner is decided. */
export function scoreboardState(): GameState {
  return withState({
    phase: 'turn_start',
    players: [
      makePlayer({
        id: 'player_human',
        heroId: 'hero_valkyrie',
        treasurePoints: 4,
      }),
      makePlayer({
        id: 'player_ai_1',
        kind: 'ai',
        heroId: 'hero_rogue',
        treasurePoints: 2,
      }),
    ],
  });
}

/** Example combat roll shown as dice images. */
export const tutorialCombatDice: [number, number] = [5, 6];
