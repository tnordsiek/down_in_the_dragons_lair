import { describe, expect, it } from 'vitest';

import {
  createPosition,
  createTestPlayer,
  createTestState,
  createTestTile,
} from '../../test/gameStateFactory';
import {
  getContinuationPhaseAfterAction,
  getZeroStepFollowUpPhase,
} from './continuation';

describe('turn continuation', () => {
  it('ends the turn when no continuation reason is active', () => {
    const state = createTestState({
      phase: 'await_move',
      remainingSteps: 2,
    });

    expect(getContinuationPhaseAfterAction(state)).toBe('turn_end');
  });

  it('keeps the turn open while continuation movement remains', () => {
    const state = createTestState({
      phase: 'await_move',
      remainingSteps: 1,
      turnContinuationReason: 'blade_on_six',
    });

    expect(getContinuationPhaseAfterAction(state)).toBe('await_move');
  });

  it('keeps the turn open at zero steps when a non-movement follow-up is available', () => {
    const state = createTestState({
      remainingSteps: 0,
      turnContinuationReason: 'blade_on_six',
      board: [
        createTestTile({
          looseItems: [{ type: 'key' }],
        }),
      ],
    });

    expect(getZeroStepFollowUpPhase(state)).toBe('await_move');
  });

  it('keeps the turn open at zero steps when a healing spell has a discovered target', () => {
    const state = createTestState({
      remainingSteps: 0,
      turnContinuationReason: 'blade_on_six',
      players: [
        createTestPlayer({
          inventory: {
            weapons: [],
            spells: [{ type: 'spell', spellKind: 'healing' }],
            keyCount: 0,
          },
        }),
      ],
      board: [
        createTestTile(),
        createTestTile({
          tileInstanceId: 'tile-healing',
          blueprintId: 'healing_corner',
          boardX: 1,
          boardY: 0,
        }),
      ],
    });

    expect(getZeroStepFollowUpPhase(state)).toBe('await_move');
  });

  it('ends the turn at zero steps when no non-movement follow-up remains', () => {
    const state = createTestState({
      remainingSteps: 0,
      turnContinuationReason: 'blade_on_six',
      players: [
        createTestPlayer({
          position: createPosition(0, 0),
        }),
      ],
      board: [createTestTile({ boardX: 0, boardY: 0, looseItems: [] })],
    });

    expect(getZeroStepFollowUpPhase(state)).toBe('turn_end');
  });
});
