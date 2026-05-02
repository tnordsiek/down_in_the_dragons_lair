import { useEffect } from 'react';

import { chooseHeuristicAiAction } from '../../ai/heuristicAgent';
import { getLegalAiActions } from '../../ai/legalActions';
import type { RotationDirection, TileSide } from '../../engine/core/types';
import { useSetupStore } from '../../state/setupStore';
import { ActionPanel } from '../components/ActionPanel';
import { BoardView } from '../components/BoardView';
import { EndScreen } from '../components/EndScreen';
import { EventLog } from '../components/EventLog';
import { PlayerPanel } from '../components/PlayerPanel';

export function GameScreen() {
  const state = useSetupStore((store) => store.gameState);
  const lastError = useSetupStore((store) => store.lastError);
  const dispatch = useSetupStore((store) => store.dispatch);
  const resetGame = useSetupStore((store) => store.resetGame);

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

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <div className="grid min-h-screen w-full gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-4">
          <header className="flex items-center justify-between gap-4 border-b border-stone-800 pb-3">
            <div>
              <h1 className="font-display text-3xl text-amber-100">
                Down in the Dragon&apos;s Lair
              </h1>
              <p className="mt-1 text-sm text-stone-400">{activePlayer.id}</p>
            </div>
            <button
              className="border border-stone-600 px-3 py-2 text-sm text-stone-100"
              title="Return to setup. The current saved game remains resumable."
              onClick={resetGame}
            >
              New Game
            </button>
          </header>
          {state.phase === 'game_over' ? (
            <EndScreen state={state} onNewGame={resetGame} />
          ) : null}
          <BoardView
            state={state}
            onConfirmPendingTile={handleConfirmPendingTile}
            onExplore={handleExplore}
            onMove={handleMove}
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
          <PlayerPanel state={state} />
          <EventLog state={state} lastError={lastError} />
        </aside>
      </div>
    </main>
  );
}
