#!/usr/bin/env bash
# Set an LLM API key on the production service without the key touching disk, shell history or chat.
# Usage: ./scripts/set-llm-key.sh openrouter|anthropic
set -euo pipefail
HOST=${HOST:-hoid}
case "${1:-}" in
  openrouter) VAR=OPENROUTER_API_KEY ;;
  anthropic)  VAR=ANTHROPIC_API_KEY ;;
  *) echo "usage: $0 openrouter|anthropic" >&2; exit 1 ;;
esac
read -rs -p "$VAR: " KEY; echo
[ -n "$KEY" ] || { echo "empty key" >&2; exit 1; }
# The key travels over ssh stdin, not argv, so it never shows up in `ps` on either machine.
printf '%s' "$KEY" | ssh "$HOST" "read -r K; docker service update --quiet --env-add $VAR=\"\$K\" neuronara"
echo "✓ $VAR set on neuronara (the service restarts)"
