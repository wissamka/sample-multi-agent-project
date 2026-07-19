import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLatestBrief, generateBrief, tickScheduler } from '../api/brief';
import { listActions, approveAction, rejectAction } from '../api/actions';
import type { AgentAction, Brief, CalendarEvent, Task } from '../types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function BriefView({ brief }: { brief: Brief }) {
  const { events, waiting_on_you, open_tasks, recent_activity } = brief.content;
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Daily brief — {brief.brief_date}</h3>
        <span className="text-xs text-gray-400">
          {brief.trigger === 'scheduled' ? 'scheduled run' : 'generated manually'} ·{' '}
          {brief.generated_by}
        </span>
      </div>
      <p className="text-gray-800">{brief.prose}</p>
      <div className="grid md:grid-cols-3 gap-4 text-sm">
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Today's events</h4>
          {events.length === 0 && <p className="text-gray-400">Nothing scheduled.</p>}
          <ul className="space-y-1">
            {events.map((e: CalendarEvent) => (
              <li key={e.id} className="text-gray-600">
                {formatTime(e.start_at)} — {e.title}
                {e.location ? ` (${e.location})` : ''}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Waiting on you</h4>
          {waiting_on_you.length === 0 && <p className="text-gray-400">All clear.</p>}
          <ul className="space-y-1">
            {waiting_on_you.map((a: AgentAction) => (
              <li key={a.id} className="text-gray-600">
                {a.summary}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Open tasks</h4>
          {open_tasks.length === 0 && <p className="text-gray-400">Board is clear.</p>}
          <ul className="space-y-1">
            {open_tasks.map((t: Task) => (
              <li key={t.id} className="text-gray-600">
                {t.title} <span className="text-gray-400">({t.status})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {recent_activity.length > 0 && (
        <div className="text-sm">
          <h4 className="font-semibold text-gray-700 mb-2">Recent agent activity</h4>
          <ul className="space-y-1">
            {recent_activity.map((a: AgentAction) => (
              <li key={a.id} className="text-gray-500">
                {a.summary}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PendingApprovalCard({ action }: { action: AgentAction }) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['actions'] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['brief'] });
  };
  const approve = useMutation({ mutationFn: () => approveAction(action.id), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: () => rejectAction(action.id), onSuccess: invalidate });

  const proposed = (action.payload?.proposed_attendees ?? []) as Array<{ name: string; email: string }>;

  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-gray-800">{action.summary}</p>
        {proposed.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Would add: {proposed.map((a) => `${a.name} <${a.email}>`).join(', ')}
          </p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => approve.mutate()}
          disabled={approve.isPending || reject.isPending}
          className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => reject.mutate()}
          disabled={approve.isPending || reject.isPending}
          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

export default function AssistantHomePage() {
  const queryClient = useQueryClient();
  const briefQuery = useQuery({ queryKey: ['brief', 'latest'], queryFn: getLatestBrief });
  const pendingQuery = useQuery({
    queryKey: ['actions', 'pending'],
    queryFn: () => listActions('pending'),
  });

  const refreshBrief = () => queryClient.invalidateQueries({ queryKey: ['brief'] });
  const generate = useMutation({ mutationFn: generateBrief, onSuccess: refreshBrief });
  const tick = useMutation({ mutationFn: tickScheduler, onSuccess: refreshBrief });

  const brief = briefQuery.data?.brief ?? null;
  const pending = pendingQuery.data?.actions ?? [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Your assistant</h2>
        <div className="flex gap-2">
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {generate.isPending ? 'Generating...' : 'Generate brief'}
          </button>
          <button
            onClick={() => tick.mutate()}
            disabled={tick.isPending}
            title="Pretend the daily scheduler just fired"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Simulate scheduled run
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">
            Needs your approval ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((action) => (
              <PendingApprovalCard key={action.id} action={action} />
            ))}
          </div>
        </section>
      )}

      {brief ? (
        <BriefView brief={brief} />
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No brief yet. Generate one, or send your agent some email from the Inbox tab first.
        </div>
      )}
    </div>
  );
}
