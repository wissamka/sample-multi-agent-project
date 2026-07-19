import { describe, it, expect } from 'vitest';
import { HeuristicBrain } from '../../src/server/src/services/brain/heuristicBrain';
import { BrainContext, InboundEmailInput } from '../../src/server/src/services/brain/types';

const brain = new HeuristicBrain();

const ctx: BrainContext = {
  profile: { display_name: 'Wissam', timezone: 'UTC', interests: ['travel'] },
  contacts: [
    { name: 'Mom', email: 'mom@family.com', relationship: 'family' },
    { name: 'Jordan', email: 'jordan@company.com', relationship: 'coworker' },
  ],
};

function email(overrides: Partial<InboundEmailInput>): InboundEmailInput {
  return {
    from_name: null,
    from_email: 'someone@example.com',
    subject: 'Hello',
    body: 'Just checking in.',
    kind: 'plain',
    ...overrides,
  };
}

describe('HeuristicBrain.classifyEmail', () => {
  const cases: Array<[string, Partial<InboundEmailInput>, string]> = [
    ['family sender → personal', { from_email: 'mom@family.com' }, 'personal'],
    ['family sender, case-insensitive → personal', { from_email: 'MOM@FAMILY.COM' }, 'personal'],
    ['coworker sender → work', { from_email: 'jordan@company.com' }, 'work'],
    ['standup subject → work', { subject: 'Daily standup moved' }, 'work'],
    ['meeting keyword in body → work', { body: 'Can we schedule a meeting for Friday.' }, 'work'],
    ['birthday keyword → personal', { subject: 'Birthday party!' }, 'personal'],
    ['unsubscribe footer → newsletter', { body: 'News... unsubscribe here.' }, 'newsletter'],
    ['newsletter kind → newsletter', { kind: 'newsletter' }, 'newsletter'],
    ['question-dense body → question', { body: 'Are you free? What time works?' }, 'question'],
    ['plain unknown → other', {}, 'other'],
  ];

  it.each(cases)('%s', async (_label, overrides, expected) => {
    const result = await brain.classifyEmail(email(overrides), ctx);
    expect(result.classification).toBe(expected);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('newsletter markers win over known senders', async () => {
    const result = await brain.classifyEmail(
      email({ from_email: 'mom@family.com', body: 'Recipes! unsubscribe below' }),
      ctx
    );
    expect(result.classification).toBe('newsletter');
  });
});

describe('HeuristicBrain.summarizeEmail', () => {
  it('includes sender name and subject', async () => {
    const summary = await brain.summarizeEmail(
      email({ from_name: 'Sam', subject: 'Lunch', body: 'Want to grab lunch?' })
    );
    expect(summary).toContain('Sam');
    expect(summary).toContain('Lunch');
  });

  it('truncates long bodies', async () => {
    const summary = await brain.summarizeEmail(email({ body: 'x'.repeat(500) }));
    expect(summary.length).toBeLessThan(200);
    expect(summary).toContain('...');
  });
});

describe('HeuristicBrain.extractMemories', () => {
  it('captures stated preferences', async () => {
    const memories = await brain.extractMemories(
      email({ from_email: 'mom@family.com', body: 'By the way, I love thai food.' }),
      ctx
    );
    expect(memories).toHaveLength(1);
    expect(memories[0].category).toBe('preference');
    expect(memories[0].content).toContain('Mom');
    expect(memories[0].content.toLowerCase()).toContain('i love thai food');
  });

  it('returns nothing for emails without preference statements', async () => {
    const memories = await brain.extractMemories(email({}), ctx);
    expect(memories).toHaveLength(0);
  });
});

describe('HeuristicBrain.writeBriefProse', () => {
  it('mentions events, pending items, and open tasks', async () => {
    const prose = await brain.writeBriefProse(
      {
        date: '2026-07-19',
        events: [{ title: 'Q3 review', start_at: '2026-07-19T14:00:00.000Z', location: 'Room B' }],
        waiting_on_you: [{ summary: 'Approve adding Mom to dinner' }],
        open_tasks: [{ title: 'Book flights', status: 'todo', due_date: null }],
        recent_activity: [],
      },
      ctx
    );
    expect(prose).toContain('Wissam');
    expect(prose).toContain('Q3 review');
    expect(prose).toContain('Approve adding Mom to dinner');
    expect(prose).toContain('1 open task');
  });

  it('says the calendar is clear when there are no events', async () => {
    const prose = await brain.writeBriefProse(
      { date: '2026-07-19', events: [], waiting_on_you: [], open_tasks: [], recent_activity: [] },
      ctx
    );
    expect(prose).toContain('calendar is clear');
  });
});
