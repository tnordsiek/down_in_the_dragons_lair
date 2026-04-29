import type { GameState } from '../../engine/core/types';

type EventLogProps = {
  state: GameState;
  lastError?: string;
};

export function EventLog({ state, lastError }: EventLogProps) {
  return (
    <section
      className="border border-stone-700 bg-stone-900 p-4"
      data-asset-id="ui_icon_log"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-300">
        Log
      </h2>
      {lastError ? (
        <p className="mt-3 bg-red-950 p-2 text-sm text-red-100">{lastError}</p>
      ) : null}
      <ol className="mt-3 grid max-h-48 gap-2 overflow-auto text-sm text-stone-300">
        {state.eventLog.slice(-8).map((event) => (
          <li key={event.id}>{event.message}</li>
        ))}
      </ol>
    </section>
  );
}
