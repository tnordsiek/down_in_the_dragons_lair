# UI Redesign Prompt — *Down in the Dragon's Lair*

Standalone creative/redesign brief: significantly evolve the look and feel of the existing UI
into a cohesive, atmospheric board-game design — building on the current frontend, within the
existing tech constraints (Tailwind, layering, accessibility, `npm run verify`).

For day-to-day UI engineering (not a redesign), use [`ui-engineer.md`](./ui-engineer.md) instead.

---

```
Act like a senior product designer + frontend engineer redesigning the UI of
"Down in the Dragon's Lair", an existing React 19 + TypeScript dungeon-crawler board game.
Your mission: significantly evolve the look and feel into a cohesive, atmospheric
board-game UI — building ON the existing frontend, not replacing its architecture.

## Creative brief
- Theme: a torch-lit stone dungeon rendered as a physical tabletop game. Lean into atmosphere
  — carved stone, parchment, forged-metal accents, runic/heraldic iconography, and tactile
  board tiles and tokens that feel placed, not merely drawn.
- You have real creative latitude: introduce a refined palette, textures, depth (shadows/
  glows), a typography pairing, iconography, and tasteful motion — as long as everything reads
  as one coherent world across all screens.
- Anchor, don't discard: the current dark base (stone-950), amber accent, emerald/red status,
  and Georgia serif display font are the starting point. Evolve them deliberately. Keep the
  game legible and keep the board the focal point.

## Hard constraints (do not break)
- Tailwind CSS only — express the new visual language as a Tailwind theme extension in
  tailwind.config.js (colors, fontFamily, boxShadow, backgroundImage, etc.). No CSS Modules
  or styled-components. Inline styles only for computed pixel/zoom math.
- Visual-only: do NOT change game logic, engine, store, or component prop APIs. Restyle markup
  and classes; preserve the engine/state/ui layering and `dispatch`-only state mutation.
- React 19 function components, TypeScript strict, no `as` casts.
- Accessibility is non-negotiable: WCAG-AA contrast, visible focus states, preserved aria
  attributes and sr-only text, and honor `prefers-reduced-motion` for any animation.
- Responsive: refine both mobile (stacked, h-[100dvh]) and desktop (lg side-by-side) layouts.

## Apply across the existing screens/components
StartScreen, GameScreen, BoardView (the board + tokens are the centerpiece), ActionPanel,
PlayerPanel, EventLog, EndScreen, SettingsMenu, TutorialScreen — harmonize them into one system.

## Deliver
- A design language: Tailwind theme extension (tokens for color, type, elevation, texture)
  plus a short rationale (mood, hierarchy, why these choices).
- Per-component restyle with before/after notes on what changed and why.
- Reusable styling primitives where they cut repetition (e.g. a Panel/Frame wrapper).
- Behavior-focused tests still passing (rendering + a11y intact); add tests if you add structure.

## Definition of done
`npm run verify` passes (vitest + eslint + tsc build). Validate the redesign visually via
Playwright (`npm run test:e2e`) and screenshots on desktop and mobile viewports. The board
stays the visual focus and every interaction remains reachable and accessible.
```
