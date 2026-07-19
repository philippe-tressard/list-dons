# API (esquisse)

> API REST implémentée en **Node.js/Express**. Auth par **JWT en cookie HttpOnly/SameSite=strict**. Toutes les entrées validées côté serveur.

## Conventions
- Base : `/api`. Réponses JSON. Erreurs normalisées (code + message).
- Verbes : `GET` (lecture), `POST` (création), `PATCH` (modification), `DELETE` (suppression/archivage).
- Rate limiting sur `/api/auth/*`.

## Santé
- `GET /api/health` — statut simple (pour supervision légère, sans alerting).

## Exercices
- `GET /api/exercices` · `POST /api/exercices` · `GET /api/exercices/{annee}` · `PATCH /api/exercices/{annee}`
- `GET /api/exercices/{annee}/estimation` — réduction estimée + détail par régime + cases + report
- `GET /api/exercices/{annee}/rappel-n-1` — bénéficiaires N-1 + comparatif
- `GET /api/exercices/{annee}/pdf` — récapitulatif fiscal en PDF (détail des dons + cases 2042 RICI), aide à la déclaration

## Bénéficiaires (référentiel)
- `GET /api/beneficiaires?q=...` — recherche/autocomplétion
- `POST /api/beneficiaires` (anti-doublon) · `PATCH /api/beneficiaires/{id}` · `PATCH {archive:true}`

## Dons
- `GET /api/exercices/{annee}/dons` · `POST /api/dons` · `PATCH /api/dons/{id}` · `DELETE /api/dons/{id}`

## Justificatifs
- `POST /api/dons/{id}/justificatifs` (upload) · `GET /api/justificatifs/{id}` (téléchargement) · `DELETE /api/justificatifs/{id}`
- Protection **path traversal**, nom assaini + identifiant unique.

## Barèmes (lecture ; alimentation par migration/données)
- `GET /api/baremes/{annee}` — barème résolu (avec héritage N ← N-1)

## Export / RGPD
- `GET /api/export` — archive CSV/JSON **+ fichiers justificatifs**
- `DELETE /api/compte` — suppression complète

> Détails métier : [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §5–§7.
