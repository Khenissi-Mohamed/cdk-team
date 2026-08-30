#!/usr/bin/env bash
set -euo pipefail

# Déploiement manuel de CDK-Team — à lancer sur le VPS, jamais
# automatiquement (pas de CI/CD pour ce projet, déclenchement volontaire).
#
# Usage (depuis n'importe où) :
#   ./deploy.sh server   # rebuild + redémarre uniquement le serveur (API)
#   ./deploy.sh client   # rebuild le client et republie dist/ pour Nginx
#   ./deploy.sh all      # les deux
#   ./deploy.sh seed     # crée le compte admin — une seule fois après le tout premier déploiement
#   ./deploy.sh chemins  # affiche les chemins à reporter dans le vhost Nginx
#
# Prérequis :
#   - deployment/.env rempli à partir de .env.production.example (jamais commité)
#   - WEB_ROOT (voir plus bas) déjà créé avec les bons droits pour l'utilisateur
#     qui lance ce script (une fois, à la main : mkdir -p WEB_ROOT && chown ...)
#   - le rebuild server/client suppose que `git pull` a déjà été fait avant

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
WEB_ROOT="/var/www/cdk-team/dist"

cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  echo "Erreur : deployment/.env introuvable. Copiez .env.production.example vers .env et remplissez les vraies valeurs." >&2
  exit 1
fi

deploy_server() {
  echo "== Build + redeploy server =="
  docker compose build server
  docker compose up -d server
  echo "== server à jour =="
}

deploy_client() {
  # Même script que `npm run docker:build` dans client/ — une seule
  # définition du build, pas de logique dupliquée entre les deux.
  bash "$REPO_ROOT/client/docker-build.sh"

  echo "== Extraction du dist/ vers $WEB_ROOT =="
  if [ ! -d "$WEB_ROOT" ]; then
    echo "Erreur : $WEB_ROOT n'existe pas. À créer une fois manuellement (mkdir -p + droits pour cet utilisateur) avant le premier déploiement client." >&2
    exit 1
  fi

  # Le conteneur est créé AVANT la purge : si le build n'a rien produit
  # d'exploitable, on échoue ici avec l'ancien site toujours en place.
  cid=$(docker create cdk-team-client)

  # `docker cp` ajoute sans jamais supprimer : sans ce nettoyage, les assets
  # des builds précédents s'accumulent indéfiniment (57 fichiers, dont six
  # versions de la home, quand cette ligne a été ajoutée). Les noms étant
  # hashés, aucun ancien fichier n'est plus référencé par index.html.
  #
  # `${WEB_ROOT:?}` est un garde-fou : si la variable était un jour vidée, la
  # commande deviendrait `rm -rf /*`. Le `:?` interrompt le script à la place.
  echo "== Purge de $WEB_ROOT =="
  rm -rf "${WEB_ROOT:?}"/*

  docker cp "$cid:/app/dist/." "$WEB_ROOT"
  docker rm "$cid" >/dev/null

  echo "== Client publié =="
  echo "   (pas besoin de reload Nginx pour du contenu statique, sauf si la config nginx elle-même a changé)"
}

afficher_chemins() {
  # Le vhost Nginx sert /uploads/ directement depuis le disque (directive
  # `alias`), donc il doit connaître l'emplacement réel du dépôt. Plutôt que de
  # le deviner, on l'affiche ici pour le recopier tel quel.
  echo "Racine web (root)      : $WEB_ROOT"
  echo "Médias (alias uploads) : $REPO_ROOT/server/uploads/"
  echo
  echo "À reporter dans /etc/nginx/sites-available/cdk-team :"
  echo "    root $WEB_ROOT;"
  echo "    location /uploads/ { alias $REPO_ROOT/server/uploads/; ... }"
}

seed_admin() {
  echo "== Création du compte admin (à ne lancer qu'une seule fois) =="
  docker compose run --rm server npm run seed
}

case "${1:-}" in
  server) deploy_server ;;
  client) deploy_client ;;
  all)
    deploy_server
    deploy_client
    ;;
  seed) seed_admin ;;
  chemins) afficher_chemins ;;
  *)
    echo "Usage: $0 {server|client|all|seed|chemins}" >&2
    exit 1
    ;;
esac
