'use strict';
/**
 * Moteur de calcul fiscal — dons des particuliers (art. 200 CGI).
 * Barème = DONNÉE (jamais de taux en dur dans la logique). Montants en CENTIMES.
 * Voir specs §6. Fonction pure : (dons, revenu, année) -> estimation.
 */

// ---- Sources officielles (aucun chiffre sans source : CLAUDE.md, standards/14 §7) ----
// Chaque valeur du barème cite ses sources ci-dessous ; l'auto-test refuse un régime sans
// source, une source inconnue, une URL non officielle ou une date de consultation absente.
const SOURCES = {
  cgi200: {
    texte: "CGI, art. 200 — version en vigueur depuis le 21/02/2026 (loi n° 2026-103 du 19/02/2026, art. 28) : 1 (66 %, 20 % du revenu), 1 bis (report sur 5 ans), 1 ter (75 %, 2 000 €), 3 (partis, 15 000 €)",
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543932',
    consulte: '2026-11-03',
  },
  bofipColuche: {
    texte: 'BOFiP ACTU-2026-00019 du 06/07/2026 : plafond du 1 ter relevé de 1 000 € à 2 000 € pour les dons et versements effectués à compter du 14/10/2025',
    url: 'https://bofip.impots.gouv.fr/doctrine/pgp/14951-PGP',
    consulte: '2026-11-03',
  },
  spDons: {
    texte: 'service-public.gouv.fr F426 (vérifiée le 15/04/2026) : 75 % jusqu’à 1 000 € pour les dons antérieurs au 14/10/2025, jusqu’à 2 000 € à partir du 14/10/2025',
    url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F426',
    consulte: '2026-11-03',
  },
  spPartis: {
    texte: 'service-public.gouv.fr F427 (vérifiée le 15/04/2026) : partis, 66 % dans la limite de 20 % du revenu imposable ; 15 000 € par foyer ; excédent au-delà de 20 % reporté sur 5 ans, fraction au-delà de 15 000 € non reportable',
    url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F427',
    consulte: '2026-11-03',
  },
};

// ---- Barèmes datés (montants en centimes) -------------------------------
// Chaque millésime est écrit en entier, sans reprendre le précédent par référence : un
// barème modifié ne doit jamais changer une autre année (isolation par année, specs §8.1,
// éprouvée par fiscal.selftest.js). Divergence déclarée à la règle « zéro duplication ».
const BAREMES = {
  2025: {
    regimes: {
      ir_general: { libelle: 'Intérêt général (art. 200)', taux: 0.66, plafond: { type: 'pct_revenu', valeur: 0.20 }, case: '7UF', sources: ['cgi200'] },
      // 1 000 € et non 2 000 € : le relèvement ne vaut que pour les dons effectués à compter du
      // 14/10/2025, et la répartition d'une même année entre les deux plafonds n'est pas
      // documentée. Principe de prudence : l'estimation sous-estime (le surplus bascule à 66 %).
      ir_coluche: { libelle: 'Aide aux personnes en difficulté (75 %)', taux: 0.75, plafond: { type: 'montant', valeur: 100000 }, bascule: 'ir_general', case: '7UD', sources: ['bofipColuche', 'spDons'] },
      // Dans la limite de 20 % du revenu (avec ir_general) ET de 15 000 € par foyer.
      ir_partis:  { libelle: 'Partis politiques', taux: 0.66, plafond: { type: 'montant', valeur: 1500000 }, case: '7UH', sources: ['cgi200', 'spPartis'] },
    },
    report_annees: 5,
    report_sources: ['cgi200', 'spPartis'],
  },
  2026: {
    regimes: {
      ir_general: { libelle: 'Intérêt général (art. 200)', taux: 0.66, plafond: { type: 'pct_revenu', valeur: 0.20 }, case: '7UF', sources: ['cgi200'] },
      // Tout l'exercice 2026 est postérieur au 14/10/2025 : plafond de 2 000 €.
      ir_coluche: { libelle: 'Aide aux personnes en difficulté (75 %)', taux: 0.75, plafond: { type: 'montant', valeur: 200000 }, bascule: 'ir_general', case: '7UD', sources: ['cgi200', 'bofipColuche', 'spDons'] },
      ir_partis:  { libelle: 'Partis politiques', taux: 0.66, plafond: { type: 'montant', valeur: 1500000 }, case: '7UH', sources: ['cgi200', 'spPartis'] },
    },
    report_annees: 5,
    report_sources: ['cgi200', 'spPartis'],
  },
  // 2027 et au-delà : hérités de 2026 (règle N <- N-1) tant qu'aucune loi de finances ne
  // modifie l'art. 200. Cf. specs §6.
};

const CATEGORIES = [
  { code: 'ir_general', libelle: 'Intérêt général / utilité publique (66 %)' },
  { code: 'ir_coluche', libelle: 'Personnes en difficulté « Coluche » (75 %)' },
  { code: 'ir_partis',  libelle: 'Parti politique (66 %)' },
];

/** Année du barème réellement appliquée pour `annee` (héritage N <- N-1 : la plus récente <= annee). */
function anneeSourceBareme(annee) {
  const annees = Object.keys(BAREMES).map(Number).sort((a, b) => a - b);
  let choisi = annees[0];
  for (const a of annees) if (a <= annee) choisi = a;
  return choisi;
}

/** Résout le barème applicable à une année (héritage N <- N-1). */
function baremePour(annee) {
  return BAREMES[anneeSourceBareme(annee)];
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

  // 2) Limite de 20 % du revenu, partagée entre l'intérêt général (surplus Coluche compris)
  //    et les partis — ceux-ci d'abord ramenés à leur plafond de 15 000 €, dont la fraction
  //    excédentaire n'est ni retenue ni reportable (sources : spPartis). L'intérêt général
  //    consomme la limite en premier ; même taux, donc même réduction totale.
  const gGen = bareme.regimes.ir_general;
  const gPartis = bareme.regimes.ir_partis;
  const baseGeneral = sommes.ir_general + surplusColuche;
  const basePartis = Math.min(sommes.ir_partis, gPartis.plafond.valeur);
  let baseGeneralRetenue = baseGeneral;
  let basePartisRetenue = basePartis;
  let plafond20 = null;
  if (revenuImposable && revenuImposable > 0) {
    plafond20 = Math.round(revenuImposable * gGen.plafond.valeur);
    baseGeneralRetenue = Math.min(baseGeneral, plafond20);
    basePartisRetenue = Math.min(basePartis, plafond20 - baseGeneralRetenue);
    reportable = (baseGeneral - baseGeneralRetenue) + (basePartis - basePartisRetenue);
  }
  const redGeneral = Math.round(baseGeneralRetenue * gGen.taux);
  if (baseGeneral > 0) {
    reductionTotale += redGeneral;
    detail.push({ code: 'ir_general', libelle: gGen.libelle, taux: gGen.taux, base: baseGeneral, baseRetenue: baseGeneralRetenue, reduction: redGeneral, case: gGen.case });
  }

  // 3) Partis politiques (66 %) : ce qu'il reste de la limite de 20 %, dans les 15 000 €
  const redPartis = Math.round(basePartisRetenue * gPartis.taux);
  if (sommes.ir_partis > 0) {
    reductionTotale += redPartis;
    detail.push({ code: 'ir_partis', libelle: gPartis.libelle, taux: gPartis.taux, base: sommes.ir_partis, baseRetenue: basePartisRetenue, reduction: redPartis, case: gPartis.case });
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
    // Plafond du revenu imposable (dons "intérêt général") : montant null si revenu non
    // renseigné, mais le taux (plafondPct20) est toujours connu — jamais codé en dur dans l'IHM,
    // pour rester correct si le taux légal (20 % aujourd'hui) venait à changer sur une année future.
    plafond20,
    plafondPct20: Math.round(gGen.plafond.valeur * 100),
    // Base soumise à la limite de 20 % : intérêt général (surplus Coluche compris) + partis.
    baseEligible20: baseGeneral + basePartis,
    // versions € pour l'affichage
    _euros: {
      totalDonne: euros(totalDonne),
      reductionTotale: euros(reductionTotale),
      reportable: euros(reportable),
    },
    avertissement: 'Estimation indicative — ne remplace pas votre déclaration ni un conseil fiscal.',
  };
}

// BAREMES exporté (référence, pas une copie) pour permettre à fiscal.selftest.js de vérifier
// l'isolation par année sans dupliquer la logique de résolution ni toucher aux vraies données.
module.exports = { estimer, baremePour, anneeSourceBareme, CATEGORIES, euros, BAREMES, SOURCES };
