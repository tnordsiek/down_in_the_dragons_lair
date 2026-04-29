import { useAsset } from '../../data/assets';
import type { GameState } from '../../engine/core/types';
import { heroName } from '../labels';

type PlayerPanelProps = {
  state: GameState;
};

export function PlayerPanel({ state }: PlayerPanelProps) {
  const panel = useAsset('ui_panel_frame');

  return (
    <section
      className="border border-stone-700 bg-stone-900 p-4"
      data-asset-id={panel.assetId}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-300">
        Players
      </h2>
      <div className="mt-3 grid gap-2">
        {state.players.map((player, index) => (
          <article
            key={player.id}
            className={`border p-3 ${
              index === state.activePlayerIndex
                ? 'border-amber-300 bg-stone-800'
                : 'border-stone-700 bg-stone-950'
            }`}
            data-asset-id={`${player.heroId}_portrait`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-stone-100">
                  {heroName(player.heroId)}
                </h3>
                <p className="text-xs uppercase tracking-wide text-stone-400">
                  {player.kind}
                </p>
              </div>
              <div className="text-right font-mono text-sm text-amber-100">
                {player.treasurePoints} pts
              </div>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-stone-300">
              <div>
                <dt>HP</dt>
                <dd className="font-mono text-stone-100">
                  {player.hp}/{player.maxHp}
                </dd>
              </div>
              <div>
                <dt>Key</dt>
                <dd className="font-mono text-stone-100">
                  {player.inventory.keyCount}
                </dd>
              </div>
              <div>
                <dt>Weapons</dt>
                <dd className="font-mono text-stone-100">
                  {player.inventory.weapons
                    .map((weapon) => `+${weapon.bonus}`)
                    .join(', ') || '-'}
                </dd>
              </div>
              <div>
                <dt>Spells</dt>
                <dd className="font-mono text-stone-100">
                  {player.inventory.spells
                    .map((spell) => spell.spellKind)
                    .join(', ') || '-'}
                </dd>
              </div>
            </dl>
            <div className="mt-2 flex gap-2 text-xs">
              {player.isCursed ? (
                <span
                  className="bg-red-800 px-2 py-1"
                  data-asset-id="status_curse"
                >
                  cursed
                </span>
              ) : null}
              {player.skipNextTurn ? (
                <span
                  className="bg-stone-700 px-2 py-1"
                  data-asset-id="status_unconscious"
                >
                  unconscious
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
