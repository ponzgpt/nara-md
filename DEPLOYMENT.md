# Deployment

## Target

- URL: `https://naramd.technoir.cloud`
- Runtime: Next.js standalone server (`node server.js`) in `node:24-alpine`, container port `3000`
- Edge: Hostinger VPS (`hoid`) → Traefik (Dokploy) → Swarm service `nara-md` on `dokploy-network`
- DNS: `*.technoir.cloud` is a wildcard record pointing at the VPS, so no DNS change is needed

## Local verification

```bash
npm ci
npm test
npm run build && node .next/standalone/server.js   # http://localhost:3000/healthz
```

## Deploy / update

Images are built on the VPS and tagged with the git SHA, the same way as `nousresearch-application` and `javier-ponz-site`:

```bash
./scripts/deploy.sh              # deploys HEAD of main
```

The script:

1. Copies the committed tree to `/opt/nara-md/<sha>`.
2. Runs `docker build -t nara-md:<sha>` on the server.
3. Creates the Swarm service the first time, and after that runs `docker service update --image`.
4. Writes the Traefik route to `/etc/dokploy/traefik/dynamic/nara-md.yml` (HTTP→HTTPS redirect, Let's Encrypt).

## Secrets

The LLM key is optional; without one, Nara returns ranked sources only. Set it on the server, never in the repo. For the MVP, use a free OpenRouter key (https://openrouter.ai/keys):

```bash
ssh hoid 'docker service update --env-add OPENROUTER_API_KEY=sk-or-... nara-md'
# later, for Claude Opus 5 (takes precedence):
ssh hoid 'docker service update --env-add ANTHROPIC_API_KEY=sk-ant-... nara-md'
```

Env vars survive `scripts/deploy.sh`, because it only swaps the image.

`/api/ask` is rate-limited per IP (20 requests per 10 minutes, see `lib/rate-limit.ts`), so a public URL can't drain the key.

## Rollback

```bash
ssh hoid 'docker service rollback nara-md'
# or pin a previous build:
ssh hoid 'docker service update --image nara-md:<older-sha> nara-md'
```

## Public checks

```bash
curl -fsS https://naramd.technoir.cloud/healthz
curl -fsS https://naramd.technoir.cloud/api/ask -H 'content-type: application/json' -d '{"q":"MSLT"}' | head -c 300
```
