import { useMemo } from 'react';

import { getAssetUrl } from '../../data/assets';
import type { BoardPosition, GameState } from '../../engine/core/types';
import { ActionPanel } from '../components/ActionPanel';
import { BoardView } from '../components/BoardView';
import { PlayerPanel } from '../components/PlayerPanel';
import type { TutorialVisualId } from '../tutorialSteps';
import {
  chestState,
  explorationState,
  healingState,
  inventoryState,
  movementState,
  playerCardsState,
  roomTokenState,
  scoreboardState,
  tileRotationState,
  turnActionsState,
  turnOrderState,
  tutorialCombatDice,
} from './tutorialFixtures';

// ActionPanel requires the full set of handlers; in the tutorial they are inert
// so the panel renders as a static illustration.
const noop = () => {};
const actionPanelHandlers = {
  healingSpellSelection: { mode: 'idle' as const },
  witchSwapSelection: { mode: 'idle' as const },
  onMove: noop,
  onFocusPortalTarget: noop,
  onBeginLoot: noop,
  onLeaveLoot: noop,
  onExplore: noop,
  onChooseSeeressRoomToken: noop,
  onStartOptionalCombat: noop,
  onResolveCombat: noop,
  onSelectCurseTarget: noop,
  onUseBladeReroll: noop,
  onUseValkyrieReroll: noop,
  onDeclineValkyrieReroll: noop,
  onUseWitchSacrifice: noop,
  onDeclineWitchSacrifice: noop,
  onResolveCombatWithoutFlameSpells: noop,
  onResolveCombatWithFlameSpells: noop,
  onSwapLoot: noop,
  onTakeLoot: noop,
  onOpenChest: noop,
  onCenterMap: noop,
  onCenterHeroine: noop,
  isCenteredOnMap: false,
  onEndTurn: noop,
  onStartHealingSpellSelection: noop,
  onCancelHealingSpellSelection: noop,
  onSelectHealingSpellTarget: noop,
  onStartWitchSwapSelection: noop,
  onCancelWitchSwapSelection: noop,
  onSelectWitchSwapTarget: noop,
};

type BoardVisualConfig = {
  state: GameState;
  focus: BoardPosition;
};

// The start tile sits at (0,0) in every board fixture and is always centered;
// the relevant corridor / room / preview tiles sit next to it.
const startTileFocus = { boardX: 0, boardY: 0 };

const boardVisuals: Partial<Record<TutorialVisualId, () => BoardVisualConfig>> =
  {
    movement: () => ({ state: movementState(), focus: startTileFocus }),
    exploration: () => ({ state: explorationState(), focus: startTileFocus }),
    'tile-rotation': () => ({
      state: tileRotationState(),
      focus: startTileFocus,
    }),
    'room-token': () => ({ state: roomTokenState(), focus: startTileFocus }),
    chest: () => ({ state: chestState(), focus: startTileFocus }),
  };

const panelVisuals: Partial<Record<TutorialVisualId, () => GameState>> = {
  'player-cards': playerCardsState,
  inventory: inventoryState,
  healing: healingState,
  'turn-order': turnOrderState,
  scoreboard: scoreboardState,
};

function BoardVisual({ config }: { config: BoardVisualConfig }) {
  const cameraRequest = useMemo(
    () => ({ nonce: 1, position: config.focus, resetZoom: true }),
    [config.focus],
  );

  return (
    <div className="pointer-events-none relative h-[58vh] min-h-72 overflow-hidden rounded-forged border border-obsidian-700 bg-stone-950 shadow-forged lg:h-[26rem] lg:min-h-0">
      <BoardView
        state={config.state}
        cameraRequest={cameraRequest}
        showZoomControl={false}
        fitToContent
      />
    </div>
  );
}

function CombatDiceVisual() {
  return (
    <div className="grid gap-3 rounded-forged border border-obsidian-700 bg-obsidian-800/85 p-4 shadow-forged">
      <div
        className="flex items-center justify-center gap-3"
        aria-label="Example combat roll"
      >
        {tutorialCombatDice.map((die, index) => {
          const dieAssetId = `ui_dice_0${die}`;
          const dieUrl = getAssetUrl(dieAssetId);

          return dieUrl ? (
            <img
              key={`${index}-${die}`}
              className="h-20 w-20 object-contain"
              data-asset-id={dieAssetId}
              src={dieUrl}
              alt={`Combat die ${index + 1}: ${die}`}
            />
          ) : (
            <span
              key={`${index}-${die}`}
              className="flex h-20 w-20 items-center justify-center rounded-carve border border-obsidian-600 font-mono text-2xl text-amber-100 shadow-carve"
            >
              {die}
            </span>
          );
        })}
      </div>
      <p className="text-center font-mono text-sm text-parchment-200">
        2d6 + weapons must beat the monster’s strength
      </p>
    </div>
  );
}

export function TutorialVisual({ visual }: { visual: TutorialVisualId }) {
  if (visual === 'turn-actions') {
    return (
      <div className="pointer-events-none">
        <ActionPanel state={turnActionsState()} {...actionPanelHandlers} />
      </div>
    );
  }

  if (visual === 'combat-dice') {
    return <CombatDiceVisual />;
  }

  const boardConfig = boardVisuals[visual];
  if (boardConfig) {
    return <BoardVisual config={boardConfig()} />;
  }

  const panelState = panelVisuals[visual];
  if (panelState) {
    return (
      <div className="pointer-events-none">
        <PlayerPanel state={panelState()} />
      </div>
    );
  }

  return null;
}
