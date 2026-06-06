import type { Translations } from './en';

export const de: Translations = {
  displayNames: {
    heroes: {
      hero_mage: 'Magierin',
      hero_valkyrie: 'Walküre',
      hero_witch: 'Hexe',
      hero_rogue: 'Schurkin',
      hero_blade: 'Klinge',
      hero_seeress: 'Seherin',
    },
    monsters: {
      kitchen_rat: 'Küchenratte',
      creepy_spider: 'Schaurige Spinne',
      mummified_priest: 'Mumifizierter Priester',
      skeleton_key_guardian: 'Skelett-Schlüsselwächter',
      skeleton_soldier: 'Skelett-Soldat',
      skeleton_lord: 'Skelett-Lord',
      soulburner: 'Seelenbrenner',
      dragon: 'Drache',
    },
    spells: {
      flame: 'Feuerball',
      healing: 'Heilung',
    },
    weapons: {
      1: 'Messer +1',
      2: 'Schwert +2',
      3: 'Streitaxt +3',
    },
  },

  sideLabels: {
    A: 'Nord',
    B: 'Ost',
    C: 'Süd',
    D: 'West',
  },

  items: {
    key: 'Schlüssel',
    spellSuffix: 'Zauber',
  },

  tooltips: {
    monsterStrength: (name: string, strength: number) =>
      `${name}: Stärke ${strength}`,
    treasureChest: 'Schatztruhe: Öffnet sich mit einem Schlüssel',
    weaponBonus: (label: string, bonus: number) =>
      `${label}: Kampfbonus +${bonus}`,
    fireballSpell: 'Feuerball-Zauber: Gibt +1 Kampfstärke',
    healingSpell:
      'Heilzauber: Teleportiert einen Helden zu einem entdeckten Heilungsfeld',
    key: 'Schlüssel: Öffnet eine Schatztruhe',
    heroPortrait:
      'Rechtsklick zum Zentrieren der Karte auf diesen Helden. Linksklick zum Vergrößern des Porträts und Lesen der Heldenbeschreibung.',
  },

  settingsMenu: {
    music: (on: boolean) => `Musik ${on ? 'an' : 'aus'}`,
    sound: (on: boolean) => `Sound ${on ? 'an' : 'aus'}`,
    movementPoints: (on: boolean) =>
      `Schrittanzeige ${on ? 'an' : 'aus'}`,
    difficulty: 'Schwierigkeit',
    easy: 'Leicht',
    normal: 'Normal',
    hard: 'Schwer',
    newGame: 'Neues Spiel',
    language: 'Sprache',
    openSettings: 'Einstellungen öffnen',
    closeSettings: 'Einstellungen schließen',
  },

  playerLabels: {
    human: 'Mensch',
    aiN: (n: number) => `KI ${n}`,
    playerN: (n: number) => `Spieler ${n}`,
  },

  startScreen: {
    tagline:
      'Wähle einen Helden, stelle die Gegner ein und betritt den Kerker...',
    howToPlay: 'Spielregeln',
    savedGame: 'Gespeichertes Spiel vorhanden',
    resumeGame: 'Weiterspielen',
    discardSave: 'Speicherstand löschen',
    chosenHero: 'Gewählter Held',
    gameSetup: 'Spieleinstellungen',
    gameMode: 'Spielmodus',
    solo: 'Solo (vs. KI)',
    hotseat: 'Hotseat (2-5 Spieler)',
    humanPlayers: 'Menschliche Spieler',
    heroes: 'Helden',
    playerN: (n: number) => `Spieler ${n}`,
    playerNHero: (n: number) => `Held von Spieler ${n}`,
    hero: 'Held',
    aiOpponents: 'KI-Gegner',
    difficulty: 'Schwierigkeit',
    opponentSelection: 'Gegnerwahl',
    randomOpponents: 'Zufällige Gegner',
    chooseOpponents: 'Gegner wählen',
    opponents: (selected: number, total: number) =>
      `Gegner (${selected}/${total})`,
    opponentsHint:
      'Nicht ausgewählte Gegner werden zufällig aus den verbleibenden Helden ergänzt.',
    showAdvancedSetup: 'Erweiterte Einstellungen anzeigen',
    hideAdvancedSetup: 'Erweiterte Einstellungen verbergen',
    tokenAndTileFactor: 'Karten- und Chip-Faktor',
    poolScaleHint:
      'Anzahlen werden aufgerundet. Der Drache bleibt immer einmalig.',
    seed: 'Startwert',
    randomize: 'Zufällig',
    duplicateHeroError:
      'Jeder Spieler muss einen einzigartigen Helden wählen.',
    startGame: 'Spiel starten',
    startNewGame: 'Neues Spiel starten',
    abilityLabel: (n: number) => `Fähigkeit ${n}`,
    attributionCode: 'Code powered by Codex & Claude',
    attributionGraphics: 'Graphics powered by Nano Banana',
    attributionConcept: 'Concept and AI Direction by fnord GAMES (2026)',
  },

  heroAbilities: {
    hero_mage: [
      'Feuerball-Zauber werden nicht verbraucht.',
      'Darf auf entdeckten Feldern durch Wände gehen.',
    ],
    hero_valkyrie: [
      'Darf nach einem Unentschieden oder einer Niederlage beide Kampfwürfel einmal neu würfeln.',
      'Verliert die Walküre ihren letzten LP, wird sie auf ein Heilungsfeld geschickt.',
    ],
    hero_witch: [
      'Darf in einem Kampf 1 LP opfern, um +1 Kampfstärke zu erhalten.',
      'Darf zu Beginn des Zuges mit einem anderen Spieler die Position tauschen.',
    ],
    hero_rogue: [
      'Unentschieden im Kampf gelten als Siege.',
      'Darf beim Bewegen Monster ignorieren.',
    ],
    hero_blade: [
      'Würfelt nach einem Kampfwurf jede gewürfelte 1 neu, bis keine mehr übrig sind.',
      'Ein abschließend gewürfelter 6 hält den Zug für verbleibende Bewegung und Aktionen offen.',
    ],
    hero_seeress: [
      'Zieht zwei Raumchips und wählt einen aus.',
      'Erhält +1 Kampfstärke in einem Kampf, nachdem der erste Schritt ausgegeben wurde.',
    ],
  },

  tutorialScreen: {
    title: 'Spielregeln',
    exitTutorial: 'Tutorial verlassen',
    stepOf: (current: number, total: number) =>
      `Schritt ${current} von ${total}`,
    back: 'Zurück',
    backToStart: 'Zurück zum Start',
    next: 'Weiter',
  },

  tutorialSteps: [
    {
      id: 'overview',
      title: 'Ziel & Überblick',
      intro:
        'Down in the Dragon’s Lair ist ein rundenbasierter Dungeon-Crawler für dich und bis zu vier KI-Gegner. Du erkundest den Kerker Kachel für Kachel, kämpfst gegen Monster und sammelst Schätze.',
      bullets: [
        'Das Spiel endet, sobald der uralte Drache besiegt ist.',
        'Wenn es endet, gewinnt der Held mit den meisten Schatzpunkten — nicht unbedingt der Drachentöter.',
        'Jeder Held startet mit 5 LP und einem leeren Inventar.',
      ],
      visual: 'player-cards',
    },
    {
      id: 'your-turn',
      title: 'Dein Zug',
      intro:
        'Die Zugreihenfolge wird zu Spielbeginn durch einen Würfelwurf festgelegt. In deinem Zug hast du 4 Bewegungspunkte ("Schritte") zu verbrauchen.',
      bullets: [
        'Die meisten Aktionen — Bewegen und Erkunden — kosten je 1 Schritt.',
        'Das Aktionspanel zeigt die aktuelle Phase und deine verbleibenden Schritte.',
        'Drücke "Zug beenden", wenn du fertig bist oder keine Schritte mehr hast.',
      ],
      visual: 'turn-actions',
    },
    {
      id: 'moving',
      title: 'Bewegen',
      intro:
        'Du bewegst dich auf bereits entdeckten Kacheln. Klicke auf eine benachbarte erreichbare Kachel, um dorthin zu gehen; jeder Zug kostet 1 Schritt.',
      bullets: [
        'Wände und unentdeckte Ränder blockieren die Bewegung.',
        'Einige Kacheln enthalten Portale, die dir Teleportation auf dem Spielfeld ermöglichen.',
        'Benutze "Karte zentrieren", um die Ansicht jederzeit auf deinen Helden zu fokussieren.',
      ],
      visual: 'movement',
    },
    {
      id: 'exploring',
      title: 'Erkunden',
      intro:
        'Um den Kerker zu erweitern, erkunde in eine Richtung von deiner Kachel aus. Dabei wird die nächste Kachel vom Stapel gezogen, was 1 Schritt kostet.',
      bullets: [
        'Wähle eine der offenen Richtungen, die in unerkundeten Bereich führen.',
        'Die gezogene Kachel erscheint als Vorschau, die du als nächstes platzierst.',
      ],
      visual: 'exploration',
    },
    {
      id: 'placing-tile',
      title: 'Kachel platzieren',
      intro:
        'Eine frisch gezogene Kachel wird als Vorschau auf dem Spielfeld angezeigt. Drehe sie, bis ihre Gänge so ausgerichtet sind, wie du es möchtest, und bestätige dann.',
      bullets: [
        'Verwende die Drehregler, um die Vorschaukachel zu drehen.',
        'Klicke auf die Mitte der Kachel, um die Platzierung zu bestätigen.',
        'Einmal platziert, wird die Kachel zum dauerhaften Teil des Kerkers.',
      ],
      visual: 'tile-rotation',
    },
    {
      id: 'rooms-tokens',
      title: 'Räume & Chips',
      intro:
        'Wenn du eine Raumkachel platzierst oder betrittst, wird ein Chip aus dem Beutel gezogen. Es ist entweder ein Monster, das den Raum bewacht, oder eine Schatztruhe.',
      bullets: [
        'Ein Monster erzwingt einen Kampf, bevor du den Raum beanspruchen kannst.',
        'Eine Truhe kann später mit einem Schlüssel geöffnet werden.',
        'Monster reichen von einer Küchenratte (Stärke 5) bis zum Drachen (Stärke 15).',
      ],
      visual: 'room-token',
    },
    {
      id: 'combat',
      title: 'Kampf',
      intro:
        'Der Kampf wird durch Würfeln von 2W6 und Addieren deiner Waffenboni entschieden. Dein Gesamtergebnis muss die Stärke des Monsters übertreffen, um zu gewinnen.',
      bullets: [
        'Gesamtergebnis größer als die Stärke des Monsters → Sieg.',
        'Gleiches Ergebnis → Unentschieden; niedrigeres Ergebnis → Niederlage.',
        'Ein Unentschieden oder eine Niederlage kostet LP. Verlierst du deinen letzten LP, wird der Held bewusstlos — du musst deinen nächsten Zug überspringen und dich danach erholen.',
        'Einige Monster haben zusätzliche Effekte, z.B. verflucht der Mumifizierte Priester einen anderen Spieler, wenn er besiegt wird.',
      ],
      visual: 'combat-dice',
    },
    {
      id: 'loot',
      title: 'Beute',
      intro:
        'Nach dem Besiegen eines Monsters erhältst du seine Beute — meist eine Waffe oder einen Zauber. Stärkere Waffen erhöhen deinen Kampfbonus.',
      bullets: [
        'Nimm die Beute, um sie deinem Inventar hinzuzufügen.',
        'Lass sie auf der Kachel liegen, um sie später aufzuheben.',
        'Wenn dein Inventar voll ist, tausche den neuen Gegenstand gegen einen, den du bereits trägst.',
      ],
      visual: 'inventory',
    },
    {
      id: 'chests-keys',
      title: 'Truhen & Schlüssel',
      intro:
        'Schatztruhen sind verschlossen. Gib einen Schlüssel aus, um eine zu öffnen und Schatzpunkte zu erhalten — die Punkte, die den Sieger bestimmen.',
      bullets: [
        'Jede Schatztruhe ist 1 Schatzpunkt wert.',
        'Schlüssel werden im Spiel verdient; du brauchst einen in deinem Inventar, um eine Truhe zu öffnen.',
      ],
      visual: 'chest',
    },
    {
      id: 'healing',
      title: 'Heilung',
      intro:
        'Du bist nicht dauerhaft mit deinen Wunden geschlagen. Der Kerker und deine Zauber können verlorene LP wiederherstellen (bis zu deinem Maximum von 5).',
      bullets: [
        'Das Stehen auf einem Heilungsfeld stellt LP automatisch zu Beginn deines Zuges wieder her.',
        'Ein Heilzauber in deinem Inventar kann verwendet werden, um einen gewählten Helden auf ein Heilungsfeld zu teleportieren.',
      ],
      visual: 'healing',
    },
    {
      id: 'ending-turn',
      title: 'Zug beenden & Gegner',
      intro:
        'Wenn deine Schritte aufgebraucht sind oder du aufhören möchtest, drücke "Zug beenden". Das Spiel geht dann zum nächsten Helden in der Zugreihenfolge über.',
      bullets: [
        'KI-Gegner nehmen ihre Züge automatisch; verfolge das Ereignisprotokoll, um zu sehen, was sie tun.',
        'Das Spiel läuft weiter, bis es endet.',
      ],
      visual: 'turn-order',
    },
    {
      id: 'winning',
      title: 'Gewinnen & Verlieren',
      intro:
        'Das gesamte Spiel ist ein Wettlauf, der endet, wenn jemand den Drachen (Stärke 15) besiegt. In diesem Moment werden die Punkte gezählt.',
      bullets: [
        'Der Held mit den meisten Schatzpunkten gewinnt; der Hort des Drachen ist für seinen Töter 1,5 Punkte wert.',
        'Gleichstand bei Punkten führt zu einem gemeinsamen Sieg.',
        'Es gibt keinen dauerhaften Tod — auf 0 LP zu fallen kostet dich nur einen Zug.',
      ],
      visual: 'scoreboard',
    },
    {
      id: 'ready',
      title: 'Bereit zum Spielen',
      intro:
        'Das ist der Kern des Spiels: gib deine Schritte aus, um dich zu bewegen und zu erkunden, platziere Kacheln, löse Räume auf, kämpfe gegen Monster, schnapp dir Beute und jage Schätze, bis der Drache fällt.',
      bullets: [
        'Jeder Held hat auch einzigartige Fähigkeiten — schau dir die Heldenvorschau auf dem Startbildschirm an.',
        'Wähle einen Helden, stelle deine Gegner ein und betritt den Kerker. Viel Glück!',
      ],
    },
  ],

  actionPanel: {
    actions: 'Aktionen',
    centerMap: 'Karte zentrieren',
    endTurn: 'Zug beenden',
    inProgress: 'Im Gange',
    noStepsLeft: 'Keine Schritte übrig',
    stepsLeft: (n: number) =>
      `${n} ${n === 1 ? 'Schritt' : 'Schritte'} übrig`,
    phaseLabels: {
      turn_start: 'Zug beginnen',
      turn_skip: 'Zug überspringen',
      await_move: 'Aktion wählen',
      choose_pending_tile_rotation: 'Kachel platzieren',
      resolve_room_token: 'Raum auflösen',
      resolve_room_token_seeress_choice: 'Seherin-Wahl',
      optional_monster_combat: 'Monsterbegegnung',
      combat: 'Kampf',
      combat_blade_reroll: 'Klinge-Neuwurf',
      combat_valkyrie_reroll: 'Walküre-Neuwurf',
      combat_witch_sacrifice: 'Hexenopfer',
      combat_flame_spells: 'Feuerball-Wahl',
      combat_curse_target: 'Fluchziel wählen',
      loot_resolution: 'Beute auflösen',
      optional_post_combat: 'Nach dem Kampf',
      turn_end: 'Zug endet',
      game_over: 'Spiel vorbei',
    },
    placeTileHint:
      'Drehe die Vorschaukachel auf dem Spielfeld, dann bestätige die Platzierung in der Mitte der Kachel.',
    unconscious: 'Bewusstlos',
    unconsciousMsg:
      'Dieser Held ist bewusstlos und muss diesen Zug überspringen.',
    unconsciousEndTurnHint:
      'Beende den Zug, um die übersprungene Runde abzuschließen und danach zu erholen.',
    seeressChoice: 'Seherin-Wahl',
    seeressDrawnTokens: (x: number, y: number) =>
      `Gezogene Raumchips bei ${x},${y}`,
    seeressChooseHint:
      'Wähle einen Chip zum Auflösen. Der andere kommt zurück in den Beutel.',
    seeressOption: (index: number, label: string) =>
      `Option ${index} wählen: ${label}`,
    treasureChest: 'Schatztruhe',
    monsterEncounter: 'Monsterbegegnung',
    monsterStrength: (name: string, strength: number) =>
      `${name} Stärke ${strength}`,
    monsterEncounterRogue:
      'Die Schurkin darf dieses Monster ignorieren, sich weiter bewegen, hier bleiben oder den Kampf beginnen.',
    fightMonster: 'Monster bekämpfen',
    resolveCombat: 'Kampf auflösen',
    combatFormula: (
      weaponBonus: number,
      seeressBonus: boolean,
      flameCount: number,
      strength: number,
    ) =>
      `2W6 + Waffen +${weaponBonus}${seeressBonus ? ' + Seherin Blick +1' : ''} + Feuerbälle (${flameCount} verfügbar) muss ${strength} übertreffen`,
    mummifiedPriestCurse: 'Fluch des Mumifizierten Priesters',
    mummifiedPriestCurseMsg: (monsterName: string) =>
      `${monsterName} besiegt. Wähle einen anderen Helden, der den Fluch erhält.`,
    valkyrieReroll: 'Walküre-Neuwurf',
    rolledDetails: (
      d1: number,
      d2: number,
      weapons: number,
      total: number,
      outcome: string,
    ) =>
      `Gewürfelt ${d1} + ${d2} + Waffen ${weapons} = ${total} und stehst aktuell vor: ${outcome}`,
    rerollBothDice: 'Beide Würfel neu würfeln',
    keepThisResult: 'Ergebnis behalten',
    bladeReroll: 'Klinge-Neuwurf',
    currentDice: (d1: number, d2: number, hasOnes: boolean) =>
      `Aktuelle Würfel ${d1} + ${d2}${hasOnes ? ' · jede 1 neu würfeln' : ''}`,
    bladeCurrentResult: (
      d1: number,
      d2: number,
      weapons: number,
      total: number,
      outcome: string,
    ) =>
      `Aktuelles Ergebnis ${d1} + ${d2} + Waffen ${weapons} = ${total} und steht aktuell vor: ${outcome}`,
    rerollOnes: '1en neu würfeln',
    witchSacrifice: 'Hexenopfer',
    sacrifice1HP: '1 LP opfern für +1',
    fireballSpells: 'Feuerbälle',
    fireballFormula: (
      d1: number,
      d2: number,
      weapons: number,
      sacrifice: number,
      total: number | undefined,
      outcome: string | undefined,
    ) => {
      const base = `Gewürfelt ${d1} + ${d2} + Waffen ${weapons}`;
      const sac = sacrifice > 0 ? ` + Opfer ${sacrifice}` : '';
      const eq = total !== undefined ? ` = ${total}` : '';
      const out = outcome ? ` und stehst aktuell vor: ${outcome}` : '';
      return `${base}${sac}${eq}${out}`;
    },
    doNotUseFireballs: 'Keine Feuerbälle einsetzen',
    useFireballSpells: (n: number) =>
      `${n} Feuerball-Zauber einsetzen`,
    witchSwap: 'Hexentausch',
    swapPosition: 'Position tauschen',
    witchSwapHint:
      'Wähle einen anderen Helden, mit dem du die Positionen tauschst.',
    cancel: 'Abbrechen',
    openChest: 'Truhe öffnen',
    loot: 'Beute',
    take: 'Nehmen',
    takeItem: (label: string) => `${label} nehmen`,
    leave: 'Liegenlassen',
    swapWeapon: (name: string) => `${name} tauschen`,
    swapSpell: (spellName: string) => `${spellName}-Zauber tauschen`,
    healingSpell: 'Heilzauber',
    useHealingSpell: 'Heilzauber einsetzen',
    healingSpellTargetHint:
      'Wähle, welcher Held zu einem entdeckten Heilungsfeld teleportiert wird.',
    healingSpellTileHint: (heroName: string) =>
      `Wähle ein entdecktes Heilungsfeld für ${heroName}.`,
    move: 'Bewegen',
    portal: 'Portal',
    noKnownPortalTarget: 'Kein bekanntes Portalziel',
    explore: 'Erkunden',
    combatOutcomes: {
      victory: 'Sieg',
      draw: 'Unentschieden',
      defeat: 'Niederlage',
    },
  },

  endScreen: {
    victory: 'Sieg!',
    gameOver: 'Spiel vorbei',
    sharedVictory: 'Gemeinsamer Sieg',
    winner: 'Sieger',
    and: 'und',
    dragonSlayer: 'Drachentöter',
    dragonTreasureNote:
      'Der Hort des Drachen (1,5 Punkte) ist im Gesamtergebnis enthalten.',
    pts: 'Pkt.',
    newGame: 'Neues Spiel',
  },

  eventLog: {
    title: 'Protokoll',
    system: 'System',
  },

  playerPanel: {
    title: 'Spieler',
    hp: (hp: number, maxHp: number) => `LP ${hp}/${maxHp}`,
    healthTitle: (hp: number, maxHp: number) =>
      `Lebenspunkte: ${hp} von ${maxHp}`,
    active: 'Aktiv',
    activeTitle: 'Aktuell aktiver Spieler',
    atk: (bonus: number) => `ANGr +${bonus}`,
    atkTitle: (bonus: number) => `Aktueller Waffen-Bonus: +${bonus}`,
    fireballInfinite: 'Feuerball ∞',
    fireballInfiniteTitle: 'Magierin: Feuerball-Zauber werden nicht verbraucht',
    fireballCount: (n: number) => `Feuerball ${n}`,
    fireballCountTitle: (n: number) => `Verfügbare Feuerball-Zauber: ${n}`,
    keyLabel: (n: number) => `Schlüssel ${n}`,
    keyTitle: (n: number) => `Getragene Schlüssel: ${n}`,
    weapons: 'Waffen',
    weaponsTitle: (n: number) => `Getragene Waffen: ${n}`,
    spells: 'Zauber',
    spellsTitle: (n: number) => `Getragene Zauber: ${n}`,
    pts: (n: number) => `${n} Pkt.`,
    ptsTitle: (n: number) => `Schatzpunkte: ${n}`,
    cursed: 'verflucht',
    cursedTitle: 'Verflucht: Heldenfähigkeiten sind inaktiv',
    unconscious: 'bewusstlos',
    unconsciousTitle:
      'Bewusstlos: dieser Spieler überspringt den nächsten Zug',
    heroAbilities: {
      hero_mage:
        'Feuerball-Zauber werden nicht verbraucht. Die Magierin darf auf entdeckten Feldern durch Wände gehen.',
      hero_valkyrie:
        'Darf nach einem Unentschieden oder einer Niederlage beide Kampfwürfel einmal neu würfeln. Verliert die Walküre ihren letzten LP, wird sie auf ein Heilungsfeld geschickt.',
      hero_witch:
        'Darf in einem Kampf 1 LP opfern, um +1 Kampfstärke zu erhalten. Darf zu Beginn des Zuges mit einem anderen Spieler die Position tauschen.',
      hero_rogue:
        'Unentschieden im Kampf gelten als Siege. Die Schurkin darf beim Bewegen Monster ignorieren.',
      hero_blade:
        'Würfelt nach einem Kampfwurf jede gewürfelte 1 neu, bis keine mehr übrig sind. Jeder Kampf mit einer abschließend gewürfelten 6 hält den Zug für verbleibende Bewegung und Folgeaktionen offen.',
      hero_seeress:
        'Zieht zwei Raumchips und wählt einen aus. Erhält +1 Kampfstärke in einem Kampf, nachdem der erste Schritt ausgegeben wurde.',
    },
    enlargePortrait: (name: string) => `Porträt-Aktionen für ${name}`,
    enlargeItem: (label: string) => `${label} vergrößern`,
  },

  feedbackModal: {
    title: 'Feedback & Fehlerbericht',
    description:
      'Einen Fehler gefunden oder eine Idee? Schreib kurz eine Nachricht. Durch Klicken auf "E-Mail öffnen" wird eine Nachricht in deiner E-Mail-App vorbereitet — nichts wird gesendet, bis du es selbst tust.',
    messageLabel: 'Deine Nachricht',
    messagePlaceholder: 'Beschreibe den Fehler oder teile dein Feedback...',
    emailLabel: 'Deine E-Mail (optional, für Rückmeldungen)',
    emailPlaceholder: 'du@beispiel.de',
    diagnosticsLabel:
      'Technische Spieldiagnose für die Analyse einschließen',
    diagnosticsNote:
      'Optional und völlig freiwillig. Wenn angehakt, wird ein kurzer technischer Schnappschuss deines aktuellen Spiels zur Nachricht hinzugefügt: App-Version, Zufalls-Startwert, aktuelle Phase, Spieler und ihre Helden sowie die letzten Spielereignisse. Es werden keine persönlichen Daten gesammelt. Lass es deaktiviert, um nur deine Nachricht zu senden.',
    cancel: 'Abbrechen',
    openEmail: 'E-Mail öffnen',
    closeForm: 'Feedback-Formular schließen',
  },

  footerMeta: {
    imprint: 'Impressum',
    privacyPolicy: 'Datenschutz',
    bugReport: 'Fehlerbericht',
    loading: 'Rechtlicher Hinweis wird geladen...',
    loadError:
      'Dieser rechtliche Hinweis kann gerade nicht geladen werden.',
    closeSection: (name: string) => `${name} schließen`,
  },

  hotseatHandoff: {
    passDevice: 'Gerät weitergeben',
    playerN: (n: number) => `Spieler ${n}`,
    skipTurn:
      'Dieser Held ist bewusstlos und wird diesen Zug überspringen.',
    startTurn: 'Zug beginnen',
  },

  gameScreen: {
    startPlayerRollOff: 'Startspieler-Würfelwurf',
    beginsTheGame: (heroName: string) => `${heroName} beginnt das Spiel`,
    clickToContinue: 'Klicke irgendwo, um zu beginnen',
    initialRoll: 'Erster Wurf',
    tiebreak: (n: number) => `Stechen ${n}`,
    initialRollResults: 'Ergebnisse des ersten Wurfs',
    tiebreakResults: (n: number) => `Ergebnisse Stechen ${n}`,
    player: 'Spieler',
    hero: 'Held',
    roll: 'Wurf',
    turnOrder: 'Zugreihenfolge',
    turnOrderCaption: 'Zugreihenfolge',
    rankColumn: '#',
  },

  boardView: {
    treasureChest: 'Schatztruhe',
    noKnownPortalTarget: 'Kein bekanntes Portalziel',
  },
};
