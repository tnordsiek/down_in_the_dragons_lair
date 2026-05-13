import { monsterDefinitions } from '../../data/monsters';
import { tileBlueprints } from '../../data/tiles';
import { getTileAt } from '../../engine/core/board';
import type {
  BoardPosition,
  GameState,
  TileSide,
} from '../../engine/core/types';
import { getCombatFlameSpellChoices } from '../../engine/combat/combat';
import { canStoreItem } from '../../engine/rules/inventory';
import { getUiLegalActions } from '../../state/setupStore';
import { heroName, monsterName, sideLabels } from '../labels';
import { itemLabel } from '../items';

type HealingSpellSelectionState =
  | { mode: 'idle' }
  | { mode: 'select_target' }
  | { mode: 'select_tile'; targetPlayerId: string };

function canUseHealingSpellNow(state: GameState): boolean {
  return state.phase === 'turn_start' || state.phase === 'await_move';
}

type ActionPanelProps = {
  state: GameState;
  onMove: (target: BoardPosition) => void;
  onBeginLoot: () => void;
  onLeaveLoot: () => void;
  onExplore: (direction: TileSide) => void;
  onResolveRoom: () => void;
  onResolveCombat: () => void;
  onResolveCombatWithoutFlameSpells: () => void;
  onResolveCombatWithFlameSpells: (flameSpellCount: number) => void;
  onSwapLoot: (inventorySlot: { kind: 'weapon' | 'spell'; index: number }) => void;
  onTakeLoot: () => void;
  onOpenChest: () => void;
  onEndTurn: () => void;
  healingSpellSelection: HealingSpellSelectionState;
  onStartHealingSpellSelection: () => void;
  onCancelHealingSpellSelection: () => void;
  onSelectHealingSpellTarget: (targetPlayerId: string) => void;
};

export function ActionPanel({
  state,
  onMove,
  onBeginLoot,
  onLeaveLoot,
  onExplore,
  onResolveRoom,
  onResolveCombat,
  onResolveCombatWithoutFlameSpells,
  onResolveCombatWithFlameSpells,
  onSwapLoot,
  onTakeLoot,
  onOpenChest,
  onEndTurn,
  healingSpellSelection,
  onStartHealingSpellSelection,
  onCancelHealingSpellSelection,
  onSelectHealingSpellTarget,
}: ActionPanelProps) {
  const legalActions = getUiLegalActions(state);
  const activePlayer = state.players[state.activePlayerIndex];
  const activeTile = getTileAt(state.board, activePlayer.position);
  const isOnTeleportTile =
    activeTile !== undefined &&
    tileBlueprints[activeTile.blueprintId].category === 'teleport';
  const adjacentMoves = legalActions.knownMoves.filter(
    (move) => move.direction !== undefined,
  );
  const portalMoves = legalActions.knownMoves.filter(
    (move) => move.kind === 'teleport',
  );
  const combatMonster = state.combat
    ? monsterDefinitions[state.combat.monsterId]
    : undefined;
  const weaponBonus = activePlayer.inventory.weapons.reduce(
    (sum, weapon) => sum + weapon.bonus,
    0,
  );
  const availableFlameSpells = activePlayer.inventory.spells.filter(
    (spell) => spell.spellKind === 'flame',
  ).length;
  const canOpenChest =
    activeTile?.roomToken?.id === 'treasure_chest' &&
    activePlayer.inventory.keyCount > 0;
  const groundLootItem = activeTile?.looseItems[0];
  const pendingLoot = state.pendingLoot;
  const canTakePendingLoot =
    pendingLoot !== undefined && canStoreItem(activePlayer, pendingLoot.item);
  const flameSpellChoices = getCombatFlameSpellChoices(state);
  const pendingCombatDice = state.combat?.rolledDice;
  const pendingCombatOutcome = state.combat?.pendingBaseOutcome;
  const hasHealingSpell = activePlayer.inventory.spells.some(
    (spell) => spell.spellKind === 'healing',
  );
  const canUseHealingSpell = hasHealingSpell && canUseHealingSpellNow(state);
  const selectedHealingTarget =
    healingSpellSelection.mode === 'select_tile'
      ? state.players.find(
          (player) => player.id === healingSpellSelection.targetPlayerId,
        )
      : undefined;

  return (
    <section
      className="border border-stone-700 bg-stone-900 p-4"
      data-asset-id="ui_icon_move"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-300">
            Actions
          </h2>
          <p className="mt-1 font-mono text-sm text-amber-100">
            {state.phase} / {state.remainingSteps}
          </p>
        </div>
        <button
          className="border border-stone-600 px-3 py-2 text-sm text-stone-100"
          disabled={
            state.phase === 'loot_resolution' ||
            state.phase === 'resolve_room_token'
          }
          onClick={onEndTurn}
        >
          End Turn
        </button>
      </div>

      {state.phase === 'choose_pending_tile_rotation' && state.pendingTile ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-sm text-stone-300">
            {state.pendingTile.blueprintId}
          </h3>
          <p className="text-sm text-stone-400">
            Rotate the preview tile on the board, then confirm placement in the
            center of the tile.
          </p>
        </div>
      ) : null}

      {state.phase === 'combat' && combatMonster ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Combat
          </h3>
          <p className="text-sm text-stone-200">
            {monsterName(combatMonster.id)} strength {combatMonster.strength}
          </p>
          <p className="font-mono text-xs text-stone-300">
            2d6 + weapons +{weaponBonus} + flame spells ({availableFlameSpells}{' '}
            available) must beat {combatMonster.strength}
          </p>
          <button
            className="w-fit bg-red-700 px-3 py-2 text-sm font-semibold text-white"
            data-asset-id="ui_icon_attack"
            onClick={onResolveCombat}
          >
            Resolve Combat
          </button>
        </div>
      ) : null}

      {state.phase === 'combat_flame_spells' && combatMonster && pendingCombatDice ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Flame Spells
          </h3>
          <p className="text-sm text-stone-200">
            {monsterName(combatMonster.id)} strength {combatMonster.strength}
          </p>
          <p className="font-mono text-xs text-stone-300">
            Rolled {pendingCombatDice[0]} + {pendingCombatDice[1]} + weapons{' '}
            {weaponBonus} = {pendingCombatDice[0] + pendingCombatDice[1] + weaponBonus}
            {pendingCombatOutcome ? ` and currently face ${pendingCombatOutcome}` : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="border border-stone-500 px-3 py-2 text-sm text-stone-100"
              onClick={onResolveCombatWithoutFlameSpells}
            >
              Do not use flame spells
            </button>
            {flameSpellChoices.map((flameSpellCount) => (
              <button
                key={`combat-flame-${flameSpellCount}`}
                className="border border-amber-500 px-3 py-2 text-sm text-amber-100"
                onClick={() => onResolveCombatWithFlameSpells(flameSpellCount)}
              >
                Use {flameSpellCount} Flame Spell{flameSpellCount === 1 ? '' : 's'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {canOpenChest ? (
        <div className="mt-4">
          <button
            className="bg-amber-300 px-3 py-2 text-sm font-semibold text-stone-950"
            data-asset-id="sfx_chest_open"
            onClick={onOpenChest}
          >
            Open Chest
          </button>
        </div>
      ) : null}

      {state.phase === 'loot_resolution' && pendingLoot ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Loot
          </h3>
          <p className="text-sm text-stone-200">{itemLabel(pendingLoot.item)}</p>
          <div className="flex flex-wrap gap-2">
            {canTakePendingLoot ? (
              <button
                className="border border-amber-500 px-3 py-2 text-sm text-amber-100"
                onClick={onTakeLoot}
              >
                Take
              </button>
            ) : null}
            <button
              className="border border-stone-500 px-3 py-2 text-sm text-stone-100"
              onClick={onLeaveLoot}
            >
              Leave
            </button>
            {pendingLoot.item.type === 'weapon'
              ? activePlayer.inventory.weapons.map((weapon, index) => (
                  <button
                    key={`swap-weapon-${index}`}
                    className="border border-sky-500 px-3 py-2 text-sm text-sky-100"
                    onClick={() =>
                      onSwapLoot({ kind: 'weapon', index })
                    }
                  >
                    Swap Weapon +{weapon.bonus}
                  </button>
                ))
              : null}
            {pendingLoot.item.type === 'spell'
              ? activePlayer.inventory.spells.map((spell, index) => (
                  <button
                    key={`swap-spell-${index}`}
                    className="border border-sky-500 px-3 py-2 text-sm text-sky-100"
                    onClick={() =>
                      onSwapLoot({ kind: 'spell', index })
                    }
                  >
                    Swap {spell.spellKind} spell
                  </button>
                ))
              : null}
          </div>
        </div>
      ) : null}

      {canUseHealingSpell ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Healing Spell
          </h3>
          {healingSpellSelection.mode === 'idle' ? (
            <button
              className="w-fit border border-amber-500 px-3 py-2 text-sm text-amber-100"
              onClick={onStartHealingSpellSelection}
            >
              Use Healing Spell
            </button>
          ) : null}
          {healingSpellSelection.mode === 'select_target' ? (
            <>
              <p className="text-sm text-stone-300">
                Choose which hero to teleport to a discovered healing tile.
              </p>
              <div className="flex flex-wrap gap-2">
                {state.players.map((player) => (
                  <button
                    key={player.id}
                    className="border border-amber-500 px-3 py-2 text-sm text-amber-100"
                    onClick={() => onSelectHealingSpellTarget(player.id)}
                  >
                    {heroName(player.heroId)}
                  </button>
                ))}
                <button
                  className="border border-stone-500 px-3 py-2 text-sm text-stone-100"
                  onClick={onCancelHealingSpellSelection}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : null}
          {healingSpellSelection.mode === 'select_tile' && selectedHealingTarget ? (
            <>
              <p className="text-sm text-stone-300">
                Choose a discovered healing tile for {heroName(selectedHealingTarget.heroId)}.
              </p>
              <button
                className="w-fit border border-stone-500 px-3 py-2 text-sm text-stone-100"
                onClick={onCancelHealingSpellSelection}
              >
                Cancel
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {groundLootItem &&
        (state.phase === 'turn_start' || state.phase === 'await_move') ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-stone-400">
              Loot
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="border border-amber-500 px-3 py-2 text-sm text-amber-100"
                onClick={onBeginLoot}
              >
                Take {itemLabel(groundLootItem)}
              </button>
            </div>
          </div>
        ) : null}

        {adjacentMoves.length > 0 ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-stone-400">
              Move
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {adjacentMoves.map((move) => (
                <button
                  key={`${move.target.boardX},${move.target.boardY}`}
                  className="border border-stone-500 px-3 py-2 text-sm text-stone-100"
                  onClick={() => onMove(move.target)}
                >
                  {sideLabels[move.direction!]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isOnTeleportTile ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-stone-400">
              Portal
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {portalMoves.length > 0 ? (
                portalMoves.map((move) => (
                  <button
                    key={`portal-${move.target.boardX},${move.target.boardY}`}
                    className="border border-sky-500 px-3 py-2 text-sm text-sky-100"
                    onClick={() => onMove(move.target)}
                  >
                    {move.target.boardX},{move.target.boardY}
                  </button>
                ))
              ) : (
                <button
                  className="cursor-not-allowed border border-stone-700 px-3 py-2 text-sm text-stone-500"
                  disabled
                  type="button"
                >
                  No known portal target
                </button>
              )}
            </div>
          </div>
        ) : null}

        {legalActions.explorationDirections.length > 0 ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-stone-400">
              Explore
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {legalActions.explorationDirections.map((direction) => (
                <button
                  key={direction}
                  className="border border-amber-500 px-3 py-2 text-sm text-amber-100"
                  data-asset-id="sfx_tile_place"
                  onClick={() => onExplore(direction)}
                >
                  {sideLabels[direction]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
