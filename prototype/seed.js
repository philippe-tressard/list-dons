'use strict';
// Jeu de démonstration ANONYMISÉ (fixture §6.7). Lancer sur une base vide : node seed.js
const bcrypt = require('bcryptjs');
const store = require('./lib/store');
const db = store.load();

// Le seed REMPLACE compte, exercices, bénéficiaires et dons. Sur une base qui contient
// déjà quelque chose — l'instance réelle, par exemple —, il refuse, sauf demande
// explicite. Pourquoi (ticket #7, audit du 03/11/2026) : le script était présent dans
// l'image de production, où un `node seed.js` aurait remplacé le vrai compte par le
// compte de démonstration. Test : test/seed.test.js.
const nonVide = db.utilisateur || db.exercices.length || db.beneficiaires.length || db.dons.length;
if (nonVide && !process.argv.includes('--ecraser')) {
  console.error('Refus : la base contient déjà des données (' + store.DATA_DIR + ').');
  console.error('Le seed les remplacerait. Pour une base de démonstration, partir d\'un dossier vide ;');
  console.error('pour écraser malgré tout : node seed.js --ecraser');
  process.exit(1);
}

db.utilisateur = { identifiant: 'demo@list-dons.fr', hash: bcrypt.hashSync('demo123', 10) };
db.exercices = [{ annee: 2025, revenuImposable: 6000000, statut: 'en_cours' }];

const mk = (nom, categorie, identifiant = '') => ({ id: store.uid(), nom, identifiant, categorie, habiliteRecu: true, notes: '', indicateurSuivi: 'neutre', archive: false });
const alpha = mk('Association Alpha', 'ir_general');
const beta = mk('Association Bêta', 'ir_general');
const gamma = mk('Parti Gamma', 'ir_partis');
db.beneficiaires = [alpha, beta, gamma];

const don = (b, date, euros) => ({ id: store.uid(), annee: 2025, beneficiaireId: b.id, date, montant: Math.round(euros * 100), moyen: 'CB', numeroRecu: '', note: '', recurrentId: null, justificatifs: [] });
db.dons = [don(alpha, '2025-11-13', 50), don(beta, '2025-11-28', 50), don(gamma, '2025-04-25', 60)];
db.appreciations = []; db.recurrents = [];

store.save();
console.log('Seed OK — compte demo@list-dons.fr / demo123, exercice 2025, 3 dons (réduction attendue 105,60 €).');
