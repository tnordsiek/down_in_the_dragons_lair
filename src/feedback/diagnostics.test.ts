import { describe, expect, it } from 'vitest';

import type { GameEvent } from '../engine/core/types';
import { createNewGame } from '../engine/setup/createGame';
import { DIAGNOSTICS_EVENT_LIMIT, buildDiagnosticsSummary } from './diagnostics';

describe('buildDiagnosticsSummary', () => {
  it('includes version, seed, phase and player lines', () => {
    const game = createNewGame({ humanHeroId: 'hero_mage', aiCount: 1, seed: 'seed-123' });

    const summary = buildDiagnosticsSummary(game, 'v9.9');

    expect(summary).toContain('Version: v9.9');
    expect(summary).toContain('Seed: seed-123');
    expect(summary).toContain(`Phase: ${game.phase}`);
    expect(summary).toContain('hero_mage');
  });

  it('caps the event log at the configured limit', () => {
    const game = createNewGame({ humanHeroId: 'hero_mage', aiCount: 1, seed: 'seed-123' });
    const manyEvents: GameEvent[] = Array.from({ length: 40 }, (_, index) => ({
      id: `evt-${index}`,
      type: 'test_event',
      message: `event number ${index}`,
      turn: index,
    }));

    const summary = buildDiagnosticsSummary({ ...game, eventLog: manyEvents });

    const eventLines = summary
      .split('\n')
      .filter((line) => line.startsWith('  [t'));
    expect(eventLines).toHaveLength(DIAGNOSTICS_EVENT_LIMIT);
    // Only the most recent events are kept.
    expect(summary).toContain('event number 39');
    expect(summary).not.toContain('event number 0');
  });
});
