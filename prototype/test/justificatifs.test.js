'use strict';
/**
 * Téléversement des justificatifs (reçus) : la surface qui reçoit des fichiers.
 * Garde-fou de la montée de multer 1.x → 2.x (ticket #4, audit du 03/11/2026) :
 * le comportement doit rester le même, quelle que soit la version.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { demarrer } = require('./aide-serveur');

const COMPTE = { identifiant: 'demo@list-dons.fr', motDePasse: 'mot-de-passe-de-test' };
const DON = 'don-test';
const PDF = Buffer.from('%PDF-1.4\n% reçu fictif de test\n%%EOF\n', 'latin1');

let srv;
let cookie;

test.before(async () => {
  srv = await demarrer({
    utilisateur: { identifiant: COMPTE.identifiant, hash: bcrypt.hashSync(COMPTE.motDePasse, 4) },
    exercices: [{ annee: 2025, revenuImposable: null, statut: 'en_cours' }],
    beneficiaires: [{ id: 'b1', nom: 'Association Alpha', identifiant: '', categorie: 'ir_general', habiliteRecu: true, notes: '', indicateurSuivi: 'neutre', archive: false }],
    appreciations: [],
    dons: [{ id: DON, annee: 2025, beneficiaireId: 'b1', date: '2025-11-13', montant: 5000, moyen: 'CB', numeroRecu: '', note: '', recurrentId: null, justificatifs: [] }],
    recurrents: [],
  });
  const r = await fetch(srv.url + '/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiant: COMPTE.identifiant, password: COMPTE.motDePasse }),
  });
  assert.strictEqual(r.status, 200, 'connexion du compte de test');
  cookie = r.headers.get('set-cookie').split(';')[0];
});
test.after(() => srv && srv.arreter());

function envoyer(contenu, nom, avecSession = true) {
  const form = new FormData();
  if (contenu) form.append('fichier', new Blob([contenu], { type: 'application/pdf' }), nom);
  return fetch(`${srv.url}/api/dons/${DON}/justificatifs`, { method: 'POST', body: form, headers: avecSession ? { cookie } : {} });
}

test('un reçu PDF se téléverse, se stocke et se relit à l’identique', async () => {
  const r = await envoyer(PDF, 'reçu 2025 — Alpha.pdf');
  assert.strictEqual(r.status, 200, srv.journal());
  const j = await r.json();
  assert.strictEqual(j.nom, 'reçu 2025 — Alpha.pdf');
  assert.strictEqual(path.basename(j.fichier), j.fichier, 'nom stocké sans chemin');
  assert.deepStrictEqual(fs.readFileSync(path.join(srv.dossier, 'uploads', j.fichier)), PDF);
  const lu = await fetch(`${srv.url}/api/justificatifs/${DON}/${j.id}`, { headers: { cookie } });
  assert.strictEqual(lu.status, 200);
  assert.deepStrictEqual(Buffer.from(await lu.arrayBuffer()), PDF);
});

test('un fichier de plus de 15 Mo est refusé et rien n’est rattaché au don', async () => {
  const avant = fs.readdirSync(path.join(srv.dossier, 'uploads')).length;
  const r = await envoyer(Buffer.alloc(15 * 1024 * 1024 + 1, 0x20), 'trop-gros.pdf');
  assert.ok(r.status >= 400 && r.status < 600, `statut ${r.status}`);
  const db = JSON.parse(fs.readFileSync(path.join(srv.dossier, 'db.json'), 'utf-8'));
  assert.ok(db.dons[0].justificatifs.every((x) => x.nom !== 'trop-gros.pdf'));
  assert.ok(fs.readdirSync(path.join(srv.dossier, 'uploads')).length <= avant + 0, 'aucun fichier partiel conservé');
  assert.strictEqual((await fetch(srv.url + '/api/session')).status, 200, 'le serveur répond encore');
});

test('un envoi sans fichier est refusé', async () => {
  const r = await envoyer(null);
  assert.strictEqual(r.status, 400);
});

test('un envoi sans session est refusé', async () => {
  const r = await envoyer(PDF, 'anonyme.pdf', false);
  assert.strictEqual(r.status, 401);
});

test('le récapitulatif PDF se génère avec un reçu au nom accentué annexé', async () => {
  // Régression du 19/07/2026 (journal 3.4) : un nom mal décodé portait un U+0080 et cassait le PDF.
  const r = await fetch(`${srv.url}/api/exercices/2025/pdf`, { headers: { cookie } });
  assert.strictEqual(r.status, 200, srv.journal());
  assert.match(r.headers.get('content-type') || '', /application\/pdf/);
  assert.strictEqual(Buffer.from(await r.arrayBuffer()).subarray(0, 5).toString('latin1'), '%PDF-');
});
