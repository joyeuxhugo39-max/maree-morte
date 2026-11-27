// LStudio — les bâtiments complets (une façade, son intérieur meublé, la porte qui les relie), et les aides de l'éditeur
// de bâtiments : créer l'intérieur d'un bâtiment posé, ajouter un étage. Tout passe par les opérations annulables de
// l'éditeur (studio/editor.js) : un modèle posé, c'est une seule action, qu'un Ctrl+Z défait entièrement.
// Les modèles sont des plans originaux, écrits pour LStudio, avec les meubles et les décors muraux du jeu.
// Coordonnées : en cases, relatives au coin (en haut à gauche) du sol de la pièce.
import { key } from '../shared/studio-world.js';
import { EMPRISES } from './catalogue.js';

const range = (a, b) => [...Array(b - a + 1)].map((_, k) => a + k);
export const MODELES = [
  {
    id: 'pecheur', nom: 'Maison de pêcheur', desc: 'Une pièce de 10 × 7 : un lit, une cheminée, une table pour deux, des filets à réparer.',
    facade: { w: 5, h: 4, door: 2, style: 'maison' },
    piece: { w: 10, h: 7, genre: 'house', sortie: 5 },
    meubles: [['lit_deco', 0, 0], ['etagere', 2, 0], ['cheminee', 7, 0], ['plante', 9, 0], ['table', 4, 3], ['chaise', 3, 3, 0], ['chaise', 5, 3, 1], ['tapis_deco', 4, 5], ['tonneau_d', 0, 6], ['crate', 9, 6], ['seau', 8, 6]],
    deco: [{ x: 4, y: 0, k: 'fenetre_s', n: 2, v: 0 }],
  },
  {
    id: 'taverne', nom: 'Taverne', desc: 'Une salle de 16 × 9 : le comptoir et ses étagères, la cheminée, trois tables, les tonneaux.',
    facade: { w: 7, h: 5, door: 3, style: 'tripot' },
    piece: { w: 16, h: 9, genre: 'tavern', sortie: 8 },
    meubles: [
      ...range(0, 5).map((x) => ['etagere', x, 0, x % 2]), ...range(0, 5).map((x) => ['comptoir', x, 2]), ['cheminee', 14, 0],
      ['table', 10, 3], ['chaise', 9, 3, 0], ['chaise', 11, 3, 1], ['table', 13, 6], ['chaise', 12, 6, 0], ['chaise', 14, 6, 1], ['table', 3, 6], ['chaise', 2, 6, 0], ['chaise', 4, 6, 1],
      ['tonneaux', 0, 4, 0], ['tonneau_d', 0, 8], ['tonneau_d', 15, 8], // (derrière le comptoir, on passe par le bout : la colonne 6 reste libre) ['lustre_p', 8, 4, 0, { solide: 'aucune' }],
    ],
    deco: [{ x: 9, y: 0, k: 'fenetre', n: 2, v: 0 }, { x: 12, y: 0, k: 'tableau', n: 1, v: 'mer' }],
  },
  {
    id: 'echoppe', nom: 'Échoppe', desc: 'Une boutique de 10 × 6 : le comptoir, les étagères de marchandises, la réserve.',
    facade: { w: 5, h: 4, door: 2, style: 'epicerie' },
    piece: { w: 10, h: 6, genre: 'house', style: 5, sortie: 5 },
    meubles: [['etagere', 0, 0, 0], ['etagere', 1, 0, 1], ['etagere', 8, 0, 0], ['etagere', 9, 0, 1], ...range(3, 6).map((x) => ['comptoir', x, 2]), ['balance', 4, 1], ['crate', 0, 5], ['sacs', 1, 5], ['barrel', 9, 5], ['plante', 9, 3]],
    deco: [{ x: 3, y: 0, k: 'tarifs', n: 2, v: 0 }, { x: 6, y: 0, k: 'fenetre_s', n: 1, v: 0 }],
  },
  {
    id: 'entrepot', nom: 'Entrepôt', desc: 'Un magasin de 18 × 10 : rayonnages, îlots de caisses et de tonneaux, une allée au milieu.',
    facade: { w: 8, h: 5, door: 4, style: 'entrepot' },
    piece: { w: 18, h: 10, genre: 'entrepot', style: 7, mur: 'entrepot', sortie: 9 },
    meubles: [['rayon_e', 0, 0, 0], ['rayon_e', 2, 0, 1], ['rayon_e', 13, 0, 2], ['rayon_e', 15, 0, 1], ['caisses', 1, 3, 0], ['tonneaux', 4, 3, 1], ['caisses', 13, 3, 1], ['tonneaux', 15, 3, 0], ['tonneaux', 1, 6, 2], ['caisses', 4, 6, 2], ['caisses', 14, 6, 0], ['sacs', 12, 7], ['diable', 11, 9], ['lanterne_p', 9, 4, 0, { solide: 'aucune' }]],
    deco: [{ x: 5, y: 0, k: 'fenetre_s', n: 2, v: 0 }, { x: 8, y: 0, k: 'avis', n: 2, v: 0 }, { x: 11, y: 0, k: 'fenetre_s', n: 2, v: 0 }],
  },
  {
    id: 'demeure', nom: 'Petite demeure', desc: 'Un salon de 13 × 11 et un cabinet, séparés par une cloison percée : cheminée de marbre, canapé, bureau, bibliothèque.',
    facade: { w: 9, h: 6, door: 4, style: 'palais' },
    piece: { w: 20, h: 11, genre: 'demeure', style: 1, mur: 'salon', sortie: 6 },
    murs: range(0, 10).filter((y) => y !== 4 && y !== 5).map((y) => [13, y]), // la cloison, percée au milieu
    sols: Object.fromEntries(range(14, 19).flatMap((x) => range(0, 10).map((y) => [key(x, y), 2]))), // le cabinet : parquet sombre
    mursStyle: Object.fromEntries(range(14, 19).flatMap((x) => range(0, 10).map((y) => [key(x, y), 'cabinet']))),
    meubles: [
      ['cheminee_m', 5, 0], ['buste', 0, 0], ['horloge', 12, 0], ['canape', 2, 2, 0], ['fauteuil', 1, 3, 2], ['fauteuil', 4, 3, 3], ['table_basse', 2, 3, 0], ['gueridon', 9, 3], ['plante', 0, 10], ['plante', 12, 10], ['buffet_m', 8, 10],
      ['lustre_p', 6, 5, 0, { solide: 'aucune' }], ['bureau_m', 16, 3, 1], ['fauteuil', 16, 2, 0, { solide: 'aucune' }], ['globe_m', 18, 7], ['cave_liqueurs', 19, 9], ['candelabre', 14, 9],
    ],
    deco: [{ x: 1, y: 0, k: 'fenetre', n: 2, v: 0 }, { x: 9, y: 0, k: 'fenetre', n: 2, v: 0 }, { x: 14, y: 0, k: 'biblio', n: 3, v: 0 }, { x: 17, y: 0, k: 'carte', n: 2, v: 0 }],
  },
];
// un meuble du modèle → la description d'un décor (avec son emprise, comme dans la bibliothèque)
function meuble(pc, [type, x, y, v = 0, o = {}]) {
  const E = EMPRISES[type], d = { v, couche: 'decors' };
  if (E) { d.emprise = [E[0], E[1]]; d.solide = E[2] || 'tout'; }
  if (o.solide) d.solide = o.solide;
  return { type, x: pc.x + x, y: pc.y + y, d };
}
// poser un bâtiment complet : la façade en (tx, ty), l'intérieur dans la bande, la porte entre les deux ; une seule action
export function buildFromModel(ED, M, tx, ty, nom = M.nom) {
  const spot = ED.freeSpot(M.piece.w, M.piece.h);
  if (!spot) return { err: 'plus de place libre dans la bande des intérieurs' };
  ED.begin(`Bâtiment : ${nom}`);
  const fac = ED.placeDecor('cite', tx, ty, { couche: ED.layer('batiments') ? 'batiments' : 'decors', donnees: { ...M.facade, nom } });
  const pc = ED.createPiece({ ...M.piece, nom, x: spot[0], y: spot[1] });
  if (M.murs) ED.paint('sol', M.murs.map(([x, y]) => [pc.x + x, pc.y + y]), 'IWALL');
  if (M.sols || M.mursStyle || M.deco) ED.changePiece(pc.uid, { sols: M.sols || {}, murs: M.mursStyle || {}, deco: M.deco || [] });
  for (const m of M.meubles) { const q = meuble(pc, m); ED.placeDecor(q.type, q.x, q.y, q.d); }
  ED.addPorte(pc.uid, { batiment: fac.uid, nom });
  ED.end();
  return { fac, pc };
}
// l'intérieur d'un bâtiment déjà posé : une pièce à sa mesure, et la porte qui part de sa porte dessinée
const GENRE_DU_STYLE = { tripot: 'tavern', velours: 'auberge', armurerie: 'forge', entrepot: 'entrepot', palais: 'demeure', tailleur: 'couture', chantier: 'chantier', fosse: 'arene', tonnellerie: 'cellier' };
export function interiorFor(ED, uid) {
  const b = ED.decorOf.get(uid); if (!b) return { err: 'bâtiment introuvable' };
  const D = b.donnees || {}, w = Math.max(6, Math.min(30, (D.w || 5) * 2 + 2)), h = Math.max(5, Math.min(16, (D.h || 4) * 2));
  const spot = ED.freeSpot(w, h); if (!spot) return { err: 'plus de place libre dans la bande des intérieurs' };
  const nom = D.nom || b.nom || 'Intérieur';
  ED.begin(`Intérieur : ${nom}`);
  const pc = ED.createPiece({ nom, w, h, x: spot[0], y: spot[1], genre: GENRE_DU_STYLE[D.style] || 'house', sortie: w >> 1 });
  if ((D.door ?? 2) < 0) ED.change({ k: 'd', uid }, { 'donnees.door': Math.min(2, (D.w || 5) - 1) });
  const d = ED.addPorte(pc.uid, { batiment: uid, nom });
  ED.end();
  return { pc, d };
}
// un étage : une pièce de plus, et un escalier dans chacune (un passage pour monter, un pour descendre)
export function addEtage(ED, uid) {
  const A = ED.piece(uid); if (!A) return { err: 'pièce introuvable' };
  const spot = ED.freeSpot(A.w, A.h); if (!spot) return { err: 'plus de place libre dans la bande des intérieurs' };
  // la colonne de l'escalier : la première, en partant de la droite, dont le pied est libre dans la pièce du bas
  const W = ED.world, free = (x, y) => !W.solid[y * W.W + x];
  let col = -1; for (let x = A.w - 2; x >= 1 && col < 0; x--) if (free(A.x + x, A.y) && free(A.x + x, A.y + 1) && x !== A.sortie) col = x;
  if (col < 0) return { err: 'aucune place libre contre le mur du fond pour l’escalier' };
  ED.begin(`Étage : ${A.nom}`);
  const B = ED.createPiece({ nom: `${A.nom} — étage`, w: A.w, h: A.h, x: spot[0], y: spot[1], genre: A.genre, style: A.style, mur: A.mur, sortie: -1 }); // à l'étage, pas de porte sur la rue : on y monte par l'escalier
  for (const [P, label] of [[A, 'Monter à l’étage'], [B, 'Descendre']]) {
    const Q = P === A ? B : A;
    ED.placeDecor('escalier', P.x + col, P.y, { solide: 'aucune', couche: 'decors' });
    ED.addZone({ type: 'passage', bouton: label, x: P.x + col, y: P.y, w: 1, h: 1, vers: { x: Q.x + col, y: Q.y + 1 } });
  }
  ED.end();
  return { pc: B, col };
}
