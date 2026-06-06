import type {
  GameState,
  HeroId,
  MonsterId,
  Player,
  TokenId,
} from '../../engine/core/types';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translations } from '../../i18n/en';

type EventLogProps = {
  state: GameState;
  lastError?: string;
};

type GameEvent = GameState['eventLog'][number];

export function EventLog({ state, lastError }: EventLogProps) {
  const t = useTranslation();
  const players = state.players;
  const visibleEvents = state.eventLog.slice(-20).reverse();

  return (
    <section
      className="rounded-forged border border-obsidian-700 bg-obsidian-800/85 p-4 shadow-forged"
      data-asset-id="ui_icon_log"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-torch-200">
        {t.eventLog.title}
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
              {localizedPlayerLabel(
                t,
                players,
                event.playerId,
                event.playerHeroId,
              ) ??
                event.playerLabel ??
                event.playerId ??
                t.eventLog.system}
            </p>
            <p className="text-parchment-100">{renderPrimaryText(event, t)}</p>
            {event.exploration ? (
              <p className="text-xs text-parchment-200">
                {renderExplorationDetails(event, t)}
              </p>
            ) : null}
            {event.room ? (
              <p className="text-xs text-parchment-200">
                {renderRoomDetails(event, t)}
              </p>
            ) : null}
            {event.startPlayer ? (
              <div className="mt-1 grid gap-1 text-xs text-parchment-200">
                {event.startPlayer.rounds.map((round, index) => (
                  <p key={`${event.id}-start-round-${index}`}>
                    {round.roundType === 'initial'
                      ? t.eventLog.startRolls
                      : t.eventLog.tiebreak(index)}
                    {': '}
                    {joinParts(
                      round.rolls.map(
                        (entry) =>
                          `${
                            localizedPlayerLabel(
                              t,
                              players,
                              entry.playerId,
                              entry.playerHeroId,
                            ) ?? entry.playerLabel
                          } ${entry.roll}`,
                      ),
                    )}
                  </p>
                ))}
              </div>
            ) : null}
            {event.combat ? (
              <>
                <p className="text-xs text-parchment-200">
                  {t.eventLog.combatSummary(
                    t.displayNames.monsters[event.combat.monsterId],
                    event.combat.monsterStrength,
                    event.combat.dice[0],
                    event.combat.dice[1],
                    event.combat.total,
                  )}
                </p>
                <p className="text-xs text-stone-500">
                  {renderCombatBreakdown(event, t, players)}
                </p>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function localizedPlayerName(
  t: Translations,
  players: Player[],
  player: Player,
): string {
  const humans = players.filter((entry) => entry.kind === 'human');

  if (player.kind === 'human') {
    if (humans.length <= 1) {
      return t.playerLabels.human;
    }

    return t.playerLabels.playerN(humans.indexOf(player) + 1);
  }

  const ais = players.filter((entry) => entry.kind === 'ai');

  return t.playerLabels.aiN(ais.indexOf(player) + 1);
}

/**
 * Rebuilds a localized "Hero (Human/AI N/Player N)" label from the structured
 * event fields. Returns undefined when the player is not found in the current
 * roster or the hero id is missing, so callers can fall back to the English
 * label that was stored on the event.
 */
function localizedPlayerLabel(
  t: Translations,
  players: Player[],
  playerId?: string,
  playerHeroId?: HeroId,
): string | undefined {
  if (!playerId || !playerHeroId) {
    return undefined;
  }

  const player = players.find((entry) => entry.id === playerId);

  if (!player) {
    return undefined;
  }

  return `${t.displayNames.heroes[playerHeroId]} (${localizedPlayerName(t, players, player)})`;
}

function formatUiAction(event: GameEvent, t: Translations): string {
  const actions = t.eventLog.actions;
  const params = event.messageParams ?? {};

  switch (event.messageKey) {
    case 'moved':
      return actions.moved(Number(params.x), Number(params.y));
    case 'explored':
      return actions.explored(String(params.direction));
    case 'rotatedPreview':
      return actions.rotatedPreview(String(params.direction));
    case 'placedTile':
      return actions.placedTile(Number(params.rotation));
    case 'startedCombat':
      return actions.startedCombat;
    case 'openedChest':
      return actions.openedChest;
    case 'startedLoot':
      return actions.startedLoot;
    case 'tookLoot':
      return actions.tookLoot;
    case 'leftLoot':
      return actions.leftLoot;
    case 'swappedLoot':
      return actions.swappedLoot;
    case 'usedHealingSpell':
      return actions.usedHealingSpell;
    case 'swappedWitchTo':
      return actions.swappedWitchTo(
        t.displayNames.heroes[params.heroId as HeroId],
        Number(params.x),
        Number(params.y),
      );
    case 'swappedWitch':
      return actions.swappedWitch;
    case 'endedTurn':
      return actions.endedTurn;
    default:
      return event.message;
  }
}

function renderPrimaryText(event: GameEvent, t: Translations): string {
  if (event.type === 'tile_drawn' && event.exploration) {
    return t.eventLog.drewTile(event.exploration.blueprintId);
  }

  if (event.type === 'tile_placed' && event.exploration) {
    return t.eventLog.placedTilePrimary(event.exploration.blueprintId);
  }

  if (event.type === 'room_resolved' && event.room) {
    return t.eventLog.resolvedRoomFound(
      event.room.tokenKind === 'chest'
        ? t.eventLog.treasureChest
        : t.displayNames.monsters[event.room.tokenId as MonsterId],
    );
  }

  if (event.type === 'combat_resolved' && event.combat) {
    return t.eventLog.resolvedCombat(event.combat.outcome);
  }

  if (event.type === 'game_started' && event.playerHeroId) {
    return t.eventLog.takesFirstTurn(t.displayNames.heroes[event.playerHeroId]);
  }

  if (event.messageKey) {
    return formatUiAction(event, t);
  }

  return event.message;
}

function renderExplorationDetails(event: GameEvent, t: Translations): string {
  const exploration = event.exploration!;
  const skippedSuffix =
    exploration.skippedBlueprintIds &&
    exploration.skippedBlueprintIds.length > 0
      ? t.eventLog.detail.skipped(exploration.skippedBlueprintIds.join(', '))
      : '';

  if (event.type === 'tile_drawn') {
    return (
      t.eventLog.detail.fromToVia(
        exploration.origin.boardX,
        exploration.origin.boardY,
        exploration.target.boardX,
        exploration.target.boardY,
        exploration.direction,
        exploration.legalRotations?.join(', ') ?? '-',
      ) + skippedSuffix
    );
  }

  return (
    t.eventLog.detail.placedAtRotation(
      exploration.target.boardX,
      exploration.target.boardY,
      String(exploration.placedRotation ?? '-'),
    ) + skippedSuffix
  );
}

function renderRoomDetails(event: GameEvent, t: Translations): string {
  const room = event.room!;
  const foundLabel =
    room.tokenKind === 'chest'
      ? t.eventLog.treasureChest
      : t.displayNames.monsters[room.tokenId as MonsterId];
  const oracleDrawnSuffix = room.seeressDrawnTokenIds
    ? t.eventLog.detail.seeressDrew(
        room.seeressDrawnTokenIds
          .map((tokenId) => tokenDisplayLabel(tokenId, t))
          .join(' / '),
      )
    : '';
  const oracleChoiceSuffix =
    room.seeressChoiceIndex !== undefined
      ? t.eventLog.detail.seeressChose(room.seeressChoiceIndex + 1)
      : '';

  return (
    t.eventLog.detail.foundAt(
      foundLabel,
      room.position.boardX,
      room.position.boardY,
    ) +
    oracleDrawnSuffix +
    oracleChoiceSuffix
  );
}

function renderCombatBreakdown(
  event: GameEvent,
  t: Translations,
  players: Player[],
): string {
  const combat = event.combat!;
  const parts = [
    t.eventLog.breakdown.weapons(combat.weaponBonus),
    t.eventLog.breakdown.flame(combat.flameSpellCount),
  ];

  if (combat.oracleBonus > 0) {
    parts.push(t.eventLog.breakdown.seeress(combat.oracleBonus));
  }

  if (combat.warlockSacrificeBonus > 0) {
    parts.push(t.eventLog.breakdown.witchSacrifice(combat.warlockSacrificeBonus));
  }

  let curseTarget: string | undefined;
  if (combat.curseTargetPlayerId) {
    curseTarget =
      localizedPlayerLabel(
        t,
        players,
        combat.curseTargetPlayerId,
        combat.curseTargetPlayerHeroId,
      ) ??
      combat.curseTargetPlayerLabel ??
      combat.curseTargetPlayerId;
  } else if (combat.curseTargetPlayerLabel) {
    curseTarget = combat.curseTargetPlayerLabel;
  }

  if (curseTarget) {
    parts.push(t.eventLog.breakdown.curseTo(curseTarget));
  }

  if (combat.retreatPosition) {
    parts.push(
      t.eventLog.breakdown.retreatedTo(
        combat.retreatPosition.boardX,
        combat.retreatPosition.boardY,
      ),
    );
  }

  return joinParts(parts);
}

function tokenDisplayLabel(tokenId: TokenId, t: Translations): string {
  return tokenId === 'treasure_chest'
    ? t.eventLog.treasureChest
    : t.displayNames.monsters[tokenId as MonsterId];
}

function joinParts(parts: string[]): string {
  return parts.join(' · ');
}
