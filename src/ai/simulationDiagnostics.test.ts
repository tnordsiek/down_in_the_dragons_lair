import { describe, expect, it, vi } from 'vitest';

import { monsterDefinitions } from '../data/monsters';
import type { GameAction, GameState } from '../engine/core/types';
import { createNewGame } from '../engine/setup/createGame';
import { aiHeuristicConfig } from './config';
import * as configModule from './config';
import {
  estimateCombatWinChance,
  getEffectiveAiHeuristicConfig,
  getMonsterMovementDesirabilityThreshold,
} from './heuristicAgent';
import {
  createStaleActionTracker,
  detectSimulationIssues,
  isMeaningfulProgress,
} from './simulationDiagnostics';

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

  it('keeps upgrade loot contestable when a closer rival cannot use the item', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-loot-rival-no-need',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      remainingSteps: 3,
      players: base.players.map((player, index) => {
        if (index === 0) {
          // Active hero has weak weapons, so the bonus-2 weapon is an upgrade.
          return {
            ...player,
            position: { boardX: 0, boardY: 0 },
            inventory: {
              ...player.inventory,
              weapons: [{ type: 'weapon', bonus: 1 }, { type: 'weapon', bonus: 1 }],
            },
          };
        }

        // Rival is closer to the loot but already holds two stronger weapons,
        // so the item is no upgrade for them and they will not race for it.
        return {
          ...player,
          position: { boardX: 2, boardY: 0 },
          inventory: {
            ...player.inventory,
            weapons: [{ type: 'weapon', bonus: 3 }, { type: 'weapon', bonus: 3 }],
          },
        };
      }),
      board: [
        { ...base.board[0], boardX: 0, boardY: 0 },
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
          tileInstanceId: 'tile-loot',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 2,
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

  it('flags avoidableRiskFights for a normal low-win optional combat', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-risk-fight-normal',
    });
    const state: GameState = {
      ...base,
      phase: 'optional_monster_combat',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_rogue',
              inventory: {
                ...player.inventory,
                weapons: [],
              },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
          roomToken: { id: 'skeleton_lord', kind: 'monster' },
        },
      ],
      combat: {
        playerId: base.players[0].id,
        monsterId: 'skeleton_lord',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: 0 },
      },
    };
    const legalActions: GameAction[] = [
      { type: 'startOptionalCombat' },
      { type: 'endTurn' },
    ];
    const winChance = estimateCombatWinChance(
      state.players[0],
      monsterDefinitions.skeleton_lord.strength,
    );

    expect(winChance).toBeLessThan(
      aiHeuristicConfig.minimumRepeatCombatWinChance,
    );
    expect(
      detectSimulationIssues(
        state,
        { type: 'startOptionalCombat' },
        legalActions,
        aiHeuristicConfig,
      ),
    ).toContain('avoidableRiskFights');
  });

  it('does not flag avoidableRiskFights for a desperate combat inside the narrowed escape hatch', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-risk-fight-desperate-allowed',
    });
    const state: GameState = {
      ...base,
      phase: 'optional_monster_combat',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_rogue',
              inventory: {
                ...player.inventory,
                weapons: [],
              },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
          roomToken: { id: 'skeleton_lord', kind: 'monster' },
        },
      ],
      combat: {
        playerId: base.players[0].id,
        monsterId: 'skeleton_lord',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: 0 },
      },
    };
    const legalActions: GameAction[] = [
      { type: 'startOptionalCombat' },
      { type: 'endTurn' },
    ];
    const desperateConfig = getEffectiveAiHeuristicConfig(
      aiHeuristicConfig,
      aiHeuristicConfig.staleActionThreshold,
    );
    const winChance = estimateCombatWinChance(
      state.players[0],
      monsterDefinitions.skeleton_lord.strength,
    );

    expect(winChance).toBeGreaterThanOrEqual(
      desperateConfig.minimumRepeatCombatWinChance,
    );
    expect(
      detectSimulationIssues(
        state,
        { type: 'startOptionalCombat' },
        legalActions,
        aiHeuristicConfig,
        aiHeuristicConfig.staleActionThreshold,
      ),
    ).not.toContain('avoidableRiskFights');
  });

  it('still flags avoidableRiskFights for desperate combats below the narrowed escape hatch', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-risk-fight-desperate-blocked',
    });
    const state: GameState = {
      ...base,
      phase: 'optional_monster_combat',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_rogue',
              inventory: {
                ...player.inventory,
                weapons: [],
              },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
          roomToken: { id: 'soulburner', kind: 'monster' },
        },
      ],
      combat: {
        playerId: base.players[0].id,
        monsterId: 'soulburner',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: 0 },
      },
    };
    const legalActions: GameAction[] = [
      { type: 'startOptionalCombat' },
      { type: 'endTurn' },
    ];
    const desperateConfig = getEffectiveAiHeuristicConfig(
      aiHeuristicConfig,
      aiHeuristicConfig.staleActionThreshold,
    );
    const winChance = estimateCombatWinChance(
      state.players[0],
      monsterDefinitions.soulburner.strength,
    );

    expect(winChance).toBeLessThan(
      desperateConfig.minimumRepeatCombatWinChance,
    );
    expect(
      detectSimulationIssues(
        state,
        { type: 'startOptionalCombat' },
        legalActions,
        aiHeuristicConfig,
        aiHeuristicConfig.staleActionThreshold,
      ),
    ).toContain('avoidableRiskFights');
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

describe('detectSimulationIssues stalledTurns', () => {
  it('flags ending the turn while a productive move is available and nothing forces a wait', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-genuine-stall',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, hp: player.maxHp, isCursed: false } : player,
      ),
    };
    const legalActions: GameAction[] = [
      { type: 'movePlayer', target: { boardX: 1, boardY: 0 } },
      { type: 'endTurn' },
    ];

    expect(
      detectSimulationIssues(state, { type: 'endTurn' }, legalActions, aiHeuristicConfig),
    ).toContain('stalledTurns');
  });

  it('does not flag ending the turn to wait for end-of-turn healing as a stall', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-heal-wait-not-stall',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, hp: 2, isCursed: false } : player,
      ),
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
    };
    const legalActions: GameAction[] = [
      { type: 'endTurn' },
      { type: 'movePlayer', target: { boardX: 1, boardY: 0 } },
    ];

    expect(
      detectSimulationIssues(state, { type: 'endTurn' }, legalActions, aiHeuristicConfig),
    ).not.toContain('stalledTurns');
  });
});

describe('detectSimulationIssues avoidableRiskFights forced dragon endgame', () => {
  it('does not flag the deliberate sub-threshold dragon fight when it is the best remaining option', () => {
    const base = createNewGame({
      humanHeroId: 'hero_rogue',
      aiCount: 1,
      seed: 'diagnostics-forced-dragon-endgame',
    });
    const state: GameState = {
      ...base,
      phase: 'optional_monster_combat',
      activePlayerIndex: 0,
      tileStack: [],
      tokenBag: [],
      board: [
        {
          ...base.board[0],
          roomToken: { id: 'dragon', kind: 'monster' },
        },
      ],
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_rogue',
              inventory: {
                ...player.inventory,
                // Total bonus 4 → only a double-six beats the dragon (str 15):
                // a non-zero win chance that still sits below the 0.35 threshold.
                weapons: [{ type: 'weapon', bonus: 2 }, { type: 'weapon', bonus: 2 }],
              },
            }
          : {
              ...player,
              inventory: { ...player.inventory, weapons: [] },
            },
      ),
      combat: {
        playerId: base.players[0].id,
        monsterId: 'dragon',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: 0 },
      },
    };
    const winChance = estimateCombatWinChance(
      state.players[0],
      monsterDefinitions.dragon.strength,
    );

    expect(winChance).toBeGreaterThan(0);
    expect(winChance).toBeLessThan(aiHeuristicConfig.minimumDragonWinChance);
    expect(
      detectSimulationIssues(
        state,
        { type: 'startOptionalCombat' },
        [{ type: 'startOptionalCombat' }, { type: 'endTurn' }],
        aiHeuristicConfig,
      ),
    ).not.toContain('avoidableRiskFights');
  });
});

describe('detectSimulationIssues missedExplorationProgress gate', () => {
  function explorationState(): GameState {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-exploration-gate',
    });

    return {
      ...base,
      phase: 'await_move',
      activePlayerIndex: 0,
      remainingSteps: 4,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, hp: player.maxHp, isCursed: false } : player,
      ),
    };
  }

  it('flags a miss when a legal exploration declaration is available but the turn is ended', () => {
    const state = explorationState();
    const legalActions: GameAction[] = [
      { type: 'declareExplorationDirection', direction: 'A' },
      { type: 'endTurn' },
    ];

    expect(
      detectSimulationIssues(state, { type: 'endTurn' }, legalActions, aiHeuristicConfig),
    ).toContain('missedExplorationProgress');
  });

  it('does not flag a miss when the exploration declaration is actually made', () => {
    const state = explorationState();
    const explore: GameAction = { type: 'declareExplorationDirection', direction: 'A' };
    const legalActions: GameAction[] = [explore, { type: 'endTurn' }];

    expect(
      detectSimulationIssues(state, explore, legalActions, aiHeuristicConfig),
    ).not.toContain('missedExplorationProgress');
  });

  it('does not flag ending the turn when no legal action can advance exploration', () => {
    const state = explorationState();
    const legalActions: GameAction[] = [{ type: 'endTurn' }];

    expect(
      detectSimulationIssues(state, { type: 'endTurn' }, legalActions, aiHeuristicConfig),
    ).not.toContain('missedExplorationProgress');
  });
});

describe('getMonsterMovementDesirabilityThreshold', () => {
  it('demands a coin-flip in normal play, matching the agent movement scoring', () => {
    expect(
      getMonsterMovementDesirabilityThreshold('skeleton_lord', aiHeuristicConfig, false),
    ).toBe(0.5);
    expect(
      getMonsterMovementDesirabilityThreshold('dragon', aiHeuristicConfig, false),
    ).toBe(Math.max(0.5, aiHeuristicConfig.minimumDragonWinChance));
  });

  it('drops to the bare combat threshold only under desperation', () => {
    expect(
      getMonsterMovementDesirabilityThreshold('skeleton_lord', aiHeuristicConfig, true),
    ).toBe(aiHeuristicConfig.minimumRepeatCombatWinChance);
    expect(
      getMonsterMovementDesirabilityThreshold('dragon', aiHeuristicConfig, true),
    ).toBe(aiHeuristicConfig.minimumDragonWinChance);
  });
});

describe('stale action tracking', () => {
  it('uses the active game difficulty for fully explored dragon progress', () => {
    const getDifficultyConfigSpy = vi
      .spyOn(configModule, 'getDifficultyConfig')
      .mockImplementation((difficulty) => ({
        ...aiHeuristicConfig,
        minimumDragonWinChance: difficulty === 'easy' ? 0 : 1,
        minimumRepeatCombatWinChance: 1,
      }));
    const base = createNewGame({
      humanHeroId: 'hero_blade',
      aiCount: 1,
      seed: 'diagnostics-fully-explored-easy-dragon',
      difficulty: 'easy',
    });
    const before: GameState = {
      ...base,
      phase: 'await_move',
      activePlayerIndex: 0,
      remainingSteps: 1,
      tileStack: [],
      tokenBag: [],
      board: [
        {
          ...base.board[0],
        },
        {
          tileInstanceId: 'tile-mid',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-dragon',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'dragon', kind: 'monster' },
        },
      ],
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_blade',
              inventory: {
                ...player.inventory,
                weapons: [{ type: 'weapon', bonus: 2 }, { type: 'weapon', bonus: 1 }],
                spells: [{ type: 'spell', spellKind: 'flame' }],
              },
            }
          : player,
      ),
    };
    const action: GameAction = {
      type: 'movePlayer',
      target: { boardX: 1, boardY: 0 },
    };
    const after: GameState = {
      ...before,
      remainingSteps: 0,
      lastMoveFrom: { boardX: 0, boardY: 0 },
      players: before.players.map((player, index) =>
        index === 0 ? { ...player, position: { boardX: 1, boardY: 0 } } : player,
      ),
    };

    expect(isMeaningfulProgress(before, after, action)).toBe(true);

    getDifficultyConfigSpy.mockRestore();
  });

  it('counts a fully explored move toward a real endgame objective as progress', () => {
    const base = createNewGame({
      humanHeroId: 'hero_blade',
      aiCount: 1,
      seed: 'diagnostics-fully-explored-progress',
    });
    const before: GameState = {
      ...base,
      phase: 'await_move',
      activePlayerIndex: 0,
      remainingSteps: 1,
      tileStack: [],
      tokenBag: [],
      board: [
        {
          ...base.board[0],
        },
        {
          tileInstanceId: 'tile-mid',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-dragon',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'dragon', kind: 'monster' },
        },
      ],
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_blade',
              inventory: {
                ...player.inventory,
                weapons: [{ type: 'weapon', bonus: 3 }, { type: 'weapon', bonus: 3 }],
              },
            }
          : player,
      ),
    };
    const action: GameAction = {
      type: 'movePlayer',
      target: { boardX: 1, boardY: 0 },
    };
    const after: GameState = {
      ...before,
      remainingSteps: 0,
      lastMoveFrom: { boardX: 0, boardY: 0 },
      players: before.players.map((player, index) =>
        index === 0 ? { ...player, position: { boardX: 1, boardY: 0 } } : player,
      ),
    };
    const tracker = createStaleActionTracker();

    expect(isMeaningfulProgress(before, after, action)).toBe(true);

    tracker.record(before, after, action);

    expect(tracker.staleActionCount).toBe(0);
  });

  it('treats fully explored movement as non-progress so endgame loops go stale', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-fully-explored-stall',
    });
    const before: GameState = {
      ...base,
      phase: 'await_move',
      activePlayerIndex: 0,
      remainingSteps: 1,
      tileStack: [],
      tokenBag: [],
      lastMoveFrom: { boardX: -1, boardY: 0 },
      board: [
        {
          ...base.board[0],
        },
        {
          tileInstanceId: 'tile-next',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    };
    const action: GameAction = {
      type: 'movePlayer',
      target: { boardX: 1, boardY: 0 },
    };
    const after: GameState = {
      ...before,
      remainingSteps: 0,
      lastMoveFrom: { boardX: 0, boardY: 0 },
      players: before.players.map((player, index) =>
        index === 0 ? { ...player, position: { boardX: 1, boardY: 0 } } : player,
      ),
    };
    const tracker = createStaleActionTracker();

    expect(isMeaningfulProgress(before, after, action)).toBe(false);

    tracker.record(before, after, action);

    expect(tracker.staleActionCount).toBe(1);
  });

  it('does not count movement toward a losing loot race as endgame progress', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'diagnostics-contested-loot-stall',
    });
    const before: GameState = {
      ...base,
      phase: 'await_move',
      activePlayerIndex: 0,
      remainingSteps: 1,
      tileStack: [],
      tokenBag: [],
      board: [
        {
          ...base.board[0],
        },
        {
          tileInstanceId: 'tile-mid',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-loot',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [{ type: 'weapon', bonus: 3 }],
        },
      ],
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              position: { boardX: 0, boardY: 0 },
              inventory: {
                ...player.inventory,
                weapons: [{ type: 'weapon', bonus: 1 }, { type: 'weapon', bonus: 1 }],
              },
            }
          : {
              ...player,
              position: { boardX: 2, boardY: 0 },
              inventory: {
                ...player.inventory,
                weapons: [{ type: 'weapon', bonus: 1 }, { type: 'weapon', bonus: 1 }],
              },
            },
      ),
    };
    const action: GameAction = {
      type: 'movePlayer',
      target: { boardX: 1, boardY: 0 },
    };
    const after: GameState = {
      ...before,
      remainingSteps: 0,
      lastMoveFrom: { boardX: 0, boardY: 0 },
      players: before.players.map((player, index) =>
        index === 0 ? { ...player, position: { boardX: 1, boardY: 0 } } : player,
      ),
    };
    const tracker = createStaleActionTracker();

    expect(isMeaningfulProgress(before, after, action)).toBe(false);

    tracker.record(before, after, action);

    expect(tracker.staleActionCount).toBe(1);
  });
});
