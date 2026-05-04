import { useEffect, useState } from 'react';

import { chooseHeuristicAiAction } from '../../ai/heuristicAgent';
import { getLegalAiActions } from '../../ai/legalActions';
import { getAssetUrl, useAsset } from '../../data/assets';
import type {
  BoardPosition,
  RotationDirection,
  TileSide,
} from '../../engine/core/types';
import { useSetupStore } from '../../state/setupStore';
import { ActionPanel } from '../components/ActionPanel';
import { BoardView } from '../components/BoardView';
import { EndScreen } from '../components/EndScreen';
import { EventLog } from '../components/EventLog';
import { FooterMeta } from '../components/FooterMeta';
import { PlayerPanel } from '../components/PlayerPanel';

export function GameScreen() {
  const state = useSetupStore((store) => store.gameState);
  const lastError = useSetupStore((store) => store.lastError);
  const dispatch = useSetupStore((store) => store.dispatch);
  const resetGame = useSetupStore((store) => store.resetGame);
  const headerLogo = useAsset('ui_logo_header');
  const headerLogoUrl = getAssetUrl(headerLogo.assetId);
  const [cameraRequest, setCameraRequest] = useState({
    nonce: 0,
    position: { boardX: 0, boardY: 0 },
    resetZoom: true,
  });

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

  if (!state) {
    return null;
  }

  const activePlayer = state.players[state.activePlayerIndex];

  const handleMove = (direction: TileSide) => {
    dispatch({ type: 'movePlayer', direction });
  };
  const handleMovePath = (directions: TileSide[]) => {
    for (const direction of directions) {
      dispatch({ type: 'movePlayer', direction });
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
  const handleEndTurn = () => {
    dispatch({ type: 'endTurn' });
  };
  const focusMap = (position: BoardPosition, resetZoom = false) => {
    setCameraRequest((current) => ({
      nonce: current.nonce + 1,
      position,
      resetZoom,
    }));
  };

  return (
    <main className="relative min-h-screen bg-stone-950 text-stone-100">
      <div className="grid min-h-screen w-full gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-4">
          <header className="grid h-[120px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-stone-800 pb-3">
            <div className="min-w-0">
              <p className="text-sm text-stone-400">{activePlayer.id}</p>
            </div>
            <div
              className="flex justify-center"
              data-asset-id={headerLogo.assetId}
            >
              {headerLogoUrl ? (
                <img
                  className="max-h-[88px] w-auto object-contain"
                  src={headerLogoUrl}
                  alt="Down in the Dragon's Lair"
                />
              ) : null}
            </div>
            <div className="flex justify-end">
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
          </header>
          {state.phase === 'game_over' ? (
            <EndScreen state={state} onNewGame={resetGame} />
          ) : null}
          <BoardView
            cameraRequest={cameraRequest}
            state={state}
            onConfirmPendingTile={handleConfirmPendingTile}
            onExplore={handleExplore}
            onMove={handleMove}
            onMovePath={handleMovePath}
            onRotatePendingTile={handleRotatePendingTile}
          />
        </div>
        <aside className="grid content-start gap-4 lg:w-[22rem] lg:justify-self-end">
          <ActionPanel
            state={state}
            onMove={handleMove}
            onExplore={handleExplore}
            onResolveRoom={handleResolveRoom}
            onResolveCombat={handleResolveCombat}
            onOpenChest={handleOpenChest}
            onEndTurn={handleEndTurn}
          />
          <PlayerPanel
            state={state}
            onFocusPosition={(position) => focusMap(position)}
          />
          <EventLog state={state} lastError={lastError} />
        </aside>
      </div>
      <FooterMeta align="left" />
    </main>
  );
}
