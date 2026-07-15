# Parcours utilisateurs

## Parcours 0 — Connexion

```
Écran Connexion (carte centrée)
  ├─ Identifiant * + Mot de passe * (afficher/masquer, alerte Verr. Maj)
  ├─ « Se connecter » → session (cookie sécurisé) → Tableau de bord
  └─ « Mot de passe oublié ? » → réinitialisation locale
Premier lancement → écran d'initialisation (création du compte unique).
```
Détail : [`../web/authentification.md`](../web/authentification.md).

## Parcours 1 — Enregistrer un don (cœur de l'app)

```
Tableau de bord (exercice courant)
  └─ « + Nouveau don »
       ├─ Bénéficiaire *  → autocomplétion sur le référentiel
       │     ├─ existant  → sélection (infos reprises)
       │     └─ nouveau   → « + Créer un bénéficiaire » (nom, catégorie fiscale, SIREN/RNA)
       ├─ Montant *       (€)
       ├─ Date *          (détermine l'année et le barème applicable)
       ├─ Fréquence       (unique par défaut · mensuel · trimestriel · annuel)
       ├─ Moyen de paiement (défaut proposé)
       └─ Justificatif    (attacher PDF/image — optionnel à la saisie)
  └─ Enregistrer → estimation mise à jour + statut « reçu présent/manquant »
```

**Don récurrent** (fréquence ≠ unique) : crée un engagement qui **génère un versement par échéance**, chacun rattaché à son année. Depuis la fiche de l'engagement : voir les versements générés, **Arrêter** (stoppe les échéances futures, rappel de résilier le vrai prélèvement), attacher le **reçu annuel**. Détails : [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §5.4.

## Parcours 2 — Ouvrir un nouvel exercice

```
Sélecteur d'année → « Ouvrir l'exercice N »
  └─ Rappel des bénéficiaires N-1 (cartes expansibles) :
       pour chacun : montant N-1 + « Reporter un don en N »
  └─ Comparatif N vs N-1 (tableau) : montant N-1 | montant N | écart €/% | statut
       (reconduit · nouveau · non renouvelé)
       + indicateur de suivi du bénéficiaire (⚠️ à surveiller / ⛔ à éviter)
         → aide à décider de reconduire ou non un don
```

Sur chaque **fiche bénéficiaire** : un **journal d'appréciations daté** (date + ton positif/neutre/déçu + commentaire) pour noter ses actions dans le temps. Purement informatif (aucun effet fiscal), réutilise le composant « fil daté ».

## Parcours 3 — Préparer la déclaration

```
Onglet Synthèse (exercice)
  ├─ Réduction estimée totale (mise en avant)
  ├─ Détail par régime → cases 2042 RICI (ex. 7UF = X €, 7UH = Y €)
  ├─ Détail par bénéficiaire
  ├─ Report éventuel (au-delà du plafond 20 %)
  └─ Rappel des reçus manquants (à compléter avant de déclarer)
```

## Parcours 4 — Consulter / gérer les justificatifs

```
Onglet Justificatifs (ou depuis une fiche don)
  ├─ Liste des dons avec statut reçu ✅ / ⚠️
  ├─ Attacher / remplacer / consulter / télécharger un reçu
  └─ Vérification de cohérence (montant/date/organisme) à l'attachement
```

## Écrans principaux (navigation)
Tableau de bord · Dons · Bénéficiaires · Synthèse · Justificatifs · Paramètres (profil fiscal, sauvegarde/export).

> Voir [`../web/navigation.md`](../web/navigation.md) et [`../commun/cas-utilisation.md`](../commun/cas-utilisation.md).
