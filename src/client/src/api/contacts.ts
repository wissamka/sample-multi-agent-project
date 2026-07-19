import { api } from './client';
import type { Contact, ContactRelationship } from '../types';

export function listContacts() {
  return api.get<{ contacts: Contact[] }>('/contacts');
}

export function createContact(data: {
  name: string;
  email: string;
  relationship: ContactRelationship;
}) {
  return api.post<{ contact: Contact }>('/contacts', data);
}

export function updateContact(
  id: string,
  data: { name?: string; email?: string; relationship?: ContactRelationship },
) {
  return api.patch<{ contact: Contact }>(`/contacts/${id}`, data);
}

export function deleteContact(id: string) {
  return api.delete<void>(`/contacts/${id}`);
}
