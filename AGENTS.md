# AGENTS.md

Scope: entire repository.

Mission: implement all documented requirements, project decisions, steps and milestones autonomously. Continue until everything documented is done or a real blocker is documented.

Primary sources: `README.md`, `PRD.md`, `GAME_RULES.md`, `GAME_DATA_MODEL.md`, `ARCHITECTURE.md`, `AI_CONCEPT.md`, `IMPLEMENTATION_PLAN.md`, `RULE_EDGE_CASES.md`, `LEGAL_AND_IP_NOTES.md`, existing tests, existing code.

Authority:
- Documentation and explicit project decisions are binding.
- If code conflicts with docs, treat docs as primary, then verify intent via tests/code.
- Do not invent requirements or features.

Work loop:
1. Run `git status`; preserve unrelated/user changes.
2. Read relevant docs before changing code.
3. Identify current state, next open step/milestone, affected code and existing tests.
4. Implement the next documented step in order.
5. Add or update tests for happy path, edge cases and regressions.
6. Run relevant tests; run full suite when practical.
7. Fix failures; do not ignore red tests/builds/lints.
8. Verify implementation against docs.
9. Update docs/status only when required by changed behavior, resolved decisions, edge cases or completed milestones.
10. Commit one coherent, tested unit of work.
11. Repeat.

Rules:
- Follow existing architecture, style, naming, patterns and test structure.
- Prefer small, minimal, reviewable changes.
- No unrelated refactors.
- No undocumented behavior changes.
- No weakening/deleting tests unless proven obsolete/wrong.
- No unnecessary dependencies.
- No committed debug output, logs, temp files, generated junk or local artifacts.
- Do not change public APIs unless required by docs and covered by tests.
- If tests cannot run in the environment, record exact command, failure reason and remaining risk; never claim success.

Done for a step/milestone:
- requirement implemented
- consistent with documented decisions
- tests added/updated
- relevant tests pass
- required docs/status updated
- no known regressions
- committed

Commit rules:
- Commit only complete, coherent, tested work.
- Keep unrelated changes out.
- Use clear messages: `Implement <step>`, `Add tests for <case>`, `Document <decision>`.

Ambiguity handling:
1. Check docs.
2. Check tests.
3. Check existing code intent.
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

Priority: correctness to requirements > consistency with decisions > testability > stability > maintainability > small commits.
