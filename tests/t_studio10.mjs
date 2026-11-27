// LStudio : la couche écrite par l'éditeur, et l'éditeur lui-même (sans navigateur).
//  1. un document vide ne change rien au monde ; le monde publié (docs/monde-studio.json) est valide et sans problème bloquant ;
//  2. le jeu applique un document comme prévu (sol, régions, collisions, navigation, décors ajoutés, retouchés, retirés) ;
//  3. une retouche dont l'empreinte ne correspond plus n'est pas appliquée à l'aveugle : elle est écartée et signalée ;
//  4. ce que montre l'éditeur est exactement ce que fera le jeu : après une suite d'actions au hasard, le monde de
//     l'éditeur et celui que génère le jeu avec le même document sont identiques case par case ;
//  5. annuler tout ramène le monde d'origine, à l'octet près ; rétablir tout redonne le même monde ;
//  6. le contrôle qualité trouve ce qui est cassé (décor inconnu, hors de la carte, porte bouchée, arrivée bloquée) ;
//  7. les fichiers : un document est relu à l'identique ; un fichier étranger ou trop récent est refusé.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { generateWorld, PROPS, canStand } from '../shared/world.js';
import { emptyDoc, normalizeDoc, checkStudio, key, STUDIO_VERSION } from '../shared/studio-world.js';
import { Editor } from '../studio/editor.js';
import { mulberry32 } from '../shared/rng.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const hash = (a) => createHash('sha1').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex').slice(0, 16);
const sig = (W) => [hash(W.tiles), hash(W.zones), hash(W.solid), hash(W.sail)].join('-');
const propsSig = (W) => W.props.map((p) => `${p.type}:${p.tx},${p.ty}:${Math.round(p.x)},${Math.round(p.y)}:${p.v | 0}:${p.plan || ''}:${p.flip ? 1 : 0}`).sort().join('|');
const deps = { PROPS, canStand };

// ---------------- 1. sans document, et le monde publié
const BASE = generateWorld(7, { studio: null }), B0 = sig(BASE);
ok(sig(generateWorld(7, { studio: emptyDoc() })) === B0, 'un document vide ne change pas une case du monde');
const PUB = normalizeDoc(JSON.parse(fs.readFileSync(new URL('../docs/monde-studio.json', import.meta.url), 'utf8')));
const WP = generateWorld(7, { studio: PUB }), qcPub = checkStudio(WP, PUB, deps);
ok(qcPub.filter((i) => i.niveau === 'bloquant').length === 0 && WP.studio.ecartes.length === 0, `le monde publié (docs/monde-studio.json, « ${PUB.meta.nom} ») est valide, sans problème bloquant (${qcPub.length} remarque(s))`);

// ---------------- 2. le jeu applique un document
const idx = (x, y) => y * BASE.W + x;
const palm = BASE.props.find((p) => p.type === 'palm' && p.tx > 130 && p.tx < 170 && BASE.solid[idx(p.tx + 1, p.ty)] === 0 && BASE.props.every((q) => q === p || q.tx !== p.tx || q.ty !== p.ty));
const lamp = BASE.props.find((p) => p.type === 'lamp' && p.tx > 130 && p.tx < 170);
const d = emptyDoc('Essai');
d.sol[key(150, 106)] = 'SAND'; d.sol[key(10, 10)] = 'GRASS'; // une case de mer devient de l'herbe
d.regions[key(150, 106)] = 3; d.collisions[key(151, 106)] = 1; d.collisions[key(lamp.tx, lamp.ty)] = 0; d.navigation[key(12, 12)] = 0;
d.decors.push({ uid: 'a', type: 'barrel', x: 152, y: 106, v: 1, couche: 'decors' }, { uid: 'b', type: 'cite', x: 60, y: 300, v: 0, donnees: { w: 6, h: 4, door: 2, style: 'tonnellerie', nom: 'Essai' } }, { uid: 'c', type: 'lustre_p', x: 150, y: 107, solide: 'aucune', plan: 'dessus' });
d.retouches[palm.id] = { ref: { type: 'palm', x: palm.tx, y: palm.ty }, x: palm.tx + 1, y: palm.ty, miroir: true };
d.retouches[lamp.id] = { ref: { type: 'lamp', x: lamp.tx, y: lamp.ty }, retire: true };
const W1 = generateWorld(7, { studio: d });
ok(W1.tiles[idx(150, 106)] === 2 && W1.zones[idx(150, 106)] === 3 && W1.tiles[idx(10, 10)] === 3 && !W1.solid[idx(10, 10)] && !W1.sail[idx(10, 10)], 'le sol et la région repeints ; la mer devenue herbe se traverse à pied, plus en bateau');
ok(W1.solid[idx(151, 106)] === 1 && W1.solid[idx(lamp.tx, lamp.ty)] === 0 && !W1.props.some((p) => p.id === lamp.id) && W1.sail[idx(12, 12)] === 0, 'les collisions peintes ont le dernier mot ; la lanterne retirée a disparu ; la navigation fermée');
const bar = W1.props.find((p) => p.studio === 'a'), cite = W1.props.find((p) => p.studio === 'b'), lus = W1.props.find((p) => p.studio === 'c');
ok(bar && bar.v === 1 && W1.solid[idx(152, 106)] === 1 && cite && cite.w === 6 && cite.style === 'tonnellerie' && W1.solid[idx(65, 303)] === 1 && lus && lus.plan === 'dessus' && !W1.solid[idx(150, 107)], 'les décors ajoutés : le tonneau bloque sa case, le bâtiment toute son emprise (6 × 4), le lustre (« aucune ») ne bloque rien');
const pm = W1.props.find((p) => p.id === palm.id);
ok(pm && pm.tx === palm.tx + 1 && pm.flip && W1.solid[idx(palm.tx + 1, palm.ty)] === 1 && W1.solid[idx(palm.tx, palm.ty)] === 0, 'le palmier d’origine, déplacé d’une case et retourné : il libère son ancienne case, bloque la nouvelle');
ok(sig(generateWorld(7, { studio: d })) === sig(W1) && propsSig(generateWorld(7, { studio: d })) === propsSig(W1), 'deux générations avec le même document donnent le même monde (client, hôte, serveur : tous pareils)');
// ---------------- 3. une retouche dont l'empreinte ne correspond plus
const bad = emptyDoc(); bad.retouches[palm.id] = { ref: { type: 'rock', x: palm.tx, y: palm.ty }, retire: true }; bad.retouches[999999] = { ref: { type: 'palm', x: 1, y: 1 }, retire: true };
const W2 = generateWorld(7, { studio: bad });
ok(W2.props.some((p) => p.id === palm.id) && W2.studio.ecartes.length === 2 && W2.studio.ecartes.every((e) => e.quoi === 'retouche'), 'une retouche qui ne désigne plus le bon décor (ou un décor qui n’existe plus) est écartée, jamais appliquée à l’aveugle');
ok(checkStudio(W2, bad, deps).filter((i) => i.code === 'retouche').length === 2, 'le contrôle qualité les signale');

// ---------------- 4 et 5. l'éditeur : identique au jeu, annulable jusqu'au bout
const W3 = generateWorld(7, { studio: null }), doc3 = emptyDoc('Hasard'), ED = new Editor(W3, doc3, PROPS);
const rng = mulberry32(2024), pick = (a) => a[Math.floor(rng() * a.length)];
const types = ['barrel', 'crate', 'palm', 'lamp', 'bench', 'rock', 'cite', 'lustre_p', 'fence', 'bush', 'statue'], sols = ['SAND', 'GRASS', 'COBBLE', 'WATER', 'DEEP', 'ROCK', 'PLANK'];
const area = () => [140 + Math.floor(rng() * 24), 92 + Math.floor(rng() * 20)];
const origins = W3.props.filter((p) => p.tx >= 138 && p.tx <= 166 && p.ty >= 90 && p.ty <= 114 && !p.studio).slice(0, 60);
for (let k = 0; k < 400; k++) {
  const r = rng();
  if (r < 0.25) { const [x, y] = area(); ED.placeDecor(pick(types), x, y, { v: Math.floor(rng() * 3) }); }
  else if (r < 0.4 && doc3.decors.length) { const dd = pick(doc3.decors); ED.move([{ k: 'd', uid: dd.uid }], Math.floor(rng() * 5) - 2, Math.floor(rng() * 5) - 2, Math.floor(rng() * 9) - 4, 0); }
  else if (r < 0.48 && doc3.decors.length) ED.remove([{ k: 'd', uid: pick(doc3.decors).uid }]);
  else if (r < 0.58) { const p = pick(origins); const rr = rng(); if (rr < 0.35) ED.remove([ED.refOf(p)]); else if (rr < 0.7) ED.move([{ k: 'o', id: p.id }], Math.floor(rng() * 3) - 1, Math.floor(rng() * 3) - 1); else ED.set('retouche', String(p.id), undefined); }
  else if (r < 0.75) { const [x, y] = area(); ED.paint('sol', [[x, y], [x + 1, y]], rng() < 0.2 ? undefined : pick(sols)); }
  else if (r < 0.84) { const [x, y] = area(); ED.paint('collisions', [[x, y]], rng() < 0.3 ? undefined : rng() < 0.5 ? 1 : 0); }
  else if (r < 0.9) { const [x, y] = area(); ED.paint('regions', [[x, y]], rng() < 0.3 ? undefined : Math.floor(rng() * 6)); }
  else if (r < 0.95) { const [x, y] = area(); ED.paint('navigation', [[x, y]], rng() < 0.3 ? undefined : rng() < 0.5 ? 1 : 0); }
  else if (doc3.decors.length) { const dd = pick(doc3.decors); ED.change({ k: 'd', uid: dd.uid }, { solide: pick(['auto', 'aucune', 'tout']), miroir: rng() < 0.5, plan: pick(['auto', 'sol', 'dessus']) }); }
}
const Wg = generateWorld(7, { studio: JSON.parse(JSON.stringify(doc3)) });
ok(sig(W3) === sig(Wg), `après 400 actions au hasard (${doc3.decors.length} décors, ${Object.keys(doc3.sol).length} cases repeintes, ${Object.keys(doc3.retouches).length} retouches), l’éditeur et le jeu ont le même sol, les mêmes régions, les mêmes collisions, la même navigation`);
ok(propsSig(W3) === propsSig(Wg), 'et les mêmes décors, aux mêmes places, avec les mêmes variantes, plans et miroirs');
const n = ED.undoStack.length; let u = 0; while (ED.undo()) u++;
ok(u === n && sig(W3) === B0 && propsSig(W3) === propsSig(BASE) && !doc3.decors.length && !Object.keys(doc3.sol).length && !Object.keys(doc3.retouches).length, `annuler les ${u} actions ramène le monde d’origine à l’octet près, et un document vide`);
while (ED.redo()) { /* */ }
ok(sig(W3) === sig(Wg) && propsSig(W3) === propsSig(Wg), 'rétablir toutes les actions redonne exactement le même monde');

// ---------------- 6. le contrôle qualité
const q = emptyDoc(); q.decors.push({ uid: 'x', type: 'licorne', x: 150, y: 100 }, { uid: 'y', type: 'barrel', x: 5000, y: 2 });
const door = BASE.doors.find((dd) => dd.name === 'La Sirène Borgne'), dx = Math.floor(door.ox / 16), dy = Math.floor(door.oy / 16);
for (let yy = dy - 1; yy <= dy + 2; yy++) for (let xx = dx - 2; xx <= dx + 2; xx++) q.collisions[key(xx, yy)] = 1; // on mure l'entrée de la taverne
const sp = BASE.spawnPoints[0]; q.decors.push({ uid: 'z', type: 'crate', x: Math.floor(sp.x / 16), y: Math.floor(sp.y / 16) });
const I = checkStudio(generateWorld(7, { studio: q }), q, deps), codes = new Set(I.map((i) => i.code));
ok(['asset_inconnu', 'decor_hors', 'porte_muree', 'arrivee_muree'].every((c) => codes.has(c)), `le contrôle trouve : un décor inconnu, un décor hors de la carte, une entrée bouchée, une arrivée bloquée (${[...codes].join(', ')})`);
ok(I.filter((i) => ['asset_inconnu', 'decor_hors', 'porte_muree', 'arrivee_muree'].includes(i.code)).every((i) => i.niveau === 'bloquant' && i.fix && Number.isFinite(i.x)), 'chacun est bloquant, situé (une case), avec une correction proposée');

// ---------------- 7. les fichiers
const round = normalizeDoc(JSON.parse(JSON.stringify(d)));
ok(sig(generateWorld(7, { studio: round })) === sig(W1), 'un document exporté puis réimporté redonne le même monde');
let refused = 0; for (const x of [{}, { format: 'autre' }, { format: 'lstudio', version: STUDIO_VERSION + 1 }, null]) { try { normalizeDoc(x); } catch (e) { refused++; } }
ok(refused === 4, 'un fichier qui n’est pas un monde LStudio, ou fait par une version plus récente, est refusé (jamais appliqué à moitié)');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
