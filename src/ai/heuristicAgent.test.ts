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

  it('resolves pending loot instead of ending the turn when unconscious', () => {
    const state = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'heuristic-skip-turn-pending-loot-seed',
    });

    const unconsciousState: GameState = {
      ...state,
      phase: 'loot_resolution',
      activePlayerIndex: 0,
      pendingLoot: {
        source: 'combat_reward',
        position: state.players[0].position,
        item: { type: 'weapon', bonus: 1 },
      },
      players: state.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hp: 0,
              skipNextTurn: true,
            }
          : player,
      ),
    };

    const action = chooseHeuristicAiAction(unconsciousState);

    expect(action.type).not.toBe('endTurn');
    expect(() => applyGameAction(unconsciousState, action)).not.toThrow();
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

  it('ends the turn to receive healing when standing on a healing tile', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-endturn-healing',
    });
    const state: GameState = {
      ...base,
      phase: 'await_move',
      activePlayerIndex: 0,
      remainingSteps: 2,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hp: 2,
              isCursed: true,
              position: { boardX: 0, boardY: 0 },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
          blueprintId: 'start_cross_healing',
        },
      ],
    };

    expect(chooseHeuristicAiAction(state)).toEqual({ type: 'endTurn' });
  });

  it('does not end the turn for healing after a blocked combat retreat onto a healing tile', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-blocked-retreat-healing',
    });
    const state: GameState = {
      ...base,
      phase: 'await_move',
      activePlayerIndex: 0,
      remainingSteps: 2,
      healingEndTurnSource: 'combat_retreat_blocked',
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hp: 2,
              isCursed: true,
              position: { boardX: 0, boardY: 0 },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
          blueprintId: 'start_cross_healing',
        },
        {
          tileInstanceId: 'tile-next',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    };

    expect(chooseHeuristicAiAction(state)).not.toEqual({ type: 'endTurn' });
  });

  it('still prefers movement or exploration on a healing tile when already healthy and uncursed', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-healthy-healing-tile',
    });
    const state: GameState = {
      ...base,
      phase: 'await_move',
      activePlayerIndex: 0,
      remainingSteps: 2,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hp: player.maxHp,
              isCursed: false,
              position: { boardX: 0, boardY: 0 },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
          blueprintId: 'start_cross_healing',
        },
        {
          tileInstanceId: 'tile-next',
          blueprintId: 'tunnel_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    };

    expect(['movePlayer', 'declareExplorationDirection']).toContain(
      chooseHeuristicAiAction(state).type,
    );
  });

  it('keeps trying to reach a known healing tile instead of giving up while no discovered path connects to it', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-no-healing-progress',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      remainingSteps: 4,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hp: 3,
              isCursed: true,
              position: { boardX: 0, boardY: -2 },
            }
          : player,
      ),
      board: [
        {
          tileInstanceId: 'tile-healing',
          blueprintId: 'start_cross_healing',
          rotation: 0,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-current',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 0,
          boardY: -2,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'treasure_chest', kind: 'chest' },
        },
        {
          tileInstanceId: 'tile-farther',
          blueprintId: 'tunnel_straight',
          rotation: 0,
          boardX: 0,
          boardY: -3,
          discovered: true,
          looseItems: [],
        },
      ],
    };

    // The healing tile at (0, 0) is known but no discovered path connects it to the
    // player's position yet (the (0, -1) tile between them has not been placed), so
    // the real path distance is undefined rather than merely "farther". Giving up
    // (ending the turn) would be worse than continuing to move/explore in search of
    // a route, since further exploration could still reveal a connecting path.
    expect(['movePlayer', 'declareExplorationDirection']).toContain(
      chooseHeuristicAiAction(state).type,
    );
  });

  it('prefers direct exploration over a preparatory move when the explore objective is already legal', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-direct-explore-priority',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      remainingSteps: 4,
      board: [
        {
          ...base.board[0],
          blueprintId: 'start_cross_healing',
        },
        {
          tileInstanceId: 'tile-east',
          blueprintId: 'tunnel_straight',
          rotation: 90,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
      ],
    };

    const legalActions = getLegalAiActions(state);

    expect(legalActions).toContainEqual({
      type: 'declareExplorationDirection',
      direction: 'A',
    });
    expect(legalActions).toContainEqual({
      type: 'movePlayer',
      target: { boardX: 1, boardY: 0 },
    });
    expect(chooseHeuristicAiAction(state, legalActions)).toEqual({
      type: 'declareExplorationDirection',
      direction: 'A',
    });
  });

  it('ends the turn when healing is needed but no movement steps remain', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-no-healing-steps',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      remainingSteps: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hp: 3,
              isCursed: true,
              position: { boardX: 0, boardY: -1 },
            }
          : player,
      ),
      board: [
        {
          tileInstanceId: 'tile-healing',
          blueprintId: 'start_cross_healing',
          rotation: 0,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-current',
          blueprintId: 'tunnel_straight',
          rotation: 0,
          boardX: 0,
          boardY: -1,
          discovered: true,
          looseItems: [],
        },
      ],
    };

    expect(chooseHeuristicAiAction(state)).toEqual({ type: 'endTurn' });
  });

  it('prioritizes healing over opening a reachable chest', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-heal-before-chest',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              hp: 2,
              isCursed: true,
              inventory: {
                ...player.inventory,
                keyCount: 1,
                spells: [{ type: 'spell', spellKind: 'healing' }],
              },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
          roomToken: { id: 'treasure_chest', kind: 'chest' },
        },
      ],
    };

    expect(chooseHeuristicAiAction(state)).toEqual({
      type: 'useHealingSpell',
      targetPlayerId: state.players[0].id,
      healingPosition: { boardX: 0, boardY: 0 },
    });
  });

  it('prioritizes a known chest with key over a known monster path', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-chest-before-monster',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      remainingSteps: 1,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: { ...player.inventory, keyCount: 1 },
            }
          : player,
      ),
      board: [
        {
          ...base.board[0],
        },
        {
          tileInstanceId: 'tile-chest',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'treasure_chest', kind: 'chest' },
        },
        {
          tileInstanceId: 'tile-monster',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 0,
          boardY: -1,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'kitchen_rat', kind: 'monster' },
        },
      ],
    };

    expect(chooseHeuristicAiAction(state)).toEqual({
      type: 'movePlayer',
      target: { boardX: 1, boardY: 0 },
    });
  });

  it('does not prioritize the dragon when the win would not secure the score', () => {
    const base = createNewGame({
      humanHeroId: 'hero_blade',
      aiCount: 1,
      seed: 'ai-dragon-no-score-lock',
    });
    const state: GameState = {
      ...base,
      phase: 'optional_monster_combat',
      activePlayerIndex: 0,
      tileStack: [],
      tokenBag: [],
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_blade',
              treasurePoints: 2,
              inventory: {
                ...player.inventory,
                weapons: [{ type: 'weapon', bonus: 3 }, { type: 'weapon', bonus: 3 }],
              },
            }
          : {
              ...player,
              treasurePoints: 5,
            },
      ),
      combat: {
        playerId: base.players[0].id,
        monsterId: 'dragon',
        position: { boardX: 0, boardY: 0 },
        enteredFrom: { boardX: 0, boardY: -1 },
      },
    };

    expect(chooseHeuristicAiAction(state)).toEqual({ type: 'endTurn' });
  });

  it('uses a portal move to pursue a known chest objective', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-portal-chest',
    });
    const state: GameState = {
      ...base,
      phase: 'await_move',
      activePlayerIndex: 0,
      remainingSteps: 2,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              inventory: { ...player.inventory, keyCount: 1 },
              position: { boardX: 0, boardY: 0 },
            }
          : player,
      ),
      board: [
        {
          tileInstanceId: 'tile-portal-origin',
          blueprintId: 'teleport_straight',
          rotation: 90,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-portal-target',
          blueprintId: 'teleport_straight',
          rotation: 90,
          boardX: 2,
          boardY: 0,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'treasure_chest', kind: 'chest' },
        },
      ],
    };

    expect(chooseHeuristicAiAction(state)).toEqual({
      type: 'movePlayer',
      target: { boardX: 2, boardY: 0 },
    });
  });

  it('prefers a non-dragon objective when the dragon win chance is below the combat threshold', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-dragon-threshold',
    });
    const state: GameState = {
      ...base,
      phase: 'await_move',
      activePlayerIndex: 0,
      remainingSteps: 2,
      tileStack: [],
      tokenBag: [],
      board: [
        {
          ...base.board[0],
          blueprintId: 'room_cross',
        },
        {
          tileInstanceId: 'tile-dragon',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 0,
          boardY: -1,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'dragon', kind: 'monster' },
        },
        {
          tileInstanceId: 'tile-rat',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 1,
          boardY: 0,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'kitchen_rat', kind: 'monster' },
        },
      ],
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_mage',
              hp: 3,
              inventory: {
                keyCount: 0,
                weapons: [],
                spells: [],
              },
              position: { boardX: 0, boardY: 0 },
            }
          : player,
      ),
    };

    expect(chooseHeuristicAiAction(state)).toEqual({
      type: 'movePlayer',
      target: { boardX: 1, boardY: 0 },
    });
  });

  it('starts the final dragon combat with the best remaining attacker even below the normal dragon threshold', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 2,
      seed: 'ai-force-dragon-endgame',
    });
    const state: GameState = {
      ...base,
      phase: 'optional_monster_combat',
      activePlayerIndex: 2,
      remainingSteps: 2,
      tileStack: [],
      tokenBag: [],
      board: [
        {
          ...base.board[0],
          blueprintId: 'room_corner',
          rotation: 90,
          boardX: 0,
          boardY: -1,
          looseItems: [{ type: 'weapon', bonus: 2 }],
        },
        {
          tileInstanceId: 'tile-dragon',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 6,
          boardY: -7,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'dragon', kind: 'monster' },
        },
      ],
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_mage',
              hp: 5,
              inventory: {
                keyCount: 0,
                weapons: [
                  { type: 'weapon', bonus: 1 },
                  { type: 'weapon', bonus: 1 },
                ],
                spells: [{ type: 'spell', spellKind: 'flame' }],
              },
              position: { boardX: 0, boardY: 0 },
            }
          : index === 1
            ? {
                ...player,
                heroId: 'hero_witch',
                hp: 3,
                isCursed: true,
                inventory: {
                  keyCount: 0,
                  weapons: [
                    { type: 'weapon', bonus: 1 },
                    { type: 'weapon', bonus: 2 },
                  ],
                  spells: [],
                },
                position: { boardX: 0, boardY: -3 },
              }
            : {
                ...player,
                heroId: 'hero_seeress',
                hp: 3,
                inventory: {
                  keyCount: 1,
                  weapons: [
                    { type: 'weapon', bonus: 3 },
                    { type: 'weapon', bonus: 3 },
                  ],
                  spells: [],
                },
                position: { boardX: 6, boardY: -7 },
              },
      ),
      combat: {
        playerId: base.players[2].id,
        monsterId: 'dragon',
        position: { boardX: 6, boardY: -7 },
        enteredFrom: { boardX: 6, boardY: -6 },
      },
    };

    expect(chooseHeuristicAiAction(state)).toEqual({
      type: 'startOptionalCombat',
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

  it('uses the witch swap to reach a chest another hero is standing on', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-witch-swap-chest',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      remainingSteps: 0,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_witch',
              position: { boardX: 0, boardY: 0 },
              inventory: { ...player.inventory, keyCount: 1 },
            }
          : { ...player, position: { boardX: 0, boardY: -1 } },
      ),
      board: [
        {
          tileInstanceId: 'tile-witch',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-chest',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 0,
          boardY: -1,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'treasure_chest', kind: 'chest' },
        },
      ],
    };

    expect(chooseHeuristicAiAction(state)).toEqual({
      type: 'swapWitchPosition',
      targetPlayerId: state.players[1].id,
    });
  });

  it('does not use the witch swap when it brings no positional gain', () => {
    const base = createNewGame({
      humanHeroId: 'hero_mage',
      aiCount: 1,
      seed: 'ai-witch-swap-low-value',
    });
    const state: GameState = {
      ...base,
      phase: 'turn_start',
      activePlayerIndex: 0,
      remainingSteps: 4,
      players: base.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              heroId: 'hero_witch',
              position: { boardX: 0, boardY: 0 },
              inventory: { ...player.inventory, keyCount: 1 },
            }
          : { ...player, position: { boardX: -1, boardY: 0 } },
      ),
      board: [
        {
          tileInstanceId: 'tile-witch',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 0,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-other',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: -1,
          boardY: 0,
          discovered: true,
          looseItems: [],
        },
        {
          tileInstanceId: 'tile-chest',
          blueprintId: 'room_cross',
          rotation: 0,
          boardX: 0,
          boardY: -1,
          discovered: true,
          looseItems: [],
          roomToken: { id: 'treasure_chest', kind: 'chest' },
        },
      ],
    };

    expect(chooseHeuristicAiAction(state)).toEqual({
      type: 'movePlayer',
      target: { boardX: 0, boardY: -1 },
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
