'use strict';
/**
 * Lance une instance de test du serveur, isolée : dossier de données temporaire
 * (LISTDONS_DATA_DIR) et port libre. Jamais les données de l'instance réelle.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

function portLibre() {
  return new Promise((ok, ko) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
    s.on('error', ko);
  });
}

/** Démarre le serveur sur une base pré-remplie `db` ; rend { url, dossier, arreter }. */
async function demarrer(db) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'listdons-test-'));
  fs.mkdirSync(path.join(dossier, 'uploads'));
  fs.writeFileSync(path.join(dossier, 'db.json'), JSON.stringify(db));
  const port = await portLibre();
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(port), LISTDONS_DATA_DIR: dossier },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let journal = '';
  proc.stdout.on('data', (d) => { journal += d; });
  proc.stderr.on('data', (d) => { journal += d; });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(url + '/api/session'); break; } catch { await new Promise((r) => setTimeout(r, 50)); }
    if (i === 99) throw new Error('Le serveur de test ne répond pas :\n' + journal);
  }
  return {
    url,
    dossier,
    journal: () => journal,
    arreter: () => { proc.kill(); fs.rmSync(dossier, { recursive: true, force: true }); },
  };
}

module.exports = { demarrer };
