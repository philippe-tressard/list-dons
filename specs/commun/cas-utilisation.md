# Cas d'utilisation

Acteur unique dans le MVP : **le donateur** (foyer fiscal, mono-utilisateur).

## UC-01 — Enregistrer un don
1. L'utilisateur ouvre « Nouveau don » dans l'exercice courant.
2. Il **sélectionne un bénéficiaire** existant (autocomplétion) ou en **crée un**.
3. Il saisit **montant** et **date** ; le moyen de paiement par défaut est proposé.
4. Il **attache le reçu** (PDF/image) si disponible.
5. L'app rattache le don au bon **régime fiscal** (via la catégorie du bénéficiaire) et met à jour l'estimation.

## UC-02 — Gérer le référentiel de bénéficiaires
Créer / modifier / archiver un bénéficiaire (nom, identifiant SIREN-RNA, catégorie fiscale, habilité aux reçus). Anti-doublon à la création. Un bénéficiaire référencé par un don n'est pas supprimé mais **archivé**.

## UC-03 — Attacher et consulter un justificatif
Ajouter un ou plusieurs reçus à un don ; les **consulter / télécharger** ; voir le **statut reçu présent / manquant**.

## UC-04 — Estimer la réduction d'impôt de l'année
Afficher la **réduction estimée**, le **détail par régime/bénéficiaire**, les **cases de déclaration** (ex. 7UF, 7UH, 7UD) et l'éventuel **report** d'excédent.

## UC-05 — Ouvrir un nouvel exercice fiscal
À l'ouverture de l'année N : **rappel des bénéficiaires N-1** (avec montants), **report rapide** d'un don, **comparatif N vs N-1**.

## UC-06 — Synthèse par bénéficiaire / par catégorie
Consulter les totaux agrégés de l'année.

## UC-07 — Exporter / sauvegarder ses données
**Export** CSV/JSON **+ fichiers justificatifs** (portabilité RGPD) ; suppression complète possible.

> Détails et écrans : [`../design/parcours-utilisateurs.md`](../design/parcours-utilisateurs.md) et [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §7.
