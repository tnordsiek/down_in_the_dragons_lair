import type { Rotation, TileSide } from '../../engine/core/types';
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

  if (!state) {
    return null;
  }

  const handleMove = (direction: TileSide) => {
    dispatch({ type: 'movePlayer', direction });
  };
  const handleExplore = (direction: TileSide) => {
    dispatch({ type: 'declareExplorationDirection', direction });
  };
  const handlePlaceTile = (rotation: Rotation) => {
    dispatch({ type: 'placePendingTile', rotation });
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
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-4">
          <header className="flex items-center justify-between gap-4 border-b border-stone-800 pb-3">
            <div>
              <h1 className="font-display text-3xl text-amber-100">
                Down in the Dragon&apos;s Lair
              </h1>
              <p className="mt-1 text-sm text-stone-400">
                {state.players[state.activePlayerIndex].id}
              </p>
            </div>
            <button
              className="border border-stone-600 px-3 py-2 text-sm text-stone-100"
              onClick={resetGame}
            >
              New Game
            </button>
          </header>
          {state.phase === 'game_over' ? (
            <EndScreen state={state} onNewGame={resetGame} />
          ) : null}
          <BoardView state={state} />
        </div>
        <aside className="grid content-start gap-4">
          <ActionPanel
            state={state}
            onMove={handleMove}
            onExplore={handleExplore}
            onPlaceTile={handlePlaceTile}
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
