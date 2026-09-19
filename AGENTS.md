# neuronara
Clinical neurophysiology reference search with LLM answers. Live: https://neuronara.technoir.cloud

## Commands
- Check (before every commit and deploy): `npm test && npm run build`
- Dev: `npm run dev`
- Deploy: `./scripts/deploy.sh` (see `DEPLOYMENT.md`); keys via `./scripts/set-llm-key.sh`

## Non-negotiables
1. Every external link is verified (`npm run verify:links`) before deploy: a wrong clinical link is a shipping bug.
2. Answers must work with no LLM key (keyless fallback).
3. `/api/ask` stays rate-limited per IP (`lib/rate-limit.ts`).
4. Leave the Next.js block below as is: `next dev` rewrites it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
