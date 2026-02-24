import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/client/src/contexts/AuthContext';
import KanbanBoard from '../../src/client/src/components/KanbanBoard';
import TaskCard from '../../src/client/src/components/TaskCard';
import TaskModal from '../../src/client/src/components/TaskModal';

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

describe('KanbanBoard', () => {
  it('renders three columns: Todo, In Progress, Done', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ tasks: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    renderWithProviders(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getByText(/todo/i)).toBeInTheDocument();
      expect(screen.getByText(/in progress/i)).toBeInTheDocument();
      expect(screen.getByText(/done/i)).toBeInTheDocument();
    });
  });
});

describe('TaskCard', () => {
  it('renders task title', () => {
    const task = {
      id: '1',
      user_id: 'u1',
      title: 'Test Task',
      description: null,
      status: 'todo' as const,
      due_date: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    renderWithProviders(
      <TaskCard task={task} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});

describe('TaskModal', () => {
  it('submits create form correctly', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () =>
        Promise.resolve({
          task: {
            id: '1',
            user_id: 'u1',
            title: 'New Task',
            description: null,
            status: 'todo',
            due_date: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const onClose = vi.fn();
    renderWithProviders(<TaskModal onClose={onClose} />);

    await user.type(screen.getByLabelText(/title/i), 'New Task');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/tasks', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('New Task'),
      }));
    });
  });
});
