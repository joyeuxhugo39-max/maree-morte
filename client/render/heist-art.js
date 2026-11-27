// 2.0 : la refonte des lieux du Plus Grand Braquage — les sols, les murs et le décor accroché aux murs.
// Tout est dessiné case par case dans les blocs du terrain (mis en cache : rien ne coûte à chaque image).
// Rien n'est tiré au hasard à l'emplacement : chaque sol, chaque mur, chaque tableau est choisi par le plan du lieu
// (shared/heist-decor.js) ; le hasard ne sert qu'au grain (le veinage d'un marbre, l'usure d'une planche).
import { valueNoise, hash2 } from '../../shared/rng.js';
import { FL } from '../../shared/heist-decor.js';
import { PB, mix, shade } from './pixel.js';
import { mk, STONE, WOOD, IRON, GOLD, BONE, LEAF } from './sprites-env.js';

const R5 = (a) => a; // (lisibilité : les rampes vont du plus sombre au plus clair)
const GOLDR = [0x5a3610, 0x8a5a1c, 0xb8862a, 0xe0b048, 0xfadc8a];
// ------------------------------------------------------------------ les sols
const PAR = R5([0x40261a, 0x5c3a24, 0x744c30, 0x8a5e3c, 0xa2744c]);
const PAR_D = R5([0x2a160c, 0x3c2214, 0x4e2e1a, 0x623c22, 0x76502e]);
const DARKP = R5([0x1e140e, 0x2e1e14, 0x3a271a, 0x4a3220, 0x5c4028]);
const WH = R5([0x3a2c20, 0x4e3c2a, 0x625034, 0x766240, 0x8c764e]);
const DECK = R5([0x3e2a18, 0x5e4226, 0x7a5834, 0x957040, 0xb08a52]);
const DECK_L = R5([0x5a4026, 0x7a5a34, 0x967242, 0xb08a52, 0xc8a466]);
const ATEL = R5([0x4e3420, 0x6a4a2c, 0x845e38, 0x9c7244, 0xb48a56]);
const OFFICE = R5([0x4a4440, 0x5e5852, 0x726b62, 0x878074, 0x9e9686]);
const WET = R5([0x1a181c, 0x252226, 0x312d33, 0x3d3840, 0x4c4650]);
const SLATE = R5([0x1c2028, 0x262c38, 0x323a4a, 0x404a5c, 0x58647a]);
const RED = R5([0x5a1a16, 0x7e2a20, 0xa03c2a, 0xbc5236, 0xd86c48]);
const OCHRE = R5([0x6a4220, 0x8e5a2a, 0xb07436, 0xc88c44, 0xdeaa5c]);
const TERR = R5([0x5a3c22, 0x76502e, 0x90643a, 0xa87a48, 0xc0925a]);
const CARPETS = {
  rouge: { b: GOLDR, f: [0x3a0a12, 0x5a1220, 0x7a1c2c, 0x962a38], m: [0x1a2a4a, 0x2a3e66, 0xd8b060, 0xf0e0b0] },
  vert: { b: GOLDR, f: [0x0e2418, 0x163622, 0x1e482c, 0x2a5c38], m: [0x5a1220, 0x8a2a32, 0xd8b060, 0xf0e0b0] },
  bleu: { b: GOLDR, f: [0x0e1a36, 0x16264a, 0x1e3460, 0x2a4474], m: [0x6a1a22, 0x9a3a32, 0xd8b060, 0xf0e8c8] },
  sombre: { b: [0x2a1a10, 0x3e2818, 0x5a3c22, 0x7a5430, 0x9a6c3e], f: [0x2a1010, 0x3a1614, 0x4a1e18, 0x5a281e], m: [0x1a1a2a, 0x2a2a3e, 0xa88a50, 0xc8aa70] },
};
// une planche (rangées de 6 px, des aboutements décalés)
function planksP(wx, wy, P, len = 40, seed = 0) {
  const row = Math.floor(wy / 6), rv = wy - row * 6, off = Math.floor(hash2(row, 7 + seed, 431) * len);
  const seg = Math.floor((wx + off) / len), sv = (wx + off) - seg * len;
  let k = 2 + (hash2(row, seg, 432 + seed) > 0.6 ? 1 : 0) - (hash2(row, seg, 433 + seed) > 0.85 ? 1 : 0);
  if (rv === 5) k = 0; else if (rv === 0) k = Math.min(4, k + 1);
  if (sv === 0) k = 0;
  if (hash2(wx >> 1, wy, 434 + seed) > 0.975) k = Math.max(0, k - 1);
  return P[k];
}
function flags(wx, wy, P, seed = 0) {
  const row = Math.floor(wy / 8), off = (row % 2) * 5, c = Math.floor((wx + off) / 10);
  const u = (wx + off) - c * 10, v = wy - row * 8, id = hash2(c, row, 441 + seed);
  let k = id < 0.3 ? 1 : id < 0.75 ? 2 : 3;
  if (u === 0 || v === 0) k = 0; else if (u === 1 || v === 1) k = Math.min(4, k + 1);
  if (hash2(wx, wy, 442 + seed) > 0.96) k = Math.max(1, k - 1);
  return P[k];
}
// le parquet à bâtons rompus : des carrés de 8 px, deux lames chacun, alternés en long et en travers
function parquet(wx, wy, P) {
  const cx = wx >> 3, cy = wy >> 3, hz = (cx + cy) & 1, a = hz ? (wy & 7) : (wx & 7), b = hz ? (wx & 7) : (wy & 7);
  const strip = a >> 2, id = hash2(cx * 2 + strip, cy, 401);
  let k = id < 0.35 ? 2 : id < 0.8 ? 3 : 1;
  if ((a & 3) === 3) k = 0; // le joint entre deux lames
  else if ((a & 3) === 0) k = Math.min(4, k + 1); // le reflet du vernis
  if (b === 7 && (a & 3) !== 3) k = Math.max(0, k - 1);
  return P[k];
}
function marbleVein(wx, wy, seed) { const n = valueNoise(wx / 7, wy / 11, seed) + valueNoise(wx / 3, wy / 4, seed + 1) * 0.25; return Math.abs(n - 0.62) < 0.022; }
// le marbre en damier du vestibule : des carreaux de 16 px, crème veiné de gris et noir veiné de blanc
function marbre(wx, wy) {
  const u = wx & 15, v = wy & 15, dark = ((wx >> 4) + (wy >> 4)) & 1;
  if (u === 0 || v === 0) return dark ? 0x1e2624 : 0x9a9284;
  const L = dark ? [0x2e3a3a, 0x3a4846, 0x465652, 0x5e706a] : [0xbfb6a4, 0xd2cab8, 0xe2dccc, 0xf2ede2]; // le noir de Belgique est ici un vert de mer
  let k = 2 - (u + v > 26 ? 1 : 0) + (u + v < 6 ? 1 : 0);
  if (marbleVein(wx, wy, dark ? 461 : 463)) k = dark ? 3 : 0;
  return L[Math.max(0, Math.min(3, k))];
}
// le marbre de la galerie : de grandes dalles crème, une cabochon de marbre noir cerclé d'or à chaque coin
function galerie(wx, wy) {
  const u = wx & 15, v = wy & 15, du = Math.min(u, 16 - u), dv = Math.min(v, 16 - v), m = du + dv;
  if (m <= 3) return m === 3 ? 0xb8862a : (marbleVein(wx, wy, 471) ? 0x4a4450 : 0x24202a);
  if (u === 0 || v === 0) return 0xa89e8c;
  const L = [0xc8bfae, 0xd8d0c0, 0xe6e0d2, 0xf4efe4];
  let k = 2 - ((u + v) > 24 ? 1 : 0);
  if (marbleVein(wx, wy, 473)) k = 0;
  return L[k];
}
function wetStone(wx, wy) {
  let c = flags(wx, wy, WET, 3);
  const n = valueNoise(wx / 11, wy / 7, 481);
  if (n > 0.66) c = mix(c, (wy + (wx >> 2)) % 7 === 0 ? 0x5a7a8a : 0x26323c, 0.55); // une flaque, et son reflet
  else if (valueNoise(wx / 5, wy / 5, 482) > 0.78) c = mix(c, 0x2a4a2a, 0.35); // la mousse dans les joints
  return c;
}
// les toitures : terre cuite (écailles), ardoise (rectangles bleutés), tuiles canal (cannelures), le faîte, l'égout
function tuileR(wx, wy) {
  const row = Math.floor(wy / 6), rv = wy - row * 6, off = row % 2 ? 4 : 0, u = (wx + off) % 8;
  let k = 3 - (rv === 5 ? 2 : rv >= 4 ? 1 : 0);
  if (u === 0 || (rv >= 3 && (u === 1 || u === 7))) k = Math.max(0, k - 2);
  if (rv === 0) k = Math.min(4, k + 1);
  if (hash2(row, Math.floor((wx + off) / 8), 491) > 0.84) k = Math.max(0, k - 1);
  return RED[k];
}
function ardoise(wx, wy) {
  const row = Math.floor(wy / 5), rv = wy - row * 5, off = row % 2 ? 5 : 0, u = (wx + off) % 10;
  let k = 2 + (hash2(row, Math.floor((wx + off) / 10), 493) > 0.7 ? 1 : 0);
  if (rv === 4) k = 0; else if (rv === 0) k = Math.min(4, k + 1);
  if (u === 0) k = Math.max(0, k - 1);
  return SLATE[k];
}
function tuileO(wx, wy) {
  const u = wx % 6, row = Math.floor(wy / 10), rv = wy - row * 10;
  let k = u === 0 ? 0 : u === 1 ? 1 : u === 2 || u === 3 ? 3 : 2;
  if (rv === 9) k = Math.max(0, k - 2); else if (rv === 0 && u > 1 && u < 5) k = 4;
  if (hash2(Math.floor(wx / 6), row, 495) > 0.86) k = Math.max(0, k - 1);
  return OCHRE[k];
}
function faite(wx, wy, P) { // le faîtage : des tuiles rondes posées en long
  const v = wy & 15, u = wx % 10;
  if (v < 3 || v > 12) return P[1];
  let k = v < 5 ? 4 : v < 8 ? 3 : v < 11 ? 2 : 1;
  if (u === 0) k = Math.max(0, k - 2);
  return P[k];
}
function deck(wx, wy, P, seed = 0) { // le pont : des bordages de 4 px, le calfatage noir, les gournables
  const row = wy >> 2, rv = wy & 3, off = Math.floor(hash2(row, 5 + seed, 451) * 56), seg = Math.floor((wx + off) / 56), sv = (wx + off) - seg * 56;
  if (rv === 3) return 0x1a120c;
  let k = 2 + (hash2(row, seg, 452 + seed) > 0.6 ? 1 : 0) - (hash2(row, seg, 453 + seed) > 0.8 ? 1 : 0);
  if (rv === 0) k = Math.min(4, k + 1);
  if (sv === 0) return 0x2a1c12;
  if ((sv === 2 || sv === 53) && rv === 1) return 0x2a1a10;
  if (hash2(wx >> 2, wy >> 1, 454 + seed) > 0.985) k = Math.max(0, k - 1);
  return P[k];
}
function carpet(room, k, tx, ty, wx, wy) {
  const C = room.carpets[k], P = CARPETS[C.p] || CARPETS.rouge;
  const lx = wx - (room.x0 + C.x0) * 16, ly = wy - (room.y0 + C.y0) * 16, W = (C.x1 - C.x0 + 1) * 16, H = (C.y1 - C.y0 + 1) * 16;
  const e = Math.min(lx, ly, W - 1 - lx, H - 1 - ly);
  if ((ly === 0 || ly === H - 1) && lx % 2 === 0 && C.fringe !== false) return 0xe8dcc0; // la frange
  if (e <= 0) return P.b[1];
  if (e <= 4) { // la bordure dorée et sa frise
    if (e === 1 || e === 4) return P.b[0];
    const t = (lx + ly) % 6;
    return t < 2 ? P.b[3] : t < 4 ? P.b[2] : P.m[0];
  }
  if (e === 5) return P.m[0];
  // le champ : un losange tous les 16 px, et un médaillon au centre si le tapis est grand
  const cx = W / 2, cy = H / 2, mx = Math.abs(lx - cx) / (W * 0.26), my = Math.abs(ly - cy) / (H * 0.3);
  if (W >= 80 && H >= 64 && W / H < 2.6 && H / W < 2.6 && mx * mx + my * my < 1) { // le médaillon (pas sur un chemin de couloir)
    const r = mx * mx + my * my;
    if (r > 0.88) return P.m[2];
    if (r > 0.78) return P.m[1];
    if (r > 0.74) return P.m[2];
    const dx = lx - cx, dy = ly - cy, rr = Math.abs(dx) / 1.6 + Math.abs(dy); // la rosace du centre, en losange
    if (rr < 3) return P.m[3];
    if (rr < 5) return P.m[2];
    if (rr < 7) return P.m[1];
    const q = (Math.abs(Math.floor(dx / 5)) + Math.abs(Math.floor(dy / 4))) % 2;
    return (Math.abs(dx) + Math.abs(dy)) % 9 === 0 ? P.m[2] : q ? P.f[3] : P.f[1];
  }
  if (W < 80 && H > W * 2.5) { const mid = Math.abs(lx - cx); if (mid < 1.5 && (ly >> 2) % 3 === 0) return P.m[2]; } // le chemin : un filet doré au milieu
  const qx = (lx - 6) % 16, qy = (ly - 6) % 16, dd = Math.abs(qx - 8) + Math.abs(qy - 8);
  if (dd === 5) return P.m[2];
  if (dd < 3) return P.m[1];
  return P.f[(Math.floor(lx / 3) + Math.floor(ly / 3)) % 3 === 0 ? 1 : 2];
}
// la case de sol (wx, wy) d'un lieu reconstruit — st : son style (shared/heist-decor.js, FL)
export function heistFloor(st, wx, wy, room, tx, ty) {
  if (st >= FL.CARPET) return carpet(room, st - FL.CARPET, tx, ty, wx, wy);
  switch (st) {
    case FL.PARQUET: return parquet(wx, wy, PAR);
    case FL.PARQUET_D: return parquet(wx, wy, PAR_D);
    case FL.MARBRE: return marbre(wx, wy);
    case FL.GALERIE: return galerie(wx, wy);
    case FL.DALLES: return flags(wx, wy, OFFICE, 1);
    case FL.SOMBRE: return planksP(wx, wy, DARKP, 36, 1);
    case FL.ENTREPOT: return planksP(wx, wy, WH, 64, 2);
    case FL.ALLEE: { const c = planksP(wx, wy, WH, 64, 2), v = wy & 15; return v === 1 || v === 14 ? mix(c, 0xd8aa3a, 0.7) : c; } // l'allée de manutention, marquée à la peinture
    case FL.HUMIDE: return wetStone(wx, wy);
    case FL.TUILE_R: return tuileR(wx, wy);
    case FL.ARDOISE: return ardoise(wx, wy);
    case FL.TUILE_O: return tuileO(wx, wy);
    case FL.FAITE_R: return faite(wx, wy, RED);
    case FL.FAITE_A: return faite(wx, wy, SLATE);
    case FL.TERRASSE: return planksP(wx, wy, TERR, 32, 3);
    case FL.PONT: return deck(wx, wy, DECK);
    case FL.GAILLARD: return deck(wx, wy, DECK_L, 1);
    case FL.PAVE: return pave(wx, wy);
    case FL.ATELIER: { const c = planksP(wx, wy, ATEL, 44, 4); return valueNoise(wx / 6, wy / 6, 498) > 0.72 && hash2(wx, wy, 499) > 0.7 ? mix(c, 0xd8c090, 0.35) : c; } // la sciure, par petits tas
    default: return 0xff00ff;
  }
}
function pave(wx, wy) { // les pavés ronds d'une ruelle, luisants de pluie
  const row = Math.floor(wy / 5), off = (row % 2) * 3, c = Math.floor((wx + off) / 6), u = (wx + off) - c * 6, v = wy - row * 5, id = hash2(c, row, 571);
  if (u === 0 || v === 4) return 0x26232a;
  let k = id < 0.3 ? 0x4a4650 : id < 0.7 ? 0x56525c : 0x625e68;
  if (v === 0 || u === 1) k = mix(k, 0x8a8694, 0.35);
  if (valueNoise(wx / 9, wy / 7, 572) > 0.7) k = mix(k, 0x2a3a4a, 0.3);
  return k;
}
// une ruelle vue d'en haut, entre deux toits : le fond sombre, quelques pavés, la lueur d'une lanterne
export function heistAlley(wx, wy) {
  const n = valueNoise(wx / 5, wy / 4, 501);
  let c = n > 0.62 ? 0x2a262c : n > 0.4 ? 0x1e1b21 : 0x16141a;
  if ((wx + (wy >> 2)) % 9 === 0) c = 0x121016;
  const g = valueNoise(wx / 40, wy / 30, 502);
  if (g > 0.7) c = mix(c, 0x6a4a28, (g - 0.7) * 1.2); // une fenêtre éclairée, en bas
  return c;
}

// ------------------------------------------------------------------ les murs : un style par partie de bâtiment
// U : le haut du mur, N : le lambris du bas, rail : la cimaise
export const WSTYLE = {
  salon: { up: 'damas', U: [0x3e0c14, 0x5a141e, 0x761e2a, 0x922c36, 0xc89a4a], N: [0x1a0e08, 0x2a180e, 0x3e2414, 0x52301a, 0x6a4022], rail: [0xe0b048, 0x8a5a1c] },
  vestibule: { up: 'pierre', U: [0x7a7062, 0x9a8e7c, 0xb2a690, 0xc8bca4, 0xdcd2bc], N: [0x3a342c, 0x4e463c, 0x645a4c, 0x7a6e5e, 0x928472], rail: [0xd8c8a8, 0x6a5e4e] },
  office: { up: 'enduit', U: [0x9a907c, 0xb8ae98, 0xcec4ae, 0xdcd4c0, 0xe8e2d2], N: [0x2a3a44, 0x3a4e5a, 0x4a6270, 0x5e7888, 0x7690a0], rail: [0x5a4a38, 0x3a2e22] },
  jeu: { up: 'damas', U: [0x0e2416, 0x163420, 0x20462c, 0x2c5a38, 0xb89848], N: [0x1a100a, 0x2a1a10, 0x3e2818, 0x523420, 0x6a442a], rail: [0xd8a840, 0x7a5018] },
  galerie: { up: 'tenture', U: [0x10162a, 0x18203a, 0x22304e, 0x2e4064, 0xa88a48], N: [0x1a1410, 0x2a2018, 0x3a2c20, 0x4c3a2a, 0x604a34], rail: [0xe0b048, 0x8a5a1c] },
  archives: { up: 'lambris', U: [0x1a100a, 0x261810, 0x342216, 0x442e1e, 0x583c28], N: [0x140c08, 0x1e140c, 0x2a1c12, 0x382618, 0x4a3220], rail: [0x8a6a3a, 0x3a2614] },
  cabinet: { up: 'lambris', U: [0x2a180e, 0x3c2416, 0x4e321e, 0x624028, 0x7a5232], N: [0x1a0e08, 0x2a180e, 0x3e2414, 0x52301a, 0x6a4022], rail: [0xe0b048, 0x8a5a1c] },
  entrepot: { up: 'planks', U: [0x2a1e14, 0x3c2c1e, 0x4e3a28, 0x604832, 0x74583e], N: [0x18100a, 0x281c12, 0x38281a, 0x483422, 0x5a422c], rail: [0x6a4a2a, 0x3a2614] },
  atelier: { up: 'planks', U: [0x3a2614, 0x50361e, 0x664628, 0x7c5632, 0x94683e], N: [0x22160c, 0x342214, 0x46301c, 0x583c24, 0x6c4a2c], rail: [0x8a6a3a, 0x4a3018] },
  cave: { up: 'pierre', U: [0x24221e, 0x33302a, 0x423e36, 0x524c42, 0x645c50], N: [0x141210, 0x1e1b18, 0x2a2622, 0x36312c, 0x443e36], rail: [0x3a362e, 0x22201c], damp: 1 },
  facade_ocre: { up: 'enduit', U: [0x8a6630, 0xb48a42, 0xd2a85a, 0xe2c07a, 0xf0d89c], N: [0x4a3a2a, 0x5e4a36, 0x725a42, 0x86684c, 0x9a7a5a], rail: [0x5a4a38, 0x3a2e22] },
  facade_rose: { up: 'enduit', U: [0x8e5a5a, 0xb87a76, 0xd49890, 0xe4b2a8, 0xf2cec4], N: [0x4a3a2a, 0x5e4a36, 0x725a42, 0x86684c, 0x9a7a5a], rail: [0x5a4a38, 0x3a2e22] },
  facade_bleue: { up: 'enduit', U: [0x4a6a80, 0x6a8aa0, 0x88a8bc, 0xa6c2d2, 0xc8dce6], N: [0x3a3a3a, 0x4e4e4e, 0x626262, 0x787878, 0x8e8e8e], rail: [0x4a4a4a, 0x2a2a2a] },
  lointain: { up: 'ciel', U: [0x0a0e1c, 0x121a2e, 0x1a2440, 0x2a3450, 0x3a4460], N: [0x0a0e1c, 0x121a2e, 0x1a2440, 0x2a3450, 0x3a4460], rail: [0x1a2440, 0x121a2e] },
  facade_brique: { up: 'briques', U: [0x4a2218, 0x6a3020, 0x8a4028, 0xa25036, 0xbc6a48], N: [0x2a2420, 0x3a322c, 0x4a4038, 0x5a4e44, 0x6c5e52], rail: [0x7a7062, 0x4a4438] },
};
// le motif d'un mur (le haut : d de 14 à 29) — d : la distance au sol en pixels
export function heistWallUp(S, wx, wy, d) {
  const U = S.U;
  switch (S.up) {
    case 'damas': { // le papier damassé : un motif de fleur en losange, décalé d'une rangée sur l'autre
      const row = Math.floor((d - 14) / 8), off = row % 2 ? 4 : 0, u = (wx + off) & 7, v = (d - 14) & 7;
      const m = Math.abs(u - 3.5) + Math.abs(v - 3.5);
      if (m < 1.6) return U[4];
      if (m < 2.6) return U[3];
      if ((wx & 15) === 0) return U[1]; // le lé
      return (u + v) % 4 === 0 ? U[1] : U[2];
    }
    case 'tenture': { // la tenture de velours : des plis verticaux, un galon doré en haut
      if (d >= 27) return d === 27 ? U[4] : U[1];
      const f = wx % 6;
      return f === 0 ? U[0] : f < 3 ? U[2] : f < 5 ? U[3] : U[1];
    }
    case 'pierre': { // l'appareil de pierre : des blocs de 12 × 6, joints creusés
      const row = Math.floor((d - 14) / 6), off = row % 2 ? 6 : 0, u = (wx + off) % 12, v = (d - 14) % 6;
      if (v === 0 || u === 0) return U[0];
      let k = 2 + (hash2(Math.floor((wx + off) / 12), row, 511) > 0.6 ? 1 : 0) - (v === 5 ? 1 : 0) + (v === 1 ? 1 : 0);
      if (S.damp && valueNoise(wx / 6, d / 4, 512) > 0.65) return mix(U[Math.max(0, Math.min(4, k))], 0x2a3a2a, 0.4);
      return U[Math.max(0, Math.min(4, k))];
    }
    case 'lambris': { // les boiseries : des panneaux à cadre, le bois sombre
      const u = wx & 15;
      if (u === 0 || u === 15 || d === 14 || d === 29) return U[0];
      if (u === 1 || d === 28) return U[3];
      if (u === 14 || d === 15) return U[1];
      return (wx >> 1) % 3 ? U[2] : U[1];
    }
    case 'ciel': return heistSky(wx, d);
    case 'enduit': { const n = valueNoise(wx / 6, d / 6, 513); return U[n < 0.3 ? 2 : n < 0.75 ? 3 : 4]; }
    case 'briques': {
      const row = Math.floor(d / 4), off = row % 2 ? 4 : 0;
      if (d % 4 === 0 || (wx + off) % 9 === 0) return U[0];
      const id = hash2(Math.floor((wx + off) / 9), row, 514);
      return U[id < 0.4 ? 2 : id < 0.8 ? 3 : 1];
    }
    default: { // planks
      const bx = Math.floor(wx / 7), uu = wx - bx * 7;
      if (uu === 0) return U[0];
      if (uu === 1) return U[3];
      return U[2 + (hash2(bx, 0, 515) > 0.6 ? 1 : 0) - (hash2(bx, 1, 516) > 0.8 ? 1 : 0)];
    }
  }
}
// le lambris du bas (d de 3 à 11) et la cimaise (12-13)
// le ciel de nuit au-dessus des toits, et la silhouette des toits plus loin (quelques fenêtres encore allumées)
export function heistSky(wx, d) {
  const h = 10 + Math.floor(valueNoise(wx / 23, 0.5, 581) * 12) + ((Math.floor(wx / 37) % 3) ? 0 : 4);
  if (d <= h) { const lit = hash2(Math.floor(wx / 5), Math.floor(d / 4), 582) > 0.93 && d > 3 && d < h - 2 && (wx % 5) > 1 && (d % 4) > 1; return lit ? 0xd8a050 : d === h ? 0x2a2c40 : 0x14161f; }
  if (hash2(wx, d, 583) > 0.992) return 0xd8e0f0; // une étoile
  return mix(0x1a2440, 0x0a0e1c, Math.min(1, (d - h) / 14));
}
export function heistWallLow(S, wx, d) {
  const N = S.N;
  if (S.up === 'ciel') return heistSky(wx, d);
  if (d >= 12) return d === 13 ? S.rail[0] : S.rail[1];
  if (S.up === 'pierre') { const u = (wx + (d > 7 ? 6 : 0)) % 12; return u === 0 || d === 7 ? N[0] : N[d > 9 ? 3 : 2]; }
  const px = wx % 16;
  if (d === 11) return N[4];
  if (d === 3) return N[1];
  return px === 0 ? N[0] : px === 1 ? N[3] : px === 15 ? N[1] : N[2];
}

// ------------------------------------------------------------------ le décor accroché aux murs
// Chaque décor est peint une fois dans une image de (n × 16) × 28 px (y = 0 en haut, d = 29) ; les pixels vides
// laissent voir le mur. v : la variante (le sujet d'un tableau, par exemple).
const cache = new Map();
const FR = GOLDR;
function frame(pb, x0, y0, w, h, ramp = FR) {
  pb.rect(x0, y0, w, h, ramp[1]); pb.hl(x0, y0, w, ramp[3]); pb.vl(x0, y0, h, ramp[3]); pb.hl(x0, y0 + h - 1, w, ramp[0]); pb.vl(x0 + w - 1, y0, h, ramp[0]);
  pb.rect(x0 + 1, y0 + 1, w - 2, h - 2, ramp[2]); pb.hl(x0 + 1, y0 + 1, w - 2, ramp[4]);
}
// les sujets des tableaux (dans un cadre intérieur de w × h)
const SUBJECT = {
  mer: (pb, x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pb.set(x + i, y + j, j < h * 0.55 ? mix(0x6a8aa8, 0xe8c890, j / (h * 0.55)) : mix(0x2a4a6a, 0x16304a, (j - h * 0.55) / (h * 0.45))); const sx = x + Math.floor(w * 0.55), sy = y + Math.floor(h * 0.55); pb.rect(sx - 3, sy - 1, 7, 2, 0x2a1a10); pb.vl(sx, sy - 6, 5, 0x2a1a10); pb.rect(sx - 2, sy - 6, 2, 4, 0xf0e8d0); pb.rect(sx + 1, sy - 5, 2, 3, 0xe8e0c8); pb.hl(x + 1, sy + 2, w - 2, 0x8aa8c0); },
  portrait: (pb, x, y, w, h) => { pb.rect(x, y, w, h, 0x2a1e2a); const cx = x + (w >> 1); pb.rect(cx - 4, y + h - 5, 9, 5, 0x6a1a2a); pb.disc(cx, y + h * 0.42, 2.6, 0xd8a880); pb.rect(cx - 3, y + 1, 7, 3, 0x1a1418); pb.set(cx - 1, y + Math.floor(h * 0.42), 0x2a1a14); pb.set(cx + 1, y + Math.floor(h * 0.42), 0x2a1a14); pb.hl(cx - 2, y + h - 5, 5, 0xf0e8d8); },
  valdorne: (pb, x, y, w, h) => { for (let j = 0; j < h; j++) pb.hl(x, y + j, w, mix(0x3a2a1e, 0x1e140e, j / h)); const cx = x + (w >> 1); pb.rect(cx - 6, y + h - 8, 13, 8, 0x9a1e26); pb.hl(cx - 6, y + h - 8, 13, 0xc83a3a); pb.rect(cx - 1, y + h - 8, 3, 8, 0xf0e8d8); pb.rect(cx - 4, y + 3, 9, 5, 0xe8e4dc); pb.disc(cx, y + h * 0.42, 3.2, 0xe0b090); pb.set(cx - 1, y + Math.floor(h * 0.42), 0x2a1a14); pb.set(cx + 1, y + Math.floor(h * 0.42), 0x2a1a14); pb.hl(cx - 1, y + Math.floor(h * 0.42) + 2, 3, 0x8a4a3a); pb.set(cx - 5, y + h - 6, 0xf2c14a); pb.set(cx + 5, y + h - 6, 0xf2c14a); },
  bataille: (pb, x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pb.set(x + i, y + j, j < h * 0.5 ? mix(0x8a7a6a, 0xc8a080, j / (h * 0.5)) : 0x24405a); for (const [fx, s] of [[0.25, 1], [0.7, -1]]) { const sx = x + Math.floor(w * fx), sy = y + Math.floor(h * 0.6); pb.rect(sx - 4, sy, 9, 2, 0x2a1a10); pb.vl(sx, sy - 7, 7, 0x2a1a10); pb.rect(sx - 3, sy - 7, 3, 5, 0xe8e0c8); pb.rect(sx + 1, sy - 6, 3, 4, 0xd8d0b8); pb.disc(sx + 6 * s, sy - 1, 2.2, 0xd8d8d0); } pb.disc(x + w * 0.48, y + h * 0.45, 2.5, 0xffb040); },
  paysage: (pb, x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pb.set(x + i, y + j, j < h * 0.5 ? mix(0x88b8d8, 0xf0d8a0, j / (h * 0.5)) : j < h * 0.65 ? 0x3a7aa0 : 0xd8c090); pb.ellipse(x + w * 0.35, y + h * 0.62, w * 0.22, 2.2, 0x3a8a3a); pb.vl(x + Math.floor(w * 0.38), y + Math.floor(h * 0.3), Math.floor(h * 0.3), 0x5a3a1a); pb.disc(x + w * 0.38, y + h * 0.28, 2.4, 0x2a7a2a); pb.disc(x + w * 0.8, y + h * 0.18, 1.6, 0xfff0b0); },
  nature: (pb, x, y, w, h) => { pb.rect(x, y, w, h, 0x241812); pb.rect(x, y + h - 4, w, 4, 0x5a3a20); pb.disc(x + w * 0.35, y + h - 6, 2.4, 0xc83a2a); pb.disc(x + w * 0.55, y + h - 6, 2.2, 0xe0b040); pb.disc(x + w * 0.45, y + h - 8, 2, 0x6a9a3a); pb.rect(x + Math.floor(w * 0.7), y + h - 11, 3, 7, 0x3a6a4a); pb.set(x + Math.floor(w * 0.7) + 1, y + h - 12, 0x3a6a4a); },
  carte: (pb, x, y, w, h) => { pb.rect(x, y, w, h, 0xe4d0a0); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (valueNoise((x + i) / 3, (y + j) / 3, 521) > 0.66) pb.set(x + i, y + j, 0x8aa868); pb.line(x + 2, y + h - 3, x + w - 3, y + 2, 0xa02a1a); pb.disc(x + w - 4, y + 3, 1, 0xa02a1a); pb.hl(x, y + (h >> 1), w, 0xc8b480); },
  famille: (pb, x, y, w, h) => { for (let j = 0; j < h; j++) pb.hl(x, y + j, w, mix(0x3a3020, 0x1e1810, j / h)); for (const [fx, col, hair] of [[0.2, 0x6a1a2a, 0x2a1a10], [0.4, 0x1a3a6a, 0x6a4a2a], [0.62, 0x9a1e26, 0xe8e4dc], [0.82, 0x3a5a3a, 0x8a6a3a]]) { const cx = x + Math.floor(w * fx); pb.rect(cx - 2, y + h - 7, 5, 7, col); pb.disc(cx, y + h - 9, 2, 0xd8a880); pb.hl(cx - 1, y + h - 11, 3, hair); } },
};
const PAINT = {
  fenetre(pb, W, v) { // une haute fenêtre à petits carreaux, ses rideaux de velours retenus par une embrasse dorée
    const x0 = 6, w = W - 12;
    pb.rect(x0 - 1, 0, w + 2, 24, 0xd8d0c0); pb.hl(x0 - 1, 0, w + 2, 0xf0ead8); pb.rect(x0 - 2, 23, w + 4, 2, 0xb8b0a0); // l'embrasure, l'appui
    for (let j = 1; j < 23; j++) for (let i = 0; i < w; i++) pb.set(x0 + i, j, mix(0x1e3050, 0x0e1a30, j / 23));
    for (let i = 0; i < w; i++) if ((i + 2) % 7 === 0) pb.vl(x0 + i, 1, 22, 0x4a3a2a);
    for (const j of [7, 14]) pb.hl(x0, j, w, 0x4a3a2a);
    pb.vl(x0 + (w >> 1), 1, 22, 0x4a3a2a);
    pb.set(x0 + 3, 3, 0x6a8ab0); pb.set(x0 + 4, 4, 0x6a8ab0); pb.set(x0 + w - 4, 9, 0x5a7aa0); // le reflet de la lune
    if (v === 3) { for (const sx of [x0 - 1, x0 + w]) pb.vl(sx, 0, 24, 0x4a3a2a); return; } // sans rideaux (les archives) : une fenêtre de service
    const C = v === 1 ? [0x0e2a1a, 0x163c26, 0x204e30] : v === 2 ? [0x12203e, 0x1c2e54, 0x283e6a] : [0x4a0e16, 0x6a1622, 0x8a2230];
    for (const side of [0, 1]) for (let j = 0; j < 27; j++) { const half = j < 13 ? 7 : j < 17 ? 4 : 6; for (let i = 0; i < half; i++) { const x = side ? W - 1 - i : i; const f = (i + j) % 5; pb.set(x, j, C[f < 2 ? 1 : f < 4 ? 2 : 0]); } }
    for (const x of [5, W - 6]) { pb.set(x, 14, 0xe0b048); pb.set(x, 15, 0xb8862a); }
    pb.rect(0, 0, W, 2, 0xb8862a); pb.hl(0, 0, W, 0xe0b048); // la tringle
  },
  fenetre_s(pb, W) { // une fenêtre de service, petite, sans rideau
    const x0 = 3, w = W - 6;
    pb.rect(x0 - 1, 3, w + 2, 15, 0x5a4632); for (let j = 4; j < 17; j++) for (let i = 0; i < w; i++) pb.set(x0 + i, j, mix(0x2a3e58, 0x162238, (j - 4) / 13));
    pb.vl(x0 + (w >> 1), 4, 13, 0x5a4632); pb.hl(x0, 10, w, 0x5a4632); pb.rect(x0 - 2, 17, w + 4, 2, 0x8a7a62);
  },
  tableau(pb, W, v) { // un tableau dans son cadre doré ; plus il est large, plus il est grand (toujours au-dessus de la cimaise)
    const n = W >> 4, w = n === 1 ? 12 : n === 2 ? 26 : 40, h = n === 1 ? 12 : n === 2 ? 14 : 16, x = (W - w) >> 1, y = n === 1 ? 3 : n === 2 ? 2 : 1;
    frame(pb, x, y, w, h);
    (SUBJECT[v] || SUBJECT.mer)(pb, x + 2, y + 2, w - 4, h - 4);
    if (n >= 2 && y + h + 2 <= 15) { pb.rect((W >> 1) - 4, y + h, 8, 2, 0x3a2a1a); pb.hl((W >> 1) - 3, y + h, 6, 0xe0b048); } // le cartel
  },
  portrait_ch(pb, W, v) { // le portrait au-dessus de la cheminée : un grand cadre doré, juste au-dessus de la tablette
    const w = Math.min(W - 8, 30), h = 15, x = (W - w) >> 1, y = 0;
    frame(pb, x, y, w, h); (SUBJECT[v] || SUBJECT.portrait)(pb, x + 2, y + 2, w - 4, h - 4);
    pb.rect(x - 2, y + 3, 2, 8, 0xb8862a); pb.rect(x + w, y + 3, 2, 8, 0xb8862a); // les rinceaux du cadre
  },
  cuivres(pb, W) { // les cuivres de l'office, pendus à leur barre
    pb.hl(1, 3, W - 2, 0x3a2a1a);
    for (const [x, r] of [[4, 3], [10, 2.5]]) { if (x >= W) continue; pb.vl(x, 4, 3, 0x3a2a1a); pb.disc(x, 9, r, 0xb8683a); pb.disc(x - 1, 8, r - 1.2, 0xe0985a); pb.vl(x, 9 + r, 4, 0x8a4a2a); }
    pb.ellipse(W - 4, 12, 2.5, 2, 0xb8683a);
  },
  miroir(pb, W) {
    const cx = W / 2; pb.ellipse(cx, 9, 6, 9, 0xb8862a); pb.ellipse(cx, 9, 5, 8, 0xe0b048); pb.ellipse(cx, 9, 4, 7, 0x8aa0a8);
    for (let j = 2; j < 16; j++) for (let i = 4; i < 12; i++) if (pb.get(i, j) === 0x8aa0a8 && (i + j) % 7 === 0) pb.set(i, j, 0xc8d8e0);
    pb.set(cx - 2, 4, 0xe8f0f0); pb.rect(cx - 1, -1 + 1, 2, 1, 0xfadc8a);
  },
  tapisserie(pb, W, v) { // une tapisserie pendue à sa tringle : une chasse, des bordures fleuries
    pb.rect(0, 0, W, 2, 0x5a3a1a); pb.hl(0, 0, W, 0x8a5a2a);
    const C = v ? [0x2a1a3a, 0x3e2a52, 0x56406a] : [0x3a2a18, 0x52402a, 0x6a563a];
    for (let j = 2; j < 22; j++) for (let i = 2; i < W - 2; i++) pb.set(i, j, (i < 4 || i > W - 5 || j < 4 || j > 19) ? ((i + j) % 3 ? 0xa83a2a : 0xd8b060) : C[(Math.floor(i / 4) + Math.floor(j / 3)) % 3]);
    pb.ellipse(W * 0.4, 13, 4, 2.2, 0x8a5a3a); pb.vl(Math.floor(W * 0.4) + 3, 10, 3, 0x8a5a3a); pb.disc(W * 0.68, 9, 2, 0x2a6a2a); pb.vl(Math.floor(W * 0.68), 11, 6, 0x4a2a14);
    for (let i = 2; i < W - 2; i += 2) pb.set(i, 22, 0xd8b060);
  },
  biblio(pb, W, v) { // une bibliothèque encastrée : quatre rayons, des reliures, quelques rouleaux
    pb.rect(0, 0, W, 28, 0x2a1a10); pb.vl(0, 0, 28, 0x4a3020); pb.vl(W - 1, 0, 28, 0x1a0e08);
    const SP = [0x6a1a1a, 0x1a3a5a, 0x2a4a2a, 0x7a5a1a, 0x4a2a4a, 0x8a3a1a, 0x3a3a3a, 0x9a7a3a];
    for (const sy of [1, 8, 15, 22]) {
      pb.hl(1, sy + 6, W - 2, 0x4a3020);
      for (let i = 1; i < W - 1;) { const bw = 1 + Math.floor(hash2(i, sy + v * 31, 531) * 2), bh = 4 + Math.floor(hash2(i, sy, 532 + v) * 3), c = SP[Math.floor(hash2(i, sy, 533 + v) * SP.length)];
        if (hash2(i, sy, 534 + v) > 0.88) { pb.disc(i + 1, sy + 4.5, 1.4, 0xe4d4a8); i += 3; continue; } // un rouleau couché
        for (let k = 0; k < bw && i + k < W - 1; k++) { pb.vl(i + k, sy + 6 - bh, bh, k ? shade(c, 0.8) : c); pb.set(i + k, sy + 6 - bh + 1, 0xd8b060); } i += bw; }
    }
  },
  carte(pb, W) { frame(pb, 2, 1, W - 4, 18, [0x2a1a10, 0x3e2818, 0x5a3c22, 0x7a5430, 0x9a6c3e]); SUBJECT.carte(pb, 4, 3, W - 8, 14); },
  blason(pb, W) { const cx = W >> 1; pb.rect(cx - 5, 3, 11, 9, 0x9a1e26); for (let j = 12; j < 16; j++) pb.hl(cx - 5 + (j - 11), j, 11 - (j - 11) * 2, 0x9a1e26); pb.vl(cx, 5, 8, 0xf2c14a); pb.hl(cx - 3, 7, 7, 0xf2c14a); pb.hl(cx - 3, 12, 7, 0xf2c14a); pb.set(cx - 3, 11, 0xf2c14a); pb.set(cx + 3, 11, 0xf2c14a); pb.hl(cx - 6, 2, 13, 0xe0b048); },
  vaisselle(pb, W) { // un égouttoir à assiettes, des tasses pendues à leurs crochets
    pb.rect(1, 2, W - 2, 2, 0x5a4030); pb.rect(1, 13, W - 2, 2, 0x5a4030);
    for (let i = 3; i < W - 3; i += 4) { pb.disc(i + 1, 8, 2.6, 0xe8e4dc); pb.disc(i + 1, 8, 1.2, 0x4a7aa8); }
    for (let i = 4; i < W - 4; i += 5) { pb.set(i, 16, 0x5a4030); pb.rect(i - 1, 17, 3, 3, 0xd8d0c0); }
  },
  porte_ch(pb, W) { // la grande porte de chargement, à deux battants bardés de fer
    pb.rect(2, 0, W - 4, 28, 0x3a2614); for (let i = 3; i < W - 3; i++) if (i % 6 === 0) pb.vl(i, 1, 27, 0x2a1a0e);
    for (const y of [4, 14, 23]) { pb.hl(3, y, W - 6, 0x3a3a44); pb.hl(3, y + 1, W - 6, 0x2a2a32); }
    pb.vl(W >> 1, 1, 27, 0x1a1008); pb.rect((W >> 1) - 3, 12, 2, 4, 0x6a6a7a); pb.rect((W >> 1) + 1, 12, 2, 4, 0x6a6a7a);
    pb.rect(0, 0, W, 2, 0x5a4a3a);
  },
  avis(pb, W) { // le panneau des avis de la Douane : des affiches clouées, un tampon rouge
    pb.rect(2, 2, W - 4, 16, 0x5a3a20); pb.rect(3, 3, W - 6, 14, 0x7a5430);
    for (const [x, y, w, h] of [[4, 4, 5, 6], [10, 5, 4, 7], [5, 11, 6, 5]]) { pb.rect(x, y, w, h, 0xe8dcc0); for (let j = 1; j < h - 1; j += 2) pb.hl(x + 1, y + j, w - 2, 0x8a7a60); }
    pb.disc(12, 14, 1.4, 0xb02a1a);
  },
  tarifs(pb, W) { frame(pb, 1, 1, W - 2, 18, [0x2a1a10, 0x3e2818, 0x5a3c22, 0x7a5430, 0x9a6c3e]); pb.rect(3, 3, W - 6, 14, 0x1e2a24); for (let j = 5; j < 16; j += 3) { pb.hl(5, j, 8 + Math.floor(hash2(j, W, 541) * 6), 0xd8dccc); pb.hl(W - 10, j, 5, 0xe8d088); } },
  outils(pb, W) { // le tableau à outils de l'atelier : la scie, l'équerre, les ciseaux, le maillet
    pb.rect(1, 1, W - 2, 20, 0x6a4a2c); for (let i = 3; i < W - 3; i += 3) for (let j = 3; j < 19; j += 3) pb.set(i, j, 0x3a2614);
    pb.rect(3, 4, 9, 4, 0xa8a8b8); for (let i = 3; i < 12; i += 2) pb.set(i, 8, 0x6a6a7a); pb.rect(12, 4, 3, 3, 0x8a5a2a); // la scie
    pb.hl(17, 4, 8, 0xc8c8d0); pb.vl(17, 4, 9, 0xc8c8d0); // l'équerre
    for (const x of [21, 24, 27]) { if (x >= W - 3) continue; pb.vl(x, 10, 5, 0x9a9aa8); pb.rect(x - 1, 15, 3, 4, 0x6a4020); }
    pb.rect(5, 12, 6, 3, 0x8a6a4a); pb.vl(7, 15, 5, 0x5a3a1a); // le maillet
  },
  plans(pb, W) { // des plans d'architecte épinglés : le bleu, les traits blancs, un croquis de façade
    pb.rect(2, 2, 14, 12, 0x2a4a7a); pb.hl(3, 5, 12, 0xc8d8e8); pb.vl(6, 3, 10, 0xc8d8e8); pb.rect(9, 7, 5, 4, 0x2a4a7a); for (let i = 9; i < 14; i++) pb.set(i, 7, 0xc8d8e8); pb.vl(9, 7, 4, 0xc8d8e8);
    if (W >= 32) { pb.rect(18, 4, 12, 14, 0xe8dcc0); pb.hl(19, 15, 10, 0x6a5a40); for (let k = 0; k < 4; k++) pb.rect(20 + k * 2, 8 - k, 1, 7 + k, 0x6a5a40); pb.line(19, 8, 29, 5, 0x6a5a40); }
    for (const [x, y] of [[3, 2], [15, 2], [19, 4], [29, 4]]) if (x < W) pb.set(x, y, 0xc83a2a);
  },
  echelle_m(pb, W) { // une échelle appuyée contre la façade, de la ruelle jusqu'au toit
    for (const x of [4, 11]) { pb.vl(x, 0, 28, 0x6a4a2a); pb.vl(x + 1, 0, 28, 0x4a3018); }
    for (let y = 2; y < 28; y += 4) pb.hl(5, y, 6, 0x8a6a3a);
  },
  soupirail(pb, W) { const x0 = 3, w = W - 6; pb.rect(x0, 2, w, 8, 0x0e0e12); for (let i = 0; i < w; i += 3) pb.vl(x0 + i, 2, 8, 0x3a3a44); for (let i = 0; i < w; i++) pb.set(x0 + i, 9, 0x2a4a5a); pb.rect(x0 - 1, 1, w + 2, 1, 0x4a463e); },
  niche(pb, W) { const cx = W >> 1; pb.rect(cx - 4, 8, 9, 9, 0x0e0c0c); pb.ellipse(cx, 8, 4.5, 3, 0x0e0c0c); pb.rect(cx - 1, 13, 2, 4, 0xe8dcc0); pb.set(cx, 12, 0xffd060); pb.set(cx, 11, 0xffa030); },
  rue_fenetre(pb, W, v) { // une fenêtre de façade : volets, et une jardinière fleurie une fois sur deux
    const x0 = 4, w = W - 8;
    pb.rect(x0, 4, w, 13, 0x2a2420); for (let j = 5; j < 16; j++) for (let i = 1; i < w - 1; i++) pb.set(x0 + i, j, (v & 1) ? mix(0xe0a050, 0x8a5020, (j - 5) / 11) : mix(0x2a3a52, 0x141e30, (j - 5) / 11));
    pb.vl(x0 + (w >> 1), 5, 11, 0x2a2420); pb.hl(x0, 10, w, 0x2a2420);
    const SH = [0x2a5a3a, 0x7a2a22, 0x2a4a7a, 0x6a5a2a][v % 4];
    for (const sx of [x0 - 3, x0 + w]) { pb.rect(sx, 4, 3, 13, SH); for (let j = 5; j < 16; j += 2) pb.hl(sx, j, 3, shade(SH, 0.75)); }
    if (v % 2 === 0) { pb.rect(x0 - 1, 17, w + 2, 3, 0x6a3a1a); for (let i = 0; i < w + 2; i += 2) pb.set(x0 - 1 + i, 16, [0xd83a3a, 0xf2c14a, 0xe86aa0][(i >> 1) % 3]); }
  },
  rue_porte(pb, W, v) { // une porte de maison : le linteau, les planches, le heurtoir, une marche
    const cx = W >> 1; pb.rect(cx - 5, 4, 10, 24, 0x5a4632); pb.rect(cx - 4, 5, 8, 23, [0x5a2a1a, 0x2a3a5a, 0x2a4a2a][v % 3]);
    for (let j = 6; j < 27; j += 4) pb.hl(cx - 4, j, 8, 0x1a1210); pb.set(cx + 2, 16, 0xe0b048); pb.rect(cx - 6, 3, 12, 2, 0x8a7a62);
  },
  enseigne(pb, W, v) { // une enseigne pendue à sa potence : une ancre, une chope, un poisson
    pb.hl(2, 3, 12, 0x2a2a30); pb.vl(2, 3, 3, 0x2a2a30); pb.rect(4, 5, 10, 9, 0x6a4a2a); pb.rect(5, 6, 8, 7, 0x8a6a3a);
    const c = 0xe0b048; if (v % 3 === 0) { pb.vl(9, 7, 5, c); pb.hl(7, 11, 5, c); pb.set(8, 8, c); pb.set(10, 8, c); } else if (v % 3 === 1) { pb.rect(7, 8, 4, 4, c); pb.vl(11, 9, 2, c); } else { pb.ellipse(9, 9.5, 3, 1.6, c); pb.set(12, 8, c); pb.set(12, 11, c); }
  },
};
export const WALL_DECOR = Object.keys(PAINT);
function decorPB(k, n, v) {
  const key = k + ':' + n + ':' + v;
  let pb = cache.get(key);
  if (!pb) { pb = new PB(n * 16, 28); (PAINT[k] || PAINT.tableau)(pb, n * 16, v); cache.set(key, pb); }
  return pb;
}
// le pixel de décor à (u, d) sur la colonne i d'un décor de n colonnes ; -1 : rien (on voit le mur)
export function heistDecorPix(D, u, d) {
  const [k, i, n, v] = D;
  if (d < 2 || d > 29) return -1;
  const pb = decorPB(k, n, v), x = i * 16 + u, y = 29 - d;
  return pb.get(x, y);
}

// ------------------------------------------------------------------ la mer le long du navire (le vide du pont)
export function heistSea(wx, wy) {
  const n = valueNoise(wx / 9, wy / 5, 551), m = valueNoise(wx / 23, wy / 13, 552);
  let c = mix(0x0b2a44, 0x123a5a, m);
  if (n > 0.68) c = mix(c, 0x3a6a8a, (n - 0.68) * 2.2); // l'écume des vaguelettes
  if ((wy + Math.floor(wx / 7)) % 11 === 0 && n > 0.5) c = mix(c, 0x6a9ab8, 0.4);
  return c;
}

// ------------------------------------------------------------------ les sprites des lieux
// Même facture que le reste du monde : lumière en haut à gauche, contour automatique, palettes partagées.
// L'ancre (ax, ay) d'un meuble est le milieu du bas de son emprise (voir place() dans shared/heist-decor.js).
const MARBLE = [0x8a8478, 0xb0a998, 0xccc6b6, 0xe2ddd0, 0xf4f1e8];
const VELVET = { r: [0x3a0a12, 0x5e121e, 0x82202c, 0xa8343c, 0xc8565a], v: [0x0e2a1a, 0x16402a, 0x22583a, 0x32724a, 0x4a8e5e], b: [0x101a3a, 0x1a2a56, 0x283e74, 0x3a5490, 0x5a74ac] };
const DW = [0x24140a, 0x3a2212, 0x52321c, 0x6c4426, 0x885832, 0xa06c40];
const CLOTH = [0xb8b0a0, 0xd2cabc, 0xe6e0d4, 0xf4f0e8, 0xfffcf6];
const BRONZE = [0x3a2a14, 0x5a4220, 0x7e5e30, 0xa07a42, 0xc89a5a];
const many = (fn, n) => Array.from({ length: n }, (_, v) => fn(v));
const candle = (pb, x, y) => { pb.rect(x, y, 1, 3, 0xf3f0e2); pb.set(x, y - 1, 0xffd24a); pb.set(x, y - 2, 0xfff2b0); };

function chemineeM() { // la cheminée de marbre du salon : le manteau mouluré, le foyer, les chenets, le feu
  const pb = new PB(46, 30);
  pb.rect(1, 3, 44, 27, MARBLE[2]); pb.hl(1, 3, 44, MARBLE[4]); pb.vl(1, 3, 27, MARBLE[3]); pb.vl(44, 3, 27, MARBLE[1]);
  pb.rect(0, 1, 46, 4, MARBLE[3]); pb.hl(0, 1, 46, MARBLE[4]); pb.hl(0, 4, 46, MARBLE[1]); // la tablette
  for (let x = 2; x < 44; x += 3) pb.set(x, 3, MARBLE[1]);
  pb.rect(4, 6, 5, 24, MARBLE[3]); pb.vl(4, 6, 24, MARBLE[4]); pb.rect(37, 6, 5, 24, MARBLE[3]); pb.vl(41, 6, 24, MARBLE[1]); // les jambages
  for (const x of [5, 38]) { pb.rect(x, 9, 3, 2, GOLD[2]); pb.set(x + 1, 9, GOLD[4]); }
  pb.rect(9, 9, 28, 21, 0x140c0a); pb.rect(10, 10, 26, 2, 0x2a1a14); // le foyer
  for (let y = 12; y < 30; y++) pb.hl(10, y, 26, mix(0x1a0e0a, 0x3a1a10, (y - 12) / 18));
  pb.rect(12, 25, 22, 3, 0x3a2a24); pb.rect(13, 23, 20, 2, 0x5a3a28); // les bûches
  pb.blob(23, 21, 7, 5, [0x8a1a0a, 0xd84a14, 0xff8a2a, 0xffc24a, 0xfff2b0], { light: [0, -1, 0.3] });
  pb.blob(18, 23, 3, 3, [0xd84a14, 0xff8a2a, 0xffc24a], {}); pb.blob(28, 23, 3, 3, [0xd84a14, 0xff8a2a, 0xffc24a], {});
  for (const x of [11, 33]) { pb.vl(x, 22, 7, IRON[3]); pb.set(x, 21, GOLD[3]); } // les chenets
  pb.rect(17, 2, 3, 1, GOLD[3]); pb.rect(26, 2, 3, 1, GOLD[3]); pb.rect(21, 0, 4, 2, GOLD[2]); pb.set(22, 0, GOLD[4]); // la pendule sur la tablette
  pb.outline('auto');
  return mk(pb, 23, 28, { flame: [23, 20] });
}
function lustreP() { // un lustre de cristal à deux couronnes, suspendu à sa chaîne (au-dessus des personnages)
  const pb = new PB(42, 34);
  pb.vl(21, 0, 9, GOLD[1]); for (let y = 0; y < 9; y += 2) pb.set(21, y, GOLD[3]);
  const ring = (cy, rx, ry, c0, c1) => { for (let a = 0; a < 6.283; a += 0.04) { const x = 21 + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; pb.set(x, y, Math.sin(a) > 0 ? c0 : c1); pb.set(x, y + 1, GOLD[0]); } };
  ring(19, 19, 5, GOLD[3], GOLD[2]); ring(14, 11, 3, GOLD[3], GOLD[2]);
  pb.disc(21, 22, 3.4, GOLD[2]); pb.set(20, 21, GOLD[4]); pb.vl(21, 25, 5, GOLD[1]); pb.disc(21, 31, 1.6, 0xd8e8f0);
  for (const [x, y] of [[3, 18], [9, 23], [17, 24], [25, 24], [33, 23], [39, 18], [9, 15], [33, 15], [14, 12], [28, 12], [21, 10]]) candle(pb, x, y - 3);
  for (const x of [6, 12, 18, 24, 30, 36]) { const y = 19 + Math.round(Math.sqrt(Math.max(0, 1 - ((x - 21) / 19) ** 2)) * 5); pb.set(x, y + 2, 0xd8e8f0); pb.set(x, y + 3, 0xa8c8d8); } // les pampilles
  pb.outline('auto');
  return mk(pb, 21, 58, { light: [21, 34], over: 1 });
}
function fauteuil(v) { // un fauteuil de velours rouge, bois doré : 0 face, 1 de dos, 2 vers la droite, 3 vers la gauche
  const pb = new PB(16, 18), C = VELVET.r, G = GOLD;
  if (v === 0 || v === 1) {
    pb.rect(2, 2, 12, 9, C[2]); pb.hl(2, 2, 12, C[4]); pb.rect(3, 3, 10, 7, v ? C[1] : C[3]); // le dossier
    pb.rect(1, 9, 14, 6, C[2]); pb.hl(1, 9, 14, C[3]); pb.rect(1, 9, 2, 6, C[1]); pb.rect(13, 9, 2, 6, C[1]); // l'assise, les bras
    if (!v) { pb.rect(3, 10, 10, 3, C[3]); pb.hl(3, 10, 10, C[4]); }
    pb.hl(2, 1, 12, G[3]); pb.vl(1, 2, 13, G[2]); pb.vl(14, 2, 13, G[1]);
    pb.rect(2, 15, 2, 2, G[1]); pb.rect(12, 15, 2, 2, G[1]);
  } else {
    const f = v === 3, X = (x) => (f ? 15 - x : x);
    for (let y = 2; y < 15; y++) for (let x = 1; x < 6; x++) pb.set(X(x), y, x === 1 ? G[2] : C[y < 4 ? 3 : 2]); // le dossier, de profil
    for (let y = 8; y < 15; y++) for (let x = 5; x < 15; x++) pb.set(X(x), y, y === 8 ? C[4] : y < 11 ? C[3] : C[1]);
    for (let x = 5; x < 15; x++) pb.set(X(x), 7, x > 12 ? G[3] : -1);
    pb.rect(Math.min(X(2), X(3)), 15, 2, 2, G[1]); pb.rect(Math.min(X(12), X(13)), 15, 2, 2, G[1]);
  }
  pb.outline('auto');
  return mk(pb, 8, 16);
}
function canape(v) { // un canapé à trois coussins (rouge au salon de l'ouest, vert à l'est)
  const pb = new PB(32, 20), C = v ? VELVET.v : VELVET.r, G = GOLD;
  pb.rect(1, 1, 30, 9, C[2]); pb.hl(1, 1, 30, C[4]); for (let x = 2; x < 30; x++) if ((x - 2) % 9 === 0) pb.vl(x, 2, 7, C[1]); // le dossier capitonné
  for (let x = 4; x < 29; x += 4) pb.set(x, 5, C[0]);
  pb.rect(0, 8, 32, 8, C[2]); pb.rect(0, 8, 4, 8, C[1]); pb.rect(28, 8, 4, 8, C[1]); pb.hl(0, 8, 4, C[3]); pb.hl(28, 8, 4, C[3]);
  for (const x of [4, 12, 20]) { pb.rect(x, 9, 8, 4, C[3]); pb.hl(x, 9, 8, C[4]); pb.vl(x, 9, 4, C[2]); }
  pb.hl(0, 16, 32, G[1]); pb.rect(1, 16, 2, 3, G[1]); pb.rect(29, 16, 2, 3, G[1]); pb.hl(1, 0, 30, G[3]);
  pb.outline('auto');
  return mk(pb, 16, 18);
}
function tableBasse(v) { // une table basse : un plateau de marqueterie, un service à thé, ou des cartes et une carafe
  const pb = new PB(28, 12);
  pb.rect(1, 2, 26, 5, DW[3]); pb.hl(1, 2, 26, DW[5]); pb.rect(3, 3, 22, 3, DW[4]); pb.hl(1, 7, 26, DW[1]);
  pb.rect(2, 7, 2, 4, DW[1]); pb.rect(24, 7, 2, 4, DW[1]);
  if (v) { pb.rect(6, 2, 6, 3, 0xf0e8d8); pb.rect(14, 3, 5, 2, 0xe8e0d0); pb.rect(21, 0, 3, 4, 0x6a1a2a); pb.set(22, 0, 0xc8a0a0); }
  else { pb.rect(6, 1, 4, 3, 0xf0eadc); pb.set(10, 2, 0xf0eadc); pb.rect(13, 2, 3, 2, 0xe8e0d0); pb.rect(18, 2, 3, 2, 0xe8e0d0); pb.hl(13, 2, 3, GOLD[3]); pb.hl(18, 2, 3, GOLD[3]); }
  pb.outline('auto');
  return mk(pb, 14, 11);
}
function gueridon(v) { // un guéridon : des coupes (0) ou un bouquet (1)
  const pb = new PB(14, 20);
  pb.ellipse(7, 8, 6, 2.4, MARBLE[2]); pb.ellipse(7, 7.6, 6, 2, MARBLE[3]); pb.hl(3, 7, 8, MARBLE[4]);
  pb.vl(7, 10, 7, GOLD[1]); pb.vl(6, 10, 7, GOLD[2]); pb.hl(3, 17, 8, GOLD[1]); pb.set(3, 18, GOLD[1]); pb.set(10, 18, GOLD[1]);
  if (v) { pb.rect(6, 3, 3, 4, 0xd8e8f0); for (const [x, y, c] of [[5, 1, 0xd83a3a], [8, 0, 0xf2c14a], [7, 2, 0xe86aa0], [9, 2, 0xd83a3a], [6, 3, 0x3a8a3a]]) pb.disc(x, y + 1, 1.2, c); }
  else for (const x of [4, 7, 10]) { pb.set(x, 4, 0xd8e8f0); pb.set(x, 5, 0xc8a040); pb.vl(x, 6, 1, 0xd8e8f0); }
  pb.outline('auto');
  return mk(pb, 7, 18);
}
function buffetM() { // le buffet de la réception : la nappe blanche, la pièce montée, les fruits, le rôti, deux candélabres
  const pb = new PB(64, 30);
  pb.rect(1, 12, 62, 16, CLOTH[2]); pb.rect(1, 10, 62, 4, CLOTH[3]); pb.hl(1, 10, 62, CLOTH[4]);
  for (let x = 1; x < 63; x++) if (x % 6 === 0) pb.vl(x, 14, 13, CLOTH[1]); // les plis de la nappe
  for (let x = 1; x < 63; x += 2) pb.set(x, 27, CLOTH[0]);
  pb.hl(1, 14, 62, GOLD[2]);
  // la pièce montée (au centre), les fruits, le rôti, les verres
  pb.rect(29, 6, 8, 5, 0xf0e0c0); pb.rect(30, 2, 6, 4, 0xf4e8cc); pb.rect(31, 0, 4, 2, 0xf8f0dc); pb.set(33, 0, 0xd83a3a);
  for (const y of [5, 9]) pb.hl(29, y, 8, 0xd8b070);
  pb.ellipse(19, 9, 5, 2, 0xd8d0c0); pb.blob(19, 7, 4, 2.5, [0x5a2a0a, 0x8a4a1a, 0xb86a2a, 0xd88a3a], {}); // le rôti
  pb.ellipse(46, 9, 5, 2, 0xd8d0c0); for (const [x, y, c] of [[44, 7, 0xd83a3a], [47, 6, 0x6a9a3a], [46, 8, 0xf2c14a], [49, 8, 0xa83a6a], [43, 9, 0x8a3a8a]]) pb.disc(x, y, 1.6, c); // la coupe de fruits
  for (const x of [25, 40, 53, 12]) { pb.set(x, 8, 0xd8e8f0); pb.set(x, 9, 0x8a1a2a); pb.set(x, 10, 0xd8e8f0); }
  for (const cx of [6, 57]) { pb.vl(cx, 3, 8, GOLD[2]); pb.hl(cx - 3, 4, 7, GOLD[2]); for (const x of [cx - 3, cx, cx + 3]) candle(pb, x, 1); pb.rect(cx - 2, 10, 5, 1, GOLD[1]); }
  pb.outline('auto');
  return mk(pb, 32, 28, { lights: [[6, -1], [57, -1]] });
}
function colonne() { // une colonne de marbre, base et chapiteau dorés
  const pb = new PB(16, 46);
  pb.rect(1, 40, 14, 5, MARBLE[2]); pb.hl(1, 40, 14, MARBLE[4]); pb.hl(1, 44, 14, MARBLE[0]);
  pb.cyl(3, 6, 10, 34, MARBLE, { noise: 0.05 }); for (let x = 4; x < 13; x += 3) pb.vl(x, 7, 33, MARBLE[1]);
  pb.rect(1, 2, 14, 5, GOLD[2]); pb.hl(1, 2, 14, GOLD[4]); pb.hl(1, 6, 14, GOLD[1]); pb.rect(0, 0, 16, 2, MARBLE[3]);
  pb.rect(2, 38, 12, 2, GOLD[2]);
  pb.outline('auto');
  return mk(pb, 8, 44);
}
function consoleM(v) { // une console dorée contre le mur : un vase de fleurs (0), ou le livre d'or et son chandelier (1)
  const pb = new PB(30, 26);
  pb.rect(1, 10, 28, 4, MARBLE[3]); pb.hl(1, 10, 28, MARBLE[4]); pb.hl(1, 13, 28, MARBLE[1]);
  pb.rect(2, 14, 26, 3, GOLD[2]); pb.hl(2, 16, 26, GOLD[1]); for (const x of [3, 26]) { pb.vl(x, 17, 8, GOLD[2]); pb.vl(x + 1, 17, 8, GOLD[1]); }
  pb.line(5, 24, 14, 18, GOLD[1]); pb.line(25, 24, 16, 18, GOLD[1]);
  if (!v) { pb.rect(12, 3, 6, 7, 0x2a4a7a); pb.hl(12, 3, 6, 0x4a6aa0); pb.rect(13, 8, 4, 2, 0x1a3a6a); for (const [x, y, c] of [[11, 1, 0xd83a3a], [15, 0, 0xf8f0e0], [18, 1, 0xe86aa0], [13, 2, 0xf2c14a], [17, 3, 0x3a8a3a], [10, 3, 0x3a8a3a]]) pb.disc(x, y + 1, 1.5, c); }
  else { pb.rect(6, 7, 10, 3, 0x6a1a1a); pb.rect(7, 6, 8, 1, 0xf0e8d8); pb.vl(11, 6, 2, 0x8a6a4a); candle(pb, 22, 5); pb.rect(21, 8, 3, 2, GOLD[2]); pb.line(16, 5, 18, 3, 0xe8e0d0); }
  pb.outline('auto');
  return mk(pb, 15, 24, v ? { lights: [[22, 4]] } : {});
}
function clavecin() { // un clavecin, le couvercle ouvert, peint de rinceaux
  const pb = new PB(32, 22);
  for (let y = 4; y < 16; y++) { const w = Math.round(30 - (y - 4) * 1.2); pb.hl(1, y, w, y === 4 ? DW[5] : DW[3]); }
  for (let y = 5; y < 14; y++) { const w = Math.round(26 - (y - 5) * 1.2); pb.hl(3, y, w, y % 3 === 0 ? 0xc8a040 : 0x2a1a10); } // les cordes
  for (let y = 0; y < 5; y++) pb.hl(2 + y, y, 26 - y * 2, y === 0 ? 0x5a2a1a : 0x7a3a22); pb.line(4, 1, 24, 1, GOLD[3]); // le couvercle levé
  pb.rect(1, 15, 14, 3, 0xf4f0e6); for (let x = 2; x < 15; x += 2) pb.set(x, 15, 0x1a1210); // le clavier
  for (const x of [2, 13, 22]) pb.rect(x, 18, 2, 3, DW[2]);
  pb.outline('auto');
  return mk(pb, 16, 20);
}
function harpe() { const pb = new PB(14, 30); pb.line(3, 28, 3, 4, GOLD[2], 2); pb.line(3, 4, 12, 9, GOLD[3], 1.5); pb.line(12, 9, 11, 28, DW[3], 2); for (let i = 0; i < 6; i++) pb.line(4, 6 + i * 4, 10, 10 + i * 3.2, 0xe8e0d0); pb.rect(1, 27, 12, 2, DW[2]); pb.outline('auto'); return mk(pb, 7, 28); }
function estradeM() { // l'estrade des musiciens : un plancher surélevé, couvert d'un drap pourpre, bordé d'or, une marche devant
  const pb = new PB(64, 66), C = [0x2a0e1e, 0x401428, 0x561c34, 0x6a2640, 0x82344e];
  for (let y = 2; y < 58; y++) for (let x = 1; x < 63; x++) { const e = Math.min(x - 1, 62 - x, y - 2, 57 - y); pb.set(x, y, e < 2 ? GOLD[e ? 2 : 1] : e === 2 ? C[0] : ((x + y) % 7 === 0 ? C[3] : C[2])); }
  for (let x = 4; x < 60; x += 8) for (let y = 6; y < 55; y += 8) { pb.set(x, y, GOLD[2]); pb.set(x + 1, y, C[4]); }
  pb.rect(0, 58, 64, 7, DW[2]); pb.hl(0, 58, 64, GOLD[3]); pb.hl(0, 61, 64, DW[3]); pb.hl(0, 64, 64, DW[0]); // la marche
  for (let x = 3; x < 62; x += 6) pb.set(x, 60, GOLD[2]);
  pb.vl(0, 2, 56, DW[1]); pb.vl(63, 2, 56, DW[0]);
  return mk(pb, 32, 64);
}
function horloge(v) { // une horloge de parquet : le cadran, le balancier doré derrière sa vitre
  const pb = new PB(14, 38), C = v ? [0x2a1a10, 0x3e2818, 0x5a3c22, 0x7a5430, 0x9a6c3e] : DW;
  pb.rect(2, 4, 10, 32, C[2]); pb.vl(2, 4, 32, C[3]); pb.vl(11, 4, 32, C[1]); pb.rect(1, 0, 12, 5, C[3]); pb.hl(1, 0, 12, C[4]); pb.rect(1, 34, 12, 3, C[1]);
  pb.disc(7, 8, 3.6, 0xf0e8d0); pb.disc(7, 8, 3.6, -1); pb.ellipse(7, 8, 3.5, 3.5, 0xf0e8d0); pb.set(7, 8, 0x1a1210); pb.vl(7, 6, 2, 0x1a1210); pb.hl(8, 8, 2, 0x1a1210); pb.set(7, 4, GOLD[3]);
  pb.rect(4, 14, 6, 16, 0x1a1214); pb.vl(7, 14, 10, GOLD[2]); pb.disc(7, 25, 2, GOLD[3]); pb.set(6, 24, GOLD[4]);
  pb.outline('auto');
  return mk(pb, 7, 36);
}
function vestiaireM() { // le vestiaire : une armoire ouverte, les manteaux des invités… et deux uniformes de la garde
  const pb = new PB(18, 36);
  pb.rect(1, 2, 16, 32, DW[2]); pb.hl(1, 2, 16, DW[4]); pb.rect(0, 0, 18, 3, DW[3]); pb.hl(0, 0, 18, DW[5]);
  pb.rect(3, 5, 12, 26, 0x140c08); pb.hl(3, 6, 12, IRON[3]);
  for (const [x, c, d] of [[4, 0x5a1a2a, 0x3a0e1a], [7, 0x2a3a2a, 0x1a2a1a], [10, 0x1c2a5a, 0x101a3a], [13, 0x1c2a5a, 0x101a3a]]) { pb.rect(x, 7, 3, 16, c); pb.vl(x + 2, 7, 16, d); pb.set(x + 1, 6, IRON[4]); }
  for (const x of [11, 14]) { pb.set(x, 9, 0xf0e8d8); pb.set(x, 13, 0xe0b048); } // les boutons dorés de la garde
  pb.rect(3, 26, 12, 5, DW[1]); pb.rect(4, 27, 4, 3, 0x3a2a1a); pb.rect(10, 27, 4, 3, 0x2a1a10); // les bottes
  pb.rect(1, 33, 16, 2, DW[1]);
  pb.outline('auto');
  return mk(pb, 9, 34);
}
function buste(v) { // un buste sur sa gaine : marbre blanc (0) ou bronze (1)
  const pb = new PB(14, 32), C = v ? BRONZE : MARBLE;
  pb.rect(3, 14, 8, 16, MARBLE[1]); pb.vl(3, 14, 16, MARBLE[3]); pb.vl(10, 14, 16, MARBLE[0]); pb.rect(2, 12, 10, 3, MARBLE[3]); pb.hl(2, 12, 10, MARBLE[4]); pb.rect(2, 29, 10, 2, MARBLE[0]);
  pb.blob(7, 9, 5, 3, C, {}); pb.blob(7, 4, 3, 3.5, C, {}); pb.set(6, 4, C[0]); pb.set(8, 4, C[0]); pb.hl(4, 1, 6, C[3]);
  pb.outline('auto');
  return mk(pb, 7, 30);
}
function statueM() { // la Fortune : une statue de marbre (une femme, la corne d'abondance, une proue de navire à ses pieds)
  const pb = new PB(32, 60);
  pb.rect(2, 46, 28, 12, MARBLE[2]); pb.hl(2, 46, 28, MARBLE[4]); pb.rect(0, 56, 32, 3, MARBLE[1]); pb.rect(4, 48, 24, 7, MARBLE[3]);
  pb.rect(12, 50, 8, 3, GOLD[2]); pb.hl(13, 51, 6, GOLD[4]); // le cartel
  pb.blob(16, 34, 6, 12, MARBLE, {}); pb.blob(16, 21, 5, 6, MARBLE, {}); pb.blob(16, 12, 3.4, 4, MARBLE, {}); // la robe, le buste, la tête
  pb.hl(13, 8, 7, MARBLE[3]); pb.line(20, 22, 26, 14, MARBLE[3], 2); pb.blob(26, 12, 3, 3, [0x7a5a2a, 0xa07a3a, 0xc89a4a, 0xe8c070], {}); // le bras, la corne d'abondance
  for (const [x, y, c] of [[25, 9, 0xd83a3a], [28, 10, 0xf2c14a], [27, 8, 0x6a9a3a]]) pb.disc(x, y, 1, c);
  pb.line(4, 44, 10, 38, MARBLE[1], 2); pb.line(4, 44, 12, 45, MARBLE[1], 2); // la proue
  pb.outline('auto');
  return mk(pb, 16, 58);
}
function vitrine(v) { // une vitrine : un navire en maquette (0), des bijoux et des pièces (1)
  const pb = new PB(30, 26);
  pb.rect(1, 14, 28, 10, DW[2]); pb.hl(1, 14, 28, DW[4]); pb.rect(2, 24, 3, 2, DW[1]); pb.rect(25, 24, 3, 2, DW[1]);
  pb.rect(2, 2, 26, 12, 0x6a8a98); for (let y = 3; y < 13; y++) for (let x = 3; x < 27; x++) pb.set(x, y, mix(0x9ab8c4, 0x5a7a8a, (y - 3) / 10));
  pb.hl(2, 2, 26, GOLD[3]); pb.vl(2, 2, 12, GOLD[2]); pb.vl(27, 2, 12, GOLD[1]);
  if (!v) { pb.rect(8, 10, 14, 3, DW[3]); pb.hl(9, 13, 12, DW[2]); pb.vl(15, 3, 8, DW[1]); pb.rect(11, 4, 4, 5, 0xf3f0e2); pb.rect(16, 5, 4, 4, 0xe8e0c8); pb.set(15, 3, 0xc83a2a); }
  else { for (const [x, y, c] of [[7, 11, GOLD[3]], [9, 11, GOLD[4]], [8, 10, GOLD[3]], [20, 11, GOLD[3]], [22, 11, GOLD[2]]]) pb.disc(x, y, 1.2, c); pb.ellipse(15, 10, 3, 1.5, 0xc8c8d8); pb.disc(15, 8, 1.4, 0xd83a5a); pb.disc(12, 11, 1, 0x3a8ad8); pb.disc(18, 11, 1, 0x3ad86a); }
  pb.set(5, 4, 0xe8f4f8); pb.set(6, 5, 0xe8f4f8); pb.set(23, 6, 0xd0e4ec);
  pb.outline('auto');
  return mk(pb, 15, 24);
}
function armure(v) { // une armure sur son socle : acier (0), dorée (1)
  const pb = new PB(16, 36), C = v ? GOLD : [0x3a3a48, 0x5a5a6a, 0x7c7c8e, 0xa2a2b4, 0xd0d0dc];
  pb.rect(2, 32, 12, 3, DW[2]); pb.hl(2, 32, 12, DW[4]);
  pb.rect(5, 22, 2, 10, C[2]); pb.rect(9, 22, 2, 10, C[1]); pb.rect(4, 30, 3, 2, C[1]); pb.rect(9, 30, 3, 2, C[1]);
  pb.blob(8, 16, 5, 6, C, {}); pb.rect(3, 12, 2, 9, C[2]); pb.rect(11, 12, 2, 9, C[1]); pb.blob(8, 7, 3.5, 4, C, {});
  pb.hl(6, 7, 5, 0x1a1a22); pb.vl(8, 2, 3, 0x9a1e26); pb.set(8, 1, 0xc83a3a); // la visière, le plumet
  pb.vl(13, 6, 26, IRON[4]); pb.rect(12, 4, 3, 3, IRON[5]); // la hallebarde
  pb.outline('auto');
  return mk(pb, 8, 34);
}
function banquette() { const pb = new PB(30, 14), C = VELVET.b; pb.rect(1, 2, 28, 6, C[2]); pb.hl(1, 2, 28, C[4]); for (let x = 4; x < 28; x += 6) pb.set(x, 4, C[0]); pb.rect(1, 8, 28, 2, GOLD[1]); for (const x of [2, 13, 26]) pb.rect(x, 10, 2, 3, GOLD[1]); pb.outline('auto'); return mk(pb, 15, 12); }
function rayonnage(v) { // les rayonnages des archives : des registres reliés, des liasses, des boîtes d'archives étiquetées
  const w = v < 2 ? 30 : 14, pb = new PB(w, 34);
  pb.rect(0, 0, w, 33, DW[1]); pb.hl(0, 0, w, DW[3]); pb.vl(0, 0, 33, DW[2]); pb.vl(w - 1, 0, 33, DW[0]);
  const SP = [0x5a1a1a, 0x1a3a5a, 0x3a2a1a, 0x6a4a1a, 0x2a3a2a, 0x7a2a1a];
  for (const sy of [2, 10, 18, 26]) {
    pb.hl(1, sy + 7, w - 2, DW[3]);
    for (let x = 1; x < w - 1;) {
      const r = hash2(x, sy + v * 17, 561);
      if (r < 0.25 && x < w - 6) { pb.rect(x, sy + 2, 5, 5, 0xc8b490); pb.hl(x, sy + 2, 5, 0xe0d0b0); pb.rect(x + 1, sy + 4, 3, 1, 0x6a5a40); x += 6; continue; } // une boîte d'archives
      if (r < 0.35) { for (let k = 0; k < 3; k++) pb.hl(x, sy + 6 - k, 4, k % 2 ? 0xe8dcc0 : 0xd8c8a0); x += 5; continue; } // une liasse couchée
      const bw = 2, bh = 5 + (r > 0.7 ? 1 : 0), c = SP[Math.floor(hash2(x, sy, 562 + v) * SP.length)];
      pb.rect(x, sy + 7 - bh, bw, bh, c); pb.set(x, sy + 8 - bh, GOLD[2]); pb.vl(x + 1, sy + 7 - bh, bh, shade(c, 0.75)); x += bw;
    }
  }
  pb.outline('auto');
  return mk(pb, w >> 1, 32);
}
function bureauM(v) { // un bureau : le grand registre de cuir et l'encrier (0) ; les cartes, le compas et la plume de Valdorne (1)
  const pb = new PB(32, 24);
  pb.rect(1, 8, 30, 5, DW[3]); pb.hl(1, 8, 30, DW[5]); pb.rect(2, 13, 28, 9, DW[2]); pb.hl(2, 13, 28, DW[1]);
  pb.rect(4, 14, 8, 6, DW[3]); pb.rect(20, 14, 8, 6, DW[3]); pb.set(8, 17, GOLD[3]); pb.set(24, 17, GOLD[3]); pb.rect(13, 15, 6, 7, 0x140c08);
  if (!v) { pb.rect(9, 4, 14, 5, 0x5a1a12); pb.rect(10, 4, 12, 1, 0x7a2a1a); pb.vl(16, 4, 5, 0x3a0e0a); pb.rect(10, 5, 5, 3, 0xe8dcc0); pb.rect(17, 5, 5, 3, 0xe4d8b8); for (const y of [6, 7]) { pb.hl(11, y, 3, 0x6a5a40); pb.hl(18, y, 3, 0x6a5a40); } pb.rect(25, 5, 3, 3, 0x1a1a2a); pb.line(26, 5, 28, 1, 0xf0f0f0); candle(pb, 4, 4); }
  else { pb.rect(6, 4, 16, 5, 0xe4d0a0); for (let x = 7; x < 21; x++) if (valueNoise(x / 3, 2, 563) > 0.6) pb.vl(x, 5, 3, 0x8aa868); pb.line(8, 8, 19, 5, 0xa02a1a); pb.line(24, 3, 27, 8, IRON[4]); pb.line(28, 3, 27, 8, IRON[4]); candle(pb, 3, 4); }
  pb.outline('auto');
  return mk(pb, 16, 22, { lights: [[v ? 3 : 4, 2]] });
}
function coffreM() { // le coffre central : un coffre-fort d'acier riveté, la serrure à molette dorée
  const pb = new PB(18, 24);
  pb.rect(1, 4, 16, 18, IRON[2]); pb.hl(1, 4, 16, IRON[4]); pb.vl(1, 4, 18, IRON[3]); pb.vl(16, 4, 18, IRON[1]); pb.rect(1, 1, 16, 4, IRON[3]); pb.hl(1, 1, 16, IRON[5]);
  for (const [x, y] of [[3, 6], [14, 6], [3, 19], [14, 19], [8, 6], [8, 19]]) pb.set(x, y, IRON[5]);
  pb.rect(4, 8, 10, 10, IRON[1]); pb.disc(9, 13, 3.4, IRON[3]); pb.disc(9, 13, 2.4, GOLD[2]); pb.set(8, 12, GOLD[4]); pb.vl(9, 10, 2, GOLD[3]);
  pb.rect(14, 11, 2, 5, GOLD[1]); pb.rect(2, 22, 3, 2, IRON[0]); pb.rect(13, 22, 3, 2, IRON[0]);
  pb.outline('auto');
  return mk(pb, 9, 22);
}
function caveLiqueurs(v) { const pb = new PB(16, 30); pb.rect(1, 2, 14, 26, DW[2]); pb.hl(1, 2, 14, DW[4]); pb.rect(0, 0, 16, 3, DW[3]); pb.rect(3, 5, 10, 10, 0x2a1a14); for (const [x, c] of [[4, 0x6a1a1a], [6, 0x2a5a2a], [8, 0xc8902a], [10, 0x5a2a6a]]) { pb.rect(x, 9, 2, 6, c); pb.set(x, 8, c); pb.set(x, 7, 0x1a1210); } pb.hl(3, 15, 10, DW[4]); pb.rect(3, 17, 10, 9, v ? DW[3] : DW[1]); pb.set(8, 21, GOLD[3]); pb.rect(1, 28, 14, 2, DW[1]); pb.outline('auto'); return mk(pb, 8, 28); }
function tableOffice() { // la table de travail de l'office : le pain, le couteau, les légumes, une jatte
  const pb = new PB(30, 18);
  pb.rect(1, 4, 28, 6, 0xb89a6a); pb.hl(1, 4, 28, 0xd8ba8a); pb.hl(1, 9, 28, 0x8a6a42); for (let x = 3; x < 28; x += 7) pb.vl(x, 5, 4, 0xa88a5a);
  for (const x of [2, 26]) pb.rect(x, 10, 2, 7, 0x6a4a2a);
  pb.ellipse(7, 4, 4, 2, 0xc8883a); pb.hl(5, 3, 4, 0xe0a85a); pb.line(12, 5, 17, 5, IRON[4]); pb.rect(17, 5, 3, 1, DW[2]);
  pb.ellipse(23, 4, 3.5, 1.8, 0xe8e0d0); pb.disc(22, 3, 1, 0xd8603a); pb.disc(24, 3, 1, 0x6a9a3a);
  pb.outline('auto');
  return mk(pb, 15, 16);
}
function applique(v) { // une applique murale à deux bougies (dessinée sur le mur, sous les personnages)
  const pb = new PB(14, 16);
  pb.rect(5, 6, 4, 6, v ? GOLD[2] : GOLD[1]); pb.hl(5, 6, 4, GOLD[4]); pb.line(7, 10, 2, 7, GOLD[2]); pb.line(7, 10, 12, 7, GOLD[2]);
  candle(pb, 2, 4); candle(pb, 11, 4); pb.rect(1, 7, 3, 1, GOLD[2]); pb.rect(10, 7, 3, 1, GOLD[2]); pb.set(7, 12, GOLD[1]);
  pb.outline('auto');
  return mk(pb, 7, 15 + 18, { lights: [[2, 2], [11, 2]] });
}
function chaiseM(v) { // une chaise dorée : 0 face, 1 de dos, 2 vers la droite, 3 vers la gauche
  const pb = new PB(12, 16), C = VELVET.v;
  if (v < 2) { pb.rect(2, 1, 8, 7, GOLD[2]); pb.rect(3, 2, 6, 5, v ? GOLD[1] : C[2]); pb.rect(1, 8, 10, 3, C[3]); pb.hl(1, 8, 10, C[4]); pb.rect(1, 11, 2, 4, GOLD[1]); pb.rect(9, 11, 2, 4, GOLD[1]); }
  else { const X = (x) => (v === 3 ? 11 - x : x); for (let y = 1; y < 14; y++) pb.set(X(2), y, GOLD[2]); for (let y = 2; y < 8; y++) pb.set(X(3), y, C[2]); for (let x = 2; x < 10; x++) { pb.set(X(x), 8, C[4]); pb.set(X(x), 9, C[3]); } for (const x of [2, 9]) for (let y = 10; y < 15; y++) pb.set(X(x), y, GOLD[1]); }
  pb.outline('auto');
  return mk(pb, 6, 14);
}

// ------------------------------------------------------------------ le quartier de la demeure
const STN = [0x5a5650, 0x7a766c, 0x9a958a, 0xb8b3a6, 0xd6d1c4];
function murJardin(v) { // le mur de la cour : un bahut de pierre, une grille de fer forgé et ses pointes dorées (0 en long, 1 en travers, 2 pilier)
  const pb = new PB(16, 30);
  if (v === 2) { pb.rect(2, 4, 12, 24, STN[2]); pb.vl(2, 4, 24, STN[3]); pb.vl(13, 4, 24, STN[1]); pb.rect(1, 1, 14, 4, STN[3]); pb.hl(1, 1, 14, STN[4]); pb.disc(8, 0, 2, STN[3]); pb.rect(1, 27, 14, 2, STN[0]); pb.outline('auto'); return mk(pb, 8, 28); }
  if (v === 0) {
    pb.rect(0, 20, 16, 8, STN[2]); pb.hl(0, 20, 16, STN[4]); pb.hl(0, 27, 16, STN[0]); for (let x = 0; x < 16; x += 8) pb.vl(x, 21, 6, STN[1]);
    pb.hl(0, 6, 16, IRON[2]); pb.hl(0, 17, 16, IRON[2]);
    for (let x = 1; x < 16; x += 3) { pb.vl(x, 4, 16, IRON[1]); pb.set(x, 3, GOLD[3]); pb.set(x, 2, GOLD[2]); }
    pb.outline('auto'); return mk(pb, 8, 28);
  }
  pb.rect(4, 2, 8, 26, STN[2]); pb.vl(4, 2, 26, STN[3]); pb.vl(11, 2, 26, STN[1]); pb.hl(4, 2, 8, STN[4]);
  for (let y = 4; y < 26; y += 4) pb.hl(5, y, 6, STN[1]);
  pb.vl(7, 0, 4, IRON[1]); pb.set(7, 0, GOLD[3]);
  pb.outline('auto'); return mk(pb, 8, 28);
}
function balustrade(v) { // la balustrade de la terrasse, sur la baie : des balustres de pierre claire, une main courante
  const pb = new PB(16, 20);
  if (!v) { pb.rect(5, 2, 6, 17, STN[3]); pb.vl(5, 2, 17, STN[4]); pb.vl(10, 2, 17, STN[1]); for (let y = 5; y < 18; y += 4) { pb.hl(4, y, 8, STN[2]); pb.set(4, y, STN[3]); } pb.hl(5, 2, 6, STN[4]); }
  else { pb.rect(0, 2, 16, 3, STN[3]); pb.hl(0, 2, 16, STN[4]); for (let x = 1; x < 16; x += 4) { pb.rect(x, 5, 2, 10, STN[2]); pb.set(x, 8, STN[4]); } pb.rect(0, 15, 16, 3, STN[1]); }
  pb.outline('auto'); return mk(pb, 8, 18);
}
function portail() { // le portail de la demeure, sur la rue des Corsaires : deux piliers et leurs lanternes, les grilles ouvertes
  const pb = new PB(50, 48);
  for (const x0 of [0, 37]) {
    pb.rect(x0 + 1, 14, 12, 32, STN[2]); pb.vl(x0 + 1, 14, 32, STN[3]); pb.vl(x0 + 12, 14, 32, STN[1]);
    for (let y = 18; y < 44; y += 6) pb.hl(x0 + 2, y, 10, STN[1]);
    pb.rect(x0, 11, 14, 4, STN[3]); pb.hl(x0, 11, 14, STN[4]); pb.rect(x0, 44, 14, 3, STN[0]);
    pb.rect(x0 + 4, 3, 6, 8, IRON[1]); pb.rect(x0 + 5, 4, 4, 6, 0xffd070); pb.set(x0 + 6, 5, 0xfff2b0); pb.hl(x0 + 3, 2, 8, IRON[2]); pb.set(x0 + 7, 1, IRON[3]); // la lanterne
    pb.rect(x0 + 5, 26, 4, 5, 0x9a1e26); pb.vl(x0 + 7, 27, 3, GOLD[3]); // l'écusson de Valdorne
  }
  for (const [x0, dir] of [[13, 1], [36, -1]]) for (let i = 0; i < 6; i++) { const x = x0 + i * dir; pb.vl(x, 22 + i, 20 - i, IRON[1]); pb.set(x, 21 + i, GOLD[3]); } // les grilles, rabattues contre les piliers
  for (const x of [14, 35]) { pb.hl(Math.min(x, x - 5 * (x > 20 ? 1 : -1)), 30, 6, IRON[2]); }
  pb.outline('auto');
  return mk(pb, 25, 46, { lights: [[7, 6], [44, 6]] });
}
function topiaire(v) { // un if taillé en cône (0) ou en boule (1), dans un bac de pierre
  const pb = new PB(16, 30);
  pb.rect(3, 23, 10, 6, STN[2]); pb.hl(3, 23, 10, STN[4]); pb.hl(3, 28, 10, STN[0]);
  if (!v) { for (let y = 2; y < 23; y++) { const w = Math.round((y - 1) * 0.3); pb.hl(8 - w, y, w * 2 + 1, y % 4 === 0 ? LEAF[1] : LEAF[2 + ((y >> 2) % 2)]); } pb.vl(8 - 1, 3, 12, LEAF[4]); }
  else { pb.blob(8, 13, 6.5, 7, LEAF, {}); pb.vl(8, 20, 3, WOOD[2]); }
  pb.outline('auto');
  return mk(pb, 8, 28);
}
export function extendHeistQuartier(env) {
  env.mur_jardin = many(murJardin, 3); env.balustrade = many(balustrade, 2); env.portail = [portail()]; env.topiaire = many(topiaire, 2);
}

// ------------------------------------------------------------------ l'entrepôt, l'atelier, la cave
function rayonE(v) { // un rayonnage de magasin : des montants de bois, trois étagères chargées de caisses, de sacs, de jarres
  const pb = new PB(32, 42);
  for (const x of [1, 30]) { pb.rect(x, 0, 2, 41, WOOD[2]); pb.vl(x, 0, 41, WOOD[3]); }
  for (const y of [12, 25, 38]) { pb.rect(1, y, 31, 2, WOOD[3]); pb.hl(1, y, 31, WOOD[4]); }
  const fill = (y0, k) => { let x = 3; while (x < 29) { const r = hash2(x, y0 + v * 7, 591 + k); const w = r < 0.4 ? 8 : r < 0.7 ? 6 : 5;
    if (x + w > 29) break;
    if (r < 0.4) { pb.rect(x, y0 - 8, w - 1, 8, WOOD[3]); pb.hl(x, y0 - 8, w - 1, WOOD[4]); pb.vl(x, y0 - 8, 8, WOOD[2]); pb.set(x + 3, y0 - 4, 0x8a1a1a); } // une caisse marquée
    else if (r < 0.7) { pb.blob(x + 2.5, y0 - 3.5, 3, 3.5, [0x6a5a3a, 0x8a7a52, 0xa8986a, 0xc4b488], {}); } // un sac
    else { pb.rect(x, y0 - 7, w - 1, 7, 0x8a5a3a); pb.rect(x + 1, y0 - 9, w - 3, 2, 0x6a4a2a); pb.hl(x, y0 - 5, w - 1, 0xa87a4a); } // une jarre
    x += w; } };
  fill(12, 0); fill(25, 1); fill(38, 2);
  pb.outline('auto');
  return mk(pb, 16, 40);
}
function balance() { const pb = new PB(16, 30); pb.rect(2, 22, 12, 6, IRON[2]); pb.hl(2, 22, 12, IRON[4]); pb.vl(8, 4, 18, IRON[3]); pb.hl(1, 4, 14, IRON[3]); for (const x of [2, 14]) { pb.vl(x, 5, 6, IRON[1]); pb.ellipse(x, 12, 3, 1.2, GOLD[2]); } pb.disc(8, 3, 1.5, GOLD[3]); pb.rect(4, 25, 8, 2, 0x1a1a22); pb.outline('auto'); return mk(pb, 8, 28); }
function diable() { const pb = new PB(14, 22); pb.line(3, 1, 4, 19, IRON[3], 1.4); pb.line(10, 1, 11, 19, IRON[3], 1.4); pb.hl(4, 6, 6, IRON[2]); pb.hl(4, 12, 7, IRON[2]); pb.rect(3, 18, 10, 2, IRON[4]); pb.disc(3, 19, 2, IRON[1]); pb.disc(11, 19, 2, IRON[1]); pb.rect(4, 8, 7, 9, WOOD[3]); pb.hl(4, 8, 7, WOOD[5]); pb.outline('auto'); return mk(pb, 7, 21); }
function guichet() { // le guichet du receveur : un comptoir de bois, le registre, le tampon, l'encrier, une grille
  const pb = new PB(48, 30);
  pb.rect(0, 12, 48, 16, WOOD[2]); pb.hl(0, 12, 48, WOOD[4]); pb.rect(0, 10, 48, 3, WOOD[3]); pb.hl(0, 10, 48, WOOD[5]);
  for (let x = 4; x < 48; x += 11) { pb.rect(x, 15, 8, 10, WOOD[3]); pb.hl(x, 15, 8, WOOD[4]); }
  for (let x = 2; x < 46; x += 4) pb.vl(x, 0, 10, IRON[2]); pb.hl(1, 0, 46, IRON[3]); pb.rect(18, 2, 12, 8, -1);
  for (let x = 18; x < 30; x++) for (let y = 0; y < 10; y++) pb.clear(x, y); // le passe-documents
  pb.rect(20, 7, 8, 3, 0xe8dcc0); pb.rect(9, 8, 3, 2, 0xb02a1a); pb.rect(35, 8, 3, 2, 0x1a1a2a);
  pb.outline('auto');
  return mk(pb, 24, 28);
}
function palan() { // le palan : une poulie à la poutre, la corde, le crochet, et une caisse qui pend au-dessus de l'allée
  const pb = new PB(30, 56);
  pb.rect(0, 0, 30, 3, WOOD[2]); pb.hl(0, 0, 30, WOOD[4]); pb.disc(15, 5, 3, IRON[3]); pb.set(14, 4, IRON[5]);
  pb.vl(14, 7, 26, 0xa08048); pb.vl(17, 7, 22, 0x8a6a3a);
  pb.line(14, 33, 8, 38, 0xa08048); pb.line(14, 33, 22, 38, 0xa08048);
  pb.rect(7, 38, 16, 12, WOOD[3]); pb.hl(7, 38, 16, WOOD[5]); pb.rect(7, 38, 2, 12, WOOD[2]); pb.rect(21, 38, 2, 12, WOOD[2]); pb.line(9, 48, 21, 40, WOOD[2]); pb.set(15, 44, 0x8a1a1a);
  pb.outline('auto');
  return mk(pb, 15, 84, { over: 1 });
}
function lanterneP(v) { // une lanterne pendue à sa chaîne (au-dessus des têtes)
  const pb = new PB(12, 24); pb.vl(6, 0, 10, IRON[2]); pb.rect(3, 10, 6, 2, IRON[3]); pb.rect(3, 12, 6, 8, IRON[1]); pb.rect(4, 13, 4, 6, v ? 0xffc860 : 0xffd070); pb.set(5, 14, 0xfff2b0); pb.rect(2, 20, 8, 2, IRON[2]); pb.set(6, 22, IRON[3]); pb.outline('auto');
  return mk(pb, 6, 62, { light: [6, 16], over: 1 });
}
function tableDessin() { // la table à dessin de l'architecte : le plateau incliné, un plan de façade, la règle, l'équerre, la bougie
  const pb = new PB(32, 26);
  pb.line(4, 25, 7, 12, WOOD[2], 1.6); pb.line(27, 25, 24, 12, WOOD[2], 1.6); pb.hl(5, 20, 22, WOOD[2]);
  for (let y = 2; y < 14; y++) pb.hl(2 + Math.floor((14 - y) / 4), y, 28 - Math.floor((14 - y) / 2), y === 2 ? WOOD[5] : WOOD[4]);
  pb.rect(5, 3, 22, 9, 0xe8dcc0); for (let x = 7; x < 25; x += 4) pb.vl(x, 5, 6, 0x5a7aa8); pb.hl(6, 5, 20, 0x5a7aa8); pb.line(8, 11, 24, 4, 0xa04a2a);
  pb.hl(3, 13, 26, WOOD[3]); pb.line(20, 4, 27, 12, 0xc8c8d0); pb.rect(0, 9, 3, 3, 0xf3f0e2); pb.set(1, 8, 0xffd24a);
  pb.outline('auto');
  return mk(pb, 16, 24, { lights: [[1, 7]] });
}
function maquetteG() { // sur sa table, la maquette de la demeure Valdorne (le portique, les deux ailes) — Lafleur l'a presque achevée
  const pb = new PB(32, 26);
  pb.rect(1, 14, 30, 4, WOOD[3]); pb.hl(1, 14, 30, WOOD[5]); for (const x of [2, 28]) pb.rect(x, 18, 2, 7, WOOD[2]);
  pb.rect(4, 6, 24, 9, 0xe8e0d0); pb.hl(4, 6, 24, 0xf8f4ec); for (let x = 6; x < 27; x += 4) pb.rect(x, 9, 2, 3, 0x2a3a5a);
  for (let y = 1; y < 6; y++) pb.hl(16 - y * 2, 6 - y, y * 4, 0x2a6a5a); pb.rect(14, 10, 4, 5, 0x6a4a2a); pb.rect(3, 14, 26, 1, 0x4a8a3a);
  pb.set(16, 0, 0xc83a3a); pb.rect(22, 2, 6, 3, 0xe8dcc0); // le cartel « Valdorne »
  pb.outline('auto');
  return mk(pb, 16, 24);
}
function trappe() { // la trappe de la cave, dans le plancher : ses planches, ses pentures, son anneau
  const pb = new PB(16, 16);
  pb.rect(0, 0, 16, 16, 0x1a100a); pb.rect(1, 1, 14, 14, WOOD[2]); for (let x = 2; x < 15; x += 4) { pb.rect(x, 2, 3, 12, WOOD[3]); pb.vl(x, 2, 12, WOOD[4]); } pb.hl(1, 1, 14, WOOD[4]);
  for (const y of [4, 11]) { pb.hl(2, y, 12, IRON[3]); pb.set(2, y, IRON[5]); pb.set(13, y, IRON[5]); } pb.disc(8, 8, 2.4, IRON[4]); pb.disc(8, 8, 1.2, WOOD[2]); pb.set(7, 7, IRON[5]);
  return mk(pb, 8, 15);
}
function casierVin() { const pb = new PB(32, 34); pb.rect(0, 0, 32, 33, WOOD[1]); pb.hl(0, 0, 32, WOOD[3]); for (let y = 3; y < 31; y += 6) for (let x = 2; x < 30; x += 6) { pb.disc(x + 2, y + 2, 2.2, 0x1a1210); pb.disc(x + 2, y + 2, 1.4, hash2(x, y, 601) > 0.3 ? 0x2a4a2a : 0x1a1210); if (hash2(x, y, 602) > 0.6) pb.set(x + 1, y + 1, 0x6a8a6a); } pb.outline('auto'); return mk(pb, 16, 32); }
function echelle() { const pb = new PB(14, 44); for (const x of [2, 11]) { pb.vl(x, 0, 43, WOOD[3]); pb.vl(x + 1, 0, 43, WOOD[1]); } for (let y = 4; y < 43; y += 6) pb.hl(3, y, 8, WOOD[4]); pb.outline('auto'); return mk(pb, 7, 42); }
function grilleEgout() { const pb = new PB(16, 16); pb.ellipse(8, 8, 7, 5, 0x1a1a1e); for (let x = 3; x < 14; x += 2) pb.vl(x, 4, 8, IRON[3]); pb.ellipse(8, 8, 7, 5, -1); for (let a = 0; a < 6.28; a += 0.2) pb.set(8 + Math.cos(a) * 7, 8 + Math.sin(a) * 5, IRON[2]); pb.set(6, 12, 0x3a5a3a); pb.set(10, 3, 0x3a5a3a); return mk(pb, 8, 14); }
// ------------------------------------------------------------------ les toits
function chemineeT(v) { // une souche de cheminée : briques, le chapeau de tôle, la fumée
  const pb = new PB(16, 30), B = v === 1 ? [0x3a3a44, 0x4e4e5a, 0x626270, 0x787886] : [0x5a2a1a, 0x7a3a24, 0x9a4a2e, 0xb05a38];
  pb.rect(2, 6, 12, 22, B[2]); for (let y = 6; y < 28; y += 3) { pb.hl(2, y, 12, B[1]); for (let x = 2 + ((y / 3) % 2) * 3; x < 14; x += 6) pb.set(x, y + 1, B[1]); }
  pb.vl(2, 6, 22, B[3]); pb.vl(13, 6, 22, B[0]); pb.rect(1, 3, 14, 4, B[3]); pb.hl(1, 3, 14, 0xc8a080);
  pb.rect(4, 0, 3, 4, IRON[2]); pb.rect(9, 1, 3, 3, IRON[2]);
  pb.outline('auto');
  return mk(pb, 8, 28, { smoke: { x: 6, y: 0 } });
}
function lucarne(v) { // une lucarne : une petite fenêtre sous son toit pointu, sur la pente du toit
  const pb = new PB(18, 22), R = v ? [0x1c2028, 0x262c38, 0x323a4a, 0x404a5c] : [0x5a1a16, 0x7e2a20, 0xa03c2a, 0xbc5236];
  pb.rect(3, 9, 12, 12, 0xd8d0c0); pb.rect(5, 11, 8, 8, v ? 0xe0a050 : 0x2a3e58); pb.vl(9, 11, 8, 0x5a4a3a); pb.hl(5, 15, 8, 0x5a4a3a);
  for (let y = 0; y < 10; y++) pb.hl(9 - y, y + 1, y * 2 + 1, R[1 + (y % 3)]);
  pb.outline('auto');
  return mk(pb, 9, 20, v ? { lights: [[9, 15]] } : {});
}
function cordeLinge(v) { // du linge tendu d'un mur à l'autre (au-dessus des têtes)
  const pb = new PB(64, 20);
  for (let x = 0; x < 64; x++) pb.set(x, 3 + Math.round(Math.sin((x / 63) * Math.PI) * 4), 0x8a7a5a);
  const C = v ? [0xd8d0c0, 0x6a8ab0, 0xc85a4a, 0xe8e0d0, 0x5a8a5a] : [0xe8e0d0, 0xc8a040, 0x5a6a9a, 0xd8d0c0, 0xa84a6a];
  [[6, 6, 8], [17, 5, 9], [30, 7, 7], [41, 6, 9], [53, 5, 7]].forEach(([x, w, h], k) => { const y = 4 + Math.round(Math.sin((x / 63) * Math.PI) * 4); pb.rect(x, y, w, h, C[k]); pb.hl(x, y + h - 1, w, shade(C[k], 0.75)); pb.set(x + 1, y, 0x5a4a3a); });
  pb.outline('auto');
  return mk(pb, 32, 60, { over: 1 });
}
function passerelle() { // une passerelle de planches jetée sur la ruelle, avec sa corde en guise de rampe
  const pb = new PB(48, 16);
  for (let x = 0; x < 48; x += 6) { pb.rect(x, 4, 5, 9, WOOD[3]); pb.hl(x, 4, 5, WOOD[5]); pb.vl(x + 4, 4, 9, WOOD[1]); }
  pb.hl(0, 13, 48, WOOD[0]); for (const y of [2, 14]) for (let x = 0; x < 48; x++) pb.set(x, y + Math.round(Math.sin((x / 47) * Math.PI) * 1), 0x8a7a5a);
  return mk(pb, 24, 14);
}
// ------------------------------------------------------------------ La Mouche d'Or
function matP(v) { // le pied d'un mât : le fût cerclé de fer, le râtelier des cabillots, les glènes
  const pb = new PB(26, 40);
  pb.ellipse(13, 34, 12, 4, WOOD[2]); pb.ellipse(13, 33, 11, 3, WOOD[3]); for (let a = 0; a < 6.28; a += 0.5) pb.vl(13 + Math.cos(a) * 10, 30 + Math.sin(a) * 3, 3, WOOD[4]);
  pb.cyl(9, 0, 8, 34, WOOD, { noise: 0.1 }); for (const y of [6, 16, 26]) pb.hl(9, y, 8, IRON[3]);
  pb.ellipse(5, 36, 3, 1.5, 0xa08048); pb.ellipse(21, 37, 3, 1.5, 0xa08048);
  if (v) pb.rect(11, 18, 4, 3, 0xd8a040);
  pb.outline('auto');
  return mk(pb, 13, 36);
}
function vergue(v) { // le gréement d'un mât, vu d'en haut : la vergue et sa voile serrée, la hune, les haubans (au-dessus des têtes)
  const H = 232, pb = new PB(46, H), cx = 23;
  for (const [x1, y1] of [[2, 14], [44, 14], [2, H - 10], [44, H - 10]]) pb.line(cx, H / 2, x1, y1, 0x6a5a3a);
  pb.rect(cx - 3, 6, 6, H - 12, WOOD[2]); pb.vl(cx - 3, 6, H - 12, WOOD[3]); pb.vl(cx + 2, 6, H - 12, WOOD[1]);
  for (let y = 10; y < H - 12; y++) { const b = Math.sin((y - 10) / 3) * 0.6; pb.hl(cx - 5 + Math.round(b), y, 10, (y % 22) < 2 ? 0x8a7a5a : y % 3 ? 0xe4dac2 : 0xd0c4a8); pb.set(cx - 5 + Math.round(b), y, 0xb8ac90); pb.set(cx + 4 + Math.round(b), y, 0xf4ecd8); } // la voile serrée sur sa vergue, et ses rabans
  pb.disc(cx, H / 2, 7, WOOD[1]); pb.disc(cx, H / 2, 6, WOOD[3]); pb.disc(cx, H / 2, 2, WOOD[0]);
  if (v) { pb.rect(cx + 6, H / 2 - 18, 14, 9, 0x101010); pb.disc(cx + 13, H / 2 - 14, 2, 0xf0e8d8); } // la flamme de Silas, au grand mât
  pb.outline('auto');
  return mk(pb, cx, H + 40, { over: 1 });
}
function barre() { const pb = new PB(22, 28); pb.rect(9, 14, 4, 12, WOOD[2]); pb.rect(6, 24, 10, 3, WOOD[1]); for (let a = 0; a < 6.28; a += 0.785) pb.line(11, 10, 11 + Math.cos(a) * 10, 10 + Math.sin(a) * 9, WOOD[3]); pb.ellipse(11, 10, 7, 6.4, WOOD[4]); pb.ellipse(11, 10, 5.5, 5, -1); for (let a = 0; a < 6.28; a += 0.05) pb.set(11 + Math.cos(a) * 7, 10 + Math.sin(a) * 6.4, WOOD[4]); pb.disc(11, 10, 2, GOLD[2]); pb.outline('auto'); return mk(pb, 11, 26); }
function ecoutille() { const pb = new PB(32, 32); pb.rect(0, 0, 32, 32, WOOD[1]); pb.rect(2, 2, 28, 28, WOOD[2]); for (let x = 4; x < 29; x += 4) pb.vl(x, 3, 26, 0x1a120c); for (let y = 4; y < 29; y += 4) pb.hl(3, y, 26, 0x1a120c); pb.hl(0, 0, 32, WOOD[4]); return mk(pb, 16, 30); }
function fanal() { const pb = new PB(12, 36); pb.rect(5, 12, 2, 22, WOOD[2]); pb.rect(2, 2, 8, 10, GOLD[1]); pb.rect(3, 3, 6, 8, 0xffd070); pb.set(5, 5, 0xfff2b0); pb.rect(3, 0, 6, 2, GOLD[2]); pb.outline('auto'); return mk(pb, 6, 34, { light: [6, 7] }); }
function bastingage(v) { // le bastingage de tribord, au premier plan : la lisse, les jambettes ; v2 : le couronnement de la poupe
  const pb = new PB(16, 14);
  pb.rect(0, 0, 16, 3, WOOD[3]); pb.hl(0, 0, 16, WOOD[5]); pb.rect(0, 9, 16, 4, WOOD[2]); pb.hl(0, 12, 16, WOOD[0]);
  for (const x of v === 1 ? [1, 14] : [6]) pb.rect(x, 3, 2, 6, WOOD[2]);
  if (v === 1) pb.disc(8, 6, 1.5, IRON[3]); // un sabord (fermé)
  if (v === 2) { pb.rect(12, 0, 4, 13, WOOD[3]); pb.vl(15, 0, 13, WOOD[1]); }
  return mk(pb, 8, 12);
}
function clocheB() { const pb = new PB(14, 26); pb.rect(1, 2, 12, 2, WOOD[3]); pb.vl(2, 4, 20, WOOD[2]); pb.vl(11, 4, 20, WOOD[2]); pb.blob(7, 11, 4, 5, GOLD, {}); pb.rect(3, 15, 8, 2, GOLD[1]); pb.vl(7, 17, 4, 0x8a7a5a); pb.rect(1, 23, 12, 2, WOOD[1]); pb.outline('auto'); return mk(pb, 7, 24); }
function cordageP(v) { const pb = new PB(18, 12); for (let r = 6; r > 0; r -= 1.5) pb.ellipse(9, 6, r * 1.3, r * 0.8, r % 3 ? 0xa08048 : 0x7e6236); pb.disc(9, 6, 1, 0x3a2a1a); if (v) pb.line(14, 6, 18, 9, 0xa08048); return mk(pb, 9, 10); }
export function extendHeistLieux(env) {
  env.rayon_e = many(rayonE, 3); env.balance = [balance()]; env.diable = [diable()]; env.guichet = [guichet()]; env.palan = [palan()]; env.lanterne_p = many(lanterneP, 2);
  env.table_dessin = [tableDessin()]; env.maquette_g = [maquetteG()]; env.trappe = [trappe()]; env.casier_vin = [casierVin()]; env.echelle = [echelle()]; env.grille_egout = [grilleEgout()];
  env.cheminee_t = many(chemineeT, 3); env.lucarne = many(lucarne, 2); env.corde_linge = many(cordeLinge, 2); env.passerelle = [passerelle()];
  env.mat_p = many(matP, 2); env.vergue = many(vergue, 2); env.barre = [barre()]; env.ecoutille = [ecoutille()]; env.fanal = [fanal()]; env.bastingage = many(bastingage, 3); env.cloche_b = [clocheB()]; env.cordage_p = many(cordageP, 2);
}
export function extendHeist(env, structSpr) {
  extendHeistQuartier(env); extendHeistLieux(env);
  env.cheminee_m = [chemineeM()]; env.lustre_p = [lustreP()]; env.fauteuil = many(fauteuil, 4); env.canape = many(canape, 2);
  env.table_basse = many(tableBasse, 2); env.gueridon = many(gueridon, 2); env.buffet_m = [buffetM()]; env.colonne = [colonne()];
  env.console_m = many(consoleM, 2); env.clavecin = [clavecin()]; env.harpe = [harpe()]; env.estrade_m = [estradeM()];
  env.horloge = many(horloge, 2); env.vestiaire_m = [vestiaireM()]; env.buste = many(buste, 2); env.statue_m = [statueM()];
  env.vitrine = many(vitrine, 2); env.armure = many(armure, 2); env.banquette = [banquette()]; env.rayonnage = many(rayonnage, 4);
  env.bureau_m = many(bureauM, 2); env.coffre_m = [coffreM()]; env.cave_liqueurs = many(caveLiqueurs, 2); env.table_office = [tableOffice()];
  env.applique = many(applique, 2); env.chaise_m = many(chaiseM, 4);
  if (structSpr) { env.candelabre = [structSpr.lustre[0], structSpr.lustre[0], structSpr.lustre[0]]; env.globe_m = structSpr.globe; }
}
