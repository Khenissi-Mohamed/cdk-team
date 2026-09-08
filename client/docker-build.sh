#!/usr/bin/env bash
set -euo pipefail

# Build l'image Docker du client en lisant VITE_API_URL depuis
# deployment/.env — source de vérité unique, partagée avec deploy.sh,
# pour ne jamais avoir le domaine configuré à deux endroits différents.

cd "$(dirname "${BASH_SOURCE[0]}")"
ENV_FILE="../deployment/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Erreur : $ENV_FILE introuvable. Copiez deployment/.env.production.example vers deployment/.env et renseignez VITE_API_URL." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [ -z "${VITE_API_URL:-}" ]; then
  echo "Erreur : VITE_API_URL doit être défini dans $ENV_FILE (ex: https://votredomaine/api)" >&2
  exit 1
fi

echo "== Build client (VITE_API_URL=$VITE_API_URL) =="
docker build --build-arg VITE_API_URL="$VITE_API_URL" --build-arg PRERENDER_BUILD_ID="$(date +%s)" -t cdk-team-client .
