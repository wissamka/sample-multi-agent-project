// Applies src/db/migrations/*.sql in filename order against DATABASE_URL.
// Every migration uses CREATE ... IF NOT EXISTS, so re-running is safe.
//
//   DATABASE_URL='postgres://...' npm run db:migrate
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'db',
  'migrations'
);

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await client.query(sql);
    console.log(`applied ${file}`);
  }
  console.log(`done — ${files.length} migrations applied`);
} finally {
  await client.end();
}
