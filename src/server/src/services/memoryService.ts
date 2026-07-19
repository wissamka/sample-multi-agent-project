import { pool } from '../db/client';

export interface NewMemory {
  category: 'fact' | 'preference' | 'contact' | 'note';
  content: string;
  source: 'onboarding' | 'email' | 'manual';
  source_email_id?: string | null;
}

export async function insertMemory(userId: string, memory: NewMemory): Promise<Record<string, unknown>> {
  const result = await pool.query(
    `INSERT INTO memories (user_id, category, content, source, source_email_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, memory.category, memory.content, memory.source, memory.source_email_id ?? null]
  );
  return result.rows[0];
}
