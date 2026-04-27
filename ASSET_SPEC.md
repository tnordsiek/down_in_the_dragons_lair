# ASSET_SPEC

## Zweck
Diese Datei führt alle vorgesehenen austauschbaren Medien- und Präsentationselemente für V1 als Asset-Manifest.

Ziel:
- von Anfang an stabile Asset-IDs verwenden
- Platzhalter und finale Assets sauber austauschbar halten
- visuelle und akustische Anforderungen zentral dokumentieren
- Implementierung, UI und spätere Art-/Audio-Ersetzung entkoppeln

## Geltungsbereich
Dieses Dokument ist normativ für:
- verwendete Asset-Kategorien
- stabile Asset-IDs
- technische Asset-Anforderungen
- Austauschbarkeit von Platzhaltern

Dieses Dokument definiert keine Spielregeln und keine Produktlogik.

## Grundregeln
- Code und UI referenzieren Assets über stabile `assetId`-Werte, nicht über harte Dateinamen.
- Platzhalter-Assets sind in V1 zulässig, solange sie später ohne Logikänderung austauschbar bleiben.
- Sichtbare Namen, Grafiken und Sounds müssen separat von der Spiellogik austauschbar bleiben.
- Asset-Mappings sollen später maschinenlesbar in einer Daten-Datei abbildbar sein.
- Für V1 sollen einfache funktionale Platzhalter bevorzugt werden, wenn sie Implementierungszeit sparen und keine UI- oder Testlogik blockieren.

## Asset-Felder
Jeder Asset-Eintrag sollte mindestens diese Felder pflegen:
- `assetId`: stabile technische ID
- `category`: z. B. `icon`, `tile`, `token`, `portrait`, `ui`, `background`, `fx`, `audio`
- `purpose`: wofür das Asset verwendet wird
- `usedBy`: UI-Bereich oder Spielsystem
- `format`: z. B. `svg`, `png`, `webp`, `mp3`, `ogg`, `wav`
- `placeholderAllowed`: `true` oder `false`
- `replaceableAfterV1`: `true` oder `false`
- `spec`: Kurzbeschreibung von Größe, Verhalten oder Qualitätsanforderung

Optionale Zusatzfelder:
- `variants`
- `notes`
- `loop`
- `transparentBackground`
- `targetPx`
- `aspectRatio`
- `volumeRole`

## Kategorien für V1

### 1. Tile-Grafiken
Für die Darstellung des Boards und der unterschiedlichen Tile-Typen.

Beispiele:
- `tile_start_cross_healing`
- `tile_tunnel_straight`
- `tile_tunnel_corner`
- `tile_tunnel_t_junction`
- `tile_tunnel_cross`
- `tile_room_straight`
- `tile_room_corner`
- `tile_room_t_junction`
- `tile_room_cross`
- `tile_healing_corner`
- `tile_teleport_straight`

Spezifikation:
- bevorzugt `svg`
- quadratisches Seitenverhältnis
- rotierbar ohne Qualitätsverlust
- Platzhalter in V1 erlaubt

### 2. Token- und Feldinhalte
Für Monster, Schatztruhen, lose Gegenstände und Zustandsmarker.

Beispiele:
- `token_treasure_chest`
- `token_giant_rat`
- `token_giant_spider`
- `token_mummy`
- `token_skeleton_turnkey`
- `token_skeleton_warrior`
- `token_skeleton_king`
- `token_fallen`
- `token_dragon`
- `item_weapon_1`
- `item_weapon_2`
- `item_weapon_3`
- `item_spell_flame`
- `item_spell_healing`
- `item_key`
- `status_curse`
- `status_unconscious`

Spezifikation:
- bevorzugt `svg`
- transparenter Hintergrund
- auch in kleinen Größen lesbar
- Platzhalter in V1 erlaubt

### 3. Helden-Assets
Für Spieleridentität, Auswahl und Statusanzeige.

Beispiele:
- `hero_mage_portrait`
- `hero_warrior_portrait`
- `hero_warlock_portrait`
- `hero_thief_portrait`
- `hero_swordsman_portrait`
- `hero_oracle_portrait`
- `hero_mage_token`
- `hero_warrior_token`
- `hero_warlock_token`
- `hero_thief_token`
- `hero_swordsman_token`
- `hero_oracle_token`

Spezifikation:
- Portrait und Board-Token getrennt behandelbar
- Platzhalter in V1 erlaubt
- sichtbarer Anzeigename muss separat austauschbar bleiben

### 4. UI- und Layout-Assets
Für Bedienung, Panels und generische Oberflächenelemente.

Beispiele:
- `ui_logo_wordmark`
- `ui_button_primary`
- `ui_button_secondary`
- `ui_panel_frame`
- `ui_modal_frame`
- `ui_icon_move`
- `ui_icon_attack`
- `ui_icon_heal`
- `ui_icon_inventory`
- `ui_icon_log`

Spezifikation:
- möglichst stilistisch konsistent
- Icons bevorzugt als `svg`
- dekorative Elemente austauschbar halten

### 5. Hintergründe und Atmosphäre
Für Startscreen, Hauptansicht und Endscreen.

Beispiele:
- `bg_start_screen`
- `bg_game_table`
- `bg_end_screen`
- `bg_panel_texture`

Spezifikation:
- darf in V1 als einfacher Platzhalter starten
- keine Abhängigkeit der Logik von konkreten Assets

### 6. Soundeffekte und Audio
Ja, Soundeffekte sollen hier ausdrücklich mitgeführt werden.

Beispiele:
- `sfx_button_click`
- `sfx_tile_place`
- `sfx_chest_open`
- `sfx_monster_reveal`
- `sfx_combat_roll`
- `sfx_combat_win`
- `sfx_combat_draw`
- `sfx_combat_loss`
- `sfx_heal`
- `sfx_curse_apply`
- `sfx_teleport`
- `sfx_game_over`

Spezifikation:
- bevorzugt `ogg` oder `mp3`, bei Bedarf zusätzlich `wav` als Quelle
- kurze, klar trennbare Einzelereignisse
- Lautstärke und Trigger von Logik entkoppeln
- Platzhalter in V1 erlaubt
- Audio muss in V1 technisch vorbereitet, aber nicht zwingend vollständig implementiert sein

### 7. Musik
Optional für V1, aber bereits austauschbar modellierbar.

Beispiele:
- `music_menu_loop`
- `music_game_loop`
- `music_end_screen`

Spezifikation:
- loop-fähig
- separat ein-/ausschaltbar
- darf in V1 fehlen oder stumm bleiben

## Empfohlene erste V1-Pflichtliste
Diese Assets sollten früh mit stabilen IDs vorgesehen werden:
- alle Tile-Grafiken
- alle Monster-/Truhen-Token
- alle Heldentoken oder Heldenportraits
- zentrale UI-Icons
- zentrale Soundeffekte für Platzieren, Kampf, Truhe, Heilung und Spielende

Hinweis:
- Diese Pflichtliste verlangt stabile IDs, aber keine finalen Illustrationen.
- Einfache geometrische, farbcodierte oder textbasierte Platzhalter sind für V1 ausdrücklich ausreichend.

## Implementierungshinweis
Spätere Code-Struktur kann z. B. so aussehen:

```ts
type AssetSpec = {
  assetId: string
  category: string
  purpose: string
  usedBy: string[]
  format: string
  placeholderAllowed: boolean
  replaceableAfterV1: boolean
  spec: string
}
```

Die eigentliche Runtime-Zuordnung kann später z. B. in `src/data/assets.ts` erfolgen.

Für den Projektstart wird zusätzlich eine maschinenlesbare Datei `assets.manifest.json` im Repository geführt.


