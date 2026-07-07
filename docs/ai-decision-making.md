# AI Decision-Making: Down in the Dragon's Lair

This document describes how the current AI makes decisions in the shipped game. The AI is a deterministic heuristic agent: it does not learn, it does not train, and it does not use machine learning. It evaluates the current `GameState`, enumerates legal actions, and chooses the highest-priority legal action according to explicit rules.

The main entry points are:

- `chooseHeuristicAiAction(...)` in [`src/ai/heuristicAgent.ts`](../src/ai/heuristicAgent.ts)
- `AiHeuristicConfig` and `getDifficultyConfig(...)` in [`src/ai/config.ts`](../src/ai/config.ts)
- `playAiControlledTurn(...)` and `playAiGameToEnd(...)` in [`src/ai/autoplay.ts`](../src/ai/autoplay.ts)
- legal action generation in [`src/ai/legalActions.ts`](../src/ai/legalActions.ts)
- simulation diagnostics in [`src/ai/simulationDiagnostics.ts`](../src/ai/simulationDiagnostics.ts)

---

## Core model

At a high level, the AI does three things:

1. Build the legal action list for the current phase.
2. Apply phase-specific priority rules.
3. Fall back to scored movement or `endTurn` when nothing else has higher priority.

For a fixed `GameState`, AI difficulty, and stale-action counter, the result is deterministic.

### Determinism and Easy-mode randomness

The only deliberate non-optimal behavior is the Easy difficulty `mistakeRate`. Even that is still deterministic because it reads from the seeded game RNG snapshot instead of using external randomness. The same state therefore still produces the same AI action every time.

---

## Decision order in `chooseHeuristicAiAction(...)`

The current decision flow is driven by a strict priority order:

1. Reject empty legal-action sets with an error.
2. Derive the effective config for the current stale-action count.
3. Optionally inject an Easy-mode mistake via `mistakeRate`.
4. If the active player must skip their turn and `endTurn` is legal, end the turn immediately.
5. Resolve combat phases via `chooseCombatAction(...)`.
6. Resolve `loot_resolution` via `chooseLootAction(...)`.
7. Resolve room tokens automatically.
8. In the Seeress room-token choice step, evaluate both revealed tokens and choose the better one (see `chooseSeeressTokenAction`).
9. Choose pending-tile placement via `choosePlacementAction(...)`.
10. If there is valuable ground loot on the current tile, use `chooseGroundLootAction(...)`.
11. Select a strategic objective and, if possible, choose an action that advances it.
12. In desperate fully explored states, try a broader healing-spell fallback.
13. If not desperate, optionally end the turn for healing or to avoid pointless stalling.
14. Otherwise score movement and exploration via `chooseMovementAction(...)`.
15. If no better action exists, use `endTurn`.

This ordering matters more than the raw movement score table. For example, chest opening, loot pickup, healing, combat resolution, and several hero steps are handled before generic movement scoring is even considered.

---

## Legal action generation

The AI only chooses from actions returned by `getLegalAiActions(...)`.

That function is phase-aware and currently supports:

- healing spell use during main-turn action phases
- Witch position swaps at `turn_start`
- chest opening when `canOpenChest(...)` is true
- pending-tile placement rotations
- room-token resolution
- Seeress token choice
- optional monster combat start
- combat resolution, rerolls, Witch sacrifice, and flame-spell decisions
- ground-loot start and loot-resolution choices
- known movement, exploration declarations, and `endTurn`

This separation keeps the decision logic simple: the heuristic code assumes its input actions are already legal.

---

## Strategic objectives

Before raw movement scoring, the AI tries to identify the best current objective. The objective types are:

- `heal`
- `chest`
- `upgradeLoot`
- `winningDragon`
- `monster`
- `explore`

The AI picks the first applicable objective in priority order. In practice that means healing outranks treasure, treasure outranks upgrade loot, upgrade loot outranks a score-securing dragon kill, and all of those outrank generic exploration.

### 1. Healing objective

Healing is prioritized when the active player needs healing, which currently means:

- `hp < preferHealingBelowHp`, or
- the player is cursed

Urgent healing is even more important when:

- `hp <= criticalHp`, or
- the player is cursed and a direct healing action is available

The AI can satisfy healing in several ways:

- cast a healing spell on itself in normal play
- end the turn on a healing tile, if end-of-turn healing is allowed
- move toward the nearest discovered healing position
- in desperate fully explored states, use a broader healing-spell fallback that may target other players if that is the best legal healing action still available

The engine blocks one special case: if the player landed on a healing tile because of a forced retreat after a lost combat, end-of-turn healing is disabled via `state.healingEndTurnSource === 'combat_retreat_blocked'`. The AI respects that and does not treat such a tile as a free heal.

### 2. Chest objective

Known treasure chests become strategic objectives only when the player has a key. If a chest is currently openable, `openChest` happens before any movement scoring.

### 3. Upgrade-loot objective

The AI will pursue known loose items when they are meaningful upgrades and the loot race is still plausible.

Upgrade rules:

- keys are never treated as upgrade loot
- a weapon is an upgrade if the player has fewer than 2 weapons, or if it is stronger than the weakest equipped weapon
- a spell is an upgrade if the player has fewer than 3 spells, or if it improves spell priority

Current spell priority is:

- flame spell: priority `2`
- healing spell: priority `1`

The AI also estimates whether another player is likely to reach the loot first. It does this with `estimateArrivalWindow(...)`, which compares turn order, steps available on the current turn, and shortest strategic path length. Loot that another player should clearly win is not treated as meaningful progress in the fully explored endgame.

### 4. Winning-dragon objective

The dragon gets promoted to a dedicated strategic objective when a dragon win would likely secure the score. The current check is:

- the active player's dragon win chance is at least `minimumDragonWinChance`
- projected score `treasurePoints + 1.5` is at least the highest other current treasure score

When those conditions are true, the AI treats the dragon as a score-closing objective rather than merely another monster.

### 5. Monster objective

Known monsters become objectives when the active player's estimated win chance reaches the threshold for that monster:

- normal monsters use `minimumRepeatCombatWinChance`
- the dragon uses `minimumDragonWinChance`

### 6. Exploration objective

Exploration is the fallback objective when no higher-value strategic target applies. The AI uses reachable exploration targets returned by `getReachableExplorationTargets(...)` and prefers:

- direct exploration if a reveal can happen immediately
- otherwise the shortest path step toward the best reachable exploration frontier

---

## Pathfinding and distance

The current AI uses BFS-style shortest-path searches over the discovered board. The older Manhattan-distance explanation is no longer accurate.

### What the pathfinder considers

`shortestStrategicDistanceFromPosition(...)` includes:

- normal corridor connectivity
- Mage movement through walls
- teleport tiles as one-step links between all discovered teleport rooms

This pathfinder is reused for:

- objective pursuit
- healing routes
- chest and monster routing
- loot-race estimates
- endgame progress checks

Two caches in `heuristicAgent.ts` memoize repeated distance and arrival-window calculations during a single decision.

---

## Movement and exploration scoring

If no earlier rule produced an action, the AI falls back to `chooseMovementAction(...)`, which scores legal movement and exploration actions.

The score has two layers:

1. objective advancement score
2. local tactical score

### Objective advancement layer

If a strategic objective exists, actions that advance it receive a large base advantage. In practice:

- a move or swap that directly reaches the target gets the highest value
- a move that shortens the strategic distance to the target gets a smaller positive value
- actions that do not advance the objective are often treated as invalid for that objective

Because this objective score is multiplied before the local tactical score is added, objective pursuit dominates small tactical bonuses.

### Local tactical layer

After objective handling, movement scoring still considers:

- progress toward the exploration frontier
- chest value on the target tile
- monster value on the target tile
- healing-tile value when healing is needed
- backtrack penalty when returning to `state.lastMoveFrom`
- a graduated anti-cycle penalty for stepping onto a recently occupied tile (see below)

Current config-driven values are:

| Parameter | Normal value | Meaning |
|-----------|--------------|---------|
| `exploreTileBonus` | `9` | baseline reward for exploration progress |
| `exploreRoomBonus` | `8` | reward for entering a favorable monster room |
| `knownChestBonus` | `10` | reward for reaching a known chest with a key |
| `knownHealingBonus` | `12` | reward for healing progress / healing target |
| `knownMonsterPenalty` | `-6` | penalty for low-value monster engagement |
| `objectiveProgressBonus` | `6` | reward for moving closer to strategic targets |
| `dragonObjectiveBonus` | `20` | extra objective priority for dragon routing |
| `backtrackPenalty` | `-2` | discourages immediate move reversal and, scaled by recency, recent-tile revisits |

### Anti-cycle penalty

`state.lastMoveFrom` only catches an immediate reversal. To break the 3+ tile loops that a single-step check misses, the autoplay and batch layers feed the stale-action tracker's per-hero recent-vacated-tile window (`recentPositionKeysFor(playerId)`, oldest first) into the agent. The immediate reversal is already penalized above, so this adds only a small flat `backtrackPenalty` for stepping back onto a tile vacated two or more moves ago. The penalty lives in the local tactical layer, so it only breaks ties and wandering — genuine objective pursuit (scored ×100) still wins. Keeping it gentle matters: an overly strong penalty measurably hurt the strongest hero's win rate by forcing suboptimal exploration detours.

### Monster tiles during movement

For a monster on the target tile, the AI distinguishes between desirable and undesirable fights:

- in normal play, non-desperate movement only treats the monster as favorable if win chance is at least `max(0.5, threshold)`
- otherwise the target receives `knownMonsterPenalty`
- in desperate mode, the AI lowers its minimum acceptable optional-combat threshold and becomes more willing to take marginal fights

---

## Combat decisions

Combat uses exact win-chance estimation rather than rough guessing.

### Win chance calculation

`estimateCombatWinChance(...)` evaluates all 36 outcomes of two six-sided dice and counts how many produce victory after applying the current player's bonuses.

That value is used for:

- optional combat
- dragon timing
- movement valuation of monster tiles
- diagnostics
- curse-target tie-breaking

### Optional combat

In `optional_monster_combat`, the AI starts combat when:

- the win chance is at least the monster's threshold, or
- the monster is the dragon and `shouldForceDragonEndgame(...)` returns true

If the fight is below threshold, the AI prefers movement if it has one, otherwise `endTurn`.

### Forced-dragon endgame

`shouldForceDragonEndgame(...)` is a special endgame escape hatch. It allows the AI to force the final dragon fight even below the normal dragon threshold when all of the following are true:

- the board is fully explored (`tileStack` and `tokenBag` are empty)
- the dragon is present
- there are no better non-dragon objective tiles left
- the active player has a non-zero dragon win chance
- that win chance is still below `minimumDragonWinChance`

Every hero that meets these conditions converges on the dragon and competes for the kill — not just the single best contender. An earlier "only the best win chance may attack" rule left all other heroes goalless: they passed their turns for hundreds of rounds while one hero ground out the fight alone. `getObjectiveTiles(...)` returns the dragon tile as the forced endgame destination, so goalless heroes actively move toward the dragon instead of ending their turn.

One anti-shuttle guard applies: a hero standing on the dragon tile who needs healing (`needsHealing(...)`) and can reach a discovered healing tile retreats to heal first instead of re-attacking at critical hp. With no healing in reach, the gamble is still taken.

### Post-combat repeat decision

During `optional_post_combat`, the AI only continues if the win chance still meets the threshold, unless the dragon endgame override applies.

### Flame spells

During `combat_flame_spells`, the AI:

- never uses flame spells if the hero is the Mage
- against weak monsters (strength `<= 9`) spends flames only to rescue an outright defeat — never to upgrade a harmless draw — and only while keeping `flameSpellDragonReserve` flames back for a dragon that can still appear; once no dragon is reachable, flames are spent freely
- otherwise chooses the smallest legal flame-spell count that converts the current dice result into a victory

The dragon reserve is decided by `isDragonThreatRemaining(...)`: a dragon counts as still in play when one is on the board undefeated or the tile/token stacks are non-empty.

### Valkyrie reroll

During `combat_valkyrie_reroll`, the AI usually rerolls, but it may decline if the estimated fight is still below the relevant minimum win threshold and a decline action is legal.

### Blade reroll

During `combat_blade_reroll`, the AI always uses the Blade reroll when that phase occurs.

### Witch sacrifice

During `combat_witch_sacrifice`, the AI uses the sacrifice if:

- the sacrifice bonus alone produces an immediate victory, or
- the sacrifice plus one or more flame spells can still convert the result into a victory

Otherwise it declines.

### Curse targeting

Against the `mummified_priest`, the AI curses another player using:

1. highest treasure score
2. if tied, highest dragon win chance
3. if still tied, highest total combat bonus

---

## Loot decisions

Ground loot and pending loot are handled separately.

### Ground loot on the current tile

Before strategic objective movement, the AI checks whether the current tile contains meaningful loot and whether `beginLoot` is available.

It starts loot resolution for:

- a key if the player does not already have one
- a weapon that improves current loadout
- a spell that improves current spell capacity or priority

### Loot resolution

During `loot_resolution`, the AI prefers:

1. `takeLoot` if the item fits directly
2. `swapLoot` if a replacement is an upgrade
3. `leaveLoot` otherwise

This applies to keys, weapons, and spells according to inventory capacity and upgrade value.

---

## Placement logic

When a pending tile must be rotated and placed, `choosePlacementAction(...)` evaluates legal placement rotations rather than choosing arbitrarily.

The exact sorting logic is implementation-specific, but the intent is to prefer placements that improve immediate board value, not just the first legal rotation.

---

## Hero-specific behavior

The heuristic logic has dedicated handling for several hero powers:

| Hero | Current AI behavior |
|------|---------------------|
| Blade | always uses Blade reroll when offered |
| Mage | pathfinding can ignore corridor walls; never spends flame spells in combat |
| Rogue | optional combat is accepted only when the current threshold is met or special dragon logic applies |
| Witch | uses `swapWitchPosition` only when it meaningfully advances a healing, chest, or winning-dragon objective; uses sacrifice only when it can produce a win |
| Valkyrie | usually rerolls, but can decline when the projected fight remains below threshold |
| Seeress | evaluates both revealed room tokens and picks the better one (chest over monster, otherwise the more beatable monster) |

The Witch swap is a dedicated objective action, not a movement-scoring bonus. It is taken only when it shortens the route to a fixed objective (healing tile, chest, or the winning dragon) by at least `witchSwapMinimumDistanceGain` steps, or lands the Witch directly on that objective. Opportunistic swaps toward monsters or loot are left to ordinary movement, which prevents cosmetic low-value swaps.

---

## Difficulty presets

Difficulty is stored in `GameState.difficulty`, read by `playAiControlledTurn(...)` / `playAiGameToEnd(...)`, and converted through `getDifficultyConfig(...)`.

The three shipped presets are:

| Parameter | Easy | Normal | Hard |
|-----------|------|--------|------|
| `mistakeRate` | `0.2` | `0` | `0` |
| `criticalHp` | `3` | `2` | `2` |
| `preferHealingBelowHp` | `4` | `3` | `4` |
| `minimumRepeatCombatWinChance` | `0.1` | `0.2` | `0.3` |
| `minimumDragonWinChance` | `0.2` | `0.35` | `0.5` |
| `exploreRoomBonus` | `6` | `8` | `10` |
| `exploreTileBonus` | `7` | `9` | `11` |
| `knownChestBonus` | `8` | `10` | `12` |
| `knownHealingBonus` | `14` | `12` | `10` |
| `knownMonsterPenalty` | `-3` | `-6` | `-8` |
| `objectiveProgressBonus` | `4` | `6` | `8` |
| `dragonObjectiveBonus` | `12` | `20` | `25` |
| `backtrackPenalty` | `-1` | `-2` | `-3` |
| `staleActionThreshold` | `40` | `40` | `40` |
| `witchSwapMinimumDistanceGain` | `2` | `2` | `2` |
| `flameSpellDragonReserve` | `1` | `2` | `2` |

Behaviorally:

- Easy makes deterministic random mistakes more often, seeks healing earlier, and accepts weaker dragon fights.
- Normal is the baseline shipped tuning.
- Hard explores more aggressively, avoids bad fights more strongly, and waits for a better dragon window.

---

## Stale-action handling and desperation mode

The AI has explicit anti-stall support.

### Effective config under stagnation

`getEffectiveAiHeuristicConfig(...)` switches the AI into a more desperate state when `staleActionCount >= staleActionThreshold`.

At the moment, the main config change is:

- `minimumRepeatCombatWinChance` is reduced to half its normal value, but never below `0.1`

This makes the AI more willing to take medium-risk optional fights when passive play is no longer producing progress.

### Stale-action tracker

`createStaleActionTracker(...)` in `simulationDiagnostics.ts` tracks whether the game is actually progressing. It does more than just check for repeated immediate backtracking:

- recent-position memory detects short movement loops
- fully explored games treat empty movement differently, so wandering no longer resets the counter
- a separate tile-stack-shrink counter catches games that keep producing superficial state churn without actually advancing exploration

The autoplay layer passes the tracker's `staleActionCount` back into `chooseHeuristicAiAction(...)`, which is what enables desperation mode during long games.

### Tracker wiring in the real game (UI)

The batch simulation keeps one tracker alive for the whole game, but the UI used to consult the AI with a fresh default (`staleActionCount = 0`, empty position history) on every action — silently disabling both desperation mode and the anti-cycle movement penalty in real games. `useStaleActionTracker` in [`src/ui/hooks/useStaleActionTracker.ts`](../src/ui/hooks/useStaleActionTracker.ts) fixes this: it keeps a persistent tracker per game (keyed by `state.rng.seed`), records every dispatched action (human and AI alike, matching the batch semantics), and `GameScreen` feeds `staleActionCount` and the active player's recent-position history into `chooseDifficultyAwareHeuristicAiAction(...)`. After a page reload of a persisted game the tracker restarts at zero, which is acceptable because it only drives heuristic escalation.

---

## Simulation diagnostics

The project contains explicit simulation diagnostics for measuring AI quality in batch runs. These do not directly choose actions during play, but they document the heuristics the project considers important.

The current issue categories are:

- `stalledTurns`
- `backtrackLoops`
- `missedHealingPriority`
- `missedChestWithKey`
- `missedUpgradeLoot`
- `missedExplorationProgress`
- `missedWinningDragonWindow`
- `avoidableRiskFights`
- `seeressChoiceBlind`
- `witchSwapLowValue`
- `nonTerminatingGame`

These checks are implemented in [`src/ai/simulationDiagnostics.ts`](../src/ai/simulationDiagnostics.ts) and exercised by [`src/ai/simulationDiagnostics.test.ts`](../src/ai/simulationDiagnostics.test.ts).

### Diagnostics measure real mistakes, not intended behavior

The diagnostics deliberately share their yardstick with the agent so they flag actual mistakes rather than the agent's own intentional choices:

- `stalledTurns` ignores an `endTurn` that the agent chose on purpose — waiting for end-of-turn healing, or a fully explored board with no objective-advancing move. It reuses the agent's own `isIntentionalEndTurn(...)` predicate.
- `avoidableRiskFights` excludes the deliberate sub-threshold dragon fight from `shouldForceDragonEndgame(...)`.
- `missedExplorationProgress` uses the agent's `getMonsterMovementDesirabilityThreshold(...)` (a coin-flip in normal play, not the bare combat threshold) and is only raised when a legal exploration-advancing action was actually available and skipped.

Note that `missedExplorationProgress` is reported as a per-game occurrence rate, which saturates toward `1.0` on long games; the per-action count is the more informative measure. Surfacing per-hero, per-action rates in the report is tracked as a separate improvement.

The batch simulation and report pipeline lives in:

- [`src/ai/batchSimulation.ts`](../src/ai/batchSimulation.ts)
- [`src/ai/simulationPipeline.ts`](../src/ai/simulationPipeline.ts)
- [`src/ai/simulationAnalysis.ts`](../src/ai/simulationAnalysis.ts)
- [`src/ai/simulationReport.ts`](../src/ai/simulationReport.ts)

---

## Known current limitations

The following limitations are still present in the current code:

1. **Healing spells are self-focused in normal play.**
   - The normal healing-spell path only casts on the active player. Broader targeting appears only in the desperate fully explored fallback.

2. **Valkyrie reroll behavior is no longer "always reroll".**
   - The old documentation was too simple. The current AI may decline when the projected fight is still below threshold, which is intentional but worth noting because it differs from a pure "always reroll" rule.

3. **Witch swap quality remains heuristic, not globally optimal.**
   - The swap is now objective-aware and value-gated, but it still uses heuristic progress checks rather than deeper search, and it deliberately ignores monster/loot objectives.

4. **The AI still reasons only shallowly about opponents outside a few specific checks.**
   - Opponent-aware logic currently exists for loot races (including whether a rival can even use the item), dragon endgame forcing, score-securing dragon windows, and curse targeting. Most other movement and combat choices remain primarily self-focused.

5. **Movement is greedy and single-step.**
   - `chooseMovementAction` scores one step at a time; there is no bounded look-ahead over the full remaining movement budget yet.

---

## File overview

| File | Purpose |
|------|---------|
| [`src/ai/heuristicAgent.ts`](../src/ai/heuristicAgent.ts) | main heuristic decision logic |
| [`src/ai/config.ts`](../src/ai/config.ts) | difficulty presets and tunable heuristic values |
| [`src/ai/legalActions.ts`](../src/ai/legalActions.ts) | legal action generation per phase |
| [`src/ai/autoplay.ts`](../src/ai/autoplay.ts) | AI turn and full-game execution |
| [`src/ai/simulationDiagnostics.ts`](../src/ai/simulationDiagnostics.ts) | stall tracking and quality diagnostics |
| [`src/ai/difficultyBalance.test.ts`](../src/ai/difficultyBalance.test.ts) | difficulty-specific behavior checks |
| [`src/ai/heuristicAgent.test.ts`](../src/ai/heuristicAgent.test.ts) | decision-level regression coverage |
| [`src/ai/simulationDiagnostics.test.ts`](../src/ai/simulationDiagnostics.test.ts) | diagnostics and stale-action regression coverage |
