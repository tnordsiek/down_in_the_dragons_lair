import type { GameState } from '../../engine/core/types';

type EndScreenProps = {
  state: GameState;
  onNewGame: () => void;
};

export function EndScreen({ state, onNewGame }: EndScreenProps) {
  if (!state.victory) {
    return null;
  }

  return (
    <section
      className="border border-amber-300 bg-stone-950 p-5"
      data-asset-id="bg_end_screen"
    >
      <h2 className="font-display text-3xl text-amber-100">Game Over</h2>
      <p className="mt-2 text-stone-300">
        Dragon defeated by {state.victory.defeatedDragonByPlayerId}
      </p>
      <div className="mt-4 grid gap-2">
        {state.players
          .slice()
          .sort((left, right) => right.treasurePoints - left.treasurePoints)
          .map((player) => (
            <div
              key={player.id}
              className="flex justify-between border border-stone-700 p-2 text-sm"
            >
              <span>{player.id}</span>
              <span className="font-mono">{player.treasurePoints}</span>
            </div>
          ))}
      </div>
      <button
        className="mt-4 bg-amber-300 px-4 py-2 font-semibold text-stone-950"
        onClick={onNewGame}
      >
        New Game
      </button>
    </section>
  );
}
