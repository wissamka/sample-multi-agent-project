import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/client/src/contexts/AuthContext';
import AssistantHomePage from '../../src/client/src/pages/AssistantHomePage';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{ui}</AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.setItem('token', 'test-token');
});

const brief = {
  id: 'b1',
  user_id: 'u1',
  brief_date: '2026-07-19',
  trigger: 'manual',
  generated_by: 'heuristic',
  prose: "Good morning, Wissam! Here's your day for 2026-07-19.",
  content: {
    events: [
      {
        id: 'e1',
        title: 'Q3 planning review',
        start_at: '2026-07-19T14:00:00Z',
        location: 'Room B',
      },
    ],
    waiting_on_you: [{ id: 'a1', summary: 'Proposed adding Sam to "Q3 planning review"' }],
    open_tasks: [{ id: 't1', title: 'Book flights', status: 'todo' }],
    recent_activity: [],
  },
  created_at: '2026-07-19T08:00:00Z',
};

const pendingAction = {
  id: 'a1',
  user_id: 'u1',
  type: 'invite_proposal',
  status: 'pending',
  summary: 'Proposed adding Sam to "Q3 planning review"',
  payload: {
    proposed_attendees: [{ name: 'Sam', email: 'sam@company.com', added_by: 'rule' }],
  },
  related_email_id: null,
  related_event_id: 'e1',
  created_at: '2026-07-19T07:00:00Z',
  resolved_at: null,
};

function stubFetch() {
  const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (url.includes('/brief/latest')) {
      return { ok: true, status: 200, json: async () => ({ brief }) };
    }
    if (url.includes('/actions/a1/approve') && method === 'POST') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ action: { ...pendingAction, status: 'approved' } }),
      };
    }
    if (url.includes('/actions')) {
      return { ok: true, status: 200, json: async () => ({ actions: [pendingAction] }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

describe('AssistantHomePage', () => {
  it('renders the brief prose and structured sections', async () => {
    stubFetch();
    renderWithProviders(<AssistantHomePage />);

    await waitFor(() => {
      expect(screen.getByText(/Good morning, Wissam/)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Q3 planning review/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Book flights/)).toBeInTheDocument();
    expect(screen.getByText('Daily brief — 2026-07-19')).toBeInTheDocument();
  });

  it('shows pending approvals and fires approve', async () => {
    const user = userEvent.setup();
    const mockFetch = stubFetch();
    renderWithProviders(<AssistantHomePage />);

    await waitFor(() => {
      expect(screen.getByText(/Needs your approval/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Sam <sam@company.com>/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      const call = mockFetch.mock.calls.find(
        ([url, init]) => String(url).includes('/actions/a1/approve') && init?.method === 'POST',
      );
      expect(call).toBeDefined();
    });
  });
});
