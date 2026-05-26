# Down in the Dragon's Lair

## Game
*Down in the Dragon's Lair* is a browser-based dungeon board game for 2 to 5 players. One human-controlled hero faces 1 to 4 AI opponents in a race through an expanding labyrinth of corridors, chambers, monsters, and treasure.

Your goal is to push deeper into the dungeon, survive its dangers, gather the right equipment, and reach the dragon's lair before your rivals can claim victory. Each turn combines exploration, tactical movement, combat, and risk management: revealing new tiles, navigating branching paths, fighting monsters, healing, collecting weapons, spells, and keys, and adapting to an evolving board state as the dungeon grows around the players.

Core features include deterministic game logic, AI-controlled opponents, seeded setups, persistent save/resume support, dungeon tile exploration, hero-specific loadouts, combat encounters, item and spell progression, and a full browser play experience backed by a dedicated UI and audio layer.

The current GitHub Pages version is playable here:
[Down in the Dragon's Lair on GitHub Pages](https://tnordsiek.github.io/down_in_the_dragons_lair/)

## Motivation
This is a small educational and hobby project that combines the enjoyable and interesting with the practical. In this specific case, the goal was to compile sufficiently detailed documentation of the requirements and robust guidelines that would enable Codex to independently create a fully functional core version of the game. 

## Technology
The project is built as a React frontend with TypeScript and Vite. The game rules run in a deterministic, testable engine, while UI, persistence, audio, and AI are separated into dedicated modules. Quality assurance relies on Vitest for unit and integration coverage, Playwright for end-to-end checks, and ESLint, Prettier, and a production build step for release verification.

## Development
Code powered by Codex
Graphics powered by Nano Banana
Concept and AI Direction by fnord GAMES (2026)
