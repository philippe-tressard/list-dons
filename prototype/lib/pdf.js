'use strict';
/**
 * Récapitulatif fiscal annuel en PDF (justificatif personnel pour la déclaration).
 * Réutilise l'estimation du moteur fiscal (lib/fiscal.js) — aucune règle dupliquée ici.
 */
const PDFDocument = require('pdfkit');

const COL = { primary: '#1E3A5F', muted: '#5A6070', text: '#1A1A2E', border: '#E2DED6', bg: '#F2EFE9', white: '#FFFFFF' };
const fmtEuros = (cents) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const COLS = [
  { label: 'Date', width: 65 },
  { label: 'Bénéficiaire', width: 175 },
  { label: 'Case', width: 55 },
  { label: 'Montant', width: 75 },
  { label: 'N° reçu', width: 105 },
];
const TABLE_WIDTH = COLS.reduce((s, c) => s + c.width, 0);
const ROW_H = 20;

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

  doc.fontSize(13).fillColor(COL.primary).text(`Détail des dons (${dons.length})`);
  doc.moveDown(0.4);

  if (!dons.length) {
    doc.fontSize(10).fillColor(COL.muted).text('Aucun don enregistré pour cet exercice.');
  } else {
    function drawHeaderRow(y) {
      doc.rect(left, y, TABLE_WIDTH, ROW_H).fill(COL.primary);
      let x = left;
      doc.fontSize(9).fillColor(COL.white);
      COLS.forEach((c) => { doc.text(c.label, x + 4, y + 6, { width: c.width - 6 }); x += c.width; });
      return y + ROW_H;
    }

    let y = drawHeaderRow(doc.y);
    dons.forEach((d, i) => {
      if (y + ROW_H > bottomLimit) { doc.addPage(); y = drawHeaderRow(doc.page.margins.top); }
      if (i % 2 === 1) doc.rect(left, y, TABLE_WIDTH, ROW_H).fill(COL.bg);
      let x = left;
      doc.fontSize(9).fillColor(COL.text);
      const valeurs = [d.date, d.beneficiaire?.nom || '?', caseParCategorie[d.beneficiaire?.categorie] || '—', fmtEuros(d.montant), d.numeroRecu || '—'];
      valeurs.forEach((v, ci) => { doc.text(String(v), x + 4, y + 6, { width: COLS[ci].width - 6 }); x += COLS[ci].width; });
      y += ROW_H;
    });

    if (y + ROW_H > bottomLimit) { doc.addPage(); y = drawHeaderRow(doc.page.margins.top); }
    doc.rect(left, y, TABLE_WIDTH, ROW_H).fill(COL.border);
    doc.fontSize(9).fillColor(COL.text);
    const largeurLabel = COLS[0].width + COLS[1].width + COLS[2].width;
    doc.text('Total', left + 4, y + 6, { width: largeurLabel - 6 });
    doc.text(fmtEuros(dons.reduce((s, d) => s + d.montant, 0)), left + largeurLabel + 4, y + 6, { width: COLS[3].width - 6 });
    y += ROW_H;

    doc.x = left; doc.y = y + 12;
  }

  if (doc.y > bottomLimit - 20) doc.addPage();
  doc.fontSize(8).fillColor(COL.muted).text(
    'Estimation indicative — ne remplace pas votre déclaration officielle ni un conseil fiscal.',
    left, doc.y, { width: TABLE_WIDTH, align: 'center' }
  );

  doc.end();
}

module.exports = { genererRecapitulatif };
