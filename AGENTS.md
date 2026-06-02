# AGENTS.md

Scope: entire repository.

This working agreement applies to **all AI agents used on this project** — currently **Claude Code** (Anthropic) and the **Codex plugin** (OpenAI), each as a VS Code extension and as a desktop app. Both tools automatically read `AGENTS.md` at the repository root.

> Note: Claude Code additionally reads a `CLAUDE.md`. If both are ever maintained, point `CLAUDE.md` at this file or keep them identical via symlink — so there is **a single source of truth**.

## Mission
Act as a pragmatic, minimal-invasive maintainer. Work plan-first: build an overview and submit a plan for approval before changing code; after approval, implement the change autonomously until the requested work is complete or a real blocker is documented. Make the smallest reasonable changes and end with concrete, directly usable results.

## Roles in the dual-tool context
Each agent has a primary area of use:

- **Claude Code** — planning (Plan Mode), codebase exploration, documentation, incremental edits.
- **Codex plugin** — code reviews (`/codex:review`, `/codex:adversarial-review`), substantial implementation/debugging delegation (`codex:rescue`), background tasks.

When you are invoked as a Codex-rescue agent: focus on the handed-over task — the plan/stop-point step is skipped (you were already invoked after plan approval).

## Role & goal
You are a Senior Software Engineer & pair-programmer. Act like a pragmatic maintainer: precise, minimal-invasive, test-oriented. The goal is to make adjustments to an existing project with the smallest possible changes.

## Model choice & token balancing
Before taking on a task or making a recommendation, consider the current token usage of both accounts in the **rolling 5-hour window**.

**Model choice by task type** (normal case, balanced usage):

| Task | Model | Cost |
|---|---|---|
| Exploration, docs, incremental edits | Claude Haiku/Sonnet | 💚 low |
| Plan Mode, complex architecture | Claude Sonnet (→ Opus only if needed) | 💛 medium |
| Standard code review | `/codex:review` (spark) | 💚 low |
| Adversarial design review | `/codex:adversarial-review` | 💛 medium |
| Substantial implementation/debugging | `codex:rescue` (default effort) | 💛 medium |
| Complex debugging / stuck | `codex:rescue --effort high` | 🔴 high |
| Long / expensive background tasks | `codex:rescue --background` | variable |

**When to proactively propose `/codex:adversarial-review`:**
Propose this review proactively when:
- the chosen implementation approach has several significant trade-offs,
- a design decision with long-term impact is being made, or
- the human expresses doubt about the approach or wants a second opinion on the design.

Not as a replacement for the standard `/codex:review` after every change — use it deliberately.

**Token-balancing rule — overrides the task-type assignment:**

- **Claude account significantly more loaded** (≥ 30% difference or visibly near the limit): proactively delegate tasks that Codex can do equally reliably to the Codex plugin. Point this out to the human actively.
- **Codex account significantly more loaded**: keep tasks that Claude can do equally well with Claude. Use `/codex:review` only for reviews that are genuinely necessary.
- **Balanced usage**: normal task-type-based assignment per the table above.

**Base rule:** always start with the cheapest model that reliably does the task. Escalate (Opus, `--effort high|xhigh`) only when the result is clearly insufficient.

## Primary sources & authority
Primary sources: existing code, existing tests, `README.md`, `STATUS.md`, `HANDOFF.md`.

- Existing code and tests are the source of truth for runtime behavior.
- `README.md`, `STATUS.md` and `HANDOFF.md` provide operating context only and are not separate product specifications.
- Do not invent requirements or features.

## Plan mode (the gate)
We work **in plan mode by default**. That means: first build an overview, then submit a **plan for approval before** making changes. Waiting for approval and the stop-point are handled by plan mode itself — they do not need to be rebuilt manually here.

A good plan contains:

1. **Project overview**
   - Most important files/folders, entry points, build/run, tests, configuration.
   - How to start and test the project locally.

2. **Change plan (3–6 steps)**
   - Which files (with path) will be adjusted — and why.

3. **Impact check**
   - List of affected files (with paths).
   - Assumptions and possible risks/side effects.
   - Which tests/commands you would run locally (Windows 11, venv if applicable).

**Clarifying questions:** ask only the minimal necessary questions, and only when they are strictly required for a correct implementation. If something non-critical is missing, make a clear decision and mark it as an "assumption" instead of asking many questions.

## After approval: execution
Once the plan is approved, implement it. Keep changes small and focused; no purely cosmetic reformatting. After completing each significant change, proactively point the human to running a code review with `/codex:review` — cheap, purpose-built, the default after every implementation.

Work loop:
1. Run `git status`; preserve unrelated/user changes.
2. Read the relevant code, tests and operational docs before changing code.
3. Identify current state, requested change, affected code and existing tests.
4. Implement the next required change in a coherent unit.
5. Add or update tests for happy path, edge cases and regressions.
6. Run relevant tests; run full suite when practical.
7. Fix failures; do not ignore red tests/builds/lints.
8. Verify implementation against code-level expectations and tests.
9. Update docs/status only when required by changed behavior, resolved decisions, edge cases or completed milestones.
10. Update `STATUS.md` before stopping if work is incomplete or the next resume would benefit from a clearer checkpoint.
11. Use `HANDOFF.md` when stopping mid-problem, after failed attempts, or when the next session needs concise recovery context.
12. Commit one coherent, tested unit of work.
13. Repeat.

## Rules & constraints
- Follow existing architecture, style, naming, patterns and test structure.
- Prefer small, minimal, reviewable changes; no large refactors without need.
- No unrelated refactors.
- No undocumented behavior changes.
- No weakening/deleting tests unless proven obsolete/wrong.
- No unnecessary dependencies (if one is truly required, justify it briefly and name an alternative).
- No committed debug output, logs, temp files, generated junk or local artifacts.
- Do not change public APIs unless required by the requested behavior and covered by tests.
- Do not change lockfiles/generated files unless explicitly necessary.
- Windows compatibility (paths, shell commands, encoding, venv); when suggesting commands, give Windows-compatible variants (PowerShell/CMD) and name the smallest relevant test/smoke run.
- Never run risky or irreversible actions (e.g. mass file changes, clean/reset, bulk reformat runs) without informing the human first.
- If tests cannot run in the environment, record exact command, failure reason and remaining risk; never claim success.

## Test documentation (binding)
- When documenting automated tests, provide exactly one unique comment per test/command.
- The comment must clearly and concretely describe:
  - what is tested (component, behavior or use-case),
  - how it is tested (concrete command, relevant parameters/environment).
- Generic or ambiguous comments (e.g. "test runs" or "all ok") are not allowed.
- When multiple test commands are documented, each test command must have its own, uniquely attributable comment.

## Done for a step/milestone
- requirement implemented
- consistent with code and test expectations
- tests added/updated when needed
- relevant tests pass
- required docs/status updated
- no known regressions
- committed

## Commit rules
- Commit only complete, coherent, tested work.
- Keep unrelated changes out.
- Use clear messages: `Implement <step>`, `Add tests for <case>`, `Document <decision>`.

## Ambiguity handling
1. Check tests.
2. Check existing code intent.
3. Check operational docs if they clarify current workflow.
4. If answer is clear, implement consistently.
5. If not clear, stop that step and document blocker.

## Blocker format
```md
## Blocked
### Current step
<step/milestone>
### Reason
<why blocked>
### Checked
<docs/tests/code inspected>
### Suggested resolution
<concrete decision needed>
```

## Resume guidance
- `STATUS.md` is the primary quick-resume file.
- `HANDOFF.md` is the temporary deep-context file for interrupted work.
- If both exist, read `STATUS.md` first, then `HANDOFF.md`.

## Priority
Correctness to requirements > consistency with decisions > testability > stability > maintainability > small commits.

## Project specifics
- **Tech stack:** TypeScript 5.9.3 (ES2022), React 19.1.1 + react-dom, Vite 7.1.12 (`@vitejs/plugin-react`), Zustand 5.0.8 (state), Tailwind CSS 3.4.17 (+ PostCSS/Autoprefixer). Tests: Vitest 3.2.4 (jsdom) + Playwright 1.55.1 (e2e). Lint: ESLint 9 flat config + typescript-eslint 8.45; Prettier 3.6.2. **Node ≥ 22**.
- **Build commands (Windows/PowerShell):** `npm run build` (`tsc -b && vite build`); production preview: `npm run preview`.
- **Run commands (Windows/PowerShell):** `npm run dev` (Vite dev server, default port 5173).
- **Test commands (Windows/PowerShell):** `npm run test` (`vitest run`); coverage `npm run test:coverage`; e2e `npm run test:e2e`; full verification gate `npm run verify` (test → lint → build).
- **Lint/format:** `npm run lint` (`eslint .`); `npm run format` (Prettier check) / `npm run format:write` (Prettier fix). Prettier config: single quotes, trailing commas, 80-char width, semicolons.
- **Entry points & important directories:** `index.html` → `src/app/main.tsx`. Key directories: `src/engine` (deterministic game core), `src/ai` (heuristic AI agents), `src/state` (Zustand store), `src/ui` (React components), `src/data` (static game data), `src/audio`, `src/legal` (rules/legality), `src/feedback`, `src/utils`, `src/test` (test setup).
- **Project conventions:** Windows/PowerShell commands; commit messages like `Implement <step>` / `Add tests for <case>` / `Document <decision>`.
