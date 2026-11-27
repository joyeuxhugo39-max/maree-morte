// 2.0 : la refonte des lieux du Plus Grand Braquage, vérifiée sur le vrai monde et le vrai serveur.
//  1. chaque lieu : son plan se lit (pièces distinctes, sols, murs, décor mural choisi), ses meubles sont posés sur du
//     sol (rien dans un mur, rien dans le vide), aucun ne bouche une porte ;
//  2. tout ce qui sert au jeu est accessible depuis la porte : points d'interaction, personnages, gardes et leurs rondes,
//     figurants de la réception, tournées des domestiques, points des scènes ;
//  3. personne ne se marche dessus : chaque figurant a sa case, libre, et les domestiques passent à côté des invités ;
//  4. les gardes contournent murs et meubles (ils rejoignent la bagarre du salon de jeu, puis leur poste) ;
//  5. la poursuite : les trois itinéraires restent praticables (le faîte, les ruelles, la ville) ; le pont : chaque canon
//     reste atteignable, barricades dressées ;
//  6. le quartier : de la rue des Corsaires à la porte de la demeure, par le portail ;
//  7. les sauvegardes : un pirate enregistré dans l'ancien atelier reparaît dans le neuf ; un pirate enregistré sur une
//     case devenue meuble ne reste pas coincé.
import { Game } from '../server/game.js';
import { PROTOCOL, TILE, T } from '../shared/constants.js';
import { generateWorld, canStand, roomIdAt } from '../shared/world.js';
import { CINEMAS } from '../shared/data/cinemas.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const W = generateWorld(), H = W.heist, D = H.decor;
const R = (k) => W.rooms[H.rooms[k]];
const idx = (x, y) => y * W.W + x, tileOf = (p) => [Math.floor(p.x / TILE), Math.floor((p.y - 4) / TILE)];
const free = (x, y) => !W.solid[idx(x, y)];
// le remplissage depuis un point (cases libres, en croix)
const flood = (x0, y0, extraBlock = null) => {
  const seen = new Uint8Array(W.W * W.H), q = [x0, y0];
  if (!free(x0, y0)) return seen;
  seen[idx(x0, y0)] = 1;
  for (let k = 0; k < q.length; k += 2) { const x = q[k], y = q[k + 1]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, i = idx(nx, ny); if (!seen[i] && free(nx, ny) && !(extraBlock && extraBlock.has(i))) { seen[i] = 1; q.push(nx, ny); } } }
  return seen;
};
const reach = (seen, p) => { const [x, y] = tileOf(p); return !!seen[idx(x, y)] || [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => seen[idx(x + dx, y + dy)]); };
const segClear = (a, b) => { const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3); for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n), x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - 4; if (W.solid[idx(Math.floor(x / TILE), Math.floor(y / TILE))]) return false; } return true; };
const doorIn = (r) => W.doors.find((d) => d.room === r.id);

// ---------------- 1. les plans
const dem = R('demeure');
ok(dem.areas && dem.areas.length === 7 && dem.areas.join('|') === 'Le grand salon|Le vestibule|L’office|Le salon de jeu|La galerie|Les archives|Le cabinet de Valdorne', `la demeure : sept pièces distinctes (${dem.areas.join(', ')})`);
{ const styles = new Set(); for (let i = 0; i < dem.fl.length; i++) if (dem.fl[i] && dem.fl[i] < 64) styles.add(dem.fl[i]); const walls = new Set(dem.wsk);
  ok(styles.size >= 5 && walls.size === 7, `chaque pièce a son sol et son mur (${styles.size} sols, ${walls.size} styles de mur), et ${dem.carpets.length} tapis`); }
const rebuilt = D.rebuilt.map((id) => W.rooms[id]);
ok(rebuilt.length === 6 && rebuilt.every((r) => r.fl && r.noDeco), 'six pièces redessinées d’après un plan écrit, sans décor mural tiré au hasard');
ok(rebuilt.every((r) => !r.wd || [...r.wd.keys()].every((k) => { const x = k % 4096, y = (k / 4096) | 0; return W.tiles[idx(x, y)] !== T.IWALL && W.tiles[idx(x, y - 1)] === T.IWALL; })), 'chaque décor accroché l’est à un vrai mur (au-dessus d’une case de sol)');
{ // les fenêtres : seulement sur un mur qui donne dehors (le mur du haut de la pièce, deux rangées d'épaisseur, au bord de l'enveloppe)
  const bad = [];
  for (const r of rebuilt) if (r.wd) for (const [k, d] of r.wd) if (d[0] === 'fenetre' || d[0] === 'fenetre_s') { const y = (k / 4096) | 0; if (y !== r.y0 && !(r.heist === 'toits')) bad.push(`${r.name} (${k % 4096 - r.x0}, ${y - r.y0})`); }
  ok(!bad.length, `aucune fenêtre sur un mur intérieur${bad.length ? ' — ' + bad.join(', ') : ''}`); }
{ const bad = D.placed.filter((q) => q.cells.some(([x, y]) => { const r = q.room >= 0 ? W.rooms[q.room] : null, X = (r ? r.x0 : 0) + x, Y = (r ? r.y0 : 0) + y, t = W.tiles[idx(X, Y)]; return t === T.IWALL || t === T.VOID; }));
  ok(D.placed.length > 250 && !bad.length, `${D.placed.length} meubles et décors posés, aucun dans un mur ni dans le vide${bad.length ? ' — ' + bad.map((q) => q.type).join(', ') : ''}`); }
{ const bad = [];
  for (const r of [...rebuilt]) { const d = doorIn(r); if (!d) continue; const ex = Math.floor(d.ex / TILE), ey = Math.floor(d.ey / TILE); for (const [dx, dy] of [[0, -1], [-1, -1], [1, -1], [0, -2]]) if (!free(ex + dx, ey + dy)) bad.push(r.name); }
  ok(!bad.length, `aucun meuble ne bouche une porte (la case de sortie et ses abords)${bad.length ? ' — ' + bad.join(', ') : ''}`); }

// ---------------- 2. tout est accessible depuis la porte
const checkRoom = (r, label, pts) => { const d = doorIn(r), [x, y] = d ? tileOf({ x: d.ix, y: d.iy }) : tileOf(pts[0].p); const seen = flood(x, y); const bad = pts.filter((q) => !reach(seen, q.p)).map((q) => q.n); ok(!bad.length, `${label} : ${pts.length} points accessibles depuis l’entrée${bad.length ? ' — INACCESSIBLES : ' + bad.join(', ') : ''}`); return seen; };
const spots = (r) => H.spots.filter((s) => s.room === r.id).map((s) => ({ n: s.k, p: s }));
const guards = (k) => H.guards.filter((g) => g.room === k).flatMap((g, i) => g.path.map((p, j) => ({ n: `garde ${i}.${j}`, p })));
const npc = (id) => ({ n: id, p: W.npcs.find((n) => n.id === id) });
checkRoom(dem, 'la demeure', [...spots(dem), ...guards('demeure'), npc('valdorne'), npc('ferrant'), { n: 'retour au salon', p: H.hallBack }, { n: 'archives', p: H.archDoorIn }, { n: 'coffre', p: H.chest }, { n: 'bagarre', p: H.brawl }, ...H.crowd.map((c, k) => ({ n: c.role + k, p: c }))]);
checkRoom(R('entrepot'), 'l’entrepôt', [...spots(R('entrepot')), ...guards('entrepot')]);
checkRoom(R('atelier'), 'l’atelier', [...spots(R('atelier')), npc('lafleur'), { n: 'bureau', p: H.lafleur.desk }, { n: 'retour de la cave', p: H.atelierIn }]);
{ const cv = R('cave'), seen = flood(...tileOf(H.caveIn)); const bad = [...spots(cv), ...H.crabs.map((p, k) => ({ n: 'crabe ' + k, p }))].filter((q) => !reach(seen, q.p)); ok(!bad.length && H.crabs.length === 6 && H.crabs.every((p) => canStand(W, p.x, p.y)), 'la cave : l’échelle et les six crabes, sur des cases libres, accessibles'); }
ok(R('cave').anchorRoom === R('atelier').id && W.doors.find((d) => d.room === R('atelier').id).name === 'Atelier de Corvin Lafleur', 'la porte de la maison mène à l’atelier neuf ; la cave est sous l’atelier (sur la carte)');
// les scènes : leurs points de marche sont sur du sol (relatifs à la pièce)
{ const bad = [];
  for (const id of ['br_reception', 'br_trahison']) for (const s of CINEMAS[id].steps) if (s.do === 'walk') for (const [x, y] of s.path) { if (typeof x !== 'number') continue; const tx = Math.floor(dem.x0 + x), ty = Math.floor(dem.y0 + y); if (W.solid[idx(tx, ty)]) bad.push(`${id} (${x}, ${y})`); }
  for (const id of ['br_reception', 'br_trahison']) for (const s of CINEMAS[id].steps) if (s.do === 'cam' && s.to.tile) { const [x, y] = s.to.tile; if (x < 0 || y < 0 || x >= dem.w || y >= dem.h) bad.push(`${id} caméra (${x}, ${y})`); }
  ok(!bad.length, `les scènes de la réception et de la trahison marchent sur le sol du nouveau plan${bad.length ? ' — ' + bad.join(', ') : ''}`); }

// ---------------- 3. personne ne se marche dessus
{ const cells = new Map(), bad = [];
  for (const [k, c] of H.crowd.entries()) { const [x, y] = tileOf(c); const key = idx(x, y); if (W.solid[key] && !c.sit) bad.push(`${c.role}${k} dans un meuble`); if (cells.has(key)) bad.push(`${c.role}${k} sur la case de ${cells.get(key)}`); cells.set(key, c.role + k); }
  ok(H.crowd.length >= 24 && !bad.length, `${H.crowd.length} figurants à la réception, chacun sur sa case${bad.length ? ' — ' + bad.join(', ') : ''}`);
  const roles = new Set(H.crowd.map((c) => c.role));
  ok(['invite', 'musicien', 'domestique', 'cuisinier', 'majordome', 'portier', 'officier'].every((r) => roles.has(r)), `des rôles distincts : ${[...roles].join(', ')}`);
  const G = H.reception.groups, sizes = G.map((g) => g.slots.filter((s) => s.who >= 0).length);
  ok(G.length >= 8 && sizes.filter((n) => n >= 2).length >= 7 && G.every((g) => g.slots.some((s) => s.who < 0) || g.k === 'jeu'), `${G.length} groupes de conversation (des places libres pour qui change de groupe) : ${G.map((g, i) => g.k + ' ' + sizes[i]).join(', ')}`);
  const occ = new Set(H.reception.blocked);
  const badR = []; H.reception.rounds.forEach((legs, k) => legs.forEach((L, j) => { for (let i = 1; i < L.path.length; i++) if (!segClear(L.path[i - 1], L.path[i])) badR.push(`tournée ${k}, étape ${j}`); for (const p of L.path.slice(1, -1)) { const [x, y] = tileOf(p); if (occ.has(idx(x, y))) badR.push(`tournée ${k} passe sur une place`); } }));
  ok(!badR.length, `les ${H.reception.rounds.length} tournées des domestiques contournent meubles et invités${badR.length ? ' — ' + badR.slice(0, 4).join(', ') : ''}`); }

// ---------------- 4. les gardes contournent murs et meubles (vrai serveur)
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const wait = (ms) => new Promise((r) => setTimeout(r, ms)), tick = (n) => { for (let i = 0; i < n; i++) game.tick(); };
const login = async (name, data = null) => { if (data) store.set(name.toLowerCase(), data); const c = { msgs: [], send(m) { this.msgs.push(m); if (this.msgs.length > 600) this.msgs.splice(0, 300); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: PROTOCOL, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; if (p) { p.c = c; p.tut = 99; } return p; };
{ const A = await login('Arpenteuse'); game.teleport(A, H.hallBack.x, H.hallBack.y, {}); tick(4);
  const Gd = game.hs.guards.filter((m) => m.hg.room === 'demeure' && (m.hg.post || m.hg.hall));
  const t0 = game.time; game.hs.brawlUntil = game.time + 40; for (const g of Gd) g.hg.distractUntil = game.hs.brawlUntil;
  let all = false; for (let k = 0; k < 20 * 25 && !all; k++) { game.tick(); all = Gd.every((g) => Math.hypot(g.x - H.brawl.x, g.y - H.brawl.y) < 44); }
  ok(all, `la bagarre : les ${Gd.length} gardes en faction rejoignent le salon de jeu par les portes (${Math.round(game.time - t0)} s)`);
  for (const g of Gd) g.hg.distractUntil = 0; game.hs.brawlUntil = 0;
  let back = false; for (let k = 0; k < 20 * 30 && !back; k++) { game.tick(); back = Gd.every((g) => Math.hypot(g.x - g.hg.path[0].x, g.y - g.hg.path[0].y) < 6); }
  ok(back, 'puis chacun regagne son poste (galerie, grille des archives, arche du salon)');
  const B = await login('Badaude'); game.teleport(B, (R('entrepot').x0 + 12) * TILE + 8, (R('entrepot').y0 + 11) * TILE + 10, {}); B.lab = 1; // un pirate dans chaque lieu : les gardes ne s'animent qu'en présence de quelqu'un
  game.teleport(A, H.hallBack.x, H.hallBack.y, {}); A.lab = 1;
  const pat = game.hs.guards.filter((m) => (m.hg.room === 'demeure' || m.hg.room === 'entrepot') && m.hg.path.length > 1);
  const seen = new Map(pat.map((m) => [m, new Set()]));
  for (let k = 0; k < 20 * 70; k++) { game.tick(); for (const m of pat) seen.get(m).add(m.hg.i % m.hg.path.length); }
  ok(pat.every((m) => seen.get(m).size === m.hg.path.length), `les ${pat.length} rondes (galerie, entrepôt) font leur tour complet sans buter`);
  A.lab = 0; B.lab = 0;
  // un garde en alerte poursuit un intrus derrière un meuble (il le contourne)
  const g = game.hs.guards.find((m) => m.hg.room === 'demeure' && m.hg.post);
  const r = dem, tgt = { x: (r.x0 + 29.5) * TILE, y: (r.y0 + 10) * TILE + 12 }; // derrière la vitrine de l'alcôve
  game.teleport(A, tgt.x, tgt.y, {}); A.heist.disguise = false; g.hg.alert = true; g.hg.alertUntil = game.time + 30; g.state = 'chase'; g.target = A.id; A.hp = 1e7; A.stats.maxHp = 1e7;
  let close = false; for (let k = 0; k < 20 * 12 && !close; k++) { game.tick(); close = Math.hypot(g.x - A.x, g.y - A.y) < 30; }
  ok(close, 'un garde en alerte contourne les vitrines et les refends pour rattraper l’intrus');
  for (const m of game.hs.guards) game.heistCalm(m);
}

// ---------------- 5. la poursuite et le pont
{ const r = R('toits'), seen = flood(...tileOf(H.roofStart));
  const segs = []; let a = H.roofPath[0]; for (const p of H.roofPath.slice(1)) { if (!p.jump && !segClear(a, p)) segs.push(`${Math.floor(a.x / TILE) - r.x0}→${Math.floor(p.x / TILE) - r.x0}`); a = p; }
  ok(!segs.length, `le faîte : la course de Silas passe entre les cheminées, de saut en saut${segs.length ? ' — BLOQUÉ : ' + segs.join(', ') : ''}`);
  const jumps = H.spots.filter((s) => s.k === 'saut'); const land = jumps.every((s) => canStand(W, s.to.x, s.to.y) && canStand(W, s.x, s.y));
  ok(jumps.length === 8 && land, 'les huit sauts (quatre ruelles, dans les deux sens) partent et retombent sur le toit');
  const ech = H.spots.filter((s) => s.k === 'echelle_t'), desc = H.spots.filter((s) => s.k === 'descente');
  const low = flood(...tileOf(ech.find((s) => s.y > (r.y0 + 8) * TILE)));
  ok(ech.every((s) => canStand(W, s.x, s.y) && canStand(W, s.to.x, s.to.y)) && reach(low, desc[1]) && ech.filter((s) => s.y > (r.y0 + 8) * TILE).every((s) => reach(low, s)), 'les ruelles : des échelles et la mansarde jusqu’au bout, où l’on rejoint les quais');
  let topOk = true; for (const s of [H.spots.find((q) => q.k === 'saut' && q.to.x > q.x), ...desc.slice(0, 1)]) { const sk = flood(...tileOf(s)); topOk = topOk && reach(sk, s); }
  ok(topOk && reach(flood(...tileOf(jumps[jumps.length - 2].to)), desc[0]), 'le faîte mène, de saut en saut, à la terrasse du port et à la descente');
  ok(reach(flood(...tileOf(H.gangway)), H.docks), 'la ville : des quais à la passerelle de La Mouche d’Or, à pied');
  const p = R('pont'), block = new Set(H.bars.flat()), deck = flood(...tileOf(H.deckIn), block), deck0 = flood(...tileOf(H.deckIn));
  const cannons = H.spots.filter((s) => s.k === 'canon');
  ok(cannons.length === 4 && cannons.filter((s) => s.bar === 0).every((s) => reach(deck, s)) && cannons.every((s) => reach(deck0, s)), 'le pont : barricades dressées, les canons de la proue restent à portée ; barricades tombées, tous');
  ok([H.silasDeck, H.dinghy, ...H.kegs].every((q) => reach(deck0, q) || [[0, 16], [16, 0], [-16, 0], [0, -16]].some(([dx, dy]) => reach(deck0, { x: q.x + dx, y: q.y + dy }))), 'le pont : Silas, sa chaloupe et les six barils sont atteignables');
  ok(p.outdoor && r.outdoor && p.voidStyle === 'mer' && r.voidStyle === 'ruelle', 'les toits et le pont sont dehors (la lumière du ciel ; la ruelle en bas, la mer autour)');
}

// ---------------- 6. le quartier
{ const Q = H.quartier, d = W.doors[H.doors.demeure], street = flood(150, 78);
  ok(reach(street, { x: d.ox, y: d.oy + 4 }), 'de la rue des Corsaires à la porte de la demeure : par le portail, la ruelle et l’allée');
  ok(Q.arrive.every((p) => canStand(W, p.x, p.y - 2)) && Q.arrive.slice(1).every((p, k) => segClear(Q.arrive[k], p)), 'les invités du soir montent l’allée sans traverser la fontaine ni les lanternes');
  ok(Q.figures.length === 5 && Q.figures.every((f) => canStand(W, f.x, f.y - 2)), 'quatre gardes de la maison et le jardinier, chacun à sa place');
  const plots = W.plots.filter((pl) => pl.tx >= 130 && pl.tx <= 170 && pl.ty >= 70 && pl.ty <= 76).map((pl) => W.doors[pl.door]).filter(Boolean);
  ok(plots.length === 6 && plots.every((dd) => reach(street, { x: dd.ox, y: dd.oy + 4 })), `les ${plots.length} maisons à vendre du quartier, devant la demeure, restent accessibles depuis la rue`);
}

// ---------------- 7. les sauvegardes
{ const old = W.rooms.find((r) => r.name === 'Maison du charpentier' && H.legacy && H.legacy[0].room === r.id);
  const P1 = await login('Ancienne', { v: 10, x: (old.x0 + 3) * TILE + 8, y: (old.y0 + 3) * TILE + 10, level: 18, quests: {}, inv: [], eq: {} });
  ok(P1 && P1.room === R('atelier').id, 'enregistré dans l’ancien atelier de Lafleur : on reparaît dans le neuf');
  const cell = D.placed.find((q) => q.type === 'buffet_m'), [cx, cy] = cell.cells[0];
  const P2 = await login('Coincee', { v: 10, x: (dem.x0 + cx) * TILE + 8, y: (dem.y0 + cy) * TILE + 10, level: 18, quests: {}, inv: [], eq: {} });
  ok(P2 && canStand(W, P2.x, P2.y), 'enregistré là où l’on a posé le buffet : on n’y reste pas coincé');
  ok(roomIdAt(W, H.hallBack.x, H.hallBack.y) === dem.id && canStand(W, H.hallBack.x, H.hallBack.y), 'le salon où l’on est reconduit est praticable');
}
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
