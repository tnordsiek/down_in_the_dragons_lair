import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { chooseHeuristicAiAction } from '../../ai/heuristicAgent';
import { getLegalAiActions } from '../../ai/legalActions';
import { getAssetUrl, useAsset } from '../../data/assets';
import type {
  BoardPosition,
  RotationDirection,
  TileSide,
} from '../../engine/core/types';
import { getDiscoveredHealingPositions } from '../../engine/rules/abilities';
import { isMainTurnActionPhase } from '../../engine/turns/turns';
import { getUiLegalActions, useSetupStore } from '../../state/setupStore';
import { ActionPanel } from '../components/ActionPanel';
import { BoardView } from '../components/BoardView';
import { EndScreen } from '../components/EndScreen';
import { EventLog } from '../components/EventLog';
import { FooterMeta } from '../components/FooterMeta';
import { PlayerPanel } from '../components/PlayerPanel';
import { SettingsMenu } from '../components/SettingsMenu';
import { heroName } from '../labels';
import type {
  HealingSpellSelectionState,
  WitchSwapSelectionState,
} from '../selectionState';

export function GameScreen() {
  const state = useSetupStore((store) => store.gameState);
  const lastError = useSetupStore((store) => store.lastError);
  const dispatch = useSetupStore((store) => store.dispatch);
  const resetGame = useSetupStore((store) => store.resetGame);

  // On mobile Chrome the document can accumulate a non-zero window.scrollY
  // (e.g. after orientation changes or address-bar animations) even though
  // GameScreen fills exactly 100dvh and should never need page-level scroll.
  // Resetting on every viewport resize keeps the sidebar top always visible.
  useEffect(() => {
    const resetScroll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    resetScroll();
    window.addEventListener('resize', resetScroll);
    return () => window.removeEventListener('resize', resetScroll);
  }, []);

  const headerLogo = useAsset('ui_logo_header');
  const headerLogoUrl = getAssetUrl(headerLogo.assetId);
  const latestCombatDice = getLatestCombatDice(state);
  const [cameraRequest, setCameraRequest] = useState({
    nonce: 0,
    position: { boardX: 0, boardY: 0 },
    resetZoom: true,
  });
  const [healingSpellSelection, setHealingSpellSelection] =
    useState<HealingSpellSelectionState>({ mode: 'idle' });
  const [witchSwapSelection, setWitchSwapSelection] =
    useState<WitchSwapSelectionState>({ mode: 'idle' });
  const [dismissedStartOverlayEventId, setDismissedStartOverlayEventId] =
    useState<string | null>(null);
  const latestEvent = state?.eventLog[state.eventLog.length - 1];
  const startPlayerEvent =
    latestEvent?.type === 'game_started' &&
    latestEvent.playerHeroId &&
    latestEvent.startPlayer
      ? latestEvent
      : undefined;
  const showStartPlayerOverlay =
    startPlayerEvent !== undefined &&
    startPlayerEvent.id !== dismissedStartOverlayEventId;
  const startOverlayRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const dismissStartOverlay = () => {
    if (startPlayerEvent) {
      setDismissedStartOverlayEventId(startPlayerEvent.id);
    }
  };

  useEffect(() => {
    if (!showStartPlayerOverlay) {
      return;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    startOverlayRef.current?.focus();

    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, [showStartPlayerOverlay]);

  useEffect(() => {
    if (!state) {
      return;
    }

    if (
      state.phase === 'resolve_room_token' &&
      state.players[state.activePlayerIndex].kind === 'human'
    ) {
      dispatch({ type: 'resolveRoomToken' });
    }
  }, [dispatch, state]);

  useEffect(() => {
    if (!state) {
      return;
    }

    const activePlayer = state.players[state.activePlayerIndex];
    const isAiTurn =
      activePlayer.kind === 'ai' &&
      state.phase !== 'game_over' &&
      !showStartPlayerOverlay;

    if (!isAiTurn) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      dispatch(chooseHeuristicAiAction(state, getLegalAiActions(state)));
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [dispatch, showStartPlayerOverlay, state]);

  useEffect(() => {
    if (!state) {
      if (healingSpellSelection.mode !== 'idle') {
        setHealingSpellSelection({ mode: 'idle' });
      }
      if (witchSwapSelection.mode !== 'idle') {
        setWitchSwapSelection({ mode: 'idle' });
      }

      return;
    }

    const activePlayer = state.players[state.activePlayerIndex];
    const isAiTurn = activePlayer.kind === 'ai';
    const hasHealingSpell = activePlayer.inventory.spells.some(
      (spell) => spell.spellKind === 'healing',
    );

    if (isAiTurn || !hasHealingSpell || !isMainTurnActionPhase(state.phase)) {
      if (healingSpellSelection.mode !== 'idle') {
        setHealingSpellSelection({ mode: 'idle' });
      }

      return;
    }

    if (
      healingSpellSelection.mode === 'select_tile' &&
      !state.players.some(
        (player) => player.id === healingSpellSelection.targetPlayerId,
      )
    ) {
      setHealingSpellSelection({ mode: 'idle' });
    }
    const canUseWitchSwap =
      activePlayer.kind === 'human' &&
      getUiLegalActions(state).witchSwapTargets.length > 0;

    if (!canUseWitchSwap && witchSwapSelection.mode !== 'idle') {
      setWitchSwapSelection({ mode: 'idle' });
    }
  }, [healingSpellSelection, state, witchSwapSelection]);

  useEffect(() => {
    if (!state) {
      setDismissedStartOverlayEventId(null);
    }
  }, [state]);

  if (!state) {
    return null;
  }

  const selectableHealingPositions =
    healingSpellSelection.mode === 'select_tile'
      ? getDiscoveredHealingPositions(state)
      : [];
  const overlayStartPlayerHeroId = startPlayerEvent?.playerHeroId;
  const overlayStartPlayerDetails = startPlayerEvent?.startPlayer;

  const handleMove = (target: BoardPosition) => {
    dispatch({ type: 'movePlayer', target });
  };
  const handleMovePath = (targets: BoardPosition[]) => {
    for (const target of targets) {
      dispatch({ type: 'movePlayer', target });
    }
  };
  const handleExplore = (direction: TileSide) => {
    dispatch({ type: 'declareExplorationDirection', direction });
  };
  const handleRotatePendingTile = (direction: RotationDirection) => {
    dispatch({ type: 'rotatePendingTilePreview', direction });
  };
  const handleConfirmPendingTile = () => {
    if (!state.pendingTile) {
      return;
    }

    dispatch({
      type: 'placePendingTile',
      rotation: state.pendingTile.previewRotation,
    });
  };
  const handleChooseSeeressRoomToken = (choiceIndex: 0 | 1) => {
    dispatch({ type: 'chooseSeeressRoomToken', choiceIndex });
  };
  const handleResolveCombat = () => {
    dispatch({ type: 'resolveCombat' });
  };
  const handleSelectCurseTarget = (targetPlayerId: string) => {
    dispatch({ type: 'selectCurseTarget', targetPlayerId });
  };
  const handleUseBladeReroll = () => {
    dispatch({ type: 'useBladeReroll' });
  };
  const handleStartOptionalCombat = () => {
    dispatch({ type: 'startOptionalCombat' });
  };
  const handleUseValkyrieReroll = () => {
    dispatch({ type: 'useValkyrieReroll' });
  };
  const handleDeclineValkyrieReroll = () => {
    dispatch({ type: 'declineValkyrieReroll' });
  };
  const handleUseWitchSacrifice = () => {
    dispatch({ type: 'useWitchSacrifice' });
  };
  const handleDeclineWitchSacrifice = () => {
    dispatch({ type: 'declineWitchSacrifice' });
  };
  const handleResolveCombatWithoutFlameSpells = () => {
    dispatch({ type: 'resolveCombatWithoutFlameSpells' });
  };
  const handleResolveCombatWithFlameSpells = (flameSpellCount: number) => {
    dispatch({ type: 'resolveCombatWithFlameSpells', flameSpellCount });
  };
  const handleOpenChest = () => {
    dispatch({ type: 'openChest' });
  };
  const handleBeginLoot = () => {
    dispatch({ type: 'beginLoot' });
  };
  const handleTakeLoot = () => {
    dispatch({ type: 'takeLoot' });
  };
  const handleLeaveLoot = () => {
    dispatch({ type: 'leaveLoot' });
  };
  const handleSwapLoot = (inventorySlot: {
    kind: 'weapon' | 'spell';
    index: number;
  }) => {
    dispatch({ type: 'swapLoot', inventorySlot });
  };
  const handleEndTurn = () => {
    dispatch({ type: 'endTurn' });
  };
  const handleStartHealingSpellSelection = () => {
    setHealingSpellSelection({ mode: 'select_target' });
  };
  const handleCancelHealingSpellSelection = () => {
    setHealingSpellSelection({ mode: 'idle' });
  };
  const handleSelectHealingSpellTarget = (targetPlayerId: string) => {
    setHealingSpellSelection({ mode: 'select_tile', targetPlayerId });
  };
  const handleSelectHealingTile = (healingPosition: BoardPosition) => {
    if (healingSpellSelection.mode !== 'select_tile') {
      return;
    }

    const targetPlayerId = healingSpellSelection.targetPlayerId;

    // Leave spell-selection mode before applying the state update so the next
    // render immediately restores the normal move/explore overlays.
    flushSync(() => {
      setHealingSpellSelection({ mode: 'idle' });
    });

    dispatch({
      type: 'useHealingSpell',
      targetPlayerId,
      healingPosition,
    });
  };
  const handleStartWitchSwapSelection = () => {
    setWitchSwapSelection({ mode: 'select_target' });
  };
  const handleCancelWitchSwapSelection = () => {
    setWitchSwapSelection({ mode: 'idle' });
  };
  const handleSelectWitchSwapTarget = (targetPlayerId: string) => {
    flushSync(() => {
      setWitchSwapSelection({ mode: 'idle' });
    });

    dispatch({
      type: 'swapWitchPosition',
      targetPlayerId,
    });
  };
  const focusMap = (position: BoardPosition, resetZoom = false) => {
    setCameraRequest((current) => ({
      nonce: current.nonce + 1,
      position,
      resetZoom,
    }));
  };

  return (
    <main className="relative flex h-[100dvh] flex-col text-parchment-50">
      <div className="grid min-h-0 w-full flex-1 gap-4 px-4 py-4 grid-rows-[minmax(min(25rem,calc(100dvh_-_12rem)),55dvh)_minmax(0,1fr)] lg:grid-rows-none lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
          <header className="flex min-h-[72px] items-center gap-3 border-b border-obsidian-700 pb-2 shadow-[0_2px_0_rgba(196,132,42,0.2)] lg:grid lg:h-[120px] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
            <div className="flex items-center justify-start">
              <SettingsMenu
                onNewGame={resetGame}
                newGameTitle="Return to setup. The current saved game remains resumable."
              />
            </div>
            <div
              className="flex items-center justify-start lg:justify-center"
              data-asset-id={headerLogo.assetId}
            >
              {headerLogoUrl ? (
                <img
                  className="max-h-[50px] w-auto object-contain lg:max-h-[108px]"
                  src={headerLogoUrl}
                  alt="Down in the Dragon's Lair"
                />
              ) : null}
            </div>
            <div className="flex items-center justify-start gap-2 lg:justify-end">
              {latestCombatDice ? (
                <div
                  className="flex items-center justify-start gap-2"
                  aria-label="Latest combat dice"
                >
                  {latestCombatDice.map((die, index) => {
                    const dieAssetId = `ui_dice_0${die}`;
                    const dieUrl = getAssetUrl(dieAssetId);

                    return dieUrl ? (
                      <img
                        key={`${index}-${die}`}
                        className="max-h-[50px] w-auto object-contain lg:max-h-[108px]"
                        data-asset-id={dieAssetId}
                        src={dieUrl}
                        alt={`Combat die ${index + 1}: ${die}`}
                      />
                    ) : null;
                  })}
                </div>
              ) : null}
            </div>
          </header>
          {state.phase === 'game_over' ? (
            <EndScreen state={state} onNewGame={resetGame} />
          ) : null}
          <BoardView
            cameraRequest={cameraRequest}
            state={state}
            onConfirmPendingTile={handleConfirmPendingTile}
            onExplore={handleExplore}
            onSelectHealingTile={handleSelectHealingTile}
            onMove={handleMove}
            onMovePath={handleMovePath}
            onRotatePendingTile={handleRotatePendingTile}
            selectableHealingPositions={selectableHealingPositions}
          />
        </div>
        <aside className="grid min-h-0 content-start gap-4 overflow-y-auto overscroll-y-contain lg:h-full lg:w-[400px] lg:justify-self-end lg:pr-1">
          <ActionPanel
            healingSpellSelection={healingSpellSelection}
            onCancelHealingSpellSelection={handleCancelHealingSpellSelection}
            state={state}
            onBeginLoot={handleBeginLoot}
            onFocusPortalTarget={(position) => focusMap(position, true)}
            onLeaveLoot={handleLeaveLoot}
            onMove={handleMove}
            onExplore={handleExplore}
            onChooseSeeressRoomToken={handleChooseSeeressRoomToken}
            onStartOptionalCombat={handleStartOptionalCombat}
            onResolveCombat={handleResolveCombat}
            onSelectCurseTarget={handleSelectCurseTarget}
            onUseBladeReroll={handleUseBladeReroll}
            onUseValkyrieReroll={handleUseValkyrieReroll}
            onDeclineValkyrieReroll={handleDeclineValkyrieReroll}
            onUseWitchSacrifice={handleUseWitchSacrifice}
            onDeclineWitchSacrifice={handleDeclineWitchSacrifice}
            onResolveCombatWithoutFlameSpells={
              handleResolveCombatWithoutFlameSpells
            }
            onResolveCombatWithFlameSpells={handleResolveCombatWithFlameSpells}
            onSelectHealingSpellTarget={handleSelectHealingSpellTarget}
            onStartHealingSpellSelection={handleStartHealingSpellSelection}
            onSwapLoot={handleSwapLoot}
            onTakeLoot={handleTakeLoot}
            onOpenChest={handleOpenChest}
            onCenterMap={() => focusMap({ boardX: 0, boardY: 0 }, true)}
            onEndTurn={handleEndTurn}
            witchSwapSelection={witchSwapSelection}
            onStartWitchSwapSelection={handleStartWitchSwapSelection}
            onCancelWitchSwapSelection={handleCancelWitchSwapSelection}
            onSelectWitchSwapTarget={handleSelectWitchSwapTarget}
          />
          <PlayerPanel
            state={state}
            onFocusPosition={(position) => focusMap(position, true)}
          />
          <EventLog state={state} lastError={lastError} />
        </aside>
      </div>
      {showStartPlayerOverlay &&
      startPlayerEvent &&
      overlayStartPlayerHeroId &&
      overlayStartPlayerDetails ? (
        <div
          ref={startOverlayRef}
          className="absolute inset-0 z-30 bg-obsidian-950/90 px-4 py-6 text-left backdrop-blur-sm focus:outline-none"
          data-testid="start-player-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-overlay-title"
          tabIndex={-1}
          onClick={(event) => {
            if (event.button !== 0) {
              return;
            }

            dismissStartOverlay();
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Escape' ||
              event.key === 'Enter' ||
              event.key === ' '
            ) {
              event.preventDefault();
              dismissStartOverlay();
            }
          }}
        >
          <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-center">
            <div className="w-full max-w-4xl rounded-forged border border-torch-500/40 bg-obsidian-900/95 p-6 shadow-forged">
              <div className="flex flex-col gap-2 border-b border-obsidian-700 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-torch-300">
                    Starting Player Roll-Off
                  </p>
                  <h2
                    id="start-overlay-title"
                    className="mt-2 font-display text-2xl font-semibold text-parchment-50"
                  >
                    {heroName(overlayStartPlayerHeroId)} begins the game
                  </h2>
                </div>
                <p className="text-sm text-parchment-200">
                  Click anywhere to begin
                </p>
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.9fr)]">
                <div className="grid gap-4">
                  {overlayStartPlayerDetails.rounds.map((round, roundIndex) => {
                    const highestRoll = Math.max(
                      ...round.rolls.map((entry) => entry.roll),
                    );

                    return (
                      <div
                        key={`${startPlayerEvent.id}-overlay-round-${roundIndex}`}
                      >
                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-torch-200">
                          {round.roundType === 'initial'
                            ? 'Initial Roll'
                            : `Tiebreak ${roundIndex}`}
                        </h3>
                        <table className="w-full border-collapse text-sm text-parchment-100">
                          <caption className="sr-only">
                            {round.roundType === 'initial'
                              ? 'Initial roll results'
                              : `Tiebreak ${roundIndex} roll results`}
                          </caption>
                          <thead>
                            <tr className="border-b border-obsidian-700 text-left text-xs uppercase tracking-wide text-parchment-200">
                              <th className="px-3 py-2 font-medium">Player</th>
                              <th className="px-3 py-2 font-medium">Hero</th>
                              <th className="px-3 py-2 font-medium">Roll</th>
                            </tr>
                          </thead>
                          <tbody>
                            {round.rolls.map((entry) => (
                              <tr
                                key={`${startPlayerEvent.id}-${roundIndex}-${entry.playerId}`}
                                className={
                                  entry.roll === highestRoll
                                    ? 'bg-torch-500/15 text-torch-200'
                                    : 'border-b border-obsidian-700 last:border-b-0'
                                }
                              >
                                <td className="px-3 py-2">
                                  {playerTurnLabel(entry.playerId, state)}
                                </td>
                                <td className="px-3 py-2">
                                  {heroName(entry.playerHeroId)}
                                </td>
                                <td className="px-3 py-2 font-semibold">
                                  {entry.roll}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-torch-200">
                    Turn Order
                  </h3>
                  <table className="w-full border-collapse text-sm text-parchment-100">
                    <caption className="sr-only">Turn order</caption>
                    <thead>
                      <tr className="border-b border-obsidian-700 text-left text-xs uppercase tracking-wide text-parchment-200">
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">Player</th>
                        <th className="px-3 py-2 font-medium">Hero</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTurnOrder(state).map((player, index) => (
                        <tr
                          key={`turn-order-${player.id}`}
                          className={
                            index === 0
                              ? 'bg-jade-600/15 text-jade-200'
                              : 'border-b border-obsidian-700 last:border-b-0'
                          }
                        >
                          <td className="px-3 py-2 font-semibold">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2">
                            {playerTurnLabel(player.id, state)}
                          </td>
                          <td className="px-3 py-2">
                            {heroName(player.heroId)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="shrink-0 border-t border-obsidian-700 px-4 pb-2 pt-2">
        <FooterMeta layout="flow" spread versionLabel="v1.5 fnord GAMES 2026" />
      </div>
    </main>
  );
}

function getLatestCombatDice(
  state?: NonNullable<ReturnType<typeof useSetupStore.getState>['gameState']>,
): [number, number] | undefined {
  if (!state) {
    return undefined;
  }

  if (state.phase === 'combat_blade_reroll' && state.combat?.rolledDice) {
    return state.combat.rolledDice;
  }

  if (state.phase === 'combat_flame_spells' && state.combat?.rolledDice) {
    return state.combat.rolledDice;
  }

  if (
    state.phase === 'combat_curse_target' &&
    state.combat?.pendingCombatEvent
  ) {
    return state.combat.pendingCombatEvent.dice;
  }

  if (
    state.phase === 'combat_valkyrie_reroll' &&
    state.combat?.initialRolledDice
  ) {
    return state.combat.initialRolledDice;
  }

  if (
    state.phase === 'combat_witch_sacrifice' &&
    state.combat?.initialRolledDice
  ) {
    return state.combat.initialRolledDice;
  }

  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    const event = state.eventLog[index];

    if (event.type === 'combat_resolved' && event.combat) {
      return event.combat.dice;
    }
  }

  return undefined;
}

function getTurnOrder(
  state: NonNullable<ReturnType<typeof useSetupStore.getState>['gameState']>,
) {
  return state.players.map(
    (_, offset) =>
      state.players[(state.activePlayerIndex + offset) % state.players.length],
  );
}

function playerTurnLabel(
  playerId: string,
  state: NonNullable<ReturnType<typeof useSetupStore.getState>['gameState']>,
) {
  const playerIndex = state.players.findIndex(
    (player) => player.id === playerId,
  );

  if (playerIndex === 0) {
    return 'Human';
  }

  return `AI ${playerIndex}`;
}
