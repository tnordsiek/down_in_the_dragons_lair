import { getAssetUrl, useAsset } from '../../data/assets';
import type {
  BoardPosition,
  GameState,
  HeroId,
  SpellKind,
  WeaponBonus,
} from '../../engine/core/types';
import { heroName } from '../labels';

type PlayerPanelProps = {
  onFocusPosition?: (position: BoardPosition) => void;
  state: GameState;
};

export function PlayerPanel({ onFocusPosition, state }: PlayerPanelProps) {
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
              <div className="flex min-w-0 items-center gap-3">
                <HeroPortrait
                  heroId={player.heroId}
                  onFocusPosition={() => onFocusPosition?.(player.position)}
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-stone-100">
                    {heroName(player.heroId)}
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-stone-400">
                    {player.kind}
                  </p>
                </div>
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
                <dd className="flex min-h-6 items-center gap-1 font-mono text-stone-100">
                  {player.inventory.keyCount > 0 ? (
                    <ItemIcon assetId="item_key" label="Key" />
                  ) : null}
                  {player.inventory.keyCount || '-'}
                </dd>
              </div>
              <div>
                <dt>Weapons</dt>
                <dd className="flex min-h-6 flex-wrap items-center gap-1 font-mono text-stone-100">
                  {player.inventory.weapons.length > 0
                    ? player.inventory.weapons.map((weapon, index) => (
                        <ItemIcon
                          key={`${player.id}-weapon-${index}`}
                          assetId={weaponAssetId(weapon.bonus)}
                          label={`Weapon +${weapon.bonus}`}
                        />
                      ))
                    : '-'}
                </dd>
              </div>
              <div>
                <dt>Spells</dt>
                <dd className="flex min-h-6 flex-wrap items-center gap-1 font-mono text-stone-100">
                  {player.inventory.spells.length > 0
                    ? player.inventory.spells.map((spell, index) => (
                        <ItemIcon
                          key={`${player.id}-spell-${index}`}
                          assetId={spellAssetId(spell.spellKind)}
                          label={`${spell.spellKind} spell`}
                        />
                      ))
                    : '-'}
                </dd>
              </div>
            </dl>
            <div className="mt-2 flex gap-2 text-xs">
              {player.isCursed ? (
                <StatusBadge assetId="status_curse" label="cursed" />
              ) : null}
              {player.skipNextTurn ? (
                <StatusBadge assetId="status_unconscious" label="unconscious" />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HeroPortrait({
  heroId,
  onFocusPosition,
}: {
  heroId: HeroId;
  onFocusPosition?: () => void;
}) {
  const assetId = `${heroId}_portrait`;
  const assetUrl = getAssetUrl(assetId);
  const label = heroName(heroId);

  return (
    <button
      aria-label={`Focus ${label} on map`}
      className="flex h-12 w-12 shrink-0 items-center justify-center border border-stone-700 bg-stone-900 font-mono text-sm text-amber-100"
      data-asset-id={assetId}
      onContextMenu={(event) => {
        event.preventDefault();
        onFocusPosition?.();
      }}
      type="button"
    >
      {assetUrl ? (
        <img
          className="h-full w-full object-contain"
          src={assetUrl}
          alt={label}
        />
      ) : (
        label.slice(0, 1)
      )}
    </button>
  );
}

function ItemIcon({ assetId, label }: { assetId: string; label: string }) {
  const assetUrl = getAssetUrl(assetId);

  return assetUrl ? (
    <img
      className="h-5 w-5 rounded-sm object-contain"
      data-asset-id={assetId}
      src={assetUrl}
      alt={label}
      title={label}
    />
  ) : (
    <span className="text-xs">{label}</span>
  );
}

function StatusBadge({ assetId, label }: { assetId: string; label: string }) {
  const assetUrl = getAssetUrl(assetId);

  return (
    <span
      className="inline-flex items-center gap-1 bg-stone-800 px-2 py-1"
      data-asset-id={assetId}
    >
      {assetUrl ? (
        <img className="h-4 w-4 object-contain" src={assetUrl} alt={label} />
      ) : null}
      {label}
    </span>
  );
}

function weaponAssetId(bonus: WeaponBonus): string {
  return `item_weapon_${bonus}`;
}

function spellAssetId(spellKind: SpellKind): string {
  return `item_spell_${spellKind}`;
}
