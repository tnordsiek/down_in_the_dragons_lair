# V1 Acceptance

## Scope Status
- Browser game starts from the setup screen.
- Human hero selection and AI count selection are implemented.
- The board, legal movement, exploration, placement, combat, loot, inventory, event log and final ranking are visible in the UI.
- All six documented heroes have rule coverage.
- AI actions are derived from engine-legal actions and are covered by deterministic seeded tests.
- Local resume uses `localStorage` and rejects unsupported serialized schema versions.
- Production build paths are compatible with GitHub Pages project pages through the Vite `base` configuration.

## Validation
- `npm run test`
- `npm run lint`
- `npm run format`
- `npm run build`
- `npm run test:e2e`

The E2E suite covers setup-to-board startup and a resumed browser endgame that resolves a dragon fight and displays final ranking.

## Known Residual Risk
AI regression coverage verifies legal seeded multi-step play, deterministic reproducibility and deterministic dragon endgame completion. Exhaustive arbitrary-seed start-to-dragon completion remains heuristic-dependent and should be expanded during post-V1 balancing.

## GitHub Pages
For repository project pages, run the production build in GitHub Actions with:

```sh
npm ci
npm run build
```

When `GITHUB_ACTIONS=true` and `GITHUB_REPOSITORY` is set, `vite.config.ts` derives the repository name and emits project-page-relative asset URLs such as `/repository-name/assets/...`. User or organization pages ending in `.github.io` keep `/` as the base path.

## Android Post-V1 Roadmap
- Keep engine, data, serialization and AI browser-independent.
- Extract a platform-neutral game controller facade before adding a native shell.
- Reuse the same serialized `GameState` schema for migration tests.
- Build Android UI separately against the existing engine contracts.
- Defer touch-specific layout, offline packaging and store distribution until after V1 browser stabilization.
