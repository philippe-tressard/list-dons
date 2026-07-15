# Vue d'ensemble de l'architecture

## Principe

Application web **auto-hébergée**, **backend en Rust**, front **SvelteKit**, base **SQLite**. Co-hébergée sur le **RPi2** aux côtés de **5Hostachy** (application déjà présente), mais **totalement indépendante** (isolation stricte). **Accès local (LAN) uniquement**, sans nom de domaine.

```
Navigateur (LAN)
      │  HTTPS (TLS auto-signé, Caddy "tls internal", port 8443)
      ▼
┌─────────────────────────────────────────────┐
│  RPi2  —  projet Docker Compose "listdons"    │
│                                               │
│  [caddy dédié] ──► [front SvelteKit] ──► [app Rust (Axum)]
│                                                     │
│                                              [SQLite WAL]
│                                              [uploads/ justificatifs]
│                                              [backups/]
└─────────────────────────────────────────────┘
      (n'utilise jamais les ports 80/443 ni les ressources de 5Hostachy)
```

## Composants

| Composant | Rôle |
|---|---|
| **app (Rust / Axum)** | API, logique métier, **moteur de calcul fiscal**, accès base, gestion des justificatifs. |
| **front (SvelteKit)** | IHM responsive, applique le design system de List-dons. |
| **caddy (dédié)** | Reverse proxy + TLS interne + headers de sécurité. Ports non conflictuels. |
| **SQLite (WAL)** | Données (exercices, bénéficiaires, dons, barèmes, métadonnées justificatifs). |
| **uploads/** | Fichiers justificatifs (hors base). |
| **backups/** | Sauvegardes quotidiennes (base + uploads). |

## Décisions structurantes

- **Backend en Rust** (contrainte projet) ; front SvelteKit pour hériter du design system.
- **Mono-foyer** au départ (auth simple).
- **Isolation stricte** vis-à-vis de 5Hostachy (co-hébergé sur le RPi2) = exigence non négociable.
- **Résilience simple** : `restart: unless-stopped` + sauvegardes testées (pas de monitoring/failover).

> Isolation détaillée et contraintes de co-tenance : [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §8.1.
