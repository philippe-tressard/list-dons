# Stack technique

Backend **Node.js / Express**, frontend **JS vanilla** (sans framework, sans build), persistance en **fichier JSON**.

| Composant | Technologie |
|---|---|
| Backend | **Node.js + Express** |
| Persistance | **Fichier JSON** (`lib/store.js`) — écriture atomique (temp + `fsync` + `rename`) + filet `.bak` |
| Validation | Validation métier côté serveur (montant, date, catégorie, bénéficiaire…) |
| Auth | **JWT cookie HttpOnly/SameSite=strict**, hachage **bcrypt** |
| Tests | Auto-test du moteur fiscal (`node lib/fiscal.selftest.js`, cible prioritaire) |
| Frontend | **JS vanilla + CSS** (zéro build, zéro dépendance front) |
| PDF | **pdfkit** (rapport) + **pdf-lib** (fusion des reçus : images + pages PDF importées) |
| Reverse proxy | **Caddy dédié** — HTTPS LAN (`tls internal`) prévu à l'étape suivante |
| Déploiement | **Docker Compose** (RPi2, projet `listdons`) |

## Choix notables

- **Node.js/Express** : stack déjà maîtrisée, disponible immédiatement (indépendante de l'installation de Rust/Docker sur la machine de développement), suffisante pour un usage mono-foyer.
- **Fichier JSON** : simple à sauvegarder (un fichier + dossier `uploads/`), suffisant tant que l'usage reste mono-foyer ; écriture atomique + filet `.bak` pour la robustesse (protège des coupures de courant).
- **JS vanilla** : zéro build, zéro dépendance front, cohérent avec le principe de sobriété du projet.
- **Caddy `tls internal`** : HTTPS sur le LAN sans domaine ni Let's Encrypt (étape de durcissement à venir).

## CI / qualité

Pas de pipeline CI imposé à ce stade (usage mono-foyer, déploiement manuel maîtrisé via `deploy-rpi2.sh` avec garde-fou d'isolation). À mettre en place si le besoin apparaît : lint/format JS, auto-test du moteur fiscal, `npm audit`.

> Détails : [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §8 et §11.
