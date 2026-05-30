export type TutorialVisualId =
  | 'player-cards'
  | 'turn-actions'
  | 'movement'
  | 'exploration'
  | 'tile-rotation'
  | 'room-token'
  | 'combat-dice'
  | 'inventory'
  | 'chest'
  | 'healing'
  | 'turn-order'
  | 'scoreboard';

export type TutorialStep = {
  id: string;
  title: string;
  intro: string;
  bullets?: string[];
  visual?: TutorialVisualId;
};

/**
 * Hero-independent walkthrough of the game flow, basic actions, and recurring
 * events. Content is kept separate from the TutorialScreen layout so it is easy
 * to edit. Wording matches the in-game labels (e.g. "End Turn", "Fight Monster")
 * so new players recognise them once they start a real game.
 */
export const tutorialSteps: TutorialStep[] = [
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
];
