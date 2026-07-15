# Navigation

## Structure principale

```
List-dons
├── Tableau de bord        (exercice courant : réduction estimée, derniers dons, reçus manquants)
├── Dons                   (liste + saisie ; filtres par bénéficiaire / statut reçu)
├── Bénéficiaires          (référentiel : recherche, CRUD, archivage)
├── Synthèse               (par régime + cases 2042 RICI, par bénéficiaire, report)
├── Justificatifs          (statut des reçus, consultation, attachement)
└── Paramètres
     ├── Profil fiscal     (assujetti IFI…)
     ├── Sauvegarde / Export (RGPD)
     └── À propos / Licences
```

## Sélecteur d'année (exercice)
Toujours visible (barre supérieure) : change le contexte de toutes les vues. Action « Ouvrir un nouvel exercice » → parcours rappel N-1.

## Vues à onglets
- Fiche exercice : **Dons / Synthèse / Justificatifs**.
- (Pattern onglets uniforme, cf. charte.)

## Responsive
- Mobile-first, dès 320 px. Navigation repliée (menu) sur petit écran.
- Tableaux (synthèse, comparatif) : défilement horizontal dans leur conteneur, jamais la page.

## Accès
- **LAN uniquement** (ex. `https://192.168.1.x:8443`). Authentification simple (mono-foyer).

> Parcours détaillés : [`../design/parcours-utilisateurs.md`](../design/parcours-utilisateurs.md).
