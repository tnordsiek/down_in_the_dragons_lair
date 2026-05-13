import type { GameAction, GameState } from './types';
import {
  declineWarriorReroll,
  resolveCombat,
  resolveCombatWithFlameSpells,
  resolveCombatWithoutFlameSpells,
  useWarriorReroll,
} from '../combat/combat';
import {
  drawPendingTileForExploration,
  placePendingTile,
  rotatePendingTilePreview,
} from '../movement/exploration';
import { moveActivePlayer } from '../movement/performMove';
import { openChest } from '../rules/chests';
import {
  beginGroundLoot,
  leavePendingLoot,
  swapPendingLoot,
  takePendingLoot,
} from '../rules/inventory';
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
      return moveActivePlayer(state, action.target);
    case 'declareExplorationDirection':
      return drawPendingTileForExploration(state, action.direction);
    case 'rotatePendingTilePreview':
      return rotatePendingTilePreview(state, action.direction);
    case 'placePendingTile':
      return placePendingTile(state, action.rotation);
    case 'resolveRoomToken':
      return resolveRoomToken(state);
    case 'resolveCombat':
      return resolveCombat(state, {
        dice: action.dice,
        curseTargetPlayerId: action.curseTargetPlayerId,
        useWarlockSacrifice: action.useWarlockSacrifice,
        swordsmanOneRerolls: action.swordsmanOneRerolls,
      });
    case 'useWarriorReroll':
      return useWarriorReroll(state, {
        dice: action.dice,
      });
    case 'declineWarriorReroll':
      return declineWarriorReroll(state);
    case 'resolveCombatWithoutFlameSpells':
      return resolveCombatWithoutFlameSpells(state);
    case 'resolveCombatWithFlameSpells':
      return resolveCombatWithFlameSpells(state, action.flameSpellCount);
    case 'openChest':
      return openChest(state);
    case 'beginLoot':
      return beginGroundLoot(state);
    case 'takeLoot':
      return takePendingLoot(state);
    case 'leaveLoot':
      return leavePendingLoot(state);
    case 'swapLoot':
      return swapPendingLoot(state, action.inventorySlot);
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
