import type { GameAction, GameState } from './types';
import {
  startOptionalCombat,
  declineWitchSacrifice,
  declineValkyrieReroll,
  resolveCombat,
  resolveCombatWithFlameSpells,
  resolveCombatWithoutFlameSpells,
  selectCurseTarget,
  useBladeReroll,
  useWitchSacrifice,
  useValkyrieReroll,
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
import { chooseSeeressRoomToken, resolveRoomToken } from '../rules/rooms';
import { castHealingSpell } from '../rules/spells';
import { swapWitchPosition } from '../rules/witch';
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
      poolScale: action.poolScale,
      selectedAiHeroIds: action.selectedAiHeroIds,
      difficulty: action.difficulty,
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
    case 'chooseSeeressRoomToken':
      return chooseSeeressRoomToken(state, action.choiceIndex);
    case 'startOptionalCombat':
      return startOptionalCombat(state);
    case 'resolveCombat':
      return resolveCombat(state, {
        dice: action.dice,
      });
    case 'selectCurseTarget':
      return selectCurseTarget(state, action.targetPlayerId);
    case 'useBladeReroll':
      return useBladeReroll(state, {
        dice: action.dice,
      });
    case 'useValkyrieReroll':
      return useValkyrieReroll(state, {
        dice: action.dice,
      });
    case 'declineValkyrieReroll':
      return declineValkyrieReroll(state);
    case 'useWitchSacrifice':
      return useWitchSacrifice(state);
    case 'declineWitchSacrifice':
      return declineWitchSacrifice(state);
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
    case 'swapWitchPosition':
      return swapWitchPosition(state, action.targetPlayerId);
    case 'endTurn':
      return endTurn(state);
  }
}
