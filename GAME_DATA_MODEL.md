# GAME_DATA_MODEL

## 1. Designziel
Alle Spielinhalte sollen datengetrieben beschrieben werden, damit Engine und UI generisch arbeiten können. Regeln, Tiles, Token, Monster, Belohnungen und Heldenfähigkeiten müssen unabhängig von der Darstellung modelliert sein.

## 2. Kernentitäten

### 2.1 Player
```ts
interface Player {
  id: string
  kind: 'human' | 'ai'
  heroId: string
  hp: number
  maxHp: number
  inventory: Inventory
  treasurePoints: number
  isCursed: boolean
  skipNextTurn: boolean
  position: BoardPosition
}
```

### 2.2 Inventory
```ts
interface Inventory {
  weapons: WeaponItem[]
  spells: SpellItem[]
  keyCount: 0 | 1
}
```

### 2.3 Tile-Grundmodell
Die Engine soll Tiles topologisch über offene Seiten plus Rotation modellieren.

```ts
type TileSide = 'A' | 'B' | 'C' | 'D'
type TileShape = 'straight' | 'corner' | 't_junction' | 'cross'
type TileCategory = 'start' | 'tunnel' | 'room' | 'teleport' | 'healing'
type Rotation = 0 | 90 | 180 | 270

interface TileBlueprint {
  id: string
  category: TileCategory
  shape: TileShape
  openSides: TileSide[]
  isStartTile?: boolean
  grantsHealing?: boolean
  grantsTeleport?: boolean
  spawnsRoomToken?: boolean
}

interface PlacedTile {
  tileInstanceId: string
  blueprintId: string
  rotation: Rotation
  boardX: number
  boardY: number
  discovered: boolean
  looseItems: Item[]
  roomToken?: Token
}
```

### 2.4 Tile-Pool
```ts
interface TilePoolEntry {
  blueprintId: string
  count: number
}
```

### 2.5 Token
```ts
interface Token {
  id: string
  kind: 'monster' | 'chest'
}
```

### 2.6 MonsterDefinition
```ts
interface MonsterDefinition {
  id: string
  displayName: string
  strength: number
  reward: RewardDefinition
  onDefeatEffect?: 'curse_other_player'
  isAncientDragon?: boolean
  blocksMovement: boolean
}
```

### 2.7 RewardDefinition
```ts
type RewardDefinition =
  | { type: 'weapon'; bonus: 1 | 2 | 3 }
  | { type: 'spell'; spellKind: 'flame' | 'healing' }
  | { type: 'key' }
  | { type: 'treasure'; points: number }
```

### 2.8 HeroDefinition
```ts
interface HeroDefinition {
  id: string
  displayName: string
  passiveRules: string[]
  activeRules: string[]
}
```

## 3. Basis-Monsterdaten für V1
| id | Rolle | Stärke | Belohnung | Zusatzeffekt |
|---|---|---:|---|---|
| giant_rat | kleine Bedrohung | 5 | Dagger (+1) | - |
| giant_spider | mittlere Bedrohung | 6 | Fountain Charm | - |
| mummy | Fluchquelle | 7 | Ember Spell (+1) | curse_other_player |
| skeleton_turnkey | Schlüsselwächter | 8 | Key | - |
| skeleton_warrior | Elite-Wache | 9 | Sword (+2) | - |
| skeleton_king | Boss-Gegner | 10 | Axe (+3) | - |
| fallen | Schatzgegner | 12 | Treasure (1 point) | - |
| dragon | Endgegner | 15 | Ancient Dragon Hoard (1.5 points) | isAncientDragon |

## 4. Monsterverteilung und Token-Bag V1
| Typ | Anzahl |
|---|---:|
| dragon | 1 |
| fallen | 2 |
| skeleton_turnkey | 12 |
| skeleton_king | 3 |
| skeleton_warrior | 5 |
| giant_rat | 8 |
| giant_spider | 4 |
| mummy | 8 |
| treasure_chest | 10 |

### 4.1 Token-Bag als Datenobjekt
```ts
const bagTokenCounts = {
  dragon: 1,
  fallen: 2,
  skeleton_turnkey: 12,
  skeleton_king: 3,
  skeleton_warrior: 5,
  giant_rat: 8,
  giant_spider: 4,
  mummy: 8,
  treasure_chest: 10,
} as const
```

### 4.2 Reward-Mapping pro Monster
```ts
const monsterRewards = {
  giant_rat: { type: 'weapon', bonus: 1 },
  giant_spider: { type: 'spell', spellKind: 'healing' },
  mummy: { type: 'spell', spellKind: 'flame' },
  skeleton_turnkey: { type: 'key' },
  skeleton_warrior: { type: 'weapon', bonus: 2 },
  skeleton_king: { type: 'weapon', bonus: 3 },
  fallen: { type: 'treasure', points: 1 },
  dragon: { type: 'treasure', points: 1.5 },
} as const
```

### 4.3 Treasure-Werte
```ts
const treasurePointValues = {
  treasure_chest: 1,
  fallen_treasure: 1,
  dragon_hoard: 1.5,
} as const
```

## 5. Heldenmodell V1
Die Helden bekommen in der eigenen IP neue Namen. Technisch werden zunächst funktionale IDs vergeben.

### hero_mage
- Flame-Spells werden nicht verbraucht
- darf sich auf bereits entdeckten verbundenen Feldern durch Wände bewegen

### hero_warrior
- darf einen Kampf einmal komplett neu würfeln
- verliert beim ersten misslungenen Versuch keinen Lebenspunkt, muss aber den zweiten Wurf akzeptieren
- bei Verlust des letzten Lebenspunkts statt Ohnmacht sofort zu einer Heilquelle, komplett heilen

### hero_warlock
- darf 1 Lebenspunkt opfern, um +1 Kampfstärke zu erhalten
- darf zu Zugbeginn für alle 4 Schritte die Position mit einem anderen Helden tauschen

### hero_thief
- gewinnt Unentschieden im Kampf
- darf Monster ignorieren und weiterziehen oder auf Monsterfeldern stehen bleiben
- ist sie verflucht und steht auf einem Monsterfeld, muss sie zu Beginn des nächsten Zugs kämpfen

### hero_swordsman
- geworfene Einsen dürfen wiederholt werden, bis kein Ergebnis 1 mehr zeigt
- wenn mindestens eine 6 fällt, darf der Zug nach gewonnenem Kampf fortgesetzt werden
- bei Unentschieden oder Niederlage darf dasselbe Monster erneut angegriffen werden

### hero_oracle
- +1 im Kampf, wenn direkt nach dem ersten Schritt gekämpft wird
- zieht bei unbekanntem Raum zwei Plättchen und wählt eines

## 6. Tile-Topologien V1
Die offenen Seiten werden in Grundorientierung so beschrieben:
- `A` liegt gegenüber `C`
- `B` liegt gegenüber `D`

### 6.1 Tunnel-Topologien
| blueprintId | category | shape | openSides | count |
|---|---|---|---|---:|
| tunnel_straight | tunnel | straight | A,C | 4 |
| tunnel_corner | tunnel | corner | A,B | 4 |
| tunnel_t_junction | tunnel | t_junction | A,B,C | 5 |
| tunnel_cross | tunnel | cross | A,B,C,D | 7 |

### 6.2 Raum-Topologien
| blueprintId | category | shape | openSides | count |
|---|---|---|---|---:|
| room_straight | room | straight | A,C | 17 |
| room_corner | room | corner | A,B | 9 |
| room_t_junction | room | t_junction | A,B,C | 13 |
| room_cross | room | cross | A,B,C,D | 14 |

### 6.3 Spezial-Tiles
| blueprintId | category | shape | openSides | Zusatzeigenschaft | count |
|---|---|---|---|---|---:|
| healing_corner | healing | corner | A,B | grantsHealing | 2 |
| teleport_straight | teleport | straight | A,C | grantsTeleport | 4 |
| start_cross_healing | start | cross | A,B,C,D | isStartTile, grantsHealing | 1 |

## 7. Vollständiger Tile-Pool V1
```ts
const tilePoolCounts = {
  start_cross_healing: 1,

  tunnel_straight: 4,
  tunnel_corner: 4,
  tunnel_t_junction: 5,
  tunnel_cross: 7,

  room_straight: 17,
  room_corner: 9,
  room_t_junction: 13,
  room_cross: 14,

  healing_corner: 2,
  teleport_straight: 4,
} as const
```

Summe: `80` Tiles inklusive Startfeld.

## 8. Setup-Daten für das Board
- `start_cross_healing` wird nicht gezogen, sondern bei Spielbeginn in die Mitte gesetzt
- alle übrigen 79 Tiles werden verdeckt gemischt
- bei Aufdeckung wird genau ein Tile gezogen und in legaler Rotation platziert
- Raum-Tiles erzeugen beim erstmaligen Entdecken ein Raum-Token
- Start-, Tunnel-, Healing- und Teleport-Tiles erzeugen beim Betreten kein Raum-Token

## 9. Rotation und Legality
Rotation soll generisch auf Basis der offenen Seiten berechnet werden.
- 0 Grad: unverändert
- 90 Grad: A->B, B->C, C->D, D->A
- 180 Grad: A->C, B->D, C->A, D->B
- 270 Grad: A->D, B->A, C->B, D->C

Eine Platzierung ist legal, wenn die Eintrittsseite mit einer offenen Gegenseite des neuen Tiles verbunden werden kann.

## 10. Offene Benennungsschicht
Für die UI soll eine Mapping-Schicht vorgesehen werden:
- technische IDs bleiben stabil
- sichtbare Namen kommen aus einem separaten Lokalisierungs-/Naming-Layer
- Regeln, Datenmodell und Tests referenzieren bis zur finalen Benennungsschicht bevorzugt die technischen IDs
