// Embarcations des joueurs : barque à rames et sloop armé, vus de dessus
// pour les 4 directions (0 bas, 1 gauche, 2 droite, 3 haut), 2 images (rames).
// Chaque image : coque (cv), voile éventuelle (sail, dessinée derrière le
// pirate), point d'ancrage (ax, ay) et position assise du pirate (seat).
import { PB, mix, shade } from './pixel.js';

const WOOD = [0x34200f, 0x4f321a, 0x6d4626, 0x8c5c33, 0xab7643, 0xc79357];
const SAIL = [0x8f8268, 0xb3a684, 0xd2c6a2, 0xe8dec0, 0xf7f0dc];
const IRON = [0x1d1c24, 0x2c2b36, 0x403f4e, 0x5a596b, 0x7c7b8f];
const PAL = {
  barque: { rim: WOOD[5], rimD: WOOD[3], plank: WOOD[2], plankD: WOOD[1], side: WOOD[1], keel: WOOD[0] },
  sloop: { rim: 0xd8b07a, rimD: WOOD[4], plank: WOOD[4], plankD: WOOD[3], side: 0x2a3a5a, keel: 0x141c2e },
};

// demi-largeur de la coque le long de l'axe (t = 0 poupe, 1 proue)
const halfW = (t, max, stern) => max * (t < 0.55 ? stern + (1 - stern) * Math.sin(t / 0.55 * Math.PI / 2) : Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.55) / 0.45, 2))));

function hullH(pb, x0, x1, cy, max, stern, sideH, P, bowRight = true) {
  const L = x1 - x0;
  for (let x = x0; x <= x1; x++) {
    const t = bowRight ? (x - x0) / L : (x1 - x) / L;
    const hw = halfW(t, max, stern);
    if (hw < 0.4) continue;
    const top = Math.round(cy - hw), bot = Math.round(cy + hw);
    for (let y = top; y <= bot; y++) pb.set(x, y, y <= top + 1 ? P.rim : y >= bot - 1 ? P.rimD : ((y - top) % 3 === 0 ? P.plankD : P.plank));
    for (let k = 1; k <= sideH; k++) pb.set(x, bot + k, k === sideH ? P.keel : P.side);
  }
}
function hullV(pb, y0, y1, cx, max, stern, sideH, P, bowDown = true) {
  const L = y1 - y0;
  for (let y = y0; y <= y1; y++) {
    const t = bowDown ? (y - y0) / L : (y1 - y) / L;
    const hw = halfW(t, max, stern);
    if (hw < 0.4) continue;
    const l = Math.round(cx - hw), r = Math.round(cx + hw);
    for (let x = l; x <= r; x++) pb.set(x, y, x <= l + 1 ? P.rim : x >= r - 1 ? P.rimD : ((x - l) % 3 === 0 ? P.plankD : P.plank));
  }
  // flanc visible sous la coque (vue de 3/4)
  for (let x = 0; x < pb.w; x++) {
    let last = -1;
    for (let y = 0; y < pb.h; y++) if (pb.get(x, y) !== -1) last = y;
    if (last >= 0) for (let k = 1; k <= sideH; k++) pb.set(x, last + k, k === sideH ? P.keel : P.side);
  }
}
function oar(pb, x0, y0, x1, y1) {
  pb.line(x0, y0, x1, y1, WOOD[4]);
  pb.disc(x1, y1, 1.3, WOOD[5]);
}
function skullFlag(pb, x, y, flip = false) {
  for (let j = 0; j < 5; j++) for (let i = 0; i < 8; i++) pb.set(flip ? x - i : x + i, y + j + (i > 5 ? 1 : 0) * (j === 4 ? 0 : 0), 0x141418);
  const sx = flip ? x - 5 : x + 3;
  pb.set(sx, y + 1, 0xf0ece0); pb.set(sx + 1, y + 1, 0xf0ece0); pb.set(sx, y + 2, 0xf0ece0); pb.set(sx + 1, y + 2, 0xf0ece0); pb.set(sx, y + 3, 0xd0c8b8);
}

function barque(dir, frame) {
  let pb, seat, ax, ay;
  if (dir === 1 || dir === 2) {
    pb = new PB(36, 22);
    const cy = 9;
    const tip = frame ? 23 : 11;
    oar(pb, 17, cy - 4, tip, 0); oar(pb, 17, cy + 4, tip, 19);
    hullH(pb, 2, 33, cy, 6, 0.62, 2, PAL.barque, true);
    pb.vl(11, cy - 4, 9, WOOD[5]); pb.vl(23, cy - 4, 9, WOOD[5]);
    pb.outline('auto');
    if (dir === 1) pb = pb.mirror();
    seat = [17, cy]; ax = 17; ay = cy + 2;
  } else {
    pb = new PB(24, 38);
    const cx = 12, down = dir === 0;
    const tip = frame ? 9 : 25;
    hullV(pb, 2, 33, cx, 6, 0.62, 2, PAL.barque, down);
    oar(pb, cx - 5, 17, 0, tip); oar(pb, cx + 5, 17, 23, tip);
    pb.hl(cx - 4, down ? 11 : 23, 9, WOOD[5]); pb.hl(cx - 4, down ? 23 : 11, 9, WOOD[5]);
    pb.outline('auto');
    seat = [cx, 17]; ax = cx; ay = 19;
  }
  return { cv: pb.toCanvas(), ax, ay, seat, sail: null };
}

function sloopSailSide(bowRight) {
  // grand-voile aurique vue de côté + foc + pavillon
  const pb = new PB(50, 50);
  const mx = 26;
  pb.vl(mx, 2, 47, WOOD[1]); pb.vl(mx + 1, 2, 47, WOOD[2]);
  for (let y = 6; y <= 43; y++) {
    const t = (y - 6) / 37;
    const back = Math.round(4 + t * 17);
    for (let i = 1; i <= back; i++) {
      const u = i / back;
      const k = u < 0.15 ? 4 : u > 0.85 ? 1 : (Math.floor((y + i * 0.3) / 6) % 2 ? 2 : 3);
      pb.set(mx - i, y, SAIL[k]);
    }
  }
  pb.line(mx, 6, mx - 5, 5, WOOD[2]); pb.line(mx, 44, mx - 22, 44, WOOD[2]);
  for (let y = 9; y <= 40; y++) { const w = Math.round((y - 9) / 31 * 14); for (let i = 2; i <= w; i++) pb.set(mx + i, y, SAIL[i < 4 ? 4 : 2 + ((y >> 2) % 2)]); }
  pb.rect(mx - 15, 20, 7, 6, 0x1c1418); pb.set(mx - 13, 22, 0xf0ece0); pb.set(mx - 11, 22, 0xf0ece0); pb.hl(mx - 13, 24, 3, 0xf0ece0);
  skullFlag(pb, mx + 2, 0);
  pb.outline('auto');
  const out = bowRight ? pb : pb.mirror();
  return { cv: out.toCanvas(), dx: bowRight ? -26 : -23, dy: -48 };
}
function sloopSailFront(front) {
  // voile carrée vue de face (vers le bas) ou de dos (vers le haut)
  const pb = new PB(40, 42);
  const mx = 20;
  pb.vl(mx, 0, 41, WOOD[1]); pb.vl(mx + 1, 0, 41, WOOD[2]);
  pb.rect(3, 6, 35, 2, WOOD[3]); pb.hl(3, 6, 35, WOOD[4]);
  for (let y = 8; y < 32; y++) {
    const bul = Math.sin((y - 8) / 24 * Math.PI) * 3;
    const l = Math.round(5 - bul * 0.4), r = Math.round(35 + bul * 0.4);
    for (let x = l; x <= r; x++) { const u = (x - l) / (r - l); pb.set(x, y, SAIL[u < 0.12 ? 1 : u > 0.88 ? 1 : (front ? 3 : 2) + (Math.abs(u - 0.5) < 0.2 ? 1 : 0) - (x % 7 === 0 ? 1 : 0)]); }
  }
  pb.hl(5, 32, 31, WOOD[2]);
  if (front) { pb.rect(16, 15, 9, 8, 0x1c1418); pb.set(18, 17, 0xf0ece0); pb.set(22, 17, 0xf0ece0); pb.hl(18, 20, 5, 0xf0ece0); pb.set(20, 18, 0xf0ece0); }
  skullFlag(pb, mx + 2, 0);
  pb.outline('auto');
  return { cv: pb.toCanvas(), dx: -20, dy: -38 };
}
function sloop(dir) {
  let pb, seat, ax, ay, sail;
  if (dir === 1 || dir === 2) {
    pb = new PB(58, 28);
    const cy = 12;
    hullH(pb, 2, 55, cy, 8.5, 0.78, 3, PAL.sloop, true);
    for (let x = 6; x < 50; x += 7) pb.vl(x, cy - 5, 11, WOOD[3]);
    pb.rect(36, cy - 3, 6, 6, WOOD[2]); pb.hl(36, cy - 3, 6, WOOD[4]);
    pb.disc(30, cy, 1.6, WOOD[0]);
    for (const y of [cy - 9, cy + 8]) { pb.rect(40, y, 5, 2, IRON[3]); pb.set(45, y, IRON[1]); }
    pb.hl(56, cy, 2, WOOD[3]);
    pb.outline('auto');
    sail = sloopSailSide(true);
    seat = [12, cy]; ax = 28; ay = cy + 2;
    sail = { cv: sail.cv, x: 30 + sail.dx, y: cy + sail.dy };
    if (dir === 1) { pb = pb.mirror(); seat = [58 - 12, cy]; ax = 58 - 28; const s2 = sloopSailSide(false); sail = { cv: s2.cv, x: 58 - 30 + s2.dx, y: cy + s2.dy }; }
  } else {
    const down = dir === 0;
    pb = new PB(28, 58);
    const cx = 14;
    hullV(pb, 2, 55, cx, 8.5, 0.78, 3, PAL.sloop, down);
    for (let y = 6; y < 52; y += 7) pb.hl(cx - 5, y, 11, WOOD[3]);
    const my = down ? 34 : 24;
    pb.disc(cx, my, 1.6, WOOD[0]);
    pb.rect(cx - 3, down ? 42 : 12, 6, 5, WOOD[2]);
    pb.outline('auto');
    const s = sloopSailFront(down);
    sail = { cv: s.cv, x: cx + s.dx, y: my + s.dy };
    seat = [cx, 45]; ax = cx; ay = 31;
  }
  return { cv: pb.toCanvas(), ax, ay, seat, sail };
}

let cache = null;
export function boatSprites() {
  if (cache) return cache;
  cache = { barque: [], sloop: [] };
  for (let d = 0; d < 4; d++) {
    cache.barque[d] = [barque(d, 0), barque(d, 1)];
    const s = sloop(d);
    cache.sloop[d] = [s, s];
  }
  return cache;
}
