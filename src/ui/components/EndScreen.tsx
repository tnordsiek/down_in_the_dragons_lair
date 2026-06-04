import { useEffect, useRef } from 'react';

import type { GameState } from '../../engine/core/types';
import { formatTreasurePoints, playerHeroLabel } from '../labels';

type EndScreenProps = {
  state: GameState;
  onNewGame: () => void;
};

export function EndScreen({ state, onNewGame }: EndScreenProps) {
  const newGameButtonRef = useRef<HTMLButtonElement>(null);
  const hasVictory = state.victory !== undefined;

  useEffect(() => {
    if (hasVictory) {
      newGameButtonRef.current?.focus();
    }
  }, [hasVictory]);

  if (!state.victory) {
    return null;
  }

  const rankedPlayers = state.players
    .slice()
    .sort((left, right) => right.treasurePoints - left.treasurePoints);
  const winnerIds = new Set(state.victory.winnerPlayerIds);
  const rankedEntries = rankedPlayers.map((player) => {
    const playerIndex = state.players.findIndex(
      (entry) => entry.id === player.id,
    );

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
  const humanWon = state.players.some(
    (player) => player.kind === 'human' && winnerIds.has(player.id),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-screen-title"
    >
      <section
        className="rounded-forged border border-torch-300 bg-obsidian-900 p-5 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-[0_0_40px_rgba(224,165,52,0.2),inset_0_1px_0_rgba(247,240,223,0.1)]"
        data-asset-id="bg_end_screen"
      >
        <div data-asset-id="ui_modal_frame">
          <h2
            id="end-screen-title"
            className="font-display text-3xl text-amber-100"
          >
            {humanWon ? 'Victory!' : 'Game Over'}
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-parchment-100">
            <div className="rounded-carve border border-jade-600/60 bg-jade-900/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-jade-200">
                {winnerLabels.length > 1 ? 'Shared Victory' : 'Winner'}
              </p>
              <p className="mt-1 text-base font-semibold text-jade-200">
                {winnerLabels.join(' and ')}
              </p>
            </div>
            <div className="rounded-carve border border-obsidian-700 bg-obsidian-950/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-torch-300">
                Dragon Slayer
              </p>
              <p className="mt-1 text-base font-semibold text-parchment-50">
                {dragonSlayer
                  ? playerHeroLabel(
                      dragonSlayer,
                      state.players.findIndex(
                        (player) => player.id === dragonSlayer.id,
                      ),
                    )
                  : state.victory.defeatedDragonByPlayerId}
              </p>
              <p className="mt-1 text-xs text-parchment-200">
                Dragon treasure worth 1.5 points is included in the final score.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {rankedEntries.map(({ isWinner, label, player }) => (
              <div
                key={player.id}
                className={`flex justify-between rounded-carve border p-2 text-sm ${
                  isWinner
                    ? 'border-jade-400 bg-jade-600/15 text-jade-200'
                    : 'border-obsidian-700 text-parchment-100'
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
            ref={newGameButtonRef}
            className="mt-4 rounded-forged bg-torch-300 px-4 py-2 font-semibold text-obsidian-950 shadow-forged transition-colors hover:bg-torch-400"
            data-asset-id="ui_button_primary"
            onClick={onNewGame}
          >
            New Game
          </button>
        </div>
      </section>
    </div>
  );
}
