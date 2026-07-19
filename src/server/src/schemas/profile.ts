import { z } from 'zod';

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const TimezoneSchema = z
  .string()
  .refine(isValidTimezone, 'timezone must be a valid IANA timezone (e.g. America/New_York)');

const ContactInputSchema = z.object({
  name: z.string().min(1, 'Contact name is required').max(100),
  email: z.string().email('Contact email must be a valid email'),
});

export const OnboardingRequestSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or fewer'),
  timezone: TimezoneSchema,
  family: z.array(ContactInputSchema).max(20).default([]),
  coworkers: z.array(ContactInputSchema).max(50).default([]),
  brief_hour: z.number().int().min(0).max(23).optional(),
  interests: z.array(z.string().min(1).max(100)).max(20).optional(),
});

export const UpdateProfileRequestSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  timezone: TimezoneSchema.optional(),
  brief_hour: z.number().int().min(0).max(23).optional(),
  interests: z.array(z.string().min(1).max(100)).max(20).optional(),
});
