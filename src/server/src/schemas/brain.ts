import { z } from 'zod';

// Single source of truth for the classification enum: validates heuristic
// output and constrains LLM structured output to the same shape.
export const EmailClassificationSchema = z.object({
  classification: z.enum(['personal', 'work', 'newsletter', 'question', 'other']),
  confidence: z.number().min(0).max(1),
});

export type EmailClassificationResult = z.infer<typeof EmailClassificationSchema>;

export const MemoryCandidateSchema = z.object({
  category: z.enum(['fact', 'preference', 'contact', 'note']),
  content: z.string().min(1).max(500),
});

export const MemoryCandidateListSchema = z.object({
  memories: z.array(MemoryCandidateSchema).max(5),
});

export type MemoryCandidate = z.infer<typeof MemoryCandidateSchema>;
