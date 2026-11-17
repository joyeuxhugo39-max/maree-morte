// 0.8 : Libertalia — façades de la cité (une par bâtiment, d'après sa taille et son style),
// remparts et tours, porte fortifiée, fontaine, statue du fondateur, linge, drapeaux,
// cannes à sucre, arbres écarlates, palétuviers, et le mobilier des nouvelles boutiques.
import { PB, mix, shade } from './pixel.js';
import { mk, building, STONE, WOOD, IRON, GOLD, BONE, LEAF } from './sprites-env.js';

const PLA = {
  ochre: [0x8a6630, 0xb48a42, 0xd2a85a, 0xe2c07a, 0xf0d89c],
  rose: [0x8e5a5a, 0xb87a76, 0xd49890, 0xe4b2a8, 0xf2cec4],
  sky: [0x4a7a80, 0x6a9ea2, 0x88bcbc, 0xa6d2ce, 0xc8e6e0],
  mint: [0x5a7a58, 0x7a9e74, 0x98ba8e, 0xb4d0a8, 0xd2e6c6],
  lemon: [0x9a8a40, 0xc0ae58, 0xdcca74, 0xeadc96, 0xf6ecbc],
  lilac: [0x6e5a80, 0x8e7aa2, 0xac98be, 0xc4b2d2, 0xdccfe6],
  white: [0xa8a090, 0xc8c0ae, 0xe0d8c6, 0xeee8da, 0xfaf6ee],
  crimson: [0x4a0e16, 0x6e1620, 0x8e2230, 0xa83444, 0xc4505a],
  grime: [0x5a5448, 0x766e60, 0x8e8676, 0xa49c8a, 0xbab2a0],
};
const RF = {
  terra: [0x5e2812, 0x8a3c1a, 0xb05428, 0xcc7038, 0xe4985a],
  plum: [0x2e0e22, 0x4a1636, 0x6a2048, 0x8a2e5e, 0xa8487a],
  copper: [0x1a3a36, 0x245a4e, 0x2e7a62, 0x4a9a7a, 0x7abc9a],
};
const SHUT = [[0x1d284a, 0x2b3c6e, 0x3d5794, 0x5879b8], [0x1c3a2a, 0x2a5438, 0x3a7048, 0x56905a], [0x5a1d1b, 0x862d27, 0xab4334, 0xcb6146], [0x34200f, 0x4f321a, 0x6d4626, 0x8c5c33]];
const FLOW = [[0xff5a6e, 0xffd34a, 0xffffff], [0xff93b8, 0xffffff], [0xbfa8ff, 0xffffff], [0xffd34a, 0xff7a5c]];
const AWN_B = [0x1c2f5e, 0x2a4685, 0x3c63ad, 0x5a86cc, 0xf3f0e2], AWN_G = [0x1d3828, 0x2a5437, 0x3a7047, 0x56905a, 0xf3f0e2], AWN_R = [0x6e1820, 0x9c2530, 0xc73b3f, 0xe25d55, 0xf3f0e2];
const hashv = (v, k) => { let h = (v * 374761393 + k * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const pick = (a, r) => a[Math.min(a.length - 1, Math.floor(r * a.length))];

// ------------------------------------------------------------------ petits motifs de façade
function lantern(pb, x, y, c = 0xe0304a) { // lanterne suspendue (rouge par défaut)
  pb.vl(x + 2, y - 3, 3, IRON[1]); pb.rect(x, y, 5, 6, c); pb.hl(x, y, 5, shade(c, 0.6)); pb.hl(x, y + 5, 5, shade(c, 0.6)); pb.set(x + 1, y + 2, mix(c, 0xffffff, 0.6));
}
function torchAt(pb, x, y) { pb.rect(x, y, 2, 7, WOOD[2]); pb.rect(x - 1, y - 1, 4, 2, IRON[2]); pb.set(x, y - 3, 0xffd24a); pb.set(x + 1, y - 2, 0xff8a2a); pb.set(x, y - 2, 0xffe48a); }
function balcony(pb, x0, x1, y) { // garde-corps de bois devant l'étage
  pb.hl(x0, y, x1 - x0, WOOD[4]); pb.hl(x0, y + 1, x1 - x0, WOOD[2]); pb.hl(x0, y + 7, x1 - x0, WOOD[1]);
  for (let x = x0; x < x1; x += 3) pb.vl(x, y + 2, 5, WOOD[3]);
}
function shield(pb, x, y, c) { pb.disc(x, y, 4.5, WOOD[2]); pb.disc(x, y, 3.5, c); pb.disc(x, y, 1.4, IRON[4]); pb.set(x - 1, y - 2, mix(c, 0xffffff, 0.4)); }
function bigDoor(pb, x, y, w, h, X = true) { // grande porte charretière à deux battants
  pb.rect(x - 1, y - 1, w + 2, h + 1, STONE[1]);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pb.set(x + i, y + j, (i % 4 === 0) ? WOOD[1] : WOOD[2 + ((i >> 2) % 2)]);
  pb.vl(x + (w >> 1), y, h, WOOD[0]);
  if (X) for (const [a, b] of [[0, w >> 1], [w >> 1, w]]) { pb.line(x + a + 1, y + 2, x + b - 2, y + h - 2, WOOD[4]); pb.line(x + b - 2, y + 2, x + a + 1, y + h - 2, WOOD[4]); }
  pb.hl(x, y + 3, w, IRON[2]); pb.hl(x, y + h - 4, w, IRON[2]);
}
function hay(pb, x, y) { pb.rect(x, y, 10, 6, 0xd8b04a); pb.hl(x, y, 10, 0xf0d070); pb.hl(x, y + 3, 10, 0xb08a30); pb.vl(x + 3, y, 6, 0xb08a30); pb.vl(x + 7, y, 6, 0xb08a30); }
// rideaux pourpres dans les fenêtres de l'étage
function curtains(pb, y0, y1, c = 0xc01a36) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < pb.w; x++) {
    if (pb.get(x, y) !== 0x24344f) continue;
    if (pb.get(x - 2, y) !== 0x24344f || pb.get(x + 2, y) !== 0x24344f) pb.set(x, y, (x + y) % 3 ? c : shade(c, 0.7));
  }
}

// ------------------------------------------------------------------ façades
const STYLES = {
  palais: () => ({ wall: 'plaster', plaster: PLA.white, roof: RF.copper, floors: 2, chimney: false, sign: 'crown', shutter: SHUT[0], flowers: FLOW[0],
    extra(pb, W, H, top) {
      const cx = W >> 1;
      for (let x = 6; x < W - 6; x++) { pb.set(x, top + 1, GOLD[3]); pb.set(x, top + 2, GOLD[1]); }
      for (let y = 0; y < 22; y++) { const hw = Math.round(34 - y * 1.5); for (let x = cx - hw; x <= cx + hw; x++) pb.set(x, top - y, y === 0 || Math.abs(x - cx) >= hw - 1 ? GOLD[2] : PLA.white[2 + ((x + y) % 7 === 0 ? 1 : 0)]); }
      pb.disc(cx, top - 9, 4, BONE[3]); pb.rect(cx - 2, top - 6, 5, 2, BONE[2]); pb.set(cx - 1, top - 10, 0x1a1418); pb.set(cx + 1, top - 10, 0x1a1418);
      pb.rect(cx - 4, top - 16, 9, 3, GOLD[3]); for (const k of [-4, 0, 4]) pb.vl(cx + k, top - 19, 3, GOLD[3]);
      for (const dx of [-30, -18, 14, 26]) { pb.rect(cx + dx, top + 4, 5, H - top - 7, PLA.white[3]); pb.vl(cx + dx, top + 4, H - top - 7, PLA.white[4]); pb.vl(cx + dx + 4, top + 4, H - top - 7, PLA.white[1]); pb.rect(cx + dx - 1, top + 3, 7, 2, GOLD[2]); pb.rect(cx + dx - 1, H - 5, 7, 2, PLA.white[1]); }
      for (const bx of [10, W - 20]) { pb.rect(bx, top + 5, 9, 24, 0x8e1a26); pb.vl(bx, top + 5, 24, 0xb02a34); pb.set(bx + 4, top + 12, GOLD[3]); pb.set(bx + 3, top + 13, GOLD[3]); pb.set(bx + 5, top + 13, GOLD[3]); for (let i = 0; i < 9; i += 2) pb.set(bx + i, top + 29, 0x8e1a26); }
      balcony(pb, cx - 22, cx + 22, top + 14);
      pb.vl(cx, 0, 14, WOOD[1]); for (let j = 0; j < 7; j++) pb.hl(cx + 1, 1 + j, 11 - (j >> 1), j === 0 ? 0x2a2a30 : 0x141418); pb.set(cx + 4, 3, BONE[3]); pb.set(cx + 5, 4, BONE[3]);
    } }),
  velours: () => ({ wall: 'plaster', plaster: PLA.crimson, roof: RF.plum, floors: 2, chimney: true, sign: 'heart', shutter: [0x2e0e22, 0x4a1636, 0x6a2048, 0x8a2e5e], flowers: [0xff5a8a, 0xffd0e0, 0xffffff],
    extra(pb, W, H, top, o) {
      curtains(pb, top, H - 28);
      balcony(pb, 10, W - 10, top + 14);
      const dx = 4 + o.door * 16 + 1;
      lantern(pb, dx - 7, H - 26); lantern(pb, dx + 16, H - 26);
      for (let x = 12; x < W - 12; x += 22) lantern(pb, x, top + 6, 0xff5a8a);
    }, glow: (W, H, o) => { const dx = 4 + o.door * 16 + 1; return [[dx - 5, H - 22], [dx + 18, H - 22]]; } }),
  taverne: (r) => ({ wall: r(1) < 0.25 ? 'wood' : 'plaster', plaster: pick([PLA.ochre, PLA.rose, PLA.lemon, undefined], r(2)), roof: pick(['thatch', RF.terra, 'red'], r(3)), floors: 2, chimney: true, sign: 'mug', shutter: pick(SHUT, r(4)), flowers: pick(FLOW, r(5)),
    extra(pb, W, H, top, o) { const dx = 4 + o.door * 16 + 1; for (const x of [dx - 12, dx + 18]) { pb.rect(x, H - 11, 8, 9, WOOD[2]); pb.hl(x, H - 9, 8, IRON[2]); pb.hl(x, H - 5, 8, IRON[2]); pb.hl(x, H - 11, 8, WOOD[4]); } lantern(pb, dx - 4, H - 30, 0xffb042); } }),
  tripot: () => ({ wall: 'plaster', plaster: PLA.mint, roof: 'green', floors: 2, chimney: false, sign: 'dice', shutter: SHUT[1], flowers: FLOW[3],
    extra(pb, W, H, top, o) { const dx = 4 + o.door * 16 + 1; lantern(pb, dx - 7, H - 26, 0xffd24a); lantern(pb, dx + 16, H - 26, 0xffd24a); for (let x = 8; x < W - 8; x += 10) { pb.set(x, top + 8, (x / 10) % 2 ? 0xe25d55 : 0x1a1418); } } }),
  armurerie: () => ({ wall: 'stone', roof: 'slate', floors: 1, chimney: true, sign: 'swords', winCols: [0, 1, 7, 8, 9],
    extra(pb, W, H) { shield(pb, 12, H - 22, 0x9c2530); shield(pb, W - 13, H - 22, 0x2a4685); pb.line(W - 40, H - 28, W - 28, H - 16, IRON[5]); pb.line(W - 28, H - 28, W - 40, H - 16, IRON[4]); } }),
  tailleur: () => ({ wall: 'plaster', plaster: PLA.sky, roof: 'blue', floors: 1, chimney: false, sign: 'scissors', awning: AWN_B, shutter: SHUT[0], flowers: FLOW[1] }),
  apothicaire: () => ({ wall: 'plaster', plaster: PLA.mint, roof: RF.copper, floors: 1, chimney: true, sign: 'flask', awning: AWN_G, flowers: FLOW[2],
    extra(pb, W, H) { for (const [x, c] of [[8, 0x3a8a2a], [14, 0x8a2a6a], [W - 14, 0x2a5aa8]]) { pb.rect(x, H - 9, 4, 6, 0xd8e8f0); pb.rect(x + 1, H - 7, 2, 3, c); } } }),
  ecurie: () => ({ wall: 'wood', roof: 'thatch', floors: 1, chimney: false, sign: 'horseshoe', winCols: [0, 9, 10, 11],
    extra(pb, W, H, top, o) { const dx = 4 + o.door * 16 - 8; bigDoor(pb, dx, H - 26, 30, 23); hay(pb, 6, H - 9); hay(pb, W - 18, H - 9); hay(pb, W - 26, H - 14); } }),
  chantier: () => ({ wall: 'wood', roof: 'blue', floors: 1, chimney: false, sign: 'anchor', winCols: [0, 1, 12, 13],
    extra(pb, W, H, top, o) { const dx = 4 + o.door * 16 - 12; bigDoor(pb, dx, H - 27, 38, 24, false); for (const x of [10, W - 22]) { pb.ellipse(x + 5, H - 6, 6, 3, 0xb8a070); pb.ellipse(x + 5, H - 6, 3, 1.5, 0x7a6440); } } }),
  capitainerie: () => ({ wall: 'stone', roof: 'red', floors: 2, chimney: true, sign: 'anchor', shutter: SHUT[0],
    extra(pb, W, H, top) { const cx = W >> 1; pb.disc(cx, top + 9, 6, BONE[3]); pb.disc(cx, top + 9, 5, BONE[4]); pb.line(cx, top + 9, cx, top + 5, 0x1a1418); pb.line(cx, top + 9, cx + 3, top + 10, 0x1a1418); pb.vl(W - 14, 0, 16, WOOD[1]); for (let j = 0; j < 5; j++) pb.hl(W - 13, 1 + j, 10 - j * 2, 0x3c63ad); } }),
  entrepot: () => ({ wall: 'wood', roof: 'slate', floors: 1, chimney: false, winCols: [],
    extra(pb, W, H, top, o) { const dx = 4 + o.door * 16 - 8; bigDoor(pb, dx, H - 26, 30, 23); for (const [x, y] of [[8, H - 10], [W - 18, H - 10], [W - 14, H - 17]]) { pb.rect(x, y, 9, 7, WOOD[3]); pb.hl(x, y, 9, WOOD[5]); pb.line(x, y, x + 8, y + 6, WOOD[1]); } } }),
  fosse: () => ({ wall: 'stone', roof: RF.terra, floors: 1, chimney: false, sign: 'skull', winCols: [0, 13],
    extra(pb, W, H, top, o) { const dx = 4 + o.door * 16 + 1; torchAt(pb, dx - 6, H - 22); torchAt(pb, dx + 18, H - 22); pb.line(dx - 26, H - 26, dx - 14, H - 14, IRON[5]); pb.line(dx - 14, H - 26, dx - 26, H - 14, IRON[4]); pb.line(dx + 30, H - 26, dx + 42, H - 14, IRON[5]); pb.line(dx + 42, H - 26, dx + 30, H - 14, IRON[4]); },
    lights: (W, H, o) => { const dx = 4 + o.door * 16 + 1; return [[dx - 5, H - 25], [dx + 19, H - 25]]; } }),
  masure: (r) => ({ wall: r(1) < 0.6 ? 'wood' : 'plaster', plaster: PLA.grime, roof: 'thatch', floors: 1, chimney: r(2) > 0.7, shutter: null, flowers: null,
    extra(pb, W, H, top) {
      for (let k = 0; k < 3; k++) { const x = 6 + Math.floor(r(10 + k) * (W - 18)), y = 6 + Math.floor(r(20 + k) * (top - 10)); pb.rect(x, y, 6, 4, k % 2 ? 0x5e4019 : 0x83622a); pb.hl(x, y, 6, 0xa8833a); }
      const wx = 6 + Math.floor(r(30) * (W - 20)); pb.line(wx, H - 21, wx + 12, H - 13, WOOD[3], 2); pb.line(wx, H - 14, wx + 12, H - 20, WOOD[2], 2);
    } }),
};
function generic(r, h) {
  const wall = r(1) < 0.16 ? 'wood' : r(1) < 0.24 ? 'stone' : 'plaster';
  const floors = h >= 5 || (h === 4 && r(4) > 0.45) ? 2 : 1;
  return { wall, plaster: pick([PLA.ochre, PLA.rose, PLA.sky, PLA.mint, PLA.lemon, PLA.lilac, PLA.white, undefined], r(2)), roof: pick(['red', RF.terra, 'blue', 'green', 'thatch', 'slate', RF.terra, RF.copper], r(3)),
    floors, chimney: r(5) > 0.55, shutter: r(6) > 0.3 ? pick(SHUT, r(7)) : null, flowers: r(8) > 0.45 ? pick(FLOW, r(9)) : null,
    extra: floors === 2 && r(11) > 0.5 ? (pb, W, H) => balcony(pb, 8, W - 8, H - 32) : null };
}
const citeCache = new Map();
export function citeSprite(p) {
  const st = STYLES[p.style] ? p.style : null;
  const variant = st === 'palais' || st === 'velours' ? 0 : (p.v | 0) % 9;
  const key = `${st}|${p.w}|${p.h}|${p.door}|${variant}`;
  if (citeCache.has(key)) return citeCache.get(key);
  const r = (k) => hashv(variant * 31 + (p.w | 0) * 7 + (p.h | 0), k);
  const o = st ? STYLES[st](r) : generic(r, p.h);
  o.w = p.w; o.h = p.h; o.door = p.door;
  if (o.floors === 2 && p.h < 4) o.floors = 1;
  const ex = o.extra;
  o.extra = ex ? (pb, W, H, top) => ex(pb, W, H, top, o) : null;
  if (o.winCols) o.winCols = o.winCols.filter((c) => c < p.w);
  const s = building(o);
  const W = p.w * 16 + 8, H = p.h * 16 + 28;
  if (o.glow) { s.glow = o.glow(W, H, o); s.glowCol = 'red'; s.glowR = 44; }
  if (o.lights) s.lights = o.lights(W, H, o);
  citeCache.set(key, s);
  return s;
}

// ------------------------------------------------------------------ remparts
// m : voisins du même rempart (1 nord, 2 est, 4 sud, 8 ouest) — le chemin de ronde se raccorde, les parapets bordent le reste
function rempart(m) {
  const pb = new PB(16, 34);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) pb.set(x, y, (x * 3 + y * 5) % 17 === 0 ? STONE[3] : (y + (x >> 2)) % 9 === 0 ? STONE[2] : STONE[4]);
  const para = (x0, y0, w, h) => { pb.rect(x0, y0, w, h, STONE[3]); };
  if (!(m & 1)) for (let x = 0; x < 16; x += 4) { para(x, 0, 3, 3); pb.hl(x, 0, 3, STONE[5]); }
  if (!(m & 8)) for (let y = 0; y < 16; y += 4) { para(0, y, 3, 3); pb.set(0, y, STONE[5]); }
  if (!(m & 2)) for (let y = 0; y < 16; y += 4) { para(13, y, 3, 3); pb.set(13, y, STONE[5]); }
  for (let y = 16; y < 34; y++) for (let x = 0; x < 16; x++) {
    const row = (y - 16) >> 2, bx = (x + (row % 2) * 4) % 8;
    pb.set(x, y, (y - 16) % 4 === 3 || bx === 0 ? STONE[1] : y === 16 ? STONE[3] : STONE[2]);
  }
  if (!(m & 4)) { for (let x = 0; x < 16; x += 4) { para(x, 13, 3, 3); pb.hl(x, 13, 3, STONE[5]); } }
  for (let x = 0; x < 16; x++) if ((x * 7) % 5 === 0) pb.set(x, 33, 0x2a5a3a); // un peu de mousse au pied
  return mk(pb, 8, 33);
}
function tour(v) {
  const pb = new PB(30, 58), cx = 15;
  pb.cyl(3, 14, 24, 42, STONE, { noise: 0.15, vgrad: 0.2 });
  for (let y = 18; y < 56; y += 5) for (let x = 3; x < 27; x++) if ((x + (y % 10 ? 3 : 0)) % 7 === 0) pb.set(x, y, STONE[1]);
  for (let y = 18; y < 56; y += 5) pb.hl(3, y, 24, mix(STONE[1], STONE[2], 0.5));
  pb.ellipse(cx, 13, 13, 5, STONE[4]); pb.ellipse(cx, 13, 10, 3.4, STONE[2]); pb.ellipse(cx, 14, 9, 2.6, STONE[1]);
  for (let a = 0; a < 6.28; a += 0.62) { const x = cx + Math.cos(a) * 12, y = 12 + Math.sin(a) * 4.6; pb.rect(x - 1.5, y - 3, 3, 4, STONE[a > 3.3 && a < 6 ? 3 : 4]); }
  pb.rect(cx - 1, 28, 2, 7, 0x14101a); pb.rect(cx - 1, 42, 2, 6, 0x14101a);
  if (v % 2 === 0) { pb.vl(cx, 0, 13, WOOD[1]); for (let j = 0; j < 6; j++) pb.hl(cx + 1, 1 + j, 9 - j, j === 0 ? 0x2a2a30 : 0x141418); pb.set(cx + 3, 3, BONE[3]); }
  pb.outline('auto');
  return mk(pb, cx, 55);
}
function porteCite() { // l'arche des portes du nord : on passe dessous
  const W = 64, pb = new PB(W, 56);
  for (const x0 of [0, W - 9]) { for (let y = 10; y < 56; y++) for (let x = x0; x < x0 + 9; x++) pb.set(x, y, (y % 5 === 4 || (x + (Math.floor(y / 5) % 2 ? 2 : 0)) % 5 === 0) ? STONE[1] : STONE[x === x0 ? 4 : 3]); }
  for (let y = 4; y < 22; y++) for (let x = 0; x < W; x++) { const a = Math.abs(x - W / 2) / (W / 2 - 9); const inner = 22 - Math.sqrt(Math.max(0, 1 - a * a)) * 10; if (y > inner && x > 8 && x < W - 9) continue; pb.set(x, y, y % 5 === 4 ? STONE[1] : (x % 6 === 0 ? STONE[2] : STONE[3])); }
  for (let x = 0; x < W; x += 5) { pb.rect(x, 0, 3, 4, STONE[4]); pb.hl(x, 0, 3, STONE[5]); }
  pb.rect(W / 2 - 4, 6, 8, 8, STONE[4]); pb.disc(W / 2, 9.5, 2.4, BONE[3]); pb.set(W / 2 - 1, 9, 0x1a1418); pb.set(W / 2 + 1, 9, 0x1a1418);
  for (const x of [10, W - 12]) { pb.rect(x, 22, 2, 6, WOOD[2]); pb.set(x, 20, 0xffd24a); pb.set(x + 1, 21, 0xff8a2a); }
  pb.outline('auto');
  return mk(pb, W / 2, 55, { lights: [[11, 21], [W - 11, 21]] });
}

// ------------------------------------------------------------------ la place, les rues
function fontaine() {
  const pb = new PB(44, 38), cx = 22;
  pb.ellipse(cx, 28, 21, 9, STONE[2]); pb.ellipse(cx, 27, 20, 8, STONE[4]); pb.ellipse(cx, 28, 17, 6.4, 0x2a6a9a); pb.ellipse(cx, 27, 15, 5, 0x3a8ac0);
  for (const [x, y] of [[cx - 8, 26], [cx + 6, 29], [cx - 2, 30], [cx + 10, 26]]) pb.hl(x, y, 3, 0x9fd8ff);
  pb.rect(cx - 3, 10, 6, 17, STONE[3]); pb.vl(cx - 3, 10, 17, STONE[4]); pb.vl(cx + 2, 10, 17, STONE[1]);
  pb.ellipse(cx, 11, 8, 3, STONE[4]); pb.ellipse(cx, 11, 6, 2, 0x3a8ac0);
  for (let k = -1; k <= 1; k += 2) for (let t = 0; t < 10; t++) pb.set(cx + k * (2 + t * 1.1), 6 + t * 0.2 + t * t * 0.17, t % 3 ? 0x9fd8ff : 0xffffff);
  pb.disc(cx, 6, 2, 0xd8f0ff); pb.set(cx, 3, 0xffffff); pb.set(cx, 4, 0x9fd8ff);
  pb.outline('auto');
  return mk(pb, cx, 34);
}
function statue() { // le fondateur de la cité : un capitaine de bronze, sabre levé vers le large
  const pb = new PB(30, 62), cx = 15;
  const BR = [0x2a2416, 0x4a3c20, 0x6a5a2e, 0x8e7a3e, 0xb49e58, 0xd8c47a];
  pb.rect(cx - 10, 44, 20, 16, STONE[3]); pb.vl(cx - 10, 44, 16, STONE[4]); pb.vl(cx + 9, 44, 16, STONE[1]); pb.rect(cx - 12, 58, 24, 3, STONE[2]); pb.rect(cx - 11, 42, 22, 3, STONE[4]);
  pb.rect(cx - 5, 49, 10, 5, GOLD[2]); pb.hl(cx - 4, 51, 8, GOLD[0]);
  pb.rect(cx - 4, 33, 3, 10, BR[2]); pb.rect(cx + 1, 33, 3, 10, BR[1]);
  pb.rect(cx - 5, 20, 10, 14, BR[3]); pb.vl(cx - 5, 20, 14, BR[4]); pb.vl(cx + 4, 20, 14, BR[1]); pb.rect(cx - 6, 30, 12, 4, BR[2]);
  pb.disc(cx, 16, 3.4, BR[3]); pb.set(cx - 1, 15, BR[5]);
  pb.rect(cx - 7, 11, 14, 3, BR[1]); pb.rect(cx - 4, 9, 8, 3, BR[2]); pb.set(cx - 7, 10, BR[2]); pb.set(cx + 6, 10, BR[2]);
  pb.line(cx + 4, 22, cx + 9, 15, BR[3], 2); pb.line(cx + 9, 15, cx + 13, 3, BR[5]); pb.set(cx + 13, 2, 0xffffff);
  pb.line(cx - 5, 22, cx - 8, 30, BR[2], 2);
  pb.outline('auto');
  return mk(pb, cx, 60);
}
function linge(v) {
  const pb = new PB(38, 30);
  for (const x of [2, 34]) { pb.rect(x, 4, 2, 26, WOOD[2]); pb.vl(x, 4, 26, WOOD[3]); }
  const sag = (x) => 6 + Math.round(Math.sin(((x - 3) / 31) * Math.PI) * 3);
  for (let x = 3; x <= 34; x++) pb.set(x, sag(x), 0xd8c8a0);
  const C = [[0xf0ece0, 0xc8c4b8], [0xc83a3a, 0x8a2020], [0x3a5a9a, 0x24386a], [0xe8c060, 0xb08a30], [0x5a9a5a, 0x3a6a3a]];
  for (let k = 0; k < 4; k++) {
    const x = 6 + k * 7, y = sag(x + 2) + 1, c = C[(k + v * 2) % 5], h = 7 + ((k + v) % 2) * 3;
    pb.rect(x, y, 5, h, c[0]); pb.vl(x + 4, y, h, c[1]); pb.set(x + 1, y - 1, 0x8a6a4a); pb.set(x + 3, y - 1, 0x8a6a4a);
    if ((k + v) % 2) { pb.clear(x + 2, y + h - 1); pb.clear(x + 2, y + h - 2); pb.clear(x + 2, y + h - 3); }
    else if (k % 2 === 0) { pb.set(x - 1, y + 1, c[0]); pb.set(x + 5, y + 1, c[1]); }
  }
  pb.outline('auto');
  return mk(pb, 19, 29);
}
function drapeau(v) {
  const pb = new PB(32, 62);
  pb.rect(1, 56, 9, 5, STONE[2]); pb.hl(1, 56, 9, STONE[4]);
  pb.rect(4, 4, 2, 53, WOOD[2]); pb.vl(4, 4, 53, WOOD[4]); pb.disc(5, 3, 1.8, GOLD[3]);
  const F = v ? [0x6e1820, 0x9c2530, 0xc73b3f] : [0x0a0a0e, 0x141418, 0x24242c];
  for (let i = 0; i < 25; i++) { const dy = Math.round(Math.sin(i * 0.45) * 1.4 * (i / 25)); for (let j = 0; j < 16; j++) pb.set(6 + i, 6 + j + dy, j === 0 ? F[2] : j > 13 ? F[0] : F[1]); }
  if (!v) { const sx = 15, sy = 9; pb.rect(sx, sy, 6, 5, BONE[4]); pb.rect(sx + 1, sy + 5, 4, 2, BONE[3]); pb.set(sx + 1, sy + 2, 0x0a0a0e); pb.set(sx + 4, sy + 2, 0x0a0a0e); pb.line(sx - 3, sy + 8, sx + 9, sy + 11, BONE[3]); pb.line(sx - 3, sy + 11, sx + 9, sy + 8, BONE[3]); }
  else { pb.line(12, 9, 24, 18, GOLD[3]); pb.line(24, 9, 12, 18, GOLD[3]); pb.disc(18, 13.5, 2, GOLD[4]); }
  pb.outline('auto');
  return mk(pb, 5, 60);
}

// ------------------------------------------------------------------ végétation de l'île
function canne(v) {
  const pb = new PB(20, 36);
  const G = [0x2a4a1e, 0x3f6b26, 0x5a8f2e, 0x7fb03a, 0xa8cc4e, 0xd2e57a];
  const n = 4 + (v % 2);
  for (let k = 0; k < n; k++) {
    const x = 3 + k * 3 + ((v * 7 + k) % 2), h = 20 + ((v * 5 + k * 3) % 10), top = 35 - h;
    for (let y = top; y < 35; y++) pb.set(x, y, (y - top) % 6 === 5 ? G[0] : G[2 + (k % 2)]);
    pb.line(x, top + 2, x - 4, top + 8, G[3]); pb.line(x, top + 1, x + 4, top + 7, G[4]); pb.line(x, top, x + 1, top - 1, G[5]);
    if (k % 2) pb.line(x, top + 9, x + 4, top + 14, G[3]);
  }
  pb.outline('auto');
  return mk(pb, 10, 35);
}
function paletuvier(v) {
  const W = 46, pb = new PB(W, 52), cx = 23;
  const ROOT = [0x2a1e12, 0x4a3622, 0x6a5034, 0x8a6c48];
  for (const [ex, k] of [[cx - 18, 0], [cx - 10, 1], [cx - 3, 2], [cx + 5, 3], [cx + 12, 4], [cx + 19, 5]]) {
    const ah = 5 + ((k + v) % 3) * 2;
    for (let t = 0; t <= 1; t += 0.03) { const x = cx + (ex - cx) * t, y = 33 + t * 15 - Math.sin(t * Math.PI) * ah; pb.set(x, y, ROOT[2]); pb.set(x, y + 1, ROOT[1]); }
  }
  pb.rect(cx - 2, 22, 5, 13, ROOT[2]); pb.vl(cx - 2, 22, 13, ROOT[3]); pb.vl(cx + 2, 22, 13, ROOT[1]);
  const L = [0x0b2418, 0x123a26, 0x1a5032, 0x24663c, 0x367c46, 0x4e9452];
  for (const [x, y, rx, ry] of [[cx - 10, 17, 11, 8], [cx + 10, 16, 11, 8], [cx, 10, 13, 9], [cx + (v % 2 ? 4 : -4), 21, 14, 6]]) pb.blob(x, y, rx, ry, L, { noise: 0.3, ragged: 0.3 });
  pb.outline('auto');
  return mk(pb, cx, 48);
}
function recolor(s, fn) { // copie d'un sprite déjà peint, couleurs transformées
  const cv = document.createElement('canvas'); cv.width = s.cv.width; cv.height = s.cv.height;
  const x = cv.getContext('2d'); x.drawImage(s.cv, 0, 0);
  const img = x.getImageData(0, 0, cv.width, cv.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const [r, g, b] = fn(d[i], d[i + 1], d[i + 2]); d[i] = r; d[i + 1] = g; d[i + 2] = b; }
  x.putImageData(img, 0, 0);
  return Object.assign({}, s, { cv });
}
const scarlet = (r, g, b) => (g > r + 6 && g >= b ? [Math.min(255, g * 1.25 + 20), Math.round(r * 0.55 + g * 0.18), Math.round(b * 0.6)] : [r, g, b]);

// ------------------------------------------------------------------ mobilier des boutiques
const VEL = [0x3a0a14, 0x5e1222, 0x861c32, 0xaa2c44, 0xcc4a5e];
function divan(v) {
  const pb = new PB(26, 18);
  const C = v ? VEL : [0x2a1238, 0x3e1c54, 0x582a74, 0x743c94, 0x9258b4];
  pb.rect(1, 3, 24, 8, C[1]); pb.hl(1, 3, 24, C[3]); pb.rect(1, 10, 24, 5, C[2]); pb.hl(1, 10, 24, C[4]);
  for (const x of [0, 22]) { pb.rect(x, 6, 4, 9, C[1]); pb.hl(x, 6, 4, C[3]); }
  for (const x of [3, 11, 19]) { pb.set(x, 6, GOLD[3]); }
  pb.rect(5, 8, 6, 3, C[3]); pb.hl(5, 8, 6, C[4]);
  for (const x of [1, 23]) pb.rect(x, 15, 2, 2, GOLD[1]);
  pb.outline('auto');
  return mk(pb, 13, 16);
}
function rideau(v) {
  const pb = new PB(18, 36);
  pb.rect(0, 0, 18, 2, GOLD[2]); pb.hl(0, 0, 18, GOLD[4]);
  for (let x = 0; x < 18; x++) { const fold = (x + v * 2) % 6; for (let y = 2; y < 34 - (x === 8 || x === 9 ? 0 : 1); y++) { if (v && x > 6 && x < 11 && y > 12) continue; pb.set(x, y, VEL[fold < 2 ? 2 : fold < 4 ? 3 : 1]); } }
  if (v) { pb.rect(5, 12, 2, 3, GOLD[3]); pb.rect(11, 12, 2, 3, GOLD[3]); }
  for (let x = 0; x < 18; x += 2) pb.set(x, 34, GOLD[2]);
  pb.outline('auto');
  return mk(pb, 9, 34);
}
function tableJeu(v) {
  const pb = new PB(26, 20);
  pb.ellipse(13, 9, 12, 7, DWOOD[3]); pb.ellipse(13, 9, 10.5, 5.6, v ? 0x1e5a3a : 0x5a1e2a); pb.ellipse(13, 9, 9, 4.4, v ? 0x2a7048 : 0x742a36);
  pb.rect(10, 15, 6, 4, DWOOD[2]); pb.rect(8, 18, 10, 2, DWOOD[1]);
  for (const [x, y] of [[8, 8], [11, 7], [16, 9]]) { pb.rect(x, y, 3, 4, 0xf3f0e2); pb.set(x + 1, y + 1, x === 11 ? 0xc73b3f : 0x1a1418); }
  for (const [x, y] of [[18, 7], [6, 10], [14, 11]]) { pb.set(x, y, GOLD[3]); pb.set(x + 1, y, GOLD[2]); pb.set(x, y + 1, GOLD[1]); }
  pb.rect(12, 5, 3, 3, 0xf3f0e2); pb.set(13, 6, 0x1a1418);
  pb.outline('auto');
  return mk(pb, 13, 19);
}
const DWOOD = [0x24160c, 0x3a2414, 0x553620, 0x6f482a, 0x8a5c36, 0xa67444];
const HORSE = [[0x2a1a10, 0x4a2e1a, 0x6a4428], [0x5a5a64, 0x8a8a94, 0xc0c0c8], [0x6a3a14, 0x9a5a24, 0xc8843a], [0x141418, 0x24242c, 0x3a3a46]];
function stalle(v) {
  const W = 42, pb = new PB(W, 36);
  pb.rect(0, 6, W, 28, DWOOD[2]); for (let x = 0; x < W; x += 6) pb.vl(x, 6, 28, DWOOD[1]); pb.hl(0, 6, W, DWOOD[4]);
  pb.rect(4, 4, W - 8, 13, 0x1a120a);
  const C = HORSE[v % 4], hx = W / 2;
  pb.rect(hx - 4, 8, 9, 10, C[1]); pb.rect(hx - 3, 15, 7, 6, C[2]); pb.set(hx - 2, 11, 0x0a0a0a); pb.set(hx + 2, 11, 0x0a0a0a); pb.set(hx - 3, 6, C[0]); pb.set(hx + 3, 6, C[0]); pb.vl(hx - 3, 5, 3, C[1]); pb.vl(hx + 3, 5, 3, C[1]);
  pb.rect(hx - 1, 18, 3, 2, 0x1a1a1a); for (let y = 7; y < 15; y++) pb.set(hx + 5, y, C[0]);
  pb.rect(1, 17, W - 2, 4, DWOOD[3]); pb.hl(1, 17, W - 2, DWOOD[5]);
  pb.line(3, 23, W - 4, 33, DWOOD[4]); pb.line(W - 4, 23, 3, 33, DWOOD[4]);
  pb.rect(2, 31, 9, 4, 0xd8b04a); pb.hl(2, 31, 9, 0xf0d070);
  pb.outline('auto');
  return mk(pb, W / 2, 34);
}
function trone() {
  const pb = new PB(28, 40), cx = 14;
  pb.rect(cx - 9, 2, 18, 26, GOLD[1]); pb.rect(cx - 7, 4, 14, 22, VEL[2]); pb.vl(cx - 7, 4, 22, VEL[3]);
  for (const x of [cx - 9, cx + 8]) { pb.disc(x + 0.5, 2, 2.4, GOLD[3]); }
  pb.disc(cx, 1, 3, GOLD[3]); pb.disc(cx, 10, 3, BONE[3]); pb.set(cx - 1, 9, 0x1a1418); pb.set(cx + 1, 9, 0x1a1418); pb.rect(cx - 1, 13, 3, 1, BONE[2]);
  pb.rect(cx - 11, 22, 22, 7, GOLD[2]); pb.hl(cx - 11, 22, 22, GOLD[4]); pb.rect(cx - 8, 24, 16, 4, VEL[3]);
  for (const x of [cx - 11, cx + 8]) { pb.rect(x, 16, 3, 13, GOLD[2]); pb.set(x + 1, 16, GOLD[4]); }
  pb.rect(cx - 10, 29, 3, 6, GOLD[1]); pb.rect(cx + 7, 29, 3, 6, GOLD[1]);
  pb.rect(cx - 13, 35, 26, 4, VEL[1]); pb.hl(cx - 13, 35, 26, VEL[3]);
  pb.outline('auto');
  return mk(pb, cx, 38);
}
function banniere(v) {
  const pb = new PB(16, 38);
  pb.rect(0, 0, 16, 2, WOOD[3]); pb.set(0, 0, GOLD[3]); pb.set(15, 0, GOLD[3]);
  const C = v ? [0x14243e, 0x1c3a5e, 0x2a5484] : VEL.slice(1, 4);
  for (let y = 2; y < 32; y++) for (let x = 2; x < 14; x++) pb.set(x, y, x === 2 ? C[2] : x === 13 ? C[0] : C[1]);
  for (let x = 2; x < 14; x++) { const d = Math.abs(x - 7.5); for (let y = 32; y < 36 - d * 0.6; y++) pb.set(x, y, C[1]); }
  pb.hl(2, 4, 12, GOLD[2]); pb.disc(8, 15, 3, BONE[3]); pb.rect(7, 18, 3, 2, BONE[2]); pb.set(7, 15, 0x1a1418); pb.set(9, 15, 0x1a1418);
  pb.line(4, 21, 12, 26, GOLD[3]); pb.line(12, 21, 4, 26, GOLD[3]);
  pb.outline('auto');
  return mk(pb, 8, 36);
}
function gradin(v) {
  const pb = new PB(16, 22);
  for (let k = 0; k < 3; k++) { const y = 2 + k * 6; pb.rect(0, y, 16, 6, DWOOD[2 + (k % 2)]); pb.hl(0, y, 16, DWOOD[4]); pb.hl(0, y + 5, 16, DWOOD[1]); }
  if (v) { pb.disc(5, 5, 1.6, 0xd8a070); pb.rect(4, 7, 3, 3, 0x6a2a2a); }
  pb.outline('auto');
  return mk(pb, 8, 20);
}
function lanterneR() {
  const pb = new PB(12, 32), cx = 6;
  pb.rect(cx - 1, 6, 2, 24, DWOOD[2]); pb.rect(cx - 4, 29, 8, 2, DWOOD[1]);
  pb.ellipse(cx, 7, 5, 6, 0xc01a36); pb.ellipse(cx - 1, 6, 3, 4, 0xe0304a); pb.set(cx - 2, 4, 0xff9aa8);
  for (const y of [3, 7, 11]) pb.hl(cx - 4, y, 9, 0x8a1228);
  pb.rect(cx - 2, 0, 4, 2, GOLD[2]); pb.set(cx, 13, GOLD[3]); pb.set(cx, 14, GOLD[2]);
  pb.outline('auto');
  return mk(pb, cx, 30, { glow: [[cx, 7]], glowCol: 'red', glowR: 44 });
}
function fortLib() { // le Fort des Hauts : une herse, des pavillons noirs (le fort des Deux Clés garde ses serrures)
  const pb = new PB(72, 64);
  for (const x0 of [0, 54]) {
    for (let y = 8; y < 64; y++) for (let x = x0; x < x0 + 18; x++) pb.set(x, y, (y % 5 === 4 || (x + (Math.floor(y / 5) % 2 ? 3 : 0)) % 6 === 0) ? STONE[1] : STONE[x === x0 ? 4 : x === x0 + 17 ? 1 : 3]);
    for (let x = x0; x < x0 + 18; x += 4) pb.rect(x, 4, 3, 4, STONE[3]);
    pb.rect(x0 + 7, 20, 3, 8, 0x14101a);
  }
  for (let y = 18; y < 64; y++) for (let x = 18; x < 54; x++) pb.set(x, y, (y % 5 === 4 || (x + (Math.floor(y / 5) % 2 ? 3 : 0)) % 6 === 0) ? STONE[1] : STONE[2]);
  for (let x = 18; x < 54; x += 5) pb.rect(x, 14, 3, 4, STONE[3]);
  for (let y = 34; y < 64; y++) for (let x = 27; x < 45; x++) { const top = 34 + Math.round(Math.pow(Math.abs(x - 35.5) / 9, 2) * 6); if (y >= top) pb.set(x, y, y === top ? STONE[4] : 0x120c10); }
  for (let x = 28; x < 45; x += 3) pb.vl(x, 38, 26, IRON[3]); for (let y = 40; y < 64; y += 5) pb.hl(28, y, 17, IRON[2]);
  for (const x0 of [3, 57]) { pb.vl(x0 + 6, 0, 8, WOOD[1]); for (let j = 0; j < 5; j++) pb.hl(x0 + 7, j, 8 - j, 0x141418); }
  pb.outline('auto');
  return mk(pb, 36, 62);
}

// 1.0 : un levier de fer sur son socle de pierre (le Bastion Englouti)
function levier() {
  const pb = new PB(14, 22);
  pb.rect(1, 14, 12, 7, STONE[2]); pb.hl(1, 14, 12, STONE[4]); pb.rect(1, 20, 12, 1, STONE[0]);
  pb.rect(4, 12, 6, 3, IRON[1]); pb.hl(4, 12, 6, IRON[3]);
  pb.line(7, 12, 11, 2, IRON[2], 2); pb.line(7, 12, 11, 2, IRON[4]); pb.disc(11, 2, 1.8, 0xc8342e); pb.set(10, 1, 0xff8a7a);
  pb.outline('auto');
  return mk(pb, 7, 20);
}
export function extend08(env) {
  const many = (fn, n) => Array.from({ length: n }, (_, v) => fn(v));
  env.levier = [levier()];
  env.rempart = many(rempart, 16); env.tour = many(tour, 2); env.porte_cite = [porteCite()];
  env.fontaine = [fontaine()]; env.statue = [statue()]; env.linge = many(linge, 3); env.drapeau = many(drapeau, 2);
  env.canne = many(canne, 4); env.paletuvier = many(paletuvier, 3);
  env.jtree_r = (env.jtree || []).map((s) => recolor(s, scarlet));
  env.divan = many(divan, 2); env.rideau = many(rideau, 2); env.table_jeu = many(tableJeu, 2); env.stalle = many(stalle, 4);
  env.trone = [trone()]; env.banniere = many(banniere, 2); env.gradin = many(gradin, 2); env.lanterne_r = [lanterneR()];
  if (env.fort) env.fort = [env.fort[0], fortLib()];
}

// ------------------------------------------------------------------ 1.0 : les propriétés (extérieurs) et leur mobilier
function stilts(pb, W, H, top, col = DWOOD) { // pilotis sous une cabane surélevée
  for (let x = 6; x < W - 4; x += 12) { pb.rect(x, top, 3, H - top, col[2]); pb.vl(x, top, H - top, col[3]); pb.line(x + 2, top + 4, x + 10, H - 2, col[1]); }
}
function hutSprite(w, h, marsh) {
  const W = w * 16 + 8, H = h * 16 + 34, pb = new PB(W, H);
  const C = marsh ? [0x2a2014, 0x3e3020, 0x544230, 0x6a5640, 0x806a50] : DWOOD;
  const base = H - 14; // la cabane repose sur ses pilotis, 14 px au-dessus du sol
  stilts(pb, W, H, base - 2, C);
  pb.rect(2, base - 4, W - 4, 5, C[3]); pb.hl(2, base - 4, W - 4, C[4]); pb.hl(2, base, W - 4, C[1]);
  const wallTop = base - 30;
  for (let y = wallTop; y < base - 4; y++) for (let x = 6; x < W - 6; x++) pb.set(x, y, (x % 6 === 0) ? C[1] : C[2 + ((x >> 1) % 2)]);
  const dx = 4 + (w >> 1) * 16 - 6; pb.rect(dx, base - 24, 12, 20, 0x1a120a); pb.rect(dx + 1, base - 23, 10, 19, C[1]); for (let y = base - 22; y < base - 4; y += 3) pb.hl(dx + 2, y, 8, C[3]);
  for (const wx of [10, W - 22]) { pb.rect(wx, wallTop + 6, 10, 8, 0x1a120a); pb.rect(wx + 1, wallTop + 7, 8, 6, marsh ? 0x3a4a3a : 0x24344f); pb.line(wx, wallTop + 6, wx + 9, wallTop + 13, C[3]); }
  for (let y = 0; y < wallTop + 4; y++) { const hw = Math.min(W / 2, 6 + y * 1.3); for (let x = Math.round(W / 2 - hw); x < W / 2 + hw; x++) pb.set(x, y, (y + (x >> 2)) % 5 === 0 ? 0x83622a : y % 3 ? 0xa8833a : 0xc9a552); }
  if (marsh) { pb.rect(W - 26, wallTop + 2, 10, 6, 0x6a6a74); pb.hl(W - 26, wallTop + 2, 10, 0x9a9aa4); for (let k = 0; k < 6; k++) pb.set(8 + k * 3, base + 2 + (k % 2), 0x8a8a6a); }
  else for (let k = 0; k < 7; k++) { const x = 4 + k * 11; pb.line(x, wallTop + 2, x + 3, wallTop + 10 + (k % 3) * 3, 0x2a7142); pb.set(x + 3, wallTop + 11 + (k % 3) * 3, 0xc8342e); }
  pb.vl(dx + 6, base, H - base, C[1]); for (let y = base + 2; y < H - 1; y += 3) pb.hl(dx + 3, y, 7, C[3]); // l'échelle
  pb.outline('auto');
  return mk(pb, W / 2, H, { windows: [{ x: 11, y: wallTop + 7, w: 8, h: 6 }, { x: W - 21, y: wallTop + 7, w: 8, h: 6 }] });
}
function fortinSprite(w, h) {
  const W = w * 16 + 8, H = h * 16 + 40, pb = new PB(W, H);
  const wallTop = H - 52;
  for (let y = wallTop; y < H; y++) for (let x = 2; x < W - 2; x++) pb.set(x, y, (y % 6 === 5 || (x + (Math.floor(y / 6) % 2 ? 4 : 0)) % 8 === 0) ? STONE[1] : STONE[x < 6 ? 4 : x > W - 7 ? 1 : 2 + ((x * 7 + y) % 13 === 0 ? 1 : 0)]);
  for (let x = 2; x < W - 2; x += 7) { pb.rect(x, wallTop - 6, 5, 6, STONE[3]); pb.hl(x, wallTop - 6, 5, STONE[5]); }
  const tx = W - 40; // la tour d'angle
  for (let y = 6; y < H - 30; y++) for (let x = tx; x < tx + 30; x++) pb.set(x, y, (y % 6 === 5 || (x + (Math.floor(y / 6) % 2 ? 4 : 0)) % 7 === 0) ? STONE[1] : STONE[x < tx + 4 ? 4 : x > tx + 25 ? 1 : 3]);
  for (let x = tx; x < tx + 30; x += 6) { pb.rect(x, 0, 4, 6, STONE[4]); pb.hl(x, 0, 4, STONE[5]); }
  pb.rect(tx + 12, 18, 5, 9, 0x14101a);
  pb.vl(tx + 15, -4, 6, WOOD[1]); pb.vl(14, wallTop - 26, 22, WOOD[1]); for (let j = 0; j < 9; j++) pb.hl(15, wallTop - 25 + j, 16 - j, j === 0 ? 0x2a2a30 : 0x141418); pb.set(20, wallTop - 22, BONE[3]); pb.set(21, wallTop - 21, BONE[3]);
  const dx = 4 + (w >> 1) * 16 - 8; // la porte charretière
  for (let y = H - 30; y < H; y++) for (let x = dx; x < dx + 24; x++) { const top = H - 30 + Math.round(Math.pow(Math.abs(x - dx - 11.5) / 12, 2) * 6); if (y >= top) pb.set(x, y, y === top ? STONE[4] : (x - dx) % 4 === 0 ? WOOD[1] : WOOD[2]); }
  for (const cx of [10, W - 64]) { pb.rect(cx, wallTop + 8, 14, 5, 0x141418); pb.rect(cx + 2, wallTop + 9, 10, 3, IRON[3]); pb.set(cx + 2, wallTop + 9, IRON[5]); }
  pb.outline('auto');
  return mk(pb, W / 2, H, { lights: [[dx - 4, H - 20], [dx + 28, H - 20]] });
}
const propCache = new Map();
export function proprieteSprite(p, env) {
  const key = `${p.style}|${p.w}|${p.h}|${p.door}`;
  if (propCache.has(key)) return propCache.get(key);
  let s;
  switch (p.style) {
    case 'villa': s = building({ w: p.w, h: p.h, door: p.door, wall: 'plaster', plaster: PLA.white, roof: RF.terra, floors: 1, chimney: false, shutter: SHUT[1], flowers: FLOW[0], winCols: [0, 1, 2, 6, 7, 8],
      extra: (pb, W, H, top) => { pb.rect(4, top + 1, W - 8, 4, RF.terra[2]); pb.hl(4, top + 1, W - 8, RF.terra[4]); for (let x = 8; x < W - 8; x += 18) { pb.rect(x, top + 5, 3, H - top - 8, PLA.white[4]); pb.vl(x + 2, top + 5, H - top - 8, PLA.white[1]); } pb.hl(6, H - 10, W - 12, WOOD[3]); for (let x = 6; x < W - 6; x += 3) pb.vl(x, H - 9, 6, WOOD[2]); } }); break;
    case 'manoir': s = building({ w: p.w, h: p.h, door: p.door, wall: 'stone', roof: 'slate', floors: 2, chimney: true, shutter: SHUT[0], flowers: FLOW[2],
      extra: (pb, W, H, top) => { chimneyAtX(pb, 18, 2); balcony(pb, W / 2 - 22, W / 2 + 22, top + 14); lantern(pb, W / 2 - 18, H - 26, 0xffd24a); lantern(pb, W / 2 + 14, H - 26, 0xffd24a); for (let k = 0; k < 18; k++) { const x = 6 + ((k * 37) % (W - 12)), y = top + 4 + ((k * 13) % 30); pb.set(x, y, 0x2a6a3a); pb.set(x + 1, y + 1, 0x3a8a4a); } pb.rect(W / 2 - 14, H - 4, 28, 4, STONE[3]); } });
      s.lights = [[s.w / 2 - 16, s.h - 23], [s.w / 2 + 16, s.h - 23]]; break;
    case 'phare': s = env.lighthouse[0]; break;
    case 'refuge': s = hutSprite(p.w, p.h, false); break;
    case 'marais': s = hutSprite(p.w, p.h, true); break;
    case 'fortin': s = fortinSprite(p.w, p.h); break;
    default: s = building({ w: p.w, h: p.h, door: p.door, wall: 'wood', roof: 'thatch', floors: 1 });
  }
  propCache.set(key, s);
  return s;
}
function chimneyAtX(pb, x, y) { for (let j = 0; j < 16; j++) for (let i = 0; i < 8; i++) pb.set(x + i, y + j, (j % 4 === 3) ? STONE[1] : STONE[i < 3 ? 3 : 2]); pb.rect(x - 1, y - 2, 10, 3, STONE[2]); }
// mobilier
function coffreFort() { const pb = new PB(16, 22); pb.rect(1, 3, 14, 18, IRON[2]); pb.hl(1, 3, 14, IRON[4]); pb.vl(1, 3, 18, IRON[3]); pb.vl(14, 3, 18, IRON[1]); pb.rect(3, 5, 10, 13, IRON[3]); pb.disc(8, 11, 3, IRON[1]); pb.disc(8, 11, 2, GOLD[2]); pb.set(8, 9, GOLD[4]); pb.rect(12, 9, 2, 4, GOLD[1]); pb.rect(2, 20, 3, 2, IRON[0]); pb.rect(11, 20, 3, 2, IRON[0]); pb.outline('auto'); return mk(pb, 8, 21); }
function piege() { const pb = new PB(16, 10); pb.ellipse(8, 6, 7, 3, IRON[2]); pb.ellipse(8, 6, 5, 2, IRON[1]); for (let x = 2; x < 15; x += 2) { pb.set(x, 3, IRON[5]); pb.set(x, 9, IRON[4]); } pb.rect(6, 5, 4, 2, IRON[3]); pb.line(14, 6, 16, 9, IRON[1]); pb.outline('auto'); return mk(pb, 8, 9); }
function boiteMusique() { const pb = new PB(16, 16); pb.rect(2, 8, 12, 7, DWOOD[3]); pb.hl(2, 8, 12, DWOOD[5]); pb.rect(2, 2, 12, 5, DWOOD[2]); pb.hl(2, 2, 12, DWOOD[4]); pb.rect(4, 4, 8, 2, 0x8e1a26); pb.rect(4, 9, 8, 3, GOLD[2]); for (let x = 4; x < 12; x += 2) pb.set(x, 10, GOLD[4]); pb.set(13, 6, 0xfff6c8); pb.set(14, 4, 0xfff6c8); pb.outline('auto'); return mk(pb, 8, 15); }
function maquette() { const pb = new PB(16, 18); pb.rect(2, 14, 12, 3, DWOOD[3]); pb.ellipse(8, 9, 7, 4.2, 0xbfe0ea); pb.ellipse(8, 9, 6, 3.4, 0x9ac8d8); pb.rect(13, 7, 3, 4, 0x8a6a4a); pb.hl(4, 11, 8, 0x6d4626); pb.vl(8, 5, 6, 0x4f321a); pb.rect(6, 6, 2, 3, 0xf3f0e2); pb.rect(9, 6, 2, 3, 0xf3f0e2); pb.set(4, 7, 0xffffff); pb.outline('auto'); return mk(pb, 8, 17); }
function globe() { const pb = new PB(16, 26); pb.rect(5, 23, 6, 2, DWOOD[2]); pb.vl(8, 15, 8, DWOOD[3]); pb.disc(8, 9, 6.5, 0x2a6aa8); for (const [x, y, r] of [[6, 7, 2.5], [10, 11, 2], [9, 5, 1.5]]) pb.disc(x, y, r, 0x5a9a4a); pb.set(5, 6, 0xd8f0ff); for (let a = 0.6; a < 5.6; a += 0.1) pb.set(8 + Math.cos(a) * 7.6, 9 + Math.sin(a) * 7.6, GOLD[2]); pb.outline('auto'); return mk(pb, 8, 25); }
function candelabre() { const pb = new PB(16, 32); pb.rect(5, 29, 6, 2, GOLD[1]); pb.vl(8, 12, 17, GOLD[2]); pb.hl(2, 12, 13, GOLD[2]); for (const x of [2, 8, 14]) { pb.rect(x - 1, 6, 3, 6, 0xf3f0e2); pb.set(x, 4, 0xffd24a); pb.set(x, 5, 0xff8a2a); } pb.outline('auto'); return mk(pb, 8, 31, { lights: [[2, 4], [8, 4], [14, 4]] }); }
function statuetteOr() { const pb = new PB(14, 26); pb.rect(2, 20, 10, 5, STONE[3]); pb.hl(2, 20, 10, STONE[4]); pb.blob(7, 13, 4, 6, [0x7a4a12, 0xa86e1c, 0xd49a2a, 0xf2c14a, 0xffe58a], {}); pb.disc(7, 6, 3, 0xf2c14a); pb.set(6, 6, 0x5a1a10); pb.set(8, 6, 0x5a1a10); pb.set(6, 5, 0xffe58a); pb.outline('auto'); return mk(pb, 7, 25); }
function easelWith(draw) { const pb = new PB(18, 30); pb.line(3, 29, 7, 6, WOOD[3]); pb.line(15, 29, 11, 6, WOOD[2]); pb.hl(3, 22, 13, WOOD[4]); pb.rect(1, 3, 16, 18, GOLD[2]); pb.hl(1, 3, 16, GOLD[4]); pb.rect(3, 5, 12, 14, 0xe8d8b0); draw(pb); pb.outline('auto'); return mk(pb, 9, 29); }
const portrait = () => easelWith((pb) => { pb.rect(3, 5, 12, 14, 0x3a2a3a); pb.disc(9, 10, 3, 0xd8a070); pb.rect(5, 6, 8, 2, 0x141418); pb.rect(6, 13, 6, 6, 0x8e1a26); pb.set(8, 10, 0x1a1418); pb.set(10, 10, 0x1a1418); });
const carteMurale = () => easelWith((pb) => { pb.rect(3, 5, 12, 14, 0xe8d4a0); pb.disc(7, 10, 2.5, 0x6a9a4a); pb.disc(12, 14, 2, 0x6a9a4a); pb.line(6, 8, 12, 15, 0xa01c14); pb.set(12, 15, 0xa01c14); pb.set(13, 14, 0xa01c14); });
const bataille = () => easelWith((pb) => { for (let y = 5; y < 19; y++) for (let x = 3; x < 15; x++) pb.set(x, y, y < 12 ? mix(0x6a5a5a, 0xc8a080, (y - 5) / 7) : 0x2a4a6a); pb.rect(4, 10, 4, 3, 0x3a2414); pb.rect(10, 11, 4, 3, 0x3a2414); pb.disc(9, 9, 1.5, 0xffa030); pb.set(9, 8, 0xffe08a); for (const x of [5, 12]) pb.vl(x, 6, 4, 0xe8dec0); });
const TROPHY_LOOK = { trophee_barbe: [0x2a2a30, 'hat'], trophee_roi_os: [0xd8c8a0, 'crown'], trophee_bourreau: [0x141418, 'hood'], trophee_sirenes: [0x3ac8b0, 'scale'], trophee_general: [0xb03232, 'banner'], trophee_corbeau: [0x1a1418, 'mask'], trophee_brasier: [0xff7a2a, 'ember'], trophee_freres: [0x8a8a9c, 'helms'], trophee_comte: [0x5e387a, 'cape'], trophee_malo: [0xd49a2a, 'sceptre'], trophee_grandfeu: [0x9fff6a, 'lantern'], trophee_mangrove: [0x2a7142, 'crown'] };
function trophySprite(id) {
  const [c, kind] = TROPHY_LOOK[id] || [0xd49a2a, 'crown'];
  const pb = new PB(16, 28);
  pb.rect(3, 20, 10, 7, DWOOD[2]); pb.hl(2, 19, 12, DWOOD[4]); pb.hl(2, 27, 12, DWOOD[0]); pb.rect(6, 22, 4, 2, GOLD[2]);
  for (let y = 5; y < 19; y++) for (let x = 3; x < 13; x++) pb.set(x, y, x === 3 ? 0xe8f4f0 : x === 12 ? 0x7a9a9a : 0xc8e0e4); // cloche de verre
  pb.ellipse(8, 5, 5, 2, 0xd8ecf0); pb.set(5, 7, 0xffffff); pb.set(5, 9, 0xffffff);
  const L = mix(c, 0xffffff, 0.35), D = shade(c, 0.6);
  if (kind === 'hat') { pb.ellipse(8, 15, 4.5, 1.6, D); pb.rect(5, 11, 6, 4, c); pb.hl(5, 11, 6, L); }
  else if (kind === 'crown') { pb.rect(5, 13, 6, 4, c); for (const x of [5, 8, 10]) pb.vl(x, 10, 3, c); pb.hl(5, 13, 6, L); }
  else if (kind === 'hood' || kind === 'mask') { pb.disc(8, 13, 3.6, c); pb.set(7, 12, 0xff3a2a); pb.set(9, 12, 0xff3a2a); if (kind === 'mask') pb.line(8, 14, 11, 17, 0xc8c0b0); }
  else if (kind === 'scale') { pb.ellipse(8, 13, 3.4, 4.2, c); pb.ellipse(7, 12, 1.6, 2, L); }
  else if (kind === 'banner') { pb.vl(6, 8, 10, WOOD[3]); pb.rect(7, 8, 5, 7, c); pb.set(9, 11, 0xf3f0e2); }
  else if (kind === 'ember') { pb.disc(8, 14, 3.4, c); pb.disc(8, 13, 2, 0xffe08a); }
  else if (kind === 'helms') { pb.disc(6, 14, 2.6, c); pb.disc(10, 14, 2.6, D); pb.hl(4, 14, 9, IRON[1]); }
  else if (kind === 'cape') { for (let y = 9; y < 18; y++) pb.hl(8 - (y - 9) * 0.4, y, 1 + (y - 9) * 0.8, y % 3 ? c : D); }
  else if (kind === 'sceptre') { pb.line(5, 17, 11, 9, c); pb.disc(11, 9, 1.8, 0xc8342e); }
  else if (kind === 'lantern') { pb.rect(6, 11, 5, 6, IRON[2]); pb.rect(7, 12, 3, 4, c); pb.vl(8, 9, 2, IRON[1]); }
  pb.outline('auto');
  return mk(pb, 8, 27, { glow: [[8, 13]], glowCol: kind === 'ember' ? 'red' : 'white', glowR: 30 });
}
export function extendProps08(structSpr) {
  Object.assign(structSpr, { coffre_fort: [coffreFort()], piege: [piege()], boite_musique: [boiteMusique()], maquette: [maquette()], globe: [globe()], lustre: [candelabre()], statuette: [statuetteOr()], portrait: [portrait()], carte_murale: [carteMurale()], bataille: [bataille()] });
  for (const id of Object.keys(TROPHY_LOOK)) structSpr['t_' + id] = [trophySprite(id)];
}
