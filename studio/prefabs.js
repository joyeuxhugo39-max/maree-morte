// LStudio — vos modèles (lot 3) : enregistrer une sélection (des décors, avec ce qui est peint dessous, et les bâtiments
// avec leurs intérieurs, leurs étages et leurs meubles) pour la reposer ailleurs, autant de fois qu'on veut, dans ce monde
// ou dans un autre. Un modèle est rangé dans ce navigateur (il ne fait pas partie du monde publié) et s'exporte en fichier.
// Le reposer est une seule action de l'éditeur : un Ctrl+Z le défait entièrement.
import { key, unkey, pieceEnvelope } from '../shared/studio-world.js';
import { newUid } from './editor.js';

export const MODELE_FORMAT = 'lstudio-modele';
const clone = (o) => JSON.parse(JSON.stringify(o));
const PIECE_FIELDS = ['nom', 'w', 'h', 'genre', 'sol', 'style', 'mur', 'sortie', 'decoAuto', 'sols', 'murs', 'deco', 'ambiance', 'dehors', 'bord'];
const DECOR_FIELDS = (d) => { const o = { type: d.type, x: d.x, y: d.y, v: d.v | 0, dx: d.dx || 0, dy: d.dy || 0, plan: d.plan || 'auto', miroir: !!d.miroir, solide: d.solide || 'auto', nom: d.nom || '' }; if (d.donnees) o.donnees = clone(d.donnees); if (d.emprise) o.emprise = d.emprise.slice(); return o; };

// ---------------------------------------------------------------- enregistrer
// refs : la sélection (décors de LStudio ou du jeu) ; opts.peint : prendre aussi le sol peint et les collisions dessous
export function captureModel(ED, refs, nom, opts = {}) {
  const items = refs.map((r) => ({ r, d: ED.describe(r), p: ED.propOf(r) })).filter((q) => q.d && q.p);
  if (!items.length) return { err: 'rien à enregistrer : sélectionnez des éléments' };
  const x0 = Math.min(...items.map((q) => q.d.x)), y0 = Math.min(...items.map((q) => q.d.y));
  let x1 = 0, y1 = 0;
  const decors = items.map((q) => {
    const d = q.r.k === 'd' ? DECOR_FIELDS(q.d) : { type: q.p.type, x: q.d.x, y: q.d.y, v: q.d.v | 0, dx: q.d.dx || 0, dy: q.d.dy || 0, plan: q.d.plan || 'auto', miroir: !!q.d.miroir, solide: 'auto', nom: '' };
    if (q.r.k === 'o' && q.p.w && q.p.h && (q.p.type === 'cite')) d.donnees = { w: q.p.w, h: q.p.h, door: q.p.door, style: q.p.style, nom: q.p.name };
    const w = (d.donnees && d.donnees.w) || (d.emprise && d.emprise[0]) || 1, hh = (d.donnees && d.donnees.h) || (d.emprise && d.emprise[1]) || 1;
    x1 = Math.max(x1, d.x + w - 1); y1 = Math.max(y1, d.y + hh - 1);
    d.x -= x0; d.y -= y0; d._uid = q.r.k === 'd' ? q.r.uid : null;
    return d;
  });
  const M = { format: MODELE_FORMAT, version: 1, id: 'm' + Date.now().toString(36), nom: nom || 'Mon modèle', cree: new Date().toISOString(), w: x1 - x0 + 1, h: y1 - y0 + 1, decors, sol: {}, collisions: {}, pieces: [], portes: [], zones: [], assets: [] };
  if (opts.peint !== false) for (const k of ['sol', 'collisions']) for (const [kk, v] of Object.entries(ED.doc[k])) { const [x, y] = unkey(kk); if (x >= x0 && x <= x1 && y >= y0 && y <= y1) M[k][key(x - x0, y - y0)] = v; }
  // les bâtiments de la sélection, et les pièces où mènent leurs portes ; puis, de proche en proche, les pièces où mènent
  // les passages de ces pièces (les étages)
  const pieceIdx = new Map(), queue = [];
  const addPiece = (uid) => { if (pieceIdx.has(uid)) return pieceIdx.get(uid); const pc = ED.piece(uid); if (!pc) return -1; const k = M.pieces.length; pieceIdx.set(uid, k); const def = {}; for (const f of PIECE_FIELDS) if (pc[f] !== undefined) def[f] = clone(pc[f]); M.pieces.push({ def, decors: [], persos: [], sol: {}, collisions: {}, regions: {}, navigation: {} }); queue.push(pc); return k; };
  decors.forEach((d, bi) => { if (!d._uid) return; for (const q of ED.doc.portes) if (q.batiment === d._uid && typeof q.piece === 'string') { const k = addPiece(q.piece); if (k >= 0) M.portes.push({ bat: bi, piece: k, nom: q.nom || '', sortie: q.sortie }); } });
  const inPiece = (x, y) => { for (const [uid, k] of pieceIdx) { const pc = ED.piece(uid), E = pieceEnvelope(pc); if (x >= E.x0 && x <= E.x1 && y >= E.y0 && y <= E.y1) return { k, pc }; } return null; };
  for (let qi = 0; qi < queue.length; qi++) {
    const pc = queue[qi], C = ED.contentsOf(pc);
    for (const z of C.zones) { const Z = ED.zone(z); if (Z.vers) { const P2 = ED.pieceAt(Z.vers.x, Z.vers.y); if (P2) addPiece(P2.uid); } }
  }
  for (const [uid, k] of pieceIdx) {
    const pc = ED.piece(uid), C = ED.contentsOf(pc), P = M.pieces[k];
    for (const u of C.decors) { const d = DECOR_FIELDS(ED.decorOf.get(u)); d.x -= pc.x; d.y -= pc.y; P.decors.push(d); }
    for (const u of C.persos || []) { const c = clone(ED.perso(u)); delete c.uid; c.x -= pc.x; c.y -= pc.y; P.persos.push(c); } // 2.4 : ses personnages
    for (const kk of ['sol', 'collisions', 'regions', 'navigation']) for (const k2 of C.keys[kk]) { const [x, y] = unkey(k2); P[kk][key(x - pc.x, y - pc.y)] = ED.doc[kk][k2]; }
    for (const u of C.zones) {
      const z = clone(ED.zone(u)); delete z.uid; z.piece = k; z.x -= pc.x; z.y -= pc.y;
      if (z.vers) { const t = inPiece(z.vers.x, z.vers.y); if (t) z.vers = { piece: t.k, x: z.vers.x - t.pc.x, y: z.vers.y - t.pc.y }; else z.vers = { x: z.vers.x - x0, y: z.vers.y - y0 }; }
      M.zones.push(z);
    }
  }
  // les images dont se servent ses décors
  const used = new Set(); const look = (d) => { if (d.type === 'image' && d.donnees && d.donnees.asset) used.add(d.donnees.asset); };
  decors.forEach(look); M.pieces.forEach((P) => P.decors.forEach(look));
  M.assets = ED.doc.assets.filter((a) => used.has(a.id)).map(clone);
  for (const d of decors) delete d._uid;
  return { M };
}
// ---------------------------------------------------------------- reposer
export function placeModel(ED, M, tx, ty, couche = 'decors') {
  // les pièces sont rangées l'une après l'autre (chacune trouve sa place parmi celles déjà rangées) ; s'il en manque, rien
  // n'est gardé
  const before = ED.undoStack.length;
  ED.begin(`Modèle : ${M.nom}`);
  for (const a of M.assets || []) if (!ED.doc.assets.some((b) => b.id === a.id)) ED.set('asset', a.id, a);
  const layer = (c) => (ED.layer(c) && !ED.layer(c).origine ? c : couche);
  const batUid = [], refs = [];
  for (const d of M.decors) {
    const n = { ...clone(d), uid: newUid(), x: tx + d.x, y: ty + d.y, couche: layer(d.couche || couche), verrou: false };
    if (n.x < 0 || n.y < 0 || n.x >= ED.world.W || n.y >= ED.world.H) { batUid.push(null); continue; }
    ED.set('decor', n.uid, n); batUid.push(n.uid); refs.push({ k: 'd', uid: n.uid });
  }
  for (const k of ['sol', 'collisions']) for (const [kk, v] of Object.entries(M[k] || {})) { const [x, y] = unkey(kk); ED.set(k, key(tx + x, ty + y), v); }
  const pcs = [];
  for (const P of M.pieces || []) {
    const pc = ED.createPiece({ ...clone(P.def) });
    if (!pc) { ED.end(); if (ED.undoStack.length > before) { ED.undo(); ED.redoStack.pop(); } return { err: `plus de place libre de ${P.def.w} × ${P.def.h} cases dans la bande des intérieurs` }; } // (rien n'est gardé de ce qui avait commencé)
    ED.changePiece(pc.uid, { sols: P.def.sols || {}, murs: P.def.murs || {}, deco: P.def.deco || [] });
    pcs.push(pc);
    for (const d of P.decors) { const u = newUid(); ED.set('decor', u, { ...clone(d), uid: u, x: pc.x + d.x, y: pc.y + d.y, couche: layer(d.couche || 'decors'), verrou: false }); }
    for (const kk of ['sol', 'collisions', 'regions', 'navigation']) for (const [k2, v] of Object.entries(P[kk] || {})) { const [x, y] = unkey(k2); ED.set(kk, key(pc.x + x, pc.y + y), v); }
    for (const c of P.persos || []) { const u = newUid(); ED.set('personnage', u, { ...clone(c), uid: u, x: pc.x + c.x, y: pc.y + c.y }); }
  }
  for (const z of M.zones || []) {
    const pc = pcs[z.piece]; if (!pc) continue;
    const vers = z.vers ? (z.vers.piece != null ? (pcs[z.vers.piece] ? { x: pcs[z.vers.piece].x + z.vers.x, y: pcs[z.vers.piece].y + z.vers.y } : null) : { x: tx + z.vers.x, y: ty + z.vers.y }) : null;
    ED.addZone({ ...clone(z), x: pc.x + z.x, y: pc.y + z.y, vers });
  }
  for (const q of M.portes || []) if (batUid[q.bat] && pcs[q.piece]) ED.addPorte(pcs[q.piece].uid, { batiment: batUid[q.bat], nom: q.nom || '', sortie: q.sortie });
  ED.end();
  return { refs, pieces: pcs };
}
export function readModelFile(obj) {
  if (!obj || obj.format !== MODELE_FORMAT || !Array.isArray(obj.decors)) throw new Error('Ce fichier n’est pas un modèle LStudio.');
  if ((obj.version | 0) > 1) throw new Error('Ce modèle a été fait avec une version plus récente de LStudio.');
  return { pieces: [], portes: [], zones: [], assets: [], sol: {}, collisions: {}, ...obj, id: 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36) };
}
