// 1.1 : les navires, dessinés dans tous les caps. La coque et le pont sont peints une fois (proue vers la
// droite), puis tournés ; le franc-bord se voit sous le pont (la coque a de la hauteur), la mâture et les
// voiles sont projetées en vraie perspective (plus c'est haut, plus c'est haut à l'écran) : les voiles se
// gonflent au vent arrière, faseyent et se plaquent au mât face au vent, la mâture gîte dans les virages et
// roule à la houle. Derrière : le sillage en V, l'écume de l'étrave ; à quai : la passerelle ; la nuit : les
// fanaux. Les coups de canon reculent, l'ancre descend dans un nuage d'écume.
//
// 1.9 : la refonte. Chaque modèle a son flanc peint rangée par rangée (liston, sabords et leurs mantelets,
// préceinte, fenêtres de poupe, carène cuivrée ou goudronnée, usure), un bastingage en relief, sa figure de
// proue, son pont et son gréement : voile au tiers de la barque, aurique et foc du sloop, brigantine du brick,
// deux focs de la goélette, trois étages et artimon latin du galion et de la Veuve, haillons du Spectre. Les
// dégâts se voient (trous, fumée, flammes, toile déchirée, mât brisé, gouvernail qui bat) ; le naufrage est
// progressif et laisse des débris qui flottent. Des matelots vivent à bord. Le pavillon, les voiles, le liston
// et les fanaux choisis par le capitaine se voient de tous.
import { PB, mix, shade } from './pixel.js';
import { shipOf, hullHalf, toWorld, stations, openingAt, gangway, RAIL, rigFactor } from '../../shared/data/ships.js';
import { ITEMS } from '../../shared/data/items.js';

const TAU = Math.PI * 2, K = 0.72; // une unité de hauteur = 0,72 px plus haut à l'écran
const STEPS = 128; // le cap affiché, par pas de 2,8° (des pixels qui restent nets)
const SINK_T = 4.3; // la durée du naufrage à l'écran (le serveur retire l'épave à 4,5 s)
const FB = { radeau: 2, barque: 3, sloop: 4, brick: 5, goelette: 5, spectre: 5, galion: 7, veuve: 7 }; // franc-bord
const css = (c, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
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
// 1.9 : l'identité de chaque modèle. rows : le flanc, du liston (juste sous le pont) à la flottaison — trim
// (liston), side, sideD, stripe (bande peinte), portL/portH (les sabords : mantelet puis gueule ; « 2 » pour la
// batterie basse), wale (préceinte), copper (carène doublée de cuivre), tar (carène goudronnée), rot, algae, log,
// clinker. win : les rangées des fenêtres de poupe. fig : la figure de proue. rail : la hauteur du bastingage.
const DESIGN = {
  radeau: { rows: ['log', 'logD'], wear: 0.3, rail: 0, deco: 'cargo', fig: '' },
  barque: { rows: ['trim', 'clinker', 'tar'], wear: 0.16, rail: 2, trim: 0xc79357, deco: 'net', fig: '' },
  sloop: { rows: ['trim', 'side', 'stripe', 'tar'], wear: 0.06, rail: 3, trim: 0xf0e8d0, stripe: 0xd8b04a, win: [2], winC: 0xd8b07a, deco: 'skylight', fig: 'volute' },
  brick: { rows: ['trim', 'portL', 'portH', 'side', 'copper'], wear: 0.07, rail: 3, trim: 0xe0c08a, band: 0xd8a83a, lid: 0x241008, win: [2, 3], winC: 0xe0c08a, deco: 'grates', fig: 'volute', spanker: 1, pennant: 0xe0c08a },
  goelette: { rows: ['trim', 'stripe', 'side', 'sideD', 'copper'], wear: 0.05, rail: 3, trim: 0xe8d0a0, stripe: 0xf4f0e4, win: [3], winC: 0xe8d0a0, deco: 'tarp', fig: 'oiseau', pennant: 0xf4f0e4 },
  spectre: { rows: ['trim', 'rot', 'rot', 'rot', 'algae'], wear: 0.4, rail: 3, trim: 0x7ab09a, win: [2, 3], winC: 0x9ad0b8, holes: 1, ghost: 1, deco: 'rot', fig: 'crane' },
  galion: { rows: ['trim', 'side', 'portL', 'portH', 'wale', 'portH2', 'copper'], wear: 0.05, rail: 4, castleRail: 8, foreRail: 6, trim: 0xf2c14a, lid: 0x9a2a1a, win: [2, 3, 4], winC: 0xf2c14a, deco: 'grates', fig: 'lion', emblem: 'soleil', pennant: 0xc23a34 },
  veuve: { rows: ['trim', 'portL', 'portH', 'wale', 'portL2', 'portH2', 'tar'], wear: 0.08, rail: 4, castleRail: 8, foreRail: 6, trim: 0xc23a34, lid: 0xc23a34, win: [2, 3], winC: 0xc23a34, deco: 'web', fig: 'veuve', emblem: 'crane', pennant: 0xc23a34 },
  // les navires de monstres
  noir: { rows: ['trim', 'side', 'side', 'tar'], wear: 0.2, rail: 3, trim: 0x5a4a3a, win: [2], winC: 0x5a4a3a, deco: 'skylight', fig: 'crane' },
  fantome: { rows: ['trim', 'rot', 'portH', 'rot', 'wale', 'rot', 'algae'], wear: 0.4, rail: 4, castleRail: 8, foreRail: 6, trim: 0x9ad0b8, win: [2, 3], winC: 0x9ad0b8, holes: 1, ghost: 1, deco: 'rot', fig: 'crane' },
};
export const designOf = (kind, pal) => DESIGN[pal] || DESIGN[kind] || DESIGN.barque;
// 1.9 : la personnalisation (voir LOOKS dans shared/data/ships.js)
const TRIMS = { bois: 0xab7643, or: 0xf2c14a, blanc: 0xf0e8d8, rouge: 0xc23a34, bleu: 0x3a6ab8, vert: 0x3a8a4a };
const SAILS = {
  nature: [0xb3a684, 0xd2c6a2, 0xe8dec0], ecru: [0xc8bc98, 0xe6dcbc, 0xfaf4e2], noir: [0x1a161c, 0x26222a, 0x3a3440],
  ecarlate: [0x9a2226, 0xc23a34, 0xe05a4a], azur: [0x2a5a8a, 0x3a7ab8, 0x6aa8d8], rayee: [0xc8bc98, 0xe6dcbc, 0xfaf4e2],
};
const FLAGS = { noir: 0x141418, sabres: 0x141418, ecarlate: 0xb02a26, blanc: 0xf2eee0, marchand: 0xc23a34 };
const LANTS = { ambre: ['#ffe08a', 'warm', 'warm'], rouge: ['#ff9a8a', 'red', 'red'], vert: ['#b0ffb8', 'green', 'green'], bleu: ['#b0d4ff', 'cold', 'cold'] };
const bowsprit = (S) => (S.shape === 'ship' ? Math.round(S.L * 0.14) : 0);
const hh = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const crewColor = (tag) => { let h = 7; for (const ch of String(tag || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return [0x2a5aa8, 0x2a8a4a, 0xa82a6a, 0xd8a03a, 0x6a3aa8, 0x2a9a9a, 0xb04a2a][h % 7]; };

// ------------------------------------------------------------------ la coque et le pont, peints une fois
function buildArt(kind, pal, trimKey) {
  const S = shipOf(kind), P = PAL[pal || kind] || PAL.barque, D = designOf(kind, pal), bs = bowsprit(S), F = FB[kind] || 4;
  const W = Math.ceil(S.L + bs + 8), H = Math.ceil(S.B + 8), cx = Math.floor(S.L / 2 + 4), cy = Math.floor(H / 2);
  const deck = new PB(W, H), shadow = new PB(W, H), wash = new PB(W, H), foam = new PB(W + 4, H + 4), sides = [];
  for (let k = 1; k <= F; k++) sides[k] = new PB(W, H);
  const rows = []; for (let k = 1; k <= F; k++) rows[k] = D.rows[Math.min(D.rows.length - 1, Math.round((k - 1) / Math.max(1, F - 1) * (D.rows.length - 1)))];
  const trim = (trimKey && TRIMS[trimKey]) || D.trim || P.rim, rim = trimKey && TRIMS[trimKey] ? TRIMS[trimKey] : P.rim;
  const main = S.masts.reduce((b, m) => (m.s > b.s ? m : b), S.masts[0]);
  // les sabords : ceux des canons, et la batterie basse des grands navires
  const ports1 = S.guns, ports2 = [];
  if (D.rows.some((r) => r.endsWith('2'))) for (let x = -S.L * 0.34; x <= S.L * 0.3; x += 15) if (S.guns.every((g) => Math.abs(g - x) > 7)) ports2.push(Math.round(x));
  const isPort = (list, lx) => list.some((g) => Math.abs(lx - g) < 2);
  const sideAt = (row, k, lx, ly, hw) => {
    const xi = Math.floor(lx + 300), wear = hh(xi, k * 31 + 5) < D.wear * 0.3, seam = xi % 11 === 0;
    if (S.shape === 'ship' && lx < -S.L / 2 + 2.6 && D.win && D.win.includes(k) && Math.abs(ly) < hw * 0.7) return (Math.floor(ly + 64) % 4) < 2 ? 0xf0c860 : (D.winC || trim); // les fenêtres de poupe
    let c;
    switch (row) {
      case 'trim': c = trim; break;
      case 'stripe': c = D.stripe || trim; break;
      case 'sideD': c = P.sideD; break;
      case 'wale': c = shade(P.sideD, 0.7); break;
      case 'tar': return wear ? 0x2c2018 : 0x1a1210;
      case 'copper': return hh(xi, k * 17) < 0.28 ? 0x4a8a6a : hh(xi + 3, k) < 0.5 ? 0xa8683a : 0x8a5430;
      case 'algae': return hh(xi, k * 7 + Math.floor(ly)) < 0.45 ? 0x2a5a3a : 0x1a3a2a;
      case 'log': case 'logD': { const t = Math.floor(lx + 64) % 6; c = t === 0 ? P.keel : t === 1 ? P.plankD : P.side; if (row === 'logD') c = shade(c, 0.7); break; }
      case 'clinker': c = seam ? P.sideD : shade(P.plankD, 0.85); break;
      case 'portL': case 'portL2': c = isPort(row === 'portL' ? ports1 : ports2, lx) ? (D.lid || P.sideD) : (D.band || P.side); break;
      case 'portH': case 'portH2': c = isPort(row === 'portH' ? ports1 : ports2, lx) ? 0x120a06 : (D.band || P.side); break;
      case 'rot': if (D.holes && hh(xi, k * 13 + Math.floor(ly + 64)) < 0.09) return -1; c = hh(xi, k * 5) < 0.3 ? 0x2a4a3a : P.side; break;
      default: c = P.side;
    }
    if (seam && row !== 'trim' && row !== 'clinker') c = shade(c, 0.88);
    if (wear) c = shade(c, 0.8);
    return c;
  };
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const lx = px - cx + 0.5, ly = py - cy + 0.5, hw = hullHalf(S, lx);
    if (hw <= 0.4 || Math.abs(ly) > hw) continue;
    shadow.set(px, py, P.sideD); wash.set(px, py, 0x3a7a9a);
    for (let k = 1; k <= F; k++) sides[k].set(px, py, sideAt(rows[k], k, lx, ly, hw));
    for (let k = 0; k < 9; k++) foam.set(px + 2 + (k % 3) - 1, py + 2 + ((k / 3) | 0) - 1, 0xffffff);
    const edge = hw - Math.abs(ly), op = !S.open && openingAt(S, lx);
    let c;
    if (S.shape === 'raft') { // des troncs liés en travers
      const xx = Math.floor(lx + 64), t = xx % 6;
      c = edge < 1 ? P.keel : t === 0 ? P.keel : t === 1 ? P.plankD : t === 3 ? P.rim : P.plank;
      if (Math.abs(Math.abs(ly) - hw * 0.55) < 0.8 && t !== 0) c = 0xd8c090; // la corde
      if (t !== 0 && hh(xx, Math.floor(ly + 64)) < D.wear * 0.15) c = shade(c, 0.8); // le bois qui grise
    } else if (edge < 1) c = P.keel;
    else if (edge < RAIL + 1 && !op) c = edge < 2 ? P.rimD : (hh(Math.floor(lx), 7) < 0.08 ? P.rimD : rim);
    else if (edge < RAIL + 1 && op) c = Math.abs(lx - op.x) > op.w / 2 - 1.5 ? P.rimD : P.plankD; // l'ouverture et ses montants
    else {
      const yy = Math.floor(ly + 64), row = Math.floor(yy / 3);
      c = yy % 3 === 0 ? P.plankD : row % 2 ? P.plank : shade(P.plank, 0.92);
      if (yy % 3 !== 0 && hh(row, Math.floor((lx + 300) / 19)) < 0.05 && Math.floor(lx + 300) % 19 === 0) c = P.plankD; // les abouts des bordages
      if (S.castle && lx < S.castle[1]) c = shade(c, 0.86);
      if (S.fore && lx > S.fore[0]) c = shade(c, 0.9);
      if (S.castle && Math.abs(lx - S.castle[1]) < 1) c = P.rimD; // la marche du gaillard d'arrière
      if (S.fore && Math.abs(lx - S.fore[0]) < 1) c = P.rimD;
      if (hh(Math.floor(lx + 300), yy * 3 + 1) < D.wear * 0.1) c = shade(c, 0.82); // l'usure
      if (D.holes) { const r = hh(Math.floor(lx * 0.5 + 300), Math.floor(ly * 0.5 + 64) + 77); if (r < 0.03) c = 0x0a1412; else if (r < 0.08) c = mix(c, 0x3a6a4a, 0.55); } // le pont pourri, la mousse
    }
    deck.set(px, py, c);
  }
  // le beaupré
  if (bs) for (let k = 0; k < bs; k++) { deck.set(cx + S.L / 2 - 2 + k, cy, P.rimD); deck.set(cx + S.L / 2 - 2 + k, cy - 1, k < bs - 2 ? P.keel : P.rimD); }
  const rect = (x0, y0, w, h, f) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = f(x, y, w, h); if (c != null) deck.set(cx + x0 + x, cy + y0 + y, c); } };
  // les bancs de la barque
  if (S.shape === 'boat') for (const bx of [-S.L * 0.18, S.L * 0.12]) for (let y = -S.B / 2 + 4; y < S.B / 2 - 4; y++) { deck.set(cx + bx, cy + y, P.rimD); deck.set(cx + bx + 1, cy + y, P.rim); }
  if (S.shape === 'ship') {
    const hx = Math.round(main.x - (S.masts.length > 1 ? 20 : 16)), hwid = Math.min(10, S.B * 0.24);
    if (D.deco === 'skylight') rect(hx - 4, -3, 8, 6, (x, y, w, h) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? P.rimD : x === w >> 1 ? P.keel : y === 1 ? 0x9ac0d8 : 0x4a6a88)); // la claire-voie du sloop
    else for (let y = -hwid / 2; y < hwid / 2; y++) for (let x = -5; x < 5; x++) deck.set(cx + hx + x, cy + y, (x + 5) % 3 === 0 || Math.floor(y + 20) % 3 === 0 ? P.keel : P.plankD);
    const deco = [[S.L * 0.3, 0.62], [-S.L * 0.12, -0.6], [S.L * 0.05, 0.6], [-S.L * 0.26, 0.58]];
    for (const [dx, k] of deco) { const hw = hullHalf(S, dx), y = Math.round(k * (hw - RAIL - 4)); deck.disc(cx + dx, cy + y, 2.3, 0x5a3418); deck.disc(cx + dx, cy + y, 1.2, 0x8a5a2a); deck.set(cx + dx - 1, cy + y - 1, 0xb07a3a); }
    const rope = [S.cap - 14, Math.round(hullHalf(S, S.cap - 14) * 0.42)];
    for (let a = 0; a < 18; a++) { const r = 1 + a / 9; deck.set(cx + rope[0] + Math.cos(a) * r, cy + rope[1] + Math.sin(a) * r, 0xd8c090); }
    // 1.9 : le pont propre à chaque modèle
    if (D.deco === 'grates') for (const gx of S.L > 150 ? [S.L * 0.16, -S.L * 0.1] : [S.L * 0.06]) rect(Math.round(gx) - 4, -3, 8, 6, (x, y) => ((x + y) % 2 ? P.keel : shade(P.plankD, 0.8)));
    if (D.deco === 'tarp') { const tx = Math.round((S.masts[0].x + S.masts[1].x) / 2); rect(tx - 7, -5, 14, 10, (x, y, w, h) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? P.keel : x % 5 === 2 ? 0x8a7a58 : hh(x, y) < 0.15 ? 0xb8ac88 : 0xc8bc98)); } // le grand panneau bâché de la goélette
    if (D.deco === 'web') { const mx = main.x, R = S.B * 0.4, wc = shade(P.plank, 1.45); for (let a = 0; a < 8; a++) for (let r = 4; r < R; r++) deck.set(cx + mx + Math.cos(a * TAU / 8) * r, cy + Math.sin(a * TAU / 8) * r * 0.9, wc); for (const rr of [R * 0.45, R * 0.8]) for (let t = 0; t < 64; t++) deck.set(cx + mx + Math.cos(t / 64 * TAU) * rr, cy + Math.sin(t / 64 * TAU) * rr * 0.9, wc); } // la toile d'araignée peinte de la Veuve
    if (S.castle) for (let y = -hullHalf(S, S.castle[1]) + RAIL + 1; y < hullHalf(S, S.castle[1]) - RAIL - 1; y++) deck.set(cx + S.castle[1], cy + y, D.trim || P.rimD); // la marche du gaillard, dorée
  }
  if (D.deco === 'cargo') { rect(-12, 6, 6, 6, (x, y, w, h) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 0x4f321a : x === y || x === w - 1 - y ? 0x6d4626 : 0x8c5c33)); deck.disc(cx + 10, cy - 9, 2.6, 0x4f321a); deck.disc(cx + 10, cy - 9, 1.8, 0x8c5c33); deck.set(cx + 8, cy - 9, 0x2c2b36); deck.set(cx + 12, cy - 9, 0x2c2b36); } // une caisse, un tonnelet
  if (D.deco === 'net') for (let k = 0; k < 40; k++) { const a = k * 2.4, r = 1 + (k % 5) * 0.7; deck.set(cx + 15 + Math.cos(a) * r, cy + 4 + Math.sin(a) * r * 0.8, k % 3 ? 0x8a8a7a : 0x5a5a4a); } // un filet roulé
  const c = (pb) => pb.toCanvas();
  return { deck: c(deck), sides: sides.map((pb) => pb && c(pb)), shadow: c(shadow), wash: c(wash), foam: c(foam), cx, cy, W, H };
}

export const shipRender = {
  shipArt(kind, pal, trim) { this._shipArt = this._shipArt || {}; const k = kind + ':' + (pal || kind) + ':' + (trim || ''); return this._shipArt[k] || (this._shipArt[k] = buildArt(kind, pal, trim)); },
  // le point local (lx, ly) à la hauteur z, à l'écran (avec la gîte et le roulis de la mâture)
  shipProj(s, lx, ly, z, camX, camY) {
    const lean = s.lean || 0, c = Math.cos(s.qa), sn = Math.sin(s.qa), y2 = ly + lean * z / 60;
    return [s.x + c * lx - sn * y2 - camX, s.y + sn * lx + c * y2 - camY - z * K + (s.bob || 0)];
  },
  // ------------------------------------------------------------------ sillage, coque, pont, accastillage
  drawShipsBase(ctx, G, camX, camY, now, dt) {
    this.drawDebris(ctx, G, camX, camY, now, dt); // 1.9 : ce qui flotte après un naufrage
    if (!G.ships) return;
    this.coach = G.player && G.player.ship && G.shipCoach ? { id: G.player.ship, k: G.shipCoach } : null; // lot 1 : le poste à rejoindre
    for (const s of G.ships.values()) { this.drawShipBody(ctx, s, camX, camY, now, dt); this.updateHands(G, s, now, dt, camX, camY); }
  },
  drawShipBody(ctx, s, camX, camY, now, dt) {
    const W = this.W, H = this.H;
    const S = shipOf(s.kind), P = PAL[s.pal || s.kind] || PAL.barque, D = designOf(s.kind, s.pal), look = s.look || null;
    const art = this.shipArt(s.kind, s.pal, look && look.trim), F = FB[s.kind] || 4, st = (this.weather && this.weather.storm) || 0;
    s.qa = Math.round(s.a / (TAU / STEPS)) * (TAU / STEPS);
    const maxV = (ITEMS[s.item] && ITEMS[s.item].boat.speed) || 140, sp = s.sp || 0;
    const sk = s.sinkT ? Math.min(1, (now - s.sinkT) / SINK_T) : 0;
    // la houle (plus forte dans l'orage), la gîte dans les virages, et le navire qui se couche en sombrant
    s.bob = Math.round(Math.sin(now * 1.6 + s.id * 1.7) * (0.6 + st * 1.4) * 2) / 2;
    s.lean = clamp(-(s.rud || 0) * Math.min(1, Math.max(0, s.u || 0) / (0.5 * maxV)) * 4, -6, 6) + Math.sin(now * 1.25 + s.id) * (0.9 + st * 2.2) + sk * sk * 16 * (s.id % 2 ? 1 : -1);
    this.shipWake(s, S, now, dt, sp);
    const X = s.x - camX, Y = s.y - camY;
    if (X < -S.L - 60 || X > W + S.L + 60 || Y < -S.L - 60 || Y > H + S.L + 60) return;
    if (sk && !s.wrecked) { s.wrecked = 1; this.spawnDebris(s, S, Math.round(6 + S.L / 12), now); }
    this.drawWake(ctx, s, S, camX, camY, now, sp, st);
    const fade = sk > 0.55 ? 1 - (sk - 0.55) / 0.45 : 1, drop = sk * sk * 10;
    ctx.save();
    ctx.globalAlpha = fade * (D.ghost ? 0.82 : 1);
    const put = (cv, dx, dy, a = 1) => { if (!cv) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(Math.round(X + dx), Math.round(Y + dy + s.bob + drop)); ctx.rotate(s.qa + sk * 0.25); ctx.drawImage(cv, -art.cx - (cv === art.foam ? 2 : 0), -art.cy - (cv === art.foam ? 2 : 0)); ctx.restore(); };
    // l'ombre dans l'eau, l'écume à la flottaison, le franc-bord (rangée par rangée), le pont
    put(art.shadow, 3, F + 3, 0.28 * (1 - sk));
    put(art.foam, 0, F + 1, 0.18 + Math.min(0.4, sp / maxV * 0.5) + sk * 0.35);
    const Fv = Math.max(0, Math.ceil(F * (1 - sk * 0.95))); // en sombrant, la flottaison monte
    for (let k = Fv; k >= 1; k--) put(art.sides[k], 0, k);
    put(art.deck, 0, 0);
    if (sk > 0.15) put(art.wash, 0, 0, Math.min(0.75, (sk - 0.15) * 1.2)); // l'eau envahit le pont
    if (D.ghost && this.darkNow > 0.2) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.18 + 0.08 * Math.sin(now * 2 + s.id)) * this.darkNow; ctx.drawImage(this.glows.green, Math.round(X - S.L * 0.6), Math.round(Y - S.B), Math.round(S.L * 1.2), Math.round(S.B * 2)); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    if (!sk) this.drawShipFixtures(ctx, s, S, P, D, camX, camY, now);
    // la passerelle, à quai
    if (sp < 14 && !sk) {
      if (!s.gwAt || now > s.gwAt) { s.gwAt = now + 0.5; s.gw = gangway(this.world, S, s, -1); const g2 = gangway(this.world, S, s, 1); if (g2 && (!s.gw || g2.gap < s.gw.gap)) s.gw = g2; }
      if (s.gw && s.gw.gap <= 26) this.drawGangway(ctx, s, S, s.gw, camX, camY);
    } else s.gw = null;
    if (sk && Math.random() < 0.9) this.burst(s.x + (Math.random() - 0.5) * S.L * 0.7, s.y + (Math.random() - 0.5) * S.B * 0.6, 2, { z: 1, col: ['#ffffff', '#d8f6ff', '#9fd8ff'], up: 30 + sk * 30, speed: 18, life: 0.7, g: 70 });
    if (sk > 0.3 && sk < 0.95 && Math.random() < 0.25) this.addFx({ kind: 'ring', x: s.x + (Math.random() - 0.5) * S.L * 0.5, y: s.y + (Math.random() - 0.5) * S.B * 0.5, r: 6 + Math.random() * 10, dur: 0.8, col: 'rgba(220,245,255,A)', w: 1 }); // les remous de l'épave
  },
  shipWake(s, S, now, dt, sp) {
    s.wk = s.wk || [];
    while (s.wk.length && now - s.wk[0].t > 3.4) s.wk.shift();
    if (sp > 6 && !s.sinkT && (!s.wkAt || now > s.wkAt)) {
      s.wkAt = now + 0.06;
      const [x, y] = toWorld({ x: s.x, y: s.y, a: s.a }, -S.L / 2 + 3, 0);
      s.wk.push({ x, y, t: now, sp, a: s.a, b: S.B });
    }
    // 1.9 : les remous du virage — l'eau brassée par le gouvernail, côté extérieur
    s.sw = s.sw || [];
    while (s.sw.length && now - s.sw[0].t > 1.6) s.sw.shift();
    const rud = s.rud || 0;
    if (Math.abs(rud) > 0.35 && sp > 18 && !s.sinkT && (!s.swAt || now > s.swAt)) {
      s.swAt = now + 0.14;
      const [x, y] = toWorld({ x: s.x, y: s.y, a: s.a }, -S.L / 2 + 4, Math.sign(rud) * S.B * 0.35);
      s.sw.push({ x, y, t: now, r0: 2 + Math.random() * 2, k: Math.min(1, sp / 80) });
    }
  },
  drawWake(ctx, s, S, camX, camY, now, sp, st = 0) {
    // le sillage : deux bras d'écume qui s'écartent en V, et l'eau brassée juste derrière la poupe
    const wk = s.wk || [];
    ctx.lineCap = 'round';
    for (let i = 1; i < wk.length; i++) {
      const w0 = wk[i - 1], w1 = wk[i], age = now - w1.t, k = 1 - age / 3.4;
      if (k <= 0 || Math.hypot(w1.x - w0.x, w1.y - w0.y) > 60) continue;
      const al = k * Math.min(1, w1.sp / 45);
      const at = (w, sd) => { const ag = now - w.t, sp2 = w.b * 0.3 + ag * (6 + w.sp * 0.06) + Math.sin(w.t * 11 + sd * 2) * (0.6 + ag * 0.5), nx = -Math.sin(w.a), ny = Math.cos(w.a); return [w.x + nx * sp2 * sd - camX, w.y + ny * sp2 * sd - camY + 2]; };
      ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(236,250,255,${(al * 0.48).toFixed(3)})`; ctx.lineWidth = age < 0.8 ? (w1.sp > 90 ? 3 : 2) : 1;
      for (const sd of [-1, 1]) { const [x0, y0] = at(w0, sd), [x1, y1] = at(w1, sd); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      if (age < 1.6) { ctx.lineCap = 'butt'; ctx.strokeStyle = `rgba(210,240,255,${(al * 0.26 * (1 - age / 1.6)).toFixed(3)})`; ctx.lineWidth = Math.max(1, w1.b * 0.35 * (1 - age / 1.6) * (0.7 + Math.min(0.6, w1.sp / 150))); ctx.beginPath(); ctx.moveTo(w0.x - camX, w0.y - camY + 2); ctx.lineTo(w1.x - camX, w1.y - camY + 2); ctx.stroke(); }
    }
    ctx.lineCap = 'butt';
    // 1.9 : les remous du virage
    for (const w of s.sw || []) { const ag = (now - w.t) / 1.6, r = w.r0 + ag * 7; ctx.strokeStyle = `rgba(230,250,255,${((1 - ag) * 0.45 * w.k).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(Math.round(w.x - camX), Math.round(w.y - camY) + 2, r, r * 0.5, 0, ag * 3, ag * 3 + 4.2); ctx.stroke(); }
    // l'écume de l'étrave
    if (sp > 10 && !s.sinkT) {
      const len = Math.min(18, sp * 0.1), [bx, by] = toWorld({ x: s.x, y: s.y, a: s.qa }, S.L / 2 - 2, 0), c = Math.cos(s.qa), sn = Math.sin(s.qa), fb = FB[s.kind] || 4;
      ctx.strokeStyle = `rgba(240,252,255,${Math.min(0.7, sp / 120).toFixed(2)})`; ctx.lineWidth = sp > 70 ? 2 : 1;
      for (const sd of [-1, 1]) {
        const hw = hullHalf(S, S.L / 2 - len), ex = bx - c * len + -sn * (hw + 3) * sd, ey = by - sn * len + c * (hw + 3) * sd;
        ctx.beginPath(); ctx.moveTo(Math.round(bx - camX) + 0.5, Math.round(by - camY + fb) + 0.5); ctx.lineTo(Math.round(ex - camX) + 0.5, Math.round(ey - camY + fb) + 0.5); ctx.stroke();
      }
      if (Math.random() < sp / 160) this.burst(bx, by + 3, 1, { z: 2, col: ['#ffffff', '#d8f6ff'], up: 10 + sp * 0.06, speed: 12, life: 0.5, g: 40 });
      // 1.9 : la gerbe d'étrave quand le navire tape dans la vague (plus souvent dans l'orage, et lancé)
      if (sp > 35 && Math.random() < (sp / 200) * (0.05 + st * 0.22)) { this.burst(bx, by + 2, 7 + Math.round(st * 6), { z: 3, col: ['#ffffff', '#e8f8ff', '#bfe6ff'], up: 40 + sp * 0.25, speed: 26, life: 0.8, g: 100 }); s.bob -= 1; }
    }
  },
  drawShipFixtures(ctx, s, S, P, D, camX, camY, now) {
    const pr = (lx, ly, z = 0) => this.shipProj(s, lx, ly, z, camX, camY);
    const px = (x, y, c, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    const st = stations(S), look = s.look || {};
    // 1.9 : les trous des boulets (autant que la coque en a encaissé), leur fumée, et les flammes quand elle cède
    const hf = s.hmax ? Math.max(0, s.hull || 0) / s.hmax : 1, holes = s.holes || [];
    const nh = Math.min(holes.length, Math.ceil(holes.length * Math.min(1, (1 - hf) * 1.6)));
    for (let i = 0; i < nh; i++) {
      const h = holes[i], [x, y] = pr(h.lx, h.ly, 0);
      px(x - 2, y - 1, '#120a06', 4, 2); px(x - 1, y - 2, '#120a06', 2, 4); px(x - 3, y, css(P.plankD), 1, 1); px(x + 2, y - 2, '#c79357', 1, 1); px(x - 2, y + 2, '#c79357', 1, 1);
      if (hf < 0.4 && Math.random() < (0.4 - hf) * 0.5) this.smoke(x + camX, y + camY - 2, 1, hf < 0.2 ? 'rgba(36,30,34,0.6)' : 'rgba(70,64,66,0.45)', { z: 6, size: 3, life: 1.8, spread: 3 });
      if (hf < 0.2 && i % 2 === 0) {
        if (Math.random() < 0.6) this.burst(x + camX, y + camY, 1, { z: 3, col: ['#fff2a0', '#ffd24a', '#ff8a2a', '#ff5a1a'], up: 26, speed: 6, life: 0.45, g: -30 });
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + 0.25 * Math.sin(now * 17 + i); ctx.drawImage(this.glows.warm, Math.round(x - 9), Math.round(y - 12), 18, 18); ctx.restore();
      }
    }
    // les canons (et leur recul)
    for (const g of st) if (g.k === 'gun') {
      const rec = s.recoil && s.recoil[g.i] > now ? (s.recoil[g.i] - now) / 0.35 * 4 : 0, sd = g.side;
      const [bx, by] = pr(g.at[0], g.at[1] - sd * (2 + rec)), [mx, my] = pr(g.at[0], g.at[1] + sd * (7 - rec));
      ctx.strokeStyle = '#1d1c24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(mx, my); ctx.stroke();
      ctx.strokeStyle = '#5a596b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by - 1); ctx.lineTo(mx, my - 1); ctx.stroke();
      const [cx2, cy2] = pr(g.at[0], g.at[1] - sd * 3); px(cx2 - 2, cy2 - 1, '#4f321a', 4, 3);
      if (s.gunAt && now - (s.gunAt[g.i] || -9) < 2.4) { const [ex, ey] = pr(g.at[0], g.at[1] + sd * 8, 1); if (Math.random() < 0.3) this.smoke(ex + camX, ey + camY, 1, 'rgba(200,200,200,0.35)', { z: 4, size: 2, life: 1.2 }); } // la gueule fume encore
    }
    // 1.9 : l'établi du charpentier, la table des cartes, la longue-vue, le banc
    for (const e of st) {
      if (e.k === 'fix') { const [x, y] = pr(e.at[0], e.at[1], 1); if (S.shape === 'ship') { px(x - 4, y - 2, '#3a220f', 8, 4); px(x - 4, y - 3, '#8c5c33', 8, 1); px(x - 3, y - 4, '#c79357', 3, 1); px(x + 1, y - 5, '#5a596b', 1, 2); px(x + 2, y - 5, '#8c5c33', 1, 1); } else { px(x - 3, y - 1, '#4f321a', 6, 3); px(x - 3, y - 2, '#8c5c33', 6, 1); px(x, y - 3, '#5a596b', 1, 1); } }
      else if (e.k === 'carte') { const [x, y] = pr(e.at[0], e.at[1], 2); px(x - 4, y - 2, '#3a220f', 8, 4); px(x - 3, y - 3, '#e8dcb8', 6, 3); px(x - 2, y - 2, '#a8885a', 2, 1); px(x + 1, y - 3, '#c23a34', 1, 1); }
      else if (e.k === 'vigie') { const [x, y] = pr(e.at[0], e.at[1], 3); px(x, y - 2, '#4f321a', 1, 4); px(x - 2, y - 3, '#c8a050', 4, 1); px(x + 2, y - 3, '#5a596b', 1, 1); }
      else if (e.k === 'banc') { const [x, y] = pr(e.at[0] - 4, e.at[1], 1), [x2, y2] = pr(e.at[0] + 4, e.at[1], 1); ctx.strokeStyle = '#6d4626'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); }
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
    // 1.9 : le safran, derrière l'étambot — il suit la barre, et bat quand le gouvernail est touché
    if (S.shape !== 'raft') {
      const dr = s.drud || 0, jit = dr > 0.3 ? Math.sin(now * 23 + s.id) * dr * 0.7 : 0, an = -(s.rud || 0) * 0.55 + jit, Lr = dr > 0.55 ? 3 : 5;
      const a0 = pr(-S.L / 2 + 1, 0, 0), a1 = pr(-S.L / 2 + 1 - Math.cos(an) * Lr, Math.sin(an) * Lr, 0);
      ctx.strokeStyle = dr > 0.3 ? '#5a3a1c' : '#3a220f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a0[0], a0[1] + 2); ctx.lineTo(a1[0], a1[1] + 2); ctx.stroke();
      if (dr > 0.3 && Math.random() < dr * 0.04) this.burst(a1[0] + camX, a1[1] + camY + 2, 2, { z: 2, col: ['#8c5c33', '#c79357'], up: 18, speed: 14, life: 0.5, g: 80 });
    }
    // 1.9 : les avirons — rangés le long du bord, ou qui souquent quand l'équipage rame
    const rowing = !!((s.fl || 0) & 4);
    if (S.shape === 'boat' || (rowing && S.shape === 'ship')) {
      const xs = S.shape === 'boat' ? [-S.L * 0.15, S.L * 0.15] : [-S.L * 0.22, 0, S.L * 0.22];
      ctx.strokeStyle = '#8c5c33'; ctx.lineWidth = 1;
      xs.forEach((ox, i) => {
        for (const sd of [-1, 1]) {
          const hw = hullHalf(S, ox), ph = now * 4.2 + i * 0.4;
          let a, b;
          if (rowing) { const sw = Math.sin(ph) * 6, dip = Math.cos(ph); a = pr(ox - sw * 0.3, sd * (hw - 4), 3); b = pr(ox - sw, sd * (hw + 11), dip > 0 ? 0 : 2); if (dip > 0.9 && Math.random() < 0.3) this.burst(b[0] + camX, b[1] + camY + 1, 2, { z: 1, col: ['#ffffff', '#d8f6ff'], up: 16, speed: 10, life: 0.4, g: 70 }); }
          else { a = pr(ox - 9, sd * (hw - 4), 2); b = pr(ox + 9, sd * (hw - 4), 2); }
          ctx.strokeStyle = '#8c5c33'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          if (rowing) px(b[0] - 1, b[1] - 1, '#c79357', 2, 2);
        }
      });
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
    // 1.9 : le bastingage en relief — des montants, une lisse ; plus haut sur les châteaux
    if (D.rail) {
      const trimC = css((look.trim && TRIMS[look.trim]) || D.trim || P.rim), postC = css(P.rimD), step = S.L > 120 ? 8 : 6;
      const zAt = (lx) => (S.castle && lx < S.castle[1] ? D.castleRail || D.rail : S.fore && lx > S.fore[0] ? D.foreRail || D.rail : D.rail);
      ctx.lineWidth = 1;
      for (const sd of [-1, 1]) {
        let prev = null;
        const posts = [], rails = [];
        for (let lx = -S.L / 2 + 2; lx <= S.L / 2 - 4; lx += step) {
          if (openingAt(S, lx) && !S.open) { prev = null; continue; }
          const hw = hullHalf(S, lx) - 1, z = zAt(lx), b = pr(lx, sd * hw, 0), t = pr(lx, sd * hw, z);
          posts.push([b, t]);
          if (prev) { if (prev[2] !== z) rails.push([prev[1], pr(lx, sd * hw, prev[2])], [pr(lx, sd * hw, prev[2]), t]); else rails.push([prev[1], t]); } // une marche quand le château commence
          prev = [b, t, z];
        }
        if (prev) { const tip = pr(S.L / 2 - 2, 0, D.foreRail || D.rail); rails.push([prev[1], tip]); }
        ctx.strokeStyle = postC; ctx.beginPath(); for (const [b, t] of posts) { ctx.moveTo(Math.round(b[0]) + 0.5, Math.round(b[1])); ctx.lineTo(Math.round(t[0]) + 0.5, Math.round(t[1])); } ctx.stroke();
        ctx.strokeStyle = trimC; ctx.beginPath(); for (const [a, b] of rails) { ctx.moveTo(Math.round(a[0]) + 0.5, Math.round(a[1]) + 0.5); ctx.lineTo(Math.round(b[0]) + 0.5, Math.round(b[1]) + 0.5); } ctx.stroke();
      }
      const zs = S.castle ? D.castleRail || D.rail : D.rail, hs = hullHalf(S, -S.L / 2 + 2) - 1, l0 = pr(-S.L / 2 + 2, -hs, zs), l1 = pr(-S.L / 2 + 2, hs, zs); // la lisse du tableau arrière
      ctx.strokeStyle = trimC; ctx.beginPath(); ctx.moveTo(l0[0], l0[1]); ctx.lineTo(l1[0], l1[1]); ctx.stroke();
    }
    // 1.9 : la figure de proue
    if (D.fig) {
      const [fx0, fy0] = pr(S.L / 2 + 1, 0, 4), fx = Math.round(fx0), fy = Math.round(fy0);
      if (D.fig === 'volute') { px(fx - 1, fy - 1, '#f2c14a', 2, 2); px(fx + 1, fy, '#a86e1c'); px(fx, fy + 1, '#a86e1c'); }
      else if (D.fig === 'oiseau') { px(fx - 2, fy, '#f4f0e4', 5, 1); px(fx - 1, fy - 1, '#f4f0e4', 3, 1); px(fx, fy + 1, '#a8a090'); px(fx + 1, fy - 2, '#f2c14a'); }
      else if (D.fig === 'lion') { px(fx - 2, fy - 2, '#a86e1c', 4, 4); px(fx - 1, fy - 1, '#f2c14a', 3, 3); px(fx, fy, '#6a3a0a'); px(fx + 1, fy - 1, '#ffe08a'); }
      else if (D.fig === 'crane') { px(fx - 1, fy - 2, '#e8e4d0', 3, 3); px(fx - 1, fy - 1, '#0a1a18'); px(fx + 1, fy - 1, '#0a1a18'); px(fx, fy + 1, '#c8c4b0'); if (this.darkNow > 0.2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * this.darkNow; ctx.drawImage(this.glows.green, fx - 6, fy - 7, 12, 12); ctx.restore(); } }
      else if (D.fig === 'veuve') { px(fx - 1, fy - 3, '#e8d8c8', 2, 1); px(fx - 1, fy - 2, '#14080a', 2, 4); px(fx - 2, fy - 1, '#14080a', 1, 3); px(fx, fy - 1, '#c23a34'); }
    }
    // lot 1 : le poste à rejoindre pour partir (un anneau doré qui pulse)
    if (this.coach && this.coach.id === s.id) {
      const sc = stations(S).find((q) => q.k === this.coach.k);
      if (sc) { const [cx, cy] = pr(sc.at[0], sc.at[1], 1), r = 7 + Math.sin(now * 5) * 1.5; ctx.strokeStyle = `rgba(255,210,74,${(0.65 + 0.3 * Math.sin(now * 5)).toFixed(2)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.75, 0, 0, TAU); ctx.stroke(); }
    }
    // les fanaux, pendus à leur potence : ils se balancent avec la houle (1.9 : de la couleur choisie)
    const dark = this.darkNow || 0, LC = LANTS[look.lant] || LANTS.ambre, stm = (this.weather && this.weather.storm) || 0;
    for (const [lx, ly] of S.lanterns) {
      const [x, y] = pr(lx, ly, 9), sw = Math.round(Math.sin(now * 2.2 + s.id + lx) * (1 + stm * 1.5) + (s.lean || 0) * 0.3);
      px(x, y - 3, '#2c2010', 1, 3); px(x, y - 3, '#2c2010', 2 + Math.max(0, sw), 1);
      const lx2 = x + sw; px(lx2 - 1, y, '#2c2010', 3, 4); px(lx2, y + 1, dark > 0.25 ? LC[0] : '#c8a050', 1, 2); px(lx2 - 1, y - 1, '#5a4020', 3, 1);
    }
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
      const S = shipOf(s.kind), P = PAL[s.kind] || PAL.barque, D = designOf(s.kind, s.pal);
      if (s.qa == null) continue;
      const X = s.x - camX, Y = s.y - camY;
      if (X < -S.L - 80 || X > this.W + S.L + 80 || Y < -40 || Y > this.H + S.L + 140) continue;
      const sk = s.sinkT ? Math.min(1, (now - s.sinkT) / SINK_T) : 0, fade = sk > 0.45 ? Math.max(0, 1 - (sk - 0.45) / 0.5) : 1;
      ctx.save();
      ctx.globalAlpha = (G.player && G.player.ship === s.id ? 0.78 : 1) * fade * (D.ghost ? 0.78 : 1);
      this.drawRig(ctx, s, S, PAL[s.pal || s.kind] || P, camX, camY + sk * sk * 18, now, wind);
      ctx.restore();
    }
  },
  drawRig(ctx, s, S, P, camX, camY, now, wind) {
    const D = designOf(s.kind, s.pal), look = s.look || {};
    if (look.sail && SAILS[look.sail]) P = { ...P, sail: SAILS[look.sail] }; // 1.9 : les voiles choisies
    if (s.cos) P = { ...P, sail: s.cos.s || P.sail, flag: s.cos.f ?? P.flag }; // lot 6 : les voiles et le pavillon du festival
    const pr = (lx, ly, z) => this.shipProj(s, lx, ly, z, camX, camY);
    const f = Math.max(0, Math.min(1, s.sail == null ? 0 : s.sail)), rel = Math.cos(wind[0] - s.a), lat = Math.sin(wind[0] - s.a);
    const stm = (this.weather && this.weather.storm) || 0;
    const flut = f > 0.05 && rel < -0.35 ? Math.sin(now * 17 + s.id) * (0.9 + stm) : stm > 0.3 ? Math.sin(now * 11 + s.id) * stm * 0.8 : 0; // face au vent, la toile faseye (et dans l'orage, elle claque)
    const belly = f * (rel >= -0.2 ? 6 + 5 * Math.max(0, rel) * wind[1] : -(3.5 + 2 * Math.abs(rel))) + flut;
    // les vergues sont brassées au vent (jusqu'à 30°) : les voiles carrées tournent autour du mât
    const brace = Math.max(-0.52, Math.min(0.52, lat * 0.6)) * Math.max(0.3, f);
    const sail = P.sail.map((c) => css(c)), dark = css(shade(P.sail[0], 0.7)), wood = '#3a220f', rope = 'rgba(30,20,12,0.38)';
    const line = (a, b, col, w = 1) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
    const sag = (a, b, col, k) => { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2 + k, (a[1] + b[1]) / 2 + 1 + Math.abs(k) * 0.5, b[0], b[1]); ctx.stroke(); };
    // 1.9 : la toile déchirée (dégâts de voilure, ou les haillons du Spectre), un mât brisé quand elle est en lambeaux
    const tear = Math.max(s.dsail || 0, D.ghost ? 0.42 : 0), stripes = look.sail === 'rayee';
    const tall = S.masts.reduce((b, m, i) => (m.h > S.masts[b].h ? i : b), 0), broken = !D.ghost && (s.dsail || 0) > 0.6 ? tall : -1;
    const bs = bowsprit(S), tip = pr(S.L / 2 + bs - 2, 0, 3);
    // le gréement dormant : haubans et étais (ils ondulent un peu au vent, beaucoup dans l'orage)
    S.masts.forEach((m, mi) => {
      const top = pr(m.x, 0, m.h * (mi === broken ? 0.6 : 1)), sw = Math.sin(now * 2.6 + s.id + m.x) * (0.3 + stm * 1.6);
      for (const sd of [-1, 1]) { const hw = hullHalf(S, m.x - 6); sag(top, pr(m.x - 6, sd * (hw - 1), 2), rope, sw * sd); }
    });
    if (bs) line(pr(S.masts[0].x, 0, S.masts[0].h * 0.92), tip, rope);
    // les focs : du beaupré au mât de misaine, gonflés sur le côté sous le vent (deux pour la goélette)
    if (bs && f > 0.05) {
      const m = S.masts[0], side = lat >= 0 ? 1 : -1, bl = f * (2 + 3 * Math.abs(lat));
      for (let j = 0; j < (S.jibs || 1); j++) {
        const zt = m.h * (0.86 - j * 0.2), a = j ? pr(S.L / 2 + bs * 0.45, 0, 3) : tip, b = pr(m.x + 3, 0, zt), c2 = pr(m.x + 4 + j * 3, 0, m.h * 0.3 + (1 - f) * (zt - m.h * 0.3)), mid = pr((S.L / 2 + bs * (j ? 0.45 : 1) + m.x) / 2, side * bl * 2, zt * 0.45);
        ctx.fillStyle = sail[j ? 2 : 1]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(mid[0], mid[1] - 2, b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.quadraticCurveTo(mid[0], mid[1] + 2, a[0], a[1]); ctx.fill();
        ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
        if (tear > 0.3) this.rips(ctx, [a, b, c2, mid], tear, s.id * 7 + j, 1);
      }
    }
    S.masts.map((m, i) => [m, i]).sort((a, b) => a[0].x - b[0].x).forEach(([m, mi]) => {
      const top = mi === broken ? 0.6 : 1, base = pr(m.x, 0, 0), mt = pr(m.x, 0, m.h * top);
      line(base, mt, wood, 2);
      line([base[0] + 0.5, base[1]], [mt[0] + 0.5, mt[1]], '#6d4626', 1);
      if (mi === broken) { // le mât brisé : un moignon déchiqueté, la vergue qui pend, un lambeau de toile
        ctx.fillStyle = '#c79357'; ctx.fillRect(Math.round(mt[0]) - 1, Math.round(mt[1]) - 2, 1, 2); ctx.fillRect(Math.round(mt[0]) + 1, Math.round(mt[1]) - 1, 1, 1);
        const y0 = pr(m.x, 0, m.h * 0.56), y1 = pr(m.x - 5, m.s * 0.8, m.h * 0.28); line(y0, y1, wood, 2);
        ctx.fillStyle = sail[0]; ctx.beginPath(); ctx.moveTo(y0[0], y0[1]); ctx.lineTo(y1[0], y1[1]); ctx.lineTo((y0[0] + y1[0]) / 2 + 2, (y0[1] + y1[1]) / 2 + 5); ctx.fill();
      }
      if (m.lug) this.lugSail(ctx, pr, m, f, lat, sail, dark, wood, tear, s.id + mi);
      else if (m.lateen) this.lateenSail(ctx, pr, m, f, lat, sail, dark, wood, tear, s.id + mi);
      else if (m.gaff) this.gaffSail(ctx, pr, m, f * (mi === broken ? 0.55 : 1), lat, sail, dark, wood, tear, s.id + mi);
      else {
        if (D.spanker && m === S.masts[S.masts.length - 1]) this.gaffSail(ctx, pr, { x: m.x, s: m.s * 0.72, h: m.h * 0.82 }, f, lat, sail, dark, wood, tear, s.id + 9); // la brigantine du brick
        const tiers = m.h >= 58 ? [[0.22, 0.48, 1], [0.51, 0.74, 0.84], [0.77, 0.93, 0.62]] : m.h >= 44 ? [[0.3, 0.6, 1], [0.63, 0.9, 0.78]] : [[0.24, 0.88, 1]];
        const prb = (lx, ly, z) => { const dx = lx - m.x, c = Math.cos(brace), sn = Math.sin(brace); return pr(m.x + dx * c - ly * sn, dx * sn + ly * c, z); };
        tiers.forEach(([z0, z1, w], ti) => {
          if (z1 > top + 0.02) return;
          const cn = this.squareSail(ctx, prb, m.x, m.s * w, m.h * z0, m.h * z1, f, belly, sail, dark, wood, tear, s.id * 13 + mi * 5 + ti, stripes);
          if (cn && ti === 0) { // les écoutes, de la voile basse au bastingage
            const hw = hullHalf(S, m.x - 10) - 1; sag(cn[3], pr(m.x - 10, -hw, 3), rope, flut * 0.6); sag(cn[2], pr(m.x - 10, hw, 3), rope, flut * 0.6);
            if (D.emblem && mi === tall && f > 0.5) this.emblem(ctx, D.emblem, cn);
          }
        });
      }
      if (m.h >= 58 && S.masts.length > 1 && m === S.masts[1] && top === 1) { const n = pr(m.x, 0, m.h * 0.93); ctx.fillStyle = '#3a220f'; ctx.beginPath(); ctx.ellipse(n[0], n[1], 3, 2, 0, 0, TAU); ctx.fill(); } // la hune
      // 1.9 : une flamme (un long fanion) en tête des autres mâts des grands navires
      if (D.pennant && mi !== tall && top === 1) {
        const ft = pr(m.x, 0, m.h + 1), wa = wind[0], dx = Math.cos(wa), dy = Math.sin(wa) * 0.6;
        ctx.strokeStyle = css(D.pennant); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ft[0], ft[1]);
        for (let k = 1; k <= 4; k++) { const t = k / 4, w = Math.sin(now * 8 - k * 1.4 + s.id + mi) * 1.3 * t; ctx.lineTo(ft[0] + dx * 11 * t - dy * w, ft[1] + dy * 11 * t + dx * w); }
        ctx.stroke();
      }
    });
    // le pavillon, au plus haut mât, qui flotte dans le sens du vent (1.9 : celui que le capitaine a choisi)
    const tm = S.masts[tall], ft = pr(tm.x, 0, tm.h * (broken === tall ? 0.6 : 1) + 2);
    const wa = wind[0], dx = Math.cos(wa), dy = Math.sin(wa), L = S.shape === 'ship' ? 9 : 6, fk = s.cos ? '' : look.flag || '';
    const fcol = fk === 'equipage' ? crewColor(s.cw || s.own) : FLAGS[fk] ?? P.flag;
    const at = (t, off) => { const w = Math.sin(now * (9 + stm * 6) - t * 3 * 1.3 + s.id) * (1.2 + stm) * t; return [ft[0] + dx * L * t - dy * w, ft[1] + dy * L * t * 0.6 + dx * w + off]; };
    const flagPoly = (o0, o1) => { ctx.beginPath(); for (let k = 0; k <= 3; k++) { const q = at(k / 3, o0 * (1 - k / 3)); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } for (let k = 3; k >= 0; k--) { const q = at(k / 3, o1 * (1 - k / 3) + 1); ctx.lineTo(q[0], q[1]); } ctx.closePath(); ctx.fill(); };
    ctx.fillStyle = css(fcol); flagPoly(-1.5, 1.5);
    if (fk === 'marchand') { ctx.fillStyle = 'rgba(242,238,224,0.95)'; flagPoly(-0.3, 0.1); }
    if (S.shape === 'ship' && (!fk || fk === 'noir')) { const q = at(0.4, 0); ctx.fillStyle = 'rgba(240,236,220,0.95)'; ctx.fillRect(Math.round(q[0]), Math.round(q[1]) - 1, 2, 2); ctx.fillRect(Math.round(q[0]), Math.round(q[1]) + 1, 1, 1); }
    if (fk === 'sabres') { const a = at(0.2, -1), b = at(0.75, 1.5), c = at(0.2, 1.5), d = at(0.75, -1); line(a, b, 'rgba(240,236,220,0.95)'); line(c, d, 'rgba(240,236,220,0.95)'); }
    // lot 6 : une guirlande de lampions ou de fanions, du beaupré au plus haut mât
    if (s.cos && s.cos.d) {
      const a = bs ? tip : pr(S.L / 2 - 4, 0, 3), b = pr(tm.x, 0, tm.h * 0.95), n = 9, cols = ['#e8564a', '#f2c14a', '#5a8ad6', '#7ae07a', '#e88aff'];
      for (let i = 1; i < n; i++) {
        const t = i / n, x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 3);
        ctx.fillStyle = cols[(i + s.id) % cols.length];
        if (s.cos.d === 'fanions') { ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y); ctx.lineTo(x, y + 3); ctx.fill(); }
        else { ctx.fillRect(x - 1, y, 2, 2); if (this.darkNow > 0.3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * this.darkNow; ctx.drawImage(this.glows.warm, x - 6, y - 5, 12, 12); ctx.restore(); } }
      }
    }
  },
  // 1.9 : des déchirures dans la toile (des fentes sombres, des trous où l'on voit la mer), ou ses haillons
  rips(ctx, cn, tear, seed, sc = 1) {
    const [TL, TR, BR, BL] = cn;
    const n = Math.min(5, Math.floor((tear - 0.1) * 7 * sc));
    for (let i = 0; i < n; i++) {
      const t = 0.15 + 0.7 * hh(seed, i), u = 0.2 + 0.6 * hh(seed + 7, i), p = lerp2(lerp2(TL, TR, t), lerp2(BL, BR, t), u);
      ctx.strokeStyle = 'rgba(24,18,14,0.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[0], p[1] - 2); ctx.lineTo(p[0] + 1, p[1]); ctx.lineTo(p[0] - 1, p[1] + 2); ctx.lineTo(p[0], p[1] + 4); ctx.stroke();
      if (i % 2) { ctx.fillStyle = 'rgba(20,40,56,0.6)'; ctx.fillRect(Math.round(p[0]) - 1, Math.round(p[1]) + 1, 2, 2); }
    }
    if (tear > 0.4) for (let k = 0; k < 5; k++) { const t = 0.1 + k * 0.2, b = lerp2(BL, BR, t + hh(seed, k) * 0.08); ctx.fillStyle = 'rgba(20,40,56,0.55)'; ctx.beginPath(); ctx.moveTo(b[0] - 2, b[1] + 1); ctx.lineTo(b[0] + 2, b[1] + 1); ctx.lineTo(b[0], b[1] - 2 - hh(seed + 3, k) * 3); ctx.fill(); } // le bas en haillons
  },
  // 1.9 : l'emblème peint au milieu de la grand-voile (le soleil d'or du galion, le crâne de la Veuve)
  emblem(ctx, kind, cn) {
    const c = lerp2(lerp2(cn[0], cn[1], 0.5), lerp2(cn[3], cn[2], 0.5), 0.5), x = Math.round(c[0]), y = Math.round(c[1]);
    if (kind === 'soleil') { ctx.fillStyle = 'rgba(214,160,40,0.9)'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillRect(x - 1, y - 4, 2, 8); ctx.fillRect(x - 4, y - 1, 8, 2); ctx.fillStyle = 'rgba(255,224,138,0.9)'; ctx.fillRect(x - 1, y - 1, 2, 2); }
    else { ctx.fillStyle = 'rgba(236,228,208,0.92)'; ctx.fillRect(x - 2, y - 3, 5, 4); ctx.fillRect(x - 1, y + 1, 3, 2); ctx.fillStyle = 'rgba(20,8,10,0.95)'; ctx.fillRect(x - 1, y - 2, 1, 1); ctx.fillRect(x + 1, y - 2, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
  },
  // une voile carrée : la vergue en travers, la toile qui descend avec la voilure et se gonfle vers l'avant
  squareSail(ctx, pr, mx, hs, z0, z1, f, belly, sail, dark, wood, tear = 0, seed = 0, stripes = false) {
    const TL = pr(mx, -hs, z1), TR = pr(mx, hs, z1);
    if (f < 0.06) { // ferlée : un rouleau de toile sur la vergue
      ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(TL[0], TL[1]); ctx.lineTo(TR[0], TR[1]); ctx.stroke();
      ctx.strokeStyle = sail[2]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(TL[0], TL[1] - 1); ctx.lineTo(TR[0], TR[1] - 1); ctx.stroke();
      return null;
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
    if (stripes) { // 1.9 : les voiles rayées
      ctx.save(); shape(hs, z1, zf, belly); ctx.clip(); ctx.strokeStyle = 'rgba(178,40,36,0.8)'; ctx.lineWidth = Math.max(2, hs * 0.2);
      for (const t of [0.17, 0.5, 0.83]) { const a2 = lerp2(TL0, TR0, t), c2 = lerp2(BL0, BR0, t); ctx.beginPath(); ctx.moveTo(a2[0], a2[1] - 2); ctx.lineTo(c2[0], c2[1] + 3); ctx.stroke(); }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1;
    for (const t of [0.33, 0.66]) { const a2 = [TL0[0] + (TR0[0] - TL0[0]) * t, TL0[1] + (TR0[1] - TL0[1]) * t], c2 = [BL0[0] + (BR0[0] - BL0[0]) * t, BL0[1] + (BR0[1] - BL0[1]) * t]; ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke(); }
    ctx.strokeStyle = dark; shape(hs, z1, zf, belly); ctx.stroke();
    if (tear > 0.25) this.rips(ctx, [TL0, TR0, BR0, BL0], tear, seed);
    ctx.strokeStyle = wood; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(TL[0], TL[1]); ctx.lineTo(TR[0], TR[1]); ctx.stroke(); // la vergue
    return [TL0, TR0, BR0, BL0];
  },
  // une voile aurique (goélette, sloop) : dans l'axe du navire, gonflée sur le côté
  gaffSail(ctx, pr, m, f, lat, sail, dark, wood, tear = 0, seed = 0) {
    const z0 = m.h * 0.18, z1 = m.h * 0.86, side = lat >= 0 ? 1 : -1, bl = f * (2 + 4 * Math.abs(lat)) * side, len = m.s * 1.55;
    const zt = z0 + (z1 - z0) * Math.max(0.08, f);
    const a = pr(m.x - 1, 0, z0), b = pr(m.x - 1, 0, zt), c = pr(m.x - len, bl * 0.3, zt * 0.82 + z0 * 0.18), d = pr(m.x - len * 1.04, bl * 0.25, z0);
    const mid = pr(m.x - len * 0.5, bl * 1.6, (z0 + zt) / 2);
    if (f < 0.06) { ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); }
    else {
      ctx.fillStyle = sail[1]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.quadraticCurveTo(mid[0], mid[1] + 3, d[0], d[1]); ctx.quadraticCurveTo(mid[0], mid[1], a[0], a[1]); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo((b[0] + c[0]) / 2, (b[1] + c[1]) / 2); ctx.lineTo((a[0] + d[0]) / 2, (a[1] + d[1]) / 2 + 2); ctx.stroke(); // une laize
      ctx.strokeStyle = wood; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); // la corne
      if (tear > 0.25) this.rips(ctx, [b, c, d, a], tear, seed, 0.8);
    }
    ctx.strokeStyle = wood; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); // la bôme
  },
  // 1.9 : la voile au tiers de la barque — une vergue oblique hissée en avant du mât, plus haute à l'arrière
  lugSail(ctx, pr, m, f, lat, sail, dark, wood, tear = 0, seed = 0) {
    const side = lat >= 0 ? 1 : -1, bl = f * (2 + 4 * Math.abs(lat)) * side, len = m.s * 1.5, z0 = m.h * 0.12, zt = m.h * (0.26 + 0.6 * Math.max(0.1, f));
    const throat = pr(m.x + 5, 0, zt), peak = pr(m.x - len * 0.85, bl * 0.4, zt + m.h * 0.14);
    if (f < 0.06) { ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(throat[0], throat[1]); ctx.lineTo(peak[0], peak[1]); ctx.stroke(); }
    else {
      const tack = pr(m.x + 4, 0, z0), clew = pr(m.x - len, bl * 0.35, z0 + 1), mid = pr(m.x - len * 0.45, bl * 1.5, (z0 + zt) / 2);
      ctx.fillStyle = sail[1]; ctx.beginPath(); ctx.moveTo(tack[0], tack[1]); ctx.lineTo(throat[0], throat[1]); ctx.lineTo(peak[0], peak[1]); ctx.quadraticCurveTo(mid[0], mid[1] + 2, clew[0], clew[1]); ctx.quadraticCurveTo(mid[0], mid[1] + 1, tack[0], tack[1]); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = sail[2]; ctx.globalAlpha *= 0.7; ctx.beginPath(); ctx.moveTo(throat[0], throat[1]); ctx.lineTo(mid[0], mid[1]); ctx.lineTo(tack[0], tack[1]); ctx.fill(); ctx.globalAlpha /= 0.7;
      if (tear > 0.25) this.rips(ctx, [throat, peak, clew, tack], tear, seed, 0.7);
    }
    ctx.strokeStyle = wood; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(throat[0], throat[1]); ctx.lineTo(peak[0], peak[1]); ctx.stroke(); // la vergue
  },
  // 1.9 : l'artimon latin du galion et de la Veuve — une longue antenne en biais, basse devant, haute derrière
  lateenSail(ctx, pr, m, f, lat, sail, dark, wood, tear = 0, seed = 0) {
    const side = lat >= 0 ? 1 : -1, bl = f * (2 + 4 * Math.abs(lat)) * side, len = m.s * 1.6;
    const fore = pr(m.x + len * 0.45, 0, m.h * 0.3), aft = pr(m.x - len * 0.75, 0, m.h * 1.02);
    if (f >= 0.06) {
      const clew = pr(m.x - len * 0.5, bl * 0.4, m.h * 0.2 + (1 - f) * m.h * 0.45), mid = pr(m.x - len * 0.2, bl * 1.6, m.h * 0.48);
      ctx.fillStyle = sail[1]; ctx.beginPath(); ctx.moveTo(fore[0], fore[1]); ctx.lineTo(aft[0], aft[1]); ctx.quadraticCurveTo(mid[0] - 2, mid[1], clew[0], clew[1]); ctx.quadraticCurveTo(mid[0], mid[1] + 3, fore[0], fore[1]); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo((fore[0] + aft[0]) / 2, (fore[1] + aft[1]) / 2); ctx.lineTo(clew[0], clew[1]); ctx.stroke();
      if (tear > 0.25) this.rips(ctx, [fore, aft, clew, mid], tear, seed, 0.7);
    } else { ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fore[0], fore[1]); ctx.lineTo(aft[0], aft[1]); ctx.stroke(); }
    ctx.strokeStyle = wood; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fore[0], fore[1]); ctx.lineTo(aft[0], aft[1]); ctx.stroke(); // l'antenne
  },
  // les fanaux allumés la nuit (1.9 : de leur couleur), et le feu à bord d'un navire qui brûle
  shipLights(G) {
    const out = [];
    if (!G.ships) return out;
    for (const s of G.ships.values()) {
      if (s.sinkT) continue;
      const S = shipOf(s.kind), LC = LANTS[(s.look && s.look.lant) || 'ambre'] || LANTS.ambre, sh = { x: s.x, y: s.y, a: s.qa == null ? s.a : s.qa };
      for (const [lx, ly] of S.lanterns) { const [x, y] = toWorld(sh, lx, ly); out.push([x, y - 4, LC[1], LC[2]]); }
      if (s.hmax && (s.hull || 0) / s.hmax < 0.2 && s.holes && s.holes.length) { const h = s.holes[0], [x, y] = toWorld(sh, h.lx, h.ly); out.push([x, y - 6, 'fire', 'warm']); }
    }
    return out;
  },
  // ------------------------------------------------------------------ 1.9 : les débris qui flottent
  spawnDebris(s, S, n, now, small = false) {
    const D = this.debris || (this.debris = []), P = PAL[s.pal || s.kind] || PAL.barque, vx = s.vx || 0, vy = s.vy || 0;
    for (let i = 0; i < n; i++) {
      const [x, y] = toWorld({ x: s.x, y: s.y, a: s.a || 0 }, (Math.random() - 0.5) * S.L * 0.8, (Math.random() - 0.5) * S.B * 0.7), a = Math.random() * TAU, v = 4 + Math.random() * (small ? 8 : 16);
      const kind = small ? 'plank' : ['plank', 'plank', 'plank', 'barrel', 'crate', 'spar', 'cloth', 'plank'][i % 8];
      D.push({ x, y, vx: Math.cos(a) * v + vx * 0.1, vy: Math.sin(a) * v + vy * 0.1, a: Math.random() * TAU, va: (Math.random() - 0.5) * 0.6, kind, t0: now, life: small ? 8 + Math.random() * 4 : 22 + Math.random() * 12, id: Math.random() * 100, col: kind === 'cloth' ? P.sail[1] : P.plank });
    }
    if (D.length > 90) D.splice(0, D.length - 90);
  },
  drawDebris(ctx, G, camX, camY, now, dt) {
    const D = this.debris; if (!D || !D.length) return;
    const wa = (G.wind && G.wind[0]) || 0, wx = Math.cos(wa) * 3, wy = Math.sin(wa) * 3;
    for (let i = D.length - 1; i >= 0; i--) {
      const d = D[i], age = now - d.t0;
      if (age > d.life) { D.splice(i, 1); continue; }
      d.vx += (wx - d.vx) * Math.min(1, dt * 0.5); d.vy += (wy - d.vy) * Math.min(1, dt * 0.5); d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.va * dt;
      const X = d.x - camX, Y = d.y - camY + Math.sin(now * 2 + d.id) * 0.7;
      if (X < -20 || Y < -20 || X > this.W + 20 || Y > this.H + 20) continue;
      ctx.save(); ctx.globalAlpha = Math.min(1, (d.life - age) / 3, age * 3); ctx.translate(Math.round(X), Math.round(Y)); ctx.rotate(d.kind === 'barrel' ? 0 : d.a);
      if (d.kind === 'plank') { ctx.fillStyle = '#34200f'; ctx.fillRect(-4, -1, 8, 3); ctx.fillStyle = css(d.col); ctx.fillRect(-4, -1, 7, 2); }
      else if (d.kind === 'spar') { ctx.fillStyle = '#3a220f'; ctx.fillRect(-7, -1, 14, 2); ctx.fillStyle = '#6d4626'; ctx.fillRect(-7, -1, 14, 1); }
      else if (d.kind === 'barrel') { ctx.fillStyle = '#4f321a'; ctx.fillRect(-2, -3, 5, 6); ctx.fillStyle = '#8c5c33'; ctx.fillRect(-1, -3, 3, 6); ctx.fillStyle = '#2c2b36'; ctx.fillRect(-2, -2, 5, 1); ctx.fillRect(-2, 1, 5, 1); }
      else if (d.kind === 'crate') { ctx.fillStyle = '#4f321a'; ctx.fillRect(-3, -3, 6, 6); ctx.fillStyle = '#8c5c33'; ctx.fillRect(-2, -2, 4, 4); ctx.fillStyle = '#6d4626'; ctx.fillRect(-2, -1, 4, 1); }
      else { ctx.fillStyle = css(d.col, 0.85); ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(4, -1); ctx.lineTo(2, 3); ctx.lineTo(-3, 2); ctx.fill(); }
      ctx.restore();
      if (Math.random() < dt * 0.6) this.addFx({ kind: 'ring', x: d.x, y: d.y + 1, r: 5, dur: 0.9, col: 'rgba(220,245,255,A)', w: 1 });
    }
  },
  // ------------------------------------------------------------------ 1.9 : les matelots du bord
  // De simples figurants (côté client) : ils vont d'un coin du pont à l'autre, halent aux drisses, virent au
  // cabestan, servent les pièces pendant un combat, guettent à la proue, s'assoient au mouillage, et lâchent
  // parfois une phrase selon ce qui se passe. Ils évitent les postes tenus par des pirates.
  updateHands(G, s, now, dt, camX, camY) {
    const S = shipOf(s.kind), n = s.sinkT || s.race ? 0 : S.hands || 0;
    if (!n) { s.handsF = null; return; }
    const D = designOf(s.kind, s.pal);
    if (!s.handsF) {
      s.handsF = [];
      for (let i = 0; i < n; i++) {
        const r = (k) => hh(s.id * 7 + i, k);
        const look = { skin: Math.floor(r(1) * 4), hair: Math.floor(r(2) * 5), hairStyle: ['court', 'queue', 'long'][Math.floor(r(3) * 3)], top: r(4) < 0.6 ? 'chemise' : 'tablier', topCol: ['white', 'navy', 'red', 'brown', 'teal'][Math.floor(r(5) * 5)], pants: r(6) < 0.5 ? 'navy' : 'brown', boots: 'brown' };
        const hat = ['bandana', 'foulard', '', 'bandana'][Math.floor(r(7) * 4)]; if (hat) { look.hat = hat; look.hatCol = ['red', 'navy', 'orange', 'white'][Math.floor(r(8) * 4)]; }
        if (r(9) < 0.35) { look.beard = 1; look.beardCol = look.hair; }
        const sp0 = this.handSpots(S)[i % Math.max(1, this.handSpots(S).length)] || { x: 0, y: 0 };
        s.handsF.push({ k: 'f', id: -(80000 + s.id * 8 + i), look, lookKey: JSON.stringify(look), deck: true, ghost: !!D.ghost, lx: sp0.x, ly: sp0.y, x: s.x, y: s.y, dir: 0, moving: false, walk: 0, until: 0, i, ship: s.id });
      }
    }
    const busy = [];
    if (G.player && G.player.ship === s.id) busy.push([G.player.lx || 0, G.player.ly || 0]);
    for (const e of G.ents.values()) if (e.k === 'p' && e.ship === s.id) busy.push([e.lx || 0, e.ly || 0]);
    const sp = s.sp || 0, fight = s.gunAt && Object.values(s.gunAt).some((t) => now - t < 8), anchored = (s.anc || 0) >= 200 && (s.sail || 0) < 0.1;
    const spots = this.handSpots(S), taken = new Set();
    const sh = { x: s.x, y: s.y, a: s.qa == null ? s.a : s.qa };
    const dirOf = (wa) => { const c = Math.cos(wa), sn = Math.sin(wa); return Math.abs(c) > Math.abs(sn) ? (c < 0 ? 1 : 2) : (sn < 0 ? 3 : 0); };
    for (const h of s.handsF) {
      const free = (q) => busy.every(([x, y]) => Math.hypot(x - q.x, y - q.y) > 12) && !taken.has(q);
      if (!h.spot || now > h.until || !free(h.spot)) {
        const want = fight ? ['gun', 'gun', 'fix'] : anchored ? ['scrub', 'sit', 'coil', 'vigie'] : ['sails', 'cap', 'vigie', 'coil', 'scrub'];
        const pool = spots.filter((q) => want.includes(q.job) && free(q));
        h.spot = pool.length ? pool[Math.floor(hh(Math.floor(now * 3) + h.i * 17, s.id) * pool.length)] : null;
        h.until = now + 7 + hh(h.i, Math.floor(now)) * 9;
      }
      if (h.spot) taken.add(h.spot);
      const g = h.spot || { x: h.lx, y: h.ly, job: 'idle' }, dx = g.x - h.lx, dy = g.y - h.ly, d = Math.hypot(dx, dy);
      h.moving = d > 1.2;
      if (h.moving) {
        const v = Math.min(d, 28 * dt); h.lx += dx / d * v; h.ly += dy / d * v; h.walk += v / 70;
        h.dir = dirOf(sh.a + Math.atan2(dy, dx)); h.sitUntil = 0;
      } else if (g.job === 'sit') h.sitUntil = now + 1;
      else {
        if (g.face) { h.faceA = sh.a + Math.atan2(g.face[1] - h.ly, g.face[0] - h.lx); h.dir = dirOf(h.faceA); }
        if (['sails', 'cap', 'scrub', 'coil', 'gun', 'fix'].includes(g.job) && now - (h.atkT || 0) > (g.job === 'scrub' ? 0.5 : 0.9)) { h.atkT = now; h.atkA = h.faceA || 0; }
      }
      [h.x, h.y] = toWorld(sh, h.lx, h.ly);
      h.vis = h.x > camX - 30 && h.x < camX + this.W + 30 && h.y > camY - 30 && h.y < camY + this.H + 40;
    }
    // une phrase de temps en temps, selon ce qui se passe (seulement si l'on est tout près)
    if (!s.chatAt) s.chatAt = now + 12 + Math.random() * 30;
    if (now > s.chatAt) {
      s.chatAt = now + 28 + Math.random() * 40;
      const me = G.player, near = me && Math.hypot(me.x - s.x, me.y - s.y) < 220, h = s.handsF[Math.floor(Math.random() * s.handsF.length)];
      if (near && h && h.vis && !G.cine) {
        const wa = (G.wind && G.wind[0]) || 0, rf = rigFactor(S, s.a || 0, wa), stm = (this.weather && this.weather.storm) || 0;
        const say = (a) => a[Math.floor(Math.random() * a.length)];
        const txt = (s.fl || 0) & 1 ? say(['On prend l’eau !', 'Aux pompes, les gars !'])
          : fight ? say(['Rechargez !', 'Aux pièces !', 'Feu à volonté !', 'Ils vont goûter du boulet !'])
          : (s.drud || 0) > 0.3 ? say(['Le gouvernail répond plus !', 'Le safran est touché, cap’taine !'])
          : (s.dsail || 0) > 0.3 ? say(['La toile est en lambeaux !', 'À l’établi, qu’on rapièce !'])
          : stm > 0.4 ? say(['Tenez bon la barre !', 'Ça va secouer…', 'Amenez de la toile !'])
          : anchored ? say(['On lève quand, cap’taine ?', 'Le rhum est au frais.', 'Fichu calme.', 'Elle tire sur son ancre, la belle.'])
          : sp > 30 && rf >= 0.9 ? say(['Belle brise, cap’taine !', 'Ça porte bien !', 'Elle file comme une mouette.'])
          : sp > 10 && rf < 0.55 ? say(['On remonte au près… ça tire.', 'Faudrait tirer un bord, cap’taine.'])
          : (this.darkNow || 0) > 0.5 ? say(['Ouvrez l’œil, la nuit est noire.', 'Les fanaux sont allumés.']) : say(['À vos ordres !', 'Rien à l’horizon.', 'Ohé, du pont !']);
        this.addFx({ kind: 'bubble', text: txt, follow: () => h, dur: 2.6, h: 40 });
      }
    }
  },
  // les coins du pont où travaillent les matelots (et ce qu'ils y regardent)
  handSpots(S) {
    if (S._hs) return S._hs;
    const out = [], st = stations(S), main = S.masts.reduce((b, m) => (m.s > b.s ? m : b), S.masts[0]);
    const add = (x, y, job, face) => { if (Math.abs(y) < hullHalf(S, x) - RAIL - 6) out.push({ x, y, job, face }); };
    for (const m of S.masts) { add(m.x - 7, -6, 'sails', [m.x, 0]); add(m.x - 7, 6, 'sails', [m.x, 0]); }
    add(S.cap - 8, 6, 'cap', [S.cap, 0]); add(S.cap + 2, -7, 'cap', [S.cap, 0]);
    for (const g of st) if (g.k === 'gun') add(g.x - 6, g.y, 'gun', g.at);
    for (const e of st) if (e.k === 'vigie') add(e.x, e.y, 'vigie', [S.L, e.y * 3]); else if (e.k === 'fix') add(e.x + 6, e.y, 'fix', e.at); else if (e.k === 'banc') add(e.x, e.y, 'sit', null);
    for (const t of [-0.3, -0.1, 0.12, 0.3]) add(S.L * t, (t > 0 ? 1 : -1) * Math.min(8, S.B * 0.18), 'scrub', [S.L * t + 6, 0]);
    add(main.x + 12, -8, 'coil', [main.x + 14, -12]); add(-S.L * 0.2, 9, 'coil', [-S.L * 0.2 + 2, 13]);
    return (S._hs = out);
  },
  // un navire de monstres (ou d'alliés) : le même dessin, son cap tiré de sa course, son équipage de noyés
  drawNpcShip(ctx, e, kind, pal, camX, camY, now, G, crew) {
    const s = e.pship || (e.pship = { id: e.id, kind, pal, sail: 1, rud: 0, anc: 0, a: e.dir === 1 ? Math.PI : e.dir === 3 ? -Math.PI / 2 : e.dir === 0 ? Math.PI / 2 : 0, px: e.x, py: e.y, t: now });
    const dt = Math.min(0.1, now - s.t), dx = e.x - s.px, dy = e.y - s.py, sp = Math.hypot(dx, dy) / Math.max(1e-3, dt);
    s.t = now; s.px = e.x; s.py = e.y;
    if (Math.hypot(dx, dy) > 0.05) { let da = Math.atan2(dy, dx) - s.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; s.a += da * Math.min(1, dt * 2.5); s.rud = Math.max(-1, Math.min(1, da * 2)); }
    s.sp = (s.sp || 0) + (Math.min(200, sp) - (s.sp || 0)) * Math.min(1, dt * 3); s.u = s.sp;
    s.x = e.x; s.y = e.y; s.sinkT = e.dyingT || 0; s.buf = s.buf || [1];
    // 1.9 : un navire ennemi montre aussi ses blessures (sa vie tient lieu de coque)
    if (e.hp != null && e.k === 'm') { // (le serveur l'envoie en pour cent)
      s.hull = e.hp; s.hmax = 100;
      if (e.hitT && e.hitT !== s.lastHit) { s.lastHit = e.hitT; const S0 = shipOf(kind); (s.holes = s.holes || []).push({ lx: (Math.random() - 0.5) * S0.L * 0.6, ly: (Math.random() - 0.5) * S0.B * 0.4 }); if (s.holes.length > 12) s.holes.shift(); }
      s.dsail = Math.min(0.5, Math.max(0, 1 - e.hp / 100) * 0.6);
    }
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
  // ------------------------------------------------------------------ effets : canonnade, chocs, ancre, réparations
  shipFx(G, kind, ev, now) {
    if (kind === 'cannon') {
      const [, , x, y, a, sid, i] = ev, s = G.ships && G.ships.get(sid);
      if (s) { s.recoil = s.recoil || {}; s.recoil[i] = now + 0.35; s.gunAt = s.gunAt || {}; s.gunAt[i] = now; }
      this.burst(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 10, { z: 6, col: ['#fff6c0', '#ffb040', '#e0e0e0'], up: 10, speed: 40, life: 0.35, g: 0 });
      this.burst(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 14, { z: 6, col: ['#d8d8d8', '#a8a8a8', '#7c7c7c'], up: 14, speed: 16, life: 1.4, g: -12 });
      this.smoke(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 6, 'rgba(225,225,225,0.5)', { z: 6, size: 4, life: 2.2, spread: 6 }); // 1.9 : le nuage de la bordée
      this.addFx({ kind: 'flash', x: x + Math.cos(a) * 8, y: y + Math.sin(a) * 8 - 6, r: 9, dur: 0.1 });
      return true;
    }
    if (kind === 'crash') { const [, , x, y] = ev; this.burst(x, y, 18, { z: 4, col: ['#8c5c33', '#6d4626', '#c79357', '#ffffff'], up: 36, speed: 46, life: 0.9, g: 90 }); this.shake(4, 0.35); return true; }
    if (kind === 'splinter') { // 1.9 : l'impact — éclats, fumée, un trou qui reste sur le pont, une planche à l'eau
      const [, , x, y, sid, lx, ly] = ev, s = sid && G.ships && G.ships.get(sid);
      this.burst(x, y, 16, { z: 4, col: ['#8c5c33', '#6d4626', '#c79357', '#e8d0a0'], up: 34, speed: 46, life: 0.85, g: 90 });
      this.smoke(x, y, 4, 'rgba(90,80,80,0.5)', { z: 4, size: 3, life: 1.1, spread: 4 });
      if (s && lx != null) {
        const S = shipOf(s.kind), hx = clamp(lx, -S.L / 2 + 6, S.L / 2 - 8), hw = Math.max(1, hullHalf(S, hx) - 5);
        (s.holes = s.holes || []).push({ lx: hx, ly: clamp(ly, -hw, hw) });
        if (s.holes.length > 14) s.holes.shift();
        if (Math.random() < 0.6) this.spawnDebris({ x, y, a: s.a, pal: s.pal, kind: s.kind, vx: 0, vy: 0 }, { L: 10, B: 6 }, 1, now, true);
        if (G.player && G.player.ship === sid) this.shake(2.5, 0.25);
      }
      return true;
    }
    if (kind === 'fix') { // 1.9 : le charpentier au travail — copeaux, sciure, un petit anneau vert
      const [, , x, y] = ev;
      this.burst(x, y - 4, 8, { z: 4, col: ['#c79357', '#e8d0a0', '#8c5c33'], up: 24, speed: 18, life: 0.6, g: 80 });
      this.addFx({ kind: 'ring', x, y, r: 12, dur: 0.6, col: 'rgba(150,240,140,A)', w: 1 });
      return true;
    }
    if (kind === 'anchor') {
      const [, , sid, down] = ev, s = G.ships && G.ships.get(sid);
      if (s && down) { const S = shipOf(s.kind), [x, y] = toWorld(s, S.L / 2 - 6, -hullHalf(S, S.L / 2 - 10) - 7); this.burst(x, y, 16, { z: 1, col: ['#ffffff', '#d8f6ff', '#9fd8ff'], up: 40, speed: 24, life: 0.8, g: 80 }); }
      return true;
    }
    if (kind === 'plank') return true;
    return false;
  },
};
