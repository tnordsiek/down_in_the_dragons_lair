import type { GameState, TokenId } from '../../engine/core/types';
import { heroName, monsterName } from '../labels';

type EventLogProps = {
  state: GameState;
  lastError?: string;
};

export function EventLog({ state, lastError }: EventLogProps) {
  const visibleEvents = state.eventLog.slice(-20).reverse();

  return (
    <section
      className="rounded-forged border border-obsidian-700 bg-obsidian-800/85 p-4 shadow-forged"
      data-asset-id="ui_icon_log"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-torch-200">
        Log
      </h2>
      {lastError ? (
        <p className="mt-3 rounded-carve border border-blood-500/50 bg-blood-900 p-2 text-sm text-blood-200">
          {lastError}
        </p>
      ) : null}
      <ol className="mt-3 grid max-h-48 gap-2 overflow-auto text-sm text-parchment-200">
        {visibleEvents.map((event) => (
          <li
            key={event.id}
            className="border-b border-obsidian-700 pb-2 last:border-b-0 last:pb-0"
          >
            <p className="text-xs uppercase tracking-wide text-torch-500">
              {event.playerLabel ?? event.playerId ?? 'System'}
            </p>
            <p className="text-parchment-100">{renderPrimaryText(event)}</p>
            {event.exploration ? (
              <p className="text-xs text-parchment-200">
                {renderExplorationDetails(event)}
              </p>
            ) : null}
            {event.room ? (
              <p className="text-xs text-parchment-200">
                {renderRoomDetails(event)}
              </p>
            ) : null}
            {event.startPlayer ? (
              <div className="mt-1 grid gap-1 text-xs text-parchment-200">
                {event.startPlayer.rounds.map((round, index) => (
                  <p key={`${event.id}-start-round-${index}`}>
                    {round.roundType === 'initial'
                      ? 'Start rolls'
                      : `Tiebreak ${index}`}
                    {': '}
                    {joinParts(
                      round.rolls.map(
                        (entry) => `${entry.playerLabel} ${entry.roll}`,
                      ),
                    )}
                  </p>
                ))}
              </div>
            ) : null}
            {event.combat ? (
              <>
                <p className="text-xs text-parchment-200">
                  {monsterName(event.combat.monsterId)} strength{' '}
                  {event.combat.monsterStrength} · dice {event.combat.dice[0]} +{' '}
                  {event.combat.dice[1]} · total {event.combat.total}
                </p>
                <p className="text-xs text-stone-500">
                  {renderCombatBreakdown(event)}
                </p>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function renderPrimaryText(event: GameState['eventLog'][number]): string {
  if (event.type === 'tile_drawn' && event.exploration) {
    return `Drew ${event.exploration.blueprintId} for exploration`;
  }

  if (event.type === 'tile_placed' && event.exploration) {
    return `Placed ${event.exploration.blueprintId}`;
  }

  if (event.type === 'room_resolved' && event.room) {
    return event.room.tokenKind === 'chest'
      ? 'Resolved room: found Treasure Chest'
      : `Resolved room: found ${monsterName(event.room.tokenId as Parameters<typeof monsterName>[0])}`;
  }

  if (event.type === 'combat_resolved' && event.combat) {
    return `Resolved combat: ${capitalize(event.combat.outcome)}`;
  }

  if (event.type === 'game_started' && event.playerHeroId) {
    return `${heroName(event.playerHeroId)} takes the first turn`;
  }

  return event.message;
}

function renderExplorationDetails(
  event: GameState['eventLog'][number],
): string {
  const exploration = event.exploration!;
  const skippedSuffix =
    exploration.skippedBlueprintIds &&
    exploration.skippedBlueprintIds.length > 0
      ? ` · skipped ${exploration.skippedBlueprintIds.join(', ')}`
      : '';

  if (event.type === 'tile_drawn') {
    return `From ${exploration.origin.boardX},${exploration.origin.boardY} to ${exploration.target.boardX},${exploration.target.boardY} via ${exploration.direction} · legal rotations ${exploration.legalRotations?.join(', ') ?? '-'}${skippedSuffix}`;
  }

  return `Placed at ${exploration.target.boardX},${exploration.target.boardY} with rotation ${exploration.placedRotation ?? '-'}${skippedSuffix}`;
}

function renderRoomDetails(event: GameState['eventLog'][number]): string {
  const room = event.room!;
  const foundLabel =
    room.tokenKind === 'chest'
      ? 'Treasure Chest'
      : monsterName(room.tokenId as Parameters<typeof monsterName>[0]);
  const oracleDrawnSuffix = room.seeressDrawnTokenIds
    ? ` · Seeress drew ${room.seeressDrawnTokenIds
        .map((tokenId) => tokenDisplayLabel(tokenId))
        .join(' / ')}`
    : '';
  const oracleChoiceSuffix =
    room.seeressChoiceIndex !== undefined
      ? ` · Seeress chose option ${room.seeressChoiceIndex + 1}`
      : '';

  return `Found ${foundLabel} at ${room.position.boardX},${room.position.boardY}${oracleDrawnSuffix}${oracleChoiceSuffix}`;
}

function renderCombatBreakdown(event: GameState['eventLog'][number]): string {
  const combat = event.combat!;
  const parts = [
    `weapons +${combat.weaponBonus}`,
    `flame +${combat.flameSpellCount}`,
  ];

  if (combat.oracleBonus > 0) {
    parts.push(`seeress +${combat.oracleBonus}`);
  }

  if (combat.warlockSacrificeBonus > 0) {
    parts.push(`witch sacrifice +${combat.warlockSacrificeBonus}`);
  }

  if (combat.curseTargetPlayerLabel) {
    parts.push(`curse -> ${combat.curseTargetPlayerLabel}`);
  } else if (combat.curseTargetPlayerId) {
    parts.push(`curse -> ${combat.curseTargetPlayerId}`);
  }

  if (combat.retreatPosition) {
    parts.push(
      `retreated to ${combat.retreatPosition.boardX},${combat.retreatPosition.boardY}`,
    );
  }

  return joinParts(parts);
}

function tokenDisplayLabel(tokenId: TokenId): string {
  return tokenId === 'treasure_chest' ? 'Treasure Chest' : monsterName(tokenId);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function joinParts(parts: string[]): string {
  return parts.join(' · ');
}
