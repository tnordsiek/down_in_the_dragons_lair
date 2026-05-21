import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { getAssetUrl, useAsset } from '../../data/assets';
import type {
  BoardPosition,
  GameState,
  HeroId,
  Item,
  Player,
} from '../../engine/core/types';
import { itemAssetId, itemLabel } from '../items';
import { heroName } from '../labels';
import { getHeroPortraitTooltip } from '../tooltips';

type PlayerPanelProps = {
  onFocusPosition?: (position: BoardPosition) => void;
  state: GameState;
};

export function PlayerPanel({ onFocusPosition, state }: PlayerPanelProps) {
  const panel = useAsset('ui_panel_frame');
  const [activeHeroInfoPlayerId, setActiveHeroInfoPlayerId] = useState<
    string | undefined
  >(undefined);
  const playerGridClass =
    state.players.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1';

  useEffect(() => {
    if (!activeHeroInfoPlayerId) {
      return;
    }

    const handleClick = () => {
      setActiveHeroInfoPlayerId(undefined);
    };
    const handleContextMenu = () => {
      setActiveHeroInfoPlayerId(undefined);
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [activeHeroInfoPlayerId]);

  return (
    <section
      className="border border-stone-700 bg-stone-900 p-4"
      data-asset-id={panel.assetId}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-300">
        Players
      </h2>
      <div
        className={`mt-3 grid gap-2 ${playerGridClass}`}
        data-testid="player-panel-grid"
      >
        {state.players.map((player, index) => (
          <PlayerCard
            activeHeroInfoPlayerId={activeHeroInfoPlayerId}
            key={player.id}
            index={index}
            onFocusPosition={() => {
              setActiveHeroInfoPlayerId(undefined);
              onFocusPosition?.(player.position);
            }}
            player={player}
            setActiveHeroInfoPlayerId={setActiveHeroInfoPlayerId}
            state={state}
          />
        ))}
      </div>
    </section>
  );
}

function PlayerCard({
  activeHeroInfoPlayerId,
  index,
  onFocusPosition,
  player,
  setActiveHeroInfoPlayerId,
  state,
}: {
  activeHeroInfoPlayerId?: string;
  index: number;
  onFocusPosition?: () => void;
  player: Player;
  setActiveHeroInfoPlayerId: Dispatch<SetStateAction<string | undefined>>;
  state: GameState;
}) {
  const isActive = index === state.activePlayerIndex;
  const isThreePlayerTail = state.players.length === 3 && index === 2;
  const showHeroInfo = activeHeroInfoPlayerId === player.id;
  const weaponBonus = player.inventory.weapons.reduce(
    (sum, weapon) => sum + weapon.bonus,
    0,
  );
  const flameSpellCount = player.inventory.spells.filter(
    (spell) => spell.spellKind === 'flame',
  ).length;
  const hasMageFlameBonus = player.heroId === 'hero_mage' && !player.isCursed;
  const heroInfo = getHeroAbilityInfo(player.heroId);

  return (
    <article
      className={`relative min-w-0 border p-2.5 ${
        isActive
          ? 'border-amber-300 bg-stone-800'
          : 'border-stone-700 bg-stone-950'
      } ${isThreePlayerTail ? 'sm:col-span-2' : ''}`}
      data-asset-id={`${player.heroId}_portrait`}
      data-testid={`player-card-${player.id}`}
    >
      {showHeroInfo ? (
        <div
          className="pointer-events-none absolute bottom-full left-0 right-0 z-10 mb-2 border border-stone-700 bg-stone-900 px-2 py-1 text-[10px] text-stone-300 shadow-lg"
          data-testid={`hero-info-${player.id}`}
        >
          {heroInfo}
        </div>
      ) : null}
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
        <HeroPortrait
          heroId={player.heroId}
          onShowHeroInfo={() =>
            setActiveHeroInfoPlayerId((current) =>
              current === player.id ? undefined : player.id,
            )
          }
          onFocusPosition={onFocusPosition}
        />
        <div className="grid content-start gap-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-stone-100">
              {heroName(player.heroId)}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-stone-400">
              {player.kind}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
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
      <div className="mt-2 grid gap-1.5">
        <div className="flex flex-wrap gap-1">
          <BonusBadge
            label={`ATK +${weaponBonus}`}
            title={`Current weapon bonus: +${weaponBonus}`}
          />
          <BonusBadge
            label={hasMageFlameBonus ? 'Flame∞' : `Flame ${flameSpellCount}`}
            title={
              hasMageFlameBonus
                ? 'Mage: flame spells are not consumed'
                : `Available flame spells: ${flameSpellCount}`
            }
          />
        </div>
        <div
          className="grid gap-1 text-[10px] text-stone-300"
          data-asset-id="ui_icon_inventory"
        >
          <InventoryRow
            emptyLabel="-"
            icons={
              player.inventory.keyCount > 0
                ? [<ItemIcon key={`${player.id}-key`} item={{ type: 'key' }} />]
                : []
            }
            label={`Key ${player.inventory.keyCount}`}
            title={`Keys carried: ${player.inventory.keyCount}`}
          />
          <InventoryRow
            emptyLabel="-"
            icons={player.inventory.weapons.map((weapon, weaponIndex) => (
              <ItemIcon key={`${player.id}-weapon-${weaponIndex}`} item={weapon} />
            ))}
            label="Weapons"
            title={`Weapons carried: ${player.inventory.weapons.length}`}
          />
          <InventoryRow
            emptyLabel="-"
            icons={player.inventory.spells.map((spell, spellIndex) => (
              <ItemIcon key={`${player.id}-spell-${spellIndex}`} item={spell} />
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
                title="Cursed: hero abilities are inactive"
              />
            ) : null}
            {player.skipNextTurn ? (
              <StatusBadge
                assetId="status_unconscious"
                label="unconscious"
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
      return 'Flame spells are not consumed. The Mage may move through walls on discovered tiles.';
    case 'hero_valkyrie':
      return 'May reroll both combat dice once after a draw or defeat. Losing the last HP sends the Valkyrie to a healing tile.';
    case 'hero_witch':
      return 'May sacrifice 1 HP for +1 combat strength after a draw or defeat. May swap position with another player at turn start.';
    case 'hero_rogue':
      return 'Combat draws count as wins. The Rogue may ignore monsters while moving.';
    case 'hero_blade':
      return 'After a combat roll, rerolls every die showing 1 until none remain. Each combat with a final rolled 6 keeps the turn open for remaining movement and follow-up actions.';
    case 'hero_seeress':
      return 'Draws two room tokens and chooses one. Gains +1 combat strength before the first step is spent.';
  }
}

function HeroPortrait({
  heroId,
  onShowHeroInfo,
  onFocusPosition,
}: {
  heroId: HeroId;
  onShowHeroInfo: () => void;
  onFocusPosition?: () => void;
}) {
  const assetId = `${heroId}_portrait`;
  const assetUrl = getAssetUrl(assetId);
  const label = heroName(heroId);

  return (
    <button
      aria-label={`${label} portrait actions`}
      className="flex h-20 w-20 shrink-0 items-center justify-center border border-stone-700 bg-stone-900 font-mono text-sm text-amber-100"
      data-asset-id={assetId}
      onClick={(event) => {
        event.stopPropagation();
        onShowHeroInfo();
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
      <span className="uppercase tracking-wide text-stone-500">{label}</span>
      <div
        className="flex min-h-5 flex-wrap items-center justify-end gap-1"
        title={title}
      >
        {icons.length > 0 ? (
          icons
        ) : (
          <span className="text-stone-500">{emptyLabel}</span>
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
      className={`inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] ${
        tone === 'amber'
          ? 'bg-amber-950 text-amber-100'
          : 'bg-stone-800 text-stone-200'
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
      className="inline-flex items-center border border-stone-700 bg-stone-900 px-1.5 py-0.5 text-[10px] font-mono text-sky-100"
      title={title}
    >
      {label}
    </span>
  );
}

function ItemIcon({ item }: { item: Item }) {
  const assetId = itemAssetId(item);
  const label = itemLabel(item);
  const assetUrl = getAssetUrl(assetId);

  return assetUrl ? (
    <img
      className="h-4 w-4 rounded-sm object-contain"
      data-asset-id={assetId}
      src={assetUrl}
      alt={label}
      title={label}
    />
  ) : (
    <span className="text-xs" title={label}>
      {label}
    </span>
  );
}

function StatusBadge({
  assetId,
  label,
  title,
}: {
  assetId: string;
  label: string;
  title: string;
}) {
  const assetUrl = getAssetUrl(assetId);

  return (
    <span
      className="inline-flex items-center gap-1 bg-stone-800 px-1.5 py-0.5 text-[10px]"
      data-asset-id={assetId}
      title={title}
    >
      {assetUrl ? (
        <img
          className="h-3.5 w-3.5 object-contain"
          src={assetUrl}
          alt={label}
          title={title}
        />
      ) : null}
      {label}
    </span>
  );
}
