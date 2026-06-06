import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { getAssetUrl, useAsset } from '../../data/assets';
import type {
  BoardPosition,
  GameState,
  HeroId,
  Item,
  KnownMove,
  RotationDirection,
  TileSide,
  Token,
} from '../../engine/core/types';
import {
  getLegalExplorationDirections,
  getLegalKnownMoves,
} from '../../engine/movement/movement';
import { getReachableKnownMovePaths } from '../../engine/movement/reachable';
import { adjacentPosition } from '../../engine/movement/topology';
import { useSetupStore } from '../../state/setupStore';
import { itemAssetId } from '../items';
import { useTranslation } from '../../i18n/useTranslation';
import {
  getChestTileTooltip,
  getItemTileTooltip,
  getMonsterTileTooltip,
} from '../tooltips';

const minBoardZoom = 0.6;
const maxBoardZoom = 4;
const boardZoomStep = 0.1;
const minZoomSliderHeightPx = 192;
const maxZoomSliderHeightPx = 480;

type BoardViewProps = {
  cameraRequest?: {
    nonce: number;
    position: BoardPosition;
    resetZoom?: boolean;
  };
  onCameraRequestApplied?: (nonce: number) => void;
  state: GameState;
  onConfirmPendingTile?: () => void;
  onExplore?: (direction: TileSide) => void;
  onSelectHealingTile?: (target: BoardPosition) => void;
  onMove?: (target: BoardPosition) => void;
  onMovePath?: (targets: BoardPosition[]) => void;
  onRotatePendingTile?: (direction: RotationDirection) => void;
  selectableHealingPositions?: BoardPosition[];
  showZoomControl?: boolean;
  fitToContent?: boolean;
};

export function BoardView({
  cameraRequest,
  onCameraRequestApplied,
  state,
  onConfirmPendingTile,
  onExplore,
  onSelectHealingTile,
  onMove,
  onMovePath,
  onRotatePendingTile,
  selectableHealingPositions = [],
  showZoomControl = true,
  fitToContent = false,
}: BoardViewProps) {
  const cellSizePx = 72;
  const cellGapPx = 1;
  const cellStridePx = cellSizePx + cellGapPx;
  const gameTable = useAsset('bg_game_table');
  const movementPointsEnabled = useSetupStore(
    (store) => store.movementPointsEnabled,
  );
  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const transformLayerRef = useRef<HTMLDivElement | null>(null);
  const appliedCameraNonceRef = useRef<number | null>(null);
  const previousGridOriginRef = useRef<{
    boardMinX: number;
    boardMinY: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const boardLayoutSignature = state.board
    .map(
      (tile) =>
        `${tile.tileInstanceId}:${tile.boardX},${tile.boardY},${tile.rotation}`,
    )
    .join('|');
  const pendingTileSignature = state.pendingTile
    ? `${state.pendingTile.target.boardX},${state.pendingTile.target.boardY}:${state.pendingTile.blueprintId}:${state.pendingTile.previewRotation}`
    : 'none';
  const playerPositionSignature = state.players
    .map(
      (player) =>
        `${player.id}:${player.position.boardX},${player.position.boardY}`,
    )
    .join('|');

  const activePlayer = state.players[state.activePlayerIndex];
  const reachableMoveTargets = useMemo(
    () =>
      new Map(
        getReachableKnownMovePaths(state).map((target) => [
          positionKey(target.position),
          target.path,
        ]),
      ),
    [state],
  );
  const legalMoveTargets = new Map<string, KnownMove>(
    getLegalKnownMoves(state).map((move) => [positionKey(move.target), move]),
  );
  const legalExplorationTargets = useMemo(
    () =>
      new Map<string, TileSide>(
        getLegalExplorationDirections(state).map((direction) => {
          const targetPosition = adjacentPosition(
            activePlayer.position,
            direction,
          );

          return [positionKey(targetPosition), direction];
        }),
      ),
    [activePlayer.position, state],
  );
  const healingSelectionTargets = new Set(
    selectableHealingPositions.map(positionKey),
  );
  const visiblePositions = useMemo(() => {
    const positions = new Map<string, BoardPosition>();

    for (const tile of state.board) {
      positions.set(positionKey(tile), {
        boardX: tile.boardX,
        boardY: tile.boardY,
      });
    }

    if (state.pendingTile) {
      positions.set(positionKey(state.pendingTile.target), {
        boardX: state.pendingTile.target.boardX,
        boardY: state.pendingTile.target.boardY,
      });
    }

    for (const move of legalExplorationTargets.keys()) {
      const [boardX, boardY] = move.split(',').map(Number);

      positions.set(move, { boardX, boardY });
    }

    return positions;
  }, [legalExplorationTargets, state]);

  const visibleXValues = Array.from(
    visiblePositions.values(),
    (position) => position.boardX,
  );
  const visibleYValues = Array.from(
    visiblePositions.values(),
    (position) => position.boardY,
  );
  const boardMinX = Math.min(...visibleXValues);
  const boardMaxX = Math.max(...visibleXValues);
  const boardMinY = Math.min(...visibleYValues);
  const boardMaxY = Math.max(...visibleYValues);
  const columns = boardMaxX - boardMinX + 1;
  const rows = boardMaxY - boardMinY + 1;
  const gridOriginSignature = `${boardMinX},${boardMinY},${columns},${rows}`;
  const boardWidthPx =
    columns * cellSizePx + Math.max(0, columns - 1) * cellGapPx;
  const boardHeightPx = rows * cellSizePx + Math.max(0, rows - 1) * cellGapPx;

  const cells = useMemo(
    () =>
      Array.from(visiblePositions.values()).map(({ boardX, boardY }) => {
        const tile = state.board.find(
          (candidate) =>
            candidate.boardX === boardX && candidate.boardY === boardY,
        );
        const players = state.players.filter(
          (player) =>
            player.position.boardX === boardX &&
            player.position.boardY === boardY,
        );
        const pendingTile =
          state.pendingTile?.target.boardX === boardX &&
          state.pendingTile.target.boardY === boardY
            ? state.pendingTile
            : undefined;
        const offsetX = (boardX - boardMinX) * cellStridePx;
        const offsetY = (boardY - boardMinY) * cellStridePx;

        return { boardX, boardY, tile, players, pendingTile, offsetX, offsetY };
      }),
    [boardMinX, boardMinY, cellStridePx, state, visiblePositions],
  );
  const renderCell = (cell: (typeof cells)[number]) => {
    const cellPosition = { boardX: cell.boardX, boardY: cell.boardY };
    const cellKey = positionKey(cellPosition);
    const movePath = reachableMoveTargets.get(cellKey);
    const moveTarget = legalMoveTargets.get(cellKey);
    const explorationDirection = legalExplorationTargets.get(cellKey);
    const moveCost = movePath?.length;
    const isSelectableHealingTarget =
      cell.tile !== undefined && healingSelectionTargets.has(cellKey);
    const isClickableMoveTarget =
      selectableHealingPositions.length === 0 &&
      cell.tile !== undefined &&
      movePath !== undefined;
    const isExtendedMoveTarget =
      isClickableMoveTarget && movePath !== undefined && movePath.length > 1;
    const isClickableExplorationTarget =
      selectableHealingPositions.length === 0 &&
      cell.tile === undefined &&
      cell.pendingTile === undefined &&
      explorationDirection !== undefined;

    return (
      <div
        key={`${cell.boardX},${cell.boardY}`}
        className={`absolute text-[0.65rem] ${
          cell.tile || cell.pendingTile
            ? 'bg-stone-800 shadow-[inset_0_0_0_1px_rgba(120,113,108,1)]'
            : 'bg-transparent'
        }`}
        data-board-position={cellKey}
        style={{
          height: `${cellSizePx}px`,
          left: `${cell.offsetX}px`,
          top: `${cell.offsetY}px`,
          width: `${cellSizePx}px`,
        }}
      >
        {cell.tile || cell.pendingTile ? (
          <div
            className="relative h-full overflow-visible"
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
            {cell.tile?.looseItems[0] ? (
              <LooseItemToken item={cell.tile.looseItems[0]} />
            ) : null}
            {isSelectableHealingTarget ? (
              <button
                aria-label={`Select healing tile ${cell.boardX},${cell.boardY}`}
                className="absolute inset-0 z-10 border border-yellow-300 bg-yellow-200/10 shadow-[inset_0_0_0_2px_rgba(253,224,71,0.6)] transition-colors hover:bg-yellow-200/18 motion-safe:animate-glow-pulse"
                data-testid={`healing-target-${cell.boardX}-${cell.boardY}`}
                onClick={() => onSelectHealingTile?.(cellPosition)}
                onMouseDown={preventButtonFocus}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                <span className="sr-only">
                  Select healing tile {cell.boardX},{cell.boardY}
                </span>
              </button>
            ) : null}
            {isClickableMoveTarget ? (
              <button
                aria-label={`Move to tile ${cell.boardX},${cell.boardY}`}
                className={`absolute inset-0 z-10 border transition-colors ${
                  isExtendedMoveTarget
                    ? 'border-amber-100/60 bg-amber-200/14 shadow-[inset_0_0_0_1px_rgba(253,230,138,0.45),0_0_12px_2px_rgba(224,165,52,0.28)] hover:bg-amber-200/20'
                    : 'border-amber-200/50 bg-amber-100/10 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35),0_0_8px_1px_rgba(224,165,52,0.2)] hover:bg-amber-100/16'
                }`}
                data-testid={`move-target-${cell.boardX}-${cell.boardY}`}
                onClick={() => {
                  if (!movePath) {
                    return;
                  }

                  if (movePath.length > 1) {
                    onMovePath?.(movePath.map((move) => move.target));
                    return;
                  }

                  onMove?.(moveTarget?.target ?? movePath[0].target);
                }}
                onMouseDown={preventButtonFocus}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                {movementPointsEnabled ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-1 top-1 rounded-sm border border-torch-500/30 bg-obsidian-950/80 px-1 py-px text-[0.6rem] font-semibold leading-none text-torch-200"
                    data-testid={`move-cost-${cell.boardX}-${cell.boardY}`}
                  >
                    {moveCost}
                  </span>
                ) : null}
                <span className="sr-only">
                  Move to {cell.boardX},{cell.boardY}
                </span>
              </button>
            ) : null}
            {cell.pendingTile && !cell.tile ? null : (
              <HeroTokenStack
                activePlayerId={state.players[state.activePlayerIndex].id}
                players={cell.players}
              />
            )}
          </div>
        ) : isClickableExplorationTarget ? (
          <button
            aria-label={`Explore tile ${cell.boardX},${cell.boardY}`}
            className="relative h-full w-full border border-dashed border-stone-500 bg-stone-900/80 shadow-[inset_0_0_0_1px_rgba(168,162,158,0.35)] transition-colors hover:border-torch-500 hover:bg-stone-800/85"
            data-testid={`explore-target-${cell.boardX}-${cell.boardY}`}
            data-asset-id="sfx_tile_place"
            onClick={() => onExplore?.(explorationDirection)}
            onMouseDown={preventButtonFocus}
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

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    const previousOrigin = previousGridOriginRef.current;

    if (!previousOrigin) {
      previousGridOriginRef.current = { boardMinX, boardMinY };
      return;
    }

    if (
      previousOrigin.boardMinX === boardMinX &&
      previousOrigin.boardMinY === boardMinY
    ) {
      return;
    }

    if (
      cameraRequest &&
      appliedCameraNonceRef.current !== cameraRequest.nonce
    ) {
      previousGridOriginRef.current = { boardMinX, boardMinY };
      return;
    }

    const currentZoom = zoomRef.current;
    const deltaX =
      (boardMinX - previousOrigin.boardMinX) * cellStridePx * currentZoom;
    const deltaY =
      (boardMinY - previousOrigin.boardMinY) * cellStridePx * currentZoom;

    previousGridOriginRef.current = { boardMinX, boardMinY };

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    setPan((currentPan) => ({
      x: Number((currentPan.x + deltaX).toFixed(3)),
      y: Number((currentPan.y + deltaY).toFixed(3)),
    }));
  }, [boardMinX, boardMinY, cameraRequest, cellStridePx]);

  useEffect(() => {
    const boardViewport = boardViewportRef.current;

    if (!boardViewport) {
      return;
    }

    const updateViewportSize = () => {
      setViewportSize({
        width: boardViewport.clientWidth,
        height: boardViewport.clientHeight,
      });
    };

    updateViewportSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateViewportSize);

      return () => {
        window.removeEventListener('resize', updateViewportSize);
      };
    }

    const observer = new ResizeObserver(() => {
      updateViewportSize();
    });

    observer.observe(boardViewport);

    return () => {
      observer.disconnect();
    };
  }, []);

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
      const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      const nextZoom = clampBoardZoom(zoomRef.current * zoomFactor);
      applyZoom(nextZoom, boardViewport);
    };

    boardViewport.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      boardViewport.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    if (fitToContent) {
      return;
    }

    if (!cameraRequest) {
      return;
    }

    if (appliedCameraNonceRef.current === cameraRequest.nonce) {
      return;
    }

    const boardViewport = boardViewportRef.current;
    const transformLayer = transformLayerRef.current;

    if (
      !boardViewport ||
      !transformLayer ||
      viewportSize.width <= 0 ||
      viewportSize.height <= 0
    ) {
      return;
    }

    const currentZoom = zoomRef.current;
    const targetZoom = cameraRequest.resetZoom ? 1 : currentZoom;
    const targetCell = transformLayer.querySelector<HTMLElement>(
      `[data-board-position="${positionKey(cameraRequest.position)}"]`,
    );

    if (!targetCell) {
      return;
    }

    const transformRect = transformLayer.getBoundingClientRect();
    const targetRect = targetCell.getBoundingClientRect();

    if (
      transformRect.width <= 0 ||
      transformRect.height <= 0 ||
      targetRect.width <= 0 ||
      targetRect.height <= 0
    ) {
      return;
    }

    const centerX =
      (targetRect.left - transformRect.left + targetRect.width / 2) /
      currentZoom;
    const centerY =
      (targetRect.top - transformRect.top + targetRect.height / 2) /
      currentZoom;
    const nextPan = {
      x: boardViewport.clientWidth / 2 - centerX * targetZoom,
      y: boardViewport.clientHeight / 2 - centerY * targetZoom,
    };

    if (cameraRequest.resetZoom) {
      setZoom(1);
    }

    setPan(nextPan);
    appliedCameraNonceRef.current = cameraRequest.nonce;
    onCameraRequestApplied?.(cameraRequest.nonce);
  }, [
    boardLayoutSignature,
    cameraRequest,
    fitToContent,
    gridOriginSignature,
    onCameraRequestApplied,
    pendingTileSignature,
    playerPositionSignature,
    viewportSize,
  ]);

  useEffect(() => {
    if (!fitToContent) {
      return;
    }

    if (
      viewportSize.width <= 0 ||
      viewportSize.height <= 0 ||
      boardWidthPx <= 0 ||
      boardHeightPx <= 0
    ) {
      return;
    }

    // Maximise the zoom so the whole board fills the available area, then center
    // the board's bounding box in the viewport. A pending tile shows rotate/
    // confirm controls that overhang the tile edges, so reserve screen-space
    // margin for them in that case.
    const padding = 0.92;
    const controlMargin = state.pendingTile ? 48 : 0;
    const availableWidth = Math.max(
      1,
      viewportSize.width * padding - 2 * controlMargin,
    );
    const availableHeight = Math.max(
      1,
      viewportSize.height * padding - 2 * controlMargin,
    );
    const fitZoom = clampBoardZoom(
      Math.min(availableWidth / boardWidthPx, availableHeight / boardHeightPx),
    );
    const nextPan = {
      x: Number(
        (viewportSize.width / 2 - (boardWidthPx / 2) * fitZoom).toFixed(3),
      ),
      y: Number(
        (viewportSize.height / 2 - (boardHeightPx / 2) * fitZoom).toFixed(3),
      ),
    };

    setZoom(fitZoom);
    setPan(nextPan);
  }, [
    boardHeightPx,
    boardWidthPx,
    fitToContent,
    state.pendingTile,
    viewportSize,
  ]);

  const applyZoom = (
    requestedZoom: number,
    viewport: HTMLDivElement | null = boardViewportRef.current,
  ) => {
    if (!viewport) {
      return;
    }

    const currentZoom = zoomRef.current;
    const nextZoom = clampBoardZoom(requestedZoom);

    if (nextZoom === currentZoom) {
      return;
    }

    const nextPan = getCenteredZoomPan(
      viewport.clientWidth,
      viewport.clientHeight,
      panRef.current,
      currentZoom,
      nextZoom,
    );

    setZoom(nextZoom);
    setPan(nextPan);
  };
  const zoomSliderHeightPx = clampDimension(
    viewportSize.height * 0.5,
    minZoomSliderHeightPx,
    maxZoomSliderHeightPx,
  );

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1"
      data-asset-id={gameTable.assetId}
    >
      <div
        aria-label="Dungeon board"
        className="relative h-full min-h-[24rem] flex-1 select-none overflow-hidden bg-stone-950 bg-stone-wall p-2 shadow-[inset_0_0_60px_rgba(0,0,0,0.55)] touch-none"
        ref={boardViewportRef}
        onPointerDown={(event) => {
          if (!canStartBoardDrag(event)) {
            return;
          }

          event.preventDefault();
          dragStateRef.current = {
            pointerId: event.pointerId,
            pointerType: event.pointerType,
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

          if (!isActiveBoardDragPointer(event, dragState.pointerType)) {
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
        {showZoomControl ? (
          <div className="pointer-events-none absolute inset-y-0 left-2 z-20 flex items-center">
            <div
              className="pointer-events-auto flex flex-col items-center gap-2 rounded-forged border border-obsidian-700 bg-obsidian-900/70 px-2 py-2 shadow-forged"
              data-testid="board-zoom-control"
              style={{ height: `${zoomSliderHeightPx}px` }}
            >
              <output
                className="text-center text-xs font-semibold tabular-nums text-amber-100"
                data-testid="board-zoom-value"
              >
                {zoom.toFixed(1)}x
              </output>
              <input
                aria-label="Board zoom"
                aria-valuemax={maxBoardZoom}
                aria-valuemin={minBoardZoom}
                aria-valuenow={zoom}
                aria-valuetext={`${Math.round(zoom * 100)} percent`}
                className="w-4 flex-1 accent-amber-300"
                data-testid="board-zoom-slider"
                max={maxBoardZoom}
                min={minBoardZoom}
                onChange={(event) => {
                  applyZoom(Number(event.target.value));
                }}
                onPointerDown={(event) => event.stopPropagation()}
                step={boardZoomStep}
                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                type="range"
                value={zoom}
              />
            </div>
          </div>
        ) : null}
        <div
          className={`origin-top-left transition-transform ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          data-testid="board-transform-layer"
          ref={transformLayerRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: 'max-content',
          }}
        >
          <div
            className="relative"
            data-testid="board-grid"
            style={{
              height: `${boardHeightPx}px`,
              width: `${boardWidthPx}px`,
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

function clampBoardZoom(zoom: number) {
  return Math.min(
    maxBoardZoom,
    Math.max(minBoardZoom, Number(zoom.toFixed(3))),
  );
}

function clampDimension(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function getCenteredZoomPan(
  viewportWidth: number,
  viewportHeight: number,
  currentPan: { x: number; y: number },
  currentZoom: number,
  nextZoom: number,
) {
  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;
  const contentX = (viewportCenterX - currentPan.x) / currentZoom;
  const contentY = (viewportCenterY - currentPan.y) / currentZoom;

  return {
    x: Number((viewportCenterX - contentX * nextZoom).toFixed(3)),
    y: Number((viewportCenterY - contentY * nextZoom).toFixed(3)),
  };
}

function canStartBoardDrag(event: React.PointerEvent<HTMLDivElement>) {
  if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
    return event.button === 0;
  }

  return true;
}

function isActiveBoardDragPointer(
  event: React.PointerEvent<HTMLDivElement>,
  pointerType: string,
) {
  if (pointerType !== 'touch' && pointerType !== 'pen') {
    return (event.buttons & 1) === 1;
  }

  return true;
}

function preventButtonFocus(event: ReactMouseEvent<HTMLButtonElement>) {
  event.preventDefault();
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
  const buttonSize = Number((30 / zoom).toFixed(3));
  const arrowFontSize = Number((18 / zoom).toFixed(3));
  const confirmFontSize = Number((12 / zoom).toFixed(3));
  const externalOffset = Number((-buttonSize).toFixed(3));

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div
        className="absolute top-1/2 -translate-y-1/2"
        data-testid="pending-rotate-left-anchor"
        style={{ left: `${externalOffset}px` }}
      >
        <button
          aria-label="Rotate tile counterclockwise"
          className="pointer-events-auto flex items-center justify-center rounded-full border border-torch-500 bg-obsidian-950/90 font-semibold text-torch-200 shadow-forged"
          onClick={() => onRotate?.('counterclockwise')}
          onMouseDown={preventButtonFocus}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            fontSize: `${arrowFontSize}px`,
            height: `${buttonSize}px`,
            width: `${buttonSize}px`,
          }}
          type="button"
        >
          {'<'}
        </button>
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2"
        data-testid="pending-rotate-right-anchor"
        style={{ right: `${externalOffset}px` }}
      >
        <button
          aria-label="Rotate tile clockwise"
          className="pointer-events-auto flex items-center justify-center rounded-full border border-torch-500 bg-obsidian-950/90 font-semibold text-torch-200 shadow-forged"
          onClick={() => onRotate?.('clockwise')}
          onMouseDown={preventButtonFocus}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            fontSize: `${arrowFontSize}px`,
            height: `${buttonSize}px`,
            width: `${buttonSize}px`,
          }}
          type="button"
        >
          {'>'}
        </button>
      </div>
      <div
        className="absolute left-1/2 -translate-x-1/2"
        data-testid="pending-confirm-anchor"
        style={{ top: `${externalOffset}px` }}
      >
        <button
          aria-label="Confirm tile rotation"
          className="pointer-events-auto flex items-center justify-center rounded-full border border-torch-300 bg-torch-300/90 font-semibold uppercase tracking-wide text-obsidian-950 shadow-forged disabled:cursor-not-allowed disabled:border-stone-600 disabled:bg-stone-800 disabled:text-stone-400"
          disabled={!canConfirm}
          onClick={onConfirm}
          onMouseDown={preventButtonFocus}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            fontSize: `${confirmFontSize}px`,
            height: `${buttonSize}px`,
            width: `${buttonSize}px`,
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
    <div className="flex h-full items-start justify-start bg-gradient-to-br from-obsidian-700/40 to-transparent p-1 font-mono text-parchment-200">
      {blueprintId}
    </div>
  );
}

function RoomToken({ token }: { token: Token }) {
  const t = useTranslation();
  const assetId = `token_${token.id}`;
  const assetUrl = getAssetUrl(assetId);
  const label =
    token.kind === 'monster'
      ? t.displayNames.monsters[token.id]
      : t.boardView.treasureChest;
  const tooltip =
    token.kind === 'monster'
      ? getMonsterTileTooltip(token.id, t)
      : getChestTileTooltip(t);
  const sizePx = 58;

  return (
    <div
      className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-torch-500/40 bg-obsidian-950/80 font-mono text-torch-200 shadow-forged"
      data-asset-id={assetId}
      style={{ height: `${sizePx}px`, width: `${sizePx}px` }}
      title={tooltip}
    >
      {assetUrl ? (
        <img className="h-full w-full object-contain" src={assetUrl} alt={label} />
      ) : (
        token.id
      )}
    </div>
  );
}

function HeroToken({
  heroId,
  sizePx = 32,
}: {
  heroId: HeroId;
  sizePx?: number;
}) {
  const t = useTranslation();
  const assetId = `${heroId}_token`;
  const assetUrl = getAssetUrl(assetId);
  const label = t.displayNames.heroes[heroId];

  return (
    <span
      className="inline-flex items-center justify-center rounded-carve bg-torch-300 font-mono text-obsidian-950 shadow-forged ring-1 ring-obsidian-950/50"
      data-asset-id={assetId}
      title={label}
      style={{ height: `${sizePx}px`, width: `${sizePx}px` }}
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

function HeroTokenStack({
  activePlayerId,
  players,
}: {
  activePlayerId: string;
  players: GameState['players'];
}) {
  if (players.length === 0) {
    return null;
  }

  if (players.length === 1) {
    return (
      <div className="absolute left-1 top-1 z-[2]" data-testid="hero-stack">
        <HeroToken heroId={players[0].heroId} />
      </div>
    );
  }

  const orderedPlayers = [
    ...players.filter((player) => player.id !== activePlayerId),
    ...players.filter((player) => player.id === activePlayerId),
  ];
  const tokenHeight = players.length >= 4 ? 28 : 32;
  const topOffset = players.length >= 4 ? 10 : 12;

  return (
    <div className="absolute left-1 top-1 z-[2] w-8" data-testid="hero-stack">
      {orderedPlayers.map((player, index) => (
        <div
          key={player.id}
          className="absolute left-0"
          data-testid={`hero-stack-entry-${player.id}`}
          style={{
            top: `${index * topOffset}px`,
            zIndex: index + 1,
          }}
        >
          <HeroToken heroId={player.heroId} sizePx={tokenHeight} />
        </div>
      ))}
    </div>
  );
}

function LooseItemToken({ item }: { item: Item }) {
  const t = useTranslation();
  const assetId = itemAssetId(item);
  const assetUrl = getAssetUrl(assetId);
  const label =
    item.type === 'weapon'
      ? t.displayNames.weapons[item.bonus]
      : item.type === 'spell'
        ? `${t.displayNames.spells[item.spellKind]} ${t.items.spellSuffix}`
        : t.items.key;
  const tooltip = getItemTileTooltip(item, t);
  const sizePx = 32;

  return (
    <div
      className="absolute bottom-1 right-1 z-[1] flex items-center justify-center rounded-sm border border-torch-500/30 bg-obsidian-950/85 shadow-forged"
      data-asset-id={assetId}
      style={{ height: `${sizePx}px`, width: `${sizePx}px` }}
      title={tooltip}
    >
      {assetUrl ? (
        <img className="h-full w-full object-contain" src={assetUrl} alt={label} />
      ) : (
        <span className="text-[0.55rem] text-amber-100">{label}</span>
      )}
    </div>
  );
}
