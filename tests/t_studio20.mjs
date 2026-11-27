// LStudio, lot 2 : les bâtiments et les intérieurs (sans navigateur).
//  1. le format : un document de la version 1 se lit tel quel ; les pièces, les portes et les zones sont lues ;
//  2. le jeu creuse une pièce dans la bande des intérieurs (son sol, ses murs, sa sortie) et en fait une pièce comme les
//     autres (rooms, roomGrid, son style de sol et de mur, son décor mural) ; une porte la relie au bâtiment posé dehors ;
//     une porte peut aussi mener à une pièce d'origine ; les zones sont lues ;
//  3. ce qui est impossible est écarté et signalé, jamais appliqué à moitié (une pièce sur une pièce du jeu, une porte vers
//     rien, un passage qui ne mène nulle part) ;
//  4. le vrai moteur : on entre par la porte, on arrive dans la pièce, on ressort devant le bâtiment ; un passage mène
//     d'une pièce à l'autre (c'est ainsi qu'on fait un étage) ; on ne passe pas depuis ailleurs ; un pirate sauvegardé dans
//     une pièce supprimée reparaît au point d'arrivée ;
//  5. l'éditeur : identique au jeu après une longue suite d'actions au hasard sur les pièces, les portes, les zones, les
//     murs, les styles, le décor mural, les bâtiments ; tout annuler ramène le monde d'origine à l'octet près ;
//  6. le contrôle qualité : une pièce sans entrée, un bâtiment sans intérieur, une entrée bouchée, un passage bouché, des
//     cases murées, un décor mural sans mur ; les corrections proposées ;
//  7. les bâtiments complets (les modèles), l'intérieur d'un bâtiment posé, l'étage : chacun sans problème au contrôle,
//     tout son sol accessible, et l'on y entre vraiment (le vrai moteur).
import { createHash } from 'node:crypto';
import { generateWorld, PROPS, canStand, roomIdAt } from '../shared/world.js';
import { emptyDoc, normalizeDoc, checkStudio, key, setStudioDoc, STUDIO_VERSION, pieceEnvelope } from '../shared/studio-world.js';
import { T, OVER_H, PROTOCOL } from '../shared/constants.js';
import { Editor } from '../studio/editor.js';
import { MODELES, buildFromModel, interiorFor, addEtage } from '../studio/modeles.js';
import { Game } from '../server/game.js';
import { mulberry32 } from '../shared/rng.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const hash = (a) => createHash('sha1').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex').slice(0, 16);
const sig = (W) => [hash(W.tiles), hash(W.zones), hash(W.solid), hash(W.sail), hash(W.roomGrid)].join('-');
const roomsSig = (W) => JSON.stringify(W.rooms.filter((r) => r.studio).map((r) => [r.id, r.name, r.kind, r.x0, r.y0, r.w, r.h, [...r.fl].join(''), [...r.ws].join(''), r.wsk, [...r.wd.entries()], r.noDeco, r.outdoor || 0, r.amb || '']));
const doorsSig = (W) => JSON.stringify(W.doors.slice(85).map((d) => [d.id, d.room, d.name, d.ox, d.oy, d.ix, d.iy, d.ex, d.ey]));
const zonesSig = (W) => JSON.stringify(W.studioZones);
const propsSig = (W) => W.props.map((p) => `${p.type}:${p.tx},${p.ty}:${Math.round(p.x)},${Math.round(p.y)}:${p.v | 0}`).sort().join('|');
const deps = { PROPS, canStand };
const BASE = generateWorld(7, { studio: null }), B0 = sig(BASE), idx = (x, y) => y * BASE.W + x;
const NR = BASE.rooms.length, ND = BASE.doors.length;

// un terrain dégagé sur l'archipel, pour y poser un bâtiment (8 × 7 cases libres, sans décor)
const occupied = new Set(BASE.props.map((p) => idx(p.tx, p.ty)));
let site = null;
for (let y = 60; y < 400 && !site; y += 3) for (let x = 40; x < 900 && !site; x += 3) {
  let good = true;
  for (let dy = 0; dy < 7 && good; dy++) for (let dx = 0; dx < 8 && good; dx++) { const i = idx(x + dx, y + dy), t = BASE.tiles[i]; if (BASE.solid[i] || occupied.has(i) || BASE.roomGrid[i] >= 0 || !(t === T.GRASS || t === T.SAND || t === T.DIRT)) good = false; }
  if (good && !BASE.doors.some((d) => Math.abs(d.ox / 16 - x) < 12 && Math.abs(d.oy / 16 - y) < 12)) site = [x, y];
}
ok(!!site, `un terrain dégagé pour l’essai : (${site})`);
const [SX, SY] = site;

// ---------------- 1. le format
const v1 = normalizeDoc({ format: 'lstudio', version: 1, meta: { nom: 'ancien' }, decors: [], sol: {} });
ok(Array.isArray(v1.pieces) && Array.isArray(v1.portes) && Array.isArray(v1.zones) && v1.version === STUDIO_VERSION && sig(generateWorld(7, { studio: v1 })) === B0, 'un document de la version 1 se lit tel quel (sans pièce, il ne change rien au monde)');

// ---------------- 2. le jeu applique les pièces, les portes, les zones
const d = emptyDoc('Bâtiments');
d.decors.push({ uid: 'fac', type: 'cite', x: SX + 1, y: SY, v: 0, donnees: { w: 5, h: 4, door: 2, style: 'maison', nom: 'La maison d’essai' } });
d.pieces.push({ uid: 'p1', nom: 'La salle commune', x: 170, y: 490, w: 12, h: 8, genre: 'tavern', sol: 'FLOOR', style: 1, mur: 'salon', sortie: 5, sols: { [key(0, 0)]: 3 }, murs: { [key(1, 0)]: 'galerie' }, deco: [{ x: 2, y: 0, k: 'fenetre', n: 2, v: 1 }, { x: 7, y: 0, k: 'tableau', n: 2, v: 'mer' }], decoAuto: false });
d.pieces.push({ uid: 'p2', nom: 'Le grenier', x: 200, y: 490, w: 8, h: 5, genre: 'house', sol: 'STONEF', sortie: 3, dehors: true, ambiance: 'ville' });
d.portes.push({ uid: 'q1', piece: 'p1', batiment: 'fac', nom: 'Entrée de la maison' });
const sir = BASE.rooms.find((r) => r.name === 'La Sirène Borgne');
d.portes.push({ uid: 'q2', piece: sir.id, x: SX + 7, y: SY + 6, nom: 'Porte de derrière de la Sirène' });
d.zones.push({ uid: 'z1', type: 'passage', nom: 'escalier', bouton: 'Monter au grenier', x: 171, y: 490, w: 1, h: 1, vers: { x: 203, y: 493 } });
d.zones.push({ uid: 'z2', type: 'passage', bouton: 'Descendre', x: 201, y: 490, w: 1, h: 1, vers: { x: 172, y: 491 } });
d.zones.push({ uid: 'z3', type: 'message', titre: 'Une ardoise', texte: 'Ici, on paie d’avance.', x: 176, y: 491, w: 2, h: 1 });
const W1 = generateWorld(7, { studio: d });
const r1 = W1.rooms.find((r) => r.studio === 'p1'), r2 = W1.rooms.find((r) => r.studio === 'p2');
const E1 = pieceEnvelope(d.pieces[0]);
let envOk = true; for (let y = E1.y0; y <= E1.y1; y++) for (let x = E1.x0; x <= E1.x1; x++) { const inside = x >= 170 && x < 182 && y >= 490 && y < 498, t = W1.tiles[idx(x, y)]; if (W1.roomGrid[idx(x, y)] !== r1.id) envOk = false; if (inside && t !== T.FLOOR) envOk = false; if (!inside && !(t === T.IWALL || (t === T.EXIT && x === 175 && y === 498))) envOk = false; }
ok(r1 && r1.id === NR && r2 && r2.id === NR + 1 && envOk, `la pièce est creusée : 12 × 8 cases de plancher, ses murs tout autour, sa sortie dans le mur du bas (pièce n° ${r1 && r1.id}, après les ${NR} pièces du jeu)`);
ok(r1.name === 'La salle commune' && r1.kind === 'tavern' && r1.fl[0] === 3 && r1.fl[1] === 1 && r1.ws[1] === 2 && r1.wsk.join() === 'salon,galerie' && r1.wd.size === 4 && r1.noDeco === 1 && W1.tiles[idx(200, 490)] === T.STONEF && r2.outdoor === 1 && r2.amb === 'ville', 'son nom, son genre, ses styles de sol et de mur case par case, son décor mural (une fenêtre, un tableau), son ambiance');
const q1 = W1.doors.find((x) => x.studio === 'q1'), q2 = W1.doors.find((x) => x.studio === 'q2'), sd = BASE.doors.find((x) => x.room === sir.id);
ok(q1 && q1.id === ND && q1.room === r1.id && q1.ox === (SX + 1 + 2) * 16 + 8 && q1.oy === (SY + 4) * 16 + 8 && q1.ix === 175 * 16 + 8 && q1.iy === 497 * 16 + 10, 'la porte du bâtiment : dehors devant sa porte dessinée, dedans au seuil de la sortie');
ok(q2 && q2.room === sir.id && q2.ix === sd.ix && q2.iy === sd.iy && q2.ox === (SX + 7) * 16 + 8, 'une porte vers une pièce du jeu (une deuxième entrée de la Sirène Borgne) arrive où arrive l’entrée d’origine');
ok(W1.studioZones.length === 3 && W1.studioZones[0].room === r1.id && W1.studioZones[0].to.x === 203 * 16 + 8 && W1.studioZones[0].label === 'Monter au grenier' && W1.studioZones[2].text === 'Ici, on paie d’avance.', 'les zones : deux passages (l’escalier, dans un sens et dans l’autre), un message');
ok(BASE.rooms.slice(0, NR).every((r, k) => W1.rooms[k] === undefined || (W1.rooms[k].name === r.name && W1.rooms[k].x0 === r.x0)) && W1.doors.slice(0, ND).every((x, k) => x.ox === BASE.doors[k].ox && x.room === BASE.doors[k].room), 'les pièces et les portes du jeu ne bougent pas, ni leurs numéros');
const out1 = []; for (let y = 0; y < OVER_H; y++) for (let x = 0; x < BASE.W; x++) { const i = idx(x, y); if (W1.tiles[i] !== BASE.tiles[i] && !(x >= SX && x <= SX + 7 && y >= SY && y <= SY + 7)) out1.push(i); }
ok(!out1.length, 'hors du bâtiment posé, l’archipel n’a pas changé d’une case');
// déplacer le bâtiment : sa porte le suit
const d2 = JSON.parse(JSON.stringify(d)); d2.decors[0].x += 1; const W1b = generateWorld(7, { studio: d2 });
ok(W1b.doors.find((x) => x.studio === 'q1').ox === q1.ox + 16, 'déplacer le bâtiment déplace son entrée (la porte suit la porte dessinée)');

// ---------------- 3. l'impossible est écarté
const bad = emptyDoc();
bad.pieces.push({ uid: 'b1', nom: 'Sur la Sirène', x: sir.x0, y: sir.y0, w: 6, h: 5 }, { uid: 'b2', nom: 'Dehors', x: 100, y: 100, w: 6, h: 5 }, { uid: 'b3', nom: 'Minuscule', x: 30, y: 500, w: 2, h: 2 }, { uid: 'b4', nom: 'Bonne', x: 30, y: 520, w: 6, h: 5 }, { uid: 'b5', nom: 'Sur la bonne', x: 32, y: 521, w: 6, h: 5 });
bad.portes.push({ uid: 'c1', piece: 'nulle', x: SX, y: SY }, { uid: 'c2', piece: 'b4', x: 30, y: 490 }, { uid: 'c3', piece: 'b4', batiment: 'absent' });
bad.zones.push({ uid: 'e1', type: 'passage', x: 31, y: 521, w: 1, h: 1 }, { uid: 'e2', type: 'téléporteur', x: 31, y: 521, w: 1, h: 1 }, { uid: 'e3', type: 'message', x: 5000, y: 1, w: 1, h: 1, texte: 'x' });
const W3 = generateWorld(7, { studio: bad }), ec = W3.studio.ecartes;
ok(W3.rooms.length === NR + 1 && ec.filter((e) => e.quoi === 'pièce').length === 4 && ec.filter((e) => e.quoi === 'porte').length === 3 && ec.filter((e) => e.quoi === 'zone').length === 3 && W3.doors.length === ND && !W3.studioZones.length, `une pièce sur une pièce du jeu, hors de la bande, trop petite, sur une autre pièce ; une porte vers rien, une entrée dans la bande, un bâtiment absent ; un passage sans arrivée, un genre inconnu, une zone hors de la carte : tout est écarté (${ec.length} écarts), seule la bonne pièce est creusée`);
ok(W3.rooms.slice(0, NR).every((r, k) => r.x0 === BASE.rooms[k].x0) && W3.tiles[idx(sir.x0 + 1, sir.y0 + 1)] === BASE.tiles[idx(sir.x0 + 1, sir.y0 + 1)], 'la Sirène Borgne est intacte');
const qcBad = checkStudio(W3, bad, deps);
ok(['piece_ecartee', 'porte_ecartee', 'zone_ecartee'].every((c) => qcBad.some((i) => i.code === c && i.niveau === 'bloquant')), 'le contrôle les signale, en bloquant (on ne publie pas un monde dont une partie serait perdue)');

// ---------------- 4. le vrai moteur
setStudioDoc(d);
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, v) => store.set(k, JSON.parse(JSON.stringify(v))) }, log: () => {} });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name, data = null) => { if (data) store.set(name.toLowerCase(), data); const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: PROTOCOL, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; if (p) { p.c = c; p.tut = 99; } return [p, c]; };
const [A, cA] = await login('Bâtisseuse');
const G = game.world, gq1 = G.doors.find((x) => x.studio === 'q1'), gr1 = G.rooms.find((r) => r.studio === 'p1'), gr2 = G.rooms.find((r) => r.studio === 'p2');
game.teleport(A, gq1.rx, gq1.ry + 2); game.time += 2;
game.onMessage(cA, { t: 'door', id: gq1.id });
ok(A.room === gr1.id && Math.abs(A.x - gq1.ix) < 1 && Math.abs(A.y - gq1.iy) < 1, 'le moteur : devant le bâtiment, on entre ; on arrive dans la salle commune');
game.time += 2; game.teleport(A, 171 * 16 + 8, 490 * 16 + 10); game.time += 2;
game.onMessage(cA, { t: 'passage', id: 0 });
ok(A.room === gr2.id && roomIdAt(G, A.x, A.y) === gr2.id, 'l’escalier : on monte au grenier (d’une pièce à l’autre)');
game.time += 2; game.onMessage(cA, { t: 'passage', id: 0 });
ok(A.room === gr2.id, 'on ne prend pas l’escalier de la salle depuis le grenier (le moteur vérifie qu’on est dans la zone)');
game.teleport(A, 201 * 16 + 8, 490 * 16 + 10); game.time += 2; game.onMessage(cA, { t: 'passage', id: 1 });
ok(A.room === gr1.id, 'et l’on redescend');
game.time += 2; game.teleport(A, gq1.ex, gq1.ey); game.onMessage(cA, { t: 'door', id: gq1.id, out: 1 });
ok(A.room === -1 && Math.abs(A.x - gq1.rx) < 1 && canStand(G, A.x, A.y), 'on ressort par le seuil, devant le bâtiment, sur l’archipel');
// une pièce supprimée : un pirate sauvegardé dedans reparaît au point d'arrivée
const saved = { ...store.get('bâtisseuse') || {} };
setStudioDoc(null);
const game2 = new Game({ storage: { auth: async () => ({ ok: true, data: { ...saved, x: 175 * 16 + 8, y: 494 * 16 + 10, name: 'Bâtisseuse' } }), save: () => {} }, log: () => {} });
const c2 = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game2.addClient(c2); game2.onMessage(c2, { t: 'login', v: PROTOCOL, name: 'Bâtisseuse', pass: 'abcd' }); await wait(60);
const A2 = game2.sessions.get(c2) && game2.sessions.get(c2).player;
ok(A2 && A2.room === -1 && canStand(game2.world, A2.x, A2.y), 'si la pièce disparaît du monde publié, un pirate sauvegardé dedans reparaît sur l’archipel, debout (sa sauvegarde n’est pas perdue)');

// ---------------- 5. l'éditeur : identique au jeu, annulable
const W5 = generateWorld(7, { studio: null }), doc5 = emptyDoc('Hasard'), ED = new Editor(W5, doc5, PROPS);
const rng = mulberry32(77), pick = (a) => a[Math.floor(rng() * a.length)], ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
const fac5 = ED.placeDecor('cite', SX + 1, SY, { donnees: { w: 5, h: 4, door: 2 } });
const furn = ['table', 'chaise', 'tonneau_d', 'etagere', 'plante', 'comptoir', 'lustre_p'];
let made = 0;
for (let k = 0; k < 300; k++) {
  const r = rng(), P = doc5.pieces;
  if (r < 0.1 || !P.length) { const pc = ED.createPiece({ nom: 'Pièce ' + k, w: ri(5, 16), h: ri(4, 10), genre: pick(['house', 'tavern', 'forge', 'cave']), style: pick([0, 1, 3, 5]), mur: pick(['', 'salon', 'cave']) }); if (pc) made++; }
  else if (r < 0.18) { const pc = pick(P); ED.movePiece(pc.uid, pc.x + ri(-4, 4), pc.y + ri(-3, 3)); }
  else if (r < 0.24) { const pc = pick(P); ED.resizePiece(pc.uid, ri(4, 18), ri(4, 10)); }
  else if (r < 0.34) { const pc = pick(P); ED.paint('sol', [[pc.x + ri(0, pc.w - 1), pc.y + ri(0, pc.h - 1)]], rng() < 0.3 ? undefined : pick(['IWALL', 'FLOOR', 'STONEF'])); }
  else if (r < 0.42) { const pc = pick(P); ED.paintStyle(rng() < 0.5 ? 'sols' : 'murs', [[pc.x + ri(0, pc.w - 1), pc.y + ri(0, pc.h - 1)]], rng() < 0.2 ? null : rng() < 0.5 ? pick([1, 2, 3, 9]) : pick(['salon', 'archives', 'atelier'])); }
  else if (r < 0.48) { const pc = pick(P); if (rng() < 0.7) ED.addMurDeco(pc.uid, { x: ri(0, pc.w - 2), y: 0, k: pick(['fenetre', 'tableau', 'biblio', 'carte']), n: ri(1, 2), v: 0 }); else ED.removeMurDeco(pc.uid, ri(0, pc.w - 1), 0); }
  else if (r < 0.58) { const pc = pick(P); ED.placeDecor(pick(furn), pc.x + ri(0, pc.w - 1), pc.y + ri(0, pc.h - 1)); }
  else if (r < 0.64) { const pc = pick(P); if (rng() < 0.5) ED.addPorte(pc.uid, { batiment: fac5.uid }); else ED.addPorte(pc.uid, { x: SX + ri(0, 7), y: SY + 6, sortie: ri(0, pc.w - 1) }); }
  else if (r < 0.68 && doc5.portes.length) ED.set('porte', pick(doc5.portes).uid, undefined);
  else if (r < 0.74) { ED.move([{ k: 'd', uid: fac5.uid }], ri(-1, 1), ri(-1, 1)); }
  else if (r < 0.82) { const a = pick(P), b = pick(P); ED.addZone({ type: rng() < 0.6 ? 'passage' : 'message', x: a.x + ri(0, a.w - 1), y: a.y + ri(0, a.h - 1), w: ri(1, 2), h: 1, texte: 'texte', vers: { x: b.x + ri(0, b.w - 1), y: b.y + ri(0, b.h - 1) } }); }
  else if (r < 0.86 && doc5.zones.length) { const z = pick(doc5.zones); if (rng() < 0.5) ED.set('zone', z.uid, undefined); else ED.changeZone(z.uid, { x: z.x + ri(-1, 1), auto: rng() < 0.5 }); }
  else if (r < 0.9) { const pc = pick(P); ED.changePiece(pc.uid, { nom: 'Renommée ' + k, genre: pick(['house', 'auberge', 'cellier']), sortie: ri(0, pc.w - 1), decoAuto: rng() < 0.5, dehors: rng() < 0.2 }); }
  else if (r < 0.94 && P.length > 1) { ED.removePiece(pick(P).uid, rng() < 0.7); }
  else { const pc = pick(P); ED.paint('collisions', [[pc.x + ri(0, pc.w - 1), pc.y + ri(0, pc.h - 1)]], rng() < 0.4 ? undefined : 1); }
}
const Wg = generateWorld(7, { studio: JSON.parse(JSON.stringify(doc5)) });
ok(made >= 15 && sig(W5) === sig(Wg), `après 300 actions au hasard (${made} pièces créées, ${doc5.pieces.length} restantes, ${doc5.portes.length} portes, ${doc5.zones.length} zones, ${doc5.decors.length} décors), l’éditeur et le jeu ont le même sol, les mêmes murs, la même solidité, les mêmes pièces case par case`);
ok(roomsSig(W5) === roomsSig(Wg) && doorsSig(W5) === doorsSig(Wg) && zonesSig(W5) === zonesSig(Wg) && propsSig(W5) === propsSig(Wg), 'et les mêmes pièces (nom, genre, styles, décor mural), les mêmes portes, les mêmes zones, les mêmes décors');
const nU = ED.undoStack.length; let u = 0; while (ED.undo()) u++;
ok(u === nU && sig(W5) === B0 && W5.rooms.length === NR && W5.doors.length === ND && !W5.studioZones.length && !doc5.pieces.length && !doc5.decors.length, `annuler les ${u} actions ramène le monde d’origine à l’octet près (les ${NR} pièces et ${ND} portes du jeu, pas une de plus)`);
while (ED.redo()) { /* */ }
ok(sig(W5) === sig(Wg) && roomsSig(W5) === roomsSig(Wg) && doorsSig(W5) === doorsSig(Wg), 'rétablir toutes les actions redonne exactement le même monde');
// déplacer une pièce emporte son contenu
{ const W6 = generateWorld(7, { studio: null }), d6 = emptyDoc(), E6 = new Editor(W6, d6, PROPS);
  const pc = E6.createPiece({ nom: 'Cabine', w: 8, h: 6 }), tb = E6.placeDecor('table', pc.x + 2, pc.y + 2);
  E6.paint('sol', [[pc.x + 4, pc.y + 1]], 'IWALL'); const z = E6.addZone({ type: 'message', x: pc.x + 1, y: pc.y + 1, w: 1, h: 1, texte: 'x' });
  const why = E6.movePiece(pc.uid, pc.x + 30, pc.y + 2), np = E6.piece(pc.uid), nt = E6.decorOf.get(tb.uid), nz = E6.zone(z.uid);
  ok(!why && np.x === pc.x + 30 && nt.x === pc.x + 32 && nt.y === pc.y + 4 && W6.tiles[(np.y + 1) * W6.W + np.x + 4] === T.IWALL && nz.x === pc.x + 31 && W6.tiles[(pc.y + 1) * W6.W + pc.x + 4] === T.VOID, 'déplacer une pièce emporte ses meubles, ses murs peints et ses zones ; l’ancienne place redevient du vide');
  const sir6 = W6.rooms.find((r) => r.name === 'La Sirène Borgne');
  ok(!!E6.movePiece(pc.uid, sir6.x0, sir6.y0) && E6.piece(pc.uid).x === pc.x + 30, 'on ne peut pas la poser sur une pièce du jeu (refusé, rien ne bouge)');
  const pcs = []; for (let k = 0; k < 40; k++) { const p = E6.createPiece({ w: 20, h: 12 }); if (p) pcs.push(p); }
  ok(pcs.length === 40 && new Set(pcs.map((p) => p.x + ',' + p.y)).size === 40 && generateWorld(7, { studio: d6 }).studio.ecartes.length === 0, '40 grandes pièces trouvent chacune leur place libre dans la bande, sans se chevaucher');
}

// ---------------- 6. le contrôle qualité
const q = emptyDoc('Contrôle');
q.decors.push({ uid: 'f1', type: 'cite', x: SX + 1, y: SY, donnees: { w: 5, h: 4, door: 2, nom: 'Sans intérieur' } });
q.pieces.push({ uid: 'k1', nom: 'Oubliée', x: 230, y: 500, w: 8, h: 6, sortie: 3 }, { uid: 'k2', nom: 'Murée', x: 250, y: 500, w: 10, h: 6, sortie: 2, deco: [{ x: 1, y: 3, k: 'fenetre', n: 1 }] });
for (let y = 500; y < 506; y++) q.sol[key(255, y)] = 'IWALL'; // un mur de haut en bas : la moitié est de la pièce est murée
q.portes.push({ uid: 'k3', piece: 'k2', x: SX, y: SY + 6 });
q.decors.push({ uid: 'f2', type: 'crate', x: 252, y: 505 }); // une caisse sur le seuil de l'arrivée
q.zones.push({ uid: 'k4', type: 'passage', x: 251, y: 501, w: 1, h: 1, vers: { x: 257, y: 503 } }, { uid: 'k5', type: 'message', x: 253, y: 501, w: 1, h: 1, texte: '' });
q.collisions[key(257, 503)] = 1; // l'arrivée du passage est bloquée
const IQ = checkStudio(generateWorld(7, { studio: q }), q, deps), C = new Set(IQ.map((i) => i.code));
const want = ['piece_sans_entree', 'batiment_sans_interieur', 'arrivee_bouchee', 'passage_bouche', 'piece_inaccessible', 'deco_sans_mur', 'message_vide'];
ok(want.every((c) => C.has(c)), `le contrôle trouve : une pièce sans entrée, un bâtiment sans intérieur, une arrivée bouchée, un passage bouché, des cases murées, un décor mural sans mur, un message vide (${[...C].join(', ')})`);
ok(IQ.filter((i) => ['arrivee_bouchee', 'passage_bouche'].includes(i.code)).every((i) => i.niveau === 'bloquant' && i.fix) && IQ.find((i) => i.code === 'arrivee_bouchee').fix.uid === 'f2' && IQ.find((i) => i.code === 'batiment_sans_interieur').fix.op === 'interieur', 'les problèmes qui empêchent d’entrer ou de passer sont bloquants ; la correction retire la caisse sur le seuil, ou crée l’intérieur du bâtiment');
// les corrections appliquées par l'éditeur font disparaître les problèmes
{ const W7 = generateWorld(7, { studio: null }), d7 = JSON.parse(JSON.stringify(q)), E7 = new Editor(W7, d7, PROPS);
  E7.set('decor', 'f2', undefined); E7.set('collisions', key(257, 503), undefined); E7.paint('sol', [[255, 503]], undefined);
  const I7 = checkStudio(generateWorld(7, { studio: d7 }), d7, deps), c7 = new Set(I7.map((i) => i.code));
  ok(!c7.has('arrivee_bouchee') && !c7.has('passage_bouche') && I7.filter((i) => i.niveau === 'bloquant').length === 0, `une fois la caisse retirée, l’arrivée du passage libérée et une porte ouverte dans le mur, plus rien de bloquant (${[...c7].join(', ')})`);
}
// ---------------- 7. les bâtiments complets, l'intérieur d'un bâtiment posé, l'étage
for (const M of MODELES) {
  const W8 = generateWorld(7, { studio: null }), d8 = emptyDoc(M.nom), E8 = new Editor(W8, d8, PROPS);
  const r = buildFromModel(E8, M, SX + 1, SY);
  const I8 = checkStudio(generateWorld(7, { studio: d8 }), d8, deps), bad8 = I8.filter((i) => i.niveau === 'bloquant' || ['piece_inaccessible', 'deco_sans_mur', 'arrivee_bouchee', 'piece_sans_entree', 'batiment_sans_interieur'].includes(i.code));
  setStudioDoc(d8);
  const g8 = new Game({ storage: { auth: async () => ({ ok: true, data: null }), save: () => {} }, log: () => {} });
  const c8 = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; g8.addClient(c8); g8.onMessage(c8, { t: 'login', v: PROTOCOL, name: 'Visiteuse', pass: 'abcd' }); await wait(40);
  const P8 = g8.sessions.get(c8).player, D8 = g8.world.doors.find((x) => x.studio); g8.teleport(P8, D8.rx, D8.ry + 2); g8.time += 2; g8.onMessage(c8, { t: 'door', id: D8.id });
  const inside = P8.room >= 0 && g8.world.rooms[P8.room].studio === r.pc.uid;
  ok(!r.err && !bad8.length && inside && d8.undoCount === undefined && E8.undoStack.length === 1, `« ${M.nom} » : façade, intérieur ${M.piece.w} × ${M.piece.h} et ${d8.decors.length - 1} meubles en une action ; rien de bloquant, tout le sol accessible ; on y entre par la porte${bad8.length ? ' — ' + bad8.map((i) => i.code + ' ' + i.msg).join(' ; ') : ''}`);
  setStudioDoc(null);
}
{ const W9 = generateWorld(7, { studio: null }), d9 = emptyDoc(), E9 = new Editor(W9, d9, PROPS);
  const b = E9.placeDecor('cite', SX + 1, SY, { donnees: { w: 6, h: 4, door: 3, style: 'armurerie', nom: 'L’armurerie' } });
  const r = interiorFor(E9, b.uid), e = addEtage(E9, r.pc.uid);
  const I9 = checkStudio(generateWorld(7, { studio: d9 }), d9, deps);
  ok(!r.err && r.pc.genre === 'forge' && r.pc.w === 14 && d9.portes[0].batiment === b.uid && !e.err && d9.pieces.length === 2 && d9.zones.length === 2 && d9.pieces[1].sortie === -1 && !I9.some((i) => i.niveau === 'bloquant' || i.code === 'piece_sans_entree'), `« Créer son intérieur » : une pièce à la mesure du bâtiment (${r.pc.w} × ${r.pc.h}, genre « forge » pour une armurerie), reliée à sa porte ; « ＋ Étage » : une pièce sans porte sur la rue, un escalier dans chacune ; rien de bloquant (${I9.map((i) => i.code).join(', ') || 'aucune remarque'})`);
}
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
