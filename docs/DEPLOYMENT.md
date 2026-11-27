# PastCraft — Deployment, GitHub & Integration Guide

This guide covers configuring **GitHub protections**, **Supabase**, **Discord integrations**, **YouTube Data API v3**, and **Vercel** for **PastCraft**.

---

## 1. GitHub Branch Governance (`PastCraft/PastCraft`)

- **Default / Production Branch:** `main` (exclusively controlled by `@jasonhukom`).
- **Code Owners:** [`.github/CODEOWNERS`](../.github/CODEOWNERS) designates `* @jasonhukom`.
- **CI Workflow:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs ESLint, TypeScript (`tsc --noEmit`), Vitest (`npm test`), and `next build` on pull requests targeting `main` and pushes to task branches.
- **Branch Ruleset on `main`:**
  - Pull request required before merging, with Code Owner approval (`* @jasonhukom`), stale approval dismissal, and conversation thread resolution.
  - Required status check: `Lint, Typecheck, Test & Build`.
  - Force pushes and branch deletion blocked; rules enforced across collaborators.
  - Note: Any collaborator holding Organization Owner (`admin`) role in the `PastCraft` GitHub organization can alter org/repo settings in GitHub; restrict org ownership exclusively to `jasonhukom` in GitHub Organization Settings if other contributors should only have maintainer/write access.

---

## 2. Supabase Provisioning (`izoqsuaqasnwjlqhwbmf`)

Project URL: `https://izoqsuaqasnwjlqhwbmf.supabase.co`  
Project Reference: `izoqsuaqasnwjlqhwbmf`

### Option A: Supabase CLI (Recommended)

```bash
npx supabase login
npx supabase link --project-ref izoqsuaqasnwjlqhwbmf
npx supabase db push
```

The CLI uses [`supabase/config.toml`](../supabase/config.toml) and executes the timestamped migrations in order:

1. [`supabase/migrations/20261127000100_initial_schema.sql`](../supabase/migrations/20261127000100_initial_schema.sql)
2. [`supabase/migrations/20261127000200_admin_auth.sql`](../supabase/migrations/20261127000200_admin_auth.sql)
3. [`supabase/migrations/20261127000300_rls_policies.sql`](../supabase/migrations/20261127000300_rls_policies.sql)

*(Optional)* Populate starter sample data with [`supabase/seed.sql`](../supabase/seed.sql).

### Option B: Supabase Dashboard SQL Editor

Run the three migration files above in chronological order in **SQL Editor**, then optionally run `supabase/seed.sql`.

### Creating the First Administrator

1. Under **Authentication -> Users**, create an admin user (Email + Password).
2. Grant `owner` permissions in **SQL Editor**:

```sql
INSERT INTO public.admin_users (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'owner');
```

3. Obtain a fresh privileged `SUPABASE_SECRET_KEY` from **Project Settings -> API Keys** if elevated server operations (such as direct storage uploads bypassing user RLS) are required. Never reuse previously exposed keys.

---

## 3. Discord Integrations

1. **Public Invitation (`DISCORD_INVITE_URL`):** `https://discord.gg/NNXXb9DKJv`
2. **Discord Server Widget (`DISCORD_GUILD_ID`):**
   - Enable **Server Widget** in Discord under **Server Settings -> Widget** for server `1423856051068997644`.
   - `GET /api/discord/widget` fetches Discord's widget JSON server-side, strips all individual members/avatars/statuses/channels, caches for ~60s, and serves safe aggregated summary data.
3. **Administrative Webhook (`DISCORD_WEBHOOK_URL`):**
   - In `#pastcraft-log` (**Channel Settings -> Integrations -> Webhooks**), generate a fresh webhook named `Official Website`.
   - Store the URL exclusively in private server environment variable `DISCORD_WEBHOOK_URL`.

---

## 4. YouTube Data API v3 Configuration

1. Enable **YouTube Data API v3** in the [Google Cloud Console](https://console.cloud.google.com/).
2. Create an API key restricted to **YouTube Data API v3** and configure server-only variables:
   - `YOUTUBE_API_KEY`
   - `YOUTUBE_PLAYLIST_ID=PLraO9HlKcRgzMnWc8D_LusO1KLlIbbLw5`
3. Never place collaborator invitations or `YOUTUBE_API_KEY` in frontend code, `NEXT_PUBLIC_` variables, or Git.

---

## 5. Deploying to Vercel

1. Import `PastCraft/PastCraft` in [Vercel](https://vercel.com/new):
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `.`
   - **Build Command:** `npm run build` (default)
   - **Install Command:** `npm install` (or `npm ci`)
   - **Production Branch:** `main`
2. Do not add `vercel.json` unless future custom routing/cron rules are needed.
3. Configure Environment Variables across **Development**, **Preview**, and **Production**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://izoqsuaqasnwjlqhwbmf.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_aybv5jEm__vypdT8htQ6MQ_reHE2nU4
SUPABASE_SECRET_KEY=<newly-generated-secret-key>

DISCORD_GUILD_ID=1423856051068997644
DISCORD_INVITE_URL=https://discord.gg/NNXXb9DKJv
DISCORD_WEBHOOK_URL=<newly-regenerated-webhook-url>

YOUTUBE_API_KEY=<google-youtube-v3-api-key>
YOUTUBE_PLAYLIST_ID=PLraO9HlKcRgzMnWc8D_LusO1KLlIbbLw5

NEXT_PUBLIC_SITE_URL=<actual-vercel-deployment-url>
```

---

## 6. Pre-Launch Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
