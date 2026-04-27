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
- Die Umsetzung folgt den im `PRD.md` festgelegten Plattformzielen für V1; ein Android-Port ist ausdrücklich Post-V1 vorgesehen.

## 3. Verbindliche Milestones

### Milestone 1 – Projektgerüst
Ziel: Ein lauffähiges Frontend-Grundgerüst mit Tooling und sauberer Ordnerstruktur.

Enthalten:
- Vite + React + TypeScript initialisieren
- `npm` als Standard-Paketmanager verwenden
- Tailwind CSS integrieren
- Zustand integrieren
- Vitest konfigurieren
- Playwright vorbereiten
- Vite-Konfiguration früh auf GitHub-Pages-kompatible Builds ausrichten
- Basis-Ordnerstruktur gemäß Architektur anlegen
- Asset-Manifest-Struktur gemäß `ASSET_SPEC.md` vorbereiten
- maschinenlesbares Asset-Manifest anlegen
- Linting und Formatting einrichten
- Startscreen-Platzhalter rendern
- einfache Platzhaltergrafiken früh zulassen, um Implementierungsfluss und Tests nicht zu blockieren

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

Empfohlene Implementierungsreihenfolge:
1. Basistypen und technische IDs definieren
2. Inventar-, Reward- und Monster-Typen modellieren
3. Tile-Blueprints und Tile-Pool-Daten anlegen
4. Token-Bag und Reward-Mappings anlegen
5. `GameState`-nahes Serialisierungsmodell vorbereiten
6. seedbare RNG-Abstraktion ergänzen

Mindestens diese Tests:
- Tile-Gesamtzahl stimmt
- Token-Gesamtzahl stimmt
- Reward-Mapping deckt alle Monster ab
- Serialisierung statischer Kernstrukturen funktioniert

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

Empfohlene Implementierungsreihenfolge:
1. `GameState` und initiale Setup-Strukturen anlegen
2. Turn-Phasen und Statuswerte der State Machine definieren
3. Action-Typen und Reducer-/Transition-Schnittstelle festlegen
4. Board-Repräsentation und Positionsmodell implementieren
5. Bewegung auf bekannten Feldern validieren
6. Exploration mit Pending-Tile-Flow ergänzen
7. legale Rotationen und Platzierungsprüfungen anbinden
8. Raum- und Spezialfeld-Hooks für spätere Auflösung vorbereiten

Mindestens diese Tests:
- neues Spiel wird gültig initialisiert
- Startspieler und Spielerreihenfolge sind reproduzierbar
- legale Bewegungen auf bekannten Feldern stimmen
- Exploration erzeugt nur legale Rotationen
- illegale Tile-Platzierungen werden abgelehnt

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

Empfohlene Implementierungsreihenfolge:
1. Raumauflösung und Token-Ziehlogik abschließen
2. Kampfkontext und Würfelfluss modellieren
3. Waffen-, Zauber- und sonstige Boni berechnen
4. Sieg, Unentschieden und Niederlage sauber auflösen
5. Rückzug, Lebenspunktverlust und Ohnmacht anbinden
6. Loot-Anwendung und Inventargrenzen ergänzen
7. Heilung, Fluch und Schlüsselnutzung ergänzen
8. Drachenende und Endwertung abschließen

Mindestens diese Tests:
- Kampf gewinnt nur bei strikt größerem Gesamtwert
- Unentschieden löst Rückzug ohne HP-Verlust aus
- Niederlage löst Rückzug und HP-Verlust aus
- Inventarüberlauf legt Gegenstände korrekt ab
- Heilquelle entfernt Fluch und heilt vollständig
- Drachensieg beendet die Partie sofort
- Endwertung zählt Schatzquellen korrekt

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

Empfohlene Implementierungsreihenfolge:
1. zentrales Ability-Hook-System oder vergleichbare Regel-Erweiterung definieren
2. passive Kampfmodifikatoren integrieren
3. aktive Fähigkeiten mit expliziten Aktivierungszeitpunkten integrieren
4. Bewegungs-Sonderregeln integrieren
5. Zugfortsetzungs- und Ersatzlogiken integrieren
6. Fluch als globalen Fähigkeits-Bypass verifizieren

Mindestens diese Tests:
- `hero_mage`: Flammenzauber wird nicht verbraucht; Wandbewegung nur auf bekannten Feldern
- `hero_warrior`: kompletter Reroll ohne ersten HP-Verlust; letzte HP führt zur Heilquelle statt Standard-Ohnmacht
- `hero_warlock`: HP-Opfer gibt +1 genau einmal pro Kampf; Positionswechsel nur zu Zugbeginn und kostet alle 4 Schritte
- `hero_thief`: Gleichstand gewinnt; Monster können ignoriert werden; Fluch deaktiviert diese Vorteile
- `hero_swordsman`: Einsen werden wiederholt; Sechser verändert den Post-Combat-Flow; erneuter Angriff ist regelkonform möglich
- `hero_oracle`: +1 nur beim Kampf nach dem ersten Schritt; Bag-Draw-Ersatz erhält die endliche Token-Menge

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
- UI-Grafiken und eventuelle Soundeffekte ausschließlich über Asset-IDs anbinden
- Audio-Anbindung für spätere Aktivierung vorbereiten, auch wenn V1 noch mit Platzhaltern oder ohne aktive Wiedergabe startet
- funktionale Platzhaltergrafiken sind für V1 ausreichend, solange Austauschbarkeit und Lesbarkeit gewahrt bleiben

Definition of Done:
- ein Nutzer kann ohne Debug-Eingriffe eine komplette Partie spielen
- alle wichtigen Zustandsänderungen sind sichtbar nachvollziehbar

Empfohlene Implementierungsreihenfolge:
1. Startscreen und Setup-Flow anbinden
2. Board-Rendering und Spielerpositionen sichtbar machen
3. legale Bewegungen und Exploration-Entscheidungen visualisieren
4. Kampf-, Loot- und Inventarzustände sichtbar machen
5. Event-Log und Endscreen ergänzen

Mindestens diese Tests:
- Spielstart mit Held- und KI-Auswahl funktioniert
- legale Züge und Platzierungsoptionen werden sichtbar angeboten
- Kampf- und Loot-Ergebnisse sind in der UI nachvollziehbar
- Partieende und Ranking werden angezeigt

### Milestone 7 – KI V1
Ziel: Regelkonforme heuristische KI für vollständige Partien.

Enthalten:
- legale Aktionsmenge aus Engine ableiten
- heuristische Bewertungslogik implementieren
- Heilung, Truhen, Ausrüstung, Risiken und Spezialfähigkeiten berücksichtigen
- Drachenkampf nur bei sinnvoller Erfolgswahrscheinlichkeit suchen
- deterministische Seed-Tests für KI-Partien ergänzen
- Balancing-Parameter und Heuristikgewichte zentral anpassbar anlegen

Definition of Done:
- KI kann eine Partie bis zum Ende spielen
- KI verletzt keine Regeln
- KI-Verhalten ist reproduzierbar testbar

Empfohlene Implementierungsreihenfolge:
1. legale Aktionsmenge aus der Engine vollständig nutzbar machen
2. einfache Bewertungsheuristiken für Bewegung und Kampf bauen
3. Heilung, Schlüssel, Zauber und Inventarentscheidungen ergänzen
4. Heldenspezifika pro KI-Zug berücksichtigen
5. Endgame- und Drachenlogik verfeinern

Mindestens diese Tests:
- KI wählt nur legale Aktionen
- KI kann mehrere Züge mit festem Seed reproduzierbar spielen
- KI nutzt Heilung und Schlüssel in plausiblen Standardsituationen
- KI beendet vollständige Partien ohne Regelverletzung
- vorgeschlagene Balancing-Werte bleiben reproduzierbar und leicht zentral anpassbar

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

Empfohlene Implementierungsreihenfolge:
1. Serialisierung des vollständigen Laufzeitzustands abschließen
2. Persistenzpunkte im Spielzyklus definieren
3. Auto-Resume und Resume/New-Game-Flow anbinden
4. Schema-Versionierung absichern
5. Edge Cases und UX-Lücken bereinigen

Mindestens diese Tests:
- laufender Spielstand wird gespeichert und wieder geladen
- Reload führt nicht zu inkonsistentem Zustand
- unbekannte oder alte Versionsstände werden kontrolliert behandelt
- Resume/New-Game-Flow verhält sich eindeutig

### Milestone 9 – V1-Abnahme
Ziel: Formale Fertigstellung des V1-Scopes.

Enthalten:
- komplette Browser-Partie von Start bis Endwertung validieren
- finale Regressionstests laufen lassen
- bekannte Kernregeln gegen Spezifikation prüfen
- Build- und Startanleitung finalisieren
- GitHub-Pages-Kompatibilität des Produktions-Builds prüfen
- Android-Post-V1-Roadmap kurz dokumentieren

Definition of Done:
- vollständige Partie spielbar
- Endwertung korrekt
- alle 6 Helden implementiert
- KI beendet Partien regelkonform
- Browser-Build ist stabil
- Produktions-Build ist für Veröffentlichung über GitHub Pages geeignet

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

