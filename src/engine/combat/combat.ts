import { monsterDefinitions } from '../../data/monsters';
import { restoreSeededRng } from '../../utils/rng';
import { getTileAt, samePosition } from '../core/board';
import type {
  BoardPosition,
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
import { healPlayer, isHealingPosition } from '../rules/healing';
import { applyRewardToPlayer } from '../rules/inventory';
import { createVictoryState } from '../victory/scoring';
import { canTilesConnect, adjacentPosition } from '../movement/topology';

export type CombatOutcome = 'victory' | 'draw' | 'defeat';

export type ResolveCombatOptions = {
  dice?: [number, number];
  flameSpellCount?: number;
  curseTargetPlayerId?: string;
  warriorRerollDice?: [number, number];
  useWarriorReroll?: boolean;
  useWarlockSacrifice?: boolean;
  swordsmanOneRerolls?: number[];
};

export function resolveCombat(
  state: GameState,
  options: ResolveCombatOptions = {},
): GameState {
  if (!state.combat) {
    throw new Error('No combat to resolve');
  }

  const monster = monsterDefinitions[state.combat.monsterId];
  const activePlayer = state.players[state.activePlayerIndex];
  const rng = restoreSeededRng(state.rng);
  const initialDice = options.dice ?? [rng.rollDie(6), rng.rollDie(6)];
  const dice = resolveSwordsmanDice(activePlayer, initialDice, options, () =>
    rng.rollDie(6),
  );
  const warlockSacrificeBonus = canUseWarlockSacrifice(activePlayer, options)
    ? 1
    : 0;
  const flameSpellCount = options.flameSpellCount ?? 0;
  let total = calculateCombatTotal(
    activePlayer,
    dice,
    flameSpellCount + warlockSacrificeBonus + getOracleCombatBonus(state),
  );
  let outcome = getCombatOutcomeForPlayer(
    activePlayer,
    total,
    monster.strength,
  );
  let stateWithSpentResources = spendFlameSpells(state, flameSpellCount);

  if (warlockSacrificeBonus > 0) {
    stateWithSpentResources = applyWarlockSacrifice(stateWithSpentResources);
  }

  if (shouldUseWarriorReroll(activePlayer, outcome, options)) {
    const rerollDice = options.warriorRerollDice ?? [
      rng.rollDie(6),
      rng.rollDie(6),
    ];
    total = calculateCombatTotal(
      activePlayer,
      rerollDice,
      flameSpellCount + warlockSacrificeBonus + getOracleCombatBonus(state),
    );
    outcome = getCombatOutcomeForPlayer(activePlayer, total, monster.strength);
  }

  if (outcome === 'victory') {
    return resolveVictory(
      { ...stateWithSpentResources, rng: rng.snapshot() },
      monster,
      dice,
      options.curseTargetPlayerId,
    );
  }

  return resolveRetreat(
    { ...stateWithSpentResources, rng: rng.snapshot() },
    outcome,
  );
}

export function calculateCombatTotal(
  player: Player,
  dice: [number, number],
  flameSpellCount = 0,
): number {
  const weaponBonus = player.inventory.weapons.reduce(
    (sum, weapon) => sum + weapon.bonus,
    0,
  );

  return dice[0] + dice[1] + weaponBonus + flameSpellCount;
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
  if (total === monsterStrength && hasActiveHeroAbility(player, 'hero_thief')) {
    return 'victory';
  }

  return getCombatOutcome(total, monsterStrength);
}

function resolveVictory(
  state: GameState,
  monster: MonsterDefinition,
  dice: [number, number],
  curseTargetPlayerId?: string,
): GameState {
  const combat = state.combat!;
  const combatTile = getTileAt(state.board, combat.position);

  if (!combatTile) {
    throw new Error('Combat tile is missing');
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const rewardResult = applyRewardToPlayer(
    activePlayer,
    combatTile,
    monster.reward,
  );
  let players = state.players.map((player, index) =>
    index === state.activePlayerIndex ? rewardResult.player : player,
  );

  if (monster.onDefeatEffect === 'curse_other_player') {
    players = applyCurse(players, activePlayer.id, curseTargetPlayerId);
  }

  const phase: GameState['phase'] = monster.isAncientDragon
    ? 'game_over'
    : getPostVictoryPhase(activePlayer, state, dice);
  const stateAfterReward: GameState = {
    ...state,
    phase,
    players,
    board: state.board.map((tile) =>
      samePosition(tile, combatTile)
        ? { ...rewardResult.tile, roomToken: undefined }
        : tile,
    ),
    combat: undefined,
  };

  if (!monster.isAncientDragon) {
    return stateAfterReward;
  }

  return {
    ...stateAfterReward,
    victory: createVictoryState(stateAfterReward, activePlayer.id),
  };
}

function resolveRetreat(state: GameState, outcome: CombatOutcome): GameState {
  const combat = state.combat!;
  const activePlayer = state.players[state.activePlayerIndex];

  if (shouldSwordsmanKeepCombat(activePlayer, outcome)) {
    return {
      ...state,
      phase: 'optional_post_combat',
      combat,
    };
  }

  const warlockFallback =
    combat.source === 'warlock_swap'
      ? getWarlockSwapFallback(state, combat.position)
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
      hasActiveHeroAbility(player, 'hero_warrior');
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

    return isHealingPosition(
      { ...state, players: [retreatedPlayer] },
      retreatedPlayer,
    )
      ? healPlayer(retreatedPlayer)
      : retreatedPlayer;
  });

  return {
    ...state,
    phase: 'turn_end',
    players,
    combat: undefined,
    rng: warlockFallback?.rng ?? state.rng,
  };
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

function resolveSwordsmanDice(
  player: Player,
  dice: [number, number],
  options: ResolveCombatOptions,
  rollDie: () => number,
): [number, number] {
  if (!hasActiveHeroAbility(player, 'hero_swordsman')) {
    return dice;
  }

  const rerolls = [...(options.swordsmanOneRerolls ?? [])];

  return dice.map((die) => {
    let resolvedDie = die;

    while (resolvedDie === 1) {
      resolvedDie = rerolls.shift() ?? rollDie();
    }

    return resolvedDie;
  }) as [number, number];
}

function canUseWarlockSacrifice(
  player: Player,
  options: ResolveCombatOptions,
): boolean {
  return (
    options.useWarlockSacrifice === true &&
    hasActiveHeroAbility(player, 'hero_warlock')
  );
}

function applyWarlockSacrifice(state: GameState): GameState {
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

function getOracleCombatBonus(state: GameState): number {
  const activePlayer = state.players[state.activePlayerIndex];

  return hasActiveHeroAbility(activePlayer, 'hero_oracle') &&
    state.remainingSteps === 3
    ? 1
    : 0;
}

function shouldUseWarriorReroll(
  player: Player,
  outcome: CombatOutcome,
  options: ResolveCombatOptions,
): boolean {
  return (
    options.useWarriorReroll === true &&
    hasActiveHeroAbility(player, 'hero_warrior') &&
    outcome !== 'victory'
  );
}

function getPostVictoryPhase(
  player: Player,
  state: GameState,
  dice: [number, number],
): GameState['phase'] {
  return hasActiveHeroAbility(player, 'hero_swordsman') &&
    dice.includes(6) &&
    state.remainingSteps > 0
    ? 'await_move'
    : 'turn_end';
}

function shouldSwordsmanKeepCombat(
  player: Player,
  outcome: CombatOutcome,
): boolean {
  return (
    hasActiveHeroAbility(player, 'hero_swordsman') && outcome !== 'victory'
  );
}

function getWarlockSwapFallback(
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

function applyCurse(
  players: Player[],
  activePlayerId: string,
  curseTargetPlayerId?: string,
): Player[] {
  const target =
    players.find(
      (player) =>
        player.id === curseTargetPlayerId && player.id !== activePlayerId,
    ) ?? players.find((player) => player.id !== activePlayerId);

  if (!target) {
    return players;
  }

  return players.map((player) => ({
    ...player,
    isCursed: player.id === target.id,
  }));
}
