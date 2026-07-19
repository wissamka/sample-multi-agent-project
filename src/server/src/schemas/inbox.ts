import { z } from 'zod';

const IsoDatetimeSchema = z
  .string()
  .datetime({ offset: true, message: 'must be an ISO-8601 datetime' });

export const InvitePayloadSchema = z.object({
  title: z.string().min(1, 'Invite title is required').max(200),
  start_at: IsoDatetimeSchema,
  end_at: IsoDatetimeSchema.nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  organizer: z.string().email().nullable().optional(),
});

export const SimulateEmailRequestSchema = z
  .object({
    from_name: z.string().max(100).optional(),
    from_email: z.string().email('from_email must be a valid email'),
    subject: z.string().min(1, 'Subject is required').max(200),
    body: z.string().min(1, 'Body is required').max(10000),
    kind: z.enum(['plain', 'calendar_invite', 'newsletter']).optional(),
    invite_payload: InvitePayloadSchema.optional(),
  })
  .refine((data) => data.kind !== 'calendar_invite' || data.invite_payload !== undefined, {
    message: 'invite_payload is required when kind is calendar_invite',
  });
