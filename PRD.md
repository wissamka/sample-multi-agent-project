# Product Requirements Document (PRD)

> **Project:** Task Management API & Web App
> **Version:** 1.0.0
> **Author:** Architect Agent
> **Status:** Approved
> **Date:** 2026-02-23

---

## Overview

A full-stack task management application that allows authenticated users to create, track, and manage tasks through a REST API and a kanban-style web interface. The system solves the problem of scattered task tracking by providing a single, structured workspace with clear status workflows.

---

## Features

| ID | Feature | Priority | Scope | Assigned To |
| :--- | :--- | :--- | :--- | :--- |
| F-001 | User Registration & Login (email/password) | P0 | Full-stack | Engineer_Alpha (API) / Engineer_Beta (UI) |
| F-002 | Task CRUD — Create, Read, Update, Delete | P0 | Full-stack | Engineer_Alpha (API) / Engineer_Beta (UI) |
| F-003 | Task Fields: title, description, status, due date | P0 | Backend | Engineer_Alpha |
| F-004 | Task Status Workflow (todo → in-progress → done) | P0 | Full-stack | Engineer_Alpha (API) / Engineer_Beta (UI) |
| F-005 | Kanban Board View | P1 | Frontend | Engineer_Beta |
| F-006 | JWT-based Session Management | P0 | Backend | Engineer_Alpha |
| F-007 | Per-user Task Isolation (users see only their tasks) | P0 | Backend | Engineer_Alpha |

---

## User Stories

### F-001: User Registration & Login

- **US-001:** As a new user, I want to register with my email and password, so that I can create a personal account.
- **US-002:** As a returning user, I want to log in with my email and password, so that I can access my tasks.
- **US-003:** As a logged-in user, I want to log out, so that my session is terminated securely.

### F-002: Task CRUD

- **US-004:** As a logged-in user, I want to create a new task with a title, description, status, and due date, so that I can track work items.
- **US-005:** As a logged-in user, I want to view a list of all my tasks, so that I can see everything I need to do.
- **US-006:** As a logged-in user, I want to view the details of a single task, so that I can read its full description.
- **US-007:** As a logged-in user, I want to update a task's fields, so that I can keep task information current.
- **US-008:** As a logged-in user, I want to delete a task, so that I can remove completed or cancelled items.

### F-003: Task Fields

- **US-009:** As a logged-in user, I want each task to have a title (required), description (optional), status (todo/in-progress/done), and due date (optional ISO-8601 date), so that tasks are consistently structured.

### F-004: Task Status Workflow

- **US-010:** As a logged-in user, I want to change a task's status between todo, in-progress, and done, so that I can track progress.

### F-005: Kanban Board View

- **US-011:** As a logged-in user, I want to see my tasks organized in three columns (Todo, In Progress, Done) on a kanban board, so that I can visualize the state of all my work at a glance.
- **US-012:** As a logged-in user, I want to drag a task card between columns to update its status, so that I can manage tasks without opening a detail view.

### F-006: JWT-based Session Management

- **US-013:** As a logged-in user, I want my session to be maintained via a JWT access token, so that I stay authenticated across page refreshes without re-logging in.

### F-007: Per-user Task Isolation

- **US-014:** As a logged-in user, I want to be able to see and modify only my own tasks, so that my data is private and secure.

---

## Success Metrics

| ID | Feature ID | Metric | Target | Measurement Method |
| :--- | :--- | :--- | :--- | :--- |
| SM-001 | F-001 | Registration & login success rate | ≥ 99% for valid credentials | Integration test pass rate |
| SM-002 | F-002 | API response time for task CRUD | p95 < 200ms | Load test (k6 or similar) |
| SM-003 | F-005 | Kanban board render time | < 1s on first load | Lighthouse performance score |
| SM-004 | F-007 | Cross-user data leakage attempts | 0 (zero) | Security test: authenticated requests for other users' task IDs return 403 |
| SM-005 | F-006 | Token expiry enforcement | Expired tokens return 401 | Integration test |

---

## Acceptance Criteria

### F-001: User Registration & Login

- [ ] `POST /auth/register` with valid email + password creates a user and returns a JWT.
- [ ] `POST /auth/register` with a duplicate email returns HTTP 409.
- [ ] `POST /auth/login` with valid credentials returns a JWT.
- [ ] `POST /auth/login` with invalid credentials returns HTTP 401.
- [ ] `POST /auth/logout` invalidates the session.
- [ ] Passwords are stored hashed (bcrypt, min cost 10).

### F-002 & F-003: Task CRUD & Fields

- [ ] `POST /tasks` creates a task with title (required), description, status (default: todo), due date.
- [ ] `POST /tasks` with missing title returns HTTP 422.
- [ ] `GET /tasks` returns only the authenticated user's tasks.
- [ ] `GET /tasks/:id` returns the task if owned by the requester, else 403.
- [ ] `PATCH /tasks/:id` updates provided fields.
- [ ] `DELETE /tasks/:id` removes the task.
- [ ] Task `due_date` accepts ISO-8601 format or null.

### F-004: Task Status Workflow

- [ ] Status values are strictly `todo`, `in-progress`, `done`.
- [ ] Sending an invalid status value returns HTTP 422.

### F-005: Kanban Board View

- [ ] Board displays three columns: Todo, In Progress, Done.
- [ ] Each column lists task cards showing title and due date.
- [ ] Dragging a card to a new column calls `PATCH /tasks/:id` and updates status optimistically.
- [ ] Drag-and-drop works on desktop (mouse) and mobile (touch).

### F-006: JWT Session Management

- [ ] JWT is signed with a server-side secret (HS256).
- [ ] Access token expires in 24h.
- [ ] Requests without a valid token return HTTP 401.

### F-007: Per-user Task Isolation

- [ ] Querying another user's task ID returns HTTP 403.
- [ ] Task list endpoint never leaks tasks from other users.

---

## Technical Constraints

- API must follow REST conventions with JSON request/response bodies.
- API response time p95 < 200ms for task CRUD endpoints under normal load.
- Web UI must support mobile viewports (320px+).
- Passwords must never be stored in plaintext.
- All cross-boundary interfaces must conform to `CONTRACTS.md`.

---

## Out of Scope

- OAuth / social login (Google, GitHub, etc.)
- Team/organization features (sharing tasks across users)
- Real-time collaboration or WebSocket push updates
- File attachments on tasks
- Email notifications or reminders
- Role-based access control (RBAC)
- Admin dashboard

---

## Issue Mapping

> Populated by Architect after PRD approval.

| Feature ID | GitHub Issue | Assignee | Status |
| :--- | :--- | :--- | :--- |
| F-001 (API) | #1 | Engineer_Alpha | Open |
| F-001 (UI) | #2 | Engineer_Beta | Open |
| F-002 / F-003 / F-004 (API) | #3 | Engineer_Alpha | Open |
| F-002 / F-003 / F-004 (UI) | #4 | Engineer_Beta | Open |
| F-005 | #5 | Engineer_Beta | Open |
| F-006 | #6 | Engineer_Alpha | Open |
| F-007 | #7 | Engineer_Alpha | Open |
