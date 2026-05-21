# Down in the Dragon's Lair

Browserbasiertes Dungeon-Brettspiel fuer 2 bis 5 Spieler mit einem menschlichen Spieler, 1 bis 4 KI-Gegnern und deterministischer, testbarer Spielengine.

## Repo-Wahrheit
Gameplay-Regeln, Datenmodell, KI-Verhalten und technische Struktur werden in diesem Repository nicht mehr als separate Markdown-Spezifikation gepflegt. Verbindlich sind der implementierte Code und die zugehoerigen Tests.

`README.md` bleibt Einstiegs- und Betriebsdoku. `STATUS.md` und `HANDOFF.md` sind reine Resume-Dateien. Historische Produktentscheidungen werden nicht mehr in separaten Markdown-Dateien fortgefuehrt.

## Einstieg
- Verwende fuer die lokale Entwicklung die in `.nvmrc` festgelegte Node-Version.
- Lies `AGENTS.md`, wenn du im Repository als Codex-Arbeitsagent weiterarbeitest.

## Lokale Entwicklung
```sh
npm install
npm run dev
```

## Qualitaetssicherung
```sh
npm run test
npm run lint
npm run format
npm run build
npm run verify
npm run test:e2e
```

Empfohlener lokaler Vorab-Check:
- bei gezielten Aenderungen zuerst `npm run test -- <betroffene datei>`
- vor Abschluss eines Arbeitsblocks immer `npm run build`
- fuer einen kompletten manuellen Schnellcheck ohne E2E: `npm run verify`

## Veroeffentlichung
Der Produktions-Build wird mit `npm run build` erzeugt. `vite.config.ts` setzt im GitHub-Actions-Kontext automatisch den passenden `base`-Pfad fuer GitHub Pages Projektseiten.
