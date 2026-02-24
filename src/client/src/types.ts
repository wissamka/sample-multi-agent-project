// Types sourced from CONTRACTS.md S1 -- keep in sync with /src/shared/types.ts
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

export interface ErrorResponse {
  error: string;
}
