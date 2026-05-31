# STATUS

## Purpose
This file captures the latest reliable project state for quick resume after interruption.

Update it when:
- a milestone step is completed
- work is paused mid-milestone
- tests or build verification change the confidence level

## Current milestone
- v1.4 — core game shipped (UI footer label `v1.4`); post-V1 maintenance and polish in progress

## Last completed
- v1.4 version label set; start-screen tutorial; mobile/desktop GUI polish; rules-sync fix; win/defeat end handling
  (commits 43230c7, cebd658, f1fbfb5, 3e05dcc, ab30d9f, 6124d33)

## In progress
- none

## Next steps
1. Expand arbitrary-seed AI completion coverage during post-V1 balancing
2. Replace remaining placeholder visual and audio assets with final project-owned assets
3. Restore Prettier formatting compliance — `npm run format` currently reports 55 files; fix with `npm run format:write`

## Open decisions
- none currently documented

## Known risks
- AI regression coverage verifies legal seeded multi-step play and deterministic dragon endgame completion; exhaustive start-to-dragon completion for arbitrary seeds remains heuristic-dependent.

## Last verification (2026-05-31, v1.4)
- `npm run test` passed (36 files, 383 tests)
- `npm run lint` passed
- `npm run format` FAILED — 55 files have Prettier style issues (`prettier --check .`); fix with `npm run format:write`
- `npm run build` passed (Vite production build, 92 modules)
- `npm run test:e2e` passed (2 Playwright tests)

## Notes
- Update this file before stopping if work is incomplete and not yet committed.
- The core game is complete and shipped as v1.4; use this file for post-release progress or new blockers.
- GitHub Pages deployment is automated via `.github/workflows/deploy-pages.yml` (live build published; see README link).
