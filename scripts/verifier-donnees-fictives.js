#!/usr/bin/env node
'use strict';
/**
 * Aucune donnée personnelle réelle dans les fichiers versionnés (standards/14 §9).
 *
 * Toute identité repérée — courriel, organisme bénéficiaire, civilité + nom,
 * « Prénom NOM », nom passé à une fixture, adresse IP du réseau local, dossier
 * personnel — doit figurer dans la LISTE BLANCHE
 * `scripts/identites-fictives.json`. Hors de cette liste, la CI échoue.
 *
 * Pourquoi (audit avant publication du 03/11/2026, ticket #8) : le dépôt va devenir
 * public, et un historique git conserve tout ce qu'on y met. Ce que ce contrôle ne
 * lit pas — messages de commit, tickets, PR — reste une consigne.
 *
 *   node scripts/verifier-donnees-fictives.js             contrôle du dépôt
 *   node scripts/verifier-donnees-fictives.js --autotest  prouve que chaque règle mord
 *
 * Sortie 0 = conforme ; 1 = identité hors liste ; 2 = contrôle impossible (INCONNU,
 * donc échec : standards/04 §1).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const LISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'identites-fictives.json'), 'utf-8'));

// Fichiers exclus, avec leur raison. Une exclusion dont le fichier a disparu fait échouer :
// une exception qui ne sert plus ne doit pas survivre (traiter-issues §1.3).
const EXCLUSIONS = {
  'scripts/verifier-donnees-fictives.js': "porte les cas fautifs de son propre autotest",
};
// En dessous, la liste des fichiers n'a pas été lue : le vert serait un faux vert.
const MINIMUM_FICHIERS = 10;

const L = '\\p{L}';
const SIGLES_VUS = new Set();
const REGLES = [
  {
    nom: 'courriel',
    motif: new RegExp(`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}`, 'gu'),
    autorise: (v) => v in LISTE.courriels,
  },
  {
    nom: 'organisme bénéficiaire',
    motif: new RegExp(`\\b(?:Association|Fondation|Parti|Comité|Institut|Ligue|Secours|Fédération|Œuvre|Paroisse|Diocèse|Mouvement) \\p{Lu}[${L}-]+`, 'gu'),
    autorise: (v) => v in LISTE.beneficiaires,
  },
  {
    nom: 'civilité + nom',
    motif: new RegExp(`(?<![${L}])(?:M\\.|Mme|Mlle|Monsieur|Madame) +\\p{Lu}[${L}'-]+`, 'gu'),
    autorise: (v) => v in LISTE.personnes,
  },
  {
    nom: 'Prénom NOM',
    motif: new RegExp(`(?<![${L}])\\p{Lu}\\p{Ll}+ (\\p{Lu}{3,})(?![${L}])`, 'gu'),
    autorise: (v, m) => { if (LISTE.sigles.includes(m[1])) { SIGLES_VUS.add(m[1]); return true; } return v in LISTE.personnes; },
  },
  {
    nom: 'nom de fixture',
    motif: /\b(?:mk|beneficiaire)\(\s*['"]([^'"]+)['"]|\bnom\s*[:=]\s*['"]([^'"]+)['"]/gu,
    valeur: (m) => m[1] || m[2],
    autorise: (v) => v in LISTE.beneficiaires,
  },
  // Infrastructure du foyer (ticket #3) : une adresse exacte du réseau local, un compte
  // SSH ou un dossier personnel désignent la machine réelle. La documentation écrit
  // `192.168.1.x`, `<utilisateur>@<ip-du-rpi2>` et `~/…` ou `$HOME/…`.
  {
    nom: 'adresse IP privée',
    motif: /(?<![\d.])(?:192\.168|10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}(?![\d.])/gu,
    autorise: () => false,
  },
  {
    nom: 'dossier personnel',
    motif: /\/(?:home|Users)\/[A-Za-z0-9_.-]+/gu,
    autorise: (v) => v in LISTE.dossiers,
  },
];

/** Relevé des identités hors liste dans un texte. Fonction pure. */
function relever(texte) {
  const trouvees = [];
  for (const r of REGLES) {
    for (const m of texte.matchAll(r.motif)) {
      const v = r.valeur ? r.valeur(m) : m[0];
      if (!r.autorise(v, m)) trouvees.push({ regle: r.nom, valeur: v, index: m.index });
    }
  }
  return trouvees;
}

function ligneDe(texte, index) { return texte.slice(0, index).split('\n').length; }

function masquer(v) { return v.length <= 4 ? '****' : v.slice(0, 2) + '•'.repeat(v.length - 3) + v.slice(-1); }

function controler() {
  let fichiers;
  try {
    fichiers = execFileSync('git', ['ls-files', '-z'], { cwd: RACINE, encoding: 'utf-8' }).split('\0').filter(Boolean);
  } catch (e) {
    console.error('INCONNU : git ls-files a échoué —', e.message);
    return 2;
  }
  for (const f of Object.keys(EXCLUSIONS)) {
    if (!fichiers.includes(f)) { console.error(`Exclusion périmée : ${f} n'est plus versionné — la retirer.`); return 1; }
  }
  let lus = 0;
  const fautes = [];
  for (const f of fichiers) {
    if (f in EXCLUSIONS) continue;
    const brut = fs.readFileSync(path.join(RACINE, f));
    if (brut.includes(0)) continue; // binaire
    const texte = brut.toString('utf-8');
    lus++;
    for (const t of relever(texte)) fautes.push(`${f}:${ligneDe(texte, t.index)} — ${t.regle} hors liste blanche : « ${masquer(t.valeur)} »`);
  }
  const inutiles = LISTE.sigles.filter((x) => !SIGLES_VUS.has(x));
  if (inutiles.length) fautes.push(`scripts/identites-fictives.json — sigle(s) qui ne servent plus, à retirer : ${inutiles.join(', ')}`);
  if (lus < MINIMUM_FICHIERS) { console.error(`INCONNU : ${lus} fichier(s) lu(s), minimum ${MINIMUM_FICHIERS}.`); return 2; }
  if (fautes.length) {
    console.error(fautes.join('\n'));
    console.error(`\n${fautes.length} identité(s) hors de scripts/identites-fictives.json. Une donnée réelle se retire ; une donnée fictive se déclare dans la liste.`);
    return 1;
  }
  console.log(`OK : ${lus} fichiers versionnés lus, aucune identité hors liste blanche.`);
  return 0;
}

/** Chaque règle doit mordre sur un cas fautif et laisser passer le cas autorisé. */
function autotest() {
  const cas = [
    ['écrire à jean.dupont@exemple.org', 'courriel', true],
    ['compte demo@list-dons.fr', 'courriel', false],
    ['don à la Fondation Martin', 'organisme bénéficiaire', true],
    ['don à l’Association Alpha', 'organisme bénéficiaire', false],
    ['reçu au nom de Mme Durand', 'civilité + nom', true],
    ['signé Camille DURAND', 'Prénom NOM', true],
    ['format Fichier JSON', 'Prénom NOM', false],
    ["mk('Les Amis du Quartier', 'ir_general')", 'nom de fixture', true],
    ["mk('Parti Gamma', 'ir_partis')", 'nom de fixture', false],
    ['le nœud répond sur 192.168.1.42', 'adresse IP privée', true],
    ['le nœud répond sur 192.168.1.x', 'adresse IP privée', false],
    ['ssh admin@10.0.0.7', 'adresse IP privée', true],
    ['cron : /home/alice/list-dons/backup.sh', 'dossier personnel', true],
    ['cron : $HOME/list-dons/backup.sh', 'dossier personnel', false],
  ];
  let echecs = 0;
  for (const [texte, regle, fautif] of cas) {
    const vu = relever(texte).some((t) => t.regle === regle);
    if (vu !== fautif) { echecs++; console.error(`ÉCHEC autotest : « ${texte} » — règle « ${regle} » attendue ${fautif ? 'fautive' : 'autorisée'}`); }
  }
  for (const r of REGLES) if (!cas.some(([, regle, fautif]) => regle === r.nom && fautif)) { echecs++; console.error(`ÉCHEC autotest : la règle « ${r.nom} » n'a aucun cas fautif.`); }
  if (echecs) return 1;
  console.log(`OK : autotest, ${cas.length} cas, ${REGLES.length} règles qui mordent.`);
  return 0;
}

if (require.main === module) process.exit(process.argv.includes('--autotest') ? autotest() : controler());
module.exports = { relever };
