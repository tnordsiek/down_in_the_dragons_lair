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
        humanHeroId: 'hero_thief',
        aiCount: 3,
        seed: 'ai-reproducible',
      }),
      150,
    );
    const second = playActions(
      createNewGame({
        humanHeroId: 'hero_thief',
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
});

function createDragonEndgameState(): GameState {
  const base = createNewGame({
    humanHeroId: 'hero_thief',
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
            heroId: 'hero_thief',
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
