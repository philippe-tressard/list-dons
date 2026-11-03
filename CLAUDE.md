# CLAUDE.md — List-dons

Règles à appliquer dans toutes les sessions sur ce projet.

## ⚠️ Socle commun d'abord

Les bonnes pratiques valables pour **tous** les projets vivent dans
**`~/.claude/standards/`** — index : `standards/INDEX.md`. Elles s'appliquent
intégralement ici : méthode de travail, factorisation, sécurité, fiabilité des
contrôles, tests, données et intégrité, observabilité, git et versioning, livraison,
encodage, interface, documentation, outillage.

C'est là que vivent désormais les pratiques longtemps désignées comme « héritées de
5Hostachy » : elles ne sont plus le référentiel d'un autre projet, elles sont
**communes**. Ce fichier ne contient que l'instanciation List-dons.

## Stack et état

- **Node/Express + JS vanilla + stockage fichier JSON** — implémentation retenue
  définitivement (décision du 19/07/2026). La cible Rust/SvelteKit/SQLite est
  **abandonnée** : les entrées de journal 0.2 → 3.5 qui l'actaient sont un **registre
  historique**, pas l'état courant.
- Authentification **mono-foyer** (un seul compte, pas d'inscription publique),
  **bcrypt**, JWT en cookie HttpOnly, limitation de débit.
- Source de vérité des specs : **`SPECIFICATIONS.md`** (index) + `specs/`.
- Dépôt : `philippe-tressard/list-dons`, branche **`main`**, licence MIT.

## Ce qui est propre à ce projet

### Isolation sur rpi2 — non négociable

L'application est **co-hébergée avec 5Hostachy sur le rpi2** (`192.168.1.x`), qui
reste **prioritaire**. Règle générale : `standards/03-securite.md` §7. Instanciation :
projet Compose `listdons`, conteneur `listdons_app`, réseau `listdons_net`, volume
`listdons_data`, port **8080** (jamais 80/443), dossier `~/list-dons` (pas `/opt`, pas
de `sudo`), ressources plafonnées, cron propre. **Aucun couplage** avec `bascule.sh`
ou `health-watch.sh` : l'application doit rester debout quel que soit l'état
actif/standby de 5Hostachy.

`deploy/deploy-rpi2.sh` contrôle l'état de 5Hostachy **avant et après**, avec
rollback automatique. Ne pas le contourner.

⚠️ Un `docker system prune` sur ce nœud est **interdit** : il détruirait les volumes
et réseaux du voisin.

### Moteur fiscal

- **Fonction pure** sur données, modulaire **par année et par date d'effet**, avec
  héritage N ← N-1 si aucune règle spécifique. Même principe que l'isolation des
  décisions critiques : `standards/04-fiabilite-des-controles.md` §11.
- **Montants en centimes** (entiers), jamais en flottant —
  `standards/06-donnees-et-integrite.md` §7.
- **Aucun chiffre fiscal non sourcé** : barèmes vérifiés via Légifrance, avec la
  référence écrite à côté de la valeur (`standards/12-documentation.md` §4).
- **Principe de prudence** : en cas de doute, l'estimation **sous-estime**. Mention
  « estimation indicative » visible.
- Fixture de test figée (exemple 2025, réduction ≈ 105,60 €) : elle doit rester verte.

### Résilience — simple et assumée

Mono-nœud : `restart: unless-stopped` + sauvegarde quotidienne (base + reçus) +
**restauration testée**. Pas de failover, pas de monitoring. Les contrôles de
redondance de `standards/09-livraison-et-mep.md` ne s'appliquent donc pas ; la
sauvegarde testée et le post-check **P7** (le correctif est-il observable ?), si.

### Anti-complexité

`specs/architecture/principes-code.md` : modularité par domaine
(auth / exercices / bénéficiaires / dons / justificatifs / fiscal / shared), zéro
duplication, règle des 3, refactoring continu. C'est
`standards/02-factorisation.md` appliqué au découpage de ce projet.

### Documentation publique

Le dépôt est destiné à être public (privé à ce jour, ticket #10) : **aucune donnée personnelle**, exemples fictifs, adresses LAN
masquées — `standards/12-documentation.md` §7. Les specs peuvent dire qu'elles
s'inspirent de 5Hostachy, mais restent **instanciées à List-dons** : pas de copie, pas
de tableau comparatif.
