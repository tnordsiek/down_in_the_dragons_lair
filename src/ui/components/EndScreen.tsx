import { useEffect, useRef } from 'react';

import type { GameState, Player } from '../../engine/core/types';
import { formatTreasurePoints } from '../labels';
import { useTranslation } from '../../i18n/useTranslation';

type EndScreenProps = {
  state: GameState;
  onNewGame: () => void;
};

function translatedPlayerHeroLabel(
  player: Player,
  players: Player[],
  t: ReturnType<typeof useTranslation>,
): string {
  const humans = players.filter((p) => p.kind === 'human');
  let typeLabel: string;
  if (player.kind === 'human') {
    typeLabel =
      humans.length <= 1
        ? t.playerLabels.human
        : t.playerLabels.playerN(humans.indexOf(player) + 1);
  } else {
    const ais = players.filter((p) => p.kind === 'ai');
    typeLabel = t.playerLabels.aiN(ais.indexOf(player) + 1);
  }
  return `${t.displayNames.heroes[player.heroId]} (${typeLabel})`;
}

export function EndScreen({ state, onNewGame }: EndScreenProps) {
  const t = useTranslation();
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
  const rankedEntries = rankedPlayers.map((player) => ({
    isWinner: winnerIds.has(player.id),
    label: translatedPlayerHeroLabel(player, state.players, t),
    player,
  }));
  const dragonSlayer = state.players.find(
    (player) => player.id === state.victory?.defeatedDragonByPlayerId,
  );
  const winnerLabels = state.players
    .filter((player) => winnerIds.has(player.id))
    .map((player) => translatedPlayerHeroLabel(player, state.players, t));
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
            {humanWon ? t.endScreen.victory : t.endScreen.gameOver}
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-parchment-100">
            <div className="rounded-carve border border-jade-600/60 bg-jade-900/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-jade-200">
                {winnerLabels.length > 1
                  ? t.endScreen.sharedVictory
                  : t.endScreen.winner}
              </p>
              <p className="mt-1 text-base font-semibold text-jade-200">
                {winnerLabels.join(` ${t.endScreen.and} `)}
              </p>
            </div>
            <div className="rounded-carve border border-obsidian-700 bg-obsidian-950/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-torch-300">
                {t.endScreen.dragonSlayer}
              </p>
              <p className="mt-1 text-base font-semibold text-parchment-50">
                {dragonSlayer
                  ? translatedPlayerHeroLabel(dragonSlayer, state.players, t)
                  : state.victory.defeatedDragonByPlayerId}
              </p>
              <p className="mt-1 text-xs text-parchment-200">
                {t.endScreen.dragonTreasureNote}
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
                  {formatTreasurePoints(player.treasurePoints)}{' '}
                  {t.endScreen.pts}
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
            {t.endScreen.newGame}
          </button>
        </div>
      </section>
    </div>
  );
}
