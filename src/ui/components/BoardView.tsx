import { getAssetUrl, useAsset } from '../../data/assets';
import type {
  GameState,
  HeroId,
  MonsterId,
  Token,
} from '../../engine/core/types';
import { heroName, monsterName } from '../labels';

type BoardViewProps = {
  state: GameState;
};

export function BoardView({ state }: BoardViewProps) {
  const gameTable = useAsset('bg_game_table');
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

  return (
    <section className="min-w-0" data-asset-id={gameTable.assetId}>
      <div
        className="grid gap-1 overflow-auto bg-stone-950 p-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(4rem, 1fr))`,
        }}
        aria-label="Dungeon board"
      >
        {cells.map((cell) => (
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
                  rotation={cell.tile?.rotation ?? 0}
                  isPending={Boolean(cell.pendingTile && !cell.tile)}
                />
                {cell.tile?.roomToken ? (
                  <RoomToken token={cell.tile.roomToken} />
                ) : null}
                <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-1">
                  {cell.players.map((player) => (
                    <HeroToken key={player.id} heroId={player.heroId} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
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
        style={{ transform: `rotate(${rotation}deg)` }}
      />
      {isPending ? (
        <div className="absolute left-1 top-1 bg-stone-950/80 px-1 py-0.5 text-[0.6rem] font-mono uppercase tracking-wide text-amber-100">
          Preview
        </div>
      ) : null}
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
