import { monsterDefinitions } from '../../data/monsters';
import { tileBlueprints } from '../../data/tiles';
import { getTileAt } from '../../engine/core/board';
import type {
  BoardPosition,
  GameState,
  Token,
  TileSide,
} from '../../engine/core/types';
import {
  calculateCombatTotal,
  getCombatFlameSpellChoices,
  getCombatOutcomeForPlayer,
} from '../../engine/combat/combat';
import { hasActiveHeroAbility } from '../../engine/rules/abilities';
import { canStoreItem } from '../../engine/rules/inventory';
import {
  isEndTurnBlockedPhase,
  isMainTurnActionPhase,
} from '../../engine/turns/turns';
import { getUiLegalActions } from '../../state/setupStore';
import { heroName, monsterName, sideLabels } from '../labels';
import { itemLabel } from '../items';
import { weaponDisplayNames } from '../../data/displayNames';

type HealingSpellSelectionState =
  | { mode: 'idle' }
  | { mode: 'select_target' }
  | { mode: 'select_tile'; targetPlayerId: string };
type WitchSwapSelectionState =
  | { mode: 'idle' }
  | { mode: 'select_target' };

function canUseHealingSpellNow(state: GameState): boolean {
  return isMainTurnActionPhase(state.phase);
}

type ActionPanelProps = {
  state: GameState;
  onMove: (target: BoardPosition) => void;
  onFocusPortalTarget?: (target: BoardPosition) => void;
  onBeginLoot: () => void;
  onLeaveLoot: () => void;
  onExplore: (direction: TileSide) => void;
  onChooseSeeressRoomToken: (choiceIndex: 0 | 1) => void;
  onStartOptionalCombat: () => void;
  onResolveCombat: () => void;
  onSelectCurseTarget: (targetPlayerId: string) => void;
  onUseBladeReroll: () => void;
  onUseValkyrieReroll: () => void;
  onDeclineValkyrieReroll: () => void;
  onUseWitchSacrifice: () => void;
  onDeclineWitchSacrifice: () => void;
  onResolveCombatWithoutFlameSpells: () => void;
  onResolveCombatWithFlameSpells: (flameSpellCount: number) => void;
  onSwapLoot: (inventorySlot: { kind: 'weapon' | 'spell'; index: number }) => void;
  onTakeLoot: () => void;
  onOpenChest: () => void;
  onCenterMap: () => void;
  onEndTurn: () => void;
  healingSpellSelection: HealingSpellSelectionState;
  onStartHealingSpellSelection: () => void;
  onCancelHealingSpellSelection: () => void;
  onSelectHealingSpellTarget: (targetPlayerId: string) => void;
  witchSwapSelection: WitchSwapSelectionState;
  onStartWitchSwapSelection: () => void;
  onCancelWitchSwapSelection: () => void;
  onSelectWitchSwapTarget: (targetPlayerId: string) => void;
};

export function ActionPanel({
  state,
  onMove,
  onFocusPortalTarget,
  onBeginLoot,
  onLeaveLoot,
  onExplore,
  onChooseSeeressRoomToken,
  onStartOptionalCombat,
  onResolveCombat,
  onSelectCurseTarget,
  onUseBladeReroll,
  onUseValkyrieReroll,
  onDeclineValkyrieReroll,
  onUseWitchSacrifice,
  onDeclineWitchSacrifice,
  onResolveCombatWithoutFlameSpells,
  onResolveCombatWithFlameSpells,
  onSwapLoot,
  onTakeLoot,
  onOpenChest,
  onCenterMap,
  onEndTurn,
  healingSpellSelection,
  onStartHealingSpellSelection,
  onCancelHealingSpellSelection,
  onSelectHealingSpellTarget,
  witchSwapSelection,
  onStartWitchSwapSelection,
  onCancelWitchSwapSelection,
  onSelectWitchSwapTarget,
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
    (state.phase === 'turn_start' || state.phase === 'await_move') &&
    activeTile?.roomToken?.id === 'treasure_chest' &&
    activePlayer.inventory.keyCount > 0;
  const groundLootItem = activeTile?.looseItems[0];
  const pendingLoot = state.pendingLoot;
  const canTakePendingLoot =
    pendingLoot !== undefined && canStoreItem(activePlayer, pendingLoot.item);
  const flameSpellChoices = getCombatFlameSpellChoices(state);
  const initialCombatDice = state.combat?.initialRolledDice;
  const initialCombatOutcome = state.combat?.initialBaseOutcome;
  const pendingCombatDice = state.combat?.rolledDice;
  const pendingCombatOutcome = state.combat?.pendingBaseOutcome;
  const pendingWitchSacrificeBonus =
    state.combat?.pendingWitchSacrificeBonus ?? 0;
  const pendingCombatTotal =
    pendingCombatDice !== undefined
      ? pendingCombatDice[0] +
        pendingCombatDice[1] +
        weaponBonus +
        pendingWitchSacrificeBonus
      : undefined;
  const pendingBladeTotal =
    state.phase === 'combat_blade_reroll' &&
    combatMonster &&
    pendingCombatDice
      ? calculateCombatTotal(activePlayer, pendingCombatDice)
      : undefined;
  const pendingBladeOutcome =
    pendingBladeTotal !== undefined && combatMonster
      ? getCombatOutcomeForPlayer(
          activePlayer,
          pendingBladeTotal,
          combatMonster.strength,
        )
      : undefined;
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
  const pendingSeeressRoomChoice = state.pendingSeeressRoomChoice;
  const hasActiveSeeressCombatBonus =
    state.phase === 'combat' &&
    hasActiveHeroAbility(activePlayer, 'hero_seeress') &&
    state.remainingSteps === 3;
  const canUseWitchSwap = legalActions.witchSwapTargets.length > 0;

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
        <div className="flex items-center gap-2">
          <button
            className="border border-stone-600 px-3 py-2 text-sm text-stone-100"
            onClick={onCenterMap}
          >
            Center Map
          </button>
          <button
            className="border border-stone-600 px-3 py-2 text-sm text-stone-100"
            disabled={isEndTurnBlockedPhase(state.phase)}
            onClick={onEndTurn}
          >
            End Turn
          </button>
        </div>
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

      {state.phase === 'turn_skip' && activePlayer.skipNextTurn ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Unconscious
          </h3>
          <p className="text-sm text-stone-200">
            This hero is unconscious and must skip this turn.
          </p>
          <p className="text-sm text-stone-400">
            End the turn to finish the skipped round and recover afterward.
          </p>
        </div>
      ) : null}

      {state.phase === 'resolve_room_token_seeress_choice' &&
      pendingSeeressRoomChoice ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Seeress Choice
          </h3>
          <p className="text-sm text-stone-200">
            Drawn room tokens at {pendingSeeressRoomChoice.position.boardX},
            {pendingSeeressRoomChoice.position.boardY}
          </p>
          <p className="text-sm text-stone-300">
            Choose one token to resolve. The other returns to the bag.
          </p>
          <div className="flex flex-wrap gap-2">
            {pendingSeeressRoomChoice.drawnTokens.map((token, index) => (
              <button
                key={`${token.id}-${index}`}
                className="border border-amber-500 px-3 py-2 text-sm text-amber-100"
                onClick={() => onChooseSeeressRoomToken(index as 0 | 1)}
              >
                Choose option {index + 1}: {tokenChoiceLabel(token)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {state.phase === 'optional_monster_combat' && combatMonster ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Monster Encounter
          </h3>
          <p className="text-sm text-stone-200">
            {monsterName(combatMonster.id)} strength {combatMonster.strength}
          </p>
          <p className="text-sm text-stone-300">
            The Rogue may ignore this monster, move on, stay here, or start combat.
          </p>
          <button
            className="w-fit bg-red-700 px-3 py-2 text-sm font-semibold text-white"
            data-asset-id="ui_icon_attack"
            onClick={onStartOptionalCombat}
          >
            Fight Monster
          </button>
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
            2d6 + weapons +{weaponBonus}
            {hasActiveSeeressCombatBonus ? ' + Seeress Sight +1' : ''}
            {' + fireball spells ('}
            {availableFlameSpells} available) must beat {combatMonster.strength}
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

      {state.phase === 'combat_curse_target' &&
      combatMonster &&
      state.players.some((player) => player.id !== activePlayer.id) ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Mummified Priest Curse
          </h3>
          <p className="text-sm text-stone-200">
            {monsterName(combatMonster.id)} defeated. Choose another hero to receive the curse.
          </p>
          <div className="flex flex-wrap gap-2">
            {state.players
              .filter((player) => player.id !== activePlayer.id)
              .map((player) => (
                <button
                  key={`curse-target-${player.id}`}
                  className="border border-amber-500 px-3 py-2 text-sm text-amber-100"
                  onClick={() => onSelectCurseTarget(player.id)}
                >
                  {heroName(player.heroId)}
                </button>
              ))}
          </div>
        </div>
      ) : null}

      {state.phase === 'combat_valkyrie_reroll' &&
      combatMonster &&
      initialCombatDice &&
      initialCombatOutcome ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Valkyrie Reroll
          </h3>
          <p className="text-sm text-stone-200">
            {monsterName(combatMonster.id)} strength {combatMonster.strength}
          </p>
          <p className="font-mono text-xs text-stone-300">
            Rolled {initialCombatDice[0]} + {initialCombatDice[1]} + weapons{' '}
            {weaponBonus} = {initialCombatDice[0] + initialCombatDice[1] + weaponBonus}
            {` and currently face ${initialCombatOutcome}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="bg-red-700 px-3 py-2 text-sm font-semibold text-white"
              onClick={onUseValkyrieReroll}
            >
              Reroll both dice
            </button>
            <button
              className="border border-stone-500 px-3 py-2 text-sm text-stone-100"
              onClick={onDeclineValkyrieReroll}
            >
              Keep this result
            </button>
          </div>
        </div>
      ) : null}

      {state.phase === 'combat_blade_reroll' &&
      combatMonster &&
      pendingCombatDice ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Blade Reroll
          </h3>
          <p className="text-sm text-stone-200">
            {monsterName(combatMonster.id)} strength {combatMonster.strength}
          </p>
          <p className="font-mono text-xs text-stone-300">
            Current dice {pendingCombatDice[0]} + {pendingCombatDice[1]}
            {pendingCombatDice.includes(1)
              ? ' · reroll every die showing 1'
              : ''}
          </p>
          {pendingBladeTotal !== undefined &&
          pendingBladeOutcome ? (
            <p className="font-mono text-xs text-stone-300">
              Current result {pendingCombatDice[0]} + {pendingCombatDice[1]} +
              weapons {weaponBonus} = {pendingBladeTotal}
              {` and currently faces ${pendingBladeOutcome}`}
            </p>
          ) : null}
          <button
            className="bg-red-700 px-3 py-2 text-sm font-semibold text-white"
            onClick={onUseBladeReroll}
          >
            Reroll 1s
          </button>
        </div>
      ) : null}

      {state.phase === 'combat_witch_sacrifice' &&
      combatMonster &&
      initialCombatDice &&
      initialCombatOutcome ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Witch Sacrifice
          </h3>
          <p className="text-sm text-stone-200">
            {monsterName(combatMonster.id)} strength {combatMonster.strength}
          </p>
          <p className="font-mono text-xs text-stone-300">
            Rolled {initialCombatDice[0]} + {initialCombatDice[1]} + weapons{' '}
            {weaponBonus} = {initialCombatDice[0] + initialCombatDice[1] + weaponBonus}
            {` and currently face ${initialCombatOutcome}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="bg-red-700 px-3 py-2 text-sm font-semibold text-white"
              onClick={onUseWitchSacrifice}
            >
              Sacrifice 1 HP for +1
            </button>
            <button
              className="border border-stone-500 px-3 py-2 text-sm text-stone-100"
              onClick={onDeclineWitchSacrifice}
            >
              Keep this result
            </button>
          </div>
        </div>
      ) : null}

      {state.phase === 'combat_flame_spells' && combatMonster && pendingCombatDice ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Fireball Spells
          </h3>
          <p className="text-sm text-stone-200">
            {monsterName(combatMonster.id)} strength {combatMonster.strength}
          </p>
          <p className="font-mono text-xs text-stone-300">
            Rolled {pendingCombatDice[0]} + {pendingCombatDice[1]} + weapons{' '}
            {weaponBonus}
            {pendingWitchSacrificeBonus > 0
              ? ` + sacrifice ${pendingWitchSacrificeBonus}`
              : ''}
            {' = '}
            {pendingCombatTotal}
            {pendingCombatOutcome ? ` and currently face ${pendingCombatOutcome}` : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="border border-stone-500 px-3 py-2 text-sm text-stone-100"
              onClick={onResolveCombatWithoutFlameSpells}
            >
              Do not use fireball spells
            </button>
            {flameSpellChoices.map((flameSpellCount) => (
              <button
                key={`combat-flame-${flameSpellCount}`}
                className="border border-amber-500 px-3 py-2 text-sm text-amber-100"
                onClick={() => onResolveCombatWithFlameSpells(flameSpellCount)}
              >
                Use {flameSpellCount} Fireball Spell{flameSpellCount === 1 ? '' : 's'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {canUseWitchSwap ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Witch Swap
          </h3>
          {witchSwapSelection.mode === 'idle' ? (
            <button
              className="w-fit border border-violet-500 px-3 py-2 text-sm text-violet-100"
              onClick={onStartWitchSwapSelection}
            >
              Swap Position
            </button>
          ) : null}
          {witchSwapSelection.mode === 'select_target' ? (
            <>
              <p className="text-sm text-stone-300">
                Choose another hero to swap positions with.
              </p>
              <div className="flex flex-wrap gap-2">
                {legalActions.witchSwapTargets.map((player) => (
                  <button
                    key={`witch-swap-target-${player.id}`}
                    className="border border-violet-500 px-3 py-2 text-sm text-violet-100"
                    onClick={() => onSelectWitchSwapTarget(player.id)}
                  >
                    {heroName(player.heroId)}
                  </button>
                ))}
                <button
                  className="border border-stone-500 px-3 py-2 text-sm text-stone-100"
                  onClick={onCancelWitchSwapSelection}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : null}
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
                    Swap {weaponDisplayNames[weapon.bonus]}
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
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onFocusPortalTarget?.(move.target);
                    }}
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

function tokenChoiceLabel(token: Token): string {
  return token.id === 'treasure_chest'
    ? 'Treasure Chest'
    : monsterName(token.id);
}
