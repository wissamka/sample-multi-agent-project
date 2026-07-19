import { useState } from 'react';
import KanbanBoard from '../components/KanbanBoard';
import TaskModal from '../components/TaskModal';

export default function BoardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Task Board</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Task
        </button>
      </div>
      <KanbanBoard />
      {showCreateModal && <TaskModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
