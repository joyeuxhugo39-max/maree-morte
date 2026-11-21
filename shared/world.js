// Génération déterministe de l'archipel. Exécutée à l'identique par le serveur
// (collisions, apparitions) et par le client (rendu, prédiction).
import { TILE, MAP_W as W, MAP_H as H, OVER_H, T } from './constants.js';
import { mulberry32, hash2, valueNoise, fbm, shuffle } from './rng.js';
import { buildHeist } from './heist-world.js'; // lot 5 : le monde du Plus Grand Braquage
import { buildFest } from './festival-world.js'; // lot 6 : la Nuit des Mille Voiles

export const Z = { SEA: 0, TOWN: 1, BEACH: 2, PLAINS: 3, JUNGLE: 4, RUINS: 5, SWAMP: 6, WRECK: 7, HAVRE: 8, CRANE: 9, ILOT: 10, INTERIOR: 11, CAVE: 12, GOUFFRE: 13,
  RADE: 14, COLLINES: 15, PENDUS: 16, SIRENES: 17, ANSE: 18, OSSEMENTS: 19, QUARANTAINE: 20, VOLCAN: 21, DAMNES: 22, BRUMES: 23, ERMITE: 24,
  LIBERTALIA: 25, BASFONDS: 26, HAUTS: 27, CANNAIES: 28, BAIE: 29, MANGROVE: 30, ECARLATE: 31, HEIST: 32, SEPT: 33, FETE: 34, LICE: 35 };
export const SAFE = new Set([1, 8, 11, 14, 18, 25, 33, 34]); // lot 5 : l'île aux Sept Courants est un comptoir ; lot 6 : le parcours du gabier
export const ZONES = [
  { name: 'Haute mer', lvl: 'Eaux profondes' },
  { name: 'Port-Lanterne', lvl: 'Zone sûre', safe: true },
  { name: 'Plage des Os Blanchis', lvl: 'Niveaux 1-3' },
  { name: 'Prairie des Murmures', lvl: 'Niveaux 2-4' },
  { name: 'Jungle de Brumesel', lvl: 'Niveaux 3-6' },
  { name: 'Ruines du Temple Englouti', lvl: 'Niveaux 5-7' },
  { name: 'Marais des Noyés', lvl: 'Niveaux 6-9' },
  { name: "Crique de l'Épave", lvl: 'Niveaux 8-12' },
  { name: 'Havre-des-Brumes', lvl: 'Zone sûre', safe: true },
  { name: 'Île au Crâne', lvl: 'Niveaux 9-12' },
  { name: 'Îlots perdus', lvl: 'Niveaux 3-8' },
  { name: 'Intérieur', lvl: 'Zone sûre', safe: true },
  { name: 'Grotte', lvl: 'Danger' },
  { name: 'Gouffre du Kraken', lvl: 'Niveaux 10-14' },
  { name: 'Rade-aux-Flibustiers', lvl: 'Zone sûre', safe: true },
  { name: 'Collines de la Rade', lvl: 'Niveaux 12-15' },
  { name: 'Forêt des Pendus', lvl: 'Niveaux 14-18' },
  { name: 'Lagon des Sirènes', lvl: 'Niveaux 13-17' },
  { name: 'Anse-Tranquille', lvl: 'Zone sûre', safe: true },
  { name: 'Atoll des Ossements', lvl: 'Niveaux 16-20' },
  { name: 'Île de la Quarantaine', lvl: 'Niveaux 18-22' },
  { name: 'Volcan de Cendrelune', lvl: 'Niveaux 20-25' },
  { name: 'Île des Damnés', lvl: 'Niveaux 26-30 · Extrême', hard: true },
  { name: 'Brumes Éternelles', lvl: 'Niveaux 20-28 · Mer hantée' },
  { name: "Îlot de l'Ermite", lvl: 'Niveaux 8-12' },
  // 0.8 : l'île de Libertalia
  { name: 'Libertalia', lvl: 'Zone sûre · la Cité des forbans', safe: true },
  { name: 'Les Bas-Fonds', lvl: 'Niveaux 15-18 · Coupe-gorge la nuit' },
  { name: 'Hauts de Libertalia', lvl: 'Niveaux 20-24' },
  { name: 'Les Cannaies', lvl: 'Niveaux 13-16' },
  { name: 'Baie des Naufrageurs', lvl: 'Niveaux 18-24' },
  { name: 'Mangrove des Contrebandiers', lvl: 'Niveaux 16-22' },
  { name: 'Jungle Écarlate', lvl: 'Niveaux 22-26' },
  { name: 'Le Plus Grand Braquage', lvl: 'Niveaux 18-21' }, // lot 5 : l'entrepôt, la demeure, les toits, La Mouche d'Or
  { name: 'Île aux Sept Courants', lvl: 'Zone sûre', safe: true }, // lot 5 : hors des cartes
  { name: 'Le Parcours du gabier', lvl: 'Nuit des Mille Voiles', safe: true }, // lot 6 : le festival
  { name: 'La Lice des Capitaines', lvl: 'Duels amicaux : personne n’y meurt' }, // lot 6 : on s'y bat, mais on n'y meurt pas
];

// Propriétés partagées des décors. solid = bloque le déplacement (sur sa tuile de base).
// ground = dessiné au sol, sous les personnages.
export const PROPS = {
  palm: { solid: 1 }, tree: { solid: 1 }, jtree: { solid: 1 }, deadtree: { solid: 1 },
  bush: {}, fern: {}, reeds: {}, mushroom: {}, driftwood: {},
  rock: { solid: 1 }, pebble: { ground: 1 }, skull: { ground: 1 }, bones: { ground: 1 },
  shell: { ground: 1 }, starfish: { ground: 1 }, flower: { ground: 1 }, lily: { ground: 1 },
  grave: { solid: 1 }, cross: { solid: 1 }, crypt: { solid: 1 },
  barrel: { solid: 1 }, crate: { solid: 1 }, lamp: { solid: 1 }, torch: { solid: 1 },
  fence: { solid: 1 }, stall: { solid: 1 }, well: { solid: 1 }, brazier: { solid: 1 },
  anvil: { solid: 1 }, workbench: { solid: 1 }, bench: { solid: 1 }, sign: { solid: 1 }, cannon: { solid: 1 },
  anchor: { solid: 1 }, pillar: { solid: 1 }, ruinwall: { solid: 1 }, perch: { solid: 1 },
  chest: { solid: 1 }, tonnelet: { solid: 1 }, nets: { ground: 1 }, idol: { solid: 1 },
  house: { solid: 1 }, tavern: { solid: 1 }, forge: { solid: 1 }, lighthouse: { solid: 1 },
  comptoir: { solid: 1 }, etagere: { solid: 1 }, cheminee: { solid: 1 }, table: { solid: 1 }, chaise: {}, ratelier: { solid: 1 },
  plante: { solid: 1 }, lit_deco: { solid: 1 }, fourneau: { solid: 1 }, tapis_deco: { ground: 1 }, grotte: {}, crane_rock: { solid: 1 }, cristal: { solid: 1 }, tonneau_d: { solid: 1 },
  home: { solid: 1 }, dalle: { ground: 1 }, sceau: { solid: 1 },
  volcan: { solid: 1 }, gibet: { solid: 1 }, corail: { solid: 1 }, obelisque: { solid: 1 }, fumerolle: { ground: 1 }, tente: { solid: 1 }, barreaux: { solid: 1 }, levier: { solid: 1 }, cloche_marine: { solid: 1 },
  mannequin: { solid: 1 }, lavarock: { solid: 1 }, cage: { solid: 1 }, fort: { solid: 1 }, ruine: { solid: 1 }, totem: { solid: 1 },
  ship: { solid: 1 }, wreck: { solid: 1 }, boat: { solid: 1 },
  // 0.8 : Libertalia
  cite: { solid: 1 }, propriete: { solid: 1 }, rempart: { solid: 1 }, tour: { solid: 1 }, porte_cite: {}, fontaine: { solid: 1 }, statue: { solid: 1 }, linge: {}, drapeau: { solid: 1 }, canne: {}, jtree_r: { solid: 1 }, paletuvier: { solid: 1 },
  divan: { solid: 1 }, rideau: { solid: 1 }, table_jeu: { solid: 1 }, stalle: { solid: 1 }, trone: { solid: 1 }, banniere: { solid: 1 }, gradin: { solid: 1 }, lanterne_r: { solid: 1 },
  // lot 6 : la Nuit des Mille Voiles (rien ne bloque : la fête finie, la plage redevient la plage)
  estrade: { ground: 1 }, stand_fete: {}, tente_lice: {}, arche_fete: {}, mat_fete: {}, lampion: {}, canon_fete: {}, bouee: {}, mat_epave: {},
};

const idx = (x, y) => y * W + x;
export const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

export function generateWorld(seed = 7) {
  const N = W * H;
  const tiles = new Uint8Array(N);
  const zones = new Uint8Array(N);
  const solid = new Uint8Array(N);
  const plankDir = new Uint8Array(N); // 1 = planches verticales (pont est-ouest)
  const path = new Uint8Array(N);
  const occ = new Uint8Array(N);
  const lv = new Float32Array(N);
  const rng = mulberry32(seed * 7919 + 13);
  const TC = { x: 150, y: 96 }; // centre de Port-Lanterne

  // ---------- 1. Forme des îles ----------
  const blobs = [
    [96, 66, 66, 48], [147, 97, 32, 21], [44, 40, 30, 26], [46, 98, 32, 28],
    [150, 40, 28, 24], [174, 96, 9, 6], [112, 110, 34, 15], [70, 118, 22, 12],
    [262, 80, 24, 17], [246, 92, 10, 8], [252, 178, 22, 16], [238, 188, 9, 7], [186, 196, 9, 7], [300, 136, 8, 6],
    // 0.7 : le Grand Large
    [410, 78, 34, 25], [440, 100, 18, 13], [384, 62, 13, 11], // Île de la Rade
    [540, 52, 40, 28], [582, 80, 18, 15], [506, 34, 14, 10], // Forêt des Pendus
    [500, 160, 10, 8], [526, 148, 12, 9], [544, 170, 10, 8], [516, 186, 12, 7], [488, 178, 8, 6], // Lagon des Sirènes
    [352, 150, 11, 9], // Îlot de l'Ermite
    [150, 268, 27, 16], [174, 282, 12, 9], // Anse-Tranquille
    [70, 330, 32, 24], [44, 352, 12, 10], // Atoll des Ossements
    [300, 330, 36, 27], [332, 352, 16, 12], // Île de la Quarantaine
    [470, 330, 48, 38], [438, 354, 15, 10], [503, 302, 12, 9], // Volcan de Cendrelune : une île taillée pour une montagne
    [590, 402, 34, 26], [560, 420, 14, 10], // Île des Damnés
    [402, 204, 7, 5], [244, 262, 6, 5], [522, 252, 6, 5], [384, 402, 8, 6], [204, 404, 9, 7], [114, 414, 6, 5], // îlots
    // 0.8 : Libertalia, l'île gigantesque, et sa grande cité au sud
    [800, 236, 90, 112], [724, 152, 40, 36], [800, 116, 52, 26], [878, 148, 38, 34], [718, 312, 36, 32], [884, 316, 32, 36],
    // îlots du Détroit de Libertalia : ils équilibrent la mer de l'est et jalonnent la route
    [664, 92, 9, 7], [660, 232, 7, 5], [670, 392, 11, 8], [738, 416, 6, 5], [926, 56, 15, 10], [930, 400, 14, 10], [858, 416, 11, 8], [716, 34, 8, 6],
  ];
  const LB = { x: 800, y: 282 }; // place de la Liberté
  const LIB = { x0: 744, y0: 206, x1: 856, y1: 338 }; // le cœur de la cité (ses rues et ses maisons)
  // l'enceinte : un rempart polygonal à bastions, ouvert sur le port
  const CITY = [[740, 339], [736, 300], [737, 262], [741, 228], [752, 210], [772, 202], [800, 199], [828, 202], [848, 210], [859, 228], [863, 262], [862, 300], [859, 339]];
  const cityIn = new Uint8Array(W * OVER_H);
  for (let y = 190; y <= 339; y++) {
    const xs = [], yy = y + 0.5;
    for (let k = 0; k < CITY.length; k++) { const [ax, ay] = CITY[k], [bx, by] = CITY[(k + 1) % CITY.length]; if ((ay <= yy) !== (by <= yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) if (x >= 0 && x < W) cityIn[y * W + x] = 1;
  }
  const inLib = (x, y) => x >= 0 && y >= 0 && x < W && y < OVER_H && cityIn[y * W + x] === 1;
  const RD = { x: 408, y: 84 }, AT = { x: 150, y: 266 }, EM = { x: 352, y: 150 }, VC = { x: 470, y: 328 }, VF = { rx: 25, ry: 15 }, QC = { x: 298, y: 326 }, AO = { x: 70, y: 330 }, DM = { x: 590, y: 400 }, LG = { x: 516, y: 166 };
  const HC = { x: 262, y: 78 }; // Havre-des-Brumes
  const BC = 16, bcw = Math.ceil(W / BC), blobCells = [];
  for (let cy = 0; cy * BC < OVER_H; cy++) for (let cx = 0; cx < bcw; cx++) {
    blobCells[cy * bcw + cx] = blobs.filter(([bx, by, rx, ry]) => bx + 2 * rx >= cx * BC && bx - 2 * rx <= cx * BC + BC && by + 2 * ry >= cy * BC && by - 2 * ry <= cy * BC + BC);
  }
  function landValue(x, y) {
    let v = -1;
    for (const [bx, by, rx, ry] of blobCells[((y / BC) | 0) * bcw + ((x / BC) | 0)]) {
      const dx = (x - bx) / rx, dy = (y - by) / ry;
      if (dx > 2 || dx < -2 || dy > 2 || dy < -2) continue; // trop loin : ne change rien
      const d = 1 - Math.sqrt(dx * dx + dy * dy);
      if (d > v) v = d;
    }
    if (v < -0.62) return v; // pleine mer : le bruit ne ferait pas émerger de terre
    v += (fbm(x / 20, y / 20, seed, 4) - 0.5) * 0.6;
    for (const [cx, cy, rx, ry, k] of [[70, 327, 17, 11, 1.4], [516, 166, 11, 8, 1.6]]) { // lagons de l'atoll et des sirènes
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      const d = 1 - Math.sqrt(dx * dx + dy * dy);
      if (d > 0) v -= d * k;
    }
    for (const [cx, cy, r] of [[RD.x, RD.y, 14], [AT.x, AT.y, 12], [EM.x, EM.y, 6]]) { // les villes restent sur la terre ferme
      const dx = x - cx, dy = (y - cy) * 1.25;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < r) v = Math.max(v, 0.3 * (1 - d / r) + 0.1);
    }
    { // baie de l'épave
      const dx = (x - 27) / 13, dy = (y - 27) / 11;
      const d = 1 - Math.sqrt(dx * dx + dy * dy);
      if (d > 0) v -= d * 1.2;
    }
    { // la ville reste sur la terre ferme
      const dx = x - TC.x, dy = (y - TC.y) * 1.25;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 14) v = Math.max(v, 0.32 * (1 - d / 14) + 0.1);
    }
    {
      const dx = x - HC.x, dy = (y - HC.y) * 1.25;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 13) v = Math.max(v, 0.3 * (1 - d / 13) + 0.1);
    }
    if (inLib(x, y)) v = Math.max(v, 0.32); // la cité repose sur la terre ferme
    { // la rade de Libertalia : une baie profonde au pied de la ville
      const dx = (x - 800) / 46, dy = (y - 358) / 18;
      const d = 1 - Math.sqrt(dx * dx + dy * dy);
      if (d > 0 && y > LIB.y1) v -= d * 1.8;
    }
    const e = Math.min(x, y, W - 1 - x, OVER_H - 1 - y);
    if (e < 12) v -= (12 - e) * 0.07;
    return v;
  }

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y), v = y >= OVER_H ? -1 : landValue(x, y);
    lv[i] = v;
    tiles[i] = v < -0.13 ? T.DEEP : v < 0 ? T.WATER : T.GRASS;
  }

  // ---------- 2. Régions / biomes ----------
  const regions = [
    [Z.BEACH, 106, 116, 1.05], [Z.BEACH, 72, 124, 1], [Z.BEACH, 130, 118, 0.85],
    [Z.PLAINS, 118, 84, 1], [Z.PLAINS, 132, 68, 0.9],
    [Z.JUNGLE, 104, 44, 1.1], [Z.JUNGLE, 152, 40, 1.1], [Z.JUNGLE, 78, 56, 0.95],
    [Z.RUINS, 126, 25, 0.6],
    [Z.SWAMP, 44, 98, 1.1], [Z.SWAMP, 30, 72, 0.95], [Z.SWAMP, 62, 84, 0.75],
    [Z.WRECK, 40, 34, 0.95],
    [Z.HAVRE, 262, 80, 1.3], [Z.CRANE, 250, 180, 1.2], [Z.ILOT, 186, 196, 0.6], [Z.ILOT, 300, 136, 0.6],
    [Z.COLLINES, 412, 66, 1.2], [Z.COLLINES, 442, 98, 0.9], [Z.COLLINES, 384, 62, 0.8], [Z.COLLINES, 396, 96, 0.9],
    [Z.PENDUS, 540, 52, 1.5], [Z.PENDUS, 582, 80, 1], [Z.PENDUS, 506, 34, 0.9],
    [Z.SIRENES, 516, 168, 1.4], [Z.ERMITE, 352, 150, 0.9], [Z.ANSE, 152, 270, 1.4],
    [Z.OSSEMENTS, 70, 330, 1.5], [Z.OSSEMENTS, 44, 352, 0.8],
    [Z.QUARANTAINE, 300, 330, 1.5], [Z.QUARANTAINE, 332, 352, 0.9],
    [Z.VOLCAN, 470, 330, 2.4], [Z.DAMNES, 590, 402, 1.5], [Z.DAMNES, 560, 420, 0.9],
    [Z.ILOT, 402, 204, 0.5], [Z.ILOT, 244, 262, 0.5], [Z.ILOT, 522, 252, 0.5], [Z.ILOT, 384, 402, 0.5], [Z.ILOT, 204, 404, 0.5], [Z.ILOT, 114, 414, 0.5],
    [Z.HAUTS, 724, 160, 1.5], [Z.HAUTS, 758, 198, 1.0], [Z.CANNAIES, 800, 122, 1.6], [Z.CANNAIES, 842, 178, 1.0], [Z.BAIE, 882, 146, 1.4],
    [Z.MANGROVE, 714, 302, 1.5], [Z.MANGROVE, 732, 252, 0.9], [Z.ECARLATE, 886, 300, 1.5], [Z.ECARLATE, 866, 248, 1.0], [Z.ECARLATE, 870, 214, 0.7],
    [Z.ILOT, 664, 92, 0.45], [Z.ILOT, 660, 232, 0.4], [Z.ILOT, 670, 392, 0.5], [Z.ILOT, 738, 416, 0.4], [Z.ILOT, 926, 56, 0.6], [Z.ILOT, 930, 400, 0.6], [Z.ILOT, 858, 416, 0.5], [Z.ILOT, 716, 34, 0.4],
  ];
  const RC8 = 8, rcw = Math.ceil(W / RC8), regCells = [];
  for (let cy = 0; cy * RC8 < OVER_H; cy++) for (let cx = 0; cx < rcw; cx++) {
    const px = cx * RC8 + RC8 / 2, py = cy * RC8 + RC8 / 2, R = RC8 * 0.71 + 11.5; // demi-diagonale + déformation maximale
    let m = 1e9;
    for (const [, rx, ry, w] of regions) m = Math.min(m, (Math.hypot(px - rx, py - ry) + R) / w);
    regCells[cy * rcw + cx] = regions.filter(([, rx, ry, w]) => (Math.hypot(px - rx, py - ry) - R) / w <= m);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (tiles[i] === T.DEEP) { zones[i] = Z.SEA; continue; }
    const wx = x + (fbm(x / 14, y / 14, seed + 5, 3) - 0.5) * 22;
    const wy = y + (fbm(x / 14, y / 14, seed + 9, 3) - 0.5) * 22;
    let best = 1e9, bz = Z.PLAINS;
    for (const [z, rx, ry, w] of regCells[((y / RC8) | 0) * rcw + ((x / RC8) | 0)]) {
      const dx = wx - rx, dy = wy - ry;
      const d = Math.sqrt(dx * dx + dy * dy) / w;
      if (d < best) { best = d; bz = z; }
    }
    const tdx = x - TC.x, tdy = (y - TC.y) * 1.2;
    if (Math.sqrt(tdx * tdx + tdy * tdy) < 17 + (fbm(x / 6, y / 6, seed + 1, 2) - 0.5) * 6) bz = Z.TOWN;
    if (Math.hypot(x - HC.x, (y - HC.y) * 1.2) < 14 + (fbm(x / 6, y / 6, seed + 2, 2) - 0.5) * 5) bz = Z.HAVRE;
    if (Math.hypot(x - RD.x, (y - RD.y) * 1.2) < 16 + (fbm(x / 6, y / 6, seed + 3, 2) - 0.5) * 5 || (x >= 392 && x <= 426 && y >= 58 && y <= 72)) bz = Z.RADE;
    if (inLib(x, y)) bz = x >= 828 && y >= 292 ? Z.BASFONDS : Z.LIBERTALIA;
    zones[i] = bz;
  }

  // ---------- 3. Terrain ----------
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (tiles[i] !== T.GRASS) continue;
    const v = lv[i], z = zones[i];
    const n = fbm(x / 10, y / 10, seed + 3, 3);
    let t = T.GRASS;
    switch (z) {
      case Z.TOWN: t = v < 0.07 ? T.SAND : T.GRASS; break;
      case Z.BEACH: t = v < 0.34 + (n - 0.5) * 0.3 ? T.SAND : T.GRASS; break;
      case Z.PLAINS: t = v < 0.07 ? T.SAND : T.GRASS; break;
      case Z.JUNGLE: case Z.RUINS: t = v < 0.06 ? T.SAND : T.JUNGLE; break;
      case Z.SWAMP: {
        const p = fbm(x / 7, y / 7, seed + 11, 3);
        t = p > 0.6 ? T.SWAMP : (p > 0.54 || v < 0.05) ? T.MUD : T.MARSH;
        break;
      }
      case Z.WRECK: t = v < 0.2 ? T.SAND : (n > 0.52 ? T.GRASS : T.SAND); break;
      case Z.HAVRE: t = v < 0.08 ? T.SAND : T.GRASS; break;
      case Z.CRANE: t = v < 0.12 ? T.SAND : (n > 0.5 ? T.JUNGLE : T.GRASS); break;
      case Z.ILOT: t = v < 0.25 ? T.SAND : T.GRASS; break;
      case Z.RADE: t = v < 0.08 ? T.SAND : (n > 0.6 ? T.DIRT : T.GRASS); break;
      case Z.COLLINES: t = v < 0.1 ? T.SAND : (n > 0.57 ? T.DIRT : T.GRASS); break;
      case Z.PENDUS: t = v < 0.06 ? T.SAND : (n > 0.63 ? T.MARSH : T.DGRASS); break;
      case Z.SIRENES: t = v < 0.32 ? T.SAND : T.GRASS; break;
      case Z.ERMITE: t = v < 0.22 ? T.SAND : T.GRASS; break;
      case Z.ANSE: t = v < 0.14 ? T.SAND : T.GRASS; break;
      case Z.OSSEMENTS: t = v < 0.4 || n < 0.55 ? T.SAND : T.DIRT; break;
      case Z.QUARANTAINE: t = v < 0.08 ? T.SAND : (n > 0.6 ? T.MUD : n > 0.47 ? T.DIRT : T.GRASS); break;
      case Z.VOLCAN: {
        const ex = (x - VC.x) / VF.rx, ey = (y - VC.y) / VF.ry;
        t = ex * ex + ey * ey < 0.86 ? T.ROCK : (v < 0.05 ? T.SAND : T.ASH); // le cône ; son pied reste praticable
        break;
      }
      case Z.DAMNES: t = v < 0.06 ? T.ASH : (n > 0.58 ? T.ASH : T.DGRASS); break;
      case Z.LIBERTALIA: t = n < 0.42 ? T.DIRT : T.GRASS; break;
      case Z.BASFONDS: t = n > 0.55 ? T.MUD : T.DIRT; break;
      case Z.HAUTS: t = v < 0.08 ? T.SAND : T.GRASS; break;
      case Z.CANNAIES: t = v < 0.08 ? T.SAND : (n > 0.62 ? T.DIRT : T.GRASS); break;
      case Z.BAIE: t = v < 0.2 + (n - 0.5) * 0.2 ? T.SAND : T.GRASS; break;
      case Z.MANGROVE: { const p = fbm(x / 7, y / 7, seed + 41, 3); t = v < 0.05 ? T.MUD : p > 0.6 ? T.SWAMP : p > 0.5 ? T.MUD : T.MARSH; break; }
      case Z.ECARLATE: t = v < 0.06 ? T.SAND : T.JUNGLE; break;
    }
    const r = fbm(x / 8, y / 8, seed + 21, 3);
    if ((z === Z.JUNGLE || z === Z.PLAINS || z === Z.WRECK || z === Z.CRANE || z === Z.COLLINES || z === Z.DAMNES || z === Z.PENDUS || z === Z.HAUTS || z === Z.BAIE || z === Z.ECARLATE) && r > 0.69 && v > 0.12) t = T.ROCK;
    if (z === Z.VOLCAN && r > 0.7 && v > 0.12 && t === T.ASH && ((x - VC.x) / VF.rx) ** 2 + ((y - VC.y) / VF.ry) ** 2 > 1.2) t = T.ROCK; // pas de rochers cachés sous les pentes
    tiles[i] = t;
  }
  // l'eau peu profonde du marais devient vase
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (tiles[i] === T.WATER && zones[i] === Z.SWAMP && lv[i] > -0.06) tiles[i] = T.SWAMP;
  }

  // ---------- 4. Rivière ----------
  const river = [[100, 8], [97, 26], [104, 40], [96, 56], [100, 70], [92, 86], [96, 102], [90, 118], [88, 138]];
  for (let s = 0; s < river.length - 1; s++) {
    const [x0, y0] = river[s], [x1, y1] = river[s + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let k = 0; k <= len * 3; k++) {
      const f = k / (len * 3);
      const px = x0 + (x1 - x0) * f + (valueNoise((s * 40 + k) / 9, 3, seed) - 0.5) * 3;
      const py = y0 + (y1 - y0) * f;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const tx = Math.round(px + dx), ty = Math.round(py + dy);
        if (!inMap(tx, ty)) continue;
        const d = Math.hypot(tx - px, ty - py), i = idx(tx, ty);
        if (tiles[i] === T.DEEP) continue;
        if (d < 1.0) tiles[i] = T.DEEP;
        else if (d < 2.1 && tiles[i] !== T.DEEP) tiles[i] = T.WATER;
      }
    }
  }

  // ---------- 5. Chemins ----------
  function stampPath(pts, r = 1.2, kind = T.DIRT) {
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const horiz = Math.abs(x1 - x0) > Math.abs(y1 - y0);
      for (let k = 0; k <= len * 3; k++) {
        const f = k / (len * 3);
        const wob = kind === T.DIRT ? (valueNoise((s * 50 + k) / 7, 9, seed + 4) - 0.5) * 2.2 : 0;
        const px = x0 + (x1 - x0) * f + (horiz ? 0 : wob);
        const py = y0 + (y1 - y0) * f + (horiz ? wob : 0);
        const R = Math.ceil(r + 1);
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const tx = Math.round(px + dx), ty = Math.round(py + dy);
          if (!inMap(tx, ty) || Math.hypot(tx - px, ty - py) > r) continue;
          const i = idx(tx, ty);
          const t = tiles[i];
          if (t === T.DEEP || t === T.WATER) {
            if (zones[i] === Z.SEA) continue;
            tiles[i] = T.PLANK; plankDir[i] = horiz ? 1 : 0;
          } else if (t !== T.COBBLE && t !== T.PLANK) tiles[i] = kind;
          path[i] = 1;
        }
      }
    }
  }
  const C1 = [114, 86];
  stampPath([[137, 97], [126, 93], C1]);
  stampPath([C1, [110, 100], [110, 112]]);
  stampPath([C1, [112, 70], [110, 54], [118, 40], [124, 30]]);
  stampPath([C1, [101, 87], [92, 87], [80, 89], [62, 91], [48, 92]]);
  stampPath([[48, 92], [44, 78], [42, 62], [40, 48], [40, 40]]);
  stampPath([[110, 112], [100, 120], [88, 121], [74, 119], [58, 111], [48, 100], [48, 92]]);
  stampPath([[110, 54], [96, 56], [84, 58], [72, 60]]);

  // ---------- 6. Port-Lanterne ----------
  const props = [];
  let pid = 1;
  const addProp = (type, tx, ty, v = 0, ox = 0, oy = 0, extra = null) => {
    const p = { id: pid++, type, x: tx * TILE + 8 + ox, y: ty * TILE + 14 + oy, tx, ty, v };
    if (extra) Object.assign(p, extra);
    props.push(p);
    if (inMap(tx, ty)) {
      occ[idx(tx, ty)] = 1;
      if (PROPS[type] && PROPS[type].solid) solid[idx(tx, ty)] = 1;
    }
    return p;
  };
  const setT = (x, y, t) => { if (inMap(x, y)) tiles[idx(x, y)] = t; };
  const disc = (cx, cy, r, t) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if (Math.hypot(x - cx, y - cy) <= r) setT(x, y, t);
    }
  };

  disc(TC.x, TC.y, 5.6, T.COBBLE);
  stampPath([[TC.x - 5, TC.y + 1], [137, TC.y + 1]], 1.1, T.COBBLE);
  stampPath([[TC.x + 5, TC.y], [170, TC.y + 1]], 1.0, T.COBBLE);

  const buildings = [
    { type: 'tavern', x: 135, y: 86, w: 8, h: 5, door: 3, name: 'La Sirène Borgne' },
    { type: 'forge', x: 156, y: 87, w: 6, h: 4, door: 2, name: "L'Enclume Salée" },
    { type: 'house', v: 0, x: 143, y: 84, w: 5, h: 4, door: 2 },
    { type: 'house', v: 1, x: 150, y: 83, w: 5, h: 4, door: 2 },
    { type: 'house', v: 2, x: 136, y: 101, w: 5, h: 4, door: 2 },
    { type: 'house', v: 3, x: 160, y: 100, w: 5, h: 4, door: 2 },
    { type: 'house', v: 4, x: 128, y: 88, w: 5, h: 4, door: 2 },
  ];
  for (const b of buildings) {
    for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      if (tiles[i] !== T.COBBLE) tiles[i] = T.GRASS;
      occ[i] = 1;
      if (y < b.y + b.h && x >= b.x && x < b.x + b.w && y >= b.y) solid[i] = 1;
    }
    // petite allée pavée devant la porte
    const dx = b.x + b.door;
    stampPath([[dx, b.y + b.h], [dx, b.y + b.h + 1]], 0.9, T.COBBLE);
    props.push({ id: pid++, type: b.type, v: b.v || 0, x: (b.x + b.w / 2) * TILE, y: (b.y + b.h) * TILE, tx: b.x, ty: b.y, w: b.w, h: b.h, door: b.door, name: b.name });
  }
  // connecte les portes à la place
  stampPath([[138, 91], [138, 94], [144, 95]], 1.0, T.COBBLE);
  stampPath([[158, 91], [158, 94], [155, 95]], 1.0, T.COBBLE);
  stampPath([[145, 88], [146, 91]], 0.9, T.COBBLE);
  stampPath([[152, 87], [151, 91]], 0.9, T.COBBLE);
  stampPath([[138, 105], [141, 101], [145, 99]], 0.9, T.COBBLE);
  stampPath([[162, 104], [159, 101], [155, 99]], 0.9, T.COBBLE);
  stampPath([[130, 92], [132, 95], [137, 97]], 0.9, T.COBBLE);

  // quartier des Corsaires : six maisons à vendre, au nord de la place (zone sûre)
  const plots = [];
  for (let y = 68; y <= 82; y++) for (let x = 130; x <= 172; x++) {
    if (!inMap(x, y)) continue;
    const i = idx(x, y);
    if (y >= 83) continue;
    if (tiles[i] !== T.COBBLE) tiles[i] = y < 70 || x < 131 || x > 171 ? (tiles[i] === T.ROCK ? T.GRASS : tiles[i]) : T.GRASS;
    zones[i] = Z.TOWN; occ[i] = 1;
  }
  stampPath([[132, 78], [170, 78]], 1.0, T.COBBLE);
  stampPath([[149, 78], [149, 90]], 1.0, T.COBBLE);
  for (let k = 0; k < 6; k++) {
    const b = { type: 'home', v: k % 3, x: 133 + k * 6, y: 72, w: 5, h: 4, door: 2, name: `Maison n° ${k + 1}`, plot: k };
    for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
      const i = idx(x, y);
      if (tiles[i] !== T.COBBLE) tiles[i] = T.GRASS;
      occ[i] = 1;
      if (y < b.y + b.h && x >= b.x && x < b.x + b.w && y >= b.y) solid[i] = 1;
    }
    stampPath([[b.x + b.door, b.y + b.h], [b.x + b.door, b.y + b.h + 1]], 0.9, T.COBBLE);
    props.push({ id: pid++, type: 'home', v: b.v, x: (b.x + b.w / 2) * TILE, y: (b.y + b.h) * TILE, tx: b.x, ty: b.y, w: b.w, h: b.h, door: b.door, name: b.name, plot: k });
    plots.push(b);
  }

  // quais : on descend jusqu'à la mer
  let coastY = TC.y + 6;
  while (coastY < H - 2 && tiles[idx(TC.x, coastY)] !== T.WATER && tiles[idx(TC.x, coastY)] !== T.DEEP) coastY++;
  stampPath([[TC.x, TC.y + 5], [TC.x, coastY]], 1.0, T.COBBLE);
  const dockEnd = coastY + 9;
  for (let y = coastY - 1; y <= dockEnd; y++) for (let x = TC.x - 1; x <= TC.x + 1; x++) { setT(x, y, T.PLANK); path[idx(x, y)] = 1; }
  for (let y = dockEnd - 2; y <= dockEnd; y++) for (let x = TC.x - 7; x <= TC.x + 6; x++) { setT(x, y, T.PLANK); path[idx(x, y)] = 1; }
  // eau profonde autour du bout du quai + navire amarré
  const ship = { x: TC.x - 14, y: dockEnd + 1, w: 12, h: 5 };
  for (let y = coastY + 2; y <= dockEnd + 6; y++) for (let x = TC.x - 24; x <= TC.x + 12; x++) {
    if (!inMap(x, y)) continue;
    const i = idx(x, y);
    if (tiles[i] === T.PLANK) continue;
    const inShip = x >= ship.x - ship.w / 2 - 2 && x < ship.x + ship.w / 2 + 2 && y >= ship.y - ship.h - 1 && y <= ship.y + 1;
    if ((tiles[i] === T.WATER && y > coastY + 3) || inShip) { tiles[i] = T.DEEP; zones[i] = Z.SEA; }
  }
  for (let y = ship.y - ship.h; y < ship.y; y++) for (let x = ship.x - ship.w / 2; x < ship.x + ship.w / 2; x++) {
    if (inMap(x, y)) { solid[idx(x, y)] = 1; occ[idx(x, y)] = 1; }
  }
  props.push({ id: pid++, type: 'ship', v: 0, x: ship.x * TILE, y: ship.y * TILE + 4, tx: ship.x, ty: ship.y });
  addProp('boat', TC.x + 4, dockEnd + 2, 0);

  // phare sur la pointe est
  const LH = { x: 174, y: 95 };
  disc(LH.x, LH.y, 4.5, T.ROCK);
  disc(LH.x, LH.y + 0.5, 2.6, T.GRASS);
  stampPath([[166, TC.y + 1], [LH.x - 1, LH.y + 2]], 1.0, T.DIRT);
  for (let y = LH.y - 2; y <= LH.y; y++) for (let x = LH.x - 1; x <= LH.x + 1; x++) { solid[idx(x, y)] = 1; occ[idx(x, y)] = 1; }
  props.push({ id: pid++, type: 'lighthouse', v: 0, x: LH.x * TILE + 8, y: (LH.y + 1) * TILE, tx: LH.x, ty: LH.y });
  // la zone sûre couvre aussi les quais et la pointe du phare
  for (let y = TC.y; y <= dockEnd + 1; y++) for (let x = TC.x - 9; x <= TC.x + 8; x++) {
    if (inMap(x, y) && tiles[idx(x, y)] !== T.DEEP) zones[idx(x, y)] = Z.TOWN;
  }
  for (let y = LH.y - 6; y <= LH.y + 6; y++) for (let x = LH.x - 9; x <= LH.x + 6; x++) {
    if (inMap(x, y) && tiles[idx(x, y)] !== T.DEEP && Math.hypot((x - LH.x) / 9, (y - LH.y) / 6) < 1) zones[idx(x, y)] = Z.TOWN;
  }
  for (let x = TC.x; x <= LH.x; x++) for (let y = TC.y - 2; y <= TC.y + 4; y++) if (inMap(x, y) && tiles[idx(x, y)] !== T.DEEP) zones[idx(x, y)] = Z.TOWN;

  // mobilier urbain
  addProp('brazier', TC.x, TC.y - 1);
  addProp('well', TC.x - 4, TC.y - 3);
  addProp('stall', TC.x - 3, TC.y + 3, 0);
  addProp('stall', TC.x + 3, TC.y + 3, 1);
  addProp('bench', TC.x + 3, TC.y - 3);
  addProp('perch', 144, 93);
  addProp('anvil', 154, 93);
  { let wb = null; for (const [x, y] of [[161, 94], [162, 94], [160, 95], [163, 95]]) if (!occ[idx(x, y)] && !solid[idx(x, y)] && tiles[idx(x, y)] !== T.WATER) { wb = [x, y]; break; }
    if (wb) addProp('workbench', wb[0], wb[1]); }
  addProp('sign', 141, 99, 0);
  for (const [x, y] of [[134, 91], [134, 92], [144, 91], [162, 90], [163, 91], [143, 89], [141, 105], [166, 103], [148, 102 + 0], [133, 93]]) {
    if (!solid[idx(x, y)] && tiles[idx(x, y)] !== T.COBBLE) addProp(hash2(x, y, 3) > 0.5 ? 'barrel' : 'crate', x, y, (hash2(x, y, 4) * 3) | 0);
  }
  for (const [x, y] of [[TC.x - 6, TC.y - 4], [TC.x + 6, TC.y - 4], [TC.x - 6, TC.y + 4], [TC.x + 6, TC.y + 4], [TC.x - 2, coastY - 1], [TC.x + 2, coastY - 1], [140, TC.y + 3], [166, TC.y - 1], [TC.x - 2, dockEnd + 0], [TC.x + 2, dockEnd]]) {
    if (!solid[idx(x, y)]) addProp('lamp', x, y);
  }
  // torches tiki sur la plage ouest de la ville
  for (const [x, y] of [[126, 99], [122, 103], [118, 107]]) addProp('torch', x, y);
  addProp('nets', TC.x + 3, coastY - 2);
  addProp('anchor', TC.x - 4, coastY - 2);
  addProp('crate', TC.x + 4, dockEnd - 1, 1);
  addProp('barrel', TC.x + 5, dockEnd - 1, 0);
  addProp('barrel', TC.x - 5, dockEnd - 1, 2);

  // clôtures autour des jardins
  for (let x = 128; x <= 132; x++) if (!solid[idx(x, 93)] && tiles[idx(x, 93)] !== T.COBBLE) addProp('fence', x, 93, 0);

  // ---------- 6b. Havre-des-Brumes ----------
  const stampBuilding = (b, zone) => {
    for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      if (tiles[i] !== T.COBBLE) tiles[i] = T.GRASS;
      occ[i] = 1; zones[i] = zone;
      if (y < b.y + b.h && x >= b.x && x < b.x + b.w && y >= b.y) solid[i] = 1;
    }
    stampPath([[b.x + b.door, b.y + b.h], [b.x + b.door, b.y + b.h + 1]], 0.9, T.COBBLE);
    props.push({ id: pid++, type: b.type, v: b.v || 0, x: (b.x + b.w / 2) * TILE, y: (b.y + b.h) * TILE, tx: b.x, ty: b.y, w: b.w, h: b.h, door: b.door, name: b.name });
    buildings.push(b);
  };
  disc(HC.x, HC.y, 4.6, T.COBBLE);
  for (const b of [
    { type: 'tavern', x: 250, y: 68, w: 8, h: 5, door: 3, name: 'Le Kraken Ivre', kind: 'auberge' },
    { type: 'forge', v: 1, x: 266, y: 69, w: 6, h: 4, door: 2, name: 'Chantier naval', kind: 'chantier' },
    { type: 'house', v: 1, x: 251, y: 83, w: 5, h: 4, door: 2, name: 'Maison du guetteur', kind: 'house' },
    { type: 'house', v: 3, x: 268, y: 83, w: 5, h: 4, door: 2, name: 'Maison de la veuve', kind: 'house' },
  ]) stampBuilding(b, Z.HAVRE);
  stampPath([[253, 74], [258, 77]], 0.9, T.COBBLE); stampPath([[268, 74], [265, 77]], 0.9, T.COBBLE);
  stampPath([[253, 88], [259, 81]], 0.9, T.COBBLE); stampPath([[270, 88], [265, 81]], 0.9, T.COBBLE);
  let hcoast = HC.x - 5;
  while (hcoast > HC.x - 40 && tiles[idx(hcoast, HC.y + 1)] !== T.WATER && tiles[idx(hcoast, HC.y + 1)] !== T.DEEP) hcoast--;
  stampPath([[HC.x - 4, HC.y + 1], [hcoast + 1, HC.y + 1]], 1.0, T.COBBLE);
  for (let x = hcoast - 9; x <= hcoast + 1; x++) for (let y = HC.y; y <= HC.y + 2; y++) { setT(x, y, T.PLANK); plankDir[idx(x, y)] = 1; path[idx(x, y)] = 1; zones[idx(x, y)] = Z.HAVRE; }
  addProp('brazier', HC.x, HC.y - 1);
  addProp('well', HC.x + 3, HC.y - 3);
  addProp('stall', HC.x + 3, HC.y + 3, 1);
  for (const [x, y] of [[HC.x - 5, HC.y - 3], [HC.x + 5, HC.y - 3], [HC.x - 5, HC.y + 4], [HC.x + 5, HC.y + 4], [hcoast - 2, HC.y + 3], [hcoast - 7, HC.y - 1]]) if (inMap(x, y) && !solid[idx(x, y)]) addProp('lamp', x, y);
  for (const [x, y] of [[249, 74], [258, 74], [273, 74], [hcoast - 4, HC.y], [hcoast - 5, HC.y]]) if (inMap(x, y) && !solid[idx(x, y)]) addProp(hash2(x, y, 3) > 0.5 ? 'barrel' : 'crate', x, y, (hash2(x, y, 4) * 3) | 0);
  const havreDock = { x: hcoast - 8, y: HC.y + 1 };

  // ---------- 6c. Île au Crâne et îlots ----------
  const SC = { x: 252, y: 175 };
  disc(SC.x, SC.y + 1, 3.2, T.GRASS);
  for (let y = SC.y - 2; y <= SC.y + 4; y++) for (let x = SC.x - 4; x <= SC.x + 4; x++) if (inMap(x, y)) occ[idx(x, y)] = 1;
  const skullMouth = addProp('grotte', SC.x, SC.y, 1);
  for (const dx of [-1, 1]) solid[idx(SC.x + dx, SC.y)] = 1;
  const ilotS = { x: 186, y: 194 };
  disc(ilotS.x, ilotS.y, 2.5, T.SAND);
  const crystalMouth = addProp('grotte', ilotS.x, ilotS.y - 1, 2);
  let smugglerMouth = null;
  for (let r = 0; r < 40 && !smugglerMouth; r++) for (let a = 0; a < 24 && !smugglerMouth; a++) {
    const x = Math.round(152 + Math.cos(a / 24 * 6.283) * r), y = Math.round(34 + Math.sin(a / 24 * 6.283) * r * 0.7);
    if (!inMap(x, y + 3)) continue;
    if (tiles[idx(x, y)] === T.ROCK && tiles[idx(x - 1, y)] === T.ROCK && tiles[idx(x + 1, y)] === T.ROCK && tiles[idx(x, y + 1)] === T.JUNGLE && tiles[idx(x, y + 2)] === T.JUNGLE && !occ[idx(x, y + 1)] && zones[idx(x, y + 1)] === Z.JUNGLE) {
      smugglerMouth = addProp('grotte', x, y + 1, 0);
    }
  }

  // ---------- 7. Ruines du Temple ----------
  const RC = { x: 126, y: 24 };
  for (let y = RC.y - 6; y <= RC.y + 6; y++) for (let x = RC.x - 7; x <= RC.x + 7; x++) {
    if (!inMap(x, y)) continue;
    const d = Math.hypot((x - RC.x) / 7, (y - RC.y) / 6);
    if (d < 1 && fbm(x / 2.5, y / 2.5, seed + 66, 2) > 0.36) { setT(x, y, T.COBBLE); }
    else if (d < 1.15) setT(x, y, T.JUNGLE);
  }
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * 6.2832;
    const px = Math.round(RC.x + Math.cos(a) * 5.5), py = Math.round(RC.y + Math.sin(a) * 4.5);
    if (k % 3 === 1) addProp('ruinwall', px, py, k % 2);
    else addProp('pillar', px, py, k % 3 === 0 ? 1 : 0);
  }
  addProp('idol', RC.x, RC.y - 2);
  const tonnelet = addProp('tonnelet', RC.x + 2, RC.y + 1);
  tonnelet.quest = 'tonnelet';
  // le sanctuaire des Jumeaux : deux dalles, une porte scellée au nord de l'idole
  for (let y = RC.y - 5; y <= RC.y - 3; y++) for (let x = RC.x - 1; x <= RC.x + 1; x++) { setT(x, y, T.COBBLE); solid[idx(x, y)] = 0; occ[idx(x, y)] = 1; }
  for (const dx of [-1, 0, 1]) { solid[idx(RC.x + dx, RC.y - 5)] = 1; }
  props.push({ id: pid++, type: 'sceau', v: 0, x: RC.x * TILE + 8, y: (RC.y - 5) * TILE + 14, tx: RC.x, ty: RC.y - 5 });
  const twinPlates = [];
  for (const [dx, v] of [[-4, 0], [4, 1]]) {
    const x = RC.x + dx, y = RC.y + 2;
    setT(x, y, T.COBBLE); solid[idx(x, y)] = 0;
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (inMap(xx, yy)) { solid[idx(xx, yy)] = 0; occ[idx(xx, yy)] = 1; }
    props.push({ id: pid++, type: 'dalle', v, x: x * TILE + 8, y: y * TILE + 14, tx: x, ty: y });
    twinPlates.push({ x: x * TILE + 8, y: y * TILE + 10 });
  }

  // ---------- 8. Cimetière du marais ----------
  const CEM = { x: 33, y: 76 };
  for (let y = CEM.y - 4; y <= CEM.y + 4; y++) for (let x = CEM.x - 7; x <= CEM.x + 7; x++) setT(x, y, T.MARSH);
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 5; gx++) {
    const x = CEM.x - 6 + gx * 3, y = CEM.y - 2 + gy * 3;
    if (hash2(x, y, 9) < 0.85) addProp(hash2(x, y, 10) > 0.35 ? 'grave' : 'cross', x, y, (hash2(x, y, 11) * 3) | 0);
  }
  addProp('crypt', CEM.x, CEM.y - 5);
  stampPath([[44, 78], [38, 77], [CEM.x, CEM.y - 3]], 0.8, T.DIRT);

  // ---------- 9. Crique de l'Épave ----------
  const WR = { x: 27, y: 29 };
  for (let y = WR.y - 4; y <= WR.y + 2; y++) for (let x = WR.x - 6; x <= WR.x + 6; x++) {
    if (!inMap(x, y)) continue;
    const i = idx(x, y);
    tiles[i] = T.WATER; zones[i] = Z.WRECK;
    if (y >= WR.y - 3 && y < WR.y + 1 && x >= WR.x - 5 && x <= WR.x + 4) { solid[i] = 1; occ[i] = 1; }
  }
  props.push({ id: pid++, type: 'wreck', v: 0, x: WR.x * TILE + 8, y: (WR.y + 1) * TILE + 6, tx: WR.x, ty: WR.y });
  // plage de sable entre l'épave et la terre
  for (let y = WR.y + 2; y <= WR.y + 9; y++) for (let x = WR.x - 4; x <= WR.x + 12; x++) {
    if (!inMap(x, y)) continue;
    const i = idx(x, y);
    if (Math.hypot((x - WR.x - 4) / 9, (y - WR.y - 6) / 5) < 1) { tiles[i] = T.SAND; zones[i] = Z.WRECK; solid[i] = 0; }
  }
  stampPath([[40, 40], [36, 36], [32, 34]], 1.0, T.DIRT);
  addProp('cannon', WR.x + 7, WR.y + 4, 0);
  addProp('cannon', WR.x - 1, WR.y + 5, 1);
  addProp('bones', WR.x + 3, WR.y + 6);
  addProp('skull', WR.x + 9, WR.y + 7);
  addProp('barrel', WR.x + 10, WR.y + 3, 2);
  addProp('anchor', WR.x + 1, WR.y + 8);

  // ---------- 10. Coffres au trésor ----------
  const chestSpots = [
    { x: 62, y: 122, tier: 0 }, { x: 150, y: 28, tier: 1 }, { x: 22, y: 98, tier: 2 },
    { x: 126, y: 74, tier: 0 }, { x: 80, y: 46, tier: 1 }, { x: 36, y: 33, tier: 2 }, { x: 129, y: 22, tier: 1 },
    { x: 300, y: 137, tier: 2 }, { x: 187, y: 198, tier: 1 }, { x: 258, y: 182, tier: 2 },
  ];
  const chests = [];
  for (const c of chestSpots) {
    const s = findFree(c.x, c.y);
    if (!s) continue;
    const p = addProp('chest', s.x, s.y, c.tier);
    p.chest = c.tier;
    chests.push(p);
  }

  function walkableTile(x, y) {
    if (!inMap(x, y)) return false;
    const i = idx(x, y);
    const t = tiles[i];
    return !solid[i] && t !== T.DEEP && t !== T.ROCK && t !== T.LAVA;
  }
  function findFree(x, y) {
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const tx = x + dx, ty = y + dy;
      if (walkableTile(tx, ty) && !occ[idx(tx, ty)] && tiles[idx(tx, ty)] !== T.WATER && tiles[idx(tx, ty)] !== T.SWAMP) return { x: tx, y: ty };
    }
    return null;
  }

  // ---------- 6e. Le Grand Large (0.7) ----------
  const buildings2 = [], plots2 = [], npcs2 = [], docks = {}, lavaLights = [], hard = {};
  const forceLand = (x0, y0, x1, y1, t = T.GRASS, zone = -1) => { // sans toucher au rivage
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      if (tiles[i] === T.DEEP || tiles[i] === T.WATER) continue;
      if (tiles[i] !== T.COBBLE && tiles[i] !== T.PLANK) tiles[i] = t;
      if (zone >= 0) zones[i] = zone;
    }
  };
  const facade = (b, zone, list = buildings2) => { // bâtiment dont l'intérieur est créé à la fin (les anciens identifiants ne bougent pas)
    for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      if (tiles[i] !== T.COBBLE) tiles[i] = b.ground || T.GRASS;
      occ[i] = 1; zones[i] = zone;
      if (y < b.y + b.h && x >= b.x && x < b.x + b.w && y >= b.y) solid[i] = 1;
    }
    stampPath([[b.x + b.door, b.y + b.h], [b.x + b.door, b.y + b.h + 1]], 0.9, T.COBBLE);
    props.push({ id: pid++, type: b.type, v: b.v || 0, x: (b.x + b.w / 2) * TILE, y: (b.y + b.h) * TILE, tx: b.x, ty: b.y, w: b.w, h: b.h, door: b.door, name: b.name, plot: b.plot, style: b.style || b.cat });
    if (list) list.push(b);
    return b;
  };
  const toCoast = (x, y, dx, dy, max = 60) => { // marche jusqu'à l'eau
    let k = 0;
    while (k < max && inMap(x, y) && tiles[idx(x, y)] !== T.WATER && tiles[idx(x, y)] !== T.DEEP) { x += dx; y += dy; k++; }
    return [x, y];
  };
  const pier = (x0, y0, dx, dy, len, zone) => { // ponton de planches qui s'avance dans l'eau
    const cells = [];
    for (let k = -1; k <= len; k++) for (let s = -1; s <= 1; s++) {
      const x = x0 + dx * k + (dy ? s : 0), y = y0 + dy * k + (dx ? s : 0);
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      tiles[i] = T.PLANK; plankDir[i] = dx ? 1 : 0; path[i] = 1; occ[i] = 1; if (zone >= 0) zones[i] = zone;
      cells.push([x, y]);
    }
    for (let k = len - 3; k <= len + 6; k++) for (let s = -5; s <= 5; s++) { // eau profonde au bout, pour accoster
      const x = x0 + dx * k + (dy ? s : 0), y = y0 + dy * k + (dx ? s : 0);
      if (inMap(x, y) && tiles[idx(x, y)] === T.WATER) tiles[idx(x, y)] = T.DEEP;
    }
    return { x: (x0 + dx * len) * TILE + 8, y: (y0 + dy * len) * TILE + 8, dx, dy };
  };
  // --- Rade-aux-Flibustiers : le repaire de tous les forbans
  for (let y = RD.y - 26; y <= RD.y + 14; y++) for (let x = RD.x - 18; x <= RD.x + 18; x++) if (inMap(x, y) && tiles[idx(x, y)] !== T.DEEP) zones[idx(x, y)] = Z.RADE;
  disc(RD.x, RD.y, 5.2, T.COBBLE);
  stampPath([[RD.x - 16, RD.y], [RD.x + 16, RD.y]], 1.0, T.COBBLE);
  stampPath([[RD.x, RD.y - 22], [RD.x, RD.y + 12]], 1.0, T.COBBLE);
  stampPath([[RD.x - 16, RD.y - 18], [RD.x + 16, RD.y - 18]], 1.0, T.COBBLE);
  facade({ type: 'tavern', x: RD.x - 14, y: RD.y - 12, w: 8, h: 5, door: 3, name: 'Le Perroquet Pendu', kind: 'tavern', npc: 'mama_lune' }, Z.RADE);
  facade({ type: 'forge', x: RD.x + 6, y: RD.y - 11, w: 6, h: 4, door: 2, name: 'La Geôle', kind: 'geole' }, Z.RADE);
  facade({ type: 'house', v: 3, x: RD.x - 13, y: RD.y + 4, w: 5, h: 4, door: 2, name: 'Couture du Corsaire', kind: 'couture' }, Z.RADE);
  facade({ type: 'house', v: 4, x: RD.x + 8, y: RD.y + 4, w: 5, h: 4, door: 2, name: 'Chez le Receleur', kind: 'receleur' }, Z.RADE);
  stampPath([[RD.x - 11, RD.y - 6], [RD.x - 11, RD.y]], 0.9, T.COBBLE); stampPath([[RD.x + 8, RD.y - 6], [RD.x + 8, RD.y]], 0.9, T.COBBLE);
  for (let k = 0; k < 4; k++) {
    const b = facade({ type: 'home', v: (k + 1) % 3, x: RD.x - 12 + k * 6, y: RD.y - 25, w: 5, h: 4, door: 2, name: `Maison de la Rade n° ${k + 1}`, plot: 6 + k }, Z.RADE, null);
    plots2.push(b);
  }
  addProp('brazier', RD.x, RD.y - 1); addProp('well', RD.x - 4, RD.y + 3); addProp('stall', RD.x + 3, RD.y + 3, 1); addProp('stall', RD.x - 3, RD.y - 3, 0);
  addProp('gibet', RD.x + 4, RD.y - 3, 0); addProp('cage', RD.x + 13, RD.y - 4, 0);
  for (const [x, y] of [[RD.x - 6, RD.y - 4], [RD.x + 6, RD.y - 4], [RD.x - 6, RD.y + 4], [RD.x + 6, RD.y + 4], [RD.x - 15, RD.y - 16], [RD.x + 15, RD.y - 16], [RD.x - 2, RD.y - 20], [RD.x + 2, RD.y - 20]]) if (!solid[idx(x, y)]) addProp('lamp', x, y);
  for (const [x, y] of [[RD.x - 16, RD.y - 6], [RD.x - 5, RD.y - 13], [RD.x + 13, RD.y - 9], [RD.x + 14, RD.y + 7], [RD.x - 15, RD.y + 8]]) if (!solid[idx(x, y)] && !path[idx(x, y)]) addProp(hash2(x, y, 3) > 0.5 ? 'barrel' : 'crate', x, y, (hash2(x, y, 4) * 3) | 0);
  { // quai de la Rade, vers le sud
    const [cx, cy] = toCoast(RD.x, RD.y + 6, 0, 1);
    stampPath([[RD.x, RD.y + 5], [RD.x, cy]], 1.0, T.COBBLE);
    for (let y = RD.y + 5; y <= cy; y++) for (let x = RD.x - 2; x <= RD.x + 2; x++) if (inMap(x, y) && tiles[idx(x, y)] !== T.DEEP) zones[idx(x, y)] = Z.RADE;
    docks.rade = pier(RD.x, cy, 0, 1, 7, Z.RADE);
    addProp('anchor', RD.x - 3, cy - 2); addProp('nets', RD.x + 3, cy - 2);
  }
  // --- le Fort des Deux Clés : une porte, deux leviers de pierre, il faut être deux
  const FT = { x: 444, y: 100 };
  forceLand(FT.x - 7, FT.y - 4, FT.x + 7, FT.y + 6, T.DIRT);
  for (let y = FT.y - 4; y <= FT.y + 6; y++) for (let x = FT.x - 7; x <= FT.x + 7; x++) { occ[idx(x, y)] = 1; zones[idx(x, y)] = Z.COLLINES; }
  for (let y = FT.y - 3; y <= FT.y; y++) for (let x = FT.x - 3; x <= FT.x + 3; x++) solid[idx(x, y)] = 1;
  solid[idx(FT.x, FT.y)] = 1;
  props.push({ id: pid++, type: 'fort', v: 0, x: FT.x * TILE + 8, y: FT.y * TILE + 14, tx: FT.x, ty: FT.y });
  const fortPlates = [];
  for (const [dx, v] of [[-5, 0], [5, 1]]) {
    const x = FT.x + dx, y = FT.y + 4;
    setT(x, y, T.COBBLE); solid[idx(x, y)] = 0;
    props.push({ id: pid++, type: 'dalle', v: v + 2, x: x * TILE + 8, y: y * TILE + 14, tx: x, ty: y });
    fortPlates.push({ x: x * TILE + 8, y: y * TILE + 10 });
  }
  stampPath([[RD.x + 14, RD.y], [430, 90], [FT.x, FT.y + 6]], 1.0, T.DIRT);
  // --- Anse-Tranquille : un village de pêcheurs, à l'abri de tout
  disc(AT.x, AT.y, 4.2, T.COBBLE);
  stampPath([[AT.x - 17, AT.y - 6], [AT.x + 17, AT.y - 6]], 1.0, T.COBBLE);
  stampPath([[AT.x, AT.y - 6], [AT.x, AT.y + 10]], 1.0, T.COBBLE);
  stampPath([[AT.x - 15, AT.y + 8], [AT.x + 15, AT.y + 8]], 1.0, T.COBBLE);
  const ansePlots = [[AT.x - 15, AT.y - 10], [AT.x - 8, AT.y - 10], [AT.x + 3, AT.y - 10], [AT.x + 10, AT.y - 10], [AT.x - 14, AT.y + 4], [AT.x + 9, AT.y + 4]];
  ansePlots.forEach(([x, y], k) => plots2.push(facade({ type: 'home', v: k % 3, x, y, w: 5, h: 4, door: 2, name: `Maison de l'Anse n° ${k + 1}`, plot: 10 + k }, Z.ANSE, null)));
  for (const [x, y] of [[AT.x - 5, AT.y - 3], [AT.x + 5, AT.y - 3], [AT.x - 5, AT.y + 4], [AT.x + 5, AT.y + 4]]) if (!solid[idx(x, y)]) addProp('lamp', x, y);
  addProp('well', AT.x - 3, AT.y - 2); addProp('bench', AT.x + 3, AT.y - 2); addProp('stall', AT.x + 3, AT.y + 3, 0);
  for (let k = 0; k < 7; k++) { const x = AT.x - 18 + k * 2, y = AT.y + 10; if (!solid[idx(x, y)] && !path[idx(x, y)]) addProp('fence', x, y, 0); }
  { const [cx, cy] = toCoast(AT.x, AT.y + 9, 0, 1); stampPath([[AT.x, AT.y + 9], [AT.x, cy]], 1.0, T.COBBLE); docks.anse = pier(AT.x, cy, 0, 1, 6, Z.ANSE); addProp('nets', AT.x - 3, cy - 1); addProp('boat', AT.x + 5, cy + 3, 0); }
  // --- l'Îlot de l'Ermite : trois maisons au bout du monde (pas de Flamme Bénite ici)
  forceLand(EM.x - 10, EM.y - 8, EM.x + 10, EM.y + 7, T.GRASS);
  [[EM.x - 9, EM.y - 3], [EM.x - 2, EM.y - 7], [EM.x + 5, EM.y - 3]].forEach(([x, y], k) => plots2.push(facade({ type: 'home', v: (k + 2) % 3, x, y, w: 5, h: 4, door: 2, name: `Maison de l'Ermite n° ${k + 1}`, plot: 16 + k }, Z.ERMITE, null)));
  stampPath([[EM.x - 8, EM.y + 2], [EM.x + 8, EM.y + 2]], 0.9, T.DIRT); stampPath([[EM.x, EM.y - 3], [EM.x, EM.y + 2]], 0.9, T.DIRT);
  addProp('torch', EM.x - 4, EM.y + 4); addProp('torch', EM.x + 4, EM.y + 4); addProp('tente', EM.x + 2, EM.y + 5, 0);
  // --- Forêt des Pendus : la clairière du Bourreau
  const FP = { x: 548, y: 46 };
  forceLand(FP.x - 5, FP.y - 4, FP.x + 5, FP.y + 4, T.DIRT, Z.PENDUS);
  for (let y = FP.y - 4; y <= FP.y + 4; y++) for (let x = FP.x - 5; x <= FP.x + 5; x++) occ[idx(x, y)] = 1;
  for (const [dx, dy] of [[-4, -3], [0, -4], [4, -3], [-4, 3], [4, 3]]) addProp('gibet', FP.x + dx, FP.y + dy, (dx + 4) % 2);
  stampPath([[520, 74], [532, 60], [FP.x, FP.y + 4]], 1.0, T.DIRT);
  // --- Atoll des Ossements : le désert d'os
  // --- Île de la Quarantaine : une colonie abandonnée à la peste
  forceLand(QC.x - 12, QC.y - 10, QC.x + 12, QC.y + 10, T.DIRT, Z.QUARANTAINE);
  for (let y = QC.y - 10; y <= QC.y + 10; y++) for (let x = QC.x - 12; x <= QC.x + 12; x++) if (hash2(x, y, 71) < 0.35 && tiles[idx(x, y)] === T.DIRT) tiles[idx(x, y)] = T.MUD;
  disc(QC.x, QC.y, 4.5, T.COBBLE);
  stampPath([[QC.x - 12, QC.y], [QC.x + 12, QC.y]], 1.0, T.COBBLE); stampPath([[QC.x, QC.y - 10], [QC.x, QC.y + 10]], 1.0, T.COBBLE);
  for (const [dx, dy, v] of [[-9, -7, 0], [6, -7, 1], [-9, 4, 1], [6, 5, 0], [-4, -9, 0], [9, -2, 1]]) {
    for (let y = QC.y + dy; y < QC.y + dy + 3; y++) for (let x = QC.x + dx; x < QC.x + dx + 4; x++) occ[idx(x, y)] = 1;
    addProp('ruine', QC.x + dx + 1, QC.y + dy + 2, v);
  }
  addProp('well', QC.x + 3, QC.y - 3); addProp('cross', QC.x - 3, QC.y + 3, 1); addProp('cage', QC.x - 3, QC.y - 3, 1);
  const camp = { x: QC.x + 22, y: QC.y - 12 }; // le campement des survivants, sur la falaise
  forceLand(camp.x - 4, camp.y - 3, camp.x + 4, camp.y + 3, T.DIRT, Z.QUARANTAINE);
  for (let y = camp.y - 3; y <= camp.y + 3; y++) for (let x = camp.x - 4; x <= camp.x + 4; x++) occ[idx(x, y)] = 1;
  addProp('tente', camp.x - 2, camp.y - 1, 1); addProp('tente', camp.x + 2, camp.y - 1, 0); addProp('torch', camp.x, camp.y + 1);
  stampPath([[QC.x + 12, QC.y], [camp.x, camp.y + 2]], 0.9, T.DIRT);
  // --- Volcan de Cendrelune : une montagne de feu au milieu de l'île
  const FLOWS = [2.25, 0.95, 3.55, -0.2]; // coulées : angles sur l'ellipse du pied de la montagne
  const inFoot = (x, y, k = 1) => { const ex = (x - VC.x) / VF.rx, ey = (y - VC.y) / VF.ry; return ex * ex + ey * ey < k; };
  for (let y = VC.y - VF.ry - 1; y <= VC.y + VF.ry + 1; y++) for (let x = VC.x - VF.rx - 1; x <= VC.x + VF.rx + 1; x++) if (inMap(x, y) && inFoot(x, y)) occ[idx(x, y)] = 1;
  props.push({ id: pid++, type: 'volcan', v: 0, x: VC.x * TILE + 8, y: VC.y * TILE + 8 + VF.ry * TILE, tx: VC.x, ty: VC.y + VF.ry });
  // le bas des pentes se marche (le cône, lui, est de la roche pleine), sauf là où descendent les coulées
  for (let y = VC.y - VF.ry - 1; y <= VC.y + VF.ry + 1; y++) for (let x = VC.x - VF.rx - 1; x <= VC.x + VF.rx + 1; x++) {
    if (!inMap(x, y) || !inFoot(x, y) || inFoot(x, y, 0.86)) continue;
    const ex = (x - VC.x) / VF.rx, ey = (y - VC.y) / VF.ry, th = Math.atan2(ey, ex), e = Math.sqrt(ex * ex + ey * ey);
    for (const a of FLOWS) { let d = Math.abs(th - a) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d; if (d < 0.034 + 0.05 * e) { tiles[idx(x, y)] = T.LAVA; break; } }
  }
  const BM = { x: VC.x, y: VC.y + VF.ry + 1 }; // l'entrée de la Forge du Brasier, au pied du cône
  for (let y = BM.y - 1; y <= BM.y + 3; y++) for (let x = BM.x - 3; x <= BM.x + 3; x++) if (inMap(x, y)) { if (!inFoot(x, y)) tiles[idx(x, y)] = T.ASH; occ[idx(x, y)] = 1; }
  for (const a0 of FLOWS) { // la lave descend jusqu'à l'île, avec des gués de roche refroidie
    let a = a0, x = VC.x + Math.cos(a) * VF.rx * 0.97, y = VC.y + Math.sin(a) * VF.ry * 0.97;
    const len = 11 + Math.round(hash2(a0 * 100 | 0, 3, 17) * 6);
    for (let k = 0; k < len; k++) {
      a += (hash2(k, a0 * 100 | 0, 91) - 0.5) * 0.45;
      x += Math.cos(a) * 1.1; y += Math.sin(a) * 1.0;
      if (k % 7 === 5 || k % 7 === 6) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const tx = Math.round(x + dx), ty = Math.round(y + dy);
        if (!inMap(tx, ty) || Math.hypot(tx - x, ty - y) > 1.3) continue;
        const i = idx(tx, ty);
        if (tiles[i] === T.ASH && !occ[i] && !path[i]) tiles[i] = T.LAVA;
      }
      if (k % 3 === 0) lavaLights.push({ x: x * TILE + 8, y: y * TILE + 8 });
    }
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { // une mare au bout de la coulée
      const tx = Math.round(x + dx), ty = Math.round(y + dy);
      if (inMap(tx, ty) && Math.hypot(dx, dy * 1.2) < 2.7 && tiles[idx(tx, ty)] === T.ASH && !occ[idx(tx, ty)]) tiles[idx(tx, ty)] = T.LAVA;
    }
    lavaLights.push({ x: x * TILE + 8, y: y * TILE + 8 });
  }
  for (let k = 0; k < 22; k++) { // fumerolles tout autour du pied
    const a = k / 22 * Math.PI * 2 + 0.13, s = 1.18 + hash2(k, 3, 77) * 0.5;
    const x = Math.round(VC.x + Math.cos(a) * VF.rx * s), y = Math.round(VC.y + Math.sin(a) * VF.ry * s);
    if (inMap(x, y) && tiles[idx(x, y)] === T.ASH && !occ[idx(x, y)]) addProp('fumerolle', x, y, k % 3);
  }
  const volcano = { cx: VC.x * TILE + 8, cy: VC.y * TILE + 8, rx: VF.rx * TILE, ry: VF.ry * TILE, h: 330, flows: FLOWS };
  // --- Île des Damnés : obélisques et ruines d'un château
  forceLand(DM.x - 6, DM.y - 7, DM.x + 6, DM.y + 3, T.ASH, Z.DAMNES);
  for (let y = DM.y - 7; y <= DM.y + 3; y++) for (let x = DM.x - 6; x <= DM.x + 6; x++) occ[idx(x, y)] = 1;
  for (const [dx, dy] of [[-5, -5], [5, -5], [-5, 2], [5, 2]]) addProp('obelisque', DM.x + dx, DM.y + dy, 0);
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * Math.PI * 2 + 0.3, r = 14 + hash2(k, 9, 31) * 12;
    const x = Math.round(DM.x + Math.cos(a) * r), y = Math.round(DM.y + Math.sin(a) * r * 0.8);
    if (inMap(x, y) && (tiles[idx(x, y)] === T.DGRASS || tiles[idx(x, y)] === T.ASH) && !occ[idx(x, y)] && !solid[idx(x, y)]) addProp(k % 3 ? 'totem' : 'obelisque', x, y, k % 2);
  }
  // --- Lagon des Sirènes : coraux et coquillages
  for (let k = 0; k < 26; k++) {
    const a = k / 26 * Math.PI * 2, r = 9 + hash2(k, 5, 13) * 8;
    const x = Math.round(LG.x + Math.cos(a) * r), y = Math.round(LG.y + Math.sin(a) * r * 0.8);
    if (inMap(x, y) && tiles[idx(x, y)] === T.SAND && !occ[idx(x, y)]) addProp('corail', x, y, k % 3);
  }
  // --- entrées des trois nouveaux donjons
  const mouthNear = (cx, cy, v, okT) => {
    for (let r = 0; r < 30; r++) for (let a = 0; a < 32; a++) {
      const x = Math.round(cx + Math.cos(a / 32 * 6.283) * r), y = Math.round(cy + Math.sin(a / 32 * 6.283) * r * 0.8);
      if (!inMap(x, y + 3)) continue;
      let ok = true;
      for (let dy = -1; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) { const i = idx(x + dx, y + dy); if (!okT(tiles[i]) || occ[i] || path[i]) { ok = false; break; } }
      if (!ok) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) if (inMap(x + dx, y + dy)) occ[idx(x + dx, y + dy)] = 1;
      return addProp('grotte', x, y, v);
    }
    return null;
  };
  const walkT = (t) => t === T.SAND || t === T.GRASS || t === T.DIRT || t === T.ASH || t === T.DGRASS || t === T.MARSH;
  const mouthOs = mouthNear(AO.x, AO.y - 20, 1, walkT);
  const mouthBrasier = addProp('grotte', BM.x, BM.y, 0);
  const mouthComte = mouthNear(DM.x, DM.y - 12, 1, walkT);
  // --- coffres du Grand Large (le dernier palier ne s'ouvre qu'aux plus forts)
  for (const c of [
    { x: 432, y: 62, tier: 2 }, { x: 560, y: 36, tier: 3 }, { x: 590, y: 82, tier: 2 }, { x: 526, y: 150, tier: 3 }, { x: 352, y: 156, tier: 1 },
    { x: 52, y: 352, tier: 3 }, { x: 90, y: 318, tier: 2 }, { x: 318, y: 348, tier: 3 }, { x: 280, y: 312, tier: 2 }, { x: 490, y: 344, tier: 3 },
    { x: 452, y: 316, tier: 3 }, { x: 572, y: 418, tier: 4 }, { x: 606, y: 392, tier: 4 }, { x: 402, y: 204, tier: 2 }, { x: 204, y: 404, tier: 3 }, { x: 114, y: 414, tier: 2 },
    { x: 920, y: 50, tier: 3 }, { x: 924, y: 394, tier: 3 }, { x: 670, y: 392, tier: 2 },
  ]) { const s = findFree(c.x, c.y); if (s) { const p = addProp('chest', s.x, s.y, Math.min(3, c.tier)); p.chest = c.tier; chests.push(p); } }

  // ---------- 6f. Libertalia, la Cité Libre des Forbans (0.8) ----------
  const buildings3 = [], plots3 = [], libNpcs = [];
  const PLOT0 = 19; // les maisons de 0.6 et 0.7 gardent leurs numéros
  const LZ = (x, y) => (x >= 828 && y >= 292 ? Z.BASFONDS : Z.LIBERTALIA);
  const libMark = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inMap(x, y)) occ[idx(x, y)] = 1; };
  // rues pavées : quatre grandes rues est-ouest, trois nord-sud, le quai, la place et le marché
  for (const y of [234, 258, 282, 306]) stampPath([[LIB.x0 + 1, y], [LIB.x1 - 1, y]], 1.1, T.COBBLE);
  stampPath([[LIB.x0 + 1, 336], [LIB.x1 - 1, 336]], 1.6, T.COBBLE);
  for (const x of [772, 828]) stampPath([[x, LIB.y0 + 1], [x, 336]], 1.0, T.COBBLE);
  stampPath([[800, 234], [800, 336]], 1.5, T.COBBLE);
  disc(LB.x, LB.y, 7.6, T.COBBLE);
  for (let y = 290; y <= 303; y++) for (let x = 776; x <= 796; x++) { setT(x, y, T.COBBLE); path[idx(x, y)] = 1; }
  // routes vers l'intérieur de l'île
  stampPath([[772, LIB.y0 + 1], [764, 196], [748, 178], [734, 168]], 1.0, T.DIRT); // les Hauts et le fort
  stampPath([[828, LIB.y0 + 1], [836, 192], [852, 170], [872, 156]], 1.0, T.DIRT); // la Baie
  stampPath([[LIB.x0 + 1, 282], [734, 286], [718, 296]], 1.0, T.DIRT); // la Mangrove
  stampPath([[LIB.x1 - 1, 258], [866, 254], [880, 266]], 1.0, T.DIRT); // la Jungle Écarlate
  stampPath([[764, 196], [784, 172], [800, 140], [800, 124]], 1.0, T.DIRT); // les Cannaies
  let bk = 0;
  const H8 = (k) => hash2(k, 77, seed + 801);
  const cite = (S, x, w, h, door, extra = {}, list = null) => facade(Object.assign({ type: 'cite', v: bk++, x, y: S - 1 - h, w, h, door, ground: T.DIRT }, extra), LZ(x, S - 2), list);
  const shop = (S, x, w, h, door, name, kind, npc, style) => cite(S, x, w, h, door, { name, kind, npc, style }, buildings3);
  const fill = (S, x0, x1, hmax = 5, style) => { // maisons serrées de x0 à x1 (au nord de la rue S)
    let x = x0;
    while (x1 - x + 1 >= 4) {
      const k = bk;
      let wd = 4 + Math.floor(H8(k * 3) * 4);
      if (x1 - x + 1 - wd < 4) wd = Math.min(9, x1 - x + 1);
      const h = 3 + Math.floor(H8(k * 3 + 1) * Math.max(1, hmax - 2));
      cite(S, x, wd, h, wd >> 1, { style: style || (S >= 292 && x >= 828 ? 'masure' : undefined) });
      x += wd + 1 + (H8(k * 3 + 2) > 0.7 ? 1 : 0);
    }
  };
  const plot = (S, x, k) => { const b = facade({ type: 'home', v: k % 3, x, y: S - 5, w: 5, h: 4, door: 2, name: `Maison de Libertalia n° ${k + 1}`, plot: PLOT0 + k, ground: T.DIRT }, LZ(x, S - 2), null); plots3.push(b); };
  // rangée du palais (rue 234)
  shop(234, 746, 12, 5, 6, 'Écuries de la Porte du Nord', 'ecurie', 'palefrenier', 'ecurie');
  fill(234, 760, 770); fill(234, 774, 789);
  shop(234, 791, 18, 7, 9, 'Palais de la Reine des Forbans', 'palais', 'reine', 'palais');
  fill(234, 810, 826);
  plot(234, 830, 0); plot(234, 836, 1); plot(234, 842, 2); fill(234, 848, 855);
  // rangée des artisans et des capitaines (rue 258)
  shop(258, 746, 10, 5, 4, 'Armurerie du Sabre Courbe', 'armurerie', 'armurier', 'armurerie');
  shop(258, 757, 9, 4, 4, 'Tailleur des Gentilshommes', 'couture', 'tailleur_lib', 'tailleur');
  fill(258, 767, 770, 4);
  shop(258, 774, 8, 4, 3, 'Apothicairerie Borgnefiole', 'apothicaire', 'apothicaire', 'apothicaire');
  fill(258, 783, 797);
  plot(258, 802, 3); plot(258, 808, 4); plot(258, 814, 5); fill(258, 820, 826, 4);
  plot(258, 830, 6); plot(258, 836, 7); plot(258, 842, 8); fill(258, 848, 855);
  // rangée des tavernes (rue 282) : la place reste dégagée
  shop(282, 746, 11, 5, 5, 'Le Rhum Borgne', 'tavern', 'tav_rhum', 'taverne');
  shop(282, 758, 11, 5, 5, 'La Sirène Ivre', 'tavern', 'tav_sirene', 'taverne');
  shop(282, 774, 12, 5, 6, 'La Bourse aux Dés', 'tripot', 'croupier', 'tripot');
  fill(282, 787, 790, 4); fill(282, 811, 826);
  plot(282, 830, 9); fill(282, 836, 855);
  // rangée du marché et du Velours (rue 306) ; à l'est, les Bas-Fonds
  shop(306, 746, 15, 6, 7, 'Le Velours Écarlate', 'velours', 'madame_rubis', 'velours');
  fill(306, 762, 770, 4); fill(306, 802, 826);
  shop(306, 830, 9, 4, 4, 'Chez le Borgne', 'marche_noir', 'le_borgne', 'masure');
  fill(306, 840, 855, 3, 'masure');
  // le quai (rue 336)
  shop(336, 746, 14, 6, 7, 'Chantier naval de Libertalia', 'chantier', 'charpentier_lib', 'chantier');
  shop(336, 761, 10, 5, 5, 'Le Kraken Saoul', 'tavern', 'tav_kraken', 'taverne');
  shop(336, 774, 11, 5, 5, 'Capitainerie du port', 'capitainerie', 'capitaine_port', 'capitainerie');
  cite(336, 786, 12, 5, 6, { style: 'entrepot', name: 'Entrepôt' }); cite(336, 802, 12, 5, 6, { style: 'entrepot', name: 'Entrepôt' }); fill(336, 815, 826);
  shop(336, 830, 14, 6, 7, 'La Fosse', 'fosse', 'maitre_fosse', 'fosse');
  shop(336, 845, 10, 5, 5, 'La Cale Sèche', 'tavern', 'tav_cale', 'masure');
  // ruelles : une seconde rangée de maisons au milieu des pâtés
  for (const [ya, x0, x1] of [[246, 774, 797], [246, 802, 826], [270, 746, 770], [270, 802, 826], [320, 746, 770], [320, 802, 826], [320, 830, 855]]) {
    stampPath([[x0, ya], [x1, ya]], 0.5, T.DIRT);
    fill(ya, x0, x1, 4, ya >= 292 && x0 >= 828 ? 'masure' : undefined);
  }
  // la place de la Liberté : la statue du fondateur, la fontaine, des bancs, le tableau des primes
  addProp('statue', LB.x - 4, LB.y - 4, 0); addProp('fontaine', LB.x + 4, LB.y + 3, 0);
  for (const [x, y] of [[LB.x - 6, LB.y + 2], [LB.x + 6, LB.y - 3]]) addProp('bench', x, y, 0);
  for (const [x, y] of [[LB.x - 7, LB.y - 6], [LB.x + 7, LB.y - 6], [LB.x - 7, LB.y + 6], [LB.x + 7, LB.y + 6]]) addProp('lamp', x, y, 0);
  addProp('drapeau', 800, 224, 0); addProp('drapeau', 790, 230, 1); addProp('drapeau', 809, 230, 1);
  // le marché : étals, tonneaux, un puits
  for (let k = 0; k < 6; k++) addProp('stall', 778 + (k % 3) * 7, 292 + Math.floor(k / 3) * 7, k % 3);
  addProp('well', 786, 298); for (const [x, y] of [[777, 302], [795, 291], [793, 302]]) addProp(H8(x) > 0.5 ? 'barrel' : 'crate', x, y, (x * 7) % 3);
  // réverbères le long des rues
  for (const y of [234, 258, 282, 306]) for (let x = 750; x <= 852; x += 10) { const ty = y - 2; if (inMap(x, ty) && !solid[idx(x, ty)] && !occ[idx(x, ty)] && !path[idx(x, ty)] && tiles[idx(x, ty)] !== T.COBBLE) addProp('lamp', x, ty, 0); }
  for (let x = 750; x <= 852; x += 9) if (!solid[idx(x, 334)] && !occ[idx(x, 334)]) addProp(x % 2 ? 'lamp' : 'cannon', x, 334, 0);
  // linge tendu dans les ruelles, et le gibet des Bas-Fonds
  for (let k = 0; k < 14; k++) { const x = 748 + Math.floor(H8(900 + k) * 106), y = 236 + Math.floor(H8(950 + k) * 98); if (!solid[idx(x, y)] && !occ[idx(x, y)] && !path[idx(x, y)] && tiles[idx(x, y)] !== T.COBBLE) addProp('linge', x, y, k % 3); }
  addProp('gibet', 842, 314, 1); addProp('cage', 846, 314, 0);
  for (let k = 0; k < 16; k++) { const x = 830 + Math.floor(H8(1000 + k) * 25), y = 294 + Math.floor(H8(1100 + k) * 40); if (!solid[idx(x, y)] && !occ[idx(x, y)] && !path[idx(x, y)]) addProp(k % 4 === 0 ? 'skull' : k % 4 === 1 ? 'barrel' : k % 4 === 2 ? 'crate' : 'bones', x, y, k % 3); }
  // le port : pontons, navires amarrés, ancres et filets
  const libPiers = [];
  for (const x of [758, 786, 800, 814, 842]) { const [, cy] = toCoast(x, 337, 0, 1); libPiers.push(pier(x, Math.max(337, cy - 1), 0, 1, x === 800 ? 9 : 7, Z.LIBERTALIA)); }
  docks.libertalia = libPiers[2];
  for (const [x, k] of [[766, 0], [834, 1]]) { const [, cy] = toCoast(x, 337, 0, 1); props.push({ id: pid++, type: 'ship', v: k, x: x * TILE + 8, y: (cy + 6) * TILE + 8, tx: x, ty: cy + 6 }); }
  for (const x of [776, 822]) { const [, cy] = toCoast(x, 337, 0, 1); addProp('boat', x, cy + 2, x % 2); }
  for (const [x, t] of [[752, 'anchor'], [796, 'nets'], [808, 'crate'], [826, 'barrel'], [850, 'anchor']]) addProp(t, x, 338, 0);
  // le fort des Hauts et l'entrée de la Crypte du Roi sans Couronne
  const LFT = { x: 726, y: 154 };
  forceLand(LFT.x - 7, LFT.y - 4, LFT.x + 7, LFT.y + 6, T.DIRT, Z.HAUTS);
  for (let y = LFT.y - 3; y <= LFT.y; y++) for (let x = LFT.x - 3; x <= LFT.x + 3; x++) solid[idx(x, y)] = 1;
  libMark(LFT.x - 7, LFT.y - 4, LFT.x + 7, LFT.y + 6);
  props.push({ id: pid++, type: 'fort', v: 1, x: LFT.x * TILE + 8, y: LFT.y * TILE + 14, tx: LFT.x, ty: LFT.y });
  for (const dx of [-6, 6]) addProp('cannon', LFT.x + dx, LFT.y + 2, 0);
  addProp('drapeau', LFT.x, LFT.y - 5, 1);
  const mouthCrypte = (() => { const x = LFT.x + 12, y = LFT.y + 10; forceLand(x - 2, y - 1, x + 2, y + 3, T.DIRT, Z.HAUTS); libMark(x - 2, y - 1, x + 2, y + 3); return addProp('grotte', x, y, 1); })();
  // distilleries en ruine dans les Cannaies, camp de contrebandiers dans la mangrove, temple dans la jungle, épaves dans la baie
  for (const [x, y] of [[788, 112], [814, 126], [800, 100]]) { forceLand(x - 3, y - 2, x + 3, y + 2, T.DIRT, Z.CANNAIES); addProp('ruine', x, y, 0); addProp('barrel', x + 2, y + 2, 0); libMark(x - 3, y - 2, x + 3, y + 2); }
  { const x = 716, y = 300; forceLand(x - 4, y - 3, x + 4, y + 3, T.DIRT, Z.MANGROVE); addProp('tente', x - 2, y - 1, 1); addProp('tente', x + 2, y - 1, 0); addProp('brazier', x, y + 1); addProp('crate', x - 3, y + 2, 1); addProp('barrel', x + 3, y + 2, 0); libMark(x - 4, y - 3, x + 4, y + 3); }
  { const x = 884, y = 296; forceLand(x - 5, y - 4, x + 5, y + 4, T.DIRT, Z.ECARLATE); for (const [dx, dy] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) addProp('pillar', x + dx, y + dy, 1); addProp('idol', x, y - 1, 0); addProp('totem', x - 2, y + 2, 0); addProp('totem', x + 2, y + 2, 1); libMark(x - 5, y - 4, x + 5, y + 4); }
  for (const [x, y] of [[892, 128], [866, 118], [906, 160]]) { const [cx2, cy2] = toCoast(x, y, 1, 0, 30); if (inMap(cx2 - 2, cy2)) props.push({ id: pid++, type: 'wreck', v: (x + y) % 2, x: (cx2 - 2) * TILE + 8, y: cy2 * TILE + 8, tx: cx2 - 2, ty: cy2 }); }
  for (const [x, y] of [[872, 136], [888, 152], [878, 170]]) addProp('lamp', x, y, 0); // les fausses lumières des naufrageurs
  // les jardins du palais, le cimetière des Forbans et le verger, entre le rempart nord et la première rue
  {
    const gx0 = 782, gx1 = 818, gy0 = 209, gy1 = 223;
    for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) { const i = idx(x, y); if (!occ[i] && !path[i]) tiles[i] = T.GRASS; }
    stampPath([[800, gy0], [800, gy1 + 1]], 0.6, T.SAND); stampPath([[gx0 + 2, 216], [gx1 - 2, 216]], 0.6, T.SAND);
    addProp('fontaine', 800, 216, 0);
    for (const [x, y] of [[gx0 + 1, gy0 + 1], [gx1 - 1, gy0 + 1], [gx0 + 1, gy1 - 1], [gx1 - 1, gy1 - 1], [792, 212], [808, 212], [792, 220], [808, 220]]) addProp('palm', x, y, (x + y) % 4);
    for (let x = gx0 + 3; x <= gx1 - 3; x += 2) { if (Math.abs(x - 800) < 3 || Math.abs(x - 792) < 1 || Math.abs(x - 808) < 1) continue; addProp('bush', x, gy0 + 1, x % 6); addProp('bush', x, gy1 - 1, (x + 3) % 6); }
    for (const [x, y] of [[788, 213], [812, 213], [788, 219], [812, 219], [785, 216], [815, 216], [796, 214], [804, 218]]) addProp('flower', x, y, (x * 3 + y) % 6);
    libMark(gx0, gy0, gx1, gy1);
    for (let y = 212; y <= 223; y++) for (let x = 752; x <= 767; x++) { const i = idx(x, y); if (inLib(x, y) && !occ[i] && !path[i]) tiles[i] = T.DGRASS; }
    for (let y = 214; y <= 222; y += 3) for (let x = 755; x <= 766; x += 3) { const k = Math.floor(H8(x * 13 + y) * 10); if (inLib(x, y)) addProp(k < 6 ? 'grave' : 'cross', x, y, k % 3); }
    addProp('deadtree', 753, 220, 1); addProp('lamp', 760, 224, 0);
    libMark(752, 212, 767, 223);
    for (let y = 214; y <= 222; y += 4) for (let x = 835; x <= 847; x += 4) if (inLib(x, y)) addProp(H8(x + y * 7) > 0.45 ? 'palm' : 'tree', x, y, (x + y) % 4);
    addProp('well', 841, 224); addProp('barrel', 834, 224, 1);
    libMark(834, 213, 848, 224);
  }
  // l'enceinte : chemin de ronde, tours aux angles et de part et d'autre des portes, arches au nord
  {
    const wallSet = new Set(), ring = [];
    const line4 = (x0, y0, x1, y1) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      let px = x0, py = y0; ring.push([px, py]);
      for (let k = 1; k <= n; k++) {
        const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
        if (x !== px && y !== py) ring.push([x, py]);
        ring.push([x, y]); px = x; py = y;
      }
    };
    for (let k = 0; k + 1 < CITY.length; k++) line4(CITY[k][0], Math.min(337, CITY[k][1]), CITY[k + 1][0], Math.min(337, CITY[k + 1][1]));
    const kind = ring.map(([x, y]) => { if (!inMap(x, y)) return 0; const i = idx(x, y); if (tiles[i] === T.DEEP || tiles[i] === T.WATER) return 0; return path[i] ? 2 : 1; }); // 0 mer, 1 rempart, 2 porte
    const towers = new Set(), gates = [];
    for (const [vx, vy] of CITY) towers.add(`${vx},${Math.min(337, vy)}`);
    for (let k = 1; k < ring.length; k++) {
      if (kind[k] === 2 && kind[k - 1] === 1) towers.add(ring[k - 1].join(','));
      if (kind[k] === 1 && kind[k - 1] === 2) towers.add(ring[k].join(','));
      if (kind[k] === 2 && kind[k - 1] !== 2) { let e = k; while (e + 1 < ring.length && kind[e + 1] === 2) e++; gates.push(ring[(k + e) >> 1]); }
    }
    const walls = [];
    for (let k = 0; k < ring.length; k++) {
      if (kind[k] !== 1) continue;
      const [x, y] = ring[k], i = idx(x, y);
      if (wallSet.has(i)) continue;
      wallSet.add(i); tiles[i] = T.COBBLE; path[i] = 1; occ[i] = 1; solid[i] = 1;
      const p = { id: pid++, type: towers.has(`${x},${y}`) ? 'tour' : 'rempart', v: 0, x: x * TILE + 8, y: y * TILE + 15, tx: x, ty: y };
      props.push(p); walls.push(p);
    }
    for (const p of walls) if (p.type === 'rempart') { const i = idx(p.tx, p.ty); p.v = (wallSet.has(i - W) ? 1 : 0) | (wallSet.has(i + 1) ? 2 : 0) | (wallSet.has(i + W) ? 4 : 0) | (wallSet.has(i - 1) ? 8 : 0); }
    else p.v = p.tx % 2;
    for (const [x, y] of gates) if (y < 215) props.push({ id: pid++, type: 'porte_cite', v: 0, x: x * TILE + 8, y: y * TILE + 15, tx: x, ty: y });
  }
  // personnages du dehors : passeur, marchands du marché, crieur, garde, mendiant, musicien, tableau des primes
  for (const [id, x, y] of [['passeur_lib', 803, 340], ['marchande_fruits', 779, 294], ['poissonnier_lib', 786, 294], ['marchand_curios', 793, 294], ['marchand_rhum', 779, 301],
    ['crieur', LB.x + 2, LB.y - 6], ['primes_lib', LB.x - 9, LB.y], ['garde_porte', 774, LIB.y0 + 3], ['mendiant', 836, 300], ['musicien', 768, 284]]) libNpcs.push([id, x, y]);

  // ---------- 6g. 1.0 : des propriétés de toutes sortes (manoir, villas, phare, refuges, cabanes des marais, fortins) ----------
  const plots4 = [];
  const siteFree = (x0, y0, w, h) => { for (let y = y0 - 2; y <= y0 + h + 2; y++) for (let x = x0 - 2; x <= x0 + w + 1; x++) { if (!inMap(x, y)) return false; const i = idx(x, y), t = tiles[i]; if (t === T.DEEP || t === T.WATER || occ[i] || path[i] || solid[i] || inLib(x, y)) return false; } return true; };
  const findSite = (cx, cy, w, h, R = 18) => { for (let r = 0; r <= R; r++) for (let a = 0; a < 24; a++) { const x = Math.round(cx + Math.cos((a / 24) * 6.283) * r) - (w >> 1), y = Math.round(cy + Math.sin((a / 24) * 6.283) * r) - h; if (siteFree(x, y, w, h)) return [x, y]; } return null; };
  const PROPS4 = [
    ['manoir', 'Manoir des Cannaies', 832, 172, 12, 6, 6], ['villa', 'Villa du Planteur', 774, 132, 9, 5, 4], ['villa', 'Villa des Alizés', 830, 120, 9, 5, 4],
    ['phare', 'Phare de la Passe', 858, 416, 5, 5, 2], ['refuge', 'Refuge des Écarlates', 904, 236, 6, 4, 3], ['refuge', 'Refuge du Temple', 872, 334, 6, 4, 3],
    ['marais', 'Cabane des Palétuviers', 704, 272, 6, 4, 3], ['marais', 'Cabane du Passeur', 728, 334, 6, 4, 3], ['fortin', 'Fortin du Levant', 926, 56, 9, 6, 4], ['fortin', 'Fortin des Récifs', 930, 400, 9, 6, 4],
  ];
  PROPS4.forEach(([cat, name, cx, cy, w, h, door], n) => {
    const s = findSite(cx, cy, w, h, cat === 'phare' || cat === 'fortin' ? 8 : 18);
    if (!s) throw new Error('pas de place pour ' + name);
    const zone = zones[idx(cx, cy)] === Z.SEA ? Z.ILOT : zones[idx(cx, cy)];
    const b = facade({ type: 'propriete', v: n, x: s[0], y: s[1], w, h, door, name, plot: PLOT0 + 10 + n, cat, ground: cat === 'fortin' || cat === 'phare' ? T.COBBLE : T.DIRT }, zone, null);
    b.cat = cat; plots4.push(b);
    if (cat === 'phare' || cat === 'marais' || cat === 'fortin') { // un ponton privé vers l'eau la plus proche
      let best = null;
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const [ex, ey] = toCoast(b.x + b.door, b.y + b.h + 1, dx, dy, 16); if (inMap(ex, ey) && (tiles[idx(ex, ey)] === T.WATER || tiles[idx(ex, ey)] === T.DEEP)) { const d = Math.abs(ex - b.x - b.door) + Math.abs(ey - b.y - b.h); if (!best || d < best[0]) best = [d, ex - dx, ey - dy, dx, dy]; } }
      if (best) b.dock = pier(best[1], best[2], best[3], best[4], 5, zone);
    }
  });

  // ---------- 11. Végétation et décors ----------
  const clear = (x, y, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (!inMap(x + dx, y + dy)) return false;
      const i = idx(x + dx, y + dy);
      if (occ[i] || path[i]) return false;
    }
    return true;
  };
  const nearTown = (x, y) => Math.hypot(x - TC.x, (y - TC.y) * 1.2) < 15 || Math.hypot(x - HC.x, (y - HC.y) * 1.2) < 12 || Math.hypot(x - RD.x, (y - RD.y) * 1.2) < 18 || zones[idx(x, y)] === Z.ANSE || inLib(x, y) || (y > 330 && y < 352 && x > 734 && x < 866);
  for (let y = 2; y < OVER_H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = idx(x, y);
    if (occ[i] || path[i] || solid[i]) continue;
    const t = tiles[i], z = zones[i];
    if (t === T.DEEP || t === T.LAVA) continue;
    const dens = fbm(x / 6, y / 6, seed + 31, 2);
    const r = hash2(x, y, seed + 99);
    const v = (hash2(x, y, seed + 7) * 4) | 0;
    const ox = ((hash2(x, y, seed + 8) - 0.5) * 8) | 0, oy = ((hash2(x, y, seed + 6) - 0.5) * 4) | 0;
    const town = nearTown(x, y);
    if (z === Z.LIBERTALIA || z === Z.BASFONDS) { // la cité : quelques fleurs et buissons dans les jardins
      if (t === T.GRASS && r < 0.05 && clear(x, y, 0)) addProp(r < 0.035 ? 'flower' : 'bush', x, y, v, ox, oy);
      continue;
    }
    if (z === Z.CANNAIES && t === T.GRASS && dens > 0.5 && y % 3 !== 0 && r < 0.42 && clear(x, y, 0)) { addProp('canne', x, y, v, ox, 0); continue; } // champs de canne
    if (z === Z.ECARLATE && t === T.JUNGLE && dens > 0.38 && r < 0.2 && clear(x, y, 1)) { addProp('jtree_r', x, y, v, ox, 0); continue; } // arbres écarlates
    if (z === Z.MANGROVE && (t === T.MARSH || t === T.MUD) && r < 0.08 && clear(x, y, 1)) { addProp('paletuvier', x, y, v, ox, 0); continue; } // palétuviers
    if (t === T.SAND && z === Z.OSSEMENTS) { // désert d'os : peu de palmiers, beaucoup de restes
      if (r < 0.006 && clear(x, y, 1)) addProp('palm', x, y, v, ox, 0);
      else if (r < 0.05) addProp(r < 0.035 ? 'bones' : 'skull', x, y, v, ox, oy);
      else if (r < 0.058 && clear(x, y, 0)) addProp('rock', x, y, v % 2, ox, 0);
      else if (r < 0.064 && clear(x, y, 1)) addProp('totem', x, y, 1, ox, 0);
      continue;
    }
    if (t === T.DGRASS) { // terre hantée : arbres morts, gibets, champignons
      if (dens > 0.42 && r < 0.12 && clear(x, y, 1)) addProp('deadtree', x, y, v, ox, 0);
      else if (r < 0.135 && clear(x, y, 1) && z === Z.PENDUS) addProp('gibet', x, y, v % 2, 0, 0);
      else if (r < 0.2 && clear(x, y, 0)) addProp('mushroom', x, y, v, ox, oy);
      else if (r < 0.24) addProp(r < 0.225 ? 'bones' : 'skull', x, y, v, ox, oy);
      else if (r < 0.25 && clear(x, y, 0)) addProp('rock', x, y, 4, ox, 0);
      continue;
    }
    if (t === T.ASH) { // cendres : rochers de lave, os calcinés
      if (r < 0.05 && clear(x, y, 1)) addProp('lavarock', x, y, v % 3, ox, 0);
      else if (r < 0.07 && clear(x, y, 1) && z === Z.DAMNES) addProp('deadtree', x, y, v, ox, 0);
      else if (r < 0.085) addProp(r < 0.08 ? 'bones' : 'skull', x, y, v, ox, oy);
      else if (r < 0.095 && z === Z.VOLCAN && clear(x, y, 1)) addProp('fumerolle', x, y, v % 3, 0, 0);
      continue;
    }
    if (t === T.SAND) {
      if (r < 0.016 + dens * 0.025 && clear(x, y, 1) && !town) addProp('palm', x, y, v, ox, 0);
      else if (r < 0.06) addProp(r < 0.045 ? 'shell' : 'starfish', x, y, v, ox, oy);
      else if (r < 0.066 && !town) addProp('rock', x, y, v % 2, ox, 0);
      else if (r < 0.071 && !town) addProp('driftwood', x, y, v % 2, ox, oy);
      else if (r < 0.076) addProp('pebble', x, y, v, ox, oy);
    } else if (t === T.GRASS) {
      if (town) {
        if (r < 0.05 && clear(x, y, 0)) addProp('flower', x, y, v, ox, oy);
        else if (r < 0.07 && clear(x, y, 1)) addProp('bush', x, y, v, ox, 0);
        continue;
      }
      if (dens > 0.56 && r < 0.13 && clear(x, y, 1)) addProp('tree', x, y, v, ox, 0);
      else if (r < 0.03 && clear(x, y, 0)) addProp('bush', x, y, v, ox, 0);
      else if (r < 0.07) addProp('flower', x, y, v, ox, oy);
      else if (r < 0.076 && clear(x, y, 0)) addProp('rock', x, y, 2 + (v % 2), ox, 0);
      else if (r < 0.082 && (z === Z.WRECK || z === Z.QUARANTAINE)) addProp('bones', x, y, v, ox, oy);
      else if (r < 0.09 && z === Z.QUARANTAINE && clear(x, y, 0)) addProp(r < 0.086 ? 'grave' : 'cross', x, y, v % 3, 0, 0);
    } else if (t === T.JUNGLE) {
      if (z === Z.RUINS && Math.hypot(x - RC.x, y - RC.y) < 8) { if (r < 0.08) addProp('fern', x, y, v, ox, oy); continue; }
      if (dens > 0.4 && r < 0.21 && clear(x, y, 1)) addProp('jtree', x, y, v, ox, 0);
      else if (r < 0.28 && clear(x, y, 0)) addProp('fern', x, y, v, ox, oy);
      else if (r < 0.31 && clear(x, y, 0)) addProp('bush', x, y, 4 + (v % 2), ox, 0);
      else if (r < 0.32 && clear(x, y, 1)) addProp('palm', x, y, v, ox, 0);
      else if (r < 0.335) addProp('flower', x, y, 4 + (v % 2), ox, oy);
      else if (r < 0.34 && clear(x, y, 0)) addProp('rock', x, y, 4, ox, 0);
    } else if (t === T.MARSH || t === T.MUD) {
      if (Math.hypot(x - CEM.x, y - CEM.y) < 9) continue;
      if (r < 0.045 && clear(x, y, 1) && t === T.MARSH) addProp('deadtree', x, y, v, ox, 0);
      else if (r < 0.11 && clear(x, y, 0)) addProp('reeds', x, y, v, ox, oy);
      else if (r < 0.13 && clear(x, y, 0)) addProp('mushroom', x, y, v, ox, oy);
      else if (r < 0.14) addProp(r < 0.135 ? 'bones' : 'skull', x, y, v, ox, oy);
    } else if (t === T.SWAMP) {
      if (r < 0.07) addProp('lily', x, y, v, ox, oy);
    }
  }

  // ---------- 11b. Intérieurs et grottes, dans la bande sous l'archipel ----------
  const rooms = [], doors = [], caveSpawns = [], innerNpcs = [];
  for (let y = OVER_H; y < H; y++) for (let x = 0; x < W; x++) { const i = idx(x, y); tiles[i] = T.VOID; zones[i] = Z.INTERIOR; solid[i] = 1; occ[i] = 1; }
  let ax = 3, ay = OVER_H + 3, rowH = 0, allocX0 = 3, wrapW = 640; // 0.8 : les anciennes pièces gardent leur place (la bande s'arrêtait à 640)
  const alloc = (w, h) => {
    if (ax + w + 4 > wrapW - 2) { ax = allocX0; ay += rowH + 3; rowH = 0; }
    const x0 = ax + 1, y0 = ay + 2;
    ax += w + 5; rowH = Math.max(rowH, h + 3);
    return [x0, y0];
  };
  const mkDoor = (r, door, secret) => {
    const exx = r.x0 + (r.w >> 1), exy = r.y0 + r.h;
    doors.push({ id: doors.length, room: r.id, name: r.name, kind: r.kind, secret: !!secret,
      ox: door.x * TILE + 8, oy: door.y * TILE + 8, rx: door.x * TILE + 8, ry: door.y * TILE + 12,
      ix: exx * TILE + 8, iy: (exy - 1) * TILE + 10, ex: exx * TILE + 8, ey: exy * TILE + 8 });
  };
  const room = (name, kind, w, h, floor, door) => {
    const [x0, y0] = alloc(w, h);
    for (let y = y0 - 2; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) { const i = idx(x, y); tiles[i] = T.IWALL; zones[i] = Z.INTERIOR; solid[i] = 1; occ[i] = 0; }
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = idx(x, y); tiles[i] = floor; solid[i] = 0; occ[i] = 0; }
    const exx = x0 + (w >> 1), exy = y0 + h;
    tiles[idx(exx, exy)] = T.EXIT; solid[idx(exx, exy)] = 0;
    for (let x = exx - 1; x <= exx + 1; x++) occ[idx(x, exy - 1)] = 1;
    const r = { id: rooms.length, name, kind, x0, y0, w, h };
    rooms.push(r); mkDoor(r, door, false);
    return r;
  };
  const put = (type, x, y, v = 0) => { if (!occ[idx(x, y)]) return addProp(type, x, y, v, 0, -2); return null; };
  const furnish = (r) => {
    const { x0, y0, w, h, kind } = r, R = mulberry32(r.id * 97 + 5);
    if (kind === 'tavern' || kind === 'auberge') {
      for (let x = x0; x < x0 + 6; x++) put('etagere', x, y0, x % 2);
      for (let x = x0; x < x0 + 6; x++) put('comptoir', x, y0 + 2);
      put('cheminee', x0 + w - 2, y0);
      for (const [tx, ty] of [[x0 + 9, y0 + 2], [x0 + 12, y0 + 4], [x0 + 8, y0 + 6], [x0 + 3, y0 + 6]]) if (tx < x0 + w - 1 && ty < y0 + h - 1) { put('table', tx, ty); put('chaise', tx - 1, ty, 0); put('chaise', tx + 1, ty, 1); }
      put('tonneau_d', x0, y0 + h - 1); put('tonneau_d', x0 + w - 1, y0 + h - 1);
      innerNpcs.push({ id: r.npc || (kind === 'tavern' ? 'rosalie' : 'ysolde'), x: (x0 + 3) * TILE + 8, y: (y0 + 1) * TILE + 12, dir: 0 });
    } else if (kind === 'prison') { // 1.0 : la geôle des forbans recherchés — trois cellules ouvertes, la paille, le gardien à la porte
      for (let c = 0; c < 3; c++) {
        const cx = x0 + 1 + c * 5;
        for (let y = y0; y < y0 + 3; y++) put('barreaux', cx + 4, y, 0);
        for (let x = cx; x < cx + 4; x++) if (x !== cx + 2) put('barreaux', x, y0 + 3, 1);
        put(c === 1 ? 'tonneau_d' : 'crate', cx, y0);
      }
      put('brazier', x0, y0 + h - 2); put('table', x0 + w - 4, y0 + h - 3); put('chaise', x0 + w - 5, y0 + h - 3, 0); put('ratelier', x0 + w - 1, y0 + 4, 1);
      innerNpcs.push({ id: 'gardien_geole', x: (x0 + w - 3) * TILE + 8, y: (y0 + h - 2) * TILE + 12, dir: 0 });
    } else if (kind === 'geole') { // trois cellules ; le capitaine dans celle du milieu
      for (let c = 0; c < 3; c++) { const cx = x0 + 1 + c * 4; for (let y = y0; y < y0 + 3; y++) { put('barreaux', cx + 3, y, 0); } put('barreaux', cx, y0 + 3, 1); put('barreaux', cx + 1, y0 + 3, 1); put('barreaux', cx + 2, y0 + 3, 1); }
      put('table', x0 + 5, y0 + h - 2); put('chaise', x0 + 4, y0 + h - 2, 0); put('ratelier', x0 + w - 1, y0 + h - 2, 1);
      innerNpcs.push({ id: 'vif_argent', x: (x0 + 6) * TILE + 8, y: (y0 + 1) * TILE + 12, dir: 0 });
      innerNpcs.push({ id: 'geolier', x: (x0 + 3) * TILE + 8, y: (y0 + h - 2) * TILE + 12, dir: 0 });
    } else if (kind === 'couture') {
      for (const x of [x0 + 1, x0 + 3, x0 + 5]) put('mannequin', x, y0, (x - x0) % 3);
      put('etagere', x0 + w - 1, y0, 1); put('table', x0 + 3, y0 + 3); put('tapis_deco', x0 + 1, y0 + 3);
      innerNpcs.push({ id: r.npc || 'madame_soie', x: (x0 + 6) * TILE + 8, y: (y0 + 2) * TILE + 12, dir: 0 });
    } else if (kind === 'receleur') {
      put('etagere', x0, y0, 0); put('etagere', x0 + 1, y0, 1); put('comptoir', x0 + 3, y0 + 2); put('comptoir', x0 + 4, y0 + 2); put('comptoir', x0 + 5, y0 + 2);
      put('crate', x0 + w - 1, y0, 2); put('tonneau_d', x0 + w - 1, y0 + h - 1);
      innerNpcs.push({ id: 'receleur', x: (x0 + 4) * TILE + 8, y: (y0 + 1) * TILE + 12, dir: 0 });
    } else if (kind === 'arene') {
      for (const [x, y] of [[x0, y0], [x0 + w - 1, y0], [x0, y0 + h - 1], [x0 + w - 1, y0 + h - 1], [x0 + (w >> 1) - 4, y0], [x0 + (w >> 1) + 4, y0]]) put('pillar', x, y, 1);
      put('brazier', x0 + 2, y0); put('brazier', x0 + w - 3, y0);
    } else if (kind === 'forge') {
      put('fourneau', x0 + 1, y0); put('ratelier', x0 + 4, y0, 0); put('ratelier', x0 + 6, y0, 1);
      put('anvil', x0 + 3, y0 + 3); put('tonneau_d', x0 + w - 1, y0 + h - 1); put('crate', x0 + w - 2, y0 + h - 1, 1); put('crate', x0, y0 + h - 1, 0);
    } else if (kind === 'chantier') {
      put('ratelier', x0 + 1, y0, 0); put('etagere', x0 + 3, y0, 1); put('etagere', x0 + 4, y0, 0);
      addProp('boat', x0 + 6, y0 + 3, 0, 0, -2); occ[idx(x0 + 5, y0 + 3)] = 1; occ[idx(x0 + 7, y0 + 3)] = 1;
      put('nets', x0 + 1, y0 + 4); put('crate', x0 + w - 1, y0 + h - 1, 0); put('crate', x0 + w - 2, y0 + h - 1, 2); put('tonneau_d', x0, y0 + h - 1);
      innerNpcs.push({ id: r.npc || 'ysaline', x: (x0 + 2) * TILE + 8, y: (y0 + 2) * TILE + 12, dir: 0 });
    } else if (kind === 'palais') { // le trône, les bannières, la table du Conseil des capitaines
      const cx = x0 + (w >> 1);
      put('trone', cx, y0); put('banniere', cx - 3, y0, 0); put('banniere', cx + 3, y0, 1); put('banniere', x0 + 1, y0, 1); put('banniere', x0 + w - 2, y0, 0);
      for (let k = -4; k <= 4; k += 2) { put('table', cx + k, y0 + 5); put('chaise', cx + k, y0 + 4, 0); put('chaise', cx + k, y0 + 6, 1); }
      for (const x of [x0, x0 + w - 1]) for (const y of [y0 + 2, y0 + 7]) put('pillar', x, y, 1);
      put('tapis_deco', cx - 1, y0 + 2); put('brazier', x0 + 2, y0 + h - 2); put('brazier', x0 + w - 3, y0 + h - 2);
      innerNpcs.push({ id: 'reine', x: cx * TILE + 8, y: (y0 + 2) * TILE + 6, dir: 0 });
      innerNpcs.push({ id: 'capitaine_brisemer', x: (cx - 5) * TILE + 8, y: (y0 + 5) * TILE + 10, dir: 2 });
      innerNpcs.push({ id: 'dame_corail', x: (cx + 5) * TILE + 8, y: (y0 + 5) * TILE + 10, dir: 1 });
      innerNpcs.push({ id: 'capitaine_fendlame', x: (cx + 1) * TILE + 8, y: (y0 + 8) * TILE + 10, dir: 3 });
    } else if (kind === 'velours') { // le Velours Écarlate : tentures, divans, lanternes rouges
      for (let x = x0; x < x0 + w; x += 2) put('rideau', x, y0, (x >> 1) % 2);
      for (const [x, y] of [[x0 + 1, y0 + 3], [x0 + 5, y0 + 3], [x0 + w - 6, y0 + 3], [x0 + w - 2, y0 + 3], [x0 + 2, y0 + 6], [x0 + w - 3, y0 + 6]]) put('divan', x, y, x % 2);
      for (const [x, y] of [[x0, y0 + 1], [x0 + w - 1, y0 + 1], [x0, y0 + h - 1], [x0 + w - 1, y0 + h - 1]]) put('lanterne_r', x, y, 0);
      for (let x = x0 + (w >> 1) - 2; x <= x0 + (w >> 1) + 2; x++) put('comptoir', x, y0 + 2);
      put('tapis_deco', x0 + (w >> 1) - 1, y0 + 5); put('plante', x0 + 3, y0 + h - 1); put('plante', x0 + w - 4, y0 + h - 1);
      innerNpcs.push({ id: r.npc || 'madame_rubis', x: (x0 + (w >> 1)) * TILE + 8, y: (y0 + 1) * TILE + 12, dir: 0 });
      innerNpcs.push({ id: 'perle', x: (x0 + 2) * TILE + 8, y: (y0 + 4) * TILE + 12, dir: 2 });
      innerNpcs.push({ id: 'celeste', x: (x0 + w - 3) * TILE + 8, y: (y0 + 4) * TILE + 12, dir: 1 });
    } else if (kind === 'tripot') { // la Bourse aux Dés : tables de jeu
      for (const [x, y] of [[x0 + 3, y0 + 3], [x0 + 8, y0 + 3], [x0 + 3, y0 + 6], [x0 + 9, y0 + 6]]) { put('table_jeu', x, y, (x + y) % 2); put('chaise', x - 1, y, 0); put('chaise', x + 1, y, 1); }
      for (let x = x0 + w - 4; x < x0 + w; x++) put('comptoir', x, y0 + 1);
      put('etagere', x0, y0, 0); put('lanterne_r', x0 + w - 1, y0 + h - 1, 0); put('tonneau_d', x0, y0 + h - 1);
      innerNpcs.push({ id: r.npc || 'croupier', x: (x0 + 8) * TILE + 8, y: (y0 + 2) * TILE + 12, dir: 0 });
      innerNpcs.push({ id: 'joueur_lib', x: (x0 + 2) * TILE + 8, y: (y0 + 6) * TILE + 12, dir: 2 });
    } else if (kind === 'marche_noir') { // l'arrière-boutique du Borgne
      put('etagere', x0, y0, 0); put('etagere', x0 + 1, y0, 1); put('etagere', x0 + w - 1, y0, 0);
      for (let x = x0 + 3; x <= x0 + 6; x++) put('comptoir', x, y0 + 2);
      put('cage', x0 + w - 2, y0 + 3, 1); put('crate', x0, y0 + h - 1, 2); put('crate', x0 + 1, y0 + h - 1, 0); put('lanterne_r', x0 + w - 1, y0 + h - 1, 0);
      innerNpcs.push({ id: r.npc || 'le_borgne', x: (x0 + 4) * TILE + 8, y: (y0 + 1) * TILE + 12, dir: 0 });
    } else if (kind === 'fosse') { // la Fosse : gradins, braseros et cages
      for (let x = x0; x < x0 + w; x++) if (x % 3) put('gradin', x, y0, x % 2);
      for (const y of [y0 + 3, y0 + 7]) { put('gradin', x0, y, 0); put('gradin', x0 + w - 1, y, 1); }
      put('brazier', x0 + 2, y0 + 2); put('brazier', x0 + w - 3, y0 + 2); put('brazier', x0 + 2, y0 + h - 3); put('brazier', x0 + w - 3, y0 + h - 3);
      put('cage', x0 + 1, y0 + h - 1, 0); put('cage', x0 + w - 2, y0 + h - 1, 1);
      innerNpcs.push({ id: r.npc || 'maitre_fosse', x: (x0 + (w >> 1)) * TILE + 8, y: (y0 + 1) * TILE + 14, dir: 0 });
    } else if (kind === 'armurerie') {
      for (const x of [x0 + 1, x0 + 3, x0 + 5, x0 + 7]) put('ratelier', x, y0, x % 2);
      put('fourneau', x0 + w - 2, y0); put('anvil', x0 + w - 3, y0 + 3); put('crate', x0, y0 + h - 1, 1); put('tonneau_d', x0 + w - 1, y0 + h - 1);
      innerNpcs.push({ id: r.npc || 'armurier', x: (x0 + 4) * TILE + 8, y: (y0 + 2) * TILE + 12, dir: 0 });
    } else if (kind === 'apothicaire') {
      for (const x of [x0, x0 + 1, x0 + 2, x0 + w - 1]) put('etagere', x, y0, x % 2);
      put('fourneau', x0 + w - 3, y0); put('table', x0 + 4, y0 + 3); put('plante', x0, y0 + h - 1); put('plante', x0 + w - 1, y0 + h - 1);
      innerNpcs.push({ id: r.npc || 'apothicaire', x: (x0 + 5) * TILE + 8, y: (y0 + 1) * TILE + 12, dir: 0 });
    } else if (kind === 'ecurie') { // les box des chevaux
      for (const x of [x0 + 1, x0 + 4, x0 + 7, x0 + 10, x0 + 13]) if (x < x0 + w - 1) put('stalle', x, y0, ((x - x0) / 3 | 0) % 4);
      put('tonneau_d', x0, y0 + h - 1); put('crate', x0 + w - 1, y0 + h - 1, 0); put('crate', x0 + w - 2, y0 + h - 1, 1);
      innerNpcs.push({ id: r.npc || 'palefrenier', x: (x0 + 3) * TILE + 8, y: (y0 + 4) * TILE + 12, dir: 0 });
    } else if (kind === 'capitainerie') {
      put('table', x0 + 3, y0 + 2); put('table', x0 + 4, y0 + 2); put('etagere', x0, y0, 1); put('etagere', x0 + w - 1, y0, 0);
      put('chaise', x0 + 3, y0 + 3, 0); put('tapis_deco', x0 + 5, y0 + 3); put('plante', x0 + w - 1, y0 + h - 1);
      innerNpcs.push({ id: r.npc || 'capitaine_port', x: (x0 + 6) * TILE + 8, y: (y0 + 1) * TILE + 12, dir: 0 });
    } else {
      put('lit_deco', x0, y0); put('cheminee', x0 + 3, y0); put('etagere', x0 + w - 1, y0, (r.id) % 2);
      put('table', x0 + 4, y0 + 3); put('chaise', x0 + 3, y0 + 3, 0); put('chaise', x0 + 5, y0 + 3, 1);
      put('plante', x0 + w - 1, y0 + h - 1); put('tapis_deco', x0 + 1, y0 + 3);
      const c = put('chest', x0, y0 + h - 1, 0); if (c) { c.chest = 0; chests.push(c); }
    }
  };
  for (const b of buildings) {
    const kind = b.kind || (b.type === 'tavern' ? 'tavern' : b.type === 'forge' ? 'forge' : 'house');
    const name = b.name || ['Maison du pêcheur', 'Maison aux volets bleus', 'Maison du charpentier', 'Maison de la guérisseuse', 'Maison du vieux marin'][(b.v || 0) % 5];
    const [w, h] = kind === 'tavern' || kind === 'auberge' ? [15, 8] : kind === 'forge' || kind === 'chantier' ? [10, 6] : [8, 6];
    const r = room(name, kind, w, h, kind === 'forge' ? T.STONEF : T.FLOOR, { x: b.x + b.door, y: b.y + b.h });
    furnish(r);
  }
  const cave = (name, w, h, mouth, seedC, plan) => {
    const [x0, y0] = alloc(w, h);
    const R = mulberry32(seedC);
    let g = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = R() < 0.45 ? 1 : 0;
    for (let it = 0; it < 5; it++) {
      const n2 = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 1 || yy < 1 || xx >= w - 1 || yy >= h - 1 || g[yy * w + xx]) c++; }
        n2[y * w + x] = c >= 5 ? 1 : 0;
      }
      g = n2;
    }
    const ex = w >> 1;
    for (let y = h - 5; y < h; y++) for (let x = ex - 1; x <= ex + 1; x++) g[y * w + x] = 0;
    { // relie l'entrée à la plus grande caverne
      const lab = new Int32Array(w * h).fill(-1), sizes = [];
      for (let i0 = 0; i0 < w * h; i0++) {
        if (g[i0] || lab[i0] >= 0) continue;
        const id = sizes.length, st = [i0]; lab[i0] = id; let n = 0;
        while (st.length) { const i = st.pop(); n++; const x = i % w, y = (i / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = yy * w + xx; if (!g[j] && lab[j] < 0) { lab[j] = id; st.push(j); } } }
        sizes.push(n);
      }
      const big = sizes.indexOf(Math.max(...sizes)), entry = lab[(h - 1) * w + ex];
      if (big >= 0 && entry !== big) {
        let tx = ex, ty = 0, bd = 1e9;
        for (let i = 0; i < w * h; i++) if (lab[i] === big) { const x = i % w, y = (i / w) | 0, d = Math.abs(x - ex) + Math.abs(y - (h - 1)); if (d < bd) { bd = d; tx = x; ty = y; } }
        let x = ex, y = h - 1;
        while (x !== tx || y !== ty) {
          if (y !== ty && (R() < 0.6 || x === tx)) y += Math.sign(ty - y); else x += Math.sign(tx - x);
          for (const [dx, dy] of [[0, 0], [1, 0], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx > 0 && yy > 0 && xx < w - 1 && yy < h) g[yy * w + xx] = 0; }
        }
      }
    }
    const dist = new Int32Array(w * h).fill(-1), q2 = [(h - 1) * w + ex];
    dist[q2[0]] = 0;
    for (let k = 0; k < q2.length; k++) {
      const i = q2[k], x = i % w, y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = yy * w + xx; if (dist[j] < 0 && !g[j]) { dist[j] = dist[i] + 1; q2.push(j); } }
    }
    for (let y = y0 - 2; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) { const i = idx(x, y); tiles[i] = T.CWALL; zones[i] = Z.CAVE; solid[i] = 1; occ[i] = 0; }
    const floor = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dist[y * w + x] >= 0) { const i = idx(x0 + x, y0 + y); tiles[i] = T.CAVE; solid[i] = 0; floor.push([x0 + x, y0 + y, dist[y * w + x]]); }
    const exx = x0 + ex, exy = y0 + h;
    tiles[idx(exx, exy)] = T.EXIT; solid[idx(exx, exy)] = 0; zones[idx(exx, exy)] = Z.CAVE;
    const r = { id: rooms.length, name, kind: 'cave', x0, y0, w, h };
    rooms.push(r);
    mkDoor(r, { x: mouth.tx, y: mouth.ty + 1 }, true);
    floor.sort((a, b) => b[2] - a[2]);
    const free = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (tiles[idx(x + dx, y + dy)] !== T.CAVE || occ[idx(x + dx, y + dy)]) return false; return true; };
    for (let k = 0, n = 0; k < floor.length && n < 2; k += 7) { const [x, y] = floor[k]; if (free(x, y)) { const c = addProp('chest', x, y, 2); c.chest = 2; chests.push(c); n++; } }
    for (const [x, y, d] of floor) {
      if (d < 5 || occ[idx(x, y)]) continue;
      const rr = R();
      if (rr < 0.035 && free(x, y)) addProp('cristal', x, y, Math.floor(R() * 3));
      else if (rr < 0.075) addProp('mushroom', x, y, 1);
      else if (rr < 0.095) addProp(R() < 0.5 ? 'bones' : 'skull', x, y, 0);
    }
    const spots = floor.filter(([x, y, d]) => d > 8 && !occ[idx(x, y)]);
    shuffle(spots, R);
    let si = 0;
    for (const [mob, n] of plan) for (let k = 0; k < n && si < spots.length; k++, si++) caveSpawns.push({ mob, x: spots[si][0] * TILE + 8, y: spots[si][1] * TILE + 10 });
    return r;
  };
  if (smugglerMouth) cave('Grotte des Contrebandiers', 34, 20, smugglerMouth, 911, [['buccaneer', 6], ['skelgun', 3]]);
  const skullCave = cave('Antre du Crâne', 30, 20, skullMouth, 1777, [['skelgun', 5], ['ghoul', 4]]);
  cave('Grotte de Cristal', 24, 14, crystalMouth, 3141, [['drowned', 5], ['crab', 3]]);
  { // le Roi des Os attend au fond de l'Antre du Crâne
    let best = null;
    for (let y = skullCave.y0; y < skullCave.y0 + skullCave.h; y++) for (let x = skullCave.x0; x < skullCave.x0 + skullCave.w; x++) if (tiles[idx(x, y)] === T.CAVE && !occ[idx(x, y)] && (!best || y < best[1])) best = [x, y];
    if (best) caveSpawns.push({ mob: 'roi_squelette', x: best[0] * TILE + 8, y: best[1] * TILE + 10 });
  }

  // ---------- 11b'. Maisons des pirates (vides) et sanctuaire des Jumeaux ----------
  for (const b of plots) {
    const r = room(b.name, 'home', 10, 7, T.FLOOR, { x: b.x + b.door, y: b.y + b.h });
    b.room = r.id; b.doorId = doors.length - 1; doors[b.doorId].plot = b.plot;
  }
  const sanct = room('Sanctuaire des Jumeaux', 'sanctuaire', 12, 8, T.STONEF, { x: RC.x, y: RC.y - 4 });
  doors[doors.length - 1].seal = 'jumeaux';
  {
    const { x0, y0, w: rw, h: rh } = sanct;
    put('idol', x0 + (rw >> 1), y0);
    for (const [x, y] of [[x0, y0], [x0 + rw - 1, y0], [x0, y0 + rh - 1], [x0 + rw - 1, y0 + rh - 1]]) put('pillar', x, y, 0);
    put('brazier', x0 + 2, y0); put('brazier', x0 + rw - 3, y0);
    for (const [x, t] of [[x0 + 3, 'medaillon_lunes'], [x0 + rw - 4, 'sabre_jumeaux']]) { const c = put('chest', x, y0 + 2, 2); if (c) { c.chest = 2; c.cache = t; c.twin = 1; chests.push(c); } }
    put('tapis_deco', x0 + (rw >> 1) - 1, y0 + 4);
  }

  // ---------- 11e. Les pièces du Grand Large (0.7, ajoutées après les anciennes) ----------
  for (const b of buildings2) {
    const kind = b.kind;
    const [rw, rh] = kind === 'tavern' ? [15, 8] : kind === 'geole' ? [13, 7] : [9, 6];
    const r = room(b.name, kind, rw, rh, kind === 'geole' ? T.STONEF : T.FLOOR, { x: b.x + b.door, y: b.y + b.h });
    r.npc = b.npc;
    furnish(r);
  }
  for (const b of plots2) {
    const r = room(b.name, 'home', 10, 7, T.FLOOR, { x: b.x + b.door, y: b.y + b.h });
    b.room = r.id; b.doorId = doors.length - 1; doors[b.doorId].plot = b.plot;
    plots.push(b);
  }
  const arena = room('Fort des Deux Clés', 'arene', 22, 12, T.STONEF, { x: FT.x, y: FT.y + 1 });
  doors[doors.length - 1].seal = 'freres';
  furnish(arena);
  for (let y = arena.y0 - 2; y <= arena.y0 + arena.h; y++) for (let x = arena.x0 - 1; x <= arena.x0 + arena.w; x++) zones[idx(x, y)] = Z.CAVE; // pas de Flamme Bénite dans l'arène
  const bossIn = (r, mob, far = true) => { // le boss attend au fond, loin de l'entrée
    let best = null;
    for (let y = r.y0; y < r.y0 + r.h; y++) for (let x = r.x0; x < r.x0 + r.w; x++) {
      const t = tiles[idx(x, y)];
      if ((t === T.CAVE || t === T.STONEF || t === T.FLOOR) && !occ[idx(x, y)] && (!best || (far ? y < best[1] : false))) best = [x, y];
    }
    if (best) caveSpawns.push({ mob, x: best[0] * TILE + 8, y: best[1] * TILE + 10 });
  };
  caveSpawns.push({ mob: 'frere_fer', x: (arena.x0 + 6) * TILE + 8, y: (arena.y0 + 4) * TILE + 10 });
  caveSpawns.push({ mob: 'frere_rouille', x: (arena.x0 + arena.w - 7) * TILE + 8, y: (arena.y0 + 4) * TILE + 10 });
  const caves2 = [];
  if (mouthOs) { const r = cave('Crypte du Général d’Os', 34, 20, mouthOs, 2718, [['legionnaire', 8], ['skelgun', 4]]); bossIn(r, 'general_os'); caves2.push([r, 'mousquet_general']); }
  if (mouthBrasier) { const r = cave('Forge du Brasier', 34, 22, mouthBrasier, 1618, [['calcine', 7], ['golem_lave', 4]]); bossIn(r, 'brasier'); caves2.push([r, 'marteau_brasier']); }
  if (mouthComte) { const r = cave('Crypte du Comte', 38, 22, mouthComte, 6626, [['damne', 8], ['arquebusier_damne', 5], ['molosse_damne', 3]]); bossIn(r, 'comte_vespere'); caves2.push([r, 'lame_vespere']); }
  if (ay + rowH + 2 > H) throw new Error('bande des intérieurs trop petite');
  // ---------- 11f. Les pièces de Libertalia (0.8), dans la partie est de la bande ----------
  ax = allocX0 = 646; ay = OVER_H + 3; rowH = 0; wrapW = W;
  const ROOM8 = { palais: [26, 12, T.STONEF], tavern: [15, 8, T.FLOOR], velours: [17, 9, T.FLOOR], tripot: [14, 8, T.FLOOR], marche_noir: [11, 7, T.STONEF], fosse: [22, 13, T.STONEF],
    armurerie: [12, 7, T.STONEF], couture: [9, 6, T.FLOOR], apothicaire: [10, 6, T.FLOOR], ecurie: [16, 8, T.FLOOR], chantier: [14, 8, T.FLOOR], capitainerie: [11, 6, T.FLOOR] };
  for (const b of buildings3) {
    const [rw, rh, fl] = ROOM8[b.kind];
    const r = room(b.name, b.kind, rw, rh, fl, { x: b.x + b.door, y: b.y + b.h });
    r.npc = b.npc;
    furnish(r);
    if (b.kind === 'fosse') { for (let y = r.y0 - 2; y <= r.y0 + r.h; y++) for (let x = r.x0 - 1; x <= r.x0 + r.w; x++) zones[idx(x, y)] = Z.CAVE; doors[doors.length - 1].fosse = 1; } // on s'y bat pour de vrai
  }
  for (const b of plots3) {
    const r = room(b.name, 'home', 10, 7, T.FLOOR, { x: b.x + b.door, y: b.y + b.h });
    b.room = r.id; b.doorId = doors.length - 1; doors[b.doorId].plot = b.plot;
    plots.push(b);
  }
  if (mouthCrypte) { const r = cave('Crypte du Roi sans Couronne', 38, 22, mouthCrypte, 9191, [['garde_maudit', 7], ['coupe_jarret', 4], ['skelgun', 3]]); bossIn(r, 'roi_sans_couronne'); caves2.push([r, 'mousquet_vaudou']); }
  // 1.0 : les intérieurs des nouvelles propriétés, à leur mesure
  const ROOM_CAT = { manoir: [20, 12, T.FLOOR], villa: [15, 10, T.FLOOR], phare: [9, 9, T.STONEF], refuge: [10, 7, T.FLOOR], marais: [9, 6, T.FLOOR], fortin: [16, 11, T.STONEF] };
  for (const b of plots4) {
    const [rw, rh, fl] = ROOM_CAT[b.cat];
    const r = room(b.name, 'home', rw, rh, fl, { x: b.x + b.door, y: b.y + b.h });
    b.room = r.id; b.doorId = doors.length - 1; doors[b.doorId].plot = b.plot;
    plots.push(b);
  }
  // 1.0 : la Geôle de Port-Lanterne, la dernière pièce (les anciennes gardent leurs numéros) ; on n'y entre que conduit
  // par la garde, et sa porte ne s'ouvre de l'intérieur qu'une fois la peine purgée
  const jailRoom = room('Geôle de Port-Lanterne', 'prison', 16, 9, T.STONEF, { x: TC.x, y: TC.y + 2 });
  doors[doors.length - 1].jail = 1; doors[doors.length - 1].secret = true;
  furnish(jailRoom);
  // 1.0 : le Bastion Englouti — un donjon de trois salles pour plusieurs pirates. Les pièces viennent après
  // toutes les anciennes ; ses décors (entrée, leviers) sont posés à la toute fin, après tous les anciens décors.
  const dungeon = (() => {
    const DW = 72, DH = 18, [dx0, dy0] = alloc(DW, DH);
    for (let y = dy0 - 2; y <= dy0 + DH; y++) for (let x = dx0 - 1; x <= dx0 + DW; x++) { const i = idx(x, y); tiles[i] = T.IWALL; zones[i] = Z.CAVE; solid[i] = 1; occ[i] = 0; }
    for (let y = dy0; y < dy0 + DH; y++) for (let x = dx0; x < dx0 + DW; x++) { const i = idx(x, y); tiles[i] = T.STONEF; solid[i] = 0; occ[i] = 0; }
    const gates = [];
    for (const wx of [dx0 + 23, dx0 + 47]) { // deux murs, chacun percé d'une grille de trois cases
      const g = [];
      for (let y = dy0; y < dy0 + DH; y++) for (const x of [wx, wx + 1]) { const i = idx(x, y); if (y >= dy0 + 7 && y <= dy0 + 9) g.push(i); else { tiles[i] = T.IWALL; solid[i] = 1; } }
      gates.push(g);
    }
    const exx = dx0 + 11, exy = dy0 + DH;
    tiles[idx(exx, exy)] = T.EXIT; solid[idx(exx, exy)] = 0;
    for (let x = exx - 1; x <= exx + 1; x++) occ[idx(x, exy - 1)] = 1;
    const r = { id: rooms.length, name: 'Le Bastion Englouti', kind: 'cave', x0: dx0, y0: dy0, w: DW, h: DH, dungeon: 1 };
    rooms.push(r);
    // l'entrée : une bouche de pierre sur l'Île de la Quarantaine
    let mouth = null;
    for (let rr = 0; rr < 60 && !mouth; rr++) for (let a = 0; a < 40 && !mouth; a++) {
      const x = Math.round(QC.x + 16 + Math.cos(a / 40 * 6.283) * rr), y = Math.round(QC.y + Math.sin(a / 40 * 6.283) * rr * 0.8);
      if (!inMap(x, y + 3) || y >= OVER_H - 4) continue;
      let ok = true;
      for (let dy = -1; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) { const i = idx(x + dx, y + dy), t = tiles[i]; if (!(t === T.SAND || t === T.GRASS || t === T.DIRT || t === T.DGRASS || t === T.MARSH) || occ[i] || path[i] || solid[i]) { ok = false; break; } }
      if (ok) mouth = [x, y];
    }
    if (!mouth) throw new Error('pas de place pour le Bastion Englouti');
    for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) if (inMap(mouth[0] + dx, mouth[1] + dy)) occ[idx(mouth[0] + dx, mouth[1] + dy)] = 1;
    const door = { id: doors.length, room: r.id, name: r.name, kind: 'cave', secret: false, dungeon: 1,
      ox: mouth[0] * TILE + 8, oy: (mouth[1] + 1) * TILE + 8, rx: mouth[0] * TILE + 8, ry: (mouth[1] + 1) * TILE + 12,
      ix: exx * TILE + 8, iy: (exy - 1) * TILE + 10, ex: exx * TILE + 8, ey: exy * TILE + 8 };
    doors.push(door);
    const C = (k) => [(dx0 + k * 24) * TILE, (dx0 + k * 24 + 23) * TILE];
    const lv = (tx, ty, gate, pair) => ({ tx, ty, x: tx * TILE + 8, y: ty * TILE + 10, gate, pair });
    const levers = [lv(dx0 + 2, dy0 + 1, 0, 1), lv(dx0 + 20, dy0 + DH - 2, 0, 0), lv(dx0 + 27, dy0 + DH - 2, 1, 3), lv(dx0 + 44, dy0 + 1, 1, 2)];
    const at = (fx, fy) => ({ x: (dx0 + fx) * TILE + 8, y: (dy0 + fy) * TILE + 10 });
    for (const [m, fx, fy] of [['garde_maudit', 8, 5], ['garde_maudit', 15, 11], ['legionnaire', 6, 13], ['legionnaire', 17, 4], ['calcine', 11, 8],
      ['naufrageur', 30, 4], ['naufrageur', 40, 13], ['goule_ecarlate', 35, 8], ['goule_ecarlate', 32, 14], ['garde_maudit', 42, 6],
      ['amiral_englouti', 60, 4], ['garde_maudit', 54, 12], ['garde_maudit', 66, 12]]) caveSpawns.push({ mob: m, ...at(fx, fy) });
    return { room: r.id, door: door.id, gates, levers, mouth, chambers: [C(0), C(1), C(2)], y0: dy0 * TILE, y1: (dy0 + DH) * TILE, decor: [[dx0 + 1, dy0 + DH - 2], [dx0 + 21, dy0 + 1], [dx0 + 25, dy0 + 1], [dx0 + 45, dy0 + DH - 2], [dx0 + 49, dy0 + 1], [dx0 + 70, dy0 + 1], [dx0 + 49, dy0 + DH - 2], [dx0 + 70, dy0 + DH - 2]] };
  })();
  // 1.0 : les fonds marins — trois sites de plongée (cloche de plongée), après toutes les autres pièces ;
  // l'air manque, les bulles le rendent. Leurs décors (coffres engloutis, coraux…) sont posés à la toute fin.
  const deepSpot = (cx, cy) => {
    for (let rr = 6; rr < 70; rr++) for (let a = 0; a < 48; a++) {
      const x = Math.round(cx + Math.cos(a / 48 * 6.283) * rr), y = Math.round(cy + Math.sin(a / 48 * 6.283) * rr);
      if (!inMap(x - 3, y - 3) || !inMap(x + 3, y + 3) || y >= OVER_H - 4) continue;
      let ok = true;
      for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -3; dx <= 3; dx++) if (tiles[idx(x + dx, y + dy)] !== T.DEEP) { ok = false; break; }
      if (ok) return [x, y];
    }
    return null;
  };
  const SEAS = [
    { name: 'Les fonds du Léviathan', key: 'leviathan', w: 40, h: 18, floor: T.SAND, at: deepSpot(WR.x - 8, WR.y - 6), lvl: [10, 14],
      mobs: [['drowned', 6], ['drowned', 12], ['drowned', 24], ['capitaine_noye', 30], ['sirene', 18]] },
    { name: 'Les Grottes des Abysses', key: 'grottes', w: 44, h: 20, floor: T.CAVE, at: deepSpot(566 - 30, 270 + 10), lvl: [16, 20],
      mobs: [['sirene', 8], ['sirene', 30], ['crabe_corail', 15], ['crabe_corail', 36], ['naufrageur', 22], ['naufrageur', 12]] },
    { name: 'Ys-la-Noyée, la cité engloutie', key: 'ys', w: 56, h: 22, floor: T.STONEF, at: deepSpot(206 + 14, 152 + 14), lvl: [24, 28],
      mobs: [['garde_maudit', 10], ['garde_maudit', 46], ['goule_ecarlate', 20], ['goule_ecarlate', 36], ['naufrageur', 28], ['roi_ys', 28]] },
  ];
  const seaRooms = [];
  for (const S of SEAS) {
    if (!S.at) throw new Error('pas de site de plongée pour ' + S.name);
    const [sx0, sy0] = alloc(S.w, S.h), R = mulberry32(S.w * 131 + S.h);
    for (let y = sy0 - 2; y <= sy0 + S.h; y++) for (let x = sx0 - 1; x <= sx0 + S.w; x++) { const i = idx(x, y); tiles[i] = T.CWALL; zones[i] = Z.CAVE; solid[i] = 1; occ[i] = 0; }
    for (let y = sy0; y < sy0 + S.h; y++) for (let x = sx0; x < sx0 + S.w; x++) { const i = idx(x, y); tiles[i] = S.floor; solid[i] = 0; occ[i] = 0; }
    for (let k = 0; k < S.w * S.h / 60; k++) { // des rochers, des pans de mur effondrés
      const x = sx0 + 2 + Math.floor(R() * (S.w - 4)), y = sy0 + 1 + Math.floor(R() * (S.h - 5));
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const i = idx(x + dx, y + dy); tiles[i] = T.CWALL; solid[i] = 1; }
    }
    const exx = sx0 + (S.w >> 1), exy = sy0 + S.h;
    for (let y = exy - 3; y < exy; y++) for (let x = exx - 2; x <= exx + 2; x++) { const i = idx(x, y); tiles[i] = S.floor; solid[i] = 0; }
    tiles[idx(exx, exy)] = T.EXIT; solid[idx(exx, exy)] = 0;
    for (let x = exx - 1; x <= exx + 1; x++) occ[idx(x, exy - 1)] = 1;
    const r = { id: rooms.length, name: S.name, kind: 'underwater', x0: sx0, y0: sy0, w: S.w, h: S.h, sea: S.key, lvl: S.lvl };
    rooms.push(r);
    const door = { id: doors.length, room: r.id, name: S.name, kind: 'underwater', secret: true, dive: S.key,
      ox: S.at[0] * TILE + 8, oy: S.at[1] * TILE + 8, rx: S.at[0] * TILE + 8, ry: S.at[1] * TILE + 8,
      ix: exx * TILE + 8, iy: (exy - 1) * TILE + 10, ex: exx * TILE + 8, ey: exy * TILE + 8 };
    doors.push(door);
    for (const [m, fx] of S.mobs) { // les habitants des fonds, répartis loin de l'ancre
      for (let tries = 0; tries < 40; tries++) {
        const x = sx0 + Math.min(S.w - 2, Math.max(1, fx + Math.floor(R() * 5) - 2)), y = sy0 + 1 + Math.floor(R() * (S.h - 6));
        if (!solid[idx(x, y)]) { caveSpawns.push({ mob: m, x: x * TILE + 8, y: y * TILE + 10 }); break; }
      }
    }
    seaRooms.push({ room: r.id, door: door.id, key: S.key, x0: sx0, y0: sy0, w: S.w, h: S.h, at: S.at, R });
  }
  if (ay + rowH + 2 > H) throw new Error('bande des intérieurs trop petite (est)');

  // ---------- 11c. Cachettes : des coffres oubliés, chacun garde une arme ----------
  const cacheAt = (cx, cy, r, item) => {
    for (let d = 0; d <= r; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const x = cx + dx, y = cy + dy;
      if (!inMap(x, y)) continue;
      const i = idx(x, y), t = tiles[i];
      if (solid[i] || occ[i] || path[i] || t === T.DEEP || t === T.WATER || t === T.SWAMP || t === T.ROCK || t === T.VOID || t === T.PLANK) continue;
      const c = addProp('chest', x, y, 3); c.chest = 3; c.cache = item; chests.push(c);
      return c;
    }
    return null;
  };
  const cacheInCave = (r, item) => {
    const ex = r.x0 + (r.w >> 1), ey = r.y0 + r.h;
    let best = null, bd = -1;
    for (let y = r.y0 + 1; y < r.y0 + r.h - 1; y++) for (let x = r.x0 + 1; x < r.x0 + r.w - 1; x++) {
      let ok = true;
      for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (tiles[idx(x + dx, y + dy)] !== T.CAVE || occ[idx(x + dx, y + dy)]) { ok = false; break; }
      if (!ok) continue;
      const d = Math.hypot(x - ex, (y - ey) * 1.3);
      if (d > bd) { bd = d; best = [x, y]; }
    }
    if (!best) return null;
    const c = addProp('chest', best[0], best[1], 3, 0, -2); c.chest = 3; c.cache = item; chests.push(c);
    return c;
  };
  cacheAt(LH.x + 3, LH.y + 3, 6, 'crochet');
  cacheAt(300, 136, 5, 'cimeterre');
  cacheAt(CEM.x + 5, CEM.y - 6, 5, 'faux');
  for (const r of rooms) {
    if (r.kind !== 'cave' || caves2.some(([c]) => c === r)) continue;
    cacheInCave(r, r.name.includes('Crâne') ? 'couleuvrine' : r.name.includes('Cristal') ? 'dague_cristal' : 'poivriere');
  }
  for (const [r, item] of caves2) cacheInCave(r, item);
  cacheAt(FP.x + 2, FP.y, 4, 'hache_bourreau');
  cacheAt(LG.x + 10, LG.y - 18, 6, 'trident_sirene');
  cacheAt(EM.x, EM.y + 6, 5, 'tromblon_ermite');
  cacheAt(QC.x - 10, QC.y + 8, 6, 'scalpel_corbeau');
  cacheAt(LFT.x - 10, LFT.y - 8, 6, 'lance_cavalerie'); // 0.8 : deux cachettes sur l'île de Libertalia
  cacheAt(898, 286, 6, 'baton_vaudou');

  // ---------- 11d. Le Gouffre du Kraken : eau profonde entre l'archipel et l'Île au Crâne ----------
  let KR = { x: 206, y: 152 };
  {
    let best = null, bs = -1;
    for (let y = 130; y <= 175; y++) for (let x = 190; x <= 230; x++) {
      let ok = true;
      for (let dy = -10; dy <= 10 && ok; dy++) for (let dx = -10; dx <= 10; dx++) { if (dx * dx + dy * dy > 100) continue; const t = tiles[idx(x + dx, y + dy)]; if (t !== T.DEEP || solid[idx(x + dx, y + dy)]) { ok = false; break; } }
      if (!ok) continue;
      const s = -Math.hypot(x - 208, y - 152);
      if (s > bs) { bs = s; best = { x, y }; }
    }
    if (best) KR = best;
    for (let dy = -16; dy <= 16; dy++) for (let dx = -16; dx <= 16; dx++) { const x = KR.x + dx, y = KR.y + dy; if (inMap(x, y) && dx * dx + dy * dy <= 256 && (tiles[idx(x, y)] === T.DEEP || tiles[idx(x, y)] === T.WATER)) zones[idx(x, y)] = Z.GOUFFRE; }
  }
  const BR = { x: 566, y: 270 }; // les Brumes Éternelles : la mer hantée du sud-est
  for (let y = BR.y - 64; y <= BR.y + 64; y++) for (let x = BR.x - 74; x <= BR.x + 74; x++) if (inMap(x, y) && y < OVER_H && Math.hypot((x - BR.x) / 74, (y - BR.y) / 64) < 1 && zones[idx(x, y)] === Z.SEA) zones[idx(x, y)] = Z.BRUMES;

  // ---------- 12. Personnages non-joueurs ----------
  const freeNear = (x, y) => {
    for (let d = 0; d <= 6; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const i = idx(x + dx, y + dy), t = tiles[i];
      if (!solid[i] && t !== T.DEEP && t !== T.WATER && t !== T.ROCK && t !== T.SWAMP && t !== T.LAVA) return [x + dx, y + dy];
    }
    return [x, y];
  };
  const [ax0, ay0] = freeNear(151, 80), [fx0, fy0] = freeNear(132, 94), [lx0, ly0] = freeNear(HC.x + 4, HC.y + 1), [ex0, ey0] = freeNear(havreDock.x + 5, havreDock.y + 1);
  const npcs = [
    { id: 'morgane', x: TC.x * TILE + 8, y: (coastY - 2) * TILE + 12, dir: 0 },
    { id: 'isa', x: 155 * TILE + 8, y: 94 * TILE + 8, dir: 0 },
    { id: 'bartholome', x: 140 * TILE + 8, y: 92 * TILE + 12, dir: 0 },
    { id: 'gaspard', x: (LH.x - 2) * TILE + 8, y: (LH.y + 3) * TILE + 6, dir: 0 },
    { id: 'leon', x: (TC.x - 2) * TILE + 8, y: (TC.y + 2) * TILE + 8, dir: 0 },
    { id: 'coco', x: 144 * TILE + 8, y: 93 * TILE + 14, dir: 0, fixed: true },
    { id: 'primes', x: 141 * TILE + 8, y: 99 * TILE + 18, dir: 0, fixed: true },
    { id: 'corentin', x: (TC.x - 3) * TILE + 8, y: (dockEnd - 1) * TILE + 10, dir: 0 },
    { id: 'anselme', x: ax0 * TILE + 8, y: ay0 * TILE + 10, dir: 0 },
    { id: 'fouine', x: fx0 * TILE + 8, y: fy0 * TILE + 10, dir: 0 },
    { id: 'lison', x: lx0 * TILE + 8, y: ly0 * TILE + 10, dir: 0 },
    { id: 'elouan', x: ex0 * TILE + 8, y: ey0 * TILE + 10, dir: 0 },
    ...innerNpcs,
  ];
  { // 0.7 : passeurs, Rade, Anse, Ermite, Quarantaine
    const at = (id, x, y) => { const [fx, fy] = freeNear(x, y); npcs.push({ id, x: fx * TILE + 8, y: fy * TILE + 10, dir: 0 }); };
    const dockTile = (d) => [Math.floor(d.x / TILE) - d.dy * 2 + (d.dx ? 0 : 2), Math.floor(d.y / TILE) - d.dy * 3];
    docks.port = { x: TC.x * TILE + 8, y: (dockEnd - 1) * TILE + 8 };
    docks.havre = { x: havreDock.x * TILE + 8, y: havreDock.y * TILE + 8 };
    at('passeur', TC.x + 3, dockEnd - 1);
    at('passeur_havre', havreDock.x + 2, havreDock.y - 1);
    if (docks.rade) at('passeur_rade', ...dockTile(docks.rade));
    if (docks.anse) at('passeur_anse', ...dockTile(docks.anse));
    at('vif_quai', RD.x + 3, RD.y + 8);
    at('kerbrat', FT.x - 2, FT.y + 7);
    at('maelys', AT.x - 3, AT.y + 2);
    at('ermite', EM.x - 1, EM.y + 4);
    at('agathe', camp.x, camp.y + 1);
    at('vif_camp', camp.x + 3, camp.y + 2);
    at('tailleur_rade', RD.x - 6, RD.y + 2);
    for (const [id, x, y] of libNpcs) if (id !== 'passeur_lib') at(id, x, y); // 0.8 : Libertalia
    if (docks.libertalia) at('passeur_lib', ...dockTile(docks.libertalia));
  }

  { // lot 4 : Silas Virevent, assis à la table isolée de la Sirène Borgne (ajouté en dernier : les autres ne bougent pas)
    const sb = rooms.find((r) => r.name === 'La Sirène Borgne');
    if (sb) npcs.push({ id: 'silas', x: (sb.x0 + 13) * TILE + 8, y: (sb.y0 + 4) * TILE + 12, dir: 1, dir0: 1, sit: 1 });
  }
  // ---------- 13. Points d'apparition des monstres ----------
  const spawnPlan = [
    [Z.BEACH, 'crab', 26], [Z.BEACH, 'zsailor', 12],
    [Z.PLAINS, 'zsailor', 14], [Z.PLAINS, 'crab', 4],
    [Z.JUNGLE, 'buccaneer', 18], [Z.JUNGLE, 'ghoul', 12],
    [Z.RUINS, 'ghoul', 6], [Z.RUINS, 'buccaneer', 4], [Z.RUINS, 'skelgun', 2],
    [Z.SWAMP, 'drowned', 18], [Z.SWAMP, 'skelgun', 9], [Z.SWAMP, 'zsailor', 4],
    [Z.WRECK, 'skelgun', 8], [Z.WRECK, 'drowned', 7],
    [Z.BEACH, 'crabroi', 1], [Z.JUNGLE, 'goule_alpha', 1],
    [Z.CRANE, 'skelgun', 7], [Z.CRANE, 'buccaneer', 6], [Z.CRANE, 'ghoul', 4], [Z.ILOT, 'crab', 6], [Z.ILOT, 'zsailor', 3],
    [Z.COLLINES, 'flibustier', 20], [Z.COLLINES, 'chien_mort', 10],
    [Z.PENDUS, 'pendu', 24], [Z.PENDUS, 'sorciere', 9], [Z.PENDUS, 'bourreau', 1],
    [Z.SIRENES, 'sirene', 12], [Z.SIRENES, 'crabe_corail', 12], [Z.SIRENES, 'reine_sirenes', 1],
    [Z.ERMITE, 'zsailor', 3], [Z.ERMITE, 'crab', 4],
    [Z.OSSEMENTS, 'legionnaire', 22], [Z.OSSEMENTS, 'skelgun', 10],
    [Z.QUARANTAINE, 'pestifere', 30], [Z.QUARANTAINE, 'medecin_peste', 9], [Z.QUARANTAINE, 'docteur_corbeau', 1],
    [Z.VOLCAN, 'calcine', 20], [Z.VOLCAN, 'golem_lave', 9],
    [Z.DAMNES, 'damne', 22], [Z.DAMNES, 'arquebusier_damne', 11], [Z.DAMNES, 'molosse_damne', 9],
    // 0.8 : l'île de Libertalia
    [Z.HAUTS, 'garde_maudit', 18], [Z.HAUTS, 'chien_mort', 8],
    [Z.CANNAIES, 'epouvantail', 20], [Z.CANNAIES, 'pendu', 5],
    [Z.BAIE, 'naufrageur', 18], [Z.BAIE, 'crabe_corail', 8], [Z.BAIE, 'capitaine_naufrageur', 1],
    [Z.MANGROVE, 'contrebandier', 18], [Z.MANGROVE, 'drowned', 8], [Z.MANGROVE, 'reine_mangrove', 1],
    [Z.ECARLATE, 'goule_ecarlate', 18], [Z.ECARLATE, 'sorciere', 7], [Z.ECARLATE, 'legionnaire', 6],
    [Z.BASFONDS, 'coupe_jarret', 9],
  ];
  const candidates = {};
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = idx(x, y), z = zones[i];
    if (z === Z.SEA || z === Z.TOWN || z === Z.HAVRE || z === Z.RADE || z === Z.ANSE || z === Z.BRUMES || z === Z.GOUFFRE || z === Z.INTERIOR || z === Z.CAVE || z === Z.LIBERTALIA || y >= OVER_H || solid[i] || path[i]) continue;
    const t = tiles[i];
    if (t === T.DEEP || t === T.ROCK || t === T.LAVA || t === T.PLANK || t === T.COBBLE && z !== Z.RUINS && z !== Z.QUARANTAINE) continue;
    if (Math.hypot(x - RD.x, (y - RD.y) * 1.2) < 24 || Math.hypot(x - FT.x, y - FT.y) < 7 || Math.hypot(x - camp.x, y - camp.y) < 7) continue;
    if (Math.hypot(x - TC.x, (y - TC.y) * 1.2) < 24 || Math.hypot(x - HC.x, (y - HC.y) * 1.2) < 18) continue;
    if (x > 123 && x < 179 && y > 61 && y < 91) continue; // pas de morts aux portes du Quartier des Corsaires
    (candidates[z] = candidates[z] || []).push([x, y]);
  }
  for (const z in candidates) shuffle(candidates[z], mulberry32(seed * 131 + (z | 0) * 7 + 1)); // 0.8 : un tirage par zone (une île de plus ne déplace pas les autres)
  const spawns = [];
  const taken = [];
  for (const [z, mob, count] of spawnPlan) {
    const list = candidates[z] || [];
    let n = 0;
    for (let k = 0; k < list.length && n < count; k++) {
      const [x, y] = list[k];
      if (taken.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 4)) continue;
        if ((mob === 'bourreau' || mob === 'reine_sirenes' || mob === 'docteur_corbeau') && Math.hypot(x - (mob === 'bourreau' ? FP.x : mob === 'reine_sirenes' ? 526 : QC.x), y - (mob === 'bourreau' ? FP.y : mob === 'reine_sirenes' ? 148 : QC.y)) > 12) continue;
      if (mob === 'drowned' && tiles[idx(x, y)] !== T.SWAMP && tiles[idx(x, y)] !== T.MUD && tiles[idx(x, y)] !== T.WATER && hash2(x, y, 5) < 0.5) continue;
      taken.push([x, y]);
      spawns.push({ mob, x: x * TILE + 8, y: y * TILE + 10 });
      n++;
    }
  }
  spawns.push({ mob: 'boss', x: (WR.x + 4) * TILE + 8, y: (WR.y + 6) * TILE });
  spawns.push(...caveSpawns);

  // ---------- 14. Distance à la côte (pour la couleur de l'eau) ----------
  const waterDist = new Uint8Array(N).fill(255);
  const q = new Int32Array(N);
  let qn = 0;
  const wet = (t) => t === T.DEEP || t === T.WATER;
  for (let i = 0; i < N; i++) {
    if (wet(tiles[i])) continue;
    waterDist[i] = 0;
    const x = i % W; // seules les tuiles de rivage propagent quelque chose
    if ((x > 0 && wet(tiles[i - 1])) || (x < W - 1 && wet(tiles[i + 1])) || (i >= W && wet(tiles[i - W])) || (i + W < N && wet(tiles[i + W]))) q[qn++] = i;
  }
  for (let h = 0; h < qn; h++) {
    const i = q[h], x = i % W, d = waterDist[i];
    if (d >= 8) continue;
    const nd = d + 1;
    if (x > 0 && waterDist[i - 1] > nd) { waterDist[i - 1] = nd; q[qn++] = i - 1; }
    if (x < W - 1 && waterDist[i + 1] > nd) { waterDist[i + 1] = nd; q[qn++] = i + 1; }
    if (i >= W && waterDist[i - W] > nd) { waterDist[i - W] = nd; q[qn++] = i - W; }
    if (i + W < N && waterDist[i + W] > nd) { waterDist[i + W] = nd; q[qn++] = i + W; }
  }

  // navigation : eau libre (pas les quais ni les coques)
  const sail = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const t = tiles[i]; if ((t === T.DEEP || t === T.WATER) && !solid[i] && ((i / W) | 0) < OVER_H) sail[i] = 1; }
  // la mer profonde, les rochers et le bord de carte bloquent
  for (let i = 0; i < N; i++) {
    const t = tiles[i];
    if (t === T.DEEP || t === T.ROCK || t === T.LAVA || t === T.VOID || t === T.CWALL || t === T.IWALL) solid[i] = 1;
    if (t === T.PLANK) solid[i] = solid[i] && occ[i] ? 1 : 0;
  }
  // les décors solides posés sur les ponts/quais ne doivent pas bloquer
  for (const p of props) if ((p.type === 'lamp' || p.type === 'barrel' || p.type === 'crate') && tiles[idx(p.tx, p.ty)] === T.PLANK) solid[idx(p.tx, p.ty)] = 1;

  const seaRoutes = [];
  {
    const free = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const tx = x + dx, ty = y + dy; if (!inMap(tx, ty) || !sail[idx(tx, ty)] || tiles[idx(tx, ty)] !== T.DEEP) return false; } return true; };
    const snap = ([x, y]) => { for (let r = 0; r < 14; r++) for (let a = 0; a < 16; a++) { const tx = Math.round(x + Math.cos(a / 16 * 6.283) * r), ty = Math.round(y + Math.sin(a / 16 * 6.283) * r); if (free(tx, ty)) return [tx, ty]; } return null; };
    const clearSeg = ([x0, y0], [x1, y1]) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let k = 0; k <= n; k++) { const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n); if (!free(x, y)) return false; } return true; };
    const loops = [
      { ship: 'brick_noye', n: 2, pts: [[195, 20], [312, 24], [330, 120], [312, 210], [200, 222], [190, 120]] },
      { ship: 'brick_noye', n: 2, pts: [[14, 150], [60, 180], [130, 200], [100, 236], [20, 230]] },
      { ship: 'brick_noye', n: 1, pts: [[340, 20], [470, 18], [470, 120], [366, 124]] },
      { ship: 'fregate_maudite', n: 2, pts: [[180, 300], [250, 380], [380, 380], [400, 270], [300, 250]] },
      { ship: 'fregate_maudite', n: 2, pts: [[20, 270], [120, 300], [150, 440], [20, 432]] },
      { ship: 'fregate_maudite', n: 1, pts: [[380, 220], [460, 230], [440, 290], [390, 290]] },
      { ship: 'galion_fantome', n: 1, pts: [[520, 230], [620, 240], [620, 320], [540, 350], [510, 290]] },
      { ship: 'fregate_maudite', n: 1, pts: [[600, 150], [630, 200], [560, 220], [580, 140]] },
      // 0.8 : des bricks noyés croisent autour de Libertalia (loin du port)
      { ship: 'brick_noye', n: 2, pts: [[690, 60], [900, 26], [944, 150], [940, 300], [900, 430], [700, 440], [650, 300], [656, 160]] },
    ];
    for (const L of loops) {
      const pts = L.pts.map(snap).filter(Boolean);
      if (pts.length < 3) continue;
      // un tronçon qui coupe une île est remplacé par un détour par le large
      const route = [];
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k], b = pts[(k + 1) % pts.length];
        route.push(a);
        if (!clearSeg(a, b)) {
          let best = null;
          for (let r = 6; r < 60 && !best; r += 3) for (let s = -1; s <= 1 && !best; s += 2) {
            const mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]) * r * s, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]) * r * s;
            const m = snap([Math.round(mx), Math.round(my)]);
            if (m && clearSeg(a, m) && clearSeg(m, b)) best = m;
          }
          if (best) route.push(best);
        }
      }
      seaRoutes.push({ ship: L.ship, n: L.n, pts: route.map(([x, y]) => [x * TILE + 8, y * TILE + 8]) });
    }
  }
  const spawnPoint = { x: TC.x * TILE + 8, y: (TC.y + 2) * TILE + 8 };
  // numéro de pièce de chaque tuile (-1 = archipel)
  const roomGrid = new Int16Array(N).fill(-1);
  for (const r of rooms) for (let y = r.y0 - 2; y <= r.y0 + r.h; y++) for (let x = r.x0 - 1; x <= r.x0 + r.w; x++) roomGrid[idx(x, y)] = r.id;

  // ---------- 13. 1.0 : les îles (brume de la carte, codex) ----------
  const islandOf = new Uint16Array(W * OVER_H), islands = [];
  for (let y = 0; y < OVER_H; y++) for (let x = 0; x < W; x++) {
    const i0 = idx(x, y), t0 = tiles[i0];
    if (islandOf[i0] || t0 === T.WATER || t0 === T.DEEP) continue;
    const id = islands.length + 1, st = [i0]; islandOf[i0] = id;
    let n = 0, sx = 0, sy = 0, x0 = x, x1 = x, y0 = y, y1 = y;
    const zc = new Map();
    while (st.length) {
      const j = st.pop(), jx = j % W, jy = (j / W) | 0;
      n++; sx += jx; sy += jy; if (jx < x0) x0 = jx; if (jx > x1) x1 = jx; if (jy < y0) y0 = jy; if (jy > y1) y1 = jy;
      zc.set(zones[j], (zc.get(zones[j]) || 0) + 1);
      for (const k of [j - 1, j + 1, j - W, j + W]) { if (k < 0 || k >= W * OVER_H || (k === j - 1 && jx === 0) || (k === j + 1 && jx === W - 1)) continue; const tk = tiles[k]; if (!islandOf[k] && tk !== T.WATER && tk !== T.DEEP) { islandOf[k] = id; st.push(k); } }
    }
    let zone = 0, best = -1; for (const [z, c] of zc) if (c > best && z !== Z.SEA) { best = c; zone = z; }
    islands.push({ id, n, cx: Math.round(sx / n), cy: Math.round(sy / n), x0, y0, x1, y1, zone, zones: [...zc.keys()] });
  }

  // 1.0 : les décors du Bastion Englouti, posés après tous les autres (les anciens gardent leurs numéros)
  addProp('grotte', dungeon.mouth[0], dungeon.mouth[1], 1);
  for (const l of dungeon.levers) l.prop = addProp('levier', l.tx, l.ty, 0, 0, -2).id;
  for (const [x, y] of dungeon.decor) addProp('brazier', x, y, 0, 0, -2);
  // 1.0 : les décors des fonds marins — coraux, épaves, coffres engloutis — et les poches d'air
  const airPockets = [], diveSpots = [];
  for (const S of seaRooms) {
    const free = (x, y) => !solid[idx(x, y)] && !occ[idx(x, y)] && tiles[idx(x, y)] !== T.EXIT;
    const spot = () => { for (let k = 0; k < 60; k++) { const x = S.x0 + 1 + Math.floor(S.R() * (S.w - 2)), y = S.y0 + 1 + Math.floor(S.R() * (S.h - 5)); if (free(x, y)) return [x, y]; } return null; };
    const deco = S.key === 'ys' ? ['pillar', 'pillar', 'obelisque', 'ruinwall', 'idol', 'corail', 'skull'] : S.key === 'leviathan' ? ['barrel', 'crate', 'anchor', 'bones', 'corail', 'skull', 'cannon'] : ['corail', 'corail', 'cristal', 'rock', 'bones', 'shell'];
    for (let k = 0; k < S.w * S.h / 26; k++) { const s = spot(); if (s) addProp(deco[k % deco.length], s[0], s[1], k % 3, 0, -2); }
    for (const tier of S.key === 'ys' ? [3, 3, 4] : S.key === 'grottes' ? [2, 3, 3] : [2, 2, 3]) { const s = spot(); if (s) { const c = addProp('chest', s[0], s[1], tier, 0, -2); c.chest = tier; c.sunken = 1; chests.push(c); } }
    for (let k = 0; k < Math.max(3, Math.round(S.w / 12)); k++) { const s = spot(); if (s) { occ[idx(s[0], s[1])] = 1; airPockets.push({ room: S.room, x: s[0] * TILE + 8, y: s[1] * TILE + 8 }); } }
    diveSpots.push({ key: S.key, room: S.room, door: S.door, x: S.at[0] * TILE + 8, y: S.at[1] * TILE + 8, name: rooms[S.room].name });
  }
  // 1.0 : un secret — trois cloches marines sur trois îles lointaines, à faire sonner dans la même nuit
  const bells = [];
  for (const [cx, cy] of [[EM.x + 6, EM.y + 4], [AO.x + 10, AO.y - 6], [LG.x + 12, LG.y - 18]]) {
    let at = null;
    for (let rr = 0; rr < 30 && !at; rr++) for (let a = 0; a < 32 && !at; a++) {
      const x = Math.round(cx + Math.cos(a / 32 * 6.283) * rr), y = Math.round(cy + Math.sin(a / 32 * 6.283) * rr);
      if (!inMap(x, y + 1) || y >= OVER_H - 2) continue;
      const t = tiles[idx(x, y)], t2 = tiles[idx(x, y + 1)];
      if ((t === T.SAND || t === T.GRASS || t === T.DIRT || t === T.ROCK && false) && (t2 === T.SAND || t2 === T.GRASS || t2 === T.DIRT) && !occ[idx(x, y)] && !solid[idx(x, y)] && !occ[idx(x, y + 1)]) at = [x, y];
    }
    if (at) { const b = addProp('cloche_marine', at[0], at[1], bells.length, 0, -2); bells.push({ x: b.x, y: b.y + 8, prop: b.id }); }
  }
  // lot 5 : Le Plus Grand Braquage — pièces, façades, personnages et décors ajoutés en tout dernier
  const heist = buildHeist({ W, tiles, zones, solid, occ, idx, inMap, alloc, rooms, doors, props, addProp, npcs, roomGrid, sail, waterDist, stampPath })();
  const fest = buildFest({ W, H, OVER_H, tiles, zones, solid, occ, idx, inMap, alloc, rooms, doors, props, addProp, npcs, roomGrid })(); // lot 6 : après le braquage (aucun identifiant ne bouge)
  const OUT = {
    heist, fest,
    block: new Uint8Array(N), // constructions des joueurs : 1 bloque tout, 2 bloque les morts
    islandOf, islands, // 1.0 : chaque case de terre connaît son île
    doorOwner: new Map(), rooms, doors, sail, roomGrid, havre: HC, havreDock, OVER_H,
    plots: plots.map((b) => ({ k: b.plot, name: b.name, room: b.room, door: b.doorId, tx: b.x, ty: b.y, w: b.w, h: b.h, cat: b.cat || (b.plot >= 16 && b.plot <= 18 ? 'cabane' : 'ville') })),
    twin: { plates: twinPlates, door: doors.findIndex((d) => d.seal === 'jumeaux'), room: sanct.id }, kraken: { x: KR.x * TILE + 8, y: KR.y * TILE + 8 },
    seals: [
      { id: 'jumeaux', plates: twinPlates, door: doors.findIndex((d) => d.seal === 'jumeaux'), room: sanct.id, open: 90 },
      { id: 'freres', plates: fortPlates, door: doors.findIndex((d) => d.seal === 'freres'), room: arena.id, open: 120 },
    ],
    docks, lavaLights, seaRoutes, volcano, rade: RD, anse: AT, ermite: EM, volcan: VC, quarantaine: QC, ossements: AO, damnes: DM, lagon: LG, pendus: FP, fort: FT, brumes: BR,
    libertalia: LB, libFort: LFT, jail: jailRoom.id,
    seed, W, H, tiles, zones, solid, plankDir, waterDist, props, buildings, npcs, spawns, chests,
    spawnPoint, town: TC, lighthouse: LH, ruins: RC, cemetery: CEM, wreck: WR, coastY, dockEnd,
    dungeon, airPockets, diveSpots, bells,
  };
  for (const g of dungeon.gates) for (const i of g) OUT.block[i] = 1; // les grilles du Bastion sont fermées
  return OUT;
}

// ---------- Requêtes de collision partagées ----------
export function tileAt(world, px, py) {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (!inMap(tx, ty)) return T.DEEP;
  return world.tiles[idx(tx, ty)];
}
export function zoneAt(world, px, py) {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (!inMap(tx, ty)) return Z.SEA;
  return world.zones[idx(tx, ty)];
}
export function solidAt(world, px, py) {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (!inMap(tx, ty)) return true;
  return world.solid[idx(tx, ty)] === 1;
}
// boîte de collision aux pieds : 10 x 6 px
export function canStand(world, x, y, mob = false, who = null) {
  const pts = [[x - 5, y - 5], [x + 5, y - 5], [x - 5, y], [x + 5, y]];
  for (const [px, py] of pts) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (!inMap(tx, ty)) return false;
    const i = idx(tx, ty);
    if (world.solid[i] === 1) return false;
    const b = world.block ? world.block[i] : 0;
    if (b === 1) return false;
    if (b === 2 && (mob || !who || (world.doorOwner && world.doorOwner.get(i) !== who))) return false;
    if (mob && SAFE.has(world.zones[i])) return false;
  }
  return true;
}
// déplacement avec glissement le long des obstacles
export function moveWithCollision(world, x, y, dx, dy, mob = false, who = null) {
  let nx = x + dx, ny = y + dy;
  if (canStand(world, nx, ny, mob, who)) return [nx, ny];
  if (dx && canStand(world, x + dx, y, mob, who)) return [x + dx, y];
  if (dy && canStand(world, x, y + dy, mob, who)) return [x, y + dy];
  return [x, y];
}
// bateaux : la coque (12 x 8 px) doit rester sur l'eau libre
export function canSail(world, x, y) {
  for (const [px, py] of [[x - 7, y - 6], [x + 7, y - 6], [x - 7, y + 2], [x + 7, y + 2]]) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (!inMap(tx, ty) || !world.sail[idx(tx, ty)]) return false;
  }
  return true;
}
export function moveBoat(world, x, y, dx, dy) {
  if (canSail(world, x + dx, y + dy)) return [x + dx, y + dy];
  if (dx && canSail(world, x + dx, y)) return [x + dx, y];
  if (dy && canSail(world, x, y + dy)) return [x, y + dy];
  return [x, y];
}
export function isSafe(world, x, y) { return SAFE.has(zoneAt(world, x, y)); }
export function roomIdAt(world, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (!inMap(tx, ty)) return -1;
  return world.roomGrid[idx(tx, ty)];
}
export function roomAt(world, x, y) { const id = roomIdAt(world, x, y); return id >= 0 ? world.rooms[id] : null; }
// ligne de vue simple pour les projectiles (tuiles solides hors eau)
export function blocksShot(world, px, py) {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (!inMap(tx, ty)) return true;
  const i = idx(tx, ty);
  const t = world.tiles[i];
  if (world.block && world.block[i]) return true;
  if (t === T.DEEP || t === T.WATER || t === T.LAVA) return false;
  return world.solid[i] === 1;
}
