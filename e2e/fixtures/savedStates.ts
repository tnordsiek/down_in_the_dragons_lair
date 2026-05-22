import type { GameState } from '../../src/engine/core/types';
import { serializeGameState } from '../../src/engine/serialization/json';
import { persistedGameStateKey } from '../../src/state/persistence';

const dragonFightState: GameState = {
  schemaVersion: 2,
  phase: 'combat',
  players: [
    {
      id: 'player_human',
      kind: 'human',
      heroId: 'hero_rogue',
      hp: 5,
      maxHp: 5,
      inventory: {
        weapons: [
          { type: 'weapon', bonus: 3 },
          { type: 'weapon', bonus: 3 },
        ],
        spells: [],
        keyCount: 0,
      },
      treasurePoints: 1,
      isCursed: false,
      skipNextTurn: false,
      position: { boardX: 0, boardY: -1 },
    },
    {
      id: 'player_ai_1',
      kind: 'ai',
      heroId: 'hero_mage',
      hp: 5,
      maxHp: 5,
      inventory: { weapons: [], spells: [], keyCount: 0 },
      treasurePoints: 0,
      isCursed: false,
      skipNextTurn: false,
      position: { boardX: 0, boardY: 0 },
    },
  ],
  board: [
    {
      tileInstanceId: 'tile-0',
      blueprintId: 'start_cross_healing',
      rotation: 0,
      boardX: 0,
      boardY: 0,
      discovered: true,
      looseItems: [],
    },
    {
      tileInstanceId: 'tile-dragon',
      blueprintId: 'room_cross',
      rotation: 0,
      boardX: 0,
      boardY: -1,
      discovered: true,
      looseItems: [],
      roomToken: { id: 'dragon', kind: 'monster' },
    },
  ],
  tileStack: [],
  tokenBag: [],
  activePlayerIndex: 0,
  remainingSteps: 3,
  lastMoveFrom: { boardX: 0, boardY: 0 },
  combat: {
    playerId: 'player_human',
    monsterId: 'dragon',
    position: { boardX: 0, boardY: -1 },
    enteredFrom: { boardX: 0, boardY: 0 },
  },
  eventLog: [
    {
      id: 'event-0',
      type: 'test_setup',
      message: 'Saved endgame loaded',
    },
  ],
  rng: { seed: 'dragon-e2e-1', state: 3876810955 },
};

export const savedDragonFight = {
  storageKey: persistedGameStateKey,
  serializedState: serializeGameState(dragonFightState),
};
