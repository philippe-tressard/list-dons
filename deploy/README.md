# Déploiement sur le RPi2 — isolé de 5Hostachy

Déploie **List-dons** (MVP Node.js/Express — implémentation retenue) dans un projet Docker **dédié et isolé**, à côté de 5Hostachy, **sans jamais interférer**.

> Accès **LAN en HTTP** sur un port dédié (défaut **8080**). Le **HTTPS** (Caddy `tls internal`, sans changement de stack applicative) est prévu comme prochaine étape de durcissement.

## Garanties d'isolation (exigence non négociable — specs §8.1)

| Ressource | 5Hostachy | List-dons |
|---|---|---|
| Projet Compose | `5hostachy` | **`listdons`** |
| Conteneurs | `hostachy_*` | **`listdons_app`** |
| Réseau | `hostachy` | **`listdons_net`** |
| Volume | (les siens) | **`listdons_data`** |
| Ports hôte | 80 / 443 | **8080** (jamais 80/443) |
| Ressources | — | **plafonnées** (0,5 CPU / 256 Mo) |

Le script `deploy-rpi2.sh` **relève l'état de 5Hostachy avant et après** (conteneurs, ports 80/443, santé optionnelle) et **abandonne + rollback** au moindre impact. Il ne touche **aucune** ressource `hostachy_*`.

### Le seul point commun : le daemon Docker (contrat réciproque, 31/07/2026)

Les deux applications partagent le **daemon Docker** du RPi2. L'isolation vaut donc **dans les deux sens**, et pas seulement de List-dons vers 5Hostachy :

| Ressource partagée | Règle | Effet sur List-dons |
|---|---|---|
| Images sans tag | la maintenance hebdomadaire de 5Hostachy filtre sur `label=com.docker.compose.project=5hostachy` | **aucun** — `listdons-app:latest` et ses couches ne sont jamais candidates |
| Volumes, réseaux, conteneurs | `docker system prune` **interdit** des deux côtés (vérifié en CI côté 5Hostachy) | **aucun** — `listdons_data` et `listdons_net` intouchables |
| Cache de build BuildKit | **commun, non cloisonnable** : `docker builder prune` n'a pas de filtre par projet. 5Hostachy le purge chaque dimanche **par âge** (couches inutilisées depuis > 7 j), avec un plafond de 10 Go en garde-fou | **bénin** : au pire un rebuild de List-dons reprend depuis zéro (~1 min), jamais une perte d'image ni de données |

Réciproquement, **ne jamais lancer depuis List-dons** : `docker system prune`, `docker image prune` sans filtre de projet, ni `docker volume prune`. Pour nettoyer ses propres couches :

```bash
docker image prune -f --filter label=com.docker.compose.project=listdons
```

## Étapes (sur le RPi2)

```bash
# 1. Copier le code depuis le poste : deploy/ et prototype/ dans ~/list-dons
#    (le nœud n'a pas de clone git ; la copie ne transporte ni .git ni node_modules)
#    depuis le poste :
#      rsync -a --exclude node_modules --exclude data deploy prototype <utilisateur>@<ip-du-rpi2>:list-dons/
cd ~/list-dons/deploy

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

Après un déploiement, la version **servie** prouve ce qui tourne (elle doit être celle de `prototype/package.json`) ; elle est aussi en pied de page de l'application :

```bash
curl -s http://localhost:8080/api/session   # … "version":"x.y.z"
```

Les données (base + uploads) sont dans le volume `listdons_data`, indépendant de 5Hostachy.

## Sauvegarde (isolée)

`backup-listdons.sh` sauvegarde le volume `listdons_data` (base + reçus) vers `~/list-dons/backups`, en `.tar.gz` horodaté, avec rotation (**7 dernières = 1 semaine**, les plus anciennes sont supprimées). Tourne sous le compte de déploiement (sans `sudo`), ne touche que les ressources `listdons_*`.

Cron quotidien (04:15, hors des créneaux 5Hostachy) :
```bash
15 4 * * * $HOME/list-dons/deploy/backup-listdons.sh >> $HOME/list-dons/backups/backup.log 2>&1
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
