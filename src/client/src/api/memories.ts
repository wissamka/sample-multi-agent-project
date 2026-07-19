import { api } from './client';
import type { Memory, MemoryCategory } from '../types';

export function listMemories(category?: MemoryCategory) {
  const suffix = category ? `?category=${category}` : '';
  return api.get<{ memories: Memory[] }>(`/memories${suffix}`);
}

export function createMemory(data: { category: MemoryCategory; content: string }) {
  return api.post<{ memory: Memory }>('/memories', data);
}

export function updateMemory(id: string, data: { category?: MemoryCategory; content?: string }) {
  return api.patch<{ memory: Memory }>(`/memories/${id}`, data);
}

export function deleteMemory(id: string) {
  return api.delete<void>(`/memories/${id}`);
}
