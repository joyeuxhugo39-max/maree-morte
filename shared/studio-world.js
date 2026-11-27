// LStudio — la couche du monde écrite par l'éditeur, appliquée par le jeu.
// LStudio ne fabrique pas une deuxième carte : il produit un document de modifications (des sols repeints, des régions,
// des collisions, des décors ajoutés, déplacés ou retirés), que generateWorld applique EN TOUT DERNIER, après toutes
// les couches du jeu. Le même code sert à l'éditeur, au jeu (client, solo, hôte d'une partie à plusieurs) et aux tests :
// tout le monde voit le même monde. Un document vide ne change rien.
// Format : voir rapports/ls1-audit-architecture.md (« Le format du document »).
import { T } from './constants.js';

export const STUDIO_FORMAT = 'lstudio';
export const STUDIO_VERSION = 1;
export const TILE_NAMES = Object.fromEntries(Object.entries(T).map(([k, v]) => [v, k])); // 3 → 'GRASS'
const SOLID_T = new Set([T.DEEP, T.ROCK, T.LAVA, T.VOID, T.CWALL, T.IWALL]);
const isWater = (t) => t === T.WATER || t === T.DEEP;
// les décors qui vivent sur l'eau (un décor posé ailleurs sur l'eau « flotte » : le contrôle le signale)
export const WATER_PROPS = new Set(['boat', 'ship', 'wreck', 'bouee', 'lily', 'reeds', 'bitte', 'mat_epave', 'corail']);
// les décors-bâtiments : une emprise de w × h cases, posée par son coin en haut à gauche
export const BUILDING_PROPS = new Set(['cite', 'propriete']);

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
  for (const k of ['decors', 'couches', 'reperes']) if (!Array.isArray(out[k])) out[k] = e[k];
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
function studioCells(d, PROPS) {
  const w = Math.max(1, (d.donnees && d.donnees.w) || d.w || 1), h = Math.max(1, (d.donnees && d.donnees.h) || d.h || 1);
  const s = d.solide == null ? 'auto' : d.solide;
  if (Array.isArray(s)) return s.map(([dx, dy]) => [d.x + dx, d.y + dy]);
  if (s === 'aucune') return [];
  if (s === 'tout' || (s === 'auto' && BUILDING_PROPS.has(d.type))) { const out = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.push([d.x + x, d.y + y]); return out; }
  return PROPS[d.type] && PROPS[d.type].solid ? [[d.x, d.y]] : [];
}
// la position en pixels d'un décor posé par sa case (le pied du sprite, comme addProp ; un bâtiment par son coin)
export function propAnchor(d) {
  if (BUILDING_PROPS.has(d.type)) { const w = (d.donnees && d.donnees.w) || 4, h = (d.donnees && d.donnees.h) || 3; return { ox: w * 8 - 8 + (d.dx || 0), oy: h * 16 - 14 + (d.dy || 0) }; }
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
    this.tiles0 = C.tiles.slice(); this.zones0 = C.zones.slice(); this.sail0 = C.sail.slice(); this.solid0 = C.solid.slice();
    this.cover = new Uint16Array(N); this.coll = new Map(); this.nav = new Map(); this.byStudio = new Map(); this.retouched = new Map();
    for (const p of C.props) { p._cells = propCells(p, C.PROPS); for (const [x, y] of p._cells) if (C.inMap(x, y)) this.cover[y * C.W + x]++; }
    this.cover0 = this.cover.slice(); this.water = [];
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
    C.tiles[i] = t; if (C.plankDir && name != null) C.plankDir[i] = 0;
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

// ------------------------------------------------------------------ l'application d'un document entier (generateWorld, l'éditeur au chargement)
// Renvoie le monde modifiable, et un relevé : ce qui a été appliqué, et ce qui a été écarté (avec la raison).
export function applyDoc(S, doc) {
  const C = S.C, rep = { sol: 0, regions: 0, collisions: 0, navigation: 0, decors: 0, retouches: 0, ecartes: [] };
  if (!doc) return rep;
  const skip = (quoi, raison, x, y) => rep.ecartes.push({ quoi, raison, x, y });
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
  if (!doc) return { sol: 0, regions: 0, collisions: 0, navigation: 0, decors: 0, retouches: 0, ecartes: [] };
  const empty = !Object.keys(doc.sol || {}).length && !Object.keys(doc.regions || {}).length && !Object.keys(doc.collisions || {}).length && !Object.keys(doc.navigation || {}).length && !(doc.decors || []).length && !Object.keys(doc.retouches || {}).length;
  if (empty) return { sol: 0, regions: 0, collisions: 0, navigation: 0, decors: 0, retouches: 0, ecartes: [] };
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
    if (d.kind === 'underwater' || d.dive) continue;
    const x = Math.floor(d.ox / 16), y = Math.floor(d.oy / 16);
    if (!near(d.ox, d.oy + 4) && touched(doc, x, y)) add('bloquant', 'porte_muree', `L’entrée « ${d.name || 'porte ' + d.id} » est bouchée`, x, y, fixAt(x, y + 1));
  }
  for (const n of world.npcs) { const x = Math.floor(n.x / 16), y = Math.floor(n.y / 16); if (!n.hidden && !near(n.x, n.y) && touched(doc, x, y)) add('bloquant', 'pnj_mure', `Le personnage « ${n.id} » est muré`, x, y, fixAt(x, y)); }
  for (const c of world.chests) if (!near(c.x, c.y + 12) && touched(doc, c.tx, c.ty)) add('avertissement', 'coffre_mure', 'Un coffre n’est plus accessible', c.tx, c.ty, fixAt(c.tx, c.ty + 1));
  for (const s of world.spawnPoints || []) { const x = Math.floor(s.x / 16), y = Math.floor(s.y / 16); if (!canStand(world, s.x, s.y) && touched(doc, x, y)) add('bloquant', 'arrivee_muree', 'Un point d’arrivée des pirates est bloqué', x, y, fixAt(x, y)); }
  return out;
}
// le document touche-t-il cette case ou ses voisines ? (pour ne signaler que ce qu'il a pu causer)
function touched(doc, x, y) {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const k = key(x + dx, y + dy); if (k in doc.sol || k in doc.collisions) return true; }
  for (const d of doc.decors || []) if (Math.abs(d.x - x) <= 6 && Math.abs(d.y - y) <= 6) return true;
  for (const r of Object.values(doc.retouches || {})) if (r.x != null && Math.abs(r.x - x) <= 6 && Math.abs(r.y - y) <= 6) return true;
  return false;
}
