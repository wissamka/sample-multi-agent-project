import { z } from 'zod';

const IsoDatetimeSchema = z
  .string()
  .datetime({ offset: true, message: 'must be an ISO-8601 datetime' });

const AttendeeSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  added_by: z.enum(['organizer', 'rule', 'user']),
});

export const CreateEventRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  start_at: IsoDatetimeSchema,
  end_at: IsoDatetimeSchema.nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  category: z.enum(['personal', 'work', 'unknown']).optional(),
});

export const UpdateEventRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  start_at: IsoDatetimeSchema.optional(),
  end_at: IsoDatetimeSchema.nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  status: z.enum(['proposed', 'confirmed', 'declined']).optional(),
  attendees: z.array(AttendeeSchema).max(100).optional(),
});
