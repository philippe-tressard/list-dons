'use strict';
/**
 * La version servie est celle de package.json (ticket #18, standards/08 §6) : c'est elle
 * qui prouve, après un déploiement, que la version en production a changé (post-check P7).
 */
const test = require('node:test');
const assert = require('node:assert');
const { version } = require('../package.json');
const { demarrer } = require('./aide-serveur');

let srv;
test.before(async () => { srv = await demarrer({ utilisateur: null, exercices: [], beneficiaires: [], appreciations: [], dons: [], recurrents: [] }); });
test.after(() => srv && srv.arreter());

test('l’API de session annonce la version de package.json, sans connexion', async () => {
  const s = await (await fetch(srv.url + '/api/session')).json();
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.strictEqual(s.version, version, srv.journal());
});

test('la page des mentions légales affiche la version', async () => {
  const page = await (await fetch(srv.url + '/mentions-legales')).text();
  assert.ok(page.includes('v' + version), 'version absente du pied de page');
  assert.ok(!page.includes('{{'), 'gabarit non rempli');
});
