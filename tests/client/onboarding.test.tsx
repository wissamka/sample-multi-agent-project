import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/client/src/contexts/AuthContext';
import OnboardingPage from '../../src/client/src/pages/OnboardingPage';
import OnboardingGate from '../../src/client/src/components/OnboardingGate';

function renderWithProviders(ui: React.ReactElement, initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{ui}</AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.setItem('token', 'test-token');
});

describe('OnboardingGate', () => {
  it('redirects to /onboarding when no profile exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ profile: null }),
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/onboarding" element={<div>WIZARD HERE</div>} />
        <Route
          path="/"
          element={
            <OnboardingGate>
              <div>PROTECTED CONTENT</div>
            </OnboardingGate>
          }
        />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText('WIZARD HERE')).toBeInTheDocument();
    });
    expect(screen.queryByText('PROTECTED CONTENT')).not.toBeInTheDocument();
  });

  it('renders children when the profile is onboarded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            profile: { user_id: 'u1', onboarded_at: '2026-07-19T00:00:00Z' },
          }),
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/onboarding" element={<div>WIZARD HERE</div>} />
        <Route
          path="/"
          element={
            <OnboardingGate>
              <div>PROTECTED CONTENT</div>
            </OnboardingGate>
          }
        />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText('PROTECTED CONTENT')).toBeInTheDocument();
    });
  });
});

describe('OnboardingPage', () => {
  it('walks through the wizard and submits the assembled payload', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ profile: { user_id: 'u1' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    renderWithProviders(
      <Routes>
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/assistant" element={<div>ASSISTANT HOME</div>} />
      </Routes>,
    );

    // Step 1: about you
    await user.type(screen.getByLabelText(/your name/i), 'Wissam');
    const timezoneInput = screen.getByLabelText(/timezone/i);
    await user.clear(timezoneInput);
    await user.type(timezoneInput, 'America/New_York');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: family
    await user.click(screen.getByRole('button', { name: /add family member/i }));
    await user.type(screen.getByLabelText('Family member name 1'), 'Mom');
    await user.type(screen.getByLabelText('Family member email 1'), 'mom@family.com');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 3: coworkers (skip)
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 4: preferences
    await user.type(screen.getByLabelText(/interests/i), 'travel, AI');
    await user.click(screen.getByRole('button', { name: /finish setup/i }));

    await waitFor(() => {
      expect(screen.getByText('ASSISTANT HOME')).toBeInTheDocument();
    });

    const call = mockFetch.mock.calls.find(([url]) => String(url).includes('/profile/onboarding'))!;
    const body = JSON.parse(call[1].body);
    expect(body.display_name).toBe('Wissam');
    expect(body.timezone).toBe('America/New_York');
    expect(body.family).toEqual([{ name: 'Mom', email: 'mom@family.com' }]);
    expect(body.coworkers).toEqual([]);
    expect(body.interests).toEqual(['travel', 'AI']);
  });
});
