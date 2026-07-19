'use strict';
/**
 * Récapitulatif fiscal annuel en PDF (justificatif personnel pour la déclaration).
 * Réutilise l'estimation du moteur fiscal (lib/fiscal.js) — aucune règle dupliquée ici.
 *
 * Deux passes :
 *   1) pdfkit construit le rapport (estimation, cases, détail des dons, détail par
 *      bénéficiaire, sommaire des pièces jointes) dans un buffer.
 *   2) pdf-lib annexe les justificatifs eux-mêmes : reçus image intégrés ET pages des
 *      reçus PDF réellement importées (une page de garde numérotée puis les pages du PDF).
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLib, StandardFonts, rgb } = require('pdf-lib');

const COL = { primary: '#1E3A5F', muted: '#5A6070', text: '#1A1A2E', border: '#E2DED6', bg: '#F2EFE9', white: '#FFFFFF' };
const RGB = { primary: rgb(0x1E / 255, 0x3A / 255, 0x5F / 255), muted: rgb(0x5A / 255, 0x60 / 255, 0x70 / 255), text: rgb(0x1A / 255, 0x1A / 255, 0x2E / 255) };
const fmtEuros = (cents) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const ROW_H = 20;

// Ramène une chaîne à l'imprimable WinAnsi des polices standard pdf-lib (sinon drawText jette).
// Mappe la ponctuation « intelligente », SUPPRIME les caractères de contrôle C0/C1
// (U+0000–U+001F, U+007F–U+009F : la plage 0x80–0x9F n'est pas encodable en WinAnsi et
// provoquait un plantage sur des noms de fichiers mal formés), et remplace le reste par « ? ».
function winsafe(s) {
  const MAP = {
    0x2010: '-', 0x2011: '-', 0x2012: '-', 0x2013: '-', 0x2014: '-', 0x2015: '-', 0x2212: '-',
    0x2026: '...', 0x2018: "'", 0x2019: "'", 0x201A: "'", 0x201C: '"', 0x201D: '"', 0x201E: '"',
    0x20AC: 'EUR', 0x00A0: ' ',
  };
  let out = '';
  for (const ch of String(s ?? '')) {
    const cp = ch.codePointAt(0);
    if (MAP[cp] !== undefined) { out += MAP[cp]; continue; }
    if (cp < 0x20 || (cp >= 0x7F && cp <= 0x9F)) continue;        // contrôles C0/C1 supprimés (dont 0x80)
    out += (cp <= 0x7E || (cp >= 0xA0 && cp <= 0xFF)) ? ch : '?'; // imprimable WinAnsi, sinon « ? »
  }
  return out;
}
function typeCourt(j) {
  const m = /\.([a-z0-9]+)$/i.exec(j.nom || '');
  if (m) return m[1].toUpperCase();
  return /pdf/i.test(j.type || '') ? 'PDF' : (/image/i.test(j.type || '') ? 'IMG' : '—');
}
function estImage(j) { return /^image\//.test(j.type || '') || /\.(jpe?g|png)$/i.test(j.nom || ''); }
function estPdf(j) { return /pdf/i.test(j.type || '') || /\.pdf$/i.test(j.nom || ''); }

// Tableau générique paginé : en-tête répétée sur chaque page, lignes zébrées.
// Option `detailLignes` (tableau parallèle) : une ligne de détail pleine largeur, discrète,
// insérée sous la ligne correspondante (ex. coordonnées d'un bénéficiaire).
function dessinerTableau(doc, { left, bottomLimit, colonnes, lignes, startY, detailLignes }) {
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
    const detail = detailLignes && detailLignes[i];
    let detailH = 0;
    if (detail) { doc.fontSize(8); detailH = doc.heightOfString(detail, { width: largeur - 8 }) + 4; }
    if (y + ROW_H + detailH > bottomLimit) { doc.addPage(); y = entete(doc.page.margins.top); }
    if (i % 2 === 1) doc.rect(left, y, largeur, ROW_H + detailH).fill(COL.bg);
    let x = left;
    doc.fontSize(9).fillColor(COL.text);
    valeurs.forEach((v, ci) => { doc.text(String(v), x + 4, y + 6, { width: colonnes[ci].width - 6 }); x += colonnes[ci].width; });
    y += ROW_H;
    if (detail) { doc.fontSize(8).fillColor(COL.muted).text(detail, left + 4, y + 2, { width: largeur - 8 }); y += detailH; }
  });
  return { y, entete, largeur };
}

// Ligne de total pleine largeur (fond gris) : libellé fusionné sur les premières colonnes.
function ligneTotal(doc, { left, bottomLimit, colonnes, y, entete, labelSpan, label, valeurs }) {
  const largeur = colonnes.reduce((s, c) => s + c.width, 0);
  if (y + ROW_H > bottomLimit) { doc.addPage(); y = entete(doc.page.margins.top); }
  doc.rect(left, y, largeur, ROW_H).fill(COL.border);
  doc.fontSize(9).fillColor(COL.text);
  const largeurLabel = colonnes.slice(0, labelSpan).reduce((s, c) => s + c.width, 0);
  doc.text(label, left + 4, y + 6, { width: largeurLabel - 6 });
  let x = left + largeurLabel;
  for (let ci = labelSpan; ci < colonnes.length; ci++) {
    if (valeurs[ci] != null) doc.text(String(valeurs[ci]), x + 4, y + 6, { width: colonnes[ci].width - 6 });
    x += colonnes[ci].width;
  }
  doc.x = left; doc.y = y + ROW_H + 16;
}

// ---- Passe 1 : rapport principal (pdfkit) → Buffer -------------------------
function construireRapport({ annee, identifiant, dons, estimation }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const bottomLimit = doc.page.height - doc.page.margins.bottom;
    const contentW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

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

    // 1) Détail chronologique des dons
    doc.fontSize(13).fillColor(COL.primary).text(`Détail des dons (${dons.length})`);
    doc.moveDown(0.4);
    const COLS_DONS = [
      { label: 'Date', width: 65 }, { label: 'Bénéficiaire', width: 175 }, { label: 'Case', width: 55 },
      { label: 'Montant', width: 75 }, { label: 'N° reçu', width: 105 },
    ];
    if (!dons.length) {
      doc.fontSize(10).fillColor(COL.muted).text('Aucun don enregistré pour cet exercice.'); doc.moveDown(1);
    } else {
      const { y, entete } = dessinerTableau(doc, {
        left, bottomLimit, colonnes: COLS_DONS, startY: doc.y,
        lignes: dons.map((d) => [d.date, d.beneficiaire?.nom || '?', caseParCategorie[d.beneficiaire?.categorie] || '—', fmtEuros(d.montant), d.numeroRecu || '—']),
      });
      ligneTotal(doc, { left, bottomLimit, colonnes: COLS_DONS, y, entete, labelSpan: 3, label: 'Total', valeurs: { 3: fmtEuros(dons.reduce((s, d) => s + d.montant, 0)) } });
    }

    // 2) Détail par bénéficiaire (même présentation de tableau, coordonnées en sous-ligne)
    const parBenef = {};
    dons.forEach((d) => {
      const id = d.beneficiaireId;
      if (!parBenef[id]) parBenef[id] = { b: d.beneficiaire, case: caseParCategorie[d.beneficiaire?.categorie] || '—', nb: 0, total: 0 };
      parBenef[id].nb++; parBenef[id].total += d.montant;
    });
    const lignesBenef = Object.values(parBenef).sort((a, b) => b.total - a.total);
    if (doc.y > bottomLimit - 80) doc.addPage();
    doc.fontSize(13).fillColor(COL.primary).text(`Détail par bénéficiaire (${lignesBenef.length})`);
    doc.moveDown(0.4);
    const COLS_BENEF = [
      { label: 'Bénéficiaire', width: 235 }, { label: 'Case', width: 55 }, { label: 'Nb dons', width: 60 }, { label: 'Total', width: 125 },
    ];
    if (!lignesBenef.length) {
      doc.fontSize(10).fillColor(COL.muted).text('Aucun bénéficiaire pour cet exercice.'); doc.moveDown(1);
    } else {
      const coordsDe = (b = {}) => {
        const c = [];
        if (b.identifiant) c.push(`SIREN/RNA : ${b.identifiant}`);
        if (b.adresse) c.push(`Adresse : ${b.adresse}`);
        if (b.telephone) c.push(`Tél : ${b.telephone}`);
        if (b.siteWeb) c.push(`Web : ${b.siteWeb}`);
        if (b.email) c.push(`Email : ${b.email}`);
        return c.length ? c.join('   ·   ') : null;
      };
      const { y, entete } = dessinerTableau(doc, {
        left, bottomLimit, colonnes: COLS_BENEF, startY: doc.y,
        lignes: lignesBenef.map((l) => [l.b?.nom || '?', l.case, String(l.nb), fmtEuros(l.total)]),
        detailLignes: lignesBenef.map((l) => coordsDe(l.b)),
      });
      ligneTotal(doc, {
        left, bottomLimit, colonnes: COLS_BENEF, y, entete, labelSpan: 2, label: 'Total',
        valeurs: { 2: String(lignesBenef.reduce((s, l) => s + l.nb, 0)), 3: fmtEuros(lignesBenef.reduce((s, l) => s + l.total, 0)) },
      });
    }

    // 3) Sommaire des pièces jointes (les reçus eux-mêmes sont annexés en passe 2)
    const pjs = [];
    dons.forEach((d) => (d.justificatifs || []).forEach((j) => pjs.push({ don: d, j })));
    if (pjs.length) {
      if (doc.y > bottomLimit - 90) doc.addPage();
      doc.fontSize(13).fillColor(COL.primary).text(`Pièces jointes (${pjs.length})`);
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor(COL.muted).text('Sommaire des justificatifs. Les reçus sont annexés à la suite de ce récapitulatif (images intégrées, pages PDF importées).');
      doc.moveDown(0.4);
      const COLS_PJ = [
        { label: 'N°', width: 28 }, { label: 'Date', width: 62 }, { label: 'Bénéficiaire', width: 150 },
        { label: 'Montant', width: 70 }, { label: 'N° reçu', width: 90 }, { label: 'Type', width: 75 },
      ];
      dessinerTableau(doc, {
        left, bottomLimit, colonnes: COLS_PJ, startY: doc.y,
        lignes: pjs.map((p, i) => [String(i + 1), p.don.date, p.don.beneficiaire?.nom || '?', fmtEuros(p.don.montant), p.don.numeroRecu || '—', typeCourt(p.j)]),
      });
    }

    if (doc.y > bottomLimit - 20) doc.addPage();
    doc.fontSize(8).fillColor(COL.muted).text(
      'Estimation indicative — ne remplace pas votre déclaration officielle ni un conseil fiscal.',
      left, doc.y, { width: contentW, align: 'center' }
    );
    doc.end();
  });
}

// ---- Passe 2 : annexer les justificatifs (pdf-lib) -------------------------
async function annexerJustificatifs(rapportBuf, pjs, uploadDir) {
  const out = await PDFLib.load(rapportBuf);
  const font = await out.embedFont(StandardFonts.Helvetica);
  const fontB = await out.embedFont(StandardFonts.HelveticaBold);
  const MARGIN = 50;

  const pageGarde = (titre, sous) => {
    const p = out.addPage([595.28, 841.89]);
    const { width, height } = p.getSize();
    let y = height - MARGIN;
    p.drawText(winsafe(titre), { x: MARGIN, y: y - 8, size: 12, font: fontB, color: RGB.primary, maxWidth: width - 2 * MARGIN });
    y -= 26;
    if (sous) { p.drawText(winsafe(sous), { x: MARGIN, y, size: 9, font, color: RGB.muted, maxWidth: width - 2 * MARGIN }); y -= 18; }
    return { p, y, width, height };
  };

  for (let i = 0; i < pjs.length; i++) {
    const { don, j } = pjs[i];
    const chemin = path.join(uploadDir, j.fichier);
    const titre = `Pièce jointe n°${i + 1} — ${don.beneficiaire?.nom || '?'} (${don.date})`;
    const sous = `${j.nom}${don.numeroRecu ? ' — reçu ' + don.numeroRecu : ''}`;
    // Une pièce jointe défaillante ne doit jamais casser tout le récapitulatif.
    try {
      const dispo = fs.existsSync(chemin);
      if (dispo && estPdf(j)) {
        const { p } = pageGarde(titre, sous + '  ·  document PDF importé ci-après');
        try {
          const src = await PDFLib.load(fs.readFileSync(chemin), { ignoreEncryption: true });
          const pages = await out.copyPages(src, src.getPageIndices());
          pages.forEach((pg) => out.addPage(pg));
        } catch {
          p.drawText("(PDF illisible - reportez-vous au fichier d'origine.)", { x: MARGIN, y: p.getSize().height - MARGIN - 44, size: 10, font, color: RGB.muted });
        }
      } else if (dispo && estImage(j)) {
        const { p, y, width } = pageGarde(titre, sous);
        try {
          const bytes = fs.readFileSync(chemin);
          const isPng = /\.png$/i.test(j.nom || '') || /png/i.test(j.type || '');
          const img = isPng ? await out.embedPng(bytes) : await out.embedJpg(bytes);
          const maxW = width - 2 * MARGIN, maxH = y - MARGIN;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);
          const w = img.width * scale, h = img.height * scale;
          p.drawImage(img, { x: MARGIN + (maxW - w) / 2, y: y - h, width: w, height: h });
        } catch {
          p.drawText("(Image illisible - reportez-vous au fichier d'origine.)", { x: MARGIN, y: y - 16, size: 10, font, color: RGB.muted });
        }
      } else {
        const { p, y } = pageGarde(titre, sous);
        p.drawText(dispo ? '(Format non pris en charge pour l\'aperçu.)' : '(Fichier introuvable.)', { x: MARGIN, y: y - 16, size: 10, font, color: RGB.muted });
      }
    } catch {
      // Dernier filet : au moins une page de garde minimale, sans détail.
      try {
        const p = out.addPage([595.28, 841.89]);
        p.drawText(winsafe(`Pièce jointe n°${i + 1} - justificatif non affichable`), { x: MARGIN, y: 760, size: 11, font: fontB, color: RGB.primary });
      } catch { /* on ignore : ne jamais faire échouer tout le PDF */ }
    }
  }
  return Buffer.from(await out.save());
}

/**
 * @param {import('express').Response} res
 * @param {{annee:number, identifiant:string, dons:Array, estimation:object, uploadDir:string}} data
 */
async function genererRecapitulatif(res, { annee, identifiant, dons, estimation, uploadDir }) {
  const rapport = await construireRapport({ annee, identifiant, dons, estimation });
  const pjs = [];
  dons.forEach((d) => (d.justificatifs || []).forEach((j) => pjs.push({ don: d, j })));

  // On construit le buffer FINAL (fusion comprise) AVANT de poser le moindre en-tête :
  // ainsi, si la fusion échoue, aucune en-tête n'est envoyée et l'appelant renvoie un 500 propre
  // (sinon le client reçoit une réponse tronquée → ERR_INVALID_RESPONSE).
  const final = pjs.length ? await annexerJustificatifs(rapport, pjs, uploadDir) : rapport;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="list-dons-recapitulatif-${annee}.pdf"`);
  res.end(final);
}

module.exports = { genererRecapitulatif };
