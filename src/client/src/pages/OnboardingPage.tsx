import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeOnboarding } from '../api/profile';
import type { ContactInput } from '../types';

const STEPS = ['About you', 'Family', 'Coworkers', 'Preferences'] as const;

interface ContactRepeaterProps {
  label: string;
  contacts: ContactInput[];
  onChange: (contacts: ContactInput[]) => void;
}

function ContactRepeater({ label, contacts, onChange }: ContactRepeaterProps) {
  function update(index: number, field: keyof ContactInput, value: string) {
    const next = contacts.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            aria-label={`${label} name ${i + 1}`}
            placeholder="Name"
            value={contact.name}
            onChange={(e) => update(i, 'name', e.target.value)}
            className="flex-1 rounded border-gray-300 p-2 border"
          />
          <input
            aria-label={`${label} email ${i + 1}`}
            placeholder="Email"
            type="email"
            value={contact.email}
            onChange={(e) => update(i, 'email', e.target.value)}
            className="flex-1 rounded border-gray-300 p-2 border"
          />
          <button
            type="button"
            aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
            onClick={() => onChange(contacts.filter((_, j) => j !== i))}
            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...contacts, { name: '', email: '' }])}
        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
      >
        + Add {label.toLowerCase()}
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [family, setFamily] = useState<ContactInput[]>([]);
  const [coworkers, setCoworkers] = useState<ContactInput[]>([]);
  const [briefHour, setBriefHour] = useState(8);
  const [interestsText, setInterestsText] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigate('/assistant');
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Onboarding failed');
    },
  });

  const agentAddressPreview = displayName
    ? `${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}@agent.local`
    : 'you@agent.local';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setError('');
    mutation.mutate({
      display_name: displayName,
      timezone,
      family: family.filter((c) => c.name && c.email),
      coworkers: coworkers.filter((c) => c.name && c.email),
      brief_hour: briefHour,
      interests: interestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="w-full max-w-xl p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-1">Set up your agent</h1>
        <p className="text-sm text-gray-500 mb-6">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-gray-700">
                  Your name
                </label>
                <input
                  id="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded border-gray-300 p-2 border"
                />
              </div>
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <input
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  required
                  className="mt-1 block w-full rounded border-gray-300 p-2 border"
                />
              </div>
              <p className="text-sm text-gray-500">
                Your dedicated agent email will look like{' '}
                <span className="font-mono text-gray-700">{agentAddressPreview}</span>. Email it
                anything — invites, questions, newsletters — and your agent handles it.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Family members your agent should know. They can be auto-added to personal event
                invitations.
              </p>
              <ContactRepeater label="Family member" contacts={family} onChange={setFamily} />
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Coworkers your agent should know. They can be auto-added to work event invitations.
              </p>
              <ContactRepeater label="Coworker" contacts={coworkers} onChange={setCoworkers} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="brief_hour" className="block text-sm font-medium text-gray-700">
                  Daily brief hour (0–23)
                </label>
                <input
                  id="brief_hour"
                  type="number"
                  min={0}
                  max={23}
                  value={briefHour}
                  onChange={(e) => setBriefHour(Number(e.target.value))}
                  className="mt-1 block w-32 rounded border-gray-300 p-2 border"
                />
              </div>
              <div>
                <label htmlFor="interests" className="block text-sm font-medium text-gray-700">
                  Interests (comma-separated)
                </label>
                <input
                  id="interests"
                  value={interestsText}
                  onChange={(e) => setInterestsText(e.target.value)}
                  placeholder="travel, AI, cooking"
                  className="mt-1 block w-full rounded border-gray-300 p-2 border"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {step < STEPS.length - 1 ? 'Next' : mutation.isPending ? 'Finishing...' : 'Finish setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
