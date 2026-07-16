'use strict';
/**
 * List-dons — prototype fonctionnel (Node/Express).
 * Sert l'API + l'IHM statique. Persistance JSON. Auth mono-foyer (JWT cookie).
 * ⚠️ Prototype de test — l'implémentation cible est en Rust (voir specs).
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const store = require('./lib/store');
const fiscal = require('./lib/fiscal');

store.load();

// Secret JWT persistant (sessions conservées entre redémarrages)
const SECRET_FILE = path.join(store.DATA_DIR, 'secret.txt');
let SECRET;
if (fs.existsSync(SECRET_FILE)) SECRET = fs.readFileSync(SECRET_FILE, 'utf-8').trim();
else { SECRET = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(SECRET_FILE, SECRET); }

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const upload = multer({ dest: store.UPLOAD_DIR, limits: { fileSize: 15 * 1024 * 1024 } });
const toCents = (euros) => Math.round(parseFloat(String(euros).replace(',', '.')) * 100);

// ---- Auth ---------------------------------------------------------------
function setSession(res, identifiant) {
  const token = jwt.sign({ sub: identifiant }, SECRET, { expiresIn: '30d' });
  res.cookie('ld_session', token, { httpOnly: true, sameSite: 'strict', maxAge: 30 * 24 * 3600 * 1000 });
}
function currentUser(req) {
  const t = req.cookies.ld_session;
  if (!t) return null;
  try { return jwt.verify(t, SECRET).sub; } catch { return null; }
}
function requireAuth(req, res, next) {
  if (!currentUser(req)) return res.status(401).json({ error: 'Non authentifié' });
  next();
}

app.get('/api/session', (req, res) => {
  const db = store.get();
  res.json({ authenticated: !!currentUser(req), hasAccount: !!db.utilisateur, identifiant: db.utilisateur?.identifiant || null });
});

app.post('/api/setup', (req, res) => {
  const db = store.get();
  if (db.utilisateur) return res.status(400).json({ error: 'Un compte existe déjà' });
  const { identifiant, password } = req.body || {};
  if (!identifiant || !password || password.length < 6) return res.status(400).json({ error: 'Identifiant + mot de passe (≥ 6 caractères) requis' });
  db.utilisateur = { identifiant: String(identifiant).trim(), hash: bcrypt.hashSync(password, 10) };
  store.save();
  setSession(res, db.utilisateur.identifiant);
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  const db = store.get();
  const { identifiant, password } = req.body || {};
  if (!db.utilisateur || db.utilisateur.identifiant !== String(identifiant || '').trim() || !bcrypt.compareSync(password || '', db.utilisateur.hash)) {
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
  }
  setSession(res, db.utilisateur.identifiant);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => { res.clearCookie('ld_session'); res.json({ ok: true }); });

// ---- API protégée -------------------------------------------------------
const api = express.Router();
api.use(requireAuth);

api.get('/categories', (req, res) => res.json(fiscal.CATEGORIES));

// Exercices
api.get('/exercices', (req, res) => res.json(store.get().exercices.sort((a, b) => b.annee - a.annee)));
api.post('/exercices', (req, res) => {
  const db = store.get();
  const annee = parseInt(req.body.annee, 10);
  if (!annee || annee < 2000 || annee > 2100) return res.status(400).json({ error: 'Année invalide' });
  if (db.exercices.find((e) => e.annee === annee)) return res.status(400).json({ error: 'Exercice déjà existant' });
  const ex = { annee, revenuImposable: req.body.revenuImposable ? toCents(req.body.revenuImposable) : null, statut: 'en_cours' };
  db.exercices.push(ex); store.save(); res.json(ex);
});
api.patch('/exercices/:annee', (req, res) => {
  const db = store.get();
  const ex = db.exercices.find((e) => e.annee === parseInt(req.params.annee, 10));
  if (!ex) return res.status(404).json({ error: 'Introuvable' });
  if ('revenuImposable' in req.body) ex.revenuImposable = req.body.revenuImposable ? toCents(req.body.revenuImposable) : null;
  if ('statut' in req.body) ex.statut = req.body.statut;
  store.save(); res.json(ex);
});

// Bénéficiaires
api.get('/beneficiaires', (req, res) => res.json(store.get().beneficiaires.filter((b) => !b.archive || req.query.all)));
api.post('/beneficiaires', (req, res) => {
  const db = store.get();
  const { nom, identifiant, categorie, habiliteRecu, notes } = req.body || {};
  if (!nom || !categorie) return res.status(400).json({ error: 'Nom et catégorie requis' });
  const b = { id: store.uid(), nom: String(nom).trim(), identifiant: identifiant || '', categorie, habiliteRecu: !!habiliteRecu, notes: notes || '', indicateurSuivi: 'neutre', archive: false };
  db.beneficiaires.push(b); store.save(); res.json(b);
});
api.patch('/beneficiaires/:id', (req, res) => {
  const db = store.get();
  const b = db.beneficiaires.find((x) => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'Introuvable' });
  for (const k of ['nom', 'identifiant', 'categorie', 'habiliteRecu', 'notes', 'indicateurSuivi', 'archive']) if (k in req.body) b[k] = req.body[k];
  store.save(); res.json(b);
});
api.get('/beneficiaires/:id/appreciations', (req, res) => res.json(store.get().appreciations.filter((a) => a.beneficiaireId === req.params.id).sort((a, b) => (a.date < b.date ? 1 : -1))));
api.post('/beneficiaires/:id/appreciations', (req, res) => {
  const db = store.get();
  const a = { id: store.uid(), beneficiaireId: req.params.id, date: req.body.date || new Date().toISOString().slice(0, 10), ton: req.body.ton || 'neutre', commentaire: req.body.commentaire || '' };
  db.appreciations.push(a); store.save(); res.json(a);
});

// Dons
function catDe(db, beneficiaireId) { return db.beneficiaires.find((b) => b.id === beneficiaireId)?.categorie || 'ir_general'; }
api.get('/dons', (req, res) => {
  const db = store.get();
  const annee = parseInt(req.query.annee, 10);
  const dons = db.dons.filter((d) => d.annee === annee).sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((d) => ({ ...d, beneficiaire: db.beneficiaires.find((b) => b.id === d.beneficiaireId) || null }));
  res.json(dons);
});
api.post('/dons', (req, res) => {
  const db = store.get();
  const { beneficiaireId, date, montant, moyen, numeroRecu, note } = req.body || {};
  if (!beneficiaireId || !date || !montant) return res.status(400).json({ error: 'Bénéficiaire, date et montant requis' });
  const annee = parseInt(date.slice(0, 4), 10);
  const d = { id: store.uid(), annee, beneficiaireId, date, montant: toCents(montant), moyen: moyen || 'CB', numeroRecu: numeroRecu || '', note: note || '', recurrentId: null, justificatifs: [] };
  db.dons.push(d);
  if (!db.exercices.find((e) => e.annee === annee)) db.exercices.push({ annee, revenuImposable: null, statut: 'en_cours' });
  store.save(); res.json(d);
});
api.patch('/dons/:id', (req, res) => {
  const db = store.get();
  const d = db.dons.find((x) => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Introuvable' });
  if ('montant' in req.body) d.montant = toCents(req.body.montant);
  for (const k of ['date', 'moyen', 'numeroRecu', 'note', 'beneficiaireId']) if (k in req.body) d[k] = req.body[k];
  if ('date' in req.body) d.annee = parseInt(d.date.slice(0, 4), 10);
  store.save(); res.json(d);
});
api.delete('/dons/:id', (req, res) => {
  const db = store.get();
  db.dons = db.dons.filter((x) => x.id !== req.params.id);
  store.save(); res.json({ ok: true });
});

// Dons récurrents (génération simple des échéances de l'année, ≤ aujourd'hui)
api.post('/recurrents', (req, res) => {
  const db = store.get();
  const { beneficiaireId, montant, frequence, dateDebut, moyen, note, annee } = req.body || {};
  if (!beneficiaireId || !montant || !frequence || !dateDebut || !annee) return res.status(400).json({ error: 'Champs requis manquants' });
  const rec = { id: store.uid(), beneficiaireId, montant: toCents(montant), frequence, dateDebut, dateFin: null, moyen: moyen || 'Prélèvement', note: note || '', statut: 'actif' };
  db.recurrents.push(rec);
  const pas = { mensuel: 1, trimestriel: 3, annuel: 12 }[frequence] || 1;
  const start = new Date(dateDebut + 'T00:00:00');
  const today = new Date();
  const finAnnee = new Date(parseInt(annee, 10), 11, 31);
  const limite = today < finAnnee ? today : finAnnee;
  let genere = 0;
  for (let dt = new Date(start); dt <= limite; dt.setMonth(dt.getMonth() + pas)) {
    if (dt.getFullYear() !== parseInt(annee, 10)) continue;
    const iso = dt.toISOString().slice(0, 10);
    db.dons.push({ id: store.uid(), annee: parseInt(annee, 10), beneficiaireId, date: iso, montant: rec.montant, moyen: rec.moyen, numeroRecu: '', note: 'Échéance ' + frequence, recurrentId: rec.id, justificatifs: [] });
    genere++;
  }
  store.save(); res.json({ recurrent: rec, versementsGeneres: genere });
});
api.post('/recurrents/:id/arreter', (req, res) => {
  const db = store.get();
  const rec = db.recurrents.find((r) => r.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Introuvable' });
  rec.statut = 'arrete'; rec.dateFin = new Date().toISOString().slice(0, 10);
  store.save(); res.json({ ok: true, rappel: "Pensez à résilier aussi le prélèvement réel auprès de l'organisme / la banque." });
});

// Justificatifs
api.post('/dons/:id/justificatifs', upload.single('fichier'), (req, res) => {
  const db = store.get();
  const d = db.dons.find((x) => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Don introuvable' });
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
  const j = { id: store.uid(), nom: req.file.originalname, fichier: path.basename(req.file.path), type: req.file.mimetype };
  d.justificatifs.push(j); store.save(); res.json(j);
});
api.get('/justificatifs/:donId/:jId', (req, res) => {
  const db = store.get();
  const d = db.dons.find((x) => x.id === req.params.donId);
  const j = d?.justificatifs.find((x) => x.id === req.params.jId);
  if (!j) return res.status(404).end();
  res.download(path.join(store.UPLOAD_DIR, j.fichier), j.nom);
});

// Estimation
api.get('/estimation', (req, res) => {
  const db = store.get();
  const annee = parseInt(req.query.annee, 10);
  const ex = db.exercices.find((e) => e.annee === annee);
  const dons = db.dons.filter((d) => d.annee === annee).map((d) => ({ montant: d.montant, categorie: catDe(db, d.beneficiaireId) }));
  res.json(fiscal.estimer(dons, ex?.revenuImposable || null, annee));
});

// Comparatif N-1 (bénéficiaires de l'année précédente)
api.get('/rappel-n1', (req, res) => {
  const db = store.get();
  const annee = parseInt(req.query.annee, 10);
  const totalPar = (an) => {
    const m = {};
    for (const d of db.dons.filter((x) => x.annee === an)) m[d.beneficiaireId] = (m[d.beneficiaireId] || 0) + d.montant;
    return m;
  };
  const n1 = totalPar(annee - 1), n = totalPar(annee);
  const ids = new Set([...Object.keys(n1), ...Object.keys(n)]);
  const lignes = [...ids].map((id) => {
    const b = db.beneficiaires.find((x) => x.id === id);
    const mN1 = n1[id] || 0, mN = n[id] || 0;
    let statut = 'reconduit'; if (!mN1) statut = 'nouveau'; else if (!mN) statut = 'non_renouvele';
    return { beneficiaire: b, montantN1: mN1, montantN: mN, statut };
  }).filter((l) => l.beneficiaire);
  res.json(lignes);
});

app.use('/api', api);

// ---- IHM statique -------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  const db = store.get();
  console.log('=================================================');
  console.log(' List-dons (prototype) démarré');
  console.log(' Local  : http://localhost:' + PORT);
  console.log(' Compte : ' + (db.utilisateur ? db.utilisateur.identifiant : '(à créer au premier accès)'));
  console.log('=================================================');
});
