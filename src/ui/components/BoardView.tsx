import { useEffect, useRef, useState } from 'react';

import { getAssetUrl, useAsset } from '../../data/assets';
import type {
  BoardPosition,
  GameState,
  HeroId,
  MonsterId,
  RotationDirection,
  TileSide,
  Token,
} from '../../engine/core/types';
import {
  getLegalExplorationDirections,
  getLegalKnownMoveDirections,
} from '../../engine/movement/movement';
import { adjacentPosition } from '../../engine/movement/topology';
import { heroName, monsterName } from '../labels';

type BoardViewProps = {
  state: GameState;
  onConfirmPendingTile?: () => void;
  onExplore?: (direction: TileSide) => void;
  onMove?: (direction: TileSide) => void;
  onRotatePendingTile?: (direction: RotationDirection) => void;
};

export function BoardView({
  state,
  onConfirmPendingTile,
  onExplore,
  onMove,
  onRotatePendingTile,
}: BoardViewProps) {
  const gameTable = useAsset('bg_game_table');
  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const boardXValues = state.board.map((tile) => tile.boardX);
  const boardYValues = state.board.map((tile) => tile.boardY);

  if (state.pendingTile) {
    boardXValues.push(state.pendingTile.target.boardX);
    boardYValues.push(state.pendingTile.target.boardY);
  }

  const boardMinX = Math.min(...boardXValues, -2);
  const boardMaxX = Math.max(...boardXValues, 2);
  const boardMinY = Math.min(...boardYValues, -2);
  const boardMaxY = Math.max(...boardYValues, 2);
  const columns = boardMaxX - boardMinX + 1;
  const rows = boardMaxY - boardMinY + 1;
  const activePlayer = state.players[state.activePlayerIndex];
  const legalMoveTargets = new Map<string, TileSide>(
    getLegalKnownMoveDirections(state).map((direction) => {
      const targetPosition = adjacentPosition(activePlayer.position, direction);

      return [positionKey(targetPosition), direction];
    }),
  );
  const legalExplorationTargets = new Map<string, TileSide>(
    getLegalExplorationDirections(state).map((direction) => {
      const targetPosition = adjacentPosition(activePlayer.position, direction);

      return [positionKey(targetPosition), direction];
    }),
  );
  const cells = Array.from({ length: columns * rows }, (_, index) => {
    const boardX = boardMinX + (index % columns);
    const boardY = boardMinY + Math.floor(index / columns);
    const tile = state.board.find(
      (candidate) => candidate.boardX === boardX && candidate.boardY === boardY,
    );
    const players = state.players.filter(
      (player) =>
        player.position.boardX === boardX && player.position.boardY === boardY,
    );
    const pendingTile =
      state.pendingTile?.target.boardX === boardX &&
      state.pendingTile.target.boardY === boardY
        ? state.pendingTile
        : undefined;

    return { boardX, boardY, tile, players, pendingTile };
  });
  const renderCell = (cell: (typeof cells)[number]) => {
    const cellPosition = { boardX: cell.boardX, boardY: cell.boardY };
    const cellKey = positionKey(cellPosition);
    const moveDirection = legalMoveTargets.get(cellKey);
    const explorationDirection = legalExplorationTargets.get(cellKey);
    const isClickableMoveTarget =
      cell.tile !== undefined && moveDirection !== undefined;
    const isClickableExplorationTarget =
      cell.tile === undefined &&
      cell.pendingTile === undefined &&
      explorationDirection !== undefined;

    return (
      <div
        key={`${cell.boardX},${cell.boardY}`}
        className={`aspect-square min-h-16 border p-1 text-[0.65rem] ${
          cell.tile || cell.pendingTile
            ? 'border-stone-500 bg-stone-800'
            : 'border-stone-800 bg-stone-900'
        }`}
      >
        {cell.tile || cell.pendingTile ? (
          <div
            className="relative h-full overflow-hidden"
            data-asset-id={
              cell.tile
                ? `tile_${cell.tile.blueprintId}`
                : `tile_${cell.pendingTile!.blueprintId}`
            }
          >
            <TileGraphic
              assetId={
                cell.tile
                  ? `tile_${cell.tile.blueprintId}`
                  : `tile_${cell.pendingTile!.blueprintId}`
              }
              blueprintId={
                cell.tile
                  ? cell.tile.blueprintId
                  : cell.pendingTile!.blueprintId
              }
              rotation={
                cell.tile?.rotation ?? cell.pendingTile!.previewRotation
              }
              isPending={Boolean(cell.pendingTile && !cell.tile)}
            />
            {cell.pendingTile && !cell.tile ? (
              <PendingTileControls
                canConfirm={cell.pendingTile.legalRotations.includes(
                  cell.pendingTile.previewRotation,
                )}
                onConfirm={onConfirmPendingTile}
                onRotate={onRotatePendingTile}
                zoom={zoom}
              />
            ) : null}
            {cell.tile?.roomToken ? (
              <RoomToken token={cell.tile.roomToken} />
            ) : null}
            {isClickableMoveTarget ? (
              <button
                aria-label={`Move to tile ${cell.boardX},${cell.boardY}`}
                className="absolute inset-0 z-10 border border-amber-200/50 bg-amber-100/10 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)] transition-colors hover:bg-amber-100/16"
                data-testid={`move-target-${cell.boardX}-${cell.boardY}`}
                onClick={() => onMove?.(moveDirection)}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                <span className="sr-only">
                  Move to {cell.boardX},{cell.boardY}
                </span>
              </button>
            ) : null}
            <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-1">
              {cell.players.map((player) => (
                <HeroToken key={player.id} heroId={player.heroId} />
              ))}
            </div>
          </div>
        ) : isClickableExplorationTarget ? (
          <button
            aria-label={`Explore tile ${cell.boardX},${cell.boardY}`}
            className="relative h-full w-full border border-sky-300/35 bg-sky-200/8 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.3)] transition-colors hover:bg-sky-200/14"
            data-testid={`explore-target-${cell.boardX}-${cell.boardY}`}
            data-asset-id="sfx_tile_place"
            onClick={() => onExplore?.(explorationDirection)}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            <span className="sr-only">
              Explore to {cell.boardX},{cell.boardY}
            </span>
          </button>
        ) : null}
      </div>
    );
  };

  const stopDragging = (
    pointerId?: number,
    element?: HTMLDivElement | null,
  ) => {
    if (
      pointerId !== undefined &&
      dragStateRef.current?.pointerId !== pointerId
    ) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);

    if (pointerId !== undefined) {
      element?.releasePointerCapture?.(pointerId);
    }
  };

  useEffect(() => {
    const boardViewport = boardViewportRef.current;

    if (!boardViewport) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((currentZoom) => {
        const nextZoom =
          event.deltaY < 0 ? currentZoom * 1.1 : currentZoom / 1.1;

        return Math.min(4, Math.max(0.6, Number(nextZoom.toFixed(3))));
      });
    };

    boardViewport.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      boardViewport.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <section className="min-w-0" data-asset-id={gameTable.assetId}>
      <div
        aria-label="Dungeon board"
        className="overflow-hidden bg-stone-950 p-2"
        ref={boardViewportRef}
        onPointerDown={(event) => {
          if (event.button !== 0) {
            return;
          }

          dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: pan.x,
            originY: pan.y,
          };
          setIsDragging(true);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const dragState = dragStateRef.current;

          if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
          }

          if ((event.buttons & 1) !== 1) {
            stopDragging(event.pointerId, event.currentTarget);
            return;
          }

          setPan({
            x: dragState.originX + event.clientX - dragState.startX,
            y: dragState.originY + event.clientY - dragState.startY,
          });
        }}
        onPointerUp={(event) => {
          stopDragging(event.pointerId, event.currentTarget);
        }}
        onPointerLeave={(event) => {
          stopDragging(event.pointerId, event.currentTarget);
        }}
        onPointerCancel={(event) => {
          stopDragging(event.pointerId, event.currentTarget);
        }}
      >
        <div
          className={`origin-center transition-transform ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          data-testid="board-transform-layer"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: 'max-content',
          }}
        >
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(4.5rem, 4.5rem))`,
            }}
          >
            {cells.map(renderCell)}
          </div>
        </div>
      </div>
    </section>
  );
}

function positionKey(position: BoardPosition): string {
  return `${position.boardX},${position.boardY}`;
}

function PendingTileControls({
  canConfirm,
  onConfirm,
  onRotate,
  zoom,
}: {
  canConfirm: boolean;
  onConfirm?: () => void;
  onRotate?: (direction: RotationDirection) => void;
  zoom: number;
}) {
  const arrowSize = Number((24 / zoom).toFixed(3));
  const confirmSize = Number((24 / zoom).toFixed(3));
  const edgeOffset = Number((0 / zoom).toFixed(3));
  const controlFontSize = Number((12 / zoom).toFixed(3));
  const confirmFontSize = Number((9 / zoom).toFixed(3));

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{ left: `${edgeOffset}px` }}
      >
        <button
          aria-label="Rotate tile counterclockwise"
          className="pointer-events-auto flex items-center justify-center rounded-full border border-stone-500 bg-stone-950/90 font-semibold text-amber-100"
          onClick={() => onRotate?.('counterclockwise')}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            fontSize: `${controlFontSize}px`,
            height: `${arrowSize}px`,
            width: `${arrowSize}px`,
          }}
          type="button"
        >
          {'<'}
        </button>
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{ right: `${edgeOffset}px` }}
      >
        <button
          aria-label="Rotate tile clockwise"
          className="pointer-events-auto flex items-center justify-center rounded-full border border-stone-500 bg-stone-950/90 font-semibold text-amber-100"
          onClick={() => onRotate?.('clockwise')}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            fontSize: `${controlFontSize}px`,
            height: `${arrowSize}px`,
            width: `${arrowSize}px`,
          }}
          type="button"
        >
          {'>'}
        </button>
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <button
          aria-label="Confirm tile rotation"
          className="pointer-events-auto flex items-center justify-center rounded-full border border-amber-300 bg-amber-300/90 font-semibold uppercase tracking-wide text-stone-950 disabled:cursor-not-allowed disabled:border-stone-600 disabled:bg-stone-800 disabled:text-stone-400"
          disabled={!canConfirm}
          onClick={onConfirm}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            fontSize: `${confirmFontSize}px`,
            height: `${confirmSize}px`,
            width: `${confirmSize}px`,
          }}
          type="button"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function TileGraphic({
  assetId,
  blueprintId,
  rotation,
  isPending,
}: {
  assetId: string;
  blueprintId: GameState['board'][number]['blueprintId'];
  rotation: GameState['board'][number]['rotation'];
  isPending?: boolean;
}) {
  const assetUrl = getAssetUrl(assetId);

  return assetUrl ? (
    <div className="relative h-full w-full">
      <img
        className={`h-full w-full object-cover ${isPending ? 'opacity-70' : ''}`}
        src={assetUrl}
        alt={isPending ? `${blueprintId} preview` : blueprintId}
        draggable={false}
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    </div>
  ) : (
    <div className="flex h-full items-start justify-start p-1 font-mono text-stone-200">
      {blueprintId}
    </div>
  );
}

function RoomToken({ token }: { token: Token }) {
  const assetId = `token_${token.id}`;
  const assetUrl = getAssetUrl(assetId);
  const label =
    token.kind === 'monster'
      ? monsterName(token.id as MonsterId)
      : 'Treasure chest';

  return (
    <div
      className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-stone-950/80 font-mono text-amber-200"
      data-asset-id={assetId}
    >
      {assetUrl ? (
        <img className="h-8 w-8 object-contain" src={assetUrl} alt={label} />
      ) : (
        token.id
      )}
    </div>
  );
}

function HeroToken({ heroId }: { heroId: HeroId }) {
  const assetId = `${heroId}_token`;
  const assetUrl = getAssetUrl(assetId);
  const label = heroName(heroId);

  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center bg-amber-300 font-mono text-stone-950"
      data-asset-id={assetId}
      title={label}
    >
      {assetUrl ? (
        <img
          className="h-full w-full object-contain"
          src={assetUrl}
          alt={label}
        />
      ) : (
        label.slice(0, 1)
      )}
    </span>
  );
}
