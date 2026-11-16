// Icônes 16x16 des objets et des compétences.
import { PB, shade, mix } from './pixel.js';
import { ITEMS } from '../../shared/data/items.js';
import { drawWeaponIcon } from './weapons.js';

const GOLD = [0x7a4a12, 0xa86e1c, 0xd49a2a, 0xf2c14a, 0xffe58a];
const IRON = [0x1d1c24, 0x2c2b36, 0x403f4e, 0x5a596b, 0x7c7b8f, 0xa2a1b2];
const WOOD = [0x34200f, 0x4f321a, 0x6d4626, 0x8c5c33, 0xab7643, 0xc79357];
const STONE5 = [0x353443, 0x4c4b5d, 0x666579, 0x828196, 0xa3a2b4];
const BLADES = {
  rust: [0x5a3a2a, 0x8a5a3a, 0xb07a52, 0xcfa078],
  steel: [0x4a4c5a, 0x7c8090, 0xb4b8c6, 0xeef0f8],
  gold: [0x5a5c6a, 0x8c90a0, 0xc4c8d6, 0xffffff],
  coral: [0x7a1e3a, 0xc23a5a, 0xff6a84, 0xffc0c8],
};
const CL = {
  red: [0x521216, 0x821f26, 0xb03232, 0xd44e46], navy: [0x121a34, 0x1c284e, 0x2a3c70, 0x405696],
  brown: [0x352112, 0x55351e, 0x754b2a, 0x966438], white: [0x86806f, 0xb4ad9c, 0xd9d2c2, 0xf5f1e6],
  black: [0x100e12, 0x1c1820, 0x2a2430, 0x3c3444], green: [0x16341f, 0x224e30, 0x326c44, 0x48895a],
  yellow: [0x745412, 0xa2781c, 0xcf9e2c, 0xebc24c], purple: [0x2a183a, 0x422656, 0x5e387a, 0x7a509a],
};

const P = {
  saber(pb, t = 'steel') {
    const B = BLADES[t] || BLADES.steel;
    for (let i = 0; i < 9; i++) { const bow = i > 2 && i < 8 ? 1 : 0; pb.set(5 + i, 10 - i - bow, B[3]); pb.set(6 + i, 10 - i - bow, B[2]); pb.set(6 + i, 11 - i - bow, B[1]); }
    pb.set(14, 1, B[3]);
    const H = t === 'gold' || t === 'coral' ? GOLD : [0x3a2a1a, 0x5a3e24, 0x8a6a3a, 0xb08a4a, 0xd0a860];
    pb.line(3, 9, 7, 13, H[3]); pb.set(3, 9, H[4]);
    pb.line(2, 13, 4, 11, 0x5a3420); pb.set(1, 14, H[3]); pb.set(2, 14, H[2]);
    if (t === 'coral') { pb.set(9, 5, 0xffe0e8); pb.set(12, 2, 0xffe0e8); }
  },
  pistol(pb, t = 'steel') {
    const M = BLADES[t === 'rust' ? 'rust' : 'steel'];
    pb.hl(5, 5, 10, M[3]); pb.hl(5, 6, 10, M[2]); pb.hl(5, 7, 9, M[1]); pb.set(14, 4, M[2]);
    pb.rect(2, 6, 5, 3, WOOD[3]); pb.hl(2, 6, 5, WOOD[4]);
    pb.rect(1, 8, 3, 5, WOOD[2]); pb.vl(1, 8, 5, WOOD[3]); pb.rect(1, 12, 3, 1, GOLD[2]);
    pb.set(5, 9, M[1]); pb.set(6, 9, M[1]); pb.set(6, 8, M[2]); pb.set(4, 5, M[3]);
  },
  blunder(pb) {
    pb.hl(5, 6, 8, IRON[4]); pb.hl(5, 7, 8, IRON[3]); pb.vl(13, 4, 6, GOLD[3]); pb.vl(14, 3, 8, GOLD[2]); pb.vl(12, 5, 4, GOLD[2]);
    pb.rect(1, 7, 5, 3, WOOD[3]); pb.hl(1, 7, 5, WOOD[4]); pb.rect(0, 9, 3, 5, WOOD[2]);
  },
  musket(pb) {
    pb.line(3, 12, 15, 2, IRON[4]); pb.line(4, 12, 15, 3, IRON[2]);
    pb.line(0, 15, 5, 11, WOOD[3], 2); pb.line(1, 15, 4, 12, WOOD[4]);
  },
  bandana(pb, c = 'red') {
    const C = CL[c] || CL.red;
    for (let y = 3; y < 12; y++) { const hw = (12 - y) * 0.75 + 1; pb.hl(8 - hw, y, hw * 2, C[y < 6 ? 3 : 2]); }
    for (let y = 3; y < 11; y += 2) for (let x = 3 + (y % 4 === 1 ? 1 : 0); x < 13; x += 3) if (pb.has(x, y)) pb.set(x, y, 0xf5ecdc);
    pb.line(13, 4, 15, 8, C[1], 1.5); pb.line(12, 4, 14, 10, C[2]);
  },
  tricorne(pb, big = false) {
    const C = CL.black, G = GOLD;
    for (let y = 3; y < 9; y++) { const ins = y === 3 ? 4 : y === 4 ? 3 : 2; pb.hl(2 + ins, y, 12 - ins * 2, C[y < 6 ? 3 : 2]); }
    pb.hl(0, 9, 16, C[2]); pb.hl(1, 10, 14, C[1]); pb.hl(5, 11, 6, C[1]); pb.hl(7, 12, 2, C[1]);
    pb.hl(0, 9, 3, G[3]); pb.hl(13, 9, 3, G[3]); pb.hl(5, 11, 6, G[2]); pb.hl(7, 12, 2, G[3]);
    if (big) { pb.rect(6, 5, 4, 3, 0xf0ece0); pb.set(7, 6, 0x141014); pb.set(8, 6, 0x141014); pb.line(2, 7, 1, 1, 0xf6f0e2, 2); pb.set(1, 0, 0xe04a3a); pb.set(2, 0, 0xe04a3a); }
  },
  paille(pb) {
    const S = [0x8a6a2a, 0xb8923e, 0xe0c060, 0xf6e08a];
    pb.ellipse(8, 10, 7.5, 3.4, S[2]); pb.ellipse(8, 9.5, 6, 2.2, S[3]);
    pb.rect(4, 4, 8, 6, S[2]); pb.ellipse(8, 4.5, 4, 2, S[3]); pb.hl(4, 8, 8, 0xc0302a);
  },
  bonnet(pb) { const C = CL.navy; pb.ellipse(8, 8, 6, 5, C[2]); pb.ellipse(7, 7, 4, 3, C[3]); pb.rect(2, 10, 12, 3, C[1]); pb.disc(8, 2.5, 2, 0xf0ece0); },
  shirt(pb, c = 'white', stripes = false, vest = false) {
    const C = CL[c] || CL.white;
    pb.rect(4, 3, 8, 11, C[2]); pb.vl(4, 3, 11, C[3]); pb.vl(11, 3, 11, C[1]);
    pb.rect(1, 3, 3, 5, C[3]); pb.rect(12, 3, 3, 5, C[1]);
    if (stripes) for (let y = 4; y < 14; y += 2) { pb.hl(4, y, 8, CL.navy[2]); pb.hl(1, y, 3, CL.navy[2]); pb.hl(12, y, 3, CL.navy[2]); }
    if (vest) { pb.rect(4, 3, 3, 11, CL.brown[2]); pb.rect(9, 3, 3, 11, CL.brown[1]); pb.set(8, 6, GOLD[3]); pb.set(8, 9, GOLD[3]); pb.clear(1, 3); }
    pb.set(7, 3, 0x241a1a); pb.set(8, 3, 0x241a1a); pb.set(7, 4, 0x241a1a);
  },
  coat(pb, c = 'red', captain = false) {
    const C = CL[c] || CL.red;
    pb.rect(4, 2, 8, 13, C[2]); pb.vl(4, 2, 13, C[3]); pb.vl(11, 2, 13, C[1]);
    pb.rect(1, 2, 3, 8, C[3]); pb.rect(12, 2, 3, 8, C[1]);
    pb.line(6, 2, 8, 7, C[3]); pb.line(9, 2, 8, 7, C[0]);
    for (const y of [8, 10, 12]) { pb.set(6, y, GOLD[3]); pb.set(9, y, GOLD[3]); }
    if (captain) { pb.hl(1, 2, 3, GOLD[3]); pb.hl(12, 2, 3, GOLD[3]); pb.vl(4, 2, 13, GOLD[2]); pb.vl(11, 2, 13, GOLD[1]); }
    pb.hl(1, 9, 3, 0xf0e8d8); pb.hl(12, 9, 3, 0xd8d0c0);
  },
  boots(pb, c = 'black') {
    const C = c === 'brown' ? CL.brown : CL.black;
    pb.rect(4, 2, 6, 10, C[2]); pb.vl(4, 2, 10, C[3]); pb.rect(3, 1, 8, 2, C[3]);
    pb.rect(4, 10, 10, 4, C[2]); pb.hl(4, 10, 10, C[3]); pb.hl(3, 14, 11, C[0]);
    pb.hl(4, 6, 6, GOLD[2]);
  },
  necklace(pb) {
    for (let x = 2; x < 14; x++) { const y = 3 + Math.round(Math.pow((x - 7.5) / 6, 2) * -1 * 0 + Math.abs(x - 7.5) * -0.6 + 6); pb.set(x, y, 0x6a4a2a); }
    for (const [x, y] of [[4, 7], [7, 9], [10, 7]]) { pb.set(x, y + 1, 0xf6f0dc); pb.set(x + 1, y + 1, 0xd8cfb4); pb.set(x, y + 2, 0xf6f0dc); pb.set(x, y + 3, 0xc4bb9c); }
  },
  amulet(pb) {
    pb.line(3, 2, 8, 7, GOLD[2]); pb.line(13, 2, 8, 7, GOLD[1]);
    pb.rect(6, 7, 5, 7, IRON[2]); pb.rect(7, 8, 3, 5, 0xffd36b); pb.set(7, 8, 0xfff4c0); pb.hl(6, 7, 5, GOLD[3]); pb.hl(6, 14, 5, GOLD[2]);
  },
  banana(pb) {
    // deux bananes en croissant, la queue en haut à droite
    const one = (p0, p1, p2, fat, R) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        let best = 99, bt = 0, side = 0;
        for (let k = 0; k <= 40; k++) {
          const t = k / 40, u = 1 - t;
          const cx = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], cy = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (d < best) { best = d; bt = t; const tx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), ty = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]); side = ((x + 0.5 - cx) * ty - (y + 0.5 - cy) * tx) / (Math.hypot(tx, ty) || 1); }
        }
        const w = 0.75 + fat * Math.pow(Math.sin(Math.PI * Math.min(1, bt * 1.04)), 0.7);
        if (best > w) continue;
        const s = side / w; // -1 : bord creux (clair), +1 : ventre (ombre)
        pb.set(x, y, bt < 0.07 ? 0x6a4a1c : bt > 0.95 ? 0x4a3014 : s < -0.45 ? R[3] : s < 0.2 ? R[2] : s < 0.7 ? R[1] : R[0]);
      }
    };
    one([12.5, 1.5], [14.5, 11], [4, 13.2], 1.5, [0xb87a14, 0xe0a422, 0xf7c93a, 0xffe46a]);
    one([11, 1.8], [9.5, 9.5], [1.8, 9.2], 1.7, [0xc88a1a, 0xf0b828, 0xffd83e, 0xfff08a]);
    pb.set(11, 1, 0x7a5a22); pb.set(12, 1, 0x5a3e16); pb.set(11, 2, 0x8a9a2e); pb.set(12, 2, 0x6a7a22);
    pb.set(5, 7, 0xfffbd0); pb.set(6, 6, 0xfffbd0);
  },
  coconut(pb) { pb.blob(8, 8.5, 6, 5.5, [0x3a2414, 0x5a3820, 0x7a4f2c, 0x9c683a, 0xb88a52], { noise: 0.3 }); pb.set(6, 6, 0x1a100a); pb.set(9, 6, 0x1a100a); pb.set(7.5, 8, 0x1a100a); },
  fish(pb) {
    pb.ellipse(7, 8, 6, 3.6, 0xc87a3a); pb.ellipse(7, 7, 5, 2, 0xe8a050);
    pb.line(13, 8, 15, 5, 0xa85a2a, 1.5); pb.line(13, 8, 15, 11, 0xa85a2a, 1.5);
    for (const x of [5, 8, 11]) pb.line(x, 6, x - 1, 10, 0x6a3a1a);
    pb.set(3, 7, 0x141014);
  },
  rum(pb) {
    pb.rect(5, 6, 6, 9, 0x3a5a2a); pb.vl(5, 6, 9, 0x5a8a40); pb.rect(6, 2, 4, 4, 0x2e4a22); pb.rect(6, 0, 4, 2, 0xa8784a);
    pb.rect(5, 9, 6, 4, 0xf0e4c4); pb.set(7, 10, 0xb02a2a); pb.set(8, 11, 0xb02a2a); pb.set(8, 10, 0xb02a2a); pb.set(7, 11, 0xb02a2a);
  },
  grog(pb) {
    pb.rect(3, 5, 8, 10, WOOD[3]); pb.vl(3, 5, 10, WOOD[4]); pb.hl(3, 8, 8, IRON[3]); pb.hl(3, 12, 8, IRON[3]);
    pb.rect(11, 7, 3, 5, WOOD[2]); pb.clear(11, 8); pb.clear(11, 9); pb.clear(11, 10);
    pb.ellipse(7, 5, 4.5, 2, 0xf6ead0); pb.set(5, 2, 0xd0d0d0); pb.set(8, 1, 0xd0d0d0); pb.set(9, 3, 0xd0d0d0);
  },
  claw(pb) {
    const S = [0x3a1420, 0x6a2430, 0x9a3640, 0xc85a56, 0xe8867a];
    pb.blob(8, 9, 5, 4.5, S, {}); pb.line(5, 6, 4, 1, S[3], 2); pb.line(10, 6, 13, 2, S[2], 2); pb.line(4, 12, 1, 15, S[1], 2);
  },
  flesh(pb) { pb.blob(8, 9, 6, 4.5, [0x3f5233, 0x5a7446, 0x8a7a5c, 0xb08a7a, 0xd0a898], { noise: 0.5 }); pb.set(6, 8, 0x8a2a2a); pb.set(10, 10, 0x8a2a2a); },
  bone(pb) {
    const B = [0x6c6450, 0x9a9076, 0xc8bfa2, 0xeee6cc];
    pb.line(4, 12, 12, 4, B[2], 2.4); pb.line(4, 11, 11, 4, B[3]);
    for (const [x, y] of [[3, 12], [4, 13], [12, 3], [13, 4]]) pb.disc(x, y, 1.6, B[3]);
    pb.set(3, 13, 0x7cff7a);
  },
  tooth(pb) { pb.rect(5, 2, 6, 5, 0xeee6cc); for (let y = 7; y < 14; y++) { const w = Math.max(1, 6 - (y - 7)); pb.hl(8 - w / 2, y, w, y > 10 ? 0xd8cfa8 : 0xeee6cc); } pb.vl(5, 2, 5, 0xfffbe8); },
  seaweed(pb) { for (const [x0, c] of [[4, 0x1f5a3a], [8, 0x2a7a4a], [11, 0x1a4a30]]) for (let y = 2; y < 15; y++) { const x = x0 + Math.round(Math.sin(y * 0.7 + x0) * 1.3); pb.set(x, y, c); pb.set(x + 1, y, shade(c, 1.2)); } },
  powder(pb) { pb.blob(8, 9.5, 5.5, 5, [0x141018, 0x221c26, 0x332a38, 0x4a3e50, 0x625468], {}); pb.rect(6, 2, 4, 3, 0x8a6a3a); pb.hl(5, 4, 6, 0x5a3a1a); pb.set(8, 9, 0xe8e0d0); pb.set(7, 10, 0xe8e0d0); pb.set(9, 10, 0xe8e0d0); },
  pearl(pb) { pb.blob(8, 8, 5.5, 5.5, [0x1a1030, 0x2e1c50, 0x4a2e78, 0x7050a8, 0xb090e0], {}); pb.set(6, 5, 0xffffff); pb.set(5, 6, 0xd0c0ff); },
  coins(pb) {
    for (const [x, y] of [[5, 11], [10, 12], [7, 8], [9, 5]]) { pb.ellipse(x, y, 3.6, 2, GOLD[2]); pb.ellipse(x, y - 0.6, 3, 1.4, GOLD[3]); pb.set(x - 1, y - 1, GOLD[4]); pb.hl(x - 3, y + 1, 7, GOLD[1]); }
  },
  barrel(pb) { pb.cyl(3, 2, 10, 13, WOOD); pb.hl(3, 5, 10, IRON[2]); pb.hl(3, 11, 10, IRON[2]); pb.rect(6, 7, 4, 3, 0xf0e4c4); pb.set(7, 8, 0xb02a2a); pb.set(8, 8, 0xb02a2a); },
  map(pb) {
    pb.rect(2, 3, 12, 10, 0xe8d8b0); pb.vl(2, 3, 10, 0xc8b088); pb.vl(13, 3, 10, 0xc8b088);
    pb.line(4, 10, 8, 6, 0x8a6a4a); pb.line(8, 6, 10, 8, 0x8a6a4a);
    pb.line(9, 9, 11, 11, 0xc02a2a); pb.line(11, 9, 9, 11, 0xc02a2a);
  },
  compass(pb) { pb.disc(8, 8, 6, GOLD[2]); pb.disc(8, 8, 4.6, 0xf0e8d0); pb.line(8, 4, 8, 8, 0xc02a2a); pb.line(8, 8, 8, 12, 0x2a2a3a); pb.set(6, 6, GOLD[4]); },
  key(pb) { pb.disc(5, 5, 3, GOLD[2]); pb.disc(5, 5, 1.2, -1); pb.clear(5, 5); pb.line(7, 7, 13, 13, GOLD[2], 1.6); pb.line(11, 11, 13, 9, GOLD[2]); },
  rod(pb) {
    pb.line(2, 14, 13, 2, 0x8a5a2a, 1.4); pb.line(3, 14, 13, 3, 0xb07a42); pb.rect(1, 12, 3, 3, 0x3a2414);
    pb.line(13, 2, 14, 10, 0xd8d8d8); pb.rect(13, 10, 2, 2, 0xe03a2a); pb.set(13, 10, 0xffffff);
    pb.disc(4, 11, 1.6, 0x9a9aa8);
  },
  fish_s(pb, t = 'silver') {
    const C = { silver: [0x5a6a7a, 0x9aaabb, 0xd0dce6], blue: [0x1e4a7a, 0x3a78b0, 0x8ac0e8], gold: [0x8a5a14, 0xe0a030, 0xffe08a], glow: [0x0e4a3a, 0x2ab08a, 0xaaffe0], sword: [0x1a2a5a, 0x3a5aa0, 0xa8c8f0] }[t] || [0x5a6a7a, 0x9aaabb, 0xd0dce6];
    pb.ellipse(7, 8, 5.5, 3.2, C[1]); pb.ellipse(7, 7, 4.5, 1.6, C[2]);
    pb.line(12, 8, 15, 5, C[0], 1.5); pb.line(12, 8, 15, 11, C[0], 1.5);
    pb.set(3, 7, 0x141014); pb.set(7, 5, C[0]); pb.set(8, 11, C[0]);
    if (t === 'sword') pb.line(2, 7, 0, 7, 0xd0dce6);
    if (t === 'glow') { pb.line(4, 4, 3, 1, 0x2ab08a); pb.set(3, 0, 0xffffa0); pb.set(2, 0, 0xffffa0); }
  },
  bottle(pb) {
    pb.rect(5, 5, 6, 9, 0x5aa0b0); pb.vl(5, 5, 9, 0x8ad0e0); pb.rect(6, 2, 4, 3, 0x4a8090); pb.rect(6, 0, 4, 2, 0xa8784a);
    pb.rect(7, 7, 2, 5, 0xf0e4c4); pb.set(8, 8, 0xb02a2a);
  },
  crown(pb) {
    const G = [0x8a5a14, 0xc8901e, 0xf0c040, 0xfff0a0];
    pb.rect(2, 8, 12, 5, G[2]); pb.hl(2, 8, 12, G[3]); pb.hl(2, 12, 12, G[1]);
    for (const x of [2, 6, 10, 13]) { pb.rect(x, 4, 2, 4, G[2]); pb.set(x, 3, G[3]); }
    pb.rect(7, 9, 2, 2, 0xd8303a); pb.set(4, 10, 0x3a8ad8); pb.set(11, 10, 0x3ad86a);
  },
  scale(pb) {
    pb.blob(8, 8, 6, 6.5, [0x0e3a3a, 0x1a6a62, 0x2a9a8a, 0x5ad0b8, 0xb0fff0], {});
    for (const y of [5, 8, 11]) pb.hl(4, y, 8, 0x0e3a3a);
    pb.set(6, 4, 0xffffff);
  },
  trophy(pb) {
    const G = [0x8a5a14, 0xc8901e, 0xf0c040, 0xfff0a0];
    pb.rect(4, 2, 8, 6, G[2]); pb.ellipse(8, 7, 4, 2.5, G[2]); pb.vl(4, 2, 6, G[3]);
    pb.rect(1, 3, 3, 1, G[1]); pb.rect(12, 3, 3, 1, G[1]); pb.vl(1, 3, 3, G[1]); pb.vl(14, 3, 3, G[1]);
    pb.rect(7, 9, 2, 3, G[1]); pb.rect(4, 12, 8, 2, G[1]); pb.hl(4, 12, 8, G[2]);
  },
  gear(pb) {
    pb.disc(8, 8, 5.5, 0x8a8aa0); pb.disc(8, 8, 2, -1);
    for (let a = 0; a < 8; a++) { const x = 8 + Math.cos(a / 8 * 6.283) * 6.5, y = 8 + Math.sin(a / 8 * 6.283) * 6.5; pb.rect(x - 1, y - 1, 2, 2, 0x8a8aa0); }
    pb.clear(8, 8); pb.clear(7, 8); pb.clear(8, 7); pb.clear(7, 7);
  },
  anvil(pb) { pb.rect(2, 5, 12, 3, 0x5a596b); pb.hl(2, 5, 12, 0x7c7b8f); pb.rect(5, 8, 6, 3, 0x403f4e); pb.rect(3, 11, 10, 3, 0x2c2b36); pb.set(13, 2, 0xffd84a); pb.set(12, 3, 0xffa030); pb.set(14, 3, 0xffa030); },
  log(pb) { pb.cyl(2, 5, 12, 7, WOOD); pb.ellipse(13, 8.5, 2, 3.4, 0xc79357); pb.ellipse(13, 8.5, 1, 1.8, 0x8c5c33); pb.set(5, 7, 0x4f321a); },
  driftwood_i(pb) { pb.line(2, 11, 13, 5, 0xbcab90, 3); pb.line(2, 10, 13, 4, 0xd8cab0); pb.line(9, 7, 12, 11, 0x9c8a72, 1.5); },
  fiber(pb) { for (let k = 0; k < 5; k++) pb.line(3 + k * 2, 14, 6 + k, 2, k % 2 ? 0x8ac43a : 0x5a8f2e); pb.hl(3, 9, 10, 0xc8a870); },
  flint(pb) { pb.blob(8, 9, 5.5, 4.5, [0x2a2a34, 0x3e3e4c, 0x5a5a6a, 0x7a7a8a, 0xa0a0b0], {}); pb.line(5, 6, 10, 11, 0xd0d0e0); },
  stone(pb) { pb.blob(8, 9, 6, 5, STONE5, { noise: 0.2 }); pb.blob(11, 6, 3, 2.5, STONE5, {}); },
  ore(pb) { pb.blob(8, 9, 6, 5, STONE5, { noise: 0.2 }); for (const [x, y] of [[6, 7], [10, 9], [8, 11], [11, 6]]) { pb.set(x, y, 0xc86a3a); pb.set(x + 1, y, 0xe8904a); } },
  resin(pb) { pb.blob(8, 9, 4.5, 5, [0x7a4a12, 0xa86e1c, 0xd49a2a, 0xf2c14a, 0xffe58a], {}); pb.set(6, 6, 0xffffff); },
  berries(pb) { for (const [x, y] of [[5, 8], [9, 7], [7, 11], [11, 11]]) { pb.disc(x, y, 2.2, 0xc8323c); pb.set(x - 1, y - 1, 0xff8a8a); } pb.line(7, 3, 9, 6, 0x3c8743); pb.set(10, 3, 0x55a44f); },
  herb(pb) { for (const a of [-2.4, -1.9, -1.4, -0.9]) pb.line(8, 14, 8 + Math.cos(a) * 9, 14 + Math.sin(a) * 9, 0x3e8e4a, 1.6); pb.line(8, 14, 8, 4, 0x2a7142); },
  mush(pb, t = 'purple') { const c = t === 'glow' ? [0x1d6b5d, 0x2ea08a, 0x52d6b4, 0xa8ffe4] : [0x4a2366, 0x6e3a94, 0x9558c2, 0xc596e8]; pb.rect(7, 8, 3, 6, 0xe8dcc0); pb.blob(8.5, 7, 6, 4, c, {}); pb.set(6, 5, c[3]); pb.set(10, 6, c[3]); },
  shell_i(pb) { for (let y = 3; y < 13; y++) for (let x = 2; x < 14; x++) { const dx = x - 8, dy = y - 12; if (dx * dx / 36 + dy * dy / 81 <= 1) pb.set(x, y, (x % 2) ? 0xf6d6c8 : 0xe2a89a); } pb.hl(6, 13, 4, 0xc47a70); },
  rope(pb) { for (let a = 0; a < 6.3; a += 0.25) { pb.set(8 + Math.cos(a) * 5.5, 8 + Math.sin(a) * 4.5, 0xc8a870); pb.set(8 + Math.cos(a) * 3.5, 8 + Math.sin(a) * 2.8, 0xa08850); } pb.line(12, 10, 14, 14, 0xc8a870); },
  plank(pb) { pb.rect(1, 6, 14, 5, WOOD[4]); pb.hl(1, 6, 14, WOOD[5]); pb.hl(1, 10, 14, WOOD[2]); pb.set(3, 8, WOOD[1]); pb.set(12, 8, WOOD[1]); },
  coal(pb) { pb.blob(7, 9, 4.5, 4, [0x0e0c10, 0x1c1820, 0x2c2632, 0x403848, 0x5a5066], {}); pb.blob(11, 10, 3, 2.6, [0x0e0c10, 0x1c1820, 0x2c2632, 0x403848, 0x5a5066], {}); },
  cloth(pb) { pb.rect(2, 3, 12, 10, 0xe8dec0); pb.vl(2, 3, 10, 0xf7f0dc); for (let y = 5; y < 13; y += 2) pb.hl(3, y, 11, 0xd2c6a2); pb.rect(11, 3, 3, 10, 0xc9b994); },
  ingot(pb) { for (let y = 6; y < 12; y++) { const ins = (11 - y) * 0.5; pb.hl(2 + ins, y, 12 - ins * 2, y < 8 ? 0xb4b8c6 : 0x7c8090); } pb.hl(4, 6, 8, 0xeef0f8); },
  axe(pb, t = 'flint') { pb.line(4, 14, 11, 3, WOOD[3], 1.6); const h = t === 'iron' ? [0x7c8090, 0xb4b8c6, 0xeef0f8] : [0x3e3e4c, 0x5a5a6a, 0x8a8a9a]; pb.blob(11, 5, 3.5, 3, [0x1d1c24, h[0], h[1], h[2], 0xffffff], {}); pb.line(8, 4, 9, 5, 0xc8a870); },
  pick(pb, t = 'flint') { pb.line(4, 14, 9, 5, WOOD[3], 1.6); const h = t === 'iron' ? 0xb4b8c6 : 0x6a6a7a; for (let a = -1.2; a <= 1.2; a += 0.1) pb.set(9 + Math.cos(a - 1.57) * 6 + Math.sin(a) * 0, 5 + Math.sin(a) * 4 * 0 + (Math.abs(a) * 2.4) - 2, h); pb.line(3, 3, 15, 5, h, 1.6); },
  club(pb) { pb.line(3, 13, 12, 4, WOOD[2], 2); pb.disc(12, 4, 3, WOOD[3]); pb.set(11, 3, WOOD[5]); pb.set(13, 5, WOOD[1]); },
  spear(pb) { pb.line(2, 14, 12, 4, WOOD[3], 1.4); for (let i = 0; i < 4; i++) { pb.set(12 + i * 0.6, 4 - i * 0.8, 0x7a7a8a); pb.set(11 + i * 0.6, 3 - i * 0.8, 0xa0a0b0); } pb.set(14, 1, 0xd0d0e0); pb.line(9, 6, 11, 8, 0xc8a870); },
  waraxe(pb) { pb.line(4, 14, 10, 3, WOOD[2], 1.8); pb.blob(11, 5, 4.5, 4, [0x1d1c24, 0x5a5e6a, 0x8c90a0, 0xc4c8d6, 0xffffff], {}); pb.blob(6, 4, 2.5, 2.5, [0x1d1c24, 0x5a5e6a, 0x8c90a0, 0xc4c8d6, 0xffffff], {}); },
  leafhat(pb) { pb.ellipse(8, 10, 7.5, 3.4, 0x5a8f2e); pb.ellipse(8, 9.5, 6, 2.2, 0x7fb03a); pb.rect(4, 4, 8, 6, 0x5a8f2e); pb.ellipse(8, 4.5, 4, 2, 0x8ac43a); for (let x = 2; x < 15; x += 3) pb.set(x, 11, 0x3f6b26); },
  bonehelm(pb) { pb.ellipse(8, 8, 6, 6, 0xeee6cc); pb.ellipse(7, 7, 4, 4, 0xfffbe8); pb.rect(4, 7, 3, 2, 0x141014); pb.rect(9, 7, 3, 2, 0x141014); for (let x = 4; x < 13; x += 2) pb.set(x, 13, 0x9a9076); },
  shellarmor(pb) { P.shirt(pb, 'white'); pb.map((c, x, y) => ((x + y) % 3 === 0 ? 0xe2a89a : (x % 2 ? 0x6ab0a8 : 0x8ad0c8))); },
  crabarmor(pb) { P.shirt(pb, 'red'); pb.map((c, x, y) => (y % 3 === 0 ? 0x6a2430 : (x + y) % 4 === 0 ? 0xe8867a : c)); },
  shellneck(pb) { for (let x = 2; x < 14; x++) pb.set(x, 3 + Math.round(Math.abs(x - 7.5) * -0.6 + 6), 0x6a4a2a); for (const [x, y] of [[4, 8], [8, 10], [11, 8]]) { pb.ellipse(x, y, 1.8, 1.6, 0xf6d6c8); pb.set(x, y, 0xe2a89a); } },
  bonecharm(pb) { pb.line(8, 1, 8, 6, 0x6a4a2a); P.bone(pb); },
  skewer(pb) { pb.line(1, 14, 14, 2, WOOD[4]); for (const [x, y] of [[5, 10], [8, 7], [11, 4]]) pb.blob(x, y, 2.4, 2, [0x6a2430, 0x9a3640, 0xc85a56, 0xe8867a, 0xffb0a0], {}); },
  stew(pb) { pb.ellipse(8, 10, 6.5, 4, IRON[2]); pb.ellipse(8, 8.5, 5.5, 2.4, 0x9a5a2a); pb.set(6, 8, 0xe8a050); pb.set(9, 9, 0x7a9a3a); pb.set(5, 4, 0xd0d0d0); pb.set(8, 3, 0xd0d0d0); pb.set(11, 4, 0xd0d0d0); },
  cake(pb) { pb.ellipse(8, 10, 6, 3.6, 0xc89a5a); pb.ellipse(8, 9, 5, 2.4, 0xe8c080); for (const x of [5, 8, 11]) pb.set(x, 8, 0xc8323c); },
  soup(pb) { pb.ellipse(8, 10, 6.5, 3.8, 0xe8dcc0); pb.ellipse(8, 9, 5.2, 2.2, 0x8a6aa8); pb.set(6, 9, 0xc596e8); pb.set(7, 4, 0xd0d0d0); pb.set(10, 3, 0xd0d0d0); },
  pie(pb) { pb.ellipse(8, 10, 6.5, 3.8, 0xc89a5a); pb.ellipse(8, 9, 5.4, 2.6, 0x9a2a4a); for (let x = 4; x < 13; x += 2) pb.set(x, 9, 0xe8c080); },
  bandage(pb) { pb.rect(3, 5, 10, 6, 0xf4f0e6); pb.hl(3, 5, 10, 0xffffff); pb.rect(7, 6, 2, 4, 0xd8323c); pb.rect(6, 7, 4, 2, 0xd8323c); pb.hl(3, 10, 10, 0xc8c0b0); },
  elixir(pb) { pb.ellipse(8, 10, 5, 4.5, 0x2a6ad0); pb.ellipse(8, 10, 3.6, 3.2, 0x7ae0ff); pb.rect(7, 2, 3, 4, 0x9ad0e0); pb.rect(7, 1, 3, 1, 0xa8784a); pb.set(6, 8, 0xffffff); },
  flag(pb) { pb.vl(3, 1, 14, WOOD[3]); pb.rect(4, 2, 10, 7, 0x141418); pb.rect(7, 3, 4, 3, 0xf0ece0); pb.set(8, 4, 0x141418); pb.set(10, 4, 0x141418); pb.hl(8, 6, 2, 0xf0ece0); },
  wall(pb, t = 'wood') { const C = t === 'stone' ? [0x4c4b5d, 0x666579, 0x828196, 0xa3a2b4] : [0x4f321a, 0x6d4626, 0x8c5c33, 0xab7643]; pb.rect(2, 3, 12, 4, C[3]); pb.rect(2, 7, 12, 7, C[2]); for (let x = 2; x < 14; x += 4) pb.vl(x, 7, 7, C[0]); pb.hl(2, 7, 12, C[0]); },
  palisade(pb) { for (let k = 0; k < 4; k++) { pb.rect(2 + k * 3, 4 + (k % 2), 3, 10, WOOD[3]); pb.set(3 + k * 3, 3 + (k % 2), WOOD[4]); } pb.hl(2, 9, 12, 0xc8a870); },
  door(pb) { pb.rect(3, 2, 10, 12, WOOD[1]); pb.rect(4, 3, 8, 11, WOOD[3]); pb.vl(6, 3, 11, WOOD[2]); pb.vl(9, 3, 11, WOOD[2]); pb.hl(4, 5, 8, IRON[2]); pb.hl(4, 11, 8, IRON[2]); pb.set(10, 8, GOLD[3]); },
  floor(pb) { pb.rect(2, 4, 12, 9, WOOD[4]); for (let y = 6; y < 13; y += 3) pb.hl(2, y, 12, WOOD[2]); pb.hl(2, 4, 12, WOOD[5]); },
  rug(pb) { pb.rect(2, 4, 12, 9, 0xb03232); pb.rect(4, 6, 8, 5, 0xd8a43a); pb.rect(6, 7, 4, 3, 0x8a2228); },
  torch_i(pb) { pb.rect(7, 6, 2, 9, 0xb8a35a); pb.rect(6, 4, 4, 2, 0x3a2614); pb.disc(8, 2.5, 2, 0xffb43a); pb.set(8, 2, 0xfff2b0); },
  lantern(pb) { pb.rect(5, 4, 6, 9, IRON[2]); pb.rect(6, 5, 4, 7, 0xffd36b); pb.set(6, 5, 0xfff4c0); pb.hl(4, 3, 8, IRON[3]); pb.rect(7, 1, 2, 2, IRON[3]); pb.hl(4, 13, 8, IRON[3]); },
  campfire(pb) { pb.line(3, 12, 13, 8, WOOD[2], 2); pb.line(3, 8, 13, 12, WOOD[3], 2); pb.disc(8, 6, 2.6, 0xff8a2a); pb.disc(8, 5, 1.6, 0xffd24a); pb.set(8, 2, 0xffb43a); for (const x of [2, 14]) pb.disc(x, 12, 1.4, STONE5[2]); },
  bench_i(pb) { pb.rect(1, 5, 14, 3, WOOD[4]); pb.hl(1, 5, 14, WOOD[5]); pb.rect(2, 8, 2, 6, WOOD[2]); pb.rect(12, 8, 2, 6, WOOD[2]); pb.rect(4, 3, 5, 2, IRON[4]); pb.rect(11, 2, 2, 3, WOOD[2]); },
  chest_i(pb) { pb.rect(2, 6, 12, 8, WOOD[3]); pb.rect(2, 3, 12, 4, WOOD[4]); pb.hl(2, 3, 12, WOOD[5]); pb.vl(5, 3, 11, IRON[2]); pb.vl(10, 3, 11, IRON[2]); pb.rect(7, 7, 2, 2, GOLD[3]); },
  bed(pb) { pb.rect(2, 2, 12, 12, WOOD[2]); pb.rect(3, 3, 10, 3, 0xf4f0e6); pb.rect(3, 7, 10, 6, 0xb03232); pb.hl(3, 7, 10, 0xd44e46); },
  cannon_i(pb) { pb.rect(3, 9, 9, 3, WOOD[3]); pb.disc(5, 12, 2, WOOD[1]); pb.disc(11, 12, 2, WOOD[1]); pb.line(2, 7, 14, 4, IRON[2], 3.4); pb.disc(2.5, 7, 2.2, IRON[3]); },
  planter(pb) { pb.rect(2, 8, 12, 6, WOOD[3]); pb.hl(2, 8, 12, WOOD[4]); for (const x of [4, 8, 12]) { pb.disc(x, 6, 2, 0x3c8743); pb.set(x, 5, 0xd6323c); } },
  crate_i(pb) { pb.rect(2, 3, 12, 11, WOOD[3]); pb.rect(2, 3, 12, 2, WOOD[4]); pb.line(3, 13, 13, 5, WOOD[2], 1.4); pb.rect(2, 3, 2, 11, WOOD[1]); pb.rect(12, 3, 2, 11, WOOD[1]); },
  boat_i(pb) {
    for (let x = 1; x < 15; x++) { const t = (x - 1) / 13, bot = 9 + Math.round(Math.sin(t * Math.PI) * 4), top = x > 12 ? 7 : 8; for (let y = top; y <= bot; y++) pb.set(x, y, y === top ? WOOD[5] : y === top + 1 ? WOOD[4] : y === bot ? WOOD[1] : WOOD[3]); }
    pb.hl(2, 10, 11, WOOD[2]); pb.line(4, 2, 10, 13, WOOD[4]); pb.rect(9, 12, 2, 3, WOOD[5]); pb.hl(1, 15, 14, 0x3a86c0);
  },
  sloop_i(pb) {
    for (let x = 1; x < 15; x++) { const t = (x - 1) / 13, bot = 11 + Math.round(Math.sin(t * Math.PI) * 3), top = x > 12 ? 9 : 10; for (let y = top; y <= bot; y++) pb.set(x, y, y === top ? 0xd8b07a : y === bot ? 0x141c2e : 0x2a3a5a); }
    pb.vl(8, 1, 9, WOOD[2]);
    for (let y = 2; y < 9; y++) for (let x = 3; x < 8; x++) if (x >= 8 - (y - 1) * 0.8) pb.set(x, y, y < 4 ? 0xf7f0dc : 0xe8dec0);
    for (let y = 3; y < 9; y++) for (let x = 9; x < 9 + (y - 2) * 0.7; x++) pb.set(x, y, 0xd2c6a2);
    pb.rect(9, 0, 3, 2, 0x141418); pb.hl(1, 15, 14, 0x3a86c0);
  },
  crystal(pb) {
    const R = [0x16204e, 0x2a4aa8, 0x5a8ae0, 0xa8d8ff, 0xeaf8ff];
    const sh = (x, y, h, w) => { for (let j = 0; j < h; j++) { const half = Math.max(0, Math.floor(w * Math.min(1, (1 - j / h) * 3))); for (let i = -half; i <= half; i++) pb.set(x + i, y - j, i < 0 ? R[3] : i === 0 ? R[4] : R[1]); } };
    sh(5, 14, 8, 1); sh(11, 14, 7, 1); sh(8, 15, 13, 2);
  },
  crystalneck(pb) {
    for (let x = 2; x < 14; x++) pb.set(x, 3 + Math.round(Math.abs(x - 7.5) * -0.6 + 4), 0x6a4a2a);
    pb.rect(7, 8, 2, 1, IRON[3]);
    const R = [0x16204e, 0x2a4aa8, 0x5a8ae0, 0xa8d8ff, 0xeaf8ff];
    for (let j = 0; j < 6; j++) { const half = j < 4 ? 1 : 0; for (let i = -half; i <= half; i++) pb.set(8 + i, 10 + j - (j > 4 ? 0 : 0), i < 0 ? R[3] : i === 0 ? R[4] : R[1]); }
    pb.set(8, 15, R[2]);
  },
  // compétences
  // ---- 0.6 : meubles, animaux, butin de cambriolage, Kraken
  f_table(pb) { pb.ellipse(8, 6, 7, 3, WOOD[3]); pb.ellipse(8, 5.4, 6, 2.2, WOOD[5]); pb.rect(3, 8, 2, 6, WOOD[1]); pb.rect(11, 8, 2, 6, WOOD[1]); pb.rect(7, 2, 2, 3, 0xeee6d0); pb.set(7, 1, 0xffd24a); },
  f_chair(pb) { pb.rect(4, 2, 2, 8, WOOD[3]); pb.hl(4, 3, 2, WOOD[5]); pb.rect(4, 8, 8, 2, WOOD[4]); pb.hl(4, 8, 8, WOOD[5]); pb.vl(5, 10, 4, WOOD[2]); pb.vl(11, 10, 4, WOOD[2]); pb.rect(4, 5, 2, 1, WOOD[1]); },
  f_shelf(pb) { pb.rect(2, 1, 12, 14, WOOD[1]); pb.rect(3, 2, 10, 12, 0x1c110a); for (const y of [5, 9, 13]) pb.hl(2, y, 12, WOOD[4]); for (const [x, y, c] of [[4, 3, 0x2a6a3a], [7, 3, 0x7a2a2a], [10, 2, 0x2e4a8a], [4, 6, 0x8a6a2a], [8, 7, 0x5a2a6a], [11, 6, 0x3a7a7a], [5, 10, 0x7a2a2a], [9, 11, 0x2a6a3a]]) pb.rect(x, y, 2, y % 4 === 3 ? 2 : 3, c); },
  f_wardrobe(pb) { pb.rect(2, 2, 12, 12, WOOD[2]); pb.rect(1, 1, 14, 2, WOOD[4]); pb.hl(1, 1, 14, WOOD[5]); pb.rect(3, 4, 4, 9, WOOD[3]); pb.rect(9, 4, 4, 9, WOOD[3]); pb.vl(3, 4, 9, WOOD[5]); pb.vl(9, 4, 9, WOOD[5]); pb.set(7, 8, GOLD[3]); pb.set(8, 8, GOLD[3]); pb.rect(2, 14, 2, 1, WOOD[0]); pb.rect(12, 14, 2, 1, WOOD[0]); },
  f_fireplace(pb) { for (let y = 3; y < 15; y++) for (let x = 2; x < 14; x++) pb.set(x, y, (y % 3 === 0 || (x + (y > 8 ? 2 : 0)) % 5 === 0) ? STONE5[1] : STONE5[3]); pb.rect(1, 2, 14, 2, WOOD[4]); pb.hl(1, 2, 14, WOOD[5]); pb.rect(5, 8, 6, 7, 0x140a08); pb.rect(6, 11, 4, 3, 0xff8a2a); pb.rect(7, 10, 2, 2, 0xffd24a); pb.set(7, 9, 0xfff2b0); },
  f_plant(pb) { for (const [x1, y1] of [[2, 4], [5, 1], [8, 0], [11, 1], [14, 4]]) pb.line(8, 9, x1, y1, 0x357a39, 1.6); for (const [x1, y1] of [[3, 3], [8, 1], [13, 3]]) pb.line(8, 8, x1, y1, 0x7cc25a); pb.rect(5, 10, 6, 5, 0xa0502a); pb.hl(4, 10, 8, 0xc8703a); pb.hl(5, 14, 6, 0x6a3018); },
  f_painting(pb, t) { const F = t === 'gold' ? GOLD : [WOOD[1], WOOD[2], WOOD[3], WOOD[4], WOOD[5]]; pb.rect(1, 2, 14, 11, F[2]); pb.hl(1, 2, 14, F[4]); pb.hl(1, 12, 14, F[0]); pb.vl(1, 2, 11, F[3]); for (let y = 4; y < 11; y++) for (let x = 3; x < 13; x++) pb.set(x, y, t === 'gold' ? (y < 7 ? mix(0xffb84a, 0xf06a3a, (y - 4) / 3) : mix(0x2a5a9a, 0x14305e, (y - 7) / 4)) : (y < 7 ? 0x8aa0c0 : ((x + y) % 3 ? 0x2a6a9a : 0x4a8ab0))); if (t === 'gold') pb.disc(8, 6.5, 1.6, 0xfff8d0); else { pb.rect(6, 7, 4, 1, 0x4a2c14); pb.vl(8, 4, 3, 0x2a1a0e); pb.rect(6, 4, 2, 3, 0xf4ecd8); } },
  f_masterpiece(pb) { P.f_painting(pb, 'gold'); pb.set(1, 2, 0xfff6c8); pb.set(14, 2, 0xfff6c8); pb.set(1, 12, 0xfff6c8); pb.set(14, 12, 0xfff6c8); },
  f_rug(pb) { for (let y = 3; y < 13; y++) for (let x = 1; x < 15; x++) { const b = Math.min(x - 1, 14 - x, y - 3, 12 - y); const d = Math.abs(x - 7.5) / 5 + Math.abs(y - 7.5) / 3.4; pb.set(x, y, b === 0 ? 0x5a1418 : b === 1 ? 0xd8a43a : d < 0.5 ? 0xf2c14a : d < 0.8 ? 0x2a3a6a : 0x8a2228); } for (let y = 4; y < 12; y += 2) { pb.set(0, y, 0xe8dcc0); pb.set(15, y, 0xe8dcc0); } },
  f_books(pb) { pb.rect(1, 1, 14, 14, WOOD[1]); pb.rect(2, 2, 12, 12, 0x1c110a); for (const y of [5, 9, 13]) pb.hl(1, y, 14, WOOD[4]); let k = 0; for (const y of [2, 6, 10]) for (let x = 2; x < 14; x += 2) { const c = [0x7a2a2a, 0x2a4a7a, 0x3a6a3a, 0x8a6a2a, 0x5a3a6a, 0x9a8a6a][(k++ * 5 + y) % 6]; pb.rect(x, y, 2, 3, c); pb.set(x, y, shade(c, 1.5)); } },
  f_trophy(pb) { pb.rect(4, 12, 8, 3, WOOD[2]); pb.hl(3, 11, 10, WOOD[4]); for (let y = 2; y < 11; y++) for (let x = 4; x < 12; x++) pb.set(x, y, x === 4 ? 0xa8e8d8 : x === 11 ? 0x2a6a5a : mix(0x3a8a78, 0x1a4a40, (y - 2) / 9)); pb.rect(5, 1, 6, 1, IRON[4]); pb.disc(8, 6.5, 3, 0xf0e8c8); pb.disc(8, 6.5, 1.8, 0xffc02a); pb.vl(8, 5, 3, 0x100610); pb.set(6, 5, 0xffffff); },
  f_lock(pb) { for (let a = Math.PI; a < Math.PI * 2; a += 0.08) { pb.set(8 + Math.cos(a) * 3.6, 6.5 + Math.sin(a) * 4, IRON[5]); pb.set(8 + Math.cos(a) * 2.6, 6.5 + Math.sin(a) * 3, IRON[3]); } pb.vl(4, 6, 2, IRON[5]); pb.vl(11, 6, 2, IRON[4]); pb.rect(3, 8, 10, 7, GOLD[2]); pb.hl(3, 8, 10, GOLD[4]); pb.vl(3, 8, 7, GOLD[3]); pb.hl(3, 14, 10, GOLD[0]); pb.disc(8, 11, 1.2, 0x2a1a0a); pb.vl(8, 11, 3, 0x2a1a0a); for (const [x, y] of [[4, 9], [11, 9], [4, 13], [11, 13]]) pb.set(x, y, IRON[5]); },
  p_cat(pb) { const C = [0x8a8478, 0xc4bdae, 0xe8e2d6, 0xfaf6ee]; pb.blob(8, 10, 4.5, 4, [C[0], C[1], C[2], C[3], C[3]], {}); pb.disc(8, 5.5, 3.4, C[2]); pb.rect(4, 1, 2, 3, C[2]); pb.rect(10, 1, 2, 3, C[2]); pb.set(5, 2, 0xffb0b0); pb.set(10, 2, 0xffb0b0); pb.set(6, 5, 0x2a6a3a); pb.set(10, 5, 0x2a6a3a); pb.set(8, 7, 0xff9a9a); pb.line(12, 12, 14, 8, C[1]); },
  p_dog(pb) { const B = [0x4a2c14, 0x7a4a22, 0xa86a32, 0xc88a4a]; pb.blob(8, 10.5, 4.5, 3.6, [B[0], B[1], B[2], B[3], B[3]], {}); pb.disc(8, 5.5, 3.6, B[2]); pb.rect(3, 3, 2, 5, B[0]); pb.rect(11, 3, 2, 5, B[0]); pb.ellipse(8, 7, 2, 1.5, 0xf0e0c0); pb.set(8, 6, 0x1a1014); pb.set(6, 4, 0x1a1014); pb.set(10, 4, 0x1a1014); pb.hl(5, 9, 6, 0xc82a2a); pb.set(8, 10, GOLD[3]); },
  p_parrot(pb) { const G = [0x1a4a22, 0x2a7a32, 0x4aaa3e, 0x8ad85a]; pb.blob(7, 9, 3.6, 4.6, [G[0], G[1], G[2], G[3], G[3]], {}); pb.disc(8, 4, 2.8, G[2]); pb.set(8, 3, 0x141014); pb.rect(10, 4, 2, 2, 0xf2c14a); pb.set(11, 6, 0xd49a2a); pb.line(5, 12, 3, 15, 0xd83a32); pb.line(6, 12, 5, 15, 0x2a5aa8); pb.vl(4, 7, 5, G[1]); },
  p_monkey(pb) { const B = [0x3a2414, 0x5a3820, 0x7a4f2c, 0x9c683a], S = 0xe8c49a; pb.blob(8, 11, 3.6, 3.6, [B[0], B[1], B[2], B[3], B[3]], {}); pb.disc(8, 6, 3.6, B[2]); pb.ellipse(8, 7, 2.6, 2.2, S); pb.rect(3, 5, 2, 2, B[1]); pb.rect(11, 5, 2, 2, B[1]); pb.set(7, 6, 0x1a1014); pb.set(9, 6, 0x1a1014); pb.set(8, 8, 0x8a5a3a); pb.rect(6, 1, 4, 2, 0xb03232); pb.set(10, 1, GOLD[3]); pb.line(12, 12, 14, 9, B[1]); pb.set(14, 8, B[1]); },
  p_kraken(pb) { const R = [0x6c204a, 0x93345e, 0xc85a82, 0xf08aa8, 0xffc0d0]; pb.blob(8, 6.5, 5.2, 5, R, {}); for (const [x, d] of [[3, 0], [5, 1], [8, 0], [10, 1], [12, 0]]) { pb.vl(x, 11, 2 + d, R[1]); pb.set(x + (x < 8 ? -1 : 1), 13 + d, R[2]); } for (const ex of [6, 10]) { pb.rect(ex - 1, 6, 2, 2, 0xffe14a); pb.set(ex, 7, 0x100610); } pb.set(5, 3, R[4]); },
  lockpick(pb) { pb.line(2, 13, 12, 3, IRON[5]); pb.line(3, 14, 13, 4, IRON[3]); pb.set(13, 2, IRON[5]); pb.set(14, 3, IRON[5]); pb.set(14, 2, IRON[4]); pb.line(4, 9, 11, 2, IRON[4]); pb.set(11, 1, IRON[5]); pb.disc(2.5, 13.5, 1.8, GOLD[2]); pb.set(2, 13, GOLD[4]); },
  r_watch(pb) { pb.disc(8, 9, 5.4, GOLD[2]); pb.disc(8, 9, 4.2, 0xf8f4e6); pb.rect(7, 2, 2, 2, GOLD[3]); pb.disc(8, 2, 1.4, GOLD[1]); pb.vl(8, 6, 3, 0x1a1014); pb.hl(8, 9, 3, 0x1a1014); pb.set(4, 6, GOLD[4]); pb.set(5, 5, GOLD[4]); for (const [x, y] of [[8, 5], [12, 9], [8, 13], [4, 9]]) pb.set(x, y, 0x8a6a2a); },
  r_ring(pb) { for (let a = 0; a < 6.3; a += 0.06) { pb.set(8 + Math.cos(a) * 5, 9.5 + Math.sin(a) * 4.5, GOLD[3]); pb.set(8 + Math.cos(a) * 4, 9.5 + Math.sin(a) * 3.5, GOLD[1]); } pb.rect(6, 2, 5, 4, GOLD[2]); pb.hl(6, 2, 5, GOLD[4]); pb.rect(7, 3, 3, 2, 0x1c284e); pb.set(8, 3, 0x9fd8ff); },
  r_pearls(pb) { for (let k = 0; k < 11; k++) { const a = Math.PI * (0.05 + k * 0.09), x = 8 + Math.cos(a) * 6, y = 3 + Math.sin(a) * 9; pb.disc(x, y, 1.5, 0x2a2434); pb.set(x - 0.5, y - 0.5, 0xa8a0c8); } pb.disc(8, 13, 2, 0x1a1620); pb.set(7, 12, 0xd8d0f0); },
  r_casket(pb) { pb.rect(2, 7, 12, 7, 0x6a2030); pb.hl(2, 7, 12, 0x9a3448); pb.rect(2, 4, 12, 3, 0x7a2838); pb.hl(2, 4, 12, 0xb84a5e); pb.rect(2, 9, 12, 1, GOLD[2]); pb.rect(7, 8, 2, 3, GOLD[3]); for (const [x, y, c] of [[4, 3, 0x9fd8ff], [7, 2, 0xff6a84], [10, 3, 0x7aff8a], [12, 2, GOLD[4]], [5, 2, GOLD[3]]]) pb.set(x, y, c); pb.hl(2, 13, 12, 0x3a0c18); },
  r_moons(pb) { pb.line(3, 1, 8, 5, IRON[4]); pb.line(13, 1, 8, 5, IRON[4]); pb.disc(8, 10, 5.2, IRON[2]); pb.disc(8, 10, 4.2, 0x16204e); for (const [cx, l] of [[6.2, 1], [9.8, 0]]) for (let y = 6; y < 14; y++) for (let x = 3; x < 13; x++) { const d1 = Math.hypot(x + 0.5 - cx, y + 0.5 - 10), d2 = Math.hypot(x + 0.5 - (cx + (l ? 1.5 : -1.5)), y + 0.5 - 10); if (d1 <= 2.7 && d2 > 2.3) pb.set(x, y, l ? 0xeef0f8 : 0x9fd8ff); } },
  ink(pb) { pb.rect(5, 5, 6, 9, 0x1a1a2a); pb.vl(5, 6, 7, 0x4a4a6a); pb.rect(6, 3, 4, 2, 0x3a3a52); pb.rect(6, 1, 4, 2, 0xa0703f); pb.hl(6, 1, 4, 0xc8945a); pb.rect(6, 9, 4, 4, 0x0a0812); pb.set(7, 10, 0x5a3a8a); pb.set(12, 12, 0x0a0812); pb.set(13, 14, 0x0a0812); },
  conch(pb) { const S = [0x8a4a5a, 0xc87a8a, 0xf0b0b0, 0xffe0d8, 0xfff6f0]; pb.blob(8.5, 9, 6, 4.6, S, {}); pb.blob(4.5, 6, 3.2, 3, S, {}); pb.set(2, 4, S[3]); pb.set(1, 3, S[4]); for (let k = 0; k < 4; k++) pb.line(5 + k * 2.4, 6 + k * 0.4, 6 + k * 2.4, 12, S[1]); pb.ellipse(11.5, 10.5, 2.6, 1.8, 0x5a2434); pb.ellipse(11.5, 10, 1.6, 1, 0xff9ab0); },
  kraken_eye(pb) { pb.disc(8, 8, 6.4, 0xd8c8a0); pb.blob(8, 8, 6, 6, [0xb8a078, 0xd8c8a0, 0xf0e8c8, 0xfffbe6, 0xffffff], {}); pb.disc(8, 8, 3.8, 0xffc02a); pb.disc(8, 8, 2.8, 0xffe070); pb.rect(7, 4, 2, 8, 0x100610); pb.set(5, 5, 0xffffff); pb.set(6, 5, 0xffffff); for (const [x, y] of [[3, 10], [12, 11], [10, 3]]) pb.set(x, y, 0xc84a5a); },
  tentacle_food(pb) { const R = [0x6a2a1e, 0x9a4a2a, 0xc87a3a, 0xe8a858, 0xf8d090]; for (let k = 0; k <= 20; k++) { const u = k / 20, x = 2.5 + u * 10 + Math.sin(u * 5) * 1.6, y = 12.5 - u * 9 - Math.sin(u * 3) * 1.2; pb.disc(x, y, 2.6 - u * 1.6, k % 4 === 0 ? R[1] : R[2]); } for (let k = 2; k <= 18; k += 4) { const u = k / 20, x = 2.5 + u * 10 + Math.sin(u * 5) * 1.6, y = 12.5 - u * 9 - Math.sin(u * 3) * 1.2; pb.set(x - 1, y + 1, R[4]); } pb.set(12, 1, 0xd8d8d8); pb.set(13, 0, 0xb8b8b8); pb.set(10, 0, 0xd8d8d8); },
  sk_slash(pb) {
    for (let a = -1.9; a < 0.4; a += 0.04) { const r = 6.5; pb.set(8 + Math.cos(a) * r, 9 + Math.sin(a) * r, 0xffffff); pb.set(8 + Math.cos(a) * (r - 1), 9 + Math.sin(a) * (r - 1), 0xbfe8ff); }
    P.saber(pb, 'steel');
  },
  sk_shot(pb) {
    P.pistol(pb, 'steel');
    for (const [x, y] of [[15, 5], [14, 3], [15, 7], [13, 5]]) pb.set(x, y, 0xffe14a);
    pb.set(15, 2, 0xff8a2a); pb.set(15, 8, 0xff8a2a);
  },
  sk_whirl(pb) {
    for (let a = 0; a < 6.28; a += 0.05) { const r = 6 + Math.sin(a * 2) * 0.5; if ((a > 0.4 && a < 2.6) || a > 3.5) pb.set(8 + Math.cos(a) * r, 8 + Math.sin(a) * r, a % 1.2 < 0.6 ? 0xffffff : 0x9fd8ff); }
    pb.set(13, 4, 0xffffff); pb.set(12, 3, 0xffffff); pb.set(3, 12, 0xffffff); pb.set(4, 13, 0xffffff);
    pb.line(5, 11, 11, 5, BLADES.steel[3], 1.4); pb.set(5, 11, GOLD[3]);
  },
  sk_rum(pb) { P.rum(pb); pb.rect(11, 2, 1, 5, 0x6aff7a); pb.rect(9, 4, 5, 1, 0x6aff7a); },
  sk_bomb(pb) {
    pb.blob(7, 9.5, 5.5, 5.5, [0x100c14, 0x1e1824, 0x2c2434, 0x403648, 0x5a5062], {});
    pb.rect(6, 3, 3, 2, IRON[3]); pb.line(8, 3, 11, 1, 0xc8a070);
    pb.set(12, 0, 0xffe14a); pb.set(13, 1, 0xff8a2a); pb.set(11, 0, 0xffffff); pb.set(13, 0, 0xffd04a); pb.set(5, 7, 0x8a8aa0);
  },
  sk_cry(pb) {
    pb.line(2, 9, 8, 6, GOLD[2], 2.6); pb.line(2, 10, 8, 12, GOLD[1], 2.6); pb.rect(1, 8, 2, 3, GOLD[3]);
    for (const r of [3, 5, 7]) for (let a = -0.8; a <= 0.8; a += 0.12) pb.set(8 + Math.cos(a) * r, 9 + Math.sin(a) * r, r === 5 ? 0xffe14a : 0xffffff);
  },
  sk_roll(pb) {
    // la botte du pirate qui file, trois traits de vitesse derrière elle
    const rows = [
      '................',
      '.......ccccc....',
      '.......cLLLc....',
      '.......dBBBd....',
      '.......dBHBd....',
      '.......dBBBd....',
      '.......dGGGd....',
      '.......dBHBd....',
      '.......dBBBBd...',
      '.......dBBHBBdd.',
      '.......dBBBBBBBd',
      '.......dBBBBBBBd',
      '.......sssssssss',
      '.......ss...ssss',
    ];
    const pal = { c: 0xb88a52, L: 0xe0b878, d: 0x4a2c14, B: 0x7a4a26, H: 0x9c6838, G: 0xf2c14a, s: 0x1c120a };
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch] !== undefined) pb.set(x, y + 1, pal[ch]); }));
    pb.set(9, 7, 0xffe58a);
    pb.hl(2, 4, 4, 0xffffff); pb.hl(0, 7, 6, 0xffffff); pb.hl(2, 10, 4, 0xffffff); pb.hl(1, 13, 5, 0xbfe8ff);
    pb.set(1, 4, 0x9fd8ff); pb.set(1, 10, 0x9fd8ff);
  },
  sk_fists(pb) { pb.blob(8, 8, 5, 4.5, [0xa8664e, 0xd38f72, 0xf0bd9a, 0xffdcc2, 0xffeedd], {}); for (const x of [5, 7, 9, 11]) pb.vl(x, 5, 3, 0xa8664e); },
};

const cache = new Map();
export function iconCanvas(icon, tint, scale = 1) {
  const key = icon + '|' + (tint || '') + '|' + scale;
  let c = cache.get(key);
  if (c) return c;
  const pb = new PB(16, 16);
  const fn = P[icon] || P.map;
  if (icon && icon.startsWith('w:')) drawWeaponIcon(pb, ITEMS[icon.slice(2)] && ITEMS[icon.slice(2)].form);
  else if (icon === 'tricorne_big') P.tricorne(pb, true);
  else if (icon === 'shirt_striped') P.shirt(pb, 'white', true);
  else if (icon === 'vest') P.shirt(pb, 'white', false, true);
  else if (icon === 'captaincoat') P.coat(pb, tint || 'navy', true);
  else if (icon === 'map' && tint === 'gold') { P.map(pb); pb.rect(2, 3, 12, 1, 0xd49a2a); pb.rect(2, 12, 12, 1, 0xd49a2a); }
  else fn(pb, tint);
  pb.outline('auto');
  c = pb.toCanvas(scale);
  cache.set(key, c);
  return c;
}
// icône d'interface : 32x32 (pixels nets à 2x) avec une petite ombre portée dessinée
export function iconURL(icon, tint) {
  const key = 'url|' + icon + '|' + (tint || '');
  let u = cache.get(key);
  if (!u) {
    const src = iconCanvas(icon, tint, 2);
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d');
    x.drawImage(src, 2, 2);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgba(12, 6, 4, 0.42)'; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-over'; x.drawImage(src, 0, 0);
    u = c.toDataURL(); cache.set(key, u);
  }
  return u;
}
