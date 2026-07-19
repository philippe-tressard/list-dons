# Principes de code — simplicité & factorisation (contrainte forte)

> **Règle d'or (non négociable)** : l'application **ne doit pas devenir de plus en plus complexe**. Chaque évolution doit **réutiliser ou factoriser** l'existant, pas empiler du code. À fonctionnalité égale, la version **la plus simple et la plus factorisée** gagne.

## 1. La complexité est un coût à ne pas payer

- **YAGNI** : on n'implémente que ce qui est demandé. Pas de généricité spéculative.
- **KISS** : la solution la plus simple qui marche est la bonne.
- Avant d'ajouter du code, se demander : *puis-je réutiliser, généraliser ou supprimer quelque chose à la place ?*
- Une fonctionnalité qui alourdit tout le monde est **refusée ou isolée derrière un paramètre** (ex. IFI).

## 2. Factorisation (DRY) — priorité absolue

- **Une règle, un seul endroit.** Aucune règle métier dupliquée.
- **Le barème fiscal est une donnée, jamais du code** : zéro `if annee == 2025` / `if catégorie == …`. Le moteur lit le barème (§6). Ajouter un cas = une ligne de données.
- **Composants front réutilisables** : un seul composant par motif (carte expansible, pill, badge, champ de formulaire, sélecteur de bénéficiaire, tableau de synthèse). **Interdiction du copier-coller** de balisage/CSS entre pages.
- **Fonctions utilitaires partagées** : formatage des montants, des dates, calcul de réduction — centralisés, jamais réécrits.
- Règle pratique : **la 2ᵉ occurrence d'un motif déclenche sa factorisation** (rule of three au plus tard à la 3ᵉ).

## 3. Modularité (couplage faible, cohésion forte)

Découpage par **domaine métier**, chaque module autonome et testable :

```
app/
├── auth/          authentification, session, mot de passe
├── exercices/     années d'imposition
├── beneficiaires/ référentiel réutilisable
├── dons/          saisie, rattachement au régime
├── justificatifs/ fichiers + métadonnées
├── fiscal/        moteur de calcul + barèmes (données)
└── shared/        types, erreurs, formatage, accès base
```

- Les modules communiquent par **interfaces claires**, pas par des détails internes.
- Le **moteur fiscal** ne dépend d'aucune couche web : c'est une **fonction pure** `(dons, barème, revenu) → estimation`. Facilement testable et remplaçable.
- Le front reflète les mêmes domaines (routes + composants par domaine).

## 4. Frontière stricte : logique ≠ présentation ≠ persistance

- La **logique métier** (surtout fiscale) vit dans le backend Node.js, **sans I/O** dans le cœur de calcul.
- Le **front** n'implémente **aucune règle fiscale** (il affiche ce que l'API renvoie).
- La **persistance** est isolée derrière une couche d'accès (repository) ; le métier ne connaît pas le SQL.

## 5. Dépendances : sobriété

- **Budget de dépendances** : chaque paquet npm ajouté doit être justifié (valeur > coût de maintenance et de surface d'attaque).
- Préférer les **modules natifs de Node.js** et quelques paquets éprouvés (Express, bcryptjs, jsonwebtoken…) à un empilement.
- Pas de framework CSS lourd ni CDN (cf. charte). Front en **JS vanilla**, sans framework.

## 6. Garde-fous (vérifiables en CI)

- Lint/format JS (si adopté) : style et pièges détectés automatiquement.
- **Fonctions et fichiers courts** : si une fonction dépasse ~50 lignes ou fait plusieurs choses, la découper.
- **Pas de duplication** : une revue signale tout copier-coller (viser un détecteur de duplication).
- **Tests de non-régression** comme filet : le moteur fiscal a des **fixtures** (ex. exercice 2025, §6.7) qui figent les résultats attendus.
- **Revue orientée simplicité** : toute PR répond à « est-ce plus simple / mieux factorisé qu'avant ? ». Sinon, on refactorise.

## 7. Réflexe refactorisation

- Le refactoring n'est pas une option : c'est **continu** (règle du boy-scout — laisser le code plus propre qu'on l'a trouvé).
- On préfère **refactoriser avant d'ajouter** plutôt que d'ajouter à côté.
- Toute dette identifiée est notée et traitée, pas contournée par de la duplication.

> Ces principes priment sur la vitesse de livraison. En cas d'arbitrage, **on choisit la simplicité et la factorisation.**
