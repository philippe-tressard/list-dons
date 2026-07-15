# Glossaire

| Terme | Définition |
|---|---|
| **Année d'imposition / Exercice** | Année civile des revenus (ex. 2025), déclarée l'année suivante (2026). Chaque don y est rattaché par sa **date de versement**. |
| **Bénéficiaire** | Entité qui reçoit le don (association, fondation, parti…). Terme canonique de l'app (synonyme : organisme). **Référentiel réutilisable**, indépendant de l'année. |
| **Don** | Versement à un bénéficiaire, rattaché à une année et à un régime fiscal. |
| **Justificatif / Reçu fiscal** | Document (CERFA 11580, PDF/image) attestant le don. Stocké et rattaché au don. |
| **Régime fiscal** | Règle taux + plafond (+ case de déclaration) appliquée à un don selon la catégorie du bénéficiaire (ex. `ir_general`, `ir_coluche`, `ir_partis`). |
| **Barème** | Ensemble daté des régimes d'une année. Versionné par millésime ; **héritage N ← N-1** si pas de règle spécifique. |
| **Réduction d'impôt** | Montant soustrait de l'impôt dû (ex. 66 % ou 75 % du don). À distinguer d'une **déduction du revenu** (ex. PER, art. 163 quatervicies). |
| **Plafond des 20 %** | Limite de l'assiette du régime général : 20 % du **revenu imposable**. Excédent **reportable 5 ans**. |
| **Report** | Excédent au-delà du plafond, imputable sur les 5 années suivantes. |
| **2042 RICI** | Formulaire des réductions et crédits d'impôt. Cases dons : **7UD** (75 % Coluche), **7UF** (66 % intérêt général), **7UH** (partis politiques). |
| **Art. 200 CGI** | Base de la réduction d'impôt pour dons des particuliers. |
| **Art. 978 CGI** | Réduction d'IFI pour dons (module optionnel, hors MVP par défaut). |
| **Art. 163 quatervicies** | Déduction du revenu au titre du PER (cases 6NS/6NT) — **hors périmètre dons**. |
| **Profil fiscal** | Réglages du foyer (ex. `assujetti_ifi`) qui activent/masquent des régimes. |
| **MEP** | Mise En Production (déploiement). |
