import { api } from './client';
import type { Task } from '../types';

export function listTasks() {
  return api.get<{ tasks: Task[] }>('/tasks');
}

export function getTask(id: string) {
  return api.get<{ task: Task }>(`/tasks/${id}`);
}

export function createTask(data: {
  title: string;
  description?: string;
  status?: string;
  due_date?: string | null;
}) {
  return api.post<{ task: Task }>('/tasks', data);
}

export function updateTask(
  id: string,
  data: { title?: string; description?: string | null; status?: string; due_date?: string | null },
) {
  return api.patch<{ task: Task }>(`/tasks/${id}`, data);
}

export function deleteTask(id: string) {
  return api.delete<void>(`/tasks/${id}`);
}
