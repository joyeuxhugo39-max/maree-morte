// Armes dessinées à partir d'un descriptif (form) : la même définition produit
// l'icône d'inventaire (16x16, lame en diagonale) et l'arme tenue en main
// (horizontale, pointant vers +x, poignée en gx, gy).
import { PB, mix, shade } from './pixel.js';

// rampes de couleurs : 0 ombre profonde -> 4 reflet
export const MAT = {
  steel: [0x2c2e3a, 0x4c5162, 0x7f8699, 0xbcc2d2, 0xf4f6fc],
  rust: [0x3a2218, 0x5c3726, 0x8a573a, 0xb47e55, 0xd8a67e],
  iron: [0x1c1c24, 0x33333e, 0x50505e, 0x767686, 0xa4a4b4],
  silver: [0x3e4250, 0x6c7284, 0xa6acbe, 0xdadfec, 0xffffff],
  gold: [0x6a3e0e, 0x9e661a, 0xd29c2e, 0xf4cb52, 0xfff2ac],
  brass: [0x5a3a10, 0x8c601e, 0xbc8e32, 0xe2bc54, 0xfce6a0],
  bronze: [0x4a2a12, 0x76481f, 0xa26a30, 0xca924a, 0xeaba7c],
  copper: [0x4a1e12, 0x7c3422, 0xb2543c, 0xdc7c5c, 0xfab28c],
  bone: [0x5a5242, 0x877d64, 0xb6ac8c, 0xdfd6b8, 0xfbf6e4],
  crystal: [0x1a2c6a, 0x2e5cba, 0x5c94f0, 0xaadaff, 0xf2fbff],
  coral: [0x5a1028, 0x9c2a4a, 0xd64c6a, 0xff8ca2, 0xffd2da],
  teal: [0x0e3634, 0x1a5e5a, 0x2e8e86, 0x64c4b6, 0xbcf4e8],
  dark: [0x140e1c, 0x281c34, 0x403052, 0x604a7c, 0x9c84c4],
  flint: [0x26262c, 0x42424c, 0x64646e, 0x8e8e98, 0xbebec8],
  wood: [0x2e1a0c, 0x4c2e16, 0x6e4626, 0x946238, 0xb47e4a],
  walnut: [0x22120a, 0x3c2012, 0x5a321e, 0x7a482c, 0x9a6240],
  ebony: [0x100c10, 0x1e161c, 0x2e2228, 0x463640, 0x604c56],
  leather: [0x28140c, 0x44241a, 0x623826, 0x824e36, 0xa06848],
};
const OUT = 0x140c12;
const R = (k) => MAT[k] || MAT.steel;

// ---------------------------------------------------------------- icônes (16x16)
// La lame suit l'anti-diagonale x + y = 15 (de bas-gauche vers haut-droite).
// Pour une colonne x, la « voie » k décale verticalement : y = 15 - x + k.
function diag(pb, x, k, c) { pb.set(x, 15 - x + k, c); }
function band(pb, x, k0, k1, ramp, sparkle = false) {
  for (let k = k0; k <= k1; k++) {
    const u = k1 === k0 ? 0.5 : (k - k0) / (k1 - k0);
    let c = u < 0.34 ? ramp[3] : u < 0.67 ? ramp[2] : ramp[1];
    if (k === k0 && sparkle) c = ramp[4];
    diag(pb, x, k, c);
  }
}
function iconHilt(pb, f, xg) {
  const H = R(f.hi || 'wood');
  // poignée (2 voies), pommeau, garde
  for (let x = 2; x < xg; x++) { diag(pb, x, 0, (x % 2) ? H[3] : H[2]); diag(pb, x, 1, (x % 2) ? H[1] : H[0]); }
  const P = R(f.pom || f.hi || 'brass');
  pb.set(1, 14, P[3]); pb.set(2, 14, P[1]); pb.set(1, 13, P[4]); pb.set(2, 13, P[2]);
  const G = R(f.gu || (f.hi === 'gold' ? 'gold' : f.hi === 'bone' ? 'bone' : 'brass'));
  const g = f.guard || 'cross';
  if (g === 'none') return;
  const yg = 15 - xg;
  if (g === 'cross' || g === 'skull') {
    for (let j = -3; j <= 3; j++) { pb.set(xg + j, yg + j, j < 0 ? G[3] : G[2]); pb.set(xg + j + 1, yg + j, G[1]); }
    pb.set(xg - 3, yg - 3, G[4]); pb.set(xg + 4, yg + 3, G[1]);
  } else if (g === 'cup' || g === 'basket') {
    for (let j = -2; j <= 3; j++) { pb.set(xg + j, yg + j, G[3]); pb.set(xg + j + 1, yg + j, G[2]); }
    pb.set(xg - 1, yg, G[4]);
    if (g === 'basket') { // arc de jointure qui protège la main
      for (let x = 2; x <= xg; x++) { const y = 15 - x + 2 + (x === 2 || x === xg ? 0 : 1); pb.set(x, y, x % 2 ? G[2] : G[1]); }
    }
  } else if (g === 'disc') {
    pb.set(xg - 1, yg - 1, G[3]); pb.set(xg, yg - 1, G[3]); pb.set(xg - 1, yg, G[2]); pb.set(xg + 1, yg + 1, G[1]); pb.set(xg + 1, yg, G[2]); pb.set(xg, yg + 1, G[1]);
  }
  if (g === 'skull') { pb.set(xg, yg - 1, 0xfbf6e4); pb.set(xg + 1, yg - 1, 0xdfd6b8); pb.set(xg, yg, 0x2a2228); }
}
function iconBlade(pb, f) {
  const B = R(f.bl), xg = f.len > 14 ? 4 : 5, x1 = Math.min(14, xg + 1 + f.len);
  const L = x1 - xg - 1;
  for (let x = xg + 1; x <= x1; x++) {
    const t = (x - xg - 1) / Math.max(1, L);
    const c = Math.round(-(f.curve || 0) * 0.45 * t * t + (f.wavy ? Math.round(Math.sin(t * 9)) * 0.6 : 0));
    let w = f.w || 2;
    if (f.tip !== 'round' && t > 0.78) w = Math.max(1, Math.round(w * (1 - t) / 0.22 + 0.4));
    if (f.tip === 'clip' && t > 0.7) w = Math.max(1, w - 1);
    const k0 = c - Math.floor((w - 1) / 2), k1 = k0 + w - 1;
    band(pb, x, k0, k1 + (w >= 3 ? 0 : 1) - (x === x1 ? 1 : 0), B, x % 3 === 0);
    if (f.serr && x % 2 === 0 && t < 0.85) diag(pb, x, k1 + 2, B[2]);
    if ((f.w || 2) >= 3 && t > 0.1 && t < 0.75) diag(pb, x, k0 + 1, B[1]); // gouttière
  }
  if (f.tip === 'hook') { const y = 15 - x1; pb.set(x1 + 1, y + 1, B[3]); pb.set(x1 + 1, y + 2, B[2]); pb.set(x1, y + 3, B[1]); }
  iconHilt(pb, f, xg);
}
function iconShaft(pb, f, x0, x1) {
  const H = R(f.hi || 'wood');
  for (let x = x0; x <= x1; x++) { diag(pb, x, 0, (x % 4 === 0) ? H[4] : H[3]); diag(pb, x, 1, H[1]); }
}
function iconAxe(pb, f) {
  iconShaft(pb, f, 1, 12);
  const B = R(f.bl);
  // fer de hache : croissant sur le côté haut-gauche de la hampe, près du bout
  for (let x = 8; x <= 14; x++) for (let k = -7; k <= -1; k++) {
    const u = (x - 11) / 3.4, v = (k + 4) / 3.6, d = u * u + v * v;
    if (d > 1 || (k > -2 && Math.abs(x - 11) > 1)) continue;
    const edge = d > 0.62 && k < -3;
    diag(pb, x, k, edge ? B[4] : d > 0.4 ? B[3] : B[2]);
  }
  if (f.head === 'double') for (let x = 8; x <= 14; x++) for (let k = 2; k <= 7; k++) { const u = (x - 11) / 3.2, v = (k - 4) / 3.2; if (u * u + v * v <= 1) diag(pb, x, k, (u * u + v * v) > 0.6 ? B[3] : B[1]); }
  diag(pb, 12, -1, B[1]); diag(pb, 12, 0, B[1]);
}
function iconSpear(pb, f) {
  const B = R(f.bl);
  iconShaft(pb, f, 1, 10);
  if (f.head === 'trident') {
    for (let x = 10; x <= 14; x++) { diag(pb, x, 0, B[3]); diag(pb, x, 1, B[1]); }
    for (const s of [-4, 4]) for (let x = 10; x <= 13; x++) diag(pb, x, s + (s < 0 ? (x - 10 > 1 ? 0 : 1) : (x - 10 > 1 ? 0 : -1)), x === 13 ? B[4] : B[2]);
    for (let j = -3; j <= 3; j++) pb.set(10 + j, 5 + j, B[2]);
    return;
  }
  for (let x = 10; x <= 15; x++) {
    const t = (x - 10) / 5;
    const w = f.head === 'harpoon' ? (t < 0.5 ? 1 : 2) : Math.max(1, Math.round(2.6 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.05))));
    band(pb, x, -Math.floor((w - 1) / 2) - 0, w - 1 - Math.floor((w - 1) / 2) + 1, B, x === 12);
  }
  if (f.head === 'harpoon') { for (const [x, k] of [[12, -2], [13, -3], [12, 3], [13, 4]]) diag(pb, x, k, B[3]); }
  for (let j = -1; j <= 1; j++) pb.set(10 + j, 5 + j, R(f.gu || 'brass')[2]);
}
function iconBlunt(pb, f) {
  const B = R(f.bl), H = R(f.hi || 'wood');
  if (f.head === 'club') {
    for (let x = 1; x <= 13; x++) { const w = 1 + Math.round((x / 13) * 2.4); for (let k = -Math.floor(w / 2); k <= Math.ceil(w / 2); k++) diag(pb, x, k, k <= -Math.floor(w / 2) ? B[3] : k >= Math.ceil(w / 2) ? B[1] : B[2]); }
    diag(pb, 9, 0, B[0]); diag(pb, 11, 1, B[0]); diag(pb, 12, -1, B[4]);
    return;
  }
  if (f.head === 'anchor') {
    // ancre droite : anneau, jas, verge, bras en arc et pattes
    pb.set(7, 0, B[3]); pb.set(8, 0, B[3]); pb.set(6, 1, B[3]); pb.set(9, 1, B[2]); pb.set(7, 2, B[2]); pb.set(8, 2, B[1]);
    for (let x = 3; x <= 12; x++) { pb.set(x, 4, x < 7 ? B[4] : B[3]); pb.set(x, 5, B[1]); }
    for (let y = 3; y <= 13; y++) { pb.set(7, y, B[3]); pb.set(8, y, B[1]); }
    for (let x = 1; x <= 14; x++) { const u = (x - 7.5) / 6.5, y = Math.round(13 - (1 - u * u) * 3.2); pb.set(x, y, B[2]); pb.set(x, y + 1, B[1]); }
    for (const x of [1, 14]) { pb.set(x, 8, B[4]); pb.set(x, 9, B[3]); pb.set(x + (x === 1 ? 1 : -1), 9, B[2]); }
    pb.set(7, 15, B[2]); pb.set(8, 15, B[1]);
    return;
  }
  // masse d'armes : manche + boule cloutée
  for (let x = 1; x <= 10; x++) { diag(pb, x, 0, (x % 2) ? H[3] : H[2]); diag(pb, x, 1, H[1]); }
  pb.blob(11.5, 4.5, 3.4, 3.4, [B[0], B[1], B[2], B[3], B[4]], {});
  for (const [x, y] of [[11, 0], [15, 4], [8, 4], [12, 8], [14, 1], [9, 1]]) pb.set(x, y, B[3]);
}
function iconScythe(pb, f) {
  const B = R(f.bl), H = R(f.hi || 'dark');
  for (let x = 1; x <= 12; x++) { diag(pb, x, 0, x % 3 ? H[3] : H[4]); diag(pb, x, 1, H[1]); }
  for (let i = 0; i <= 10; i++) { const t = i / 10, x = Math.round(12 - t * 10), y = Math.round(2 + Math.sin(t * Math.PI * 0.9) * 3.2 - t * 0.5); pb.set(x, y, t > 0.85 ? B[4] : B[3]); pb.set(x, y + 1, B[2]); if (t < 0.7) pb.set(x, y + 2, B[1]); }
}
function iconHook(pb, f) {
  const B = R(f.bl), H = R(f.hi || 'wood');
  for (let x = 1; x <= 6; x++) { diag(pb, x, 0, H[3]); diag(pb, x, 1, H[1]); diag(pb, x, 2, H[0]); }
  pb.set(7, 7, B[2]); pb.set(7, 8, B[1]); pb.set(8, 7, B[2]);
  for (let a = 0; a <= 14; a++) { const ang = -Math.PI * 0.8 + (a / 14) * Math.PI * 1.35; const x = Math.round(10 + Math.cos(ang) * 3.4), y = Math.round(5 + Math.sin(ang) * 3.4); pb.set(x, y, a > 11 ? B[4] : B[3]); pb.set(x + (Math.cos(ang) > 0 ? 1 : 0), y + 1, B[1]); }
}
function iconGun(pb, f) {
  const M = R(f.metal || 'steel'), W = R(f.wood || 'wood'), BR = R('brass');
  const rifle = f.type === 'rifle';
  const len = Math.min(rifle ? 15 : 11, f.len || 8);
  const bx0 = rifle ? 16 - len - 1 : 5, by = rifle ? 6 : 5;
  // canon(s)
  const rows = f.barrels === 2 ? [by - 1, by + 1] : [by];
  for (const y of rows) for (let x = bx0; x < bx0 + len; x++) { pb.set(x, y, M[3]); pb.set(x, y + 1, M[1]); if (x % 4 === 0) pb.set(x, y, M[4]); }
  if (f.barrels === 3) for (let x = bx0; x < bx0 + len - 2; x++) { pb.set(x, by - 1, M[2]); pb.set(x, by + 2, M[1]); if (x % 2) pb.set(x, by + 1, M[0]); }
  const mx = bx0 + len - 1;
  if (f.muzzle === 'flare') { pb.set(mx, by - 1, M[3]); pb.set(mx, by + 2, M[1]); pb.set(mx + 1, by - 2, M[3]); pb.set(mx + 1, by + 3, M[1]); for (let y = by - 1; y <= by + 2; y++) pb.set(mx + 1, y, M[2]); }
  else if (f.muzzle === 'wide' || f.muzzle === 'mortar' || f.muzzle === 'cannon') { const h = f.muzzle === 'wide' ? 1 : 2; for (let x = mx - (f.muzzle === 'wide' ? 1 : 4); x <= mx; x++) { for (let y = by - h; y <= by + 1 + h; y++) pb.set(x, y, y === by - h ? M[4] : y > by + h ? M[0] : M[2]); } pb.set(mx, by, 0x0c0a0e); pb.set(mx, by + 1, 0x0c0a0e); }
  else if (f.muzzle === 'harpoon') { pb.set(mx + 1, by, M[4]); pb.set(mx + 2 > 15 ? 15 : mx + 1, by - 1, M[3]); pb.set(mx, by - 1, M[3]); pb.set(mx, by + 2, M[2]); }
  else { pb.set(mx, by - (rows.length > 1 ? 2 : 0), BR[3]); pb.set(mx, by + 1, BR[1]); }
  if (f.scope) { for (let x = bx0 + 3; x < bx0 + 9; x++) pb.set(x, by - 2, x === bx0 + 3 ? 0x9fd8ff : M[2]); pb.set(bx0 + 4, by - 1, M[1]); pb.set(bx0 + 7, by - 1, M[1]); }
  if (f.tank) { pb.disc(bx0 + 3, by + 4, 1.6, R('copper')[3]); pb.set(bx0 + 2, by + 3, R('copper')[4]); }
  if (rifle) {
    // fût et crosse
    for (let x = 1; x < bx0 + Math.round(len * 0.65); x++) pb.set(x, by + 2, x < bx0 ? W[2] : W[3]);
    for (let x = 0; x < bx0 + 1; x++) { const t = x / Math.max(1, bx0); const h = Math.round(1 + (1 - t) * 3); for (let y = by + 1; y <= by + 1 + h; y++) pb.set(x, y, y === by + 1 ? W[4] : y === by + 1 + h ? W[1] : W[2]); }
    for (const x of [bx0 + 2, bx0 + Math.round(len * 0.5)]) { pb.set(x, by + 2, BR[3]); pb.set(x, by + 1, BR[2]); }
    pb.set(bx0, by - 1, M[3]); pb.set(bx0 + 1, by - 1, M[2]); // chien
    pb.set(bx0 + 1, by + 4, BR[2]); pb.set(bx0 + 2, by + 4, BR[2]);
  } else {
    // crosse de pistolet
    pb.rect(2, by + 1, 4, 2, W[3]); pb.hl(2, by + 1, 4, W[4]);
    pb.rect(1, by + 3, 3, 5, W[2]); pb.vl(1, by + 3, 5, W[3]); pb.vl(3, by + 3, 5, W[1]);
    pb.rect(1, by + 7, 3, 1, f.brass ? BR[3] : W[1]);
    pb.set(5, by + 3, BR[2]); pb.set(6, by + 3, BR[2]); pb.set(6, by + 2, BR[1]); // pontet
    pb.set(4, by - 1, M[3]); pb.set(4, by - 2, M[4]); // chien
    if (f.brass) { pb.set(5, by, BR[3]); pb.set(5, by + 1, BR[2]); }
  }
  if (f.glow) { const g = { cold: 0xbfefff, green: 0xc8ff9a, purple: 0xe8c8ff, red: 0xffb0a0 }[f.glow]; pb.set(mx, by, g); pb.set(bx0 + 2, by, g); }
}
export function drawWeaponIcon(pb, f) {
  if (!f) return;
  if (f.k === 'gun') iconGun(pb, f);
  else if (f.k === 'axe') iconAxe(pb, f);
  else if (f.k === 'spear') iconSpear(pb, f);
  else if (f.k === 'blunt') iconBlunt(pb, f);
  else if (f.k === 'scythe') iconScythe(pb, f);
  else if (f.k === 'hook') iconHook(pb, f);
  else iconBlade(pb, f);
  if (f.glow && f.k !== 'gun') { const g = { cold: 0xbfefff, green: 0xd8ffb0, purple: 0xf0d8ff, red: 0xffc8c0 }[f.glow]; diag(pb, 9, -1, g); diag(pb, 12, -2, g); }
}

// ---------------------------------------------------------------- armes tenues en main
function heldHilt(pb, f, x0, cy) {
  const H = R(f.hi || 'wood'), G = R(f.gu || (f.hi === 'gold' ? 'gold' : f.hi === 'bone' ? 'bone' : 'brass')), P = R(f.pom || f.hi || 'brass');
  for (let x = 1; x < x0; x++) { pb.set(x, cy, (x % 2) ? H[3] : H[2]); pb.set(x, cy + 1, (x % 2) ? H[1] : H[0]); }
  pb.set(0, cy, P[3]); pb.set(0, cy + 1, P[1]); pb.set(0, cy - 1, P[4]);
  const g = f.guard || 'cross';
  if (g === 'cross' || g === 'skull') { for (let y = cy - 2; y <= cy + 3; y++) pb.set(x0, y, y < cy ? G[3] : G[2]); pb.set(x0 - 1, cy - 2, G[4]); pb.set(x0 - 1, cy + 3, G[1]); }
  else if (g === 'cup' || g === 'basket') {
    for (let y = cy - 1; y <= cy + 3; y++) { pb.set(x0, y, G[3]); pb.set(x0 - 1, y, G[2]); }
    pb.set(x0 - 1, cy - 1, G[4]);
    if (g === 'basket') { for (let x = 1; x < x0; x++) pb.set(x, cy + 3, x % 2 ? G[2] : G[1]); pb.set(1, cy + 2, G[2]); }
  } else if (g === 'disc') { for (let y = cy - 1; y <= cy + 2; y++) pb.set(x0, y, G[y === cy - 1 ? 4 : 2]); }
  if (g === 'skull') { pb.set(x0 + 1, cy - 1, 0xfbf6e4); pb.set(x0 + 1, cy, 0xdfd6b8); pb.set(x0 + 2, cy - 1, 0xdfd6b8); pb.set(x0 + 1, cy - 2, 0x2a2228); }
}
function heldBlade(f) {
  const len = f.len || 12, grip = f.grip || 3, w = f.w || 2;
  const W = len + grip + 3, H = 12 + Math.ceil((f.curve || 0) * 1.2);
  const cy = H - 5;
  const pb = new PB(W, H);
  const B = R(f.bl), x0 = grip + 1;
  for (let x = x0 + 1; x <= x0 + len; x++) {
    const t = (x - x0 - 1) / Math.max(1, len - 1);
    const c = Math.round((f.curve || 0) * t * t + (f.wavy ? Math.round(Math.sin(t * 10)) * 0.7 : 0));
    let ww = w;
    if (f.tip !== 'round' && t > 0.8) ww = Math.max(1, Math.round(w * (1 - t) / 0.2 + 0.4));
    const top = cy - c - Math.floor((ww - 1) / 2), bot = top + ww - 1;
    for (let y = top; y <= bot; y++) {
      let col = ww === 1 ? B[3] : y === top ? B[3] : y === bot ? B[1] : B[2];
      if (y === top && (x % 4 === 0 || t > 0.88)) col = B[4];
      if (f.tip === 'clip' && t > 0.7 && y === top && ww > 1) continue;
      pb.set(x, y, col);
    }
    if (ww >= 3 && t > 0.1 && t < 0.75) pb.set(x, top + 1, B[1]);
    if (f.serr && x % 2 === 0 && t < 0.85) pb.set(x, bot + 1, B[2]);
  }
  if (f.tip === 'hook') { const x = x0 + len; pb.set(x + 1, cy - 1, B[3]); pb.set(x + 1, cy, B[2]); pb.set(x, cy + 1, B[1]); }
  heldHilt(pb, f, x0, cy);
  return { pb, gx: 2, gy: cy };
}
function heldShaft(pb, f, x0, x1, cy) {
  const H = R(f.hi || 'wood');
  for (let x = x0; x <= x1; x++) { pb.set(x, cy, x % 5 === 0 ? H[4] : H[3]); pb.set(x, cy + 1, H[1]); }
}
function heldPole(f) {
  const len = f.len || 16, B = R(f.bl);
  if (f.k === 'axe') {
    const pb = new PB(len + 2, 16), cy = 10;
    heldShaft(pb, f, 0, len, cy);
    for (let x = len - 6; x <= len + 1; x++) for (let y = cy - 8; y <= cy + 1; y++) {
      const u = (x - (len - 2)) / 3.6, v = (y - (cy - 3.5)) / 4.6, d = u * u + v * v;
      if (d > 1 || (y > cy - 1 && Math.abs(x - (len - 2)) > 1)) continue;
      pb.set(x, y, d > 0.62 && x > len - 3 ? B[4] : d > 0.4 ? B[3] : B[2]);
    }
    if (f.head === 'double') for (let x = len - 6; x <= len + 1; x++) for (let y = cy + 2; y <= cy + 6; y++) { const u = (x - (len - 2)) / 3.4, v = (y - (cy + 3.6)) / 3; if (u * u + v * v <= 1) pb.set(x, y, B[u * u + v * v > 0.6 ? 3 : 1]); }
    return { pb, gx: 3, gy: cy };
  }
  if (f.k === 'scythe') {
    const pb = new PB(len + 2, 18), cy = 12;
    heldShaft(pb, f, 0, len, cy);
    for (let i = 0; i <= 14; i++) { const t = i / 14, x = Math.round(len - t * 12), y = Math.round(cy - 2 - Math.sin(t * Math.PI * 0.85) * 7 + t * 2); pb.set(x, y, t > 0.85 ? B[4] : B[3]); pb.set(x, y + 1, B[2]); if (t < 0.7) pb.set(x, y + 2, B[1]); }
    return { pb, gx: 4, gy: cy };
  }
  if (f.k === 'hook') {
    const pb = new PB(12, 12), cy = 7;
    heldShaft(pb, f, 0, 4, cy);
    pb.set(5, cy, B[2]); pb.set(5, cy + 1, B[1]);
    for (let a = 0; a <= 14; a++) { const ang = Math.PI * 0.9 - (a / 14) * Math.PI * 1.5; const x = Math.round(8 + Math.cos(ang) * 3.2), y = Math.round(cy - 1 - Math.sin(ang) * 3.2); pb.set(x, y, a > 11 ? B[4] : B[3]); }
    return { pb, gx: 2, gy: cy };
  }
  if (f.k === 'blunt') {
    if (f.head === 'anchor') {
      const pb = new PB(len + 4, 18), cy = 9;
      heldShaft(pb, { hi: f.bl }, 0, len, cy);
      for (let y = cy - 4; y <= cy + 5; y++) pb.set(3, y, B[y < cy ? 3 : 2]);
      for (let a = 0; a <= 12; a++) { const ang = -Math.PI / 2 + (a / 12) * Math.PI; const x = Math.round(len - 4 + Math.cos(ang) * 4.5), y = Math.round(cy + Math.sin(ang) * 6.5); pb.set(x, y, B[3]); pb.set(x - 1, y, B[1]); }
      for (const y of [cy - 7, cy + 7]) { pb.set(len - 5, y, B[4]); pb.set(len - 6, y, B[3]); pb.set(len - 5, y + (y < cy ? 1 : -1), B[2]); }
      pb.disc(0.8, cy + 0.5, 1.4, B[3]);
      return { pb, gx: 4, gy: cy };
    }
    const pb = new PB(len + 4, 12), cy = 6;
    if (f.head === 'club') {
      for (let x = 0; x <= len; x++) { const w = Math.round(1 + (x / len) * 2.6); for (let y = cy - w + 1; y <= cy + w; y++) pb.set(x, y, y === cy - w + 1 ? B[3] : y === cy + w ? B[1] : B[2]); }
      pb.set(len - 3, cy, B[0]); pb.set(len - 6, cy + 1, B[0]); pb.set(len - 1, cy - 2, B[4]);
      return { pb, gx: 2, gy: cy };
    }
    heldShaft(pb, f, 0, len - 2, cy);
    pb.blob(len, cy + 0.5, 3.2, 3.2, B, {});
    for (const [dx, dy] of [[0, -4], [0, 5], [4, 0], [-3, -3], [3, 3], [3, -3]]) pb.set(len + dx, cy + dy, B[3]);
    return { pb, gx: 2, gy: cy };
  }
  // lances, harpons, tridents
  const pb = new PB(len + 7, 13), cy = 6;
  heldShaft(pb, f, 0, len, cy);
  const G = R(f.gu || 'brass');
  pb.set(len - 1, cy, G[3]); pb.set(len - 1, cy + 1, G[1]); pb.set(len, cy, G[2]); pb.set(len, cy + 1, G[1]);
  if (f.head === 'trident') {
    for (let x = len + 1; x <= len + 6; x++) { pb.set(x, cy, B[3]); pb.set(x, cy + 1, B[1]); }
    for (let y = cy - 4; y <= cy + 5; y++) pb.set(len + 1, y, B[2]);
    for (const y of [cy - 4, cy + 5]) for (let x = len + 1; x <= len + 4; x++) pb.set(x, y, x === len + 4 ? B[4] : B[3]);
    pb.set(len + 6, cy, B[4]);
  } else if (f.head === 'harpoon') {
    for (let x = len + 1; x <= len + 6; x++) { pb.set(x, cy, B[3]); pb.set(x, cy + 1, B[1]); }
    pb.set(len + 6, cy, B[4]); pb.set(len + 5, cy - 1, B[3]); pb.set(len + 4, cy - 2, B[2]); pb.set(len + 5, cy + 2, B[2]); pb.set(len + 4, cy + 3, B[1]);
  } else {
    for (let x = len + 1; x <= len + 6; x++) { const t = (x - len - 1) / 5, w = Math.round(2.2 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08))); for (let y = cy - w + 1; y <= cy + w; y++) pb.set(x, y, y <= cy - w + 1 ? B[4] : y >= cy + w ? B[1] : B[2]); }
  }
  return { pb, gx: Math.round(len * 0.35), gy: cy };
}
function heldGun(f) {
  const M = R(f.metal || 'steel'), W = R(f.wood || 'wood'), BR = R('brass');
  const rifle = f.type === 'rifle', len = f.len || 8;
  const stock = rifle ? 7 : 4;
  const pb = new PB(stock + len + 4, 10), by = 3;
  const bx0 = stock;
  const rows = f.barrels === 2 ? [by - 1, by + 1] : [by];
  for (const y of rows) for (let x = bx0; x < bx0 + len; x++) { pb.set(x, y, x % 4 === 1 ? M[4] : M[3]); pb.set(x, y + 1, M[1]); }
  if (f.barrels === 3) for (let x = bx0; x < bx0 + len - 1; x++) { pb.set(x, by - 1, M[2]); pb.set(x, by + 2, M[0]); }
  const mx = bx0 + len;
  if (f.muzzle === 'flare') { for (let y = by - 2; y <= by + 3; y++) pb.set(mx, y, y < by ? M[4] : M[2]); for (let y = by - 1; y <= by + 2; y++) pb.set(mx - 1, y, M[2]); }
  else if (f.muzzle === 'wide' || f.muzzle === 'mortar' || f.muzzle === 'cannon') {
    const h = f.muzzle === 'wide' ? 1 : 2, l = f.muzzle === 'wide' ? 2 : 5;
    for (let x = mx - l; x <= mx; x++) for (let y = by - h; y <= by + 1 + h; y++) pb.set(x, y, y === by - h ? M[4] : y === by + 1 + h ? M[0] : M[2]);
    if (f.muzzle === 'cannon') for (const x of [mx - 4, mx - 1]) for (let y = by - h; y <= by + 1 + h; y++) pb.set(x, y, M[1]);
  }
  else if (f.muzzle === 'harpoon') { for (let x = mx; x <= mx + 2; x++) pb.set(x, by, M[4]); pb.set(mx + 1, by - 1, M[3]); pb.set(mx + 1, by + 1, M[2]); }
  else pb.set(mx, by, BR[3]);
  if (f.scope) { for (let x = bx0 + 1; x < bx0 + 7; x++) pb.set(x, by - 2, x === bx0 + 6 ? 0x9fd8ff : M[2]); pb.set(bx0 + 2, by - 1, M[1]); pb.set(bx0 + 5, by - 1, M[1]); }
  if (f.tank) { pb.disc(bx0 + 3, by + 3.5, 1.5, R('copper')[3]); pb.set(bx0 + 2, by + 2, R('copper')[4]); }
  if (rifle) {
    for (let x = 0; x < bx0 + Math.round(len * 0.6); x++) pb.set(x, by + 2, x < bx0 ? W[2] : W[3]);
    for (let x = 0; x < bx0; x++) { const h = Math.round(1 + (1 - x / bx0) * 3); for (let y = by + 1; y <= by + 1 + h; y++) pb.set(x, y, y === by + 1 ? W[4] : y === by + 1 + h ? W[1] : W[2]); }
    pb.set(bx0 + 2, by + 2, BR[3]); pb.set(bx0 + Math.round(len * 0.45), by + 2, BR[3]);
    pb.set(bx0 - 1, by - 1, M[3]); pb.set(bx0 + 1, by + 3, BR[2]);
  } else {
    pb.rect(1, by, 4, 2, W[3]); pb.hl(1, by, 4, W[4]);
    pb.rect(0, by + 2, 3, 4, W[2]); pb.vl(0, by + 2, 4, W[3]);
    pb.set(0, by + 5, f.brass ? BR[3] : W[1]); pb.set(1, by + 5, f.brass ? BR[2] : W[1]);
    pb.set(3, by + 2, BR[2]); pb.set(4, by + 3, BR[1]);
    pb.set(3, by - 1, M[3]);
  }
  if (f.glow) { const g = { cold: 0xbfefff, green: 0xc8ff9a, purple: 0xe8c8ff, red: 0xffb0a0 }[f.glow]; pb.set(mx - 1, by, g); }
  return { pb, gx: rifle ? 5 : 2, gy: by + 2 };
}
const heldCache = new Map();
export function heldWeapon(f, key) {
  if (!f) return null;
  const k = key || JSON.stringify(f);
  let s = heldCache.get(k);
  if (s) return s;
  let r;
  if (f.k === 'gun') r = heldGun(f);
  else if (f.k === 'blade' || !f.k) r = heldBlade(f);
  else r = heldPole(f);
  r.pb.outline('auto');
  s = { cv: r.pb.toCanvas(), gx: r.gx, gy: r.gy, w: r.pb.w, h: r.pb.h, glow: f.glow || null, thrust: f.anim === 'thrust' };
  heldCache.set(k, s);
  return s;
}
