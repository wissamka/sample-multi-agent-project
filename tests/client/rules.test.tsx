import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/client/src/contexts/AuthContext';
import RulesPage from '../../src/client/src/pages/RulesPage';

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

const familyRule = {
  id: 'r1',
  user_id: 'u1',
  name: 'Personal events include family',
  trigger: 'personal_event',
  action: 'add_family',
  mode: 'ask',
  enabled: true,
  position: 0,
  created_at: '2026-07-19T00:00:00Z',
  updated_at: '2026-07-19T00:00:00Z',
};

function stubFetch() {
  const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (url.includes('/rules/r1') && method === 'PATCH') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ rule: { ...familyRule, mode: 'auto' } }),
      };
    }
    if (url.includes('/rules')) {
      return { ok: true, status: 200, json: async () => ({ rules: [familyRule] }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

describe('RulesPage', () => {
  it('renders rules as plain-English sentences', async () => {
    stubFetch();
    renderWithProviders(<RulesPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/When a personal event invite arrives, also invite my family/),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/after asking me/)).toBeInTheDocument();
  });

  it('toggling the mode issues a PATCH', async () => {
    const user = userEvent.setup();
    const mockFetch = stubFetch();
    renderWithProviders(<RulesPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ask first' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Ask first' }));

    await waitFor(() => {
      const call = mockFetch.mock.calls.find(
        ([url, init]) => String(url).includes('/rules/r1') && init?.method === 'PATCH',
      );
      expect(call).toBeDefined();
      expect(JSON.parse(call![1]!.body as string)).toEqual({ mode: 'auto' });
    });
  });
});
