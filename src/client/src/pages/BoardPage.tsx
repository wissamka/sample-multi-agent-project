import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout as apiLogout } from '../api/auth';
import KanbanBoard from '../components/KanbanBoard';
import TaskModal from '../components/TaskModal';

export default function BoardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      // logout is best-effort
    }
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Task Manager</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Task
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-6">
        <KanbanBoard />
      </main>
      {showCreateModal && <TaskModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
