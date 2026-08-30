#!/usr/bin/env bash
set -euo pipefail

# Sauvegarde de CDK-Team — à lancer sur le VPS.
#
# Deux choses ne sont répliquées nulle part et disparaîtraient avec le serveur :
#   1. les demandes de devis, dans Mongo (des prospects, donc du chiffre
#      d'affaires potentiel) ;
#   2. les photos et vidéos de chantier, dans un bind-mount sans réplication.
#
# Le socle dont ce projet est issu n'avait pas de sauvegarde : il ne stockait
# que des photos réuploadables. Ce n'est plus le cas ici, d'où ce script.
#
# Usage :
#   ./sauvegarde.sh                  # sauvegarde dans /var/backups/cdk-team
#   ./sauvegarde.sh /autre/dossier   # ailleurs
#
# Planification conseillée (crontab -e), tous les jours à 3 h 15 :
#   15 3 * * * /chemin/vers/cdk-team/deployment/sauvegarde.sh >> /var/log/cdk-team-sauvegarde.log 2>&1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DESTINATION="${1:-/var/backups/cdk-team}"
JOUR="$(date +%Y-%m-%d)"
# Nombre de sauvegardes quotidiennes conservées.
RETENTION_JOURS=14

cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  echo "Erreur : deployment/.env introuvable." >&2
  exit 1
fi

# `set -a` exporte tout ce que le fichier définit : c'est MONGO_ROOT_USER et
# MONGO_ROOT_PASSWORD qu'on vient y chercher.
set -a
# shellcheck disable=SC1091
source .env
set +a

mkdir -p "$DESTINATION"

echo "== Sauvegarde Mongo =="
# mongodump est exécuté DANS le conteneur mongo : l'hôte n'a pas besoin des
# outils MongoDB, et la base n'est pas exposée hors du réseau compose.
docker compose exec -T mongo sh -c \
  "mongodump --archive --gzip --username '$MONGO_ROOT_USER' --password '$MONGO_ROOT_PASSWORD' --authenticationDatabase admin --db cdk-team" \
  > "$DESTINATION/mongo-$JOUR.archive.gz"

echo "== Sauvegarde des médias =="
# `--delete` volontairement absent : un média supprimé par erreur en admin doit
# rester récupérable dans la sauvegarde de la veille.
tar -czf "$DESTINATION/uploads-$JOUR.tar.gz" -C "$REPO_ROOT/server" uploads

echo "== Purge des sauvegardes de plus de $RETENTION_JOURS jours =="
find "$DESTINATION" -maxdepth 1 -name 'mongo-*.archive.gz' -mtime "+$RETENTION_JOURS" -delete
find "$DESTINATION" -maxdepth 1 -name 'uploads-*.tar.gz' -mtime "+$RETENTION_JOURS" -delete

echo "== Terminé =="
ls -lh "$DESTINATION" | tail -6

# Restauration, pour mémoire :
#   docker compose exec -T mongo mongorestore --archive --gzip --drop \
#     --username "$MONGO_ROOT_USER" --password "$MONGO_ROOT_PASSWORD" \
#     --authenticationDatabase admin < mongo-AAAA-MM-JJ.archive.gz
#   tar -xzf uploads-AAAA-MM-JJ.tar.gz -C /chemin/vers/cdk-team/server
