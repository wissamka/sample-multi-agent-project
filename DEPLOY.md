# Deploying to Vercel

The repo is set up as a single Vercel project: the React client is served as
static files, and the Express API runs as one serverless function behind
`/api/*` (see `vercel.json` and `api/index.ts`). The database is hosted
Postgres — these steps use Neon from the Vercel Marketplace.

## One-time setup

1. **Import the project.** vercel.com → Add New… → Project → import
   `wissamka/sample-multi-agent-project`. Pick the branch to deploy
   (`claude/personal-assistant-service-1epi5g`, or `main` after merging).
   Framework preset: **Other** — `vercel.json` drives the build and routing.

2. **Add the database.** In the project: Storage → Create Database →
   **Neon** (Marketplace) → connect it to this project. This injects
   `DATABASE_URL` into the project's environment. Use the default **pooled**
   connection string — the server opens a small `pg` pool per function
   invocation, and Neon's pooler absorbs that.

3. **Set environment variables.** Settings → Environment Variables:

   | Variable | Value |
   |---|---|
   | `JWT_SECRET` | any random string, 32+ characters (required) |
   | `ANTHROPIC_API_KEY` | optional — enables the Claude brain; omit to run on offline heuristics |
   | `ANTHROPIC_MODEL` | optional, defaults to `claude-sonnet-5` |
   | `AGENT_EMAIL_DOMAIN` | optional, defaults to `agent.local` |

4. **Create the schema.** From your machine, with the Neon connection string
   (copy it from the Storage tab):

   ```bash
   npm install
   DATABASE_URL='postgres://...' npm run db:migrate
   ```

   Migrations are idempotent (`CREATE ... IF NOT EXISTS`), so re-running is safe.

5. **Deploy.** Trigger a deployment (importing the project usually does this
   automatically; otherwise Deployments → Redeploy). Then open the URL and run
   the demo loop: register → onboarding wizard → Inbox presets → approve the
   proposal on Assistant → Generate brief.

## Notes and limits

- **Cold starts**: the first API request after idle takes ~1s extra.
- **Long requests**: `/api/inbox/simulate` with the Claude brain makes up to
  three sequential model calls; `vercel.json` sets `maxDuration: 60` for the
  API function to cover that. Heuristic mode responds in milliseconds.
- **Scheduler**: the daily brief is button-driven (`Generate brief` /
  `Simulate scheduled run`). A real schedule would be a Vercel Cron job
  hitting a secret-protected endpoint — not wired up yet.
- **Local dev is unchanged**: `npm run dev` — the Vite proxy forwards
  `/api/*` to the local Express server on :3000.
