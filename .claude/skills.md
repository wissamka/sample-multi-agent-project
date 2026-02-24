# Agent Team Skills

> Shared skill definitions for the `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` workflow.

---

## Skill 1: Requirement Engineering

**Owner:** Architect
**Trigger:** Any new feature request, epic, or project initialization.

### Protocol

1. **Gather requirements** from the user prompt, existing codebase context, and any referenced documents.
2. **Generate `PRD.md`** at the project root using the canonical template (see `PRD.md`). Every PRD must contain:
   - `# Features` — Enumerated feature list with unique IDs (`F-001`, `F-002`, ...).
   - `# User Stories` — In "As a [role], I want [action], so that [outcome]" format.
   - `# Success Metrics` — Measurable acceptance criteria tied to feature IDs.
3. **No code issues may be created** until `PRD.md` is committed and reviewed.
4. The PRD is the canonical requirements source — all downstream work traces back to it.

### Validation Checklist

- [ ] Every feature has a unique ID.
- [ ] Every user story maps to at least one feature ID.
- [ ] Every success metric is measurable and tied to a feature ID.
- [ ] PRD has been committed to the repository.

---

## Skill 2: Scoped Parallelism

**Owner:** All Engineers
**Enforced by:** Reviewer

### Directory Isolation Rules

| Agent | Writable Scope | Read-Only Access | Forbidden |
| :--- | :--- | :--- | :--- |
| **Engineer_Alpha** | `/src/server`, `/src/db`, `/tests/server` | `CONTRACTS.md`, `PRD.md`, `ARCH.md` | `/src/client`, `/src/ui` |
| **Engineer_Beta** | `/src/client`, `/src/ui`, `/tests/client` | `CONTRACTS.md`, `PRD.md`, `ARCH.md` | `/src/server`, `/src/db` |
| **Architect** | Root docs (`*.md`), `/docs` | Everything | Production source code |
| **Reviewer** | None (read-only audit) | Everything | Direct code changes |

### Branch Strategy

```
main
 ├── design/<feature-name>        ← Architect
 ├── feat/backend-<issue-id>      ← Engineer_Alpha
 └── feat/frontend-<issue-id>     ← Engineer_Beta
```

### Enforcement

- Reviewer **MUST reject** any PR containing file changes outside the agent's writable scope.
- Engineers requesting cross-scope changes must file a `contract-update` issue assigned to Architect.
- Shared types and interfaces live exclusively in `CONTRACTS.md` — never duplicated in source.

---

## Skill 3: Git Issue Sync

**Owner:** Architect
**Consumers:** All agents

### Mapping Protocol

Every requirement in `PRD.md` must have a corresponding GitHub Issue. The mapping is:

```
PRD Feature ID  →  GitHub Issue
─────────────────────────────────
F-001           →  Issue #N (assigned: Engineer_Alpha)
F-002           →  Issue #M (assigned: Engineer_Beta)
F-003           →  Issue #P (assigned: Engineer_Alpha)
...
```

### Issue Creation Rules

1. **Title format:** `[F-XXX] <Short description>`
2. **Body must include:**
   - Reference to the PRD feature ID and user story.
   - Acceptance criteria copied from the PRD success metrics.
   - Scope constraint (which directories the assignee may modify).
   - Link to `CONTRACTS.md` section if the feature involves cross-boundary interfaces.
3. **Labels:** Apply `backend` or `frontend` label matching the assignee's scope.
4. **Milestone:** Attach to the feature milestone created by Architect.
5. **Assignment:** Assign to exactly one engineer based on scope analysis.

### Traceability

- Every commit must reference an issue: `feat(scope): description #issue-id`
- Every PR must include `Closes #issue-id` in the description.
- Reviewer verifies traceability before merge — unlinked PRs are rejected.

### Sync Verification

Before Phase 2 begins, Architect must confirm:
- [ ] Total issues created equals total PRD requirements.
- [ ] Every issue is assigned to exactly one engineer.
- [ ] Every issue has acceptance criteria from the PRD.
- [ ] Milestone is created and all issues are attached.
