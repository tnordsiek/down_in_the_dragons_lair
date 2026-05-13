import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

import { chooseHeuristicAiAction } from '../../ai/heuristicAgent';
import { getLegalAiActions } from '../../ai/legalActions';
import { getAssetUrl, useAsset } from '../../data/assets';
import type {
  BoardPosition,
  GameEvent,
  RotationDirection,
  TileSide,
} from '../../engine/core/types';
import { useSetupStore } from '../../state/setupStore';
import { ActionPanel } from '../components/ActionPanel';
import {
  BoardView,
  getBoardSelectableHealingPositions,
} from '../components/BoardView';
import { EndScreen } from '../components/EndScreen';
import { EventLog } from '../components/EventLog';
import { FooterMeta } from '../components/FooterMeta';
import { PlayerPanel } from '../components/PlayerPanel';

type HealingSpellSelectionState =
  | { mode: 'idle' }
  | { mode: 'select_target' }
  | { mode: 'select_tile'; targetPlayerId: string };

function canUseHealingSpellNow(
  state: NonNullable<ReturnType<typeof useSetupStore.getState>['gameState']>,
): boolean {
  return state.phase === 'turn_start' || state.phase === 'await_move';
}

export function GameScreen() {
  const state = useSetupStore((store) => store.gameState);
  const lastError = useSetupStore((store) => store.lastError);
  const dispatch = useSetupStore((store) => store.dispatch);
  const resetGame = useSetupStore((store) => store.resetGame);
  const headerLogo = useAsset('ui_logo_header');
  const headerLogoUrl = getAssetUrl(headerLogo.assetId);
  const latestCombatDice = getLatestCombatDice(state?.eventLog);
  const [cameraRequest, setCameraRequest] = useState({
    nonce: 0,
    position: { boardX: 0, boardY: 0 },
    resetZoom: true,
  });
  const [healingSpellSelection, setHealingSpellSelection] =
    useState<HealingSpellSelectionState>({ mode: 'idle' });

  useEffect(() => {
    if (!state) {
      return;
    }

    if (
      state.phase === 'resolve_room_token' &&
      state.players[state.activePlayerIndex].kind === 'human'
    ) {
      dispatch({ type: 'resolveRoomToken' });
    }
  }, [dispatch, state]);

  useEffect(() => {
    if (!state) {
      return;
    }

    const activePlayer = state.players[state.activePlayerIndex];
    const isAiTurn = activePlayer.kind === 'ai' && state.phase !== 'game_over';

    if (!isAiTurn) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      dispatch(chooseHeuristicAiAction(state, getLegalAiActions(state)));
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, state]);

  useEffect(() => {
    if (!state) {
      setHealingSpellSelection({ mode: 'idle' });
      return;
    }

    const activePlayer = state.players[state.activePlayerIndex];
    const isAiTurn = activePlayer.kind === 'ai';
    const hasHealingSpell = activePlayer.inventory.spells.some(
      (spell) => spell.spellKind === 'healing',
    );

    if (isAiTurn || !hasHealingSpell || !canUseHealingSpellNow(state)) {
      setHealingSpellSelection({ mode: 'idle' });
      return;
    }

    if (
      healingSpellSelection.mode === 'select_tile' &&
      !state.players.some(
        (player) => player.id === healingSpellSelection.targetPlayerId,
      )
    ) {
      setHealingSpellSelection({ mode: 'idle' });
    }
  }, [healingSpellSelection, state]);

  if (!state) {
    return null;
  }

  const selectableHealingPositions =
    healingSpellSelection.mode === 'select_tile'
      ? getBoardSelectableHealingPositions(state)
      : [];

  const handleMove = (target: BoardPosition) => {
    dispatch({ type: 'movePlayer', target });
  };
  const handleMovePath = (targets: BoardPosition[]) => {
    for (const target of targets) {
      dispatch({ type: 'movePlayer', target });
    }
  };
  const handleExplore = (direction: TileSide) => {
    dispatch({ type: 'declareExplorationDirection', direction });
  };
  const handleRotatePendingTile = (direction: RotationDirection) => {
    dispatch({ type: 'rotatePendingTilePreview', direction });
  };
  const handleConfirmPendingTile = () => {
    if (!state.pendingTile) {
      return;
    }

    dispatch({
      type: 'placePendingTile',
      rotation: state.pendingTile.previewRotation,
    });
  };
  const handleResolveRoom = () => {
    dispatch({ type: 'resolveRoomToken' });
  };
  const handleResolveCombat = () => {
    dispatch({ type: 'resolveCombat' });
  };
  const handleOpenChest = () => {
    dispatch({ type: 'openChest' });
  };
  const handleBeginLoot = () => {
    dispatch({ type: 'beginLoot' });
  };
  const handleTakeLoot = () => {
    dispatch({ type: 'takeLoot' });
  };
  const handleLeaveLoot = () => {
    dispatch({ type: 'leaveLoot' });
  };
  const handleSwapLoot = (inventorySlot: {
    kind: 'weapon' | 'spell';
    index: number;
  }) => {
    dispatch({ type: 'swapLoot', inventorySlot });
  };
  const handleEndTurn = () => {
    dispatch({ type: 'endTurn' });
  };
  const handleStartHealingSpellSelection = () => {
    setHealingSpellSelection({ mode: 'select_target' });
  };
  const handleCancelHealingSpellSelection = () => {
    setHealingSpellSelection({ mode: 'idle' });
  };
  const handleSelectHealingSpellTarget = (targetPlayerId: string) => {
    setHealingSpellSelection({ mode: 'select_tile', targetPlayerId });
  };
  const handleSelectHealingTile = (healingPosition: BoardPosition) => {
    if (healingSpellSelection.mode !== 'select_tile') {
      return;
    }

    const targetPlayerId = healingSpellSelection.targetPlayerId;

    // Leave spell-selection mode before applying the state update so the next
    // render immediately restores the normal move/explore overlays.
    flushSync(() => {
      setHealingSpellSelection({ mode: 'idle' });
    });

    dispatch({
      type: 'useHealingSpell',
      targetPlayerId,
      healingPosition,
    });
  };
  const focusMap = (position: BoardPosition, resetZoom = false) => {
    setCameraRequest((current) => ({
      nonce: current.nonce + 1,
      position,
      resetZoom,
    }));
  };

  return (
    <main className="relative min-h-screen bg-stone-950 text-stone-100 lg:h-screen">
      <div className="grid min-h-screen w-full gap-4 px-4 py-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:h-full">
          <header className="grid h-[120px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-stone-800 pb-2">
            <div className="flex justify-start">
              <div className="flex items-center gap-2">
                <button
                  className="border border-stone-600 px-3 py-2 text-sm text-stone-100"
                  onClick={() => focusMap({ boardX: 0, boardY: 0 }, true)}
                >
                  Center Map
                </button>
                <button
                  className="border border-stone-600 px-3 py-2 text-sm text-stone-100"
                  title="Return to setup. The current saved game remains resumable."
                  onClick={resetGame}
                >
                  New Game
                </button>
              </div>
            </div>
            <div
              className="flex justify-center"
              data-asset-id={headerLogo.assetId}
            >
              {headerLogoUrl ? (
                <img
                  className="max-h-[108px] w-auto object-contain"
                  src={headerLogoUrl}
                  alt="Down in the Dragon's Lair"
                />
              ) : null}
            </div>
            <div className="flex items-center justify-end">
              {latestCombatDice ? (
                <div
                  className="flex items-center gap-2"
                  aria-label="Latest combat dice"
                >
                  {latestCombatDice.map((die, index) => {
                    const dieAssetId = `ui_dice_0${die}`;
                    const dieUrl = getAssetUrl(dieAssetId);

                    return dieUrl ? (
                      <img
                        key={`${index}-${die}`}
                        className="max-h-[108px] w-auto object-contain"
                        data-asset-id={dieAssetId}
                        src={dieUrl}
                        alt={`Combat die ${index + 1}: ${die}`}
                      />
                    ) : null;
                  })}
                </div>
              ) : null}
            </div>
          </header>
          {state.phase === 'game_over' ? (
            <EndScreen state={state} onNewGame={resetGame} />
          ) : null}
          <BoardView
            cameraRequest={cameraRequest}
            state={state}
            onConfirmPendingTile={handleConfirmPendingTile}
            onExplore={handleExplore}
            onSelectHealingTile={handleSelectHealingTile}
            onMove={handleMove}
            onMovePath={handleMovePath}
            onRotatePendingTile={handleRotatePendingTile}
            selectableHealingPositions={selectableHealingPositions}
          />
        </div>
        <aside className="grid min-h-0 content-start gap-4 lg:h-full lg:w-[22rem] lg:justify-self-end lg:overflow-y-auto lg:pr-1">
          <ActionPanel
            healingSpellSelection={healingSpellSelection}
            onCancelHealingSpellSelection={handleCancelHealingSpellSelection}
            state={state}
            onBeginLoot={handleBeginLoot}
            onLeaveLoot={handleLeaveLoot}
            onMove={handleMove}
            onExplore={handleExplore}
            onResolveRoom={handleResolveRoom}
            onResolveCombat={handleResolveCombat}
            onSelectHealingSpellTarget={handleSelectHealingSpellTarget}
            onStartHealingSpellSelection={handleStartHealingSpellSelection}
            onSwapLoot={handleSwapLoot}
            onTakeLoot={handleTakeLoot}
            onOpenChest={handleOpenChest}
            onEndTurn={handleEndTurn}
          />
          <PlayerPanel
            state={state}
            onFocusPosition={(position) => focusMap(position, true)}
          />
          <EventLog state={state} lastError={lastError} />
        </aside>
      </div>
      <FooterMeta align="left" versionLabel="v1.1 fnord GAMES 2026" />
    </main>
  );
}

function getLatestCombatDice(
  eventLog?: GameEvent[],
): [number, number] | undefined {
  if (!eventLog) {
    return undefined;
  }

  for (let index = eventLog.length - 1; index >= 0; index -= 1) {
    const event = eventLog[index];

    if (event.type === 'combat_resolved' && event.combat) {
      return event.combat.dice;
    }
  }

  return undefined;
}
