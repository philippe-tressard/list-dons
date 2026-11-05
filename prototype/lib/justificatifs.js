'use strict';
/**
 * Justificatifs (reçus) : la seule porte qui décide du type d'un fichier reçu ou servi.
 *
 * Le type annoncé par le client (`mimetype`) et l'extension du nom ne prouvent rien :
 * seul le début du contenu (signature) compte (standards/03 §4, ticket #17). Les reçus
 * stockés avant ce contrôle (v0.1.6 et antérieures) gardent leur type annoncé ; il est
 * ramené ici à `application/octet-stream` s'il n'est pas admis.
 */
const fs = require('fs');

// Liste blanche : type → signature (octets de tête). Rien d'autre n'est admis.
const TYPES_ADMIS = [
  { type: 'application/pdf', signature: Buffer.from('%PDF-', 'latin1') },
  { type: 'image/jpeg', signature: Buffer.from([0xff, 0xd8, 0xff]) },
  { type: 'image/png', signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
];
const LONGUEUR_TETE = Math.max(...TYPES_ADMIS.map((t) => t.signature.length));
const MESSAGE_REFUS = 'Type de fichier non admis : PDF, JPEG ou PNG uniquement.';

/** Type admis reconnu dans les octets de tête, ou null. */
function typeDesOctets(tete) {
  const t = TYPES_ADMIS.find(({ signature }) => tete.length >= signature.length && tete.subarray(0, signature.length).equals(signature));
  return t ? t.type : null;
}

/** Type admis d'un fichier sur disque, lu dans ses premiers octets, ou null. */
function typeDuFichier(chemin) {
  const fd = fs.openSync(chemin, 'r');
  try {
    const tete = Buffer.alloc(LONGUEUR_TETE);
    const lus = fs.readSync(fd, tete, 0, LONGUEUR_TETE, 0);
    return typeDesOctets(tete.subarray(0, lus));
  } finally {
    fs.closeSync(fd);
  }
}

/** Type à servir pour un justificatif enregistré : admis, sinon octets bruts. */
function typeServi(type) {
  return TYPES_ADMIS.some((t) => t.type === type) ? type : 'application/octet-stream';
}

module.exports = { typeDuFichier, typeServi, MESSAGE_REFUS };
