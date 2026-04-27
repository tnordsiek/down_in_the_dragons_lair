# RULE_EDGE_CASES.md

# Down in the Dragon's Lair – Rule Edge Cases

This document collects rule edge cases that are especially important for implementation.

This document is normative for edge-case behavior, timing clarifications, and conflict resolution where `GAME_RULES.md` is intentionally high-level or underspecified. It does not define product scope or technical architecture.

## Status
Accepted working specification for implementation unless superseded by a later documented decision.

## Purpose
The game is rule-driven and turn-based. Many implementation bugs are likely to occur not in the main rules, but in timing, exception handling, and interactions between hero abilities, combat, exploration, equipment, healing, curse, and end-game resolution.

This document defines the intended behavior for these edge cases so Codex can implement deterministic and testable logic.

---

## 1. Exploration: announced direction before tile draw

### Situation
A player wants to move from an existing tile into an unexplored neighboring coordinate.

### Current best rule proposal
The player must first choose a legal direction from the current tile. A direction is legal if:
- the current tile has an opening on that side, and
- the target coordinate is empty.

Only after that direction is chosen is the next tile drawn from the tile stack.

### Implementation note
The engine should expose legal unexplored directions before drawing any tile.

---

## 2. Exploration: drawn tile rotation

### Situation
A tile is drawn after the player has announced a legal unexplored direction.

### Current best rule proposal
The player may rotate the drawn tile to any orientation that connects back to the tile the hero moved from.

The newly placed tile only needs to connect to the origin tile. Other sides may form dead ends or walls against neighboring tiles.

### Implementation note
The engine should compute all valid rotations for the drawn tile. The UI should present those choices if more than one rotation is possible.

---

## 3. Exploration: no legal rotation exists

### Situation
A tile is drawn, but none of its rotations can connect to the origin tile.

### Current best rule proposal
This should be treated as an exceptional but recoverable engine case. The tile is put aside temporarily, another tile is drawn, and the engine repeats until a placeable tile is found.

After placement, all skipped tiles are shuffled back into the remaining tile stack.

### Rationale
The physical game usually avoids this issue through tile geometry and draw probabilities, but a digital implementation needs a deterministic fallback.

### Implementation note
This behavior must be logged in debug mode but does not need to be surfaced prominently to the player.

---

## 4. Exploration: room token timing

### Situation
A newly placed tile is a room.

### Current best rule proposal
A bag token is drawn immediately after the hero enters the newly placed room.

Possible outcomes:
- monster token: the monster appears and combat starts immediately.
- treasure chest token: the chest is placed in the room.

### Implementation note
Room token draw happens only when the room tile is discovered for the first time.

---

## 5. Exploration: tunnel, healing, teleport token timing

### Situation
A newly placed tile is not a room.

### Current best rule proposal
No monster or treasure token is drawn on tunnel, healing, teleport, or start tiles.

### Implementation note
Only tiles with category `room` trigger bag token draw.

---

## 6. Movement: entering occupied tiles

### Situation
A hero moves onto a tile containing another hero.

### Current best rule proposal
Multiple heroes may occupy the same tile.

### Implementation note
Hero tokens do not block movement.

---

## 7. Movement: entering a room with an undefeated monster

### Situation
A hero enters a room containing an undefeated monster.

### Current best rule proposal
The hero must stop and fight immediately, unless a hero ability explicitly allows otherwise.

The main known exception is the stealth-like ability of the thief archetype.

### Implementation note
The engine should treat monster presence as a movement blocker for normal heroes.

---

## 8. Movement: passing through a room with an undefeated monster

### Situation
A hero wants to move through a room containing an undefeated monster.

### Current best rule proposal
Normal heroes cannot pass through. They must fight when entering.

The thief archetype may choose to ignore the monster and continue moving if steps remain.

---

## 9. Movement: walls and discovered tiles

### Situation
A hero moves between already discovered tiles.

### Current best rule proposal
Movement requires matching openings on both adjacent tiles.

The wizard archetype may move through walls on already discovered tiles when not cursed.

### Implementation note
The wizard's wall movement should not apply to exploration into undiscovered coordinates. It applies only to movement among discovered tiles.

---

## 10. Turn end after combat

### Situation
A combat is resolved.

### Current best rule proposal
A combat normally ends the active player's turn immediately.

Exceptions:
- the swordsman archetype may continue after combat if his relevant continuation ability triggers.
- other explicit hero abilities may override this if added in later expansions.

### Implementation note
Combat resolution should return a `turnEnds` flag.

---

## 11. Combat: victory condition

### Situation
A hero fights a monster.

### Current best rule proposal
The hero defeats the monster only if total combat strength is strictly greater than the monster strength.

If total strength equals monster strength, the result is a draw.

### Implementation note
Do not use `>=` for victory.

---

## 12. Combat: draw result

### Situation
The hero's total combat strength equals the monster strength.

### Current best rule proposal
The hero does not defeat the monster and does not lose health. The hero retreats to the tile from which they entered the monster tile, unless a hero ability changes the outcome.

The thief archetype turns combat draws into victories when not cursed.

---

## 13. Combat: defeat result

### Situation
The hero's total combat strength is lower than the monster strength.

### Current best rule proposal
The hero loses 1 health and retreats to the tile from which they entered the monster tile.

The monster remains in place.

---

## 14. Combat: retreat target

### Situation
A hero must retreat after draw or defeat.

### Current best rule proposal
The hero retreats to the previous tile from which they entered the monster tile.

If that previous tile is a healing tile, healing is resolved according to healing rules.

### Implementation note
The engine must remember `enteredFromCoordinate` for each combat.

---

## 15. Combat: using Ember Spell / Ember Spell

### Situation
A hero has one or more combat spell tokens.

### Current best rule proposal
Combat spells may be used after the dice roll to increase combat strength by +1 each.

Multiple combat spells may be used in the same combat.

For the wizard archetype, used combat spells are not consumed while the wizard is not cursed.

---

## 16. Combat: weapon bonuses

### Situation
A hero has one or more weapons equipped.

### Current best rule proposal
All equipped weapon bonuses count toward combat strength.

Inventory limits still apply: at most 2 weapons may be carried.

---

## 17. Combat: warlock sacrifice timing

### Situation
The warlock archetype can sacrifice health for +1 combat strength.

### Current best rule proposal
The sacrifice may be used after the dice roll and after seeing current combat total. It may be used at most once per combat.

The sacrifice can reduce the hero to 0 health. If this happens, the combat bonus still applies, but the hero will be unconscious on the next turn unless another rule heals him before then.

---

## 18. Combat: warrior reroll timing

### Situation
The warrior archetype loses a combat roll.

### Current best rule proposal
The warrior may reroll both dice once. If he chooses to reroll, the first result is ignored, no health is lost from that first lost result, and the second result must be accepted.

---

## 19. Combat: swordsman reroll of ones

### Situation
The swordsman archetype rolls one or more 1s.

### Current best rule proposal
Each die showing 1 may be rerolled until it shows a value greater than 1.

The final dice result after resolving this ability is used for combat and for checking whether a 6 was rolled.

---

## 20. Combat: swordsman continuation on six

### Situation
The swordsman archetype rolls at least one 6 in combat.

### Current best rule proposal
If not cursed, the swordsman may continue his turn after combat instead of ending it, provided he has steps remaining or has a legal follow-up action.

If the combat ended in draw or defeat, he may attack the same monster again instead.

### Open review point
Confirm whether continuation is mandatory or optional in the intended UI. Current proposal: optional.

---

## 21. Rewards: equipment pickup after defeating monster

### Situation
A monster is defeated and yields equipment or treasure.

### Current best rule proposal
The reward becomes available immediately. The hero may take it if inventory capacity allows. If not, the player must choose what to keep and what to leave on the tile.

### Implementation note
Reward pickup after combat is part of combat resolution and should happen before turn end.

---

## 22. Inventory: exceeding capacity

### Situation
A hero receives or finds more equipment than they can carry.

### Current best rule proposal
The player chooses which items to keep. Excess items are left on the current tile and may be picked up later by any hero.

### Inventory limits
- 2 weapon slots
- 3 spell slots
- 1 key slot

---

## 23. Inventory: key limit

### Situation
A hero already has a key and defeats another `skeleton_turnkey`.

### Current best rule proposal
The hero may carry only one key. The new key may be left on the current tile or replace the existing key, though both keys are mechanically identical.

### Implementation note
Because keys are identical, UI may simply leave the new key on the tile if the key slot is full.

---

## 24. Treasure chest: opening condition

### Situation
A hero is on a tile with a locked treasure chest.

### Current best rule proposal
The hero may open the chest only if they have a key and end their movement on the chest tile.

Opening consumes the key and gives the hero one treasure worth 1 victory point.

Opening a chest ends the turn.

---

## 25. Treasure chest: discovered without key

### Situation
A treasure chest is drawn when discovering a room, but the hero has no key.

### Current best rule proposal
The chest remains on that room tile. It may be opened later by any hero with a key who ends movement on that tile.

---

## 26. Healing: healing tile effect

### Situation
A hero ends movement on a healing tile or the start tile.

### Current best rule proposal
The hero may heal to full health and remove curse if cursed.

Healing ends the turn.

### Open review point
Confirm whether healing is mandatory or optional. Current proposal: optional, but UI should strongly suggest it when useful.

---

## 27. Healing: start tile

### Situation
A hero is on the start tile.

### Current best rule proposal
The start tile has full healing functionality.

No room token is ever drawn on the start tile.

---

## 28. Fountain Charm / Fountain Charm

### Situation
A hero uses the healing portal spell.

### Current best rule proposal
The spell may target the active hero or another hero. The target is moved to a discovered healing tile, healed to full, and curse is removed if present.

Using the spell costs no movement steps and does not automatically end the active player's turn.

### Open review point
Confirm whether the target healing tile is chosen by the caster or follows a default rule. Current proposal: caster chooses any discovered healing tile.

---

## 29. Teleport tiles

### Situation
A hero is on a teleport tile.

### Current best rule proposal
Once at least two teleport tiles are discovered, a hero may move from one teleport tile to any other discovered teleport tile for 1 step.

With fewer than two discovered teleport tiles, teleport has no effect.

---

## 30. Curse: applying curse after defeating `mummy`

### Situation
A `mummy` is defeated.

### Current best rule proposal
The active player chooses another hero to receive the curse. There can only be one cursed hero at a time. If another hero was cursed, the curse moves to the newly chosen hero.

### Open review point
Confirm whether the active player may choose themself if no other valid target exists. Current proposal: normally choose another hero; if no other hero exists, no curse target changes.

---

## 31. Curse: effect on hero abilities

### Situation
A hero is cursed.

### Current best rule proposal
All hero abilities are disabled while cursed. This includes passive, active, triggered, and replacement abilities.

Equipment and normal rules still work.

---

## 32. Curse: removal

### Situation
A cursed hero heals at a healing tile or through a healing portal spell.

### Current best rule proposal
The curse is removed as part of healing.

---

## 33. Unconscious state

### Situation
A hero reaches 0 health.

### Current best rule proposal
The hero becomes unconscious. On their next turn, they skip their normal actions and recover 1 health.

After that skipped turn, they can act normally on their following turn.

### Implementation note
The warrior's reincarnation ability replaces this if not cursed and if triggered by losing the last health in combat.

---

## 34. Warden reincarnation with no discovered healing tile

### Situation
The warrior archetype loses last health before any healing tile other than start is discovered.

### Current best rule proposal
Because the start tile is a healing tile, there is always at least one valid healing destination. The warrior may move to the start tile and heal fully.

---

## 35. Oracle token draw

### Situation
The oracle archetype discovers a room and must draw from the bag.

### Current best rule proposal
If not cursed, the oracle draws 2 tokens, chooses 1 to resolve, and returns the other to the bag.

If only 1 token remains, she draws and resolves that single token.

---

## 36. Bag exhaustion

### Situation
A room is discovered but the monster/treasure bag is empty.

### Current best rule proposal
No token is placed. The room remains empty.

### Implementation note
This is unlikely but should be supported to avoid crashes.

---

## 37. Tile stack exhaustion

### Situation
A hero attempts to explore but the tile stack is empty.

### Current best rule proposal
The hero cannot move into unexplored coordinates. Only movement through discovered tiles remains possible.

---

## 38. `dragon` defeat and game end

### Situation
The dragon is defeated.

### Current best rule proposal
The game ends immediately after assigning the dragon treasure worth 1.5 victory points to the defeating hero.

No further actions, movement, pickups, or turns occur.

---

## 39. Final scoring

### Situation
The dragon has been defeated.

### Current best rule proposal
Each hero's victory points are summed from:
- treasure chests: 1 point each
- `fallen` treasure: 1 point each
- dragon treasure: 1.5 points

The hero or heroes with the highest score win.

Ties are shared victories.

---

## 40. Determinism and logs

### Situation
A game is played, saved, resumed, or tested.

### Current best rule proposal
All random outcomes must come from a seeded RNG:
- tile stack order
- bag token order
- dice rolls
- AI tie-breakers

Each rule-relevant state change should create an event log entry.

---

## Review order proposal
Review these edge cases in this order:
1. Exploration and tile placement
2. Movement and turn ending
3. Combat timing
4. Rewards and inventory
5. Healing, teleport, curse, unconscious state
6. Hero-specific exceptions
7. Endgame and scoring
8. Determinism, logging, save/resume
