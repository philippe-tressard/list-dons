#!/usr/bin/env bash
# =============================================================================
#  deploy-rpi2.sh — Déploie List-dons sur le RPi2 SANS interférer avec 5Hostachy.
#
#  Garde-fous (exigence non négociable, cf. specs §8.1) :
#   - projet Compose dédié "listdons" (conteneurs/réseau/volumes préfixés)
#   - n'expose JAMAIS 80/443 ; ne touche AUCUNE ressource hostachy_*
#   - contrôle AVANT/APRÈS : si l'état de 5Hostachy régresse -> rollback + abort
#
#  Usage (sur le RPi2, dans ce dossier) :
#     cp .env.example .env   # ajuster si besoin
#     bash deploy-rpi2.sh
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker-compose.rpi2.yml"
[ -f .env ] && set -a && . ./.env && set +a
LISTDONS_PORT="${LISTDONS_PORT:-8080}"
HOSTACHY_HEALTH_URL="${HOSTACHY_HEALTH_URL:-}"

red()  { printf '\033[31m%s\033[0m\n' "$*"; }
grn()  { printf '\033[32m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }

# --- 0. Garde-fou statique : ne jamais réclamer 80/443 -----------------------
if [ "$LISTDONS_PORT" = "80" ] || [ "$LISTDONS_PORT" = "443" ]; then
  red "ABORT : LISTDONS_PORT=$LISTDONS_PORT interdit (réservé à 5Hostachy)."; exit 1
fi
if grep -Eq '"(80|443):' "$COMPOSE"; then
  red "ABORT : le compose mappe 80/443 sur l'hôte — interdit."; exit 1
fi

# --- Snapshots de l'état de 5Hostachy ---------------------------------------
snap_hostachy() { docker ps --filter "name=hostachy" --format '{{.Names}}={{.State}}' | sort; }
port_busy()     { ss -Hltn "sport = :$1" 2>/dev/null | grep -q . && echo "up" || echo "down"; }
hostachy_health() {
  [ -z "$HOSTACHY_HEALTH_URL" ] && { echo "skip"; return; }
  curl -fsk --max-time 5 "$HOSTACHY_HEALTH_URL" >/dev/null 2>&1 && echo "ok" || echo "ko"
}

echo "== Contrôle AVANT (5Hostachy) =="
BEFORE_CONT="$(snap_hostachy)"; BEFORE_80="$(port_busy 80)"; BEFORE_443="$(port_busy 443)"; BEFORE_H="$(hostachy_health)"
info "conteneurs hostachy_* :"; echo "${BEFORE_CONT:-  (aucun)}" | sed 's/^/    /'
info "port 80=$BEFORE_80  port 443=$BEFORE_443  health=$BEFORE_H"

# --- Déploiement (projet isolé) ---------------------------------------------
echo "== Déploiement de List-dons (projet 'listdons', port $LISTDONS_PORT) =="
docker compose -f "$COMPOSE" up -d --build

# --- Contrôle APRÈS ----------------------------------------------------------
sleep 3
echo "== Contrôle APRÈS (5Hostachy inchangé ?) =="
AFTER_CONT="$(snap_hostachy)"; AFTER_80="$(port_busy 80)"; AFTER_443="$(port_busy 443)"; AFTER_H="$(hostachy_health)"
info "port 80=$AFTER_80  port 443=$AFTER_443  health=$AFTER_H"

REG=""
[ "$AFTER_CONT" != "$BEFORE_CONT" ] && REG="$REG conteneurs-hostachy"
[ "$BEFORE_80"  = "up" ] && [ "$AFTER_80"  != "up" ] && REG="$REG port80"
[ "$BEFORE_443" = "up" ] && [ "$AFTER_443" != "up" ] && REG="$REG port443"
[ "$BEFORE_H"   = "ok" ] && [ "$AFTER_H"   != "ok" ] && REG="$REG health"

if [ -n "$REG" ]; then
  red "!! RÉGRESSION détectée sur 5Hostachy :$REG"
  red "!! Rollback de List-dons (docker compose down)…"
  docker compose -f "$COMPOSE" down || true
  red "Rollback effectué. 5Hostachy prioritaire — rien n'est laissé en place."
  exit 1
fi

grn "OK : List-dons déployé, 5Hostachy intact."
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "Accès LAN : http://${IP:-<ip-du-rpi2>}:$LISTDONS_PORT"
echo "État List-dons :"; docker compose -f "$COMPOSE" ps
