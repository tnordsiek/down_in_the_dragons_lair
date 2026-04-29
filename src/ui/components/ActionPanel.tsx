import { monsterDefinitions } from '../../data/monsters';
import { getTileAt } from '../../engine/core/board';
import type { GameState, Rotation, TileSide } from '../../engine/core/types';
import { getUiLegalActions } from '../../state/setupStore';
import { monsterName, sideLabels } from '../labels';

type ActionPanelProps = {
  state: GameState;
  onMove: (direction: TileSide) => void;
  onExplore: (direction: TileSide) => void;
  onPlaceTile: (rotation: Rotation) => void;
  onResolveRoom: () => void;
  onResolveCombat: () => void;
  onOpenChest: () => void;
  onEndTurn: () => void;
};

export function ActionPanel({
  state,
  onMove,
  onExplore,
  onPlaceTile,
  onResolveRoom,
  onResolveCombat,
  onOpenChest,
  onEndTurn,
}: ActionPanelProps) {
  const legalActions = getUiLegalActions(state);
  const activePlayer = state.players[state.activePlayerIndex];
  const activeTile = getTileAt(state.board, activePlayer.position);
  const combatMonster = state.combat
    ? monsterDefinitions[state.combat.monsterId]
    : undefined;
  const weaponBonus = activePlayer.inventory.weapons.reduce(
    (sum, weapon) => sum + weapon.bonus,
    0,
  );
  const availableFlameSpells = activePlayer.inventory.spells.filter(
    (spell) => spell.spellKind === 'flame',
  ).length;
  const canOpenChest =
    activeTile?.roomToken?.id === 'treasure_chest' &&
    activePlayer.inventory.keyCount > 0;

  return (
    <section
      className="border border-stone-700 bg-stone-900 p-4"
      data-asset-id="ui_icon_move"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-300">
            Actions
          </h2>
          <p className="mt-1 font-mono text-sm text-amber-100">
            {state.phase} / {state.remainingSteps}
          </p>
        </div>
        <button
          className="border border-stone-600 px-3 py-2 text-sm text-stone-100"
          onClick={onEndTurn}
        >
          End Turn
        </button>
      </div>

      {state.phase === 'choose_pending_tile_rotation' && state.pendingTile ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-sm text-stone-300">
            {state.pendingTile.blueprintId}
          </h3>
          <div className="flex flex-wrap gap-2">
            {state.pendingTile.legalRotations.map((rotation) => (
              <button
                key={rotation}
                className="bg-amber-300 px-3 py-2 text-sm font-semibold text-stone-950"
                onClick={() => onPlaceTile(rotation)}
              >
                {rotation} deg
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {state.phase === 'combat' && combatMonster ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-400">
            Combat
          </h3>
          <p className="text-sm text-stone-200">
            {monsterName(combatMonster.id)} strength {combatMonster.strength}
          </p>
          <p className="font-mono text-xs text-stone-300">
            2d6 + weapons +{weaponBonus} + flame spells ({availableFlameSpells}{' '}
            available) must beat {combatMonster.strength}
          </p>
          <button
            className="w-fit bg-red-700 px-3 py-2 text-sm font-semibold text-white"
            data-asset-id="ui_icon_attack"
            onClick={onResolveCombat}
          >
            Resolve Combat
          </button>
        </div>
      ) : null}

      {state.phase === 'resolve_room_token' ? (
        <div className="mt-4">
          <button
            className="bg-amber-300 px-3 py-2 text-sm font-semibold text-stone-950"
            onClick={onResolveRoom}
          >
            Resolve Room
          </button>
        </div>
      ) : null}

      {canOpenChest ? (
        <div className="mt-4">
          <button
            className="bg-amber-300 px-3 py-2 text-sm font-semibold text-stone-950"
            data-asset-id="sfx_chest_open"
            onClick={onOpenChest}
          >
            Open Chest
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {legalActions.knownMoveDirections.length > 0 ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-stone-400">
              Move
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {legalActions.knownMoveDirections.map((direction) => (
                <button
                  key={direction}
                  className="border border-stone-500 px-3 py-2 text-sm text-stone-100"
                  onClick={() => onMove(direction)}
                >
                  {sideLabels[direction]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {legalActions.explorationDirections.length > 0 ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-stone-400">
              Explore
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {legalActions.explorationDirections.map((direction) => (
                <button
                  key={direction}
                  className="border border-amber-500 px-3 py-2 text-sm text-amber-100"
                  data-asset-id="sfx_tile_place"
                  onClick={() => onExplore(direction)}
                >
                  {sideLabels[direction]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
