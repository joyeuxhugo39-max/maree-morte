// 0.7 : décors du Grand Large — gibets, coraux, obélisques, fumerolles, tentes,
// cellules de la Geôle, mannequins de la couturière, cages, ruines, totems, le Fort des Deux Clés.
import { PB, mix, shade } from './pixel.js';
import { mk, STONE, WOOD, IRON, GOLD, BONE } from './sprites-env.js';

function gibet(v) {
  const pb = new PB(22, 44);
  pb.rect(4, 4, 3, 39, WOOD[2]); pb.vl(4, 4, 39, WOOD[3]); pb.vl(6, 4, 39, WOOD[1]);
  pb.rect(4, 3, 16, 3, WOOD[3]); pb.hl(4, 3, 16, WOOD[4]); pb.hl(4, 5, 16, WOOD[1]);
  pb.line(7, 12, 13, 6, WOOD[2], 1.5);
  pb.rect(1, 41, 9, 3, WOOD[1]); pb.hl(1, 41, 9, WOOD[2]);
  const R = 0xb8a070, RD = 0x7a6440;
  pb.vl(17, 6, v ? 14 : 9, R); pb.vl(18, 6, v ? 14 : 9, RD);
  const ny = v ? 20 : 15;
  for (let a = 0; a < 6.28; a += 0.4) pb.set(17.5 + Math.cos(a) * 2.2, ny + 2 + Math.sin(a) * 2.6, a < 3.1 ? R : RD);
  if (v) { pb.set(16, 26, 0x5a4a3a); pb.set(19, 27, 0x5a4a3a); }
  pb.outline('auto');
  return mk(pb, 5, 43);
}
function corail(v) {
  const pb = new PB(16, 18);
  const C = [[0x7a1830, 0xc23a5a, 0xff6a84, 0xffb0c0], [0x8a3a10, 0xd8661e, 0xffa040, 0xffd090], [0x4a1a6a, 0x7a3aa8, 0xb06ae0, 0xe0b0ff]][v % 3];
  const branch = (x0, y0, a, len, w) => {
    let x = x0, y = y0;
    for (let k = 0; k < len; k++) { x += Math.cos(a) * 1; y += Math.sin(a) * 1; a += (Math.sin(k * 1.7 + v) * 0.25); pb.disc(x, y, w * (1 - k / len * 0.5), C[k > len * 0.7 ? 2 : 1]); }
    pb.set(x, y, C[3]);
    return [x, y];
  };
  branch(8, 17, -1.57, 13, 1.4); branch(8, 12, -2.4, 7, 1); branch(8, 10, -0.8, 7, 1); branch(6, 15, -2.0, 6, 0.9); branch(10, 14, -1.1, 6, 0.9);
  pb.ellipse(8, 16.5, 5, 1.6, mix(C[0], 0xe8d8b0, 0.4));
  pb.outline('auto');
  return mk(pb, 8, 17);
}
function obelisque() {
  const pb = new PB(14, 40);
  for (let y = 4; y < 38; y++) { const w = 3 + Math.round((y - 4) / 34 * 3); for (let x = 7 - w; x <= 6 + w; x++) pb.set(x, y, x < 7 - w + 2 ? 0x3a3446 : x > 6 + w - 2 ? 0x16121c : 0x26202e); }
  for (let y = 0; y < 5; y++) for (let x = 7 - y; x <= 6 + y; x++) pb.set(x, y, y === 0 ? 0x4a4458 : 0x2e2838);
  for (const y of [9, 15, 21, 27, 33]) { pb.set(6, y, 0x6aff9a); pb.set(7, y + 1, 0x3ad86a); pb.set(5, y + 2, 0x3ad86a); }
  pb.rect(1, 37, 12, 3, 0x1c1822); pb.hl(1, 37, 12, 0x3a3446);
  pb.outline('auto');
  return mk(pb, 7, 39, { glow: [[7, 20]], glowR: 30, glowCol: 'green' });
}
function fumerolle(v) {
  const pb = new PB(16, 10);
  pb.ellipse(8, 6, 7, 3.4, 0x1c1418); pb.ellipse(8, 6, 5, 2.2, 0x3a1a10);
  pb.ellipse(8, 6, 3, 1.2, v === 1 ? 0xffd860 : 0xe0501a);
  for (const [x, y] of [[2, 4], [13, 7], [5, 8], [12, 3]]) pb.set(x, y, 0x504649);
  pb.outline('auto');
  return mk(pb, 8, 7, { smoke: { x: 8, y: 5 } });
}
function tente(v) {
  const pb = new PB(30, 24);
  const T = v ? [0x5a4a32, 0x7a6644, 0x9a845a, 0xbaa272] : [0x5a2a1a, 0x8a4028, 0xb05a36, 0xd07a4a];
  for (let y = 2; y < 22; y++) { const hw = Math.round((y - 2) / 20 * 14); for (let x = 15 - hw; x <= 14 + hw; x++) pb.set(x, y, T[x < 15 - hw + 3 ? 3 : x > 14 + hw - 3 ? 0 : (x + y) % 9 === 0 ? 1 : 2]); }
  for (let y = 10; y < 22; y++) { const hw = Math.round((y - 10) / 12 * 4); for (let x = 15 - hw; x <= 14 + hw; x++) pb.set(x, y, 0x1a100a); }
  pb.vl(14, 0, 3, WOOD[2]); pb.set(14, 0, WOOD[4]);
  pb.line(1, 22, 4, 16, 0x8a7a5a); pb.line(28, 22, 25, 16, 0x8a7a5a);
  pb.outline('auto');
  return mk(pb, 15, 22);
}
function barreaux(v) {
  const pb = new PB(16, 30);
  if (v === 0) { // barreaux verticaux, vus de face
    pb.rect(0, 0, 16, 2, IRON[2]); pb.hl(0, 0, 16, IRON[4]); pb.rect(0, 26, 16, 2, IRON[1]);
    for (let x = 1; x < 16; x += 3) { pb.vl(x, 2, 24, IRON[3]); pb.vl(x + 1, 2, 24, IRON[1]); }
  } else { // muret de cellule
    pb.rect(0, 18, 16, 10, IRON[1]); pb.hl(0, 18, 16, IRON[3]);
    for (let x = 1; x < 16; x += 3) { pb.vl(x, 4, 14, IRON[3]); pb.vl(x + 1, 4, 14, IRON[1]); }
    pb.rect(0, 3, 16, 2, IRON[2]); pb.hl(0, 3, 16, IRON[4]);
  }
  pb.outline('auto');
  return mk(pb, 8, 28);
}
function mannequin(v) {
  const pb = new PB(16, 32);
  pb.vl(7, 20, 9, WOOD[2]); pb.vl(8, 20, 9, WOOD[1]); pb.rect(3, 29, 10, 2, WOOD[2]); pb.hl(3, 29, 10, WOOD[3]);
  const C = [[0x521216, 0x821f26, 0xb03232, 0xd44e46], [0x121a34, 0x1c284e, 0x2a3c70, 0x405696], [0x2a183a, 0x422656, 0x5e387a, 0x7a509a]][v % 3];
  for (let y = 6; y < 21; y++) { const hw = y < 10 ? 5 : y < 15 ? 4 : 5 + ((y - 15) >> 1); for (let x = 8 - hw; x < 8 + hw; x++) pb.set(x, y, C[x < 8 - hw + 2 ? 3 : x > 8 + hw - 3 ? 0 : 2]); }
  for (let y = 7; y < 14; y++) { pb.set(7, y, 0xf0e8d8); pb.set(8, y, 0xd8d0c0); }
  for (const y of [9, 12, 15]) pb.set(9, y, GOLD[3]);
  pb.disc(7.5, 3.5, 2.8, 0xc8b898); pb.set(6, 2, 0xe8dcc0);
  pb.outline('auto');
  return mk(pb, 8, 31);
}
function lavarock(v) {
  const pb = new PB(18, 14);
  const R = [0x141014, 0x241c20, 0x342a2c, 0x463a3c, 0x5a4c4c];
  pb.blob(9, 8, 8 - v, 5.5, R, { noise: 0.4 });
  if (v !== 1) pb.blob(5, 9, 4, 3.4, R, { noise: 0.3 });
  pb.line(6, 7, 11, 10, 0xe0501a); pb.line(9, 5, 8, 9, 0xff9a2a); pb.set(8, 8, 0xffd860);
  pb.outline('auto');
  return mk(pb, 9, 12);
}
function cage(v) {
  const pb = new PB(18, 34);
  if (v === 0) { pb.line(9, 0, 9, 6, IRON[2]); } else { pb.rect(1, 30, 16, 3, STONE[2]); pb.hl(1, 30, 16, STONE[4]); }
  const top = v === 0 ? 6 : 8, bot = v === 0 ? 28 : 30;
  for (let x = 2; x <= 16; x += 2) pb.vl(x, top + 2, bot - top - 2, x % 4 === 0 ? IRON[3] : IRON[2]);
  pb.ellipse(9, top + 2, 7.5, 2.4, IRON[2]); pb.hl(2, bot - 1, 15, IRON[1]); pb.hl(2, top + 9, 15, IRON[2]);
  if (v === 0) { pb.disc(9, 22, 2.4, BONE[3]); pb.set(8, 22, 0x141014); pb.set(10, 22, 0x141014); pb.line(7, 26, 11, 26, BONE[2]); }
  pb.outline('auto');
  return mk(pb, 9, bot + 2);
}
function ruine(v) {
  const pb = new PB(36, 30);
  for (let y = 6; y < 28; y++) for (let x = 0; x < 36; x++) {
    const h = v ? 6 + Math.abs(Math.sin(x * 0.4)) * 10 + (x > 20 ? 6 : 0) : 6 + Math.abs(Math.cos(x * 0.3)) * 12;
    if (y < h) continue;
    const row = Math.floor(y / 4), off = row % 2 ? 3 : 0;
    pb.set(x, y, (y % 4 === 3 || (x + off) % 7 === 0) ? STONE[1] : STONE[x < 3 ? 4 : 2 + ((x * 3 + y) % 5 === 0 ? 1 : 0)]);
  }
  if (!v) { pb.rect(10, 16, 6, 12, 0x14101a); pb.rect(22, 15, 5, 5, 0x14101a); } else { pb.rect(6, 18, 5, 10, 0x14101a); }
  for (const [x, y] of [[3, 27], [12, 27], [30, 27], [20, 26]]) pb.disc(x, y, 1.4, STONE[2]);
  pb.outline('auto');
  return mk(pb, 18, 28);
}
function totem(v) {
  const pb = new PB(12, 34);
  pb.vl(5, 6, 27, WOOD[2]); pb.vl(6, 6, 27, WOOD[1]);
  if (v === 0) {
    for (const y of [4, 13]) { pb.disc(6, y + 3, 3.4, BONE[3]); pb.set(5, y + 3, 0x141014); pb.set(7, y + 3, 0x141014); pb.hl(4, y + 6, 4, BONE[1]); }
  } else {
    pb.disc(6, 6, 4, BONE[3]); pb.rect(4, 5, 2, 2, 0x141014); pb.rect(7, 5, 2, 2, 0x141014); pb.set(5, 5, 0xff4a3a); pb.set(8, 5, 0xff4a3a);
    pb.line(1, 2, 3, 4, BONE[2]); pb.line(11, 2, 9, 4, BONE[2]);
  }
  pb.line(2, 20, 10, 20, 0x8a2a2a); pb.set(2, 21, 0x8a2a2a); pb.set(10, 21, 0x8a2a2a);
  pb.rect(3, 32, 6, 2, WOOD[1]);
  pb.outline('auto');
  return mk(pb, 6, 33);
}
function fort() {
  const pb = new PB(72, 64);
  for (const x0 of [0, 54]) { // tours
    for (let y = 8; y < 64; y++) for (let x = x0; x < x0 + 18; x++) pb.set(x, y, (y % 5 === 4 || (x + (Math.floor(y / 5) % 2 ? 3 : 0)) % 6 === 0) ? STONE[1] : STONE[x === x0 ? 4 : x === x0 + 17 ? 1 : 3]);
    for (let x = x0; x < x0 + 18; x += 4) pb.rect(x, 4, 3, 4, STONE[3]);
    pb.rect(x0 + 6, 20, 5, 8, 0x14101a);
  }
  for (let y = 18; y < 64; y++) for (let x = 18; x < 54; x++) pb.set(x, y, (y % 5 === 4 || (x + (Math.floor(y / 5) % 2 ? 3 : 0)) % 6 === 0) ? STONE[1] : STONE[2]);
  for (let x = 18; x < 54; x += 5) pb.rect(x, 14, 3, 4, STONE[3]);
  for (let y = 34; y < 64; y++) for (let x = 27; x < 45; x++) { const top = 34 + Math.round(Math.pow(Math.abs(x - 35.5) / 9, 2) * 6); if (y >= top) pb.set(x, y, y === top ? STONE[4] : 0x2a1a10); }
  for (let y = 40; y < 64; y += 3) pb.hl(28, y, 16, 0x4a2e1a);
  for (const x of [31, 40]) { pb.disc(x, 50, 2.2, GOLD[2]); pb.set(x, 49, GOLD[4]); pb.vl(x, 52, 3, GOLD[1]); } // deux serrures, deux clés
  for (const x0 of [20, 46]) { pb.vl(x0, 20, 14, WOOD[1]); for (let y = 21; y < 31; y++) for (let x = x0 + 1; x < x0 + 7; x++) pb.set(x, y, (x + y) % 3 ? 0x8a1a1a : 0x6a1414); pb.disc(x0 + 4, 25, 1.4, 0xf0e8d8); }
  pb.outline('auto');
  return mk(pb, 36, 62);
}
function dalleCle(v) {
  const pb = new PB(16, 16);
  for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) pb.set(x, y, x === 1 || y === 1 ? STONE[4] : x === 14 || y === 14 ? STONE[1] : ((x * 5 + y * 11) % 13 === 0 ? STONE[2] : STONE[3]));
  const K = v ? [0x6a4a10, 0xd49a2a, 0xffe58a] : [0x3a3a46, 0x8a8a9c, 0xd8d8e8];
  pb.disc(5, 7, 2.6, K[1]); pb.disc(5, 7, 1.2, STONE[1]); pb.hl(7, 7, 6, K[1]); pb.vl(11, 8, 3, K[1]); pb.vl(9, 8, 2, K[1]); pb.set(5, 5, K[2]);
  return mk(pb, 8, 14);
}

export function extend07(env) {
  const many = (fn, n) => Array.from({ length: n }, (_, v) => fn(v));
  env.gibet = many(gibet, 2); env.corail = many(corail, 3); env.obelisque = [obelisque()]; env.fumerolle = many(fumerolle, 3);
  env.tente = many(tente, 2); env.barreaux = many(barreaux, 2); env.mannequin = many(mannequin, 3); env.lavarock = many(lavarock, 3);
  env.cage = many(cage, 2); env.ruine = many(ruine, 2); env.totem = many(totem, 2); env.fort = [fort()];
  env.dalle = [env.dalle[0], env.dalle[1], dalleCle(0), dalleCle(1)];
}
