# AI_CONCEPT

## 1. Ziel
Die KI in V1 soll regelkonform, stabil und ausreichend nachvollziehbar spielen. Sie muss nicht menschlich täuschen oder optimales Spiel garantieren.

## 2. Grundansatz
Heuristikbasierte Entscheidungslogik auf Basis legaler Aktionen.

Die KI soll von Anfang an so aufgebaut werden, dass Balancing-Werte und Prioritäten später ohne strukturelle Umbauten angepasst werden können.

## 3. KI-Prioritäten
1. illegale oder offensichtlich tödliche Züge vermeiden
2. erreichbare sichere Schatz- und Lootchancen nutzen
3. bei niedrigen Lebenspunkten Heilung priorisieren
4. starke Monster ohne ausreichende Chancen eher vermeiden
5. Heldenfähigkeiten aktiv verwenden, wenn sie klaren Vorteil bringen
6. den Drachen erst mit ausreichender Erfolgswahrscheinlichkeit angreifen

## 4. Entscheidungsdomänen
### Bewegung
- unbekannte Räume bevorzugen, wenn das Risiko vertretbar ist
- bekannte Ressourcenfelder opportunistisch nutzen
- Heilquelle ansteuern, wenn HP kritisch sind

### Kampf
- falls Wahl besteht, nur kämpfen wenn erwarteter Wert sinnvoll ist
- verfügbare Flammenzauber für knappe Kämpfe einsetzen
- heldenspezifische Rerolls oder Boni berücksichtigen

### Inventar
- stärkere Waffen bevorzugen
- Schlüssel nicht verschwenden
- Heilzauber defensiv einsetzen

## 5. Technisches Interface
```ts
interface AiDecisionContext {
  state: GameState
  playerId: string
  legalActions: GameAction[]
}

interface AiAgent {
  chooseAction(ctx: AiDecisionContext): GameAction
}
```

## 6. Entwicklungsstufen
### Stufe 1
- nur gültige Züge
- einfache Prioritäten

### Stufe 2
- bessere Zielwahl
- sinnvoller Ressourceneinsatz

### Stufe 3
- Berücksichtigung von Punktestand und Endgame

## 7. Balancing-Vorbereitung
- Bewertungsgewichte, Risikoschwellen und einfache Zielprioritäten sollen datengetrieben oder zentral konfigurierbar angelegt werden
- falls für V1 konkrete Werte benötigt werden und keine explizite Vorgabe vorliegt, darf eine plausible Startkonfiguration vorgeschlagen und verwendet werden
- Werte zuerst konservativ und testfreundlich wählen
- solche vorgeschlagenen Werte sollen klar von harten Regeln getrennt bleiben

