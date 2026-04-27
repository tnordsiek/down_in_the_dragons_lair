# GAME_RULES – Version 1

## 1. Grundprinzip
V1 definiert die maßgebliche Spielmechanik dieses Projekts. Diese Datei ist die maßgebliche spielbare Spezifikation für die Engine.

Dieses Dokument ist normativ für die allgemeinen Spielregeln, Kernabläufe und Hauptsysteme von V1. Falls Detail- oder Timingfragen offen bleiben, konkretisiert `RULE_EDGE_CASES.md` diese Regeln für die Implementierung.

## 2. Spieleranzahl
- 2 bis 5 Gesamtspieler
- davon genau 1 menschlicher Spieler
- 1 bis 4 KI-Spieler

## 3. Spielziel
Das Spiel endet sofort, wenn der Drache besiegt wird. Gewinner ist der Spieler mit den meisten Schatzpunkten. Der Held, der den Drachen besiegt, gewinnt nicht automatisch.

## 4. Wertung
- normale Schatztruhe: 1 Punkt
- Schatz von `fallen`: 1 Punkt
- Drachenschatz: 1.5 Punkte
- bei Gleichstand gibt es mehrere Sieger

## 5. Aufbau
- `start_cross_healing` in die Mitte setzen
- alle übrigen 79 Labyrinthfelder verdeckt mischen
- Monster- und Schatzplättchen gemeinsam in einen Beutel bzw. eine virtuelle Draw-Struktur legen
- jeder Spieler erhält 5 Lebenspunkte
- jeder Spieler erhält genau einen Helden
- Helden sind pro Partie eindeutig
- der menschliche Spieler wählt seinen Helden zuerst
- die KI-Spieler erhalten anschließend zufällig verbleibende Helden ohne Duplikate
- alle Helden starten auf dem Startfeld
- Startspieler wird per Würfel bestimmt
- bei Gleichstand um den Startspieler wird der Wurf zwischen den betroffenen Spielern wiederholt

## 6. Zugstruktur
Jeder Zug hat maximal 4 Schritte. Ein Schritt ist eine Bewegung auf ein angrenzendes Feld oder eine Teleport-Nutzung nach den Regeln.

### Zugphasen
1. Zugstart
2. Bewegung und ggf. Aufdecken neuer Felder
3. Feldauflösung
4. optional Kampf
5. Zugende

## 7. Entdecken neuer Felder
Wenn ein Held in eine Richtung zieht, in der noch kein Feld liegt, läuft die Exploration so ab:
1. Richtung deklarieren
2. genau ein neues Labyrinthfeld ziehen
3. aus den legalen Rotationen des gezogenen Feldes wählen
4. Feld anlegen
5. Held betritt das Feld sofort

Das neu gezogene Feld muss an die Ausgangskante passen. Andere Seiten dürfen Sackgassen bilden.

## 8. Feldtypen
### 8.1 Tunnel
- keine sofortige Sonderwirkung
- Bewegung kann fortgesetzt werden, falls Schritte übrig sind

### 8.2 Raum
Beim erstmaligen Entdecken wird genau ein Plättchen gezogen:
- Schatztruhe oder
- Monster

Falls eine Schatztruhe gezogen wird:
- die Truhe bleibt auf dem Feld
- wenn der aktive Held einen Schlüssel hat und seinen Zug auf diesem Feld beendet, kann die Truhe geöffnet werden

Falls ein Monster gezogen wird:
- sofortiger Kampf

### 8.3 Teleportfeld
- ein einzelnes entdecktes Teleportfeld hat keine Wirkung
- erst mit mindestens zwei entdeckten Teleportfeldern darf für einen Schritt zu einem anderen entdeckten Teleportfeld gereist werden

### 8.4 Heilquelle
- wenn ein Held seinen Zug hier beendet, wird er vollständig geheilt
- vorhandener Fluch wird entfernt
- das Startfeld zählt ebenfalls als Heilquelle

## 9. Tile-Topologien und Verteilung
Die offenen Seiten werden in Grundorientierung so beschrieben:
- `A` liegt gegenüber `C`
- `B` liegt gegenüber `D`

### 9.1 Tunnel-Tiles
- `tunnel_straight`: offen auf `A,C`, Anzahl 4
- `tunnel_corner`: offen auf `A,B`, Anzahl 4
- `tunnel_t_junction`: offen auf `A,B,C`, Anzahl 5
- `tunnel_cross`: offen auf `A,B,C,D`, Anzahl 7

### 9.2 Raum-Tiles
- `room_straight`: offen auf `A,C`, Anzahl 17
- `room_corner`: offen auf `A,B`, Anzahl 9
- `room_t_junction`: offen auf `A,B,C`, Anzahl 13
- `room_cross`: offen auf `A,B,C,D`, Anzahl 14

### 9.3 Spezial-Tiles
- `healing_corner`: wie `tunnel_corner`, Anzahl 2
- `teleport_straight`: wie `tunnel_straight`, Anzahl 4
- `start_cross_healing`: wie `tunnel_cross` plus Heilwirkung, Anzahl 1

### 9.4 Gesamtumfang
V1 verwendet einen festen, endlichen Tile-Pool von insgesamt 80 Labyrinthfeldern inklusive Startfeld.

## 10. Bewegung auf bereits entdeckten Feldern
- maximal 4 Schritte pro Zug gelten weiter
- Monster blockieren das Durchlaufen normaler Helden
- um Gegenstände aufzuheben, Truhen zu öffnen oder Heilung zu erhalten, muss der Zug auf dem Feld enden
- Monster oder Truhen entstehen nur beim ersten Entdecken eines Raumes

## 11. Kampfregeln
- ein Kampf wird mit 2W6 ausgewertet
- Boni aus Waffen, Zaubern und Heldenfähigkeiten werden addiert
- ein Monster wird nur besiegt, wenn der Gesamtwert strikt größer als seine Stärke ist
- bei Gleichstand ist das Ergebnis unentschieden
- bei Niederlage verliert der Held 1 Lebenspunkt
- bei Niederlage oder Unentschieden kehrt der Held auf sein vorheriges Feld zurück
- nach einem Kampf endet der Zug, außer eine Heldenfähigkeit erlaubt ausdrücklich anderes

## 12. Lebenspunkte und Ohnmacht
- jeder Held startet mit 5 Lebenspunkten
- bei verlorenen Kämpfen verliert der Held 1 Lebenspunkt
- beim Verlust des letzten Lebenspunkts wird der Held ohnmächtig
- Standardverhalten: nächster Zug wird ausgesetzt und 1 Lebenspunkt regeneriert
- wenn ein Held nach verlorenem Kampf auf eine Heilquelle zurückweicht, wird er sofort vollständig geheilt
- Heldenfähigkeiten dürfen diese Logik modifizieren

## 13. Inventar
Jeder Held hat:
- 2 Waffen-Slots
- 3 Zauber-Slots
- 1 Schlüssel-Slot

Überzähliges Equipment muss auf dem aktuellen Feld abgelegt werden.

## 14. Ausrüstung und Effekte
### 14.1 Waffen
- Dagger: +1
- Sword: +2
- Axe: +3

### 14.2 Ember Spell / Flammenzauber
- +1 auf einen Kampf
- darf nach dem Würfelwurf gespielt werden
- mehrere Exemplare können in demselben Kampf verwendet werden

### 14.3 Fountain Charm / Heilzauber
- teleportiert einen gewählten Helden zu einer bereits entdeckten Heilquelle
- heilt vollständig
- entfernt Fluch
- verbraucht keine Schritte
- beendet den Zug nicht automatisch

### 14.4 Schlüssel
- öffnet genau eine Schatztruhe
- wird beim Öffnen verbraucht
- maximal ein Schlüssel pro Held

## 15. Monsterbelohnungen und Schätze
- `giant_rat` gibt einen Dagger (+1)
- `giant_spider` gibt ein Fountain Charm
- `mummy` gibt einen Ember Spell (+1) und verflucht zusätzlich einen anderen Spieler
- `skeleton_turnkey` gibt einen Key
- `skeleton_warrior` gibt ein Sword (+2)
- `skeleton_king` gibt eine Axe (+3)
- `fallen` gibt einen Schatz im Wert von 1 Siegpunkt
- `dragon` gibt den Drachenschatz im Wert von 1.5 Siegpunkten
- `treasure_chest` ist ein eigener Token-Typ und jeweils 1 Siegpunkt wert

## 16. Fluch
- beim Sieg über `mummy` wird ein anderer Spieler verflucht
- verfluchte Helden können ihre Spezialfähigkeit nicht nutzen
- ein Fluch endet beim Zugende auf einer Heilquelle
- es kann immer nur ein verfluchter Spieler gleichzeitig existieren

## 17. Heldenfähigkeiten
Die genauen Datendefinitionen stehen in `GAME_DATA_MODEL.md`. V1 enthält 6 asymmetrische Helden. Ihre Fähigkeiten müssen vollständig umgesetzt werden.

## 18. Siegbedingung
Sobald der Drache besiegt wurde:
- Partie sofort beenden
- Punkte aller Spieler berechnen
- Gewinner mit höchster Punktzahl bestimmen

