# Prototype fonctionnel — List-dons (Node)

> ⚠️ **Prototype de test.** Il sert à **valider l'UX et le moteur fiscal** rapidement.
> L'implémentation **cible** reste **Rust (Axum) + SvelteKit + SQLite**, conformément aux spécifications (`../SPECIFICATIONS.md`, `../specs/`).
> Ce prototype a été fait sur une machine sans Rust ni Docker, pour livrer quelque chose de testable immédiatement.

## Ce qui fonctionne
- **Authentification** mono-foyer (création du compte au 1er lancement, connexion, déconnexion, session cookie).
- **Exercices** (années d'imposition) : création, sélection, revenu imposable (plafond 20 %).
- **Bénéficiaires** : référentiel réutilisable, catégorie fiscale, indicateur de suivi.
- **Dons** : uniques ou **récurrents** (mensuel/trimestriel/annuel → génération des versements rattachés à l'année), note/raison, suppression.
- **Justificatifs** : attacher un fichier à un don.
- **Moteur fiscal** (art. 200 CGI) : réduction estimée, détail par régime, **cases 7UF / 7UD / 7UH**, plafond 20 %, report — barèmes **2025–2027**.

## Lancer

```bash
cd prototype
npm install
npm start
```

Puis ouvrir **http://localhost:8080** (accessible aussi depuis le LAN).
Au premier lancement, créez votre compte.

Variable `PORT` pour changer de port (défaut 8080). Données dans `prototype/data/` (non versionné).

## Limites (assumées, prototype)
- Persistance = fichier JSON (cible : SQLite). Hachage = bcrypt (cible : Argon2).
- Récurrence générée à la création pour l'année en cours (pas de planificateur).
- Pas encore : comparatif N-1 dans l'IHM, OCR, export, HTTPS (à faire dans l'implémentation Rust).
