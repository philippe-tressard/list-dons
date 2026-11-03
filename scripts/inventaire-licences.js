#!/usr/bin/env node
'use strict';
/**
 * Inventaire des licences des dépendances (standards/14 §6.3), figé dans le dépôt.
 *
 *   node scripts/inventaire-licences.js             régénère prototype/LICENCES-DEPENDANCES.md
 *   node scripts/inventaire-licences.js --verifier  échoue si l'inventaire n'est pas à jour,
 *                                                   ou si une licence est inconnue ou non admise
 *
 * Source : prototype/package-lock.json (ce qui est réellement installé), jamais package.json.
 * Pourquoi (audit du 03/11/2026, ticket #5) : trois paquets n'avaient pas de licence dans
 * leurs métadonnées, et aucun inventaire n'était relu à l'ajout d'une dépendance.
 * Sortie 0 = conforme ; 1 = écart ; 2 = contrôle impossible (INCONNU, donc échec).
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const VERROU = path.join(RACINE, 'prototype', 'package-lock.json');
const INVENTAIRE = path.join(RACINE, 'prototype', 'LICENCES-DEPENDANCES.md');

// Licences compatibles avec la licence MIT du projet, sans obligation de copyleft.
const ADMISES = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'Zlib', '(MIT AND Zlib)']);

// Paquets dont les métadonnées ne déclarent pas de licence : constatée à la main dans leur
// fichier LICENSE, POUR CETTE VERSION. Une autre version se revérifie (l'entrée ne sert plus
// et le contrôle échoue), et une entrée qui ne sert plus se retire.
const CONSTATEES = {
  'busboy@1.6.0': { licence: 'MIT', preuve: 'node_modules/busboy/LICENSE et champ « licenses » (03/11/2026)' },
  'streamsearch@1.1.0': { licence: 'MIT', preuve: 'node_modules/streamsearch/LICENSE et champ « licenses » (03/11/2026)' },
  'png-js@1.1.0': { licence: 'MIT', preuve: 'node_modules/png-js/LICENSE, « MIT License » (03/11/2026)' },
};

function relever() {
  let verrou;
  try { verrou = JSON.parse(fs.readFileSync(VERROU, 'utf-8')); } catch (e) { return { erreur: `lecture de ${VERROU} : ${e.message}` }; }
  const paquets = [];
  const fautes = [];
  const utilisees = new Set();
  for (const [cle, p] of Object.entries(verrou.packages || {})) {
    if (!cle || p.dev) continue;
    const nom = cle.replace(/^.*node_modules\//, '');
    const id = `${nom}@${p.version}`;
    let licence = p.license;
    let origine = 'package-lock.json';
    if (!licence && CONSTATEES[id]) { licence = CONSTATEES[id].licence; origine = 'constatée : ' + CONSTATEES[id].preuve; utilisees.add(id); }
    if (!licence) fautes.push(`${id} : licence inconnue — l'ouvrir dans node_modules et la déclarer dans CONSTATEES`);
    else if (!ADMISES.has(licence)) fautes.push(`${id} : licence « ${licence} » non admise — décision à prendre avant de l'ajouter`);
    paquets.push({ id, nom, version: p.version, licence: licence || '?', origine });
  }
  for (const id of Object.keys(CONSTATEES)) if (!utilisees.has(id)) fautes.push(`CONSTATEES : ${id} ne sert plus — revérifier la nouvelle version, puis retirer l'entrée`);
  paquets.sort((a, b) => a.id.localeCompare(b.id));
  return { paquets, fautes };
}

function rendre(paquets) {
  const compte = {};
  for (const p of paquets) compte[p.licence] = (compte[p.licence] || 0) + 1;
  const lignes = [
    '# Licences des dépendances',
    '',
    '> Fichier **généré** par `node scripts/inventaire-licences.js` depuis `package-lock.json` — ne pas l\'éditer à la main.',
    '> La CI échoue s\'il n\'est pas à jour, ou si une licence est inconnue ou hors de la liste admise.',
    '> Aucune image n\'est distribuée : ce qui est embarqué dans les paquets (fichiers AFM de pdfkit, par exemple) n\'est pas redistribué par ce dépôt.',
    '',
    `${paquets.length} paquets de production : ` + Object.entries(compte).sort((a, b) => b[1] - a[1]).map(([l, n]) => `${l} ${n}`).join(', ') + '.',
    '',
    '| Paquet | Version | Licence | Origine de la licence |',
    '|---|---|---|---|',
    ...paquets.map((p) => `| ${p.nom} | ${p.version} | ${p.licence} | ${p.origine} |`),
    '',
  ];
  return lignes.join('\n');
}

function principal() {
  const { paquets, fautes, erreur } = relever();
  if (erreur) { console.error('INCONNU :', erreur); return 2; }
  if (!paquets.length) { console.error('INCONNU : aucun paquet lu dans package-lock.json.'); return 2; }
  if (fautes.length) { console.error(fautes.join('\n')); return 1; }
  const attendu = rendre(paquets);
  if (process.argv.includes('--verifier')) {
    const actuel = fs.existsSync(INVENTAIRE) ? fs.readFileSync(INVENTAIRE, 'utf-8') : '';
    if (actuel !== attendu) { console.error('prototype/LICENCES-DEPENDANCES.md n\'est pas à jour : lancer node scripts/inventaire-licences.js'); return 1; }
    console.log(`OK : ${paquets.length} paquets, licences admises, inventaire à jour.`);
    return 0;
  }
  fs.writeFileSync(INVENTAIRE, attendu);
  console.log(`Inventaire écrit : ${paquets.length} paquets.`);
  return 0;
}

process.exit(principal());
