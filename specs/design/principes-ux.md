# Principes UX

Orientés vers un **particulier non-expert**.

## 1. Simplicité par défaut (divulgation progressive)
- Parcours principal minimal : **saisir un don → voir la réduction estimée**.
- La complexité (IFI, régimes rares) n'apparaît **que si un paramètre l'active** (profil fiscal).
- Saisie d'un don en **peu de champs obligatoires** : montant, date, bénéficiaire.

## 2. Ne pas faire ressaisir
- **Bénéficiaires réutilisables** : sélection par **autocomplétion** + création en ligne, anti-doublon.
- **Rappel N-1** à l'ouverture d'un exercice : report rapide d'un don, comparatif N/N-1.

## 3. Langage clair
- Vocabulaire simple, libellés en français, **infobulles pédagogiques** (« Pourquoi 66 % ? », « C'est quoi le plafond de 20 % ? »).
- Dates toujours contextualisées (« Versé le 13/11/2025 »), jamais de date brute isolée.

## 4. Confiance et prudence
- **Principe de prudence** : en cas d'incertitude sur un taux/plafond, l'estimation **sous-estime**.
- **Avertissement permanent** : « Estimation indicative, ne remplace pas votre déclaration ni un conseil fiscal. »
- **Statuts visibles** : reçu présent / manquant ; don reconduit / nouveau / non renouvelé.

## 5. Cohérence des patterns (règle d'uniformisation)
Tout pattern utilisé ≥ 2 fois est **uniforme** sur toutes les pages : cartes expansibles, pills, onglets, badges, ordre des boutons (`[Annuler] [Enregistrer]`), champ requis suffixé ` *`.

## 6. Accessibilité
WCAG 2.2 AA : clavier, focus visible, ARIA, contrastes, `prefers-reduced-motion`, `prefers-color-scheme`.

## 7. Sobriété / éco-conception
Pas de framework CSS lourd ni CDN, polices système, images optimisées + lazy-loading, aucun tracker.

> Charte : [`charte-graphique.md`](charte-graphique.md) · Parcours : [`parcours-utilisateurs.md`](parcours-utilisateurs.md).
