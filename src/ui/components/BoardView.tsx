import { useAsset } from '../../data/assets';
import type { GameState } from '../../engine/core/types';
import { heroName } from '../labels';

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
                  <div
                    className="font-mono text-amber-200"
                    data-asset-id={`token_${cell.tile.roomToken.id}`}
                  >
                    {cell.tile.roomToken.id}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-1">
                  {cell.players.map((player) => (
                    <span
                      key={player.id}
                      className="inline-flex h-5 min-w-5 items-center justify-center bg-amber-300 px-1 font-mono text-stone-950"
                      data-asset-id={`${player.heroId}_token`}
                      title={heroName(player.heroId)}
                    >
                      {heroName(player.heroId).slice(0, 1)}
                    </span>
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
