# IMPLEMENTATION_PLAN

## 1. Ziel
Diese Datei beschreibt die verbindliche empfohlene Reihenfolge, in der Codex das Projekt umsetzen soll.

Dieses Dokument ist normativ für Umsetzungsreihenfolge, Milestones und Lieferkriterien. Es definiert keine neuen Produktanforderungen zusätzlich zum `PRD.md`.

## 2. Planungsgrundsätze
- Die Umsetzung erfolgt in klaren Milestones.
- Jeder Milestone soll in einem lauffähigen, testbaren Zustand enden.
- Die Game Engine wird vor der UI finalisiert und bleibt framework-unabhängig.
- KI nutzt ausschließlich legale Aktionen aus der Engine.
- Zufall bleibt seedbar und deterministisch testbar.
- V1 ist browser-first; ein Android-Port ist ausdrücklich Post-V1 vorgesehen.

## 3. Verbindliche Milestones

### Milestone 1 – Projektgerüst
Ziel: Ein lauffähiges Frontend-Grundgerüst mit Tooling und sauberer Ordnerstruktur.

Enthalten:
- Vite + React + TypeScript initialisieren
- Tailwind CSS integrieren
- Zustand integrieren
- Vitest konfigurieren
- Playwright vorbereiten
- Basis-Ordnerstruktur gemäß Architektur anlegen
- Linting und Formatting einrichten
- Startscreen-Platzhalter rendern

Definition of Done:
- Projekt startet lokal erfolgreich
- Testkommando läuft
- Grundstruktur für `src/engine`, `src/data`, `src/ui`, `src/state`, `src/ai` ist vorhanden

### Milestone 2 – Core Data Model
Ziel: Ein vollständiges, serialisierbares und datengetriebenes Domänenmodell.

Enthalten:
- zentrale Typdefinitionen anlegen
- `GameState`-Schema vorbereiten
- technische IDs für Helden, Monster, Rewards, Tiles und UI-Texte trennen
- Tile-Topologien implementieren (`straight`, `corner`, `t_junction`, `cross`)
- vollständigen Tile-Pool mit Stückzahlen hinterlegen
- Token-Bag für Monster und Schatztruhen modellieren
- Reward-Mapping pro Monster hinterlegen
- seedbare RNG-Abstraktion implementieren

Definition of Done:
- alle statischen Daten aus `GAME_DATA_MODEL.md` sind im Code repräsentiert
- Tile- und Token-Gesamtzahlen stimmen mit der Spezifikation überein
- Datenmodell ist serialisierbar

### Milestone 3 – Game Engine
Ziel: Die Partie kann regelkonform initialisiert und als Zustandsmaschine verarbeitet werden.

Enthalten:
- Spielsetup mit menschlichem Spieler und 1–4 KI-Spielern
- Turn Order bestimmen
- Zugphasen modellieren
- Board-Repräsentation implementieren
- Bewegungsregeln für bis zu 4 Schritte umsetzen
- Exploration-Flow umsetzen: Richtung ansagen -> Tile ziehen -> Rotation wählen -> legal platzieren
- Legality-Prüfungen für Tile-Platzierung implementieren
- Raumbetreten und Spezialfeld-Erkennung technisch vorbereiten

Definition of Done:
- eine neue Partie kann vollständig initialisiert werden
- legale Bewegungen und legale Tile-Platzierung werden korrekt erzeugt
- Kernzustände der Partie sind über die Engine testbar

### Milestone 4 – Combat and Rewards
Ziel: Raumauflösung, Kämpfe, Beute und Siegbedingungen funktionieren regelkonform.

Enthalten:
- Raumauflösung implementieren
- Bag-Ziehlogik für Monster und Schatztruhen implementieren
- Kampfauflösung mit 2W6 und Boni umsetzen
- Rückzug bei Niederlage oder Unentschieden umsetzen
- Lebenspunkte und Ohnmacht umsetzen
- Schatztruhen, Schlüssel, Waffen und Zauber anwenden
- Inventargrenzen durchsetzen
- Heilquellenregeln umsetzen
- Fluchlogik umsetzen
- Drachenkampf und Endwertung umsetzen

Definition of Done:
- alle Basis-Kampf- und Beuteregeln laufen über automatisierte Tests
- Endabrechnung mit Schatzpunkten ist korrekt
- Spielende durch Drachenbesiegung funktioniert

### Milestone 5 – Hero Abilities
Ziel: Alle 6 Heldenfähigkeiten sind regelkonform und isoliert testbar.

Enthalten:
- Ability-Hooks oder vergleichbares Regelmodul-System definieren
- alle 6 Basisheldenfähigkeiten implementieren
- Sonderfälle wie Fluch, Würfel-Neuwurf, Durch-Wände-Bewegung und Zugfortsetzung korrekt abbilden
- Regressionstests pro Held ergänzen

Definition of Done:
- jede Heldenfähigkeit besitzt dedizierte Tests
- Heldenspezifika sind nicht unkontrolliert über UI und Engine verstreut

### Milestone 6 – UI spielbar machen
Ziel: Die Partie ist für einen Nutzer vollständig im Browser spielbar.

Enthalten:
- Startscreen
- Heldenauswahl
- Auswahl der KI-Anzahl
- Hauptspielansicht mit Board
- Hervorhebung legaler Bewegungen und Platzierungsoptionen
- Statuspanel für alle Spieler
- Inventaranzeige
- Combat-Zusammenfassung / Rechenweg
- Event-Log
- Endscreen mit Ranking

Definition of Done:
- ein Nutzer kann ohne Debug-Eingriffe eine komplette Partie spielen
- alle wichtigen Zustandsänderungen sind sichtbar nachvollziehbar

### Milestone 7 – KI V1
Ziel: Regelkonforme heuristische KI für vollständige Partien.

Enthalten:
- legale Aktionsmenge aus Engine ableiten
- heuristische Bewertungslogik implementieren
- Heilung, Truhen, Ausrüstung, Risiken und Spezialfähigkeiten berücksichtigen
- Drachenkampf nur bei sinnvoller Erfolgswahrscheinlichkeit suchen
- deterministische Seed-Tests für KI-Partien ergänzen

Definition of Done:
- KI kann eine Partie bis zum Ende spielen
- KI verletzt keine Regeln
- KI-Verhalten ist reproduzierbar testbar

### Milestone 8 – Persistenz und Polishing
Ziel: Solider V1-Abschluss mit automatischer lokaler Wiederaufnahme und UX-Verbesserungen.

Enthalten:
- Auto-Resume über `localStorage`
- Schema-Versionierung für serialisierte Spielstände
- Resume/New-Game-Flow im Startscreen
- Tooltips und kleinere UX-Verbesserungen
- Fehlerfälle und Edge Cases bereinigen
- Testlücken schließen

Definition of Done:
- eine laufende Partie wird lokal wiederhergestellt
- Browser-Reload zerstört den Spielstand nicht
- V1 wirkt stabil und vollständig

### Milestone 9 – V1-Abnahme
Ziel: Formale Fertigstellung des V1-Scopes.

Enthalten:
- komplette Browser-Partie von Start bis Endwertung validieren
- finale Regressionstests laufen lassen
- bekannte Kernregeln gegen Spezifikation prüfen
- Build- und Startanleitung finalisieren
- Android-Post-V1-Roadmap kurz dokumentieren

Definition of Done:
- vollständige Partie spielbar
- Endwertung korrekt
- alle 6 Helden implementiert
- KI beendet Partien regelkonform
- Browser-Build ist stabil

## 4. Empfohlene Arbeitsweise innerhalb jedes Milestones
Für jeden Milestone gilt nach Möglichkeit diese Reihenfolge:
1. Datenmodell oder Engine erweitern
2. automatisierte Tests ergänzen
3. minimale UI-Anbindung herstellen
4. Seed-basiertes Verhalten prüfen
5. Dokumentation aktualisieren, falls sich Annahmen ändern

## 5. Konkrete erste Deliverables für Codex
1. Projekt scaffolden
2. Domänentypen und statische Daten anlegen
3. Tile-Pool und Token-Bag implementieren
4. seedbare RNG integrieren
5. `GameState` und Setup-Flow bauen
6. Bewegungs- und Explorationslogik implementieren
7. Kampf- und Reward-Modul ergänzen
8. Minimal-UI zum Starten und Spielen anbinden

## 6. Definition of Done für den MVP
- vollständige Partie im Browser spielbar
- keine bekannten Blocker in Kernregeln
- alle Heldenfähigkeiten abgedeckt
- KI kann eine Partie zu Ende spielen
- Endwertung korrekt
- automatische lokale Wiederaufnahme funktioniert
- Codebasis bleibt für einen Post-V1-Android-Port geeignet
