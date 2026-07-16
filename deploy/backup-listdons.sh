#!/usr/bin/env bash
# =============================================================================
#  backup-listdons.sh — Sauvegarde quotidienne ISOLÉE du volume listdons_data.
#
#  Dump (base JSON + uploads + secret) du volume Docker `listdons_data` vers
#  ~/list-dons/backups, en .tar.gz horodaté, avec rotation.
#
#  Isolation (comme le reste de List-dons) : tourne en `ptressard`, ne touche
#  QUE le volume listdons_data (monté en lecture seule) et le dossier backups.
#  N'interagit avec AUCUNE ressource hostachy_*.
#
#  Cron suggéré (crontab ptressard) :
#     15 4 * * * /home/ptressard/list-dons/deploy/backup-listdons.sh \
#                  >> /home/ptressard/list-dons/backups/backup.log 2>&1
# =============================================================================
set -euo pipefail

VOLUME="listdons_data"
BACKUP_DIR="${HOME}/list-dons/backups"
KEEP=14                                   # nombre de sauvegardes conservées
IMAGE="listdons-app:latest"               # image déjà présente (base alpine) — pas de pull

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
FILE="listdons-${TS}.tar.gz"
OWNER="$(id -u):$(id -g)"

# Dump via conteneur éphémère : lit le volume (root interne), écrit dans le
# dossier backups monté, puis rend le fichier à l'utilisateur hôte.
docker run --rm \
  -v "${VOLUME}":/data:ro \
  -v "${BACKUP_DIR}":/backup \
  "${IMAGE}" sh -c "tar czf /backup/${FILE} -C /data . && chown ${OWNER} /backup/${FILE}"

# Rotation : ne garder que les KEEP plus récentes.
ls -1t "${BACKUP_DIR}"/listdons-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

N=$(ls -1 "${BACKUP_DIR}"/listdons-*.tar.gz 2>/dev/null | wc -l)
SZ=$(du -h "${BACKUP_DIR}/${FILE}" 2>/dev/null | cut -f1)
echo "[$(date '+%F %T')] backup OK : ${FILE} (${SZ}) — ${N} sauvegarde(s) conservée(s)"
