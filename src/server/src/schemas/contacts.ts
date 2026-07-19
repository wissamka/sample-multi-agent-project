import { z } from 'zod';

const RelationshipSchema = z.enum(['family', 'coworker', 'other']);

export const CreateContactRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('email must be a valid email'),
  relationship: RelationshipSchema,
});

export const UpdateContactRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  relationship: RelationshipSchema.optional(),
});
