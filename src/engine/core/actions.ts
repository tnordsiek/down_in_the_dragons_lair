import type { GameAction, GameState } from './types';
import { resolveCombat } from '../combat/combat';
import {
  drawPendingTileForExploration,
  placePendingTile,
} from '../movement/exploration';
import { moveActivePlayer } from '../movement/performMove';
import { openChest } from '../rules/chests';
import { resolveRoomToken } from '../rules/rooms';
import { castHealingSpell } from '../rules/spells';
import { swapWarlockPosition } from '../rules/warlock';
import { createNewGame } from '../setup/createGame';
import { endTurn } from '../turns/turns';

export function applyGameAction(
  state: GameState | undefined,
  action: GameAction,
): GameState {
  if (action.type === 'startGame') {
    return createNewGame({
      humanHeroId: action.humanHeroId,
      aiCount: action.aiCount,
      seed: action.seed,
    });
  }

  if (!state) {
    throw new Error(`Action ${action.type} requires an existing game state`);
  }

  switch (action.type) {
    case 'movePlayer':
      return moveActivePlayer(state, action.direction);
    case 'declareExplorationDirection':
      return drawPendingTileForExploration(state, action.direction);
    case 'placePendingTile':
      return placePendingTile(state, action.rotation);
    case 'resolveRoomToken':
      return resolveRoomToken(state);
    case 'resolveCombat':
      return resolveCombat(state, {
        dice: action.dice,
        flameSpellCount: action.flameSpellCount,
        curseTargetPlayerId: action.curseTargetPlayerId,
        warriorRerollDice: action.warriorRerollDice,
        useWarriorReroll: action.useWarriorReroll,
        useWarlockSacrifice: action.useWarlockSacrifice,
        swordsmanOneRerolls: action.swordsmanOneRerolls,
      });
    case 'openChest':
      return openChest(state);
    case 'useHealingSpell':
      return castHealingSpell(state, {
        targetPlayerId: action.targetPlayerId,
        healingPosition: action.healingPosition,
      });
    case 'swapWarlockPosition':
      return swapWarlockPosition(state, action.targetPlayerId);
    case 'endTurn':
      return endTurn(state);
  }
}
