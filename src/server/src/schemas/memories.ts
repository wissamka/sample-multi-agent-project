import { z } from 'zod';

const MemoryCategorySchema = z.enum(['fact', 'preference', 'contact', 'note']);

export const CreateMemoryRequestSchema = z.object({
  category: MemoryCategorySchema,
  content: z.string().min(1, 'Content is required').max(2000),
});

export const UpdateMemoryRequestSchema = z.object({
  category: MemoryCategorySchema.optional(),
  content: z.string().min(1).max(2000).optional(),
});
