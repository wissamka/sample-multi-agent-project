# Agent Team Roster & Orchestration Protocol

> **Feature Gate:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

---

## Team Roster

| Agent | Role | Scope | Branch Pattern | Primary Artifacts |
| :--- | :--- | :--- | :--- | :--- |
| **Architect** | Lead / Systems Design | Root, `/docs` | `design/*` | `PRD.md`, `ARCH.md`, `CONTRACTS.md` |
| **Engineer_Alpha** | Backend Engineer | `/src/server`, `/src/db` | `feat/backend-*` | Server code, API endpoints, migrations, tests |
| **Engineer_Beta** | Frontend Engineer | `/src/client`, `/src/ui` | `feat/frontend-*` | Components, pages, state management, tests |
| **Reviewer** | QA & Integration | Pull Requests | `main` | Review verdicts, merge commits |

---

## Parallel Workflow Protocol

```
┌─────────────┐
│  ARCHITECT   │  Phase 1: Design Lock
│  PRD → Issues│
└──────┬───────┘
       │ GitHub Issues assigned
  ┌────┴─────┐
  │          │
  ▼          ▼
┌──────┐  ┌──────┐
│ALPHA │  │ BETA │    Phase 2: Parallel Sprint
│Server│  │Client│
└──┬───┘  └──┬───┘
   │         │
   ▼         ▼
  PR ──────► PR
       │
  ┌────┴─────┐
  │ REVIEWER  │    Phase 3: Integration
  │ Audit+Merge│
  └───────────┘
```

### Phase 1 — Design Lock (Architect)

**Trigger:** New feature request or project kickoff.

1. **Generate `PRD.md`** — Define features, user stories, success metrics, and acceptance criteria.
2. **Generate `ARCH.md`** — Document system architecture, data flow, and technology decisions.
3. **Generate `CONTRACTS.md`** — Define the API contract (endpoints, request/response schemas, shared types) that both Alpha and Beta must adhere to. This is the single source of truth that prevents integration conflicts.
4. **Create GitHub Milestone** — One milestone per feature/epic.
5. **Create GitHub Issues** — Map every PRD requirement to a specific, actionable GitHub Issue. Assign each issue to either `Engineer_Alpha` or `Engineer_Beta` based on scope. Tag issues with the milestone.
6. **Lock** — No engineer begins work until the Architect signals design lock by closing the design issue.

**Output gate:** Phase 2 cannot begin until `PRD.md`, `ARCH.md`, and `CONTRACTS.md` exist and all issues are created.

### Phase 2 — Parallel Sprint (Alpha & Beta)

**Trigger:** Architect signals design lock.

Both engineers work **simultaneously** in isolated directory scopes:

- **Engineer_Alpha** → branch `feat/backend-<issue-id>`, scope `/src/server`
- **Engineer_Beta** → branch `feat/frontend-<issue-id>`, scope `/src/client`

**Hard constraints:**
- Alpha **MUST NOT** write to `/src/client` or `/src/ui`.
- Beta **MUST NOT** write to `/src/server` or `/src/db`.
- Shared type changes require an Architect-approved update to `CONTRACTS.md` first.
- Each agent references `CONTRACTS.md` for all cross-boundary interfaces.
- Every commit message references the GitHub Issue ID (e.g., `feat(server): implement auth endpoint #12`).

**Completion:** Each engineer opens a Pull Request against `main`, tagging the Reviewer.

### Phase 3 — Integration (Reviewer)

**Trigger:** Both Alpha and Beta PRs are open.

1. **Audit each PR** against `PRD.md` requirements and `CONTRACTS.md` interfaces.
2. **Run test suites** via terminal (`npm test`, `npm run lint`).
3. **Verify directory isolation** — confirm no cross-scope file modifications.
4. **Check issue closure** — every merged PR must reference and close its GitHub Issue.
5. **Merge** — Squash-merge to `main` in dependency order (typically backend first).

---

## Communication Protocol

| From | To | Channel | When |
| :--- | :--- | :--- | :--- |
| Architect | Engineers | GitHub Issues | Task assignment |
| Engineer | Architect | GitHub Issue comment | Contract clarification needed |
| Engineer | Reviewer | Pull Request | Work complete |
| Reviewer | Engineer | PR Review comment | Changes requested |
| Reviewer | Architect | GitHub Issue comment | Integration conflict detected |

---

## Conflict Resolution

1. **File conflict** — Impossible by design (directory isolation).
2. **Contract conflict** — Architect updates `CONTRACTS.md`, both engineers pull the change.
3. **Scope creep** — Any work outside assigned directories is **rejected** by Reviewer.
4. **Blocked engineer** — Creates a GitHub Issue tagged `blocked` and assigns to Architect.
