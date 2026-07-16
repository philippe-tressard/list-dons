'use strict';
// Jeu de démonstration ANONYMISÉ (fixture §6.7). Lancer : node seed.js
const bcrypt = require('bcryptjs');
const store = require('./lib/store');
const db = store.load();

db.utilisateur = { identifiant: 'demo', hash: bcrypt.hashSync('demo123', 10) };
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
console.log('Seed OK — compte demo / demo123, exercice 2025, 3 dons (réduction attendue 105,60 €).');
