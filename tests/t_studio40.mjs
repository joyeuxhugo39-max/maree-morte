// LStudio, lot 4 : les personnages, le contrôle avancé, les finitions (sans navigateur).
//  1. le format : un document des versions 1 à 3 se lit tel quel ;
//  2. les personnages : ils rejoignent les personnages du jeu (leur fiche, le monde) ; le vrai moteur les fait parler et
//     les inscrit au codex ; leur apparence est toujours dessinable ; ils suivent leur pièce (déplacée, enregistrée comme
//     modèle) ; annuler les retire ; le contrôle signale un personnage dans un mur ou muet ;
//  3. les chemins coupés : une palissade qui enferme une entrée et son tavernier est signalée (bloquant), avec la clôture
//     fautive ; appliquer les corrections proposées rouvre le chemin ; une collision peinte qui coupe est signalée aussi ;
//     des décors qui ne coupent rien ne déclenchent rien ;
//  4. les corrections des références cassées (retouche, porte, zone, image, habillage) font disparaître chaque problème ;
//  5. l'empreinte du monde : la même pour le même monde, vide pour un monde vide ; le moteur refuse un pirate dont la page
//     a un autre monde (sans recharger en boucle) ;
//  6. le poids du monde, et les performances d'un grand monde (5 000 décors, 30 pièces, 30 personnages).
import { generateWorld, PROPS, canStand, studioSignature } from '../shared/world.js';
import { emptyDoc, normalizeDoc, checkStudio, key, setStudioDoc, useNpcRegistry, STUDIO_VERSION, persoId, encodeAsset } from '../shared/studio-world.js';
import { NPCS } from '../shared/data/npcs.js';
import { LOOK_PARTS, CLOTH_KEYS } from '../client/render/sprites-chars.js';
import { PERSO_LOOK } from '../shared/studio-world.js';
import { T, PROTOCOL } from '../shared/constants.js';
import { Editor } from '../studio/editor.js';
import { Game } from '../server/game.js';
import { captureModel, placeModel } from '../studio/prefabs.js';
import { MODELES, buildFromModel } from '../studio/modeles.js';
import { mulberry32 } from '../shared/rng.js';
useNpcRegistry(NPCS);
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const deps = { PROPS, canStand };
const BASE = generateWorld(7, { studio: null }), W = BASE.W, idx = (x, y) => y * W + x, NN = BASE.npcs.length;
const occupied = new Set(BASE.props.map((p) => idx(p.tx, p.ty)));
let site = null;
for (let y = 60; y < 400 && !site; y += 3) for (let x = 40; x < 900 && !site; x += 3) { let good = true; for (let dy = 0; dy < 7 && good; dy++) for (let dx = 0; dx < 8 && good; dx++) { const i = idx(x + dx, y + dy), t = BASE.tiles[i]; if (BASE.solid[i] || occupied.has(i) || !(t === T.GRASS || t === T.SAND || t === T.DIRT)) good = false; } if (good && !BASE.doors.some((d) => Math.abs(d.ox / 16 - x) < 12 && Math.abs(d.oy / 16 - y) < 12)) site = [x, y]; }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- 1. le format
const v3 = normalizeDoc({ format: 'lstudio', version: 3, meta: { nom: 'v3' }, assets: [] });
ok(Array.isArray(v3.personnages) && v3.version === STUDIO_VERSION && generateWorld(7, { studio: v3 }).npcs.length === NN, 'un document des versions 1 à 3 se lit tel quel (et n’ajoute personne)');
ok(PERSO_LOOK.top.every((t) => LOOK_PARTS.top.includes(t)) && PERSO_LOOK.hat.filter(Boolean).every((t) => LOOK_PARTS.hat.includes(t)) && PERSO_LOOK.hairStyle.every((t) => LOOK_PARTS.hairStyle.includes(t)) && PERSO_LOOK.colors.every((c) => CLOTH_KEYS.includes(c)), 'chaque apparence proposée par LStudio est une apparence que la feuille de personnage du jeu sait dessiner');

// ---------------------------------------------------------------- 2. les personnages
const W2 = generateWorld(7, { studio: null }), D2 = emptyDoc('Personnages'), E2 = new Editor(W2, D2, PROPS);
const c = E2.addPerso(site[0] + 2, site[1] + 2, { nom: 'Bertille', titre: 'Marchande de cordes', repliques: ['Des cordes ! Des bonnes cordes !'], sujets: [{ q: 'Combien ?', a: 'Pour toi ? Le double.' }], bulles: ['Cordes, cordes…'] });
E2.addPerso(site[0] + 4, site[1] + 2, { nom: 'Fantaisiste', look: { skin: 9, top: 'licorne', hat: 'casquette', topCol: 'fuchsia' } });
const G2 = generateWorld(7, { studio: JSON.parse(JSON.stringify(D2)) }), n2 = G2.npcs.find((n) => n.studio === c.uid), N2 = NPCS[persoId(c.uid)];
ok(n2 && G2.npcs.length === NN + 2 && n2.x === (site[0] + 2) * 16 + 8 && N2 && N2.name === 'Bertille' && N2.title === 'Marchande de cordes' && N2.greet[0].startsWith('Des cordes') && N2.topics[0].a === 'Pour toi ? Le double.' && N2.bulles.length === 1, 'les personnages rejoignent ceux du jeu : leur place dans le monde, leur fiche (nom, titre, répliques, sujets, ce qu’ils marmonnent)');
const Nf = NPCS[persoId(D2.personnages[1].uid)].look;
ok(Nf.skin === 0 && Nf.top === 'chemise' && !Nf.hat && Nf.topCol === 'brown', 'une apparence inconnue (une peau, un habit, un chapeau, une couleur que le jeu ne dessine pas) est ramenée à ce que le jeu sait dessiner');
setStudioDoc(D2);
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, v) => store.set(k, JSON.parse(JSON.stringify(v))) }, log: () => {} });
const cA = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(cA); game.onMessage(cA, { t: 'login', v: PROTOCOL, name: 'Cliente', pass: 'abcd', sw: game.world.studioSig }); await wait(60);
const A = game.sessions.get(cA).player, gn = game.world.npcs.find((n) => n.studio === c.uid);
game.teleport(A, gn.x, gn.y + 18); game.onMessage(cA, { t: 'talk', npc: gn.id });
ok(cA.msgs.some((m) => m.t === 'talk' && m.npc === gn.id) && A.met.has(gn.id), 'le vrai moteur : on parle à Bertille (la conversation s’ouvre), et elle entre au codex des personnages rencontrés');
game.teleport(A, gn.x + 300, gn.y); const before = cA.msgs.length; game.onMessage(cA, { t: 'talk', npc: gn.id });
ok(!cA.msgs.slice(before).some((m) => m.t === 'talk'), 'de loin, on ne lui parle pas (le moteur vérifie la distance, comme pour les personnages du jeu)');
const sigOk = game.world.studioSig; setStudioDoc(null);
// ils suivent leur pièce
const W3 = generateWorld(7, { studio: null }), D3 = emptyDoc(), E3 = new Editor(W3, D3, PROPS);
const tav = buildFromModel(E3, MODELES[0], site[0], site[1]); const cc = E3.addPerso(tav.pc.x + 4, tav.pc.y + 4, { nom: 'Pêcheur' });
E3.movePiece(tav.pc.uid, tav.pc.x + 30, tav.pc.y); const moved = E3.perso(cc.uid);
const M = captureModel(E3, [{ k: 'd', uid: tav.fac.uid }], 'Cabane habitée').M; placeModel(E3, M, site[0] + 12, site[1]);
ok(moved.x === tav.pc.x + 30 + 4 && M.pieces[0].persos.length === 1 && D3.personnages.length === 2 && W3.npcs.filter((n) => n.studio).length === 2, 'un personnage suit sa pièce quand on la déplace, et voyage avec elle dans un modèle (reposé, la cabane a son pêcheur)');
let u = 0; while (E3.undo()) u++;
ok(!W3.npcs.some((n) => n.studio) && W3.npcs.length === NN && !Object.keys(NPCS).some((k) => NPCS[k].studio && k.includes(cc.uid)), `annuler les ${u} actions retire les personnages du monde et de la liste des personnages`);
// le contrôle
const D4 = emptyDoc(); const wall = BASE.props.find((p) => p.type === 'tree' && BASE.solid[idx(p.tx, p.ty)]);
D4.personnages.push({ uid: 'm1', nom: 'Emmuré', x: wall.tx, y: wall.ty, look: {}, repliques: ['Au secours'] }, { uid: 'm2', nom: 'Taiseux', x: site[0] + 1, y: site[1] + 1, look: {}, repliques: [] });
const I4 = checkStudio(generateWorld(7, { studio: D4 }), D4, deps), c4 = new Set(I4.map((i) => i.niveau + ':' + i.code));
ok(c4.has('bloquant:personnage_mure') && c4.has('avertissement:personnage_muet'), 'le contrôle : un personnage dans un arbre (bloquant), un personnage sans rien à dire (avertissement)');

// ---------------------------------------------------------------- 3. les chemins coupés
const sir = BASE.doors.find((q) => q.name === 'La Sirène Borgne'), dx = Math.floor(sir.ox / 16), dy = Math.floor(sir.oy / 16);
const D5 = emptyDoc(); let nf = 0;
for (let y = dy - 3; y <= dy + 3; y++) for (let x = dx - 4; x <= dx + 4; x++) if ((y === dy + 3 || Math.abs(x - dx) === 4) && !BASE.solid[idx(x, y)]) D5.decors.push({ uid: 'f' + nf++, type: 'fence', x, y, v: 0 });
const dep5 = { ...deps, base: BASE }, I5 = checkStudio(generateWorld(7, { studio: D5 }), D5, dep5), cut = I5.filter((i) => i.code === 'chemin_coupe');
ok(cut.length >= 2 && cut.every((i) => i.niveau === 'bloquant' && i.fix && i.fix.op === 'supprimer' && /^f\d+$/.test(i.fix.uid)) && cut.some((i) => /Sirène Borgne/.test(i.msg)) && cut.some((i) => /bartholome/.test(i.msg)), `une palissade de ${nf} clôtures enferme la Sirène Borgne : le chemin vers son entrée et vers son tavernier est coupé (bloquant), et la correction désigne une clôture`);
{ const W6 = generateWorld(7, { studio: null }), D6 = JSON.parse(JSON.stringify(D5)), E6 = new Editor(W6, D6, PROPS); let rounds = 0, left;
  do { const I = checkStudio(generateWorld(7, { studio: D6 }), D6, dep5).filter((i) => i.code === 'chemin_coupe'); left = I.length; if (left) E6.set('decor', I[0].fix.uid, undefined); rounds++; } while (left && rounds < 10);
  ok(!left && D6.decors.length === nf - (rounds - 1) && rounds <= 3, `appliquer la correction proposée rouvre le chemin (${rounds - 1} clôture(s) retirée(s) sur ${nf})`); }
const D7 = emptyDoc(); for (let x = dx - 4; x <= dx + 4; x++) for (let y = dy - 3; y <= dy + 3; y++) if ((y === dy + 3 || Math.abs(x - dx) === 4) && !BASE.solid[idx(x, y)]) D7.collisions[key(x, y)] = 1;
const I7 = checkStudio(generateWorld(7, { studio: D7 }), D7, dep5).filter((i) => i.code === 'chemin_coupe');
ok(I7.length && I7[0].fix.op === 'retirer_collision', 'des collisions peintes qui ferment le passage : signalées, la correction retire la collision fautive');
const D8 = emptyDoc(); D8.decors.push({ uid: 'b1', type: 'barrel', x: dx + 6, y: dy + 2, v: 0 }, { uid: 'b2', type: 'bench', x: site[0], y: site[1], v: 0 });
ok(!checkStudio(generateWorld(7, { studio: D8 }), D8, dep5).some((i) => i.code === 'chemin_coupe'), 'des décors qui ne ferment rien ne déclenchent rien (aucun faux chemin coupé)');

// ---------------------------------------------------------------- 4. les références cassées, corrigées
const palm = BASE.props.find((p) => p.type === 'palm');
const D9 = emptyDoc(); D9.retouches[palm.id] = { ref: { type: 'rock', x: palm.tx, y: palm.ty }, retire: true };
D9.portes.push({ uid: 'pp', piece: 'nulle', x: site[0], y: site[1] }); D9.zones.push({ uid: 'zz', type: 'passage', x: site[0], y: site[1], w: 1, h: 1 });
D9.assets.push({ id: 'bad', nom: 'abîmée', w: 2, h: 2, pal: ['#000000'], px: '!!' }, { id: 'hab', nom: 'habit', ...encodeAsset(new Uint8ClampedArray(16), 2, 2), remplace: 'licorne' });
const I9 = checkStudio(generateWorld(7, { studio: D9 }), D9, deps), want9 = ['retouche', 'porte_ecartee', 'zone_ecartee', 'image_invalide', 'habillage_inconnu'];
ok(want9.every((cd) => I9.some((i) => i.code === cd && i.fix && i.fix.op !== 'aller')), `chaque référence cassée a sa correction (${want9.join(', ')})`);
{ const W10 = generateWorld(7, { studio: null }), D10 = JSON.parse(JSON.stringify(D9)), E10 = new Editor(W10, D10, PROPS);
  const apply = (f) => { if (f.op === 'retirer_retouche') E10.set('retouche', String(f.id), undefined); else if (f.op === 'supprimer_porte') E10.set('porte', f.uid, undefined); else if (f.op === 'supprimer_zone') E10.set('zone', f.uid, undefined); else if (f.op === 'supprimer_image') E10.set('asset', f.id, undefined); else if (f.op === 'retirer_habillage') { const a = { ...D10.assets.find((q) => q.id === f.id) }; delete a.remplace; E10.set('asset', f.id, a); } };
  E10.begin('Corriger'); for (const i of I9) if (want9.includes(i.code)) apply(i.fix); E10.end();
  const I10 = checkStudio(generateWorld(7, { studio: D10 }), D10, deps);
  ok(!I10.some((i) => want9.includes(i.code)) && E10.undoStack.length === 1, 'appliquées d’un coup (une seule action), elles font disparaître chaque problème'); }

// ---------------------------------------------------------------- 5. l'empreinte du monde
const sA = studioSignature(D2), sB = studioSignature({ ...JSON.parse(JSON.stringify(D2)), meta: { nom: 'renommé' } });
ok(studioSignature(null) === '' && studioSignature(emptyDoc()) === '' && sA && sA === sB && sA === sigOk && studioSignature(D5) !== sA, 'l’empreinte du monde : vide pour un monde vide ; la même pour le même monde (son nom n’y compte pas) ; une autre pour un autre monde');
setStudioDoc(D2);
const g2 = new Game({ storage: { auth: async () => ({ ok: true, data: null }), save: () => {} }, log: () => {} });
const cB = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; g2.addClient(cB); g2.onMessage(cB, { t: 'login', v: PROTOCOL, name: 'Retard', pass: 'abcd', sw: 'autre-monde' }); await wait(40);
const err = cB.msgs.find((m) => m.t === 'err');
ok(err && /mis à jour/.test(err.msg) && !err.reload && !g2.sessions.get(cB).player, 'le moteur refuse un pirate dont la page a un autre monde que la partie : il le lui dit, sans recharger en boucle');
const cC = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; g2.addClient(cC); g2.onMessage(cC, { t: 'login', v: PROTOCOL, name: 'Ancien', pass: 'abcd' }); await wait(40);
ok(!!g2.sessions.get(cC).player, 'un client qui ne donne pas d’empreinte (une page d’avant) est accepté comme avant');
setStudioDoc(null);

// ---------------------------------------------------------------- 6. le poids, les performances
const heavy = emptyDoc(); for (let k = 0; k < 6000; k++) heavy.decors.push({ uid: 'h' + k, type: 'flower', x: 100 + (k % 60), y: 100 + ((k / 60) | 0), v: 0, nom: 'x'.repeat(250) });
ok(checkStudio(generateWorld(7, { studio: heavy }), heavy, deps).some((i) => i.code === 'monde_lourd' && i.niveau === 'avertissement'), `un monde de ${Math.round(JSON.stringify(heavy).length / 1000)} Ko : le contrôle prévient que chaque joueur le chargera`);
const Wb = generateWorld(7, { studio: null }), Db = emptyDoc('Grand'), Eb = new Editor(Wb, Db, PROPS), rng = mulberry32(5), types = ['barrel', 'crate', 'palm', 'bush', 'rock', 'lamp', 'bench', 'flower', 'tree', 'fence'];
let t = performance.now();
for (let k = 0; k < 5000; k++) { let x, y; do { x = 20 + Math.floor(rng() * 900); y = 20 + Math.floor(rng() * 400); } while (Wb.solid[idx(x, y)] || Wb.tiles[idx(x, y)] <= 1); Eb.placeDecor(types[k % types.length], x, y); }
for (let k = 0; k < 30; k++) Eb.createPiece({ w: 14, h: 9, nom: 'P' + k });
for (let k = 0; k < 30; k++) { let x, y; do { x = 20 + Math.floor(rng() * 900); y = 20 + Math.floor(rng() * 400); } while (Wb.solid[idx(x, y)] || Wb.tiles[idx(x, y)] <= 1); Eb.addPerso(x, y); }
const tA = performance.now() - t;
t = performance.now(); const Gb = generateWorld(7, { studio: JSON.parse(JSON.stringify(Db)) }); const tG = performance.now() - t;
t = performance.now(); new Editor(generateWorld(7, { studio: null }), JSON.parse(JSON.stringify(Db)), PROPS); const tE = performance.now() - t;
t = performance.now(); checkStudio(Gb, Db, { ...deps, base: BASE }); const tQ = performance.now() - t;
ok(tG < 5000 && tE < 5000 && tQ < 3000, `un grand monde (5 000 décors, 30 pièces, 30 personnages, ${Math.round(JSON.stringify(Db).length / 1000)} Ko) : posé en ${Math.round(tA)} ms, généré par le jeu en ${Math.round(tG)} ms, ouvert dans l’éditeur en ${Math.round(tE)} ms, contrôlé en ${Math.round(tQ)} ms`);
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
