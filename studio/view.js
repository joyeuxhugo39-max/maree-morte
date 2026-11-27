// LStudio — la vue de la carte. Le sol est celui du jeu (client/render/terrain.js, par blocs de 16 × 16 cases, mis en
// cache) ; les décors sont les sprites du jeu, triés en profondeur comme en jeu. De loin, une carte réduite (une case =
// un point) remplace les blocs : on peut parcourir les 960 × 560 cases sans ralentir.
import { CHUNK_PX, MINI_COL } from '../client/render/terrain.js';
import { citeSprite, proprieteSprite } from '../client/render/sprites-cite.js';
import { mirrorSpr } from '../client/render/renderer.js';
import { envKey } from '../client/render/studio-assets.js';
import { humanSheet, FW, FH } from '../client/render/sprites-chars.js';
import { NPCS } from '../shared/data/npcs.js';
import { T } from '../shared/constants.js';
import { PROPS } from '../shared/world.js';

const ZOOMS = [0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
// les couleurs des régions (une par numéro, stable)
export const zoneColor = (z) => `hsl(${(z * 47) % 360} 70% 55%)`;

export class MapView {
  constructor(canvas, editor, renderer) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.ed = editor; this.R = renderer; this.world = editor.world;
    this.cam = { x: 150 * 16, y: 96 * 16, z: 1 }; // Port-Lanterne
    this.show = { grille: true, collisions: false, regions: false, navigation: false, portes: true, pnj: true, pieces: true, zones: true };
    this.struct = null; this.bhover = null; this.zrect = null; this.pghost = null; // lot 2 : la structure sélectionnée, ce que vise l'outil Bâtir
    this.sel = []; this.hover = null; this.ghost = null; this.marquee = null; this.brush = null;
    this.buckets = new Map(); this.reindex();
    this.mini = this.buildMini(); this.dirty = true; this.pending = 0;
    this.waterPat = null; this.npcSpr = new Map(); this.alpha = new WeakMap();
    editor.on((ch) => this.onChange(ch));
    const loop = () => { if (this.dirty || this.pending) this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  // ---------------------------------------------------------------- les décors, rangés par bloc (pour ne dessiner que ce qui se voit)
  bkey(p) { return Math.floor(p.x / CHUNK_PX) + Math.floor(p.y / CHUNK_PX) * 1000; }
  reindex() { this.buckets.clear(); for (const p of this.world.props) { if (p.spr && p._sk == null) p._sk = this.skey(p); this.addB(p); } } // les décors d'origine gardent le sprite choisi par le jeu
  addB(p) { const k = this.bkey(p); p._bk = k; if (!this.buckets.has(k)) this.buckets.set(k, new Set()); this.buckets.get(k).add(p); }
  delB(p) { const b = this.buckets.get(p._bk); if (b) b.delete(p); }
  skey(p) { return `${p.type}|${p.asset || ''}|${p.v}|${p.flip == null ? '' : p.flip ? 1 : 0}|${p.w || ''}|${p.h || ''}|${p.door ?? ''}|${p.style || ''}|${p.plan || ''}`; }
  spr(p) {
    const sk = this.skey(p);
    if (p._sk !== sk || !p.spr) {
      p.ground = p.plan === 'sol' || (!p.plan && !!(PROPS[p.type] && PROPS[p.type].ground)); p.over = p.plan === 'dessus' || (!p.plan && !!(PROPS[p.type] && PROPS[p.type].over));
      let s = p.type === 'cite' ? citeSprite(p) : p.type === 'propriete' ? proprieteSprite(p, this.R.env) : (() => { const L = this.R.env[envKey(p)]; return L && L.length ? L[(p.v | 0) % L.length] : null; })();
      if (s && p.flip) s = mirrorSpr(s);
      p.spr = s; p._sk = sk;
    }
    return p.spr;
  }
  // 2.3 : une image a changé (importée, remplacée, habillant un élément) : les décors concernés reprennent leur sprite
  refreshSprites(types, assetIds) { for (const p of this.world.props) if ((p.type === 'image' && assetIds.has(p.asset)) || types.has(p.type)) { p._sk = null; p.spr = null; this.alpha = new WeakMap(); } this.dirty = true; }
  onChange(ch) {
    if (ch.structure) this.npcSpr.clear(); // (un personnage de LStudio a pu changer d'apparence)
    if (ch.props) for (const p of ch.props) { this.delB(p); if (this.world.props.includes(p)) this.addB(p); }
    if (ch.cells && ch.cells.length) {
      const seen = new Set();
      for (const [x, y] of ch.cells) {
        const cx = Math.floor(x / 16), cy = Math.floor(y / 16);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = cx + dx + (cy + dy) * 1000; if (!seen.has(k)) { seen.add(k); this.R.terrain.cache.delete(k); } } // le sol se raccorde à ses voisins : on repeint les blocs autour
        this.miniPix(x, y);
      }
    }
    this.dirty = true;
  }
  // ---------------------------------------------------------------- la carte réduite
  buildMini() {
    const W = this.world, cv = document.createElement('canvas'); cv.width = W.W; cv.height = W.H;
    const x = cv.getContext('2d'), img = x.createImageData(W.W, W.H);
    for (let i = 0; i < W.W * W.H; i++) { const c = MINI_COL[W.tiles[i]] ?? 0x000000; img.data[i * 4] = c >> 16; img.data[i * 4 + 1] = (c >> 8) & 255; img.data[i * 4 + 2] = c & 255; img.data[i * 4 + 3] = 255; }
    x.putImageData(img, 0, 0); this.miniCtx = x; return cv;
  }
  miniPix(tx, ty) { const c = MINI_COL[this.world.tiles[ty * this.world.W + tx]] ?? 0; this.miniCtx.fillStyle = '#' + c.toString(16).padStart(6, '0'); this.miniCtx.fillRect(tx, ty, 1, 1); }
  // ---------------------------------------------------------------- la caméra
  resize() { const r = this.cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; this.cv.width = Math.round(r.width * d); this.cv.height = Math.round(r.height * d); this.dpr = d; this.dirty = true; }
  toWorld(sx, sy) { const z = this.cam.z * this.dpr; return [(sx * this.dpr - this.cv.width / 2) / z + this.cam.x, (sy * this.dpr - this.cv.height / 2) / z + this.cam.y]; }
  zoomAt(sx, sy, dir) {
    const [wx, wy] = this.toWorld(sx, sy);
    let i = ZOOMS.findIndex((z) => z >= this.cam.z - 1e-6); if (i < 0) i = ZOOMS.length - 1;
    i = Math.max(0, Math.min(ZOOMS.length - 1, i + dir)); this.cam.z = ZOOMS[i];
    const [wx2, wy2] = this.toWorld(sx, sy); this.cam.x += wx - wx2; this.cam.y += wy - wy2; this.clamp(); this.dirty = true;
  }
  goTo(tx, ty, z) { this.cam.x = tx * 16 + 8; this.cam.y = ty * 16 + 8; if (z) this.cam.z = z; this.clamp(); this.dirty = true; }
  clamp() { const W = this.world; this.cam.x = Math.max(0, Math.min(W.W * 16, this.cam.x)); this.cam.y = Math.max(0, Math.min(W.H * 16, this.cam.y)); }
  // ---------------------------------------------------------------- le dessin
  draw() {
    const ctx = this.ctx, W = this.world, cw = this.cv.width, chh = this.cv.height, z = this.cam.z * this.dpr;
    this.dirty = false; this.pending = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b1420'; ctx.fillRect(0, 0, cw, chh);
    const x0 = this.cam.x - cw / 2 / z, y0 = this.cam.y - chh / 2 / z, x1 = this.cam.x + cw / 2 / z, y1 = this.cam.y + chh / 2 / z;
    ctx.setTransform(z, 0, 0, z, -x0 * z, -y0 * z);
    const far = this.cam.z < 0.5;
    if (far) { ctx.drawImage(this.mini, 0, 0, W.W * 16, W.H * 16); }
    else {
      if (!this.waterPat) this.waterPat = ctx.createPattern(this.R.water.base, 'repeat');
      ctx.fillStyle = this.waterPat; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      let budget = 6; // au plus six blocs neufs par image : le reste vient aux images suivantes (la carte réduite les remplace en attendant)
      const c0x = Math.max(0, Math.floor(x0 / CHUNK_PX)), c1x = Math.min(Math.ceil(W.W / 16) - 1, Math.floor(x1 / CHUNK_PX)), c0y = Math.max(0, Math.floor(y0 / CHUNK_PX)), c1y = Math.min(Math.ceil(W.H / 16) - 1, Math.floor(y1 / CHUNK_PX));
      for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
        if (this.R.terrain.has(cx, cy) || budget-- > 0) ctx.drawImage(this.R.terrain.get(cx, cy), cx * CHUNK_PX, cy * CHUNK_PX);
        else { ctx.drawImage(this.mini, cx * 16, cy * 16, 16, 16, cx * CHUNK_PX, cy * CHUNK_PX, CHUNK_PX, CHUNK_PX); this.pending++; }
      }
      // les décors
      const list = [];
      for (let cy = Math.floor(y0 / CHUNK_PX) - 1; cy <= Math.floor(y1 / CHUNK_PX) + 2; cy++) for (let cx = Math.floor(x0 / CHUNK_PX) - 2; cx <= Math.floor(x1 / CHUNK_PX) + 2; cx++) { const b = this.buckets.get(cx + cy * 1000); if (b) for (const p of b) list.push(p); }
      const vis = list.filter((p) => this.ed.visible(p) && this.spr(p));
      const draw = (p, a = 1) => { const s = p.spr; if (a < 1) ctx.globalAlpha = a; ctx.drawImage(s.cv, Math.round(p.x - s.ax), Math.round(p.y - s.ay)); if (a < 1) ctx.globalAlpha = 1; };
      for (const p of vis) if (p.ground) draw(p);
      const mid = vis.filter((p) => !p.ground && !p.over).sort((a, b) => a.y - b.y);
      // les personnages (repères : où ils se tiennent)
      if (this.show.pnj) for (const n of W.npcs) if (n.x > x0 - 20 && n.x < x1 + 20 && n.y > y0 - 30 && n.y < y1 + 30) mid.push({ npc: n, y: n.y });
      mid.sort((a, b) => a.y - b.y);
      for (const p of mid) { if (p.npc) this.drawNpc(ctx, p.npc); else draw(p); }
      for (const p of vis) if (p.over) draw(p, 0.75);
      this.visCount = vis.length;
    }
    // les calques d'affichage (en mode édition seulement : invisibles en jeu)
    const tx0 = Math.max(0, Math.floor(x0 / 16)), ty0 = Math.max(0, Math.floor(y0 / 16)), tx1 = Math.min(W.W - 1, Math.floor(x1 / 16)), ty1 = Math.min(W.H - 1, Math.floor(y1 / 16));
    const big = (tx1 - tx0) * (ty1 - ty0) > 60000;
    if (!big && (this.show.collisions || this.show.regions || this.show.navigation)) {
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const i = ty * W.W + tx;
        if (this.show.regions) { ctx.fillStyle = zoneColor(W.zones[i]); ctx.globalAlpha = 0.28; ctx.fillRect(tx * 16, ty * 16, 16, 16); }
        if (this.show.navigation && W.sail[i]) { ctx.fillStyle = '#3aa0ff'; ctx.globalAlpha = 0.3; ctx.fillRect(tx * 16, ty * 16, 16, 16); }
        if (this.show.collisions && W.solid[i]) { ctx.fillStyle = '#ff3a3a'; ctx.globalAlpha = 0.33; ctx.fillRect(tx * 16, ty * 16, 16, 16); }
      }
      ctx.globalAlpha = 1;
      // les collisions peintes à la main : un cadre (rouge : bloque, vert : libère)
      if (this.show.collisions) for (const [k, v] of Object.entries(this.ed.doc.collisions)) { const c = k.indexOf(','), x = +k.slice(0, c), y = +k.slice(c + 1); if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue; ctx.strokeStyle = v ? '#ff8080' : '#60ff90'; ctx.lineWidth = 1.5 / this.cam.z; ctx.strokeRect(x * 16 + 2, y * 16 + 2, 12, 12); }
    }
    if (this.show.grille && this.cam.z >= 0.75) {
      ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1 / z; ctx.beginPath();
      for (let tx = tx0; tx <= tx1 + 1; tx++) { ctx.moveTo(tx * 16, ty0 * 16); ctx.lineTo(tx * 16, (ty1 + 1) * 16); }
      for (let ty = ty0; ty <= ty1 + 1; ty++) { ctx.moveTo(tx0 * 16, ty * 16); ctx.lineTo((tx1 + 1) * 16, ty * 16); }
      ctx.stroke();
    }
    if (this.show.grille && this.cam.z < 0.75 && this.cam.z >= 0.25) { ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1 / z; ctx.beginPath(); for (let x = Math.floor(tx0 / 16) * 16; x <= tx1 + 16; x += 16) { ctx.moveTo(x * 16, ty0 * 16); ctx.lineTo(x * 16, (ty1 + 1) * 16); } for (let y = Math.floor(ty0 / 16) * 16; y <= ty1 + 16; y += 16) { ctx.moveTo(tx0 * 16, y * 16); ctx.lineTo((tx1 + 1) * 16, y * 16); } ctx.stroke(); }
    // les portes (le point dehors : une flèche verte ; le point dedans : bleue)
    if (this.show.portes && !far) for (const d of W.doors) for (const [px, py, col] of [[d.ox, d.oy, '#59e08a'], [d.ix, d.iy, '#5ab8ff']]) { if (px < x0 - 16 || px > x1 + 16 || py < y0 - 16 || py > y1 + 16) continue; ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(px - 5, py - 9); ctx.lineTo(px + 5, py - 9); ctx.lineTo(px, py - 2); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    // la sélection, le survol, le pinceau, le cadre de sélection, le fantôme du décor à poser
    ctx.lineWidth = 1.5 / this.cam.z;
    const box = (p, col, dash) => { const s = this.spr(p); if (!s) return; ctx.strokeStyle = col; ctx.setLineDash(dash ? [4 / this.cam.z, 3 / this.cam.z] : []); ctx.strokeRect(Math.round(p.x - s.ax) - 1, Math.round(p.y - s.ay) - 1, s.w + 2, s.h + 2); ctx.setLineDash([]); for (const [cx, cy] of p._cells || []) { ctx.fillStyle = 'rgba(255,220,80,0.18)'; ctx.fillRect(cx * 16, cy * 16, 16, 16); } };
    if (this.hover && !this.sel.some((r) => this.ed.propOf(r) === this.hover)) box(this.hover, 'rgba(255,255,255,0.6)', true);
    for (const r of this.sel) { const p = this.ed.propOf(r); if (p && this.ed.world.props.includes(p)) box(p, this.ed.locked(p) ? '#ff9a5a' : '#ffd84a'); }
    if (this.brush) { ctx.strokeStyle = this.brush.col || '#fff'; ctx.strokeRect(this.brush.x * 16, this.brush.y * 16, this.brush.n * 16, this.brush.n * 16); }
    if (this.marquee) { const m = this.marquee; ctx.strokeStyle = '#8ad0ff'; ctx.fillStyle = 'rgba(138,208,255,0.1)'; const rx = Math.min(m.x0, m.x1), ry = Math.min(m.y0, m.y1); ctx.fillRect(rx, ry, Math.abs(m.x1 - m.x0), Math.abs(m.y1 - m.y0)); ctx.strokeRect(rx, ry, Math.abs(m.x1 - m.x0), Math.abs(m.y1 - m.y0)); }
    if (this.ghost && this.ghost.spr) { const g = this.ghost, s = g.spr; ctx.globalAlpha = 0.6; ctx.drawImage(s.cv, Math.round(g.x - s.ax), Math.round(g.y - s.ay)); ctx.globalAlpha = 1; ctx.strokeStyle = g.ok ? '#7dff9a' : '#ff6a6a'; ctx.strokeRect(g.tx * 16, g.ty * 16, 16 * (g.w || 1), 16 * (g.h || 1)); }
    if (!far) this.drawStructure(ctx, x0, y0, x1, y1);
    // les repères
    for (const r of this.ed.doc.reperes || []) { const px = r.x * 16 + 8, py = r.y * 16 + 8; if (px < x0 || px > x1 || py < y0 || py > y1) continue; ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.arc(px, py, 5 / this.cam.z + 2, 0, 6.3); ctx.fill(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // lot 2 : les pièces de LStudio (leur contour, leur nom, leur sortie), les zones (jaune : un message, violet : un passage,
  // avec la flèche vers son arrivée), la structure sélectionnée, et ce que vise l'outil Bâtir. En édition seulement.
  drawStructure(ctx, x0, y0, x1, y1) {
    const W = this.world, doc = this.ed.doc, z = this.cam.z, S = this.struct, lw = 1.5 / z;
    const vis = (ax, ay, bx, by) => bx >= x0 && ax <= x1 && by >= y0 && ay <= y1;
    const font = Math.max(7, Math.round(11 / z));
    ctx.font = `${font}px sans-serif`; ctx.textBaseline = 'bottom';
    if (this.show.pieces) for (const pc of doc.pieces) {
      const ax = (pc.x - 1) * 16, ay = (pc.y - 2) * 16, bx = (pc.x + pc.w + 1) * 16, by = (pc.y + pc.h + 1) * 16;
      if (!vis(ax, ay, bx, by)) continue;
      const on = S && S.k === 'piece' && S.uid === pc.uid, valid = this.ed.S.pieceRooms.has(pc.uid);
      ctx.strokeStyle = !valid ? '#ff5a5a' : on ? '#ffd84a' : 'rgba(255,216,74,0.55)'; ctx.lineWidth = on ? lw * 1.6 : lw; ctx.setLineDash(on ? [] : [6 / z, 4 / z]);
      ctx.strokeRect(ax, ay, bx - ax, by - ay); ctx.setLineDash([]);
      ctx.fillStyle = !valid ? '#ff8a8a' : '#ffe9a0'; ctx.fillText((valid ? '🏠 ' : '⛔ ') + (pc.nom || 'Pièce'), ax + 2, ay - 2);
    }
    if (this.show.zones) for (const zn of doc.zones) {
      const ax = zn.x * 16, ay = zn.y * 16, bx = (zn.x + zn.w) * 16, by = (zn.y + zn.h) * 16, on = S && S.k === 'zone' && S.uid === zn.uid;
      const col = zn.type === 'passage' ? '192,122,255' : '255,216,74';
      if (vis(ax, ay, bx, by)) { ctx.fillStyle = `rgba(${col},${on ? 0.35 : 0.2})`; ctx.fillRect(ax, ay, bx - ax, by - ay); ctx.strokeStyle = `rgba(${col},${on ? 1 : 0.8})`; ctx.lineWidth = on ? lw * 1.6 : lw; ctx.strokeRect(ax, ay, bx - ax, by - ay); ctx.fillStyle = `rgb(${col})`; ctx.fillText(zn.type === 'passage' ? '⇢ ' + (zn.bouton || 'Passer') : '✉ ' + (zn.bouton || 'Lire'), ax + 1, ay - 1); }
      if (zn.type === 'passage' && zn.vers) {
        const tx = zn.vers.x * 16 + 8, ty = zn.vers.y * 16 + 8;
        if (vis(tx - 8, ty - 8, tx + 8, ty + 8)) { ctx.strokeStyle = 'rgb(192,122,255)'; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(tx, ty, 6, 0, 6.3); ctx.stroke(); ctx.fillStyle = 'rgba(192,122,255,0.5)'; ctx.fill(); }
        if (on || Math.hypot(tx - (ax + bx) / 2, ty - (ay + by) / 2) < 1200) { ctx.strokeStyle = `rgba(192,122,255,${on ? 0.9 : 0.45})`; ctx.setLineDash([5 / z, 4 / z]); ctx.beginPath(); ctx.moveTo((ax + bx) / 2, (ay + by) / 2); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); }
      }
    }
    // la porte sélectionnée : un anneau autour de son entrée, et autour de son arrivée dedans
    if (S && S.k === 'porte') { const d = this.ed.S.doorOf.get(S.uid); if (d) for (const [px, py] of [[d.ox, d.oy], [d.ix, d.iy]]) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = lw * 1.6; ctx.beginPath(); ctx.arc(px, py - 5, 9, 0, 6.3); ctx.stroke(); } }
    if (this.bhover) { const b = this.bhover; ctx.fillStyle = b.fill || 'rgba(255,255,255,0.18)'; ctx.strokeStyle = b.col || '#fff'; ctx.lineWidth = lw; for (const [cx, cy] of b.cells) { ctx.fillRect(cx * 16, cy * 16, 16, 16); ctx.strokeRect(cx * 16, cy * 16, 16, 16); } if (b.label) { ctx.fillStyle = b.col || '#fff'; ctx.fillText(b.label, b.cells[0][0] * 16, b.cells[0][1] * 16 - 2); } }
    for (const R of [this.zrect, this.pghost]) if (R) { ctx.strokeStyle = R.col || '#8ad0ff'; ctx.fillStyle = R.fill || 'rgba(138,208,255,0.12)'; ctx.lineWidth = lw; ctx.fillRect(R.x0 * 16, R.y0 * 16, (R.x1 - R.x0 + 1) * 16, (R.y1 - R.y0 + 1) * 16); ctx.strokeRect(R.x0 * 16, R.y0 * 16, (R.x1 - R.x0 + 1) * 16, (R.y1 - R.y0 + 1) * 16); }
    void W;
  }
  drawNpc(ctx, n) {
    let s = this.npcSpr.get(n.id);
    if (s === undefined) { const D = NPCS[n.id]; s = D && D.look ? humanSheet(D.look) : null; this.npcSpr.set(n.id, s); }
    if (!s) return;
    ctx.drawImage(s.cv, 0, ((n.dir | 0) % 4) * FH, FW, FH, Math.round(n.x - FW / 2), Math.round(n.y - FH + 2), FW, FH); // (sa direction : 2.4)
    if (n.studio && this.struct && this.struct.k === 'personnage' && this.struct.uid === n.studio) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 1.5 / this.cam.z; ctx.strokeRect(Math.round(n.x - FW / 2) - 1, Math.round(n.y - FH + 2) - 1, FW + 2, FH + 2); }
  }
  // ---------------------------------------------------------------- trouver ce qui est sous le pointeur (au pixel près)
  opaque(s, x, y) {
    let m = this.alpha.get(s.cv);
    if (!m) { const c = s.cv.getContext('2d'), d = c.getImageData(0, 0, s.w, s.h).data; m = new Uint8Array(s.w * s.h); for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 20 ? 1 : 0; this.alpha.set(s.cv, m); }
    return x >= 0 && y >= 0 && x < s.w && y < s.h && m[(y | 0) * s.w + (x | 0)] === 1;
  }
  pick(wx, wy) {
    const out = [];
    for (let cy = Math.floor(wy / CHUNK_PX) - 1; cy <= Math.floor(wy / CHUNK_PX) + 3; cy++) for (let cx = Math.floor(wx / CHUNK_PX) - 2; cx <= Math.floor(wx / CHUNK_PX) + 2; cx++) {
      const b = this.buckets.get(cx + cy * 1000); if (!b) continue;
      for (const p of b) { if (!this.ed.visible(p)) continue; const s = this.spr(p); if (!s) continue; const lx = wx - (p.x - s.ax), ly = wy - (p.y - s.ay); if (lx >= 0 && ly >= 0 && lx < s.w && ly < s.h && this.opaque(s, lx, ly)) out.push(p); }
    }
    if (!out.length) return null;
    out.sort((a, b) => (b.over ? 1e6 : 0) + b.y - ((a.over ? 1e6 : 0) + a.y) - (a.ground ? 0 : 0));
    return out.find((p) => !p.ground) || out[0];
  }
  inRect(x0, y0, x1, y1) {
    const rx0 = Math.min(x0, x1), rx1 = Math.max(x0, x1), ry0 = Math.min(y0, y1), ry1 = Math.max(y0, y1), out = [];
    for (let cy = Math.floor(ry0 / CHUNK_PX) - 1; cy <= Math.floor(ry1 / CHUNK_PX) + 1; cy++) for (let cx = Math.floor(rx0 / CHUNK_PX) - 1; cx <= Math.floor(rx1 / CHUNK_PX) + 1; cx++) { const b = this.buckets.get(cx + cy * 1000); if (b) for (const p of b) if (p.x >= rx0 && p.x <= rx1 && p.y >= ry0 && p.y <= ry1 && this.ed.visible(p) && !this.ed.locked(p)) out.push(p); }
    return out;
  }
}
export { ZOOMS, T };
