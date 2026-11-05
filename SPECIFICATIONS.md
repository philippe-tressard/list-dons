# List-dons — Spécifications

> Fichier central des spécifications. **Source de vérité unique**, mis à jour à chaque évolution.
> Statut : `BROUILLON — compréhension initiale` · Dernière mise à jour : 2026-11-05

---

## 0. Journal des versions du document

| Date       | Version | Auteur | Changements |
|------------|---------|--------|-------------|
| 2026-07-15 | 0.1     | Claude | Rédaction initiale : périmètre, modèle de données, règles fiscales, suggestions. |
| 2026-07-15 | 0.2     | Claude | Définition du socle : structure specs, design system, patterns UX, pratiques MEP, RGPD/juridique, sécurité — backend Rust. |
| 2026-07-15 | 0.3     | Claude | Décisions actées : mono-foyer, licence MIT, front à confirmer (reco SvelteKit). §6 refondu en **moteur fiscal modulaire par année et par date d'effet** ; barèmes 2025/2026 **vérifiés via Légifrance** (art. 200 CGI, LF 2026) — plafond Coluche relevé à 2 000 €. |
| 2026-07-15 | 0.4     | Claude | **Front = Option A (SvelteKit) acté.** Ajout de la **règle d'héritage N ← N-1** et du **barème 2027** (provisoire, hérité de 2026 — pas de LF 2027 à ce jour). Points de veille : LF 2027 + bascule version art. 200 au 01/09/2026. |
| 2026-07-15 | 0.5     | Claude | **Déploiement acté : RPi2, appli indépendante de l'application existante, sans domaine.** Ajout §8.1 (règles d'isolation/co-tenance), accès LAN + TLS auto-signé (`tls internal`) par défaut. |
| 2026-07-15 | 0.6     | Claude | **§6.2 : typologie exhaustive des cas de déduction** (tous les cas art. 200 CGI + IFI art. 978 + mécénat art. 238 bis), enum de catégories → régimes. **§8.1 durci** : isolation stricte = exigence non négociable, limites ressources + garde-fou de déploiement obligatoires. |
| 2026-07-15 | 0.7     | Claude | **Accès local (LAN) uniquement acté** — aucune exposition Internet ; VPN reporté en option. |
| 2026-07-15 | 0.8     | Claude | Terme canonique **« Bénéficiaire »** (référentiel réutilisable, indépendant de l'année). Ajout §5.1 : **sélection par autocomplétion** + création en ligne, et **rappel des bénéficiaires N-1 + comparatif N/N-1** à l'ouverture d'un exercice. Répercuté dans le §7 (MVP). |
| 2026-07-16 | 0.9     | Claude | **Cible = particulier non-expert.** Mécénat 238 bis **hors périmètre** ; IFI 978 **désactivé par défaut** derrière le paramètre `assujetti_ifi` (§5.2 Profil fiscal + principes de simplicité/prudence). Cultes tranché à **66 %** (dispositif 75 % expiré fin 2022 — vérifié Légifrance). **Résilience simple** (restart + sauvegardes, pas de monitoring). |
| 2026-07-16 | 1.0     | Claude | **Cases 2042 RICI : 7UF** (`ir_general`), **7UH** (`ir_partis`), 7UD (`ir_coluche`). Ajout §6.7 : **exemple 2025 = fixture de test** (réduction attendue ≈ **105,60 €**, cases 7UF=100 / 7UH=60). Note sur la base du plafond 20 % = revenu imposable après PER. |
| 2026-07-16 | 1.1     | Claude | Mise au point de la lecture des reçus PDF : cas d'une **incohérence nom de fichier ↔ contenu** (un fichier peut contenir un autre reçu, ou une attestation PER hors périmètre). Nouvelle feature backlog : **contrôle de cohérence pièce jointe ↔ don** + détection « pas un don ». |
| 2026-07-16 | 1.2     | Claude | **Justificatifs gérés dans l'app** (entité `Justificatif`, §5.3) : attacher 1..n reçus par don, stockage local sécurisé, consultation/téléchargement, statut présent/manquant, inclusion sauvegarde + export RGPD, conservation. Rendu explicite dans le MVP (§7). |
| 2026-07-16 | 1.3     | Claude | Exemple §6.7 consolidé comme **fixture de test** (deux dons d'intérêt général art. 200 → case 7UF ; un don à un parti → case 7UH). Réduction 2025 ≈ 105,60 €. |
| 2026-07-16 | 1.4     | Claude | **Structure `specs/` créée** (15 fichiers) avec sa **charte graphique**. Aucun code applicatif. |
| 2026-07-16 | 1.5     | Claude | Nettoyage : suppression de toutes les **références nominatives à l'application de référence** dans les specs (specs autonomes). Le contexte d'isolation est décrit de façon générique (« l'application existante sur le RPi2 »). |
| 2026-07-16 | 1.6     | Claude | **Authentification** (mono-foyer) : nouveau [`authentification.md`](specs/web/authentification.md) — fenêtre de connexion sobre, Argon2id, JWT cookie, rate limiting, init au 1er lancement. **Contrainte forte anti-complexité/factorisation** : nouveau [`principes-code.md`](specs/architecture/principes-code.md). Bonnes pratiques : **montants en centimes**, modularité par domaine. Entité `Utilisateur` ajoutée au modèle. |
| 2026-07-16 | 1.7     | Claude | Rétabli la mention de **5Hostachy comme source d'inspiration** (IHM/UX/MEP, fenêtre de connexion) et nommé le co-tenant réel du RPi2 dans l'isolation (§8.1) ; specs **instanciées à List-dons**. |
| 2026-07-16 | 1.8     | Claude | **Suivi/appréciation du bénéficiaire** (entité `AppreciationBeneficiaire` : journal daté ton+commentaire + indicateur ; informatif, sans impact fiscal). **Raison du don** : pas de champ dédié — réutilise la **note facultative** du don (factorisation). |
| 2026-07-16 | 1.9     | Claude | **Dons uniques vs récurrents** (§5.4 + entité `DonRecurrent`) : fréquences unique/mensuel/trimestriel/annuel ; l'engagement **génère un `Don` par échéance** rattaché à **son année d'imposition** (réutilise le moteur, zéro cas spécial) ; `Don` = source de vérité éditable ; **arrêt** de la récurrence + rappel de résilier le prélèvement réel ; reçu annuel récapitulatif. |
| 2026-07-16 | 2.0     | Claude | **Anonymisation pour publication** : exemple §6.7 rendu fictif (bénéficiaires génériques, revenu illustratif), identifiants (SIREN, n° de reçu) et IP LAN retirés ; journal nettoyé. Ajout des fichiers d'amorçage du dépôt (README, LICENSE MIT, .gitignore). |
| 2026-07-16 | 2.1     | Claude | **IHM (MVP)** : édition d'un don et d'un bénéficiaire déjà saisis ; **coordonnées du bénéficiaire** (adresse, téléphone, URL, email — tous optionnels) ; rappel N-1 branché au tableau de bord (colonne montant N-1, liste des non-renouvelés) ; **indicateur de suivi** enrichi d'un 4ᵉ état **« de confiance »** ; **EF-052 promu MVP** : historique pluriannuel en barres empilées par bénéficiaire. |
| 2026-07-16 | 2.2     | Claude | Liste « Non renouvelée » étendue à tout l'historique (plus seulement N-1), groupée par dernière année de don, tri décroissant. **Récapitulatif fiscal annuel en PDF** (EF-045, promu MVP) : estimation, cases 2042 RICI, détail chronologique des dons ; `GET /api/exercices/{annee}/pdf`. |
| 2026-07-16 | 2.3     | Claude | Retrait du stat « Report (5 ans) » du tableau de bord (excédent non actionnable — jamais persisté ni réappliqué sur un exercice suivant, cf. EF-043 clarifiée). Pièce jointe désormais ajoutable dès la saisie d'un don (plus seulement en édition). **Mode confidentialité/démo** (EF-064) : bascule dans le bandeau, anonymise bénéficiaires et montants à l'écran (PDF non concerné, actions désactivées tant qu'actif). **Pied de page** (EF-065) : copyright, licence MIT, lien mentions légales (nouvelle page publique `/mentions-legales`). |
| 2026-07-16 | 2.4     | Claude | PDF récapitulatif : ajout d'un **détail agrégé par bénéficiaire** (nombre de dons, total) en fin de document (EF-045). **Jauge de plafond 20 %** sur le tableau de bord (EF-043) : base éligible / plafond en %, avec saisie rapide du revenu imposable directement en contexte si non renseigné — le mode démo anonymise aussi ces deux champs. Moteur fiscal (`lib/fiscal.js`) expose désormais `plafond20`/`baseEligible20` en plus de `reportable`. Confirmé (et vérifié) : plusieurs dons uniques pour un même bénéficiaire sur un même exercice sont déjà supportés nativement (aucune contrainte d'unicité côté API/stockage). |
| 2026-07-17 | 2.5     | Claude | **Isolation du barème par année vérifiée** (règles d'intégrité) : nouvel auto-test `prototype/lib/fiscal.selftest.js` prouvant qu'un changement de barème sur une année N n'affecte jamais N-1/N-2… (ni l'inverse). **Correctif mode démo** : le plafond 20 % et le revenu imposable pouvaient rester identiques aux vraies valeurs (facteur d'échelle par coïncidence proche de 1 sur des montants ronds à l'euro) — `fauxMontant` applique désormais un décalage additif garanti (≥ 5 €) en plus de l'échelle, et l'initialisation régénère les paramètres démo s'ils sont absents au chargement. **IHM** : retrait de la mention « Prototype de test — implémentation cible en Rust » (bandeau et « À propos »), devenue hors de propos sur l'instance réellement utilisée ; le plan d'implémentation cible Rust reste inchangé dans ces specs. |
| 2026-07-17 | 2.6     | Claude | **Récapitulatif des barèmes par exercice** (EF-046, nouveau) dans Paramètres — règles réellement appliquées à chaque exercice créé, avec année source en cas d'héritage ; nouvel endpoint `GET /api/baremes/{annee}` (déjà esquissé dans `api.md`), `fiscal.anneeSourceBareme()` exporté. **Revenu imposable dédupliqué** : ne se saisit/modifie plus que depuis le tableau de bord (jauge + icône ✏️) — retiré de Paramètres, qui n'en avait plus l'usage. **Taux de 20 % jamais affiché en dur** : `plafondPct20` dérivé du barème de l'année (`gGen.plafond.valeur`), pour rester juste si le taux légal change sur un exercice futur. **Terme « Revenu imposable » vérifié** sur Légifrance (art. 200 CGI, 1 : « … dans la limite de 20 % du revenu imposable ») — c'est le terme légal exact, entrée glossaire ajoutée. |
| 2026-07-17 | 2.7     | Claude | **Correctif mode démo (régression du 2.5)** : le décalage additif introduit pour empêcher une coïncidence avec la vraie valeur cassait la cohérence des totaux affichés (somme des cases 2042 RICI ≠ total donné, somme du détail par régime ≠ réduction totale) — repéré sur capture d'écran par l'utilisateur. `fauxMontant` revient à une **échelle pure** (aucun terme additif), qui préserve `fauxMontant(a) + fauxMontant(b) ≈ fauxMontant(a+b)` ; le risque de coïncidence est éliminé autrement, en garantissant un écart d'au moins 20 % avec 1 lors du tirage du facteur (au lieu d'un facteur libre entre 0,6 et 1,8). Testé : dérive résiduelle ≤ 1 € (arrondi à l'euro près) sur 20 000 tirages, zéro coïncidence de valeur. |
| 2026-07-17 | 2.8     | Claude | **Mode démo simplifié à la demande de l'utilisateur** : abandon des valeurs factices (échelle + facteur) au profit d'un **masquage simple** — tout montant saisi ou calculé à partir d'un montant saisi s'affiche `*****` (nouvelle fonction `fmtDemo`, utilisée à la place de `fmt` uniquement sur les données personnelles). Supprime toute la mécanique de facteur/coïncidence des versions précédentes (2.5–2.7) : plus aucun calcul, donc plus aucun risque d'incohérence arithmétique. Les **pourcentages restent affichés** (plafond, taux) — ce ne sont pas des montants. Les **constantes du barème** (plafonds légaux Coluche/partis dans le récap Paramètres) restent visibles : ce ne sont pas des données personnelles. L'**historique pluriannuel est masqué en bloc** en mode démo : la hauteur des barres refléterait les vrais montants même texte caché. |
| 2026-07-17 | 2.9     | Claude | Correctif : le **%** de la jauge de plafond est lui aussi un calcul déduit de montants saisis (base/plafond) — masqué en bloc en mode démo, y compris la barre de progression et le message de dépassement (dont la simple présence révélerait un fait déduit des vraies valeurs). Confirmé sur demande : le plafond de 20 % **fait déjà partie du barème par exercice** (`BAREMES[année].regimes.ir_general.plafond`) — aucune valeur codée en dur ailleurs (vérifié par recherche), déjà exposé dans la jauge (EF-043) et le récap Paramètres (EF-046). Décision actée : **backend Rust reporté** — le MVP Node reste la base tant que Rust/Docker ne sont pas disponibles en local. |
| 2026-07-17 | 3.0     | Claude | PDF récapitulatif (EF-045) : le détail par bénéficiaire passe d'un tableau à colonnes fixes à des blocs par bénéficiaire, pour pouvoir afficher **toutes les coordonnées disponibles** (SIREN/RNA, adresse, téléphone, site web, email — chacune omise si non renseignée) sous la ligne titre (nom, case, nombre de dons, total). |
| 2026-07-19 | 3.1     | Claude | **Refonte IHM responsive + factorisation** (retours utilisateur sur smartphone) : (1) **tables responsives** — sur écran étroit (< 640 px) chaque ligne devient une carte empilée libellé/valeur (attribut `data-label`), le graphique et les tableaux larges scrollent dans leur propre conteneur ; topbar et en-têtes de cartes en flex. (2) **Vue détail au clic** — toucher un don (tableau de bord) ou un bénéficiaire (référentiel) ouvre une **modale lecture seule complète** (tous les champs saisis, pièces jointes, boutons Éditer/Supprimer). (3) **Saisie par bouton** — suppression des cartes de saisie permanentes « Ajouter un don / Nouveau bénéficiaire » au profit d'un **bouton « ＋ Ajouter… » en tête de section** ouvrant une **modale unique partagée création + édition** (`donModal`, `benefModal` — factorisation : un seul formulaire par entité ; la création garde fréquence + création de bénéficiaire en ligne + PJ à la volée, l'édition garde la gestion complète des PJ ; suivi et archivage édités dans la modale bénéficiaire). (4) **PDF récapitulatif (EF-045)** : « Détail par bénéficiaire » redevient un **vrai tableau** cohérent avec « Détail des dons » (en-tête, zébrage, ligne de total), les coordonnées rendues en **sous-ligne discrète pleine largeur** sous chaque bénéficiaire ; **nouvelle 3ᵉ section « Pièces jointes »** = sommaire numéroté des justificatifs (n°, date, bénéficiaire, montant, n° reçu, type) **suivi des reçus image intégrés** au document (une page par pièce), les PDF étant listés au sommaire et signalés joints séparément (pdfkit n'inclut pas de page PDF), avec filet de sécurité si un fichier est illisible/introuvable. MVP Node testé de bout en bout (fixture 105,60 € préservée, image PNG valide intégrée en XObject vérifiée). |
| 2026-07-19 | 3.2     | Claude | **Correctif rendu mobile des modales (« ghosting »)** signalé par l'utilisateur (capture : modale « Détail du don » dédoublée, texte superposé illisible — « 50,00 € » → « 0 € », « 2025‑11‑28 » → « 2‑28 »). Cause : la modale est en `position:fixed` mais **la page derrière restait défilable**, si bien que certains navigateurs mobiles la repeignaient à deux positions décalées (une seule modale dans le DOM, peinte deux fois — pas un doublon de données). Correction : **verrou de défilement du fond** (`overflow:hidden` sur `<html>` et `<body>` via une classe `modal-open` posée/retirée par `openModal`/`closeModal`), overlay promu sur sa propre couche de composition (`translateZ(0)`, `overscroll-behavior:contain`), et `closeModal` durci (retrait de **tout** backdrop résiduel + restauration systématique du défilement). Vérifié : 1 seul backdrop à l'ouverture, fond verrouillé, défilement restauré à la fermeture, enchaînement détail → Éditer sans fuite. |
| 2026-07-19 | 3.3     | Claude | **PDF récapitulatif — intégration réelle des reçus (EF-045)** : ajout de la dépendance **pdf-lib** (JS pur, compatible ARM). Le PDF est désormais produit en **deux passes** : (1) pdfkit construit le rapport (estimation, cases, détail des dons, détail par bénéficiaire, **sommaire** des pièces jointes) dans un buffer ; (2) **pdf-lib annexe les justificatifs eux-mêmes** — reçus **image** intégrés (embedPng/embedJpg, y compris des PNG que pdfkit refusait) **et pages des reçus PDF réellement importées** (`copyPages`) derrière une page de garde numérotée. Filet de sécurité conservé (fichier illisible/introuvable → note). Route `/exercices/:annee/pdf` passée en async avec gestion d'erreur. Testé localement : reçu PDF 1 page → page importée présente ; images intégrées en XObject vérifiées ; 5 pages cohérentes. **Retrait des hints GPU** (`translateZ`/`backface-visibility`) ajoutés en 3.2 sur l'overlay (pouvaient aggraver un ghosting de composition sur certains pilotes) ; le verrou de défilement (3.2) suffit. **Déployé sur le RPi2** (build `npm ci` OK, pdf-lib installé, conteneur `listdons_app` healthy, garde-fou d'isolation passé). |
| 2026-07-19 | 3.4     | Claude | **Correctif PDF (régression 3.3 sur données réelles)** : la génération du récap 2026 échouait (`ERR_INVALID_RESPONSE` / page blanche). Cause identifiée dans les logs : `WinAnsi cannot encode "" (0x0080)` — une pièce jointe portait, dans son nom, un **caractère de contrôle C1 (U+0080)** que `winsafe()` laissait passer (il ne filtrait que `> 0xFF`, or WinAnsi ne sait pas encoder 0x80–0x9F), donc `drawText` (page de garde pdf-lib) jetait. Aggravé par l'ordre d'envoi : les en-têtes PDF étaient posés **avant** la fusion, d'où une réponse tronquée côté client. Corrections : (1) **`winsafe` réécrit** en filtre par codepoints (source 100 % ASCII, sans caractères invisibles fragiles) — supprime les contrôles C0/C1, mappe la ponctuation « intelligente »/€, remplace le hors-WinAnsi par « ? » ; (2) **chaque pièce jointe isolée dans un `try/catch`** (une PJ défaillante n'interrompt plus tout le récap) ; (3) **en-têtes HTTP posés après** la construction complète du buffer (une erreur renvoie désormais un 500 propre). Vérifié **sur les vraies données du RPi2** (exécution hors-ligne dans le conteneur) : récap 2026 = 3 pages, 2025 = 8 pages, zéro erreur ; fichiers temporaires (données personnelles) supprimés après contrôle. Redéployé. |
| 2026-07-19 | 3.5     | Claude | **Durcissement « passage en prod » — étape 1/2** (le MVP n'est plus jetable ; objectif : robustesse à évolutions minimales, sans changer d'archi ni migrer vers SQLite/Rust). (1) **Écriture atomique de `db.json`** (`store.js`) : fichier temporaire + `fsync` + `rename`, avec conservation d'un **`.bak`** avant chaque écriture et **récupération automatique** au chargement si `db.json` est corrompu (protège des coupures de courant du RPi — testé : corruption simulée → base restaurée). (2) **Rate-limiting + verrouillage** de `/api/login` (fenêtre glissante par IP, 8 essais / 15 min, fait main — zéro dépendance ; testé : 8×401 puis 429). (3) **En-têtes de sécurité** (middleware fait main) : CSP stricte (`script-src 'self'`, `style-src 'unsafe-inline'` pour les styles inline, `img-src data:` pour le favicon), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`. Le `<script>` inline de la page mentions légales est supprimé (année rendue côté serveur via placeholder) pour rester compatible CSP. (4) **Validation serveur stricte** : montant (entier ≥ 0, plus de `NaN` en base), date (`AAAA-MM-JJ` réelle), catégorie fiscale (enum fermé), fréquence récurrente, existence du bénéficiaire — testé (montant/date/benef invalides → 400). **Zéro dépendance ajoutée, aucun changement d'archi.** Non-régression vérifiée (UI sous CSP sans erreur console, PDF OK). **Étape 2 à venir** (après validation utilisateur) : **HTTPS LAN via Caddy `tls internal`** (cookie `Secure`, chiffrement du trafic), dans le respect de l'isolation 5Hostachy (jamais 80/443). |
| 2026-07-19 | 3.6     | Claude | **« Mot de passe oublié » + clarifications de l'écran de connexion** (demande utilisateur). (1) L'identifiant est explicité comme un **email** : champ `type="email"`, libellé « Email * ». (2) **Légende « * champ obligatoire »** ajoutée sous le formulaire (connexion et réinitialisation). (3) **Réinitialisation locale sans SMTP** (conforme à [`authentification.md`](specs/web/authentification.md) § Réinitialisation) : lien « Mot de passe oublié ? » → saisie de l'email → `POST /api/forgot` génère un **code à usage unique** (8 hex, 15 min, 5 essais max) et l'**inscrit dans le journal du serveur** (l'accès machine = preuve de légitimité pour le foyer) ; l'écran révèle alors la saisie du code + nouveau mot de passe → `POST /api/reset`. Réponses **non énumérantes** (identique que le compte existe ou non). Endpoints hors auth, protégés par le throttle existant. Compte de démo (`seed.js`) passé en email `demo@list-dons.fr` / `demo123` pour rester cohérent avec le champ email. Testé de bout en bout (email inconnu → aucun code ; bon email → code au log ; mauvais code → 400 ; bon code → 200 ; ancien mdp invalidé ; code non rejouable) + IHM au navigateur sans erreur CSP. |
| 2026-07-19 | 3.7     | Claude | **Abandon définitif de la cible Rust/SvelteKit/SQLite** (décision utilisateur : « je ne le ferai pas »). Le **MVP Node.js/Express + JS vanilla + fichier JSON**, déployé et en usage réel depuis des mois, devient l'**implémentation retenue** — il n'y aura pas de réécriture Rust. **§8 réécrit** : « Architecture technique (proposition, en Rust) » → « Architecture technique (Node.js — implémentation retenue) », décrivant la stack réelle (Express, `lib/store.js` avec écriture atomique, JS vanilla, pdfkit/pdf-lib) au lieu d'une cible hypothétique. Conséquences directes de cet abandon, alignées dans `SPECIFICATIONS.md` et `specs/` (`README.md`, `architecture/stack.md`, `architecture/vue-ensemble.md`, `architecture/principes-code.md`, `architecture/api.md`, `architecture/modele-donnees.md`, `web/exigences-non-fonctionnelles.md`) : **hachage Argon2 → bcrypt** (Argon2 n'était retenu que comme « équivalent Rust moderne de bcrypt » ; bcrypt est ce que l'app utilise réellement) ; **persistance SQLite → fichier JSON** ; retrait des outillages Rust (`cargo`/`clippy`/`rustfmt`/`sqlx`/`cargo-about`) remplacés par leurs équivalents Node réels ou notés « à définir si besoin ». Les entrées de journal antérieures (0.2 à 3.5) qui actaient la cible Rust reflètent l'état des décisions à leur date et **restent inchangées** (registre historique) ; c'est cette entrée qui acte le changement de cap. Le README racine avait déjà été aligné dans un commit précédent. |
| 2026-11-03 | 3.8     | Claude | **Barème sourcé et corrigé** (tickets #6, #2, audit du 03/11/2026) : chaque valeur porte sa source officielle datée (`SOURCES` dans `lib/fiscal.js`, refusé sans elle par l'auto-test). **Deux surestimations corrigées** : (1) plafond « Coluche » 2025 ramené à **1 000 €** (2 000 € seulement pour les dons à compter du 14/10/2025, répartition intra-année non documentée → prudence) et millésime **2026 propre** à 2 000 € ; (2) dons aux **partis** désormais **dans** la limite des 20 % du revenu, partagée avec l'intérêt général. Bascule de l'art. 200 au 01/09/2026 vérifiée : sans effet. Plafond des dons de campagne (4 600 € par élection) sourcé. |
| 2026-11-05 | 3.9     | Claude | **Type des reçus contrôlé** (ticket #17) : un justificatif n'est admis que si ses premiers octets sont ceux d'un PDF, d'un JPEG ou d'un PNG (`prototype/lib/justificatifs.js`) ; sinon HTTP 415 et fichier effacé. Le type enregistré et servi est celui des octets ; le téléchargement est toujours une pièce jointe, et un reçu d'avant ce contrôle au type non admis est servi en `application/octet-stream`. L'écran signale le refus au lieu d'échouer en silence. Tests : `test/justificatifs.test.js`. |
| 2026-11-05 | 3.10    | Claude | **Version visible** (ticket #18) : la version de `prototype/package.json`, lue en un seul endroit du serveur, est servie par `/api/session` (sans connexion) et affichée en pied de page de l'application et des mentions légales ; elle prouve après un déploiement ce qui tourne (`deploy/README.md`, « Exploitation »). Test : `test/version.test.js`. Le lien du pied de page ne se coupe plus sur mobile. |
| 2026-11-05 | 3.11    | Claude | **Cultes sourcés** (ticket #19) : la fin du taux de 75 % (versements du 02/06/2021 au 31/12/2022, loi n° 2021-953 art. 18) et le régime actuel (art. 200, 1, e) du CGI, absent du 1 ter, version du 21/02/2026) sont vérifiés sur Légifrance et cités au §6.2 ; « à ma connaissance » retiré. Aucun changement du moteur : ces dons restaient en `ir_general` (66 %). `.gitignore` débarrassé des sections de la cible abandonnée. |

---

## 1. Objectif

**List-dons** est une application **web** permettant de **centraliser les dons** et **toutes les données utiles à l'imposition annuelle** (réduction d'impôt sur le revenu au titre des dons, France).

Pour une **année d'imposition** donnée, l'application doit permettre :

1. de **saisir les dons** ouvrant droit à réduction d'impôt ;
2. de connaître le **montant total par organisme** ;
3. d'estimer la **réduction d'impôt probable**.

L'ensemble reste **simple, moderne, responsive**, **open source**, et **conforme** (juridique + RGPD).

---

## 2. Principes directeurs

> **Inspiration** : l'IHM, les patterns UX et les bonnes pratiques de mise en production s'inspirent de **5Hostachy** (application web française mature, auto-hébergée). Ces spécifications sont **instanciées à List-dons** : le contenu, les exemples et les règles sont propres à l'application des dons — 5Hostachy n'est qu'une source d'inspiration, pas une base copiée.

List-dons applique un socle de qualité cohérent sur tout le projet :

| Domaine | Principe retenu |
|---|---|
| **Structure specs** | Spécifications versionnées, éclatées par domaine dans `specs/` (voir §12) |
| **Design system** | Charte graphique complète : palette, typo système sans CDN, grille 4 px, dark mode, WCAG 2.2 AA (voir §9) |
| **Patterns UX** | Cartes expansibles, pills, onglets, badges, conventions de formulaires, icônes emoji (voir §9) |
| **Stack** | Backend **Node.js/Express**, front **JS vanilla**, persistance **fichier JSON** (écriture atomique), reverse proxy Caddy (prévu), Docker Compose (voir §8) |
| **MEP / Ops** | CI GitHub Actions, Docker, auto-déploiement, sauvegardes testées, versioning SemVer (voir §11) |
| **Sécurité** | JWT cookie HttpOnly, hachage bcrypt, rate limiting, CSP, headers, validation serveur, audit OWASP (voir §10) |
| **Conformité** | RGPD, LCEN (mentions légales), inventaire licences (REUSE), éco-conception (voir §10) |

---

## 3. Périmètre (scope)

### Dans le périmètre (MVP)
- Gestion **multi-années d'imposition** (chaque don rattaché à une année).
- CRUD **dons** et **organismes bénéficiaires** (référentiel réutilisable).
- Agrégation **par organisme** et **par catégorie fiscale**.
- **Estimation** de la réduction d'impôt (taux/plafonds **paramétrables et datés par année**).
- Stockage des **reçus fiscaux** joints.
- Application **mono-foyer fiscal** au départ (auth simple).

### Hors périmètre (voir §7 pour extensions)
- Télédéclaration / connexion aux impôts.
- Mécénat d'entreprise (art. 238 bis CGI).
- Émission de reçus côté organisme.
- Conseil fiscal personnalisé (l'app **estime**, ne conseille pas).

---

## 4. Utilisateurs et cas d'usage

- **Donateur / foyer fiscal** (utilisateur principal).
- Cas d'usage :
  - « J'ai fait un don, je le note tout de suite. »
  - « Combien ai-je donné à tel organisme cette année ? »
  - « Quelle réduction d'impôt puis-je espérer pour l'année N ? »
  - « Quelles cases de la déclaration remplir, avec quels montants ? »
  - « Où sont mes reçus fiscaux, lesquels manquent ? »

---

## 5. Modèle de données (compréhension)

> **Conventions** : montants stockés en **entiers (centimes)** — jamais de flottant pour l'argent (bonne pratique métier : pas d'erreur d'arrondi). Dates de versement en `date`. Clés étrangères + contraintes actives.

**Utilisateur** *(compte unique — mono-foyer)* : identifiant (email) ; mot de passe haché **bcrypt** ; dates. Authentification détaillée en [`specs/web/authentification.md`](specs/web/authentification.md).

**AnnéeImposition** (= exercice fiscal) : année ; revenu imposable estimé (optionnel, pour le plafond 20 %) ; statut (en cours / clôturée).

**Bénéficiaire** *(terme canonique — l'entité qui reçoit le don ; « organisme » en synonyme)* : **référentiel réutilisable et indépendant de l'année**. Champs : nom ; identifiant (SIREN/RNA, optionnel) ; **catégorie fiscale** = *enum fermé* pointant vers un `code régime` (liste exhaustive en **§6.2** : `ir_general`, `ir_coluche`, `ir_partis`, `ir_campagne`, `ifi_dons`, `is_mecenat`…) ; habilité à délivrer des reçus (bool) ; adresse, téléphone, URL, email (coordonnées, optionnelles) ; notes ; **indicateur de suivi** (de confiance / neutre / à surveiller / à éviter) ; actif/archivé ; **0..n appréciations**.
- On saisit les infos d'un bénéficiaire **une seule fois** ; ensuite on le **sélectionne** (voir §5.1). Il est **partagé entre toutes les années** : un même bénéficiaire peut recevoir des dons en 2025, 2026, 2027…

**AppreciationBeneficiaire** *(journal daté — suivi qualitatif)* : rattachée à un **Bénéficiaire** ; date ; **ton** (positif / neutre / déçu) ; commentaire. Permet de **noter et commenter les actions** d'un bénéficiaire dans le temps (ex. une action décevante) pour éclairer la décision de renouvellement. **Informatif — aucun impact fiscal.**

**Don** : rattaché à une **AnnéeImposition** + un **Bénéficiaire** ; date de versement ; montant (centimes) ; moyen de paiement (chèque, CB, virement, espèces, don en nature, abandon de frais) ; n° de reçu (optionnel) ; **un ou plusieurs justificatifs** rattachés (voir **§5.3**) ; **note/raison facultative** *(le champ note tient lieu de « raison du don » — pas de champ séparé, cf. factorisation)*.

**Justificatif** : rattaché à un **Don** ; fichier (PDF/JPG/PNG) stocké localement ; métadonnées (chemin, type, taille, hash, n° de reçu, date d'ajout). Détails en **§5.3**.

**Règles d'intégrité**
- L'année d'imposition d'un don découle de sa **date de versement**.
- Les **taux/plafonds sont versionnés par année** — jamais codés en dur (table `bareme_fiscal` datée).
- Un bénéficiaire **référencé par au moins un don** n'est pas supprimé (on l'**archive**, pattern « archiver plutôt que supprimer »).

### 5.1 Réutilisation des bénéficiaires (saisie sans répétition)

**Sélection d'un bénéficiaire existant.** À la saisie d'un don, le champ « Bénéficiaire » est un **sélecteur avec autocomplétion** sur le référentiel :
- L'utilisateur tape quelques lettres → liste des bénéficiaires connus correspondants → il en **sélectionne un** : toutes ses infos (catégorie fiscale, SIREN, habilitation reçu…) sont **reprises automatiquement**, aucune ressaisie.
- S'il n'existe pas → **« + Créer un bénéficiaire »** en ligne, qui l'ajoute au référentiel pour toutes les fois suivantes.
- Anti-doublon : à la création, alerte si un nom très proche existe déjà.

**Rappel des bénéficiaires de l'année précédente (comparatif + aide à la saisie).** À l'ouverture d'un **nouvel exercice fiscal** (année N), l'application affiche un **rappel des bénéficiaires de l'année N-1** :
- Liste des bénéficiaires auxquels des dons ont été faits en N-1, avec **montant total N-1** par bénéficiaire.
- Pour chacun : action rapide **« Reporter / ajouter un don en N »** (pré-remplit le bénéficiaire, il ne reste que le montant et la date) — utile pour les dons récurrents.
- **Comparatif N vs N-1** par bénéficiaire au fil de la saisie : colonne N-1, colonne N, écart (€ et %), et statut *(reconduit / nouveau / non renouvelé)*.
- Un bénéficiaire N-1 sans don en N est signalé *(« non renouvelé cette année »)* — simple information, pas d'alerte bloquante.

> Cadré via les patterns UI du projet : sélecteur = autocomplétion ; rappel N-1 = liste de **cartes expansibles** ; comparatif = tableau avec badges de statut.

### 5.2 Profil fiscal du foyer (paramètres) — *simplicité par défaut*

L'utilisateur cible est un **particulier non-expert**. L'app démarre dans son cas le plus simple et **n'affiche la complexité que si un paramètre l'active** (divulgation progressive).

**ProfilFiscal** (réglages, une seule fois, modifiables) :
- `assujetti_ifi` : **non** par défaut. Si activé → débloque le module IFI (art. 978, §6.2-B) et ses régimes ; sinon **totalement masqué**.
- (réservé pour extensions futures — jamais de mécénat entreprise : hors périmètre.)

**Principes produit pour le non-expert :**
- **Mode simple par défaut** : parcours = saisir un don → voir sa réduction estimée. Les régimes rares (partis, campagne, frais de bénévolat) restent accessibles mais non mis en avant.
- **Langage clair** + infobulles d'explication (« Pourquoi 66 % ? », « Qu'est-ce que le plafond de 20 % ? »).
- **Principe de prudence** : en cas d'incertitude sur un taux/plafond, l'estimation **sous-estime** plutôt qu'elle ne sur-estime — ne jamais faire espérer une réduction non garantie.
- **Avertissement permanent** : « Estimation indicative, ne remplace pas votre déclaration officielle ni un conseil fiscal. »

### 5.3 Justificatifs (reçus fiscaux) — gérés dans l'application

Les **justificatifs de dons sont pris en charge par l'app** : ils y sont **stockés, rattachés au don, consultables et conservés** (l'administration peut les réclamer plusieurs années après).

- **Attachement** : chaque **Don** peut porter **un ou plusieurs justificatifs** (reçu CERFA/PDF, image scannée/photo). Formats acceptés : **PDF, JPG, PNG**, reconnus par la **signature** du fichier (premiers octets), jamais par le type annoncé ni l'extension ; tout autre contenu est refusé (HTTP 415) et effacé ; taille max 15 Mo (`prototype/lib/justificatifs.js`, `server.js`).
- **Stockage local** : fichiers dans `uploads/` du volume `listdons_data` (hors base), **nom de fichier assaini** + identifiant unique (protection **path traversal**, cf. §10). La base ne stocke que les métadonnées (chemin, type, taille, hash, n° de reçu, date d'ajout).
- **Métadonnées de reçu** : n° de reçu, date du versement, montant, émetteur — saisis ou **pré-remplis par lecture du fichier** (cf. OCR/contrôle de cohérence, backlog §7).
- **Consultation** : prévisualisation / téléchargement du justificatif depuis la fiche du don et depuis la synthèse annuelle.
- **Statut** : chaque don affiche **reçu présent / manquant** ; un **rappel des reçus manquants** est proposé avant la déclaration (backlog §7).
- **Sauvegarde & export** : les justificatifs sont **inclus dans la sauvegarde quotidienne** (§11) et dans l'**export de portabilité RGPD** (les fichiers accompagnent le CSV/JSON, §7).
- **Conservation & suppression** : conservés au moins la **durée de reprise fiscale** ; suppression possible par l'utilisateur (droit RGPD), avec confirmation.

> **Leçon (cas rencontré)** : un justificatif attaché est **vérifié** contre le don (montant/date/organisme) et l'app refuse d'enregistrer comme don un document hors périmètre (ex. attestation PER art. 163 quatervicies) — cf. §7.

### 5.4 Dons uniques vs récurrents

Un don peut être **unique** (un seul versement) ou **récurrent** (échéances répétées). L'app **suit** l'engagement — elle ne prélève pas.

**Fréquences** : `unique` · `mensuel` · `trimestriel` · `annuel`.

**Modèle (factorisé)**
- **DonRecurrent** *(engagement / générateur)* : bénéficiaire, **montant par échéance** (centimes), fréquence, jour d'échéance, **date de début**, **date de fin** (optionnelle), moyen de paiement, note, **statut** (actif / arrêté).
- Un DonRecurrent **génère un `Don` par échéance** (entité `Don` existante), chacun avec sa **date de versement** → **rattaché automatiquement à son année d'imposition**. Chaque `Don` généré garde un lien vers son `DonRecurrent` (traçabilité).
- **Les `Don` restent la source de vérité** : un versement peut être **modifié ou supprimé** (prélèvement échoué, montant changé). Le calcul fiscal se fonde sur les **`Don` réels**, jamais sur l'échéancier théorique.

**Gestion de l'année d'imposition (le point clé)**
- Un engagement qui court sur plusieurs années produit des `Don` **répartis par année selon leur date** : ex. mensuel démarré en oct. 2025 → 3 versements en 2025, 12 en 2026, etc. Aucune règle spéciale : le moteur (§6) applique déjà le barème **par date de versement** (y compris les seuils datés comme le 14/10/2025).
- **Reçu fiscal** : pour un récurrent, l'organisme émet en général **un reçu annuel récapitulatif**. L'app permet donc d'attacher **un justificatif annuel** couvrant l'ensemble des versements de l'année (voir §5.3), plutôt qu'un reçu par échéance.

**Génération des échéances (simple, sans planificateur)**
- Matérialisation **paresseuse** : à l'ouverture d'un exercice, l'app crée les `Don` des échéances **échues** (date ≤ aujourd'hui). Pas de tâche de fond (anti-complexité).
- Estimation : compte les **versements réalisés** (échus). Une **projection annuelle** (« si l'engagement continue jusqu'au 31/12 ») peut être affichée, **clairement étiquetée comme prévisionnelle** (principe de prudence).

**Arrêter un don récurrent**
- **Bouton « Arrêter »** (ou date de fin) → statut `arrêté` : **plus aucune échéance générée** après la date d'arrêt ; les versements passés sont **conservés**.
- **Rappel affiché** : l'arrêt dans l'app ne résilie pas le prélèvement réel — **penser à le résilier auprès de l'organisme / la banque**.

---

## 6. Règles fiscales — **moteur modulaire par année et par date d'effet**

> Base : art. **200 du CGI**, version en vigueur issue de la **loi de finances 2026** (loi n° 2026-103 du 19 février 2026).
> Source officielle : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543932
> ⚠️ L'app fournit une **estimation**, non une valeur opposable à l'administration.

### 6.1 Principe : barème = donnée, jamais code

Le calcul ne code **aucun taux ni plafond en dur**. Tout est décrit dans une **table de barèmes datée** (`bareme_fiscal`) que l'on peut ajouter/modifier chaque année **sans toucher au code**.

Point confirmé lors de la vérification Légifrance : un même millésime peut contenir **plusieurs plages de dates** (ex. le plafond « Coluche » passe de 1 000 € à **2 000 €** pour les dons **effectués à compter du 14 octobre 2025**). Le moteur applique donc le barème selon la **date de versement du don**, pas seulement l'année.

**Règle d'héritage (décidée)** : si **aucun barème spécifique** n'est défini pour une année N, le moteur **hérite automatiquement du barème de l'année N-1** (dernier millésime connu). On ne crée un nouveau millésime que lorsqu'une loi de finances introduit un changement. Ainsi l'app reste correcte tant qu'aucune nouvelle règle n'est publiée, et il suffit d'ajouter une ligne pour la prendre en compte.

**Structure d'un barème (conceptuelle)**
```
Bareme {
  annee_imposition,                 # ex. 2025
  regimes: [ Regime {
    code,                           # "general" | "coluche" | "partis" | ...
    libelle,
    taux,                           # ex. 0.66 / 0.75
    plafond: { type, valeur },      # type = "pct_revenu" (0.20) | "montant" (2000€) | "aucun"
    date_effet_debut, date_effet_fin,  # plages intra-annuelles (ex. 14/10/2025 →)
    ordre_application,              # les 75% consomment leur plafond avant bascule
    bascule_vers,                   # régime de repli au-delà du plafond (ex. "general")
    case_declaration,              # ex. "7UD" / "7UF" (à compléter/dater)
    categories_eligibles,          # types d'organismes concernés
  } ],
  report { actif: true, annees: 5 }
}
```

### 6.2 Typologie complète des cas de déduction (à couvrir par le moteur)

> Objectif : **prévoir tous les cas**. Chaque **catégorie d'organisme** saisie sur une fiche `Organisme` est rattachée à **un régime**, qui porte taux + plafond + case de déclaration. Le régime **général** vérifié via Légifrance (art. 200 CGI) ; les cas marqués *(à vérifier)* reposent sur d'autres articles à confirmer/dater avant mise en production.

**A. Réduction d'impôt sur le revenu — art. 200 CGI** *(cœur du MVP, vérifié)*

| Code régime | Catégories d'organismes couvertes | Taux | Plafond |
|---|---|---|---|
| `ir_general` | Fondations/associations **RUP** (a) ; **œuvres/organismes d'intérêt général** — philanthropique, éducatif, scientifique, social, humanitaire, sportif, familial, culturel, égalité F/H, patrimoine artistique, environnement, diffusion de la culture/langue française (b) ; **enseignement supérieur / artistique** d'intérêt général et consulaire (c) ; organismes agréés 238 bis-4 (d) ; **associations cultuelles et de bienfaisance**, cultes reconnus d'Alsace-Moselle (e) ; **spectacle vivant / art contemporain** (f) ; **pluralisme de la presse** (f bis) ; **gestion forestière durable** communes/syndicats (f ter) ; **fonds de dotation** (g) ; **Fondation du patrimoine** — travaux (2 bis) ; organismes **UE/EEE agréés** (4 bis) ; **sauvegarde de biens culturels** en conflit armé (6) | **66 %** | **20 % du revenu imposable** (excédent reportable **5 ans**) |
| `ir_general_fondation_entreprise` | Dons des **salariés/mandataires sociaux** à la **fondation d'entreprise** de leur groupe (a) | **66 %** | sous-plafond **1 500 €** puis relève de `ir_general` |
| `ir_coluche` | Organismes **repas gratuits / aide au logement / soins gratuits** aux personnes en difficulté ; **accompagnement & relogement des victimes de violence domestique** (1 ter) | **75 %** puis bascule `ir_general` | **2 000 €** (hors la limite des 20 %) |
| `ir_partis` | **Cotisations et dons aux partis** politiques via mandataire (3) | **66 %** | **15 000 €** / foyer (dons + cotisations cumulés), **dans** la limite des 20 % du revenu ([F427](https://www.service-public.gouv.fr/particuliers/vosdroits/F427)) |
| `ir_campagne` | **Dons de campagne** (association de financement électorale / mandataire financier) (3) | **66 %** | dons retenus dans la limite de **4 600 € par élection** ([F427](https://www.service-public.gouv.fr/particuliers/vosdroits/F427), vérifiée le 15/04/2026) — régime **non implémenté** dans le moteur |
| `ir_frais_benevolat` | **Frais de bénévolat** avec renonciation au remboursement (barème kilométrique) | **66 %** | dans `ir_general` (20 %) |

> **Cas des associations cultuelles** : le taux **75 %** était un dispositif **temporaire**, pour les versements **du 2 juin 2021 au 31 décembre 2022** ([loi n° 2021-953 du 19 juillet 2021 de finances rectificative, art. 18](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000043805899)). Dans la version de l'[art. 200 du CGI](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543932) en vigueur depuis le 21/02/2026, les associations cultuelles figurent au **1, e)** (taux de droit commun) et **ne figurent pas au 1 ter** (75 %) — vérifié le 05/11/2026. → **`ir_general` (66 %)**, à re-vérifier à chaque nouvelle loi de finances (veille LF 2027, §13).

**B. Réduction d'IFI — art. 978 CGI** *(désactivé par défaut — voir le profil fiscal §5.2)*

Ne concerne que les foyers **assujettis à l'IFI** (patrimoine immobilier net > 1,3 M€). **Masqué tant que le paramètre « assujetti IFI » est décoché.** Le moteur le supporte (barème séparé) mais il **n'apparaît pas** dans le parcours d'un particulier standard.

| Code régime | Organismes | Taux | Plafond | Règle clé |
|---|---|---|---|---|
| `ifi_dons` | Fondations RUP, ESUS, établissements de recherche… éligibles 978 | **75 %** | réduction plafonnée à **50 000 €** *(à vérifier avant activation)* | **non-cumul** : une même somme n'ouvre pas droit à la fois à la réduction IR (200) **et** IFI (978) |

**C. Mécénat d'entreprise — art. 238 bis CGI** — ❌ **HORS PÉRIMÈTRE**

Réservé aux **entreprises**. L'application cible un **particulier** → **non implémenté** (ni MVP, ni backlog actif). Mentionné ici seulement pour mémoire.

> **Conséquence pour le moteur** : le champ « catégorie fiscale » d'un `Bénéficiaire` est un **enum fermé** ; chaque cas pointe vers un `code régime` du barème de l'année. Les régimes IFI ne sont proposés **que si** le profil fiscal l'active. Ajouter un cas = 1 entrée d'enum + 1 ligne de barème, **sans changer l'algorithme** (§6.6).

### 6.3 Barème 2025 (revenus 2025 · déclaration 2026)

| Régime | Taux | Plafond | Case 2042 RICI | Notes |
|---|---|---|---|---|
| **`ir_general`** | **66 %** | **20 % du revenu imposable** | **7UF** | excédent reportable 5 ans |
| **`ir_coluche`** | **75 %** puis bascule **66 %** | **1 000 €** retenu par le moteur. La loi fixe 1 000 € avant le 14/10/2025 et **2 000 €** à compter de cette date (BOFiP ACTU-2026-00019), mais la répartition d'une même année entre les deux plafonds n'est pas documentée : **prudence**, l'estimation sous-estime | **7UD** | plafond hors des 20 % |
| **`ir_partis`** | **66 %** | **15 000 €** (dons + cotisations aux partis), **et** dans la limite des 20 % du revenu partagée avec `ir_general` | **7UH** | fraction au-delà de 15 000 € non reportable |
| **`ir_campagne`** | **66 %** | 4 600 € par élection (non implémenté) | 7UH | compte de campagne |

> Cases **usuelles de la 2042 RICI** (voir l'exemple §6.7). Associations cultuelles : **66 %** (`ir_general`, case 7UF) — le dispositif temporaire 75 % a pris fin le 31/12/2022 (sources au §6.2).

### 6.4 Barème 2026 (revenus 2026 · déclaration 2027)

| Régime | Taux | Plafond | Notes |
|---|---|---|---|
| **Général** | **66 %** | **20 % du revenu imposable** | excédent reportable 5 ans |
| **Coluche** (+ violence domestique) | **75 %** puis **66 %** | **2 000 €** (plein exercice) | plafond hors des 20 % |
| **Partis / campagnes** | **66 %** | **15 000 €**, dans la limite des 20 % du revenu | — |

> Les valeurs 2026 reprennent la LF 2026 : millésime **2026 propre** dans le moteur depuis le 03/11/2026 (plafond « Coluche » 2 000 € sur tout l'exercice). Sources : [CGI art. 200](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543932) (version en vigueur depuis le 21/02/2026, loi n° 2026-103), [BOFiP ACTU-2026-00019](https://bofip.impots.gouv.fr/doctrine/pgp/14951-PGP), service-public [F426](https://www.service-public.gouv.fr/particuliers/vosdroits/F426) et [F427](https://www.service-public.gouv.fr/particuliers/vosdroits/F427) — consultés le 03/11/2026. Les mêmes références sont écrites à côté de chaque valeur dans `prototype/lib/fiscal.js` (`SOURCES`), et l'auto-test refuse une valeur sans source. À re-vérifier avant la campagne déclarative 2027 (une LF rectificative peut modifier). Le dispositif temporaire cultes est **à confirmer** pour 2026.

### 6.5 Barème 2027 (revenus 2027 · déclaration 2028) — *provisoire, hérité de 2026*

À la date de rédaction (**15/07/2026**), **aucune règle 2027-spécifique n'existe** : la **loi de finances 2027** n'est pas encore adoptée (vote attendu fin 2026). Par application de la **règle d'héritage** (§6.1), le **barème 2027 = barème 2026** :

| Régime | Taux | Plafond | Notes |
|---|---|---|---|
| **Général** | **66 %** | **20 % du revenu imposable** | reportable 5 ans |
| **Coluche** (+ violence domestique) | **75 %** puis **66 %** | **2 000 €** | plafond hors des 20 % |
| **Partis / campagnes** | **66 %** | **15 000 €**, dans la limite des 20 % du revenu | — |

> ⚠️ **À re-vérifier via Légifrance dès l'adoption de la LF 2027** (fin 2026). Si elle modifie l'art. 200 CGI, créer un millésime 2027 dédié ; sinon, laisser l'héritage 2026 s'appliquer. Bascule de version annoncée au **01/09/2026** : **vérifiée le 03/11/2026**, aucune version de l'art. 200 n'a pris effet à cette date — la version en vigueur au 03/11/2026 est celle du 21/02/2026 (loi n° 2026-103). Ticket #2.

### 6.6 Mécanique d'estimation (algorithme)

1. Rattacher chaque don à un **régime** (via la catégorie de son **bénéficiaire**) et sélectionner le **barème applicable à sa date de versement**.
2. Appliquer d'abord les **sous-plafonds spécifiques** (ex. `ir_general_fondation_entreprise` 1 500 €) : le surplus bascule vers le régime de repli.
3. Pour chaque régime à taux majoré (**75 %** : `ir_coluche`) : appliquer le taux **dans la limite de son plafond** ; le **surplus bascule** vers `ir_general`.
4. Ramener les régimes à **plafond en euros** à leur plafond (`ir_partis` 15 000 €, `ir_campagne`), puis les soumettre à la limite des 20 % **partagée** avec `ir_general`, qui la consomme en premier (même taux : même réduction). La fraction des dons aux partis au-delà de 15 000 € n'est **pas** reportable ([F427](https://www.service-public.gouv.fr/particuliers/vosdroits/F427)). *Corrigé le 03/11/2026 : les partis étaient comptés hors des 20 %, ce qui surestimait.*
5. Cumuler avec le **`ir_general` (66 %)**, plafonné à **20 % du revenu imposable** (si renseigné).
6. **Reporter** l'excédent au-delà des 20 % sur les **5 années suivantes**.
7. **IFI/mécénat** (si activés) : filières de calcul séparées ; appliquer le **non-cumul IR/IFI** sur une même somme.
8. Restituer : réduction totale estimée, **détail par régime/bénéficiaire**, montant **reportable**, et **cases de déclaration** (2042 RICI — libellés à compléter/dater par millésime).

> **Tests prioritaires** (auto-test du moteur fiscal, `node lib/fiscal.selftest.js`) : sous-plafond 1 500 €, bascule 75 %→66 % au plafond Coluche, changement de plafond intra-année (14/10/2025), plafonds en euros hors 20 %, plafonnement 20 % + report sur 5 ans, non-cumul IR/IFI, cumul multi-régimes.

### 6.7 Exemple — exercice 2025 (fictif, sert de fixture de test de non-régression)

> Exemple **fictif** à des fins d'illustration et de test. Le PER (case 6NS) et le salaire (case 1AJ) **ne sont pas des dons** ; ils servent seulement à établir le revenu imposable, base du plafond de 20 %.

**Contexte foyer (exemple)**
- Salaire net imposable (1AJ) : **60 000 €**
- Versement PER volontaire déductible (6NS) : **4 000 €**
- ⇒ Revenu imposable (base du plafond 20 %) ≈ **56 000 €** → plafond dons `ir_general` ≈ **11 200 €** (jamais atteint ici).

**Dons 2025 (bénéficiaires du référentiel)**

| Bénéficiaire | Montant | Date | Régime | Taux | Case | Réduction | Reçu |
|---|---|---|---|---|---|---|---|
| Association Alpha *(intérêt général, art. 200)* | 50 € | 13/11/2025 | `ir_general` | 66 % | 7UF | 33,00 € | ✅ reçu CERFA 11580 (CB) |
| Association Bêta *(intérêt général, art. 200)* | 50 € | 28/11/2025 | `ir_general` | 66 % | 7UF | 33,00 € | ✅ reçu (numéraire) |
| Parti Gamma *(financement d'un parti)* | 60 € | 25/04/2025 | `ir_partis` | 66 % | 7UH | 39,60 € | à obtenir |

> Cas d'école utile pour le moteur : un reçu CERFA 11580 coche **☑ 200 du CGI** (et non ☐ 978) → valide le mapping enum (200 → `ir_general`, 978 → `ifi_dons`). Une attestation **PER** (art. 163 quatervicies, cases 6NS/6NT) est **hors périmètre dons** et n'est pas enregistrée comme don.

**Résultats attendus du moteur**
- `ir_general` : base 100 € (< plafond 20 %) → **66,00 €**, à reporter en **case 7UF = 100 €**.
- `ir_partis` : base 60 € (< 15 000 €) → **39,60 €**, à reporter en **case 7UH = 60 €**.
- **Réduction d'impôt totale estimée 2025 ≈ 105,60 €** · total donné 160 € · aucun excédent à reporter.
- Comparatif N-1 : premier exercice saisi → pas de rappel 2024 (référence pour les années suivantes).

> Ce cas devient une **fixture de test** : mêmes entrées ⇒ 105,60 € et cases 7UF=100 / 7UH=60. Toute évolution du moteur doit préserver ce résultat.

---

## 7. Fonctionnalités

### MVP
- [ ] **Authentification** (mono-foyer) : connexion, déconnexion, init du compte au 1er lancement, changement de mot de passe ([`specs/web/authentification.md`](specs/web/authentification.md)).
- [ ] Sélecteur / gestion des **années d'imposition** (exercices).
- [ ] **Référentiel de bénéficiaires** réutilisable : CRUD (avec catégorie fiscale), **sélection par autocomplétion** + création en ligne, anti-doublon (§5.1).
- [ ] **Suivi / appréciation du bénéficiaire** : journal daté (date + commentaire + ton) + indicateur (de confiance / neutre / à surveiller / à éviter) ; aide à la décision de renouvellement. Informatif, sans impact fiscal.
- [ ] CRUD **Dons** (montant, date, **bénéficiaire sélectionné**, moyen de paiement, reçu, note/raison facultative).
- [ ] **Dons récurrents** (§5.4) : engagement (fréquence unique/mensuel/trimestriel/annuel), **génération des versements par échéance** rattachés à leur année, **arrêt** de la récurrence, reçu annuel.
- [ ] **Ouverture d'un nouvel exercice** : **rappel des bénéficiaires N-1** + report rapide d'un don + **comparatif N vs N-1** (§5.1).
- [ ] **Historique pluriannuel** (tableau de bord) : graphique en barres empilées par bénéficiaire, une barre par exercice saisi.
- [ ] **Récapitulatif fiscal annuel en PDF** : estimation + cases 2042 RICI + détail chronologique des dons ; aide à la déclaration, ne s'y substitue pas.
- [ ] Synthèse **par bénéficiaire** + **par catégorie**.
- [ ] **Estimation de la réduction d'impôt** + détail du calcul.
- [ ] Rappel des **cases de déclaration**.
- [ ] **Gestion des justificatifs** (§5.3) : attacher un/des reçu(s) à un don (PDF/JPG/PNG), stockage local sécurisé, **consultation/téléchargement**, statut reçu présent/manquant.
- [ ] **Import/export** (CSV/JSON **+ fichiers justificatifs**) — portabilité RGPD.

### Backlog suggéré (à prioriser)
- Simulateur « et si je donne X € de plus ? » (optimisation sous plafond 20 %).
- Suivi du **report des excédents** sur 5 ans (compte à rebours).
- Comparatif **multi-années** (au-delà de N-1) + alerte d'approche du plafond.
- **Projection annuelle** d'un don récurrent (prévisionnel jusqu'au 31/12), clairement étiquetée (§5.4).
- **OCR / lecture du reçu** pour pré-remplir montant / bénéficiaire / date **et contrôle de cohérence** : extraire le contenu du justificatif et **vérifier qu'il correspond au don saisi** (montant, date, organisme, n° de reçu, mention art. 200) — **alerter si le fichier ne correspond pas** (nom ≠ contenu, mauvais document, PER pris pour un don…). *Motivé par un cas rencontré : fichiers de reçus mal nommés/intervertis.*
- **Détection « pas un don »** : reconnaître les attestations hors périmètre (PER art. 163 quatervicies / cases 6NS-6NT, etc.) et refuser de les enregistrer comme dons.
- Import de relevés bancaires (CSV) avec rapprochement.
- Référentiel de **bénéficiaires pré-rempli** (habilitation, catégorie par défaut).
- Rappel des **reçus manquants** avant déclaration + **calendrier fiscal**.
- Multi-foyers / profils, MFA.
- Extension **mécénat entreprise** (art. 238 bis) en module séparé.

---

## 8. Architecture technique (Node.js — implémentation retenue)

> 🧭 **Contrainte forte — anti-complexité & factorisation** : l'app ne doit pas se complexifier avec le temps ; chaque évolution **réutilise ou factorise**. Découpage par domaines, moteur fiscal = fonction pure sur des données, composants front réutilisables, zéro duplication. Règles complètes : [`specs/architecture/principes-code.md`](specs/architecture/principes-code.md).

**Backend (Node.js / Express)**
- Framework web : **Express**.
- Persistance : **fichier JSON** (`lib/store.js`) — écriture atomique (fichier temporaire + `fsync` + `rename`) et filet `.bak` avec récupération automatique en cas de corruption.
- Validation stricte des entrées côté serveur (montant, date, catégorie fiscale, existence du bénéficiaire…) — jamais confiance au client.
- Auth : **JWT en cookie HttpOnly/SameSite=strict** ; hachage **bcrypt** ; rate limiting + verrouillage temporaire sur `/api/login` ; réinitialisation locale du mot de passe (code à usage unique inscrit dans le journal serveur, sans SMTP).
- Tests : auto-test du **moteur de calcul fiscal** (`lib/fiscal.selftest.js`) — cible de test prioritaire.

**Frontend**
- **JS vanilla** (sans framework, sans étape de build) + CSS : applique la charte et les patterns UX du projet (§9). Interface **responsive** (tableaux → cartes empilées sur mobile), consultation et édition via des fenêtres modales.

**PDF**
- **pdfkit** (rapport : estimation, tableaux, sommaire) + **pdf-lib** (fusion des reçus : images intégrées, pages des reçus PDF réellement importées).

**Infra & déploiement (décidé)**

List-dons est **co-hébergée sur le RPi2** (même machine que **5Hostachy**) mais reste une **application totalement indépendante** : aucune interférence avec 5Hostachy, et **sans nom de domaine**.

- **Isolation stricte** (défaut retenu — voir §8.1) : projet Docker Compose distinct, réseau/volumes/noms de conteneurs dédiés `listdons_*`, dossier dédié sur le RPi2, cron propre. **Aucun couplage** avec les scripts d'ops de 5Hostachy (déploiement, supervision, éventuel failover) — List-dons tourne en permanence sur le RPi2, quel que soit l'état actif/standby de 5Hostachy.
- **Reverse proxy** : Caddy dédié à List-dons **prévu** (HTTPS LAN, `tls internal` — étape de durcissement à venir) ; port applicatif actuel `8080`, **jamais 80/443** (réservés à 5Hostachy).
- **Accès local (LAN) uniquement — décidé** : accessible seulement depuis le réseau domestique via l'IP du RPi2 (`http://192.168.1.x:8080`, HTTPS à venir via Caddy). **Aucune exposition sur Internet** (pas de tunnel, pas de redirection de port sur la box). Un accès distant (VPN **Tailscale/WireGuard**) reste une **option ultérieure**, non retenue pour l'instant.
- Config par variables d'environnement (`.env` / `.env.example`).

```
List-dons/
├── prototype/           # Application (Node.js/Express + JS vanilla) — l'implémentation retenue
│   ├── lib/             # Modules métier : store (persistance), fiscal (moteur), pdf
│   ├── public/          # IHM (JS vanilla, CSS)
│   └── data/            # Base JSON + uploads (volume Docker, non versionné)
├── deploy/              # Déploiement RPi2 (docker-compose, script garde-fou, sauvegardes)
├── specs/               # Spécifications (voir §12)
└── SPECIFICATIONS.md    # (ce fichier — index des specs)
```

### 8.1 Co-tenance sur le RPi2 — isolation stricte (exigence **DURE**)

> 🔒 **EXIGENCE NON NÉGOCIABLE : aucune interférence avec 5Hostachy (déjà présent sur le RPi2) n'est tolérée.**
> 5Hostachy est **prioritaire**. En cas de doute ou de conflit de ressource, c'est List-dons qui cède. Toute MEP de List-dons doit être **vérifiée sans impact** sur 5Hostachy (contrôle avant/après : conteneurs, ports, disponibilité inchangés).

Les deux applications partagent la machine, **rien d'autre**. Invariants à respecter (chacun est un **MUST**) :

| Ressource | 5Hostachy (existant) | List-dons | Règle |
|---|---|---|---|
| Répertoire | `/opt/5hostachy` | `~/list-dons` | Chemins disjoints |
| Projet Compose | `hostachy` | `listdons` | `-p listdons`, fichiers séparés |
| Conteneurs | `hostachy_*` | `listdons_*` | Aucune collision de nom |
| Réseau Docker | `hostachy` | `listdons` | Réseaux bridge distincts |
| Volumes | `caddy_data`, `app_data`, `uploads`… | `listdons_data`, `listdons_uploads`… | Préfixés, jamais partagés |
| Ports hôte | `80`, `443` | `8080`/`8443` (Caddy dédié) | List-dons **ne prend jamais** 80/443 |
| Cron / ops | scripts propres (en root) | scripts propres `listdons-*` | **Aucun** hook croisé |
| Sauvegardes | *(les siennes)* | `~/list-dons/backups` | Sauvegardes indépendantes |

- **Ne pas dépendre de 5Hostachy** : List-dons doit **rester up en continu sur le RPi2**, quel que soit l'état actif/standby de 5Hostachy (y compris si celui-ci bascule entre nœuds). Ses conteneurs sont en `restart: unless-stopped` et son cycle de vie est piloté par **son propre** Compose uniquement.
- **Limites de ressources obligatoires** : le RPi5 est modeste ; List-dons **DOIT** déclarer des limites `deploy.resources` (CPU/RAM) plafonnées, pour **garantir la priorité à 5Hostachy** en toute circonstance. L'empreinte de Node.js reste compatible avec ce plafond sur ce périmètre mono-foyer.
- **Pas de MAJ croisée** : le script de déploiement de List-dons **ne modifie ni ne redémarre** aucun conteneur/volume/réseau/port de 5Hostachy.
- **Garde-fou de déploiement (obligatoire)** : le script de MEP de List-dons effectue un **contrôle avant/après** — il relève l'état de 5Hostachy (conteneurs `hostachy_*` actifs, ports 80/443, disponibilité) **avant** d'agir, et **abandonne** s'il détecte le moindre impact **après**. Il ne s'exécute jamais en tant que root sur les ressources de 5Hostachy.
- **Firewall** : n'ouvrir que le(s) port(s) LAN de List-dons (ex. 8443) ; ne jamais modifier les règles UFW existantes (SSH LAN, 80/443).

---

## 9. Design system & UX

> Charte du projet : [`specs/design/charte-graphique.md`](specs/design/charte-graphique.md). Résumé opérationnel :

**Palette** (variables CSS) — primaire `#1E3A5F` (bleu), secondaire `#3D6B4F` (vert), accent `#C9983A` (or), fond `#F2EFE9`, surfaces `#FFFFFF`. Fonctionnelles : succès `#2E7D52`, alerte `#B07D1E`, erreur `#C0392B`, info `#2563A6`. **Dark mode** fourni (`prefers-color-scheme`).

**Typographie** — polices **système, sans CDN** : titres **Georgia** (serif), UI/corps **Segoe UI / system-ui**, mono **Consolas**. Échelle rem, mobile `:root` 14px < 768px.

**Espacement** — grille **4 px** ; radius 4/8/12/16 ; ombres douces bleutées.

**Patterns UX à réutiliser**
- **Carte expansible au clic** (listes : dons, organismes) — méta toujours visible, `.clamp-5`, `role="button"` + `tabindex` + `keydown`.
- **Pills** pour choix ≤ 8 (catégorie fiscale, moyen de paiement, filtre par année).
- **Onglets** pour vues multiples (ex. Dons / Synthèse / Reçus).
- **Badges** après le titre ; couleurs sémantiques.
- **Icônes = emojis Unicode natifs** (zéro dépendance) ; non-BMP en escape ASCII-safe ; `aria-label` + `title` obligatoires sur boutons-icônes.
- **Formulaires** : champ requis suffixé ` *` (jamais « (optionnel) ») ; ordre `[Annuler]` (gauche) `[Enregistrer]` (droite).

**Accessibilité** — cible **WCAG 2.2 AA** : contraste ≥ 4,5:1, navigation clavier complète, focus visible, ARIA, `prefers-reduced-motion`.

**Performance / éco-conception** — pas de framework CSS lourd ni CDN, pas de framework JS (**JS vanilla**, zéro build) ; images WebP/AVIF + lazy-loading ; aucun tracker.

---

## 10. Conformité juridique & RGPD

**Sécurité**
- HTTPS via Caddy — **sans domaine** : TLS **auto-signé** (`tls internal`) sur le LAN (pas de Let's Encrypt). Certificat racine local à installer sur les appareils du foyer pour éviter les avertissements navigateur.
- **CSP stricte** (pas d'`unsafe-inline` en prod) + headers `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS.
- **Authentification obligatoire** (mono-foyer, [§auth](specs/web/authentification.md)) : JWT en cookie **HttpOnly/Secure/SameSite=strict** (jamais localStorage) ; hachage **bcrypt** ; **rate limiting** + **verrouillage temporaire** sur la connexion ; messages d'erreur **non énumérants**. Pas d'inscription publique ; compte créé au 1er lancement.
- Protection **path traversal** sur uploads de reçus ; validation serveur systématique ; secrets hors code (`.env` en `.gitignore`).
- **Audit OWASP Top 10** avant chaque release (procédure d'audit à automatiser).

**RGPD (RGPD UE 2016/679 + Loi Informatique et Libertés)**
- **Responsable de traitement** : l'utilisateur lui-même (usage personnel / auto-hébergé).
- **Base légale** : intérêt de la personne concernée (ses propres données fiscales).
- **Donnée sensible** : les dons (cultuels, politiques) peuvent révéler des **convictions** → **chiffrement au repos recommandé**, minimisation stricte.
- **Droits** : export (portabilité CSV/JSON), suppression complète, transparence.
- **Souveraineté** : stockage **local / auto-hébergeable**, aucun transfert hors UE, aucun tracker.
- **Conservation** : conserver les justificatifs au moins la **durée de reprise fiscale**.

**LCEN / mentions** (si instance publiée)
- Page **Mentions légales** accessible sans authentification (éditeur, hébergeur).
- Emails (rappels) conformes anti-spam ; SPF/DKIM/DMARC si envoi.

**Licences open source** (repris : REUSE compliance)
- Toute dépendance sous licence permissive (MIT/Apache-2.0/BSD/ISC) ; copyleft fort validé explicitement.
- Inventaire des licences (`license-checker` ou équivalent npm) à générer au build si besoin.
- Page **À propos / Licences** + `LICENSES/` conforme **REUSE**.
- **Avertissement légal** affiché : estimation indicative, non un conseil fiscal.
- Licence du projet : **MIT** (décidé).

---

## 11. Bonnes pratiques de MEP / DevOps

- **Git** dès le départ : branches `main` / `dev`, revue, **SemVer** + bump de version + CHANGELOG (ex. `chore(version): bump vX.Y.Z`).
- **CI GitHub Actions** (à mettre en place si besoin — pas de pipeline imposé à ce stade, déploiement manuel maîtrisé via `deploy-rpi2.sh`) :
  - lint/format JS (si adopté)
  - auto-test du moteur fiscal (`node lib/fiscal.selftest.js`) — priorité
  - `npm audit` (dépendances vulnérables)
- **CD / MEP** : `docker compose up --build -d` ; script d'**auto-déploiement** ; build sélectif + cache (option `--nocache`).
- **Migrations** jouées automatiquement au démarrage.
- **Observabilité** : endpoint `/api/health`, logs structurés (sans données personnelles), rotation des logs.
- **Résilience — niveau SIMPLE (décidé)** : `restart: unless-stopped` suffit. **Pas** de monitoring/alerting/failover (surdimensionné pour un usage perso LAN, et réduit le risque d'interférence avec l'autre application). Un endpoint `/health` basique est admis, sans alerting.
- **Sauvegardes (obligatoires)** : sauvegarde **quotidienne automatique** de la base JSON + reçus vers `~/list-dons/backups`, rotation, et **procédure de restauration testée** et documentée. C'est le vrai filet de sécurité d'un usage perso.
- **Sécurité infra** : n'exposer que 80/443 ; SSH restreint au LAN ; mises à jour mensuelles.
- **Documentation** : README, guide d'auto-hébergement, `.env.example`, CONTRIBUTING, SECURITY.

---

## 12. Structure des specs — ✅ créée

```
specs/
├── README.md
├── commun/       contexte-et-objectifs · cas-utilisation · glossaire · personas
├── architecture/ vue-ensemble · stack · api · modele-donnees
├── design/       charte-graphique · principes-ux · parcours-utilisateurs
└── web/          exigences-fonctionnelles · exigences-non-fonctionnelles · navigation
```
Ce fichier `SPECIFICATIONS.md` reste l'**index / source de vérité** ; les fichiers de [`specs/`](specs/) en développent les sections.

---

## 13. Décisions & questions ouvertes

**Décisions actées**
- ✅ **Stack retenue = Node.js/Express + JS vanilla**, persistance en **fichier JSON** — le MVP est devenu l'**implémentation définitive** (§8). Pas de réécriture Rust/SvelteKit/SQLite.
- ✅ **Mono-foyer** au départ (pas de multi-utilisateur dans le MVP).
- ✅ **Licence MIT**.
- ✅ **Fiscalité modulaire** par année + par date d'effet, avec **héritage N ← N-1** si pas de règle spécifique ; barèmes **2025, 2026 et 2027** fournis (§6).
- ✅ **Déploiement sur le RPi2, appli indépendante** de 5Hostachy (isolation stricte, §8.1), **sans nom de domaine**.
- ✅ **Accès local (LAN) uniquement**, TLS auto-signé (Caddy `tls internal`), **aucune exposition Internet**. VPN = option ultérieure.
- ✅ **Isolation stricte** = exigence non négociable (§8.1).

- ✅ **Périmètre = particulier** : MVP centré sur la **réduction d'impôt sur le revenu (art. 200)**. **Mécénat entreprise (238 bis) hors périmètre**. **IFI (978) désactivé par défaut**, derrière le paramètre `assujetti_ifi` (§5.2).
- ✅ **Cultes = 66 %** (dispositif 75 % expiré le 31/12/2022, absent de l'art. 200 en vigueur — vérifié sur Légifrance le 05/11/2026, sources au §6.2).
- ✅ **Résilience SIMPLE** : `restart: unless-stopped` + sauvegarde quotidienne + restauration testée. Pas de monitoring/failover.
- ✅ **Authentification obligatoire** (mono-foyer, un seul compte, pas d'inscription publique) ; fenêtre de connexion sobre ([`authentification.md`](specs/web/authentification.md)).
- ✅ **Contrainte forte anti-complexité / factorisation** ([`principes-code.md`](specs/architecture/principes-code.md)) : simplicité, modularité par domaine, moteur fiscal = données, zéro duplication.
- ✅ **Montants en centimes** (entiers), pas de flottant.

**Encore à confirmer**
1. **Valeurs secondaires** : à ne vérifier que si tu les utilises un jour (IFI 50 000 €, dons de campagne). Rien de bloquant pour le MVP.

**Veille**
- Re-vérifier l'art. 200 CGI dès l'adoption de la **LF 2027** (fin 2026). (Bascule du 01/09/2026 vérifiée le 03/11/2026 : sans effet.)

---

## 14. Prochaines étapes proposées

1. Valider cette compréhension + répondre aux **questions ouvertes** (§13).
2. Verrouiller les **règles fiscales** par année (§6), sources Légifrance à l'appui.
3. Choisir la **stack front** (§8).
4. Créer la structure `specs/` (§12) et sa charte graphique.
5. Puis seulement : initialiser le dépôt et coder (non fait à ce stade).
