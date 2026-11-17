// 0.8 : icônes des nouveaux objets (montures, bateaux, voyages, potions, talismans)
import { registerIcons } from './sprites-items.js';
import { shade, mix } from './pixel.js';

const WOOD = [0x34200f, 0x4f321a, 0x6d4626, 0x8c5c33, 0xab7643, 0xc79357];
const FLASK = { red: [0x6a1010, 0xb02a24, 0xe85a4a], yellow: [0x7a5a10, 0xc8a02a, 0xf2d85a], grey: [0x2a2c36, 0x5a5e6e, 0x9aa0b4], green: [0x1a4a14, 0x3a8a2a, 0x8ad04a], blue: [0x14305a, 0x2a5aa8, 0x6aa0ea] };
registerIcons({
  // 0.8.1 : icônes du menu (fini les émojis)
  ui_journal(pb) { // le journal de bord, son signet et la plume
    pb.rect(2, 3, 11, 11, 0x5a2e14); pb.rect(3, 3, 9, 10, 0xf0e0b8); pb.vl(7, 3, 10, 0xc8b48a);
    for (const y of [5, 7, 9, 11]) { pb.hl(4, y, 2, 0x8a6a4a); pb.hl(9, y, 2, 0x8a6a4a); }
    pb.vl(10, 12, 3, 0xc8342e); pb.set(10, 15, 0x8a1c16);
    pb.line(15, 0, 9, 8, 0xfaf6ee); pb.line(14, 0, 9, 7, 0xd8d0c0); pb.set(9, 9, 0x2a1a10); pb.set(15, 1, 0xd8d0c0);
  },
  ui_house(pb) {
    for (let y = 2; y < 8; y++) pb.hl(8 - (y - 1), y, (y - 1) * 2 + 1, y < 4 ? 0xe25d55 : 0xb03232);
    pb.hl(1, 8, 14, 0x821f26);
    pb.rect(3, 9, 10, 6, 0xe2cba0); pb.vl(3, 9, 6, 0xf4e4c0); pb.vl(12, 9, 6, 0xb89e72);
    pb.rect(7, 11, 3, 4, 0x6d4626); pb.set(9, 13, 0xf2c14a); pb.rect(4, 10, 2, 2, 0x5a86cc); pb.rect(11, 2, 2, 4, 0x6a6a74);
  },
  ui_helm(pb) { // la barre à roue du capitaine
    const W = [0x4f321a, 0x8c5c33, 0xc79357];
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; pb.line(8 + Math.cos(a) * 2, 8 + Math.sin(a) * 2, 8 + Math.cos(a) * 7.4, 8 + Math.sin(a) * 7.4, W[1]); pb.set(Math.round(8 + Math.cos(a) * 7.4), Math.round(8 + Math.sin(a) * 7.4), W[2]); }
    for (let a = 0; a < 6.3; a += 0.12) { pb.set(8 + Math.cos(a) * 5, 8 + Math.sin(a) * 5, a < 3.4 ? W[2] : W[1]); pb.set(8 + Math.cos(a) * 4.4, 8 + Math.sin(a) * 4.4, W[0]); }
    pb.disc(8, 8, 1.8, 0xd49a2a); pb.set(7, 7, 0xffe58a);
  },
  ui_help(pb) { // un message dans une bouteille
    pb.rect(6, 1, 4, 2, 0x8a6a4a); pb.rect(6, 3, 4, 2, 0x6aa86a);
    pb.ellipse(8, 10, 5, 5.4, 0x4a8a5a); pb.ellipse(8, 10, 4, 4.4, 0x7ac08a); pb.rect(6, 7, 4, 7, 0xf0e0b8); pb.hl(6, 9, 4, 0xc8b48a); pb.hl(6, 12, 4, 0xc8b48a);
    pb.set(5, 7, 0xd8f8e0); pb.set(5, 8, 0xd8f8e0); pb.set(10, 14, 0x2a5a3a);
  },
  ui_bell(pb, t) { // la cloche du bord (et, coupée, le silence)
    const B = [0x7a4a12, 0xa86e1c, 0xd49a2a, 0xf2c14a, 0xffe58a];
    pb.rect(7, 1, 2, 2, B[1]);
    for (let y = 3; y < 12; y++) { const w = 2 + Math.round((y - 3) * 0.55); for (let x = 8 - w; x < 8 + w; x++) pb.set(x, y, x < 8 - w + 2 ? B[4] : x > 8 + w - 3 ? B[1] : B[2 + ((x + y) % 5 === 0 ? 1 : 0)]); }
    pb.hl(2, 12, 12, B[1]); pb.hl(3, 11, 10, B[3]); pb.disc(8, 13.5, 1.4, 0x3a3a46);
    if (t === 'off') { pb.line(1, 1, 14, 14, 0xc8342e, 2); }
  },
  // 1.0 : mobilier de collection et de sécurité
  f_trap(pb) { pb.ellipse(8, 10, 7, 3.4, 0x403f4e); pb.ellipse(8, 10, 5, 2, 0x2c2b36); for (let x = 2; x < 15; x += 2) { pb.set(x, 6, 0xa2a1b2); pb.set(x, 13, 0x7c7b8f); } pb.rect(6, 9, 4, 2, 0x5a596b); },
  f_musicbox(pb) { pb.rect(2, 8, 12, 6, 0x8c5c33); pb.hl(2, 8, 12, 0xc79357); pb.rect(2, 3, 12, 4, 0x6d4626); pb.rect(4, 4, 8, 2, 0x9c2530); pb.rect(4, 9, 8, 3, 0xd49a2a); pb.set(13, 2, 0xfff6c8); pb.set(14, 1, 0xffffff); },
  f_shipbottle(pb) { pb.ellipse(7, 9, 6, 4, 0xbfe0ea); pb.rect(12, 7, 3, 4, 0x8a6a4a); pb.hl(3, 11, 8, 0x6d4626); pb.vl(7, 5, 6, 0x4f321a); pb.rect(5, 6, 2, 3, 0xf3f0e2); pb.rect(8, 6, 2, 3, 0xf3f0e2); pb.rect(2, 13, 11, 2, 0x8c5c33); },
  f_globe(pb) { pb.disc(8, 7, 5.5, 0x2a6aa8); pb.disc(6, 6, 2, 0x5a9a4a); pb.disc(10, 9, 1.6, 0x5a9a4a); pb.vl(8, 12, 3, 0x6d4626); pb.rect(5, 14, 6, 2, 0x4f321a); pb.set(5, 4, 0xd8f0ff); },
  f_chandelier(pb) { pb.vl(8, 6, 8, 0xd49a2a); pb.hl(2, 7, 13, 0xd49a2a); for (const x of [2, 8, 14]) { pb.rect(x - 1, 3, 2, 4, 0xf3f0e2); pb.set(x - 1, 1, 0xffd24a); pb.set(x - 1, 2, 0xff8a2a); } pb.rect(5, 14, 6, 2, 0xa86e1c); },
  f_statuette(pb) { pb.rect(4, 12, 8, 3, 0x828196); pb.ellipse(8, 8, 3.4, 4.5, 0xd49a2a); pb.disc(8, 3, 2.4, 0xf2c14a); pb.set(7, 3, 0x5a1a10); pb.set(9, 3, 0x5a1a10); pb.set(6, 7, 0xffe58a); },
  f_portrait(pb) { pb.rect(2, 1, 12, 14, 0xd49a2a); pb.rect(3, 2, 10, 12, 0x3a2a3a); pb.disc(8, 7, 2.6, 0xd8a070); pb.rect(5, 3, 6, 2, 0x141418); pb.rect(5, 10, 6, 4, 0x8e1a26); },
  f_mapframe(pb) { pb.rect(2, 2, 12, 12, 0x8c5c33); pb.rect(3, 3, 10, 10, 0xe8d4a0); pb.disc(6, 7, 2, 0x6a9a4a); pb.disc(10, 10, 1.6, 0x6a9a4a); pb.line(5, 5, 11, 11, 0xa01c14); },
  f_battle(pb) { pb.rect(1, 2, 14, 12, 0xd49a2a); for (let y = 3; y < 13; y++) for (let x = 2; x < 14; x++) pb.set(x, y, y < 8 ? 0x9a8070 : 0x2a4a6a); pb.rect(3, 7, 3, 2, 0x3a2414); pb.rect(9, 8, 3, 2, 0x3a2414); pb.disc(8, 6, 1.2, 0xffa030); },
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
  // émotes (touches 2 à 5)
  em_danse(pb) { // deux notes de musique
    const G = [0xa86e1c, 0xd49a2a, 0xf2c14a, 0xffe58a];
    for (const [x, y] of [[3, 10], [9, 8]]) { pb.ellipse(x + 1, y + 2, 2, 1.6, G[2]); pb.set(x, y + 1, G[3]); pb.vl(x + 3, y - 6, 8, G[1]); }
    pb.line(6, 4, 12, 2, G[2], 2); pb.set(13, 13, 0xff93b8); pb.set(1, 4, 0x9fd8ff); pb.set(14, 6, 0xffffff);
  },
  em_salut(pb) { // une main ouverte qui salue
    const S = [0xa8704a, 0xd8a070, 0xf2c8a0, 0xffe4c8];
    pb.rect(5, 6, 6, 6, S[2]); pb.vl(10, 6, 6, S[1]); pb.hl(5, 11, 6, S[1]);
    for (const [x, h] of [[5, 4], [7, 5], [9, 4]]) { pb.vl(x, 6 - h, h, S[2]); pb.vl(x + 1, 6 - h, h, S[1]); pb.set(x, 6 - h, S[3]); }
    pb.line(11, 8, 13, 5, S[2], 2); pb.rect(6, 12, 4, 3, S[1]);
    for (const [x, y] of [[2, 3], [1, 6], [14, 2]]) pb.set(x, y, 0xffffff);
  },
  em_doigt(pb) { // le poing, et le doigt du milieu levé
    const S = [0xa8704a, 0xd8a070, 0xf2c8a0, 0xffe4c8];
    pb.rect(4, 7, 8, 6, S[2]); pb.hl(4, 7, 8, S[3]); pb.vl(11, 7, 6, S[1]); pb.hl(4, 12, 8, S[1]);
    for (const x of [5, 9]) pb.hl(x, 8, 2, S[1]);
    pb.rect(7, 1, 2, 7, S[2]); pb.vl(8, 1, 7, S[1]); pb.set(7, 1, S[3]);
    pb.rect(5, 13, 5, 3, S[1]);
  },
  em_salto(pb) { // un bonhomme qui tourne, et sa trajectoire
    for (let a = 0; a <= 20; a++) { const t = a / 20 * Math.PI * 1.6 + 0.6; pb.set(Math.round(8 + Math.cos(t) * 6), Math.round(8 + Math.sin(t) * 6), 0x9fd8ff); }
    pb.set(13, 3, 0xffffff); pb.set(14, 4, 0x9fd8ff); pb.set(12, 4, 0x9fd8ff);
    pb.disc(8, 5, 1.6, 0xf2c8a0); pb.line(8, 7, 8, 10, 0xb03232, 2); pb.line(8, 10, 6, 13, 0x2a3c70); pb.line(8, 10, 10, 13, 0x2a3c70); pb.line(8, 8, 5, 6, 0xf2c8a0); pb.line(8, 8, 11, 6, 0xf2c8a0);
  },
  conch_pink(pb) {
    const S = [0x8a3a6a, 0xc86aa0, 0xf0a8d0, 0xffd8ec, 0xfff4fa];
    pb.blob(8.5, 9, 6, 4.6, S, {}); pb.blob(4.5, 6, 3.2, 3, S, {}); pb.set(2, 4, S[3]); pb.set(1, 3, S[4]);
    for (let k = 0; k < 4; k++) pb.set(6 + k * 2, 8 + (k % 2), S[1]);
  },
});
