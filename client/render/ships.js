// 1.1 : les navires, dessinés dans tous les caps. La coque et le pont sont peints une fois (proue vers la
// droite), puis tournés ; le franc-bord se voit sous le pont (la coque a de la hauteur), la mâture et les
// voiles sont projetées en vraie perspective (plus c'est haut, plus c'est haut à l'écran) : les voiles se
// gonflent au vent arrière, faseyent et se plaquent au mât face au vent, la mâture gîte dans les virages et
// roule à la houle. Derrière : le sillage en V, l'écume de l'étrave ; à quai : la passerelle ; la nuit : les
// fanaux. Les coups de canon reculent, l'ancre descend dans un nuage d'écume.
import { PB, mix, shade } from './pixel.js';
import { shipOf, hullHalf, toWorld, stations, openingAt, gangway, RAIL } from '../../shared/data/ships.js';
import { ITEMS } from '../../shared/data/items.js';

const TAU = Math.PI * 2, K = 0.72; // une unité de hauteur = 0,72 px plus haut à l'écran
const STEPS = 128; // le cap affiché, par pas de 2,8° (des pixels qui restent nets)
const FB = { radeau: 2, barque: 3, sloop: 4, brick: 5, goelette: 5, spectre: 5, galion: 7, veuve: 7 }; // franc-bord
const css = (c, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
const PAL = {
  radeau: { plank: 0x8c5c33, plankD: 0x6d4626, rim: 0xab7643, rimD: 0x6d4626, side: 0x4f321a, sideD: 0x34200f, keel: 0x271709, sail: [0xa89a78, 0xc9bc96, 0xe0d4b0], flag: 0x2a2420 },
  barque: { plank: 0x8c5c33, plankD: 0x6d4626, rim: 0xc79357, rimD: 0x8c5c33, side: 0x4f321a, sideD: 0x34200f, keel: 0x271709, sail: [0xb3a684, 0xd2c6a2, 0xe8dec0], flag: 0x2a2420 },
  sloop: { plank: 0xab7643, plankD: 0x8c5c33, rim: 0xd8b07a, rimD: 0xab7643, side: 0x2a3a5a, sideD: 0x1c2840, keel: 0x141c2e, sail: [0xc4b894, 0xe2d8b8, 0xf7f0dc], flag: 0x141418 },
  brick: { plank: 0x8a5a30, plankD: 0x6a4224, rim: 0xe0c08a, rimD: 0x9a6a3a, side: 0x6a1418, sideD: 0x4a0c10, keel: 0x1a0a0c, sail: [0x9a2226, 0xc23a34, 0xe05a4a], flag: 0x141418 },
  goelette: { plank: 0x9a7048, plankD: 0x7a5434, rim: 0xe8d0a0, rimD: 0xa8885a, side: 0x1a4a52, sideD: 0x0f3238, keel: 0x0a1e22, sail: [0xc8bc98, 0xe6dcbc, 0xfaf4e2], flag: 0x141418 },
  spectre: { plank: 0x4a6a62, plankD: 0x34504a, rim: 0xbae8d0, rimD: 0x5a8a7a, side: 0x1e3a36, sideD: 0x12262a, keel: 0x0a1a18, sail: [0x7ab09a, 0x9ad0b8, 0xc8f4e0], flag: 0x9ad0b8 },
  galion: { plank: 0x7a4a2a, plankD: 0x5a341c, rim: 0xf2c14a, rimD: 0xa86e1c, side: 0x5a1418, sideD: 0x3a0c0e, keel: 0x1a0a0a, sail: [0xc8b88e, 0xe4d6b0, 0xf6eed4], flag: 0x141418 },
  noir: { plank: 0x3a2e24, plankD: 0x2a2018, rim: 0x5a4a3a, rimD: 0x3a2e24, side: 0x141418, sideD: 0x08080a, keel: 0x050506, sail: [0x1a161c, 0x26222a, 0x3a3440], flag: 0x0c0a0e },
  fantome: { plank: 0x4a6a62, plankD: 0x34504a, rim: 0xc8f0d8, rimD: 0x7ab09a, side: 0x2a4a44, sideD: 0x18302c, keel: 0x10201c, sail: [0x7ab09a, 0xa8dcc4, 0xe0fff0], flag: 0x9ad0b8 },
  veuve: { plank: 0x3a1a1e, plankD: 0x26100f, rim: 0xf2c14a, rimD: 0xa86e1c, side: 0x14080a, sideD: 0x0a0405, keel: 0x080404, sail: [0x7a1418, 0xa82226, 0xd23a34], flag: 0xc23a34 },
};
const bowsprit = (S) => (S.shape === 'ship' ? Math.round(S.L * 0.14) : 0);
const hh = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ------------------------------------------------------------------ la coque et le pont, peints une fois
function buildArt(kind, pal) {
  const S = shipOf(kind), P = PAL[pal || kind] || PAL.barque, bs = bowsprit(S);
  const W = Math.ceil(S.L + bs + 8), H = Math.ceil(S.B + 8), cx = Math.floor(S.L / 2 + 4), cy = Math.floor(H / 2);
  const deck = new PB(W, H), side = new PB(W, H), sideD = new PB(W, H), foam = new PB(W + 4, H + 4);
  const main = S.masts.reduce((b, m) => (m.s > b.s ? m : b), S.masts[0]);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const lx = px - cx + 0.5, ly = py - cy + 0.5, hw = hullHalf(S, lx);
    if (hw <= 0.4 || Math.abs(ly) > hw) continue;
    side.set(px, py, P.side); sideD.set(px, py, P.sideD);
    for (let k = 0; k < 9; k++) foam.set(px + 2 + (k % 3) - 1, py + 2 + ((k / 3) | 0) - 1, 0xffffff);
    const edge = hw - Math.abs(ly), op = !S.open && openingAt(S, lx);
    let c;
    if (S.shape === 'raft') { // des troncs liés en travers
      const xx = Math.floor(lx + 64), t = xx % 6;
      c = edge < 1 ? P.keel : t === 0 ? P.keel : t === 1 ? P.plankD : t === 3 ? P.rim : P.plank;
      if (Math.abs(Math.abs(ly) - hw * 0.55) < 0.8 && t !== 0) c = 0xd8c090; // la corde
    } else if (edge < 1) c = P.keel;
    else if (edge < RAIL + 1 && !op) c = edge < 2 ? P.rimD : (hh(Math.floor(lx), 7) < 0.08 ? P.rimD : P.rim);
    else if (edge < RAIL + 1 && op) c = Math.abs(lx - op.x) > op.w / 2 - 1.5 ? P.rimD : P.plankD; // l'ouverture et ses montants
    else {
      const yy = Math.floor(ly + 64), row = Math.floor(yy / 3);
      c = yy % 3 === 0 ? P.plankD : row % 2 ? P.plank : shade(P.plank, 0.92);
      if (yy % 3 !== 0 && hh(row, Math.floor((lx + 300) / 19)) < 0.05 && Math.floor(lx + 300) % 19 === 0) c = P.plankD; // les abouts des bordages
      if (S.castle && lx < S.castle[1]) c = shade(c, 0.86);
      if (S.fore && lx > S.fore[0]) c = shade(c, 0.9);
      if (S.castle && Math.abs(lx - S.castle[1]) < 1) c = P.rimD; // la marche du gaillard d'arrière
      if (S.fore && Math.abs(lx - S.fore[0]) < 1) c = P.rimD;
    }
    deck.set(px, py, c);
  }
  // le beaupré
  if (bs) for (let k = 0; k < bs; k++) { deck.set(cx + S.L / 2 - 2 + k, cy, P.rimD); deck.set(cx + S.L / 2 - 2 + k, cy - 1, k < bs - 2 ? P.keel : P.rimD); }
  // les bancs de la barque, l'écoutille, les tonneaux et les cordages des navires
  if (S.shape === 'boat') for (const bx of [-S.L * 0.18, S.L * 0.12]) for (let y = -S.B / 2 + 4; y < S.B / 2 - 4; y++) { deck.set(cx + bx, cy + y, P.rimD); deck.set(cx + bx + 1, cy + y, P.rim); }
  if (S.shape === 'ship') {
    const hx = Math.round(main.x - (S.masts.length > 1 ? 20 : 16)), hwid = Math.min(10, S.B * 0.24);
    for (let y = -hwid / 2; y < hwid / 2; y++) for (let x = -5; x < 5; x++) deck.set(cx + hx + x, cy + y, (x + 5) % 3 === 0 || Math.floor(y + 20) % 3 === 0 ? P.keel : P.plankD);
    const deco = [[S.L * 0.3, 0.62], [-S.L * 0.12, -0.6], [S.L * 0.05, 0.6], [-S.L * 0.26, 0.58]];
    for (const [dx, k] of deco) { const hw = hullHalf(S, dx), y = Math.round(k * (hw - RAIL - 4)); deck.disc(cx + dx, cy + y, 2.3, 0x5a3418); deck.disc(cx + dx, cy + y, 1.2, 0x8a5a2a); deck.set(cx + dx - 1, cy + y - 1, 0xb07a3a); }
    const rope = [S.cap - 14, Math.round(hullHalf(S, S.cap - 14) * 0.42)];
    for (let a = 0; a < 18; a++) { const r = 1 + a / 9; deck.set(cx + rope[0] + Math.cos(a) * r, cy + rope[1] + Math.sin(a) * r, 0xd8c090); }
  }
  const c = (pb) => pb.toCanvas();
  return { deck: c(deck), side: c(side), sideD: c(sideD), foam: c(foam), cx, cy, W, H };
}

export const shipRender = {
  shipArt(kind, pal) { this._shipArt = this._shipArt || {}; const k = kind + ':' + (pal || kind); return this._shipArt[k] || (this._shipArt[k] = buildArt(kind, pal)); },
  // le point local (lx, ly) à la hauteur z, à l'écran (avec la gîte et le roulis de la mâture)
  shipProj(s, lx, ly, z, camX, camY) {
    const lean = s.lean || 0, c = Math.cos(s.qa), sn = Math.sin(s.qa), y2 = ly + lean * z / 60;
    return [s.x + c * lx - sn * y2 - camX, s.y + sn * lx + c * y2 - camY - z * K + (s.bob || 0)];
  },
  // ------------------------------------------------------------------ sillage, coque, pont, accastillage
  drawShipsBase(ctx, G, camX, camY, now, dt) {
    if (!G.ships) return;
    const W = this.W, H = this.H;
    this.coach = G.player && G.player.ship && G.shipCoach ? { id: G.player.ship, k: G.shipCoach } : null; // lot 1 : le poste à rejoindre
    for (const s of G.ships.values()) this.drawShipBody(ctx, s, camX, camY, now, dt);
  },
  drawShipBody(ctx, s, camX, camY, now, dt) {
    const W = this.W, H = this.H;
    {
      const S = shipOf(s.kind), P = PAL[s.pal || s.kind] || PAL.barque, art = this.shipArt(s.kind, s.pal), F = FB[s.kind] || 4;
      s.qa = Math.round(s.a / (TAU / STEPS)) * (TAU / STEPS);
      const maxV = (ITEMS[s.item] && ITEMS[s.item].boat.speed) || 140, sp = s.sp || 0;
      s.bob = Math.round(Math.sin(now * 1.6 + s.id * 1.7) * 0.6 * 2) / 2;
      s.lean = Math.max(-6, Math.min(6, -(s.rud || 0) * Math.min(1, Math.max(0, s.u || 0) / (0.5 * maxV)) * 4)) + Math.sin(now * 1.25 + s.id) * 0.9;
      this.shipWake(s, S, now, dt, sp);
      const X = s.x - camX, Y = s.y - camY;
      if (X < -S.L - 60 || X > W + S.L + 60 || Y < -S.L - 60 || Y > H + S.L + 60) return;
      this.drawWake(ctx, s, S, camX, camY, now, sp);
      const sink = s.sinkT ? Math.min(1, (now - s.sinkT) / 4) : 0;
      ctx.save();
      if (sink) { ctx.globalAlpha = 1 - sink * 0.85; }
      const put = (cv, dx, dy, a = 1) => { ctx.save(); ctx.globalAlpha *= a; ctx.translate(Math.round(X + dx), Math.round(Y + dy + s.bob + sink * sink * 10)); ctx.rotate(s.qa + sink * 0.3); ctx.drawImage(cv, -art.cx - (cv === art.foam ? 2 : 0), -art.cy - (cv === art.foam ? 2 : 0)); ctx.restore(); };
      // l'ombre dans l'eau, l'écume à la flottaison, le franc-bord, le pont
      put(art.sideD, 3, F + 3, 0.28);
      put(art.foam, 0, F + 1, 0.18 + Math.min(0.4, sp / maxV * 0.5));
      for (let k = F; k >= 1; k--) put(k === F ? art.sideD : art.side, 0, k);
      put(art.deck, 0, 0);
      ctx.restore();
      if (!sink) this.drawShipFixtures(ctx, s, S, P, camX, camY, now);
      // la passerelle, à quai
      if (sp < 14 && !sink) {
        if (!s.gwAt || now > s.gwAt) { s.gwAt = now + 0.5; s.gw = gangway(this.world, S, s, -1); const g2 = gangway(this.world, S, s, 1); if (g2 && (!s.gw || g2.gap < s.gw.gap)) s.gw = g2; }
        if (s.gw && s.gw.gap <= 26) this.drawGangway(ctx, s, S, s.gw, camX, camY);
      } else s.gw = null;
      if (sink && Math.random() < 0.8) this.burst(s.x + (Math.random() - 0.5) * S.L * 0.7, s.y + (Math.random() - 0.5) * S.B * 0.6, 2, { z: 1, col: ['#ffffff', '#d8f6ff', '#9fd8ff'], up: 30, speed: 18, life: 0.7, g: 70 });
    }
  },
  shipWake(s, S, now, dt, sp) {
    s.wk = s.wk || [];
    while (s.wk.length && now - s.wk[0].t > 3.4) s.wk.shift();
    if (sp > 6 && !s.sinkT && (!s.wkAt || now > s.wkAt)) {
      s.wkAt = now + 0.06;
      const [x, y] = toWorld({ x: s.x, y: s.y, a: s.a }, -S.L / 2 + 3, 0);
      s.wk.push({ x, y, t: now, sp, a: s.a, b: S.B });
    }
  },
  drawWake(ctx, s, S, camX, camY, now, sp) {
    // le sillage : deux bras d'écume qui s'écartent en V, et l'eau brassée juste derrière la poupe
    const wk = s.wk || [];
    ctx.lineCap = 'round';
    for (let i = 1; i < wk.length; i++) {
      const w0 = wk[i - 1], w1 = wk[i], age = now - w1.t, k = 1 - age / 3.4;
      if (k <= 0 || Math.hypot(w1.x - w0.x, w1.y - w0.y) > 60) continue;
      const al = k * Math.min(1, w1.sp / 45);
      const at = (w, sd) => { const ag = now - w.t, sp2 = w.b * 0.3 + ag * (6 + w.sp * 0.06) + Math.sin(w.t * 11 + sd * 2) * (0.6 + ag * 0.5), nx = -Math.sin(w.a), ny = Math.cos(w.a); return [w.x + nx * sp2 * sd - camX, w.y + ny * sp2 * sd - camY + 2]; };
      ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(236,250,255,${(al * 0.48).toFixed(3)})`; ctx.lineWidth = age < 0.8 ? 2 : 1;
      for (const sd of [-1, 1]) { const [x0, y0] = at(w0, sd), [x1, y1] = at(w1, sd); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      if (age < 1.6) { ctx.lineCap = 'butt'; ctx.strokeStyle = `rgba(210,240,255,${(al * 0.26 * (1 - age / 1.6)).toFixed(3)})`; ctx.lineWidth = Math.max(1, w1.b * 0.35 * (1 - age / 1.6)); ctx.beginPath(); ctx.moveTo(w0.x - camX, w0.y - camY + 2); ctx.lineTo(w1.x - camX, w1.y - camY + 2); ctx.stroke(); }
    }
    ctx.lineCap = 'butt';
    // l'écume de l'étrave
    if (sp > 10 && !s.sinkT) {
      const len = Math.min(18, sp * 0.1), [bx, by] = toWorld({ x: s.x, y: s.y, a: s.qa }, S.L / 2 - 2, 0), c = Math.cos(s.qa), sn = Math.sin(s.qa);
      ctx.strokeStyle = `rgba(240,252,255,${Math.min(0.7, sp / 120).toFixed(2)})`; ctx.lineWidth = 1;
      for (const sd of [-1, 1]) {
        const hw = hullHalf(S, S.L / 2 - len), ex = bx - c * len + -sn * (hw + 3) * sd, ey = by - sn * len + c * (hw + 3) * sd;
        ctx.beginPath(); ctx.moveTo(Math.round(bx - camX) + 0.5, Math.round(by - camY + (FB[s.kind] || 4)) + 0.5); ctx.lineTo(Math.round(ex - camX) + 0.5, Math.round(ey - camY + (FB[s.kind] || 4)) + 0.5); ctx.stroke();
      }
      if (Math.random() < sp / 160) this.burst(bx, by + 3, 1, { z: 2, col: ['#ffffff', '#d8f6ff'], up: 10 + sp * 0.06, speed: 12, life: 0.5, g: 40 });
    }
  },
  drawShipFixtures(ctx, s, S, P, camX, camY, now) {
    const pr = (lx, ly, z = 0) => this.shipProj(s, lx, ly, z, camX, camY);
    const px = (x, y, c, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    const st = stations(S);
    // les canons (et leur recul)
    for (const g of st) if (g.k === 'gun') {
      const rec = s.recoil && s.recoil[g.i] > now ? (s.recoil[g.i] - now) / 0.35 * 4 : 0, sd = g.side;
      const [bx, by] = pr(g.at[0], g.at[1] - sd * (2 + rec)), [mx, my] = pr(g.at[0], g.at[1] + sd * (7 - rec));
      ctx.strokeStyle = '#1d1c24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(mx, my); ctx.stroke();
      ctx.strokeStyle = '#5a596b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by - 1); ctx.lineTo(mx, my - 1); ctx.stroke();
      const [cx2, cy2] = pr(g.at[0], g.at[1] - sd * 3); px(cx2 - 2, cy2 - 1, '#4f321a', 4, 3);
    }
    // les pieds de mât
    for (const m of S.masts) { const [x, y] = pr(m.x, 0); px(x - 2, y - 2, css(P.keel), 4, 4); px(x - 1, y - 1, '#6d4626', 2, 2); }
    // la barre : une roue (ou une barre franche pour les petits)
    if (S.shape === 'ship') {
      const [hx, hy] = pr(S.helm, 0, 3), r = 4, rot = (s.rud || 0) * 2.6;
      ctx.strokeStyle = '#3a220f'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(hx, hy, r, r * 0.8, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#c79357';
      for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(hx - Math.cos(a) * (r + 1.5), hy - Math.sin(a) * (r + 1.5) * 0.8); ctx.lineTo(hx + Math.cos(a) * (r + 1.5), hy + Math.sin(a) * (r + 1.5) * 0.8); ctx.stroke(); }
      px(hx - 1, hy - 1, '#f2c14a', 2, 2);
      const [px0, py0] = pr(S.helm, 0, 0); px(px0 - 1, py0 - 1, '#4f321a', 2, 3);
    } else {
      const [x0, y0] = pr(-S.L / 2 + 2, 0, 1), [x1, y1] = pr(S.helm + 4, -(s.rud || 0) * 6, 2);
      ctx.strokeStyle = '#4f321a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    // le cabestan, qui tourne quand on lève l'ancre
    const anc = s.anc || 0, raising = anc >= 200 && (anc % 100) > (s.ancP0 || 0);
    s.ancP0 = anc % 100; if (raising) s.capA = (s.capA || 0) + 0.12;
    const [kx, ky] = pr(S.cap, 0, 2), cr = S.shape === 'ship' ? 3.5 : 2.5;
    ctx.fillStyle = '#4f321a'; ctx.beginPath(); ctx.ellipse(kx, ky, cr, cr * 0.8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c79357'; ctx.lineWidth = 1;
    if (S.shape === 'ship') for (let k = 0; k < 2; k++) { const a = (s.capA || 0) + k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(kx - Math.cos(a) * 6, ky - Math.sin(a) * 4.8); ctx.lineTo(kx + Math.cos(a) * 6, ky + Math.sin(a) * 4.8); ctx.stroke(); }
    // l'ancre : au bossoir quand elle est levée, sa chaîne qui file à l'eau quand elle est au fond
    const hwB = hullHalf(S, S.L / 2 - 10);
    if (anc >= 100) {
      const [ax, ay] = pr(S.L / 2 - 9, -hwB + 2, 2), [ex, ey] = pr(S.L / 2 - 6, -hwB - 7, -3);
      ctx.strokeStyle = '#5a596b'; ctx.lineWidth = 1; ctx.setLineDash([1, 1]); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      if (Math.random() < 0.04) this.burst(ex + camX, ey + camY + 3, 1, { z: 1, col: ['#ffffff', '#d8f6ff'], up: 6, speed: 6, life: 0.5, g: 30 });
    } else {
      const [ax, ay] = pr(S.L / 2 - 9, -hwB - 2, 3);
      px(ax, ay - 2, '#2c2b36', 1, 5); px(ax - 2, ay + 2, '#2c2b36', 5, 1); px(ax - 2, ay + 1, '#2c2b36', 1, 1); px(ax + 2, ay + 1, '#2c2b36', 1, 1); px(ax - 1, ay - 2, '#7c7b8f', 3, 1);
    }
    // lot 1 : le poste à rejoindre pour partir (un anneau doré qui pulse)
    if (this.coach && this.coach.id === s.id) {
      const st = stations(S).find((q) => q.k === this.coach.k);
      if (st) { const [cx, cy] = pr(st.at[0], st.at[1], 1), r = 7 + Math.sin(now * 5) * 1.5; ctx.strokeStyle = `rgba(255,210,74,${(0.65 + 0.3 * Math.sin(now * 5)).toFixed(2)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.75, 0, 0, TAU); ctx.stroke(); }
    }
    // les fanaux
    const dark = this.darkNow || 0;
    for (const [lx, ly] of S.lanterns) { const [x, y] = pr(lx, ly, 6); px(x - 1, y - 1, '#2c2010', 3, 4); px(x, y, dark > 0.25 ? '#ffe08a' : '#c8a050', 1, 2); }
  },
  drawGangway(ctx, s, S, g, camX, camY) {
    const [rx, ry] = toWorld({ x: s.x, y: s.y, a: s.qa }, g.ox, g.side * hullHalf(S, g.ox)), ex = g.x, ey = g.y - 4;
    const a = Math.atan2(ey - ry, ex - rx), L = Math.hypot(ex - rx, ey - ry) + 3;
    ctx.save(); ctx.translate(Math.round(rx - camX), Math.round(ry - camY + (s.bob || 0))); ctx.rotate(a);
    ctx.fillStyle = '#4f321a'; ctx.fillRect(-1, -3, L, 6);
    ctx.fillStyle = '#8c5c33'; ctx.fillRect(0, -2, L - 1, 4);
    ctx.fillStyle = '#6d4626'; for (let k = 2; k < L - 1; k += 3) ctx.fillRect(k, -2, 1, 4);
    ctx.restore();
  },
  // ------------------------------------------------------------------ la mâture et les voiles (au-dessus de tout)
  drawShipsTop(ctx, G, camX, camY, now) {
    if (!G.ships) return;
    const wind = G.wind || [0.6, 0.9];
    for (const s of G.ships.values()) {
      const S = shipOf(s.kind), P = PAL[s.kind] || PAL.barque;
      if (s.qa == null) continue;
      const X = s.x - camX, Y = s.y - camY;
      if (X < -S.L - 80 || X > this.W + S.L + 80 || Y < -40 || Y > this.H + S.L + 140) continue;
      const sink = s.sinkT ? Math.min(1, (now - s.sinkT) / 4) : 0;
      ctx.save();
      ctx.globalAlpha = (G.player && G.player.ship === s.id ? 0.78 : 1) * (1 - sink);
      this.drawRig(ctx, s, S, PAL[s.pal || s.kind] || P, camX, camY + sink * sink * 18, now, wind);
      ctx.restore();
    }
  },
  drawRig(ctx, s, S, P, camX, camY, now, wind) {
    const pr = (lx, ly, z) => this.shipProj(s, lx, ly, z, camX, camY);
    const f = Math.max(0, Math.min(1, s.sail == null ? 0 : s.sail)), rel = Math.cos(wind[0] - s.a), lat = Math.sin(wind[0] - s.a);
    const flut = f > 0.05 && rel < -0.35 ? Math.sin(now * 17 + s.id) * 0.9 : 0; // face au vent, la toile faseye
    const belly = f * (rel >= -0.2 ? 6 + 5 * Math.max(0, rel) * wind[1] : -(3.5 + 2 * Math.abs(rel))) + flut;
    // les vergues sont brassées au vent (jusqu'à 30°) : les voiles carrées tournent autour du mât
    const brace = Math.max(-0.52, Math.min(0.52, lat * 0.6)) * Math.max(0.3, f);
    const sail = P.sail.map((c) => css(c)), dark = css(shade(P.sail[0], 0.7)), wood = '#3a220f', rope = 'rgba(30,20,12,0.38)';
    const line = (a, b, col, w = 1) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
    const bs = bowsprit(S), tip = pr(S.L / 2 + bs - 2, 0, 3);
    // le gréement dormant : haubans et étais
    for (const m of S.masts) {
      const top = pr(m.x, 0, m.h);
      for (const sd of [-1, 1]) { const hw = hullHalf(S, m.x - 6); line(top, pr(m.x - 6, sd * (hw - 1), 2), rope); }
    }
    if (bs) line(pr(S.masts[0].x, 0, S.masts[0].h * 0.92), tip, rope);
    // le foc (navires) : du beaupré au mât de misaine, gonflé sur le côté sous le vent
    if (bs && f > 0.05) {
      const m = S.masts[0], zt = m.h * 0.86, side = lat >= 0 ? 1 : -1, bl = f * (2 + 3 * Math.abs(lat));
      const a = tip, b = pr(m.x + 3, 0, zt), c2 = pr(m.x + 4, 0, m.h * 0.3 + (1 - f) * (zt - m.h * 0.3)), mid = pr((S.L / 2 + bs + m.x) / 2, side * bl * 2, zt * 0.45);
      ctx.fillStyle = sail[1]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(mid[0], mid[1] - 2, b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.quadraticCurveTo(mid[0], mid[1] + 2, a[0], a[1]); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const m of [...S.masts].sort((a, b) => a.x - b.x)) {
      const base = pr(m.x, 0, 0), top = pr(m.x, 0, m.h);
      line(base, top, wood, 2);
      line([base[0] + 0.5, base[1]], [top[0] + 0.5, top[1]], '#6d4626', 1);
      if (m.gaff) this.gaffSail(ctx, pr, m, f, lat, sail, dark, wood);
      else {
        const tiers = m.h >= 44 ? [[0.3, 0.6, 1], [0.63, 0.9, 0.78]] : [[0.24, 0.88, 1]];
        const prb = (lx, ly, z) => { const dx = lx - m.x, c = Math.cos(brace), sn = Math.sin(brace); return pr(m.x + dx * c - ly * sn, dx * sn + ly * c, z); };
        for (const [z0, z1, w] of tiers) this.squareSail(ctx, prb, m.x, m.s * w, m.h * z0, m.h * z1, f, belly, sail, dark, wood);
      }
      if (m.h >= 58 && S.masts.length > 1 && m === S.masts[1]) { const n = pr(m.x, 0, m.h * 0.93); ctx.fillStyle = '#3a220f'; ctx.beginPath(); ctx.ellipse(n[0], n[1], 3, 2, 0, 0, TAU); ctx.fill(); } // la hune
    }
    // le pavillon, au plus haut mât, qui flotte dans le sens du vent
    const tm = S.masts.reduce((b, m) => (m.h > b.h ? m : b), S.masts[0]), ft = pr(tm.x, 0, tm.h + 2);
    const wa = wind[0], dx = Math.cos(wa), dy = Math.sin(wa), L = S.shape === 'ship' ? 9 : 6;
    ctx.fillStyle = css(P.flag);
    ctx.beginPath(); ctx.moveTo(ft[0], ft[1]);
    for (let k = 1; k <= 3; k++) { const t = k / 3, w = Math.sin(now * 9 - k * 1.3 + s.id) * 1.2 * t; ctx.lineTo(ft[0] + dx * L * t - dy * w, ft[1] + dy * L * t * 0.6 + dx * w - 1.5 * (1 - t)); }
    for (let k = 3; k >= 1; k--) { const t = k / 3, w = Math.sin(now * 9 - k * 1.3 + s.id) * 1.2 * t; ctx.lineTo(ft[0] + dx * L * t - dy * w, ft[1] + dy * L * t * 0.6 + dx * w + 1.5 * (1 - t) + 1); }
    ctx.closePath(); ctx.fill();
    if (S.shape === 'ship') { ctx.fillStyle = 'rgba(240,236,220,0.9)'; ctx.fillRect(Math.round(ft[0] + dx * 3), Math.round(ft[1] + dy * 2), 1, 1); }
  },
  // une voile carrée : la vergue en travers, la toile qui descend avec la voilure et se gonfle vers l'avant
  squareSail(ctx, pr, mx, hs, z0, z1, f, belly, sail, dark, wood) {
    const TL = pr(mx, -hs, z1), TR = pr(mx, hs, z1);
    if (f < 0.06) { // ferlée : un rouleau de toile sur la vergue
      ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(TL[0], TL[1]); ctx.lineTo(TR[0], TR[1]); ctx.stroke();
      ctx.strokeStyle = sail[2]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(TL[0], TL[1] - 1); ctx.lineTo(TR[0], TR[1] - 1); ctx.stroke();
      return;
    }
    const zf = z1 - (z1 - z0) * f;
    // la toile en trois tons : l'ombre sous la vergue, le corps, la lumière au creux du ventre
    const shape = (w, za, zb, b) => {
      const tl = pr(mx, -w, za), tr = pr(mx, w, za), br = pr(mx + b * 0.55, w * 0.9, zb), bl = pr(mx + b * 0.55, -w * 0.9, zb);
      const cT = pr(mx + b * 0.7, 0, za + 1), cB = pr(mx + b * 2.1, 0, zb - 1), cR = pr(mx + b, w * 1.04, (za + zb) / 2), cL = pr(mx + b, -w * 1.04, (za + zb) / 2);
      ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.quadraticCurveTo(cT[0], cT[1], tr[0], tr[1]); ctx.quadraticCurveTo(cR[0], cR[1], br[0], br[1]); ctx.quadraticCurveTo(cB[0], cB[1], bl[0], bl[1]); ctx.quadraticCurveTo(cL[0], cL[1], tl[0], tl[1]);
      return [tl, tr, br, bl];
    };
    const h = z1 - zf;
    ctx.fillStyle = sail[0]; const [TL0, TR0, BR0, BL0] = shape(hs, z1, zf, belly); ctx.fill();
    ctx.fillStyle = sail[1]; shape(hs * 0.88, z1 - h * 0.07, zf + h * 0.06, belly * 1.18); ctx.fill();
    ctx.fillStyle = sail[2]; ctx.globalAlpha *= 0.85; shape(hs * 0.52, z1 - h * 0.22, zf + h * 0.22, belly * 1.4); ctx.fill(); ctx.globalAlpha /= 0.85;
    ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1;
    for (const t of [0.33, 0.66]) { const a2 = [TL0[0] + (TR0[0] - TL0[0]) * t, TL0[1] + (TR0[1] - TL0[1]) * t], c2 = [BL0[0] + (BR0[0] - BL0[0]) * t, BL0[1] + (BR0[1] - BL0[1]) * t]; ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke(); }
    ctx.strokeStyle = dark; shape(hs, z1, zf, belly); ctx.stroke();
    ctx.strokeStyle = wood; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(TL[0], TL[1]); ctx.lineTo(TR[0], TR[1]); ctx.stroke(); // la vergue
  },
  // une voile aurique (goélette) : dans l'axe du navire, gonflée sur le côté
  gaffSail(ctx, pr, m, f, lat, sail, dark, wood) {
    const z0 = m.h * 0.18, z1 = m.h * 0.86, side = lat >= 0 ? 1 : -1, bl = f * (2 + 4 * Math.abs(lat)) * side, len = m.s * 1.55;
    const zt = z0 + (z1 - z0) * Math.max(0.08, f);
    const a = pr(m.x - 1, 0, z0), b = pr(m.x - 1, 0, zt), c = pr(m.x - len, bl * 0.3, zt * 0.82 + z0 * 0.18), d = pr(m.x - len * 1.04, bl * 0.25, z0);
    const mid = pr(m.x - len * 0.5, bl * 1.6, (z0 + zt) / 2);
    if (f < 0.06) { ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); }
    else {
      ctx.fillStyle = sail[1]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.quadraticCurveTo(mid[0], mid[1] + 3, d[0], d[1]); ctx.quadraticCurveTo(mid[0], mid[1], a[0], a[1]); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = wood; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
    ctx.strokeStyle = wood; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); // la bôme
  },
  // les fanaux allumés la nuit
  shipLights(G) {
    const out = [];
    if (!G.ships) return out;
    for (const s of G.ships.values()) { if (s.sinkT) continue; const S = shipOf(s.kind); for (const [lx, ly] of S.lanterns) { const [x, y] = toWorld({ x: s.x, y: s.y, a: s.qa == null ? s.a : s.qa }, lx, ly); out.push([x, y - 4]); } }
    return out;
  },
  // un navire de monstres (ou d'alliés) : le même dessin, son cap tiré de sa course, son équipage de noyés
  drawNpcShip(ctx, e, kind, pal, camX, camY, now, G, crew) {
    const s = e.pship || (e.pship = { id: e.id, kind, pal, sail: 1, rud: 0, anc: 0, a: e.dir === 1 ? Math.PI : e.dir === 3 ? -Math.PI / 2 : e.dir === 0 ? Math.PI / 2 : 0, px: e.x, py: e.y, t: now });
    const dt = Math.min(0.1, now - s.t), dx = e.x - s.px, dy = e.y - s.py, sp = Math.hypot(dx, dy) / Math.max(1e-3, dt);
    s.t = now; s.px = e.x; s.py = e.y;
    if (Math.hypot(dx, dy) > 0.05) { let da = Math.atan2(dy, dx) - s.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; s.a += da * Math.min(1, dt * 2.5); s.rud = Math.max(-1, Math.min(1, da * 2)); }
    s.sp = (s.sp || 0) + (Math.min(200, sp) - (s.sp || 0)) * Math.min(1, dt * 3); s.u = s.sp;
    s.x = e.x; s.y = e.y; s.sinkT = e.dyingT || 0; s.buf = s.buf || [1];
    this.drawShipBody(ctx, s, camX, camY, now, dt);
    const S = shipOf(kind);
    if (crew && !s.sinkT) { const [hx, hy] = this.shipProj(s, S.helm + 6, 0, 0, camX, camY), c = Math.cos(s.a), sn = Math.sin(s.a), dir = Math.abs(c) > Math.abs(sn) ? (c < 0 ? 1 : 2) : (sn < 0 ? 3 : 0); ctx.drawImage(crew.cv, 0, dir * crew.fh, crew.fw, 21, Math.round(hx - crew.ax), Math.round(hy - 19), crew.fw, 21); }
    if (now - (e.hitT || -9) < 0.09) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(Math.round(e.x - camX), Math.round(e.y - camY), S.L * 0.45, S.B * 0.6, s.qa || 0, 0, TAU); ctx.fill(); ctx.restore(); }
    const sink = s.sinkT ? Math.min(1, (now - s.sinkT) / 4) : 0;
    ctx.save(); ctx.globalAlpha = 1 - sink; this.drawRig(ctx, s, S, PAL[pal] || PAL.barque, camX, camY + sink * sink * 18, now, G.wind || [0.6, 0.9]); ctx.restore();
  },
  // la bitte d'amarrage d'un quai d'armement : un fût de fonte, un cordage, et l'enseigne à l'ancre
  drawBerth(ctx, b, camX, camY, now) {
    const [bx, by] = [b.tx * 16 + 8, b.ty * 16 + 8], X = Math.round(bx - camX), Y = Math.round(by - camY);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(X + x, Y + y, w, h); };
    px(-3, -6, 6, 7, '#1d1c24'); px(-4, -7, 8, 2, '#2c2b36'); px(-2, -5, 2, 5, '#5a596b'); px(-4, -3, 8, 2, '#c8a870'); px(-4, -3, 8, 1, '#e0c890');
    // l'enseigne
    px(6, -22, 1, 22, '#4f321a'); px(2, -26, 10, 8, '#3a220f'); px(3, -25, 8, 6, '#8c5c33');
    const sw = Math.round(Math.sin(now * 1.3 + b.tx) * 0.6);
    px(6 + sw, -24, 1, 4, '#f2c14a'); px(5 + sw, -21, 3, 1, '#f2c14a'); px(4 + sw, -22, 1, 1, '#f2c14a'); px(8 + sw, -22, 1, 1, '#f2c14a'); px(5 + sw, -24, 3, 1, '#f2c14a');
  },
  // ------------------------------------------------------------------ effets : canonnade, chocs, ancre
  shipFx(G, kind, ev, now) {
    if (kind === 'cannon') {
      const [, , x, y, a, sid, i] = ev, s = G.ships && G.ships.get(sid);
      if (s) { s.recoil = s.recoil || {}; s.recoil[i] = now + 0.35; }
      this.burst(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 10, { z: 6, col: ['#fff6c0', '#ffb040', '#e0e0e0'], up: 10, speed: 40, life: 0.35, g: 0 });
      this.burst(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 14, { z: 6, col: ['#d8d8d8', '#a8a8a8', '#7c7c7c'], up: 14, speed: 16, life: 1.4, g: -12 });
      return true;
    }
    if (kind === 'crash') { const [, , x, y] = ev; this.burst(x, y, 18, { z: 4, col: ['#8c5c33', '#6d4626', '#c79357', '#ffffff'], up: 36, speed: 46, life: 0.9, g: 90 }); this.shake(4, 0.35); return true; }
    if (kind === 'splinter') { const [, , x, y] = ev; this.burst(x, y, 12, { z: 4, col: ['#8c5c33', '#6d4626', '#c79357'], up: 30, speed: 40, life: 0.8, g: 90 }); return true; }
    if (kind === 'anchor') {
      const [, , sid, down] = ev, s = G.ships && G.ships.get(sid);
      if (s && down) { const S = shipOf(s.kind), [x, y] = toWorld(s, S.L / 2 - 6, -hullHalf(S, S.L / 2 - 10) - 7); this.burst(x, y, 16, { z: 1, col: ['#ffffff', '#d8f6ff', '#9fd8ff'], up: 40, speed: 24, life: 0.8, g: 80 }); }
      return true;
    }
    if (kind === 'plank') return true;
    return false;
  },
};
