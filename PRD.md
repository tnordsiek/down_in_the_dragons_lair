# PRD – Down in the Dragon's Lair

## 1. Produktübersicht
Down in the Dragon's Lair ist ein im Browser spielbares Fantasy-Dungeon-Spiel mit eigener Markenidentität. Die Spielmechanik für Version 1 ist in diesem Repository vollständig definiert. Ziel ist eine lokal spielbare Einzelspieler-Erfahrung gegen KI-Gegner.

Dieses Dokument ist normativ für Produktanforderungen, Scope, UX und nicht-funktionale Ziele. Es definiert keine Umsetzungsreihenfolge; dafür gilt `IMPLEMENTATION_PLAN.md`.

## 2. Produktziel
Das Produkt soll eine komplette Partie von Startaufbau bis Endwertung digital abbilden. Ein Benutzer kann einen Helden wählen, die Anzahl der KI-Gegner konfigurieren und die Partie vollständig im Browser spielen.

Der Benutzer legt die Anzahl der KI-Gegner fest. Helden sind pro Partie eindeutig; nach der Wahl des menschlichen Helden werden die übrigen benötigten Helden zufällig und ohne Duplikate den KI-Spielern zugewiesen.

## 3. Zielgruppe
- Familien und Gelegenheitsspieler
- Nutzer, die einfache Brettspiel-Umsetzungen im Browser mögen
- Entwickler und Tester, die ein klar spezifiziertes Regelwerk als Codex-Basis benötigen

## 4. Primäre User Story
Als Spieler möchte ich im Browser eine komplette Dungeon-Partie gegen mehrere Computergegner spielen, damit ich die volle Spielmechanik lokal und ohne physischen Spielaufbau erleben kann.

## 5. Sekundäre User Stories
- Als Spieler möchte ich vor Spielbeginn einen Helden auswählen.
- Als Spieler möchte ich die Anzahl der KI-Gegner festlegen.
- Als Spieler möchte ich meine Lebenspunkte, Ausrüstung und Schätze jederzeit sehen.
- Als Spieler möchte ich nachvollziehen können, warum ein Kampf gewonnen oder verloren wurde.
- Als Entwickler möchte ich eine deterministische Engine und ein lesbares Event-Log haben.

## 6. V1 Scope
### Muss enthalten sein
- Startscreen
- Charakterauswahl
- Auswahl von 1 bis 4 KI-Gegnern
- vollständiges V1-Regelset
- vollständige Abbildung aller 6 Basisheldenfähigkeiten
- Bag-/Draw-Logik für Monster und Schatztruhen
- Labyrinth mit verdeckten Feldern und Rotation neuer Tiles
- Kampfauflösung mit 2W6, Boni und Sonderregeln
- Inventar- und monster-spezifische Lootlogik
- Fluchmechanik
- Drachenkampf und Endwertung
- automatische lokale Wiederaufnahme einer laufenden Partie im Browser

### Darf enthalten sein, wenn es den Kern nicht verzögert
- Seed-Auswahl für reproduzierbare Spiele
- Debug-Ansicht für Engine-Status
- Replay-fähiges Zugprotokoll

### Nicht enthalten
- Erweiterungsinhalte
- Online-Funktionen
- Nutzerkonten
- Chat, Matchmaking, Ranglisten
- 3D-Assets oder stark animierte Inszenierung

## 7. Erfolgsdefinition für V1
V1 ist erfolgreich, wenn:
- eine komplette Partie von Anfang bis Ende spielbar ist
- alle Regeln der V1-Spezifikation korrekt umgesetzt sind
- kein ungültiger Spielzustand durch UI-Eingaben erreichbar ist
- KI-Züge regelkonform ausgeführt werden
- Endwertung korrekt ermittelt wird

## 8. UX-Anforderungen
- klare 2D-Darstellung des Labyrinths
- sichtbare Restschritte im aktuellen Zug
- deutlich lesbare Anzeige von Lebenspunkten, Schätzen und Inventar
- Kampfergebnisse mit vollständiger Formel
- Aktionslog pro Zug
- gute Bedienbarkeit mit Maus; Tastatur-Support optional
- verwendete Grafik- und Audioelemente müssen über austauschbare Asset-IDs angebunden sein
- für V1 sind einfache funktionale Platzhaltergrafiken ausdrücklich zulässig, wenn sie die Implementierung beschleunigen und später austauschbar bleiben

## 9. Nicht-funktionale Anforderungen
- Browser-first
- moderne Desktop-Browser als Zielplattform
- kurze Ladezeit
- deterministische Tests möglich
- klare Trennung zwischen Engine und UI
- hoher Anteil automatisierbarer Unit-Tests
- Build und Asset-Pfade müssen mit GitHub Pages kompatibel sein

## 10. Bereits festgelegte Produktentscheidungen
- Produktname: `Down in the Dragon's Lair`
- technischer V1-Stack: React, TypeScript, Vite, Zustand, Tailwind, Vitest, Playwright
- Standard-Paketmanager für V1: `npm`
- Ziel-Node-Version für V1-Tooling: Node 22 LTS
- Save/Load in V1: automatische lokale Wiederaufnahme einer laufenden Partie
- eigene sichtbare Namen für Helden, Monster und Items; technische IDs bleiben getrennt
- für V1 dürfen die Klassentypen als sichtbare Namen verwendet werden; die Anzeigenamen müssen später austauschbar bleiben
- für V1 dürfen auch bei Monstern, Items und Zaubern die internen Bezeichnungen als sichtbare Anzeigenamen verwendet werden; die Anzeigenamen müssen später austauschbar bleiben
- Browser-first in V1, Android als Post-V1-Option
- Veröffentlichungsziel für V1: GitHub Pages

