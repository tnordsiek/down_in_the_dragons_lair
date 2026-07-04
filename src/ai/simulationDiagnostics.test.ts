import { describe, expect, it } from 'vitest';

import type { GameAction, GameState } from '../engine/core/types';
import { createNewGame } from '../engine/setup/createGame';
import { aiHeuristicConfig } from './config';
import { detectSimulationIssues } from './simulationDiagnostics';

describe('detectSimulationIssues healingMisses', () => {
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
    ).includes('healingMisses');
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
