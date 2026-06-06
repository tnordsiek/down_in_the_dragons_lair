import { useEffect, useRef } from 'react';

import { getAssetUrl } from '../../data/assets';
import type { Player } from '../../engine/core/types';
import { useTranslation } from '../../i18n/useTranslation';

type HotseatHandoffOverlayProps = {
  player: Player;
  playerNumber: number;
  willSkipTurn: boolean;
  onReady: () => void;
};

/**
 * Full-screen "pass the device" overlay shown between human turns in Hotseat
 * mode. It hides the board entirely and reveals nothing about the incoming
 * player's state until they explicitly press the button, so the outgoing player
 * can hand over the device without leaking information.
 */
export function HotseatHandoffOverlay({
  player,
  playerNumber,
  willSkipTurn,
  onReady,
}: HotseatHandoffOverlayProps) {
  const t = useTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portraitUrl = getAssetUrl(`${player.heroId}_portrait`);
  const heroDisplayName = t.displayNames.heroes[player.heroId];

  useEffect(() => {
    buttonRef.current?.focus();
  }, [playerNumber]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-obsidian-950/95 px-4 py-6 text-center backdrop-blur-md focus:outline-none"
      data-testid="hotseat-handoff-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hotseat-handoff-title"
    >
      <div className="w-full max-w-md rounded-forged border border-torch-500/40 bg-obsidian-900/95 p-8 shadow-forged">
        <p className="text-xs uppercase tracking-[0.3em] text-torch-300">
          {t.hotseatHandoff.passDevice}
        </p>
        <h2
          id="hotseat-handoff-title"
          className="mt-3 font-display text-3xl font-semibold text-parchment-50"
        >
          {t.hotseatHandoff.playerN(playerNumber)}
        </h2>
        {portraitUrl ? (
          <img
            className="mx-auto mt-5 max-h-40 w-auto object-contain"
            src={portraitUrl}
            alt={heroDisplayName}
          />
        ) : null}
        <p className="mt-4 text-lg text-parchment-100">{heroDisplayName}</p>
        {willSkipTurn ? (
          <p className="mt-2 text-sm text-blood-200">
            {t.hotseatHandoff.skipTurn}
          </p>
        ) : null}
        <button
          ref={buttonRef}
          className="mt-6 w-full rounded-forged bg-torch-300 px-4 py-3 font-semibold text-obsidian-950 shadow-forged transition-colors hover:bg-torch-400"
          data-asset-id="ui_button_primary"
          type="button"
          onClick={onReady}
        >
          {t.hotseatHandoff.startTurn}
        </button>
      </div>
    </div>
  );
}
