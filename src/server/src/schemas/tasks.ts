import { z } from 'zod';

const TaskStatusSchema = z.enum(['todo', 'in-progress', 'done']);

const dueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'due_date must be ISO-8601 date (YYYY-MM-DD)')
  .nullable()
  .optional();

export const CreateTaskRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer').optional(),
  status: TaskStatusSchema.optional(),
  due_date: dueDateSchema,
});

export const UpdateTaskRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer').optional(),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer').nullable().optional(),
  status: TaskStatusSchema.optional(),
  due_date: dueDateSchema,
});
