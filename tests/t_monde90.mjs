// Monde vivant, lot 2 : le garde-fou du monde. Les lots qui touchent au décor (environnements, mobilier, vie des
// lieux) ne doivent ni déplacer l'ancien monde, ni murer quoi que ce soit.
//  1. le sol et les zones de la version 1.6.1 n'ont pas bougé (empreinte enregistrée dans tests/fixtures) ;
//  2. une case qui était libre en 1.6.1 l'est encore, sauf exceptions listées et justifiées (le mobilier ajouté) ;
//  3. chaque personnage, chaque porte, chaque coffre se trouve dans un espace praticable d'au moins 20 cases ;
//  4. le monde est le même à chaque génération (déterministe).
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
ok(h(W.tiles) === B.tiles, 'le sol de la 1.6.1 n’a pas bougé (aucune case changée)');
ok(h(W.zones) === B.zones, 'les zones de la 1.6.1 n’ont pas bougé');
// 2. les cases libres restent libres (le mobilier ajouté à l'intérieur est la seule exception, et il est compté)
const was = Buffer.from(B.free, 'base64'); let closed = 0, closedOut = 0;
for (let i = 0; i < N; i++) if (was[i] && !free[i]) { closed++; if (W.roomGrid[i] < 0) closedOut++; }
ok(closedOut === 0, `aucune case libre du monde extérieur n’est devenue bloquante${closedOut ? ' — ' + closedOut + ' CASES BLOQUÉES' : ''}`);
ok(closed <= 400, `intérieurs : ${closed} cases occupées par du mobilier ajouté depuis la 1.6.1 (limite 400)`);
ok(W.props.length >= B.props && W.npcs.length >= B.npcs && W.doors.length >= B.doors, `rien n’a disparu (${W.props.length} décors, ${W.npcs.length} personnages, ${W.doors.length} portes)`);
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
// 4. déterministe
const W2 = generateWorld();
ok(h(W2.tiles) === h(W.tiles) && h(W2.solid) === h(W.solid) && W2.props.length === W.props.length, 'deux générations donnent exactement le même monde');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
