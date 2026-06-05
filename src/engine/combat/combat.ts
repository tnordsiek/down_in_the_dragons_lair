import { monsterDefinitions } from '../../data/monsters';
import { restoreSeededRng } from '../../utils/rng';
import { getTileAt, samePosition } from '../core/board';
import { appendGameEvent, createPlayerEventFields } from '../core/events';
import type {
  BoardPosition,
  GameEventCombatDetails,
  GameState,
  MonsterDefinition,
  Player,
  SerializedRngState,
  TileSide,
} from '../core/types';
import {
  getDiscoveredHealingPositions,
  hasActiveHeroAbility,
} from '../rules/abilities';
import { createCombatRewardLoot } from '../rules/inventory';
import { getContinuationPhaseAfterAction } from '../turns/continuation';
import { createVictoryState } from '../victory/scoring';
import { canTilesConnect, adjacentPosition } from '../movement/topology';

export type CombatOutcome = 'victory' | 'draw' | 'defeat';

export type ResolveCombatOptions = {
  dice?: [number, number];
};

export type UseValkyrieRerollOptions = {
  dice?: [number, number];
};

export type UseBladeRerollOptions = {
  dice?: [number, number];
};

export function startOptionalCombat(state: GameState): GameState {
  if (state.phase !== 'optional_monster_combat' || !state.combat) {
    throw new Error(
      'Optional combat can only start during pending rogue monster combat',
    );
  }

  return {
    ...state,
    phase: 'combat',
  };
}

export function resolveCombat(
  state: GameState,
  options: ResolveCombatOptions = {},
): GameState {
  if (state.phase !== 'combat' && state.phase !== 'optional_post_combat') {
    throw new Error(
      'Combat can only resolve during the combat or optional post-combat phase',
    );
  }

  if (!state.combat) {
    throw new Error('No combat to resolve');
  }

  const monster = monsterDefinitions[state.combat.monsterId];
  const activePlayer = state.players[state.activePlayerIndex];
  const rng = restoreSeededRng(state.rng);
  const initialDice = options.dice ?? [rng.rollDie(6), rng.rollDie(6)];
  const pendingBladeReroll = shouldPauseForBladeReroll(
    activePlayer,
    initialDice,
  );

  if (pendingBladeReroll) {
    return {
      ...state,
      phase: 'combat_blade_reroll',
      combat: {
        ...state.combat,
        initialRolledDice: initialDice,
        rolledDice: initialDice,
        bladeRerollCount: 0,
      },
      rng: rng.snapshot(),
    };
  }

  const dice = initialDice;
  const warlockSacrificeBonus = 0;
  const flameSpellCount = getAutomaticFlameSpellCount(activePlayer);
  const oracleBonus = getSeeressCombatBonus(state);
  const total = calculateCombatTotal(
    activePlayer,
    dice,
    flameSpellCount + warlockSacrificeBonus + oracleBonus,
  );
  const outcome = getCombatOutcomeForPlayer(
    activePlayer,
    total,
    monster.strength,
  );
  const stateWithAppliedCosts = spendFlameSpells(state, flameSpellCount);

  if (shouldPauseForValkyrieReroll(activePlayer, outcome)) {
    return {
      ...stateWithAppliedCosts,
      phase: 'combat_valkyrie_reroll',
      combat: {
        ...state.combat,
        initialRolledDice: dice,
        initialBaseOutcome: toPendingCombatOutcome(outcome),
        pendingWitchSacrificeBonus: warlockSacrificeBonus,
        pendingSeeressBonus: oracleBonus,
      },
      rng: rng.snapshot(),
    };
  }

  if (
    shouldPauseForWitchSacrifice(
      activePlayer,
      monster.strength,
      dice,
      outcome,
      oracleBonus,
    )
  ) {
    return {
      ...stateWithAppliedCosts,
      phase: 'combat_witch_sacrifice',
      combat: {
        ...state.combat,
        initialRolledDice: dice,
        initialBaseOutcome: toPendingCombatOutcome(outcome),
        pendingWitchSacrificeBonus: 0,
        pendingSeeressBonus: oracleBonus,
      },
      rng: rng.snapshot(),
    };
  }

  if (
    shouldPauseForFlameSpells(
      activePlayer,
      monster.strength,
      dice,
      warlockSacrificeBonus,
      oracleBonus,
    )
  ) {
    return {
      ...stateWithAppliedCosts,
      phase: 'combat_flame_spells',
      combat: {
        ...state.combat,
        rolledDice: dice,
        pendingBaseOutcome: toPendingCombatOutcome(outcome),
        pendingWitchSacrificeBonus: warlockSacrificeBonus,
        pendingSeeressBonus: oracleBonus,
      },
      rng: rng.snapshot(),
    };
  }

  return resolveCombatOutcome(
    { ...stateWithAppliedCosts, rng: rng.snapshot() },
    dice,
    flameSpellCount,
    warlockSacrificeBonus,
    oracleBonus,
  );
}

export function useBladeReroll(
  state: GameState,
  options: UseBladeRerollOptions = {},
): GameState {
  if (state.phase !== 'combat_blade_reroll' || !state.combat?.rolledDice) {
    throw new Error(
      'Blade reroll can only resolve during pending blade combat reroll',
    );
  }

  const activePlayer = state.players[state.activePlayerIndex];

  if (!hasActiveHeroAbility(activePlayer, 'hero_blade')) {
    throw new Error('Only the active uncursed blade may use this reroll');
  }

  const currentDice = state.combat.rolledDice;

  if (!currentDice.includes(1)) {
    throw new Error('Blade reroll requires at least one die showing 1');
  }

  const rng = restoreSeededRng(state.rng);
  const rerollDice = options.dice ?? [rng.rollDie(6), rng.rollDie(6)];
  let rerollIndex = 0;
  const resolvedDice = currentDice.map((die) => {
    if (die !== 1) {
      return die;
    }

    const nextDie = rerollDice[rerollIndex];
    rerollIndex += 1;
    return nextDie;
  }) as [number, number];
  const updatedState = {
    ...state,
    rng: rng.snapshot(),
    combat: {
      ...state.combat,
      rolledDice: resolvedDice,
      bladeRerollCount: (state.combat.bladeRerollCount ?? 0) + 1,
    },
  };

  if (resolvedDice.includes(1)) {
    return {
      ...updatedState,
      phase: 'combat_blade_reroll',
    };
  }

  return continueResolvedCombat(updatedState, resolvedDice);
}

export function useValkyrieReroll(
  state: GameState,
  options: UseValkyrieRerollOptions = {},
): GameState {
  if (
    state.phase !== 'combat_valkyrie_reroll' ||
    !state.combat?.initialRolledDice
  ) {
    throw new Error(
      'Valkyrie reroll can only resolve during pending valkyrie combat reroll',
    );
  }

  const rng = restoreSeededRng(state.rng);
  const rerollDice = options.dice ?? [rng.rollDie(6), rng.rollDie(6)];
  const stateWithUpdatedRng = { ...state, rng: rng.snapshot() };

  return continueResolvedCombat(stateWithUpdatedRng, rerollDice);
}

export function declineValkyrieReroll(state: GameState): GameState {
  if (
    state.phase !== 'combat_valkyrie_reroll' ||
    !state.combat?.initialRolledDice ||
    !state.combat.initialBaseOutcome
  ) {
    throw new Error(
      'Declining valkyrie reroll can only resolve during pending valkyrie combat reroll',
    );
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const monster = monsterDefinitions[state.combat.monsterId];
  const flameSpellCount = getAutomaticFlameSpellCount(activePlayer);
  const warlockSacrificeBonus = state.combat.pendingWitchSacrificeBonus ?? 0;
  const oracleBonus = state.combat.pendingSeeressBonus ?? 0;

  if (
    shouldPauseForFlameSpells(
      activePlayer,
      monster.strength,
      state.combat.initialRolledDice,
      warlockSacrificeBonus,
      oracleBonus,
    )
  ) {
    return {
      ...state,
      phase: 'combat_flame_spells',
      combat: {
        ...state.combat,
        rolledDice: state.combat.initialRolledDice,
        pendingBaseOutcome: state.combat.initialBaseOutcome,
      },
    };
  }

  return resolveCombatOutcome(
    state,
    state.combat.initialRolledDice,
    flameSpellCount,
    warlockSacrificeBonus,
    oracleBonus,
  );
}

export function useWitchSacrifice(state: GameState): GameState {
  if (
    state.phase !== 'combat_witch_sacrifice' ||
    !state.combat?.initialRolledDice
  ) {
    throw new Error(
      'Witch sacrifice can only resolve during pending witch combat sacrifice',
    );
  }

  const stateWithSacrifice = applyWitchSacrifice(state);
  const activePlayer =
    stateWithSacrifice.players[stateWithSacrifice.activePlayerIndex];
  const monster = monsterDefinitions[state.combat.monsterId];
  const flameSpellCount = getAutomaticFlameSpellCount(activePlayer);
  const warlockSacrificeBonus = 1;
  const oracleBonus = state.combat.pendingSeeressBonus ?? 0;
  const total = calculateCombatTotal(
    activePlayer,
    state.combat.initialRolledDice,
    flameSpellCount + warlockSacrificeBonus + oracleBonus,
  );
  const outcome = getCombatOutcomeForPlayer(
    activePlayer,
    total,
    monster.strength,
  );

  if (
    shouldPauseForFlameSpells(
      activePlayer,
      monster.strength,
      state.combat.initialRolledDice,
      warlockSacrificeBonus,
      oracleBonus,
    )
  ) {
    return {
      ...stateWithSacrifice,
      phase: 'combat_flame_spells',
      combat: {
        ...state.combat,
        rolledDice: state.combat.initialRolledDice,
        pendingBaseOutcome: toPendingCombatOutcome(outcome),
        pendingWitchSacrificeBonus: warlockSacrificeBonus,
      },
    };
  }

  return resolveCombatOutcome(
    stateWithSacrifice,
    state.combat.initialRolledDice,
    flameSpellCount,
    warlockSacrificeBonus,
    oracleBonus,
  );
}

export function declineWitchSacrifice(state: GameState): GameState {
  if (
    state.phase !== 'combat_witch_sacrifice' ||
    !state.combat?.initialRolledDice ||
    !state.combat.initialBaseOutcome
  ) {
    throw new Error(
      'Declining witch sacrifice can only resolve during pending witch combat sacrifice',
    );
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const monster = monsterDefinitions[state.combat.monsterId];
  const flameSpellCount = getAutomaticFlameSpellCount(activePlayer);
  const warlockSacrificeBonus = 0;
  const oracleBonus = state.combat.pendingSeeressBonus ?? 0;

  if (
    shouldPauseForFlameSpells(
      activePlayer,
      monster.strength,
      state.combat.initialRolledDice,
      warlockSacrificeBonus,
      oracleBonus,
    )
  ) {
    return {
      ...state,
      phase: 'combat_flame_spells',
      combat: {
        ...state.combat,
        rolledDice: state.combat.initialRolledDice,
        pendingBaseOutcome: state.combat.initialBaseOutcome,
        pendingWitchSacrificeBonus: warlockSacrificeBonus,
      },
    };
  }

  return resolveCombatOutcome(
    state,
    state.combat.initialRolledDice,
    flameSpellCount,
    warlockSacrificeBonus,
    oracleBonus,
  );
}

export function selectCurseTarget(
  state: GameState,
  targetPlayerId: string,
): GameState {
  if (state.phase !== 'combat_curse_target' || !state.combat) {
    throw new Error(
      'Curse target selection is only available after defeating a mummified_priest',
    );
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const target = getCurseTarget(state.players, activePlayer.id, targetPlayerId);

  if (!target) {
    throw new Error('Mummified Priest curse requires another hero target');
  }

  const pendingCombatEvent = state.combat.pendingCombatEvent;
  const pendingResolutionPhase = state.combat.pendingResolutionPhase;

  if (!pendingCombatEvent || !pendingResolutionPhase) {
    throw new Error('Missing pending mummified_priest curse resolution state');
  }

  return finalizeVictoryState(
    state,
    monsterDefinitions[state.combat.monsterId],
    applyCurseToTarget(state.players, target.id),
    pendingResolutionPhase,
    {
      ...pendingCombatEvent,
      curseTargetPlayerId: target.id,
      curseTargetPlayerLabel: createPlayerEventFields(target, state.players)
        .playerLabel,
    },
  );
}

export function resolveCombatWithoutFlameSpells(state: GameState): GameState {
  return resolvePendingCombat(state, 0);
}

export function resolveCombatWithFlameSpells(
  state: GameState,
  flameSpellCount: number,
): GameState {
  const validChoices = getCombatFlameSpellChoices(state);

  if (!validChoices.includes(flameSpellCount)) {
    throw new Error('Invalid flame spell choice for pending combat');
  }

  return resolvePendingCombat(state, flameSpellCount);
}

export function getCombatFlameSpellChoices(state: GameState): number[] {
  if (state.phase !== 'combat_flame_spells' || !state.combat?.rolledDice) {
    return [];
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const monster = monsterDefinitions[state.combat.monsterId];
  const availableFlameSpells = getAvailableFlameSpellCount(activePlayer);

  return getMeaningfulFlameSpellCounts(
    activePlayer,
    monster.strength,
    state.combat.rolledDice,
    state.combat.pendingWitchSacrificeBonus ?? 0,
    state.combat.pendingSeeressBonus ?? 0,
    availableFlameSpells,
  );
}

export function calculateCombatTotal(
  player: Player,
  dice: [number, number],
  flameSpellCount = 0,
): number {
  return dice[0] + dice[1] + getWeaponBonus(player) + flameSpellCount;
}

export function getCombatOutcome(
  total: number,
  monsterStrength: number,
): CombatOutcome {
  if (total > monsterStrength) {
    return 'victory';
  }

  if (total === monsterStrength) {
    return 'draw';
  }

  return 'defeat';
}

export function getCombatOutcomeForPlayer(
  player: Player,
  total: number,
  monsterStrength: number,
): CombatOutcome {
  if (total === monsterStrength && hasActiveHeroAbility(player, 'hero_rogue')) {
    return 'victory';
  }

  return getCombatOutcome(total, monsterStrength);
}

function resolveVictory(
  state: GameState,
  monster: MonsterDefinition,
  dice: [number, number],
  combatEvent: GameEventCombatDetails,
): GameState {
  const combat = state.combat!;
  const combatTile = getTileAt(state.board, combat.position);

  if (!combatTile) {
    throw new Error('Combat tile is missing');
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const reward = monster.reward;
  const combatRewardLoot = createCombatRewardLoot(reward, combat.position);
  let playersAfterReward = state.players;

  if (reward.type === 'treasure') {
    playersAfterReward = state.players.map((player, index) =>
      index === state.activePlayerIndex
        ? {
            ...player,
            treasurePoints: player.treasurePoints + reward.points,
          }
        : player,
    );
  }

  const boardAfterVictory = state.board.map((tile) =>
    samePosition(tile, combatTile) ? { ...tile, roomToken: undefined } : tile,
  );
  const turnContinuationReason = canBladeContinueAfterCombat(
    activePlayer,
    activePlayer,
    dice,
  )
    ? 'blade_on_six'
    : undefined;

  const phase: GameState['phase'] = monster.isAncientDragon
    ? 'game_over'
    : combatRewardLoot
      ? 'loot_resolution'
      : getPostVictoryPhase(
          activePlayer,
          {
            ...state,
            players: playersAfterReward,
            board: boardAfterVictory,
            combat: undefined,
            pendingLoot: combatRewardLoot,
            turnContinuationReason,
          },
          dice,
        );
  const preparedVictoryState: GameState = {
    ...state,
    phase,
    players: playersAfterReward,
    board: boardAfterVictory,
    pendingLoot: combatRewardLoot,
    turnContinuationReason,
  };

  if (monster.onDefeatEffect === 'curse_other_player') {
    const validTargets = getValidCurseTargets(
      playersAfterReward,
      activePlayer.id,
    );

    if (validTargets.length > 0) {
      return {
        ...preparedVictoryState,
        phase: 'combat_curse_target',
        combat: {
          ...combat,
          pendingResolutionPhase: phase,
          pendingCombatEvent: combatEvent,
        },
      };
    }
  }

  return finalizeVictoryState(
    preparedVictoryState,
    monster,
    playersAfterReward,
    phase,
    combatEvent,
  );
}

function resolveCombatOutcome(
  state: GameState,
  dice: [number, number],
  flameSpellCount: number,
  warlockSacrificeBonus: number,
  oracleBonus: number,
): GameState {
  if (!state.combat) {
    throw new Error('No combat to resolve');
  }

  const monster = monsterDefinitions[state.combat.monsterId];
  const stateWithSpentResources = spendFlameSpells(state, flameSpellCount);
  const updatedActivePlayer =
    stateWithSpentResources.players[stateWithSpentResources.activePlayerIndex];
  const weaponBonus = getWeaponBonus(updatedActivePlayer);
  const total = calculateCombatTotal(
    updatedActivePlayer,
    dice,
    flameSpellCount + warlockSacrificeBonus + oracleBonus,
  );
  const outcome = getCombatOutcomeForPlayer(
    updatedActivePlayer,
    total,
    monster.strength,
  );
  const combatEvent = createCombatEventDetails(
    monster,
    dice,
    total,
    outcome,
    weaponBonus,
    flameSpellCount,
    warlockSacrificeBonus,
    oracleBonus,
  );

  if (outcome === 'victory') {
    return resolveVictory(stateWithSpentResources, monster, dice, combatEvent);
  }

  return resolveRetreat(stateWithSpentResources, outcome, combatEvent);
}

function resolveRetreat(
  state: GameState,
  outcome: CombatOutcome,
  combatEvent: GameEventCombatDetails,
): GameState {
  const combat = state.combat!;
  const activePlayer = state.players[state.activePlayerIndex];

  const warlockFallback =
    combat.source === 'witch_swap'
      ? getWitchSwapFallback(state, combat.position)
      : undefined;
  const players = state.players.map((player, index) => {
    if (index !== state.activePlayerIndex) {
      return player;
    }

    const hpAfterLoss =
      outcome === 'defeat' ? Math.max(0, player.hp - 1) : player.hp;
    const warriorReincarnates =
      outcome === 'defeat' &&
      hpAfterLoss === 0 &&
      hasActiveHeroAbility(player, 'hero_valkyrie');
    const retreatedPlayer = {
      ...player,
      hp: warriorReincarnates ? player.maxHp : hpAfterLoss,
      skipNextTurn:
        outcome === 'defeat' && hpAfterLoss === 0 && !warriorReincarnates
          ? true
          : player.skipNextTurn,
      position: warriorReincarnates
        ? getDiscoveredHealingPositions(state)[0]
        : (warlockFallback?.position ?? combat.enteredFrom),
    };
    return retreatedPlayer;
  });

  const resolvedActivePlayer = players[state.activePlayerIndex];
  const continuationReason = canBladeContinueAfterCombat(
    activePlayer,
    resolvedActivePlayer,
    combatEvent.dice,
  )
    ? 'blade_on_six'
    : undefined;
  const stateAfterRetreat: GameState = {
    ...state,
    phase: 'turn_end',
    players,
    combat: undefined,
    turnContinuationReason: continuationReason,
    healingEndTurnSource: continuationReason
      ? 'idle_or_regular'
      : 'combat_retreat_blocked',
    rng: warlockFallback?.rng ?? state.rng,
  };
  const phase =
    continuationReason && stateAfterRetreat.remainingSteps > 0
      ? 'await_move'
      : 'turn_end';

  return appendGameEvent(
    {
      ...stateAfterRetreat,
      phase,
    },
    {
      type: 'combat_resolved',
      message: `Resolved combat against ${monsterDefinitions[combat.monsterId].displayName}`,
      ...createPlayerEventFields(activePlayer, state.players),
      combat: {
        ...combatEvent,
        retreatPosition:
          players[state.activePlayerIndex]?.position ?? combat.enteredFrom,
      },
    },
  );
}

function spendFlameSpells(
  state: GameState,
  flameSpellCount: number,
): GameState {
  if (flameSpellCount <= 0) {
    return state;
  }

  const activePlayer = state.players[state.activePlayerIndex];

  if (hasActiveHeroAbility(activePlayer, 'hero_mage')) {
    return state;
  }

  const availableFlameSpells = activePlayer.inventory.spells.filter(
    (spell) => spell.spellKind === 'flame',
  ).length;

  if (flameSpellCount > availableFlameSpells) {
    throw new Error('Not enough flame spells available');
  }

  let remainingToSpend = flameSpellCount;

  return {
    ...state,
    players: state.players.map((player, index) => {
      if (index !== state.activePlayerIndex) {
        return player;
      }

      return {
        ...player,
        inventory: {
          ...player.inventory,
          spells: player.inventory.spells.filter((spell) => {
            if (spell.spellKind !== 'flame' || remainingToSpend <= 0) {
              return true;
            }

            remainingToSpend -= 1;
            return false;
          }),
        },
      };
    }),
  };
}

function resolvePendingCombat(
  state: GameState,
  flameSpellCount: number,
): GameState {
  if (state.phase !== 'combat_flame_spells' || !state.combat?.rolledDice) {
    throw new Error(
      'Flame spell selection can only resolve during pending combat flames',
    );
  }

  return resolveCombatOutcome(
    state,
    state.combat.rolledDice,
    flameSpellCount,
    state.combat.pendingWitchSacrificeBonus ?? 0,
    state.combat.pendingSeeressBonus ?? 0,
  );
}

export function getAutomaticFlameSpellCount(player: Player): number {
  return hasActiveHeroAbility(player, 'hero_mage')
    ? getAvailableFlameSpellCount(player)
    : 0;
}

function getAvailableFlameSpellCount(player: Player): number {
  return player.inventory.spells.filter((spell) => spell.spellKind === 'flame')
    .length;
}

function toPendingCombatOutcome(outcome: CombatOutcome): 'draw' | 'defeat' {
  if (outcome === 'victory') {
    throw new Error('Pending combat outcome cannot be a victory');
  }

  return outcome;
}

function shouldPauseForFlameSpells(
  player: Player,
  monsterStrength: number,
  dice: [number, number],
  warlockSacrificeBonus: number,
  oracleBonus: number,
): boolean {
  if (hasActiveHeroAbility(player, 'hero_mage')) {
    return false;
  }

  return (
    getMeaningfulFlameSpellCounts(
      player,
      monsterStrength,
      dice,
      warlockSacrificeBonus,
      oracleBonus,
      getAvailableFlameSpellCount(player),
    ).length > 0
  );
}

function applyWitchSacrifice(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.activePlayerIndex
        ? {
            ...player,
            hp: Math.max(0, player.hp - 1),
            skipNextTurn: player.hp - 1 <= 0 ? true : player.skipNextTurn,
          }
        : player,
    ),
  };
}

function getSeeressCombatBonus(state: GameState): number {
  const activePlayer = state.players[state.activePlayerIndex];

  return hasActiveHeroAbility(activePlayer, 'hero_seeress') &&
    state.remainingSteps === 3
    ? 1
    : 0;
}

function getMeaningfulFlameSpellCounts(
  player: Player,
  monsterStrength: number,
  dice: [number, number],
  warlockSacrificeBonus: number,
  oracleBonus: number,
  availableFlameSpells: number,
): number[] {
  if (availableFlameSpells <= 0) {
    return [];
  }

  const baseTotal = calculateCombatTotal(
    player,
    dice,
    warlockSacrificeBonus + oracleBonus,
  );
  const baseOutcome = getCombatOutcomeForPlayer(
    player,
    baseTotal,
    monsterStrength,
  );

  if (baseOutcome === 'victory') {
    return [];
  }

  return Array.from(
    { length: availableFlameSpells },
    (_, index) => index + 1,
  ).filter(
    (flameSpellCount) =>
      getCombatOutcomeForPlayer(
        player,
        calculateCombatTotal(
          player,
          dice,
          flameSpellCount + warlockSacrificeBonus + oracleBonus,
        ),
        monsterStrength,
      ) !== 'defeat',
  );
}

function getWeaponBonus(player: Player): number {
  return player.inventory.weapons.reduce(
    (sum, weapon) => sum + weapon.bonus,
    0,
  );
}

function createCombatEventDetails(
  monster: MonsterDefinition,
  dice: [number, number],
  total: number,
  outcome: CombatOutcome,
  weaponBonus: number,
  flameSpellCount: number,
  warlockSacrificeBonus: number,
  oracleBonus: number,
): GameEventCombatDetails {
  return {
    monsterId: monster.id,
    monsterStrength: monster.strength,
    dice,
    total,
    outcome,
    weaponBonus,
    flameSpellCount,
    warlockSacrificeBonus,
    oracleBonus,
  };
}

function shouldPauseForValkyrieReroll(
  player: Player,
  outcome: CombatOutcome,
): boolean {
  return hasActiveHeroAbility(player, 'hero_valkyrie') && outcome !== 'victory';
}

function shouldPauseForBladeReroll(
  player: Player,
  dice: [number, number],
): boolean {
  return hasActiveHeroAbility(player, 'hero_blade') && dice.includes(1);
}

function shouldPauseForWitchSacrifice(
  player: Player,
  monsterStrength: number,
  dice: [number, number],
  outcome: CombatOutcome,
  oracleBonus: number,
): boolean {
  if (!hasActiveHeroAbility(player, 'hero_witch') || outcome === 'victory') {
    return false;
  }

  const sacrificeOutcome = getCombatOutcomeForPlayer(
    player,
    calculateCombatTotal(player, dice, 1 + oracleBonus),
    monsterStrength,
  );

  if (sacrificeOutcome === 'victory') {
    return true;
  }

  const availableFlameSpells = getAvailableFlameSpellCount(player);

  if (availableFlameSpells <= 0) {
    return false;
  }

  return Array.from(
    { length: availableFlameSpells },
    (_, index) => index + 1,
  ).some(
    (flameSpellCount) =>
      getCombatOutcomeForPlayer(
        player,
        calculateCombatTotal(player, dice, flameSpellCount + 1 + oracleBonus),
        monsterStrength,
      ) === 'victory',
  );
}

function getPostVictoryPhase(
  player: Player,
  state: GameState,
  dice: [number, number],
): GameState['phase'] {
  return canBladeContinueAfterCombat(player, player, dice)
    ? getContinuationPhaseAfterAction(state)
    : 'turn_end';
}

function canBladeContinueAfterCombat(
  heroBeforeCombat: Player,
  playerAfterCombat: Player,
  dice: [number, number],
): boolean {
  return (
    hasActiveHeroAbility(heroBeforeCombat, 'hero_blade') &&
    dice.includes(6) &&
    playerAfterCombat.hp > 0 &&
    !playerAfterCombat.skipNextTurn
  );
}

function continueResolvedCombat(
  state: GameState,
  dice: [number, number],
): GameState {
  if (!state.combat) {
    throw new Error('No combat to continue');
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const monster = monsterDefinitions[state.combat.monsterId];
  const flameSpellCount = getAutomaticFlameSpellCount(activePlayer);
  const warlockSacrificeBonus = state.combat.pendingWitchSacrificeBonus ?? 0;
  const oracleBonus = state.combat.pendingSeeressBonus ?? 0;
  const total = calculateCombatTotal(
    activePlayer,
    dice,
    flameSpellCount + warlockSacrificeBonus + oracleBonus,
  );
  const outcome = getCombatOutcomeForPlayer(
    activePlayer,
    total,
    monster.strength,
  );

  if (
    shouldPauseForFlameSpells(
      activePlayer,
      monster.strength,
      dice,
      warlockSacrificeBonus,
      oracleBonus,
    )
  ) {
    return {
      ...state,
      phase: 'combat_flame_spells',
      combat: {
        ...state.combat,
        rolledDice: dice,
        pendingBaseOutcome: toPendingCombatOutcome(outcome),
      },
    };
  }

  return resolveCombatOutcome(
    state,
    dice,
    flameSpellCount,
    warlockSacrificeBonus,
    oracleBonus,
  );
}

function getWitchSwapFallback(
  state: GameState,
  combatPosition: BoardPosition,
): { position: BoardPosition; rng: SerializedRngState } | undefined {
  const rng = restoreSeededRng(state.rng);
  const visited = new Set<string>();
  let frontier: BoardPosition[] = [combatPosition];
  const directions: TileSide[] = ['A', 'B', 'C', 'D'];

  visited.add(`${combatPosition.boardX},${combatPosition.boardY}`);

  while (frontier.length > 0) {
    const nextFrontier: BoardPosition[] = [];
    const candidates: BoardPosition[] = [];

    for (const position of frontier) {
      const originTile = getTileAt(state.board, position);

      if (!originTile) {
        continue;
      }

      for (const direction of directions) {
        const targetPosition = adjacentPosition(position, direction);
        const key = `${targetPosition.boardX},${targetPosition.boardY}`;

        if (visited.has(key)) {
          continue;
        }

        const targetTile = getTileAt(state.board, targetPosition);

        if (
          !targetTile ||
          !canTilesConnect(originTile, targetTile, direction)
        ) {
          continue;
        }

        visited.add(key);
        nextFrontier.push(targetPosition);

        if (targetTile.roomToken?.kind !== 'monster') {
          candidates.push(targetPosition);
        }
      }
    }

    if (candidates.length > 0) {
      return {
        position: candidates[rng.nextInt(candidates.length)],
        rng: rng.snapshot(),
      };
    }

    frontier = nextFrontier;
  }

  return undefined;
}

function finalizeVictoryState(
  state: GameState,
  monster: MonsterDefinition,
  players: Player[],
  phase: GameState['phase'],
  combatEvent: GameEventCombatDetails,
): GameState {
  const activePlayer = players[state.activePlayerIndex];
  const stateWithEvent = appendGameEvent(
    {
      ...state,
      phase,
      players,
      combat: undefined,
    },
    {
      type: 'combat_resolved',
      message: `Resolved combat and defeated ${monster.displayName}`,
      ...createPlayerEventFields(activePlayer, state.players),
      combat: combatEvent,
    },
  );

  if (phase !== 'game_over') {
    return stateWithEvent;
  }

  return {
    ...stateWithEvent,
    victory: createVictoryState(stateWithEvent, activePlayer.id),
  };
}

function getValidCurseTargets(
  players: Player[],
  activePlayerId: string,
): Player[] {
  return players.filter((player) => player.id !== activePlayerId);
}

function getCurseTarget(
  players: Player[],
  activePlayerId: string,
  targetPlayerId?: string,
): Player | undefined {
  return players.find(
    (player) => player.id === targetPlayerId && player.id !== activePlayerId,
  );
}

function applyCurseToTarget(
  players: Player[],
  targetPlayerId: string,
): Player[] {
  return players.map((player) => ({
    ...player,
    isCursed: player.id === targetPlayerId,
  }));
}
