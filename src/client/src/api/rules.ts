import { api } from './client';
import type { InviteRule, RuleAction, RuleMode, RuleTrigger } from '../types';

export function listRules() {
  return api.get<{ rules: InviteRule[] }>('/rules');
}

export function createRule(data: {
  name: string;
  trigger: RuleTrigger;
  action: RuleAction;
  mode?: RuleMode;
}) {
  return api.post<{ rule: InviteRule }>('/rules', data);
}

export function updateRule(
  id: string,
  data: { name?: string; mode?: RuleMode; enabled?: boolean; position?: number },
) {
  return api.patch<{ rule: InviteRule }>(`/rules/${id}`, data);
}

export function deleteRule(id: string) {
  return api.delete<void>(`/rules/${id}`);
}
