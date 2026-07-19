import { api } from './client';
import type { Brief } from '../types';

export function generateBrief() {
  return api.post<{ brief: Brief }>('/brief/generate', {});
}

export function tickScheduler() {
  return api.post<{ brief: Brief }>('/brief/tick', {});
}

export function getLatestBrief() {
  return api.get<{ brief: Brief | null }>('/brief/latest');
}

export function listBriefs() {
  return api.get<{ briefs: Brief[] }>('/brief');
}
