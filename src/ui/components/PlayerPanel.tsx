import { useMemo, useState, type ReactNode } from 'react';

import { getAssetUrl, useAsset } from '../../data/assets';
import type {
  BoardPosition,
  GameState,
  HeroId,
  Item,
  Player,
} from '../../engine/core/types';
import { playerDisplayName } from '../../data/playerLabels';
import { itemAssetId, itemLabel } from '../items';
import { heroName } from '../labels';
import { getHeroPortraitTooltip } from '../tooltips';
import { ImageLightbox, type LightboxImage } from './ImageLightbox';

type PlayerPanelProps = {
  onFocusPosition?: (position: BoardPosition) => void;
  state: GameState;
};

export function PlayerPanel({ onFocusPosition, state }: PlayerPanelProps) {
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
        Players
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

function PlayerCard({
  index,
  onFocusPosition,
  onOpenImage,
  player,
  state,
}: {
  index: number;
  onFocusPosition?: () => void;
  onOpenImage: (image: LightboxImage) => void;
  player: Player;
  state: GameState;
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
  const heroInfo = getHeroAbilityInfo(player.heroId);

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
            />
            <div className="grid content-start gap-1">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-parchment-50">
                  {heroName(player.heroId)}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-parchment-200">
                  {playerDisplayName(player, state.players)}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1">
                <MetricChip
                  label={`HP ${player.hp}/${player.maxHp}`}
                  title={`Health: ${player.hp} of ${player.maxHp}`}
                />
                {isActive ? (
                  <MetricChip
                    label="Active"
                    title="Current active player"
                    tone="amber"
                  />
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <BonusBadge
              label={`ATK +${weaponBonus}`}
              title={`Current weapon bonus: +${weaponBonus}`}
            />
            <BonusBadge
              label={
                hasMageFlameBonus ? 'Fireball ∞' : `Fireball ${flameSpellCount}`
              }
              title={
                hasMageFlameBonus
                  ? 'Mage: fireball spells are not consumed'
                  : `Available fireball spells: ${flameSpellCount}`
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
                    />,
                  ]
                : []
            }
            label={`Key ${player.inventory.keyCount}`}
            title={`Keys carried: ${player.inventory.keyCount}`}
          />
          <InventoryRow
            emptyLabel="-"
            icons={player.inventory.weapons.map((weapon, weaponIndex) => (
              <ItemIcon
                key={`${player.id}-weapon-${weaponIndex}`}
                item={weapon}
                onOpenImage={onOpenImage}
              />
            ))}
            label="Weapons"
            title={`Weapons carried: ${player.inventory.weapons.length}`}
          />
          <InventoryRow
            emptyLabel="-"
            icons={player.inventory.spells.map((spell, spellIndex) => (
              <ItemIcon
                key={`${player.id}-spell-${spellIndex}`}
                item={spell}
                onOpenImage={onOpenImage}
              />
            ))}
            label="Spells"
            title={`Spells carried: ${player.inventory.spells.length}`}
          />
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <MetricChip
              label={`${player.treasurePoints} pts`}
              title={`Treasure points: ${player.treasurePoints}`}
              tone="amber"
            />
            {player.isCursed ? (
              <StatusBadge
                assetId="status_curse"
                label="cursed"
                onOpenImage={onOpenImage}
                title="Cursed: hero abilities are inactive"
              />
            ) : null}
            {player.skipNextTurn ? (
              <StatusBadge
                assetId="status_unconscious"
                label="unconscious"
                onOpenImage={onOpenImage}
                title="Unconscious: this player skips the next turn"
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function getHeroAbilityInfo(heroId: HeroId): string {
  switch (heroId) {
    case 'hero_mage':
      return 'Fireball spells are not consumed. The Mage may move through walls on discovered tiles.';
    case 'hero_valkyrie':
      return 'May reroll both combat dice once after a draw or defeat. Losing the last HP sends the Valkyrie to a healing tile.';
    case 'hero_witch':
      return 'May sacrifice 1 HP for +1 combat strength in a fight. May swap position with another player at turn start.';
    case 'hero_rogue':
      return 'Combat draws count as wins. The Rogue may ignore monsters while moving.';
    case 'hero_blade':
      return 'After a combat roll, rerolls every die showing 1 until none remain. Each combat with a final rolled 6 keeps the turn open for remaining movement and follow-up actions.';
    case 'hero_seeress':
      return 'Draws two room tokens and chooses one. Gains +1 combat strength in a fight after the first step is spent.';
  }
}

function HeroPortrait({
  heroId,
  heroInfo,
  onOpenImage,
  onFocusPosition,
}: {
  heroId: HeroId;
  heroInfo: string;
  onOpenImage: (image: LightboxImage) => void;
  onFocusPosition?: () => void;
}) {
  const assetId = `${heroId}_portrait`;
  const assetUrl = getAssetUrl(assetId);
  const label = heroName(heroId);

  return (
    <button
      aria-label={`${label} portrait actions`}
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
      title={getHeroPortraitTooltip()}
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

function ItemIcon({
  item,
  onOpenImage,
}: {
  item: Item;
  onOpenImage: (image: LightboxImage) => void;
}) {
  const assetId = itemAssetId(item);
  const label = itemLabel(item);
  const assetUrl = getAssetUrl(assetId);

  return assetUrl ? (
    <button
      aria-label={`Enlarge ${label}`}
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
