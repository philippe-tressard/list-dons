# Déploiement sur le RPi2 — isolé de 5Hostachy

Déploie **List-dons** (prototype) dans un projet Docker **dédié et isolé**, à côté de 5Hostachy, **sans jamais interférer**.

> ⚠️ Déploie le **prototype Node** (banc d'essai). L'implémentation cible (Rust + SvelteKit) suivra.
> Accès **LAN en HTTP** sur un port dédié (défaut **8080**). Le HTTPS (Caddy `tls internal` / port 8443) viendra avec la cible Rust.

## Garanties d'isolation (exigence non négociable — specs §8.1)

| Ressource | 5Hostachy | List-dons |
|---|---|---|
| Projet Compose | `hostachy` | **`listdons`** |
| Conteneurs | `hostachy_*` | **`listdons_app`** |
| Réseau | `hostachy` | **`listdons_net`** |
| Volume | (les siens) | **`listdons_data`** |
| Ports hôte | 80 / 443 | **8080** (jamais 80/443) |
| Ressources | — | **plafonnées** (0,5 CPU / 256 Mo) |

Le script `deploy-rpi2.sh` **relève l'état de 5Hostachy avant et après** (conteneurs, ports 80/443, santé optionnelle) et **abandonne + rollback** au moindre impact. Il ne touche **aucune** ressource `hostachy_*`.

## Étapes (sur le RPi2)

```bash
# 1. Récupérer le code (dépôt public)
git clone https://github.com/philippe-tressard/list-dons.git
cd list-dons/deploy

# 2. Config (optionnel : changer le port, activer le check santé de 5Hostachy)
cp .env.example .env
#   LISTDONS_PORT=8080
#   HOSTACHY_HEALTH_URL=http://localhost/api/health   # si tu veux ce contrôle en plus

# 3. Déployer (avec garde-fou avant/après)
bash deploy-rpi2.sh
```

En cas de succès : `http://<ip-du-rpi2>:8080`. Au premier accès, crée ton compte (mono-foyer).

## Exploitation

```bash
docker compose -f docker-compose.rpi2.yml ps       # état
docker compose -f docker-compose.rpi2.yml logs -f   # logs
docker compose -f docker-compose.rpi2.yml down      # arrêter / désinstaller (5Hostachy intact)
```

Les données (base + uploads) sont dans le volume `listdons_data`, indépendant de 5Hostachy.

## Sauvegarde (isolée)

`backup-listdons.sh` sauvegarde le volume `listdons_data` (base + reçus) vers `~/list-dons/backups`, en `.tar.gz` horodaté, avec rotation (**7 dernières = 1 semaine**, les plus anciennes sont supprimées). Tourne en `ptressard`, ne touche que les ressources `listdons_*`.

Cron quotidien (04:15, hors des créneaux 5Hostachy) :
```bash
15 4 * * * /home/ptressard/list-dons/deploy/backup-listdons.sh >> /home/ptressard/list-dons/backups/backup.log 2>&1
```
Lancer à la demande : `bash ~/list-dons/deploy/backup-listdons.sh`

**Restaurer** une sauvegarde :
```bash
cd ~/list-dons/deploy
docker compose -f docker-compose.rpi2.yml stop
docker run --rm -v listdons_data:/data -v ~/list-dons/backups:/backup listdons-app:latest \
  sh -c "cd /data && rm -rf ./* ./.[!.]* 2>/dev/null; tar xzf /backup/<FICHIER>.tar.gz"
docker compose -f docker-compose.rpi2.yml start
```

## Ce que le script NE fait jamais
- prendre les ports 80/443 ;
- créer/modifier/supprimer/redémarrer un conteneur, réseau ou volume `hostachy_*` ;
- modifier les règles firewall/UFW existantes ;
- rester en place s'il détecte une régression sur 5Hostachy (rollback automatique).
