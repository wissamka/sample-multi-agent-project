import { api } from './client';
import type { InboundEmail, SimulateEmailRequest, SimulateEmailResponse } from '../types';

export function simulateEmail(data: SimulateEmailRequest) {
  return api.post<SimulateEmailResponse>('/inbox/simulate', data);
}

export function listEmails() {
  return api.get<{ emails: InboundEmail[] }>('/inbox');
}

export function getEmail(id: string) {
  return api.get<{ email: InboundEmail }>(`/inbox/${id}`);
}
