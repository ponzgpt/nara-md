#!/usr/bin/env bash
# Build and roll out HEAD on the Hostinger VPS. See DEPLOYMENT.md.
set -euo pipefail

HOST=${HOST:-hoid}
APP=neuronara
DOMAIN=${DOMAIN:-neuronara.technoir.cloud}
SHA=$(git rev-parse --short HEAD)

[ -z "$(git status --porcelain)" ] || { echo "Commit or stash changes first: deploys are tied to a SHA." >&2; exit 1; }

echo "→ shipping $APP:$SHA to $HOST"
git archive --format=tar HEAD | ssh "$HOST" "mkdir -p /opt/$APP/$SHA && tar -x -C /opt/$APP/$SHA"
ssh "$HOST" "docker build -q -t $APP:$SHA /opt/$APP/$SHA"

ssh "$HOST" bash -s <<REMOTE
set -euo pipefail
if docker service inspect $APP >/dev/null 2>&1; then
  docker service update --quiet --image $APP:$SHA $APP
else
  docker service create --quiet --name $APP --network dokploy-network --replicas 1 \
    --health-cmd "wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1" $APP:$SHA
fi
cat > /etc/dokploy/traefik/dynamic/$APP.yml <<YML
http:
  routers:
    $APP-http:
      rule: Host(\\\`$DOMAIN\\\`)
      service: $APP-svc
      middlewares: [redirect-to-https]
      entryPoints: [web]
    $APP-https:
      rule: Host(\\\`$DOMAIN\\\`)
      service: $APP-svc
      entryPoints: [websecure]
      tls: { certResolver: letsencrypt }
  services:
    $APP-svc:
      loadBalancer:
        servers: [{ url: "http://$APP:3000" }]
        passHostHeader: true
YML
# keep the last 3 source trees
ls -1dt /opt/$APP/*/ | tail -n +4 | xargs -r rm -rf
REMOTE

echo "✓ https://$DOMAIN"
