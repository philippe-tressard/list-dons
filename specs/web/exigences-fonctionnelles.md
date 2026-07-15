# Exigences fonctionnelles

Identifiants `EF-xxx`. Priorité : **M** (MVP) / **B** (backlog).

## Exercices
- **EF-001 (M)** — Créer/sélectionner une **année d'imposition** ; renseigner un revenu imposable optionnel.
- **EF-002 (M)** — Clôturer un exercice (lecture seule).

## Bénéficiaires
- **EF-010 (M)** — CRUD **bénéficiaire** (nom, identifiant SIREN/RNA, catégorie fiscale, habilité reçu).
- **EF-011 (M)** — **Sélection par autocomplétion** d'un bénéficiaire existant à la saisie d'un don.
- **EF-012 (M)** — **Création en ligne** d'un bénéficiaire depuis la saisie du don, avec **anti-doublon**.
- **EF-013 (M)** — **Archivage** (pas suppression) d'un bénéficiaire référencé par un don.
- **EF-015 (M)** — **Suivi / appréciation du bénéficiaire** : journal daté (date + commentaire + ton positif/neutre/déçu) + **indicateur** (neutre / à surveiller / à éviter) affiché sur la fiche et dans le rappel N-1. **Informatif, sans impact fiscal.**
- **EF-014 (B)** — Fusion de doublons ; référentiel pré-rempli.
- **EF-016 (B)** — Étiquettes structurées optionnelles pour la **raison d'un don** (don régulier / appel / évènement / optimisation…). *Par défaut, la raison tient dans le champ « note » facultatif du don (EF-020) — pas de champ séparé.*

## Dons
- **EF-020 (M)** — CRUD **don** (montant, date, bénéficiaire, moyen de paiement, n° de reçu, **note/raison facultative**).
- **EF-021 (M)** — Rattachement automatique au **régime fiscal** et au **barème** selon la date.

## Dons récurrents (§5.4)
- **EF-022 (M)** — Définir un **don récurrent** : bénéficiaire, montant par échéance, **fréquence** (unique / mensuel / trimestriel / annuel), date de début, moyen de paiement.
- **EF-023 (M)** — **Génération automatique** d'un `Don` par échéance échue (matérialisation paresseuse), chacun rattaché à **son année d'imposition**. Versements générés **éditables/supprimables** (source de vérité fiscale).
- **EF-024 (M)** — **Arrêter** un don récurrent (bouton / date de fin) : plus d'échéance générée ensuite ; versements passés conservés ; **rappel de résilier le prélèvement réel**.
- **EF-025 (M)** — Attacher **un reçu annuel récapitulatif** couvrant les versements de l'année (cas usuel des prélèvements).
- **EF-026 (B)** — **Projection annuelle** prévisionnelle (« si l'engagement continue jusqu'au 31/12 »), clairement étiquetée.

## Justificatifs
- **EF-030 (M)** — Attacher **1..n justificatifs** (PDF/JPG/PNG) à un don ; stockage local sécurisé.
- **EF-031 (M)** — **Consulter/télécharger** un justificatif ; statut **présent/manquant**.
- **EF-032 (B)** — **Lecture/OCR** du reçu + **contrôle de cohérence** (montant/date/organisme) ; **détection « pas un don »** (ex. attestation PER).
- **EF-033 (B)** — Rappel des **reçus manquants** avant déclaration.

## Estimation fiscale
- **EF-040 (M)** — **Estimer la réduction d'impôt** de l'année (moteur modulaire, §6).
- **EF-041 (M)** — **Détail par régime** avec **cases de déclaration** (7UF, 7UH, 7UD…).
- **EF-042 (M)** — Détail **par bénéficiaire** et **par catégorie**.
- **EF-043 (M)** — Gestion du **plafond 20 %** et du **report sur 5 ans**.
- **EF-044 (B)** — Simulateur « et si je donne X € de plus ? ».

## Comparatif / rappel
- **EF-050 (M)** — **Rappel des bénéficiaires N-1** + report rapide à l'ouverture d'un exercice.
- **EF-051 (M)** — **Comparatif N vs N-1** (écart €/%, statut reconduit/nouveau/non renouvelé).
- **EF-052 (B)** — Comparatif multi-années ; alerte d'approche du plafond.

## Authentification (voir [`authentification.md`](authentification.md))
- **EF-070 (M)** — **Connexion** obligatoire (identifiant + mot de passe) ; session par cookie sécurisé.
- **EF-071 (M)** — **Déconnexion**.
- **EF-072 (M)** — **Initialisation du compte** unique au premier lancement (mono-foyer).
- **EF-073 (M)** — **Changer / réinitialiser** le mot de passe (réinitialisation locale sans SMTP).

## Profil & données
- **EF-060 (M)** — **Profil fiscal** : paramètre `assujetti_ifi` (défaut non) activant/masquant le module IFI.
- **EF-061 (M)** — **Export** CSV/JSON **+ justificatifs** (portabilité RGPD).
- **EF-062 (M)** — **Suppression complète** des données.
- **EF-063 (M)** — **Sauvegarde/restauration** (base + uploads).

> Détail métier et règles fiscales : [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §5–§7.
