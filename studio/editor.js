// LStudio — le cœur de l'éditeur : le document, le monde vivant, et chaque action réversible.
// Le monde affiché est le VRAI monde du jeu (generateWorld, sans document), auquel on applique le document avec le
// même code que le jeu (StudioWorld, shared/studio-world.js). Chaque action modifie le document et le monde ensemble,
// et s'enregistre dans l'historique : annuler, c'est réappliquer l'état d'avant, clé par clé.
import { StudioWorld, applyDoc, key, unkey, BUILDING_PROPS } from '../shared/studio-world.js';
import { inMap } from '../shared/world.js';

const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
let uidN = 0;
export const newUid = () => 'd' + Date.now().toString(36) + (uidN++).toString(36) + Math.floor(Math.random() * 1296).toString(36);
const MAPS = ['sol', 'regions', 'collisions', 'navigation'];

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
      make: (type, tx, ty, v, ox, oy, extra) => { const p = { id: this.nextId++, type, x: tx * 16 + 8 + ox, y: ty * 16 + 14 + oy, tx, ty, v, ...extra }; world.props.push(p); return p; } });
    this.report = applyDoc(this.S, doc);
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
    if (kind === 'decor') {
      const cur = this.decorOf.get(k);
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
  replay(ops, label) { const ch = { cells: [], props: [], water: false, history: true, dirty: true, label }; for (const [kind, k, v] of ops) this.write(kind, k, v, ch); if (ch.water) this.S.flushWater(); this.emit(ch); }
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
    const items = refs.map((r) => { const p = this.propOf(r), d = this.describe(r); if (!p || !d) return null; return { type: p.type, x: d.x, y: d.y, v: d.v | 0, dx: d.dx || 0, dy: d.dy || 0, plan: d.plan || 'auto', miroir: !!d.miroir, solide: d.solide || 'auto', donnees: clone(d.donnees) || (p.w && p.h && BUILDING_PROPS.has(p.type) ? { w: p.w, h: p.h, door: p.door, style: p.style, nom: p.name } : undefined), couche: d.couche || 'decors', nom: d.nom || '' }; }).filter(Boolean);
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
}
