import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listMemories, createMemory, deleteMemory } from '../api/memories';
import { listContacts } from '../api/contacts';
import type { Memory, MemoryCategory } from '../types';

const CATEGORIES: MemoryCategory[] = ['fact', 'preference', 'contact', 'note'];

function MemoryCard({ memory }: { memory: Memory }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteMemory(memory.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memories'] }),
  });

  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-gray-800">{memory.content}</p>
        <p className="text-xs text-gray-400 mt-1">
          learned from {memory.source} · {new Date(memory.created_at).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={() => remove.mutate()}
        aria-label={`Forget memory: ${memory.content}`}
        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm shrink-0"
      >
        Forget
      </button>
    </div>
  );
}

export default function MemoryPage() {
  const queryClient = useQueryClient();
  const memoriesQuery = useQuery({ queryKey: ['memories'], queryFn: () => listMemories() });
  const contactsQuery = useQuery({ queryKey: ['contacts'], queryFn: listContacts });

  const [category, setCategory] = useState<MemoryCategory>('fact');
  const [content, setContent] = useState('');

  const create = useMutation({
    mutationFn: createMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      setContent('');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate({ category, content });
  }

  const memories = memoriesQuery.data?.memories ?? [];
  const contacts = contactsQuery.data?.contacts ?? [];
  const grouped = CATEGORIES.map((c) => ({
    category: c,
    items: memories.filter((m) => m.category === c),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold">Agent memory</h2>
        <p className="text-sm text-gray-500 mt-1">
          Everything your agent knows about you. It grows as you use it — and you can always make it
          forget.
        </p>
      </div>

      {grouped.length === 0 && (
        <p className="text-gray-500 bg-white rounded-lg shadow p-6">No memories yet.</p>
      )}
      {grouped.map((group) => (
        <section key={group.category}>
          <h3 className="font-semibold text-gray-700 mb-2 capitalize">{group.category}s</h3>
          <div className="space-y-2">
            {group.items.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
        </section>
      ))}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-3">Teach your agent something</h3>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <select
            aria-label="Memory category"
            value={category}
            onChange={(e) => setCategory(e.target.value as MemoryCategory)}
            className="rounded border-gray-300 p-2 border"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            aria-label="Memory content"
            placeholder="e.g. I'm vegetarian"
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 rounded border-gray-300 p-2 border"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Remember
          </button>
        </form>
      </div>

      <section>
        <h3 className="font-semibold text-gray-700 mb-2">Contacts</h3>
        <div className="bg-white rounded-lg shadow divide-y">
          {contacts.length === 0 && <p className="p-4 text-gray-500">No contacts yet.</p>}
          {contacts.map((contact) => (
            <div key={contact.id} className="p-4 flex items-center justify-between">
              <div>
                <span className="text-gray-800">{contact.name}</span>{' '}
                <span className="text-gray-400 text-sm">{contact.email}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                  {contact.relationship}
                </span>
                {contact.source === 'learned' && (
                  <span
                    className="px-2 py-0.5 rounded text-xs bg-teal-100 text-teal-700"
                    title="Your agent learned this contact from email"
                  >
                    learned
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
