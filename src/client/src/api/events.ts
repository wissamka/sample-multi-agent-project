import { api } from './client';
import type { Attendee, CalendarEvent, EventCategory, EventStatus } from '../types';

export function listEvents(params?: { from?: string; to?: string }) {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return api.get<{ events: CalendarEvent[] }>(`/events${suffix}`);
}

export function createEvent(data: {
  title: string;
  start_at: string;
  end_at?: string | null;
  location?: string | null;
  category?: EventCategory;
}) {
  return api.post<{ event: CalendarEvent }>('/events', data);
}

export function updateEvent(
  id: string,
  data: { title?: string; status?: EventStatus; attendees?: Attendee[] },
) {
  return api.patch<{ event: CalendarEvent }>(`/events/${id}`, data);
}
