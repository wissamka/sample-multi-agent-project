import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { listTasks, updateTask, deleteTask } from '../api/tasks';
import type { Task, TaskStatus } from '../types';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'Todo' },
  { status: 'in-progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
];

export default function KanbanBoard() {
  const queryClient = useQueryClient();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => listTasks().then((r) => r.tasks),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTask(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) => (t.id === id ? { ...t, status } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['tasks'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    const taskId = active.id as string;
    const task = data?.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      moveMutation.mutate({ id: taskId, status: newStatus });
    }
  }

  if (isLoading) return <div className="text-center py-8">Loading tasks...</div>;
  if (error) return <div className="text-center py-8 text-red-600">Failed to load tasks</div>;

  const tasks = data ?? [];

  return (
    <>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              tasks={tasks.filter((t) => t.status === col.status)}
              onEdit={setEditingTask}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      </DndContext>
      {editingTask && (
        <TaskModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}
    </>
  );
}
