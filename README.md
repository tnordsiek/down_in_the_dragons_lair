# Down in the Dragon's Lair

Browserbasiertes Dungeon-Brettspiel mit eigener IP und einer klar definierten, projektspezifischen Spielmechanik für V1.

## Ziel des Projekts
Dieses Repository definiert die fachliche und technische Grundlage, auf der Codex die erste spielbare Version implementieren soll.

## Produktkern
- Einzelspieler im Browser
- 1 menschlicher Spieler
- 1 bis 4 KI-Gegner
- insgesamt 2 bis 5 Spieler pro Partie
- deterministische, testbare Spielengine
- vollständig eigene Namen, Texte, Grafiken und UI

## Dokumentstruktur
- `PRD.md` – normative Produktanforderungen, Scope und UX-Ziele
- `GAME_RULES.md` – normative spielbare Regeln für V1
- `GAME_DATA_MODEL.md` – normatives fachliches Datenmodell
- `ARCHITECTURE.md` – normative technische Zielarchitektur
- `AI_CONCEPT.md` – KI-Ziele und Heuristikrichtung
- `IMPLEMENTATION_PLAN.md` – normative Umsetzungsreihenfolge und Milestones
- `RULE_EDGE_CASES.md` – normative Edge-Case-Entscheidungen
- `LEGAL_AND_IP_NOTES.md` – normative IP- und Quellen-Leitplanken
- `ASSET_SPEC.md` – normatives Asset-Manifest für Grafik-, UI- und Audioelemente
- `AGENTS.md` – Arbeitsmodus und Ausführungsregeln für Codex

## Dokumentenrollen
- `README.md` ist Einstieg und Orientierung, nicht die führende Spezifikation.
- `PRD.md` beschreibt das Produkt-`was`.
- `IMPLEMENTATION_PLAN.md` beschreibt das Umsetzungs-`wie` und die Reihenfolge.
- Bei Regeldetails entscheiden `GAME_RULES.md`, `GAME_DATA_MODEL.md` und `RULE_EDGE_CASES.md`.
- Für IP- und Quellenfragen gilt `LEGAL_AND_IP_NOTES.md`.
- Für austauschbare Grafik-, UI- und Audioelemente gilt `ASSET_SPEC.md`.

## Einstieg
- Lies zuerst `AGENTS.md`.
- Für Produktvorgaben lies `PRD.md`.
- Für die Umsetzungsreihenfolge lies `IMPLEMENTATION_PLAN.md`.
- Für Regel- und Datenfragen arbeite von `GAME_RULES.md` und `GAME_DATA_MODEL.md` aus.

