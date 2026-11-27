// LStudio, lot 3 : le monde, les modèles, les images (sans navigateur).
//  1. le format : un document des versions 1 et 2 se lit tel quel ; une version plus récente est refusée ;
//  2. les images : du pixel art rangé par palette, relu à l'identique ; ce qui n'est pas du pixel art est refusé, avec ce
//     qu'il faut faire ; une image agrandie est ramenée à l'échelle 1 ;
//  3. le jeu montre les décors « image » (leur case bloque), écarte ceux dont l'image manque ; le contrôle signale une
//     image manquante, illisible, trop lourde, un habillage d'un élément qui n'existe pas ;
//  4. une île neuve : peinte en pleine mer seulement, c'est une île du jeu (numérotée après les autres, aucune ne change
//     de numéro), accostable ; de la terre ajoutée à une île en fait partie ;
//  5. la vue du monde (le graphe des liaisons) : une île que les bateaux n'atteignent pas, et un lieu dont l'entrée y est,
//     sont isolés ; le contrôle les signale ;
//  6. une carte à part : un lieu de plein air de 150 × 60 cases, bordé par la mer ;
//  7. les modèles : un bâtiment avec son intérieur, son étage et ses meubles, enregistré puis reposé ailleurs (et relu
//     d'un fichier) ; l'éditeur et le jeu restent identiques ; tout annuler ramène le monde d'origine.
import { createHash } from 'node:crypto';
import { generateWorld, PROPS, canStand } from '../shared/world.js';
import { emptyDoc, normalizeDoc, checkStudio, key, STUDIO_VERSION, encodeAsset, decodeAsset, worldGraph, assetBytes } from '../shared/studio-world.js';
import { T, OVER_H } from '../shared/constants.js';
import { Editor } from '../studio/editor.js';
import { MODELES, buildFromModel, addEtage } from '../studio/modeles.js';
import { captureModel, placeModel, readModelFile } from '../studio/prefabs.js';
import { createIsland, createCarte, islandPlan } from '../studio/monde.js';
import { analyzeImage } from '../studio/assets.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const hash = (a) => createHash('sha1').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex').slice(0, 16);
const sig = (W) => [hash(W.tiles), hash(W.zones), hash(W.solid), hash(W.sail), hash(W.roomGrid)].join('-');
const propsSig = (W) => W.props.map((p) => `${p.type}:${p.asset || ''}:${p.tx},${p.ty}:${Math.round(p.x)},${Math.round(p.y)}:${p.v | 0}`).sort().join('|');
const deps = { PROPS, canStand };
const BASE = generateWorld(7, { studio: null }), B0 = sig(BASE), W = BASE.W, idx = (x, y) => y * W + x, NI = BASE.islands.length;
// un coin de pleine mer, et un terrain dégagé sur l'archipel (pour un bâtiment)
let sea = null; for (let y = 40; y < 400 && !sea; y += 6) for (let x = 40; x < 900 && !sea; x += 6) { let good = true; for (let dy = -22; dy <= 22 && good; dy += 2) for (let dx = -28; dx <= 28 && good; dx += 2) if (BASE.tiles[idx(x + dx, y + dy)] !== T.DEEP) good = false; if (good) sea = [x, y]; }
const occupied = new Set(BASE.props.map((p) => idx(p.tx, p.ty)));
let site = null;
for (let y = 60; y < 400 && !site; y += 3) for (let x = 40; x < 900 && !site; x += 3) { let good = true; for (let dy = 0; dy < 7 && good; dy++) for (let dx = 0; dx < 8 && good; dx++) { const i = idx(x + dx, y + dy), t = BASE.tiles[i]; if (BASE.solid[i] || occupied.has(i) || !(t === T.GRASS || t === T.SAND || t === T.DIRT)) good = false; } if (good && !BASE.doors.some((d) => Math.abs(d.ox / 16 - x) < 12 && Math.abs(d.oy / 16 - y) < 12)) site = [x, y]; }
ok(!!sea && !!site, `une pleine mer (${sea}) et un terrain dégagé (${site}) pour les essais`);

// ---------------------------------------------------------------- 1. le format
const v2 = normalizeDoc({ format: 'lstudio', version: 2, meta: { nom: 'v2' }, pieces: [], portes: [], zones: [] });
let refused = false; try { normalizeDoc({ format: 'lstudio', version: STUDIO_VERSION + 1 }); } catch (e) { refused = true; }
ok(Array.isArray(v2.assets) && v2.version === STUDIO_VERSION && sig(generateWorld(7, { studio: v2 })) === B0 && refused, 'un document des versions 1 et 2 se lit tel quel (et ne change rien) ; un document plus récent est refusé');

// ---------------------------------------------------------------- 2. les images
const sprite = (w, h, f) => { const a = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = f(x, y); if (!c) continue; const i = (y * w + x) * 4; a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; a[i + 3] = c[3] ?? 255; } return a; };
const pot = sprite(16, 24, (x, y) => (x >= 5 && x <= 10 && y >= 3 ? [110 + (x % 3) * 20, 70, 38] : y === 23 && x > 2 && x < 13 ? [40, 26, 16] : null));
const e1 = encodeAsset(pot, 16, 24), d1 = decodeAsset({ id: 'a', ...e1 });
ok(d1 && d1.every((v, k) => v === pot[k]) && e1.pal.length === 4 && e1.px.length < 16 * 24 * 4 / 3, `une image de 16 × 24 pixels (${e1.pal.length} couleurs, du vide autour) est rangée en ${e1.px.length} caractères (2 048 pour ses pixels bruts), et relue pixel pour pixel`);
let msg = ''; try { encodeAsset(sprite(32, 32, (x, y) => [x * 8, y * 8, (x + y) * 4]), 32, 32); } catch (e) { msg = e.message; }
let msg2 = ''; try { encodeAsset(new Uint8ClampedArray(300 * 10 * 4), 300, 10); } catch (e) { msg2 = e.message; }
ok(/plus de 255 couleurs/.test(msg) && /au plus 256/.test(msg2), `refusées, avec ce qu’il faut faire : une image de 1 024 couleurs (« ${msg.slice(0, 60)}… ») et une image de 300 pixels de large`);
const big4 = new Uint8ClampedArray(64 * 96 * 4); for (let y = 0; y < 96; y++) for (let x = 0; x < 64; x++) { const s = ((y >> 2) * 16 + (x >> 2)) * 4, t = (y * 64 + x) * 4; for (let c = 0; c < 4; c++) big4[t + c] = pot[s + c]; }
big4[3] = 100; // un pixel à demi transparent (qui disparaît : il est dans un carré transparent)
const an = analyzeImage(big4, 64, 96);
ok(an.k === 4 && an.w === 16 && an.h === 24 && an.notes.some((n) => /Agrandie 4 fois/.test(n)), `une image agrandie 4 fois (64 × 96) est ramenée à l’échelle du jeu : ${an.w} × ${an.h} pixels`);

// ---------------------------------------------------------------- 3. les décors « image » dans le jeu, et le contrôle
const D3 = emptyDoc('Images');
D3.assets.push({ id: 'pot', nom: 'Poteau', ...e1 }, { id: 'abime', nom: 'Abîmée', w: 4, h: 4, pal: ['#ff0000'], px: '!!!' }, { id: 'hab', nom: 'Habit', ...e1, remplace: 'licorne' });
D3.decors.push({ uid: 'i1', type: 'image', x: site[0] + 2, y: site[1] + 2, donnees: { asset: 'pot' }, emprise: [1, 1], solide: 'tout' }, { uid: 'i2', type: 'image', x: site[0] + 4, y: site[1] + 2, donnees: { asset: 'perdue' } });
const W3 = generateWorld(7, { studio: D3 }), im = W3.props.find((p) => p.studio === 'i1');
ok(im && im.asset === 'pot' && W3.solid[idx(site[0] + 2, site[1] + 2)] === 1 && !W3.props.some((p) => p.studio === 'i2') && W3.studio.ecartes.some((e) => /perdue/.test(e.raison)), 'le jeu montre le décor « image » (sa case bloque) et écarte celui dont l’image manque, en le signalant');
const I3 = checkStudio(W3, D3, deps), c3 = new Set(I3.map((i) => i.niveau + ':' + i.code));
ok(c3.has('bloquant:image_inconnue') && c3.has('bloquant:image_invalide') && c3.has('avertissement:habillage_inconnu') && I3.find((i) => i.code === 'image_inconnue').fix.uid === 'i2', `le contrôle : une image manquante (bloquant, correction : supprimer le décor), une image illisible (bloquant), l’habillage d’un élément qui n’existe pas (avertissement)`);
const heavy = emptyDoc(); for (let k = 0; k < 12; k++) heavy.assets.push({ id: 'h' + k, nom: 'lourde', ...encodeAsset(sprite(256, 256, (x, y) => [((x + k) % 2) * 200, (y % 2) * 200, 30]), 256, 256) });
ok(assetBytes(heavy) > 2000000 && checkStudio(generateWorld(7, { studio: heavy }), heavy, { ...deps, graph: false }).some((i) => i.code === 'images_lourdes' && i.niveau === 'bloquant'), `des images trop lourdes pour que chaque joueur les charge (${Math.round(assetBytes(heavy) / 1000)} Ko) : bloquant`);

// ---------------------------------------------------------------- 4. une île neuve
const W4 = generateWorld(7, { studio: null }), D4 = emptyDoc('Îles'), E4 = new Editor(W4, D4, PROPS);
ok(!!islandPlan(W4, site[0], site[1], 20, 14).err, 'une île neuve ne se pose pas sur de la terre (refusé)');
const isl = createIsland(E4, sea[0], sea[1], 30, 20, { nom: 'Île d’essai', region: 10 });
const G4 = generateWorld(7, { studio: JSON.parse(JSON.stringify(D4)) });
const newId = G4.islandOf[idx(sea[0], sea[1])];
let kept = true; for (let i = 0; i < W * OVER_H; i++) if (BASE.islandOf[i] && !(i in {}) && G4.islandOf[i] !== BASE.islandOf[i] && !(G4.tiles[i] === T.WATER || G4.tiles[i] === T.DEEP)) { kept = false; break; }
ok(!isl.err && G4.tiles[idx(sea[0], sea[1])] === T.GRASS && newId === NI + 1 && G4.islands.length === NI + 1 && G4.islands[NI].zone === 10 && kept, `une île neuve en pleine mer : ${isl.land.length} cases de terre, une plage, un haut-fond ; c’est l’île n° ${newId} (après les ${NI} du jeu, aucune ne change de numéro), de la région choisie`);
ok(sig(W4) === sig(G4) && propsSig(W4) === propsSig(G4), `l’éditeur et le jeu ont la même île (sol, solidité, navigation) et la même végétation (${isl.decors.length} arbres, buissons et rochers du jeu)`);
// de la terre accolée à une île existante en fait partie
const shore = (() => { for (let y = 60; y < 400; y++) for (let x = 60; x < 900; x++) { const i = idx(x, y); if (BASE.islandOf[i] === 1 && BASE.tiles[idx(x + 1, y)] === T.DEEP && BASE.tiles[idx(x + 2, y)] === T.DEEP) return [x + 1, y]; } return null; })();
const D4b = emptyDoc(); D4b.sol[key(shore[0], shore[1])] = 'SAND'; D4b.sol[key(shore[0] + 1, shore[1])] = 'SAND';
const G4b = generateWorld(7, { studio: D4b });
ok(G4b.islandOf[idx(shore[0] + 1, shore[1])] === 1 && G4b.islands.length === NI, 'deux cases de sable accolées à la grande île en font partie (pas d’île neuve)');

// ---------------------------------------------------------------- 5. le graphe du monde ; ce qui est isolé
const g0 = worldGraph(G4), I0 = g0.islands[g0.islandAt(sea[0], sea[1]) - 1];
ok(I0 && I0.boat && I0.reach && g0.start && g0.islands.filter((i) => i.n > 150).every((i) => i.reach), `la vue du monde : l’île neuve est accostable et atteinte en bateau ; toutes les grandes îles du jeu le sont (${g0.islands.filter((i) => i.n > 150).length})`);
// on ferme la navigation autour de l'île : plus aucun bateau ne l'atteint ; une carte à part dont l'entrée y est
const D5 = JSON.parse(JSON.stringify(D4)), B5 = isl.box;
for (let y = B5.y0 - 3; y <= B5.y1 + 3; y++) for (let x = B5.x0 - 3; x <= B5.x1 + 3; x++) if (!D5.sol[key(x, y)] || D5.sol[key(x, y)] === 'WATER') D5.navigation[key(x, y)] = 0;
const W5 = generateWorld(7, { studio: null }), E5 = new Editor(W5, D5, PROPS);
const ca = createCarte(E5, { nom: 'La Crique isolée', w: 40, h: 20, sol: 'SAND', bord: 'mer' });
E5.addPorte(ca.pc.uid, { x: sea[0], y: sea[1] + 1, nom: 'Grotte' });
const G5 = generateWorld(7, { studio: JSON.parse(JSON.stringify(D5)) }), I5 = checkStudio(G5, D5, deps), c5 = new Set(I5.map((i) => i.code));
ok(c5.has('ile_isolee') && c5.has('lieu_isole') && !I5.some((i) => i.niveau === 'bloquant'), `une île que les bateaux n’atteignent plus, et la carte dont l’entrée y est : le contrôle les dit isolées (avertissements : ${[...c5].join(', ')})`);

// ---------------------------------------------------------------- 6. une carte à part
const W6 = generateWorld(7, { studio: null }), D6 = emptyDoc(), E6 = new Editor(W6, D6, PROPS);
const c6 = createCarte(E6, { nom: 'Le Grand Large', w: 150, h: 60, sol: 'GRASS', bord: 'mer' });
const G6 = generateWorld(7, { studio: D6 }), r6 = G6.rooms.find((r) => r.studio === (c6.pc && c6.pc.uid));
ok(!c6.err && r6 && r6.w === 150 && r6.h === 60 && r6.outdoor === 1 && r6.voidStyle === 'mer' && G6.tiles[idx(r6.x0 + 75, r6.y0 + 30)] === T.GRASS && !G6.solid[idx(r6.x0 + 75, r6.y0 + 30)] && G6.studio.ecartes.length === 0, 'une carte à part de 150 × 60 cases : un lieu de plein air, d’herbe, bordé par la mer, rangé sous l’archipel');

// ---------------------------------------------------------------- 7. les modèles
const W7 = generateWorld(7, { studio: null }), D7 = emptyDoc('Modèles'), E7 = new Editor(W7, D7, PROPS);
const tav = buildFromModel(E7, MODELES[1], site[0], site[1]); addEtage(E7, tav.pc.uid);
E7.set('asset', 'pot', { id: 'pot', nom: 'Poteau', ...e1 }); E7.placeDecor('image', tav.pc.x + 6, tav.pc.y + 6, { donnees: { asset: 'pot' }, emprise: [1, 1], solide: 'tout' });
const cap = captureModel(E7, [{ k: 'd', uid: tav.fac.uid }], 'Taverne à étage');
const M = cap.M;
ok(!cap.err && M.pieces.length === 2 && M.portes.length === 1 && M.zones.length === 2 && M.pieces[0].decors.length === 27 && M.pieces[0].decors.some((d) => d.type === 'image') && M.assets.length === 1, `enregistrer un bâtiment comme modèle emporte son intérieur, son étage, ses ${M.pieces[0].decors.length} meubles (dont une image importée), ses escaliers`);
const nP = D7.pieces.length, nD = D7.decors.length, un0 = E7.undoStack.length;
const pl = placeModel(E7, M, site[0] + 12, site[1]);
ok(!pl.err && D7.pieces.length === nP + 2 && D7.portes.length === 2 && D7.zones.length === 4 && D7.decors.length === nD * 2 && E7.undoStack.length === un0 + 1, `le reposer ailleurs : une seconde taverne, avec ses deux pièces, sa porte, ses escaliers et ses meubles — en une seule action`);
const back = readModelFile(JSON.parse(JSON.stringify(M)));
const D7b = emptyDoc(), E7b = new Editor(generateWorld(7, { studio: null }), D7b, PROPS), pl2 = placeModel(E7b, back, site[0], site[1]);
let badFile = false; try { readModelFile({ format: 'autre' }); } catch (e) { badFile = true; }
ok(!pl2.err && D7b.pieces.length === 2 && D7b.assets.length === 1 && badFile, 'un modèle exporté puis relu d’un fichier se repose dans un autre monde (avec son image) ; un fichier étranger est refusé');
const G7 = generateWorld(7, { studio: JSON.parse(JSON.stringify(D7)) });
const q7 = checkStudio(G7, D7, deps);
ok(sig(W7) === sig(G7) && propsSig(W7) === propsSig(G7) && !q7.some((i) => i.niveau === 'bloquant'), 'l’éditeur et le jeu ont le même monde (les deux tavernes, leurs étages, leurs meubles) ; rien de bloquant au contrôle');
// on entre dans la seconde taverne : sa porte mène à sa propre salle
const d2 = G7.doors.filter((d) => d.studio)[1], r2 = G7.rooms[d2.room];
ok(d2 && r2 && r2.studio && r2.studio !== G7.doors.filter((d) => d.studio)[0].room && canStand(G7, d2.ix, d2.iy), `la porte de la seconde taverne mène à sa propre salle (« ${r2 && r2.name} »), où l’on arrive debout`);
let u = 0; while (E7.undo()) u++;
ok(sig(W7) === B0 && W7.rooms.length === BASE.rooms.length && !D7.assets.length && !D7.decors.length, `annuler les ${u} actions ramène le monde d’origine à l’octet près (les images importées comprises)`);
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
