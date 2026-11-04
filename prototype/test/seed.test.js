'use strict';
/**
 * Le seed de démonstration ne remplace jamais une base qui contient déjà des données
 * (ticket #7, audit du 03/11/2026).
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SEED = path.join(__dirname, '..', 'seed.js');

function lancer(dossier, ...args) {
  return spawnSync(process.execPath, [SEED, ...args], { env: { ...process.env, LISTDONS_DATA_DIR: dossier }, encoding: 'utf-8' });
}
function dossierAvec(db) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'listdons-seed-'));
  if (db) fs.writeFileSync(path.join(d, 'db.json'), JSON.stringify(db));
  return d;
}
const lire = (d) => JSON.parse(fs.readFileSync(path.join(d, 'db.json'), 'utf-8'));

test('sur une base qui a déjà un compte, le seed refuse et ne touche à rien', (t) => {
  const d = dossierAvec({ utilisateur: { identifiant: 'compte-existant', hash: 'h' }, exercices: [], beneficiaires: [], appreciations: [], dons: [], recurrents: [] });
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  const avant = fs.readFileSync(path.join(d, 'db.json'), 'utf-8');
  const r = lancer(d);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /Refus/);
  assert.strictEqual(fs.readFileSync(path.join(d, 'db.json'), 'utf-8'), avant);
});

test('sur une base qui n’a que des dons, le seed refuse aussi', (t) => {
  const d = dossierAvec({ utilisateur: null, exercices: [], beneficiaires: [], appreciations: [], dons: [{ id: 'x' }], recurrents: [] });
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  assert.strictEqual(lancer(d).status, 1);
  assert.strictEqual(lire(d).dons[0].id, 'x');
});

test('sur une base vide, le seed crée la démonstration', (t) => {
  const d = dossierAvec(null);
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  const r = lancer(d);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const db = lire(d);
  assert.strictEqual(db.utilisateur.identifiant, 'demo@list-dons.fr');
  assert.strictEqual(db.dons.reduce((s, x) => s + x.montant, 0), 16000, 'fixture §6.7 : 160 € donnés');
});

test('--ecraser remplace une base existante, sur demande explicite', (t) => {
  const d = dossierAvec({ utilisateur: { identifiant: 'compte-existant', hash: 'h' }, exercices: [], beneficiaires: [], appreciations: [], dons: [], recurrents: [] });
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  assert.strictEqual(lancer(d, '--ecraser').status, 0);
  assert.strictEqual(lire(d).utilisateur.identifiant, 'demo@list-dons.fr');
});
