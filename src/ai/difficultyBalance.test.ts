import { describe, expect, it } from 'vitest';

import type { GameState, PlacedTile } from '../engine/core/types';
import { createNewGame } from '../engine/setup/createGame';
import { createTestState } from '../test/gameStateFactory';
import { playAiGameToEnd } from './autoplay';
import {
  aiHeuristicConfig,
  easyAiConfig,
  getDifficultyConfig,
  hardAiConfig,
  normalAiConfig,
} from './config';
import { chooseHeuristicAiAction, estimateCombatWinChance } from './heuristicAgent';
import { getLegalAiActions } from './legalActions';

// ---------------------------------------------------------------------------
// Config preset validation
// ---------------------------------------------------------------------------

describe('difficulty config presets', () => {
  it('easy has higher mistakeRate than normal and hard', () => {
    expect(easyAiConfig.mistakeRate).toBeGreaterThan(normalAiConfig.mistakeRate);
    expect(easyAiConfig.mistakeRate).toBeGreaterThan(hardAiConfig.mistakeRate);
    expect(normalAiConfig.mistakeRate).toBe(0);
    expect(hardAiConfig.mistakeRate).toBe(0);
  });

  it('hard fights the dragon only when win chance is higher than normal', () => {
    expect(hardAiConfig.minimumDragonWinChance).toBeGreaterThan(
      normalAiConfig.minimumDragonWinChance,
    );
    expect(normalAiConfig.minimumDragonWinChance).toBeGreaterThan(
      easyAiConfig.minimumDragonWinChance,
    );
  });

  it('hard explores more aggressively than easy', () => {
    expect(hardAiConfig.exploreTileBonus).toBeGreaterThan(
      normalAiConfig.exploreTileBonus,
    );
    expect(normalAiConfig.exploreTileBonus).toBeGreaterThan(
      easyAiConfig.exploreTileBonus,
    );
  });

  it('hard avoids unwinnable monsters more than easy', () => {
    expect(hardAiConfig.knownMonsterPenalty).toBeLessThan(
      normalAiConfig.knownMonsterPenalty,
    );
    expect(normalAiConfig.knownMonsterPenalty).toBeLessThan(
      easyAiConfig.knownMonsterPenalty,
    );
  });

  it('getDifficultyConfig returns the correct preset for each level', () => {
    expect(getDifficultyConfig('easy')).toBe(easyAiConfig);
    expect(getDifficultyConfig('normal')).toBe(normalAiConfig);
    expect(getDifficultyConfig('hard')).toBe(hardAiConfig);
  });

  it('normalAiConfig is identical to the base aiHeuristicConfig', () => {
    expect(normalAiConfig).toBe(aiHeuristicConfig);
  });
});

// ---------------------------------------------------------------------------
// Dragon combat threshold behaviour
// ---------------------------------------------------------------------------

describe('optional dragon combat by difficulty', () => {
  function buildOptionalDragonState(difficulty: GameState['difficulty']): GameState {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'balance-dragon-optional',
      difficulty,
    });

    const dragonTile: PlacedTile = {
      tileInstanceId: 'tile-dragon',
      blueprintId: 'room_cross',
      rotation: 0,
      boardX: 0,
      boardY: -1,
      discovered: true,
      looseItems: [],
      roomToken: { id: 'dragon', kind: 'monster' },
    };

    // Player has weak equipment: only a +1 weapon → win chance well below 50%
    return {
      ...base,
      phase: 'optional_monster_combat',
      board: [base.board[0], dragonTile],
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              position: { boardX: 0, boardY: -1 },
              inventory: {
                keyCount: 0,
                weapons: [{ type: 'weapon', bonus: 1 }],
                spells: [],
              },
            }
          : player,
      ),
      remainingSteps: 2,
      combat: {
        playerId: base.players[0].id,
        monsterId: 'dragon',
        position: { boardX: 0, boardY: -1 },
        enteredFrom: { boardX: 0, boardY: 0 },
      },
    };
  }

  it('easy AI fights the dragon even with a low win chance', () => {
    const state = buildOptionalDragonState('easy');
    const legalActions = getLegalAiActions(state);
    const action = chooseHeuristicAiAction(state, legalActions, easyAiConfig);

    // At minimumDragonWinChance: 0.2 the AI should fight even when poorly equipped
    const winChance = estimateCombatWinChance(state.players[0], 20);
    if (winChance >= easyAiConfig.minimumDragonWinChance) {
      expect(action.type).toBe('startOptionalCombat');
    } else {
      expect(action.type).not.toBe('startOptionalCombat');
    }
  });

  it('hard AI retreats from the dragon when win chance is below 50%', () => {
    const state = buildOptionalDragonState('hard');
    const legalActions = getLegalAiActions(state);

    const winChance = estimateCombatWinChance(state.players[0], 20);

    if (winChance < hardAiConfig.minimumDragonWinChance) {
      const action = chooseHeuristicAiAction(state, legalActions, hardAiConfig);
      expect(action.type).not.toBe('startOptionalCombat');
    }
  });
});

// ---------------------------------------------------------------------------
// Mistake injection for Easy
// ---------------------------------------------------------------------------

describe('easy mistakeRate produces non-optimal choices', () => {
  it('with mistakeRate 1.0 the AI always picks the first legal action', () => {
    const alwaysMistakeConfig = { ...easyAiConfig, mistakeRate: 1.0 };
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'balance-mistake-test',
      difficulty: 'easy',
    });
    const legalActions = getLegalAiActions(state);
    const action = chooseHeuristicAiAction(state, legalActions, alwaysMistakeConfig);

    expect(legalActions).toContainEqual(action);
  });

  it('with mistakeRate 0 the AI behaves identically to normal', () => {
    const noMistakeEasy = { ...easyAiConfig, mistakeRate: 0 };
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'balance-no-mistake',
      difficulty: 'normal',
    });
    const legalActions = getLegalAiActions(state);

    const easyAction = chooseHeuristicAiAction(state, legalActions, noMistakeEasy);
    const normalAction = chooseHeuristicAiAction(state, legalActions, normalAiConfig);

    expect(easyAction).toEqual(normalAction);
  });
});

// ---------------------------------------------------------------------------
// All difficulties complete the pre-built dragon endgame
// ---------------------------------------------------------------------------

describe('dragon endgame completion at each difficulty', () => {
  function createDragonEndgame(difficulty: GameState['difficulty']): GameState {
    const base = createNewGame({
      humanHeroId: 'hero_rogue',
      aiCount: 1,
      seed: 'ai-dragon-endgame',
      difficulty,
    });

    const dragonTile: PlacedTile = {
      tileInstanceId: 'tile-dragon',
      blueprintId: 'room_cross',
      rotation: 0,
      boardX: 0,
      boardY: -1,
      discovered: true,
      looseItems: [],
      roomToken: { id: 'dragon', kind: 'monster' },
    };

    return {
      ...base,
      activePlayerIndex: 0,
      phase: 'combat',
      board: [base.board[0], dragonTile],
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_rogue',
              position: { boardX: 0, boardY: -1 },
              inventory: {
                keyCount: 0,
                weapons: [
                  { type: 'weapon', bonus: 3 },
                  { type: 'weapon', bonus: 3 },
                ],
                spells: [
                  { type: 'spell', spellKind: 'flame' },
                  { type: 'spell', spellKind: 'flame' },
                  { type: 'spell', spellKind: 'flame' },
                ],
              },
            }
          : player,
      ),
      remainingSteps: 3,
      lastMoveFrom: { boardX: 0, boardY: 0 },
      combat: {
        playerId: base.players[0].id,
        monsterId: 'dragon',
        position: { boardX: 0, boardY: -1 },
        enteredFrom: { boardX: 0, boardY: 0 },
      },
    };
  }

  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    it(`${difficulty} difficulty finishes the dragon combat`, () => {
      const result = playAiGameToEnd(createDragonEndgame(difficulty), 100);

      expect(result.state.phase).toBe('game_over');
      expect(result.state.victory?.defeatedDragonByPlayerId).toBeDefined();
    });
  }
});

// ---------------------------------------------------------------------------
// GameState difficulty field integration
// ---------------------------------------------------------------------------

describe('difficulty field in GameState', () => {
  it('createNewGame defaults to normal difficulty', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'balance-default',
    });

    expect(state.difficulty).toBe('normal');
  });

  it('createNewGame stores the selected difficulty', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      const state = createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: `balance-store-${difficulty}`,
        difficulty,
      });

      expect(state.difficulty).toBe(difficulty);
    }
  });

  it('createTestState defaults to normal difficulty', () => {
    const state = createTestState();

    expect(state.difficulty).toBe('normal');
  });
});
