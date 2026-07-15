# Spécifications — List-dons

Spécifications détaillées, éclatées par domaine. L'**index et la source de vérité de haut niveau** restent dans [`../SPECIFICATIONS.md`](../SPECIFICATIONS.md) ; ces fichiers en développent les sections.

Structure :

| Dossier | Contenu |
|---|---|
| [`commun/`](commun/) | Contexte & objectifs, cas d'utilisation, glossaire, personas |
| [`architecture/`](architecture/) | Vue d'ensemble, stack, **principes de code (simplicité/factorisation)**, API, modèle de données |
| [`design/`](design/) | Charte graphique, principes UX, parcours |
| [`web/`](web/) | Exigences fonctionnelles, non fonctionnelles, **authentification**, navigation |

> **Statut** : cadrage (v1.x). Aucun code applicatif produit à ce stade.
> **Backend** en Rust, **frontend** SvelteKit, base SQLite. Application web auto-hébergée, responsive, open source, conforme RGPD.
> **Inspiration** : l'IHM, les patterns UX et les pratiques de mise en production s'inspirent de **5Hostachy** ; ces spécifications sont **instanciées à List-dons** (contenu propre à l'application des dons).
