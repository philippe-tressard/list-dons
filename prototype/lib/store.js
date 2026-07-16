'use strict';
/**
 * Persistance prototype : un simple fichier JSON (data/db.json).
 * Suffisant pour un usage mono-foyer de test. L'implémentation cible utilise SQLite.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const EMPTY = {
  utilisateur: null,           // { identifiant, hash }
  exercices: [],               // { annee, revenuImposable(cents|null), statut }
  beneficiaires: [],           // { id, nom, identifiant, categorie, habiliteRecu, adresse, telephone, siteWeb, email, notes, indicateurSuivi, archive }
  appreciations: [],           // { id, beneficiaireId, date, ton, commentaire }
  dons: [],                    // { id, annee, beneficiaireId, date, montant(cents), moyen, numeroRecu, note, recurrentId, justificatifs:[{id,nom,fichier}] }
  recurrents: [],              // { id, beneficiaireId, montant(cents), frequence, dateDebut, dateFin, moyen, note, statut }
};

let db = null;

function load() {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) {
    db = JSON.parse(JSON.stringify(EMPTY));
    save();
  } else {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    for (const k of Object.keys(EMPTY)) if (!(k in db)) db[k] = JSON.parse(JSON.stringify(EMPTY[k]));
  }
  return db;
}

function save() {
  ensureDirs();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function get() { return db || load(); }
const uid = () => require('crypto').randomUUID();

module.exports = { load, save, get, uid, UPLOAD_DIR, DATA_DIR };
