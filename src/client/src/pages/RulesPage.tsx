import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listRules, createRule, updateRule, deleteRule } from '../api/rules';
import type { InviteRule, RuleAction, RuleTrigger } from '../types';

const TRIGGER_LABELS: Record<RuleTrigger, string> = {
  personal_event: 'a personal event invite arrives',
  work_event: 'a work event invite arrives',
  unknown_sender: "an invite arrives from someone I don't know",
};

const ACTION_LABELS: Record<RuleAction, string> = {
  add_family: 'also invite my family',
  add_coworkers: 'also invite my coworkers',
  ask_user: 'ask me what to do',
  auto_accept: 'accept it',
  auto_decline: 'decline it',
};

function RuleRow({ rule }: { rule: InviteRule }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rules'] });
  const update = useMutation({
    mutationFn: (data: { mode?: 'auto' | 'ask'; enabled?: boolean }) => updateRule(rule.id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: () => deleteRule(rule.id), onSuccess: invalidate });

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 flex items-center justify-between gap-4 ${
        rule.enabled ? '' : 'opacity-50'
      }`}
    >
      <div>
        <p className="text-gray-800">
          When {TRIGGER_LABELS[rule.trigger]}, {ACTION_LABELS[rule.action]}
          {rule.action !== 'ask_user' && (
            <span className="text-gray-500">
              {' '}
              — {rule.mode === 'auto' ? 'automatically' : 'after asking me'}
            </span>
          )}
          .
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{rule.name}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rule.action !== 'ask_user' && (
          <button
            onClick={() => update.mutate({ mode: rule.mode === 'auto' ? 'ask' : 'auto' })}
            className={`px-3 py-1.5 rounded text-sm ${
              rule.mode === 'auto'
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Toggle between auto-apply and ask-first"
          >
            {rule.mode === 'auto' ? 'Auto' : 'Ask first'}
          </button>
        )}
        <button
          onClick={() => update.mutate({ enabled: !rule.enabled })}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
        >
          {rule.enabled ? 'Disable' : 'Enable'}
        </button>
        <button
          onClick={() => remove.mutate()}
          className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function RulesPage() {
  const queryClient = useQueryClient();
  const rulesQuery = useQuery({ queryKey: ['rules'], queryFn: listRules });

  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<RuleTrigger>('personal_event');
  const [action, setAction] = useState<RuleAction>('add_family');
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      setName('');
      setError('');
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'Failed to add rule'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate({ name, trigger, action });
  }

  const rules = rulesQuery.data?.rules ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold">Invite rules</h2>
        <p className="text-sm text-gray-500 mt-1">
          Rules are applied by deterministic code, in order. The AI only suggests how an email is
          classified — it never acts on its own.
        </p>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => (
          <RuleRow key={rule.id} rule={rule} />
        ))}
        {rules.length === 0 && (
          <p className="text-gray-500 bg-white rounded-lg shadow p-6">No rules yet.</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-3">Add a rule</h3>
        {error && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 rounded" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            aria-label="Rule name"
            placeholder="Rule name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border-gray-300 p-2 border"
          />
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <span>When</span>
            <select
              aria-label="Trigger"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as RuleTrigger)}
              className="rounded border-gray-300 p-2 border"
            >
              {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <span>then</span>
            <select
              aria-label="Action"
              value={action}
              onChange={(e) => setAction(e.target.value as RuleAction)}
              className="rounded border-gray-300 p-2 border"
            >
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Add rule
          </button>
        </form>
      </div>
    </div>
  );
}
