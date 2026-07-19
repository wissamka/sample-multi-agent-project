import { api } from './client';
import type { AgentProfile, OnboardingRequest } from '../types';

export function getProfile() {
  return api.get<{ profile: AgentProfile | null }>('/profile');
}

export function completeOnboarding(data: OnboardingRequest) {
  return api.post<{ profile: AgentProfile }>('/profile/onboarding', data);
}

export function updateProfile(data: {
  display_name?: string;
  timezone?: string;
  brief_hour?: number;
  interests?: string[];
}) {
  return api.patch<{ profile: AgentProfile }>('/profile', data);
}
