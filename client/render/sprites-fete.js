// Lot 6 : les décors de la Nuit des Mille Voiles — dessinés par le code, comme tout le jeu (aucune image externe).
// L'estrade, les stands à auvent rayé, la tente de la Lice, l'arche de la jetée, les mâts à fanions, les lampions,
// les canons du concours, les bouées de la course et les mâts d'épaves. Tous ne se montrent que pendant une édition.
import { PB, mix } from './pixel.js';
import { mk, WOOD, IRON, GOLD } from './sprites-env.js';

const CLOTH = [ // les toiles du festival (auvents, tentes, lampions)
  [0x8a1c22, 0xc0302e, 0xe8564a, 0xf6efe0], // rouge
  [0x1c3a76, 0x2e5aa8, 0x5a8ad6, 0xf6efe0], // bleu
  [0x2a6a3a, 0x3e9a4e, 0xf2c94a, 0xfff2c0], // vert et jaune
  [0x4a1e6a, 0x7a34a0, 0xb070d6, 0xf6efe0], // violet
];
const LAMP = [[0xd2402a, 0xff8a4a, 'red'], [0xe8a020, 0xffd860, 'warm'], [0x2e9a5a, 0x8ae0a0, 'green'], [0x8a3ab8, 0xd09aff, 'purple']];

function estrade() { // l'estrade de la plage : on peut y monter (elle se dessine au sol)
  const W = 116, H = 54, pb = new PB(W, H);
  for (let y = 4; y < 40; y++) for (let x = 2; x < W - 2; x++) { const row = Math.floor((y - 4) / 6), v = (y - 4) % 6, seg = Math.floor((x + row * 13) / 22); pb.set(x, y, v === 5 ? WOOD[1] : v === 0 ? WOOD[4] : (seg + row) % 3 ? WOOD[3] : WOOD[2]); }
  pb.hl(2, 4, W - 4, GOLD[2]); pb.hl(2, 5, W - 4, WOOD[5]);
  for (let x = 2; x < W - 2; x++) { const k = (x % 12) / 12, d = Math.round(Math.sin(k * Math.PI) * 4); for (let y = 40; y < 46 + d; y++) pb.set(x, y, y > 44 + d ? 0x6a1418 : (x % 12 < 2 ? 0x9a2226 : 0xc0302e)); pb.set(x, 40, GOLD[3]); } // le jupon de velours rouge, festonné
  for (const x of [4, W - 6]) { pb.rect(x, 2, 3, 46, WOOD[1]); pb.vl(x, 2, 46, WOOD[3]); }
  for (let x = 10; x < W - 8; x += 14) { pb.disc(x, 41, 1.6, 0xfff2b0); pb.set(x, 40, 0xffffff); } // les petites lumières du bord de scène
  pb.outline('auto');
  return mk(pb, W / 2, 46, { lights: [[10, 40], [38, 40], [66, 40], [94, 40]] });
}
function stand(v) { // un stand à auvent rayé
  const C = CLOTH[v % 4], W = 40, H = 46, pb = new PB(W, H);
  pb.rect(4, 22, 32, 20, WOOD[2]); pb.hl(4, 22, 32, WOOD[4]); pb.rect(4, 40, 32, 2, WOOD[0]);
  for (let x = 6; x < 34; x += 6) pb.vl(x, 24, 16, WOOD[1]);
  pb.rect(3, 20, 34, 3, WOOD[4]); // le comptoir
  for (const x of [4, 34]) { pb.rect(x, 6, 2, 16, WOOD[1]); }
  for (let y = 2; y < 12; y++) for (let x = 1; x < W - 1; x++) { const stripe = Math.floor((x + (y < 8 ? 0 : 0)) / 5) % 2; pb.set(x, y, y === 2 ? C[0] : stripe ? C[1] : C[3]); }
  for (let x = 1; x < W - 1; x++) { const k = (x % 5) / 5, d = Math.round(Math.sin(k * Math.PI) * 2); for (let y = 12; y < 13 + d; y++) pb.set(x, y, Math.floor(x / 5) % 2 ? C[1] : C[3]); }
  const goods = [[0xf2c14a, 0xd29a2a], [0xe8564a, 0xa8302a], [0x8ad06a, 0x4a8a3a], [0xb070d6, 0x7a34a0]];
  for (let k = 0; k < 4; k++) { const g = goods[(k + v) % 4]; pb.disc(9 + k * 7, 18, 2.2, g[0]); pb.set(9 + k * 7, 17, mix(g[0], 0xffffff, 0.5)); pb.set(10 + k * 7, 19, g[1]); }
  pb.disc(20, 4, 1.4, 0xfff2b0); // une lanterne sous l'auvent
  pb.outline('auto');
  return mk(pb, W / 2, 42, { glow: [[20, 10]], glowCol: 'warm', glowR: 40 });
}
function tenteLice() { // la tente rayée de la Lice des Capitaines
  const W = 68, H = 60, pb = new PB(W, H), C = CLOTH[0];
  for (let y = 8; y < 52; y++) { const half = 6 + (y - 8) * 0.68; for (let x = Math.round(34 - half); x < Math.round(34 + half); x++) { const s = Math.floor((x - 34 + 40) / 6) % 2; pb.set(x, y, s ? C[1] : C[3]); } }
  for (let y = 8; y < 52; y++) { const half = 6 + (y - 8) * 0.68; pb.set(Math.round(34 - half), y, C[0]); pb.set(Math.round(34 + half) - 1, y, C[0]); }
  for (let x = 4; x < W - 4; x++) pb.set(x, 51, C[0]);
  for (let y = 30; y < 52; y++) { const w = Math.round((y - 30) * 0.45); for (let x = 34 - w; x <= 34 + w; x++) pb.set(x, y, 0x1a0e10); } // l'entrée
  pb.vl(34, 0, 9, WOOD[1]); for (let k = 0; k < 4; k++) pb.hl(35, 1 + k, 7 - k, 0xf2c14a); // le fanion au sommet
  pb.outline('auto');
  return mk(pb, 34, 54);
}
function arche() { // l'arche des Mille Voiles, à l'entrée de la jetée
  const W = 76, H = 70, pb = new PB(W, H);
  for (const x of [4, W - 10]) { pb.rect(x, 18, 6, 50, WOOD[2]); pb.vl(x, 18, 50, WOOD[4]); pb.vl(x + 5, 18, 50, WOOD[0]); pb.rect(x - 1, 64, 8, 4, WOOD[1]); }
  for (let x = 4; x < W - 4; x++) { const k = (x - 4) / (W - 8), top = 14 - Math.round(Math.sin(k * Math.PI) * 10); for (let y = top; y < top + 6; y++) pb.set(x, y, y === top ? GOLD[3] : y === top + 5 ? WOOD[0] : WOOD[3]); }
  for (let x = 12; x < W - 12; x++) { const k = (x - 12) / (W - 24), y0 = 20 - Math.round(Math.sin(k * Math.PI) * 8); for (let y = y0; y < y0 + 7; y++) pb.set(x, y, y === y0 || y === y0 + 6 ? GOLD[2] : 0x1c3a76); } // la banderole bleue, bordée d'or
  for (let x = 16; x < W - 16; x += 6) { const k = (x - 12) / (W - 24), y0 = 20 - Math.round(Math.sin(k * Math.PI) * 8); pb.set(x, y0 + 3, 0xf6efe0); pb.set(x + 1, y0 + 3, 0xf6efe0); pb.set(x, y0 + 2, 0xf6efe0); } // de petites voiles brodées
  const lamps = [];
  for (let k = 0; k <= 6; k++) { const x = 6 + k * 10.7, t = (x - 4) / (W - 8), y = 14 - Math.round(Math.sin(t * Math.PI) * 10) + 6; const L = LAMP[k % 4]; pb.ellipse(Math.round(x), y + 3, 2, 3, L[0]); pb.set(Math.round(x), y + 2, L[1]); lamps.push([Math.round(x), y + 3]); }
  pb.outline('auto');
  return mk(pb, W / 2, 66, { lights: lamps.filter((_, i) => i % 2 === 0) });
}
function matFete(v) { // un mât à fanions (les guirlandes se tendent de mât en mât)
  const pb = new PB(10, 46);
  pb.rect(4, 4, 2, 40, WOOD[2]); pb.vl(4, 4, 40, WOOD[4]); pb.disc(5, 3, 2, GOLD[3]); pb.rect(2, 43, 6, 2, WOOD[1]);
  const C = CLOTH[v % 4]; for (let k = 0; k < 4; k++) pb.hl(6, 6 + k, 4 - k, C[1]);
  pb.outline('auto');
  return mk(pb, 5, 44);
}
function lampion(v) { // un lampion de papier sur sa perche
  const L = LAMP[v % 4], pb = new PB(12, 30);
  pb.rect(5, 10, 2, 19, WOOD[1]); pb.rect(3, 28, 6, 2, WOOD[0]);
  pb.ellipse(6, 7, 4.5, 5.5, L[0]); pb.ellipse(5, 6, 2.5, 3.5, L[1]); for (const y of [3, 7, 11]) pb.hl(2, y, 8, mix(L[0], 0x000000, 0.25));
  pb.rect(4, 0, 4, 2, GOLD[2]); pb.set(6, 13, GOLD[3]);
  pb.outline('auto');
  return mk(pb, 6, 28, { glow: [[6, 7]], glowCol: L[2], glowR: 42 });
}
function canonFete(v) { // un canon du concours : affût de bois, ruban de fête
  const pb = new PB(22, 22);
  pb.rect(4, 10, 14, 6, WOOD[2]); pb.hl(4, 10, 14, WOOD[4]);
  for (const x of [6, 15]) { pb.disc(x, 16, 3.2, WOOD[1]); pb.disc(x, 16, 1.2, IRON[3]); }
  pb.rect(8, 3, 6, 11, IRON[1]); pb.rect(9, 3, 4, 11, IRON[2]); pb.hl(9, 3, 4, IRON[4]); pb.rect(8, 13, 6, 2, IRON[0]);
  const C = CLOTH[v % 4]; pb.hl(7, 8, 8, C[1]); pb.set(15, 9, C[1]); pb.set(16, 10, C[2]);
  pb.outline('auto');
  return mk(pb, 11, 18);
}
function bouee(v) { // une bouée de la course : flotteur, fanion, lanterne
  const pb = new PB(20, 30);
  const col = [[0xc0302e, 0xf6efe0], [0xf2c14a, 0x2a2a2a], [0x3e9a4e, 0xf6efe0], [0xf6efe0, 0x141414], [0x2a2238, 0x5a4a7a]][v % 5];
  pb.ellipse(10, 24, 8, 4, col[0]); pb.ellipse(10, 23, 6, 2.6, mix(col[0], 0xffffff, 0.25)); pb.hl(3, 24, 14, col[1]);
  pb.rect(9, 6, 2, 18, IRON[2]);
  if (v === 3) { for (let y = 2; y < 9; y++) for (let x = 11; x < 18; x++) pb.set(x, y, ((x >> 1) + (y >> 1)) % 2 ? 0xf6efe0 : 0x141414); } // le damier de la ligne
  else for (let k = 0; k < 5; k++) pb.hl(11, 2 + k, 6 - k, col[0]);
  pb.disc(10, 6, 1.6, v === 4 ? 0x9a7ad8 : 0xfff2b0);
  pb.outline('auto');
  return mk(pb, 10, 26, { glow: [[10, 6]], glowCol: v === 4 ? 'purple' : 'warm', glowR: v === 4 ? 24 : 34 });
}
function matEpave(v) { // un mât d'épave qui sort de l'eau, une voile en lambeaux
  const pb = new PB(26, 40);
  pb.line(10 + v * 2, 39, 13, 2, WOOD[1], 2); pb.line(4, 12, 22, 9, WOOD[1], 1.4);
  for (let y = 12; y < 24; y++) for (let x = 6; x < 20; x++) if ((x * 7 + y * 3 + v) % 5 > 1 && y < 22 - (x % 4)) pb.set(x, y, mix(0xc8bc98, 0x5a5040, (y - 12) / 16));
  pb.outline('auto');
  return mk(pb, 13, 38);
}
export function extendFete(env) {
  const many = (fn, n) => Array.from({ length: n }, (_, v) => fn(v));
  env.estrade = [estrade()]; env.stand_fete = many(stand, 4); env.tente_lice = [tenteLice()]; env.arche_fete = [arche()];
  env.mat_fete = many(matFete, 3); env.lampion = many(lampion, 4); env.canon_fete = many(canonFete, 3); env.bouee = many(bouee, 5); env.mat_epave = many(matEpave, 2);
}
