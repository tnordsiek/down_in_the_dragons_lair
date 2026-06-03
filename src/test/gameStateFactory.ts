import type {
  BoardPosition,
  GameState,
  Item,
  Player,
  PlacedTile,
  Rotation,
  TileBlueprintId,
  Token,
} from '../engine/core/types';

type TestStateOverrides = Partial<
  Omit<
    GameState,
    'players' | 'board' | 'tileStack' | 'tokenBag' | 'eventLog' | 'rng'
  >
> & {
  players?: Player[];
  board?: PlacedTile[];
  tileStack?: GameState['tileStack'];
  tokenBag?: GameState['tokenBag'];
  eventLog?: GameState['eventLog'];
  rng?: GameState['rng'];
};

export function createTestPlayer(overrides: Partial<Player> = {}): Player {
  const { inventory, position, ...playerOverrides } = overrides;

  return {
    id: 'player_human',
    kind: 'human',
    heroId: 'hero_mage',
    hp: 5,
    maxHp: 5,
    inventory: {
      weapons: [],
      spells: [],
      keyCount: 0,
      ...inventory,
    },
    treasurePoints: 0,
    isCursed: false,
    skipNextTurn: false,
    position: {
      boardX: 0,
      boardY: 0,
      ...position,
    },
    ...playerOverrides,
  };
}

export function createTestTile(
  overrides: Partial<PlacedTile> & {
    boardX?: number;
    boardY?: number;
    blueprintId?: TileBlueprintId;
    rotation?: Rotation;
    looseItems?: Item[];
    roomToken?: Token;
  } = {},
): PlacedTile {
  return {
    tileInstanceId: 'tile-0',
    blueprintId: 'start_cross_healing',
    rotation: 0,
    boardX: 0,
    boardY: 0,
    discovered: true,
    looseItems: [],
    ...overrides,
  };
}

export function createPosition(boardX: number, boardY: number): BoardPosition {
  return { boardX, boardY };
}

export function createTestState(overrides: TestStateOverrides = {}): GameState {
  return {
    schemaVersion: 2,
    phase: overrides.phase ?? 'turn_start',
    players: overrides.players ?? [createTestPlayer()],
    board: overrides.board ?? [createTestTile()],
    tileStack: overrides.tileStack ?? [],
    tokenBag: overrides.tokenBag ?? [],
    activePlayerIndex: overrides.activePlayerIndex ?? 0,
    remainingSteps: overrides.remainingSteps ?? 4,
    lastMoveFrom: overrides.lastMoveFrom,
    combat: overrides.combat,
    pendingTile: overrides.pendingTile,
    pendingLoot: overrides.pendingLoot,
    pendingSeeressRoomChoice: overrides.pendingSeeressRoomChoice,
    turnContinuationReason: overrides.turnContinuationReason,
    eventLog: overrides.eventLog ?? [],
    victory: overrides.victory,
    rng: overrides.rng ?? { seed: 'test-seed', state: 1 },
  };
}
