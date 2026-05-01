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
  const boardMinX = Math.min(...state.board.map((tile) => tile.boardX), -2);
  const boardMaxX = Math.max(...state.board.map((tile) => tile.boardX), 2);
  const boardMinY = Math.min(...state.board.map((tile) => tile.boardY), -2);
  const boardMaxY = Math.max(...state.board.map((tile) => tile.boardY), 2);
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

    return { boardX, boardY, tile, players };
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
              cell.tile
                ? 'border-stone-500 bg-stone-800'
                : 'border-stone-800 bg-stone-900'
            }`}
          >
            {cell.tile ? (
              <div
                className="flex h-full flex-col justify-between"
                data-asset-id={`tile_${cell.tile.blueprintId}`}
              >
                <div className="font-mono text-stone-200">
                  {cell.tile.blueprintId}
                </div>
                {cell.tile.roomToken ? (
                  <RoomToken token={cell.tile.roomToken} />
                ) : null}
                <div className="flex flex-wrap gap-1">
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

function RoomToken({ token }: { token: Token }) {
  const assetId = `token_${token.id}`;
  const assetUrl = getAssetUrl(assetId);
  const label =
    token.kind === 'monster'
      ? monsterName(token.id as MonsterId)
      : 'Treasure chest';

  return (
    <div
      className="flex min-h-8 items-center justify-center font-mono text-amber-200"
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
