<h1 align="center">List-dons</h1>

<p align="center">
  <em>Centralisez vos dons et estimez votre réduction d'impôt sur le revenu, année par année.</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/status-spécification-orange.svg" alt="Statut : spécification" />
  <img src="https://img.shields.io/badge/rust-backend-000000.svg" alt="Rust" />
  <img src="https://img.shields.io/badge/SvelteKit-front-ff3e00.svg" alt="SvelteKit" />
</p>

---

> **Statut : cadrage / spécification.** L'application n'est pas encore développée — ce dépôt contient pour l'instant les **spécifications**.

## Objectif

Pour chaque **année d'imposition**, List-dons permet de :

- **saisir les dons** ouvrant droit à réduction d'impôt (art. 200 du CGI) — ponctuels ou récurrents ;
- connaître le **montant total par bénéficiaire** ;
- estimer la **réduction d'impôt probable** ;
- **conserver et retrouver les justificatifs** (reçus fiscaux).

Application **mono-foyer**, **auto-hébergée**, **accès local (LAN)**, respectueuse de la vie privée (**RGPD**).

## Stack

| Composant | Technologie |
|---|---|
| Backend | Rust (Axum) · SQLite · sqlx |
| Frontend | SvelteKit · TypeScript |
| Déploiement | Docker Compose · Caddy |

## Spécifications

- Index : [`SPECIFICATIONS.md`](SPECIFICATIONS.md) (source de vérité)
- Détail par domaine : [`specs/`](specs/) — contexte, architecture, design, exigences

## Avertissement

Outil d'**estimation** indicatif : il ne remplace ni votre déclaration officielle ni un conseil fiscal.

## Licence

[MIT](LICENSE) — © 2026 Philippe Tressard
