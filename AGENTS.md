# AGENTS.md

Scope: entire repository.

Mission: implement repository changes autonomously until the requested work is complete or a real blocker is documented.

Primary sources: existing code, existing tests, `README.md`, `STATUS.md`, `HANDOFF.md`.

Authority:
- Existing code and tests are the source of truth for runtime behavior.
- `README.md`, `STATUS.md` and `HANDOFF.md` provide operating context only and are not separate product specifications.
- Do not invent requirements or features.

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

Rules:
- Follow existing architecture, style, naming, patterns and test structure.
- Prefer small, minimal, reviewable changes.
- No unrelated refactors.
- No undocumented behavior changes.
- No weakening/deleting tests unless proven obsolete/wrong.
- No unnecessary dependencies.
- No committed debug output, logs, temp files, generated junk or local artifacts.
- Do not change public APIs unless required by the requested behavior and covered by tests.
- If tests cannot run in the environment, record exact command, failure reason and remaining risk; never claim success.

Done for a step/milestone:
- requirement implemented
- consistent with code and test expectations
- tests added/updated when needed
- relevant tests pass
- required docs/status updated
- no known regressions
- committed

Commit rules:
- Commit only complete, coherent, tested work.
- Keep unrelated changes out.
- Use clear messages: `Implement <step>`, `Add tests for <case>`, `Document <decision>`.

Ambiguity handling:
1. Check tests.
2. Check existing code intent.
3. Check operational docs if they clarify current workflow.
4. If answer is clear, implement consistently.
5. If not clear, stop that step and document blocker.

Blocker format:
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

Resume guidance:
- `STATUS.md` is the primary quick-resume file.
- `HANDOFF.md` is the temporary deep-context file for interrupted work.
- If both exist, read `STATUS.md` first, then `HANDOFF.md`.

Priority: correctness to requirements > consistency with decisions > testability > stability > maintainability > small commits.
