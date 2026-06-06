import { useMemo, useState, type ReactNode } from 'react';

import { getAssetUrl, useAsset } from '../../data/assets';
import type {
  BoardPosition,
  GameState,
  HeroId,
  Item,
  Player,
} from '../../engine/core/types';
import { itemAssetId } from '../items';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translations } from '../../i18n/en';
import { ImageLightbox, type LightboxImage } from './ImageLightbox';

type PlayerPanelProps = {
  onFocusPosition?: (position: BoardPosition) => void;
  state: GameState;
};

export function PlayerPanel({ onFocusPosition, state }: PlayerPanelProps) {
  const t = useTranslation();
  const panel = useAsset('ui_panel_frame');
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(
    null,
  );

  const isHotseatGame =
    state.players.filter((player) => player.kind === 'human').length > 1;
  const displayedPlayers = useMemo(() => {
    // Solo keeps the original order; Hotseat surfaces the active player first so
    // the player taking their turn always sees their own card on top.
    if (!isHotseatGame) {
      return state.players;
    }

    const reordered = [...state.players];
    const [active] = reordered.splice(state.activePlayerIndex, 1);
    if (active) {
      reordered.unshift(active);
    }

    return reordered;
  }, [state.players, state.activePlayerIndex, isHotseatGame]);

  return (
    <section
      className="rounded-forged border border-obsidian-700 bg-obsidian-800/85 p-4 shadow-forged"
      data-asset-id={panel.assetId}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-torch-200">
        {t.playerPanel.title}
      </h2>
      <div
        className="mt-3 grid grid-cols-1 gap-2"
        data-testid="player-panel-grid"
      >
        {displayedPlayers.map((player) => (
          <PlayerCard
            key={player.id}
            index={state.players.indexOf(player)}
            onFocusPosition={() => onFocusPosition?.(player.position)}
            onOpenImage={setLightboxImage}
            player={player}
            state={state}
            t={t}
          />
        ))}
      </div>
      <ImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </section>
  );
}

function translatedPlayerDisplayName(
  player: Player,
  players: Player[],
  t: Translations,
): string {
  const humans = players.filter((p) => p.kind === 'human');
  if (player.kind === 'human') {
    return humans.length <= 1
      ? t.playerLabels.human
      : t.playerLabels.playerN(humans.indexOf(player) + 1);
  }
  const ais = players.filter((p) => p.kind === 'ai');
  return t.playerLabels.aiN(ais.indexOf(player) + 1);
}

function PlayerCard({
  index,
  onFocusPosition,
  onOpenImage,
  player,
  state,
  t,
}: {
  index: number;
  onFocusPosition?: () => void;
  onOpenImage: (image: LightboxImage) => void;
  player: Player;
  state: GameState;
  t: Translations;
}) {
  const isActive = index === state.activePlayerIndex;
  const weaponBonus = useMemo(
    () => player.inventory.weapons.reduce((sum, weapon) => sum + weapon.bonus, 0),
    [player],
  );
  const flameSpellCount = player.inventory.spells.filter(
    (spell) => spell.spellKind === 'flame',
  ).length;
  const hasMageFlameBonus = player.heroId === 'hero_mage' && !player.isCursed;
  const heroInfo = t.playerPanel.heroAbilities[player.heroId];

  return (
    <article
      className={`relative min-w-0 rounded-forged border p-2.5 shadow-forged ${
        isActive
          ? 'border-torch-400 bg-obsidian-800 shadow-[0_0_12px_rgba(224,165,52,0.22)]'
          : 'border-obsidian-700 bg-obsidian-950'
      }`}
      data-asset-id={`${player.heroId}_portrait`}
      data-testid={`player-card-${player.id}`}
    >
      <div
        className="grid gap-2 min-[360px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]"
        data-testid={`player-card-layout-${player.id}`}
      >
        <div
          className="grid content-start gap-1.5"
          data-testid={`player-card-left-${player.id}`}
        >
          <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
            <HeroPortrait
              heroId={player.heroId}
              heroInfo={heroInfo}
              onOpenImage={onOpenImage}
              onFocusPosition={onFocusPosition}
              t={t}
            />
            <div className="grid content-start gap-1">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-parchment-50">
                  {t.displayNames.heroes[player.heroId]}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-parchment-200">
                  {translatedPlayerDisplayName(player, state.players, t)}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1">
                <MetricChip
                  label={t.playerPanel.hp(player.hp, player.maxHp)}
                  title={t.playerPanel.healthTitle(player.hp, player.maxHp)}
                />
                {isActive ? (
                  <MetricChip
                    label={t.playerPanel.active}
                    title={t.playerPanel.activeTitle}
                    tone="amber"
                  />
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <BonusBadge
              label={t.playerPanel.atk(weaponBonus)}
              title={t.playerPanel.atkTitle(weaponBonus)}
            />
            <BonusBadge
              label={
                hasMageFlameBonus
                  ? t.playerPanel.fireballInfinite
                  : t.playerPanel.fireballCount(flameSpellCount)
              }
              title={
                hasMageFlameBonus
                  ? t.playerPanel.fireballInfiniteTitle
                  : t.playerPanel.fireballCountTitle(flameSpellCount)
              }
            />
          </div>
        </div>
        <div
          className="grid content-start gap-1 text-[10px] text-parchment-200"
          data-asset-id="ui_icon_inventory"
          data-testid={`player-card-right-${player.id}`}
        >
          <InventoryRow
            emptyLabel="-"
            icons={
              player.inventory.keyCount > 0
                ? [
                    <ItemIcon
                      key={`${player.id}-key`}
                      item={{ type: 'key' }}
                      onOpenImage={onOpenImage}
                      t={t}
                    />,
                  ]
                : []
            }
            label={t.playerPanel.keyLabel(player.inventory.keyCount)}
            title={t.playerPanel.keyTitle(player.inventory.keyCount)}
          />
          <InventoryRow
            emptyLabel="-"
            icons={player.inventory.weapons.map((weapon, weaponIndex) => (
              <ItemIcon
                key={`${player.id}-weapon-${weaponIndex}`}
                item={weapon}
                onOpenImage={onOpenImage}
                t={t}
              />
            ))}
            label={t.playerPanel.weapons}
            title={t.playerPanel.weaponsTitle(player.inventory.weapons.length)}
          />
          <InventoryRow
            emptyLabel="-"
            icons={player.inventory.spells.map((spell, spellIndex) => (
              <ItemIcon
                key={`${player.id}-spell-${spellIndex}`}
                item={spell}
                onOpenImage={onOpenImage}
                t={t}
              />
            ))}
            label={t.playerPanel.spells}
            title={t.playerPanel.spellsTitle(player.inventory.spells.length)}
          />
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <MetricChip
              label={t.playerPanel.pts(player.treasurePoints)}
              title={t.playerPanel.ptsTitle(player.treasurePoints)}
              tone="amber"
            />
            {player.isCursed ? (
              <StatusBadge
                assetId="status_curse"
                label={t.playerPanel.cursed}
                onOpenImage={onOpenImage}
                title={t.playerPanel.cursedTitle}
              />
            ) : null}
            {player.skipNextTurn ? (
              <StatusBadge
                assetId="status_unconscious"
                label={t.playerPanel.unconscious}
                onOpenImage={onOpenImage}
                title={t.playerPanel.unconsciousTitle}
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function HeroPortrait({
  heroId,
  heroInfo,
  onOpenImage,
  onFocusPosition,
  t,
}: {
  heroId: HeroId;
  heroInfo: string;
  onOpenImage: (image: LightboxImage) => void;
  onFocusPosition?: () => void;
  t: Translations;
}) {
  const assetId = `${heroId}_portrait`;
  const assetUrl = getAssetUrl(assetId);
  const label = t.displayNames.heroes[heroId];

  return (
    <button
      aria-label={t.playerPanel.enlargePortrait(label)}
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-carve border border-obsidian-700 bg-obsidian-900 font-mono text-sm text-amber-100 shadow-carve"
      data-asset-id={assetId}
      onClick={(event) => {
        event.stopPropagation();
        if (assetUrl) {
          onOpenImage({
            src: assetUrl,
            alt: label,
            title: label,
            caption: heroInfo,
          });
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onFocusPosition?.();
      }}
      title={t.tooltips.heroPortrait}
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

function InventoryRow({
  emptyLabel,
  icons,
  label,
  title,
}: {
  emptyLabel: string;
  icons: ReactNode[];
  label: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="uppercase tracking-wide text-parchment-200">
        {label}
      </span>
      <div
        className="flex min-h-5 flex-wrap items-center justify-end gap-1"
        title={title}
      >
        {icons.length > 0 ? (
          icons
        ) : (
          <span className="text-parchment-200/60">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}

function MetricChip({
  label,
  title,
  tone = 'stone',
}: {
  label: string;
  title: string;
  tone?: 'amber' | 'stone';
}) {
  return (
    <span
      className={`inline-flex items-center rounded-carve px-1.5 py-0.5 font-mono text-[10px] ${
        tone === 'amber'
          ? 'border border-torch-500/40 bg-torch-600/25 text-torch-200'
          : 'border border-obsidian-600 bg-obsidian-800 text-parchment-100'
      }`}
      title={title}
    >
      {label}
    </span>
  );
}

function BonusBadge({ label, title }: { label: string; title: string }) {
  return (
    <span
      className="inline-flex items-center rounded-carve border border-portal-400/50 bg-obsidian-900 px-1.5 py-0.5 text-[10px] font-mono text-portal-200"
      title={title}
    >
      {label}
    </span>
  );
}

function translatedItemLabel(item: Item, t: Translations): string {
  if (item.type === 'weapon') {
    return t.displayNames.weapons[item.bonus];
  }
  if (item.type === 'spell') {
    return `${t.displayNames.spells[item.spellKind]} ${t.items.spellSuffix}`;
  }
  return t.items.key;
}

function ItemIcon({
  item,
  onOpenImage,
  t,
}: {
  item: Item;
  onOpenImage: (image: LightboxImage) => void;
  t: Translations;
}) {
  const assetId = itemAssetId(item);
  const label = translatedItemLabel(item, t);
  const assetUrl = getAssetUrl(assetId);

  return assetUrl ? (
    <button
      aria-label={t.playerPanel.enlargeItem(label)}
      className="rounded-sm"
      onClick={(event) => {
        event.stopPropagation();
        onOpenImage({ src: assetUrl, alt: label, caption: label });
      }}
      type="button"
    >
      <img
        className="h-6 w-6 rounded-sm object-contain"
        data-asset-id={assetId}
        src={assetUrl}
        alt={label}
        title={label}
      />
    </button>
  ) : (
    <span className="text-xs" title={label}>
      {label}
    </span>
  );
}

function StatusBadge({
  assetId,
  label,
  onOpenImage,
  title,
}: {
  assetId: string;
  label: string;
  onOpenImage: (image: LightboxImage) => void;
  title: string;
}) {
  const assetUrl = getAssetUrl(assetId);

  return (
    <span
      className="inline-flex items-center gap-1 rounded-carve border border-blood-500/40 bg-blood-900/60 px-1.5 py-0.5 text-[10px] text-blood-200"
      data-asset-id={assetId}
      title={title}
    >
      {assetUrl ? (
        <button
          aria-label={`Enlarge ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenImage({ src: assetUrl, alt: label, caption: title });
          }}
          type="button"
        >
          <img
            className="h-6 w-6 object-contain"
            src={assetUrl}
            alt={label}
            title={title}
          />
        </button>
      ) : null}
      {label}
    </span>
  );
}
