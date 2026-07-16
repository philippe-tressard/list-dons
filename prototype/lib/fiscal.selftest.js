'use strict';
/**
 * Auto-test léger du moteur fiscal — sans dépendance (assert natif), exécutable via
 * `node lib/fiscal.selftest.js` depuis prototype/. Garantit deux propriétés :
 *   1. La fixture de référence des specs (§6.7) reste correcte.
 *   2. Isolation par année : un barème ajouté pour une année future ne s'applique jamais
 *      aux exercices antérieurs (ni l'inverse) — l'héritage N ← N-1 ne va que vers l'avant.
 * Le barème fictif utilisé au point 2 n'existe qu'en mémoire, jamais écrit sur disque.
 */
const assert = require('assert');
const fiscal = require('./fiscal');

function ok(label) { console.log('OK  ', label); }

// --- 1) Fixture specs §6.7 : 2 dons "intérêt général" (50€+50€) + 1 don parti (60€) ---
const donsFixture = [
  { montant: 5000, categorie: 'ir_general' },
  { montant: 5000, categorie: 'ir_general' },
  { montant: 6000, categorie: 'ir_partis' },
];
const fixture = fiscal.estimer(donsFixture, null, 2025);
assert.strictEqual(fixture.reductionTotale, 10560, 'Fixture §6.7 : réduction attendue 105,60 €');
ok('Fixture §6.7 (réduction 2025 = 105,60 €)');

// --- 2) Héritage N <- N-1 : les années sans barème propre héritent du plus récent <= N ---
const bareme2025 = fiscal.baremePour(2025);
assert.strictEqual(fiscal.baremePour(2026), bareme2025, '2026 doit hériter du barème 2025');
assert.strictEqual(fiscal.baremePour(2027), bareme2025, '2027 doit hériter du barème 2025');
ok('Héritage N ← N-1 (2026 et 2027 héritent de 2025)');

// --- 3) Isolation par année : ajout temporaire (en mémoire uniquement) d'un barème 2099
// très différent (50 % / plafond 10 %), pour vérifier qu'il ne contamine ni le passé (2026)
// ni le futur au-delà (2100 doit au contraire en hériter, comme prévu par la règle N ← N-1).
fiscal.BAREMES[2099] = {
  regimes: {
    ir_general: { libelle: 'TEST ISOLATION', taux: 0.50, plafond: { type: 'pct_revenu', valeur: 0.10 }, case: '7UF' },
    ir_coluche: { libelle: 'TEST ISOLATION', taux: 0.75, plafond: { type: 'montant', valeur: 200000 }, bascule: 'ir_general', case: '7UD' },
    ir_partis: { libelle: 'TEST ISOLATION', taux: 0.66, plafond: { type: 'montant', valeur: 1500000 }, case: '7UH' },
  },
  report_annees: 5,
};
try {
  const donsTest = [{ montant: 10000, categorie: 'ir_general' }]; // 100 €
  const r2026 = fiscal.estimer(donsTest, 500000, 2026); // revenu 5000 €
  const r2099 = fiscal.estimer(donsTest, 500000, 2099);
  const r2100 = fiscal.estimer(donsTest, 500000, 2100);

  assert.strictEqual(r2026.reductionTotale, 6600, '2026 doit rester au taux réel 66 % malgré le barème fictif 2099');
  assert.strictEqual(r2026.plafond20, 100000, '2026 doit garder le plafond réel 20 % (1000 € pour 5000 € de revenu)');
  assert.strictEqual(r2099.reductionTotale, 5000, '2099 doit utiliser le barème fictif 50 % (isolation confirmée)');
  assert.strictEqual(r2099.plafond20, 50000, '2099 doit utiliser le plafond fictif 10 % (500 € pour 5000 € de revenu)');
  assert.strictEqual(r2100.reductionTotale, 5000, '2100 doit hériter du barème 2099 (héritage vers l\'avant uniquement)');
  ok('Isolation par année (2026 intact, 2099 isolé, 2100 hérite de 2099)');
} finally {
  delete fiscal.BAREMES[2099]; // nettoyage systématique, même en cas d'échec d'assertion
}
assert.strictEqual(fiscal.baremePour(2026), bareme2025, 'Après nettoyage, 2026 doit revenir à hériter de 2025');
ok('Nettoyage effectif (aucune trace du barème fictif après le test)');

console.log('\nTous les auto-tests du moteur fiscal passent.');
