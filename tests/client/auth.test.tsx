import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/client/src/contexts/AuthContext';
import LoginPage from '../../src/client/src/pages/LoginPage';

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
});

describe('LoginPage', () => {
  it('renders email and password inputs', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('submits correct payload on login', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ token: 'test-jwt', user: { id: '1', email: 'a@b.com' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(mockFetch).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com', password: 'password123' }),
    }));
  });

  it('shows error on 401', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid credentials' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });
});
