import { useMemo } from 'react';

import { monsterDefinitions } from '../../data/monsters';
import { tileBlueprints } from '../../data/tiles';
import { getTileAt } from '../../engine/core/board';
import type {
  BoardPosition,
  GameState,
  Item,
  Token,
  TileSide,
} from '../../engine/core/types';
import type { Translations } from '../../i18n/en';
import {
  calculateCombatTotal,
  getCombatOutcomeForPlayer,
} from '../../engine/combat/combat';
import { hasActiveHeroAbility } from '../../engine/rules/abilities';
import { isEndTurnBlockedPhase, isMainTurnActionPhase } from '../../engine/turns/turns';
import { getUiLegalActions } from '../../state/setupStore';
import { useTranslation } from '../../i18n/useTranslation';
import { Button } from '../primitives';
import type {
  HealingSpellSelectionState,
  WitchSwapSelectionState,
} from '../selectionState';

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
  onSwapLoot: (inventorySlot: {
    kind: 'weapon' | 'spell';
    index: number;
  }) => void;
  onTakeLoot: () => void;
  onOpenChest: () => void;
  onCenterMap: () => void;
  onCenterHeroine: () => void;
  isCenteredOnMap: boolean;
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
  onCenterHeroine,
  isCenteredOnMap,
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
  const t = useTranslation();
  const legalActions = getUiLegalActions(state);
  const {
    canOpenChest,
    canTakePendingLoot,
    canUseHealingSpell,
  } = legalActions;
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
  const weaponBonus = useMemo(
    () =>
      activePlayer.inventory.weapons.reduce(
        (sum, weapon) => sum + weapon.bonus,
        0,
      ),
    [activePlayer],
  );
  const flameSpellChoices = useMemo(
    () => legalActions.combatFlameSpellChoices,
    [legalActions],
  );
  const availableFlameSpells = activePlayer.inventory.spells.filter(
    (spell) => spell.spellKind === 'flame',
  ).length;
  const groundLootItem = activeTile?.looseItems[0];
  const pendingLoot = state.pendingLoot;
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
    state.phase === 'combat_blade_reroll' && combatMonster && pendingCombatDice
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
  const phaseHeaderLabel =
    t.actionPanel.phaseLabels[state.phase] ?? t.actionPanel.inProgress;
  const remainingStepsLabel =
    state.remainingSteps <= 0
      ? t.actionPanel.noStepsLeft
      : t.actionPanel.stepsLeft(state.remainingSteps);

  return (
    <section
      className="rounded-forged border border-obsidian-700 bg-obsidian-800/85 p-4 shadow-forged"
      data-asset-id="ui_icon_move"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-torch-200">
            {t.actionPanel.actions}
          </h2>
          <div
            className="mt-1 text-sm leading-snug text-amber-100"
            data-testid="action-panel-phase-header"
          >
            <p>{phaseHeaderLabel}</p>
            <p>{remainingStepsLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={isCenteredOnMap ? onCenterHeroine : onCenterMap}>
            {isCenteredOnMap ? t.actionPanel.centerHeroine : t.actionPanel.centerMap}
          </Button>
          <Button
            disabled={isEndTurnBlockedPhase(state.phase)}
            onClick={onEndTurn}
          >
            {t.actionPanel.endTurn}
          </Button>
        </div>
      </div>

      {state.phase === 'choose_pending_tile_rotation' && state.pendingTile ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-sm text-parchment-200">
            {t.displayNames.tiles[state.pendingTile.blueprintId]}
          </h3>
          <p className="text-sm text-parchment-200">
            {t.actionPanel.placeTileHint}
          </p>
        </div>
      ) : null}

      {state.phase === 'turn_skip' && activePlayer.skipNextTurn ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.unconscious}
          </h3>
          <p className="text-sm text-parchment-100">
            {t.actionPanel.unconsciousMsg}
          </p>
          <p className="text-sm text-parchment-200">
            {t.actionPanel.unconsciousEndTurnHint}
          </p>
        </div>
      ) : null}

      {state.phase === 'resolve_room_token_seeress_choice' &&
      pendingSeeressRoomChoice ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.seeressChoice}
          </h3>
          <p className="text-sm text-parchment-100">
            {t.actionPanel.seeressDrawnTokens(
              pendingSeeressRoomChoice.position.boardX,
              pendingSeeressRoomChoice.position.boardY,
            )}
          </p>
          <p className="text-sm text-parchment-200">
            {t.actionPanel.seeressChooseHint}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {pendingSeeressRoomChoice.drawnTokens.map((token, index) => (
              <button
                key={`${token.id}-${index}`}
                className="rounded-forged border border-torch-500 px-3 py-2 text-sm text-torch-200 transition-colors hover:bg-torch-500/10"
                onClick={() => onChooseSeeressRoomToken(index as 0 | 1)}
              >
                {t.actionPanel.seeressOption(
                  index + 1,
                  tokenChoiceLabel(token, t),
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {state.phase === 'optional_monster_combat' && combatMonster ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.monsterEncounter}
          </h3>
          <p className="text-sm text-parchment-100">
            {t.actionPanel.monsterStrength(
              t.displayNames.monsters[combatMonster.id],
              combatMonster.strength,
            )}
          </p>
          <p className="text-sm text-parchment-200">
            {t.actionPanel.monsterEncounterRogue}
          </p>
          <button
            className="w-fit rounded-forged bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-forged transition-colors hover:bg-blood-500"
            data-asset-id="ui_icon_attack"
            onClick={onStartOptionalCombat}
          >
            {t.actionPanel.fightMonster}
          </button>
        </div>
      ) : null}

      {state.phase === 'combat' && combatMonster ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.phaseLabels['combat']}
          </h3>
          <p className="text-sm text-parchment-100">
            {t.actionPanel.monsterStrength(
              t.displayNames.monsters[combatMonster.id],
              combatMonster.strength,
            )}
          </p>
          <p className="font-mono text-xs text-parchment-200">
            {t.actionPanel.combatFormula(
              weaponBonus,
              hasActiveSeeressCombatBonus,
              availableFlameSpells,
              combatMonster.strength,
            )}
          </p>
          <button
            className="w-fit rounded-forged bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-forged transition-colors hover:bg-blood-500"
            data-asset-id="ui_icon_attack"
            onClick={onResolveCombat}
          >
            {t.actionPanel.resolveCombat}
          </button>
        </div>
      ) : null}

      {state.phase === 'combat_curse_target' &&
      combatMonster &&
      state.players.some((player) => player.id !== activePlayer.id) ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.mummifiedPriestCurse}
          </h3>
          <p className="text-sm text-parchment-100">
            {t.actionPanel.mummifiedPriestCurseMsg(
              t.displayNames.monsters[combatMonster.id],
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {state.players
              .filter((player) => player.id !== activePlayer.id)
              .map((player) => (
                <button
                  key={`curse-target-${player.id}`}
                  className="rounded-forged border border-torch-500 px-3 py-2 text-sm text-torch-200 transition-colors hover:bg-torch-500/10"
                  onClick={() => onSelectCurseTarget(player.id)}
                >
                  {t.displayNames.heroes[player.heroId]}
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
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.valkyrieReroll}
          </h3>
          <p className="text-sm text-parchment-100">
            {t.actionPanel.monsterStrength(
              t.displayNames.monsters[combatMonster.id],
              combatMonster.strength,
            )}
          </p>
          <p className="font-mono text-xs text-parchment-200">
            {t.actionPanel.rolledDetails(
              initialCombatDice[0],
              initialCombatDice[1],
              weaponBonus,
              initialCombatDice[0] + initialCombatDice[1] + weaponBonus,
              t.actionPanel.combatOutcomes[initialCombatOutcome] ??
                initialCombatOutcome,
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-forged bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-forged transition-colors hover:bg-blood-500"
              onClick={onUseValkyrieReroll}
            >
              {t.actionPanel.rerollBothDice}
            </button>
            <button
              className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
              onClick={onDeclineValkyrieReroll}
            >
              {t.actionPanel.keepThisResult}
            </button>
          </div>
        </div>
      ) : null}

      {state.phase === 'combat_blade_reroll' &&
      combatMonster &&
      pendingCombatDice ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.bladeReroll}
          </h3>
          <p className="text-sm text-parchment-100">
            {t.actionPanel.monsterStrength(
              t.displayNames.monsters[combatMonster.id],
              combatMonster.strength,
            )}
          </p>
          <p className="font-mono text-xs text-parchment-200">
            {t.actionPanel.currentDice(
              pendingCombatDice[0],
              pendingCombatDice[1],
              pendingCombatDice.includes(1),
            )}
          </p>
          {pendingBladeTotal !== undefined && pendingBladeOutcome ? (
            <p className="font-mono text-xs text-parchment-200">
              {t.actionPanel.bladeCurrentResult(
                pendingCombatDice[0],
                pendingCombatDice[1],
                weaponBonus,
                pendingBladeTotal,
                t.actionPanel.combatOutcomes[pendingBladeOutcome] ??
                  pendingBladeOutcome,
              )}
            </p>
          ) : null}
          <button
            className="rounded-forged bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-forged transition-colors hover:bg-blood-500"
            onClick={onUseBladeReroll}
          >
            {t.actionPanel.rerollOnes}
          </button>
        </div>
      ) : null}

      {state.phase === 'combat_witch_sacrifice' &&
      combatMonster &&
      initialCombatDice &&
      initialCombatOutcome ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.witchSacrifice}
          </h3>
          <p className="text-sm text-parchment-100">
            {t.actionPanel.monsterStrength(
              t.displayNames.monsters[combatMonster.id],
              combatMonster.strength,
            )}
          </p>
          <p className="font-mono text-xs text-parchment-200">
            {t.actionPanel.rolledDetails(
              initialCombatDice[0],
              initialCombatDice[1],
              weaponBonus,
              initialCombatDice[0] + initialCombatDice[1] + weaponBonus,
              t.actionPanel.combatOutcomes[initialCombatOutcome] ??
                initialCombatOutcome,
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-forged bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-forged transition-colors hover:bg-blood-500"
              onClick={onUseWitchSacrifice}
            >
              {t.actionPanel.sacrifice1HP}
            </button>
            <button
              className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
              onClick={onDeclineWitchSacrifice}
            >
              {t.actionPanel.keepThisResult}
            </button>
          </div>
        </div>
      ) : null}

      {state.phase === 'combat_flame_spells' &&
      combatMonster &&
      pendingCombatDice ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.fireballSpells}
          </h3>
          <p className="text-sm text-parchment-100">
            {t.actionPanel.monsterStrength(
              t.displayNames.monsters[combatMonster.id],
              combatMonster.strength,
            )}
          </p>
          <p className="font-mono text-xs text-parchment-200">
            {t.actionPanel.fireballFormula(
              pendingCombatDice[0],
              pendingCombatDice[1],
              weaponBonus,
              pendingWitchSacrificeBonus,
              pendingCombatTotal,
              pendingCombatOutcome
                ? (t.actionPanel.combatOutcomes[pendingCombatOutcome] ??
                    pendingCombatOutcome)
                : undefined,
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
              onClick={onResolveCombatWithoutFlameSpells}
            >
              {t.actionPanel.doNotUseFireballs}
            </button>
            {flameSpellChoices.map((flameSpellCount) => (
              <button
                key={`combat-flame-${flameSpellCount}`}
                className="rounded-forged border border-torch-500 px-3 py-2 text-sm text-torch-200 transition-colors hover:bg-torch-500/10"
                onClick={() => onResolveCombatWithFlameSpells(flameSpellCount)}
              >
                {t.actionPanel.useFireballSpells(flameSpellCount)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {canUseWitchSwap ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.witchSwap}
          </h3>
          {witchSwapSelection.mode === 'idle' ? (
            <button
              className="w-fit rounded-forged border border-arcane-400 px-3 py-2 text-sm text-arcane-200 transition-colors hover:bg-arcane-400/10"
              onClick={onStartWitchSwapSelection}
            >
              {t.actionPanel.swapPosition}
            </button>
          ) : null}
          {witchSwapSelection.mode === 'select_target' ? (
            <>
              <p className="text-sm text-parchment-200">
                {t.actionPanel.witchSwapHint}
              </p>
              <div className="flex flex-wrap gap-2">
                {legalActions.witchSwapTargets.map((player) => (
                  <button
                    key={`witch-swap-target-${player.id}`}
                    className="rounded-forged border border-arcane-400 px-3 py-2 text-sm text-arcane-200 transition-colors hover:bg-arcane-400/10"
                    onClick={() => onSelectWitchSwapTarget(player.id)}
                  >
                    {t.displayNames.heroes[player.heroId]}
                  </button>
                ))}
                <button
                  className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
                  onClick={onCancelWitchSwapSelection}
                >
                  {t.actionPanel.cancel}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {canOpenChest ? (
        <div className="mt-4">
          <button
            className="rounded-forged bg-torch-300 px-3 py-2 text-sm font-semibold text-obsidian-950 shadow-forged transition-colors hover:bg-torch-400"
            data-asset-id="sfx_chest_open"
            onClick={onOpenChest}
          >
            {t.actionPanel.openChest}
          </button>
        </div>
      ) : null}

      {state.phase === 'loot_resolution' && pendingLoot ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.loot}
          </h3>
          <p className="text-sm text-parchment-100">
            {translatedItemLabel(pendingLoot.item, t)}
          </p>
          <div className="flex flex-wrap gap-2">
            {canTakePendingLoot ? (
              <button
                className="rounded-forged border border-torch-500 px-3 py-2 text-sm text-torch-200 transition-colors hover:bg-torch-500/10"
                onClick={onTakeLoot}
              >
                {t.actionPanel.take}
              </button>
            ) : null}
            <button
              className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
              onClick={onLeaveLoot}
            >
              {t.actionPanel.leave}
            </button>
            {pendingLoot.item.type === 'weapon'
              ? activePlayer.inventory.weapons.map((weapon, index) => (
                  <button
                    key={`swap-weapon-${index}`}
                    className="rounded-forged border border-portal-400 px-3 py-2 text-sm text-portal-200 transition-colors hover:bg-portal-400/10"
                    onClick={() => onSwapLoot({ kind: 'weapon', index })}
                  >
                    {t.actionPanel.swapWeapon(
                      t.displayNames.weapons[weapon.bonus],
                    )}
                  </button>
                ))
              : null}
            {pendingLoot.item.type === 'spell'
              ? activePlayer.inventory.spells.map((spell, index) => (
                  <button
                    key={`swap-spell-${index}`}
                    className="rounded-forged border border-portal-400 px-3 py-2 text-sm text-portal-200 transition-colors hover:bg-portal-400/10"
                    onClick={() => onSwapLoot({ kind: 'spell', index })}
                  >
                    {t.actionPanel.swapSpell(
                      t.displayNames.spells[spell.spellKind],
                    )}
                  </button>
                ))
              : null}
          </div>
        </div>
      ) : null}

      {canUseHealingSpell ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-torch-300">
            {t.actionPanel.healingSpell}
          </h3>
          {healingSpellSelection.mode === 'idle' ? (
            <button
              className="w-fit rounded-forged border border-torch-500 px-3 py-2 text-sm text-torch-200 transition-colors hover:bg-torch-500/10"
              onClick={onStartHealingSpellSelection}
            >
              {t.actionPanel.useHealingSpell}
            </button>
          ) : null}
          {healingSpellSelection.mode === 'select_target' ? (
            <>
              <p className="text-sm text-parchment-200">
                {t.actionPanel.healingSpellTargetHint}
              </p>
              <div className="flex flex-wrap gap-2">
                {state.players.map((player) => (
                  <button
                    key={player.id}
                    className="rounded-forged border border-torch-500 px-3 py-2 text-sm text-torch-200 transition-colors hover:bg-torch-500/10"
                    onClick={() => onSelectHealingSpellTarget(player.id)}
                  >
                    {t.displayNames.heroes[player.heroId]}
                  </button>
                ))}
                <button
                  className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
                  onClick={onCancelHealingSpellSelection}
                >
                  {t.actionPanel.cancel}
                </button>
              </div>
            </>
          ) : null}
          {healingSpellSelection.mode === 'select_tile' &&
          selectedHealingTarget ? (
            <>
              <p className="text-sm text-parchment-200">
                {t.actionPanel.healingSpellTileHint(
                  t.displayNames.heroes[selectedHealingTarget.heroId],
                )}
              </p>
              <button
                className="w-fit rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
                onClick={onCancelHealingSpellSelection}
              >
                {t.actionPanel.cancel}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {groundLootItem &&
        (state.phase === 'turn_start' || state.phase === 'await_move') ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-torch-300">
              {t.actionPanel.loot}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="rounded-forged border border-torch-500 px-3 py-2 text-sm text-torch-200 transition-colors hover:bg-torch-500/10"
                onClick={onBeginLoot}
              >
                {t.actionPanel.takeItem(translatedItemLabel(groundLootItem, t))}
              </button>
            </div>
          </div>
        ) : null}

        {adjacentMoves.length > 0 ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-torch-300">
              {t.actionPanel.move}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {adjacentMoves.map((move) => (
                <button
                  key={`${move.target.boardX},${move.target.boardY}`}
                  className="rounded-forged border border-obsidian-600 px-3 py-2 text-sm text-parchment-50 transition-colors hover:border-torch-500 hover:text-torch-200"
                  onClick={() => onMove(move.target)}
                >
                  {t.sideLabels[move.direction!]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isOnTeleportTile ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-torch-300">
              {t.actionPanel.portal}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {portalMoves.length > 0 ? (
                portalMoves.map((move) => (
                  <button
                    key={`portal-${move.target.boardX},${move.target.boardY}`}
                    className="rounded-forged border border-portal-400 px-3 py-2 text-sm text-portal-200 transition-colors hover:bg-portal-400/10"
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
                  className="cursor-not-allowed rounded-forged border border-obsidian-700 px-3 py-2 text-sm text-stone-500"
                  disabled
                  type="button"
                >
                  {t.actionPanel.noKnownPortalTarget}
                </button>
              )}
            </div>
          </div>
        ) : null}

        {legalActions.explorationDirections.length > 0 ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-torch-300">
              {t.actionPanel.explore}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {legalActions.explorationDirections.map((direction) => (
                <button
                  key={direction}
                  className="rounded-forged border border-torch-500 px-3 py-2 text-sm text-torch-200 transition-colors hover:bg-torch-500/10"
                  data-asset-id="sfx_tile_place"
                  onClick={() => onExplore(direction)}
                >
                  {t.sideLabels[direction]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {state.tileStack.length === 0 && isMainTurnActionPhase(state.phase) ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-torch-300">
              {t.actionPanel.explore}
            </h3>
            <p className="mt-2 text-sm text-parchment-200">
              {t.actionPanel.tileStackEmpty}
            </p>
          </div>
        ) : null}
      </div>
    </section>
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

function tokenChoiceLabel(token: Token, t: Translations): string {
  return token.id === 'treasure_chest'
    ? t.actionPanel.treasureChest
    : t.displayNames.monsters[token.id];
}
