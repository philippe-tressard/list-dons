'use strict';
/**
 * Récapitulatif fiscal annuel en PDF (justificatif personnel pour la déclaration).
 * Réutilise l'estimation du moteur fiscal (lib/fiscal.js) — aucune règle dupliquée ici.
 */
const PDFDocument = require('pdfkit');

const COL = { primary: '#1E3A5F', muted: '#5A6070', text: '#1A1A2E', border: '#E2DED6', bg: '#F2EFE9', white: '#FFFFFF' };
const fmtEuros = (cents) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const ROW_H = 20;

// Tableau générique paginé : en-tête répétée sur chaque page. Retourne l'ordonnée de fin
// et la fonction d'en-tête (pour permettre au caller d'ajouter une ligne de total cohérente).
function dessinerTableau(doc, { left, bottomLimit, colonnes, lignes, startY }) {
  const largeur = colonnes.reduce((s, c) => s + c.width, 0);
  function entete(y) {
    doc.rect(left, y, largeur, ROW_H).fill(COL.primary);
    let x = left;
    doc.fontSize(9).fillColor(COL.white);
    colonnes.forEach((c) => { doc.text(c.label, x + 4, y + 6, { width: c.width - 6 }); x += c.width; });
    return y + ROW_H;
  }
  let y = entete(startY);
  lignes.forEach((valeurs, i) => {
    if (y + ROW_H > bottomLimit) { doc.addPage(); y = entete(doc.page.margins.top); }
    if (i % 2 === 1) doc.rect(left, y, largeur, ROW_H).fill(COL.bg);
    let x = left;
    doc.fontSize(9).fillColor(COL.text);
    valeurs.forEach((v, ci) => { doc.text(String(v), x + 4, y + 6, { width: colonnes[ci].width - 6 }); x += colonnes[ci].width; });
    y += ROW_H;
  });
  return { y, entete, largeur };
}

/**
 * @param {import('express').Response} res
 * @param {{annee:number, identifiant:string, dons:Array, estimation:object}} data
 *   dons : dons de l'année, triés chronologiquement, avec `beneficiaire` résolu.
 */
function genererRecapitulatif(res, { annee, identifiant, dons, estimation }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="list-dons-recapitulatif-${annee}.pdf"`);
  doc.pipe(res);

  const left = doc.page.margins.left;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  doc.fontSize(18).fillColor(COL.primary).text(`List-dons — Récapitulatif fiscal ${annee}`, left, doc.y);
  doc.fontSize(9).fillColor(COL.muted).text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — Compte : ${identifiant}`);
  doc.moveDown(1);

  doc.fontSize(13).fillColor(COL.primary).text("Estimation de la réduction d'impôt");
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor(COL.text);
  doc.text(`Total donné : ${fmtEuros(estimation.totalDonne)}`);
  doc.text(`Réduction estimée : ${fmtEuros(estimation.reductionTotale)}`);
  if (estimation.plafond20 != null) doc.text(`Plafond 20 % du revenu : ${fmtEuros(estimation.baseEligible20)} / ${fmtEuros(estimation.plafond20)}`);
  if (estimation.reportable > 0) doc.text(`Excédent reportable (${estimation.reportAnnees} ans) : ${fmtEuros(estimation.reportable)}`);
  doc.moveDown(1);

  const caseParCategorie = {};
  estimation.detail.forEach((d) => { caseParCategorie[d.code] = d.case; });
  const casesUtiles = Object.entries(estimation.cases).filter(([, v]) => v > 0);
  if (casesUtiles.length) {
    doc.fontSize(13).fillColor(COL.primary).text('Cases à reporter — déclaration 2042 RICI');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor(COL.text);
    casesUtiles.forEach(([c, v]) => doc.text(`${c} : ${fmtEuros(v)}`));
    doc.moveDown(1);
  }

  // ---- Détail chronologique des dons -------------------------------------
  doc.fontSize(13).fillColor(COL.primary).text(`Détail des dons (${dons.length})`);
  doc.moveDown(0.4);

  const COLS_DONS = [
    { label: 'Date', width: 65 },
    { label: 'Bénéficiaire', width: 175 },
    { label: 'Case', width: 55 },
    { label: 'Montant', width: 75 },
    { label: 'N° reçu', width: 105 },
  ];

  if (!dons.length) {
    doc.fontSize(10).fillColor(COL.muted).text('Aucun don enregistré pour cet exercice.');
  } else {
    const { y: yFin, entete, largeur } = dessinerTableau(doc, {
      left, bottomLimit, colonnes: COLS_DONS, startY: doc.y,
      lignes: dons.map((d) => [d.date, d.beneficiaire?.nom || '?', caseParCategorie[d.beneficiaire?.categorie] || '—', fmtEuros(d.montant), d.numeroRecu || '—']),
    });
    let y = yFin;
    if (y + ROW_H > bottomLimit) { doc.addPage(); y = entete(doc.page.margins.top); }
    doc.rect(left, y, largeur, ROW_H).fill(COL.border);
    doc.fontSize(9).fillColor(COL.text);
    const largeurLabel = COLS_DONS[0].width + COLS_DONS[1].width + COLS_DONS[2].width;
    doc.text('Total', left + 4, y + 6, { width: largeurLabel - 6 });
    doc.text(fmtEuros(dons.reduce((s, d) => s + d.montant, 0)), left + largeurLabel + 4, y + 6, { width: COLS_DONS[3].width - 6 });
    doc.x = left; doc.y = y + ROW_H + 16;
  }

  // ---- Détail par bénéficiaire (récapitulatif de fin, avec coordonnées si disponibles) ----
  const parBenef = {};
  dons.forEach((d) => {
    const id = d.beneficiaireId;
    if (!parBenef[id]) parBenef[id] = { b: d.beneficiaire, case: caseParCategorie[d.beneficiaire?.categorie] || '—', nb: 0, total: 0 };
    parBenef[id].nb++;
    parBenef[id].total += d.montant;
  });
  const lignesBenef = Object.values(parBenef).sort((a, b) => b.total - a.total);
  const LARGEUR_BENEF = 475;

  if (doc.y > bottomLimit - 60) doc.addPage();
  doc.fontSize(13).fillColor(COL.primary).text(`Détail par bénéficiaire (${lignesBenef.length})`);
  doc.moveDown(0.4);

  if (!lignesBenef.length) {
    doc.fontSize(10).fillColor(COL.muted).text('Aucun bénéficiaire pour cet exercice.');
  } else {
    lignesBenef.forEach((l, i) => {
      const b = l.b || {};
      const coords = [];
      if (b.identifiant) coords.push(`SIREN/RNA : ${b.identifiant}`);
      if (b.adresse) coords.push(`Adresse : ${b.adresse}`);
      if (b.telephone) coords.push(`Tél : ${b.telephone}`);
      if (b.siteWeb) coords.push(`Web : ${b.siteWeb}`);
      if (b.email) coords.push(`Email : ${b.email}`);

      if (doc.y + 20 > bottomLimit) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COL.text)
        .text(`${b.nom || '?'} — ${l.case} — ${l.nb} don${l.nb > 1 ? 's' : ''} — ${fmtEuros(l.total)}`, left, doc.y, { width: LARGEUR_BENEF });
      doc.font('Helvetica');
      if (coords.length) {
        if (doc.y + 14 > bottomLimit) doc.addPage();
        doc.fontSize(8).fillColor(COL.muted).text(coords.join('   ·   '), left, doc.y, { width: LARGEUR_BENEF });
      }
      if (i < lignesBenef.length - 1) {
        doc.moveDown(0.3);
        if (doc.y + 4 > bottomLimit) doc.addPage();
        doc.moveTo(left, doc.y).lineTo(left + LARGEUR_BENEF, doc.y).strokeColor(COL.border).lineWidth(0.5).stroke();
        doc.moveDown(0.3);
      }
    });
    doc.x = left; doc.y += 16;
  }

  if (doc.y > bottomLimit - 20) doc.addPage();
  doc.fontSize(8).fillColor(COL.muted).text(
    'Estimation indicative — ne remplace pas votre déclaration officielle ni un conseil fiscal.',
    left, doc.y, { width: 475, align: 'center' }
  );

  doc.end();
}

module.exports = { genererRecapitulatif };
