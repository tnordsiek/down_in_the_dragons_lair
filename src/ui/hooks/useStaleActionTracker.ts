import { useCallback, useRef } from 'react';

import { createStaleActionTracker } from '../../ai/simulationDiagnostics';
import type { GameAction } from '../../engine/core/types';
import { useSetupStore } from '../../state/setupStore';

type StaleActionTracker = ReturnType<typeof createStaleActionTracker>;

/**
 * Pure core of the UI stale-action tracking: one tracker per game, keyed by
 * the game seed. Requesting the tracker for a different (or missing) seed
 * discards the old one, so a new game always starts with a fresh counter.
 * Extracted from the hook so it can be tested without React.
 */
export function createSeedScopedStaleTracker() {
  let tracker: StaleActionTracker = createStaleActionTracker();
  let trackedSeed: string | undefined;

  return {
    forSeed(seed: string | undefined): StaleActionTracker {
      if (seed !== trackedSeed) {
        tracker = createStaleActionTracker();
        trackedSeed = seed;
      }

      return tracker;
    },
  };
}

/**
 * Keeps a persistent stale-action tracker across UI turns and wraps the store
 * dispatch so every applied action is recorded exactly once.
 *
 * Without this, the AI is consulted with `staleActionCount = 0` and an empty
 * recent-position history on every UI action, which silently disables both the
 * desperation escape hatch and the anti-cycle movement penalty in real games —
 * they previously only worked in batch simulations, whose loop feeds a
 * persistent tracker.
 *
 * The tracker records ALL actions (human and AI alike), matching the batch
 * semantics of "is the game as a whole still making progress?". After a page
 * reload of a persisted game the tracker restarts at zero, which is acceptable
 * because it only drives heuristic escalation.
 */
export function useStaleActionTracker() {
  const scopedTrackerRef = useRef<ReturnType<
    typeof createSeedScopedStaleTracker
  > | null>(null);

  if (scopedTrackerRef.current === null) {
    scopedTrackerRef.current = createSeedScopedStaleTracker();
  }

  const currentTracker = useCallback((): StaleActionTracker => {
    return scopedTrackerRef.current!.forSeed(
      useSetupStore.getState().gameState?.rng.seed,
    );
  }, []);

  const trackedDispatch = useCallback(
    (action: GameAction): void => {
      // Read before/after synchronously from the store (zustand `set` is
      // synchronous), so recording happens exactly once per applied action —
      // independent of React render timing and StrictMode double effects.
      const tracker = currentTracker();
      const before = useSetupStore.getState().gameState;
      useSetupStore.getState().dispatch(action);
      const after = useSetupStore.getState().gameState;

      if (before && after && after !== before) {
        tracker.record(before, after, action);
      }
    },
    [currentTracker],
  );

  const getStaleActionCount = useCallback(
    (): number => currentTracker().staleActionCount,
    [currentTracker],
  );

  const getRecentPositionKeysFor = useCallback(
    (playerId: string): readonly string[] =>
      currentTracker().recentPositionKeysFor(playerId),
    [currentTracker],
  );

  return { trackedDispatch, getStaleActionCount, getRecentPositionKeysFor };
}
