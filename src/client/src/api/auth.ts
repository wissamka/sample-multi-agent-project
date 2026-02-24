import { api } from './client';
import type { AuthResponse } from '../types';

export function register(email: string, password: string) {
  return api.post<AuthResponse>('/auth/register', { email, password });
}

export function login(email: string, password: string) {
  return api.post<AuthResponse>('/auth/login', { email, password });
}

export function logout() {
  return api.post<void>('/auth/logout', {});
}
