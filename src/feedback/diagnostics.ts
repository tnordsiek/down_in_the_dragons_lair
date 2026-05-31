import type { GameState } from '../engine/core/types';
import { APP_VERSION } from './appVersion';

/** Number of most recent event-log entries included in a diagnostics snapshot. */
export const DIAGNOSTICS_EVENT_LIMIT = 20;

/**
 * Builds a compact, human-readable technical snapshot of the current game for
 * voluntary inclusion in a feedback e-mail. Intentionally small (no full board
 * dump) so it stays within typical `mailto:` length limits. Contains no
 * personal data — only game mechanics state.
 */
export function buildDiagnosticsSummary(
  gameState: GameState,
  version: string = APP_VERSION,
): string {
  const lines: string[] = [];

  lines.push(`Version: ${version}`);
  lines.push(`Seed: ${gameState.rng.seed}`);
  lines.push(`RNG state: ${gameState.rng.state}`);
  lines.push(`Phase: ${gameState.phase}`);
  lines.push(`Active player index: ${gameState.activePlayerIndex}`);
  lines.push(`Remaining steps: ${gameState.remainingSteps}`);

  lines.push(`Players (${gameState.players.length}):`);
  for (const player of gameState.players) {
    lines.push(
      `  - ${player.kind} / ${player.heroId} / hp ${player.hp}/${player.maxHp}` +
        ` / tp ${player.treasurePoints}${player.isCursed ? ' / cursed' : ''}`,
    );
  }

  if (gameState.victory) {
    lines.push(`Victory: ${JSON.stringify(gameState.victory)}`);
  }

  const recentEvents = gameState.eventLog.slice(-DIAGNOSTICS_EVENT_LIMIT);
  lines.push(`Recent events (last ${recentEvents.length}):`);
  for (const event of recentEvents) {
    const turn = event.turn === undefined ? '-' : event.turn;
    lines.push(`  [t${turn}] ${event.type}: ${event.message}`);
  }

  return lines.join('\n');
}
