import { describe, expect, it } from 'vitest';

import { applyGameAction } from '../engine/core/actions';
import type { GameState, PlacedTile } from '../engine/core/types';
import { createNewGame } from '../engine/setup/createGame';
import { createSeededRng } from '../utils/rng';
import { playAiGameToEnd } from './autoplay';
import { aiHeuristicConfig } from './config';
import { chooseHeuristicAiAction } from './heuristicAgent';
import { getLegalAiActions } from './legalActions';

describe('heuristic AI', () => {
  it('chooses only legal actions across multiple seeded steps', () => {
    let state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 4,
      seed: 'ai-legal-actions',
    });

    for (let step = 0; step < 250 && state.phase !== 'game_over'; step += 1) {
      const legalActions = getLegalAiActions(state);
      const action = chooseHeuristicAiAction(state, legalActions);

      expect(legalActions.map((legalAction) => legalAction.type)).toContain(
        action.type,
      );
      expect(() => applyGameAction(state, action)).not.toThrow();

      state = applyGameAction(state, action);
    }
  });

  it('plays reproducibly with the same seed', () => {
    const first = playActions(
      createNewGame({
        humanHeroId: 'hero_rogue',
        aiCount: 3,
        seed: 'ai-reproducible',
      }),
      150,
    );
    const second = playActions(
      createNewGame({
        humanHeroId: 'hero_rogue',
        aiCount: 3,
        seed: 'ai-reproducible',
      }),
      150,
    );

    expect(snapshotState(first)).toEqual(snapshotState(second));
  });

  it('uses healing spells and keys in standard situations', () => {
    const healingState = withActivePlayer(
      createNewGame({
        humanHeroId: 'hero_mage',
        aiCount: 1,
        seed: 'ai-healing',
      }),
      (player) => ({
        ...player,
        hp: 1,
        inventory: {
          ...player.inventory,
          spells: [{ type: 'spell', spellKind: 'healing' }],
        },
      }),
    );

    expect(chooseHeuristicAiAction(healingState)).toEqual({
      type: 'useHealingSpell',
      targetPlayerId: healingState.players[healingState.activePlayerIndex].id,
      healingPosition: { boardX: 0, boardY: 0 },
    });

    const chestState = withActivePlayer(
      {
        ...createNewGame({
          humanHeroId: 'hero_mage',
          aiCount: 1,
          seed: 'ai-chest',
        }),
        board: [
          {
            tileInstanceId: 'tile-chest',
            blueprintId: 'room_cross',
            rotation: 0,
            boardX: 0,
            boardY: 0,
            discovered: true,
            looseItems: [],
            roomToken: { id: 'treasure_chest', kind: 'chest' },
          },
        ],
      },
      (player) => ({
        ...player,
        inventory: { ...player.inventory, keyCount: 1 },
      }),
    );

    expect(chooseHeuristicAiAction(chestState)).toEqual({
      type: 'openChest',
    });
  });

  it('prefers taking useful loot and better swaps during loot resolution', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-loot',
    });
    const takeState: GameState = {
      ...base,
      phase: 'loot_resolution',
      activePlayerIndex: 0,
      pendingLoot: {
        source: 'combat_reward',
        position: { boardX: 0, boardY: 0 },
        item: { type: 'weapon', bonus: 1 },
      },
    };

    expect(chooseHeuristicAiAction(takeState)).toEqual({ type: 'takeLoot' });

    const swapState = withActivePlayer(takeState, (player) => ({
      ...player,
      inventory: {
        ...player.inventory,
        weapons: [
          { type: 'weapon', bonus: 1 },
          { type: 'weapon', bonus: 2 },
        ],
      },
    }));
    const betterLootState: GameState = {
      ...swapState,
      pendingLoot: {
        source: 'combat_reward',
        position: { boardX: 0, boardY: 0 },
        item: { type: 'weapon', bonus: 3 },
      },
    };

    expect(chooseHeuristicAiAction(betterLootState)).toEqual({
      type: 'swapLoot',
      inventorySlot: { kind: 'weapon', index: 0 },
    });
  });

  it('finishes a deterministic dragon endgame without rule violations', () => {
    const result = playAiGameToEnd(createDragonEndgameState(), 20);

    expect(result.state.phase).toBe('game_over');
    expect(result.state.victory?.defeatedDragonByPlayerId).toBeDefined();
    expect(result.actionCount).toBeGreaterThan(0);
  });

  it('keeps balancing values centralized and stable', () => {
    expect(aiHeuristicConfig).toEqual(
      expect.objectContaining({
        criticalHp: 2,
        minimumRepeatCombatWinChance: 0.2,
        minimumDragonWinChance: 0.35,
        knownChestBonus: 10,
      }),
    );
  });

  it('uses the smallest winning flame spell choice only against monsters above strength nine', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-combat-flame-choice',
    });
    const highStrengthState: GameState = {
      ...base,
      phase: 'combat_flame_spells',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_valkyrie',
              inventory: {
                ...player.inventory,
                weapons: [
                  { type: 'weapon', bonus: 3 },
                  { type: 'weapon', bonus: 3 },
                ],
                spells: [
                  { type: 'spell', spellKind: 'flame' },
                  { type: 'spell', spellKind: 'flame' },
                  { type: 'spell', spellKind: 'flame' },
                ],
              },
            }
          : player,
      ),
      combat: {
        playerId: base.players[0].id,
        monsterId: 'skeleton_lord',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        rolledDice: [2, 2],
        pendingBaseOutcome: 'draw',
      },
    };

    expect(chooseHeuristicAiAction(highStrengthState)).toEqual({
      type: 'resolveCombatWithFlameSpells',
      flameSpellCount: 1,
    });

    const lowStrengthState: GameState = {
      ...highStrengthState,
      combat: {
        ...highStrengthState.combat!,
        monsterId: 'skeleton_soldier',
        rolledDice: [1, 2],
        pendingBaseOutcome: 'draw',
      },
    };

    expect(chooseHeuristicAiAction(lowStrengthState)).toEqual({
      type: 'resolveCombatWithoutFlameSpells',
    });
  });

  it('always takes the valkyrie reroll during the valkyrie reroll step', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-valkyrie-reroll-choice',
    });
    const state: GameState = {
      ...base,
      phase: 'combat_valkyrie_reroll',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, heroId: 'hero_valkyrie' } : player,
      ),
      combat: {
        playerId: base.players[0].id,
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [2, 3],
        initialBaseOutcome: 'draw',
      },
    };

    expect(chooseHeuristicAiAction(state)).toEqual({
      type: 'useValkyrieReroll',
    });
  });

  it('always takes the blade reroll during the blade reroll step', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-blade-reroll-choice',
    });
    const state: GameState = {
      ...base,
      phase: 'combat_blade_reroll',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, heroId: 'hero_blade' } : player,
      ),
      combat: {
        playerId: base.players[0].id,
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [1, 4],
        rolledDice: [1, 4],
        bladeRerollCount: 0,
      },
    };

    expect(chooseHeuristicAiAction(state)).toEqual({
      type: 'useBladeReroll',
    });
  });

  it('starts optional rogue combat only when the fight is worthwhile', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-optional-rogue-combat',
    });
    const strongState: GameState = {
      ...base,
      phase: 'optional_monster_combat',
      activePlayerIndex: 0,
      remainingSteps: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_rogue',
              inventory: {
                ...player.inventory,
                weapons: [
                  { type: 'weapon', bonus: 3 },
                  { type: 'weapon', bonus: 3 },
                ],
              },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
          roomToken: { id: 'kitchen_rat', kind: 'monster' },
        },
      ],
      combat: {
        playerId: base.players[0].id,
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: 0 },
      },
    };

    expect(chooseHeuristicAiAction(strongState)).toEqual({
      type: 'startOptionalCombat',
    });

    const weakState: GameState = {
      ...strongState,
      players: strongState.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: {
                ...player.inventory,
                weapons: [],
              },
            }
          : player,
      ),
      combat: {
        ...strongState.combat!,
        monsterId: 'dragon',
      },
      board: [
        {
          ...strongState.board[0],
          roomToken: { id: 'dragon', kind: 'monster' },
        },
      ],
    };

    expect(chooseHeuristicAiAction(weakState)).toEqual({
      type: 'endTurn',
    });
  });

  it('uses witch sacrifice for a direct win and declines it otherwise', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-witch-sacrifice-choice',
    });
    const winningState: GameState = {
      ...base,
      phase: 'combat_witch_sacrifice',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0 ? { ...player, heroId: 'hero_witch' } : player,
      ),
      combat: {
        playerId: base.players[0].id,
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [2, 3],
        initialBaseOutcome: 'draw',
      },
    };

    expect(chooseHeuristicAiAction(winningState)).toEqual({
      type: 'useWitchSacrifice',
    });

    const decliningState: GameState = {
      ...winningState,
      combat: {
        ...winningState.combat!,
        initialRolledDice: [1, 1],
        initialBaseOutcome: 'defeat',
      },
    };

    expect(chooseHeuristicAiAction(decliningState)).toEqual({
      type: 'declineWitchSacrifice',
    });
  });

  it('uses witch sacrifice for a draw when a flame spell can convert it into a win', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-witch-sacrifice-flame',
    });
    const state: GameState = {
      ...base,
      phase: 'combat_witch_sacrifice',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_witch',
              inventory: {
                ...player.inventory,
                spells: [{ type: 'spell', spellKind: 'flame' }],
              },
            }
          : player,
      ),
      combat: {
        playerId: base.players[0].id,
        monsterId: 'kitchen_rat',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
        initialRolledDice: [1, 3],
        initialBaseOutcome: 'defeat',
      },
    };

    expect(chooseHeuristicAiAction(state)).toEqual({
      type: 'useWitchSacrifice',
    });
  });

  it('chooses the deterministic mummified_priest curse target during the curse selection step', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 2,
      seed: 'ai-mummified_priest-curse-choice',
    });
    const state: GameState = {
      ...base,
      phase: 'combat_curse_target',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 1
          ? { ...player, treasurePoints: 3 }
          : index === 2
            ? { ...player, treasurePoints: 7 }
            : player,
      ),
      combat: {
        playerId: base.players[0].id,
        monsterId: 'mummified_priest',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
    };

    expect(chooseHeuristicAiAction(state)).toEqual({
      type: 'selectCurseTarget',
      targetPlayerId: 'player_ai_2',
    });
  });

  it('uses legal follow-up actions during a continued blade turn with zero steps', () => {
    const base = createNewGame({
      humanHeroId: 'hero_blade',
      aiCount: 1,
      seed: 'ai-blade-follow-up',
    });
    const state: GameState = {
      ...base,
      phase: 'await_move',
      activePlayerIndex: 0,
      remainingSteps: 0,
      turnContinuationReason: 'blade_on_six',
      board: [
        {
          ...base.board[0],
          looseItems: [{ type: 'weapon', bonus: 1 }],
        },
      ],
    };

    expect(chooseHeuristicAiAction(state)).toEqual({ type: 'beginLoot' });
  });
});

function createDragonEndgameState(): GameState {
  const base = createNewGame({
    humanHeroId: 'hero_rogue',
    aiCount: 1,
    seed: 'ai-dragon-endgame',
  });
  const dragonTile: PlacedTile = {
    tileInstanceId: 'tile-dragon',
    blueprintId: 'room_cross',
    rotation: 0,
    boardX: 0,
    boardY: -1,
    discovered: true,
    looseItems: [],
    roomToken: { id: 'dragon', kind: 'monster' },
  };

  return {
    ...base,
    activePlayerIndex: 0,
    phase: 'combat',
    board: [base.board[0], dragonTile],
    players: base.players.map((player, index) =>
      index === 0
        ? {
            ...player,
            heroId: 'hero_rogue',
            position: { boardX: 0, boardY: -1 },
            inventory: {
              keyCount: 0,
              weapons: [
                { type: 'weapon', bonus: 3 },
                { type: 'weapon', bonus: 3 },
              ],
              spells: [
                { type: 'spell', spellKind: 'flame' },
                { type: 'spell', spellKind: 'flame' },
                { type: 'spell', spellKind: 'flame' },
              ],
            },
          }
        : player,
    ),
    remainingSteps: 3,
    lastMoveFrom: { boardX: 0, boardY: 0 },
    combat: {
      playerId: base.players[0].id,
      monsterId: 'dragon',
      position: { boardX: 0, boardY: -1 },
      enteredFrom: { boardX: 0, boardY: 0 },
    },
    rng: createSeededRng('dragon-0').snapshot(),
  };
}

function playActions(state: GameState, count: number): GameState {
  let current = state;

  for (
    let index = 0;
    index < count && current.phase !== 'game_over';
    index += 1
  ) {
    current = applyGameAction(
      current,
      chooseHeuristicAiAction(current, getLegalAiActions(current)),
    );
  }

  return current;
}

function snapshotState(state: GameState) {
  return {
    phase: state.phase,
    activePlayerIndex: state.activePlayerIndex,
    remainingSteps: state.remainingSteps,
    board: state.board.map((tile) => ({
      blueprintId: tile.blueprintId,
      boardX: tile.boardX,
      boardY: tile.boardY,
      roomToken: tile.roomToken,
    })),
    players: state.players.map((player) => ({
      id: player.id,
      hp: player.hp,
      heroId: player.heroId,
      position: player.position,
      treasurePoints: player.treasurePoints,
      inventory: player.inventory,
      isCursed: player.isCursed,
      skipNextTurn: player.skipNextTurn,
    })),
    tileStack: state.tileStack,
    tokenBag: state.tokenBag,
    victory: state.victory,
  };
}

function withActivePlayer(
  state: GameState,
  update: (
    player: GameState['players'][number],
  ) => GameState['players'][number],
): GameState {
  return {
    ...state,
    activePlayerIndex: 0,
    players: state.players.map((player, index) =>
      index === 0 ? update(player) : player,
    ),
  };
}
