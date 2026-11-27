// LStudio — la couche du monde écrite par l'éditeur, appliquée par le jeu.
// LStudio ne fabrique pas une deuxième carte : il produit un document de modifications (des sols repeints, des régions,
// des collisions, des décors ajoutés, déplacés ou retirés), que generateWorld applique EN TOUT DERNIER, après toutes
// les couches du jeu. Le même code sert à l'éditeur, au jeu (client, solo, hôte d'une partie à plusieurs) et aux tests :
// tout le monde voit le même monde. Un document vide ne change rien.
// Format : voir rapports/ls1-audit-architecture.md (« Le format du document »).
import { T, OVER_H } from './constants.js';

export const STUDIO_FORMAT = 'lstudio';
export const STUDIO_VERSION = 2; // 2 : les pièces, les portes et les zones (un document de la version 1 se lit tel quel)
export const TILE_NAMES = Object.fromEntries(Object.entries(T).map(([k, v]) => [v, k])); // 3 → 'GRASS'
const SOLID_T = new Set([T.DEEP, T.ROCK, T.LAVA, T.VOID, T.CWALL, T.IWALL]);
const isWater = (t) => t === T.WATER || t === T.DEEP;
// les décors qui vivent sur l'eau (un décor posé ailleurs sur l'eau « flotte » : le contrôle le signale)
export const WATER_PROPS = new Set(['boat', 'ship', 'wreck', 'bouee', 'lily', 'reeds', 'bitte', 'mat_epave', 'corail']);
// les décors-bâtiments : une emprise de w × h cases, posée par son coin en haut à gauche
export const BUILDING_PROPS = new Set(['cite', 'propriete']);
// les pièces : le genre donne au lieu son style par défaut (murs, sol, lumière, sons) ; les styles de sol et de mur sont
// ceux que le moteur dessine déjà (client/render/heist-art.js : FL et WSTYLE)
export const PIECE_GENRES = { house: 'Maison', tavern: 'Taverne', auberge: 'Auberge', forge: 'Forge', geole: 'Geôle', couture: 'Atelier de couture', receleur: 'Boutique sombre', entrepot: 'Entrepôt', demeure: 'Demeure', cellier: 'Cellier', chantier: 'Chantier', arene: 'Salle de pierre', cave: 'Grotte' };
export const PIECE_SOLS = { 1: 'Parquet', 2: 'Parquet sombre', 3: 'Marbre', 4: 'Dallage de galerie', 5: 'Dalles', 6: 'Planches sombres', 7: 'Planches d’entrepôt', 8: 'Allée peinte', 9: 'Pierre humide', 18: 'Planches d’atelier', 19: 'Pavés', 15: 'Terrasse', 16: 'Pont de navire', 17: 'Dunette', 10: 'Tuiles rouges', 11: 'Ardoise', 12: 'Tuiles canal' };
export const PIECE_MURS = { salon: 'Damas rouge', vestibule: 'Pierre claire', office: 'Enduit et faïence', jeu: 'Damas vert', galerie: 'Tenture bleue', archives: 'Lambris sombre', cabinet: 'Lambris', entrepot: 'Planches brutes', atelier: 'Planches claires', cave: 'Pierre de cave', facade_ocre: 'Façade ocre', facade_rose: 'Façade rose', facade_bleue: 'Façade bleue', facade_brique: 'Briques', lointain: 'Ciel de nuit' };
export const MUR_DECORS = { fenetre: 'Haute fenêtre', fenetre_s: 'Petite fenêtre', rue_fenetre: 'Fenêtre à volets', rue_porte: 'Porte peinte', tableau: 'Tableau', portrait_ch: 'Grand portrait', miroir: 'Miroir', tapisserie: 'Tapisserie', biblio: 'Bibliothèque', carte: 'Carte marine', blason: 'Blason', vaisselle: 'Vaisselier mural', cuivres: 'Cuivres', porte_ch: 'Porte de chargement', avis: 'Panneau d’avis', tarifs: 'Tableau des tarifs', outils: 'Tableau à outils', plans: 'Plans épinglés', echelle_m: 'Échelle', soupirail: 'Soupirail', niche: 'Niche et bougie', enseigne: 'Enseigne' };
export const ZONE_TYPES = { message: 'Message (un panneau, une inscription)', passage: 'Passage (vers un autre point : un escalier, une trappe)' };
const PIECE_MIN = 3, PIECE_MAX_W = 96, PIECE_MAX_H = 48;

// ------------------------------------------------------------------ le document courant (celui que generateWorld applique)
let current = null;
export function setStudioDoc(doc) { current = doc && doc.format === STUDIO_FORMAT ? doc : null; }
export function studioDoc() { return current; }

export function emptyDoc(name = 'Mon monde') {
  const now = new Date().toISOString();
  return {
    format: STUDIO_FORMAT, version: STUDIO_VERSION,
    meta: { nom: name, cree: now, modifie: now },
    couches: [{ id: 'decors', nom: 'Décors', visible: true, verrou: false }, { id: 'batiments', nom: 'Bâtiments', visible: true, verrou: false }, { id: 'nature', nom: 'Nature', visible: true, verrou: false }],
    sol: {}, regions: {}, collisions: {}, navigation: {}, decors: [], retouches: {}, reperes: [],
    pieces: [], portes: [], zones: [],
  };
}
export const key = (x, y) => x + ',' + y;
export const unkey = (k) => { const i = k.indexOf(','); return [+k.slice(0, i), +k.slice(i + 1)]; };
// un document lu d'un fichier : on complète ce qui manque, on refuse ce qui n'est pas un document LStudio
export function normalizeDoc(d) {
  if (!d || typeof d !== 'object' || d.format !== STUDIO_FORMAT) throw new Error('Ce fichier n’est pas un monde LStudio.');
  if ((d.version | 0) > STUDIO_VERSION) throw new Error(`Ce monde a été fait avec une version plus récente de LStudio (format ${d.version}).`);
  const e = emptyDoc();
  const out = { ...e, ...d, meta: { ...e.meta, ...(d.meta || {}) } };
  for (const k of ['sol', 'regions', 'collisions', 'navigation', 'retouches']) if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {};
  for (const k of ['decors', 'couches', 'reperes', 'pieces', 'portes', 'zones']) if (!Array.isArray(out[k])) out[k] = e[k];
  out.version = STUDIO_VERSION;
  if (!out.couches.length) out.couches = e.couches;
  return out;
}

// ------------------------------------------------------------------ l'emprise d'un décor (ses cases solides)
// solide : 'auto' (la règle du type : une case, ou l'emprise d'un bâtiment), 'aucune', 'tout' (toute l'emprise w × h),
// ou une liste [[dx, dy], …] relative à la case (x, y)
export function propCells(p, PROPS) {
  if (BUILDING_PROPS.has(p.type) && p.w && p.h) { const out = []; for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) out.push([p.tx + x, p.ty + y]); return out; }
  if (p.fw && p.fh && p.cells) return p.cells.map(([x, y]) => [p.tx + x, p.ty + y]);
  return PROPS[p.type] && PROPS[p.type].solid ? [[p.tx, p.ty]] : [];
}
// emprise : [largeur, hauteur] d'un meuble de plusieurs cases (posé par sa case en haut à gauche, comme les meubles des
// lieux du jeu) ; sans emprise, un décor tient sur sa case
const empriseOf = (d) => (Array.isArray(d.emprise) && d.emprise[0] >= 1 && d.emprise[1] >= 1 ? [Math.min(8, d.emprise[0] | 0), Math.min(8, d.emprise[1] | 0)] : null);
function studioCells(d, PROPS) {
  const E = empriseOf(d);
  const w = Math.max(1, (d.donnees && d.donnees.w) || (E && E[0]) || d.w || 1), h = Math.max(1, (d.donnees && d.donnees.h) || (E && E[1]) || d.h || 1);
  const s = d.solide == null ? 'auto' : d.solide;
  if (Array.isArray(s)) return s.map(([dx, dy]) => [d.x + dx, d.y + dy]);
  if (s === 'aucune') return [];
  if (s === 'tout' || (s === 'auto' && (BUILDING_PROPS.has(d.type) || E))) { const out = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.push([d.x + x, d.y + y]); return out; }
  return PROPS[d.type] && PROPS[d.type].solid ? [[d.x, d.y]] : [];
}
// la position en pixels d'un décor posé par sa case (le pied du sprite, comme addProp ; un bâtiment par son coin)
export function propAnchor(d) {
  if (BUILDING_PROPS.has(d.type)) { const w = (d.donnees && d.donnees.w) || 4, h = (d.donnees && d.donnees.h) || 3; return { ox: w * 8 - 8 + (d.dx || 0), oy: h * 16 - 14 + (d.dy || 0) }; }
  const E = empriseOf(d);
  if (E) return { ox: E[0] * 8 - 8 + (d.dx || 0), oy: (E[1] - 1) * 16 + (d.dy || 0) };
  return { ox: d.dx || 0, oy: (d.dy || 0) };
}

// ------------------------------------------------------------------ le monde modifiable (le jeu ET l'éditeur s'en servent)
// Une case est solide si : une collision peinte le dit (le dernier mot) ; sinon si son sol est un sol solide ; sinon si
// un décor la couvre ; sinon si elle l'était dans le monde d'origine pour une autre raison qu'un décor (et que son sol
// n'a pas été repeint). Les décors sont comptés case par case : le résultat ne dépend pas de l'ordre des modifications.
// C : { W, H, tiles, zones, solid, occ, sail, waterDist, plankDir, props, PROPS, inMap, make(type, tx, ty, v, ox, oy, extra) }
export class StudioWorld {
  constructor(C) {
    this.C = C; const N = C.W * C.H;
    // tiles0, solid0, sail0 : le monde « de base » (celui d'origine, plus les pièces creusées par le document) ; la
    // peinture du sol s'y ajoute, la gomme y ramène. tilesO, solidO, sailO : le monde d'origine, sans rien.
    this.tiles0 = C.tiles.slice(); this.zones0 = C.zones.slice(); this.sail0 = C.sail.slice(); this.solid0 = C.solid.slice();
    this.cover = new Uint16Array(N); this.coll = new Map(); this.nav = new Map(); this.byStudio = new Map(); this.retouched = new Map();
    for (const p of C.props) { p._cells = propCells(p, C.PROPS); for (const [x, y] of p._cells) if (C.inMap(x, y)) this.cover[y * C.W + x]++; }
    this.cover0 = this.cover.slice(); this.water = [];
    this.solPaint = new Map(); this.carved = new Set(); this.pieceRooms = new Map(); this.doorOf = new Map();
    this.baseRooms = C.rooms ? C.rooms.length : 0; this.baseDoors = C.doors ? C.doors.length : 0; this.ecartesStructure = [];
  }
  origin() { // les copies d'origine ne sont faites qu'au premier besoin (un document sans pièce n'en a pas l'usage)
    if (!this.tilesO) { this.tilesO = this.tiles0.slice(); this.solidO = this.solid0.slice(); this.sailO = this.sail0.slice(); }
  }
  idx(x, y) { return y * this.C.W + x; }
  solidAt(i) {
    const C = this.C, t = C.tiles[i];
    if (this.coll.has(i)) return this.coll.get(i);
    if (SOLID_T.has(t) || this.cover[i] > 0) return 1;
    return t === this.tiles0[i] && this.solid0[i] && this.cover0[i] === 0 ? 1 : 0;
  }
  touch(i) { this.C.solid[i] = this.solidAt(i); if (this.cover[i]) this.C.occ[i] = 1; }
  // le sol, la région, la collision, la navigation d'une case (null : revenir à l'origine)
  setTile(x, y, name) {
    const C = this.C, i = this.idx(x, y), t = name == null ? this.tiles0[i] : T[name];
    C.tiles[i] = t; if (C.plankDir) { if (!this.plank0) this.plank0 = C.plankDir.slice(); C.plankDir[i] = name == null ? this.plank0[i] : 0; }
    if (name == null) this.solPaint.delete(i); else this.solPaint.set(i, t);
    if (!this.nav.has(i)) C.sail[i] = name == null ? this.sail0[i] : isWater(t) ? 1 : 0;
    this.touch(i); this.water.push(i);
  }
  setZone(x, y, z) { const i = this.idx(x, y); this.C.zones[i] = z == null ? this.zones0[i] : z; }
  setColl(x, y, v) { const i = this.idx(x, y); if (v == null) this.coll.delete(i); else this.coll.set(i, v ? 1 : 0); this.touch(i); }
  setNav(x, y, v) { const C = this.C, i = this.idx(x, y); if (v == null) { this.nav.delete(i); C.sail[i] = C.tiles[i] === this.tiles0[i] ? this.sail0[i] : isWater(C.tiles[i]) ? 1 : 0; } else { this.nav.set(i, v ? 1 : 0); C.sail[i] = v ? 1 : 0; } }
  flushWater() { if (this.water.length && this.C.waterDist) recomputeWaterDist(this.C, this.water); this.water = []; }
  cells(p, sign) { const C = this.C; for (const [x, y] of p._cells || []) if (C.inMap(x, y)) { const i = this.idx(x, y); this.cover[i] += sign; this.touch(i); } }
  // un décor ajouté par LStudio
  place(p, d) { // position, variante, plan, miroir d'un décor d'après sa description
    const { ox, oy } = propAnchor(d);
    p.tx = d.x; p.ty = d.y; p.x = d.x * 16 + 8 + ox; p.y = d.y * 16 + 14 + oy; p.v = d.v | 0;
    p.plan = d.plan && d.plan !== 'auto' ? d.plan : undefined; p.flip = d.miroir ? true : undefined;
    if (BUILDING_PROPS.has(d.type)) { const D = d.donnees || {}; Object.assign(p, { w: D.w || 4, h: D.h || 3, door: D.door != null ? D.door : -1, name: D.nom || '', style: D.style || 'maison' }); }
    p._cells = studioCells(d, this.C.PROPS); p.cellsStudio = p._cells;
  }
  addDecor(d) {
    const C = this.C, { ox, oy } = propAnchor(d);
    const p = C.make(d.type, d.x, d.y, d.v | 0, ox, oy, { studio: d.uid });
    this.place(p, d); this.byStudio.set(d.uid, p);
    this.touch(this.idx(d.x, d.y)); this.cells(p, +1);
    return p;
  }
  updateDecor(d) { const p = this.byStudio.get(d.uid); if (!p) return null; this.cells(p, -1); this.place(p, d); this.cells(p, +1); this.touch(this.idx(d.x, d.y)); return p; }
  removeDecor(uid) { const C = this.C, p = this.byStudio.get(uid); if (!p) return; this.cells(p, -1); const k = C.props.indexOf(p); if (k >= 0) C.props.splice(k, 1); this.byStudio.delete(uid); }
  // un décor du monde d'origine, retouché (déplacé, changé, retiré) ; ref : son empreinte (type et case d'origine)
  retouch(p, r) {
    const C = this.C;
    if (!this.retouched.has(p.id)) this.retouched.set(p.id, { p, o: { x: p.x, y: p.y, tx: p.tx, ty: p.ty, v: p.v, plan: p.plan, flip: p.flip }, out: false });
    const R = this.retouched.get(p.id), o = R.o;
    if (!R.out) this.cells(p, -1); // (un décor déjà retiré ne compte plus : ne pas le décompter deux fois)
    if (r.retire) { if (!R.out) { const k = C.props.indexOf(p); if (k >= 0) C.props.splice(k, 1); R.out = true; } return; }
    if (R.out) { C.props.push(p); R.out = false; }
    const nx = r.x != null ? r.x | 0 : o.tx, ny = r.y != null ? r.y | 0 : o.ty;
    p.tx = nx; p.ty = ny; p.x = o.x + (nx - o.tx) * 16 + (r.dx || 0); p.y = o.y + (ny - o.ty) * 16 + (r.dy || 0);
    p.v = r.v != null ? r.v | 0 : o.v; p.plan = r.plan && r.plan !== 'auto' ? r.plan : o.plan; p.flip = r.miroir != null ? !!r.miroir : o.flip;
    p._cells = propCells(p, C.PROPS); this.cells(p, +1);
  }
  unretouch(id) {
    const C = this.C, R = this.retouched.get(id); if (!R) return;
    const p = R.p; if (!R.out) this.cells(p, -1);
    Object.assign(p, R.o); if (R.out) C.props.push(p);
    p._cells = propCells(p, C.PROPS); this.cells(p, +1); this.retouched.delete(id);
  }
}

// ------------------------------------------------------------------ les pièces, les portes, les zones (la « structure »)
// Une pièce est creusée dans la bande des intérieurs, sous l'archipel, là où il n'y a que du vide : un sol, son enveloppe
// de murs (une colonne de chaque côté, deux rangées en haut pour le pan de mur, une en bas), une sortie dans le mur du bas.
// Elle devient une pièce du jeu comme les autres (rooms, roomGrid) : le moteur de rendu, la lumière, les sons, les
// déplacements et les portes la traitent comme les intérieurs d'origine. Une porte relie un point du dehors (ou la porte
// dessinée d'un bâtiment posé dans LStudio) à une pièce. Une zone est un rectangle : un message, ou un passage vers un
// autre point (un escalier, une trappe : c'est ainsi qu'on fait un étage). Tout est rebâti d'un coup, dans l'ordre du
// document, à chaque changement : le résultat ne dépend que du document (le jeu et l'éditeur font pareil).
export function pieceEnvelope(pc) { return { x0: pc.x - 1, y0: pc.y - 2, x1: pc.x + pc.w, y1: pc.y + pc.h }; }
// les colonnes de sortie de la pièce (dans le mur du bas), relatives au coin : la sienne (sortie < 0 : aucune, pour un
// étage où l'on n'arrive que par l'escalier), et celle de chaque porte qui y mène
export function pieceExits(pc, portes) {
  const out = new Set(pc.sortie != null && pc.sortie < 0 ? [] : [clampI(pc.sortie, 0, pc.w - 1, pc.w >> 1)]);
  for (const d of portes || []) if (d.piece === pc.uid) out.add(porteExit(pc, d));
  return [...out];
}
export function porteExit(pc, d) { return clampI(d.sortie != null ? d.sortie : pc.sortie != null && pc.sortie >= 0 ? pc.sortie : pc.w >> 1, 0, pc.w - 1, pc.w >> 1); }
function clampI(v, a, b, dflt) { v = v == null || isNaN(v) ? dflt : v | 0; return Math.max(a, Math.min(b, v)); }
// le point du dehors d'une porte : sa case, ou la case devant la porte dessinée du bâtiment auquel elle est liée
export function porteDehors(d, decorsByUid) {
  if (d.batiment) {
    const b = decorsByUid.get(d.batiment);
    if (!b) return { err: 'le bâtiment auquel elle est liée n’existe plus' };
    if (!BUILDING_PROPS.has(b.type)) return { err: 'elle est liée à un décor qui n’est pas un bâtiment' };
    const D = b.donnees || {}, door = D.door != null ? D.door : -1;
    if (door < 0) return { err: 'le bâtiment auquel elle est liée n’a pas de porte' };
    return { x: b.x + Math.min(door, (D.w || 4) - 1), y: b.y + (D.h || 3) };
  }
  return { x: d.x | 0, y: d.y | 0 };
}
Object.assign(StudioWorld.prototype, {
  pieceProblem(pc) {
    const C = this.C;
    if (!(pc.w >= PIECE_MIN && pc.h >= PIECE_MIN && pc.w <= PIECE_MAX_W && pc.h <= PIECE_MAX_H)) return `dimensions impossibles (${pc.w} × ${pc.h} ; de ${PIECE_MIN} à ${PIECE_MAX_W} × ${PIECE_MAX_H})`;
    const E = pieceEnvelope(pc);
    if (E.y0 < OVER_H + 1 || E.x0 < 1 || E.x1 > C.W - 2 || E.y1 > C.H - 2) return 'hors de la bande des intérieurs';
    for (let y = E.y0; y <= E.y1; y++) for (let x = E.x0; x <= E.x1; x++) {
      const i = this.idx(x, y);
      if (this.carved.has(i)) return 'elle chevauche une autre pièce de LStudio';
      if (this.tilesO[i] !== T.VOID || this.gridO[i] >= 0) return 'elle chevauche une pièce du jeu';
    }
    return null;
  },
  // rebâtir les pièces, les portes et les zones d'après le document ; renvoie les cases changées
  setStructure(doc) {
    const C = this.C, changed = new Set(), skip = (quoi, raison, x, y, uid) => this.ecartesStructure.push({ quoi, raison, x, y, uid });
    if (!C.rooms || !C.doors || !C.roomGrid) return changed;
    this.origin(); if (!this.gridO) this.gridO = C.roomGrid.slice();
    this.ecartesStructure = [];
    // 1. on défait l'ancienne structure : les cases creusées redeviennent celles d'origine
    for (const i of this.carved) { this.tiles0[i] = this.tilesO[i]; this.solid0[i] = this.solidO[i]; this.sail0[i] = this.sailO[i]; C.roomGrid[i] = this.gridO[i]; changed.add(i); }
    this.carved = new Set(); this.pieceRooms = new Map(); this.doorOf = new Map();
    C.rooms.length = this.baseRooms; C.doors.length = this.baseDoors;
    // 2. les pièces, dans l'ordre du document
    for (const pc of doc.pieces || []) {
      const why = this.pieceProblem(pc);
      if (why) { skip('pièce', `La pièce « ${pc.nom || pc.uid} » est écartée : ${why}`, pc.x, pc.y, pc.uid); continue; }
      const r = this.carve(pc, pieceExits(pc, doc.portes), changed);
      this.pieceRooms.set(pc.uid, r);
    }
    // 3. les portes
    const byUid = new Map((doc.decors || []).map((d) => [d.uid, d]));
    for (const d of doc.portes || []) {
      const fail = (raison) => skip('porte', `La porte « ${d.nom || d.uid} » est écartée : ${raison}`, d.x, d.y, d.uid);
      let r = null, inside = null;
      if (typeof d.piece === 'string') {
        r = this.pieceRooms.get(d.piece);
        if (!r) { fail('la pièce où elle mène n’existe pas (ou a été écartée)'); continue; }
        const pc = (doc.pieces || []).find((q) => q.uid === d.piece), ec = porteExit(pc, d);
        const exx = r.x0 + ec, exy = r.y0 + r.h;
        inside = { ix: exx * 16 + 8, iy: (exy - 1) * 16 + 10, ex: exx * 16 + 8, ey: exy * 16 + 8 };
      } else if (typeof d.piece === 'number' && d.piece >= 0 && d.piece < this.baseRooms) {
        r = C.rooms[d.piece];
        const od = C.doors.slice(0, this.baseDoors).find((q) => q.room === r.id && !q.dive);
        if (!od) { fail(`la pièce « ${r.name} » n’a pas d’entrée d’origine à partager`); continue; }
        inside = { ix: od.ix, iy: od.iy, ex: od.ex, ey: od.ey };
      } else { fail('elle ne mène à aucune pièce'); continue; }
      const P = porteDehors(d, byUid);
      if (P.err) { fail(P.err); continue; }
      if (!C.inMap(P.x, P.y) || P.y >= OVER_H) { fail('son entrée doit être dehors, sur l’archipel'); continue; }
      const door = { id: C.doors.length, room: r.id, name: d.nom || r.name, kind: r.kind, secret: false, ox: P.x * 16 + 8, oy: P.y * 16 + 8, rx: P.x * 16 + 8, ry: P.y * 16 + 12, ...inside, studio: d.uid };
      C.doors.push(door); this.doorOf.set(d.uid, door);
    }
    // 4. les zones (le jeu les lit dans world.studioZones)
    if (C.szones) {
      C.szones.length = 0;
      for (const z of doc.zones || []) {
        const fail = (raison) => skip('zone', `La zone « ${z.nom || z.uid} » est écartée : ${raison}`, z.x, z.y, z.uid);
        if (!ZONE_TYPES[z.type]) { fail(`genre inconnu « ${z.type} »`); continue; }
        const w = z.w | 0, h = z.h | 0;
        if (!(w >= 1 && h >= 1 && w <= 64 && h <= 64) || !C.inMap(z.x, z.y) || !C.inMap(z.x + w - 1, z.y + h - 1)) { fail('hors de la carte, ou de dimensions impossibles'); continue; }
        if (z.type === 'passage' && (!z.vers || !C.inMap(z.vers.x, z.vers.y))) { fail('le passage ne mène nulle part'); continue; }
        const cx = z.x + (w >> 1), cy = z.y + (h >> 1);
        C.szones.push({ id: C.szones.length, uid: z.uid, type: z.type, x0: z.x * 16, y0: z.y * 16, x1: (z.x + w) * 16, y1: (z.y + h) * 16, room: C.roomGrid[cy * C.W + cx],
          label: z.bouton || (z.type === 'passage' ? 'Passer' : 'Lire'), title: z.titre || '', text: z.texte || '', auto: !!z.auto,
          to: z.type === 'passage' ? { x: z.vers.x * 16 + 8, y: z.vers.y * 16 + 10 } : null });
      }
    }
    // 5. les cases changées reprennent leur sol (peint, ou celui de base), leur navigation, leur solidité
    for (const i of changed) {
      const painted = this.solPaint.has(i);
      C.tiles[i] = painted ? this.solPaint.get(i) : this.tiles0[i];
      if (!this.nav.has(i)) C.sail[i] = painted ? (isWater(C.tiles[i]) ? 1 : 0) : this.sail0[i];
      this.touch(i);
    }
    return changed;
  },
  carve(pc, exits, changed) {
    const C = this.C, E = pieceEnvelope(pc), base = pc.sol === 'STONEF' ? T.STONEF : T.FLOOR;
    const id = C.rooms.length;
    for (let y = E.y0; y <= E.y1; y++) for (let x = E.x0; x <= E.x1; x++) {
      const i = this.idx(x, y), inside = x >= pc.x && x < pc.x + pc.w && y >= pc.y && y < pc.y + pc.h;
      this.tiles0[i] = inside ? base : T.IWALL; this.solid0[i] = inside ? 0 : 1; this.sail0[i] = 0;
      C.roomGrid[i] = id; this.carved.add(i); changed.add(i);
    }
    for (const ec of exits) { const i = this.idx(pc.x + ec, pc.y + pc.h); this.tiles0[i] = T.EXIT; this.solid0[i] = 0; }
    // l'habillage : le style de sol et de mur de chaque case (0 : celui du genre), le décor accroché aux murs
    const n = pc.w * pc.h, fl = new Uint8Array(n), ws = new Uint8Array(n), wsk = [], wd = new Map();
    const wallKey = (k) => { if (!k || !WALL_KEYS.has(k)) return 0; let j = wsk.indexOf(k); if (j < 0) { wsk.push(k); j = wsk.length - 1; } return j + 1; };
    const fl0 = PIECE_SOLS[pc.style] ? pc.style | 0 : 0, ws0 = wallKey(pc.mur);
    fl.fill(fl0); ws.fill(ws0);
    for (const [k, v] of Object.entries(pc.sols || {})) { const [dx, dy] = unkey(k); if (dx >= 0 && dy >= 0 && dx < pc.w && dy < pc.h) fl[dy * pc.w + dx] = PIECE_SOLS[v] ? v | 0 : 0; }
    for (const [k, v] of Object.entries(pc.murs || {})) { const [dx, dy] = unkey(k); if (dx >= 0 && dy >= 0 && dx < pc.w && dy < pc.h) ws[dy * pc.w + dx] = wallKey(v); }
    for (const m of pc.deco || []) {
      if (!MUR_DECORS[m.k]) continue; const len = clampI(m.n, 1, 6, 1);
      for (let j = 0; j < len; j++) { const x = m.x + j; if (x >= 0 && x < pc.w && m.y >= 0 && m.y < pc.h) wd.set((pc.x + x) + (pc.y + m.y) * 4096, [m.k, j, len, m.v != null ? m.v : 0]); }
    }
    const kind = PIECE_GENRES[pc.genre] ? pc.genre : 'house';
    const r = { id, name: pc.nom || 'Pièce sans nom', kind, x0: pc.x, y0: pc.y, w: pc.w, h: pc.h, studio: pc.uid, fl, ws, wsk, wd, noDeco: pc.decoAuto === false ? 1 : 0 };
    if (pc.dehors) r.outdoor = 1;
    if (pc.ambiance) r.amb = pc.ambiance;
    C.rooms.push(r);
    return r;
  },
});
const WALL_KEYS = new Set(Object.keys(PIECE_MURS));

// ------------------------------------------------------------------ l'application d'un document entier (generateWorld, l'éditeur au chargement)
// Renvoie le monde modifiable, et un relevé : ce qui a été appliqué, et ce qui a été écarté (avec la raison).
export function applyDoc(S, doc) {
  const C = S.C, rep = { sol: 0, regions: 0, collisions: 0, navigation: 0, decors: 0, retouches: 0, pieces: 0, portes: 0, zones: 0, ecartes: [] };
  if (!doc) return rep;
  const skip = (quoi, raison, x, y) => rep.ecartes.push({ quoi, raison, x, y });
  // les pièces d'abord : elles changent le monde « de base », sur lequel le sol est ensuite repeint
  if ((doc.pieces || []).length || (doc.portes || []).length || (doc.zones || []).length) {
    S.setStructure(doc);
    rep.pieces = S.pieceRooms.size; rep.portes = S.doorOf.size; rep.zones = C.szones ? C.szones.length : 0;
    rep.ecartes.push(...S.ecartesStructure);
  }
  for (const [k, name] of Object.entries(doc.sol || {})) { const [x, y] = unkey(k); if (!C.inMap(x, y)) { skip('sol', 'hors de la carte', x, y); continue; } if (T[name] == null) { skip('sol', `sol inconnu « ${name} »`, x, y); continue; } S.setTile(x, y, name); rep.sol++; }
  S.flushWater();
  for (const [k, z] of Object.entries(doc.regions || {})) { const [x, y] = unkey(k); if (!C.inMap(x, y) || !(z >= 0 && z < 255)) { skip('région', 'hors de la carte ou région inconnue', x, y); continue; } S.setZone(x, y, z | 0); rep.regions++; }
  const byId = new Map(C.props.map((p) => [p.id, p]));
  for (const [id, r] of Object.entries(doc.retouches || {})) {
    const p = byId.get(+id);
    if (!p) { skip('retouche', `le décor n° ${id} n’existe pas dans cette version du jeu`, r.ref && r.ref.x, r.ref && r.ref.y); continue; }
    if (r.ref && (r.ref.type !== p.type || r.ref.x !== p.tx || r.ref.y !== p.ty)) { skip('retouche', `le décor n° ${id} n’est plus « ${r.ref.type} » en (${r.ref.x}, ${r.ref.y}) : modification écartée`, r.ref.x, r.ref.y); continue; }
    if (!r.retire && r.x != null && !C.inMap(r.x, r.y)) { skip('retouche', 'déplacé hors de la carte', r.x, r.y); continue; }
    S.retouch(p, r); rep.retouches++;
  }
  for (const d of doc.decors || []) {
    if (!C.PROPS[d.type]) { skip('décor', `type de décor inconnu « ${d.type} »`, d.x, d.y); continue; }
    if (!C.inMap(d.x, d.y)) { skip('décor', 'hors de la carte', d.x, d.y); continue; }
    S.addDecor(d); rep.decors++;
  }
  for (const [k, v] of Object.entries(doc.collisions || {})) { const [x, y] = unkey(k); if (!C.inMap(x, y)) { skip('collision', 'hors de la carte', x, y); continue; } S.setColl(x, y, v); rep.collisions++; }
  for (const [k, v] of Object.entries(doc.navigation || {})) { const [x, y] = unkey(k); if (!C.inMap(x, y)) { skip('navigation', 'hors de la carte', x, y); continue; } S.setNav(x, y, v); rep.navigation++; }
  return rep;
}
// generateWorld : un document vide ou absent ne touche à rien (pas même au calcul des emprises)
export function applyStudio(C, doc) {
  const none = () => ({ sol: 0, regions: 0, collisions: 0, navigation: 0, decors: 0, retouches: 0, pieces: 0, portes: 0, zones: 0, ecartes: [] });
  if (!doc) return none();
  const empty = !Object.keys(doc.sol || {}).length && !Object.keys(doc.regions || {}).length && !Object.keys(doc.collisions || {}).length && !Object.keys(doc.navigation || {}).length && !(doc.decors || []).length && !Object.keys(doc.retouches || {}).length && !(doc.pieces || []).length && !(doc.portes || []).length && !(doc.zones || []).length;
  if (empty) return none();
  const S = new StudioWorld({ ...C, make: (type, tx, ty, v, ox, oy, extra) => C.addProp(type, tx, ty, v, ox, oy, extra) });
  const rep = applyDoc(S, doc);
  for (const p of C.props) delete p._cells; // le jeu n'en a plus besoin
  return rep;
}
// la distance à la côte (l'écume, les reflets), recalculée autour des cases repeintes
function recomputeWaterDist(C, painted) {
  const { W, tiles, waterDist, inMap } = C, done = new Set();
  for (const i0 of painted) {
    const x0 = i0 % W, y0 = (i0 / W) | 0;
    for (let y = y0 - 9; y <= y0 + 9; y++) for (let x = x0 - 9; x <= x0 + 9; x++) {
      if (!inMap(x, y)) continue; const i = y * W + x; if (done.has(i)) continue; done.add(i);
      if (!isWater(tiles[i])) { waterDist[i] = 0; continue; }
      let md = 9; for (let r = 1; r < 9 && md === 9; r++) for (let dy = -r; dy <= r && md === 9; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !inMap(x + dx, y + dy)) continue; if (!isWater(tiles[(y + dy) * W + x + dx])) { md = r; break; } }
      waterDist[i] = md;
    }
  }
}

// ------------------------------------------------------------------ le contrôle qualité (LStudio et les tests)
// world : le monde généré AVEC le document ; base : (facultatif) le monde sans le document, pour comparer
// Chaque problème : { niveau: 'bloquant' | 'avertissement', code, msg, x, y, fix }
export function checkStudio(world, doc, deps) {
  const { PROPS, canStand } = deps, out = [], W = world.W, H = world.H;
  const add = (niveau, code, msg, x, y, fix = null) => out.push({ niveau, code, msg, x, y, fix });
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  if (!doc) return out;
  // les données du document
  for (const k of Object.keys(doc.sol || {})) { const [x, y] = unkey(k); if (!inMap(x, y)) add('bloquant', 'sol_hors', `Sol repeint hors de la carte (${x}, ${y})`, x, y, { op: 'retirer_sol', k }); else if (T[doc.sol[k]] == null) add('bloquant', 'sol_inconnu', `Sol inconnu « ${doc.sol[k]} » en (${x}, ${y})`, x, y, { op: 'retirer_sol', k }); }
  for (const d of doc.decors || []) {
    if (!PROPS[d.type]) add('bloquant', 'asset_inconnu', `Le décor « ${d.type} » n’existe pas dans le jeu (référence invalide)`, d.x, d.y, { op: 'supprimer', uid: d.uid });
    else if (!inMap(d.x, d.y)) add('bloquant', 'decor_hors', `Un décor « ${d.type} » est hors de la carte`, d.x, d.y, { op: 'supprimer', uid: d.uid });
    else {
      const t = world.tiles[d.y * W + d.x];
      if ((t === T.DEEP || t === T.VOID) && !WATER_PROPS.has(d.type)) add('avertissement', 'flotte', `Le décor « ${d.type} » est posé sur ${t === T.VOID ? 'le vide' : 'la mer profonde'}`, d.x, d.y, null);
    }
  }
  if (world.studio) for (const e of world.studio.ecartes) if (e.quoi === 'retouche') add('avertissement', 'retouche', e.raison, e.x, e.y, null);
  // les chevauchements de décors solides ajoutés
  const cellOwner = new Map();
  for (const p of world.props) if (p.cellsStudio) for (const [x, y] of p.cellsStudio) { const k = key(x, y); if (cellOwner.has(k) && cellOwner.get(k) !== p) add('avertissement', 'superpose', `Deux décors solides se chevauchent (« ${cellOwner.get(k).type} » et « ${p.type} »)`, x, y, null); else cellOwner.set(k, p); }
  // personne et rien d'important n'est muré par le document ; la correction : retirer le décor ajouté qui bouche, sinon libérer la case
  const culprit = (x, y) => { for (const p of world.props) if (p.cellsStudio && p.cellsStudio.some(([cx, cy]) => Math.abs(cx - x) <= 1 && Math.abs(cy - y) <= 1)) return p; return null; };
  const fixAt = (x, y) => { const p = culprit(x, y); return p ? { op: 'supprimer', uid: p.studio } : { op: 'liberer', x, y }; };
  const near = (px, py) => [[0, 0], [0, 6], [6, 0], [-6, 0], [0, -6], [0, 12]].some(([dx, dy]) => canStand(world, px + dx, py + dy));
  for (const d of world.doors) {
    if (d.kind === 'underwater' || d.dive || d.studio) continue; // (les portes de LStudio : vérifiées plus bas)
    const x = Math.floor(d.ox / 16), y = Math.floor(d.oy / 16);
    if (!near(d.ox, d.oy + 4) && touched(doc, x, y)) add('bloquant', 'porte_muree', `L’entrée « ${d.name || 'porte ' + d.id} » est bouchée`, x, y, fixAt(x, y + 1));
  }
  for (const n of world.npcs) { const x = Math.floor(n.x / 16), y = Math.floor(n.y / 16); if (!n.hidden && !near(n.x, n.y) && touched(doc, x, y)) add('bloquant', 'pnj_mure', `Le personnage « ${n.id} » est muré`, x, y, fixAt(x, y)); }
  // un coffre s'ouvre depuis l'une des quatre cases qui le touchent (celle du dessous, ou à côté s'il est contre un mur)
  const reachable = (tx, ty) => [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => canStand(world, (tx + dx) * 16 + 8, (ty + dy) * 16 + 10));
  for (const c of world.chests) if (!reachable(c.tx, c.ty) && touched(doc, c.tx, c.ty)) add('avertissement', 'coffre_mure', 'Un coffre n’est plus accessible', c.tx, c.ty, fixAt(c.tx, c.ty + 1));
  for (const s of world.spawnPoints || []) { const x = Math.floor(s.x / 16), y = Math.floor(s.y / 16); if (!canStand(world, s.x, s.y) && touched(doc, x, y)) add('bloquant', 'arrivee_muree', 'Un point d’arrivée des pirates est bloqué', x, y, fixAt(x, y)); }
  checkStructure(world, doc, deps, add, fixAt);
  return out;
}
// lot 2 : les pièces, les portes, les zones — ce qui empêcherait d'entrer, de sortir, de passer, ou laisserait un lieu
// sans accès. Une correction est proposée quand elle est sûre (créer l'intérieur d'un bâtiment, libérer une case, retirer
// un décor qui bouche, retirer un décor mural sans mur).
function checkStructure(world, doc, deps, add, fixAt) {
  const { canStand } = deps, W = world.W, tile = (px) => Math.floor(px / 16);
  for (const e of (world.studio && world.studio.ecartes) || []) if (e.quoi === 'pièce' || e.quoi === 'porte' || e.quoi === 'zone') add('bloquant', e.quoi === 'pièce' ? 'piece_ecartee' : e.quoi === 'porte' ? 'porte_ecartee' : 'zone_ecartee', e.raison, e.x | 0, e.y | 0, e.uid ? { op: 'aller', x: e.x | 0, y: e.y | 0 } : null);
  const studioRooms = world.rooms.filter((r) => r.studio), sDoors = world.doors.filter((d) => d.studio), zones = world.studioZones || [];
  const stand = (x, y) => canStand(world, x, y) || canStand(world, x, y + 4) || canStand(world, x, y - 4);
  // les portes : on doit pouvoir s'y présenter dehors, et arriver sur le sol dedans
  for (const d of sDoors) {
    const ox = tile(d.ox), oy = tile(d.oy);
    if (!stand(d.rx, d.ry + 2)) add('bloquant', 'entree_bouchee', `L’entrée « ${d.name} » est bouchée dehors : on ne peut pas s’y présenter`, ox, oy, fixAt(ox, oy));
    if (!stand(d.ix, d.iy)) add('bloquant', 'arrivee_bouchee', `En entrant par « ${d.name} », on arrive dans un mur ou un meuble`, tile(d.ix), tile(d.iy), fixAt(tile(d.ix), tile(d.iy)));
  }
  // les zones
  for (const z of zones) {
    const zx = tile(z.x0), zy = tile(z.y0);
    let free = false; for (let y = z.y0 + 8; y < z.y1 && !free; y += 16) for (let x = z.x0 + 8; x < z.x1 && !free; x += 16) if (canStand(world, x, y)) free = true;
    if (!free) add('avertissement', 'zone_inaccessible', `On ne peut pas se tenir dans la zone « ${z.label} » (elle est dans un mur, ou sur l’eau)`, zx, zy, null);
    if (z.type === 'passage' && z.to && !stand(z.to.x, z.to.y)) add('bloquant', 'passage_bouche', `Le passage « ${z.label} » mène dans un mur ou un meuble`, tile(z.to.x), tile(z.to.y), fixAt(tile(z.to.x), tile(z.to.y)));
    if (z.type === 'message' && !String(z.text || '').trim()) add('avertissement', 'message_vide', 'Une zone de message n’a pas de texte', zx, zy, null);
  }
  // les bâtiments posés dans LStudio dont la porte dessinée ne mène nulle part
  const linked = new Set((doc.portes || []).map((d) => d.batiment).filter(Boolean));
  for (const b of doc.decors || []) if (BUILDING_PROPS.has(b.type) && b.type === 'cite' && ((b.donnees && b.donnees.door) ?? 2) >= 0 && !linked.has(b.uid)) add('avertissement', 'batiment_sans_interieur', `Le bâtiment « ${(b.donnees && b.donnees.nom) || b.nom || 'sans nom'} » a une porte qui ne mène nulle part`, b.x, b.y, { op: 'interieur', uid: b.uid });
  // les pièces : une entrée au moins, et tout leur sol accessible depuis là où l'on arrive
  for (const r of studioRooms) {
    const starts = [...world.doors.filter((d) => d.room === r.id).map((d) => [tile(d.ix), tile(d.iy)]), ...zones.filter((z) => z.to && world.roomGrid[tile(z.to.y) * W + tile(z.to.x)] === r.id).map((z) => [tile(z.to.x), tile(z.to.y)])];
    if (!starts.length) { add('avertissement', 'piece_sans_entree', `La pièce « ${r.name} » n’a aucune entrée : personne ne peut y aller`, r.x0, r.y0, { op: 'aller', x: r.x0, y: r.y0 }); continue; }
    const seen = new Uint8Array(r.w * r.h), st = [];
    for (const [x, y] of starts) { const dx = x - r.x0, dy = y - r.y0; if (dx >= 0 && dy >= 0 && dx < r.w && dy < r.h && !seen[dy * r.w + dx] && !world.solid[y * W + x]) { seen[dy * r.w + dx] = 1; st.push(dx, dy); } }
    while (st.length) { const dy = st.pop(), dx = st.pop(); for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = dx + ax, ny = dy + ay; if (nx < 0 || ny < 0 || nx >= r.w || ny >= r.h || seen[ny * r.w + nx]) continue; if (world.solid[(r.y0 + ny) * W + r.x0 + nx]) continue; seen[ny * r.w + nx] = 1; st.push(nx, ny); } }
    let lost = 0, first = null;
    for (let dy = 0; dy < r.h; dy++) for (let dx = 0; dx < r.w; dx++) if (!seen[dy * r.w + dx] && !world.solid[(r.y0 + dy) * W + r.x0 + dx]) { lost++; if (!first) first = [r.x0 + dx, r.y0 + dy]; }
    if (lost) add('avertissement', 'piece_inaccessible', `${lost} case(s) de « ${r.name} » sont inaccessibles depuis l’entrée (murées par un mur ou des meubles)`, first[0], first[1], null);
  }
  // le décor accroché à un mur qui n'existe pas
  for (const pc of doc.pieces || []) for (const m of pc.deco || []) {
    const x = pc.x + m.x, y = pc.y + m.y;
    if (world.tiles[(y - 1) * W + x] !== T.IWALL) add('avertissement', 'deco_sans_mur', `Un décor mural (« ${MUR_DECORS[m.k] || m.k} ») de « ${pc.nom} » n’est accroché à aucun mur`, x, y, { op: 'retirer_deco', uid: pc.uid, x: m.x, y: m.y });
  }
}
// le document touche-t-il cette case ou ses voisines ? (pour ne signaler que ce qu'il a pu causer)
function touched(doc, x, y) {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const k = key(x + dx, y + dy); if (k in doc.sol || k in doc.collisions) return true; }
  for (const d of doc.decors || []) if (Math.abs(d.x - x) <= 6 && Math.abs(d.y - y) <= 6) return true;
  for (const r of Object.values(doc.retouches || {})) if (r.x != null && Math.abs(r.x - x) <= 6 && Math.abs(r.y - y) <= 6) return true;
  return false;
}
