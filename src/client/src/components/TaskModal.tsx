import { useState, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, updateTask } from '../api/tasks';
import type { Task, TaskStatus } from '../types';

interface Props {
  task?: Task;
  onClose: () => void;
}

export default function TaskModal({ task, onClose }: Props) {
  const isEdit = !!task;
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [dueDate, setDueDate] = useState(task?.due_date ?? '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        title,
        description: description || null,
        status,
        due_date: dueDate || null,
      };
      return isEdit ? updateTask(task.id, data) : createTask(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setError('');
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">{isEdit ? 'Edit Task' : 'Create Task'}</h2>
        {error && (
          <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 border"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 border"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 border"
            >
              <option value="todo">Todo</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 border"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
