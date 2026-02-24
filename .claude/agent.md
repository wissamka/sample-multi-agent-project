# Claude Agent Team — Golden Template

> This project uses `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` for parallel multi-agent development.

## Quick Reference

| File | Purpose |
| :--- | :--- |
| `.claude/agents.md` | Team roster, parallel workflow protocol, communication rules |
| `.claude/skills.md` | Skill definitions: Requirement Engineering, Scoped Parallelism, Git Issue Sync |
| `.claude/souls/architect.soul` | Architect agent — PRD, ARCH, CONTRACTS generation + GitHub Issue delegation |
| `.claude/souls/engineer_alpha.soul` | Backend engineer — `/src/server` scope, contract-driven implementation |
| `.claude/souls/engineer_beta.soul` | Frontend engineer — `/src/client` scope, contract-driven UI |
| `.claude/souls/reviewer.soul` | QA gatekeeper — PR audit, scope enforcement, merge authority |
| `PRD.md` | Product Requirements Document template (populated by Architect) |

## Workflow Summary

```
1. ARCHITECT  →  PRD.md + ARCH.md + CONTRACTS.md + GitHub Issues
2. ALPHA      →  /src/server (feat/backend-* branch)     ← parallel
   BETA       →  /src/client (feat/frontend-* branch)    ← parallel
3. REVIEWER   →  Audit PRs → Merge to main
```

## Hard Rules

1. **Directory isolation is non-negotiable.** Alpha writes `/src/server`, Beta writes `/src/client`. Violations are instant PR rejections.
2. **No code before contracts.** `CONTRACTS.md` must exist before engineers begin implementation.
3. **Every requirement is an issue.** The Architect maps every PRD feature to a trackable GitHub Issue.
4. **Every commit traces to an issue.** Format: `feat(scope): description #issue-id`.
5. **Reviewer has final merge authority.** No direct pushes to `main`.

## MCP Servers

The following MCP servers are configured in `settings.json`:

- **GitHub** — Issue creation, PR management, milestone tracking. Requires `GITHUB_TOKEN` environment variable.
- **Filesystem** — Scoped file operations within the workspace.
- **Sequential Thinking** — Structured reasoning for complex design decisions.
