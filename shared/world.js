// Génération déterministe de l'archipel. Exécutée à l'identique par le serveur
// (collisions, apparitions) et par le client (rendu, prédiction).
import { TILE, MAP_W as W, MAP_H as H, OVER_H, T } from './constants.js';
import { mulberry32, hash2, valueNoise, fbm, shuffle } from './rng.js';

export const Z = { SEA: 0, TOWN: 1, BEACH: 2, PLAINS: 3, JUNGLE: 4, RUINS: 5, SWAMP: 6, WRECK: 7, HAVRE: 8, CRANE: 9, ILOT: 10, INTERIOR: 11, CAVE: 12, GOUFFRE: 13 };
export const SAFE = new Set([1, 8, 11]);
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
  ship: { solid: 1 }, wreck: { solid: 1 }, boat: { solid: 1 },
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
  ];
  const HC = { x: 262, y: 78 }; // Havre-des-Brumes
  function landValue(x, y) {
    let v = -1;
    for (const [bx, by, rx, ry] of blobs) {
      const dx = (x - bx) / rx, dy = (y - by) / ry;
      const d = 1 - Math.sqrt(dx * dx + dy * dy);
      if (d > v) v = d;
    }
    v += (fbm(x / 20, y / 20, seed, 4) - 0.5) * 0.6;
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
    const e = Math.min(x, y, W - 1 - x, OVER_H - 1 - y);
    if (e < 12) v -= (12 - e) * 0.07;
    return v;
  }

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y), v = landValue(x, y);
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
  ];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (tiles[i] === T.DEEP) { zones[i] = Z.SEA; continue; }
    const wx = x + (fbm(x / 14, y / 14, seed + 5, 3) - 0.5) * 22;
    const wy = y + (fbm(x / 14, y / 14, seed + 9, 3) - 0.5) * 22;
    let best = 1e9, bz = Z.PLAINS;
    for (const [z, rx, ry, w] of regions) {
      const dx = wx - rx, dy = wy - ry;
      const d = Math.sqrt(dx * dx + dy * dy) / w;
      if (d < best) { best = d; bz = z; }
    }
    const tdx = x - TC.x, tdy = (y - TC.y) * 1.2;
    if (Math.sqrt(tdx * tdx + tdy * tdy) < 17 + (fbm(x / 6, y / 6, seed + 1, 2) - 0.5) * 6) bz = Z.TOWN;
    if (Math.hypot(x - HC.x, (y - HC.y) * 1.2) < 14 + (fbm(x / 6, y / 6, seed + 2, 2) - 0.5) * 5) bz = Z.HAVRE;
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
    }
    const r = fbm(x / 8, y / 8, seed + 21, 3);
    if ((z === Z.JUNGLE || z === Z.PLAINS || z === Z.WRECK || z === Z.CRANE) && r > 0.69 && v > 0.12) t = T.ROCK;
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
    return !solid[i] && t !== T.DEEP && t !== T.ROCK;
  }
  function findFree(x, y) {
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const tx = x + dx, ty = y + dy;
      if (walkableTile(tx, ty) && !occ[idx(tx, ty)] && tiles[idx(tx, ty)] !== T.WATER && tiles[idx(tx, ty)] !== T.SWAMP) return { x: tx, y: ty };
    }
    return null;
  }

  // ---------- 11. Végétation et décors ----------
  const clear = (x, y, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (!inMap(x + dx, y + dy)) return false;
      const i = idx(x + dx, y + dy);
      if (occ[i] || path[i]) return false;
    }
    return true;
  };
  const nearTown = (x, y) => Math.hypot(x - TC.x, (y - TC.y) * 1.2) < 15 || Math.hypot(x - HC.x, (y - HC.y) * 1.2) < 12;
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = idx(x, y);
    if (occ[i] || path[i] || solid[i]) continue;
    const t = tiles[i], z = zones[i];
    const dens = fbm(x / 6, y / 6, seed + 31, 2);
    const r = hash2(x, y, seed + 99);
    const v = (hash2(x, y, seed + 7) * 4) | 0;
    const ox = ((hash2(x, y, seed + 8) - 0.5) * 8) | 0, oy = ((hash2(x, y, seed + 6) - 0.5) * 4) | 0;
    const town = nearTown(x, y);
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
      else if (r < 0.082 && z === Z.WRECK) addProp('bones', x, y, v, ox, oy);
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
  let ax = 3, ay = OVER_H + 3, rowH = 0;
  const alloc = (w, h) => {
    if (ax + w + 4 > W - 2) { ax = 3; ay += rowH + 3; rowH = 0; }
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
      innerNpcs.push({ id: kind === 'tavern' ? 'rosalie' : 'ysolde', x: (x0 + 3) * TILE + 8, y: (y0 + 1) * TILE + 12, dir: 0 });
    } else if (kind === 'forge') {
      put('fourneau', x0 + 1, y0); put('ratelier', x0 + 4, y0, 0); put('ratelier', x0 + 6, y0, 1);
      put('anvil', x0 + 3, y0 + 3); put('tonneau_d', x0 + w - 1, y0 + h - 1); put('crate', x0 + w - 2, y0 + h - 1, 1); put('crate', x0, y0 + h - 1, 0);
    } else if (kind === 'chantier') {
      put('ratelier', x0 + 1, y0, 0); put('etagere', x0 + 3, y0, 1); put('etagere', x0 + 4, y0, 0);
      addProp('boat', x0 + 6, y0 + 3, 0, 0, -2); occ[idx(x0 + 5, y0 + 3)] = 1; occ[idx(x0 + 7, y0 + 3)] = 1;
      put('nets', x0 + 1, y0 + 4); put('crate', x0 + w - 1, y0 + h - 1, 0); put('crate', x0 + w - 2, y0 + h - 1, 2); put('tonneau_d', x0, y0 + h - 1);
      innerNpcs.push({ id: 'ysaline', x: (x0 + 2) * TILE + 8, y: (y0 + 2) * TILE + 12, dir: 0 });
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
    if (r.kind !== 'cave') continue;
    cacheInCave(r, r.name.includes('Crâne') ? 'couleuvrine' : r.name.includes('Cristal') ? 'dague_cristal' : 'poivriere');
  }

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

  // ---------- 12. Personnages non-joueurs ----------
  const freeNear = (x, y) => {
    for (let d = 0; d <= 6; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const i = idx(x + dx, y + dy), t = tiles[i];
      if (!solid[i] && t !== T.DEEP && t !== T.WATER && t !== T.ROCK && t !== T.SWAMP) return [x + dx, y + dy];
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
  ];
  const candidates = {};
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = idx(x, y), z = zones[i];
    if (z === Z.SEA || z === Z.TOWN || z === Z.HAVRE || z === Z.INTERIOR || z === Z.CAVE || y >= OVER_H || solid[i] || path[i]) continue;
    const t = tiles[i];
    if (t === T.DEEP || t === T.ROCK || t === T.PLANK || t === T.COBBLE && z !== Z.RUINS) continue;
    if (Math.hypot(x - TC.x, (y - TC.y) * 1.2) < 24 || Math.hypot(x - HC.x, (y - HC.y) * 1.2) < 18) continue;
    if (x > 123 && x < 179 && y > 61 && y < 91) continue; // pas de morts aux portes du Quartier des Corsaires
    (candidates[z] = candidates[z] || []).push([x, y]);
  }
  for (const z in candidates) shuffle(candidates[z], rng);
  const spawns = [];
  const taken = [];
  for (const [z, mob, count] of spawnPlan) {
    const list = candidates[z] || [];
    let n = 0;
    for (let k = 0; k < list.length && n < count; k++) {
      const [x, y] = list[k];
      if (taken.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 4)) continue;
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
  const q = [];
  for (let i = 0; i < N; i++) {
    const t = tiles[i];
    if (t !== T.DEEP && t !== T.WATER) { waterDist[i] = 0; q.push(i); }
  }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0, d = waterDist[i];
    if (d >= 8) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!inMap(nx, ny)) continue;
      const j = idx(nx, ny);
      if (waterDist[j] > d + 1) { waterDist[j] = d + 1; q.push(j); }
    }
  }

  // navigation : eau libre (pas les quais ni les coques)
  const sail = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const t = tiles[i]; if ((t === T.DEEP || t === T.WATER) && !solid[i] && ((i / W) | 0) < OVER_H) sail[i] = 1; }
  // la mer profonde, les rochers et le bord de carte bloquent
  for (let i = 0; i < N; i++) {
    const t = tiles[i];
    if (t === T.DEEP || t === T.ROCK || t === T.VOID || t === T.CWALL || t === T.IWALL) solid[i] = 1;
    if (t === T.PLANK) solid[i] = solid[i] && occ[i] ? 1 : 0;
  }
  // les décors solides posés sur les ponts/quais ne doivent pas bloquer
  for (const p of props) if ((p.type === 'lamp' || p.type === 'barrel' || p.type === 'crate') && tiles[idx(p.tx, p.ty)] === T.PLANK) solid[idx(p.tx, p.ty)] = 1;

  const spawnPoint = { x: TC.x * TILE + 8, y: (TC.y + 2) * TILE + 8 };
  // numéro de pièce de chaque tuile (-1 = archipel)
  const roomGrid = new Int16Array(N).fill(-1);
  for (const r of rooms) for (let y = r.y0 - 2; y <= r.y0 + r.h; y++) for (let x = r.x0 - 1; x <= r.x0 + r.w; x++) roomGrid[idx(x, y)] = r.id;

  return {
    block: new Uint8Array(N), // constructions des joueurs : 1 bloque tout, 2 bloque les morts
    doorOwner: new Map(), rooms, doors, sail, roomGrid, havre: HC, havreDock, OVER_H,
    plots: plots.map((b) => ({ k: b.plot, name: b.name, room: b.room, door: b.doorId, tx: b.x, ty: b.y, w: b.w, h: b.h })),
    twin: { plates: twinPlates, door: doors.findIndex((d) => d.seal === 'jumeaux'), room: sanct.id }, kraken: { x: KR.x * TILE + 8, y: KR.y * TILE + 8 },
    seed, W, H, tiles, zones, solid, plankDir, waterDist, props, buildings, npcs, spawns, chests,
    spawnPoint, town: TC, lighthouse: LH, ruins: RC, cemetery: CEM, wreck: WR, coastY, dockEnd,
  };
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
  if (t === T.DEEP || t === T.WATER) return false;
  return world.solid[i] === 1;
}
