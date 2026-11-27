# AGENTS.md — PastCraft AI Agent Instructions

This repository is the **PastCraft** international community platform. Every AI coding agent (Codex, Claude Code, Cursor, Antigravity, GitHub-connected agents, or any automated contributor) **must read and follow this document before modifying any files**.

---

## Mandatory GitHub Development Policy

Every AI coding agent must work exclusively on its own task branch.

No AI coding agent is authorized to push to or merge into `main`.

Only the GitHub user `jasonhukom` may approve and merge changes into `main`.

Agents must:

1. Read this file before modifying the repository.
2. Inspect Git status (`git status`).
3. Fetch the latest repository state (`git fetch origin`).
4. Create their own task branch starting from the latest `main`.
5. Make changes only within their task scope.
6. Test every completed logical unit (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`).
7. Add and commit meaningful changes frequently.
8. Push commits to their task branch (`git push -u origin HEAD`).
9. Keep the remote branch synchronized with completed work.
10. Open a pull request targeting `main`.
11. Provide a detailed summary of their work.
12. Wait for owner approval from `jasonhukom`.

Every meaningful development stage must be committed.

A completed task is not considered fully delivered until all commits have been pushed to the agent's remote branch, or an explicit permission limitation is documented.

Under no circumstances may an agent bypass these rules.

---

## Branch Naming Convention

Create an independent branch per task using:

```text
agent/<agent-name>/<task-name>
```

Examples:

- `agent/codex/fix-database`
- `agent/claude/update-readme`
- `agent/cursor/repair-navigation`
- `agent/antigravity/fix-vercel`
- `feature/youtube-integration`
- `fix/responsive-layout`

### Starting a Task Branch

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c agent/<agent-name>/<task-name>
```

### Committing & Pushing Completed Units

```bash
git add <relevant-files>
git commit -m "feat: describe completed change"
git push -u origin HEAD
```

For follow-up changes on the same task:

```bash
git add <relevant-files>
git commit -m "fix: describe additional changes"
git push
```

If you discover that your working tree is currently checked out on `main`, **stop immediately** and create a new task branch before making any modifications or commits.

---

## Forbidden Actions

AI agents must **NEVER**:

- Push directly to `main`.
- Merge their own pull requests into `main`.
- Force-push to `main`.
- Delete `main`.
- Disable branch protection or repository rulesets.
- Modify GitHub security settings to bypass repository rules.
- Change repository ownership.
- Rewrite shared Git history.
- Commit `.env`, `.env.*` (other than `.env.example`), API keys, webhook tokens, or Supabase secret keys.
- Commit `node_modules`, `.next`, or build artifacts.
- Overwrite another agent's unfinished work without coordination.
- Make undocumented changes directly against the production Supabase database.

If an agent lacks GitHub permissions to push a branch or open a pull request, it must stop and report the exact permission limitation instead of attempting to bypass controls.

---

## Pull Request Requirements

Every pull request targeting `main` must include:

- Task summary
- Files changed
- Features implemented
- Tests performed (`npm run lint`, `npm run typecheck`, `npm test`)
- Build status (`npm run build`)
- Known issues or limitations
- Environment variable changes (names only — never secret values)
- Database migration changes (if applicable)

---

## Environment, Security & Database Guidelines

- Never commit secret credentials (`SUPABASE_SECRET_KEY`, `DISCORD_WEBHOOK_URL`, `YOUTUBE_API_KEY`, or YouTube collaborator invitations).
- Never prefix secret environment variables with `NEXT_PUBLIC_`.
- Always use version-controlled timestamped SQL migrations under `supabase/migrations/` and verify RLS policies before applying changes to any database.
- Keep `src/lib/env.ts` server-only guards intact when adding environment variables.
