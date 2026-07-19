import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { ClaudeBrain } from '../../src/server/src/services/brain/claudeBrain';
import { BrainContext, InboundEmailInput } from '../../src/server/src/services/brain/types';

const ctx: BrainContext = {
  profile: { display_name: 'Wissam', timezone: 'UTC', interests: [] },
  contacts: [{ name: 'Mom', email: 'mom@family.com', relationship: 'family' }],
};

const email: InboundEmailInput = {
  from_name: 'Mom',
  from_email: 'mom@family.com',
  subject: 'Dinner',
  body: 'Dinner on Sunday?',
  kind: 'plain',
};

function textResponse(text: string) {
  return { content: [{ type: 'text', text }] };
}

describe('ClaudeBrain', () => {
  let brain: ClaudeBrain;

  beforeEach(() => {
    mockCreate.mockReset();
    brain = new ClaudeBrain();
  });

  it('returns schema-validated classification from the model', async () => {
    mockCreate.mockResolvedValueOnce(
      textResponse(JSON.stringify({ classification: 'personal', confidence: 0.95 }))
    );

    const result = await brain.classifyEmail(email, ctx);

    expect(result).toEqual({ classification: 'personal', confidence: 0.95 });

    const call = mockCreate.mock.calls[0][0];
    // Structured output constrains the model to the enum schema.
    expect(call.output_config.format.type).toBe('json_schema');
    // The untrusted email body must only appear in the user turn, not system.
    expect(call.system).not.toContain('Dinner on Sunday?');
    expect(call.messages[0].role).toBe('user');
    expect(call.messages[0].content).toContain('Dinner on Sunday?');
  });

  it('falls back to the heuristic brain on API error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('network down'));

    const result = await brain.classifyEmail(email, ctx);

    // Heuristic path: family sender → personal
    expect(result.classification).toBe('personal');
  });

  it('rejects schema-violating model output via fallback', async () => {
    mockCreate.mockResolvedValueOnce(
      textResponse(JSON.stringify({ classification: 'delete_all_emails', confidence: 1 }))
    );

    const result = await brain.classifyEmail(email, ctx);

    // Invalid enum fails Zod validation → deterministic heuristic answer
    expect(result.classification).toBe('personal');
  });

  it('extracts memories through the schema and falls back on garbage', async () => {
    mockCreate.mockResolvedValueOnce(
      textResponse(JSON.stringify({ memories: [{ category: 'preference', content: 'Mom loves sushi' }] }))
    );

    const memories = await brain.extractMemories(email, ctx);
    expect(memories).toEqual([{ category: 'preference', content: 'Mom loves sushi' }]);

    mockCreate.mockResolvedValueOnce(textResponse('not json at all'));
    const fallbackMemories = await brain.extractMemories(email, ctx);
    expect(fallbackMemories).toEqual([]); // heuristic finds no preference statement
  });

  it('falls back for brief prose on API error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('overloaded'));

    const prose = await brain.writeBriefProse(
      { date: '2026-07-19', events: [], waiting_on_you: [], open_tasks: [], recent_activity: [] },
      ctx
    );

    expect(prose).toContain('Wissam');
    expect(prose).toContain('calendar is clear');
  });
});
