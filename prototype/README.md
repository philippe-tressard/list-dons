# MVP fonctionnel — List-dons (Node)

> ⚠️ **MVP fonctionnel, déployé et en usage réel — implémentation retenue.** Il valide l'UX et le moteur fiscal en conditions réelles.
> Conforme aux spécifications (`../SPECIFICATIONS.md`, `../specs/`), qui décrivent cette stack Node.js/Express + JS vanilla comme définitive (§8).
> Ce MVP a été fait initialement sur une machine sans Rust ni Docker, pour livrer quelque chose de testable immédiatement — il a fini par devenir l'instance réellement utilisée, et le restera.

## Ce qui fonctionne

- **Authentification** mono-foyer (création du compte au 1er lancement, connexion par **email**, déconnexion, session cookie). **Mot de passe oublié** : réinitialisation locale sans email — un **code à usage unique** est inscrit dans le journal du serveur (accès machine = preuve de légitimité), à saisir avec le nouveau mot de passe. Écran de connexion avec légende « * champ obligatoire ».
- **Exercices** (années d'imposition) : création, sélection.
- **Interface responsive** : sur mobile, les tableaux se replient en cartes empilées (libellé/valeur) ; en-têtes, formulaires et graphiques s'adaptent.
- **Consultation au clic** : toucher un don ou un bénéficiaire ouvre une **fiche détail complète** (tout ce qui est saisi, pièces jointes) avec les actions Éditer / Supprimer.
- **Saisie et édition factorisées** : l'ajout se fait par un **bouton « ＋ Ajouter… »** en tête de section, qui ouvre la **même fenêtre modale** que l'édition (un seul formulaire par entité — pas de zone de saisie permanente).
- **Bénéficiaires** : référentiel réutilisable, création et **édition**, coordonnées optionnelles (SIREN/RNA, adresse, téléphone, site web, email), catégorie fiscale, **indicateur de suivi** (de confiance / neutre / à surveiller / à éviter).
- **Dons** : uniques ou **récurrents** (mensuel/trimestriel/annuel → génération des versements rattachés à l'année) ; **édition** et suppression ; n° de reçu fiscal ; note/raison ; plusieurs dons uniques pour un même bénéficiaire sur un même exercice.
- **Justificatifs** : attacher une pièce jointe **dès la saisie du don** (ou après, en édition) ; consulter/télécharger ; supprimer.
- **Moteur fiscal** (art. 200 CGI) : réduction estimée, détail par régime, **cases 7UF / 7UD / 7UH**, **plafond du revenu imposable** (jauge sur le tableau de bord, saisie contextuelle, modification), report — **barèmes par année datés avec héritage N ← N-1** (jamais de taux codé en dur), vérifiés par un auto-test (`node lib/fiscal.selftest.js`).
- **Rappel N-1** : colonne « montant N-1 » dans le tableau des dons, section « Non renouvelée » (tout l'historique, groupée par dernière année de don).
- **Historique pluriannuel** : graphique en barres empilées par bénéficiaire (SVG, sans dépendance).
- **Récapitulatif fiscal en PDF** : estimation, cases 2042 RICI, détail chronologique des dons, détail par bénéficiaire (même présentation de tableau, coordonnées disponibles), **sommaire des pièces jointes puis les reçus annexés** — images intégrées et **pages des reçus PDF réellement importées** (via `pdf-lib`).
- **Récapitulatif des barèmes par exercice** (Paramètres) : règles réellement appliquées à chaque exercice et leur année source en cas d'héritage.
- **Mode confidentialité (démo)** : anonymise bénéficiaires (`Bénéficiaire A/B/C…`) et masque (`*****`) tout montant saisi ou calculé, pour présenter l'app sans exposer de données réelles. Réversible.
- **Pied de page** : copyright, licence, mentions légales (page publique dédiée).
- **Robustesse (mise en production)** : **écriture atomique** de la base (fichier temporaire + `fsync` + `rename`) avec **filet `.bak`** anti-corruption (récupération automatique si `db.json` est illisible, ex. coupure de courant) ; **rate-limiting + verrouillage temporaire** de la connexion ; **en-têtes de sécurité** (CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) ; **validation serveur** stricte (montant, date, catégorie, fréquence, existence du bénéficiaire).

## Lancer

```bash
cd prototype
npm install
npm start
```

Puis ouvrir **http://localhost:8080** (accessible aussi depuis le LAN).
Au premier lancement, créez votre compte.

Variable `PORT` pour changer de port (défaut 8080). Données dans `prototype/data/` (non versionné).

## Vérifier le moteur fiscal

```bash
node lib/fiscal.selftest.js
```

Auto-test sans dépendance : fixture de référence (specs §6.7) + isolation du barème par année (un barème ajouté pour une année future n'affecte jamais les exercices antérieurs).

## Base de démonstration

```bash
LISTDONS_DATA_DIR=/tmp/listdons-demo node seed.js
```

Crée le compte de démonstration et l'exemple fiscal 2025 (fictif, specs §6.7). Le script **refuse** une base qui contient déjà des données, puisqu'il les remplacerait ; `--ecraser` force, sur demande explicite. Il n'est pas copié dans l'image de production.

## Tests de l'application

```bash
npm test
```

Lance une instance isolée du serveur (dossier de données temporaire via `LISTDONS_DATA_DIR`, port libre — jamais les données réelles) et vérifie le téléversement des reçus (nom accentué conservé, taille maximale de 15 Mo, session obligatoire, seuls PDF, JPEG et PNG admis — reconnus par leurs premiers octets, pas par le type annoncé ni l'extension — et servis en pièce jointe avec ce type) et la génération du récapitulatif PDF.

## Limites (assumées, MVP)

- Persistance = fichier JSON, désormais **avec écriture atomique + filet `.bak`** (cible : SQLite — non requis tant que l'usage reste mono-foyer). Hachage = bcrypt (cible : Argon2).
- Récurrence générée à la création pour l'année en cours (pas de planificateur).
- **HTTPS (LAN)** : pas encore — prévu via **Caddy `tls internal`** (prochaine étape de durcissement). En attendant, l'accès reste en HTTP sur le LAN uniquement.
- Pas encore : OCR des reçus, export CSV/JSON (portabilité RGPD).
