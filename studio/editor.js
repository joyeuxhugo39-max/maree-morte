// LStudio — le cœur de l'éditeur : le document, le monde vivant, et chaque action réversible.
// Le monde affiché est le VRAI monde du jeu (generateWorld, sans document), auquel on applique le document avec le
// même code que le jeu (StudioWorld, shared/studio-world.js). Chaque action modifie le document et le monde ensemble,
// et s'enregistre dans l'historique : annuler, c'est réappliquer l'état d'avant, clé par clé.
import { StudioWorld, applyDoc, key, unkey, BUILDING_PROPS, pieceEnvelope, PIECE_MIN, PIECE_MAX_W, PIECE_MAX_H } from '../shared/studio-world.js';
import { inMap } from '../shared/world.js';
import { T, OVER_H } from '../shared/constants.js';

const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
let uidN = 0;
export const newUid = () => 'd' + Date.now().toString(36) + (uidN++).toString(36) + Math.floor(Math.random() * 1296).toString(36);
const MAPS = ['sol', 'regions', 'collisions', 'navigation'];
const STRUCT = { piece: 'pieces', porte: 'portes', zone: 'zones' }; // lot 2 : les pièces, les portes, les zones (rangées par uid)
const envCells = (pc) => { const E = pieceEnvelope(pc), out = []; for (let y = E.y0; y <= E.y1; y++) for (let x = E.x0; x <= E.x1; x++) out.push([x, y]); return out; };

export class Editor {
  constructor(world, doc, PROPS) {
    this.world = world; this.doc = doc; this.PROPS = PROPS;
    this.undoStack = []; this.redoStack = []; this.tx = null; this.listeners = []; this.version = 0;
    // l'empreinte d'origine de chaque décor du jeu (avant toute retouche) : c'est elle qu'une retouche désigne
    this.origin = new Map(world.props.map((p) => [p.id, { p, type: p.type, x: p.tx, y: p.ty, v: p.v, plan: p.plan, flip: p.flip }]));
    let max = 0; for (const p of world.props) if (p.id > max) max = p.id;
    this.nextId = max + 1;
    if (!doc.couches.some((c) => c.id === 'origine')) doc.couches.unshift({ id: 'origine', nom: 'Monde d’origine', visible: true, verrou: false, origine: true });
    this.S = new StudioWorld({ W: world.W, H: world.H, tiles: world.tiles, zones: world.zones, solid: world.solid, occ: new Uint8Array(world.W * world.H), sail: world.sail, waterDist: world.waterDist, plankDir: world.plankDir, props: world.props, PROPS, inMap,
      rooms: world.rooms, doors: world.doors, roomGrid: world.roomGrid, szones: world.studioZones || (world.studioZones = []),
      make: (type, tx, ty, v, ox, oy, extra) => { const p = { id: this.nextId++, type, x: tx * 16 + 8 + ox, y: ty * 16 + 14 + oy, tx, ty, v, ...extra }; world.props.push(p); return p; } });
    this.report = applyDoc(this.S, doc);
    this.S.origin(); if (!this.S.gridO) this.S.gridO = world.roomGrid.slice(); // pour chercher la place d'une pièce neuve
    this.decorOf = new Map(doc.decors.map((d) => [d.uid, d]));
  }
  on(fn) { this.listeners.push(fn); }
  emit(ch) { this.version++; for (const fn of this.listeners) fn(ch); }

  // ---------------------------------------------------------------- les opérations élémentaires (doc + monde)
  // une opération : [genre, clé, valeur] — genre : sol | regions | collisions | navigation | decor | retouche ; valeur undefined = absent
  read(kind, k) {
    if (MAPS.includes(kind)) return this.doc[kind][k];
    if (kind === 'decor') return clone(this.decorOf.get(k));
    if (kind === 'retouche') return clone(this.doc.retouches[k]);
    if (kind === 'couches') return clone(this.doc.couches);
    if (kind === 'meta') return clone(this.doc.meta[k]);
    if (kind === 'reperes') return clone(this.doc.reperes);
    if (STRUCT[kind]) return clone(this.doc[STRUCT[kind]].find((o) => o.uid === k));
    if (kind === 'asset') return clone(this.doc.assets.find((a) => a.id === k));
  }
  write(kind, k, v, ch) {
    const S = this.S;
    if (MAPS.includes(kind)) {
      if (v === undefined) delete this.doc[kind][k]; else this.doc[kind][k] = v;
      const [x, y] = unkey(k), val = v === undefined ? null : v;
      if (kind === 'sol') S.setTile(x, y, val); else if (kind === 'regions') S.setZone(x, y, val); else if (kind === 'collisions') S.setColl(x, y, val); else S.setNav(x, y, val);
      ch.cells.push([x, y]); if (kind === 'sol') ch.water = true;
      return;
    }
    if (STRUCT[kind]) { // une pièce, une porte, une zone : on rebâtit la structure (comme le jeu, dans l'ordre du document)
      const arr = this.doc[STRUCT[kind]], i = arr.findIndex((o) => o.uid === k), old = i >= 0 ? arr[i] : null;
      const before = new Set(this.S.pieceRooms.keys());
      if (v === undefined) { if (i >= 0) arr.splice(i, 1); } else if (i >= 0) arr[i] = clone(v); else arr.push(clone(v));
      this.S.setStructure(this.doc);
      // les cases à repeindre : l'ancienne et la nouvelle enveloppe, et celles des pièces devenues valides ou écartées
      const touch = (pc) => { if (pc && pc.w && pc.h) ch.cells.push(...envCells(pc)); };
      if (kind === 'piece') { touch(old); touch(v); }
      if (kind === 'porte') for (const d of [old, v]) if (d && typeof d.piece === 'string') touch(this.doc.pieces.find((q) => q.uid === d.piece));
      const after = new Set(this.S.pieceRooms.keys());
      for (const pc of this.doc.pieces) if (before.has(pc.uid) !== after.has(pc.uid)) touch(pc);
      ch.structure = true;
      return;
    }
    if (kind === 'asset') { // 2.3 : une image importée (son dessin ; l'élément du jeu qu'elle habille)
      const arr = this.doc.assets, i = arr.findIndex((a) => a.id === k), old = i >= 0 ? arr[i] : null;
      if (v === undefined) { if (i >= 0) arr.splice(i, 1); } else if (i >= 0) arr[i] = clone(v); else arr.push(clone(v));
      ch.assets = true; (ch.assetIds || (ch.assetIds = new Set())).add(k); ch.assetTypes = ch.assetTypes || new Set();
      for (const a of [old, v]) if (a && a.remplace) ch.assetTypes.add(a.remplace);
      return;
    }
    if (kind === 'decor') {
      const cur = this.decorOf.get(k);
      if (this.doc.portes.some((d) => d.batiment === k)) ch.doorsAfter = true; // une porte liée à ce bâtiment le suit
      if (v === undefined) { if (cur) { const p = S.byStudio.get(k); if (p) ch.props.push(p); S.removeDecor(k); this.doc.decors.splice(this.doc.decors.indexOf(cur), 1); this.decorOf.delete(k); } return; }
      if (cur) { const p0 = S.byStudio.get(k); if (p0) ch.cells.push(...(p0._cells || []), [p0.tx, p0.ty]); for (const f of Object.keys(cur)) if (!(f in v)) delete cur[f]; Object.assign(cur, clone(v)); const p = S.updateDecor(cur); ch.props.push(p); ch.cells.push(...(p._cells || [])); }
      else { const d = clone(v); this.doc.decors.push(d); this.decorOf.set(k, d); const p = S.addDecor(d); ch.props.push(p); ch.cells.push(...(p._cells || [])); }
      return;
    }
    if (kind === 'retouche') {
      const O = this.origin.get(+k); if (!O) return;
      const p = O.p; ch.cells.push(...(p._cells || []), [p.tx, p.ty]);
      if (v === undefined) { delete this.doc.retouches[k]; S.unretouch(+k); } else { this.doc.retouches[k] = clone(v); S.retouch(p, v); }
      ch.cells.push(...(p._cells || [])); ch.props.push(p);
      return;
    }
    if (kind === 'couches') { this.doc.couches = clone(v); ch.layers = true; return; }
    if (kind === 'meta') { this.doc.meta[k] = clone(v); return; }
    if (kind === 'reperes') { this.doc.reperes = clone(v); ch.reperes = true; }
  }
  // ---------------------------------------------------------------- les commandes (annulables)
  begin(label) { if (!this.tx) this.tx = { label, before: new Map(), after: new Map() }; this.txDepth = (this.txDepth || 0) + 1; }
  set(kind, k, v) { // la seule façon de modifier le monde : notée dans l'historique
    const id = kind + '|' + k, ch = { cells: [], props: [], water: false };
    const own = !this.tx; if (own) this.begin('Modification');
    if (!this.tx.before.has(id)) this.tx.before.set(id, [kind, k, this.read(kind, k)]);
    this.tx.after.set(id, [kind, k, clone(v)]);
    this.write(kind, k, v, ch);
    if (ch.water) this.S.flushWater();
    if (ch.doorsAfter) { this.S.setStructure(this.doc); ch.structure = true; }
    this.emit(ch);
    if (own) this.end();
  }
  end() {
    if (--this.txDepth > 0 || !this.tx) return;
    const t = this.tx; this.tx = null; this.txDepth = 0;
    const changed = [...t.after.keys()].some((id) => JSON.stringify(t.before.get(id)[2]) !== JSON.stringify(t.after.get(id)[2]));
    if (!changed) return;
    this.undoStack.push({ label: t.label, before: [...t.before.values()], after: [...t.after.values()] });
    if (this.undoStack.length > 1000) this.undoStack.shift();
    this.redoStack.length = 0; this.emit({ cells: [], props: [], history: true, dirty: true });
  }
  replay(ops, label) { const ch = { cells: [], props: [], water: false, history: true, dirty: true, label }; for (const [kind, k, v] of ops) this.write(kind, k, v, ch); if (ch.water) this.S.flushWater(); if (ch.doorsAfter) { this.S.setStructure(this.doc); ch.structure = true; } this.emit(ch); }
  undo() { const c = this.undoStack.pop(); if (!c) return null; this.replay(c.before, c.label); this.redoStack.push(c); return c.label; }
  redo() { const c = this.redoStack.pop(); if (!c) return null; this.replay(c.after, c.label); this.undoStack.push(c); return c.label; }

  // ---------------------------------------------------------------- ce que l'interface demande
  layer(id) { return this.doc.couches.find((c) => c.id === id); }
  propOf(ref) { return ref.k === 'd' ? this.S.byStudio.get(ref.uid) : this.origin.get(ref.id) && this.origin.get(ref.id).p; }
  refOf(p) { return p.studio ? { k: 'd', uid: p.studio } : { k: 'o', id: p.id }; }
  layerOfProp(p) { return p.studio ? (this.decorOf.get(p.studio) || {}).couche || 'decors' : 'origine'; }
  locked(p) { if (p.studio) { const d = this.decorOf.get(p.studio); if (d && d.verrou) return true; } const L = this.layer(this.layerOfProp(p)); return !!(L && L.verrou); }
  visible(p) { const L = this.layer(this.layerOfProp(p)); return !L || L.visible !== false; }
  isRemoved(id) { const r = this.doc.retouches[id]; return !!(r && r.retire); }
  // poser un décor neuf
  placeDecor(type, x, y, opts = {}) {
    const d = { uid: newUid(), type, x, y, v: opts.v | 0, dx: 0, dy: 0, plan: 'auto', miroir: false, solide: 'auto', couche: opts.couche || 'decors', verrou: false, nom: '' };
    if (BUILDING_PROPS.has(type)) d.donnees = { w: 5, h: 4, door: 2, style: 'maison', nom: '' };
    if (opts.donnees) d.donnees = { ...d.donnees, ...opts.donnees };
    if (opts.emprise) d.emprise = opts.emprise.slice(0, 2); // un meuble de plusieurs cases, posé par son coin
    if (opts.solide != null) d.solide = opts.solide;
    if (opts.plan) d.plan = opts.plan;
    this.set('decor', d.uid, d);
    return d;
  }
  // l'état d'un élément, sous forme de description modifiable (décor neuf, ou retouche d'un décor d'origine)
  describe(ref) {
    if (ref.k === 'd') return clone(this.decorOf.get(ref.uid));
    const O = this.origin.get(ref.id); if (!O) return null;
    const r = this.doc.retouches[ref.id] || {};
    return { ref: { type: O.type, x: O.x, y: O.y }, x: r.x != null ? r.x : O.x, y: r.y != null ? r.y : O.y, dx: r.dx || 0, dy: r.dy || 0, v: r.v != null ? r.v : O.v, plan: r.plan || 'auto', miroir: r.miroir != null ? r.miroir : !!O.flip, retire: !!r.retire, type: O.type };
  }
  // changer un élément (champ → valeur) ; pour un décor d'origine, c'est une retouche (avec son empreinte)
  change(ref, fields) {
    if (ref.k === 'd') { const d = this.describe(ref); if (!d) return; for (const [f, v] of Object.entries(fields)) { if (f.startsWith('donnees.')) { d.donnees = { ...(d.donnees || {}), [f.slice(8)]: v }; } else d[f] = v; } this.set('decor', ref.uid, d); return; }
    const O = this.origin.get(ref.id); if (!O) return;
    const r = { ...(this.doc.retouches[ref.id] || {}), ref: { type: O.type, x: O.x, y: O.y }, ...fields };
    // une retouche qui ne change plus rien disparaît (le décor redevient celui d'origine)
    const same = !r.retire && (r.x == null || r.x === O.x) && (r.y == null || r.y === O.y) && !r.dx && !r.dy && (r.v == null || r.v === O.v) && (!r.plan || r.plan === 'auto') && (r.miroir == null || r.miroir === !!O.flip);
    this.set('retouche', String(ref.id), same ? undefined : r);
  }
  remove(refs) { this.begin('Supprimer'); for (const ref of refs) { if (ref.k === 'd') this.set('decor', ref.uid, undefined); else this.change(ref, { retire: true }); } this.end(); }
  move(refs, dxT, dyT, dxP = 0, dyP = 0) {
    this.begin('Déplacer');
    for (const ref of refs) {
      const d = this.describe(ref); if (!d) continue;
      let px = (d.dx || 0) + dxP, py = (d.dy || 0) + dyP, x = d.x + dxT, y = d.y + dyT;
      while (px > 8) { px -= 16; x++; } while (px < -8) { px += 16; x--; } while (py > 8) { py -= 16; y++; } while (py < -8) { py += 16; y--; }
      if (!inMap(x, y)) continue;
      this.change(ref, { x, y, dx: px, dy: py });
    }
    this.end();
  }
  // copier : des descriptions relatives au premier élément ; coller : des décors neufs
  copy(refs) {
    const items = refs.map((r) => { const p = this.propOf(r), d = this.describe(r); if (!p || !d) return null; return { type: p.type, x: d.x, y: d.y, v: d.v | 0, dx: d.dx || 0, dy: d.dy || 0, plan: d.plan || 'auto', miroir: !!d.miroir, solide: d.solide || 'auto', donnees: clone(d.donnees) || (p.w && p.h && BUILDING_PROPS.has(p.type) ? { w: p.w, h: p.h, door: p.door, style: p.style, nom: p.name } : undefined), couche: d.couche || 'decors', nom: d.nom || '', ...(d.emprise ? { emprise: d.emprise.slice() } : {}) }; }).filter(Boolean);
    if (!items.length) return null;
    const x0 = Math.min(...items.map((i) => i.x)), y0 = Math.min(...items.map((i) => i.y));
    return items.map((i) => ({ ...i, x: i.x - x0, y: i.y - y0 }));
  }
  paste(items, x, y, couche) {
    const out = []; this.begin('Coller');
    for (const i of items) { if (!this.PROPS[i.type] || !inMap(x + i.x, y + i.y)) continue; const d = { ...clone(i), uid: newUid(), x: x + i.x, y: y + i.y, couche: this.layer(i.couche) ? i.couche : couche || 'decors', verrou: false }; if (d.donnees === undefined) delete d.donnees; this.set('decor', d.uid, d); out.push({ k: 'd', uid: d.uid }); }
    this.end(); return out;
  }
  // peindre des cases (sol, régions, collisions, navigation) ; value undefined : effacer la peinture (revenir à l'origine)
  paint(kind, cells, value) { for (const [x, y] of cells) if (inMap(x, y)) { const k = key(x, y); if (this.doc[kind][k] !== value) this.set(kind, k, value); } }

  // ---------------------------------------------------------------- lot 2 : les pièces, les portes, les zones
  piece(uid) { return this.doc.pieces.find((p) => p.uid === uid); }
  porte(uid) { return this.doc.portes.find((p) => p.uid === uid); }
  zone(uid) { return this.doc.zones.find((p) => p.uid === uid); }
  roomAt(x, y) { if (!inMap(x, y)) return null; const id = this.world.roomGrid[y * this.world.W + x]; return id >= 0 ? this.world.rooms[id] : null; }
  pieceAt(x, y) { const r = this.roomAt(x, y); return r && r.studio ? this.piece(r.studio) : null; }
  // la place d'une pièce : son enveloppe ne touche que du vide d'origine, et aucune autre pièce (sauf elle-même)
  canPut(pc, except = null) {
    const S = this.S, W = this.world.W, E = pieceEnvelope(pc);
    if (!(pc.w >= PIECE_MIN && pc.h >= PIECE_MIN && pc.w <= PIECE_MAX_W && pc.h <= PIECE_MAX_H)) return `dimensions impossibles (de ${PIECE_MIN} × ${PIECE_MIN} à ${PIECE_MAX_W} × ${PIECE_MAX_H} cases)`;
    if (E.y0 < OVER_H + 1 || E.x0 < 1 || E.x1 > W - 2 || E.y1 > this.world.H - 2) return 'hors de la bande des intérieurs';
    for (let y = E.y0; y <= E.y1; y++) for (let x = E.x0; x <= E.x1; x++) {
      const i = y * W + x;
      if (S.tilesO[i] !== T.VOID || S.gridO[i] >= 0) return 'il y a là une pièce du jeu';
      if (S.carved.has(i)) { const r = this.world.rooms[this.world.roomGrid[i]]; if (!r || r.studio !== except) return 'il y a là une autre pièce'; }
    }
    return null;
  }
  // une place libre pour une pièce neuve de w × h : dans la bande des intérieurs, avec une case de vide tout autour ;
  // d'abord dans la partie de la bande que le jeu n'agrandit plus (à l'ouest de la colonne 640)
  freeSpot(w, h) {
    const S = this.S, W = this.world.W, H = this.world.H, y0 = OVER_H + 1, BH = H - 1 - y0;
    const P = new Int32Array((W + 1) * (BH + 1)); // les sommes cumulées des cases occupées : un rectangle se teste d'un coup
    for (let y = 0; y < BH; y++) for (let x = 0; x < W; x++) { const i = (y + y0) * W + x, b = S.tilesO[i] !== T.VOID || S.gridO[i] >= 0 || S.carved.has(i) || x < 1 || x >= W - 1 ? 1 : 0; P[(y + 1) * (W + 1) + x + 1] = b + P[y * (W + 1) + x + 1] + P[(y + 1) * (W + 1) + x] - P[y * (W + 1) + x]; }
    const busy = (x0, yy0, x1, yy1) => P[(yy1 + 1) * (W + 1) + x1 + 1] - P[yy0 * (W + 1) + x1 + 1] - P[(yy1 + 1) * (W + 1) + x0] + P[yy0 * (W + 1) + x0];
    const ew = w + 4, eh = h + 5; // l'enveloppe (w + 2, h + 3) et une case de vide autour
    for (const [xa, xb] of [[1, 640], [1, W - 1]]) for (let y = 0; y + eh <= BH; y++) for (let x = xa; x + ew <= xb; x++) if (!busy(x, y, x + ew - 1, y + eh - 1)) return [x + 2, y + y0 + 3];
    return null;
  }
  createPiece(o = {}) {
    const w = Math.max(PIECE_MIN, Math.min(PIECE_MAX_W, o.w | 0 || 12)), h = Math.max(PIECE_MIN, Math.min(PIECE_MAX_H, o.h | 0 || 8)), at = o.x != null ? [o.x, o.y] : this.freeSpot(w, h);
    if (!at) return null;
    const pc = { uid: newUid(), nom: o.nom || 'Nouvelle pièce', x: at[0], y: at[1], w, h, genre: o.genre || 'house', sol: o.sol || 'FLOOR', style: o.style | 0, mur: o.mur || '', sortie: o.sortie != null ? o.sortie : w >> 1, decoAuto: o.decoAuto !== false, sols: {}, murs: {}, deco: [] };
    if (o.ambiance) pc.ambiance = o.ambiance; if (o.dehors) pc.dehors = true; if (o.bord) pc.bord = o.bord;
    if (this.canPut(pc)) return null;
    this.set('piece', pc.uid, pc);
    return pc;
  }
  changePiece(uid, f) { const pc = this.piece(uid); if (!pc) return; const n = { ...clone(pc), ...clone(f) }; n.sortie = n.sortie < 0 ? -1 : Math.max(0, Math.min(n.w - 1, n.sortie | 0)); this.set('piece', uid, n); }
  // ce qu'il y a dans une pièce : les décors, les zones, les cases peintes (pour la déplacer ou la supprimer avec)
  contentsOf(pc) {
    const E = pieceEnvelope(pc), inE = (x, y) => x >= E.x0 && x <= E.x1 && y >= E.y0 && y <= E.y1;
    const keys = {}; for (const k of MAPS) keys[k] = Object.keys(this.doc[k]).filter((kk) => { const [x, y] = unkey(kk); return inE(x, y); });
    return { decors: this.doc.decors.filter((d) => inE(d.x, d.y)).map((d) => d.uid), zones: this.doc.zones.filter((z) => inE(z.x, z.y)).map((z) => z.uid), arrivals: this.doc.zones.filter((z) => z.vers && inE(z.vers.x, z.vers.y)).map((z) => z.uid), keys, inE };
  }
  movePiece(uid, nx, ny) {
    const pc = this.piece(uid); if (!pc) return 'pièce introuvable';
    const dx = nx - pc.x, dy = ny - pc.y; if (!dx && !dy) return null;
    const why = this.canPut({ ...pc, x: nx, y: ny }, uid); if (why) return why;
    const C = this.contentsOf(pc);
    this.begin('Déplacer la pièce');
    for (const u of C.decors) { const d = this.decorOf.get(u); this.change({ k: 'd', uid: u }, { x: d.x + dx, y: d.y + dy }); }
    for (const u of C.zones) { const z = clone(this.zone(u)); z.x += dx; z.y += dy; if (z.vers && C.inE(z.vers.x, z.vers.y)) z.vers = { x: z.vers.x + dx, y: z.vers.y + dy }; this.set('zone', u, z); }
    for (const u of C.arrivals) if (!C.zones.includes(u)) { const z = clone(this.zone(u)); z.vers = { x: z.vers.x + dx, y: z.vers.y + dy }; this.set('zone', u, z); }
    for (const k of MAPS) { const vals = C.keys[k].map((kk) => [kk, this.doc[k][kk]]); for (const [kk] of vals) this.set(k, kk, undefined); for (const [kk, v] of vals) { const [x, y] = unkey(kk); this.set(k, key(x + dx, y + dy), v); } }
    this.changePiece(uid, { x: nx, y: ny });
    this.end(); return null;
  }
  resizePiece(uid, w, h) { const pc = this.piece(uid); if (!pc) return 'pièce introuvable'; const why = this.canPut({ ...pc, w, h }, uid); if (why) return why; this.changePiece(uid, { w, h }); return null; }
  removePiece(uid, withContents = true) {
    const pc = this.piece(uid); if (!pc) return;
    const C = this.contentsOf(pc);
    this.begin('Supprimer la pièce');
    for (const d of this.doc.portes.filter((q) => q.piece === uid)) this.set('porte', d.uid, undefined);
    if (withContents) {
      for (const u of C.decors) this.set('decor', u, undefined);
      for (const u of C.zones) this.set('zone', u, undefined);
      for (const k of MAPS) for (const kk of C.keys[k]) this.set(k, kk, undefined);
    }
    this.set('piece', uid, undefined);
    this.end();
  }
  addPorte(piece, at) { const d = { uid: newUid(), piece, nom: at.nom || '', x: at.x | 0, y: at.y | 0, batiment: at.batiment || null }; if (at.sortie != null) d.sortie = at.sortie; this.set('porte', d.uid, d); return d; }
  changePorte(uid, f) { const d = this.porte(uid); if (d) this.set('porte', uid, { ...clone(d), ...clone(f) }); }
  addZone(o) { const z = { uid: newUid(), type: o.type || 'message', nom: o.nom || '', x: o.x, y: o.y, w: Math.max(1, o.w | 0), h: Math.max(1, o.h | 0), bouton: o.bouton || '', titre: o.titre || '', texte: o.texte || '', auto: !!o.auto, vers: o.vers || null }; this.set('zone', z.uid, z); return z; }
  changeZone(uid, f) { const z = this.zone(uid); if (z) this.set('zone', uid, { ...clone(z), ...clone(f) }); }
  // le décor accroché aux murs d'une pièce : (x, y) est la case de sol sous le mur (relative à la pièce)
  murDecoAt(pc, x, y) { return (pc.deco || []).findIndex((m) => m.y === y && x >= m.x && x < m.x + (m.n || 1)); }
  addMurDeco(uid, m) { const pc = this.piece(uid); if (!pc) return; const L = (pc.deco || []).filter((q) => !(q.y === m.y && q.x < m.x + m.n && m.x < q.x + (q.n || 1))); L.push(m); this.changePiece(uid, { deco: L }); }
  removeMurDeco(uid, x, y) { const pc = this.piece(uid); if (!pc) return false; const k = this.murDecoAt(pc, x, y); if (k < 0) return false; const L = pc.deco.slice(); L.splice(k, 1); this.changePiece(uid, { deco: L }); return true; }
  // peindre le style de sol ou de mur, case par case, dans les pièces de LStudio (value null : celui de la pièce)
  paintStyle(field, cells, value) {
    const by = new Map();
    for (const [x, y] of cells) { const pc = this.pieceAt(x, y); if (!pc) continue; const dx = x - pc.x, dy = y - pc.y; if (dx < 0 || dy < 0 || dx >= pc.w || dy >= pc.h) continue; if (!by.has(pc.uid)) by.set(pc.uid, { ...(pc[field] || {}) }); const M = by.get(pc.uid); if (value == null) delete M[key(dx, dy)]; else M[key(dx, dy)] = value; }
    for (const [uid, M] of by) if (JSON.stringify(M) !== JSON.stringify(this.piece(uid)[field] || {})) this.changePiece(uid, { [field]: M });
    return by.size;
  }
}
