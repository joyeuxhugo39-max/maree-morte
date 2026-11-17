// 0.8 : icônes des nouveaux objets (montures, bateaux, voyages, potions, talismans)
import { registerIcons } from './sprites-items.js';
import { shade, mix } from './pixel.js';

const WOOD = [0x34200f, 0x4f321a, 0x6d4626, 0x8c5c33, 0xab7643, 0xc79357];
const FLASK = { red: [0x6a1010, 0xb02a24, 0xe85a4a], yellow: [0x7a5a10, 0xc8a02a, 0xf2d85a], grey: [0x2a2c36, 0x5a5e6e, 0x9aa0b4], green: [0x1a4a14, 0x3a8a2a, 0x8ad04a], blue: [0x14305a, 0x2a5aa8, 0x6aa0ea] };
registerIcons({
  raft_i(pb) {
    for (let k = 0; k < 4; k++) { const y = 7 + k * 2; pb.hl(2, y, 12, WOOD[3 - (k % 2)]); pb.hl(2, y + 1, 12, WOOD[1]); }
    for (const x of [4, 11]) pb.vl(x, 6, 9, 0xc8b078);
    pb.vl(8, 1, 7, WOOD[1]); pb.rect(9, 1, 3, 2, 0xd03a3a);
  },
  schooner_i(pb) {
    pb.ellipse(8, 12, 7, 2.6, 0x1a4a52); pb.ellipse(8, 11, 6, 1.8, 0x9a7048);
    for (const x of [5, 10]) pb.vl(x, 1, 10, WOOD[1]);
    for (let y = 2; y <= 9; y++) { const w = Math.round((y - 1) * 0.55); pb.hl(5 - w, y, w, 0xe8dec0); pb.hl(10 - w, y, w, 0xd2c6a2); }
    pb.set(10, 0, 0x141418); pb.set(11, 0, 0x141418);
  },
  galleon_i(pb) {
    pb.ellipse(8, 12, 7.5, 3, 0x5a1418); pb.ellipse(8, 11, 6.5, 2, 0x7a4a2a); pb.hl(2, 10, 12, 0xf2c14a);
    for (const x of [3, 8, 13]) { pb.vl(x, 1, 10, WOOD[1]); pb.rect(x - 2, 3, 5, 5, x === 8 ? 0xf7f0dc : 0xe8dec0); pb.hl(x - 2, 3, 5, 0xd2c6a2); }
    pb.set(8, 0, 0x141418); pb.set(9, 0, 0x141418);
  },
  spyglass(pb) {
    for (let x = 1; x <= 14; x++) { const r = x < 6 ? 1 : x < 10 ? 1.5 : 2; for (let y = Math.round(9 - x * 0.45 - r); y <= Math.round(9 - x * 0.45 + r); y++) pb.set(x, y, x === 5 || x === 9 ? 0xf2c14a : x < 6 ? 0x6e4626 : 0x9a6a3a); }
    pb.set(14, 2, 0xbfefff); pb.set(14, 3, 0x8ac0ec); pb.set(1, 9, 0x2a1a0c);
  },
  smokebomb(pb) {
    pb.disc(7, 10, 4.6, 0x1c1820); pb.disc(6, 9, 2.6, 0x3c3444); pb.set(5, 8, 0x6a6474);
    pb.vl(10, 3, 4, 0xc8b078); pb.set(11, 2, 0xffb042); pb.set(12, 1, 0xffe48a);
    for (const [x, y] of [[12, 4], [13, 3], [14, 5]]) pb.set(x, y, 0x9a9092);
  },
  biscuit(pb) {
    pb.rect(3, 4, 10, 9, 0xc8a06a); pb.hl(3, 4, 10, 0xe0c08a); pb.hl(3, 12, 10, 0x8a6a3a); pb.vl(12, 4, 9, 0xa07a46);
    for (const [x, y] of [[5, 6], [9, 6], [7, 9], [5, 10], [10, 10]]) pb.set(x, y, 0x6a4a24);
  },
  flask(pb, t = 'red') {
    const C = FLASK[t] || FLASK.red;
    pb.rect(7, 1, 3, 3, 0x8a6a4a); pb.hl(7, 1, 3, 0xb0906a);
    pb.vl(7, 4, 2, 0xd8e8f0); pb.vl(9, 4, 2, 0xd8e8f0);
    pb.disc(8, 10, 4.8, 0xd8e8f0); pb.disc(8, 10.5, 3.8, C[1]); pb.ellipse(8, 9, 3.4, 1.2, C[2]); pb.set(6, 8, 0xffffff); pb.set(9, 12, C[0]);
  },
  clover(pb) {
    const G = [0x7a4a12, 0xa86e1c, 0xd49a2a, 0xf2c14a, 0xffe58a];
    for (const [x, y] of [[5, 5], [10, 5], [5, 10], [10, 10]]) { pb.disc(x, y, 2.6, G[2]); pb.set(x - 1, y - 1, G[4]); }
    pb.disc(7.5, 7.5, 1.6, G[3]); pb.line(9, 10, 13, 15, G[1]);
  },
  conch_pink(pb) {
    const S = [0x8a3a6a, 0xc86aa0, 0xf0a8d0, 0xffd8ec, 0xfff4fa];
    pb.blob(8.5, 9, 6, 4.6, S, {}); pb.blob(4.5, 6, 3.2, 3, S, {}); pb.set(2, 4, S[3]); pb.set(1, 3, S[4]);
    for (let k = 0; k < 4; k++) pb.set(6 + k * 2, 8 + (k % 2), S[1]);
  },
});
