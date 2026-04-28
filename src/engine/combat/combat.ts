import { monsterDefinitions } from '../../data/monsters';
import { restoreSeededRng } from '../../utils/rng';
import { getTileAt, samePosition } from '../core/board';
import type { GameState, MonsterDefinition, Player } from '../core/types';
import { healPlayer, isHealingPosition } from '../rules/healing';
import { applyRewardToPlayer } from '../rules/inventory';
import { createVictoryState } from '../victory/scoring';

export type CombatOutcome = 'victory' | 'draw' | 'defeat';

export type ResolveCombatOptions = {
  dice?: [number, number];
  flameSpellCount?: number;
  curseTargetPlayerId?: string;
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
  const dice = options.dice ?? [rng.rollDie(6), rng.rollDie(6)];
  const flameSpellCount = options.flameSpellCount ?? 0;
  const total = calculateCombatTotal(activePlayer, dice, flameSpellCount);
  const outcome = getCombatOutcome(total, monster.strength);
  const stateWithSpentSpells = spendFlameSpells(state, flameSpellCount);

  if (outcome === 'victory') {
    return resolveVictory(
      { ...stateWithSpentSpells, rng: rng.snapshot() },
      monster,
      options.curseTargetPlayerId,
    );
  }

  return resolveRetreat(
    { ...stateWithSpentSpells, rng: rng.snapshot() },
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

function resolveVictory(
  state: GameState,
  monster: MonsterDefinition,
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
    : 'turn_end';
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
  const players = state.players.map((player, index) => {
    if (index !== state.activePlayerIndex) {
      return player;
    }

    const hpAfterLoss =
      outcome === 'defeat' ? Math.max(0, player.hp - 1) : player.hp;
    const retreatedPlayer = {
      ...player,
      hp: hpAfterLoss,
      skipNextTurn:
        outcome === 'defeat' && hpAfterLoss === 0 ? true : player.skipNextTurn,
      position: combat.enteredFrom,
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
