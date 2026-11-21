// 1.8 : la refonte de Port-Lanterne — les décors du grand port, du chantier naval, des échoppes et des belvédères.
// Même facture que le reste du monde : palettes partagées, lumière en haut à gauche, contour automatique.
import { PB, mix, shade } from './pixel.js';
import { mk, STONE, WOOD, IRON, GOLD, BONE, LEAF } from './sprites-env.js';

const ROPE = [0x5a4426, 0x7e6236, 0xa08048, 0xc4a466, 0xe0c88a];
const CANVAS = [0x9a8e72, 0xbcb092, 0xd8ceb0, 0xece4cc, 0xfaf6e8];
const FISH = [[0x5a7a90, 0x8ab0c4, 0xd0e6ee], [0xa05a4a, 0xd08a6a, 0xf0c0a0], [0x6a7a50, 0x9aae72, 0xd0dca8]];
const many = (fn, n) => Array.from({ length: n }, (_, v) => fn(v));

// ------------------------------------------------------------------ le quai
function bitte(v) { // bitte d'amarrage : un fût de fonte, une aussière lovée
  const pb = new PB(14, 16);
  pb.cyl(3, 4, 8, 9, IRON, { noise: 0.1 });
  pb.ellipse(7, 4, 4.6, 2, IRON[4]); pb.ellipse(7, 4, 3, 1.2, IRON[3]);
  pb.rect(1, 6, 12, 2, IRON[2]); pb.hl(1, 6, 12, IRON[3]);
  if (v) { for (let a = 0; a < 6.28; a += 0.35) pb.set(7 + Math.cos(a) * 6, 13 + Math.sin(a) * 2, ROPE[2 + ((a * 3) | 0) % 2]); }
  else { pb.line(10, 9, 13, 14, ROPE[2], 1.5); }
  pb.rect(2, 13, 10, 2, STONE[1]);
  pb.outline('auto');
  return mk(pb, 7, 14);
}
function grue(v) { // grue de port en bois : le mât, la flèche, le palan et une élingue de caisses
  const flip = v === 1, pb = new PB(56, 78);
  const X = (x) => (flip ? 55 - x : x);
  // le socle de pierre
  pb.rect(X(flip ? 19 : 8), 68, 14, 8, STONE[2]); pb.hl(X(flip ? 21 : 8), 68, 14, STONE[4]); pb.hl(X(flip ? 21 : 8), 75, 14, STONE[1]);
  for (let x = 8; x < 22; x += 5) pb.vl(X(x), 69, 6, STONE[1]);
  // le mât
  for (let y = 8; y < 69; y++) { pb.set(X(13), y, WOOD[2]); pb.set(X(14), y, WOOD[3]); pb.set(X(15), y, WOOD[4]); pb.set(X(16), y, WOOD[2]); }
  for (let y = 14; y < 66; y += 9) pb.hl(Math.min(X(12), X(17)), y, 6, IRON[2]);
  // les jambes de force
  pb.line(X(6), 68, X(13), 42, WOOD[2], 2); pb.line(X(23), 68, X(16), 42, WOOD[3], 2);
  // la flèche, et son hauban
  pb.line(X(15), 14, X(50), 6, WOOD[3], 2.2); pb.line(X(15), 15, X(50), 7, WOOD[1], 1);
  pb.line(X(15), 4, X(50), 6, ROPE[1], 1); pb.line(X(15), 4, X(15), 9, WOOD[4], 2);
  pb.disc(X(15), 4, 1.6, IRON[3]);
  // le treuil
  pb.disc(X(15), 52, 5.5, WOOD[1]); pb.disc(X(15), 52, 4, WOOD[3]); pb.disc(X(15), 52, 1.5, IRON[2]);
  for (let a = 0; a < 6.28; a += 0.785) pb.line(X(15), 52, X(15 + Math.cos(a) * 5), 52 + Math.sin(a) * 5, WOOD[2]);
  pb.line(X(9), 45, X(9), 49, WOOD[4], 1.6);
  // le palan, la corde, l'élingue
  pb.disc(X(48), 9, 1.8, IRON[3]);
  for (let y = 10; y < 34; y++) pb.set(X(48), y, ROPE[2]);
  pb.line(X(48), 34, X(42), 40, ROPE[1]); pb.line(X(48), 34, X(54), 40, ROPE[1]); pb.set(X(48), 34, IRON[4]);
  if (v === 2) { pb.cyl(Math.min(X(42), X(53)) + 0, 40, 11, 12, WOOD, { noise: 0.2 }); pb.hl(Math.min(X(42), X(53)), 43, 11, IRON[2]); pb.hl(Math.min(X(42), X(53)), 49, 11, IRON[2]); }
  else {
    const x0 = Math.min(X(42), X(54));
    pb.rect(x0, 40, 13, 11, WOOD[3]); pb.hl(x0, 40, 13, WOOD[5]); pb.rect(x0, 40, 2, 11, WOOD[1]); pb.rect(x0 + 11, 40, 2, 11, WOOD[1]); pb.line(x0 + 2, 49, x0 + 10, 42, WOOD[2], 1.4);
    for (let i = 0; i < 13; i += 3) pb.vl(x0 + i, 39, 13, mix(ROPE[1], 0x000000, 0.1));
  }
  pb.outline('auto');
  return mk(pb, X(15), 75);
}
function caisses(v) { // une pile de caisses de cargaison, marquées au fer
  const pb = new PB(28, 28), W2 = v === 1 ? [0x3a2a1a, 0x5a4228, 0x7a5a36, 0x9a7646, 0xb89260, 0xd0ac78] : WOOD;
  const box = (x, y, w, h, mark) => {
    pb.rect(x, y, w, 3, W2[4]); pb.hl(x, y, w, W2[5]); pb.rect(x, y + 3, w, h - 3, W2[3]);
    for (let j = y + 3; j < y + h; j++) if ((j - y) % 3 === 2) pb.hl(x + 1, j, w - 2, W2[2]);
    pb.rect(x, y + 3, 2, h - 3, W2[1]); pb.rect(x + w - 2, y + 3, 2, h - 3, W2[1]); pb.hl(x, y + h - 1, w, W2[1]);
    if (mark) { const c = [0x9c2530, 0x1d284a, 0x2a2420][mark - 1]; pb.rect(x + (w >> 1) - 2, y + 5, 4, 3, c); pb.set(x + (w >> 1) - 1, y + 6, 0xf3f0e2); }
  };
  box(1, 13, 13, 13, 1 + (v % 3)); box(14, 15, 12, 11, 0); box(7, 3, 12, 11, v === 2 ? 2 : 0);
  if (v === 2) { pb.line(4, 12, 9, 3, ROPE[2]); pb.line(23, 14, 17, 3, ROPE[2]); }
  pb.outline('auto');
  return mk(pb, 14, 26);
}
function tonneaux(v) { // une pyramide de tonneaux (rhum, eau douce, poudre)
  const pb = new PB(30, 26), W2 = v === 2 ? [0x1d1a1c, 0x2c2628, 0x3d3437, 0x504448, 0x665a5d, 0x7a6e70] : WOOD;
  const tun = (x, y) => { pb.cyl(x, y + 2, 11, 11, W2, { noise: 0.2 }); pb.ellipse(x + 5.5, y + 2.2, 5.4, 2.2, W2[4]); pb.ellipse(x + 5.5, y + 2.2, 3.4, 1.2, W2[3]); pb.hl(x, y + 5, 11, IRON[2]); pb.hl(x, y + 10, 11, IRON[2]); };
  tun(2, 11); tun(16, 11); tun(9, 1);
  if (v === 1) { pb.rect(5, 17, 5, 3, 0xe8dcc0); pb.set(7, 18, 0xc0302a); pb.rect(19, 17, 5, 3, 0xe8dcc0); pb.set(21, 18, 0x2a4685); }
  pb.outline('auto');
  return mk(pb, 15, 24);
}
function etalPoisson(v) { // l'étal de la halle aux poissons : glace pilée, rangées de poissons, un auvent rayé
  const pb = new PB(34, 32), aw = [[0x2a4685, 0xf3f0e2], [0x9c2530, 0xf3f0e2], [0x2a5437, 0xf3f0e2]][v % 3];
  pb.rect(2, 6, 2, 24, WOOD[2]); pb.rect(30, 6, 2, 24, WOOD[2]);
  pb.rect(1, 17, 32, 4, WOOD[4]); pb.hl(1, 17, 32, WOOD[5]); pb.rect(1, 21, 32, 8, WOOD[3]); for (let x = 4; x < 32; x += 6) pb.vl(x, 21, 8, WOOD[2]);
  pb.rect(3, 14, 28, 4, 0xdcecf2); for (let x = 3; x < 31; x += 2) pb.set(x, 14, 0xffffff);
  for (let k = 0; k < 6; k++) { const F = FISH[(k + v) % 3], x = 5 + k * 4.4, y = 15; pb.ellipse(x, y, 2.2, 1.1, F[1]); pb.set(x - 1, y - 1, F[2]); pb.set(x + 2, y, F[0]); pb.set(x + 3, y - 1, F[0]); pb.set(x + 3, y + 1, F[0]); }
  for (let y = 0; y < 8; y++) for (let x = 0; x < 34; x++) { if (y === 7 && (x % 6 === 0 || x % 6 === 5)) continue; pb.set(x, y + 1, Math.floor(x / 6) % 2 ? aw[1] : shade(aw[0], y > 4 ? 0.85 : 1)); }
  pb.hl(0, 1, 34, shade(aw[0], 0.7));
  pb.ellipse(29, 28, 4, 2, ROPE[2]); pb.ellipse(29, 27, 3, 1, ROPE[3]); // un panier
  pb.outline('auto');
  return mk(pb, 17, 30);
}
function sechoir(v) { // le séchoir à filets : deux perches, un filet tendu, des flotteurs de liège
  const pb = new PB(34, 30);
  pb.rect(2, 3, 2, 26, WOOD[2]); pb.rect(30, 3, 2, 26, WOOD[2]); pb.hl(1, 3, 32, WOOD[3]);
  for (let y = 5; y < 24; y++) for (let x = 4; x < 30; x++) { const sag = Math.sin((x - 4) / 26 * Math.PI) * 3; if (y < 5 + sag) continue; if (((x + y) % 4 === 0) || ((x - y + 40) % 4 === 0)) pb.set(x, y, v ? 0x5a6a5a : 0x6a5a40); }
  for (let x = 6; x < 30; x += 5) { const sag = Math.sin((x - 4) / 26 * Math.PI) * 3; pb.disc(x, 5 + sag, 1.2, x % 2 ? 0xd8a040 : 0xc06a2a); }
  pb.rect(0, 27, 6, 2, STONE[2]); pb.rect(28, 27, 6, 2, STONE[2]);
  pb.outline('auto');
  return mk(pb, 17, 28);
}
function cabestan() {
  const pb = new PB(18, 20);
  pb.cyl(4, 6, 10, 10, WOOD, { noise: 0.15 }); pb.ellipse(9, 6, 5, 2, WOOD[4]); pb.ellipse(9, 6, 2, 1, IRON[3]);
  for (const [x0, x1] of [[0, 18], [9, 9]]) pb.line(x0, 5, x1 === 9 ? 9 : x1, x1 === 9 ? 1 : 5, WOOD[3], 1.6);
  pb.hl(4, 10, 10, IRON[2]); pb.rect(3, 16, 12, 2, STONE[1]);
  pb.outline('auto');
  return mk(pb, 9, 17);
}
// ------------------------------------------------------------------ le chantier naval : une coque en radoub
function coque() { // un brick sur la cale, vu de flanc : la poupe haute à gauche, l'étrave à droite, des membrures nues
  const W = 136, H = 92, pb = new PB(W, H);
  // les tins (cales de bois sous la quille), les accores qui l'étayent
  for (const x of [22, 46, 74, 102, 122]) { pb.rect(x - 4, 82, 9, 6, WOOD[1]); pb.hl(x - 4, 82, 9, WOOD[3]); }
  for (const [x0, x1] of [[14, 30], [118, 104], [60, 52], [86, 94]]) pb.line(x0, 86, x1, 58, WOOD[2], 2);
  const top = (x) => { const t = (x - 6) / 124; return 40 - Math.sin(t * Math.PI) * 3 + (t < 0.16 ? (0.16 - t) * 95 : 0) + (t > 0.9 ? -(t - 0.9) * 40 : 0); };
  const bot = (x) => { const t = (x - 6) / 124; return 80 - Math.pow(Math.abs(t - 0.52) * 2, 2.4) * 30; };
  for (let x = 6; x < 130; x++) {
    const y0 = Math.round(top(x)), y1 = Math.round(bot(x)), ribs = x > 34 && x < 70;
    for (let y = y0; y < y1; y++) {
      const row = Math.floor((y - y0) / 5);
      if (ribs && row > 1) { if ((x - 34) % 6 < 2) pb.set(x, y, (x - 34) % 6 === 0 ? WOOD[3] : WOOD[1]); else if (y > y1 - 3) pb.set(x, y, WOOD[1]); continue; } // les membrures, sans bordé
      let c = row % 2 ? WOOD[3] : WOOD[2]; if ((y - y0) % 5 === 0) c = WOOD[1];
      if (y > y1 - 8) c = mix(c, 0x2a1a12, 0.45); // le goudron près de la quille
      if (row === 2 && !ribs) c = row % 2 ? 0x2a3a5a : 0x1c2840; // une virure peinte
      pb.set(x, y, c);
    }
    pb.set(x, y0 - 1, WOOD[4]); pb.set(x, y0 - 2, WOOD[5]);
    if (x % 9 === 0 && !ribs && x < 110 && x > 12) pb.rect(x, y0 + 4, 3, 3, 0x1a1012); // les sabords
  }
  pb.rect(6, 79, 124, 3, WOOD[1]); // la quille
  pb.line(129, 44, 135, 26, WOOD[3], 2.6); pb.line(129, 44, 135, 26, WOOD[1], 1); // l'étrave et le beaupré coupé
  for (let y = 16; y < 42; y++) pb.hl(6, y, 3, WOOD[1 + (y % 3 === 0 ? 0 : 1)]); pb.rect(8, 18, 16, 4, WOOD[4]); pb.hl(8, 18, 16, WOOD[5]); // la poupe haute
  pb.rect(10, 26, 4, 4, 0xffd36b); pb.rect(17, 26, 4, 4, 0x2a3a5a); // les fenêtres de la poupe
  pb.rect(64, 10, 4, 30, WOOD[2]); pb.vl(64, 10, 30, WOOD[3]); pb.rect(62, 8, 8, 3, WOOD[1]); // le tronçon du grand mât
  // l'échafaudage, l'échelle, les planches de travail
  for (const x of [28, 52, 82, 108]) pb.rect(x, 18, 2, 66, mix(WOOD[2], 0x8a7a5a, 0.3));
  for (const [x0, x1, y] of [[26, 56, 30], [80, 112, 26], [50, 84, 52]]) { pb.rect(x0, y, x1 - x0, 2, WOOD[4]); pb.hl(x0, y, x1 - x0, WOOD[5]); }
  for (let y = 34; y < 84; y += 5) pb.hl(72, y, 6, WOOD[3]); pb.vl(72, 32, 52, WOOD[2]); pb.vl(77, 32, 52, WOOD[2]);
  // le seau de brai qui fume, une scie, des bordages neufs posés contre la coque
  pb.rect(94, 20, 7, 6, IRON[1]); pb.hl(94, 20, 7, 0x2a1a12); pb.set(97, 18, 0x8a8a8a); pb.set(98, 16, 0xaaaaaa);
  pb.line(36, 27, 44, 22, IRON[4]); pb.rect(44, 21, 3, 2, WOOD[3]);
  for (let k = 0; k < 3; k++) pb.line(112 + k * 3, 86, 118 + k * 3, 54, k % 2 ? WOOD[4] : WOOD[3], 1.6);
  pb.outline('auto');
  return mk(pb, 68, 88);
}
// ------------------------------------------------------------------ la place, les échoppes, la taverne
function panneau() { // le panneau d'annonces : affiches, avis, un petit toit de planches
  const pb = new PB(30, 34);
  pb.rect(3, 8, 2, 25, WOOD[2]); pb.rect(25, 8, 2, 25, WOOD[2]);
  pb.rect(2, 9, 26, 15, WOOD[3]); pb.hl(2, 9, 26, WOOD[4]); pb.hl(2, 23, 26, WOOD[1]);
  for (let x = 0; x < 30; x++) { pb.set(x, 5 + Math.abs(x - 15) * -0.12 + 3, WOOD[1]); }
  for (let y = 3; y < 8; y++) pb.hl(1 + (7 - y), y, 28 - (7 - y) * 2, y < 5 ? WOOD[4] : WOOD[3]);
  for (const [x, y, w, h, c] of [[4, 11, 7, 8, 0xf3ecd2], [12, 10, 6, 6, 0xe8d8a8], [19, 11, 7, 9, 0xf3ecd2], [12, 17, 7, 5, 0xd8c8a0]]) {
    pb.rect(x, y, w, h, c); pb.hl(x + 1, y + 2, w - 2, 0x6a5a4a); pb.hl(x + 1, y + 4, w - 3, 0x8a7a6a); pb.set(x + (w >> 1), y, 0xc0302a);
  }
  pb.rect(20, 14, 5, 3, 0x9c2530); // un sceau de cire
  pb.outline('auto');
  return mk(pb, 15, 32);
}
function potFleurs(v) { // une jardinière de pierre fleurie
  const pb = new PB(18, 16), F = [[0xff5a6e, 0xffd34a], [0xbfa8ff, 0xffffff], [0xff93b8, 0xffffff], [0xffd34a, 0xff7a5c]][v % 4];
  pb.rect(2, 8, 14, 7, STONE[3]); pb.hl(2, 8, 14, STONE[4]); pb.hl(2, 14, 14, STONE[1]); pb.rect(1, 7, 16, 2, STONE[4]);
  for (let k = 0; k < 7; k++) { const x = 3 + k * 2, y = 5 + (k % 2); pb.rect(x, y, 2, 3, LEAF[3]); pb.set(x, y - 1, F[k % 2]); pb.set(x + 1, y - 1, F[k % 2]); pb.set(x, y - 2, shade(F[k % 2], 1.1)); }
  pb.outline('auto');
  return mk(pb, 9, 15);
}
function tableExt(v) { // une table de terrasse, deux bancs, des chopes
  const pb = new PB(32, 22);
  pb.rect(1, 15, 30, 2, WOOD[3]); pb.hl(1, 15, 30, WOOD[4]); pb.rect(2, 17, 2, 4, WOOD[1]); pb.rect(28, 17, 2, 4, WOOD[1]); // banc de devant
  pb.rect(4, 6, 24, 6, WOOD[4]); pb.hl(4, 6, 24, WOOD[5]); pb.hl(4, 11, 24, WOOD[2]); pb.rect(6, 12, 2, 5, WOOD[1]); pb.rect(24, 12, 2, 5, WOOD[1]);
  pb.rect(3, 2, 26, 2, WOOD[2]); // banc du fond
  const mug = (x, y) => { pb.rect(x, y, 4, 4, GOLD[2]); pb.hl(x, y, 4, 0xffffff); pb.vl(x + 4, y + 1, 2, GOLD[1]); };
  mug(8, 3); mug(19, 4); if (v) { pb.disc(14, 6, 2, 0xe8dcc0); pb.set(14, 6, 0xc0302a); } else { pb.rect(12, 5, 4, 2, 0xf3ecd2); pb.set(13, 5, 0x1a1418); }
  pb.outline('auto');
  return mk(pb, 16, 20);
}
function comptoirExt(v) { // le comptoir d'une échoppe, dehors, et ce qu'on y vend
  const pb = new PB(30, 24);
  pb.rect(1, 9, 28, 4, WOOD[4]); pb.hl(1, 9, 28, WOOD[5]); pb.rect(1, 13, 28, 9, WOOD[3]); for (let x = 3; x < 29; x += 5) pb.vl(x, 13, 9, WOOD[2]); pb.hl(1, 21, 28, WOOD[1]);
  if (v === 0) { // la voilerie : des coupons de toile, une aiguille de voilier
    for (const [x, c] of [[3, CANVAS[3]], [10, 0xc23a34], [17, CANVAS[2]], [23, 0x2a4685]]) { pb.rect(x, 4, 6, 5, c); pb.hl(x, 4, 6, mix(c, 0xffffff, 0.3)); pb.vl(x + 5, 4, 5, shade(c, 0.8)); }
  } else if (v === 1) { // le cartographe : des cartes roulées, une boussole
    for (let k = 0; k < 4; k++) { pb.rect(3 + k * 5, 5 + (k % 2), 4, 4, 0xe8d8a8); pb.vl(3 + k * 5, 5 + (k % 2), 4, 0xc4b07a); }
    pb.disc(25, 6, 2.6, GOLD[2]); pb.disc(25, 6, 1.6, 0xf3ecd2); pb.set(25, 5, 0xc0302a);
  } else if (v === 2) { // l'épicerie : des sacs ouverts, des bocaux
    for (const [x, c] of [[4, 0xd88a2a], [11, 0xa83a1a], [18, 0xe8d070]]) { pb.ellipse(x + 2, 6, 3.4, 3, 0xc4a466); pb.ellipse(x + 2, 4.6, 2.6, 1.2, c); }
    for (const x of [24, 27]) { pb.rect(x, 3, 3, 6, 0xd8e8f0); pb.rect(x, 5, 3, 4, x === 24 ? 0x3a8a2a : 0x8a2a6a); }
  } else { // la tonnellerie et la corderie : des douelles, des cercles ; un rouleau de cordage
    pb.ellipse(7, 6, 5, 3, ROPE[2]); pb.ellipse(7, 6, 2.5, 1.4, ROPE[0]); for (let x = 14; x < 28; x += 3) { pb.rect(x, 2, 2, 7, WOOD[3]); pb.set(x, 2, WOOD[5]); }
  }
  pb.outline('auto');
  return mk(pb, 15, 22);
}
function rouleaux() { // des rouleaux de toile à voile, debout
  const pb = new PB(20, 22);
  for (const [x, h, c] of [[2, 18, CANVAS], [8, 15, CANVAS], [14, 19, [0x7a1418, 0xa82226, 0xc23a34, 0xe05a4a, 0xf08a7a]]]) {
    pb.cyl(x, 21 - h, 5, h, c, {}); pb.ellipse(x + 2.5, 21 - h, 2.5, 1, c[4]); pb.set(x + 2, 21 - h, c[1]);
  }
  pb.outline('auto');
  return mk(pb, 10, 20);
}
function potager(v) { // un potager : la terre en sillons, des choux, des fanes
  const pb = new PB(34, 18);
  for (let y = 2; y < 17; y++) for (let x = 1; x < 33; x++) pb.set(x, y, (y % 4 === 0) ? 0x4a3018 : (y % 4 === 1 ? 0x6a4626 : 0x5a3a1e));
  for (let r = 0; r < 3; r++) for (let x = 3; x < 32; x += 5) {
    const y = 4 + r * 4, c = (v + r) % 2 ? LEAF : [0x2a4a1e, 0x3f6b26, 0x5a8f2e, 0x7fb03a, 0xa8cc4e];
    if ((x + r) % 3 === 0) { pb.disc(x, y, 1.8, c[3]); pb.disc(x - 0.5, y - 0.5, 0.9, c[4]); } else { pb.vl(x, y - 2, 3, c[3]); pb.set(x - 1, y - 2, c[4]); pb.set(x + 1, y - 1, c[2]); }
  }
  for (let x = 0; x < 34; x += 3) { pb.set(x, 1, WOOD[3]); pb.set(x, 17, WOOD[2]); }
  return mk(pb, 17, 14);
}
// ------------------------------------------------------------------ les hauteurs
function longueVue(v) { // une longue-vue de laiton sur son trépied, tournée vers le large
  const pb = new PB(20, 24), fl = !!v;
  const X = (x) => (fl ? 19 - x : x);
  pb.line(X(9), 12, X(4), 23, WOOD[2], 1.4); pb.line(X(10), 12, X(15), 23, WOOD[3], 1.4); pb.line(X(10), 12, X(10), 23, WOOD[1]);
  pb.line(X(3), 9, X(17), 5, GOLD[2], 3); pb.line(X(3), 8, X(17), 4, GOLD[4], 1); pb.disc(X(17), 5, 2, GOLD[1]); pb.disc(X(3), 9, 1.4, GOLD[3]);
  pb.disc(X(10), 11, 1.5, IRON[3]);
  pb.outline('auto');
  return mk(pb, X(10), 22);
}
function muret() { // un muret de pierres sèches au bord du vide
  const pb = new PB(16, 14);
  for (let y = 3; y < 13; y++) for (let x = 0; x < 16; x++) { const row = Math.floor((y - 3) / 3), bx = (x + row * 3) % 6; pb.set(x, y, (y - 3) % 3 === 2 || bx === 0 ? STONE[1] : STONE[2 + ((x * 7 + row) % 3 === 0 ? 1 : 0)]); }
  pb.rect(0, 2, 16, 2, STONE[4]); pb.hl(0, 2, 16, STONE[5]);
  for (const x of [3, 11]) pb.set(x, 1, LEAF[4]);
  pb.outline('auto');
  return mk(pb, 8, 13);
}
function escalier(v) { // quelques marches de pierre taillée, qui montent vers le belvédère
  const pb = new PB(16, 16);
  for (let k = 0; k < 4; k++) { const y = 2 + k * 3.5; pb.rect(1, Math.round(y), 14, 3, STONE[3 + (k % 2)]); pb.hl(1, Math.round(y), 14, STONE[5]); pb.hl(1, Math.round(y) + 3, 14, STONE[1]); }
  if (v) { pb.vl(0, 1, 15, STONE[1]); pb.vl(15, 1, 15, STONE[1]); }
  return mk(pb, 8, 14);
}
function porche() { // l'arche du Couchant : deux poteaux, une traverse, l'enseigne du port et deux lanternes
  const W = 70, pb = new PB(W, 64);
  for (const x of [4, 62]) { pb.rect(x, 12, 5, 50, WOOD[2]); pb.vl(x, 12, 50, WOOD[3]); pb.vl(x + 4, 12, 50, WOOD[1]); pb.rect(x - 1, 58, 7, 5, STONE[2]); pb.hl(x - 1, 58, 7, STONE[4]); }
  pb.rect(0, 8, W, 6, WOOD[3]); pb.hl(0, 8, W, WOOD[5]); pb.hl(0, 13, W, WOOD[1]); pb.rect(0, 6, 6, 2, WOOD[4]); pb.rect(W - 6, 6, 6, 2, WOOD[4]);
  // l'enseigne : une planche, un phare peint, une lanterne de chaque côté
  pb.rect(14, 15, 42, 12, WOOD[1]); pb.rect(15, 16, 40, 10, WOOD[4]); pb.hl(15, 16, 40, WOOD[5]);
  pb.vl(20, 14, 2, IRON[2]); pb.vl(50, 14, 2, IRON[2]);
  pb.rect(33, 17, 4, 8, 0xf3f0e2); pb.rect(33, 19, 4, 2, 0xc0302a); pb.rect(33, 23, 4, 1, 0xc0302a); pb.rect(32, 16, 6, 1, IRON[2]); pb.set(34, 15, 0xffd24a); pb.set(35, 15, 0xffd24a);
  for (let x = 18; x < 30; x += 2) pb.set(x, 21, GOLD[1]); for (let x = 41; x < 53; x += 2) pb.set(x, 21, GOLD[1]);
  for (const x of [8, 58]) { pb.vl(x + 2, 14, 4, IRON[1]); pb.rect(x, 18, 5, 7, IRON[1]); pb.rect(x + 1, 19, 3, 5, 0xffd36b); pb.set(x + 1, 19, 0xfff4c0); }
  pb.outline('auto');
  return mk(pb, W >> 1, 62, { lights: [[10, 22], [60, 22]] });
}

export function extendPort(env, structSpr) {
  env.bitte = many(bitte, 2); env.grue = many(grue, 3); env.caisses = many(caisses, 3); env.tonneaux = many(tonneaux, 3);
  env.etal_poisson = many(etalPoisson, 3); env.sechoir = many(sechoir, 2); env.cabestan = [cabestan()]; env.coque = [coque()];
  env.panneau = [panneau()]; env.pot_fleurs = many(potFleurs, 4); env.table_ext = many(tableExt, 2); env.comptoir_ext = many(comptoirExt, 4);
  env.rouleaux = [rouleaux()]; env.potager = many(potager, 2); env.longue_vue = many(longueVue, 2); env.muret = [muret()]; env.escalier = many(escalier, 2);
  env.porche = [porche()];
  if (structSpr && structSpr.feu_camp) env.feu_camp = structSpr.feu_camp;
}
