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
