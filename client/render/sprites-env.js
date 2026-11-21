// Décors de l'archipel, dessinés pixel par pixel.
import { PB, mix, shade, rnd } from './pixel.js';
import { mulberry32 } from '../../shared/rng.js';

export const LEAF = [0x163a2a, 0x1f5236, 0x2b6b3f, 0x3c8746, 0x55a44f, 0x7fc35e];
export const JLEAF = [0x0e2c24, 0x153f33, 0x1e573c, 0x2a7142, 0x3e8e4a, 0x62ad58];
const LIME = [0x2a4a1e, 0x3f6b26, 0x5a8f2e, 0x7fb03a, 0xa8cc4e, 0xd2e57a];
const PALMC = [0x173f24, 0x24592e, 0x357a39, 0x51a046, 0x7cc25a];
const TRUNK = [0x33200f, 0x4d321c, 0x6b4729, 0x8b5f38, 0xa67848];
const PTRUNK = [0x5a3f27, 0x7a5835, 0x987346, 0xb8925c, 0xd2ae78];
const DEAD = [0x231c28, 0x352c3a, 0x4a3f4e, 0x625566, 0x7c6e7e];
export const STONE = [0x353443, 0x4c4b5d, 0x666579, 0x828196, 0xa3a2b4, 0xc8c7d4];
export const WOOD = [0x34200f, 0x4f321a, 0x6d4626, 0x8c5c33, 0xab7643, 0xc79357];
export const IRON = [0x1d1c24, 0x2c2b36, 0x403f4e, 0x5a596b, 0x7c7b8f, 0xa2a1b2];
export const GOLD = [0x7a4a12, 0xa86e1c, 0xd49a2a, 0xf2c14a, 0xffe58a];
export const BONE = [0x6c6450, 0x9a9076, 0xc4bb9c, 0xe4dcc0, 0xfaf5e4];
const THATCH = [0x5e4019, 0x83622a, 0xa8833a, 0xc9a552, 0xe4c46d];
const RTILE = [0x5a1d1b, 0x862d27, 0xab4334, 0xcb6146, 0xe38a62];
const BTILE = [0x1d284a, 0x2b3c6e, 0x3d5794, 0x5879b8, 0x84a1d4];
const GTILE = [0x1d3828, 0x2a5437, 0x3a7047, 0x56905a, 0x7db078];
const SLATE = [0x1f212b, 0x2d303b, 0x404451, 0x565b6a, 0x737888];
const PLASTER = [0x958871, 0xbfb092, 0xd8c9ab, 0xe8dcc3, 0xf5eddb];
const CLOTH_R = [0x6e1820, 0x9c2530, 0xc73b3f, 0xe25d55, 0xf3f0e2];
const CLOTH_B = [0x1c2f5e, 0x2a4685, 0x3c63ad, 0x5a86cc, 0xf3f0e2];
const SAIL = [0x8f8268, 0xb3a684, 0xd2c6a2, 0xe8dec0, 0xf7f0dc];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mk = (pb, ax, ay, extra = {}) => Object.assign({ cv: pb.toCanvas(), ax, ay, w: pb.w, h: pb.h }, extra);

// ---------------- végétation ----------------
function canopy(pb, clumps, ramp, r, o = {}) {
  for (const [x, y, rx, ry] of clumps) {
    pb.blob(x + (r() - 0.5) * 1.5, y + (r() - 0.5) * 1.5, rx, ry, ramp, { noise: o.noise ?? 0.3, grain: 1, bias: o.bias ?? 0.02 });
  }
}
function tree(v) {
  const pb = new PB(38, 48), r = mulberry32(31 + v * 7);
  pb.cyl(16, 29, 6, 16, TRUNK, { noise: 0.3 });
  pb.hl(14, 44, 10, TRUNK[1]); pb.set(15, 43, TRUNK[2]); pb.set(22, 43, TRUNK[1]);
  const ramp = v === 2 ? LIME : LEAF;
  canopy(pb, [[13, 11, 8, 7], [25, 10, 8, 7], [19, 6, 7, 6], [8, 18, 8, 7], [19, 16, 10, 8], [30, 18, 7, 7], [12, 25, 8, 6], [26, 25, 8, 6], [19, 27, 7, 5]], ramp, r);
  if (v === 3) for (let k = 0; k < 7; k++) {
    const x = 7 + Math.floor(r() * 24), y = 8 + Math.floor(r() * 20);
    if (pb.has(x, y) && pb.has(x + 1, y + 1)) { pb.set(x, y, 0xf08a2a); pb.set(x + 1, y, 0xd8641e); pb.set(x, y + 1, 0xd8641e); pb.set(x + 1, y + 1, 0xa8461a); pb.set(x, y, 0xffc66a); }
  }
  pb.outline('auto');
  return mk(pb, 19, 45);
}
function jtree(v) {
  const pb = new PB(48, 58), r = mulberry32(57 + v * 11);
  pb.cyl(19, 34, 10, 20, TRUNK, { noise: 0.35 });
  pb.line(19, 50, 13, 54, TRUNK[1], 2.4); pb.line(28, 50, 34, 54, TRUNK[2], 2.4); pb.line(23, 52, 23, 55, TRUNK[2], 2);
  canopy(pb, [[16, 12, 9, 8], [31, 11, 9, 8], [24, 6, 8, 6], [9, 21, 9, 8], [24, 19, 12, 9], [38, 21, 8, 8], [13, 30, 9, 7], [34, 30, 9, 7], [24, 33, 9, 6]], JLEAF, r, { noise: 0.34 });
  for (let k = 0; k < 6; k++) { // lianes
    const x = 8 + k * 6 + Math.floor(r() * 4);
    let y = 30; while (y < 44 && pb.has(x, y)) y++;
    const len = 3 + Math.floor(r() * 8);
    for (let j = 0; j < len; j++) pb.set(x + (j > 4 && k % 2 ? 1 : 0), y + j, j % 3 === 2 ? 0x3e8e4a : 0x1f4a2e);
  }
  if (v % 2 === 1) for (let k = 0; k < 6; k++) {
    const x = 6 + Math.floor(r() * 36), y = 6 + Math.floor(r() * 26);
    if (pb.has(x, y)) { const c = [0xff5a6e, 0xffa63a, 0xff7ad0][k % 3]; pb.set(x, y, c); pb.set(x + 1, y, c); pb.set(x, y + 1, shade(c, 0.7)); pb.set(x + 1, y + 1, 0xfff0a0); }
  }
  pb.outline('auto');
  return mk(pb, 24, 55);
}
function frond(pb, x0, y0, ang, len, droop, ramp, wmax = 3.2) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const steps = Math.ceil(len * 3);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = x0 + dx * len * t, py = y0 + dy * len * t + droop * len * t * t * 0.5;
    let tx = dx, ty = dy + droop * t;
    const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    const hw = wmax * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.95)) * (1 - t * 0.3);
    const W = hw * ((s % 3) === 0 ? 0.4 : 1);
    for (let q = -W; q <= W; q += 0.5) {
      const lit = Math.abs(ny) > 0.3 ? ny * q < 0 : nx * q < 0;
      const k = Math.abs(q) < 0.6 ? 1 : lit ? 3 : 2;
      pb.set(px + nx * q, py + ny * q, ramp[k + (t > 0.7 && lit ? 1 : 0)]);
    }
  }
}
function palm(v) {
  const pb = new PB(48, 60), r = mulberry32(91 + v * 5);
  const bx = 22, by = 58, ty = 20, curve = [6, -5, 8, -3][v % 4];
  for (let y = ty; y <= by; y++) {
    const t = (by - y) / (by - ty);
    const cx = bx + curve * t * t, w = 5.2 - t * 1.6;
    for (let i = 0; i < w; i++) {
      const u = (i + 0.5) / w;
      let b = 1 - Math.abs(u - 0.32) * 1.7;
      if (y % 4 === 0) b -= 0.4;
      pb.set(cx - w / 2 + i, y, PTRUNK[clamp(Math.floor(b * 5), 0, 4)]);
    }
  }
  const cx = bx + curve, cy = ty;
  const dark = PALMC.map((c) => shade(c, 0.78));
  for (const [a, l, d] of [[-2.25, 11, 0.3], [-1.55, 9, 0.2], [-0.9, 11, 0.3]]) frond(pb, cx, cy, a + (r() - 0.5) * 0.2, l, d, dark, 2.8);
  for (const [a, l, d] of [[-2.9, 16, 0.9], [-0.25, 16, 0.9], [2.75, 15, 1.2], [0.45, 15, 1.2], [1.6, 9, 1.4]]) frond(pb, cx, cy, a + (r() - 0.5) * 0.2, l, d, PALMC, 3.3);
  for (const [ox, oy] of [[-2, 2], [1, 3], [3, 1]]) { pb.disc(cx + ox, cy + oy, 1.7, 0x5c3a1e); pb.set(cx + ox - 1, cy + oy - 1, 0x8a5c32); }
  pb.outline('auto');
  return mk(pb, 22, 58);
}
function deadtree(v) {
  const pb = new PB(42, 52), r = mulberry32(77 + v * 13);
  const branch = (x, y, ang, len, w, depth) => {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    pb.line(x, y, x2, y2, DEAD[2], w);
    if (w > 2) pb.line(x - w / 3, y, x2 - w / 3, y2, DEAD[3], 1);
    if (depth > 0) {
      branch(x2, y2, ang - 0.45 - r() * 0.45, len * 0.7, Math.max(1, w * 0.6), depth - 1);
      branch(x2, y2, ang + 0.4 + r() * 0.45, len * 0.62, Math.max(1, w * 0.58), depth - 1);
    } else if (r() < 0.6) {
      const n = 2 + Math.floor(r() * 5);
      for (let j = 1; j <= n; j++) pb.set(x2 + (j > 3 ? 1 : 0), y2 + j, j % 2 ? 0x5f6e4a : 0x77855c);
    }
  };
  pb.line(21, 50, 21, 30, DEAD[1], 6);
  pb.line(19, 50, 20, 30, DEAD[2], 2);
  pb.line(18, 50, 13, 51, DEAD[1], 2); pb.line(24, 50, 29, 51, DEAD[1], 2);
  branch(21, 31, -1.57 + (r() - 0.5) * 0.3, 9, 3.6, 3);
  branch(21, 38, -2.5, 7, 2, 1);
  branch(22, 36, -0.5, 6, 2, 1);
  if (v % 2) for (const [x, y] of [[15, 49], [26, 48], [28, 50]]) { pb.set(x, y, 0x7dffc4); pb.set(x + 1, y, 0x3fbf8f); pb.set(x, y + 1, 0x2a6b55); }
  pb.outline('auto');
  return mk(pb, 21, 51, { glow: v % 2 ? [[15, 49], [27, 49]] : null });
}
function bush(v) {
  const pb = new PB(22, 16), r = mulberry32(3 + v * 17);
  const ramp = v >= 4 ? JLEAF : LEAF;
  pb.blob(7, 9.5, 6, 5.5, ramp, { noise: 0.32, grain: 1 });
  pb.blob(15, 9.5, 6, 5.5, ramp, { noise: 0.32, grain: 1 });
  pb.blob(11, 6.5, 6.5, 5, ramp, { noise: 0.32, grain: 1 });
  const dots = [null, [0xd6323c, 0xff7070], [0xff9ac8, 0xffffff], [0xffd84a, 0xfff6c0], null, [0xff5a6e, 0xffe0a0]][v % 6];
  if (dots) for (let k = 0; k < 6; k++) {
    const x = 4 + Math.floor(r() * 14), y = 3 + Math.floor(r() * 9);
    if (pb.has(x, y)) { pb.set(x, y, dots[0]); pb.set(x, y - 1 >= 0 ? y : y, dots[0]); pb.set(x - 1, y, shade(dots[0], 0.75)); if (pb.has(x, y - 1)) pb.set(x, y - 1, dots[1]); }
  }
  for (let x = 0; x < 22; x++) if (pb.has(x, 15)) pb.clear(x, 15);
  pb.outline('auto');
  return mk(pb, 11, 14);
}
function fern(v) {
  const pb = new PB(24, 17), r = mulberry32(5 + v * 9);
  const ramp = [JLEAF[1], JLEAF[2], JLEAF[3], JLEAF[4], JLEAF[5]];
  for (const a of [-2.75, -2.2, -1.6, -1.0, -0.4]) frond(pb, 12, 15, a + (r() - 0.5) * 0.25, 7 + r() * 3, 0.9, ramp, 2);
  pb.outline('auto');
  return mk(pb, 12, 15);
}
function reeds(v) {
  const pb = new PB(16, 21), r = mulberry32(13 + v * 3);
  const C = [0x3f4d2a, 0x56663a, 0x6f8149, 0x8ea05c];
  for (let k = 0; k < 6; k++) {
    const x = 2 + k * 2 + Math.floor(r() * 2), h = 8 + Math.floor(r() * 9), lean = (r() - 0.5) * 3;
    for (let j = 0; j < h; j++) pb.set(x + lean * (j / h) * (j / h), 19 - j, C[clamp(1 + (j > h * 0.6 ? 1 : 0) + (k % 2), 0, 3)]);
    if (k % 3 === 1) { const tx = x + lean, ty = 19 - h; pb.rect(tx - 0.5, ty - 1, 2, 4, 0x6b4426); pb.set(tx - 0.5, ty - 1, 0x8f5d34); }
  }
  pb.outline('auto');
  return mk(pb, 8, 19);
}
function mushroom(v) {
  const pb = new PB(14, 12);
  const cap = v % 2 ? [0x1d6b5d, 0x2ea08a, 0x52d6b4, 0xa8ffe4] : [0x4a2366, 0x6e3a94, 0x9558c2, 0xc596e8];
  for (const [x, y, s] of [[4, 11, 1], [9, 11, 0.8], [7, 11, 0.6]]) {
    pb.rect(x - 0.5, y - 3 * s, 2, 3 * s, 0xe8dcc0);
    pb.blob(x + 0.5, y - 3 * s - 1, 3.2 * s + 0.8, 2 * s + 0.6, cap, { bias: 0.05 });
    pb.set(x - 1, y - 3 * s - 2, cap[3]);
  }
  pb.outline('auto');
  return mk(pb, 7, 11, { glow: v % 2 ? [[5, 7], [9, 8]] : null });
}
function rock(v) {
  const pb = new PB(22, 16), r = mulberry32(41 + v * 7);
  const ramp = v < 2 ? [0x4a4646, 0x66605a, 0x847c72, 0xa49a8c, 0xc6bcac] : STONE;
  pb.blob(11, 9, 9, 6.5, ramp, { noise: 0.22 });
  pb.blob(6 + r() * 2, 10, 5, 4.5, ramp, { noise: 0.22, bias: -0.05 });
  pb.blob(16, 10.5, 4.5, 4, ramp, { noise: 0.2, bias: -0.08 });
  for (let x = 0; x < 22; x++) for (let y = 14; y < 16; y++) pb.clear(x, y);
  if (v === 4) pb.map((c, x, y) => (y < 8 && rnd(x, y, 3) > 0.25) ? mix(c, 0x3f8a48, 0.6) : c);
  if (v < 2) for (let k = 0; k < 5; k++) { const x = 4 + Math.floor(r() * 14), y = 8 + Math.floor(r() * 5); if (pb.has(x, y)) pb.set(x, y, 0xe8e2d0); }
  pb.outline('auto');
  return mk(pb, 11, 13);
}
// ---------------- petits décors au sol ----------------
function pebble(v) { const pb = new PB(8, 5); pb.blob(2.5, 2.5, 2, 1.6, STONE.slice(1), {}); pb.blob(6, 3, 1.6, 1.3, STONE.slice(1), {}); pb.outline('auto'); return mk(pb, 4, 4); }
function shell(v) {
  const pb = new PB(8, 7);
  const c = [[0xf6d6c8, 0xe2a89a, 0xc47a70], [0xfff2dc, 0xe8cfa6, 0xb8946a], [0xf0e4ff, 0xc8b0e8, 0x9a7cc0], [0xffe0b8, 0xf0b070, 0xc07840]][v % 4];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) { const dx = x - 3, dy = y - 4; if (dx * dx / 10 + dy * dy / 16 <= 1) pb.set(x, y, (x % 2) ? c[1] : c[0]); }
  pb.hl(2, 5, 3, c[2]);
  pb.outline('auto');
  return mk(pb, 4, 6);
}
function starfish(v) {
  const pb = new PB(9, 9), c = v % 2 ? [0xe85a3a, 0xff8a5a] : [0xd86ab0, 0xff9ad4];
  pb.set(4, 4, c[1]);
  for (const [dx, dy] of [[0, -1], [0, -2], [0, -3], [-1, 0], [-2, -1], [-3, -1], [1, 0], [2, -1], [3, -1], [-1, 1], [-2, 2], [-2, 3], [1, 1], [2, 2], [2, 3]]) pb.set(4 + dx, 4 + dy, Math.abs(dx) + Math.abs(dy) < 2 ? c[1] : c[0]);
  pb.outline('auto');
  return mk(pb, 4, 6);
}
function flowerPatch(v) {
  const pb = new PB(14, 9), r = mulberry32(v * 31 + 1);
  const cols = [[0xffffff, 0xffd34a], [0xff8fb8, 0xffe066], [0xffe066, 0xf08a3a], [0xb9a6ff, 0xfff0a0], [0xff5a6e, 0xffd34a], [0xffa63a, 0x7a3a1a]][v % 6];
  for (let k = 0; k < 3; k++) {
    const x = 3 + k * 4 + Math.floor(r() * 2), y = 3 + Math.floor(r() * 3);
    pb.set(x, y + 2, 0x2f7a3a); pb.set(x + 1, y + 3, 0x3c8743); pb.set(x - 1, y + 3, 0x3c8743);
    pb.set(x, y - 1, cols[0]); pb.set(x - 1, y, cols[0]); pb.set(x + 1, y, cols[0]); pb.set(x, y + 1, cols[0]); pb.set(x, y, cols[1]);
  }
  pb.outline('auto');
  return mk(pb, 7, 7);
}
function lily(v) {
  const pb = new PB(13, 9);
  pb.ellipse(6, 4.5, 5.5, 3.6, 0x3e7a3a); pb.ellipse(5.5, 4, 4, 2.4, 0x56963f);
  for (let i = 0; i < 3; i++) pb.clear(6 + i, 4 - i * 0.3);
  if (v % 2) { pb.set(4, 2, 0xffb0d0); pb.set(5, 2, 0xffffff); pb.set(4, 3, 0xff80b0); pb.set(3, 2, 0xff80b0); }
  pb.outline('auto');
  return mk(pb, 6, 6);
}
function skull() {
  const pb = new PB(9, 8);
  pb.ellipse(4.5, 3, 3.6, 3, BONE[3]); pb.rect(3, 5, 3, 2, BONE[2]);
  pb.set(3, 3, 0x2a2228); pb.set(6, 3, 0x2a2228); pb.set(3, 4, 0x2a2228); pb.set(6, 4, 0x2a2228); pb.set(4.5, 5, BONE[1]);
  pb.set(2, 1, BONE[4]);
  pb.outline('auto');
  return mk(pb, 4, 7);
}
function bones() {
  const pb = new PB(13, 7);
  pb.line(1, 1, 11, 5, BONE[3], 1.6); pb.line(1, 5, 11, 1, BONE[2], 1.6);
  for (const [x, y] of [[1, 1], [11, 5], [1, 5], [11, 1]]) pb.disc(x, y, 1.3, BONE[4]);
  pb.outline('auto');
  return mk(pb, 6, 5);
}
function driftwood(v) {
  const pb = new PB(19, 8);
  const C = [0x7d6a56, 0x9c8a72, 0xbcab90, 0xd8cab0];
  pb.line(1, 5, 17, 3, C[1], 3.2); pb.line(1, 4, 17, 2, C[2], 1); pb.line(13, 3, 16, 0, C[1], 1.6);
  pb.outline('auto');
  return mk(pb, 9, 6);
}
function nets() {
  const pb = new PB(20, 10);
  pb.ellipse(10, 6, 9, 3.6, 0x8c7a5a);
  pb.map((c, x, y) => ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0) ? 0xc4b088 : c);
  pb.disc(4, 6, 1.4, 0xd6c49a); pb.disc(15, 7, 1.4, 0xe0a040);
  pb.outline('auto');
  return mk(pb, 10, 8);
}
// ---------------- cimetière ----------------
function grave(v) {
  const pb = new PB(13, 17);
  pb.rect(1, 5, 11, 11, STONE[2]); pb.ellipse(6.5, 5.5, 5.5, 4.5, STONE[2]);
  pb.cyl(1, 2, 11, 14, STONE, { noise: 0.15 });
  for (let y = 0; y < 17; y++) for (let x = 0; x < 13; x++) { const dx = (x + 0.5 - 6.5) / 5.5, dy = (y + 0.5 - 6) / 5; if (y < 6 && dx * dx + dy * dy > 1) pb.clear(x, y); }
  pb.vl(6, 5, 7, STONE[0]); pb.hl(4, 7, 5, STONE[0]);
  if (v === 1) { pb.line(9, 2, 7, 9, STONE[0]); }
  pb.hl(0, 15, 13, 0x4f6b3a); pb.set(2, 14, 0x5f7f45); pb.set(10, 14, 0x5f7f45);
  pb.outline('auto');
  return mk(pb, 6, 16);
}
function cross(v) {
  const pb = new PB(11, 18);
  const lean = v === 1 ? 2 : 0;
  pb.line(5 + lean, 1, 5, 16, WOOD[2], 2.2); pb.line(1 + lean * 0.7, 5, 9 + lean * 0.7, 5, WOOD[3], 2);
  pb.set(4 + lean, 2, WOOD[4]);
  pb.outline('auto');
  return mk(pb, 5, 16);
}
function crypt() {
  const pb = new PB(46, 48);
  pb.rect(4, 18, 38, 28, STONE[2]);
  for (let y = 18; y < 46; y++) for (let x = 4; x < 42; x++) {
    const row = Math.floor((y - 18) / 5), bx = (x + (row % 2) * 5) % 10;
    let k = 2 + (rnd(Math.floor((x + (row % 2) * 5) / 10), row, 3) > 0.6 ? 1 : 0);
    if ((y - 18) % 5 === 4 || bx === 0) k = 1;
    pb.set(x, y, STONE[k]);
  }
  for (let y = 4; y < 20; y++) { const half = (y - 4) * 1.45; pb.hl(23 - half, y, half * 2, y < 6 ? SLATE[3] : SLATE[2 + ((y % 3) ? 0 : -1)]); }
  pb.hl(2, 19, 42, SLATE[1]); pb.hl(2, 20, 42, SLATE[0]);
  pb.cyl(5, 21, 5, 25, STONE); pb.cyl(36, 21, 5, 25, STONE);
  pb.rect(16, 26, 14, 20, IRON[1]); pb.rect(17, 27, 12, 19, IRON[2]);
  for (let x = 18; x < 29; x += 3) pb.vl(x, 28, 18, IRON[3]);
  pb.vl(23, 27, 19, 0x6dff9a);
  pb.ellipse(23, 12, 3, 2.6, BONE[3]); pb.set(22, 12, 0x221a22); pb.set(24, 12, 0x221a22);
  pb.outline('auto');
  return mk(pb, 23, 46, { glow: [[23, 36]] });
}
// ---------------- port ----------------
function barrel(v) {
  const pb = new PB(13, 16);
  const W = v === 2 ? [0x1d1a1c, 0x2c2628, 0x3d3437, 0x504448, 0x665a5d, 0x7a6e70] : WOOD;
  pb.cyl(1, 3, 11, 12, W, { noise: 0.2 });
  pb.ellipse(6.5, 3.2, 5.4, 2.4, W[4]); pb.ellipse(6.5, 3.2, 3.6, 1.4, W[3]);
  pb.hl(1, 6, 11, IRON[2]); pb.hl(1, 12, 11, IRON[2]); pb.hl(2, 7, 9, IRON[1]);
  if (v === 1) { pb.rect(4, 8, 5, 3, 0xe8dcc0); pb.set(5, 9, 0xc0302a); pb.set(7, 9, 0xc0302a); pb.set(6, 9, 0x8a2020); }
  if (v === 2) { pb.set(6, 9, 0xe8e0d0); pb.set(5, 9, 0xe8e0d0); pb.set(7, 9, 0xe8e0d0); pb.set(5, 10, 0xc0302a); pb.set(7, 10, 0xc0302a); }
  pb.outline('auto');
  return mk(pb, 6, 15);
}
function crate(v) {
  const pb = new PB(15, 16);
  const W = v === 1 ? [0x3a2a1a, 0x5a4228, 0x7a5a36, 0x9a7646, 0xb89260, 0xd0ac78] : WOOD;
  pb.rect(1, 1, 13, 4, W[4]); pb.hl(1, 1, 13, W[5]);
  pb.rect(1, 5, 13, 10, W[3]);
  for (let y = 5; y < 15; y++) { if ((y - 5) % 3 === 2) pb.hl(2, y, 11, W[2]); }
  pb.rect(1, 5, 2, 10, W[1]); pb.rect(12, 5, 2, 10, W[1]); pb.hl(1, 5, 13, W[1]); pb.hl(1, 14, 13, W[1]);
  pb.line(3, 13, 11, 6, W[2], 1.6);
  pb.outline('auto');
  return mk(pb, 7, 15);
}
function lamp() {
  const pb = new PB(10, 33);
  pb.rect(4, 10, 2, 21, IRON[2]); pb.vl(4, 10, 21, IRON[3]);
  pb.rect(2, 30, 6, 2, IRON[1]); pb.rect(3, 29, 4, 1, IRON[2]);
  pb.rect(2, 3, 6, 7, IRON[1]); pb.rect(3, 4, 4, 5, 0xffd36b); pb.set(3, 4, 0xfff4c0); pb.vl(5, 4, 5, IRON[2]);
  pb.hl(1, 2, 8, IRON[2]); pb.hl(2, 1, 6, IRON[3]); pb.set(4, 0, IRON[3]); pb.set(5, 0, IRON[3]);
  pb.hl(1, 10, 8, IRON[2]);
  pb.outline('auto');
  return mk(pb, 5, 31, { light: [5, 6] });
}
function torch() {
  const pb = new PB(9, 29);
  const B = [0x6e5a2a, 0x8f7a3c, 0xb8a35a, 0xd4c27a];
  pb.cyl(3, 8, 3, 20, B);
  for (let y = 11; y < 28; y += 5) pb.hl(3, y, 3, B[0]);
  pb.rect(1, 5, 7, 3, 0x3a2614); pb.hl(1, 4, 7, 0x5a3a1c); pb.hl(2, 8, 5, 0x2a1a0e);
  pb.outline('auto');
  return mk(pb, 4, 27, { flame: [4, 3] });
}
function fence() {
  const pb = new PB(16, 14);
  for (const x of [1, 12]) { pb.rect(x, 1, 3, 12, WOOD[3]); pb.vl(x, 1, 12, WOOD[4]); pb.set(x + 1, 0, WOOD[4]); }
  pb.rect(0, 4, 16, 2, WOOD[3]); pb.hl(0, 4, 16, WOOD[4]); pb.rect(0, 9, 16, 2, WOOD[2]);
  pb.outline('auto');
  return mk(pb, 8, 13);
}
function stall(v) {
  const pb = new PB(38, 34), cl = v ? CLOTH_B : CLOTH_R, r = mulberry32(5 + v);
  pb.rect(2, 4, 2, 28, WOOD[2]); pb.rect(34, 4, 2, 28, WOOD[2]);
  pb.rect(1, 18, 36, 4, WOOD[4]); pb.hl(1, 18, 36, WOOD[5]); pb.rect(1, 22, 36, 8, WOOD[3]);
  for (let x = 4; x < 34; x += 6) pb.vl(x, 22, 8, WOOD[2]);
  for (let k = 0; k < 9; k++) {
    const x = 5 + k * 3.4, y = 15 + (k % 2);
    const c = v ? [0x6a8fb0, 0x8fb0cc, 0x50708f][k % 3] : [0xe8433a, 0xffd23a, 0x8ac43a][k % 3];
    if (v) { pb.ellipse(x, y + 1, 2.4, 1.2, c); pb.set(x + 2, y + 1, shade(c, 0.6)); } else { pb.disc(x, y, 1.7, c); pb.set(x - 1, y - 1, shade(c, 1.3)); }
  }
  for (let y = 0; y < 11; y++) for (let x = 0; x < 38; x++) {
    const stripe = Math.floor(x / 5) % 2;
    let c = stripe ? cl[4] : cl[2];
    if (y > 7) c = shade(c, 0.85);
    if (y === 10 && (x % 5 === 0 || x % 5 === 4)) continue;
    pb.set(x, y + 2, c);
  }
  pb.hl(0, 2, 38, cl[1]);
  pb.outline('auto');
  return mk(pb, 19, 31);
}
function well() {
  const pb = new PB(24, 28);
  pb.cyl(3, 14, 18, 11, STONE, { noise: 0.2 });
  for (let y = 14; y < 25; y++) for (let x = 3; x < 21; x++) if ((y - 14) % 4 === 3 || (x + Math.floor((y - 14) / 4) * 3) % 6 === 0) pb.set(x, y, shade(pb.get(x, y), 0.75));
  pb.ellipse(12, 14, 9, 3, STONE[4]); pb.ellipse(12, 14, 7, 2, 0x1a3a5a); pb.set(10, 14, 0x5a9ac0);
  pb.rect(3, 4, 2, 12, WOOD[2]); pb.rect(19, 4, 2, 12, WOOD[2]);
  for (let y = 0; y < 5; y++) pb.hl(1 + y * 0.5, y + 1, 22 - y, y < 2 ? RTILE[3] : RTILE[2]);
  pb.hl(5, 7, 14, WOOD[1]); pb.rect(11, 8, 3, 3, WOOD[3]); pb.hl(11, 8, 3, IRON[2]);
  pb.outline('auto');
  return mk(pb, 12, 25);
}
function brazier() {
  const pb = new PB(22, 28);
  pb.rect(5, 22, 12, 5, STONE[2]); pb.hl(5, 22, 12, STONE[4]); pb.rect(3, 26, 16, 1, STONE[1]);
  pb.cyl(7, 12, 8, 10, STONE);
  pb.ellipse(11, 10, 8, 3.5, IRON[2]); pb.ellipse(11, 9.5, 6.5, 2.4, 0x2a1a12);
  pb.hl(3, 10, 16, IRON[3]); pb.set(3, 9, IRON[4]); pb.set(18, 9, IRON[1]);
  pb.outline('auto');
  return mk(pb, 11, 26, { flame: [11, 7], blue: true });
}
function anvil() {
  const pb = new PB(16, 13);
  pb.cyl(4, 7, 8, 6, TRUNK);
  pb.rect(2, 2, 12, 3, IRON[3]); pb.hl(2, 2, 12, IRON[4]); pb.rect(5, 5, 6, 2, IRON[2]); pb.set(1, 3, IRON[3]); pb.set(0, 3, IRON[2]);
  pb.outline('auto');
  return mk(pb, 8, 12);
}
function bench() {
  const pb = new PB(22, 12);
  pb.rect(1, 3, 20, 3, WOOD[4]); pb.hl(1, 3, 20, WOOD[5]); pb.rect(1, 6, 20, 1, WOOD[2]);
  pb.rect(3, 7, 2, 4, WOOD[2]); pb.rect(17, 7, 2, 4, WOOD[2]);
  pb.outline('auto');
  return mk(pb, 11, 11);
}
function sign() {
  const pb = new PB(18, 21);
  pb.rect(8, 6, 2, 14, WOOD[2]);
  pb.rect(1, 2, 14, 7, WOOD[3]); pb.hl(1, 2, 14, WOOD[4]); pb.set(15, 4, WOOD[3]); pb.set(16, 5, WOOD[3]); pb.set(15, 6, WOOD[3]); pb.vl(15, 3, 5, WOOD[3]);
  pb.hl(3, 5, 9, WOOD[1]); pb.hl(4, 4, 3, WOOD[1]);
  pb.outline('auto');
  return mk(pb, 9, 19);
}
function cannon(v) {
  const pb = new PB(25, 17);
  pb.rect(4, 8, 14, 5, WOOD[3]); pb.hl(4, 8, 14, WOOD[4]);
  pb.disc(7, 13, 3, WOOD[1]); pb.disc(7, 13, 1.2, WOOD[3]); pb.disc(16, 13, 3, WOOD[1]); pb.disc(16, 13, 1.2, WOOD[3]);
  for (let x = 2; x < 24; x++) { const w = x < 6 ? 3.4 : 2.8 - (x - 6) * 0.04; for (let y = -w; y <= w; y++) { const b = 1 - (y + w) / (2 * w); pb.set(x, 6 + y, IRON[clamp(Math.floor(b * 4.5), 0, 4)]); } }
  pb.disc(2.5, 6, 2.5, IRON[2]); pb.vl(23, 3, 7, IRON[1]);
  pb.outline('auto');
  const s = v ? pb.mirror() : pb;
  return mk(s, 12, 15);
}
function anchor() {
  const pb = new PB(16, 19);
  pb.rect(7, 2, 2, 13, IRON[3]); pb.vl(7, 2, 13, IRON[4]);
  pb.disc(8, 2, 2, IRON[2]); pb.disc(8, 2, 0.8, -1); pb.clear(8, 2);
  pb.hl(4, 5, 8, IRON[3]);
  pb.line(2, 11, 7, 16, IRON[3], 2); pb.line(14, 11, 9, 16, IRON[3], 2);
  pb.set(1, 10, IRON[4]); pb.set(14, 10, IRON[4]);
  pb.rect(5, 16, 6, 2, 0xc8b078);
  pb.outline('auto');
  return mk(pb, 8, 17);
}
function boat() {
  const pb = new PB(34, 16);
  for (let x = 0; x < 34; x++) {
    const t = x / 33, hw = 6.5 * Math.sin(Math.PI * Math.pow(t, 0.85));
    for (let y = -hw; y <= hw; y++) pb.set(x, 8 + y, Math.abs(y) > hw - 1.5 ? WOOD[1] : WOOD[3 + ((x >> 2) % 2 ? 0 : 1) - 1]);
  }
  pb.rect(10, 4, 2, 9, WOOD[4]); pb.rect(21, 4, 2, 9, WOOD[4]);
  pb.line(14, 2, 18, 14, WOOD[2], 1.4); pb.line(26, 1, 23, 14, WOOD[2], 1.4);
  pb.outline('auto');
  return mk(pb, 17, 13);
}
// ---------------- ruines ----------------
function pillar(v) {
  const pb = new PB(14, 32);
  const top = v ? 9 : 3;
  pb.cyl(3, top + 2, 8, 26 - top, STONE, { noise: 0.15 });
  for (let y = top + 4; y < 28; y += 4) pb.hl(3, y, 8, STONE[1]);
  pb.rect(1, 28, 12, 3, STONE[2]); pb.hl(1, 28, 12, STONE[4]);
  if (!v) { pb.rect(1, 1, 12, 3, STONE[3]); pb.hl(1, 1, 12, STONE[4]); }
  else for (let x = 3; x < 11; x++) for (let y = top; y < top + 3; y++) if (rnd(x, y, 2) > 0.5) pb.set(x, y, STONE[3]);
  for (let j = 0; j < 14; j++) pb.set(4 + Math.round(Math.sin(j * 0.7) * 2) + 2, top + 6 + j, j % 3 ? 0x2a7142 : 0x3e8e4a);
  pb.outline('auto');
  return mk(pb, 7, 30);
}
function ruinwall(v) {
  const pb = new PB(28, 22);
  for (let y = 4; y < 21; y++) for (let x = 1; x < 27; x++) {
    const h = 4 + Math.floor(rnd(x >> 2, v, 7) * 6);
    if (y < h) continue;
    const row = Math.floor(y / 5), bx = (x + (row % 2) * 4) % 8;
    let k = 2 + (rnd(Math.floor((x + (row % 2) * 4) / 8), row, 3) > 0.55 ? 1 : 0);
    if (y % 5 === 4 || bx === 0) k = 1;
    if (y === h) k = 4;
    let c = STONE[k];
    if (rnd(x, y, 9) > 0.8 && y < 12) c = mix(c, 0x3e8e4a, 0.7);
    pb.set(x, y, c);
  }
  pb.outline('auto');
  return mk(pb, 14, 20);
}
function idol() {
  const pb = new PB(20, 30);
  const S = [0x3a3a32, 0x52524a, 0x6e6e62, 0x8c8c7e, 0xaaa898];
  pb.cyl(3, 3, 14, 25, S, { noise: 0.2 });
  pb.rect(4, 8, 4, 3, S[0]); pb.rect(12, 8, 4, 3, S[0]); pb.set(5, 9, 0x8aff6a); pb.set(13, 9, 0x8aff6a);
  pb.rect(8, 12, 4, 5, S[3]); pb.rect(5, 19, 10, 3, S[0]); for (let x = 6; x < 14; x += 2) pb.set(x, 19, S[4]);
  pb.hl(2, 3, 16, S[4]); pb.hl(1, 2, 18, S[2]);
  pb.rect(2, 27, 16, 2, S[1]);
  pb.outline('auto');
  return mk(pb, 10, 28, { glow: [[5, 9], [13, 9]], glowCol: '#8aff6a' });
}
function perch() {
  const pb = new PB(14, 27);
  pb.rect(6, 6, 2, 19, WOOD[3]); pb.vl(6, 6, 19, WOOD[4]);
  pb.rect(1, 5, 12, 2, WOOD[2]); pb.hl(1, 5, 12, WOOD[4]);
  pb.rect(3, 24, 8, 2, WOOD[2]);
  pb.outline('auto');
  return mk(pb, 7, 25);
}
function chest(v, open = false) {
  const pb = new PB(18, 17);
  const W = v === 3 ? [0x1c2016, 0x2a3020, 0x3a4228, 0x4c5630, 0x606c3a, 0x768446] : v === 2 ? [0x5a3a10, 0x8a5a14, 0xb8801e, 0xe0a832, 0xf8cc58, 0xfff0a0] : v === 1 ? [0x24160c, 0x3a2414, 0x54361e, 0x6e4828, 0x8a5c34, 0xa87444] : WOOD;
  const band = v === 0 || v === 3 ? IRON : GOLD;
  pb.rect(1, 7, 16, 9, W[3]);
  for (let y = 8; y < 16; y += 3) pb.hl(2, y, 14, W[2]);
  if (open) {
    pb.rect(1, 1, 16, 4, W[2]); pb.hl(1, 1, 16, W[4]); pb.rect(2, 5, 14, 3, 0x1a100a);
    for (let k = 0; k < 7; k++) pb.set(3 + k * 2, 6 + (k % 2), k % 3 ? 0xffd84a : 0xfff4b0);
  } else {
    pb.rect(1, 2, 16, 6, W[4]); pb.ellipse(9, 3, 8, 2.4, W[4]); pb.hl(2, 2, 14, W[5]);
  }
  pb.rect(4, 2, 2, 14, band[2]); pb.rect(12, 2, 2, 14, band[2]); pb.vl(4, 2, 14, band[3]); pb.vl(12, 2, 14, band[3]);
  if (!open) { pb.rect(7, 7, 4, 4, band[3]); pb.set(8, 8, band[0]); pb.set(8, 9, band[0]); pb.hl(7, 7, 4, band[4]); }
  if (v === 3) { // mousse et lianes : une cachette oubliée
    for (const [x, y] of [[2, 2], [3, 2], [6, 3], [10, 2], [14, 3], [15, 4], [2, 9], [16, 12], [3, 14], [9, 15], [14, 15]]) { pb.set(x, open ? y + 1 : y, 0x4e8a3a); pb.set(x + 1, open ? y + 1 : y, 0x3a6e30); }
    pb.vl(16, 6, 6, 0x3a6e30); pb.vl(1, 8, 5, 0x4e8a3a);
  }
  pb.outline('auto');
  return mk(pb, 9, 16);
}
function tonnelet() {
  const pb = new PB(14, 13);
  pb.cyl(1, 1, 12, 11, WOOD, { noise: 0.2 });
  pb.vl(3, 1, 11, IRON[2]); pb.vl(10, 1, 11, IRON[2]);
  pb.rect(5, 4, 4, 5, 0xf0e4c4); pb.set(6, 5, 0xb02a2a); pb.set(7, 6, 0xb02a2a); pb.set(6, 7, 0xb02a2a);
  pb.ellipse(1.5, 6.5, 1.4, 5, WOOD[4]);
  pb.outline('auto');
  return mk(pb, 7, 12);
}

// ---------------- bâtiments ----------------
function roofFill(pb, kind, x0, y0, x1, y1) {
  const R = Array.isArray(kind) ? kind : kind === 'thatch' ? THATCH : kind === 'red' ? RTILE : kind === 'blue' ? BTILE : kind === 'green' ? GTILE : SLATE;
  const W = x1 - x0;
  const put = (x, y, k) => {
    const cx = x - x0, cy = y - y0;
    if ((cx < 3 && cy < 3 - cx) || (W - 1 - cx < 3 && cy < 3 - (W - 1 - cx))) return;
    let c = R[clamp(k, 0, 4)];
    c = shade(c, 1.07 - 0.16 * (cx / W));
    pb.set(x, y, c);
  };
  if (kind === 'thatch') {
    for (let row = 0, y = y0 + 3; y < y1; row++, y += 5) for (let x = x0; x < x1; x++) {
      const ext = Math.floor(rnd(x >> 1, row, 9) * 3);
      for (let j = 0; j < 5 + ext && y + j < y1; j++) {
        let k = j < 1 ? 1 : j < 3 ? 2 : 3;
        if ((x + row) % 3 === 0) k -= 1;
        if (j === 4 + ext) k = 1;
        if (rnd(x, y + j, 11) > 0.92) k += 1;
        put(x, y + j, k);
      }
    }
    for (let x = x0; x < x1; x++) for (let y = y0; y < y0 + 4; y++) put(x, y, y === y0 ? 4 : (x % 2 ? 2 : 3));
  } else if (kind === 'slate') {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const row = Math.floor((y - y0) / 6), bx = (x - x0 + (row % 2) * 3) % 6;
      let k = (y - y0) % 6 === 5 ? 0 : bx === 0 ? 1 : (y - y0) % 6 === 0 ? 3 : 2;
      if (rnd(Math.floor((x + (row % 2) * 3) / 6), row, 4) > 0.75 && k > 1) k = 3;
      put(x, y, k);
    }
  } else {
    for (let row = 0, y = y0; y < y1; row++, y += 6) {
      const off = (row % 2) * 4;
      for (let x = x0; x < x1; x++) {
        const tx = (x - x0 + off) % 8;
        for (let j = 0; j < 6 && y + j < y1; j++) {
          let k = 2;
          if (j === 0) k = 3;
          if (tx === 0) k = 1;
          if (j >= 4 && (tx === 0 || tx === 7)) k = 0;
          if (j === 5) k = Math.min(k, 1);
          if (tx >= 2 && tx <= 3 && j >= 1 && j <= 2) k = 4;
          put(x, y + j, k);
        }
      }
    }
    for (let x = x0; x < x1; x++) { put(x, y0, 4); put(x, y0 + 1, 3); }
  }
  for (let x = x0; x < x1; x++) { pb.set(x, y1 - 1, shade(R[0], 0.8)); pb.set(x, y1 - 2, R[1]); }
}
function wallFill(pb, kind, x0, y0, x1, y1, pal = PLASTER) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    let c;
    if (kind === 'wood') {
      const row = Math.floor((y - y0) / 4), jy = (y - y0) % 4;
      let k = jy === 3 ? 1 : (row % 2 ? 3 : 2);
      if (jy === 0) k = 4 - (row % 2);
      if ((x + row * 11) % 37 === 0) k = 1;
      c = WOOD[k];
    } else if (kind === 'plaster') {
      c = pal[2 + (rnd(x >> 1, y >> 1, 3) > 0.7 ? 1 : 0) - (rnd(x, y, 4) > 0.95 ? 1 : 0)];
    } else {
      const row = Math.floor((y - y0) / 5), off = (row % 2) * 5, bx = (x - x0 + off) % 10;
      let k = 2 + (rnd(Math.floor((x - x0 + off) / 10), row, 3) > 0.6 ? 1 : 0);
      if ((y - y0) % 5 === 4 || bx === 0) k = 1; else if ((y - y0) % 5 === 0) k = Math.min(4, k + 1);
      c = STONE[k];
    }
    pb.set(x, y, c);
  }
  if (kind === 'plaster') {
    const B = WOOD[1], B2 = WOOD[2];
    for (let x = x0; x < x1; x++) { pb.set(x, y0, B); pb.set(x, y0 + 1, B2); pb.set(x, y1 - 4, B); }
    for (let x = x0; x < x1; x += 24) { pb.rect(x, y0, 3, y1 - y0 - 3, B); pb.vl(x + 1, y0, y1 - y0 - 3, B2); }
    pb.rect(x1 - 3, y0, 3, y1 - y0 - 3, B);
    for (let x = x0 + 3; x + 24 < x1; x += 48) pb.line(x, y0 + 2, x + 12, y0 + 14, B, 2);
  }
  if (kind === 'wood') { pb.rect(x0, y0, 3, y1 - y0, WOOD[1]); pb.vl(x0, y0, y1 - y0, WOOD[2]); pb.rect(x1 - 3, y0, 3, y1 - y0, WOOD[1]); }
  for (let x = x0; x < x1; x++) { pb.set(x, y1 - 1, STONE[1]); pb.set(x, y1 - 2, STONE[2]); pb.set(x, y1 - 3, x % 7 === 0 ? STONE[1] : STONE[3]); }
}
function doorAt(pb, x, y, w = 14, h = 22) {
  for (let j = 0; j < h; j++) { const ins = j < 3 ? [4, 2, 1][j] : 0; pb.hl(x + ins, y + j, w - ins * 2, STONE[1]); }
  for (let j = 1; j < h; j++) {
    const ins = j < 4 ? [5, 3, 2, 1][j] : 1;
    for (let i = ins; i < w - ins; i++) {
      const k = (i - 1) % 4 === 0 ? 1 : 2 + ((i % 4) === 2 ? 1 : 0);
      pb.set(x + i, y + j, WOOD[k]);
    }
  }
  pb.hl(x + 1, y + 6, w - 2, IRON[2]); pb.hl(x + 1, y + h - 6, w - 2, IRON[2]);
  pb.set(x + w - 4, y + (h >> 1) + 1, GOLD[3]); pb.set(x + w - 4, y + (h >> 1) + 2, GOLD[1]);
}
function windowAt(pb, x, y, w = 12, h = 11, shutter = null, flowers = null) {
  pb.rect(x, y, w, h, WOOD[1]);
  pb.rect(x + 1, y + 1, w - 2, h - 2, 0x24344f);
  pb.vl(x + (w >> 1), y + 1, h - 2, WOOD[2]); pb.hl(x + 1, y + (h >> 1), w - 2, WOOD[2]);
  for (const [px, py] of [[x + 2, y + 2], [x + (w >> 1) + 1, y + 2]]) { pb.set(px, py, 0x8fb7d9); pb.set(px + 1, py, 0x5d84ad); pb.set(px, py + 1, 0x5d84ad); }
  pb.hl(x - 1, y + h, w + 2, WOOD[4]); pb.hl(x - 1, y + h + 1, w + 2, WOOD[1]);
  if (shutter) for (const sx of [x - 4, x + w + 1]) {
    pb.rect(sx, y, 3, h, shutter[2]);
    for (let j = 1; j < h; j += 2) pb.hl(sx, y + j, 3, shutter[1]);
    pb.vl(sx, y, h, shutter[3]);
  }
  if (flowers) {
    pb.rect(x, y + h + 2, w, 3, WOOD[2]); pb.hl(x, y + h + 2, w, WOOD[3]);
    for (let i = 0; i < w; i += 2) { pb.set(x + i, y + h + 1, flowers[(i >> 1) % flowers.length]); pb.set(x + i + 1, y + h + 1, 0x3c8743); }
  }
  return { x: x + 1, y: y + 1, w: w - 2, h: h - 2 };
}
function hangingSign(pb, x, y, icon) {
  pb.hl(x, y, 13, IRON[1]); pb.vl(x, y - 1, 3, IRON[1]);
  pb.set(x + 3, y + 1, IRON[2]); pb.set(x + 3, y + 2, IRON[2]); pb.set(x + 10, y + 1, IRON[2]); pb.set(x + 10, y + 2, IRON[2]);
  pb.rect(x + 1, y + 3, 13, 10, WOOD[1]); pb.rect(x + 2, y + 4, 11, 8, WOOD[4]); pb.hl(x + 2, y + 4, 11, WOOD[5]);
  const ix = x + 4, iy = y + 5;
  if (icon === 'mug') {
    pb.rect(ix, iy + 1, 5, 5, GOLD[2]); pb.vl(ix, iy + 1, 5, GOLD[3]); pb.hl(ix, iy, 5, 0xffffff); pb.set(ix + 1, iy - 1 < y + 4 ? iy : iy, 0xffffff);
    pb.vl(ix + 5, iy + 2, 3, GOLD[1]); pb.set(ix + 6, iy + 2, GOLD[1]); pb.set(ix + 6, iy + 4, GOLD[1]); pb.vl(ix + 6, iy + 2, 3, GOLD[1]);
  } else if (icon === 'anchor') {
    pb.vl(ix + 3, iy, 6, IRON[3]); pb.hl(ix + 1, iy + 1, 5, IRON[3]); pb.set(ix + 3, iy, IRON[4]);
    pb.line(ix, iy + 4, ix + 3, iy + 6, IRON[3]); pb.line(ix + 6, iy + 4, ix + 3, iy + 6, IRON[3]); pb.set(ix, iy + 3, IRON[4]); pb.set(ix + 6, iy + 3, IRON[4]);
  } else if (icon === 'anvil') {
    pb.rect(ix - 1, iy + 1, 8, 2, IRON[3]); pb.rect(ix + 1, iy + 3, 4, 2, IRON[2]); pb.set(ix - 2, iy + 1, IRON[3]); pb.set(ix + 5, iy - 0, 0xffd84a); pb.set(ix + 6, iy - 1 >= y + 4 ? iy - 1 : iy, 0xffa030);
  } else if (icon === 'dice') { // 0.8 : enseignes de Libertalia
    pb.rect(ix - 1, iy + 1, 4, 4, 0xf3f0e2); pb.set(ix, iy + 2, 0x1a1418); pb.set(ix + 1, iy + 3, 0x1a1418);
    pb.rect(ix + 3, iy, 4, 4, 0xe25d55); pb.set(ix + 4, iy + 1, 0xffffff); pb.set(ix + 5, iy + 2, 0xffffff);
  } else if (icon === 'swords') {
    pb.line(ix - 1, iy, ix + 6, iy + 6, IRON[5]); pb.line(ix + 6, iy, ix - 1, iy + 6, IRON[4]);
    pb.set(ix, iy + 5, GOLD[3]); pb.set(ix + 5, iy + 5, GOLD[3]); pb.set(ix - 1, iy + 6, GOLD[2]); pb.set(ix + 6, iy + 6, GOLD[2]);
  } else if (icon === 'scissors') {
    pb.line(ix, iy, ix + 5, iy + 4, IRON[5]); pb.line(ix + 5, iy, ix, iy + 4, IRON[4]);
    pb.disc(ix, iy + 5.5, 1.2, GOLD[3]); pb.disc(ix + 5.5, iy + 5.5, 1.2, GOLD[3]);
  } else if (icon === 'flask') {
    pb.vl(ix + 3, iy - 1, 2, 0xd8e8f0); pb.disc(ix + 3, iy + 3.5, 2.6, 0xd8e8f0); pb.disc(ix + 3, iy + 4, 1.8, 0x3a8a2a); pb.set(ix + 2, iy + 2, 0xffffff);
  } else if (icon === 'horseshoe') {
    for (let a = 0.3; a < 2.9; a += 0.25) pb.set(ix + 3 + Math.cos(a + Math.PI) * 3, iy + 3 - Math.sin(a + Math.PI) * 3, IRON[4]);
    pb.set(ix, iy + 4, IRON[5]); pb.set(ix + 6, iy + 4, IRON[5]);
  } else if (icon === 'heart') {
    pb.disc(ix + 1.5, iy + 2, 1.7, 0xe0304a); pb.disc(ix + 4.5, iy + 2, 1.7, 0xe0304a);
    for (let j = 0; j < 4; j++) pb.hl(ix + j * 0.5 - 0.2, iy + 3 + j, 6 - j, 0xc01a36); pb.set(ix + 1, iy + 1, 0xff9aa8);
  } else if (icon === 'skull') {
    pb.rect(ix, iy, 6, 4, BONE[3]); pb.rect(ix + 1, iy + 4, 4, 2, BONE[2]); pb.set(ix + 1, iy + 2, 0x1a1418); pb.set(ix + 4, iy + 2, 0x1a1418); pb.set(ix + 2, iy + 5, 0x1a1418);
  } else if (icon === 'sail') { // 1.8 : la voilerie — une voile carrée gonflée sur sa vergue
    pb.vl(ix + 3, iy - 1, 7, WOOD[1]); pb.hl(ix, iy, 7, WOOD[2]);
    for (let j = 1; j < 6; j++) pb.hl(ix + (j > 3 ? 1 : 0), iy + j, 7 - (j > 3 ? 1 : 0), j % 2 ? 0xf3f0e2 : 0xe0d8c0);
  } else if (icon === 'map') { // 1.8 : le cartographe — une carte, une croix rouge
    pb.rect(ix - 1, iy, 8, 6, 0xe8d8a8); pb.vl(ix - 1, iy, 6, 0xc4b07a); pb.vl(ix + 6, iy, 6, 0xc4b07a);
    pb.line(ix, iy + 4, ix + 3, iy + 2, 0x6a8a4a); pb.set(ix + 4, iy + 2, 0xc0302a); pb.set(ix + 5, iy + 1, 0xc0302a); pb.set(ix + 5, iy + 3, 0xc0302a); pb.set(ix + 3, iy + 1, 0xc0302a);
  } else if (icon === 'jar') { // 1.8 : l'épicerie — un pot d'épices et un piment
    pb.rect(ix, iy + 1, 4, 5, 0xd88a2a); pb.hl(ix, iy + 1, 4, 0xf0b050); pb.rect(ix, iy, 4, 1, WOOD[1]);
    pb.line(ix + 5, iy + 1, ix + 6, iy + 5, 0xc0302a); pb.set(ix + 5, iy, 0x3a8a2a);
  } else if (icon === 'barrel') { // 1.8 : la tonnellerie
    pb.rect(ix, iy, 6, 6, WOOD[3]); pb.vl(ix, iy + 1, 4, WOOD[2]); pb.vl(ix + 5, iy + 1, 4, WOOD[2]); pb.hl(ix, iy + 1, 6, IRON[3]); pb.hl(ix, iy + 4, 6, IRON[3]);
  } else if (icon === 'rope') { // 1.8 : la corderie — une glène de cordage
    for (let a = 0; a < 6.28; a += 0.3) { pb.set(ix + 3 + Math.cos(a) * 3, iy + 3 + Math.sin(a) * 2.4, 0xc4a466); pb.set(ix + 3 + Math.cos(a) * 1.6, iy + 3 + Math.sin(a) * 1.2, 0xa08048); }
  } else if (icon === 'fish') { // 1.8 : la halle aux poissons
    pb.ellipse(ix + 3, iy + 3, 3, 1.6, 0x8ab0c4); pb.set(ix + 1, iy + 2, 0x1a1418); pb.set(ix + 6, iy + 2, 0x5a7a90); pb.set(ix + 7, iy + 1, 0x5a7a90); pb.set(ix + 7, iy + 5, 0x5a7a90); pb.set(ix + 6, iy + 4, 0x5a7a90);
  } else if (icon === 'crown') {
    pb.rect(ix, iy + 3, 7, 3, GOLD[3]); for (const k of [0, 3, 6]) pb.vl(ix + k, iy, 3, GOLD[3]); pb.set(ix + 3, iy + 4, 0xe0304a); pb.hl(ix, iy + 5, 7, GOLD[1]);
  }
}
function chimneyAt(pb, x, y, h) {
  for (let j = 0; j < h; j++) for (let i = 0; i < 8; i++) {
    const k = (j % 4 === 3) || ((i + Math.floor(j / 4) * 2) % 5 === 0) ? 1 : (i < 3 ? 3 : 2);
    pb.set(x + i, y + j, STONE[k]);
  }
  pb.rect(x - 1, y - 2, 10, 3, STONE[2]); pb.hl(x - 1, y - 2, 10, STONE[4]); pb.hl(x, y - 1, 8, 0x1a1418);
}
function building(o) {
  const W = o.w * 16 + 8, H = o.h * 16 + 28;
  const pb = new PB(W, H);
  const wallH = o.floors === 2 ? 46 : 31;
  const wallTop = H - wallH;
  const roofBottom = wallTop + 5;
  wallFill(pb, o.wall, 4, wallTop, W - 4, H, o.plaster);
  const wins = [];
  const doorX = 4 + o.door * 16 + 1;
  doorAt(pb, doorX, H - 22);
  const rows = o.floors === 2 ? [H - 20, H - 40] : [H - 21];
  for (const wy of rows) for (let c = 0; c < o.w; c++) {
    if (Math.abs(c - o.door) < 1 && wy === rows[0]) continue;
    if (o.winCols && !o.winCols.includes(c)) continue;
    if (!o.winCols && c % 2 !== (o.door % 2 ? 0 : 1) && o.w > 4) continue;
    const wx = 4 + c * 16 + 2;
    wins.push(windowAt(pb, wx, wy, 12, 10, o.shutter, wy === rows[0] ? o.flowers : null));
  }
  roofFill(pb, o.roof, 0, 0, W, roofBottom);
  for (let x = 4; x < W - 4; x++) for (let j = 0; j < 3; j++) { const c = pb.get(x, roofBottom + j); if (c !== -1) pb.set(x, roofBottom + j, shade(c, 0.62 + j * 0.12)); }
  let smoke = null;
  if (o.chimney) { chimneyAt(pb, W - 30, 4, 16); smoke = { x: W - 26, y: 1 }; }
  if (o.sign) hangingSign(pb, doorX + 15, H - 30, o.sign);
  if (o.awning) {
    const ax = doorX - 6, aw = 26;
    for (let y = 0; y < 7; y++) for (let x = 0; x < aw; x++) {
      if (y === 6 && x % 4 === 3) continue;
      pb.set(ax + x, H - 30 + y, Math.floor(x / 4) % 2 ? o.awning[4] : o.awning[2]);
    }
  }
  if (o.extra) o.extra(pb, W, H, wallTop);
  pb.outline('auto');
  return mk(pb, W / 2, H, { windows: wins, smoke });
}

// ---------------- phare ----------------
function lighthouse() {
  const W = 56, H = 124, pb = new PB(W, H), cx = 28;
  const RED = [0x5a1418, 0x8a2228, 0xb83434, 0xd85048, 0xf07a62];
  const WH = [0x8f8a90, 0xb8b4b8, 0xd8d4d4, 0xece8e4, 0xfaf8f4];
  for (let y = 34; y < 108; y++) {
    const t = (y - 34) / 74, hw = 8 + t * 4;
    const stripe = Math.floor((y - 34) / 12) % 2 === 0;
    const R = stripe ? RED : WH;
    for (let x = -hw; x < hw; x++) {
      const u = (x + hw) / (hw * 2);
      const b = 1 - Math.abs(u - 0.33) * 1.6;
      pb.set(cx + x, y, R[clamp(Math.floor(b * 5), 0, 4)]);
    }
  }
  for (const wy of [60, 84]) { pb.rect(cx - 2, wy, 4, 6, 0x24344f); pb.set(cx - 1, wy + 1, 0x8fb7d9); pb.hl(cx - 3, wy + 6, 6, WH[1]); }
  pb.rect(cx - 2, 98, 5, 10, WOOD[2]); pb.hl(cx - 2, 98, 5, WOOD[3]);
  pb.rect(cx - 13, 30, 26, 4, IRON[2]); pb.hl(cx - 13, 30, 26, IRON[3]); pb.hl(cx - 12, 33, 24, IRON[1]);
  for (let x = cx - 12; x <= cx + 12; x += 3) pb.vl(x, 25, 5, IRON[1]);
  pb.hl(cx - 12, 25, 25, IRON[2]);
  pb.rect(cx - 7, 15, 14, 15, IRON[1]);
  pb.rect(cx - 6, 16, 12, 13, 0xfff0b0); pb.rect(cx - 4, 18, 8, 9, 0xffffe8);
  pb.vl(cx - 2, 16, 13, IRON[2]); pb.vl(cx + 2, 16, 13, IRON[2]);
  for (let y = 6; y < 16; y++) { const hw = Math.sqrt(Math.max(0, 1 - ((16 - y) / 10) ** 2)) * 8; pb.hl(cx - hw, y, hw * 2, y < 10 ? RED[3] : RED[2]); }
  pb.disc(cx, 4, 2, GOLD[3]); pb.set(cx - 1, 3, GOLD[4]);
  for (const [x, y, rx, ry] of [[cx - 12, 112, 9, 7], [cx + 11, 113, 9, 6], [cx, 116, 13, 6], [cx - 20, 116, 6, 4], [cx + 20, 117, 6, 4]]) pb.blob(x, y, rx, ry, STONE, { noise: 0.25 });
  for (let x = 0; x < W; x++) for (let y = 120; y < H; y++) pb.clear(x, y);
  pb.outline('auto');
  return mk(pb, cx, 118, { light: [cx, 22] });
}

// ---------------- navire pirate ----------------
function skullFlag(pb, x, y, w = 15, h = 10, wave = 0) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dy = Math.round(Math.sin((i + wave) * 0.6) * 1 * (i / w));
    pb.set(x + i, y + j + dy, j === 0 ? 0x2a2a30 : 0x141418);
  }
  const sx = x + 5, sy = y + 2;
  pb.rect(sx, sy, 5, 4, 0xf0ece0); pb.rect(sx + 1, sy + 4, 3, 1, 0xf0ece0);
  pb.set(sx + 1, sy + 1, 0x141418); pb.set(sx + 3, sy + 1, 0x141418); pb.set(sx + 2, sy + 3, 0x141418);
  pb.set(sx - 1, sy + 6, 0xf0ece0); pb.set(sx + 5, sy + 6, 0xf0ece0); pb.set(sx, sy + 5, 0xd8d4c8); pb.set(sx + 4, sy + 5, 0xd8d4c8);
}
function sail(pb, x, y, w, h, mark = false, torn = false, colors = SAIL) {
  for (let i = 0; i < w; i++) {
    const u = i / (w - 1);
    const bulge = Math.sin(u * Math.PI) * 3;
    for (let j = 0; j < h + bulge; j++) {
      const v = j / (h + bulge);
      let b = 0.85 - u * 0.45 - v * 0.25 + Math.sin(u * Math.PI) * 0.2;
      if (i % 8 === 0) b -= 0.12;
      if (torn && rnd(i >> 1, j >> 1, 77) > 0.86) continue;
      pb.set(x + i, y + j, colors[clamp(Math.floor(b * 5), 0, 4)]);
    }
  }
  pb.rect(x - 3, y - 1, w + 6, 2, WOOD[1]); pb.hl(x - 3, y - 1, w + 6, WOOD[3]);
  if (mark) {
    const cx = x + (w >> 1), cy = y + (h >> 1);
    pb.ellipse(cx, cy - 1, 6, 5, mix(colors[1], 0x1a1418, 0.55));
    pb.rect(cx - 3, cy + 3, 7, 3, mix(colors[1], 0x1a1418, 0.55));
    pb.set(cx - 2, cy - 1, colors[3]); pb.set(cx - 3, cy - 1, colors[3]); pb.set(cx + 2, cy - 1, colors[3]); pb.set(cx + 3, cy - 1, colors[3]);
    pb.line(cx - 9, cy + 7, cx + 9, cy + 11, mix(colors[1], 0x1a1418, 0.55), 1.5); pb.line(cx - 9, cy + 11, cx + 9, cy + 7, mix(colors[1], 0x1a1418, 0.55), 1.5);
  }
}
function hull(pb, x0, x1, deckY, depth, broken = false) {
  const HULL = [0x1f120a, 0x2e1c10, 0x412816, 0x56361e, 0x6c4527];
  const DECK = [0x6a4628, 0x86592f, 0x9e6c3a, 0xb68048, 0xcc9a5e];
  const len = x1 - x0;
  for (let x = x0; x < x1; x++) {
    const t = (x - x0) / len;
    const bow = t > 0.82 ? (t - 0.82) / 0.18 : 0;
    const stern = t < 0.12 ? (0.12 - t) / 0.12 : 0;
    const hh = 9 * (1 - bow * bow);
    const cy = deckY - stern * 6 - bow * 3;
    for (let y = Math.round(cy - hh); y <= cy + hh; y++) {
      const edge = y <= cy - hh + 1.5 || y >= cy + hh - 1.5;
      let c = edge ? HULL[3] : DECK[2 + ((y >> 1) % 2 === 0 ? 0 : 1) - (((x + y * 3) % 23) === 0 ? 1 : 0)];
      if (broken && rnd(x >> 3, y >> 2, 41) > 0.86) c = 0x1a1210;
      pb.set(x, y, c);
    }
    const top = cy + hh, bot = top + depth * (1 - bow * 0.85) * (1 - stern * 0.2);
    for (let y = Math.round(top); y < bot; y++) {
      const d = (y - top) / (bot - top);
      let k = d < 0.12 ? 4 : d < 0.3 ? 3 : 2;
      if ((y - Math.round(top)) % 4 === 3) k -= 1;
      if (d > 0.27 && d < 0.33) { pb.set(x, y, broken ? 0x6a6a3a : GOLD[2]); continue; }
      let c = HULL[clamp(k - (d > 0.75 ? 1 : 0), 0, 4)];
      if (broken && rnd(x >> 1, y >> 1, 3) > 0.9) c = mix(c, 0x3f7f6a, 0.6);
      if (d > 0.85) c = mix(c, 0x2f5a4a, 0.4);
      pb.set(x, y, c);
    }
  }
}
function ship() {
  const W = 216, H = 156, pb = new PB(W, H);
  const deckY = 98, x0 = 12, x1 = 202;
  // mâts et voiles derrière le pont
  pb.rect(77, 10, 3, deckY - 10, WOOD[2]); pb.vl(77, 10, deckY - 10, WOOD[3]);
  pb.rect(140, 22, 3, deckY - 22, WOOD[2]); pb.vl(140, 22, deckY - 22, WOOD[3]);
  sail(pb, 56, 22, 46, 20); sail(pb, 50, 48, 58, 30, true);
  sail(pb, 122, 32, 40, 17); sail(pb, 117, 54, 50, 26);
  skullFlag(pb, 80, 3);
  pb.rect(76, 7, 5, 2, WOOD[1]);
  hull(pb, x0, x1, deckY, 40);
  // château arrière
  pb.rect(16, 66, 40, 22, 0x412816);
  for (let y = 66; y < 88; y++) for (let x = 16; x < 56; x++) if ((y - 66) % 5 === 4) pb.set(x, y, 0x2e1c10);
  pb.rect(14, 62, 44, 5, 0x6c4527); pb.hl(14, 62, 44, 0x8a5c34);
  for (let x = 15; x < 57; x += 4) pb.vl(x, 57, 5, 0x56361e);
  pb.hl(14, 57, 44, 0x6c4527);
  for (const wx of [22, 34, 46]) { pb.rect(wx, 72, 6, 7, GOLD[1]); pb.rect(wx + 1, 73, 4, 5, 0x24344f); pb.set(wx + 1, 73, 0x8fb7d9); }
  pb.rect(16, 50, 3, 8, IRON[1]); pb.rect(14, 46, 7, 5, IRON[2]); pb.rect(15, 47, 5, 3, 0xffd36b);
  // canons
  for (let x = 66; x < 186; x += 20) { pb.rect(x, 116, 7, 5, 0x120a06); pb.rect(x + 2, 117, 4, 3, IRON[2]); pb.set(x + 2, 117, IRON[4]); }
  // beaupré et figure de proue
  pb.line(198, 92, 214, 78, WOOD[2], 2);
  pb.disc(202, 100, 2.5, GOLD[3]); pb.set(201, 99, GOLD[4]);
  // gréement
  for (const [ax, ay, bx, by] of [[78, 12, 20, 60], [78, 12, 140, 24], [141, 24, 212, 80], [78, 40, 30, 88], [141, 46, 190, 94], [78, 40, 110, 92], [141, 46, 112, 92]]) pb.line(ax, ay, bx, by, 0x2a1c14);
  pb.outline('auto');
  for (let x = 0; x < W; x++) for (let y = 143; y < H; y++) pb.clear(x, y);
  return mk(pb, 108, 140, { lights: [[17, 48], [25, 75], [37, 75], [49, 75]] });
}
function wreck() {
  const W = 210, H = 130, src = new PB(W, H);
  const GREY = [0x2f3530, 0x434a42, 0x596052, 0x6f7664, 0x8a9078];
  const HULLW = [0x1c140e, 0x2a1e14, 0x3a2a1c, 0x4c3826, 0x5e4630];
  // flanc de la coque (profil)
  for (let x = 14; x < 200; x++) {
    const t = (x - 14) / 186;
    const top = 58 - (t > 0.82 ? ((t - 0.82) / 0.18) ** 1.5 * 14 : 0) - (t < 0.1 ? (0.1 - t) / 0.1 * 7 : 0);
    const bot = 108 - Math.pow(Math.abs(t - 0.45) / 0.55, 2) * 34;
    for (let y = Math.round(top); y < bot; y++) {
      const d = (y - top) / (bot - top);
      let k = d < 0.08 ? 4 : d < 0.25 ? 3 : 2;
      if ((y - Math.round(top)) % 4 === 3) k -= 1;
      if (((x * 7 + Math.floor(y / 4) * 13) % 41) === 0) k = 1;
      let c = HULLW[Math.max(0, Math.min(4, k))];
      if (d > 0.2 && d < 0.26) c = 0x5a5a32;
      if (d > 0.6 && rnd(x >> 1, y >> 1, 3) > 0.7) c = mix(c, 0x2f6a55, 0.5);
      src.set(x, y, c);
    }
    // bastingage
    src.set(x, Math.round(top) - 1, HULLW[4]); src.set(x, Math.round(top) - 2, HULLW[2]);
    if (x % 6 === 0 && t > 0.1 && t < 0.85) src.vl(x, Math.round(top) - 6, 4, HULLW[3]);
    if (t > 0.1 && t < 0.85) src.set(x, Math.round(top) - 6, HULLW[4]);
  }
  // grande brèche avec membrures
  src.ellipse(104, 82, 20, 15, 0x0c0806);
  for (let k = 0; k < 7; k++) { const x = 88 + k * 5; for (let y = 68; y < 97; y++) { const dx = (x - 104) / 20, dy = (y - 82) / 15; if (dx * dx + dy * dy < 1) { src.set(x, y, WOOD[1]); src.set(x + 1, y, WOOD[2]); } } }
  for (let a = 0; a < 6.28; a += 0.15) { const r = 1 + rnd(Math.floor(a * 10), 1, 5) * 0.25; src.set(104 + Math.cos(a) * 20 * r, 82 + Math.sin(a) * 15 * r, HULLW[4]); }
  // sabords
  for (let x = 40; x < 170; x += 22) if (Math.abs(x - 104) > 26) { src.rect(x, 74, 6, 5, 0x0c0806); src.set(x + 1, 75, 0x2a2a2a); }
  // château arrière
  src.rect(18, 40, 34, 16, HULLW[2]); src.hl(16, 39, 38, HULLW[4]);
  for (const wx of [24, 36]) { src.rect(wx, 45, 6, 6, 0x0c0806); src.set(wx + 1, 46, 0x3fbf8f); }
  // mât cassé et voile déchirée
  src.rect(78, 12, 4, 46, WOOD[1]); src.vl(78, 12, 46, WOOD[3]);
  for (let k = 0; k < 5; k++) src.set(78 + k % 4, 11 - (k % 2) * 3, WOOD[1]);
  sail(src, 60, 20, 38, 26, false, true, GREY);
  src.line(81, 24, 150, 54, 0x2a1c14); src.line(80, 30, 30, 40, 0x2a1c14);
  src.rect(146, 34, 3, 24, WOOD[1]); src.set(147, 33, WOOD[2]); src.set(146, 32, WOOD[1]);
  src.line(150, 52, 196, 30, WOOD[2], 2.4);
  // algues pendantes
  for (let x = 30; x < 180; x += 7) { const n = 3 + Math.floor(rnd(x, 2, 9) * 6); for (let j = 0; j < n; j++) src.set(x + (j > 3 ? 1 : 0), 92 + j - Math.abs(x - 100) * 0.12, j % 2 ? 0x2f6a45 : 0x3f8a55); }
  const rot = src.rotated(-0.16, 105, 80);
  const out = new PB(W, H);
  out.paste(rot, 0, 0);
  for (let x = 0; x < W; x++) {
    const wl = 98 - (x - 105) * 0.02;
    for (let y = Math.round(wl); y < H; y++) out.clear(x, y);
  }
  out.outline('auto');
  return mk(out, 105, 98, { glow: [[60, 52], [104, 80], [34, 56]], glowCol: '#6aff9a' });
}

// ---------------- constructions des joueurs ----------------
function wallWood() {
  const pb = new PB(16, 26);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) pb.set(x, y, y % 4 === 3 ? WOOD[2] : WOOD[y < 2 ? 5 : 4]);
  for (let y = 8; y < 26; y++) for (let x = 0; x < 16; x++) { const k = x % 4 === 0 ? 1 : x % 4 === 1 ? 4 : 3; pb.set(x, y, WOOD[y > 22 ? Math.max(0, k - 2) : k]); }
  pb.hl(0, 8, 16, WOOD[1]); pb.hl(0, 0, 16, WOOD[2]); pb.hl(0, 25, 16, 0x24140a);
  for (const x of [2, 6, 10, 14]) { pb.set(x, 11, IRON[2]); pb.set(x, 21, IRON[2]); }
  return mk(pb, 8, 25);
}
function palisade() {
  const pb = new PB(16, 28);
  for (let k = 0; k < 4; k++) {
    const x0 = k * 4, top = 3 + (k % 2) * 2;
    for (let y = top; y < 28; y++) for (let i = 0; i < 4; i++) {
      if (y < top + 3 && Math.abs(i - 1.5) > (y - top) * 0.7) continue;
      const b = 1 - Math.abs((i + 0.5) / 4 - 0.35) * 1.6;
      pb.set(x0 + i, y, TRUNK[Math.max(0, Math.min(4, Math.floor(b * 5) - (y > 25 ? 1 : 0)))]);
    }
  }
  pb.hl(0, 14, 16, 0xc8a870); pb.hl(0, 15, 16, 0x8a6a3a);
  return mk(pb, 8, 27);
}
function wallStone() {
  const pb = new PB(16, 24);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 16; x++) pb.set(x, y, STONE[y < 2 ? 5 : 4 - ((x + y) % 5 === 0 ? 1 : 0)]);
  for (let y = 7; y < 24; y++) for (let x = 0; x < 16; x++) {
    const row = Math.floor((y - 7) / 4), bx = (x + (row % 2) * 4) % 8;
    let k = (y - 7) % 4 === 3 || bx === 0 ? 1 : 3 - (rnd(Math.floor((x + (row % 2) * 4) / 8), row, 5) > 0.6 ? 1 : 0);
    if (y > 21) k = Math.max(0, k - 1);
    pb.set(x, y, STONE[k]);
  }
  pb.hl(0, 7, 16, STONE[1]); pb.hl(0, 23, 16, STONE[0]);
  return mk(pb, 8, 23);
}
function doorStruct() {
  const pb = new PB(16, 26);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) pb.set(x, y, y % 4 === 3 ? WOOD[1] : WOOD[3]);
  pb.rect(0, 8, 16, 18, WOOD[0]);
  for (let y = 9; y < 26; y++) for (let x = 2; x < 14; x++) pb.set(x, y, WOOD[(x - 2) % 4 === 0 ? 2 : 3]);
  pb.hl(2, 12, 12, IRON[2]); pb.hl(2, 21, 12, IRON[2]); pb.set(11, 17, GOLD[3]); pb.set(11, 18, GOLD[1]);
  pb.hl(0, 8, 16, WOOD[1]); pb.hl(0, 25, 16, 0x24140a);
  return mk(pb, 8, 25);
}
function floorPlanks() {
  const pb = new PB(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const row = y >> 2, seam = (x + row * 7) % 16 === 0; pb.set(x, y, y % 4 === 3 || seam ? WOOD[2] : WOOD[4 - (row % 2)]); }
  return mk(pb, 0, 0);
}
function rug() {
  const pb = new PB(16, 16);
  pb.rect(0, 0, 16, 16, 0x8a2228); pb.rect(1, 1, 14, 14, 0xb03232); pb.rect(3, 3, 10, 10, 0x8a2228); pb.rect(4, 4, 8, 8, 0xd8a43a);
  pb.rect(6, 6, 4, 4, 0x8a2228); for (let i = 0; i < 16; i += 3) { pb.set(i, 0, 0xf0c040); pb.set(i, 15, 0xf0c040); }
  return mk(pb, 0, 0);
}
function campfire() {
  const pb = new PB(18, 13);
  for (const [x, y] of [[3, 8], [7, 10], [11, 10], [15, 8], [5, 5], [13, 5], [9, 4]]) pb.blob(x, y, 2.6, 2, STONE.slice(1), {});
  pb.line(4, 9, 14, 5, TRUNK[2], 2.4); pb.line(4, 5, 14, 9, TRUNK[3], 2.4);
  pb.ellipse(9, 7, 3, 2, 0x2a1a12);
  pb.outline('auto');
  return mk(pb, 9, 11, { flame: [9, 5] });
}
function workbench() {
  const pb = new PB(22, 19);
  pb.rect(2, 9, 2, 9, WOOD[1]); pb.rect(18, 9, 2, 9, WOOD[1]); pb.rect(2, 14, 18, 2, WOOD[2]);
  pb.rect(0, 4, 22, 6, WOOD[4]); pb.hl(0, 4, 22, WOOD[5]); pb.hl(0, 9, 22, WOOD[2]);
  pb.rect(3, 2, 7, 2, IRON[4]); pb.hl(3, 3, 7, IRON[2]); pb.rect(10, 1, 2, 4, WOOD[2]);
  pb.rect(14, 1, 5, 2, IRON[3]); pb.rect(16, 3, 1, 3, WOOD[2]);
  pb.outline('auto');
  return mk(pb, 11, 17);
}
function forgeStruct() {
  const pb = new PB(22, 26);
  pb.cyl(2, 6, 18, 18, STONE, { noise: 0.2 });
  for (let y = 6; y < 24; y += 4) pb.hl(2, y, 18, STONE[1]);
  pb.rect(6, 13, 10, 9, 0x1a0e08); pb.ellipse(11, 13, 5, 3, 0x1a0e08); pb.rect(7, 16, 8, 5, 0xff8a2a); pb.hl(7, 16, 8, 0xffd24a);
  pb.rect(14, 0, 5, 7, STONE[2]); pb.hl(14, 0, 5, STONE[4]);
  pb.outline('auto');
  return mk(pb, 11, 24, { glowAt: [11, 18] });
}
function bed() {
  const pb = new PB(16, 24);
  pb.rect(1, 2, 14, 21, WOOD[2]); pb.rect(2, 3, 12, 19, WOOD[3]);
  pb.rect(3, 4, 10, 5, 0xf4f0e6); pb.hl(3, 8, 10, 0xd8d2c4);
  pb.rect(2, 10, 12, 11, 0xb03232); pb.hl(2, 10, 12, 0xd44e46); for (let y = 12; y < 21; y += 3) pb.hl(2, y, 12, 0x8a2228);
  pb.rect(1, 21, 14, 2, WOOD[1]);
  pb.outline('auto');
  return mk(pb, 8, 23);
}
function planter(grown) {
  const pb = new PB(16, 15);
  pb.rect(1, 7, 14, 7, WOOD[3]); pb.hl(1, 7, 14, WOOD[4]); pb.vl(1, 7, 7, WOOD[2]); pb.vl(14, 7, 7, WOOD[2]); pb.hl(2, 8, 12, 0x3a2414);
  if (grown) { for (const [x, y] of [[4, 4], [8, 3], [12, 4]]) { pb.blob(x, y + 1, 2.6, 2.4, LEAF.slice(1), {}); pb.set(x, y, 0xd6323c); pb.set(x + 1, y + 1, 0xff7070); } }
  else for (const x of [4, 8, 12]) { pb.vl(x, 5, 3, 0x3c8743); pb.set(x - 1, 5, 0x55a44f); }
  pb.outline('auto');
  return mk(pb, 8, 14);
}
function flag(frame) {
  const pb = new PB(18, 38);
  pb.rect(2, 2, 2, 35, WOOD[2]); pb.vl(2, 2, 35, WOOD[4]); pb.rect(1, 0, 4, 2, GOLD[2]);
  for (let j = 0; j < 10; j++) for (let i = 0; i < 13; i++) { const dy = Math.round(Math.sin((i + frame * 2) * 0.6) * (i / 13) * 1.5); pb.set(4 + i, 3 + j + dy, j === 0 ? 0x2a2a30 : 0x141418); }
  pb.rect(8, 5, 5, 4, 0xf0ece0); pb.set(9, 6, 0x141418); pb.set(11, 6, 0x141418); pb.rect(9, 9, 3, 1, 0xf0ece0);
  pb.rect(1, 35, 4, 2, STONE[2]);
  pb.outline('auto');
  return mk(pb, 3, 36);
}
function stump(v) {
  const pb = new PB(14, 10);
  pb.cyl(3, 3, 8, 6, TRUNK); pb.ellipse(7, 3.5, 4, 1.8, PTRUNK[3]); pb.ellipse(7, 3.5, 2.2, 1, PTRUNK[2]);
  pb.line(2, 8, 0, 9, TRUNK[1]); pb.line(11, 8, 13, 9, TRUNK[1]);
  pb.outline('auto');
  return mk(pb, 7, 9);
}

// ---------------- intérieurs ----------------
const DW = [0x24160c, 0x3a2414, 0x553620, 0x6f482a, 0x8a5c36, 0xa67444];
const GLASS = [0x2a6a3a, 0x7a2a2a, 0x2e4a8a, 0x8a6a2a, 0x5a2a6a, 0x3a7a7a];
function etagere(v) {
  const pb = new PB(16, 34);
  pb.rect(0, 0, 16, 33, DW[1]); pb.rect(1, 1, 14, 31, 0x1c110a);
  pb.vl(0, 0, 33, DW[3]); pb.vl(15, 0, 33, DW[1]); pb.hl(0, 0, 16, DW[4]);
  const shelves = [10, 20, 30];
  for (const y of shelves) { pb.hl(0, y, 16, DW[4]); pb.hl(0, y + 1, 16, DW[2]); }
  const R = mulberry32(v * 977 + 13);
  for (const y of shelves) {
    let x = 2;
    while (x < 14) {
      const k = R();
      if (v % 2 === 0) {
        const c = GLASS[(R() * GLASS.length) | 0], h = 5 + ((R() * 3) | 0);
        pb.rect(x, y - h, 2, h, c); pb.vl(x, y - h + 1, h - 2, shade(c, 1.45)); pb.set(x, y - h - 1, 0xc8b078); pb.set(x + 1, y - h - 1, 0x8a6a3a);
        x += 3;
      } else if (k < 0.72) {
        const c = [0x7a2a2a, 0x2a4a7a, 0x3a6a3a, 0x8a6a2a, 0x5a3a6a, 0x9a8a6a][(R() * 6) | 0], h = 6 + ((R() * 3) | 0);
        pb.rect(x, y - h, 2, h, c); pb.set(x, y - h + 1, shade(c, 1.6)); pb.set(x + 1, y - 2, shade(c, 0.6));
        x += 2;
      } else {
        if (x + 4 > 14) break;
        pb.rect(x, y - 4, 4, 4, 0xa0703f); pb.hl(x, y - 4, 4, 0xc8945a); pb.hl(x, y - 5, 4, 0x6a4423); pb.set(x + 1, y - 3, 0xd8b078);
        x += 5;
      }
    }
  }
  pb.outline('auto');
  return mk(pb, 8, 33);
}
function comptoir(v) {
  const pb = new PB(16, 22);
  pb.rect(0, 6, 16, 3, DW[5]); pb.hl(0, 6, 16, 0xc08a52); pb.hl(0, 8, 16, DW[3]);
  pb.rect(0, 9, 16, 12, DW[2]);
  pb.rect(2, 11, 12, 8, DW[3]); pb.hl(2, 11, 12, DW[1]); pb.vl(2, 11, 8, DW[1]); pb.hl(2, 18, 12, DW[4]); pb.vl(13, 11, 8, DW[4]);
  pb.hl(0, 21, 16, DW[0]);
  if (v === 0) { pb.rect(4, 1, 4, 5, GOLD[2]); pb.vl(4, 1, 5, GOLD[3]); pb.hl(4, 1, 4, 0xfff6d8); pb.vl(8, 2, 3, GOLD[1]); }
  else if (v === 1) { pb.rect(10, 0, 3, 6, 0x2a6a3a); pb.vl(10, 1, 4, 0x6ab07a); pb.set(11, 0, 0xc8b078); pb.rect(3, 4, 2, 2, 0xe8e0d0); }
  else { pb.ellipse(7, 5, 4, 1.4, 0xe8e0d0); pb.ellipse(7, 4.6, 2.4, 0.8, 0xc87a3a); }
  pb.outline('auto');
  return mk(pb, 8, 21);
}
function cheminee() {
  const pb = new PB(30, 36);
  for (let y = 0; y < 14; y++) for (let x = 8; x < 22; x++) pb.set(x, y, STONE[(x + y * 3) % 7 === 0 ? 1 : (x < 11 ? 3 : 2)]);
  pb.rect(1, 14, 28, 4, WOOD[4]); pb.hl(1, 14, 28, WOOD[5]); pb.hl(1, 17, 28, WOOD[2]);
  for (let y = 18; y < 35; y++) for (let x = 2; x < 28; x++) {
    const row = Math.floor((y - 18) / 4), off = row % 2 ? 3 : 0;
    pb.set(x, y, (y - 18) % 4 === 3 || (x + off) % 7 === 0 ? STONE[1] : STONE[x < 6 ? 4 : 3]);
  }
  pb.rect(8, 22, 14, 13, 0x140a08); pb.ellipse(15, 22, 7, 3, 0x140a08);
  pb.rect(9, 31, 12, 3, 0x3a1a0e); for (let x = 9; x < 21; x += 2) pb.set(x, 31, 0xff8a2a);
  pb.line(10, 33, 19, 31, TRUNK[2], 1.6); pb.line(10, 31, 19, 33, TRUNK[3], 1.6);
  pb.rect(4, 10, 2, 4, 0xeee6d0); pb.set(4, 9, 0xffd24a);
  pb.rect(22, 10, 4, 4, GOLD[2]); pb.hl(22, 10, 4, GOLD[3]);
  pb.outline('auto');
  return mk(pb, 15, 35, { flame: [15, 31], light: [15, 26] });
}
function table(v) {
  const pb = new PB(22, 20);
  pb.rect(4, 11, 2, 8, DW[1]); pb.rect(16, 11, 2, 8, DW[1]);
  pb.ellipse(11, 9, 10, 4.5, DW[3]); pb.ellipse(11, 8.4, 9, 3.6, DW[5]); pb.hl(4, 6, 14, 0xb88454);
  pb.rect(10, 2, 2, 5, 0xeee6d0); pb.set(10, 7, 0xc8b898); pb.set(10, 1, 0xffd24a); pb.set(11, 1, 0xfff2b0); pb.set(10, 0, 0xffb43a);
  if (v % 2 === 0) { pb.rect(4, 6, 3, 3, GOLD[2]); pb.set(4, 6, GOLD[3]); } else { pb.ellipse(16, 8, 2.4, 1, 0xe8e0d0); }
  pb.outline('auto');
  return mk(pb, 11, 18, { lights: [[11, 1]] });
}
function chaise(v) {
  const pb = new PB(10, 14);
  pb.rect(1, 6, 8, 3, DW[4]); pb.hl(1, 6, 8, DW[5]);
  pb.vl(2, 9, 4, DW[2]); pb.vl(7, 9, 4, DW[2]);
  if (v === 0) { pb.rect(0, 0, 2, 9, DW[3]); pb.hl(0, 2, 2, DW[5]); } else { pb.rect(8, 0, 2, 9, DW[3]); pb.hl(8, 2, 2, DW[5]); }
  pb.outline('auto');
  return mk(pb, 5, 13);
}
function ratelier(v) {
  const pb = new PB(18, 30);
  pb.rect(1, 3, 2, 26, DW[3]); pb.rect(15, 3, 2, 26, DW[2]);
  pb.rect(0, 3, 18, 2, DW[4]); pb.hl(0, 3, 18, DW[5]); pb.rect(0, 17, 18, 2, DW[3]); pb.rect(0, 26, 18, 2, DW[2]);
  const B = [0x4a4c5a, 0x7c8090, 0xb4b8c6, 0xeef0f8];
  if (v === 0) {
    for (const x of [6, 11]) { pb.vl(x, 6, 16, B[3]); pb.vl(x + 1, 7, 15, B[1]); pb.rect(x - 1, 22, 3, 1, GOLD[2]); pb.vl(x, 23, 3, 0x5a3420); }
    pb.rect(4, 5, 10, 1, IRON[2]);
  } else {
    for (const x of [5, 12]) { pb.vl(x, 5, 20, IRON[3]); pb.vl(x + 1, 13, 12, WOOD[3]); pb.rect(x, 22, 2, 3, WOOD[2]); }
    pb.vl(9, 8, 14, WOOD[2]); pb.rect(7, 7, 5, 3, IRON[4]); pb.hl(7, 7, 5, IRON[5]);
  }
  pb.outline('auto');
  return mk(pb, 9, 29);
}
function plante() {
  const pb = new PB(18, 26);
  for (const [a, l, d] of [[-2.6, 8, 0.5], [-2.0, 10, 0.6], [-1.57, 11, 0.2], [-1.1, 10, 0.6], [-0.5, 8, 0.5]]) frond(pb, 9, 15, a, l, d, PALMC, 2.2);
  pb.rect(5, 17, 8, 8, 0xa0502a); pb.hl(4, 17, 10, 0xc8703a); pb.hl(5, 24, 8, 0x6a3018); pb.vl(5, 18, 6, 0xb8603a); pb.vl(12, 18, 6, 0x803a1e);
  pb.outline('auto');
  return mk(pb, 9, 25);
}
function litDeco() {
  const pb = new PB(18, 30);
  pb.rect(0, 0, 18, 8, DW[3]); pb.hl(0, 0, 18, DW[5]); pb.rect(2, 2, 14, 4, DW[2]);
  pb.rect(1, 7, 16, 21, DW[2]);
  pb.rect(2, 8, 14, 19, 0xe8e0d0);
  pb.rect(3, 9, 12, 5, 0xf8f4ec); pb.hl(3, 13, 12, 0xd8d0c0);
  pb.rect(2, 15, 14, 12, 0x2a4a8a); pb.hl(2, 15, 14, 0x4a6ab0); for (let y = 18; y < 27; y += 3) pb.hl(2, y, 14, 0x1e3a70);
  pb.rect(1, 27, 16, 2, DW[1]);
  pb.outline('auto');
  return mk(pb, 9, 29);
}
function fourneau() {
  const pb = new PB(24, 34);
  for (let y = 0; y < 12; y++) for (let x = 7; x < 17; x++) pb.set(x, y, STONE[(x + y) % 5 === 0 ? 1 : x < 9 ? 3 : 2]);
  for (let y = 12; y < 33; y++) for (let x = 2; x < 22; x++) {
    const row = (y - 12) >> 2, off = row % 2 ? 3 : 0;
    pb.set(x, y, (y - 12) % 4 === 3 || (x + off) % 6 === 0 ? STONE[1] : x < 5 ? STONE[3] : STONE[2]);
  }
  pb.rect(6, 19, 12, 10, 0x1a0a06); pb.ellipse(12, 19, 6, 3, 0x1a0a06);
  pb.rect(7, 23, 10, 5, 0xff7a1a); pb.hl(7, 23, 10, 0xffd24a); pb.hl(8, 27, 8, 0xb83a10);
  pb.rect(1, 11, 22, 2, IRON[3]); pb.hl(1, 11, 22, IRON[4]);
  pb.outline('auto');
  return mk(pb, 12, 33, { flame: [12, 27], light: [12, 22] });
}
function tapisDeco() {
  const pb = new PB(64, 30);
  for (let y = 0; y < 30; y++) for (let x = 2; x < 62; x++) {
    const bx = Math.min(x - 2, 61 - x), by = Math.min(y, 29 - y), b = Math.min(bx, by);
    let c = 0x8a2228;
    if (b < 2) c = 0x5a1418; else if (b < 4) c = 0xd8a43a; else if (b < 5) c = 0x5a1418;
    else { const dx = Math.abs(x - 32) / 26, dy = Math.abs(y - 15) / 11; const d = dx + dy; c = d < 0.35 ? 0xd8a43a : d < 0.45 ? 0x2a3a6a : d < 0.7 ? 0xa8323a : ((x + y) % 6 === 0 ? 0x9a2a30 : 0x8a2228); }
    pb.set(x, y, c);
  }
  for (let y = 1; y < 29; y += 2) { pb.set(0, y, 0xe8dcc0); pb.set(1, y, 0xe8dcc0); pb.set(62, y, 0xe8dcc0); pb.set(63, y, 0xe8dcc0); }
  return mk(pb, 8, 18);
}
// ---------------- grottes ----------------
const CRY = [
  [0x16204e, 0x2a4aa8, 0x5a8ae0, 0xa8d8ff, 0xeaf8ff],
  [0x2a1450, 0x5a2a9a, 0x8a5ad8, 0xc8a0ff, 0xf4e8ff],
  [0x0c3a3a, 0x1a6a6a, 0x3aaaa0, 0x8af0e0, 0xe8fffa],
];
function shard(pb, x, y, h, R, w = 3) {
  for (let j = 0; j < h; j++) {
    const t = j / h, half = Math.max(0.5, (w / 2) * Math.min(1, (1 - t) * 3));
    for (let i = -Math.floor(half); i <= Math.floor(half); i++) pb.set(x + i, y - j, i < 0 ? R[3] : i === 0 ? R[4 - (j % 5 === 0 ? 1 : 0)] : R[1]);
  }
  pb.set(x, y - h, R[4]);
}
function cristal(v) {
  const pb = new PB(16, 22), R = CRY[v % 3];
  pb.blob(8, 19, 6, 2.6, [0x1a1620, 0x2a2531, 0x3b3445, 0x524a5e], {});
  shard(pb, 4, 19, 9, R, 3); shard(pb, 12, 19, 8, R, 3); shard(pb, 8, 20, 16, R, 4); shard(pb, 10, 20, 6, R, 2);
  pb.outline('auto');
  return mk(pb, 8, 20, { glow: [[8, 10]], glowCol: ['cold', 'purple', 'cold'][v % 3], glowR: 34 });
}
const CROCK = [0x2a2834, 0x3d3b4a, 0x545264, 0x6b697c, 0x858397];
function grotteCliff(hidden) {
  const pb = new PB(30, 34);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 30; x++) {
    const dx = (x + 0.5 - 15) / 14.5, dy = (y + 0.5 - 31) / 31;
    const d = dx * dx + dy * dy;
    if (d > 1) continue;
    const n = rnd(x >> 1, y >> 1, 41);
    pb.set(x, y, CROCK[d > 0.72 ? 1 + (n > 0.5 ? 1 : 0) : 2 + (n > 0.6 ? 1 : 0) - (x > 20 ? 1 : 0)]);
  }
  for (let y = 9; y < 32; y++) for (let x = 5; x < 25; x++) {
    const dx = (x + 0.5 - 15) / 8.6, dy = (y + 0.5 - 32) / 22.5;
    if (dx * dx + dy * dy > 1) continue;
    pb.set(x, y, mix(0x020104, 0x241c2c, Math.min(1, (y - 9) / 23) * 0.55));
  }
  for (const [x, l] of [[9, 3], [12, 2], [16, 4], [19, 2]]) { const top = Math.round(31 - 22.5 * Math.sqrt(Math.max(0, 1 - Math.pow((x + 0.5 - 15) / 8.6, 2)))); pb.vl(x, top, l, CROCK[2]); }
  for (const [x, y, r] of [[5, 31, 2.4], [24, 31, 2.6], [9, 32.5, 1.5], [21, 32.5, 1.4]]) pb.blob(x, y, r, r * 0.8, CROCK.slice(1), {});
  for (const [x, len] of [[6, 14], [10, 9], [21, 12], [25, 16], [15, 6]]) for (let j = 0; j < len; j++) { pb.set(x + Math.round(Math.sin(j * 0.5) * 0.6), j + 2, j % 3 ? 0x2c6c3f : 0x3a8445); if (j % 4 === 2) pb.set(x + 1, j + 2, 0x54a04e); }
  if (hidden) {
    for (let x = 4; x < 27; x++) { const len = 22 + Math.round(rnd(x, 3, 47) * 8); for (let j = 3; j < Math.min(32, len + 3); j++) pb.set(x, j, [0x163a2a, 0x1f5236, 0x2b6b3f, 0x3c8746][(x + (j >> 1)) % 4]); }
    for (let k = 0; k < 16; k++) pb.blob(5 + rnd(k, 1, 48) * 20, 6 + rnd(k, 2, 48) * 22, 2.2, 1.7, LEAF.slice(1), {});
  }
  pb.outline('auto');
  return mk(pb, 15, 33);
}
function grotteSkull(hidden) {
  const pb = new PB(48, 46);
  const B = [0x5a5446, 0x7a735e, 0x9e9678, 0xc4bb9c, 0xe4dcc0];
  pb.blob(24, 20, 21, 19, B, { noise: 0.22, grain: 1 });
  pb.blob(24, 36, 16, 9, B, { noise: 0.2, grain: 1, bias: -0.05 });
  for (const ex of [15, 33]) { pb.ellipse(ex, 20, 5.5, 5, 0x0c0a0e); pb.ellipse(ex, 21, 3.5, 3, 0x060408); }
  pb.ellipse(24, 28, 2.6, 3, 0x0c0a0e);
  for (let y = 32; y < 46; y++) for (let x = 13; x < 35; x++) { const dx = (x + 0.5 - 24) / 10.5, dy = (y + 0.5 - 46) / 13; if (dx * dx + dy * dy <= 1) pb.set(x, y, mix(0x020104, 0x1a1420, (y - 32) / 30)); }
  for (let x = 15; x < 33; x += 3) { pb.rect(x, 33, 2, 3 + ((x >> 1) % 2), B[4]); pb.set(x + 1, 35, B[2]); }
  pb.line(20, 3, 23, 11, B[1]); pb.line(23, 11, 21, 15, B[1]); pb.line(34, 6, 31, 10, B[1]);
  for (let k = 0; k < 16; k++) { const x = 6 + rnd(k, 1, 53) * 36, y = 6 + rnd(k, 2, 53) * 26; const c = pb.get(x, y); if (c !== -1 && c !== 0x0c0a0e && c !== 0x060408) { pb.set(x, y, 0x5a7a3a); pb.set(x + 1, y, 0x4a6a32); } }
  if (hidden) for (const [x, y, r] of [[18, 41, 4], [26, 42, 4.6], [31, 40, 3.6], [22, 37, 3.2], [29, 36, 2.8], [16, 37, 2.6]]) pb.blob(x, y, r, r * 0.85, STONE.slice(0, 5), { noise: 0.2 });
  pb.outline('auto');
  return mk(pb, 24, 45, { glow: [[15, 21], [33, 21]], glowCol: 'green' });
}
function grotteCrystal(hidden) {
  const pb = new PB(40, 32);
  const R = [0x2a3038, 0x3c4450, 0x525c68, 0x6a7682, 0x8a96a0];
  pb.blob(20, 19, 18, 11, R, { noise: 0.25, grain: 1 });
  pb.blob(11, 23, 8, 7, R, { noise: 0.25 }); pb.blob(30, 23, 9, 7, R, { noise: 0.25 });
  for (let y = 15; y < 32; y++) for (let x = 11; x < 29; x++) { const dx = (x + 0.5 - 20) / 7.8, dy = (y + 0.5 - 32) / 15; if (dx * dx + dy * dy <= 1) pb.set(x, y, mix(0x020104, 0x102030, (y - 15) / 34)); }
  for (const [x, y, h, c] of [[7, 17, 9, 0], [31, 15, 11, 1], [35, 20, 6, 0], [4, 22, 5, 2], [25, 10, 7, 0], [15, 11, 5, 2]]) shard(pb, x, y, h, CRY[c], 3);
  if (hidden) {
    for (const [x, y, r] of [[15, 27, 4], [22, 28, 4.4], [27, 25, 3.4], [19, 22, 3.2], [13, 22, 2.4]]) pb.blob(x, y, r, r * 0.85, R, { noise: 0.2 });
    for (let x = 11; x < 30; x += 2) { const len = 3 + Math.round(rnd(x, 5, 61) * 5); for (let j = 0; j < len; j++) pb.set(x + (j % 2), 30 - j, j % 2 ? 0x2a5a3a : 0x3a7a4a); }
  }
  pb.outline('auto');
  return mk(pb, 20, 31, { glow: [[31, 9], [7, 12]], glowCol: 'cold' });
}
export function buildStructSprites(env) {
  return {
    pavillon: [flag(0), flag(1)], mur_bois: [wallWood()], palissade: [palisade()], mur_pierre: [wallStone()], porte: [doorStruct()],
    sol: [floorPlanks()], tapis: [rug()], torche: env.torch, lanterne: env.lamp, feu_camp: [campfire()], etabli: [workbench()],
    forge_base: [forgeStruct()], coffre: [env.chest[0]], lit: [bed()], canon_def: [env.cannon[0]], jardiniere: [planter(false), planter(true)],
    tonneau: [env.barrel[0]], caisse: [env.crate[0]], stump: [stump(0)],
  };
}

// ---------------- registre ----------------
export function buildEnvSprites() {
  const S = {};
  const many = (fn, n) => Array.from({ length: n }, (_, v) => fn(v));
  S.tree = many(tree, 4); S.jtree = many(jtree, 4); S.palm = many(palm, 4); S.deadtree = many(deadtree, 4);
  S.bush = many(bush, 6); S.fern = many(fern, 4); S.reeds = many(reeds, 4); S.mushroom = many(mushroom, 4);
  S.rock = many(rock, 5); S.pebble = many(pebble, 4); S.shell = many(shell, 4); S.starfish = many(starfish, 4);
  S.flower = many(flowerPatch, 6); S.lily = many(lily, 4); S.skull = [skull()]; S.bones = [bones()];
  S.driftwood = many(driftwood, 2); S.nets = [nets()];
  S.grave = many(grave, 3); S.cross = many(cross, 3); S.crypt = [crypt()];
  S.barrel = many(barrel, 3); S.crate = many(crate, 3); S.lamp = [lamp()]; S.torch = [torch()]; S.fence = [fence()];
  S.stall = many(stall, 2); S.well = [well()]; S.brazier = [brazier()]; S.anvil = [anvil()]; S.bench = [bench()]; S.sign = [sign()];
  S.cannon = many(cannon, 2); S.anchor = [anchor()]; S.boat = [boat()]; S.workbench = [workbench()];
  S.pillar = many(pillar, 2); S.ruinwall = many(ruinwall, 2); S.idol = [idol()]; S.perch = [perch()];
  S.chest = [chest(0), chest(1), chest(2), chest(3)]; S.chestOpen = [chest(0, true), chest(1, true), chest(2, true), chest(3, true)];
  S.tonnelet = [tonnelet()];
  S.tavern = [building({ w: 8, h: 5, floors: 2, wall: 'plaster', roof: 'thatch', door: 3, sign: 'mug', chimney: true, winCols: [0, 1, 5, 6, 7], shutter: [0x1c3a2a, 0x2a5438, 0x3a7048, 0x56905a], flowers: [0xff5a6e, 0xffd34a, 0xffffff] })];
  S.forge = [building({ w: 6, h: 4, wall: 'stone', roof: 'slate', door: 2, sign: 'anvil', chimney: true, winCols: [0, 4, 5],
    extra: (pb, W, H) => { pb.rect(W - 34, H - 18, 12, 8, 0x1a0e08); pb.rect(W - 33, H - 15, 10, 4, 0xff8a2a); pb.hl(W - 33, H - 15, 10, 0xffd24a); } }),
  building({ w: 6, h: 4, wall: 'wood', roof: 'blue', door: 2, sign: 'anchor', chimney: false, winCols: [0, 4, 5], shutter: [0x1d284a, 0x2b3c6e, 0x3d5794, 0x5879b8] })];
  const houses = [
    { wall: 'plaster', roof: 'red', shutter: [0x1d284a, 0x2b3c6e, 0x3d5794, 0x5879b8], flowers: [0xff93b8, 0xffffff] },
    { wall: 'wood', roof: 'blue', shutter: null, flowers: [0xffd34a, 0xff7a5c] },
    { wall: 'plaster', roof: 'thatch', shutter: [0x5a1d1b, 0x862d27, 0xab4334, 0xcb6146], flowers: null },
    { wall: 'wood', roof: 'green', shutter: [0x34200f, 0x4f321a, 0x6d4626, 0x8c5c33], flowers: [0xbfa8ff, 0xffffff] },
    { wall: 'stone', roof: 'red', shutter: null, flowers: [0xff5a6e] },
  ];
  S.house = houses.map((h, i) => building({ w: 5, h: 4, door: 2, chimney: i % 2 === 0, winCols: [0, 4], ...h }));
  S.lighthouse = [lighthouse()];
  S.ship = [ship()];
  S.wreck = [wreck()];
  S.etagere = many(etagere, 2); S.comptoir = many(comptoir, 3); S.cheminee = [cheminee()]; S.table = many(table, 2); S.chaise = many(chaise, 2);
  S.ratelier = many(ratelier, 2); S.plante = [plante()]; S.lit_deco = [litDeco()]; S.fourneau = [fourneau()]; S.tapis_deco = [tapisDeco()];
  S.tonneau_d = S.barrel; S.cristal = many(cristal, 3);
  S.grotte = [grotteCliff(false), grotteSkull(false), grotteCrystal(false), grotteCliff(true), grotteSkull(true), grotteCrystal(true)];
  return S;
}
export { building, cheminee, table, chaise, etagere, plante, DW };
