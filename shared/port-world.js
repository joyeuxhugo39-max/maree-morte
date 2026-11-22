// Refonte de Port-Lanterne (1.8.0) : le port de départ devient la vitrine de l'archipel. La ville ne bouge pas, elle
// grandit autour de son cœur : la place de la Flamme, la Sirène Borgne, le quartier des Corsaires.
// Tout est construit EN TOUT DERNIER dans la génération du monde, après le braquage, le festival et le mobilier :
//  - aucun tirage aléatoire déjà fait ne change (on n'utilise ici que hash2, qui dépend de la position) ;
//  - les décors, les portes et les pièces existants gardent leurs numéros (on ajoute à la fin, on ne réordonne rien) ;
//  - rien ne change hors du rectangle PL_BOX (le garde-fou t_monde90 le vérifie case par case).
// Les quartiers :
//  A. le grand port : le quai de pierre continu, la jetée des pêcheurs, le quai du Levant (navires marchands), les grues ;
//  B. la place de la Flamme, agrandie : étals, bancs, panneau d'annonces, quatre accès larges ;
//  C. le quartier de la taverne : la terrasse de la Sirène Borgne, la cour des conteurs ;
//  D. la Grand-Rue et ses échoppes : voilerie, cartographe, épicerie, tonnellerie, corderie, halle aux poissons ;
//  E. le quartier des Ravaudeuses : maisons variées, ruelles, jardins, linge, puits ;
//  F. le chantier naval : la cale, une coque en réparation, l'atelier, la charpentière (réparer, armer un navire) ;
//  G. les hauteurs : le belvédère du phare, le belvédère du Couchant.
import { TILE, T } from './constants.js';
import { hash2 } from './rng.js';

export const PL_BOX = { x0: 111, y0: 60, x1: 179, y1: 131 }; // bornes incluses
// les décors naturels que la ville remplace (les arbres des jardins sont replantés à la main)
const WILD = new Set(['tree', 'jtree', 'palm', 'bush', 'fern', 'flower', 'rock', 'pebble', 'mushroom', 'reeds', 'deadtree', 'shell', 'driftwood', 'starfish', 'lily']);

export function buildPort(C) {
  const { W, tiles, zones, solid, occ, idx, inMap, props, addProp, npcs, doors, sail, waterDist, plankDir, path, spawns, islandOf, Z, PROPS, heist, fest, BERTHS } = C;
  const inBox = (x, y) => x >= PL_BOX.x0 && x <= PL_BOX.x1 && y >= PL_BOX.y0 && y <= PL_BOX.y1;
  const T2 = (x, y) => tiles[idx(x, y)];
  const isWater = (t) => t === T.WATER || t === T.DEEP;

  // ------------------------------------------------------------ 0. ce qu'on ne recouvre jamais
  const keep = new Set(); // cases à laisser libres : devant les portes, sous les PNJ, les points d'épreuve, les quais d'amarrage
  const K = (x, y) => keep.add(idx(x, y));
  for (const d of doors) { const x = Math.floor(d.ox / TILE), y = Math.floor(d.oy / TILE); if (inBox(x, y)) { K(x, y); K(x, y + 1); } }
  for (const n of npcs) { const x = Math.floor(n.x / TILE), y = Math.floor(n.y / TILE); if (inBox(x, y)) { K(x, y); K(x, y + 1); } }
  for (const s of (fest && fest.spots) || []) if (s.room === -1 || s.room == null) { const x = Math.floor(s.x / TILE), y = Math.floor(s.y / TILE); if (inBox(x, y)) K(x, y); }
  for (const s of (heist && heist.spots) || []) if (s.room === -1 || s.room == null) { const x = Math.floor(s.x / TILE), y = Math.floor(s.y / TILE); if (inBox(x, y)) K(x, y); }
  for (const b of BERTHS) if (inBox(b.tx, b.ty)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) K(b.tx + dx, b.ty + dy);
  const festTile = new Set(); for (const p of props) if (p.fest && inBox(p.tx, p.ty)) festTile.add(idx(p.tx, p.ty));
  const solidProp = new Map(); // case → nombre de décors solides qui la tiennent (pour savoir si on peut la libérer)
  for (const p of props) if (PROPS[p.type] && PROPS[p.type].solid && !p.w && inMap(p.tx, p.ty)) { const i = idx(p.tx, p.ty); solidProp.set(i, (solidProp.get(i) || 0) + 1); }

  // ------------------------------------------------------------ 1. la nature cède la place aux rues
  // les rectangles bâtis : on y retire arbres, buissons, fleurs et galets (on en replante dans les jardins)
  const URBAN = [
    [112, 78, 135, 117], // l'ouest : Grand-Rue, Ravaudeuses, chantier
    [112, 117, 128, 127], // la cale et la jetée des pêcheurs
    [125, 113, 174, 122], // le quai de pierre
    [141, 88, 160, 104], // la place agrandie
    [147, 100, 153, 117], // l'avenue du port
    [129, 80, 135, 86], // la cour des conteurs
    [154, 78, 172, 93], // la ruelle des artisans, le belvédère du phare
    [160, 97, 178, 114], // le Levant
  ];
  const urban = (x, y) => URBAN.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  for (let k = props.length - 1; k >= 0; k--) {
    const p = props[k];
    if (!WILD.has(p.type) || !urban(p.tx, p.ty) || !inMap(p.tx, p.ty)) continue;
    const i = idx(p.tx, p.ty);
    props.splice(k, 1);
    if (PROPS[p.type] && PROPS[p.type].solid) { const n = (solidProp.get(i) || 1) - 1; solidProp.set(i, n); if (n <= 0 && T2(p.tx, p.ty) !== T.ROCK && !isWater(T2(p.tx, p.ty))) solid[i] = 0; }
    if (!(solidProp.get(i) > 0)) occ[i] = 0;
  }

  // ------------------------------------------------------------ 2. le sol
  const setT = (x, y, t) => {
    if (!inMap(x, y) || !inBox(x, y)) return;
    const i = idx(x, y);
    tiles[i] = t;
    if (t === T.DEEP) { solid[i] = 1; zones[i] = Z.SEA; }
    else if (t !== T.ROCK && t !== T.WATER && !(solidProp.get(i) > 0) && !occupiedByBuilding(i)) solid[i] = 0;
  };
  const bFoot = new Uint8Array(tiles.length); // l'emprise des bâtiments existants (ne jamais la libérer)
  for (const p of props) if (p.w && p.h && inBox(p.tx, p.ty)) for (let y = p.ty; y < p.ty + p.h; y++) for (let x = p.tx; x < p.tx + p.w; x++) if (inMap(x, y)) bFoot[idx(x, y)] = 1;
  for (const p of props) if ((p.type === 'ship' || p.type === 'lighthouse') && inBox(p.tx, p.ty)) for (let y = p.ty - 6; y <= p.ty; y++) for (let x = p.tx - 7; x <= p.tx + 7; x++) if (inMap(x, y) && solid[idx(x, y)]) bFoot[idx(x, y)] = 1;
  function occupiedByBuilding(i) { return bFoot[i] === 1; }
  const pave = (x0, y0, x1, y1, t = T.COBBLE, over = null) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!inMap(x, y) || bFoot[idx(x, y)]) continue; const t0 = T2(x, y); if (over && !over.includes(t0)) continue; if (t0 === T.PLANK && t !== T.PLANK) continue; setT(x, y, t); path[idx(x, y)] = 1; } };
  const discR = (cx, cy, r, t = T.COBBLE, over = null) => { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if (Math.hypot(x - cx, y - cy) <= r) pave(x, y, x, y, t, over); };
  const line = (pts, r, t) => { for (let s = 0; s < pts.length - 1; s++) { const [x0, y0] = pts[s], [x1, y1] = pts[s + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3); for (let k = 0; k <= n; k++) discR(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, r, t, t === T.DIRT ? [T.GRASS, T.SAND, T.DGRASS, T.JUNGLE, T.DIRT] : null); } };
  const planks = (x0, y0, x1, y1, dir) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!inMap(x, y)) continue; const i = idx(x, y); tiles[i] = T.PLANK; plankDir[i] = dir; path[i] = 1; solid[i] = 0; } };

  // l'ouest : l'ancien chemin de terre et le sable deviennent un quartier (herbe, jardins), le sud reste une plage
  for (let y = 84; y <= 111; y++) for (let x = 112; x <= 133; x++) { const t = T2(x, y); if ((t === T.DIRT || (t === T.SAND && y <= 104 && x <= 131)) && !bFoot[idx(x, y)]) { setT(x, y, T.GRASS); path[idx(x, y)] = 0; } }
  // la porte du Couchant (l'ancien carrefour) et la Grand-Rue jusqu'à la place
  discR(114.5, 87, 2.6);
  pave(113, 86, 115, 98); // la rue du Couchant
  pave(113, 96, 143, 98); // la Grand-Rue
  pave(113, 99, 114, 106); // la rue du Couchant descend jusqu'aux Ravaudeuses
  pave(113, 105, 134, 106); // la rue des Ravaudeuses
  line([[119.5, 99], [119.5, 104]], 0.6, T.DIRT); line([[127, 99], [127, 104]], 0.6, T.DIRT); // deux venelles
  line([[120.5, 107], [120.5, 113]], 0.7, T.DIRT); // des Ravaudeuses au chantier
  line([[134, 106], [140, 108], [146, 111]], 0.9, T.DIRT); // la rue rejoint la plage de la fête
  // le belvédère du Couchant, sur le rocher au nord-ouest
  line([[115, 85], [117, 83], [119, 81]], 0.7, T.DIRT);
  discR(121, 80, 1.9, T.COBBLE);
  // la place de la Flamme, agrandie
  discR(150, 96.5, 7.3);
  // l'avenue du port, large, jusqu'au quai
  pave(148, 101, 152, 116);
  // le quai de pierre : un front de mer continu, et son mur sur l'eau profonde
  pave(128, 117, 172, 120);
  for (let y = 121; y <= 122; y++) for (let x = 128; x <= 172; x++) { if (T2(x, y) === T.PLANK) continue; setT(x, y, T.DEEP); }
  for (let x = 124; x <= 127; x++) for (let y = 117; y <= 120; y++) if (T2(x, y) !== T.PLANK) setT(x, y, T.SAND);
  // le chantier naval : la cour, la cale qui descend dans l'eau
  pave(113, 113, 127, 116, T.DIRT);
  planks(117, 117, 120, 126, 0);
  // la jetée des pêcheurs, entre la cale et la Mouette Écarlate
  planks(126, 120, 127, 126, 0); planks(123, 125, 125, 126, 1); // (courte : le chenal de l'ouest, au sud, reste libre pour les navires)
  for (let y = 121; y <= 131; y++) for (let x = 121; x <= 129; x++) if (T2(x, y) === T.WATER && y >= 126) setT(x, y, T.DEEP);
  // le Levant : la rue, le ponton qui avance, le quai marchand le long de l'eau profonde
  pave(161, 104, 170, 106); // la rue du Levant (elle rejoint l'allée de la guérisseuse, vers la place)
  planks(171, 104, 173, 106, 1); planks(174, 100, 176, 113, 0);
  for (let y = 101; y <= 116; y++) for (let x = 177; x <= 179; x++) { const t = T2(x, y); if ((t === T.WATER || t === T.SAND || t === T.GRASS || t === T.JUNGLE) && !keep.has(idx(x, y)) && !keep.has(idx(x, y - 1))) setT(x, y, T.DEEP); } // (la pointe du phare et son trésor restent)
  for (let y = 100; y <= 114; y++) for (let x = 171; x <= 173; x++) { if (T2(x, y) === T.PLANK) continue; const t = T2(x, y); if (t === T.WATER && (y < 104 || y > 106)) setT(x, y, T.DEEP); }
  // la ruelle des artisans (au nord de la forge) et le belvédère du phare
  pave(155, 84, 168, 85);
  line([[166, 86], [167, 88]], 0.8, T.COBBLE);
  for (let y = 87; y <= 92; y++) for (let x = 165; x <= 172; x++) if (Math.hypot(x - 168.5, y - 89.5) <= 2.8) { const i = idx(x, y); tiles[i] = T.COBBLE; path[i] = 1; if (!bFoot[i] && !(solidProp.get(i) > 0)) solid[i] = 0; }
  line([[161, 91], [161, 95]], 0.7, T.COBBLE); // de la ruelle à la rue du Levant, le long de la forge

  // ------------------------------------------------------------ 3. les bâtiments (façades : les marchands tiennent boutique dehors)
  const blocks = [];
  const facade = (b) => {
    for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      const inside = y < b.y + b.h && x >= b.x && x < b.x + b.w && y >= b.y;
      if (inside) { if (tiles[i] !== T.COBBLE) tiles[i] = b.ground || T.GRASS; solid[i] = 1; bFoot[i] = 1; path[i] = 0; }
      occ[i] = 1;
    }
    props.push({ id: C.nextId(), type: 'cite', v: b.v || 0, x: (b.x + b.w / 2) * TILE, y: (b.y + b.h) * TILE, tx: b.x, ty: b.y, w: b.w, h: b.h, door: b.door, name: b.name, style: b.style, pl: 1 });
    const dx = b.x + b.door, dy = b.y + b.h;
    if (!b.noPath) line([[dx, dy], [dx, dy + (b.step || 1)]], 0.6, T.COBBLE);
    blocks.push(b);
    return b;
  };
  const B = (style, x, y, w, h, door, name, extra = {}) => facade({ style, x, y, w, h, door, name, v: (x * 7 + y * 3) % 9, ...extra });
  // D. la Grand-Rue, côté nord
  B('voilerie', 116, 91, 6, 4, 2, 'La Voilerie Grand-Largue');
  B('cartographe', 123, 91, 5, 4, 2, 'Le Cabinet du Cartographe');
  // E. les Ravaudeuses : maisons au sud de la Grand-Rue (portes sur la rue des Ravaudeuses)
  B('maison', 115, 100, 4, 4, 1, 'Maison aux hortensias');
  B('epicerie', 121, 100, 6, 4, 3, 'Le Comptoir de Zélie');
  B('maison', 128, 100, 5, 4, 2, 'Maison du ravaudeur');
  // E. au nord-ouest, deux maisons hautes autour du belvédère
  B('maison_haute', 113, 79, 5, 4, 2, 'Maison de la veuve Albe', { step: 2 });
  // F. le chantier : l'atelier du calfat et la maison de la charpentière
  B('chantier', 113, 108, 7, 4, 3, 'Chantier naval de Port-Lanterne');
  B('maison', 122, 108, 5, 4, 2, 'Maison de la charpentière');
  // D. la ruelle des artisans, au nord de la forge
  B('tonnellerie', 156, 80, 6, 4, 2, 'Tonnellerie Cercle-de-Fer');
  B('corderie', 163, 80, 6, 4, 2, 'La Corderie du Levant');
  // A. la capitainerie, sur le Levant
  B('capitainerie', 165, 100, 6, 4, 3, 'Capitainerie de Port-Lanterne');

  // ------------------------------------------------------------ 4a. les gens du port (en fin de liste : les anciens PNJ ne bougent pas)
  // les marchands tiennent boutique devant leur échoppe ; les trois derniers n'apparaissent que pendant un événement
  const PNJ = [['charpentiere_pl', 118, 113], ['poissonniere_pl', 133, 116], ['cartographe_pl', 127, 95], ['voiliere_pl', 119, 95], ['epiciere_pl', 125, 104],
    ['tonnelier_pl', 161, 84], ['cordier_pl', 166, 85], ['maitre_port', 170, 104], ['conteur_pl', 130, 85], ['crieur_pl', 154, 99], ['colporteur_pl', 144, 95], ['negociante_pl', 175, 108]];
  for (const [id, x, y] of PNJ) { npcs.push({ id, x: x * TILE + 8, y: y * TILE + 12, dir: 0, dir0: 0, pl: 1 }); K(x, y); K(x, y + 1); }

  // ------------------------------------------------------------ 4. le mobilier
  const taken = new Set(); for (const p of props) if (inMap(p.tx, p.ty) && inBox(p.tx, p.ty)) taken.add(idx(p.tx, p.ty));
  for (const b of blocks) K(b.x + b.door, b.y + b.h); // devant chaque façade, la porte reste dégagée
  const free = (x, y) => inMap(x, y) && !solid[idx(x, y)] && !taken.has(idx(x, y)) && !keep.has(idx(x, y)) && !isWater(T2(x, y)) && T2(x, y) !== T.ROCK && !festTile.has(idx(x, y));
  const put = (type, x, y, v = 0, extra = null, oy = 0) => { if (!free(x, y)) return null; const p = addProp(type, x, y, v, 0, oy, Object.assign({ pl: 1 }, extra || {})); taken.add(idx(x, y)); return p; };
  const onPlank = (x, y) => inMap(x, y) && T2(x, y) === T.PLANK && !taken.has(idx(x, y)) && !keep.has(idx(x, y));
  const putQ = (type, x, y, v = 0, extra = null) => { if (!onPlank(x, y) && !free(x, y)) return null; const p = addProp(type, x, y, v, 0, 0, Object.assign({ pl: 1 }, extra || {})); taken.add(idx(x, y)); if (PROPS[type] && PROPS[type].solid) solid[idx(x, y)] = 1; return p; };
  const placed = { stalls: [], cranes: [], benches: [] };

  // A. le quai de pierre : bittes d'amarrage, grues, aires de chargement, étals de poisson
  for (let x = 130; x <= 171; x += 5) if (x < 147 || x > 153) put('bitte', x, 120, (x >> 2) & 1);
  placed.cranes.push(put('grue', 142, 118, 0), put('grue', 168, 118, 1));
  for (const [x, y, t, v] of [[140, 117, 'caisses', 0], [143, 117, 'tonneaux', 1], [166, 117, 'caisses', 1], [170, 117, 'sacs', 0], [171, 118, 'tonneaux', 0], [158, 117, 'filet_sol', 1], [134, 120, 'cordage', 0]]) put(t, x, y, v);
  for (const [x, v] of [[129, 0], [132, 1], [135, 2]]) { const s = put('etal_poisson', x, 117, v); if (s) placed.stalls.push(s); }
  put('casier', 137, 117, 0); put('seau', 131, 118, 0);
  for (const x of [133, 146, 154, 163]) put('lamp', x, 117);
  // la jetée des pêcheurs : filets qui sèchent, casiers, barques
  put('sechoir', 123, 118, 0); put('sechoir', 125, 116, 1); putQ('casier', 126, 123, 1); putQ('cordage', 124, 126, 1);
  for (const [x, y] of [[124, 127], [129, 124], [122, 124]]) if (inMap(x, y) && isWater(T2(x, y)) && !taken.has(idx(x, y))) { addProp('boat', x, y, 0, 0, 0, { pl: 1 }); taken.add(idx(x, y)); }
  putQ('lamp', 127, 126);
  // F. le chantier : une coque en radoub sur la cale, l'échafaudage, le bois, le goudron
  const hull = addProp('coque', 118, 122, 0, 8, -4, { pl: 1 }); // un brick en radoub : il déborde de la cale, on en fait le tour
  for (let y = 119; y <= 122; y++) for (let x = 115; x <= 122; x++) if (!keep.has(idx(x, y))) { solid[idx(x, y)] = 1; occ[idx(x, y)] = 1; taken.add(idx(x, y)); }
  for (const [t, x, y, v] of [['planches', 122, 114, 0], ['planches', 123, 114, 1], ['tonneaux', 125, 113, 2], ['cabestan', 116, 116, 0], ['anchor', 113, 114, 0], ['caisses', 126, 115, 0], ['seau', 121, 116, 0], ['tabouret', 124, 116, 0], ['workbench', 114, 116, 0]]) put(t, x, y, v);
  put('lamp', 121, 112); put('lamp', 115, 117);
  // B. la place : étals, bancs, panneau d'annonces, lanternes aux coins
  for (const [x, y, v] of [[144, 101, 2], [156, 101, 3]]) { const s = put('stall', x, y, v); if (s) placed.stalls.push(s); }
  for (const [x, y] of [[145, 91], [146, 102], [154, 102]]) { const b = put('bench', x, y); if (b) placed.benches.push(b); }
  const board = put('panneau', 156, 98, 0);
  for (const [x, y] of [[143, 92], [157, 92], [143, 102], [157, 103]]) put('lamp', x, y);
  for (const [x, y] of [[148, 103], [152, 103], [148, 112], [152, 112]]) put('lamp', x, y);
  for (const [x, y, v] of [[147, 90, 1], [153, 90, 3], [142, 100, 2]]) put('pot_fleurs', x, y, v); // (rien au milieu des quatre entrées de la place)
  // C. la taverne : la terrasse, la cour des conteurs
  for (const [x, y, v] of [[135, 93, 0], [142, 93, 1], [133, 95, 1]]) put('table_ext', x, y, v);
  put('lanterne_r', 134, 90, 0); put('lanterne_r', 143, 90, 0);
  discR(131, 84, 2.2);
  const fire = put('feu_camp', 131, 84, 0);
  for (const [x, y] of [[129, 84], [133, 84], [131, 82]]) put('tabouret', x, y, 0);
  for (const [x, y, v] of [[129, 82, 0], [133, 86, 1]]) put('tonneaux', x, y, v);
  line([[131, 86], [134, 89], [136, 91]], 0.6, T.COBBLE);
  // D. les échoppes : un comptoir dehors, le stock, l'enseigne
  for (const [x, y, v] of [[120, 95, 0], [126, 95, 1], [126, 104, 2], [160, 84, 0], [167, 84, 1]]) put('comptoir_ext', x, y, v);
  for (const [t, x, y, v] of [['rouleaux', 121, 95, 0], ['tonneaux', 155, 83, 0], ['tonneaux', 162, 84, 1], ['cordage', 164, 86, 0], ['cordage', 168, 86, 1], ['sacs', 122, 104, 1], ['caisses', 120, 104, 1]]) put(t, x, y, v);
  // E. les Ravaudeuses : jardins, linge, puits
  for (const [x0, y0, x1] of [[115, 104, 118], [129, 104, 132]]) for (let x = x0; x <= x1; x += 3) put('potager', x, y0 - 0, (x & 1));
  for (const [x, y, v] of [[120, 103, 0], [127, 103, 1], [117, 89, 2], [122, 112, 0]]) put('linge', x, y, v);
  put('well', 129, 108);
  for (let x = 131; x <= 133; x++) put('fence', x, 108, 0);
  for (const [x, y, v] of [[133, 101, 1], [114, 101, 2], [121, 90, 3], [128, 95, 0]]) put('tree', x, y, v);
  for (const [x, y, v] of [[132, 103, 0], [115, 95, 2], [122, 85, 4], [127, 88, 1], [133, 90, 3]]) put('flower', x, y, v);
  for (const [x, y] of [[116, 98], [128, 98], [133, 106], [120, 106], [113, 110]]) put('lamp', x, y);
  // G. les belvédères : longue-vue, bancs, muret sur le vide
  const spy1 = put('longue_vue', 170, 88, 0); put('bench', 167, 88, 0); for (const [x, y] of [[171, 90], [171, 91], [170, 92]]) put('muret', x, y, 0);
  const spy2 = put('longue_vue', 121, 79, 1); put('bench', 120, 81, 0); put('escalier', 118, 83, 0);
  put('escalier', 166, 87, 1);
  // l'entrée du Couchant : l'arche de bois qui dit le nom du port
  const gate = addProp('porche', 113, 88, 0, 0, 0, { pl: 1 }); occ[idx(113, 88)] = 1;
  // la plage de la fête, entre la place et le quai : hors édition, une barque retournée, des filets, un banc (rien sur les stands)
  for (const [t, x, y, v] of [['boat', 155, 107, 0], ['sechoir', 139, 107, 1], ['filet_sol', 145, 108, 0], ['filet_sol', 158, 113, 1], ['bench', 146, 105, 0], ['driftwood', 152, 114, 1]]) put(t, x, y, v);
  // A. le Levant : grue, caisses de la Douane, lanternes au bout du quai
  placed.cranes.push(putQ('grue', 176, 104, 2));
  for (const [t, x, y, v] of [['caisses', 174, 102, 2], ['tonneaux', 174, 111, 0], ['sacs', 175, 112, 1], ['cordage', 175, 108, 0]]) putQ(t, x, y, v);
  putQ('lamp', 176, 100); putQ('lamp', 176, 113); put('lamp', 169, 106);

  // C. dans la Sirène Borgne : une table de plus près du feu, la table de dés, des lanternes, les tonneaux en perce
  {
    const r = C.rooms && C.rooms.find((q) => q.name === 'La Sirène Borgne' && q.kind === 'tavern');
    if (r) {
      const inside = (dx, dy) => { const x = r.x0 + dx, y = r.y0 + dy, i = idx(x, y); return !solid[i] && !taken.has(i) && tiles[i] !== T.EXIT && !npcs.some((n) => Math.floor(n.x / TILE) === x && Math.floor(n.y / TILE) === y); };
      const room = (type, dx, dy, v = 0) => { if (!inside(dx, dy)) return null; const p = addProp(type, r.x0 + dx, r.y0 + dy, v, 0, -2, { pl: 1 }); taken.add(idx(r.x0 + dx, r.y0 + dy)); return p; };
      room('table', 6, 4, 1); room('chaise', 5, 4, 0); room('chaise', 7, 4, 1); // une table de plus : plus d'habitués le soir
      room('table_jeu', 12, 6, 0); // les dés de Barnabé
      room('lanterne_r', 7, 0, 0); room('lanterne_r', 11, 0, 0);
      room('tonneaux', 14, 0, 1); room('tonneau_d', 14, 1, 1); // (pas en 6,1 : Rosalie sortirait plus de derrière son comptoir)
      room('tapis_deco', 10, 5, 0);
    }
  }

  // ------------------------------------------------------------ 5. les navires au mouillage (décor, mais ils barrent l'eau)
  // (une goélette au mouillage dans la baie de l'ouest a été essayée : elle barrait le chenal par lequel les navires
  // quittent le quai d'amarrage vers l'ouest ; le port garde la Mouette Écarlate, la Mouche d'Or, la coque en radoub,
  // les barques, et le navire marchand du Levant quand il accoste)
  const ships = [];
  for (const s of ships) {
    const L = 134, Bm = 44; // la goélette
    for (let y = Math.floor((s.y - Bm / 2) / TILE); y <= Math.floor((s.y + Bm / 2) / TILE); y++) for (let x = Math.floor((s.x - L / 2) / TILE); x <= Math.floor((s.x + L / 2) / TILE); x++) if (inMap(x, y)) { solid[idx(x, y)] = 1; occ[idx(x, y)] = 1; sail[idx(x, y)] = 0; }
  }

  // ------------------------------------------------------------ 6. la zone sûre s'étend sur les nouveaux quartiers
  const z0s = new Map(spawns.map((m) => [m, inMap(Math.floor(m.x / TILE), Math.floor(m.y / TILE)) ? zones[idx(Math.floor(m.x / TILE), Math.floor(m.y / TILE))] : 0]));
  const TOWNR = [[112, 78, 147, 127], [125, 113, 174, 122], [154, 78, 176, 114]];
  for (const [x0, y0, x1, y1] of TOWNR) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!inMap(x, y)) continue; const t = T2(x, y); if (t !== T.DEEP) zones[idx(x, y)] = Z.TOWN; }
  // les morts de la plage reculent : un point d'apparition tombé en ville part sur la plage, plus à l'ouest
  for (const m of spawns) {
    m.z0 = m.z0 != null ? m.z0 : z0s.get(m);
    const tx = Math.floor(m.x / TILE), ty = Math.floor(m.y / TILE);
    if (!inMap(tx, ty) || zones[idx(tx, ty)] !== Z.TOWN || !inBox(tx, ty)) continue;
    let best = null;
    for (let r = 6; r < 40 && !best; r++) for (let a = 0; a < 24 && !best; a++) {
      const x = Math.round(tx - 22 + Math.cos(a / 24 * 6.283) * r), y = Math.round(ty + Math.sin(a / 24 * 6.283) * r * 0.6);
      if (!inMap(x, y) || inBox(x, y)) continue;
      const i = idx(x, y); if (solid[i] || occ[i] || isWater(tiles[i]) || (zones[i] !== m.z0 && zones[i] !== Z.BEACH)) continue;
      best = [x, y];
    }
    if (best) { m.x = best[0] * TILE + 8; m.y = best[1] * TILE + 8; m.moved = 1; }
    delete m.z0;
  }

  // ------------------------------------------------------------ 6 bis. 1.9.1 : plus de rue sous un bâtiment
  // Des tracés de la 0.6 passaient sous des maisons : la rue du nord (x 148-150) débordait dans la maison aux volets bleus,
  // et les allées des deux maisons du sud traversaient leur propre emprise. Les bâtiments ne bougent pas (portes et
  // intérieurs identiques) : ce sont les rues qui les contournent.
  for (const p of props) {
    if (!(p.w && p.h && inBox(p.tx, p.ty) && ['house', 'tavern', 'forge', 'home', 'cite'].includes(p.type))) continue;
    for (let y = p.ty; y < p.ty + p.h; y++) for (let x = p.tx; x < p.tx + p.w; x++) { const i = idx(x, y); if (tiles[i] === T.COBBLE || tiles[i] === T.DIRT) { tiles[i] = T.GRASS; path[i] = 0; } }
  }
  const unpave = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = idx(x, y); if (tiles[i] === T.COBBLE) { tiles[i] = T.GRASS; path[i] = 0; } } };
  unpave(150, 80, 150, 82); // la rue du nord longe la maison aux volets bleus (x 148-149), sans passer sous son toit
  unpave(155, 79, 169, 79); // la rue des parcelles ne passe plus sous les toits de la tonnellerie et de la corderie
  line([[138, 105.5], [141.6, 105.5], [141.6, 101.2], [145, 99]], 0.9, T.COBBLE); // l'allée de la maison du sud-ouest, par le côté
  line([[161, 105], [158.4, 105], [158.4, 101.2], [155, 99]], 0.9, T.COBBLE); // celle du sud-est, depuis la rue du Levant

  // ------------------------------------------------------------ 7. finitions : eau profonde, navigation, distance à l'eau, île
  for (let y = PL_BOX.y0; y <= PL_BOX.y1; y++) for (let x = PL_BOX.x0; x <= PL_BOX.x1; x++) {
    const i = idx(x, y), t = tiles[i];
    if (t === T.DEEP) { solid[i] = 1; if (!occ[i] || sail[i]) sail[i] = occ[i] ? sail[i] : 1; }
    else if (t === T.WATER) { if (!occ[i]) sail[i] = 1; }
    else sail[i] = 0;
    if (t === T.ROCK) solid[i] = 1;
  }
  // le long du mur du quai, deux rangées d'eau où l'on ne manœuvre pas (on accoste au ponton, pas contre le mur)
  for (let y = 121; y <= 122; y++) for (let x = 128; x <= 172; x++) if (tiles[idx(x, y)] === T.DEEP) sail[idx(x, y)] = 0;
  // les coques amarrées et les bateaux posés restent infranchissables pour un navire
  for (const p of props) if (p.pl && (p.type === 'boat' || p.type === 'coque') && inBox(p.tx, p.ty)) sail[idx(p.tx, p.ty)] = 0; // (les grands navires amarrés gardent l'emprise qu'ils avaient)
  for (let y = PL_BOX.y0; y <= PL_BOX.y1; y++) for (let x = PL_BOX.x0; x <= PL_BOX.x1; x++) { if (!inMap(x, y)) continue; const i = idx(x, y); waterDist[i] = isWater(tiles[i]) ? 255 : 0; }
  for (let pass = 0; pass < 9; pass++) for (let y = PL_BOX.y0; y <= PL_BOX.y1; y++) for (let x = PL_BOX.x0; x <= PL_BOX.x1; x++) {
    const i = idx(x, y); if (!isWater(tiles[i])) continue;
    let m = 255; for (const j of [i - 1, i + 1, i - W, i + W]) m = Math.min(m, waterDist[j] + 1);
    waterDist[i] = Math.min(m, 255);
  }
  if (islandOf) {
    const id0 = islandOf[idx(150, 96)];
    for (let y = PL_BOX.y0; y <= PL_BOX.y1; y++) for (let x = PL_BOX.x0; x <= PL_BOX.x1; x++) { const i = idx(x, y); if (isWater(tiles[i])) islandOf[i] = 0; else if (!islandOf[i]) islandOf[i] = id0; }
  }

  // ------------------------------------------------------------ 8. les points d'apparition : autour de la Flamme, hors des passages
  const spawnPoints = [];
  {
    const lanes = (x, y) => (x >= 148 && x <= 152 && y >= 100) || (y >= 96 && y <= 98 && (x <= 143 || x >= 157)) || (x >= 148 && x <= 150 && y <= 91) || (x >= 145 && x <= 148 && y >= 99 && y <= 102); // (et l'étal d'où file le voleur)
    const cand = [];
    for (let y = 88; y <= 105; y++) for (let x = 141; x <= 159; x++) {
      const d = Math.hypot(x - 150, y - 96.5);
      if (d < 2.4 || d > 8.6 || lanes(x, y)) continue;
      let ok = true;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = idx(x + dx, y + dy); if (solid[i] || isWater(tiles[i])) ok = false; }
      if (!ok || keep.has(idx(x, y)) || taken.has(idx(x, y))) continue;
      cand.push([x, y, d]);
    }
    // on en garde une vingtaine, bien répartis : au moins deux cases d'écart
    cand.sort((a, b) => hash2(a[0], a[1], 77) - hash2(b[0], b[1], 77));
    for (const [x, y] of cand) { if (spawnPoints.some((s) => Math.abs(s.tx - x) < 2 && Math.abs(s.ty - y) < 2)) continue; spawnPoints.push({ tx: x, ty: y, x: x * TILE + 8, y: y * TILE + 8 }); if (spawnPoints.length >= 32) break; }
  }

  // ------------------------------------------------------------ 9. ce que le reste du jeu doit savoir
  const at = (x, y) => ({ x: x * TILE + 8, y: y * TILE + 8 });
  return {
    box: PL_BOX, quai: { x0: 128, x1: 172, y0: 117, y1: 120 }, spawnPoints, ships,
    // les grands passages (on n'y fait apparaître personne)
    lanes: [[148, 100, 152, 140], [100, 96, 143, 98], [157, 96, 200, 98], [148, 60, 150, 91], [145, 99, 148, 102]], blocks: blocks.map((b) => ({ name: b.name, style: b.style, x: b.x, y: b.y, w: b.w, h: b.h, door: b.door })),
    anchors: {
      square: at(150, 96), flame: at(150, 95), board: board ? at(board.tx, board.ty + 1) : at(156, 99), crier: at(153, 98),
      tavernDoor: at(138, 92), terrace: at(137, 94), brawl: at(136, 95), fire: fire ? at(fire.tx, fire.ty) : at(131, 84),
      fishMarket: at(132, 118), quayW: at(136, 119), quayE: at(164, 119), pier: at(150, 124),
      hull: hull ? at(119, 123) : null, yard: at(121, 115), jetty: at(126, 126),
      levantWharf: at(175, 106), levantShip: { x: 182 * TILE, y: 104 * TILE + 8 }, douane: at(165, 113), capitainerie: at(168, 104),
      gate: at(114, 88), westStreet: at(120, 97), spy1: spy1 ? at(169, 89) : null, spy2: spy2 ? at(121, 80) : null,
    },
    cranes: placed.cranes.filter(Boolean).map((p) => p.id), stalls: placed.stalls.filter(Boolean).map((p) => p.id),
    gate: gate ? gate.id : null,
  };
}
