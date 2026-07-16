# Modèle de données

> Modèle conceptuel. Schéma SQL non figé (défini en conception, migrations `sqlx`).

## Conventions transverses
- **Montants en entiers (centimes)** — jamais de flottant pour l'argent (évite les erreurs d'arrondi). Formatage `€` uniquement à l'affichage. Ex. 50,00 € = `5000`.
- **Dates de versement** stockées en `date` (pas `datetime`) ; fuseau **Europe/Paris** pour l'horodatage technique.
- **Clés étrangères + contraintes** activées (intégrité). Suppressions maîtrisées (archivage plutôt que suppression quand un lien existe).

## Entités

### Utilisateur *(compte unique — mono-foyer)*
- `identifiant` (email ou nom d'utilisateur)
- `mot_de_passe_hash` (**Argon2id**)
- `cree_le`, `dernier_acces`
- Détails d'authentification : voir [`../web/authentification.md`](../web/authentification.md).


### AnnéeImposition (Exercice)
- `annee` (ex. 2025)
- `revenu_imposable` (optionnel — base du plafond 20 %)
- `statut` (en cours / clôturée)

### Bénéficiaire *(référentiel réutilisable, indépendant de l'année)*
- `nom`
- `identifiant` (SIREN / RNA, optionnel)
- `categorie_fiscale` — **enum fermé** → `code régime` du barème (`ir_general`, `ir_coluche`, `ir_partis`, `ir_campagne`, `ifi_dons`…)
- `habilite_recu` (bool)
- `adresse`, `telephone`, `url` (site web), `email` (tous optionnels — coordonnées de contact)
- `notes`
- `indicateur_suivi` (optionnel — **neutre / à surveiller / à éviter** ; par défaut *neutre*, sinon dérivé de la dernière appréciation) → aide à la décision de renouvellement
- `statut` (actif / archivé)
- 0..n **AppreciationBeneficiaire**

### AppreciationBeneficiaire *(journal daté — suivi qualitatif du bénéficiaire)*
- `beneficiaire` (FK)
- `date`
- `ton` (enum : **positif / neutre / déçu**)
- `commentaire` (texte)
- `cree_le`
> **Informatif uniquement** : n'entre **jamais** dans le calcul fiscal. Réutilise le composant « fil daté » (cf. principes-ux).

### Don
- `annee_imposition` (FK) · `beneficiaire` (FK)
- `date_versement`
- `montant` (**entier, centimes**)
- `moyen_paiement` (chèque, CB, virement, espèces, don en nature, abandon de frais)
- `numero_recu` (optionnel)
- `notes` *(facultatif — sert aussi de « raison du don » ; pas de champ séparé, cf. principe de factorisation)*
- `don_recurrent` (FK, **null** si don unique) — origine si généré par un engagement
- 0..n **Justificatif**

### DonRecurrent *(engagement récurrent — générateur de Don)*
- `beneficiaire` (FK)
- `montant_echeance` (**entier, centimes**)
- `frequence` (enum : **unique / mensuel / trimestriel / annuel**)
- `jour_echeance` (ex. 28 — optionnel)
- `date_debut` · `date_fin` (optionnelle — null = en cours)
- `moyen_paiement` · `note`
- `statut` (**actif / arrêté**)
> Génère un **`Don` par échéance échue** (matérialisation paresseuse à l'ouverture de l'exercice). Les `Don` restent la **source de vérité** (éditables). Détails et gestion de l'année d'imposition : [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §5.4.

### Justificatif
- `don` (FK)
- `fichier` (chemin dans `uploads/`), `type_mime`, `taille`, `hash`
- `numero_recu`, `date_ajout`

### Barème (`bareme_fiscal`) — voir [modèle fiscal](#barème-fiscal)
- `annee_imposition`
- liste de **Régimes** { code, libellé, taux, plafond {type, valeur}, date_effet_debut/fin, ordre_application, bascule_vers, case_declaration, categories_eligibles }
- `report { actif, annees: 5 }`

### ProfilFiscal
- `assujetti_ifi` (bool, défaut **non**)

## Relations

```
AnnéeImposition 1───n Don n───1 Bénéficiaire 1───n AppreciationBeneficiaire
                       │ │
                       │ └──1───n Justificatif
                       └──n───1 DonRecurrent n───1 Bénéficiaire  (engagement → génère des Don)
AnnéeImposition 1───1 Barème (résolu par héritage N ← N-1 si absent)
Foyer 1───1 ProfilFiscal
```

## Règles d'intégrité
- L'année d'un don découle de sa **date de versement**.
- Taux/plafonds **jamais codés en dur** — table `bareme_fiscal` datée.
- Un bénéficiaire référencé par un don n'est pas supprimé (**archivage**).

## Barème fiscal
Décrit dans [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §6 (typologie complète, barèmes 2025/2026/2027, mécanique et exemple 2025 vérifié).
