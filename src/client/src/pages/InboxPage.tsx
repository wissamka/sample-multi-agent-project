import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listEmails, simulateEmail } from '../api/inbox';
import type {
  EmailClassification,
  EmailKind,
  InboundEmail,
  SimulateEmailRequest,
  SimulateEmailResponse,
} from '../types';

const BADGE_STYLES: Record<EmailClassification, string> = {
  personal: 'bg-purple-100 text-purple-700',
  work: 'bg-blue-100 text-blue-700',
  newsletter: 'bg-yellow-100 text-yellow-700',
  question: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-600',
};

function tomorrowAt(hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const PRESETS: Record<string, Partial<SimulateEmailRequest>> = {
  'Plain email': {
    from_name: 'Sam Rivera',
    from_email: 'sam.rivera@example.com',
    subject: 'Lunch next week?',
    body: 'Hey! Want to grab lunch next week? I love that new ramen place on 5th. Let me know what day works?',
    kind: 'plain',
  },
  'Work invite': {
    from_name: 'Jordan Lee',
    from_email: 'jordan.lee@company.com',
    subject: 'Invitation: Q3 planning review',
    body: 'You are invited to the Q3 planning review meeting. Agenda attached.',
    kind: 'calendar_invite',
    invite_payload: {
      title: 'Q3 planning review',
      start_at: tomorrowAt(14),
      location: 'Conference Room B',
    },
  },
  'Family invite': {
    from_name: 'Alex Morgan',
    from_email: 'alex.morgan@family.example.com',
    subject: "Invitation: Mom's birthday dinner",
    body: "We're throwing a birthday dinner for Mom! Would love to see everyone there.",
    kind: 'calendar_invite',
    invite_payload: {
      title: "Mom's birthday dinner",
      start_at: tomorrowAt(19),
      location: 'Casa Bella',
    },
  },
  'Unknown sender invite': {
    from_name: 'Taylor Brooks',
    from_email: 'taylor@somewhere-new.example.com',
    subject: 'Invitation: Product demo',
    body: 'Hi, I would like to invite you to a product demo session.',
    kind: 'calendar_invite',
    invite_payload: {
      title: 'Product demo',
      start_at: tomorrowAt(11),
    },
  },
  Newsletter: {
    from_name: 'Tech Weekly',
    from_email: 'digest@techweekly.example.com',
    subject: 'This week in tech',
    body: 'Top stories this week... To stop receiving these emails, unsubscribe here.',
    kind: 'newsletter',
  },
};

function ClassificationBadge({ email }: { email: InboundEmail }) {
  if (!email.classification) return null;
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${BADGE_STYLES[email.classification]}`}>
      {email.classification}
    </span>
  );
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const emailsQuery = useQuery({ queryKey: ['emails'], queryFn: listEmails });

  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<EmailKind>('plain');
  const [inviteTitle, setInviteTitle] = useState('');
  const [inviteStart, setInviteStart] = useState('');
  const [inviteLocation, setInviteLocation] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<SimulateEmailResponse | null>(null);

  const send = useMutation({
    mutationFn: simulateEmail,
    onSuccess: (data) => {
      setResult(data);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
    onError: (err: unknown) => {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Failed to send');
    },
  });

  function applyPreset(name: string) {
    const preset = PRESETS[name];
    setFromName(preset.from_name ?? '');
    setFromEmail(preset.from_email ?? '');
    setSubject(preset.subject ?? '');
    setBody(preset.body ?? '');
    setKind(preset.kind ?? 'plain');
    setInviteTitle(preset.invite_payload?.title ?? '');
    setInviteStart(preset.invite_payload?.start_at ?? '');
    setInviteLocation(preset.invite_payload?.location ?? '');
    setResult(null);
    setError('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: SimulateEmailRequest = {
      from_name: fromName || undefined,
      from_email: fromEmail,
      subject,
      body,
      kind,
    };
    if (kind === 'calendar_invite') {
      payload.invite_payload = {
        title: inviteTitle,
        start_at: inviteStart,
        location: inviteLocation || null,
      };
    }
    send.mutate(payload);
  }

  const emails = emailsQuery.data?.emails ?? [];

  return (
    <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
      <section>
        <h2 className="text-xl font-bold mb-4">Agent inbox</h2>
        {emails.length === 0 && (
          <p className="text-gray-500 bg-white rounded-lg shadow p-6">
            Nothing yet — simulate an inbound email to see your agent work.
          </p>
        )}
        <ul className="space-y-2">
          {emails.map((email) => (
            <li key={email.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-800 truncate">{email.subject}</span>
                <ClassificationBadge email={email} />
              </div>
              <p className="text-sm text-gray-500">
                from {email.from_name ?? email.from_email}
                {email.kind === 'calendar_invite' && ' · 📅 invite'}
              </p>
              {email.summary && <p className="text-sm text-gray-600 mt-1">{email.summary}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Send your agent an email</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(PRESETS).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => applyPreset(name)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                {name}
              </button>
            ))}
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                aria-label="From name"
                placeholder="From name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="rounded border-gray-300 p-2 border"
              />
              <input
                aria-label="From email"
                placeholder="From email"
                type="email"
                required
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="rounded border-gray-300 p-2 border"
              />
            </div>
            <input
              aria-label="Subject"
              placeholder="Subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded border-gray-300 p-2 border"
            />
            <textarea
              aria-label="Body"
              placeholder="Body"
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded border-gray-300 p-2 border"
            />
            <select
              aria-label="Email kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as EmailKind)}
              className="rounded border-gray-300 p-2 border"
            >
              <option value="plain">Plain email</option>
              <option value="calendar_invite">Calendar invite</option>
              <option value="newsletter">Newsletter</option>
            </select>
            {kind === 'calendar_invite' && (
              <div className="space-y-3 border-l-4 border-blue-100 pl-3">
                <input
                  aria-label="Invite title"
                  placeholder="Event title"
                  required
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                  className="w-full rounded border-gray-300 p-2 border"
                />
                <input
                  aria-label="Invite start"
                  placeholder="Start (ISO datetime)"
                  required
                  value={inviteStart}
                  onChange={(e) => setInviteStart(e.target.value)}
                  className="w-full rounded border-gray-300 p-2 border"
                />
                <input
                  aria-label="Invite location"
                  placeholder="Location (optional)"
                  value={inviteLocation}
                  onChange={(e) => setInviteLocation(e.target.value)}
                  className="w-full rounded border-gray-300 p-2 border"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={send.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {send.isPending ? 'Sending...' : 'Send to agent'}
            </button>
          </form>

          {result && (
            <div className="mt-4 p-4 bg-green-50 rounded text-sm space-y-1" role="status">
              <p className="font-semibold text-green-800">
                Processed: classified as {result.email.classification}
                {result.email.classification_source === 'llm' ? ' (by Claude)' : ''}
              </p>
              {result.event && <p className="text-green-700">Created calendar event "{String((result.event as { title?: string }).title)}".</p>}
              {result.actions.map((a) => (
                <p key={a.id} className="text-green-700">
                  {a.status === 'pending' ? '⏳ ' : '✓ '}
                  {a.summary}
                </p>
              ))}
              {result.actions.some((a) => a.status === 'pending') && (
                <p className="text-green-800">Review pending items on the Assistant tab.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
