# Charte graphique

> Système de design de List-dons : couleurs, typographie, espacement, composants et patterns. Base sobre, institutionnelle et **accessible (WCAG 2.2 AA)**, pensée pour un sujet fiscal (ton rassurant, non-anxiogène).
> **Inspirée de 5Hostachy**, mais **instanciée à List-dons** : les exemples portent sur les bénéficiaires, dons et exercices ; les éléments propres à la copropriété sont écartés.

---

## Palette de couleurs

### Couleurs principales

| Nom | Hex | Usage |
|---|---|---|
| Bleu primaire | `#1E3A5F` | CTA, en-têtes, navigation |
| Vert secondaire | `#3D6B4F` | Badges, succès, montants positifs |
| Or accent | `#C9983A` | Highlights, icônes actives, hover |
| Fond clair | `#F2EFE9` | Pages, arrière-plans |
| Blanc surface | `#FFFFFF` | Cartes, modales |

### Texte

| Nom | Hex | Usage |
|---|---|---|
| Texte principal | `#1A1A2E` | Corps, titres |
| Texte secondaire | `#5A6070` | Labels, placeholders |
| Texte inversé | `#F2EFE9` | Sur fonds sombres |

### Fonctionnelles

| Nom | Hex | Usage |
|---|---|---|
| Succès | `#2E7D52` | Confirmation, reçu présent |
| Avertissement | `#B07D1E` | Reçu manquant, prudence |
| Erreur | `#C0392B` | Erreurs, actions destructrices |
| Info | `#2563A6` | Informations neutres |

### Mode sombre

| Nom | Hex |
|---|---|
| Fond sombre | `#0D1B2A` |
| Surface sombre | `#162236` |
| Bord sombre | `#2A3F5A` |
| Texte clair | `#E8E6E1` |

> Respect de `prefers-color-scheme` (clair/sombre).

---

## Typographie

Polices **système, sans CDN** (éco-conception, zéro dépendance) :

| Rôle | Police |
|---|---|
| Titres | **Georgia** (+ Palatino), serif |
| Corps / UI | **Segoe UI** (+ system-ui) |
| Monospace (montants tabulaires) | **Consolas** (+ Courier New) |

Échelle en `rem`. Sur mobile (< 768 px), `:root { font-size: 14px }` réduit toute l'échelle. Pas de texte < 12 px. Contraste ≥ 4,5:1 (corps), ≥ 3:1 (grand texte / UI).

---

## Espacement et grille

- **Unité de base : 4 px** (grille 4). Espacements : 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- **Rayons** : chips/badges 4 px · boutons/champs 8 px · cartes 12 px · modales 16 px.
- **Ombres** : légère `0 1px 3px rgba(30,58,95,.10)` · carte `0 4px 12px rgba(30,58,95,.12)` · modale `0 8px 32px rgba(30,58,95,.18)`.

---

## Iconographie

- Icônes d'action = **emojis Unicode natifs** (aucune bibliothèque SVG). Emojis **non-BMP** encodés en escape ASCII-safe (`\u{1F5D1}` en JS, `&#x1F5D1;` en template) pour éviter la corruption.
- Tout bouton-icône porte `aria-label` + `title`.

| Action | Icône | Sémantique |
|---|---|---|
| Modifier | ✏️ | édition |
| Supprimer | 🗑️ | destructif |
| Ajouter un don / reporter | ↩️ / ➕ | positif |
| Reçu présent | ✅ | succès |
| Reçu manquant | ⚠️ | avertissement |
| Archiver | 📦 | réversible |

---

## Composants — directives

| Composant | Primaire | Hover / actif |
|---|---|---|
| Bouton CTA | Fond `#1E3A5F`, texte blanc, r=8 | Fond `#16304F`, ombre légère |
| Bouton secondaire | Bordure `#1E3A5F`, texte `#1E3A5F` | Fond `#EEF2F7` |
| Lien | `#1E3A5F`, souligné au hover | `#C9983A` |
| Badge succès | Fond `#E6F4EE`, texte `#2E7D52` | — |
| Badge alerte | Fond `#FDF3E0`, texte `#B07D1E` | — |
| Badge erreur | Fond `#FDEDEC`, texte `#C0392B` | — |

### Champs de formulaire
- Champ **obligatoire** : label suivi de ` *` (ex. `Montant *`). Ne jamais écrire « (optionnel) ».
- Ordre des boutons : `[ Annuler ]` (gauche, secondaire) · `[ Enregistrer ]` (droite, primaire), groupe aligné à droite (`.form-actions`).

### Pattern — Pills (choix ≤ 8)
Pour la **catégorie fiscale**, le **moyen de paiement**, le **filtre par année/statut**. Container `.perimetre-pills`, `.pill`, `.pill-active`, `type="button"`, `white-space: nowrap`.

### Pattern — Carte expansible au clic
Pour les listes de **dons**, **bénéficiaires**, **rappel N-1**. En-tête toujours visible (titre + méta), détail au clic, `role="button"` + `tabindex="0"` + `keydown`, aperçu `.clamp-5`, bord gauche coloré au hover/expanded.

### Pattern — Onglets
Pour les vues multiples (ex. **Dons / Synthèse / Justificatifs**). `role="tablist"` / `role="tab"`.

---

## Accessibilité

Cible **WCAG 2.2 AA** : navigation clavier complète, focus visible, ARIA sur composants interactifs, alternatives textuelles, respect de `prefers-reduced-motion`.

| Combinaison | Ratio | AA |
|---|---|---|
| `#1A1A2E` sur `#F2EFE9` | ≥ 12:1 | ✅ |
| Blanc sur `#1E3A5F` | ≥ 8,5:1 | ✅ |
| Blanc sur `#3D6B4F` | ≥ 5,5:1 | ✅ |

---

## Identité List-dons (à produire)

- **Nom affiché** : « List-dons ».
- **Logotype** : à concevoir (sobre, institutionnel), déclinaisons claire/sombre, favicon, icône PWA.
- **Ton** : rassurant, clair, non-anxiogène (sujet fiscal).

> Principes d'usage : voir [`principes-ux.md`](principes-ux.md).
