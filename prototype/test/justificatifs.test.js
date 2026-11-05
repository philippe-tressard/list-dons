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
const DON_ANCIEN = 'don-ancien';
const PDF = Buffer.from('%PDF-1.4\n% reçu fictif de test\n%%EOF\n', 'latin1');
// PNG minimal : la signature suffit au contrôle, le contenu n'est pas décodé.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const HTML = Buffer.from('<!doctype html><script>alert(1)</script>', 'utf-8');

let srv;
let cookie;

test.before(async () => {
  srv = await demarrer({
    utilisateur: { identifiant: COMPTE.identifiant, hash: bcrypt.hashSync(COMPTE.motDePasse, 4) },
    exercices: [{ annee: 2025, revenuImposable: null, statut: 'en_cours' }],
    beneficiaires: [{ id: 'b1', nom: 'Association Alpha', identifiant: '', categorie: 'ir_general', habiliteRecu: true, notes: '', indicateurSuivi: 'neutre', archive: false }],
    appreciations: [],
    dons: [
      { id: DON, annee: 2025, beneficiaireId: 'b1', date: '2025-11-13', montant: 5000, moyen: 'CB', numeroRecu: '', note: '', recurrentId: null, justificatifs: [] },
      { id: DON_ANCIEN, annee: 2024, beneficiaireId: 'b1', date: '2024-05-02', montant: 3000, moyen: 'CB', numeroRecu: '', note: '', recurrentId: null,
        justificatifs: [{ id: 'j-ancien', nom: 'ancien.pdf', fichier: 'fichier-ancien', type: 'text/html' }] },
    ],
    recurrents: [],
  }, { 'fichier-ancien': HTML });
  const r = await fetch(srv.url + '/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiant: COMPTE.identifiant, password: COMPTE.motDePasse }),
  });
  assert.strictEqual(r.status, 200, 'connexion du compte de test');
  cookie = r.headers.get('set-cookie').split(';')[0];
});
test.after(() => srv && srv.arreter());

function envoyer(contenu, nom, avecSession = true, typeAnnonce = 'application/pdf') {
  const form = new FormData();
  if (contenu) form.append('fichier', new Blob([contenu], { type: typeAnnonce }), nom);
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

const fichiersStockes = () => fs.readdirSync(path.join(srv.dossier, 'uploads')).length;
const rattaches = () => JSON.parse(fs.readFileSync(path.join(srv.dossier, 'db.json'), 'utf-8')).dons[0].justificatifs;

test('un « .pdf » qui contient du HTML est refusé, et rien n’est conservé', async () => {
  // Ticket #17 : le type annoncé par le client ne prouve rien ; seuls les octets de tête comptent.
  const avant = fichiersStockes();
  const r = await envoyer(HTML, 'piege.pdf');
  assert.strictEqual(r.status, 415, srv.journal());
  assert.match((await r.json()).error, /PDF, JPEG ou PNG/);
  assert.strictEqual(fichiersStockes(), avant, 'le fichier refusé est supprimé du disque');
  assert.ok(rattaches().every((x) => x.nom !== 'piege.pdf'));
});

test('le type stocké et servi est celui des octets, pas celui annoncé', async () => {
  for (const [contenu, nom, attendu] of [[PNG, 'scan.png', 'image/png'], [JPEG, 'photo.jpg', 'image/jpeg']]) {
    const r = await envoyer(contenu, nom, true, 'text/html');
    assert.strictEqual(r.status, 200, srv.journal());
    const j = await r.json();
    assert.strictEqual(j.type, attendu);
    const lu = await fetch(`${srv.url}/api/justificatifs/${DON}/${j.id}`, { headers: { cookie } });
    assert.strictEqual(lu.headers.get('content-type'), attendu);
    assert.match(lu.headers.get('content-disposition') || '', /^attachment/);
  }
});

test('l’extension du nom ne décide pas du type servi', async () => {
  const r = await envoyer(PDF, 'renomme.html');
  assert.strictEqual(r.status, 200, srv.journal());
  const lu = await fetch(`${srv.url}/api/justificatifs/${DON}/${(await r.json()).id}`, { headers: { cookie } });
  assert.strictEqual(lu.headers.get('content-type'), 'application/pdf');
});

test('un reçu stocké avant le contrôle, au type annoncé non admis, est servi en octets bruts', async () => {
  // Les reçus d'avant la v0.1.7 gardent le type annoncé à l'époque : il n'est plus cru.
  const lu = await fetch(`${srv.url}/api/justificatifs/${DON_ANCIEN}/j-ancien`, { headers: { cookie } });
  assert.strictEqual(lu.status, 200, srv.journal());
  assert.strictEqual(lu.headers.get('content-type'), 'application/octet-stream');
  assert.match(lu.headers.get('content-disposition') || '', /^attachment/);
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
