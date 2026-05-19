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
      className="border border-stone-700 bg-stone-900 p-4"
      data-asset-id="ui_icon_log"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-300">
        Log
      </h2>
      {lastError ? (
        <p className="mt-3 bg-red-950 p-2 text-sm text-red-100">{lastError}</p>
      ) : null}
      <ol className="mt-3 grid max-h-48 gap-2 overflow-auto text-sm text-stone-300">
        {visibleEvents.map((event) => (
          <li
            key={event.id}
            className="border-b border-stone-800 pb-2 last:border-b-0 last:pb-0"
          >
            <p className="text-xs uppercase tracking-wide text-stone-500">
              {event.playerLabel ?? event.playerId ?? 'System'}
            </p>
            <p className="text-stone-200">{renderPrimaryText(event)}</p>
            {event.room ? (
              <p className="text-xs text-stone-400">{renderRoomDetails(event)}</p>
            ) : null}
            {event.startPlayer ? (
              <div className="mt-1 grid gap-1 text-xs text-stone-400">
                {event.startPlayer.rounds.map((round, index) => (
                  <p key={`${event.id}-start-round-${index}`}>
                    {round.roundType === 'initial'
                      ? 'Start rolls'
                      : `Tiebreak ${index}`}
                    {': '}
                    {round.rolls
                      .map((entry) => `${heroName(entry.playerHeroId)} ${entry.roll}`)
                      .join(' · ')}
                  </p>
                ))}
              </div>
            ) : null}
            {event.combat ? (
              <>
                <p className="text-xs text-stone-400">
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

function renderRoomDetails(event: GameState['eventLog'][number]): string {
  const room = event.room!;
  const foundLabel =
    room.tokenKind === 'chest'
      ? 'Treasure Chest'
      : monsterName(room.tokenId as Parameters<typeof monsterName>[0]);
  const oracleDrawnSuffix = room.oracleDrawnTokenIds
    ? ` · Oracle drew ${room.oracleDrawnTokenIds
        .map((tokenId) => tokenDisplayLabel(tokenId))
        .join(' / ')}`
    : '';
  const oracleChoiceSuffix =
    room.oracleChoiceIndex !== undefined
      ? ` · Oracle chose option ${room.oracleChoiceIndex + 1}`
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
    parts.push(`oracle +${combat.oracleBonus}`);
  }

  if (combat.warlockSacrificeBonus > 0) {
    parts.push(`warlock sacrifice +${combat.warlockSacrificeBonus}`);
  }

  if (combat.curseTargetPlayerId) {
    parts.push(`curse -> ${combat.curseTargetPlayerId}`);
  }

  if (combat.retreatPosition) {
    parts.push(
      `retreated to ${combat.retreatPosition.boardX},${combat.retreatPosition.boardY}`,
    );
  }

  return parts.join(' · ');
}

function tokenDisplayLabel(tokenId: TokenId): string {
  return tokenId === 'treasure_chest' ? 'Treasure Chest' : monsterName(tokenId);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
