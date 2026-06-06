import type { TutorialStep } from '../ui/tutorialSteps';

export const en = {
  displayNames: {
    heroes: {
      hero_mage: 'Mage',
      hero_valkyrie: 'Valkyrie',
      hero_witch: 'Witch',
      hero_rogue: 'Rogue',
      hero_blade: 'Blade',
      hero_seeress: 'Seeress',
    },
    monsters: {
      kitchen_rat: 'Kitchen Rat',
      creepy_spider: 'Creepy Spider',
      mummified_priest: 'Mummified Priest',
      skeleton_key_guardian: 'Skeleton Key Guardian',
      skeleton_soldier: 'Skeleton Soldier',
      skeleton_lord: 'Skeleton Lord',
      soulburner: 'Soulburner',
      dragon: 'Dragon',
    },
    spells: {
      flame: 'Fireball',
      healing: 'Healing',
    },
    weapons: {
      1: 'Knife +1',
      2: 'Sword +2',
      3: 'Battleaxe +3',
    } as Record<number, string>,
  },

  sideLabels: {
    A: 'North',
    B: 'East',
    C: 'South',
    D: 'West',
  },

  items: {
    key: 'Key',
    spellSuffix: 'spell',
  },

  tooltips: {
    monsterStrength: (name: string, strength: number) =>
      `${name}: Strength ${strength}`,
    treasureChest: 'Treasure Chest: Opens with a key',
    weaponBonus: (label: string, bonus: number) =>
      `${label}: Combat bonus +${bonus}`,
    fireballSpell: 'Fireball Spell: Adds +1 combat strength',
    healingSpell:
      'Healing Spell: Teleports a hero to a discovered healing tile',
    key: 'Key: Opens a treasure chest',
    heroPortrait:
      'Right-click to center the map on this hero. Left-click to enlarge the portrait and read the hero description.',
  },

  settingsMenu: {
    music: (on: boolean) => `Music ${on ? 'on' : 'off'}`,
    sound: (on: boolean) => `Sound ${on ? 'on' : 'off'}`,
    movementPoints: (on: boolean) =>
      `Movement Points ${on ? 'on' : 'off'}`,
    difficulty: 'Difficulty',
    easy: 'Easy',
    normal: 'Normal',
    hard: 'Hard',
    newGame: 'New Game',
    language: 'Language',
    openSettings: 'Open settings menu',
    closeSettings: 'Close settings menu',
  },

  playerLabels: {
    human: 'Human',
    aiN: (n: number) => `AI ${n}`,
    playerN: (n: number) => `Player ${n}`,
  },

  startScreen: {
    tagline: 'Choose a hero, set the opposition, and enter the dungeon...',
    howToPlay: 'How to Play',
    savedGame: 'Saved game available',
    resumeGame: 'Resume Game',
    discardSave: 'Discard Save',
    chosenHero: 'Chosen Hero',
    gameSetup: 'Game Setup',
    gameMode: 'Game Mode',
    solo: 'Solo (vs. AI)',
    hotseat: 'Hotseat (2-5 players)',
    humanPlayers: 'Human Players',
    heroes: 'Heroes',
    playerN: (n: number) => `Player ${n}`,
    playerNHero: (n: number) => `Player ${n} hero`,
    hero: 'Hero',
    aiOpponents: 'AI Opponents',
    difficulty: 'Difficulty',
    opponentSelection: 'Opponent Selection',
    randomOpponents: 'Random Opponents',
    chooseOpponents: 'Choose Opponents',
    opponents: (selected: number, total: number) =>
      `Opponents (${selected}/${total})`,
    opponentsHint:
      'Any unselected opponents will be filled at random from the remaining heroes.',
    showAdvancedSetup: 'Show Advanced Setup',
    hideAdvancedSetup: 'Hide Advanced Setup',
    tokenAndTileFactor: 'Token and Tile Factor',
    poolScaleHint:
      'Counts are rounded up. The dragon always remains unique.',
    seed: 'Seed',
    randomize: 'Randomize',
    duplicateHeroError: 'Each player must choose a unique hero.',
    startGame: 'Start Game',
    startNewGame: 'Start New Game',
    abilityLabel: (n: number) => `Ability ${n}`,
    attributionCode: 'Code powered by Codex & Claude',
    attributionGraphics: 'Graphics powered by Nano Banana',
    attributionConcept: 'Concept and AI Direction by fnord GAMES (2026)',
  },

  heroAbilities: {
    hero_mage: [
      'Fireball spells are not consumed.',
      'May move through walls on discovered tiles.',
    ],
    hero_valkyrie: [
      'May reroll both combat dice once after a draw or defeat.',
      'Losing the last HP sends the Valkyrie to a healing tile.',
    ],
    hero_witch: [
      'May sacrifice 1 HP for +1 combat strength in a fight.',
      'May swap position with another player at turn start.',
    ],
    hero_rogue: [
      'Combat draws count as wins.',
      'May ignore monsters while moving.',
    ],
    hero_blade: [
      'Rerolls every die showing 1 until none remain.',
      'A final rolled 6 keeps the turn open for remaining movement and actions.',
    ],
    hero_seeress: [
      'Draws two room tokens and chooses one.',
      'Gains +1 combat strength in a fight after the first step is spent.',
    ],
  } as Record<string, [string, string]>,

  tutorialScreen: {
    title: 'How to Play',
    exitTutorial: 'Exit Tutorial',
    stepOf: (current: number, total: number) =>
      `Step ${current} of ${total}`,
    back: 'Back',
    backToStart: 'Back to Start',
    next: 'Next',
  },

  tutorialSteps: [
    {
      id: 'overview',
      title: 'Goal & Overview',
      intro:
        'Down in the Dragon’s Lair is a turn-based dungeon crawl for you and up to four AI opponents. You explore the dungeon tile by tile, fight monsters, and collect treasure.',
      bullets: [
        'The game ends the moment the ancient Dragon is defeated.',
        'When it ends, the hero holding the most treasure points wins — not necessarily the dragon slayer.',
        'Each hero starts with 5 HP and an empty inventory.',
      ],
      visual: 'player-cards',
    },
    {
      id: 'your-turn',
      title: 'Your Turn',
      intro:
        'Turn order is decided by a dice roll-off at the start of the game. On your turn you have 4 movement points (“steps”) to spend.',
      bullets: [
        'Most actions — moving and exploring — cost 1 step each.',
        'The Actions panel shows the current phase and your remaining steps.',
        'Press “End Turn” once you are done, or when you run out of steps.',
      ],
      visual: 'turn-actions',
    },
    {
      id: 'moving',
      title: 'Moving',
      intro:
        'You move across already-discovered tiles. Click an adjacent reachable tile to move there; each move spends 1 step.',
      bullets: [
        'Walls and undiscovered edges block movement.',
        'Some tiles contain portals that let you teleport across the board.',
        'Use “Center Map” to recentre the view on your hero at any time.',
      ],
      visual: 'movement',
    },
    {
      id: 'exploring',
      title: 'Exploring',
      intro:
        'To grow the dungeon, explore in a direction from your tile. This draws the next tile from the tile stack and costs 1 step.',
      bullets: [
        'Choose one of the open directions leading into unexplored space.',
        'The drawn tile appears as a preview that you place next.',
      ],
      visual: 'exploration',
    },
    {
      id: 'placing-tile',
      title: 'Placing a Tile',
      intro:
        'A freshly drawn tile is shown as a preview on the board. Rotate it until its corridors line up the way you want, then confirm.',
      bullets: [
        'Use the rotation controls to turn the preview tile.',
        'Click the centre of the tile to confirm placement.',
        'Once placed, the tile becomes a permanent part of the dungeon.',
      ],
      visual: 'tile-rotation',
    },
    {
      id: 'rooms-tokens',
      title: 'Rooms & Tokens',
      intro:
        'When you place or enter a room tile, a token is drawn from the bag. It is either a monster guarding the room or a treasure chest.',
      bullets: [
        'A monster forces a fight before you can claim the room.',
        'A chest can be opened later with a key.',
        'Monsters range from a Kitchen Rat (strength 5) up to the Dragon (strength 15).',
      ],
      visual: 'room-token',
    },
    {
      id: 'combat',
      title: 'Combat',
      intro:
        'Combat is resolved by rolling 2d6 and adding your weapon bonuses. Your total must beat the monster’s strength to win.',
      bullets: [
        'Total greater than the monster’s strength → victory.',
        'Equal total → draw; lower total → defeat.',
        'A draw or defeat costs HP. Losing your last HP knocks the hero unconscious — you must skip your next turn and then recover.',
        'Some monsters have extra effects, e.g. the Mummified Priest curses another player when defeated.',
      ],
      visual: 'combat-dice',
    },
    {
      id: 'loot',
      title: 'Loot',
      intro:
        'After defeating a monster you resolve its loot — usually a weapon or a spell. Stronger weapons raise your combat bonus.',
      bullets: [
        'Take the loot to add it to your inventory.',
        'Leave it on the tile to pick up later.',
        'If your inventory is full, swap the new item for one you already carry.',
      ],
      visual: 'inventory',
    },
    {
      id: 'chests-keys',
      title: 'Chests & Keys',
      intro:
        'Treasure chests are locked. Spend a key to open one and gain treasure points — the score that decides the winner.',
      bullets: [
        'Each treasure chest is worth 1 treasure point.',
        'Keys are earned during play; you need one in your inventory to open a chest.',
      ],
      visual: 'chest',
    },
    {
      id: 'healing',
      title: 'Healing',
      intro:
        'You are not stuck with your wounds. The dungeon and your spells can restore lost HP (up to your maximum of 5).',
      bullets: [
        'Standing on a healing tile restores HP automatically at the start of your turn.',
        'A healing spell in your inventory can be used to heal a chosen hero on a healing tile.',
      ],
      visual: 'healing',
    },
    {
      id: 'ending-turn',
      title: 'Ending the Turn & Opponents',
      intro:
        'When your steps run out or you choose to stop, press “End Turn”. Play then passes to the next hero in the turn order.',
      bullets: [
        'AI opponents take their turns automatically; watch the event log to follow what they do.',
        'Play continues around the table until the game ends.',
      ],
      visual: 'turn-order',
    },
    {
      id: 'winning',
      title: 'Winning & Losing',
      intro:
        'The whole game is a race that ends when someone defeats the Dragon (strength 15). At that moment scores are tallied.',
      bullets: [
        'The hero with the most treasure points wins; the Dragon’s hoard is worth 1.5 points to its slayer.',
        'A tie on points results in a shared victory.',
        'There is no permanent death — falling to 0 HP only costs you a turn.',
      ],
      visual: 'scoreboard',
    },
    {
      id: 'ready',
      title: 'Ready to Play',
      intro:
        'That’s the core loop: spend your steps to move and explore, place tiles, resolve rooms, fight monsters, grab loot, and chase treasure until the Dragon falls.',
      bullets: [
        'Each hero also has unique abilities — check the hero preview on the start screen.',
        'Pick a hero, set your opponents, and enter the dungeon. Good luck!',
      ],
    },
  ] as TutorialStep[],

  actionPanel: {
    actions: 'Actions',
    centerMap: 'Center Map',
    endTurn: 'End Turn',
    inProgress: 'In progress',
    noStepsLeft: 'No steps left',
    stepsLeft: (n: number) => `${n} ${n === 1 ? 'step' : 'steps'} left`,
    phaseLabels: {
      turn_start: 'Start turn',
      turn_skip: 'Skip turn',
      await_move: 'Choose action',
      choose_pending_tile_rotation: 'Place tile',
      resolve_room_token: 'Resolve room',
      resolve_room_token_seeress_choice: 'Seeress choice',
      optional_monster_combat: 'Monster encounter',
      combat: 'Combat',
      combat_blade_reroll: 'Blade reroll',
      combat_valkyrie_reroll: 'Valkyrie reroll',
      combat_witch_sacrifice: 'Witch sacrifice',
      combat_flame_spells: 'Fireball choice',
      combat_curse_target: 'Choose curse target',
      loot_resolution: 'Resolve loot',
      optional_post_combat: 'After combat',
      turn_end: 'Turn ending',
      game_over: 'Game over',
    } as Record<string, string>,
    placeTileHint:
      'Rotate the preview tile on the board, then confirm placement in the center of the tile.',
    unconscious: 'Unconscious',
    unconsciousMsg: 'This hero is unconscious and must skip this turn.',
    unconsciousEndTurnHint:
      'End the turn to finish the skipped round and recover afterward.',
    seeressChoice: 'Seeress Choice',
    seeressDrawnTokens: (x: number, y: number) =>
      `Drawn room tokens at ${x},${y}`,
    seeressChooseHint:
      'Choose one token to resolve. The other returns to the bag.',
    seeressOption: (index: number, label: string) =>
      `Choose option ${index}: ${label}`,
    treasureChest: 'Treasure Chest',
    monsterEncounter: 'Monster Encounter',
    monsterStrength: (name: string, strength: number) =>
      `${name} strength ${strength}`,
    monsterEncounterRogue:
      'The Rogue may ignore this monster, move on, stay here, or start combat.',
    fightMonster: 'Fight Monster',
    resolveCombat: 'Resolve Combat',
    combatFormula: (
      weaponBonus: number,
      seeressBonus: boolean,
      flameCount: number,
      strength: number,
    ) =>
      `2d6 + weapons +${weaponBonus}${seeressBonus ? ' + Seeress Sight +1' : ''} + fireball spells (${flameCount} available) must beat ${strength}`,
    mummifiedPriestCurse: 'Mummified Priest Curse',
    mummifiedPriestCurseMsg: (monsterName: string) =>
      `${monsterName} defeated. Choose another hero to receive the curse.`,
    valkyrieReroll: 'Valkyrie Reroll',
    rolledDetails: (
      d1: number,
      d2: number,
      weapons: number,
      total: number,
      outcome: string,
    ) =>
      `Rolled ${d1} + ${d2} + weapons ${weapons} = ${total} and currently face ${outcome}`,
    rerollBothDice: 'Reroll both dice',
    keepThisResult: 'Keep this result',
    bladeReroll: 'Blade Reroll',
    currentDice: (d1: number, d2: number, hasOnes: boolean) =>
      `Current dice ${d1} + ${d2}${hasOnes ? ' · reroll every die showing 1' : ''}`,
    bladeCurrentResult: (
      d1: number,
      d2: number,
      weapons: number,
      total: number,
      outcome: string,
    ) =>
      `Current result ${d1} + ${d2} + weapons ${weapons} = ${total} and currently faces ${outcome}`,
    rerollOnes: 'Reroll 1s',
    witchSacrifice: 'Witch Sacrifice',
    sacrifice1HP: 'Sacrifice 1 HP for +1',
    fireballSpells: 'Fireball Spells',
    fireballFormula: (
      d1: number,
      d2: number,
      weapons: number,
      sacrifice: number,
      total: number | undefined,
      outcome: string | undefined,
    ) => {
      const base = `Rolled ${d1} + ${d2} + weapons ${weapons}`;
      const sac = sacrifice > 0 ? ` + sacrifice ${sacrifice}` : '';
      const eq = total !== undefined ? ` = ${total}` : '';
      const out = outcome ? ` and currently face ${outcome}` : '';
      return `${base}${sac}${eq}${out}`;
    },
    doNotUseFireballs: 'Do not use fireball spells',
    useFireballSpells: (n: number) =>
      `Use ${n} Fireball Spell${n === 1 ? '' : 's'}`,
    witchSwap: 'Witch Swap',
    swapPosition: 'Swap Position',
    witchSwapHint: 'Choose another hero to swap positions with.',
    cancel: 'Cancel',
    openChest: 'Open Chest',
    loot: 'Loot',
    take: 'Take',
    takeItem: (label: string) => `Take ${label}`,
    leave: 'Leave',
    swapWeapon: (name: string) => `Swap ${name}`,
    swapSpell: (spellName: string) => `Swap ${spellName} spell`,
    healingSpell: 'Healing Spell',
    useHealingSpell: 'Use Healing Spell',
    healingSpellTargetHint:
      'Choose which hero to teleport to a discovered healing tile.',
    healingSpellTileHint: (heroName: string) =>
      `Choose a discovered healing tile for ${heroName}.`,
    move: 'Move',
    portal: 'Portal',
    noKnownPortalTarget: 'No known portal target',
    explore: 'Explore',
    combatOutcomes: {
      victory: 'victory',
      draw: 'draw',
      defeat: 'defeat',
    } as Record<string, string>,
  },

  endScreen: {
    victory: 'Victory!',
    gameOver: 'Game Over',
    sharedVictory: 'Shared Victory',
    winner: 'Winner',
    and: 'and',
    dragonSlayer: 'Dragon Slayer',
    dragonTreasureNote:
      "Dragon treasure worth 1.5 points is included in the final score.",
    pts: 'pts',
    newGame: 'New Game',
  },

  eventLog: {
    title: 'Log',
    system: 'System',
    actions: {
      moved: (x: number, y: number) => `Moved to ${x},${y}`,
      explored: (direction: string) => `Explored ${direction}`,
      rotatedPreview: (direction: string) => `Rotated preview ${direction}`,
      placedTile: (rotation: number) => `Placed tile at ${rotation} degrees`,
      startedCombat: 'Started combat',
      openedChest: 'Opened chest',
      startedLoot: 'Started loot',
      tookLoot: 'Took loot',
      leftLoot: 'Left loot on tile',
      swappedLoot: 'Swapped loot',
      usedHealingSpell: 'Used healing spell',
      swappedWitchTo: (heroName: string, x: number, y: number) =>
        `Swapped with ${heroName} to ${x},${y}`,
      swappedWitch: 'Swapped witch position',
      endedTurn: 'Ended turn',
    },
    drewTile: (blueprintId: string) => `Drew ${blueprintId} for exploration`,
    placedTilePrimary: (blueprintId: string) => `Placed ${blueprintId}`,
    resolvedCombat: (outcome: string) => {
      const labels: Record<string, string> = {
        victory: 'Victory',
        draw: 'Draw',
        defeat: 'Defeat',
      };
      return `Resolved combat: ${labels[outcome] ?? outcome}`;
    },
    resolvedRoomFound: (name: string) => `Resolved room: found ${name}`,
    treasureChest: 'Treasure Chest',
    takesFirstTurn: (heroName: string) => `${heroName} takes the first turn`,
    combatSummary: (
      name: string,
      strength: number,
      d1: number,
      d2: number,
      total: number,
    ) => `${name} strength ${strength} · dice ${d1} + ${d2} · total ${total}`,
    startRolls: 'Start rolls',
    tiebreak: (n: number) => `Tiebreak ${n}`,
    detail: {
      fromToVia: (
        ox: number,
        oy: number,
        tx: number,
        ty: number,
        direction: string,
        rotations: string,
      ) =>
        `From ${ox},${oy} to ${tx},${ty} via ${direction} · legal rotations ${rotations}`,
      placedAtRotation: (tx: number, ty: number, rotation: string) =>
        `Placed at ${tx},${ty} with rotation ${rotation}`,
      skipped: (ids: string) => ` · skipped ${ids}`,
      foundAt: (label: string, x: number, y: number) =>
        `Found ${label} at ${x},${y}`,
      seeressDrew: (labels: string) => ` · Seeress drew ${labels}`,
      seeressChose: (n: number) => ` · Seeress chose option ${n}`,
    },
    breakdown: {
      weapons: (n: number) => `weapons +${n}`,
      flame: (n: number) => `flame +${n}`,
      seeress: (n: number) => `seeress +${n}`,
      witchSacrifice: (n: number) => `witch sacrifice +${n}`,
      curseTo: (label: string) => `curse -> ${label}`,
      retreatedTo: (x: number, y: number) => `retreated to ${x},${y}`,
    },
  },

  playerPanel: {
    title: 'Players',
    hp: (hp: number, maxHp: number) => `HP ${hp}/${maxHp}`,
    healthTitle: (hp: number, maxHp: number) => `Health: ${hp} of ${maxHp}`,
    active: 'Active',
    activeTitle: 'Current active player',
    atk: (bonus: number) => `ATK +${bonus}`,
    atkTitle: (bonus: number) => `Current weapon bonus: +${bonus}`,
    fireballInfinite: 'Fireball ∞',
    fireballInfiniteTitle: 'Mage: fireball spells are not consumed',
    fireballCount: (n: number) => `Fireball ${n}`,
    fireballCountTitle: (n: number) => `Available fireball spells: ${n}`,
    keyLabel: (n: number) => `Key ${n}`,
    keyTitle: (n: number) => `Keys carried: ${n}`,
    weapons: 'Weapons',
    weaponsTitle: (n: number) => `Weapons carried: ${n}`,
    spells: 'Spells',
    spellsTitle: (n: number) => `Spells carried: ${n}`,
    pts: (n: number) => `${n} pts`,
    ptsTitle: (n: number) => `Treasure points: ${n}`,
    cursed: 'cursed',
    cursedTitle: 'Cursed: hero abilities are inactive',
    unconscious: 'unconscious',
    unconsciousTitle: 'Unconscious: this player skips the next turn',
    heroAbilities: {
      hero_mage:
        'Fireball spells are not consumed. The Mage may move through walls on discovered tiles.',
      hero_valkyrie:
        'May reroll both combat dice once after a draw or defeat. Losing the last HP sends the Valkyrie to a healing tile.',
      hero_witch:
        'May sacrifice 1 HP for +1 combat strength in a fight. May swap position with another player at turn start.',
      hero_rogue:
        'Combat draws count as wins. The Rogue may ignore monsters while moving.',
      hero_blade:
        'After a combat roll, rerolls every die showing 1 until none remain. Each combat with a final rolled 6 keeps the turn open for remaining movement and follow-up actions.',
      hero_seeress:
        'Draws two room tokens and chooses one. Gains +1 combat strength in a fight after the first step is spent.',
    } as Record<string, string>,
    enlargePortrait: (name: string) => `${name} portrait actions`,
    enlargeItem: (label: string) => `Enlarge ${label}`,
  },

  feedbackModal: {
    title: 'Feedback & Bug Report',
    description:
      'Found a bug or have an idea? Write a short note below. Pressing “Open e-mail” prepares a message in your e-mail app — nothing is sent until you send it yourself.',
    messageLabel: 'Your message',
    messagePlaceholder: 'Describe the bug or share your feedback...',
    emailLabel: 'Your e-mail (optional, for replies)',
    emailPlaceholder: 'you@example.com',
    diagnosticsLabel: 'Include technical game diagnostics for analysis',
    diagnosticsNote:
      'Optional and entirely voluntary. If checked, a short technical snapshot of your current game is added to the message: app version, random seed, current phase, players and their heroes, and the most recent in-game events. No personal data is collected. Leave it unchecked to send only your message.',
    cancel: 'Cancel',
    openEmail: 'Open e-mail',
    closeForm: 'Close feedback form',
  },

  footerMeta: {
    imprint: 'Imprint',
    privacyPolicy: 'Privacy Policy',
    bugReport: 'Bug Report',
    loading: 'Loading legal notice...',
    loadError: 'Unable to load this legal notice right now.',
    closeSection: (name: string) => `Close ${name}`,
  },

  hotseatHandoff: {
    passDevice: 'Pass the device',
    playerN: (n: number) => `Player ${n}`,
    skipTurn: 'This hero is unconscious and will skip this turn.',
    startTurn: 'Start turn',
  },

  gameScreen: {
    startPlayerRollOff: 'Starting Player Roll-Off',
    beginsTheGame: (heroName: string) => `${heroName} begins the game`,
    clickToContinue: 'Click anywhere to begin',
    initialRoll: 'Initial Roll',
    tiebreak: (n: number) => `Tiebreak ${n}`,
    initialRollResults: 'Initial roll results',
    tiebreakResults: (n: number) => `Tiebreak ${n} roll results`,
    player: 'Player',
    hero: 'Hero',
    roll: 'Roll',
    turnOrder: 'Turn Order',
    turnOrderCaption: 'Turn order',
    rankColumn: '#',
  },

  boardView: {
    treasureChest: 'Treasure chest',
    noKnownPortalTarget: 'No known portal target',
  },
};

export type Translations = typeof en;
