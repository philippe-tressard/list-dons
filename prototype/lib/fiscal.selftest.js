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
// (2026 a son propre millésime depuis le 03/11/2026 : plafond « Coluche » à 2 000 €.)
const bareme2026 = fiscal.baremePour(2026);
assert.notStrictEqual(bareme2026, fiscal.baremePour(2025), '2026 a son propre barème');
assert.strictEqual(fiscal.baremePour(2027), bareme2026, '2027 doit hériter du barème 2026');
ok('Héritage N ← N-1 (2027 hérite de 2026)');

// --- 2 bis) Règles sourcées (ticket #6, vérifiées le 03/11/2026) ---
const coluche = [{ montant: 150000, categorie: 'ir_coluche' }]; // 1 500 €
// 2025 : plafond 1 000 € (2 000 € seulement pour les dons à compter du 14/10/2025, répartition
// non documentée → prudence) : 75 % × 1 000 + 66 % × 500 = 1 080 €.
assert.strictEqual(fiscal.estimer(coluche, null, 2025).reductionTotale, 108000, '2025 : Coluche plafonné à 1 000 €');
// 2026 : plafond 2 000 € sur tout l'exercice : 75 % × 1 500 = 1 125 €.
assert.strictEqual(fiscal.estimer(coluche, null, 2026).reductionTotale, 112500, '2026 : Coluche plafonné à 2 000 €');
ok('Plafond « Coluche » : 1 000 € en 2025, 2 000 € en 2026');

// Partis : 66 % dans la limite de 20 % du revenu, avec les dons d'intérêt général.
// Revenu 1 000 € → plafond 200 € ; 150 € intérêt général + 100 € parti → 200 € retenus.
const mixte = fiscal.estimer([{ montant: 15000, categorie: 'ir_general' }, { montant: 10000, categorie: 'ir_partis' }], 100000, 2025);
assert.strictEqual(mixte.reductionTotale, 13200, 'partis + intérêt général plafonnés ensemble à 20 % du revenu');
assert.strictEqual(mixte.baseEligible20, 25000, 'la base soumise aux 20 % inclut les dons aux partis');
assert.strictEqual(mixte.reportable, 5000, "l'excédent au-delà des 20 % se reporte");
// Au-delà de 15 000 €, la fraction des dons aux partis n'est ni retenue ni reportable.
const gros = fiscal.estimer([{ montant: 2000000, categorie: 'ir_partis' }], 10000000, 2025);
assert.strictEqual(gros.reductionTotale, 990000, 'partis retenus dans la limite de 15 000 €');
assert.strictEqual(gros.reportable, 0, 'la fraction au-delà de 15 000 € ne se reporte pas');
ok('Partis : limite de 20 % partagée, plafond de 15 000 € non reportable');

// Aucun chiffre sans source : chaque régime et la durée de report de chaque barème la portent.
for (const [annee, b] of Object.entries(fiscal.BAREMES)) {
  for (const [code, r] of Object.entries(b.regimes)) {
    assert.ok(r.sources && r.sources.length, `${annee}/${code} : aucune source`);
    for (const src of r.sources) assert.ok(fiscal.SOURCES[src], `${annee}/${code} : source inconnue « ${src} »`);
  }
  assert.ok(b.report_sources && b.report_sources.every((x) => fiscal.SOURCES[x]), `${annee} : report sans source`);
}
for (const [cle, src] of Object.entries(fiscal.SOURCES)) {
  assert.match(src.url, /^https:\/\/(www\.legifrance\.gouv\.fr|bofip\.impots\.gouv\.fr|www\.service-public\.gouv\.fr)\//, `${cle} : URL officielle attendue`);
  assert.match(src.consulte, /^\d{4}-\d{2}-\d{2}$/, `${cle} : date de consultation attendue`);
}
ok('Chaque valeur du barème porte une source officielle datée');

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
  assert.strictEqual(r2026.plafondPct20, 20, '2026 doit afficher le taux réel 20 % (jamais codé en dur dans l\'IHM)');
  assert.strictEqual(r2099.reductionTotale, 5000, '2099 doit utiliser le barème fictif 50 % (isolation confirmée)');
  assert.strictEqual(r2099.plafond20, 50000, '2099 doit utiliser le plafond fictif 10 % (500 € pour 5000 € de revenu)');
  assert.strictEqual(r2099.plafondPct20, 10, '2099 doit afficher le taux fictif 10 % (dérivé du barème, pas codé en dur)');
  assert.strictEqual(r2100.reductionTotale, 5000, '2100 doit hériter du barème 2099 (héritage vers l\'avant uniquement)');
  assert.strictEqual(fiscal.anneeSourceBareme(2026), 2026, '2026 doit être résolu depuis sa source 2026');
  assert.strictEqual(fiscal.anneeSourceBareme(2099), 2099, '2099 doit être résolu depuis sa propre source 2099');
  ok('Isolation par année (2026 intact, 2099 isolé, 2100 hérite de 2099)');
} finally {
  delete fiscal.BAREMES[2099]; // nettoyage systématique, même en cas d'échec d'assertion
}
assert.strictEqual(fiscal.baremePour(2027), bareme2026, 'Après nettoyage, 2027 doit revenir à hériter de 2026');
assert.strictEqual(fiscal.anneeSourceBareme(2100), 2026, 'Après nettoyage, la source de 2100 doit redevenir 2026');
ok('Nettoyage effectif (aucune trace du barème fictif après le test)');

console.log('\nTous les auto-tests du moteur fiscal passent.');
