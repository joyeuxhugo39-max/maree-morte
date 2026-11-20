// Lot 5 : le monde du Plus Grand Braquage. Appelé TOUT À LA FIN de generateWorld : les nouvelles pièces viennent après
// toutes les anciennes, les nouveaux décors après tous les anciens décors, les nouveaux personnages après Silas — aucun
// identifiant existant ne bouge. L'île aux Sept Courants est posée après le relevé des îles : elle n'est sur aucune carte.
// Coordonnées des pièces : en cases, relatives à leur coin (x0, y0).
import { TILE, T, OVER_H } from './constants.js';

export const HZ = { HEIST: 32, SEPT: 33 }; // les zones ajoutées (voir ZONES dans world.js)
const DECOR = new Set(['tree', 'jtree', 'palm', 'bush', 'fern', 'flower', 'rock', 'pebble', 'mushroom', 'reeds', 'deadtree', 'shell', 'driftwood', 'starfish', 'lily']);

export function buildHeist(C) {
  const { W, tiles, zones, solid, occ, idx, inMap, alloc, rooms, doors, props, addProp, npcs, roomGrid, sail, waterDist, stampPath } = C;
  const H = { rooms: {}, spots: [], guards: [], crabs: [], crowd: [], gates: {}, bars: [], kegs: [], cannons: [], jumps: [] };
  const P = (r, tx, ty) => ({ x: (r.x0 + tx) * TILE + 8, y: (r.y0 + ty) * TILE + 12 });
  const spot = (k, r, tx, ty, label, extra = {}) => { const p = P(r, tx, ty); H.spots.push({ id: H.spots.length, k, room: r.id, x: p.x, y: p.y, r: extra.r || 22, label, ...extra }); };
  const furniture = [];
  const put = (r, type, tx, ty, v = 0, extra = null) => furniture.push([type, r.x0 + tx, r.y0 + ty, v, extra]);

  // ------------------------------------------------------------ pièces : creusées dans la bande des intérieurs
  const carve = (key, name, kind, w, h, floor, zone) => {
    const [x0, y0] = alloc(w, h);
    for (let y = y0 - 2; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) { const i = idx(x, y); tiles[i] = T.IWALL; zones[i] = zone; solid[i] = 1; occ[i] = 0; }
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = idx(x, y); tiles[i] = floor; zones[i] = zone; solid[i] = 0; occ[i] = 0; }
    const r = { id: rooms.length, name, kind, x0, y0, w, h, heist: key };
    rooms.push(r); H.rooms[key] = r.id;
    for (let y = y0 - 2; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) roomGrid[idx(x, y)] = r.id;
    return r;
  };
  const wall = (r, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = idx(r.x0 + x, r.y0 + y); tiles[i] = T.IWALL; solid[i] = 1; } };
  const fill = (r, x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = idx(r.x0 + x, r.y0 + y); tiles[i] = t; solid[i] = t === T.VOID || t === T.IWALL ? 1 : 0; } };
  // une porte vers le dehors : la case de sortie au bas de la pièce, à la colonne ex
  const outDoor = (r, ex, out) => {
    const exx = r.x0 + ex, exy = r.y0 + r.h;
    tiles[idx(exx, exy)] = T.EXIT; solid[idx(exx, exy)] = 0;
    for (let x = exx - 1; x <= exx + 1; x++) occ[idx(x, exy - 1)] = 1;
    const d = { id: doors.length, room: r.id, name: r.name, kind: r.kind, secret: false, heist: 1,
      ox: out.x * TILE + 8, oy: out.y * TILE + 8, rx: out.x * TILE + 8, ry: out.y * TILE + 12, ix: exx * TILE + 8, iy: (exy - 1) * TILE + 10, ex: exx * TILE + 8, ey: exy * TILE + 8 };
    doors.push(d); return d;
  };
  // une façade dehors (bâtiment de la cité) ; on dégage la végétation du terrain
  const facades = [];
  const facade = (b, zone) => {
    for (let i = props.length - 1; i >= 0; i--) { const p = props[i]; if (DECOR.has(p.type) && p.tx >= b.x - 2 && p.tx <= b.x + b.w + 1 && p.ty >= b.y - 2 && p.ty <= b.y + b.h + 2) { if (inMap(p.tx, p.ty)) { occ[idx(p.tx, p.ty)] = 0; solid[idx(p.tx, p.ty)] = 0; } props.splice(i, 1); } }
    for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
      if (!inMap(x, y)) continue;
      const i = idx(x, y);
      if (tiles[i] !== T.COBBLE) tiles[i] = b.ground || T.DIRT;
      occ[i] = 1; zones[i] = zone; solid[i] = y < b.y + b.h && x >= b.x && x < b.x + b.w && y >= b.y ? 1 : 0;
    }
    facades.push(b);
    return b;
  };

  // ------------------------------------------------------------ A. l'entrepôt de la Douane, sur la plage des quais
  {
    const r = carve('entrepot', 'Entrepôt de la Douane', 'entrepot', 24, 12, T.FLOOR, HZ.HEIST);
    const b = facade({ type: 'cite', style: 'entrepot', x: 161, y: 108, w: 8, h: 4, door: 4, name: 'Entrepôt de la Douane', ground: T.DIRT, v: 3 }, 1);
    stampPath([[b.x + b.door, b.y + b.h], [b.x + b.door, b.y + b.h + 2], [b.x + b.door - 6, b.y + b.h + 5]], 0.9, T.COBBLE);
    H.doors = { entrepot: outDoor(r, 12, { x: b.x + b.door, y: b.y + b.h }).id };
    for (const [x0, y0, x1, y1] of [[3, 2, 4, 4], [3, 6, 4, 8], [9, 1, 10, 3], [9, 5, 10, 7], [15, 3, 16, 5], [15, 7, 16, 9], [20, 6, 21, 8]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(r, (x + y) % 3 ? 'crate' : 'barrel', x, y, (x * 7 + y) % 3);
    put(r, 'chest', 21, 1, 0, { heist: 'uniformes' }); put(r, 'lamp', 1, 1); put(r, 'lamp', 22, 10); put(r, 'lamp', 12, 1);
    spot('uniformes', r, 21, 2, 'Fouiller le coffre de la Douane', { q: 'br_preparatifs', r: 20 });
    const g = (path, dir, look) => H.guards.push({ mob: 'douanier', room: 'entrepot', path: path.map(([x, y]) => P(r, x, y)), dir, look });
    g([[2, 10], [22, 10]], 2, null);
    g([[7, 1], [7, 9], [13, 9], [13, 1]], 0, null);
    g([[19, 3]], 1, [1, 0, 1, 3]);
  }

  // ------------------------------------------------------------ B. l'atelier de l'architecte (la maison du charpentier) et sa cave
  {
    const at = rooms.find((q) => q.name === 'Maison du charpentier');
    at.name = 'Atelier de Corvin Lafleur'; at.atelier = 1; H.rooms.atelier = at.id;
    for (const d of doors) if (d.room === at.id) d.name = at.name;
    const free = (tx, ty) => !occ[idx(at.x0 + tx, at.y0 + ty)] && !solid[idx(at.x0 + tx, at.y0 + ty)];
    const pick = (cands) => cands.find(([x, y]) => free(x, y)) || cands[0];
    const desk = pick([[at.w - 1, 1], [at.w - 2, 1], [0, 1], [1, 1]]), hatch = pick([[0, at.h - 2], [1, at.h - 2], [at.w - 1, at.h - 2]]);
    const arch = pick([[(at.w >> 1) - 1, 2], [(at.w >> 1), 2], [2, 2]]);
    put(at, 'table', desk[0], desk[1], 0, { heist: 'bureau' }); occ[idx(at.x0 + desk[0], at.y0 + desk[1])] = 1;
    spot('bureau', at, desk[0], desk[1] + 1, 'Forcer le tiroir du bureau', { q: 'br_preparatifs', r: 18 });
    spot('trappe', at, hatch[0], hatch[1], 'Descendre à la cave', { r: 16 });
    H.lafleur = { ...P(at, arch[0], arch[1]), desk: P(at, desk[0], desk[1]) };
    npcs.push({ id: 'lafleur', x: H.lafleur.x, y: H.lafleur.y, dir: 0, dir0: 0 });
    const cv = carve('cave', 'Cave de l’atelier', 'cellier', 12, 7, T.STONEF, HZ.HEIST);
    cv.anchorRoom = at.id; // sur la carte : sous l'atelier
    spot('echelle', cv, 1, 1, 'Remonter à l’atelier', { r: 16 });
    H.caveIn = P(cv, 2, 2); H.atelierIn = P(at, hatch[0] + (hatch[0] ? -1 : 1), hatch[1]);
    for (const [x, y] of [[0, 6], [11, 6], [11, 0], [5, 0], [6, 6]]) put(cv, x % 2 ? 'tonneau_d' : 'barrel', x, y);
    for (const [x, y] of [[4, 2], [8, 2], [9, 4], [6, 5], [3, 5], [10, 1]]) H.crabs.push(P(cv, x, y));
  }

  // ------------------------------------------------------------ C. le comptable, à la Sirène Borgne (table de l'entrée)
  {
    const sb = rooms.find((q) => q.name === 'La Sirène Borgne');
    H.brechet = P(sb, 2, 6);
    npcs.push({ id: 'brechet', x: H.brechet.x, y: H.brechet.y, dir: 2, dir0: 2, sit: 1 });
    spot('manteau', sb, 2, 6, 'Fouiller le manteau de Bréchet', { q: 'br_preparatifs', r: 18, away: 1 });
  }

  // ------------------------------------------------------------ la demeure d'Octave Valdorne
  {
    const r = carve('demeure', 'Demeure d’Octave Valdorne', 'demeure', 46, 20, T.FLOOR, HZ.HEIST);
    const b = facade({ type: 'cite', style: 'palais', x: 146, y: 62, w: 10, h: 6, door: 4, name: 'Demeure d’Octave Valdorne', ground: T.COBBLE, v: 4 }, 1);
    stampPath([[150, 68], [150, 77]], 1.0, T.COBBLE);
    H.doors.demeure = outDoor(r, 13, { x: b.x + b.door, y: b.y + b.h }).id;
    H.mansionDoorOut = { x: (b.x + b.door) * TILE + 8, y: (b.y + b.h) * TILE + 12 };
    // les murs : le grand salon | la galerie | la salle des archives (et du mur plein sous elle)
    wall(r, 28, 0, 28, 13); wall(r, 28, 17, 28, 19);
    wall(r, 38, 0, 38, 2); wall(r, 38, 5, 38, 19); fill(r, 39, 12, 45, 19, T.IWALL);
    H.gates.archives = [idx(r.x0 + 38, r.y0 + 3), idx(r.x0 + 38, r.y0 + 4)];
    for (const i of H.gates.archives) { tiles[i] = T.FLOOR; solid[i] = 0; }
    H.hall = { x0: r.x0 * TILE, y0: r.y0 * TILE, x1: (r.x0 + 28) * TILE, y1: (r.y0 + 20) * TILE };
    H.gallery = { x0: (r.x0 + 29) * TILE, y0: r.y0 * TILE, x1: (r.x0 + 38) * TILE, y1: (r.y0 + 20) * TILE };
    H.archives = { x0: (r.x0 + 39) * TILE, y0: r.y0 * TILE, x1: (r.x0 + 46) * TILE, y1: (r.y0 + 12) * TILE };
    H.hallBack = P(r, 24, 15); H.archDoorIn = P(r, 40, 4); H.archDoorOut = P(r, 36, 4);
    // le salon : cheminée, buffet, tables, musiciens sur un tapis, sofas, statues
    put(r, 'cheminee', 13, 0); for (const x of [2, 3, 4, 5, 6]) put(r, 'comptoir', x, 17);
    for (const [x, y] of [[8, 7], [11, 7], [17, 7], [20, 7], [9, 12], [19, 12]]) put(r, 'table', x, y);
    for (const [x, y] of [[3, 2], [4, 2], [5, 2], [3, 3], [4, 3], [5, 3]]) put(r, 'tapis_deco', x, y);
    for (const [x, y] of [[22, 1], [24, 1], [1, 9], [26, 9]]) put(r, 'divan', x, y, x % 2);
    for (const [x, y] of [[0, 0], [27, 0], [0, 19], [27, 19]]) put(r, 'plante', x, y);
    for (const [x, y] of [[9, 0], [17, 0]]) put(r, 'banniere', x, y);
    for (const x of [6, 20]) put(r, 'lanterne_r', x, 0);
    // la galerie : deux statues (on peut s'y cacher), des bannières ; la salle des archives : étagères, bureau, coffre central
    put(r, 'statue', 31, 6); put(r, 'statue', 35, 11); put(r, 'banniere', 33, 0); put(r, 'lanterne_r', 30, 0); put(r, 'lanterne_r', 36, 0);
    for (const x of [40, 41, 43, 44, 45]) put(r, 'etagere', x, 0, x % 2);
    put(r, 'table', 40, 2, 0, { heist: 'registre' }); put(r, 'chest', 42, 6, 1, { heist: 'coffre' }); put(r, 'etagere', 45, 10, 1); put(r, 'lanterne_r', 39, 11);
    spot('vestiaire', r, 2, 15, 'Revêtir l’uniforme de la garde', { q: 'br_casse', r: 22 });
    spot('coffre', r, 42, 7, 'Ouvrir le coffre central', { q: 'br_casse', r: 20 });
    spot('fenetre', r, 45, 4, 'Sauter par la fenêtre', { q: 'br_poursuite', r: 18 });
    H.chest = P(r, 42, 6); H.registre = P(r, 40, 2); H.window = P(r, 45, 4);
    npcs.push({ id: 'valdorne', x: P(r, 13, 2).x, y: P(r, 13, 2).y, dir: 0, dir0: 0 });
    npcs.push({ id: 'ferrant', x: P(r, 20, 14).x, y: P(r, 20, 14).y, dir: 1, dir0: 1 });
    H.brawl = P(r, 18, 14);
    const g = (tx, ty, path, dir, look, extra = {}) => H.guards.push({ mob: 'garde_valdorne', room: 'demeure', path: (path || [[tx, ty]]).map(([x, y]) => P(r, x, y)), dir, look, ...extra });
    g(30, 13, null, 2, [2, 3, 2, 0], { post: 1 }); // devant l'entrée de la galerie, tourné vers le salon
    g(36, 6, null, 1, [1, 0, 1, 3], { post: 1 }); // devant la porte des archives
    g(0, 0, [[33, 2], [33, 16]], 0, null);          // la ronde de la galerie
    g(26, 16, null, 3, [3, 1, 3, 2], { hall: 1 });  // au salon, près de l'arche
    // la réception : invités, domestiques, musiciens (de simples silhouettes, jouées par le client)
    const L = (skin, hair, hs, top, topCol, pants, hat, hatCol, beard = 0) => ({ skin, hair, hairStyle: hs, top, topCol, pants, boots: 'black', hat, hatCol, beard });
    const who = [
      ['musicien', 3, 3, 0, L(0, 3, 'long', 'gilet', 'red', 'navy', 'bonnet', 'red')], ['musicien', 5, 3, 0, L(2, 1, 'court', 'chemise', 'white', 'black', null, null)], ['musicien', 4, 4, 0, L(1, 5, 'queue', 'vareuse', 'green', 'brown', 'plume', 'green')],
      ['invite', 8, 9, 3, L(0, 2, 'long', 'manteau', 'purple', 'white', 'tricorne', 'black')], ['invite', 9, 10, 1, L(3, 0, 'court', 'capitaine', 'green', 'black', 'plume', 'green')], ['invite', 7, 10, 2, L(1, 6, 'long', 'chemise', 'yellow', 'white', null, null)],
      ['invite', 17, 9, 0, L(0, 4, 'chauve', 'gilet', 'black', 'black', null, null, 2)], ['invite', 18, 10, 1, L(2, 2, 'long', 'manteau', 'teal', 'white', 'foulard', 'teal')],
      ['invite', 21, 4, 0, L(1, 1, 'queue', 'capitaine', 'white', 'black', 'tricorne', 'white')], ['invite', 23, 5, 1, L(0, 3, 'long', 'manteau', 'red', 'black', 'plume', 'red')],
      ['invite', 12, 13, 2, L(3, 4, 'court', 'gilet', 'orange', 'brown', 'bandana', 'orange', 1)], ['invite', 14, 14, 1, L(0, 2, 'long', 'chemise', 'purple', 'white', 'foulard', 'purple')],
      ['invite', 24, 12, 3, L(1, 0, 'hirsute', 'vareuse', 'navy', 'navy', 'bonnet', 'navy', 1)], ['invite', 5, 13, 0, L(2, 6, 'long', 'manteau', 'green', 'white', 'tricorne', 'green')],
      ['domestique', 6, 16, 0, L(0, 1, 'court', 'tablier', 'white', 'black', null, null), [[6, 16], [12, 10], [22, 10], [16, 16]]],
      ['domestique', 20, 17, 0, L(1, 3, 'queue', 'tablier', 'white', 'black', null, null), [[20, 17], [24, 7], [12, 5], [8, 15]]],
    ];
    for (const [role, x, y, dir, look, path] of who) H.crowd.push({ role, room: r.id, ...P(r, x, y), dir, look, path: path ? path.map(([px, py]) => P(r, px, py)) : null });
  }

  // ------------------------------------------------------------ les toits de Port-Lanterne (en haut) et les ruelles (en bas)
  {
    const r = carve('toits', 'Les toits de Port-Lanterne', 'toits', 96, 18, T.FLOOR, HZ.HEIST);
    r.anchor = { x: 152 * TILE + 8, y: 96 * TILE + 8 }; // pas de porte : sur la carte, on court entre la demeure et les quais
    fill(r, 0, 7, 95, 9, T.IWALL); fill(r, 0, 10, 95, 17, T.COBBLE);
    const GAPS = [15, 34, 53, 72];
    for (const g of GAPS) fill(r, g, 0, g + 2, 6, T.VOID);
    for (const g of GAPS) {
      spot('saut', r, g - 1, 3, 'Sauter par-dessus la ruelle', { r: 30, to: P(r, g + 3, 3), lane: [r.y0 * TILE + 8, (r.y0 + 6) * TILE + 12] });
      spot('saut', r, g + 3, 3, 'Sauter par-dessus la ruelle', { r: 30, to: P(r, g - 1, 3), lane: [r.y0 * TILE + 8, (r.y0 + 6) * TILE + 12] });
      H.jumps.push([P(r, g - 1, 3), P(r, g + 3, 3)]);
    }
    spot('echelle_t', r, 25, 6, 'Descendre l’échelle', { r: 18, to: P(r, 25, 10) }); spot('echelle_t', r, 25, 10, 'Monter sur les toits', { r: 18, to: P(r, 25, 6) });
    spot('echelle_t', r, 63, 6, 'Descendre l’échelle', { r: 18, to: P(r, 63, 10) }); spot('echelle_t', r, 63, 10, 'Monter sur les toits', { r: 18, to: P(r, 63, 6) });
    spot('echelle_t', r, 44, 6, 'Passer par une fenêtre', { r: 18, to: P(r, 44, 10) }); // à travers une mansarde, jusqu'à la ruelle
    spot('descente', r, 95, 3, 'Descendre sur les quais', { r: 26 }); spot('descente', r, 95, 13, 'Rejoindre les quais', { r: 26 });
    H.roofStart = P(r, 1, 3); H.silasStart = P(r, 6, 3);
    const path = [[6, 3]]; for (const g of GAPS) { path.push([g - 1, 3], [g + 3, 3, 1]); } path.push([94, 3]);
    H.roofPath = path.map(([x, y, j]) => ({ ...P(r, x, y), jump: !!j }));
    // les obstacles : cheminées sur les toits, caisses et linge dans les ruelles
    for (const x of [8, 22, 29, 41, 47, 60, 67, 79, 86]) put(r, 'pillar', x, x % 2 ? 1 : 5); // les cheminées, de part et d'autre du faîte où court Silas
    for (const [x, y] of [[10, 12], [11, 12], [20, 15], [31, 11], [38, 14], [39, 14], [50, 12], [58, 15], [69, 11], [77, 14], [88, 12]]) put(r, x % 2 ? 'crate' : 'barrel', x, y);
    for (const [x, y] of [[14, 10], [36, 10], [70, 10]]) put(r, 'linge', x, y);
    for (const [x, y] of [[5, 16], [30, 16], [55, 16], [80, 16]]) put(r, 'lamp', x, y);
    for (const [x, y] of [[32, 13], [59, 12], [84, 14]]) H.guards.push({ mob: 'garde_valdorne', room: 'toits', path: [P(r, x, y)], dir: 1, look: [1, 3, 2, 0], chase: 1 });
    for (const [x, y] of [[45, 2], [66, 4]]) H.guards.push({ mob: 'garde_valdorne', room: 'toits', path: [P(r, x, y)], dir: 1, look: [1, 0], chase: 1, alarm: 1 });
  }

  // ------------------------------------------------------------ La Mouche d'Or : à quai au bout de la grande jetée, et son pont
  {
    const r = carve('pont', 'Pont de La Mouche d’Or', 'pont', 36, 14, T.FLOOR, HZ.HEIST);
    H.shipAt = { tx: 163, ty: 128 };
    H.gangway = { x: 156 * TILE + 8, y: 125 * TILE + 10 };
    H.docks = { x: 154 * TILE + 8, y: 125 * TILE + 10 };
    r.anchor = { x: 163 * TILE + 8, y: 128 * TILE + 8 }; // sur la carte : le navire, à quai
    H.spots.push({ id: H.spots.length, k: 'passerelle', room: -1, x: H.gangway.x, y: H.gangway.y, r: 24, label: 'Monter à bord de La Mouche d’Or', q: 'br_poursuite' });
    spot('retour', r, 0, 7, 'Redescendre sur la jetée', { r: 16 });
    H.deckIn = P(r, 2, 7); H.dinghy = P(r, 34, 7); H.silasDeck = P(r, 28, 7);
    for (const [x, y] of [[10, 6], [24, 6]]) put(r, 'pillar', x, y);
    for (const [x, y] of [[6, 1], [6, 12], [17, 1], [17, 12], [29, 1], [29, 12]]) { put(r, 'tonneau_d', x, y, 1); H.kegs.push(P(r, x, y)); }
    for (const [x, y, bar] of [[8, 0, 0], [8, 13, 0], [26, 0, 1], [26, 13, 1]]) { put(r, 'cannon', x, y, y ? 1 : 0); spot('canon', r, x, y ? y - 1 : y + 1, 'Pointer le canon sur la barricade', { r: 18, bar }); H.cannons.push({ ...P(r, x, y), bar }); }
    put(r, 'boat', 34, 7, 0);
    for (const bx of [13, 22]) { const g = []; for (let y = 2; y <= 11; y++) for (const x of [bx, bx + 1]) g.push(idx(r.x0 + x, r.y0 + y)); H.bars.push(g); }
    [13, 22].forEach((bx, k) => { for (let y = 2; y <= 11; y += 1) put(r, (y + k) % 3 ? 'crate' : 'barrel', bx + (y % 2), y, (y + bx) % 3, { heistBar: k }); }); // les barricades (dessinées quand elles sont dressées)
    H.barTiles = [13, 22].map((bx) => { const L = []; for (let y = 2; y <= 11; y++) L.push([r.x0 + bx, r.y0 + y]); return L; });
  }

  // ------------------------------------------------------------ l'île aux Sept Courants : au large de l'ouest, hors des cartes
  {
    const cx = 52, cy = 218, R0 = 6;
    for (let y = cy - R0 - 2; y <= cy + R0 + 2; y++) for (let x = cx - R0 - 3; x <= cx + R0 + 10; x++) {
      if (!inMap(x, y) || y >= OVER_H) continue;
      const i = idx(x, y), d = Math.hypot((x - cx) / 1.25, y - cy);
      if (d < R0 - 2.5) { tiles[i] = T.GRASS; zones[i] = HZ.SEPT; solid[i] = 0; sail[i] = 0; }
      else if (d < R0) { tiles[i] = T.SAND; zones[i] = HZ.SEPT; solid[i] = 0; sail[i] = 0; }
      else if (d < R0 + 1.6) { tiles[i] = T.WATER; zones[i] = HZ.SEPT; solid[i] = 0; sail[i] = 1; }
    }
    for (let x = cx + 6; x <= cx + 12; x++) for (const y of [cy, cy + 1]) { const i = idx(x, y); tiles[i] = T.PLANK; solid[i] = 0; sail[i] = 0; zones[i] = HZ.SEPT; } // le ponton
    for (let y = cy - R0 - 8; y <= cy + R0 + 8; y++) for (let x = cx - R0 - 10; x <= cx + R0 + 18; x++) { // l'eau près de la côte
      if (!inMap(x, y) || y >= OVER_H) continue;
      const i = idx(x, y);
      if (tiles[i] !== T.WATER && tiles[i] !== T.DEEP) { waterDist[i] = 0; continue; }
      let md = 9; for (let dy = -8; dy <= 8 && md > 1; dy++) for (let dx = -8; dx <= 8; dx++) { const j = idx(x + dx, y + dy), t = tiles[j]; if (t !== T.WATER && t !== T.DEEP) md = Math.min(md, Math.max(Math.abs(dx), Math.abs(dy))); }
      waterDist[i] = Math.min(waterDist[i], md);
      if (md <= 2 && tiles[i] === T.DEEP) tiles[i] = T.WATER;
      if (tiles[i] === T.WATER) solid[i] = 0;
    }
    const isl = { type: 'cite', style: 'masure', x: cx - 3, y: cy - 4, w: 5, h: 3, door: 2, name: 'Comptoir de Madame Corail', ground: T.SAND, v: 5 };
    facade(isl, HZ.SEPT);
    for (const [x, y] of [[cx - 5, cy + 2], [cx + 4, cy - 3], [cx - 1, cy + 4], [cx + 3, cy + 3]]) furniture.push(['palm', x, y, (x + y) % 3, null]);
    furniture.push(['crate', cx + 2, cy, 0, null], ['barrel', cx + 3, cy + 1, 1, null], ['lamp', cx + 6, cy - 1, 0, null]);
    H.sept = { cx: cx * TILE + 8, cy: cy * TILE + 8, r0: 24 * TILE, r1: 40 * TILE, dock: { x: (cx + 11) * TILE + 8, y: cy * TILE + 10 } };
    npcs.push({ id: 'corail', x: (cx - 1) * TILE + 8, y: (cy + 1) * TILE + 10, dir: 0, dir0: 0 });
  }

  // Silas en prison (fin B)
  { const jail = rooms.find((q) => q.kind === 'prison'); if (jail) npcs.push({ id: 'silas_geole', x: (jail.x0 + 2) * TILE + 8, y: (jail.y0 + 1) * TILE + 12, dir: 0, dir0: 0, sit: 1 }); }

  // ------------------------------------------------------------ les décors, posés en tout dernier (les anciens gardent leurs numéros)
  return (late) => {
    for (const b of facades) addProp(b.type, b.x, b.y, b.v || 0, b.w * TILE / 2 - 8, b.h * TILE - 14, { w: b.w, h: b.h, door: b.door, name: b.name, style: b.style });
    for (const [type, x, y, v, extra] of furniture) {
      const p = addProp(type, x, y, v, 0, -2, extra);
      if (extra && extra.heist) H['prop_' + extra.heist] = p.id;
      if (extra && extra.heistBar != null) { solid[idx(x, y)] = 0; occ[idx(x, y)] = 0; } // c'est le serveur qui dresse la barricade (world.block)
    }
    H.ship = addProp('ship', H.shipAt.tx, H.shipAt.ty, 1, 0, 0, { name: 'La Mouche d’Or' }).id;
    if (late) late(H);
    return H;
  };
}
