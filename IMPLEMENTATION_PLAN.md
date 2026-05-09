# IMPLEMENTATION_PLAN

## 1. Status
Der dokumentierte V1-Umsetzungsplan ist abgeschlossen.

Die in der urspruenglichen Fassung beschriebenen Milestones 1 bis 9, die initialen Deliverables und die MVP-Definition-of-Done sind kein offener Arbeitsplan mehr. Der aktuelle umgesetzte Stand wird in `STATUS.md` und `V1_ACCEPTANCE.md` festgehalten.

Dieses Dokument dient daher nicht mehr als Schritt-fuer-Schritt-Implementierungsplan fuer V1, sondern nur noch als knappe Orientierung fuer Post-V1-Arbeit.

## 2. Weiterhin gueltige Planungsgrundsaetze
- die Engine bleibt framework-unabhaengig
- KI nutzt ausschliesslich legale Aktionen aus der Engine
- Zufall bleibt seedbar und deterministisch testbar
- Aenderungen enden in einem lauffaehigen, testbaren Zustand
- Browser-first bleibt die aktive Plattform; Android bleibt Post-V1

## 3. Post-V1-Arbeit
### 3.1 KI-Balancing und Abdeckung
- Seed-Abdeckung fuer vollstaendige KI-Partien ueber mehr Startkonfigurationen erweitern
- Heuristikgewichte weiter gegen reproduzierbare Regressionstests absichern
- Dragon-Endgame-Heuristiken bei Bedarf nachschaerfen

### 3.2 Assets und Praesentation
- Platzhaltergrafiken und optionale Audio-Platzhalter schrittweise durch projektinterne finale Assets ersetzen
- Asset-IDs und Austauschbarkeit beibehalten

### 3.3 Release und Distribution
- Release- und Deployment-Automation fuer das finale Repository-Ziel ausbauen
- GitHub-Pages-Setup nur anpassen, wenn sich das Veroeffentlichungsziel aendert

## 4. Nicht mehr als offene Arbeit fuehren
Die folgenden Punkte gelten fuer V1 als erledigt und sollen nicht mehr als aktive Restliste gepflegt werden:
- Projektgeruest und Tooling
- Core Data Model
- Game Engine
- Combat and Rewards
- alle 6 Heldenfaehigkeiten
- spielbare Browser-UI
- heuristische KI fuer vollstaendige Partien
- Persistenz mit lokaler Wiederaufnahme
- formale V1-Abnahme
