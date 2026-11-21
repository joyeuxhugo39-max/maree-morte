// Lot 6 : le monde de la Nuit des Mille Voiles. Appelé TOUT À LA FIN de generateWorld, après le braquage : les deux salles
// nouvelles (le parcours du gabier, la Lice) viennent après toutes les autres, les décors après tous les autres, les
// personnages après tous les autres — aucun identifiant existant ne bouge.
// Les décors du festival portent `fest: 1` : ils ne se dessinent (et leurs lumières ne brillent) que pendant une édition.
// Ils ne bloquent jamais le passage : quand le festival est fini, la plage redevient la plage.
import { TILE, T } from './constants.js';
import { CLUES, CHEST_AT, BOTTLE, BUOYS, RACE, WRECKS, SECRET_BUOY } from './data/festival.js';

export const FZ = { FETE: 34, LICE: 35 };

export function buildFest(C) {
  const { tiles, zones, solid, occ, idx, inMap, alloc, rooms, props, addProp, npcs, roomGrid } = C; void props;
  const F = { rooms: {}, spots: [], garlands: [], cannons: [], buoys: [], stage: null, gabier: {}, lice: {} };
  const P = (r, tx, ty) => ({ x: (r.x0 + tx) * TILE + 8, y: (r.y0 + ty) * TILE + 12 });
  const Wd = (tx, ty) => ({ x: tx * TILE + 8, y: ty * TILE + 12 }); // le centre d'une case du monde
  const spot = (k, room, x, y, label, extra = {}) => { F.spots.push({ id: F.spots.length, k, room, x, y, r: extra.r || 20, label, ...extra }); };
  const deco = []; // [type, tx, ty, v, extra] posés en tout dernier
  const put = (type, tx, ty, v = 0, extra = {}) => deco.push([type, tx, ty, v, { fest: 1, ...extra }]);

  // la bande des intérieurs est remplie à la suite jusqu'en bas : on cherche plutôt un rectangle vraiment libre
  // (aucune pièce, une marge tout autour), par une table de sommes cumulées
  const MW = C.W, BAND0 = C.OVER_H + 2, BAND1 = C.H - 2;
  const freeRect = (w, h) => {
    const W1 = MW + 1, rows = BAND1 - BAND0, S = new Int32Array((rows + 1) * W1);
    for (let y = 0; y < rows; y++) for (let x = 0; x < MW; x++) S[(y + 1) * W1 + x + 1] = (roomGrid[idx(x, BAND0 + y)] >= 0 ? 1 : 0) + S[y * W1 + x + 1] + S[(y + 1) * W1 + x] - S[y * W1 + x];
    const sum = (x0, y0, x1, y1) => S[y1 * W1 + x1] - S[y0 * W1 + x1] - S[y1 * W1 + x0] + S[y0 * W1 + x0];
    const ww = w + 6, hh = h + 7;
    for (let y = 0; y + hh < rows; y++) for (let x = 2; x + ww < MW - 2; x++) if (!sum(x, y, x + ww, y + hh)) return [x + 3, BAND0 + y + 4];
    return alloc(w, h); // (ne devrait pas arriver)
  };
  const carve = (key, name, kind, w, h, floor, zone) => {
    const [x0, y0] = freeRect(w, h);
    for (let y = y0 - 2; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) { const i = idx(x, y); tiles[i] = T.IWALL; zones[i] = zone; solid[i] = 1; occ[i] = 0; }
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = idx(x, y); tiles[i] = floor; zones[i] = zone; solid[i] = 0; occ[i] = 0; }
    const r = { id: rooms.length, name, kind, x0, y0, w, h, fest: key };
    rooms.push(r); F.rooms[key] = r.id;
    for (let y = y0 - 2; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) roomGrid[idx(x, y)] = r.id;
    return r;
  };
  const fill = (r, x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = idx(r.x0 + x, r.y0 + y); tiles[i] = t; solid[i] = t === T.VOID || t === T.IWALL ? 1 : 0; } };
  const furn = [];
  const rput = (r, type, tx, ty, v = 0, extra = null) => furn.push([type, r.x0 + tx, r.y0 + ty, v, extra]);

  // ------------------------------------------------------------ la plage en fête : la scène, les stands, les mâts à fanions
  F.stage = { x0: 133 * TILE, y0: 112 * TILE, x1: 140 * TILE, y1: 115 * TILE, cx: 136 * TILE + 8, cy: 112 * TILE + 8 }; // l'estrade (on peut y monter)
  put('estrade', 136, 114, 0);
  put('stand_fete', 156, 110, 0, { name: 'Le comptoir de Zéphyrine' }); put('stand_fete', 130, 110, 1, { name: 'Beignets de la Marée' }); put('stand_fete', 143, 110, 2, { name: 'Les jeux du port' });
  put('stand_fete', 126, 114, 3, { name: 'Le Parcours du gabier' });
  put('tente_lice', 161, 118, 0, { name: 'La Lice des Capitaines' });
  put('arche_fete', 150, 118, 0, { name: 'Arche des Mille Voiles' });
  const poles = [[131, 108], [141, 108], [147, 106], [153, 106], [159, 108], [147, 100], [153, 100], [145, 96], [155, 96], [128, 117], [139, 117], [161, 115], [149, 121], [151, 121]];
  for (const [x, y] of poles) put('mat_fete', x, y, (x + y) % 3);
  const g = (a, b) => F.garlands.push([poles[a][0] * TILE + 8, poles[a][1] * TILE - 10, poles[b][0] * TILE + 8, poles[b][1] * TILE - 10]);
  [[0, 1], [1, 2], [2, 3], [3, 4], [5, 6], [2, 5], [3, 6], [7, 5], [6, 8], [9, 10], [12, 13], [4, 11]].forEach(([a, b]) => g(a, b)); // les guirlandes de fanions, de mât en mât
  for (const [x, y] of [[148, 104], [152, 104], [148, 110], [152, 110], [146, 98], [154, 98], [135, 116], [138, 111], [158, 113], [164, 117], [149, 123], [151, 123], [145, 125], [155, 125]]) put('lampion', x, y, (x * 3 + y) % 4);

  // ------------------------------------------------------------ 1. la batterie de la jetée : trois canons, trois couloirs d'eau au sud
  for (const [k, cx] of [[0, 144], [1, 146], [2, 156]].map(([k, x]) => [k, x])) {
    put('canon_fete', cx, 127, k);
    const c = { id: k, x: cx * TILE + 8, y: 127 * TILE + 10, lane: { x0: (cx - 5) * TILE, x1: (cx + 6) * TILE, y0: 131 * TILE, y1: 141 * TILE } };
    if (k === 2) { c.lane.x0 = 152 * TILE; c.lane.x1 = 163 * TILE; } // le couloir est : il ne mord pas sur les deux autres
    if (k === 1) { c.lane.x0 = 141 * TILE; c.lane.x1 = 151 * TILE; }
    if (k === 0) { c.lane.x0 = 131 * TILE; c.lane.x1 = 141 * TILE; }
    F.cannons.push(c);
    spot('canon', -1, c.x, c.y - 14, 'Prendre le canon du concours', { cannon: k, r: 16 });
  }

  // ------------------------------------------------------------ 2. la chasse au trésor : les indices et les coffres
  for (const c of CLUES) { const w = Wd(c.tx, c.ty); spot('indice', -1, w.x, w.y, `Examiner ${c.at}`, { clue: c.k, r: 22 }); }
  CHEST_AT.forEach((c, v) => { const w = Wd(c.tx, c.ty); spot('coffre_mira', -1, w.x, w.y, 'Le coffre de la grand-mère Bellécume', { variant: v, r: 22 }); });
  { const w = Wd(BOTTLE.tx, BOTTLE.ty); spot('bouteille', -1, w.x, w.y, 'Une bouteille, coincée entre deux rochers', { r: 18 }); }

  // ------------------------------------------------------------ 4. le parcours du gabier : quais, barques, mâture, et une cloche au bout
  {
    const r = carve('gabier', 'Le Parcours du gabier', 'gabier', 72, 14, T.FLOOR, FZ.FETE);
    fill(r, 0, 0, 71, 2, T.VOID); fill(r, 0, 12, 71, 13, T.VOID); // l'eau du port, au nord et au sud des quais
    for (const [x0, x1] of [[9, 10], [35, 36], [57, 62]]) fill(r, x0, 3, x1, 11, T.VOID); // trois bras d'eau
    fill(r, 57, 7, 62, 7, T.FLOOR); // la planche : une seule case de large
    fill(r, 21, 3, 34, 4, T.VOID); fill(r, 21, 10, 34, 11, T.VOID); // le long quai des tonneaux : étroit
    fill(r, 37, 3, 48, 3, T.VOID); // le pont du grand navire
    const S = (k, tx, ty, label, extra) => { const p = P(r, tx, ty); spot(k, r.id, p.x, p.y, label, extra); };
    S('gab_depart', 2, 7, 'Prendre le départ (le chrono part à la ligne)', { r: 20 });
    S('gab_saut', 8, 7, 'Sauter par-dessus le bras d’eau', { to: P(r, 11, 7), r: 24 });
    S('gab_saut', 11, 7, 'Sauter par-dessus le bras d’eau', { to: P(r, 8, 7), r: 24 });
    S('gab_corde', 34, 7, 'Se balancer à la corde', { to: P(r, 37, 7), r: 24 });
    S('gab_corde', 37, 7, 'Se balancer à la corde', { to: P(r, 34, 7), r: 24 });
    S('gab_mat', 42, 10, 'Grimper au grand mât', { to: P(r, 47, 4), r: 20 });
    S('gab_etai', 47, 4, 'Glisser le long de l’étai', { to: P(r, 52, 10), r: 20 });
    S('gab_cloche', 69, 7, 'Sonner la cloche d’arrivée !', { r: 20 });
    S('gab_sortie', 1, 10, 'Quitter le parcours (retour à la plage)', { r: 18 });
    S('gab_sortie', 70, 10, 'Quitter le parcours (retour à la plage)', { r: 18 });
    F.gabier = {
      start: P(r, 2, 7), line: (r.x0 + 4) * TILE + 8, back: Wd(127, 116),
      // les tonneaux roulent d'est en ouest sur le long quai ; la bôme balaie le pont ; les points de reprise
      barrels: { x0: (r.x0 + 34) * TILE, x1: (r.x0 + 21) * TILE, lanes: [5, 7, 9].map((y) => (r.y0 + y) * TILE + 8) },
      boom: { x: (r.x0 + 52) * TILE + 8, y: (r.y0 + 7) * TILE + 8, len: 60 },
      checkpoints: [P(r, 2, 7), P(r, 12, 7), P(r, 37, 7), P(r, 50, 8), P(r, 63, 7)],
    };
    for (const [x, y] of [[14, 4], [15, 4], [17, 10], [18, 10], [13, 9], [38, 5], [39, 5], [44, 6], [66, 4], [67, 10]]) rput(r, (x + y) % 2 ? 'crate' : 'barrel', x, y);
    for (const [x, y] of [[5, 3], [5, 11], [20, 7], [48, 8], [64, 3], [64, 11]]) rput(r, 'lamp', x, y);
    rput(r, 'pillar', 42, 9); rput(r, 'cloche_marine', 69, 6, 1);
  }

  // ------------------------------------------------------------ 5. la Lice des Capitaines : un rond de sable, des gradins, des bannières
  {
    const r = carve('lice', 'La Lice des Capitaines', 'lice', 22, 14, T.SAND, FZ.LICE);
    const S = (k, tx, ty, label, extra) => { const p = P(r, tx, ty); spot(k, r.id, p.x, p.y, label, extra); };
    S('lice_sortie', 11, 12, 'Sortir de la Lice (retour à la plage)', { r: 18 });
    F.lice = { in: P(r, 11, 11), center: P(r, 11, 6), a: P(r, 6, 6), b: P(r, 16, 6), back: Wd(161, 121), x0: (r.x0 + 1) * TILE, x1: (r.x0 + 21) * TILE, y0: (r.y0 + 1) * TILE, y1: (r.y0 + 13) * TILE };
    for (const x of [2, 6, 10, 14, 18]) rput(r, 'gradin', x, 0, x % 2);
    for (const [x, y] of [[0, 3], [21, 3], [0, 10], [21, 10]]) rput(r, 'torch', x, y);
    rput(r, 'banniere', 4, 0, 0); rput(r, 'banniere', 17, 0, 1);
  }
  // les entrées : depuis la plage, par le stand du parcours et par la tente de la Lice
  spot('gab_entree', -1, Wd(127, 116).x, Wd(127, 116).y, 'Entrer sur le Parcours du gabier', { r: 22 });
  spot('lice_entree', -1, Wd(161, 120).x, Wd(161, 120).y, 'Entrer dans la Lice des Capitaines', { r: 22 });

  // ------------------------------------------------------------ 6. la course : les bouées, la ligne, les épaves
  BUOYS.forEach((b, i) => { put('bouee', b.tx, b.ty, i % 3); F.buoys.push({ i, n: b.n, x: b.tx * TILE + 8, y: b.ty * TILE + 8, env: b.env }); });
  put('bouee', RACE.line.x0, RACE.line.y, 3); put('bouee', RACE.line.x1, RACE.line.y, 3);
  put('bouee', SECRET_BUOY.tx, SECRET_BUOY.ty, 4);
  for (const [x, y] of WRECKS) put('mat_epave', x, y, (x + y) % 2);

  // ------------------------------------------------------------ les personnages du festival
  npcs.push({ id: 'mira', x: 141 * TILE + 8, y: 114 * TILE + 12, dir: 0, dir0: 0 });
  npcs.push({ id: 'zephyrine', x: 156 * TILE + 8, y: 111 * TILE + 12, dir: 0, dir0: 0 });
  npcs.push({ id: 'anselin', x: 151 * TILE + 8, y: 124 * TILE + 12, dir: 0, dir0: 0 });
  npcs.push({ id: 'gaston', x: 145 * TILE + 8, y: 125 * TILE + 12, dir: 0, dir0: 0 });
  npcs.push({ id: 'pimprenelle', x: 128 * TILE + 8, y: 117 * TILE + 12, dir: 0, dir0: 0 });
  { const lr = rooms[F.rooms.lice]; npcs.push({ id: 'escarmouche', x: (lr.x0 + 3) * TILE + 8, y: (lr.y0 + 11) * TILE + 12, dir: 2, dir0: 2 }); }
  { // Barnabé, à la Sirène Borgne : la première case libre du mur est de la salle
    const tv = rooms.find((q) => q.name === 'La Sirène Borgne');
    if (tv) {
      let at = null;
      for (let x = tv.x0 + tv.w - 2; x > tv.x0 + 2 && !at; x--) for (let y = tv.y0 + 2; y < tv.y0 + tv.h - 2 && !at; y++) if (!solid[idx(x, y)] && !occ[idx(x, y)] && !npcs.some((n) => Math.abs(n.x - (x * TILE + 8)) < 20 && Math.abs(n.y - (y * TILE + 12)) < 20)) at = [x, y];
      if (at) { npcs.push({ id: 'barnabe', x: at[0] * TILE + 8, y: at[1] * TILE + 12, dir: 1, dir0: 1 }); F.tavern = tv.id; }
    }
  }

  // ------------------------------------------------------------ les décors, posés en tout dernier
  return () => {
    for (const [type, tx, ty, v, extra] of deco) {
      const p = addProp(type, tx, ty, v, 0, 0, extra);
      if (inMap(tx, ty)) occ[idx(tx, ty)] = 0; // un décor de fête ne gêne ni les constructions ni le passage
    }
    for (const [type, x, y, v, extra] of furn) addProp(type, x, y, v, 0, -2, extra);
    return F;
  };
}
