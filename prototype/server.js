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
const pdf = require('./lib/pdf');

store.load();

// Secret JWT persistant (sessions conservées entre redémarrages)
const SECRET_FILE = path.join(store.DATA_DIR, 'secret.txt');
let SECRET;
if (fs.existsSync(SECRET_FILE)) SECRET = fs.readFileSync(SECRET_FILE, 'utf-8').trim();
else { SECRET = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(SECRET_FILE, SECRET); }

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// En-têtes de sécurité (faits main — pas de dépendance). CSP compatible avec l'app :
// scripts uniquement externes (script-src 'self'), styles inline autorisés (style="" générés
// par le JS + <style> de la page mentions légales), favicon en data: URI (img-src data:).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  next();
});

const upload = multer({ dest: store.UPLOAD_DIR, limits: { fileSize: 15 * 1024 * 1024 } });
// Montant € → centimes (entier ≥ 0) ; renvoie null si invalide (jamais de NaN en base).
function montantCents(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  if (!isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(new Date(s + 'T00:00:00').getTime());
const CAT_CODES = new Set(fiscal.CATEGORIES.map((c) => c.code));
const FREQUENCES = new Set(['mensuel', 'trimestriel', 'annuel']);

// Anti-brute-force sur /login : fenêtre glissante par IP + verrouillage temporaire.
// En LAN mono-foyer c'est surtout un garde-fou ; utile aussi contre un script mal réglé.
const LOGIN_MAX = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map(); // ip -> { count, first }
function ipDe(req) { return req.ip || req.socket.remoteAddress || 'unknown'; }
function loginThrottle(req, res, next) {
  const rec = loginAttempts.get(ipDe(req));
  if (rec && Date.now() - rec.first < LOGIN_WINDOW_MS && rec.count >= LOGIN_MAX) {
    const reste = Math.ceil((LOGIN_WINDOW_MS - (Date.now() - rec.first)) / 60000);
    return res.status(429).json({ error: `Trop de tentatives de connexion. Réessayez dans ~${reste} min.` });
  }
  next();
}
function noteLoginFail(req) {
  const ip = ipDe(req), rec = loginAttempts.get(ip);
  if (!rec || Date.now() - rec.first >= LOGIN_WINDOW_MS) loginAttempts.set(ip, { count: 1, first: Date.now() });
  else rec.count++;
}
function noteLoginSuccess(req) { loginAttempts.delete(ipDe(req)); }

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

app.post('/api/login', loginThrottle, (req, res) => {
  const db = store.get();
  const { identifiant, password } = req.body || {};
  if (!db.utilisateur || db.utilisateur.identifiant !== String(identifiant || '').trim() || !bcrypt.compareSync(password || '', db.utilisateur.hash)) {
    noteLoginFail(req);
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
  }
  noteLoginSuccess(req);
  setSession(res, db.utilisateur.identifiant);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => { res.clearCookie('ld_session'); res.json({ ok: true }); });

// ---- Mot de passe oublié : réinitialisation LOCALE (sans SMTP) -----------
// Conforme aux specs (§ Réinitialisation) : un code à usage unique est généré et INSCRIT
// DANS LE JOURNAL DU SERVEUR. Seul quelqu'un ayant accès à la machine (le foyer) peut le
// lire → c'est la preuve de légitimité pour un usage mono-foyer auto-hébergé. Réponses
// non énumérantes (ne révèlent jamais si le compte existe).
let resetToken = null; // { code, expires, attempts }
const RESET_TTL_MS = 15 * 60 * 1000;

app.post('/api/forgot', loginThrottle, (req, res) => {
  const db = store.get();
  const email = String((req.body || {}).identifiant || '').trim();
  if (db.utilisateur && db.utilisateur.identifiant === email) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 caractères hex
    resetToken = { code, expires: Date.now() + RESET_TTL_MS, attempts: 0 };
    console.log('\n==================================================');
    console.log(' RÉINITIALISATION DE MOT DE PASSE — List-dons');
    console.log(' Compte : ' + email);
    console.log(' CODE À USAGE UNIQUE : ' + code);
    console.log(' Valide 15 min. À saisir dans l\'écran « Mot de passe oublié ».');
    console.log('==================================================\n');
  }
  // Réponse identique que le compte existe ou non (non énumérant).
  res.json({ ok: true, message: "Si ce compte existe, un code à usage unique a été inscrit dans le journal du serveur." });
});

app.post('/api/reset', loginThrottle, (req, res) => {
  const db = store.get();
  const { identifiant, code, password } = req.body || {};
  const email = String(identifiant || '').trim();
  if (!resetToken || Date.now() > resetToken.expires) { resetToken = null; return res.status(400).json({ error: 'Code expiré ou inexistant. Recommencez la procédure.' }); }
  if (resetToken.attempts >= 5) { resetToken = null; return res.status(429).json({ error: 'Trop de tentatives. Recommencez la procédure.' }); }
  if (!db.utilisateur || db.utilisateur.identifiant !== email || String(code || '').trim().toUpperCase() !== resetToken.code) {
    resetToken.attempts++;
    return res.status(400).json({ error: 'Code incorrect.' });
  }
  if (!password || String(password).length < 6) return res.status(400).json({ error: 'Nouveau mot de passe requis (≥ 6 caractères).' });
  db.utilisateur.hash = bcrypt.hashSync(String(password), 10);
  store.save();
  resetToken = null;
  console.log('Mot de passe réinitialisé pour ' + email + '.');
  res.json({ ok: true });
});

// ---- API protégée -------------------------------------------------------
const api = express.Router();
api.use(requireAuth);

api.get('/categories', (req, res) => res.json(fiscal.CATEGORIES));

// Barème résolu pour une année (avec héritage N ← N-1) — récap des règles par exercice.
api.get('/baremes/:annee', (req, res) => {
  const annee = parseInt(req.params.annee, 10);
  const source = fiscal.anneeSourceBareme(annee);
  const b = fiscal.baremePour(annee);
  res.json({ annee, source, regimes: b.regimes, reportAnnees: b.report_annees });
});

// Exercices
api.get('/exercices', (req, res) => res.json(store.get().exercices.sort((a, b) => b.annee - a.annee)));
api.post('/exercices', (req, res) => {
  const db = store.get();
  const annee = parseInt(req.body.annee, 10);
  if (!annee || annee < 2000 || annee > 2100) return res.status(400).json({ error: 'Année invalide' });
  if (db.exercices.find((e) => e.annee === annee)) return res.status(400).json({ error: 'Exercice déjà existant' });
  let revenu = null;
  if (req.body.revenuImposable) { revenu = montantCents(req.body.revenuImposable); if (revenu === null) return res.status(400).json({ error: 'Revenu imposable invalide' }); }
  const ex = { annee, revenuImposable: revenu, statut: 'en_cours' };
  db.exercices.push(ex); store.save(); res.json(ex);
});
api.patch('/exercices/:annee', (req, res) => {
  const db = store.get();
  const ex = db.exercices.find((e) => e.annee === parseInt(req.params.annee, 10));
  if (!ex) return res.status(404).json({ error: 'Introuvable' });
  if ('revenuImposable' in req.body) {
    if (req.body.revenuImposable) { const r = montantCents(req.body.revenuImposable); if (r === null) return res.status(400).json({ error: 'Revenu imposable invalide' }); ex.revenuImposable = r; }
    else ex.revenuImposable = null;
  }
  if ('statut' in req.body) ex.statut = req.body.statut;
  store.save(); res.json(ex);
});

// Bénéficiaires
api.get('/beneficiaires', (req, res) => res.json(store.get().beneficiaires.filter((b) => !b.archive || req.query.all)));
api.post('/beneficiaires', (req, res) => {
  const db = store.get();
  const { nom, identifiant, categorie, habiliteRecu, adresse, telephone, siteWeb, email, notes } = req.body || {};
  if (!nom || !categorie) return res.status(400).json({ error: 'Nom et catégorie requis' });
  if (!CAT_CODES.has(categorie)) return res.status(400).json({ error: 'Catégorie fiscale invalide' });
  const b = { id: store.uid(), nom: String(nom).trim(), identifiant: identifiant || '', categorie, habiliteRecu: !!habiliteRecu, adresse: adresse || '', telephone: telephone || '', siteWeb: siteWeb || '', email: email || '', notes: notes || '', indicateurSuivi: 'neutre', archive: false };
  db.beneficiaires.push(b); store.save(); res.json(b);
});
api.patch('/beneficiaires/:id', (req, res) => {
  const db = store.get();
  const b = db.beneficiaires.find((x) => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'Introuvable' });
  if ('categorie' in req.body && !CAT_CODES.has(req.body.categorie)) return res.status(400).json({ error: 'Catégorie fiscale invalide' });
  for (const k of ['nom', 'identifiant', 'categorie', 'habiliteRecu', 'adresse', 'telephone', 'siteWeb', 'email', 'notes', 'indicateurSuivi', 'archive']) if (k in req.body) b[k] = req.body[k];
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
  const annee = req.query.annee ? parseInt(req.query.annee, 10) : null;
  const dons = db.dons.filter((d) => annee === null || d.annee === annee).sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((d) => ({ ...d, beneficiaire: db.beneficiaires.find((b) => b.id === d.beneficiaireId) || null }));
  res.json(dons);
});
api.post('/dons', (req, res) => {
  const db = store.get();
  const { beneficiaireId, date, montant, moyen, numeroRecu, note } = req.body || {};
  if (!beneficiaireId || !date || montant == null) return res.status(400).json({ error: 'Bénéficiaire, date et montant requis' });
  if (!validDate(date)) return res.status(400).json({ error: 'Date invalide (attendu AAAA-MM-JJ)' });
  const cents = montantCents(montant);
  if (cents === null || cents <= 0) return res.status(400).json({ error: 'Montant invalide' });
  if (!db.beneficiaires.find((b) => b.id === beneficiaireId)) return res.status(400).json({ error: 'Bénéficiaire inconnu' });
  const annee = parseInt(date.slice(0, 4), 10);
  const d = { id: store.uid(), annee, beneficiaireId, date, montant: cents, moyen: moyen || 'CB', numeroRecu: numeroRecu || '', note: note || '', recurrentId: null, justificatifs: [] };
  db.dons.push(d);
  if (!db.exercices.find((e) => e.annee === annee)) db.exercices.push({ annee, revenuImposable: null, statut: 'en_cours' });
  store.save(); res.json(d);
});
api.patch('/dons/:id', (req, res) => {
  const db = store.get();
  const d = db.dons.find((x) => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Introuvable' });
  if ('montant' in req.body) { const c = montantCents(req.body.montant); if (c === null || c <= 0) return res.status(400).json({ error: 'Montant invalide' }); d.montant = c; }
  if ('date' in req.body && !validDate(req.body.date)) return res.status(400).json({ error: 'Date invalide (attendu AAAA-MM-JJ)' });
  if ('beneficiaireId' in req.body && !db.beneficiaires.find((b) => b.id === req.body.beneficiaireId)) return res.status(400).json({ error: 'Bénéficiaire inconnu' });
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
  if (!beneficiaireId || montant == null || !frequence || !dateDebut || !annee) return res.status(400).json({ error: 'Champs requis manquants' });
  if (!FREQUENCES.has(frequence)) return res.status(400).json({ error: 'Fréquence invalide' });
  if (!validDate(dateDebut)) return res.status(400).json({ error: 'Date de début invalide (attendu AAAA-MM-JJ)' });
  const cents = montantCents(montant);
  if (cents === null || cents <= 0) return res.status(400).json({ error: 'Montant invalide' });
  if (!db.beneficiaires.find((b) => b.id === beneficiaireId)) return res.status(400).json({ error: 'Bénéficiaire inconnu' });
  const anneeInt = parseInt(annee, 10);
  if (!anneeInt || anneeInt < 2000 || anneeInt > 2100) return res.status(400).json({ error: 'Année invalide' });
  const rec = { id: store.uid(), beneficiaireId, montant: cents, frequence, dateDebut, dateFin: null, moyen: moyen || 'Prélèvement', note: note || '', statut: 'actif' };
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
api.delete('/dons/:donId/justificatifs/:jId', (req, res) => {
  const db = store.get();
  const d = db.dons.find((x) => x.id === req.params.donId);
  if (!d) return res.status(404).json({ error: 'Don introuvable' });
  const j = d.justificatifs.find((x) => x.id === req.params.jId);
  if (!j) return res.status(404).json({ error: 'Justificatif introuvable' });
  try { fs.unlinkSync(path.join(store.UPLOAD_DIR, j.fichier)); } catch { /* fichier déjà absent */ }
  d.justificatifs = d.justificatifs.filter((x) => x.id !== j.id);
  store.save(); res.json({ ok: true });
});

// Estimation
api.get('/estimation', (req, res) => {
  const db = store.get();
  const annee = parseInt(req.query.annee, 10);
  const ex = db.exercices.find((e) => e.annee === annee);
  const dons = db.dons.filter((d) => d.annee === annee).map((d) => ({ montant: d.montant, categorie: catDe(db, d.beneficiaireId) }));
  res.json(fiscal.estimer(dons, ex?.revenuImposable || null, annee));
});

// Récapitulatif fiscal annuel en PDF (aide à la déclaration)
api.get('/exercices/:annee/pdf', async (req, res) => {
  const db = store.get();
  const annee = parseInt(req.params.annee, 10);
  const ex = db.exercices.find((e) => e.annee === annee);
  const dons = db.dons.filter((d) => d.annee === annee).sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((d) => ({ ...d, beneficiaire: db.beneficiaires.find((b) => b.id === d.beneficiaireId) || null }));
  const estimation = fiscal.estimer(dons.map((d) => ({ montant: d.montant, categorie: catDe(db, d.beneficiaireId) })), ex?.revenuImposable || null, annee);
  try {
    await pdf.genererRecapitulatif(res, { annee, identifiant: db.utilisateur.identifiant, dons, estimation, uploadDir: store.UPLOAD_DIR });
  } catch (e) {
    console.error('Erreur génération PDF:', e);
    if (!res.headersSent) res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
  }
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
// Mentions légales : page publique (pas d'auth requise), URL propre sans .html.
// L'année du copyright est rendue côté serveur (placeholder) — pas de <script> inline,
// pour rester compatible avec la CSP stricte (script-src 'self').
app.get('/mentions-legales', (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, 'public', 'mentions-legales.html'), 'utf-8')
    .replace(/\{\{ANNEE\}\}/g, String(new Date().getFullYear()));
  res.type('html').send(html);
});
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
