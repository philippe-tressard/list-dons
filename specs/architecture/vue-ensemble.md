# Vue d'ensemble de l'architecture

## Principe

Application web **auto-hébergée**, **backend Node.js/Express**, front **JS vanilla**, persistance en **fichier JSON**. Co-hébergée sur le **RPi2** aux côtés de **5Hostachy** (application déjà présente), mais **totalement indépendante** (isolation stricte). **Accès local (LAN) uniquement**, sans nom de domaine.

```
Navigateur (LAN)
      │  HTTP (HTTPS via Caddy "tls internal" prévu à l'étape suivante)
      ▼
┌─────────────────────────────────────────────┐
│  RPi2  —  projet Docker Compose "listdons"    │
│                                               │
│  [app Node.js/Express — IHM JS vanilla servie en statique]
│                                                     │
│                                              [fichier JSON + uploads/]
│                                              [backups/]
└─────────────────────────────────────────────┘
      (n'utilise jamais les ports 80/443 ni les ressources de 5Hostachy)
```

## Composants

| Composant | Rôle |
|---|---|
| **app (Node.js / Express)** | API, logique métier, **moteur de calcul fiscal**, accès aux données, gestion des justificatifs, IHM servie en statique. |
| **front (JS vanilla)** | IHM responsive, applique le design system de List-dons — servie par l'app elle-même. |
| **caddy (dédié, prévu)** | Reverse proxy + TLS interne + headers de sécurité. Ports non conflictuels. |
| **Fichier JSON** | Données (exercices, bénéficiaires, dons, barèmes, métadonnées justificatifs) — écriture atomique + filet `.bak`. |
| **uploads/** | Fichiers justificatifs (hors base). |
| **backups/** | Sauvegardes quotidiennes (base + uploads). |

## Décisions structurantes

- **Node.js/Express + JS vanilla** (implémentation retenue, cf. [`SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §8) : pas de réécriture vers une autre stack.
- **Mono-foyer** au départ (auth simple).
- **Isolation stricte** vis-à-vis de 5Hostachy (co-hébergé sur le RPi2) = exigence non négociable.
- **Résilience simple** : `restart: unless-stopped` + sauvegardes testées (pas de monitoring/failover).

> Isolation détaillée et contraintes de co-tenance : [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §8.1.
