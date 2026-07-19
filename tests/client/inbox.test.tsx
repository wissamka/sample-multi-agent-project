import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/client/src/contexts/AuthContext';
import InboxPage from '../../src/client/src/pages/InboxPage';

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

const processedEmail = {
  id: 'em1',
  user_id: 'u1',
  from_name: 'Jordan Lee',
  from_email: 'jordan.lee@company.com',
  to_address: 'wissam@agent.local',
  subject: 'Invitation: Q3 planning review',
  body: 'You are invited.',
  kind: 'calendar_invite',
  invite_payload: null,
  classification: 'work',
  classification_source: 'heuristic',
  summary: 'Jordan Lee: Invitation — You are invited.',
  status: 'processed',
  received_at: '2026-07-19T10:00:00Z',
  processed_at: '2026-07-19T10:00:01Z',
};

function stubFetch() {
  const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (url.includes('/inbox/simulate') && method === 'POST') {
      return {
        ok: true,
        status: 201,
        json: async () => ({
          email: processedEmail,
          event: { id: 'e1', title: 'Q3 planning review' },
          actions: [
            {
              id: 'a1',
              status: 'pending',
              summary: 'Proposed adding Sam to "Q3 planning review"',
            },
          ],
        }),
      };
    }
    if (url.includes('/inbox')) {
      return { ok: true, status: 200, json: async () => ({ emails: [processedEmail] }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

describe('InboxPage', () => {
  it('lists emails with classification badges', async () => {
    stubFetch();
    renderWithProviders(<InboxPage />);

    await waitFor(() => {
      expect(screen.getByText('Invitation: Q3 planning review')).toBeInTheDocument();
    });
    expect(screen.getByText('work')).toBeInTheDocument();
  });

  it('applies a preset, sends it, and shows the pipeline outcome', async () => {
    const user = userEvent.setup();
    const mockFetch = stubFetch();
    renderWithProviders(<InboxPage />);

    await user.click(screen.getByRole('button', { name: 'Work invite' }));

    expect(screen.getByLabelText('From email')).toHaveValue('jordan.lee@company.com');
    expect(screen.getByLabelText('Invite title')).toHaveValue('Q3 planning review');

    await user.click(screen.getByRole('button', { name: /send to agent/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('classified as work');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Proposed adding Sam');

    const call = mockFetch.mock.calls.find(
      ([url, init]) => String(url).includes('/inbox/simulate') && init?.method === 'POST',
    )!;
    const body = JSON.parse(call[1]!.body as string);
    expect(body.kind).toBe('calendar_invite');
    expect(body.invite_payload.title).toBe('Q3 planning review');
  });
});
