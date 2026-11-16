// 0.6 : maisons à acheter, sanctuaire des Jumeaux, meubles, animaux de compagnie,
// et le Kraken (corps peint une fois, tentacules animées à chaque image).
import { PB, mix, shade } from './pixel.js';
import { mk, building, cheminee, table, chaise, etagere, plante, DW, STONE, WOOD, IRON, GOLD } from './sprites-env.js';
import { catSheet } from './sprites-chars.js';

const art = (pb, rows, pal, ox = 0, oy = 0) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch] !== undefined) pb.set(ox + x, oy + y, pal[ch]); }));

// ---------------- maisons des joueurs ----------------
function homes() {
  const V = [
    { wall: 'plaster', roof: 'blue', shutter: [0x5a1d1b, 0x862d27, 0xab4334, 0xcb6146], flowers: [0xff93b8, 0xffffff] },
    { wall: 'wood', roof: 'red', shutter: null, flowers: [0xffd34a, 0xff7a5c] },
    { wall: 'stone', roof: 'green', shutter: [0x34200f, 0x4f321a, 0x6d4626, 0x8c5c33], flowers: [0xbfa8ff, 0xffffff] },
  ];
  return V.map((h, i) => building({ w: 5, h: 4, door: 2, chimney: i !== 1, winCols: [0, 4], ...h }));
}

// ---------------- sanctuaire des Jumeaux ----------------
const crescent = (pb, cx, cy, r, left, c) => {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const d1 = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), d2 = Math.hypot(x + 0.5 - (cx + (left ? r * 0.55 : -r * 0.55)), y + 0.5 - cy);
    if (d1 <= r && d2 > r * 0.86) pb.set(x, y, c);
  }
};
function dalle(v) {
  const pb = new PB(16, 16);
  for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) {
    const hi = x === 1 || y === 1, lo = x === 14 || y === 14;
    pb.set(x, y, hi ? STONE[4] : lo ? STONE[1] : ((x * 7 + y * 13) % 11 === 0 ? STONE[2] : STONE[3]));
  }
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) pb.set(x, y, STONE[1]);
  crescent(pb, 8, 8, 4.6, v === 0, 0x1c2a4a);
  crescent(pb, 8, 7.6, 4.2, v === 0, 0x9fd8ff);
  return mk(pb, 8, 14);
}
function sceau(open) {
  const pb = new PB(48, 52);
  for (const x0 of [2, 36]) {
    pb.rect(x0, 12, 10, 40, STONE[2]); pb.vl(x0, 12, 40, STONE[4]); pb.vl(x0 + 1, 12, 40, STONE[3]); pb.vl(x0 + 9, 12, 40, STONE[1]);
    for (let y = 17; y < 52; y += 7) pb.hl(x0, y, 10, STONE[1]);
    pb.rect(x0 - 1, 10, 12, 3, STONE[3]); pb.hl(x0 - 1, 10, 12, STONE[5]);
  }
  for (let x = 1; x < 47; x++) {
    const k = (x - 24) / 23, top = Math.round(2 + k * k * 8);
    for (let y = top; y < top + 9; y++) pb.set(x, y, y === top ? STONE[5] : y === top + 1 ? STONE[4] : y > top + 6 ? STONE[1] : ((x + y) % 9 === 0 ? STONE[2] : STONE[3]));
  }
  crescent(pb, 19.5, 7, 3.6, true, 0xbfe8ff); crescent(pb, 28.5, 7, 3.6, false, 0xbfe8ff);
  if (open) {
    for (let y = 12; y < 52; y++) for (let x = 12; x < 36; x++) pb.set(x, y, mix(0x06040c, 0x24407a, Math.max(0, (y - 26) / 40) * (1 - Math.abs(x - 24) / 16)));
    pb.rect(12, 12, 3, 40, STONE[1]); pb.rect(33, 12, 3, 40, STONE[1]);
    for (let k = 0; k < 3; k++) pb.hl(14 + k, 49 - k * 0, 20 - k * 2, STONE[2 + k]);
  } else {
    for (let y = 12; y < 52; y++) for (let x = 12; x < 36; x++) pb.set(x, y, x === 12 || y === 12 ? STONE[4] : x === 35 ? STONE[1] : ((x * 5 + y * 3) % 13 === 0 ? STONE[1] : STONE[2]));
    pb.vl(24, 13, 39, STONE[0]); pb.vl(23, 13, 39, STONE[3]);
    crescent(pb, 18, 30, 5, true, 0x16204e); crescent(pb, 30, 30, 5, false, 0x16204e);
    crescent(pb, 18, 29.5, 4.4, true, 0x7ac8ff); crescent(pb, 30, 29.5, 4.4, false, 0x7ac8ff);
    for (const y of [20, 42]) { pb.hl(15, y, 7, 0x5a8ae0); pb.hl(26, y, 7, 0x5a8ae0); }
  }
  pb.outline('auto');
  return mk(pb, 24, 50, { glow: [[24, 30]], glowR: open ? 46 : 26 });
}

// ---------------- meubles ----------------
function armoire() {
  const pb = new PB(20, 34);
  pb.rect(1, 2, 18, 31, DW[2]); pb.rect(0, 0, 20, 3, DW[4]); pb.hl(0, 0, 20, DW[5]); pb.hl(1, 3, 18, DW[1]);
  for (const x0 of [2, 11]) {
    pb.rect(x0, 5, 7, 25, DW[3]); pb.vl(x0, 5, 25, DW[5]); pb.hl(x0, 5, 7, DW[5]); pb.vl(x0 + 6, 5, 25, DW[1]); pb.hl(x0, 29, 7, DW[1]);
    pb.rect(x0 + 2, 8, 3, 8, DW[2]); pb.rect(x0 + 2, 19, 3, 8, DW[2]);
  }
  pb.set(8, 18, GOLD[3]); pb.set(11, 18, GOLD[3]); pb.set(8, 19, GOLD[1]); pb.set(11, 19, GOLD[1]);
  pb.rect(2, 31, 3, 2, DW[0]); pb.rect(15, 31, 3, 2, DW[0]);
  pb.outline('auto');
  return mk(pb, 10, 33);
}
function chevalet(master) {
  const pb = new PB(18, 30);
  pb.line(3, 29, 7, 6, WOOD[3]); pb.line(15, 29, 11, 6, WOOD[2]); pb.line(9, 29, 9, 8, WOOD[1]); pb.hl(3, 22, 13, WOOD[4]);
  const F = master ? GOLD : [WOOD[1], WOOD[2], WOOD[3], WOOD[4], WOOD[5]];
  pb.rect(1, 3, 16, 18, F[2]); pb.hl(1, 3, 16, F[4]); pb.vl(1, 3, 18, F[3]); pb.hl(1, 20, 16, F[0]); pb.vl(16, 3, 18, F[1]);
  if (master) { for (const [x, y] of [[1, 3], [16, 3], [1, 20], [16, 20]]) pb.set(x, y, 0xfff6c8); }
  for (let y = 5; y < 19; y++) for (let x = 3; x < 15; x++) {
    let c;
    if (master) { const k = (y - 5) / 13; c = k < 0.45 ? mix(0xffb84a, 0xf06a3a, k / 0.45) : k < 0.55 ? 0xfff0a0 : mix(0x2a5a9a, 0x14305e, (k - 0.55) / 0.45); }
    else { const k = (y - 5) / 13; c = k < 0.5 ? mix(0x5a6a8a, 0x9ab0c8, k * 2) : ((x + y) % 3 === 0 ? 0x4a8ab0 : 0x2a6a9a); }
    pb.set(x, y, c);
  }
  if (master) { pb.disc(9, 10.5, 2.2, 0xfff8d0); pb.rect(5, 13, 2, 2, 0x1a1020); pb.vl(6, 9, 4, 0x1a1020); pb.rect(6, 9, 3, 2, 0xf4ecd8); }
  else { pb.rect(6, 11, 6, 2, 0x4a2c14); pb.vl(9, 6, 5, 0x2a1a0e); pb.rect(7, 7, 2, 3, 0xf4ecd8); pb.rect(10, 6, 2, 4, 0xe4dcc8); pb.hl(4, 14, 3, 0xe8f8ff); pb.hl(11, 16, 3, 0xe8f8ff); }
  pb.outline('auto');
  return mk(pb, 9, 29);
}
function tapisBrode() {
  const pb = new PB(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5), d = dx + dy;
    let c = (x + y) % 4 === 0 ? 0x9a2a30 : 0x8a2228;
    if (d < 2.2) c = 0xf2c14a; else if (d < 3.6) c = 0x2a3a6a; else if (d < 4.8) c = 0xd8a43a;
    if ((dx > 6.6 && dy > 6.6)) c = 0xd8a43a;
    pb.set(x, y, c);
  }
  return mk(pb, 0, 0);
}
function trophee() {
  const pb = new PB(16, 28);
  pb.rect(3, 20, 10, 7, DW[2]); pb.hl(2, 19, 12, DW[4]); pb.hl(3, 20, 10, DW[5]); pb.hl(2, 27, 12, DW[0]); pb.rect(6, 22, 4, 2, GOLD[2]); pb.hl(6, 22, 4, GOLD[4]);
  for (let y = 4; y < 19; y++) for (let x = 3; x < 13; x++) pb.set(x, y, x === 3 ? 0xa8e8d8 : x === 12 ? 0x2a6a5a : mix(0x3a8a78, 0x1a4a40, (y - 4) / 15));
  pb.rect(4, 2, 8, 2, IRON[3]); pb.hl(4, 2, 8, IRON[5]);
  pb.blob(8, 11.5, 4, 4, [0xb8a078, 0xd8c8a0, 0xf0e8c8, 0xfffbe6, 0xffffff], {});
  pb.ellipse(8, 11.5, 2.4, 2.4, 0xffc02a); pb.rect(7.5, 9.5, 1, 4, 0x100610); pb.set(6, 10, 0xffffff);
  pb.set(5, 15, 0x6ac8b0); pb.set(10, 6, 0x6ac8b0); pb.set(4, 7, 0xd8fff4);
  pb.outline('auto');
  return mk(pb, 8, 27);
}
function panier(c0 = 0x8a5c33) {
  const pb = new PB(16, 8);
  pb.ellipse(8, 4.5, 7.5, 3.4, shade(c0, 0.7)); pb.ellipse(8, 3.6, 6, 2.2, 0xb84a4a); pb.hl(4, 3, 8, 0xd86a5a);
  for (let x = 1; x < 15; x += 2) pb.set(x, 6, shade(c0, 1.25));
  pb.outline('auto');
  return mk(pb, 8, 7);
}

// ---------------- animaux de compagnie ----------------
// 4 images tournées vers la droite : marche 0, marche 1, repos, repos (clin d'œil)
function dogSheet() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const pb = new PB(17, 13), st = f % 2, idle = f >= 2;
    const B = [0x4a2c14, 0x7a4a22, 0xa86a32, 0xc88a4a];
    pb.ellipse(7.5, 7, 5, 2.8, B[2]); pb.hl(4, 5, 7, B[3]); pb.rect(3, 7, 4, 2, 0xf0e0c0);
    pb.disc(12.5, 5, 2.7, B[2]); pb.rect(14, 5, 3, 2, B[3]); pb.set(16, 5, 0x1a1014); pb.set(13, 4, f === 3 ? B[1] : 0x1a1014);
    pb.rect(10, 2, 2, 4, B[0]); pb.set(10, 6, B[0]);
    pb.hl(10, 7, 3, 0xc82a2a); pb.set(11, 8, GOLD[3]);
    for (const [x, o] of [[4, st], [6, 1 - st], [9, st], [11, 1 - st]]) pb.vl(x, 9, idle ? 3 : 3 - o, B[1]);
    if (idle) pb.line(2, 6, 0, f === 3 ? 2 : 3, B[1]); else pb.line(2, 6, 0, 3 + st * 2, B[1]);
    pb.outline('auto');
    frames.push(pb.toCanvas());
  }
  return frames;
}
function monkeySheet() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const pb = new PB(16, 14), st = f % 2, idle = f >= 2;
    const B = [0x3a2414, 0x5a3820, 0x7a4f2c, 0x9c683a], S = 0xe8c49a;
    // queue en point d'interrogation
    pb.line(3, 9, 1, 6, B[1]); pb.line(1, 6, 2, 3, B[1]); pb.set(3, 2 + st * (idle ? 0 : 1), B[1]); pb.set(4, 3, B[1]);
    pb.ellipse(7, 8.5, 3.4, 3, B[2]); pb.rect(5, 7, 4, 3, 0xb03232); pb.hl(5, 7, 4, 0xd44e46);
    pb.disc(10.5, 4.5, 2.8, B[2]); pb.ellipse(11.3, 5.2, 1.9, 1.7, S); pb.set(11, 4, f === 3 ? S : 0x1a1014); pb.set(13, 4, f === 3 ? S : 0x1a1014); pb.set(12, 6, 0x8a5a3a);
    pb.set(8, 3, B[1]); pb.set(13, 2, B[1]);
    pb.rect(9, 1, 4, 1, 0xb03232); pb.rect(10, 0, 2, 1, 0xd44e46); pb.set(13, 0, GOLD[3]);
    if (idle) { pb.vl(6, 11, 2, B[1]); pb.vl(9, 11, 2, B[1]); pb.set(10, 12, B[1]); pb.line(9, 8, 11, 10, B[3]); }
    else { pb.vl(5 + st, 11, 2 - st, B[1]); pb.vl(9 - st, 11, 1 + st, B[1]); pb.line(9, 8, 12, 8 + st * 2, B[3]); }
    pb.outline('auto');
    frames.push(pb.toCanvas());
  }
  return frames;
}
function babyKrakenSheet() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const pb = new PB(14, 13), st = f % 2, hop = f < 2 ? st : 0;
    const R = [0x6c204a, 0x93345e, 0xc85a82, 0xf08aa8, 0xffc0d0];
    pb.blob(7, 5.5 - hop, 4.6, 4.4, R, {});
    for (const [x, d] of [[3, st], [5, 1 - st], [8, st], [10, 1 - st]]) { pb.vl(x, 9 - hop, 2 + d, R[1]); pb.set(x + (x < 7 ? -1 : 1), 11 - hop + d, R[2]); }
    for (const ex of [5, 9]) { pb.rect(ex - 1, 5 - hop, 2, 2, f === 3 ? R[1] : 0xffe14a); if (f !== 3) pb.set(ex, 6 - hop, 0x100610); }
    pb.set(4, 3 - hop, R[4]);
    pb.outline('auto');
    frames.push(pb.toCanvas());
  }
  return frames;
}
function greenParrotSheet() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const pb = new PB(16, 13), up = f % 2 === 0;
    const G = [0x1a4a22, 0x2a7a32, 0x4aaa3e, 0x8ad85a];
    pb.ellipse(8, 7, 3.6, 2.6, G[2]); pb.hl(6, 6, 4, G[3]);
    pb.disc(11.5, 5, 2.2, G[2]); pb.set(12, 4, 0x141014); pb.rect(13, 5, 2, 2, 0xf2c14a); pb.set(14, 7, 0xd49a2a);
    pb.line(5, 8, 1, 10, 0xd83a32); pb.line(5, 7, 1, 8, 0x2a5aa8);
    if (up) { pb.line(8, 5, 5, 0, G[1], 2); pb.line(9, 5, 8, 1, G[3]); }
    else { pb.line(8, 8, 5, 12, G[1], 2); pb.line(9, 8, 8, 11, G[3]); }
    pb.outline('auto');
    frames.push(pb.toCanvas());
  }
  return frames;
}
export function petSheets() {
  return { chat: catSheet('white'), chien: dogSheet(), singe: monkeySheet(), kraken: babyKrakenSheet(), perroquet: greenParrotSheet() };
}

// ---------------- le Kraken ----------------
function krakenBody(rage) {
  const pb = new PB(108, 90);
  const R = rage ? [0x2e060c, 0x5a0e18, 0x8a1c24, 0xb83434, 0xdc5a46, 0xf5946e] : [0x1c0a1e, 0x341030, 0x561a44, 0x7a2a58, 0xa0446e, 0xc86e8c];
  // nageoires en lame, de chaque côté du manteau
  for (const sx of [-1, 1]) for (let k = 0; k < 22; k++) {
    const y = 20 + k, w = Math.round(Math.sin(k / 21 * Math.PI) * 13 * (0.6 + 0.4 * (k / 21)));
    for (let i = 0; i < w; i++) { const x = 54 + sx * (24 + i); pb.set(x, y + Math.round(i * 0.35), i > w - 3 ? R[1] : (i + k) % 5 === 0 ? R[2] : R[3]); }
  }
  // manteau haut et pointu, tête large
  for (let y = 0; y < 44; y++) {
    const u = y / 44, hw = 6 + 22 * Math.pow(Math.sin(Math.min(1, u * 1.08) * Math.PI / 2), 0.8);
    for (let x = Math.round(54 - hw); x <= Math.round(54 + hw); x++) pb.set(x, y + 2, R[2]);
  }
  pb.blob(54, 28, 27, 26, R, { noise: 0.22, grain: 1 });
  pb.blob(54, 60, 41, 24, R, { noise: 0.18, grain: 1, bias: -0.06 });
  // taches et cicatrices
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let k = 0; k < 60; k++) {
    const x = 30 + rnd() * 48, y = 6 + rnd() * 36;
    if (!pb.has(x, y) || !pb.has(x + 2, y + 2) || !pb.has(x - 2, y)) continue;
    pb.set(x, y, R[5]); if (rnd() < 0.5) pb.set(x + 1, y, R[4]); if (rnd() < 0.3) pb.set(x, y + 1, R[4]);
  }
  pb.line(40, 16, 48, 30, R[0]); pb.line(41, 16, 49, 30, R[4]); pb.line(66, 22, 61, 34, R[0]); pb.line(70, 62, 78, 70, R[0]);
  for (const ex of [34, 74]) {
    const L = ex < 54;
    pb.ellipse(ex, 57, 10.5, 8.5, R[0]);
    pb.ellipse(ex, 58, 8.4, 6, rage ? 0xff8a12 : 0xffcf2a);
    pb.ellipse(ex, 57, 6.6, 4, rage ? 0xffd060 : 0xfff29a);
    pb.rect(ex - 1, 52, 2, 12, 0x0c040c); pb.rect(ex - 2, 55, 4, 6, 0x0c040c);
    pb.rect(ex - 5, 54, 2, 2, 0xffffff);
    // arcade lourde, inclinée vers le centre : il fronce
    const slope = rage ? 0.5 : 0.34;
    for (let x = ex - 12; x <= ex + 12; x++) {
      const y = 49 + Math.round((L ? (x - ex) : (ex - x)) * slope);
      for (let j = -3; j <= 1; j++) pb.set(x, y + j, j === -3 ? R[3] : j === 1 ? R[0] : R[1]);
    }
  }
  pb.vl(54, 58, 10, R[0]); pb.vl(53, 58, 10, R[1]);
  // bec entrouvert au ras de l'eau
  pb.ellipse(54, 75, 9, 5, R[0]); pb.ellipse(54, 75, 6.5, 3, 0x0c040c);
  for (const x of [49, 52, 56, 59]) { pb.vl(x, 72, 3, 0xf4ecd8); pb.set(x, 75, 0xc8b898); }
  pb.outline('auto');
  return mk(pb, 54, 72);
}
// disque net (pas d'anticrénelage) sur le canevas basse résolution
function pdisc(ctx, cx, cy, r) {
  cx = Math.round(cx); cy = Math.round(cy);
  const R = Math.max(1, Math.round(r));
  for (let dy = -R; dy <= R; dy++) { const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy) + 0.4)); ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1); }
}
const TENT = [['#16060e', '#6c204a', '#b85476', '#f0b8c8', '#481436'], ['#1a0408', '#92202a', '#e0624e', '#ffd0b0', '#64101c']];
// une tentacule : base (bx, by) à la surface de l'eau ; renvoie la position du bout
export function drawTentacle(ctx, bx, by, o = {}) {
  const { t = 0, seed = 0, len = 46, rise = 1, lean = 0, leanA = 0, flat = 0, rage = 0, curl = 0, thick = 6, waterY = null } = o;
  const N = 13, P = [], ca = Math.cos(leanA), sa = Math.sin(leanA);
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const sway = Math.sin(t * 2.2 + seed + u * 3.2) * (1.5 + 7 * u);
    let ux = sway + ca * lean * u * u * len * 0.7, uy = -u * len * rise + sa * lean * u * u * len * 0.35;
    if (curl) { const c = curl * u * u * 3.4; ux += Math.sin(c) * 7 * u; uy += (1 - Math.cos(c)) * 7 * u; }
    const fx = ca * u * len * 1.3, fy = sa * u * len * 1.3 * 0.8 - Math.sin(u * Math.PI) * 4;
    P.push([bx + ux * (1 - flat) + fx * flat, by + uy * (1 - flat) + fy * flat, Math.max(1.3, thick * (1 - u * 0.8))]);
  }
  const C = TENT[rage ? 1 : 0];
  const vis = (y, r) => waterY == null || y - r < waterY;
  ctx.fillStyle = C[0]; for (const [x, y, r] of P) if (vis(y, r)) pdisc(ctx, x, y, r + 1);
  ctx.fillStyle = C[1]; for (const [x, y, r] of P) if (vis(y, r)) pdisc(ctx, x, y, r);
  ctx.fillStyle = C[4]; for (const [x, y, r] of P) if (vis(y, r) && r > 2.4) pdisc(ctx, x + r * 0.35, y + r * 0.35, r * 0.5);
  ctx.fillStyle = C[2]; for (const [x, y, r] of P) if (vis(y, r)) pdisc(ctx, x - r * 0.3, y - r * 0.3, r * 0.5);
  ctx.fillStyle = C[3]; for (let i = 2; i < N; i += 2) { const [x, y, r] = P[i]; if (vis(y, r)) ctx.fillRect(Math.round(x + r * 0.5), Math.round(y), 1, 1); }
  return P[N];
}

// ---------------- registre ----------------
export function extend06(env, structSpr) {
  env.home = homes();
  env.dalle = [dalle(0), dalle(1)];
  env.sceau = [sceau(false), sceau(true)];
  env.kraken = [krakenBody(false), krakenBody(true)];
  const basket = panier();
  Object.assign(structSpr, {
    table_h: [table(0)], chaise_h: [chaise(0)], etagere_h: [etagere(0)], biblio_h: [etagere(1)], armoire_h: [armoire()],
    cheminee_h: [cheminee()], plante_h: [plante()], tableau_h: [chevalet(false)], tableau_maitre_h: [chevalet(true)],
    tapis_h: [tapisBrode()], trophee_h: [trophee()],
    pet_chat: [basket], pet_chien: [basket], pet_perroquet: [basket], pet_singe: [basket], pet_kraken: [basket],
  });
}
