'use strict';
/**
 * Moteur de calcul fiscal — dons des particuliers (art. 200 CGI).
 * Barème = DONNÉE (jamais de taux en dur dans la logique). Montants en CENTIMES.
 * Voir specs §6. Fonction pure : (dons, revenu, année) -> estimation.
 */

// ---- Barèmes datés (montants en centimes) -------------------------------
const BAREMES = {
  2025: {
    regimes: {
      ir_general: { libelle: 'Intérêt général (art. 200)', taux: 0.66, plafond: { type: 'pct_revenu', valeur: 0.20 }, case: '7UF' },
      ir_coluche: { libelle: 'Aide aux personnes en difficulté (75 %)', taux: 0.75, plafond: { type: 'montant', valeur: 200000 }, bascule: 'ir_general', case: '7UD' },
      ir_partis:  { libelle: 'Partis politiques', taux: 0.66, plafond: { type: 'montant', valeur: 1500000 }, case: '7UH' },
    },
    report_annees: 5,
  },
  // 2026 et 2027 : identiques à 2025 (règle d'héritage N <- N-1). Cf. specs §6.
};

const CATEGORIES = [
  { code: 'ir_general', libelle: 'Intérêt général / utilité publique (66 %)' },
  { code: 'ir_coluche', libelle: 'Personnes en difficulté « Coluche » (75 %)' },
  { code: 'ir_partis',  libelle: 'Parti politique (66 %)' },
];

/** Résout le barème applicable à une année (héritage N <- N-1). */
function baremePour(annee) {
  const annees = Object.keys(BAREMES).map(Number).sort((a, b) => a - b);
  let choisi = annees[0];
  for (const a of annees) if (a <= annee) choisi = a;
  return BAREMES[choisi];
}

const euros = (cents) => (cents / 100);

/**
 * Estime la réduction d'impôt pour un ensemble de dons d'une année.
 * @param {Array<{montant:number, categorie:string}>} dons  montants en centimes
 * @param {number|null} revenuImposable  en centimes (pour le plafond 20 %)
 * @param {number} annee
 */
function estimer(dons, revenuImposable, annee) {
  const bareme = baremePour(annee);
  const sommes = { ir_general: 0, ir_coluche: 0, ir_partis: 0 };
  for (const d of dons) {
    const cat = sommes.hasOwnProperty(d.categorie) ? d.categorie : 'ir_general';
    sommes[cat] += d.montant;
  }

  const detail = [];
  let reductionTotale = 0;
  let reportable = 0;

  // 1) Coluche : 75 % jusqu'au plafond, surplus bascule vers le général
  const gColuche = bareme.regimes.ir_coluche;
  const baseColuche = sommes.ir_coluche;
  const eligible75 = Math.min(baseColuche, gColuche.plafond.valeur);
  const surplusColuche = baseColuche - eligible75;
  const redColuche = Math.round(eligible75 * gColuche.taux);
  if (baseColuche > 0) {
    reductionTotale += redColuche;
    detail.push({ code: 'ir_coluche', libelle: gColuche.libelle, taux: gColuche.taux, base: baseColuche, reduction: redColuche, case: gColuche.case });
  }

  // 2) Général (66 %) : inclut le surplus Coluche, plafonné à 20 % du revenu
  const gGen = bareme.regimes.ir_general;
  const baseGeneral = sommes.ir_general + surplusColuche;
  let baseGeneralRetenue = baseGeneral;
  let plafond20 = null;
  if (revenuImposable && revenuImposable > 0) {
    plafond20 = Math.round(revenuImposable * gGen.plafond.valeur);
    if (baseGeneral > plafond20) {
      baseGeneralRetenue = plafond20;
      reportable = baseGeneral - plafond20;
    }
  }
  const redGeneral = Math.round(baseGeneralRetenue * gGen.taux);
  if (baseGeneral > 0) {
    reductionTotale += redGeneral;
    detail.push({ code: 'ir_general', libelle: gGen.libelle, taux: gGen.taux, base: baseGeneral, baseRetenue: baseGeneralRetenue, reduction: redGeneral, case: gGen.case });
  }

  // 3) Partis politiques (66 %) : plafond en euros, hors 20 %
  const gPartis = bareme.regimes.ir_partis;
  const basePartis = Math.min(sommes.ir_partis, gPartis.plafond.valeur);
  const redPartis = Math.round(basePartis * gPartis.taux);
  if (sommes.ir_partis > 0) {
    reductionTotale += redPartis;
    detail.push({ code: 'ir_partis', libelle: gPartis.libelle, taux: gPartis.taux, base: sommes.ir_partis, baseRetenue: basePartis, reduction: redPartis, case: gPartis.case });
  }

  // Cases de déclaration agrégées (montants de dons à reporter)
  const cases = {};
  cases[gGen.case] = (cases[gGen.case] || 0) + sommes.ir_general + surplusColuche;
  if (baseColuche > 0) cases[gColuche.case] = (cases[gColuche.case] || 0) + baseColuche;
  if (sommes.ir_partis > 0) cases[gPartis.case] = (cases[gPartis.case] || 0) + sommes.ir_partis;

  const totalDonne = dons.reduce((s, d) => s + d.montant, 0);

  return {
    annee,
    totalDonne,
    reductionTotale,
    reportable,
    reportAnnees: bareme.report_annees,
    detail,
    cases,
    // Plafond 20 % du revenu imposable (dons "intérêt général") : null si revenu non renseigné.
    plafond20,
    baseEligible20: baseGeneral,
    // versions € pour l'affichage
    _euros: {
      totalDonne: euros(totalDonne),
      reductionTotale: euros(reductionTotale),
      reportable: euros(reportable),
    },
    avertissement: 'Estimation indicative — ne remplace pas votre déclaration ni un conseil fiscal.',
  };
}

module.exports = { estimer, baremePour, CATEGORIES, euros };
