# API Contracts (CONTRACTS.md)

> **Project:** Task Management API & Web App
> **Version:** 1.0.0
> **Author:** Architect Agent
> **Status:** DESIGN_LOCK — Do not modify without Architect approval.
> **Date:** 2026-02-23

This document is the **single source of truth** for all cross-boundary interfaces between `/src/server` (Engineer_Alpha) and `/src/client` (Engineer_Beta).

---

## 1. Shared TypeScript Types

> These types live in `/src/shared/types.ts` and must be imported by both server and client.

```typescript
// /src/shared/types.ts

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface User {
  id: string;          // UUID
  email: string;
  created_at: string;  // ISO-8601 datetime
}

export interface Task {
  id: string;          // UUID
  user_id: string;     // UUID — owning user
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null; // ISO-8601 date (YYYY-MM-DD) or null
  created_at: string;      // ISO-8601 datetime
  updated_at: string;      // ISO-8601 datetime
}

// ── Request bodies ──────────────────────────────────────────

export interface RegisterRequest {
  email: string;    // valid email format
  password: string; // min 8 characters
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateTaskRequest {
  title: string;             // required, 1–200 chars
  description?: string;      // optional
  status?: TaskStatus;       // default: 'todo'
  due_date?: string | null;  // ISO-8601 date or null
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  due_date?: string | null;
}

// ── Response envelopes ──────────────────────────────────────

export interface AuthResponse {
  token: string; // JWT access token
  user: Pick<User, 'id' | 'email'>;
}

export interface TaskListResponse {
  tasks: Task[];
}

export interface TaskResponse {
  task: Task;
}

export interface ErrorResponse {
  error: string; // human-readable message
}
```

---

## 2. Authentication Endpoints

### `POST /auth/register`

Register a new user account.

**Request**
```
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "s3cur3p@ss"
}
```

**Responses**

| Status | Body | Condition |
| :--- | :--- | :--- |
| 201 | `AuthResponse` | Account created successfully |
| 409 | `ErrorResponse` | Email already registered |
| 422 | `ErrorResponse` | Validation failure (invalid email, password < 8 chars) |

---

### `POST /auth/login`

Authenticate an existing user.

**Request**
```
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "s3cur3p@ss"
}
```

**Responses**

| Status | Body | Condition |
| :--- | :--- | :--- |
| 200 | `AuthResponse` | Login successful |
| 401 | `ErrorResponse` | Invalid credentials |
| 422 | `ErrorResponse` | Validation failure |

---

### `POST /auth/logout`

Terminate the current session. Stateless (client discards token).

**Request**
```
Authorization: Bearer <JWT>
```

**Responses**

| Status | Body | Condition |
| :--- | :--- | :--- |
| 204 | _(empty)_ | Session terminated |
| 401 | `ErrorResponse` | Missing or invalid token |

---

## 3. Task Endpoints

All task endpoints require `Authorization: Bearer <JWT>` in the request header. Requests without a valid JWT return `401`. Requests for tasks not owned by the authenticated user return `403`.

---

### `POST /tasks`

Create a new task.

**Request**
```
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "title": "Design the kanban board",
  "description": "Wire up drag-and-drop columns",
  "status": "todo",
  "due_date": "2026-03-01"
}
```

**Responses**

| Status | Body | Condition |
| :--- | :--- | :--- |
| 201 | `TaskResponse` | Task created |
| 401 | `ErrorResponse` | Missing/invalid token |
| 422 | `ErrorResponse` | Validation failure (e.g., missing title, invalid status) |

---

### `GET /tasks`

List all tasks belonging to the authenticated user.

**Request**
```
Authorization: Bearer <JWT>
```

**Responses**

| Status | Body | Condition |
| :--- | :--- | :--- |
| 200 | `TaskListResponse` | Success (may be empty array) |
| 401 | `ErrorResponse` | Missing/invalid token |

---

### `GET /tasks/:id`

Retrieve a single task by ID.

**Request**
```
Authorization: Bearer <JWT>
```

**Responses**

| Status | Body | Condition |
| :--- | :--- | :--- |
| 200 | `TaskResponse` | Task found and owned by requester |
| 401 | `ErrorResponse` | Missing/invalid token |
| 403 | `ErrorResponse` | Task exists but belongs to another user |
| 404 | `ErrorResponse` | Task not found |

---

### `PATCH /tasks/:id`

Partially update a task's fields.

**Request**
```
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "status": "in-progress"
}
```

**Responses**

| Status | Body | Condition |
| :--- | :--- | :--- |
| 200 | `TaskResponse` | Task updated, full updated task returned |
| 401 | `ErrorResponse` | Missing/invalid token |
| 403 | `ErrorResponse` | Task belongs to another user |
| 404 | `ErrorResponse` | Task not found |
| 422 | `ErrorResponse` | Validation failure |

---

### `DELETE /tasks/:id`

Delete a task permanently.

**Request**
```
Authorization: Bearer <JWT>
```

**Responses**

| Status | Body | Condition |
| :--- | :--- | :--- |
| 204 | _(empty)_ | Task deleted |
| 401 | `ErrorResponse` | Missing/invalid token |
| 403 | `ErrorResponse` | Task belongs to another user |
| 404 | `ErrorResponse` | Task not found |

---

## 4. Authentication Contract

| Property | Value |
| :--- | :--- |
| Algorithm | HS256 |
| Signing secret | `process.env.JWT_SECRET` (≥ 32 random bytes) |
| Token lifetime | 24 hours |
| Header format | `Authorization: Bearer <token>` |
| Token payload | `{ sub: user.id, email: user.email, iat: number, exp: number }` |
| Password hashing | bcrypt, cost factor 10 |

---

## 5. Standard Error Response

All errors use the following JSON envelope:

```json
{
  "error": "Human-readable description of the problem."
}
```

Never include stack traces, raw DB errors, or internal field names in production error responses.

---

## 6. Validation Rules Summary

| Field | Rules |
| :--- | :--- |
| `email` | Valid email format (RFC 5321) |
| `password` | Minimum 8 characters |
| `title` | Required string, 1–200 characters |
| `description` | Optional string, max 2000 characters |
| `status` | One of `'todo'`, `'in-progress'`, `'done'` |
| `due_date` | ISO-8601 date string (`YYYY-MM-DD`) or `null` |

---

## 7. Contract Change Protocol

1. Engineer opens a `contract-update` GitHub Issue with the proposed change.
2. Architect reviews and approves or rejects.
3. Architect updates this file and notifies both engineers.
4. Engineers update their implementations to match the new contract.

**No engineer may unilaterally modify this file.**
