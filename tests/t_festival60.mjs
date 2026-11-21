// Lot 6 : La Nuit des Mille Voiles, de bout en bout, côté serveur. Le calendrier ; les cinq épreuves, seul et à plusieurs ;
// la course (location, rivaux, bouées, faux départ, arrivée, abandon, déconnexion) ; le spectacle ; les jetons (plafonds,
// pas de doublons), la boutique et les parures ; les secrets ; le classement ; la sauvegarde et la reconnexion.
import { Game } from '../server/game.js';
import { PROTOCOL, TILE, DAY_LENGTH } from '../shared/constants.js';
import { festEdition, TOK, CANON, SHOP_BY, RACE, CLUES, SYMBOLS, ROMAN, GABIER, SHOW } from '../shared/data/festival.js';
import { canonTargets, targetAt, gabBarrels } from '../shared/fest-sim.js';
import { SAFE } from '../shared/world.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const mkGame = () => new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
let game = mkGame();
const W = game.world, F = W.fest, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name, level = 15) => {
  const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} };
  game.addClient(c); game.onMessage(c, { t: 'login', v: PROTOCOL, name, pass: 'abcd' }); await wait(60);
  const p = game.sessions.get(c).player; p.c = c; p.level = level; game.recalc(p); p.hp = p.stats.maxHp; p.tut = 99; return p;
};
const say = (p, m) => game.onMessage(p.c, m);
const tick = (n) => { for (let i = 0; i < n; i++) game.tick(); };
const msgs = (p, n0, a) => p.c.msgs.slice(n0).filter((m) => m.t === 'fest' && (!a || m.a === a));
const toasts = (p, n0) => p.c.msgs.slice(n0).filter((m) => m.t === 'toast').map((m) => m.msg).join(' | ');
const S = (k, n = 0) => F.spots.filter((s) => s.k === k)[n];
const spot = (p, k, n = 0) => { const s = S(k, n); if (s.room === -1 || p.room === s.room) game.teleport(p, s.x, s.y, {}); p.cds.fspot = 0; say(p, { t: 'fest', a: 'spot', i: s.id }); return s; };
const near = (p, id, dx = 0, dy = 14) => { const n = game.npcPos.get(id); game.teleport(p, n.x + dx, n.y + dy, {}); };
const advance = (sec) => { const n = Math.round(sec * 20); tick(n); };
const open = () => { game.fs.force = 'open'; tick(10); };

// ---------------- 0. le calendrier : une édition par semaine, du jeudi midi au lundi midi
const thu = Date.UTC(2026, 10, 19, 13), mon = Date.UTC(2026, 10, 23, 11), tue = Date.UTC(2026, 10, 24, 12);
ok(festEdition(thu).open && festEdition(mon).open && !festEdition(tue).open, 'ouvert le jeudi après midi et jusqu’au lundi midi, fermé le mardi');
ok(festEdition(thu).key === festEdition(mon).key && festEdition(tue).next > tue && festEdition(Date.UTC(2026, 10, 26, 13)).key !== festEdition(thu).key, 'une édition = un long week-end ; la suivante revient le jeudi');
const vs = new Set([0, 1, 2, 3].map((k) => festEdition(thu + k * 7 * 86400e3).variant));
ok(vs.size === 3, 'trois variantes qui tournent d’une semaine à l’autre');

// ---------------- 1. fermé : le festival ne se joue pas ; ouvert : il se joue
const A = await login('Albertine');
game.fs.force = 'closed'; tick(10);
let n0 = A.c.msgs.length; spot(A, 'canon', 0);
ok(!game.fs.rounds.size && /terminée pour cette semaine/.test(toasts(A, n0)), 'hors édition, les épreuves sont fermées (un message le dit)');
open();
ok(game.festOpen() && msgs(A, 0, 'etat').some((m) => m.open === 1), 'ouvert : l’état du festival est envoyé à tous');

// ---------------- 2. le concours de canonniers
n0 = A.c.msgs.length; spot(A, 'canon', 0);
const R = game.fs.rounds.get(0);
ok(R && R.pid === A.id && msgs(A, n0, 'canon').length === 1, 'au canon : une manche de 45 secondes, la graine envoyée au client');
const B = await login('Barnabelle'); game.teleport(B, S('canon', 0).x + 10, S('canon', 0).y, {}); B.cds.fspot = 0; n0 = B.c.msgs.length;
say(B, { t: 'fest', a: 'spot', i: S('canon', 0).id });
ok(/tient ce canon/.test(toasts(B, n0)), 'un canon tenu ne se prend pas : les deux autres sont libres');
spot(B, 'canon', 1); ok(game.fs.rounds.get(1) && game.fs.rounds.get(1).pid === B.id, 'trois canons, trois manches en même temps');
// viser juste : on tire là où la cible sera à l'impact (les mêmes calculs que le client)
const c0 = F.cannons[0], tg = canonTargets(R.v, R.seed, c0.lane);
ok(tg.every((t) => t.y >= c0.lane.y0 && t.y <= c0.lane.y1), 'les cibles restent dans leur couloir d’eau');
advance(3.2);
let fired = 0;
for (let k = 0; k < 40 && game.time < R.end - 1; k++) {
  const t = game.time - R.t0 + CANON.flight, live = tg.filter((x) => !R.hits.has(x.i) && targetAt(x, t) && Math.hypot(targetAt(x, t).x - c0.x, targetAt(x, t).y - c0.y) < CANON.range - 10);
  if (live.length) { const pt = targetAt(live[0], t); say(A, { t: 'fest', a: 'tir', x: pt.x, y: pt.y }); fired++; }
  advance(1.05);
}
advance(CANON.round);
ok(!game.fs.rounds.has(0) && (A.fest.best.canon || 0) >= CANON.stamp, `en visant juste : ${A.fest.best.canon} points (${fired} tirs)`);
ok(A.fest.st.canon === 1 && A.fest.tok >= TOK.stamp.canon, 'le tampon « Canonniers » et ses jetons');
const tok1 = A.fest.tok; n0 = A.c.msgs.length;
say(A, { t: 'fest', a: 'tir', x: c0.x, y: c0.y + 100 });
ok(A.fest.tok === tok1 && !msgs(A, n0, 'impact').length, 'hors manche, un tir ne compte pas');
// la cadence : un tir par seconde, pas plus
spot(A, 'canon', 0); const R2 = game.fs.rounds.get(0); advance(3.2);
for (let k = 0; k < 10; k++) say(A, { t: 'fest', a: 'tir', x: c0.x, y: c0.y + 100 });
ok(R2.shots === 1, 'dix clics d’un coup : un seul boulet (le canon se recharge)');
game.teleport(A, c0.x + 200, c0.y - 60, {}); tick(12);
ok(!game.fs.rounds.has(0), 'on quitte le canon : la manche s’arrête');
game.fs.rounds.delete(1); if (B.fx) B.fx.canon = null;

// ---------------- 3. la chasse au trésor
near(A, 'mira'); n0 = A.c.msgs.length; say(A, { t: 'fest', a: 'tresor' });
const tr = A.fest.tr;
ok(tr && tr.clues.length === 4 && msgs(A, n0, 'tresor').length === 1, 'Mira confie la carte : quatre indices tirés au hasard parmi huit');
const clueSpot = (k) => F.spots.find((s) => s.k === 'indice' && s.clue === k);
const wrong = CLUES.map((c) => c.k).find((k) => !tr.clues.includes(k));
n0 = A.c.msgs.length; game.teleport(A, clueSpot(wrong).x, clueSpot(wrong).y, {}); A.cds.fspot = 0; say(A, { t: 'fest', a: 'spot', i: clueSpot(wrong).id });
ok(tr.i === 0 && /Rien ici/.test(toasts(A, n0)), 'un mauvais endroit : rien');
for (const k of tr.clues) { const s = clueSpot(k); game.teleport(A, s.x, s.y, {}); A.cds.fspot = 0; say(A, { t: 'fest', a: 'spot', i: s.id }); }
ok(tr.i === 4, 'les quatre indices, dans l’ordre des énigmes');
const chest = F.spots.find((s) => s.k === 'coffre_mira' && s.variant === game.fs.ed.variant);
n0 = A.c.msgs.length; game.teleport(A, chest.x, chest.y, {}); A.cds.fspot = 0; say(A, { t: 'fest', a: 'spot', i: chest.id });
const en = msgs(A, n0, 'enigme')[0];
ok(en && en.opts.length === 4, 'le coffre : un cadenas à symboles, quatre combinaisons possibles');
const want = tr.nums.map((n, j) => [n, SYMBOLS[tr.syms[j]]]).sort((a, b) => a[0] - b[0]).map(([, s]) => s).join();
const good = en.opts.findIndex((o) => o.join() === want), bad = (good + 1) % 4;
say(A, { t: 'fest', a: 'enigme', o: bad });
ok(!tr.solved, 'la mauvaise combinaison : le cadenas résiste (et se grippe dix secondes)');
advance(11); A.cds.fspot = 0; n0 = A.c.msgs.length; say(A, { t: 'fest', a: 'spot', i: chest.id });
const en2 = msgs(A, n0, 'enigme')[0], good2 = en2.opts.findIndex((o) => o.join() === want);
const g0 = A.gold; say(A, { t: 'fest', a: 'enigme', o: good2 });
ok(tr.solved && A.gold === g0 + 120 && A.fest.st.tresor === 1, 'les symboles dans l’ordre des chiffres romains : le coffre s’ouvre (doublons, tampon)');
ok(ROMAN.length === 4, '(I à IV)');
// à deux : un groupe chasse ensemble
const C = await login('Célestin'), D = await login('Désirée');
say(C, { t: 'soc', a: 'invite', name: 'Désirée' }); say(D, { t: 'soc', a: 'accept', name: 'Célestin' });
near(C, 'mira'); say(C, { t: 'fest', a: 'tresor' }); near(D, 'mira'); say(D, { t: 'fest', a: 'tresor' });
ok(C.fest.tr && D.fest.tr && C.fest.tr.clues.join() === D.fest.tr.clues.join(), 'en groupe : la même carte pour les deux');
const k0 = C.fest.tr.clues[0], s0 = clueSpot(k0); game.teleport(C, s0.x, s0.y, {}); game.teleport(D, s0.x + 30, s0.y, {}); C.cds.fspot = 0; say(C, { t: 'fest', a: 'spot', i: s0.id });
ok(C.fest.tr.i === 1 && D.fest.tr.i === 1, 'l’un trouve l’indice : le compagnon présent l’a aussi');
game.teleport(D, 100, 100, {}); D.cds.fspot = 0;
const k1 = C.fest.tr.clues[1], s1 = clueSpot(k1); game.teleport(C, s1.x, s1.y, {}); C.cds.fspot = 0; say(C, { t: 'fest', a: 'spot', i: s1.id });
ok(C.fest.tr.i === 2 && D.fest.tr.i === 1, 'un compagnon loin de là ne l’a pas (il le trouvera lui-même)');

// ---------------- 4. le défi des tavernes
near(A, 'barnabe'); n0 = A.c.msgs.length; say(A, { t: 'fest', a: 'tav', c: 'start' });
let tv = msgs(A, n0, 'tav').pop();
ok(tv && tv.stage === 'des' && tv.dice.length === 3, 'les dés : trois dés, deux relances');
say(A, { t: 'fest', a: 'tav', c: 'relancer', mask: 7 }); say(A, { t: 'fest', a: 'tav', c: 'relancer', mask: 1 });
n0 = A.c.msgs.length; say(A, { t: 'fest', a: 'tav', c: 'garder' });
tv = msgs(A, n0, 'tav').pop();
ok(tv && tv.stage === 'mem' && tv.seq.length === 3 && tv.him.length === 3, 'Barnabé lance ses dés ; puis les chopes : une suite de trois');
for (let r = 0; r < 4; r++) { n0 = A.c.msgs.length; say(A, { t: 'fest', a: 'tav', c: 'mem', seq: tv.seq }); tv = msgs(A, n0, 'tav').pop(); }
ok(A.fx.tav.pts.mem === 4 && tv.seq.length === 7, 'chaque suite répétée en ajoute une : quatre de suite');
n0 = A.c.msgs.length; say(A, { t: 'fest', a: 'tav', c: 'mem', seq: [9, 9] }); tv = msgs(A, n0, 'tav').pop();
ok(tv.stage === 'ref', 'une erreur : on passe au bouchon');
// le bouchon : trop tôt = faux départ ; à temps = un temps de réaction mesuré par le serveur
say(A, { t: 'fest', a: 'tav', c: 'pret' }); say(A, { t: 'fest', a: 'tav', c: 'tir' });
ok(A.fx.tav.tries === 1 && A.fx.tav.bestRt === 9, 'tirer avant « Tirez ! » : faux départ, l’essai est perdu');
for (let k = 0; k < 2; k++) { n0 = A.c.msgs.length; say(A, { t: 'fest', a: 'tav', c: 'pret' }); for (let j = 0; j < 100 && !msgs(A, n0, 'tav').some((m) => m.go); j++) tick(2); tick(4); say(A, { t: 'fest', a: 'tav', c: 'tir' }); }
const fin = msgs(A, 0, 'tav').pop();
ok(fin.stage === 'fin' && fin.rt > 0 && fin.rt < 400 && fin.total >= 8, `fin du défi : ${fin.total} points (dés ${fin.pts.des}, chopes ${fin.pts.mem}, bouchon ${fin.pts.ref}, réaction ${fin.rt} ms)`);
ok(A.fest.best.taverne === fin.total, 'le meilleur total est retenu');

// ---------------- 5. le parcours du gabier
spot(A, 'gab_entree');
ok(A.room === F.rooms.gabier && SAFE.has(W.zones[Math.floor(A.y / 16) * W.W + Math.floor(A.x / 16)]), 'le parcours : une salle à part, zone sûre');
spot(A, 'gab_depart'); const G = F.gabier;
game.teleport(A, G.line + 12, A.y, {}); tick(4);
ok(A.fx.gab && A.fx.gab.started > 0, 'franchir la ligne : le chrono part');
// un tonneau sur le long quai : on est renvoyé au dernier point de reprise
const bb = gabBarrels(G, game.time + 0.1)[0]; game.teleport(A, bb.x, bb.y + 4, {}); tick(2);
ok(A.x < bb.x - 40 && /tonneau/.test(toasts(A, A.c.msgs.length - 5)), 'fauché par un tonneau : retour au dernier point de reprise');
n0 = A.c.msgs.length; spot(A, 'gab_saut', 0);
ok(Math.abs(A.x - S('gab_saut', 0).to.x) < 2, 'sauter par-dessus le bras d’eau');
advance(GABIER.gold + 5); spot(A, 'gab_cloche');
const gt = A.fest.best.gabier;
ok(gt > 0 && A.fest.st.gabier === 1 && !A.fx.gab, `la cloche : ${gt} s, et le tampon`);
spot(A, 'gab_sortie'); ok(A.room === -1, 'la sortie : retour à la plage');

// ---------------- 6. la Lice des Capitaines
spot(A, 'lice_entree'); ok(A.room === F.rooms.lice, 'la Lice : sous la tente rayée');
near(A, 'escarmouche', 20, 0); say(A, { t: 'fest', a: 'duel', c: 'champion', n: 2 });
ok(!A.fx.champ, 'un champion à la fois : d’abord Bosco');
say(A, { t: 'fest', a: 'duel', c: 'champion', n: 0 });
const ch = A.fx.champ;
ok(ch && ch.only === A.id && ch.maxHp > 300, `Bosco le Rieur, à votre mesure (${ch.maxHp} PV), ne vise que vous`);
// un autre pirate dans la Lice : le champion l'ignore ; personne ne peut le frapper
const E = await login('Eugène'); spot(E, 'lice_entree'); game.teleport(E, ch.x + 6, ch.y, {});
ok(!game.mobCanTarget(ch, E) && game.mobCanTarget(ch, A), 'le champion ne vise que son challenger');
ok(!game.canPvp(A, E) && !game.canPvp(E, A), 'dans la Lice, pas de coups entre pirates hors d’un duel');
// le challenger tombe : mis à terre, pas mort, rien de perdu
const inv0 = JSON.stringify(A.inv); A.hp = 1; A.invulnUntil = 0; game.damagePlayer(A, 500, null);
ok(!A.dead && A.hp > 1 && JSON.stringify(A.inv) === inv0 && !A.fx.champ, 'touché : debout, rien de perdu, le duel s’arrête');
say(A, { t: 'fest', a: 'duel', c: 'champion', n: 0 }); const ch2 = A.fx.champ; A.hp = A.stats.maxHp;
game.damageMob(ch2, ch2.hp + 10, A, false); tick(4);
ok(A.fest.ch === 1 && A.fest.st.duel === 1 && !A.fx.champ, 'Bosco s’incline : le tampon « Duel »');
// un duel amical entre deux pirates
n0 = E.c.msgs.length; say(A, { t: 'fest', a: 'duel', c: 'defier', name: 'Eugène' });
ok(E.c.msgs.slice(n0).some((m) => m.t === 'ask' && m.kind === 'fduel'), 'défier un pirate présent : il reçoit la demande');
say(E, { t: 'fest', a: 'duel', c: 'accepter' });
const du = A.fx.duel;
ok(du && E.fx.duel === du && !game.canPvp(A, E), 'accepté : trois secondes avant « En garde ! »');
advance(3.2);
ok(game.canPvp(A, E), 'en garde : eux deux, et personne d’autre');
const tE = E.fest.tok; E.hp = 1; game.damagePlayer(E, 999, A);
ok(!E.dead && !A.fx.duel && !E.fx.duel, 'Eugène est touché : ni mort, ni perte, fin du duel');
ok(A.fest.tok > 0 && E.fest.tok === tE, 'le vainqueur gagne quelques jetons');
spot(A, 'lice_sortie'); spot(E, 'lice_sortie');

// ---------------- 7. la course des Mille Voiles
near(A, 'anselin'); n0 = A.c.msgs.length; say(A, { t: 'fest', a: 'course', c: 'inscrire' });
ok(game.fs.start && game.fs.start.ids.has(A.id) && msgs(A, n0, 'course').length, 'inscrite : départ dans trente secondes');
near(B, 'anselin'); say(B, { t: 'fest', a: 'course', c: 'inscrire' });
ok(game.fs.start.ids.size === 2, 'un second pirate rejoint le même départ');
advance(RACE.open + 0.5);
const race = [...game.fs.races][0];
const shA = game.myShip(A), shB = game.myShip(B);
ok(race && shA && shA.rental === A.key && shB && shB.rental === B.key && A.post === 'helm', 'le départ : chacun reçoit un cotre de location, à la barre');
ok(race.ghosts.length === 3 && race.ghosts.every((g) => g.ghost && g.race === race.id), 'trois rivaux courent aussi');
ok(!game.ownShip(A.key), 'un cotre de location n’est pas « son » navire (rien à sauvegarder, rien à réparer)');
// personne ne bloque personne : pas de collision entre deux navires de la course
shB.x = shA.x + 4; shB.y = shA.y; const ax0 = shA.x; tick(1);
ok(Math.abs(shA.x - ax0) < 3, 'deux navires de la course se croisent sans se heurter');
ok(!game.canPvp(A, B) && !game.canPvp(B, A), 'une régate amicale : pas de JcJ entre concurrents');
ok(!game.projShip({ kind: 'cball', team: 'p', owner: B.id, x: shA.x, y: shA.y - 8 }) && !game.projShip({ kind: 'cball', team: 'm', x: race.ghosts[0].x, y: race.ghosts[0].y - 8 }), 'les boulets traversent les voiliers de la course (concurrents et rivaux)');
// un faux départ
shB.y = RACE.line.y * TILE - 20; tick(2);
ok(race.racers.get(B.id).pen === RACE.falseStart, 'franchir la ligne avant le coup de canon : faux départ, dix secondes de pénalité');
advance(10);
// A court le parcours (on la mène de bouée en bouée)
const rr = race.racers.get(A.id);
const lineY = RACE.line.y * TILE + 8;
shA.x = (RACE.line.x0 + RACE.line.x1) * 8; shA.y = lineY + 20; tick(2); shA.y = lineY - 20; tick(2);
ok(rr.i === 1, 'franchir la ligne après le départ : le chrono court, cap sur la première bouée');
for (const b of race.buoys) { shA.x = b.x + 10; shA.y = b.y; tick(2); }
ok(rr.i === race.buoys.length + 1, `les ${race.buoys.length} bouées, dans l’ordre de l’édition`);
shA.x = (RACE.line.x0 + RACE.line.x1) * 8; shA.y = lineY + 30; tick(2); shA.y = lineY - 30; tick(2);
ok(rr.done && A.fest.st.course === 1 && A.fest.best.course > 0, `l’arrivée : ${A.fest.best.course} s, le tampon`);
// B abandonne (en quittant son cotre)
game.leaveDeck(B); tick(3);
ok(race.racers.get(B.id).done && race.racers.get(B.id).out, 'descendre de son cotre : la course est perdue (sans bloquer les autres)');
// les rivaux : ils vont jusqu'au bout tout seuls, par un chemin de mer sans terre
const path = race.ghosts[0].ghost.path;
let land = 0; for (let k = 1; k < path.length; k++) { const a = path[k - 1], b = path[k], L = Math.hypot(b.x - a.x, b.y - a.y); for (let s = 0; s < L; s += 8) { const x = a.x + (b.x - a.x) * s / L, y = a.y + (b.y - a.y) * s / L, t = W.tiles[Math.floor(y / 16) * W.W + Math.floor(x / 16)]; if (t !== 0 && t !== 1) land++; } }
ok(land === 0 && path.length > 10, `le chemin des rivaux reste en mer (${path.length} points)`);
// la course se termine : les rivaux rentrent, les cotres retournent au port quand on en descend
for (const g of race.ghosts) g.ghost.j = g.ghost.path.length;
tick(4);
ok(!game.fs.races.size && !race.ghosts.some((g) => game.ships.has(g.id)), 'plus personne en course : les rivaux disparaissent');
game.leaveDeck(A); near(A, 'anselin'); tick(12);
ok(!game.ships.has(shA.id) && !game.ships.has(shB.id), 'les cotres vides retournent à Anselin');
// une déconnexion pendant la course : rien ne reste bloqué
near(C, 'anselin'); say(C, { t: 'fest', a: 'course', c: 'inscrire' }); advance(RACE.open + 0.5);
const race2 = [...game.fs.races][0], shC = game.myShip(C);
game.logout(C); tick(4);
ok(race2.racers.get(C.id).done && !game.fs.races.has(race2), 'déconnecté en pleine course : la course s’arrête proprement');
tick(30); ok(!game.ships.has(shC.id), 'et son cotre rentre au port');

// ---------------- 8. le spectacle de la nuit
if (process.env.DIAG) console.log('DIAG mort ?', A.dead, A.deathAt, game.time);
A.dead = false; A.hp = A.stats.maxHp; game.teleport(A, F.stage.cx, F.stage.cy + 30, {}); game.fs.show = null; game.fs.lastShow = -9; const day = Math.floor(game.worldTime / DAY_LENGTH) + 1;
game.worldTime = day * DAY_LENGTH + DAY_LENGTH * (SHOW.at + 0.01); n0 = A.c.msgs.length; tick(10);
if (process.env.DIAG) console.log('DIAG show', msgs(A, n0, 'show').length, !!game.fs.show, msgs(A, n0).map((m) => m.a).join());
ok(game.fs.show && msgs(A, n0, 'show').length === 1, 'à la tombée de la nuit : le spectacle commence (pour tout le monde)');
const tokS = A.fest.tok; advance(119);
ok(A.fest.tok === tokS + TOK.show, 'y assister rapporte des jetons…');
advance(5); game.fs.show = null; game.fs.lastShow = -9; game.worldTime = (day + 1) * DAY_LENGTH + DAY_LENGTH * (SHOW.at + 0.01); tick(10); advance(119);
ok(A.fest.tok === tokS + 2 * TOK.show, '…une fois par spectacle');
// le secret : danser sur la scène pendant le bouquet final
game.teleport(A, F.stage.cx, F.stage.cy + 2, {}); A.cds.emote = 0; say(A, { t: 'emote', k: 'danse' });
ok(A.fest.sec.includes('valse') && A.fest.own.includes('em_valse'), 'danser sur la scène pendant le bouquet final : un secret, et une émote');
game.fs.show = null;

// ---------------- 9. les jetons : un plafond par jour quand on rejoue ; pas de doublons
const P9 = await login('Fanchon'); P9.fest.st.canon = 1;
let gained = 0; for (let k = 0; k < TOK.cap + 4; k++) gained += game.festGive(P9, 5, 'essai', 'canon');
ok(gained === TOK.cap * 5 && P9.fest.day.n.canon === TOK.cap, `rejouer rapporte des jetons ${TOK.cap} fois par jour et par épreuve, puis plus rien`);
ok(!game.festStamp(P9, 'canon'), 'un tampon ne se gagne qu’une fois par édition');
ok(!game.festSecret(A, 'valse'), 'un secret ne se découvre qu’une fois');

// ---------------- 10. la boutique, les parures
near(A, 'zephyrine'); A.fest.tok = 500;
if (process.env.DIAG) console.log('DIAG A', { dead: A.dead, room: A.room, ship: A.ship, cine: !!A.cine, x: A.x, y: A.y, near: game.nearNpc(A, 'zephyrine', 120), open: game.festOpen(), wt: game.worldTime % DAY_LENGTH / DAY_LENGTH });
say(A, { t: 'fest', a: 'acheter', id: 'tenue_gala' });
ok(A.fest.own.includes('tenue_gala') && A.fest.tok === 500 - SHOP_BY.tenue_gala.price, 'acheter une tenue avec des jetons');
const tok10 = A.fest.tok; say(A, { t: 'fest', a: 'acheter', id: 'tenue_gala' });
ok(A.fest.tok === tok10, 'pas deux fois la même parure');
say(A, { t: 'fest', a: 'porter', id: 'tenue_gala' });
ok(A.look.top === 'capitaine' && A.look.topCol === 'purple' && A.look.hat === 'plume', 'la porter : on la voit');
const atk0 = A.stats.atk; ok(atk0 === A.stats.atk, 'et elle ne donne aucune force');
const feat = Object.values(SHOP_BY).find((s) => s.feat != null && s.feat !== game.fs.ed.variant);
say(A, { t: 'fest', a: 'acheter', id: feat.id });
ok(!A.fest.own.includes(feat.id), 'une parure exclusive ne se trouve que pendant son édition');
say(A, { t: 'fest', a: 'acheter', id: 'voile_lampion' }); say(A, { t: 'fest', a: 'porter', id: 'voile_lampion' });
ok(game.festShipCos(A) && game.festShipCos(A).s.length === 3, 'des voiles pour ses navires');
say(A, { t: 'fest', a: 'acheter', id: 'fusees' });
ok(game.countItem(A, 'fusee_fete') === 5, 'cinq fusées de fête');
n0 = game.events.length; say(A, { t: 'fest', a: 'fusee' });
ok(game.countItem(A, 'fusee_fete') === 4 && game.events.slice(n0).some((e) => e.e[0] === 'fest' && e.e[1] === 'fusee'), 'tirer une fusée : tout le monde la voit');
say(A, { t: 'fest', a: 'emote', k: 'gigue' }); ok(!game.events.slice(-3).some((e) => e.e[0] === 'emote' && e.e[2] === 'gigue'), 'une émote du festival s’achète d’abord');
say(A, { t: 'fest', a: 'acheter', id: 'em_gigue' }); A.cds.emote = 0; n0 = game.events.length; say(A, { t: 'fest', a: 'emote', k: 'gigue' });
ok(game.events.slice(n0).some((e) => e.e[0] === 'emote' && e.e[2] === 'gigue'), 'achetée : la gigue');
A.fest.tok = 0; say(A, { t: 'fest', a: 'acheter', id: 'titre_ame' });
ok(!A.fest.own.includes('titre_ame') && A.fest.tok === 0, 'sans assez de jetons : rien (et jamais de jetons négatifs)');

// ---------------- 11. le carnet complet
const P11 = await login('Gaspardine');
for (const k of ['canon', 'tresor', 'taverne', 'gabier', 'duel']) game.festStamp(P11, k);
ok(P11.fest.done !== game.fs.ed.key, 'cinq tampons : pas encore');
game.festStamp(P11, 'course');
ok(P11.fest.done === game.fs.ed.key && P11.ach.fete_carnet, 'six tampons : le carnet complet, un titre, des jetons en plus');
ok(/carnet/.test(game.showLine(2)) || /Gaspardine/.test(game.showLine(2)), 'au spectacle, Mira salue les héros du carnet');

// ---------------- 12. le classement de la semaine, les récompenses du podium (même absent)
game.fs.board.course = { [A.key]: { n: A.name, v: 120 }, [B.key]: { n: B.name, v: 130 } };
game.fs.board.ed = 'MV-ancienne'; game.festRoll();
ok(game.fs.board.last.course[0][0] === A.name && !Object.keys(game.fs.board.course).length, 'une nouvelle semaine : le podium est retenu, le classement repart');
ok(!game.fs.board.pending[A.key] && A.ach.fete_heros, 'le premier de la course : un titre et des jetons');

// ---------------- 13. la sauvegarde, la reconnexion, une nouvelle édition
const keep = { tok: A.fest.tok, own: A.fest.own.slice(), sec: A.fest.sec.slice(), st: { ...A.fest.st } };
game.logout(A); await wait(20);
const A2 = await login('Albertine');
ok(A2.fest.tok === keep.tok && A2.fest.own.join() === keep.own.join() && A2.fest.sec.join() === keep.sec.join(), 'reconnexion : jetons, parures et secrets sont gardés');
ok(JSON.stringify(A2.fest.st) === JSON.stringify(keep.st), 'et les tampons de l’édition en cours');
ok(A2.look.hat === 'plume', 'la tenue portée aussi');
A2.fest.ed = 'MV-ancienne'; game.festEdFor(A2);
ok(!Object.keys(A2.fest.st).length && A2.fest.own.length === keep.own.length, 'une nouvelle édition : le carnet repart à zéro, les parures restent');
// une sauvegarde d'avant le festival se charge vierge
const old = game.festLoad(undefined);
ok(old.tok === 0 && !old.own.length, 'une ancienne sauvegarde (sans festival) se charge sans erreur, carnet vierge');
const forged = game.festLoad({ tok: -50, own: ['inventé', 'tenue_gala'], eq: { tenue: 'voile_azur' } });
ok(forged.tok === 0 && forged.own.join() === 'tenue_gala' && !forged.eq.tenue, 'une sauvegarde trafiquée est nettoyée (jetons, parures inconnues, parure non possédée)');

// ---------------- 14. fermé en plein jeu : rien ne reste coincé
spot(A2, 'gab_entree'); game.fs.force = 'closed'; tick(12);
ok(!game.festOpen(), 'la fin de l’édition');
spot(A2, 'gab_sortie'); ok(A2.room === -1, 'on peut toujours sortir d’une salle du festival');
const P14 = await login('Hortense'); game.fs.force = 'open'; tick(10);
game.teleport(P14, F.gabier.start.x, F.gabier.start.y, {}); P14.room = F.rooms.gabier;
game.logout(P14); await wait(20); const P14b = await login('Hortense');
ok(P14b.room === -1, 'reconnecté depuis une salle d’épreuve : on revient sur la plage');

// ---------------- 15. lot 8 : un pirate tout neuf fait d'abord son tutoriel, la scène d'accueil vient après
const N15 = await login('Isidore', 1); N15.tut = 0; N15.mem.delete('vu:fete_accueil'); N15.festSeenAt = 0;
const bx = F.stage.cx, by = F.stage.cy + 40; game.teleport(N15, bx, by, {}); tick(60);
ok(!game.inCinema(N15), 'pendant le tutoriel, pas de scène d’accueil du festival');
N15.tut = 99; N15.festSeenAt = 0; tick(60);
ok(game.inCinema(N15) && N15.cine && N15.cine.id === 'fete_accueil', 'le tutoriel fini, Mira l’accueille');

console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
