import type { GameState } from '../../engine/core/types';
import {
  formatTreasurePoints,
  playerHeroLabel,
} from '../labels';

type EndScreenProps = {
  state: GameState;
  onNewGame: () => void;
};

export function EndScreen({ state, onNewGame }: EndScreenProps) {
  if (!state.victory) {
    return null;
  }

  const rankedPlayers = state.players
    .slice()
    .sort((left, right) => right.treasurePoints - left.treasurePoints);
  const winnerIds = new Set(state.victory.winnerPlayerIds);
  const rankedEntries = rankedPlayers.map((player) => {
    const playerIndex = state.players.findIndex((entry) => entry.id === player.id);

    return {
      isWinner: winnerIds.has(player.id),
      label: playerHeroLabel(player, playerIndex),
      player,
    };
  });
  const dragonSlayer = state.players.find(
    (player) => player.id === state.victory?.defeatedDragonByPlayerId,
  );
  const winnerLabels = state.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => winnerIds.has(player.id))
    .map(({ player, index }) => playerHeroLabel(player, index));

  return (
    <section
      className="border border-amber-300 bg-stone-950 p-5"
      data-asset-id="bg_end_screen"
    >
      <h2 className="font-display text-3xl text-amber-100">Game Over</h2>
      <div className="mt-4 grid gap-3 text-sm text-stone-200">
        <div className="border border-emerald-700/60 bg-emerald-950/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
            {winnerLabels.length > 1 ? 'Shared Victory' : 'Winner'}
          </p>
          <p className="mt-1 text-base font-semibold text-emerald-100">
            {winnerLabels.join(' and ')}
          </p>
        </div>
        <div className="border border-stone-700 bg-stone-900/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            Dragon Slayer
          </p>
          <p className="mt-1 text-base font-semibold text-stone-100">
            {dragonSlayer
              ? playerHeroLabel(
                  dragonSlayer,
                  state.players.findIndex((player) => player.id === dragonSlayer.id),
                )
              : state.victory.defeatedDragonByPlayerId}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            Dragon treasure worth 1.5 points is included in the final score.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {rankedEntries.map(({ isWinner, label, player }) => (
          <div
            key={player.id}
            className={`flex justify-between border p-2 text-sm ${
              isWinner
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-100'
                : 'border-stone-700 text-stone-200'
            }`}
            data-testid={`end-screen-rank-${player.id}`}
          >
            <span>{label}</span>
            <span className="font-mono">
              {formatTreasurePoints(player.treasurePoints)} pts
            </span>
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
