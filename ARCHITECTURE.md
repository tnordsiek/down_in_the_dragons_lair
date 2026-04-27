# ARCHITECTURE

## 1. Zielbild
Die Anwendung soll als clientseitiges Webspiel mit klarer Trennung zwischen Spielengine, KI und Oberfläche implementiert werden. Der Schwerpunkt liegt auf einer robusten, testbaren Engine. Die Core-Engine soll so geschnitten werden, dass ein späterer Android-Port nach V1 möglich bleibt.

Dieses Dokument ist normativ für technische Zielarchitektur, Modulgrenzen, Zustandsmodell, technische Prinzipien und Teststrategie. Es definiert keine neuen Produktanforderungen zusätzlich zum `PRD.md` und keine Regelentscheidungen zusätzlich zu `GAME_RULES.md` und `RULE_EDGE_CASES.md`.

## 2. Empfehlung für V1-Stack
- React 19
- TypeScript
- Vite 8
- Zustand für App- und Spielzustand
- Tailwind CSS für UI-Styling
- Vitest für Unit- und Integrationstests
- Playwright für E2E-Tests

## 3. Architekturprinzipien
- Engine ist framework-unabhängig
- alle Regeln laufen in reinen Funktionen oder wohldefinierten Services
- Zufall ist injizierbar und seedbar
- UI rendert ausschließlich aus Zustand
- AI nutzt dieselben legalen Aktionen wie der menschliche Spieler
- Tile-Topologien und Stückzahlen sind deklarative Daten, nicht hartcodierte Sonderlogik
- die Engine darf nichts aus React, UI oder Zustand importieren

## 4. Modulstruktur
```text
src/
  app/
  ui/
  engine/
    core/
    rules/
    combat/
    movement/
    setup/
    turns/
    victory/
    serialization/
  ai/
  data/
  state/
  utils/
```

## 5. Engine-Zustandsmodell
Die Engine verwaltet mindestens:
- Spielerliste
- Board mit dynamisch aufgedeckten Tiles
- Tile-Pool mit fixen Stückzahlen
- pending tile draw inklusive legaler Rotationen
- Token-Bag
- aktiven Spielerindex
- Restschritte im Zug
- Kampfkontext
- Event-Historie
- Siegstatus

## 6. Turn State Machine
Empfohlene Hauptzustände:
- `setup`
- `turn_start`
- `await_move`
- `draw_pending_tile`
- `choose_pending_tile_rotation`
- `place_pending_tile`
- `resolve_room_token`
- `combat`
- `loot_resolution`
- `optional_post_combat`
- `turn_end`
- `game_over`

Die State Machine verhindert ungültige Aktionen und macht die UI einfacher.

## 7. Empfohlenes Aktionsmodell
Alle Benutzer- und KI-Entscheidungen werden als Actions formuliert, zum Beispiel:
- `startGame`
- `selectHero`
- `setAiCount`
- `movePlayer`
- `drawPendingTile`
- `setPendingTileRotation`
- `placePendingTile`
- `resolveCombat`
- `useSpell`
- `pickUpItem`
- `openChest`
- `endTurn`

## 8. Tile- und Board-Modellierung
### 8.1 Grundregel
Tiles werden über `openSides + rotation` modelliert. Die Engine berechnet daraus begehbare Kanten.

### 8.2 Platzierungslogik
Beim Erkunden in eine leere Nachbarposition:
1. Richtung wird angekündigt.
2. Genau ein Tile wird aus dem Tile-Pool gezogen.
3. Die Engine berechnet alle legalen Rotationen für diese Zielposition.
4. Menschlicher Spieler oder KI wählt eine dieser Rotationen.
5. Das Tile wird platziert und das Feld anschließend aufgelöst.

### 8.3 Sonderrollen
- `start_cross_healing` wird fest platziert
- `room_*` spawnen beim ersten Entdecken Monster oder Schatztruhe
- `healing_corner` und `start_cross_healing` gewähren Heilung bei Zugende
- `teleport_straight` gewährt Teleportnutzung nach den bekannten Regeln

## 9. Determinismus
Der Zufallsgenerator muss austauschbar sein.
- Standardmodus: normaler Seed
- Debugmodus: expliziter Seed
- alle Zieh- und Würfeloperationen müssen geloggt werden
- Tile-Ziehungen, Token-Ziehungen und Würfe gehören in die Ereignishistorie

## 10. Persistence
V1 bleibt vollständig clientseitig.
- automatische lokale Wiederaufnahme genau einer laufenden Partie
- Speicherung in `localStorage`
- Serialisierung des kompletten `GameState`
- Versionsfeld für spätere Migrationen
- keine manuellen Save-Slots in V1

## 11. Rendering-Konzept
UI besteht idealerweise aus:
- Board-Ansicht
- Spielerpanel
- Aktionspanel
- Event-Log
- kompaktem Combat-Bereich
- Endscreen

## 12. Testing-Strategie
### Unit-Tests
- Kampfauflösung
- Bewegungsvalidierung
- Berechnung legaler Tile-Rotationen
- Vollständigkeit des Tile-Pools
- Heldenfähigkeiten
- Inventargrenzen
- Fluchlogik
- Endwertung

### Integrationstests
- vollständige Beispielzüge
- Exploration mit Tile-Draw und Rotation
- komplette Minipartie mit festem Seed

### E2E
- Spielstart
- Held wählen
- KI-Zahl wählen
- neues Tile ziehen und legal platzieren
- mehrere Züge spielen
- Partieende anzeigen

## 13. Plattformstrategie nach V1
- Browser ist Primärplattform in V1
- Android ist bewusst Post-V1
- Engine, Datenmodelle und Serialisierung sollen ohne DOM- oder Browser-Abhängigkeiten entworfen werden
- eine spätere Android-App kann UI-seitig separat umgesetzt werden, solange sie dieselbe Engine nutzt

## 14. Implementierungspriorität
1. Datenmodelle
2. Engine-State und Actions
3. Kernregeln
4. UI-Grundgerüst
5. KI-Heuristiken
6. Persistenz und Polishing
