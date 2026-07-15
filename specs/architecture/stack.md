# Stack technique

Backend **Rust**, frontend **SvelteKit**, base **SQLite**.

| Composant | Technologie |
|---|---|
| Backend | **Axum (Rust)** |
| ORM / accès base | **sqlx** (ou SeaORM) |
| Migrations | **sqlx migrate** |
| Validation | **serde** + validation métier |
| Auth | **JWT cookie HttpOnly/Secure/SameSite=strict**, hachage **Argon2** |
| Lint / format | **clippy** + **rustfmt** |
| Tests | **cargo test** (moteur fiscal en cible prioritaire) |
| Audit dépendances | **cargo audit** |
| Frontend | **SvelteKit + TS + Vite** |
| Base | **SQLite (WAL)** |
| Reverse proxy | **Caddy dédié** (port 8443, `tls internal`) |
| Déploiement | **Docker Compose** (RPi2, projet `listdons`) |
| Inventaire licences | **cargo-about** / license-checker |

## Choix notables

- **Rust** : sûreté mémoire, faible empreinte (adapté à un RPi partagé), moteur fiscal testable.
- **SQLite** : simple à sauvegarder (un fichier), suffisant pour un usage mono-foyer.
- **SvelteKit** : IHM responsive moderne, rendu SSR, design system maison.
- **Caddy `tls internal`** : HTTPS sur le LAN sans domaine ni Let's Encrypt.

## CI (GitHub Actions)

`cargo fmt --check` · `cargo clippy -D warnings` · `cargo test` · `cargo audit` · build front (`npm run build`).

> Détails : [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §8 et §11.
