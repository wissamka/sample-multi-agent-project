import { api } from './client';
import type { ActionStatus, AgentAction } from '../types';

export function listActions(status?: ActionStatus) {
  const suffix = status ? `?status=${status}` : '';
  return api.get<{ actions: AgentAction[] }>(`/actions${suffix}`);
}

export function approveAction(id: string) {
  return api.post<{ action: AgentAction }>(`/actions/${id}/approve`, {});
}

export function rejectAction(id: string) {
  return api.post<{ action: AgentAction }>(`/actions/${id}/reject`, {});
}
