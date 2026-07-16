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
- **EF-015 (M)** — **Suivi / appréciation du bénéficiaire** : journal daté (date + commentaire + ton positif/neutre/déçu) + **indicateur** (de confiance / neutre / à surveiller / à éviter) affiché sur la fiche et dans le rappel N-1. **Informatif, sans impact fiscal.**
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
- **EF-043 (M)** — Gestion du **plafond du revenu imposable** (20 % aujourd'hui — taux porté par le barème daté, jamais codé en dur dans l'IHM) : calcul de l'excédent de l'exercice courant au-delà du plafond. *Le report effectif de cet excédent sur les exercices suivants (déclaration, suivi de consommation sur 5 ans) n'est pas géré par l'app — voir suivi du report en backlog.* Pas d'affichage d'un excédent non actionnable dans l'IHM. **Jauge de plafond** (tableau de bord) : base éligible / plafond calculé, en %, dès que le revenu imposable est renseigné — permet d'anticiper le dépassement avant de faire un nouveau don, avec possibilité de le modifier en place (icône ✏️). Tant que le revenu n'est pas renseigné, **saisie rapide contextuelle** directement sur le tableau de bord — **seul endroit** où le saisir/modifier (pas de doublon dans Paramètres).
- **EF-046 (M)** — **Récapitulatif des barèmes par exercice** (Paramètres) : pour chaque exercice créé, les règles réellement appliquées (taux, plafonds, case) et leur année source en cas d'héritage — rend visible que l'isolation par année est respectée (un changement de règle ne s'applique jamais rétroactivement à un exercice déjà clos).
- **EF-044 (B)** — Simulateur « et si je donne X € de plus ? ».
- **EF-045 (M)** — **Récapitulatif fiscal annuel en PDF** : résumé de l'estimation (dont plafond 20 % si renseigné), cases 2042 RICI à reporter, détail chronologique des dons (date, bénéficiaire, case, montant, n° de reçu) **puis récapitulatif agrégé par bénéficiaire** (nombre de dons, total) en fin de document. Aide à remplir la déclaration ; ne s'y substitue pas.

## Comparatif / rappel
- **EF-050 (M)** — **Rappel des bénéficiaires N-1** + report rapide à l'ouverture d'un exercice.
- **EF-051 (M)** — **Comparatif N vs N-1** (écart €/%, statut reconduit/nouveau/non renouvelé).
- **EF-052 (M)** — **Comparatif multi-années** : graphique en barres empilées par bénéficiaire (tableau de bord).
- **EF-053 (B)** — Alerte d'approche du plafond de 20 %.

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
- **EF-064 (M)** — **Mode confidentialité (démo)** : bascule dans le bandeau d'en-tête. Anonymise les bénéficiaires (nom, identifiant, coordonnées → libellé générique stable « Bénéficiaire A/B/C… ») ; **masque** (`*****`, aucune valeur factice) tout montant saisi ou calculé à partir d'un montant saisi (dons, réduction, cases 2042 RICI, revenu imposable, plafond) sur tout l'écran. Les **pourcentages** (ex. jauge de plafond) et les **constantes du barème** (plafonds légaux, non personnels) restent visibles. L'**historique pluriannuel est masqué en bloc** (la hauteur des barres révélerait les montants même texte caché). Purement côté affichage — aucune donnée modifiée en base. Désactive en conséquence la saisie/édition/suppression (dont la saisie du revenu imposable) et le téléchargement du PDF récapitulatif (qui reste toujours réel) tant que le mode est actif. Réversible à tout moment.

## Pied de page
- **EF-065 (M)** — Pied de page sur toutes les pages de l'app : copyright, licence (MIT), lien vers les **mentions légales** (page publique dédiée, sans authentification requise).

> Détail métier et règles fiscales : [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §5–§7.
