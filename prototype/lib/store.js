'use strict';
/**
 * Persistance prototype : un simple fichier JSON (data/db.json).
 * Stockage retenu pour l'usage mono-foyer (décision du 19/07/2026) ; la cible SQLite est abandonnée.
 */
const fs = require('fs');
const path = require('path');

// LISTDONS_DATA_DIR : dossier de données d'un test, jamais celui de l'instance (défaut : data/).
const DATA_DIR = process.env.LISTDONS_DATA_DIR || path.join(__dirname, '..', 'data');
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
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      // db.json illisible/corrompu (ex. coupure de courant sur le RPi) : on tente le
      // filet de sécurité .bak (dernière version saine conservée avant chaque écriture).
      if (fs.existsSync(DB_FILE + '.bak')) {
        console.error('db.json corrompu — restauration depuis .bak :', e.message);
        db = JSON.parse(fs.readFileSync(DB_FILE + '.bak', 'utf-8'));
        save(); // réécrit une base saine
      } else {
        throw e;
      }
    }
    for (const k of Object.keys(EMPTY)) if (!(k in db)) db[k] = JSON.parse(JSON.stringify(EMPTY[k]));
  }
  return db;
}

// Écriture atomique et durable : on écrit un fichier temporaire, on force sa synchronisation
// disque (fsync), on conserve la version précédente en .bak, puis on remplace par rename
// (atomique sur le même système de fichiers). Une coupure en cours d'écriture ne peut donc
// plus laisser un db.json tronqué : soit l'ancien intact, soit le nouveau complet.
function save() {
  ensureDirs();
  const tmp = DB_FILE + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, JSON.stringify(db, null, 2));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try { if (fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE, DB_FILE + '.bak'); } catch { /* filet best-effort */ }
  fs.renameSync(tmp, DB_FILE);
}

function get() { return db || load(); }
const uid = () => require('crypto').randomUUID();

module.exports = { load, save, get, uid, UPLOAD_DIR, DATA_DIR };
