import { z } from 'zod';

const RuleTriggerSchema = z.enum(['personal_event', 'work_event', 'unknown_sender']);
const RuleActionSchema = z.enum(['add_family', 'add_coworkers', 'ask_user', 'auto_accept', 'auto_decline']);
const RuleModeSchema = z.enum(['auto', 'ask']);

export const CreateRuleRequestSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(100),
  trigger: RuleTriggerSchema,
  action: RuleActionSchema,
  mode: RuleModeSchema.optional(),
});

export const UpdateRuleRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  mode: RuleModeSchema.optional(),
  enabled: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});
