'use strict';
// List-dons — prototype IHM (vanilla JS)

const $ = (sel, el = document) => el.querySelector(sel);
const app = $('#app');
let state = { year: new Date().getFullYear(), tab: 'dashboard', cats: [] };

async function api(method, path, body, isForm) {
  const opt = { method, headers: {} };
  if (body && !isForm) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  if (isForm) opt.body = body;
  const r = await fetch('/api' + path, opt);
  if (r.status === 401) { render(); throw new Error('auth'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Erreur');
  return data;
}
const fmt = (c) => (c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const catLabel = (code) => (state.cats.find((c) => c.code === code) || {}).libelle || code;

// Modale réutilisable : openModal(titre, htmlContenu) → renvoie l'élément .modal (avec .close câblé).
function openModal(titre, innerHtml) {
  closeModal();
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal"><h2>${esc(titre)}<button class="close" type="button" aria-label="Fermer">×</button></h2><div class="modal-body">${innerHtml}</div></div>`;
  document.body.appendChild(back);
  back.querySelector('.close').onclick = closeModal;
  return back.querySelector('.modal');
}
function closeModal() { const m = $('.modal-backdrop'); if (m) m.remove(); }

// ---------- Boot ----------
async function render() {
  const s = await api('GET', '/session');
  if (!s.authenticated) return renderAuth(s);
  state.cats = await api('GET', '/categories');
  await renderMain();
}

// ---------- Auth ----------
function renderAuth(s) {
  const setup = !s.hasAccount;
  app.innerHTML = `
    <div class="auth-page"><div class="card auth-card">
      <div class="logo">🎗️</div>
      <h1>List-dons</h1>
      <p class="sub">Vos dons, votre imposition</p>
      <div id="autherr"></div>
      <form id="authform">
        <label for="id">Identifiant *</label>
        <input id="id" autocomplete="username" required />
        <label for="pw">Mot de passe *</label>
        <input id="pw" type="password" autocomplete="${setup ? 'new-password' : 'current-password'}" required />
        <div class="form-actions"><button class="btn btn-primary" type="submit">${setup ? 'Créer le compte' : 'Se connecter'}</button></div>
      </form>
      <p class="muted" style="text-align:center">${setup ? 'Premier lancement : créez votre compte (mono-foyer).' : ''}</p>
    </div></div>`;
  $('#authform').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('POST', setup ? '/setup' : '/login', { identifiant: $('#id').value, password: $('#pw').value });
      render();
    } catch (err) { $('#autherr').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`; }
  };
}

// ---------- Main ----------
async function renderMain() {
  const exercices = await api('GET', '/exercices');
  if (!exercices.find((e) => e.annee === state.year) && exercices.length) state.year = exercices[0].annee;
  const years = [...new Set([...exercices.map((e) => e.annee), state.year])].sort((a, b) => b - a);
  app.innerHTML = `
    <header class="topbar">
      <h1>🎗️ List-dons</h1>
      <label style="margin:0;color:#fff">Exercice&nbsp;
        <select id="yearsel">${years.map((y) => `<option ${y === state.year ? 'selected' : ''}>${y}</option>`).join('')}</select>
      </label>
      <button class="btn btn-sm btn-outline" id="addyear" style="background:#fff">+ Année</button>
      <span class="spacer"></span>
      <button class="btn btn-sm btn-outline" id="logout" style="background:#fff">Déconnexion</button>
    </header>
    <nav class="tabs">
      ${[['dashboard', 'Tableau de bord'], ['benef', 'Bénéficiaires'], ['params', 'Paramètres']].map(([k, l]) => `<button data-tab="${k}" class="${state.tab === k ? 'active' : ''}">${l}</button>`).join('')}
    </nav>
    <main id="content"></main>
    <p class="disclaimer">Estimation indicative — ne remplace pas votre déclaration officielle ni un conseil fiscal.<br>Prototype de test — implémentation cible en Rust.</p>`;
  $('#yearsel').onchange = (e) => { state.year = parseInt(e.target.value, 10); renderMain(); };
  $('#logout').onclick = async () => { await api('POST', '/logout'); render(); };
  $('#addyear').onclick = async () => {
    const y = prompt('Année d\'imposition à créer ?', String(new Date().getFullYear()));
    if (!y) return;
    try { await api('POST', '/exercices', { annee: parseInt(y, 10) }); state.year = parseInt(y, 10); renderMain(); }
    catch (e) { alert(e.message); }
  };
  app.querySelectorAll('nav.tabs button').forEach((b) => b.onclick = () => { state.tab = b.dataset.tab; renderMain(); });
  if (state.tab === 'dashboard') await tabDashboard();
  else if (state.tab === 'benef') await tabBenef();
  else await tabParams();
}

// ---------- Dashboard ----------
async function tabDashboard() {
  const c = $('#content');
  const [est, dons, benefs, rappel, tousLesDons] = await Promise.all([
    api('GET', '/estimation?annee=' + state.year),
    api('GET', '/dons?annee=' + state.year),
    api('GET', '/beneficiaires'),
    api('GET', '/rappel-n1?annee=' + state.year),
    api('GET', '/dons'),
  ]);
  const montantN1Par = {}; rappel.forEach((l) => { montantN1Par[l.beneficiaire.id] = l.montantN1; });
  const nonRenouveles = groupesNonRenouveles(tousLesDons, state.year);
  const anneesNonRenouvelees = Object.keys(nonRenouveles).map(Number).sort((a, b) => b - a);
  const totalNonRenouveles = anneesNonRenouvelees.reduce((s, a) => s + nonRenouveles[a].length, 0);
  const casesHtml = Object.entries(est.cases).filter(([, v]) => v > 0)
    .map(([k, v]) => `<span class="badge badge-${k.slice(1).toLowerCase()}">${k} : ${fmt(v)}</span>`).join(' ') || '<span class="muted">—</span>';
  c.innerHTML = `
    <div class="card">
      <h2 style="overflow:auto">Réduction d'impôt estimée ${state.year}
        <a class="btn btn-sm btn-outline" style="float:right;font-family:'Segoe UI',system-ui,sans-serif" href="/api/exercices/${state.year}/pdf" target="_blank" rel="noopener">📄 PDF récapitulatif</a>
      </h2>
      <div class="grid">
        <div class="stat"><div class="value">${fmt(est.reductionTotale)}</div><div class="label">Réduction estimée</div></div>
        <div class="stat"><div class="value">${fmt(est.totalDonne)}</div><div class="label">Total donné</div></div>
        <div class="stat"><div class="value">${est.reportable ? fmt(est.reportable) : '0 €'}</div><div class="label">Report (5 ans)</div></div>
      </div>
      <p style="margin:.75rem 0 .25rem"><strong>Cases 2042 RICI :</strong> ${casesHtml}</p>
      ${est.detail.length ? `<table><thead><tr><th>Régime</th><th>Taux</th><th>Base</th><th>Réduction</th><th>Case</th></tr></thead><tbody>
        ${est.detail.map((d) => `<tr><td>${esc(d.libelle)}</td><td>${Math.round(d.taux * 100)} %</td><td>${fmt(d.base)}</td><td>${fmt(d.reduction)}</td><td>${d.case}</td></tr>`).join('')}
      </tbody></table>` : '<p class="muted">Aucun don saisi pour cet exercice.</p>'}
    </div>

    <div class="card">
      <h2>Ajouter un don</h2>
      <div id="donerr"></div>
      <form id="donform">
        <div class="row">
          <div>
            <label>Bénéficiaire *</label>
            <select id="benefsel" required>
              <option value="">— choisir —</option>
              ${benefs.map((b) => `<option value="${b.id}">${esc(b.nom)} · ${esc(catLabel(b.categorie))}</option>`).join('')}
              <option value="__new">+ Créer un bénéficiaire…</option>
            </select>
          </div>
          <div><label>Montant (€) *</label><input id="montant" type="number" step="0.01" min="0" required /></div>
        </div>
        <div id="newbenef" class="hidden card" style="background:var(--bg);margin:.5rem 0">
          <div class="row">
            <div><label>Nom du bénéficiaire *</label><input id="nb_nom" /></div>
            <div><label>Catégorie fiscale *</label><select id="nb_cat">${state.cats.map((c) => `<option value="${c.code}">${esc(c.libelle)}</option>`).join('')}</select></div>
          </div>
          <div><label>SIREN / RNA (facultatif)</label><input id="nb_id" /></div>
        </div>
        <div class="row">
          <div><label>Date *</label><input id="date" type="date" value="${state.year}-01-01" required /></div>
          <div><label>Fréquence</label>
            <select id="freq"><option value="unique">Unique</option><option value="mensuel">Mensuel</option><option value="trimestriel">Trimestriel</option><option value="annuel">Annuel</option></select>
          </div>
          <div><label>Moyen de paiement</label>
            <select id="moyen"><option>CB</option><option>Virement</option><option>Chèque</option><option>Prélèvement</option><option>Espèces</option></select>
          </div>
        </div>
        <div class="row">
          <div><label>N° de reçu fiscal (facultatif)</label><input id="numeroRecu" /></div>
          <div><label>Note / raison du don (facultatif)</label><input id="note" /></div>
        </div>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Enregistrer</button></div>
      </form>
    </div>

    <div class="card">
      <h2>Dons ${state.year} <span class="muted">(${dons.length})</span></h2>
      ${dons.length ? `<table><thead><tr><th>Date</th><th>Bénéficiaire</th><th>Montant</th><th>N-1</th><th>Case</th><th>N° reçu</th><th>PJ</th><th></th></tr></thead><tbody>
        ${dons.map((d) => `<tr>
          <td>${d.date}</td>
          <td>${esc(d.beneficiaire?.nom || '?')}${d.recurrentId ? ' 🔁' : ''}</td>
          <td>${fmt(d.montant)}</td>
          <td class="muted" title="Montant versé à ce bénéficiaire en ${state.year - 1}">${montantN1Par[d.beneficiaireId] ? fmt(montantN1Par[d.beneficiaireId]) : '—'}</td>
          <td>${caseBadge(d.beneficiaire?.categorie)}</td>
          <td>${d.numeroRecu ? esc(d.numeroRecu) : '<span class="muted">—</span>'}</td>
          <td>${d.justificatifs.length ? '📎 ' + d.justificatifs.length : '<span class="muted">—</span>'}</td>
          <td style="white-space:nowrap"><button class="btn-link" data-edit="${d.id}">✏️</button> <button class="btn-danger" data-del="${d.id}">🗑️</button></td>
        </tr>`).join('')}
      </tbody></table>` : '<p class="muted">Aucun don.</p>'}
      ${totalNonRenouveles ? `
      <div class="nonrenew">
        <h3>↩️ Non renouvelée <span class="muted">(${totalNonRenouveles})</span></h3>
        ${anneesNonRenouvelees.map((an) => `
          <h4>${an} <span class="muted">(${nonRenouveles[an].length})</span></h4>
          <ul class="nonrenew-list">
            ${nonRenouveles[an].map((l) => `<li>
              <span class="nonrenew-name">${esc(l.beneficiaire.nom)}</span>
              ${suiviBadge(l.beneficiaire.indicateurSuivi)}
              <span class="muted nonrenew-amount">${fmt(l.montant)} en ${an}</span>
            </li>`).join('')}
          </ul>`).join('')}
      </div>` : ''}
    </div>

    <div class="card">
      <h2>Historique pluriannuel par bénéficiaire</h2>
      ${graphiqueHistorique(tousLesDons)}
    </div>`;

  // handlers
  $('#benefsel').onchange = (e) => $('#newbenef').classList.toggle('hidden', e.target.value !== '__new');
  $('#donform').onsubmit = async (e) => {
    e.preventDefault();
    try {
      let benefId = $('#benefsel').value;
      if (benefId === '__new') {
        if (!$('#nb_nom').value) throw new Error('Nom du bénéficiaire requis');
        const nb = await api('POST', '/beneficiaires', { nom: $('#nb_nom').value, categorie: $('#nb_cat').value, identifiant: $('#nb_id').value });
        benefId = nb.id;
      }
      if (!benefId) throw new Error('Choisissez un bénéficiaire');
      const freq = $('#freq').value;
      if (freq === 'unique') {
        await api('POST', '/dons', { beneficiaireId: benefId, date: $('#date').value, montant: $('#montant').value, moyen: $('#moyen').value, numeroRecu: $('#numeroRecu').value, note: $('#note').value });
      } else {
        const r = await api('POST', '/recurrents', { beneficiaireId: benefId, montant: $('#montant').value, frequence: freq, dateDebut: $('#date').value, moyen: $('#moyen').value, note: $('#note').value, annee: state.year });
        alert(r.versementsGeneres + ' versement(s) généré(s) pour ' + state.year + '.');
      }
      tabDashboard();
    } catch (err) { $('#donerr').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`; }
  };
  c.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (confirm('Supprimer ce don ?')) { await api('DELETE', '/dons/' + b.dataset.del); tabDashboard(); } });
  c.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => editDon(dons.find((d) => d.id === b.dataset.edit), benefs));
}

// Édition d'un don existant (champs + n° de reçu + pièces jointes)
function editDon(don, benefs) {
  const attachHtml = (d) => d.justificatifs.length
    ? `<ul class="attach-list">${d.justificatifs.map((j) => `<li><a href="/api/justificatifs/${d.id}/${j.id}" target="_blank">${esc(j.nom)}</a><button type="button" class="btn-danger" data-rmj="${j.id}">🗑️</button></li>`).join('')}</ul>`
    : '<p class="muted">Aucune pièce jointe.</p>';
  const m = openModal('Éditer le don', `
    <div id="edonerr"></div>
    <form id="edonform">
      <div class="row">
        <div><label>Bénéficiaire *</label>
          <select id="e_benef">${benefs.map((b) => `<option value="${b.id}" ${b.id === don.beneficiaireId ? 'selected' : ''}>${esc(b.nom)} · ${esc(catLabel(b.categorie))}</option>`).join('')}</select>
        </div>
        <div><label>Montant (€) *</label><input id="e_montant" type="number" step="0.01" min="0" value="${(don.montant / 100).toFixed(2)}" required /></div>
      </div>
      <div class="row">
        <div><label>Date *</label><input id="e_date" type="date" value="${esc(don.date)}" required /></div>
        <div><label>Moyen de paiement</label>
          <select id="e_moyen">${['CB', 'Virement', 'Chèque', 'Prélèvement', 'Espèces'].map((o) => `<option ${o === don.moyen ? 'selected' : ''}>${o}</option>`).join('')}</select>
        </div>
      </div>
      <div class="row">
        <div><label>N° de reçu fiscal (facultatif)</label><input id="e_recu" value="${esc(don.numeroRecu)}" /></div>
        <div><label>Note / raison du don (facultatif)</label><input id="e_note" value="${esc(don.note)}" /></div>
      </div>
      <div class="form-actions"><button class="btn btn-primary" type="submit">Enregistrer</button></div>
    </form>
    <h3 style="font-size:1rem;margin:.5rem 0 .2rem">Reçu fiscal / pièces jointes</h3>
    <div id="e_attach">${attachHtml(don)}</div>
    <label class="btn btn-sm btn-outline" style="cursor:pointer;display:inline-block;margin-top:.4rem">＋ Ajouter une pièce jointe<input type="file" id="e_upl" style="display:none"></label>`);

  const refreshAttach = async () => {
    const fresh = (await api('GET', '/dons?annee=' + state.year)).find((x) => x.id === don.id);
    don.justificatifs = fresh ? fresh.justificatifs : [];
    m.querySelector('#e_attach').innerHTML = attachHtml(don);
    wireAttach();
  };
  const wireAttach = () => m.querySelectorAll('[data-rmj]').forEach((b) => b.onclick = async () => {
    if (!confirm('Supprimer cette pièce jointe ?')) return;
    await api('DELETE', '/dons/' + don.id + '/justificatifs/' + b.dataset.rmj); await refreshAttach();
  });
  wireAttach();
  m.querySelector('#e_upl').onchange = async (e) => {
    const fd = new FormData(); fd.append('fichier', e.target.files[0]);
    await api('POST', '/dons/' + don.id + '/justificatifs', fd, true); await refreshAttach();
  };
  m.querySelector('#edonform').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('PATCH', '/dons/' + don.id, {
        beneficiaireId: m.querySelector('#e_benef').value, date: m.querySelector('#e_date').value,
        montant: m.querySelector('#e_montant').value, moyen: m.querySelector('#e_moyen').value,
        numeroRecu: m.querySelector('#e_recu').value, note: m.querySelector('#e_note').value,
      });
      closeModal(); tabDashboard();
    } catch (err) { m.querySelector('#edonerr').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`; }
  };
}
// Bénéficiaires n'ayant pas (encore) donné en anneeCourante mais ayant donné avant,
// groupés par leur dernière année de don (clé = année).
function groupesNonRenouveles(tousLesDons, anneeCourante) {
  const anneesParBenef = {};
  tousLesDons.forEach((d) => { (anneesParBenef[d.beneficiaireId] ??= new Set()).add(d.annee); });
  const groupes = {};
  Object.keys(anneesParBenef).forEach((id) => {
    if (anneesParBenef[id].has(anneeCourante)) return;
    const passees = [...anneesParBenef[id]].filter((a) => a < anneeCourante);
    if (!passees.length) return;
    const derniere = Math.max(...passees);
    const beneficiaire = tousLesDons.find((d) => d.beneficiaireId === id)?.beneficiaire;
    if (!beneficiaire) return;
    const montant = tousLesDons.filter((d) => d.beneficiaireId === id && d.annee === derniere).reduce((s, d) => s + d.montant, 0);
    (groupes[derniere] ??= []).push({ beneficiaire, montant });
  });
  Object.values(groupes).forEach((liste) => liste.sort((a, b) => b.montant - a.montant));
  return groupes;
}
// Historique pluriannuel : barres empilées par bénéficiaire (SVG fait main, sans dépendance).
function couleurBenef(index) { return `hsl(${(index * 137.5) % 360}, 55%, 48%)`; }
function graphiqueHistorique(tousLesDons) {
  if (!tousLesDons.length) return '<p class="muted">Pas encore assez de données pour un historique pluriannuel.</p>';
  const parAnnee = {};
  tousLesDons.forEach((d) => { (parAnnee[d.annee] ??= {})[d.beneficiaireId] = (parAnnee[d.annee]?.[d.beneficiaireId] || 0) + d.montant; });
  const annees = Object.keys(parAnnee).map(Number).sort((a, b) => a - b);
  if (annees.length < 2) return '<p class="muted">Historique disponible à partir de 2 exercices avec des dons saisis.</p>';

  const totalParBenef = {}, nomParBenef = {};
  tousLesDons.forEach((d) => {
    totalParBenef[d.beneficiaireId] = (totalParBenef[d.beneficiaireId] || 0) + d.montant;
    nomParBenef[d.beneficiaireId] = d.beneficiaire?.nom || '?';
  });
  const ordre = Object.keys(totalParBenef).sort((a, b) => totalParBenef[b] - totalParBenef[a]);
  const maxTotal = Math.max(...annees.map((a) => Object.values(parAnnee[a]).reduce((s, v) => s + v, 0)), 1);

  const ML = 64, BARW = 48, GAP = 28, H = 220, MT = 12, MB = 30;
  const svgW = ML + annees.length * (BARW + GAP);
  const svgH = MT + H + MB;
  const scale = H / maxTotal;

  const barres = annees.map((an, i) => {
    const x = ML + i * (BARW + GAP);
    let yOffset = 0;
    const segments = ordre.map((id, bi) => {
      const v = parAnnee[an][id] || 0;
      if (!v) return '';
      const h = v * scale;
      const y = MT + H - yOffset - h;
      yOffset += h;
      return `<rect x="${x}" y="${y}" width="${BARW}" height="${h}" fill="${couleurBenef(bi)}"><title>${esc(nomParBenef[id])} — ${an} — ${fmt(v)}</title></rect>`;
    }).join('');
    return segments + `<text x="${x + BARW / 2}" y="${MT + H + 20}" text-anchor="middle" class="chart-label">${an}</text>`;
  }).join('');

  const grille = [0, 0.5, 1].map((f) => {
    const y = MT + H - H * f;
    return `<line x1="${ML - 8}" y1="${y}" x2="${svgW}" y2="${y}" class="chart-grid" />
      <text x="${ML - 12}" y="${y + 4}" text-anchor="end" class="chart-label">${fmt(Math.round(maxTotal * f))}</text>`;
  }).join('');

  const legendeItems = ordre.slice(0, 10);
  const reste = ordre.length - legendeItems.length;
  const legende = legendeItems.map((id, i) => `<span class="chart-legend-item"><i style="background:${couleurBenef(i)}"></i>${esc(nomParBenef[id])} <span class="muted">(${fmt(totalParBenef[id])})</span></span>`).join('')
    + (reste > 0 ? `<span class="chart-legend-item muted">+ ${reste} autre${reste > 1 ? 's' : ''}</span>` : '');

  return `<svg viewBox="0 0 ${svgW} ${svgH}" class="chart-svg">${grille}${barres}</svg><div class="chart-legend">${legende}</div>`;
}
function caseBadge(cat) {
  const map = { ir_general: ['7UF', 'uf'], ir_coluche: ['7UD', 'ud'], ir_partis: ['7UH', 'uh'] };
  const m = map[cat] || map.ir_general; return `<span class="badge badge-${m[1]}">${m[0]}</span>`;
}
// Notation affective du bénéficiaire (indicateurSuivi), rendue en badge plutôt qu'en texte brut.
const SUIVI = {
  confiance: { icon: '💚', label: 'De confiance', cls: 'suivi-confiance' },
  neutre: { icon: '🤍', label: 'Neutre', cls: 'suivi-neutre' },
  surveiller: { icon: '🧡', label: 'À surveiller', cls: 'suivi-surveiller' },
  eviter: { icon: '💔', label: 'À éviter', cls: 'suivi-eviter' },
};
function suiviBadge(code) {
  const s = SUIVI[code] || SUIVI.neutre;
  return `<span class="pill suivi-badge ${s.cls}">${s.icon} ${s.label}</span>`;
}

// ---------- Bénéficiaires ----------
async function tabBenef() {
  const c = $('#content');
  const benefs = await api('GET', '/beneficiaires?all=1');
  c.innerHTML = `
    <div class="card">
      <h2>Nouveau bénéficiaire</h2>
      <form id="bform">
        <div class="row">
          <div><label>Nom *</label><input id="b_nom" required /></div>
          <div><label>Catégorie fiscale *</label><select id="b_cat">${state.cats.map((c) => `<option value="${c.code}">${esc(c.libelle)}</option>`).join('')}</select></div>
        </div>
        <div class="row">
          <div><label>SIREN / RNA (facultatif)</label><input id="b_id" /></div>
          <div><label>Habilité à délivrer des reçus</label><select id="b_hab"><option value="true">Oui</option><option value="false">Non</option></select></div>
        </div>
        <div class="row">
          <div><label>Adresse (facultatif)</label><input id="b_adr" /></div>
          <div><label>Téléphone (facultatif)</label><input id="b_tel" type="tel" /></div>
        </div>
        <div class="row">
          <div><label>Site web (facultatif)</label><input id="b_web" type="url" placeholder="https://…" /></div>
          <div><label>Email (facultatif)</label><input id="b_email" type="email" /></div>
        </div>
        <div class="form-actions"><button class="btn btn-primary">Ajouter</button></div>
      </form>
    </div>
    <div class="card">
      <h2>Référentiel <span class="muted">(${benefs.length})</span></h2>
      ${benefs.length ? `<table><thead><tr><th>Nom</th><th>Catégorie</th><th>SIREN/RNA</th><th>Contact</th><th>Suivi</th><th></th></tr></thead><tbody>
        ${benefs.map((b) => `<tr><td>${esc(b.nom)}${b.archive ? ' <span class="muted">(archivé)</span>' : ''}</td><td>${esc(catLabel(b.categorie))}</td><td>${esc(b.identifiant) || '—'}</td>
          <td>${contactCell(b)}</td>
          <td><select data-suivi="${b.id}">${Object.entries(SUIVI).map(([code, s]) => `<option value="${code}" ${b.indicateurSuivi === code ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('')}</select></td>
          <td><button class="btn-link" data-editb="${b.id}">✏️</button></td></tr>`).join('')}
      </tbody></table>` : '<p class="muted">Aucun bénéficiaire.</p>'}
    </div>`;
  $('#bform').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('POST', '/beneficiaires', { nom: $('#b_nom').value, categorie: $('#b_cat').value, identifiant: $('#b_id').value, habiliteRecu: $('#b_hab').value === 'true',
        adresse: $('#b_adr').value, telephone: $('#b_tel').value, siteWeb: $('#b_web').value, email: $('#b_email').value });
      tabBenef();
    } catch (err) { alert(err.message); }
  };
  c.querySelectorAll('[data-suivi]').forEach((s) => s.onchange = async () => { await api('PATCH', '/beneficiaires/' + s.dataset.suivi, { indicateurSuivi: s.value }); });
  c.querySelectorAll('[data-editb]').forEach((b) => b.onclick = () => editBenef(benefs.find((x) => x.id === b.dataset.editb)));
}
function contactCell(b) {
  const parts = [];
  if (b.siteWeb) parts.push(`<a href="${esc(b.siteWeb)}" target="_blank" rel="noopener">🌐</a>`);
  if (b.email) parts.push(`<a href="mailto:${esc(b.email)}">✉️</a>`);
  if (b.telephone) parts.push(`<span title="${esc(b.telephone)}">📞</span>`);
  if (b.adresse) parts.push(`<span title="${esc(b.adresse)}">📍</span>`);
  return parts.length ? parts.join(' ') : '<span class="muted">—</span>';
}

// Édition d'un bénéficiaire existant
function editBenef(b) {
  const m = openModal('Éditer le bénéficiaire', `
    <div id="ebeneferr"></div>
    <form id="ebform">
      <div class="row">
        <div><label>Nom *</label><input id="eb_nom" value="${esc(b.nom)}" required /></div>
        <div><label>Catégorie fiscale *</label><select id="eb_cat">${state.cats.map((c) => `<option value="${c.code}" ${c.code === b.categorie ? 'selected' : ''}>${esc(c.libelle)}</option>`).join('')}</select></div>
      </div>
      <div class="row">
        <div><label>SIREN / RNA (facultatif)</label><input id="eb_id" value="${esc(b.identifiant)}" /></div>
        <div><label>Habilité à délivrer des reçus</label><select id="eb_hab"><option value="true" ${b.habiliteRecu ? 'selected' : ''}>Oui</option><option value="false" ${!b.habiliteRecu ? 'selected' : ''}>Non</option></select></div>
      </div>
      <div class="row">
        <div><label>Adresse (facultatif)</label><input id="eb_adr" value="${esc(b.adresse)}" /></div>
        <div><label>Téléphone (facultatif)</label><input id="eb_tel" type="tel" value="${esc(b.telephone)}" /></div>
      </div>
      <div class="row">
        <div><label>Site web (facultatif)</label><input id="eb_web" type="url" value="${esc(b.siteWeb)}" placeholder="https://…" /></div>
        <div><label>Email (facultatif)</label><input id="eb_email" type="email" value="${esc(b.email)}" /></div>
      </div>
      <label>Notes (facultatif)</label><input id="eb_notes" value="${esc(b.notes)}" />
      <div class="row" style="margin-top:.5rem;align-items:center">
        <label style="margin:0"><input type="checkbox" id="eb_arch" ${b.archive ? 'checked' : ''} style="width:auto"> Archivé</label>
      </div>
      <div class="form-actions"><button class="btn btn-primary" type="submit">Enregistrer</button></div>
    </form>`);
  m.querySelector('#ebform').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('PATCH', '/beneficiaires/' + b.id, {
        nom: m.querySelector('#eb_nom').value, categorie: m.querySelector('#eb_cat').value,
        identifiant: m.querySelector('#eb_id').value, habiliteRecu: m.querySelector('#eb_hab').value === 'true',
        adresse: m.querySelector('#eb_adr').value, telephone: m.querySelector('#eb_tel').value,
        siteWeb: m.querySelector('#eb_web').value, email: m.querySelector('#eb_email').value,
        notes: m.querySelector('#eb_notes').value, archive: m.querySelector('#eb_arch').checked,
      });
      closeModal(); tabBenef();
    } catch (err) { m.querySelector('#ebeneferr').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`; }
  };
}

// ---------- Paramètres ----------
async function tabParams() {
  const c = $('#content');
  const ex = (await api('GET', '/exercices')).find((e) => e.annee === state.year);
  c.innerHTML = `
    <div class="card">
      <h2>Exercice ${state.year}</h2>
      <label>Revenu imposable du foyer (€) — sert au plafond de 20 %</label>
      <div class="row"><div><input id="revenu" type="number" step="1" min="0" value="${ex && ex.revenuImposable != null ? (ex.revenuImposable / 100) : ''}" placeholder="facultatif" /></div>
      <div style="flex:0"><button class="btn btn-primary" id="saverev">Enregistrer</button></div></div>
      <p class="muted">Sans revenu renseigné, le plafond de 20 % n'est pas appliqué (l'estimation reste correcte pour de petits montants).</p>
    </div>
    <div class="card">
      <h2>À propos</h2>
      <p class="muted">Prototype fonctionnel de List-dons (Node). Moteur fiscal art. 200 CGI, barèmes 2025–2027. Données stockées localement.<br>
      Implémentation cible : backend Rust + SvelteKit (voir les spécifications du dépôt).</p>
    </div>`;
  $('#saverev').onclick = async () => { await api('PATCH', '/exercices/' + state.year, { revenuImposable: $('#revenu').value }); alert('Enregistré.'); tabParams(); };
}

render().catch((e) => { if (e.message !== 'auth') app.innerHTML = '<p style="padding:2rem">Erreur : ' + esc(e.message) + '</p>'; });
