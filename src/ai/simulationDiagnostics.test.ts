import { describe, expect, it } from 'vitest';

import type { GameAction, GameState } from '../engine/core/types';
import { createNewGame } from '../engine/setup/createGame';
import { aiHeuristicConfig } from './config';
import { detectSimulationIssues } from './simulationDiagnostics';

describe('detectSimulationIssues missedHealingPriority', () => {
  function criticalState(overrides: Partial<GameState> = {}): GameState {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-healing-misses',
    });

    return {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, hp: 2, isCursed: false } : player,
      ),
      ...overrides,
    };
  }

  function detect(
    state: GameState,
    action: GameAction,
    legalActions: GameAction[],
  ): boolean {
    return detectSimulationIssues(
      state,
      action,
      legalActions,
      aiHeuristicConfig,
    ).includes('missedHealingPriority');
  }

  it('flags a miss when an available self-heal spell is not cast', () => {
    const state = criticalState();
    const activePlayerId = state.players[0].id;
    const legalActions: GameAction[] = [
      {
        type: 'useHealingSpell',
        targetPlayerId: activePlayerId,
        healingPosition: { boardX: 0, boardY: 0 },
      },
      { type: 'endTurn' },
    ];

    expect(detect(state, { type: 'endTurn' }, legalActions)).toBe(true);
  });

  it('does not flag a miss when the self-heal spell is actually cast', () => {
    const state = criticalState();
    const activePlayerId = state.players[0].id;
    const healAction: GameAction = {
      type: 'useHealingSpell',
      targetPlayerId: activePlayerId,
      healingPosition: { boardX: 0, boardY: 0 },
    };
    const legalActions: GameAction[] = [healAction, { type: 'endTurn' }];

    expect(detect(state, healAction, legalActions)).toBe(false);
  });

  it('flags a miss when standing on a healing tile without ending the turn', () => {
    const state = criticalState({
      board: [
        {
          tileInstanceId: 'tile-healing',
          blueprintId: 'start_cross_healing',
          rotation: 0,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const legalActions: GameAction[] = [
      { type: 'endTurn' },
      { type: 'movePlayer', target: { boardX: 1, boardY: 0 } },
    ];

    expect(
      detect(state, { type: 'movePlayer', target: { boardX: 1, boardY: 0 } }, legalActions),
    ).toBe(true);
  });

  it('does not flag a miss when ending the turn on a healing tile', () => {
    const state = criticalState({
      board: [
        {
          tileInstanceId: 'tile-healing',
          blueprintId: 'start_cross_healing',
          rotation: 0,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const legalActions: GameAction[] = [
      { type: 'endTurn' },
      { type: 'movePlayer', target: { boardX: 1, boardY: 0 } },
    ];

    expect(detect(state, { type: 'endTurn' }, legalActions)).toBe(false);
  });

  it('does not flag a miss on a healing tile when the retreat blocked ending the turn from healing', () => {
    const state = criticalState({
      healingEndTurnSource: 'combat_retreat_blocked',
      board: [
        {
          tileInstanceId: 'tile-healing',
          blueprintId: 'start_cross_healing',
          rotation: 0,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const legalActions: GameAction[] = [
      { type: 'endTurn' },
      { type: 'movePlayer', target: { boardX: 1, boardY: 0 } },
    ];

    expect(
      detect(state, { type: 'movePlayer', target: { boardX: 1, boardY: 0 } }, legalActions),
    ).toBe(false);
  });

  it('flags a miss when a legal move gets strictly closer to a known healing tile but a different action is taken', () => {
    const state = criticalState({
      board: [
        {
          tileInstanceId: 'tile-healing',
          blueprintId: 'start_cross_healing',
          rotation: 0,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-current',
          blueprintId: 'tunnel_straight',
          rotation: 0,
          boardX: 0,
          boardY: -1,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-farther',
          blueprintId: 'tunnel_straight',
          rotation: 0,
          boardX: 0,
          boardY: -2,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const critical: GameState = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0
          ? { ...player, hp: 2, isCursed: false, position: { boardX: 0, boardY: -2 } }
          : player,
      ),
    };
    const legalActions: GameAction[] = [
      { type: 'movePlayer', target: { boardX: 0, boardY: -1 } },
      { type: 'endTurn' },
    ];

    expect(detect(critical, { type: 'endTurn' }, legalActions)).toBe(true);
    expect(
      detect(
        critical,
        { type: 'movePlayer', target: { boardX: 0, boardY: -1 } },
        legalActions,
      ),
    ).toBe(false);
  });

  it('does not flag a miss when the known healing tile is not reachable via any discovered path', () => {
    const state = criticalState({
      board: [
        {
          tileInstanceId: 'tile-healing',
          blueprintId: 'start_cross_healing',
          rotation: 0,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-current',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 0,
          boardY: -2,
          discovered: true,
          looseItems: [],
        },
      ],
    });
    const critical: GameState = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, position: { boardX: 0, boardY: -2 } } : player,
      ),
    };
    const legalActions: GameAction[] = [
      { type: 'declareExplorationDirection', direction: 'B' },
      { type: 'endTurn' },
    ];

    expect(detect(critical, { type: 'endTurn' }, legalActions)).toBe(false);
  });

  it('does not flag a miss when hp and curse status do not require urgent healing', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-healthy',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, hp: player.maxHp, isCursed: false } : player,
      ),
    };
    const legalActions: GameAction[] = [{ type: 'endTurn' }];

    expect(detect(state, { type: 'endTurn' }, legalActions)).toBe(false);
  });
});

describe('detectSimulationIssues priority goals', () => {
  it('flags missedChestWithKey when a reachable chest is ignored despite a key', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-chest-priority',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: { ...player.inventory, keyCount: 1 },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
        },
        {
          tileInstanceId: 'tile-chest',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'treasure_chest', kind: 'chest' },
        },
      ],
    };
    const legalActions: GameAction[] = [
      { type: 'movePlayer', target: { boardX: 1, boardY: 0 } },
      { type: 'endTurn' },
    ];

    expect(
      detectSimulationIssues(state, { type: 'endTurn' }, legalActions, aiHeuristicConfig),
    ).toContain('missedChestWithKey');
  });

  it('does not flag missedChestWithKey when one of multiple equally valid first steps is chosen', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-chest-alternate-step',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      remainingSteps: 2,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: { ...player.inventory, keyCount: 1 },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
        },
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-south',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 0,
          boardY: 1,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-chest',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 1,
          boardY: 1,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'treasure_chest', kind: 'chest' },
        },
      ],
    };
    const legalActions: GameAction[] = [
      { type: 'movePlayer', target: { boardX: 1, boardY: 0 } },
      { type: 'movePlayer', target: { boardX: 0, boardY: 1 } },
      { type: 'endTurn' },
    ];

    expect(
      detectSimulationIssues(
        state,
        { type: 'movePlayer', target: { boardX: 0, boardY: 1 } },
        legalActions,
        aiHeuristicConfig,
      ),
    ).not.toContain('missedChestWithKey');
  });

  it('flags missedUpgradeLoot only when the item improves the active hero', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-upgrade-loot',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: {
                ...player.inventory,
                weapons: [{ type: 'weapon', bonus: 1 }, { type: 'weapon', bonus: 1 }],
              },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
        },
        {
          tileInstanceId: 'tile-loot',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [{ type: 'weapon', bonus: 2 }],
        },
      ],
    };
    const legalActions: GameAction[] = [
      { type: 'movePlayer', target: { boardX: 1, boardY: 0 } },
      { type: 'endTurn' },
    ];

    expect(
      detectSimulationIssues(state, { type: 'endTurn' }, legalActions, aiHeuristicConfig),
    ).toContain('missedUpgradeLoot');
  });

  it('treats upgrade loot as still contestable when the active hero can arrive this turn before a closer rival acts', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 2,
      seed: 'diagnostics-loot-turn-order',
      selectedAiHeroIds: ['hero_blade', 'hero_rogue'],
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      remainingSteps: 3,
      players: base.players.map((player, index) => {
        if (index === 0) {
          return {
            ...player,
            inventory: {
              ...player.inventory,
              weapons: [{ type: 'weapon', bonus: 1 }, { type: 'weapon', bonus: 1 }],
            },
            position: { boardX: 0, boardY: 0 },
          };
        }

        if (index === 1) {
          return {
            ...player,
            position: { boardX: 2, boardY: 1 },
          };
        }

        return player;
      }),
      board: [
        {
          ...base.board[0],
          boardX: 0,
          boardY: 0,
        },
        {
          tileInstanceId: 'tile-1',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-2',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-loot',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 3,
          boardY: 0,
          discovered: true,
          looseItems: [{ type: 'weapon', bonus: 2 }],
        },
        {
          tileInstanceId: 'tile-rival',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 2,
          boardY: 1,
          discovered: true,
          looseItems: [],
        },
      ],
    };
    const legalActions: GameAction[] = [
      { type: 'movePlayer', target: { boardX: 1, boardY: 0 } },
      { type: 'endTurn' },
    ];

    expect(
      detectSimulationIssues(state, { type: 'endTurn' }, legalActions, aiHeuristicConfig),
    ).toContain('missedUpgradeLoot');
  });

  it('flags missedWinningDragonWindow only when the dragon would secure the score', () => {
    const base = createNewGame({
      humanHeroId: 'hero_blade',
      aiCount: 1,
      seed: 'diagnostics-dragon-window',
    });
    const state: GameState = {
      ...base,
      phase: 'optional_monster_combat',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_blade',
              treasurePoints: 2,
              inventory: {
                ...player.inventory,
                weapons: [{ type: 'weapon', bonus: 3 }, { type: 'weapon', bonus: 3 }],
              },
            }
          : {
              ...player,
              treasurePoints: 3,
            },
      ),
      combat: {
        playerId: base.players[0].id,
        monsterId: 'dragon',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: -1, boardY: 0 },
      },
    };
    const legalActions: GameAction[] = [
      { type: 'startOptionalCombat' },
      { type: 'endTurn' },
    ];

    expect(
      detectSimulationIssues(
        state,
        { type: 'endTurn' },
        legalActions,
        {
          ...aiHeuristicConfig,
          minimumDragonWinChance: 0.15,
        },
      ),
    ).toContain('missedWinningDragonWindow');
  });
});
