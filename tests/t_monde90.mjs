// Monde vivant, lot 2 : le garde-fou du monde. Les lots qui touchent au décor (environnements, mobilier, vie des
// lieux) ne doivent ni déplacer l'ancien monde, ni murer quoi que ce soit.
//  1. le sol et les zones de la version 1.6.1 n'ont pas bougé (empreinte enregistrée dans tests/fixtures) ;
//  2. une case qui était libre en 1.6.1 l'est encore, sauf exceptions listées et justifiées (le mobilier ajouté) ;
//  3. chaque personnage, chaque porte, chaque coffre se trouve dans un espace praticable d'au moins 20 cases ;
//  4. le monde est le même à chaque génération (déterministe).
// 1.8 : la refonte de Port-Lanterne change, volontairement, le rectangle de la ville (W.port.box) : le sol, les zones et
// la navigation y sont nouveaux. Hors de ce rectangle, tout reste vérifié case par case contre la 1.6.1 ; dedans, on
// vérifie ce qui doit survivre (parcelles, portes, personnages, coffres, points d'apparition, accès praticables).
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { generateWorld, canStand } from '../shared/world.js';
import { TILE } from '../shared/constants.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const W = generateWorld(), N = W.W * W.H;
const h = (a) => createHash('sha1').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex').slice(0, 16);
const FX = new URL('./fixtures/monde-1.6.1.json', import.meta.url);
const free = new Uint8Array(N); for (let i = 0; i < N; i++) free[i] = W.solid[i] === 1 ? 0 : 1;
if (!fs.existsSync(FX) || process.env.MONDE_BASE === '1') { // la photographie de référence (faite une fois, sur la 1.6.1)
  const pack = Buffer.from(free).toString('base64');
  fs.writeFileSync(FX, JSON.stringify({ version: '1.6.1', W: W.W, H: W.H, tiles: h(W.tiles), zones: h(W.zones), free: pack, props: W.props.length, npcs: W.npcs.length, doors: W.doors.length }));
  console.log('référence enregistrée');
}
const B = JSON.parse(fs.readFileSync(FX, 'utf8'));
ok(B.W === W.W && B.H === W.H, `la carte garde ses dimensions (${W.W} × ${W.H})`);
// 2.0 : la refonte des lieux du Plus Grand Braquage redessine, volontairement, l'intérieur de six pièces (la demeure,
// l'entrepôt, la cave, les toits, le pont du navire, et l'atelier neuf de Lafleur) et le quartier de la demeure. Ces
// rectangles sont listés dans la référence (B.br20.rects, photographiée sur la 1.9.1) et le test vérifie que le monde
// redessine EXACTEMENT ceux-là ; hors d'eux et de Port-Lanterne, tout est encore comparé case par case.
const PB = W.port.box, R = B.port18, R2 = B.br20, RECTS = R2.rects;
const inRects = (x, y) => RECTS.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
const inPL = (i) => { const x = i % W.W, y = (i / W.W) | 0; return x >= PB.x0 && x <= PB.x1 && y >= PB.y0 && y <= PB.y1; };
const inBR = (i) => inRects(i % W.W, (i / W.W) | 0);
const hors = (a) => { const b = Uint8Array.from(a); for (let i = 0; i < b.length; i++) if (inPL(i) || inBR(i)) b[i] = 0; return b; };
ok(JSON.stringify(PB) === JSON.stringify(R.box), `le rectangle de Port-Lanterne est celui de la référence (${PB.x0}-${PB.x1} × ${PB.y0}-${PB.y1})`);
ok(JSON.stringify(W.heist.decor.envelopes) === JSON.stringify(RECTS), `les lieux redessinés du braquage sont exactement les ${RECTS.length} de la référence : ${RECTS.map((r) => r.room).join(', ')}`);
ok(h(hors(W.tiles)) === R2.tilesHors, 'hors de Port-Lanterne et des lieux redessinés, le sol n’a pas bougé (aucune case changée depuis la 1.9.1, ni depuis la 1.6.1 hors de la ville)');
ok(h(hors(W.zones)) === R2.zonesHors, 'hors de Port-Lanterne et des lieux redessinés, les zones n’ont pas bougé');
ok(h(hors(W.sail)) === R2.sailHors, 'hors de Port-Lanterne et des lieux redessinés, la mer navigable n’a pas bougé');
// 2. les cases libres restent libres (le mobilier ajouté à l'intérieur est la seule exception, et il est compté)
const was = Buffer.from(B.free, 'base64'); let closedIn = 0, closedOut = 0, closedPL = 0, openedPL = 0;
let closedBR = 0;
for (let i = 0; i < N; i++) { if (was[i] && !free[i]) { if (inBR(i)) closedBR++; else if (W.roomGrid[i] >= 0) closedIn++; else if (inPL(i)) closedPL++; else closedOut++; } else if (!was[i] && free[i] && inPL(i)) openedPL++; }
ok(closedOut === 0, `hors de Port-Lanterne, aucune case libre du monde extérieur n’est devenue bloquante${closedOut ? ' — ' + closedOut + ' CASES BLOQUÉES' : ''}`);
ok(closedIn <= 400, `intérieurs : ${closedIn} cases occupées par du mobilier ajouté depuis la 1.6.1 (limite 400)`);
console.log(`     (Port-Lanterne : ${closedPL} cases désormais bâties ou meublées, ${openedPL} cases gagnées sur la mer ou dégagées ; lieux du braquage : ${closedBR} cases de murs et de meubles, vérifiées par t_lieux20)`);
const propsHors = W.props.filter((p) => !(p.tx >= PB.x0 && p.tx <= PB.x1 && p.ty >= PB.y0 && p.ty <= PB.y1) && !inRects(p.tx, p.ty)).length, moved = W.heist.decor.moved;
ok(moved.length === 2 && moved.every((m) => m.why), `ce qui quitte l’ancien atelier de Lafleur est listé : ${moved.map((m) => m.type + ' (' + m.why + ')').join(', ')}`);
ok(propsHors + moved.length >= R2.propsHors && W.npcs.length >= B.npcs && W.doors.length >= B.doors, `rien d’autre n’a disparu (${propsHors} décors hors de la ville et des lieux redessinés, ${W.npcs.length} personnages, ${W.doors.length} portes)`);
ok(JSON.stringify(W.plots.map((p) => [p.k, p.tx, p.ty])) === JSON.stringify(R.plots), 'les parcelles des joueurs (maisons achetées) n’ont pas bougé d’une case');
// 3. personne n'est muré : les espaces praticables, par remplissage
const comp = new Int32Array(N).fill(-1), size = [];
for (let s = 0; s < N; s++) {
  if (!free[s] || comp[s] >= 0) continue;
  const id = size.length; let n = 0; const st = [s]; comp[s] = id;
  while (st.length) { const i = st.pop(); n++; const x = i % W.W, y = (i / W.W) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < W.W - 1 ? i + 1 : -1, y > 0 ? i - W.W : -1, y < W.H - 1 ? i + W.W : -1]) if (j >= 0 && free[j] && comp[j] < 0) { comp[j] = id; st.push(j); } }
  size.push(n);
}
const roomy = (x, y) => { const i = Math.floor(y / TILE) * W.W + Math.floor(x / TILE); return comp[i] >= 0 && size[comp[i]] >= 20; };
const near = (x, y) => [[0, 0], [0, 8], [0, -8], [8, 0], [-8, 0], [0, 16]].some(([dx, dy]) => roomy(x + dx, y + dy));
const ENFERMES = new Set(['vif_argent']); // voulu : Ambroise Vif-Argent est enfermé dans sa cellule (quête « L'évasion »)
const npcBad = W.npcs.filter((n) => !n.hidden && !ENFERMES.has(n.id) && !near(n.x, n.y)).map((n) => n.id);
ok(!npcBad.length, `chaque personnage (hors le prisonnier dans sa cellule) est dans un espace praticable${npcBad.length ? ' — MURÉS : ' + npcBad.join(', ') : ''}`);
const doorBad = W.doors.filter((d) => d.kind !== 'underwater' && !near(d.ox, d.oy + 4) || (d.ix != null && !near(d.ix, d.iy - 4))).map((d) => d.name || d.id);
ok(!doorBad.length, `chaque porte (hors plongée, qu’on atteint depuis la mer) s’ouvre sur un espace praticable, dehors et dedans${doorBad.length ? ' — ' + doorBad.slice(0, 8).join(', ') : ''}`);
const chestBad = W.chests.filter((c) => !near(c.x, c.y + 12) && !near(c.x - 16, c.y) && !near(c.x + 16, c.y)).map((c) => `${c.tx},${c.ty}`);
ok(!chestBad.length, `chaque coffre est accessible${chestBad.length ? ' — ' + chestBad.slice(0, 8).join(' ') : ''}`);
ok(canStand(W, W.spawnPoint.x, W.spawnPoint.y), 'le point d’arrivée des nouveaux pirates est praticable');
const spBad = W.spawnPoints.filter((s) => !canStand(W, s.x, s.y) || !roomy(s.x, s.y));
ok(W.spawnPoints.length >= 16 && !spBad.length, `${W.spawnPoints.length} points d’apparition, tous praticables et ouverts sur la ville${spBad.length ? ' — ' + spBad.length + ' MAUVAIS' : ''}`);
// 4. déterministe
const W2 = generateWorld();
ok(h(W2.tiles) === h(W.tiles) && h(W2.solid) === h(W.solid) && W2.props.length === W.props.length, 'deux générations donnent exactement le même monde');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
