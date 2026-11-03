<h1 align="center">List-dons</h1>

<p align="center">
  <em>Centralisez vos dons et estimez votre réduction d'impôt sur le revenu, année par année.</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/statut-MVP%20déployé-brightgreen.svg" alt="Statut : MVP déployé" />
  <img src="https://img.shields.io/badge/stack-Node%2FExpress-339933.svg" alt="Stack Node/Express" />
</p>

---

> **Statut : MVP fonctionnel déployé et utilisé.** Le MVP Node/Express ([`prototype/`](prototype/)) implémente l'essentiel des spécifications et tourne en usage réel, auto-hébergé sur un réseau local.

## Objectif

Pour chaque **année d'imposition**, List-dons permet de :

- **saisir les dons** ouvrant droit à réduction d'impôt (art. 200 du CGI) — ponctuels ou récurrents ;
- gérer un **référentiel de bénéficiaires** réutilisable (coordonnées, catégorie fiscale, suivi) ;
- estimer la **réduction d'impôt probable**, avec le détail par régime et le plafond du revenu imposable ;
- comparer les dons d'une année à l'autre (**rappel N-1**, historique pluriannuel) ;
- **conserver et retrouver les justificatifs** (reçus fiscaux) ;
- générer un **récapitulatif PDF** (avec les **reçus annexés** : images intégrées et pages PDF importées) pour aider à la déclaration ;
- présenter l'application sans exposer de données réelles (**mode confidentialité**).

Application **mono-foyer**, **auto-hébergée**, **accès local (LAN)**, **interface responsive** (mobile/desktop), respectueuse de la vie privée (**RGPD**).

## État actuel

- **MVP fonctionnel** ([`prototype/`](prototype/), Node/Express + JS vanilla) : couvre l'authentification (dont le mot de passe oublié en réinitialisation locale), les exercices, les bénéficiaires, les dons (uniques/récurrents), les justificatifs, le moteur fiscal (barèmes par année avec héritage N ← N-1, plafond du revenu imposable), le rappel N-1, l'historique pluriannuel, le récapitulatif PDF (reçus annexés) et le mode confidentialité. **Interface responsive** : tableaux qui se transforment en cartes sur mobile, consultation d'un don/bénéficiaire au clic (fiche détail complète), saisie et édition par une même fenêtre modale. Détail complet : [`prototype/README.md`](prototype/README.md).
- **Déployé** sur un Raspberry Pi du foyer, isolé d'une autre application co-hébergée sur la même machine — voir [`deploy/README.md`](deploy/README.md) pour les garanties d'isolation et la procédure.
- **Durcissement (usage réel)** : écriture atomique de la base avec filet anti-corruption, rate-limiting de la connexion, en-têtes de sécurité (CSP…) et validation serveur. HTTPS LAN (Caddy) prévu à l'étape suivante.

## Stack

| Composant | Choix |
|---|---|
| Backend | Node.js · Express |
| Persistance | Fichier JSON |
| Frontend | JS vanilla |
| Déploiement | Docker Compose |

## Spécifications

- Index : [`SPECIFICATIONS.md`](SPECIFICATIONS.md) (source de vérité)
- Détail par domaine : [`specs/`](specs/) — contexte, architecture, design, exigences

## Contrôles

Chaque contribution passe par la CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)). Un contrôle qui ne peut pas s'exécuter échoue, il ne passe jamais.

| Contrôle | Ce qu'il refuse |
|---|---|
| Moteur fiscal | une évolution qui change le résultat de la fixture 2025 (105,60 €) ou applique un barème à une autre année |
| Application | une régression du téléversement des reçus (nom accentué, taille, session) ou du récapitulatif PDF, et toute dépendance de production à vulnérabilité **high** ou **critical** (`npm audit`) |
| Image de production | une image qui embarquerait le seed de démonstration ou les tests |
| Données personnelles | toute identité (courriel, organisme, civilité + nom, prénom suivi d’un nom en capitales, nom de fixture) absente de la liste blanche [`scripts/identites-fictives.json`](scripts/identites-fictives.json) |
| Secrets | tout secret détecté par gitleaks dans **tout** l'historique, et un scan qui n'aurait pas lu tous les commits |

En local : `node scripts/verifier-donnees-fictives.js` et, depuis `prototype/`, `node lib/fiscal.selftest.js` puis `npm test`.

## Avertissement

Outil d'**estimation** indicatif : il ne remplace ni votre déclaration officielle ni un conseil fiscal.

## Licence

[MIT](LICENSE) — © 2026 Philippe Tressard
