// Lot 5 : Le Plus Grand Braquage de Port-Lanterne, joué par les vrais mécanismes du serveur.
// Chaque approche des préparatifs (et ses échecs), le groupe qui se répartit le travail, la demeure (uniforme,
// diversion, force) et ses conséquences, la trahison et son choix, la poursuite contre un Silas qui court vraiment
// (devancé ou pas), le combat (barricades, canons, barils, chaloupe), les trois fins et ce qu'elles changent,
// la route des Sept Courants, et la sauvegarde. (Le combat lui-même, seul et à trois, est mesuré dans t_boss30.)
import { Game } from '../server/game.js';
import { PROTOCOL, MAP_W } from '../shared/constants.js';
import { QUESTS, questState, npcVisible } from '../shared/data/quests.js';
import { NPCS } from '../shared/data/npcs.js';
import { CINEMAS } from '../shared/data/cinemas.js';
import { BR } from '../shared/data/braquage.js';
import { SAFE, canStand } from '../shared/world.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, H = W.heist, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name, level = 18) => {
  const c = { msgs: [], send(m) { this.msgs.push(m); if (this.msgs.length > 800) this.msgs.splice(0, 400); }, close() {} };
  game.addClient(c); game.onMessage(c, { t: 'login', v: PROTOCOL, name, pass: 'abcd' }); await wait(60);
  const p = game.sessions.get(c).player; p.c = c; p.level = level; game.recalc(p); p.hp = p.stats.maxHp; p.tut = 99; return p;
};
const say = (p, m) => game.onMessage(p.c, m);
const tick = (n) => { for (let i = 0; i < n; i++) game.tick(); };
const toasts = (p, n0) => p.c.msgs.slice(n0).filter((m) => m.t === 'toast').map((m) => m.msg).join(' | ');
const plays = (p, n0, id) => p.c.msgs.slice(n0).some((m) => m.t === 'cinema' && m.a === 'play' && m.id === id);
const goal = (p, q, act) => game.hGoal(p, q, act);
const S = (k, n = 0) => H.spots.filter((s) => s.k === k)[n];
const useSpot = (p, k, n = 0) => { const s = S(k, n); game.teleport(p, s.x, s.y, {}); p.cds.hspot = 0; say(p, { t: 'heist', a: 'spot', i: s.id }); return s; };
const door = (p, id) => { const d = W.doors[id]; game.teleport(p, d.ox, d.oy + 6, {}); p.cds.door = 0; say(p, { t: 'door', id }); };
const SB = W.rooms.findIndex((r) => r.name === 'La Sirène Borgne'), SBd = W.doors.find((d) => d.room === SB).id;
const near = (p, id, dx = 0, dy = 14) => { const n = game.npcPos.get(id); game.teleport(p, n.x + dx, n.y + dy, {}); };
const done = (p, q) => p.quests[q] && p.quests[q].s === 'done';
const accept = async (p, adv = false) => { door(p, SBd); say(p, { t: 'cinema', a: 'done', id: 'silas_rencontre' }); say(p, { t: 'mem', k: adv ? 'silas_avance' : 'silas_oui' }); };

// ---------------- 0. la quête dans les données
ok(['br_preparatifs', 'br_casse', 'br_poursuite', 'br_silas', 'br_fin_garder', 'br_fin_denoncer', 'br_fin_complice'].every((q) => QUESTS[q]), 'sept étapes, dont trois fins exclusives');
ok(['br_reception', 'br_trahison', 'br_fuite', 'br_boss', 'br_conclusion'].every((c) => CINEMAS[c]) && CINEMAS.silas_rencontre && CINEMAS.silas_preparation, 'sept scènes : rencontre, préparation, réception, trahison, poursuite, boss, conclusion');
ok(!npcVisible(NPCS.silas, {}, 16) && npcVisible(NPCS.silas, {}, 17), 'Silas paraît au niveau 17 (quête de niveau 18 à 19)');

// ---------------- 1. la proposition : oui, ou oui contre une avance
const A = await login('Albane'), B = await login('Basile');
let g0 = A.gold; await accept(A, true);
ok(A.quests.br_preparatifs && A.quests.br_preparatifs.s === 'active' && A.gold === g0 + BR.advance && A.heist.adv, `« Sans moi », puis l’avance : préparatifs lancés, ${BR.advance} doublons d’avance`);
g0 = B.gold; await accept(B, false);
ok(B.quests.br_preparatifs && B.gold === g0 && !B.heist.adv, '« J’en suis » : préparatifs lancés, sans avance');
const low = await login('Cadet', 16); door(low, SBd); say(low, { t: 'mem', k: 'silas_oui' });
ok(!low.quests.br_preparatifs, 'trop jeune (niveau 16) : rien ne se lance');

// ---------------- 2. A. les uniformes : repéré, assommer, se battre, ou passer sans bruit
const ent = H.doors.entrepot, guardsE = () => game.hs.guards.filter((m) => m.hg.room === 'entrepot');
door(A, ent); ok(W.rooms[A.room].name === 'Entrepôt de la Douane', 'l’entrepôt de la Douane, sur les quais');
{ const g = guardsE()[2]; g.dir = 1; game.teleport(A, g.x - 44, g.y, {}); const n0 = A.c.msgs.length; tick(50);
  ok(A.heist.alarmA === 1 && guardsE().every((m) => m.hg.alert) && /Repéré/.test(toasts(A, n0)), 'dans la lumière d’une lanterne, le soupçon monte : repéré, alarme, toute la Douane en alerte');
  const hp0 = A.hp; for (let k = 0; k < 20 * 6; k++) { game.tick(); if (A.hp < hp0) break; } ok(A.hp < hp0, 'les douaniers en alerte se battent vraiment'); A.hp = A.stats.maxHp; }
door(A, ent); // on ressort, on attend que l'entrepôt se calme
game.teleport(A, W.doors[ent].ox, W.doors[ent].oy + 8, {}); tick(20 * 3);
ok(guardsE().every((m) => !m.hg.alert), 'l’entrepôt vide se calme');
door(A, ent); tick(4);
{ const g = guardsE()[0]; g.dir = 2; game.teleport(A, g.x - 14, g.y, {}); A.cds.slash = 0; const n0 = A.c.msgs.length; say(A, { t: 'atk', a: 0 }); tick(2);
  ok(g.hg.koUntil > game.time && !g.hg.alert && /Assommé/.test(toasts(A, n0)), 'par derrière, sans être vu : assommé, sans un bruit'); }
{ const g = guardsE()[1]; g.hg.koUntil = 0; g.hg.alert = false; g.dir = 1; game.teleport(A, g.x - 14, g.y, {}); A.cds.slash = 0; say(A, { t: 'atk', a: 0 }); tick(2);
  ok(g.hg.alert, 'de face : la bagarre, et l’alerte'); }
useSpot(A, 'uniformes');
ok(game.countItem(A, 'uniforme_garde') === 2 && goal(A, 'br_preparatifs', 'br_uniformes'), 'le coffre de la Douane : deux uniformes (même repéré, la quête avance)');
// B passe sans être vu : la ronde regarde ailleurs, le factionnaire aussi
for (const g of guardsE()) { g.hg.koUntil = game.time + 60; }
door(B, ent); useSpot(B, 'uniformes');
ok(goal(B, 'br_preparatifs', 'br_uniformes') && !B.heist.alarmA && B.heist.gotU, 'sans être vu : les uniformes, et Silas l’appréciera (confiance)');
for (const g of guardsE()) g.hg.koUntil = 0;

// ---------------- 3. B. le plan : soudoyer, rendre service, voler (et se faire prendre)
near(A, 'lafleur'); A.gold = 2000; say(A, { t: 'heist', a: 'lafleur', c: 'bribe' });
ok(goal(A, 'br_preparatifs', 'br_plan') && A.gold === 2000 - BR.bribe, `soudoyer Lafleur : ${BR.bribe} doublons`);
near(B, 'lafleur'); say(B, { t: 'heist', a: 'lafleur', c: 'favor' });
ok(B.heist.favor === 1, 'rendre service : vider sa cave des crabes d’égout');
useSpot(B, 'trappe'); tick(2);
const crabs = game.hs.crabs.filter((m) => m.state !== 'dead');
ok(W.rooms[B.room].name === 'Cave de l’atelier' && crabs.length === 6, 'la trappe mène à la cave : six crabes');
for (const m of crabs) { m.tags.set(B.id, 1); game.damageMob(m, 9999, B, false); }
ok(B.heist.crabs >= 6, 'les six crabes tués comptent pour celui qui rend le service');
useSpot(B, 'echelle'); near(B, 'lafleur'); say(B, { t: 'heist', a: 'lafleur', c: 'favor_done' });
ok(goal(B, 'br_preparatifs', 'br_plan'), 'service rendu : le plan');
const Cv = await login('Clothilde'); await accept(Cv);
game.giveOrDrop(Cv, 'crochets', 3);
const atel = W.doors.find((d) => d.room === H.rooms.atelier);
door(Cv, atel.id);
game.hs.look.until = 0; game.hs.look.log = []; game.hs.look.next = game.time + 30;
useSpot(Cv, 'bureau'); ok(Cv.c.msgs.some((m) => m.t === 'heist' && m.a === 'desk' && m.ok === 1), 'le bureau : le serveur ouvre le crochetage (crochets en poche)');
say(Cv, { t: 'heist', a: 'desk', s: 'start' }); tick(40); say(Cv, { t: 'heist', a: 'desk', s: 'end', ok: 1 });
ok(goal(Cv, 'br_preparatifs', 'br_plan') && Cv.heist.vol === 1, 'voler le plan quand l’architecte a le dos tourné');
const Dv = await login('Désiré'); await accept(Dv); game.giveOrDrop(Dv, 'crochets', 2); door(Dv, atel.id);
useSpot(Dv, 'bureau'); say(Dv, { t: 'heist', a: 'desk', s: 'start' }); game.hs.look.until = game.time + 2; game.hs.look.log.push([game.time, game.time + 2]); tick(20); say(Dv, { t: 'heist', a: 'desk', s: 'end', ok: 1 });
ok(!goal(Dv, 'br_preparatifs', 'br_plan') && Dv.heist.caught && Dv.room === -1, 'il s’est retourné pendant qu’on crochetait : pris, jeté dehors');
near(Dv, 'lafleur'); Dv.gold = 2000; say(Dv, { t: 'heist', a: 'lafleur', c: 'bribe' });
ok(goal(Dv, 'br_preparatifs', 'br_plan') && Dv.gold === 2000 - BR.bribeCaught, `pris la main dans le tiroir : il faut payer le double (${BR.bribeCaught})`);

// ---------------- 4. C. la clé : provoquer, les dés, la triche, la poche
near(A, 'brechet', 18, 4); say(A, { t: 'heist', a: 'brechet', c: 'provoke' });
ok(game.hs.away > game.time && A.c.msgs.some((m) => m.t === 'heist' && m.a === 'state' && m.away === 1), 'provoquer Bréchet : il quitte la table, furieux');
useSpot(A, 'manteau'); ok(goal(A, 'br_preparatifs', 'br_cle'), 'son manteau est resté sur la chaise : la clé');
game.hs.away = game.time - 1; tick(12);
ok(!game.hs.away, 'deux minutes plus tard, il revient');
// les dés, honnêtes : on joue jusqu'à gagner
near(B, 'brechet', 18, 4); B.gold = 5000; let won = false, matches = 0;
for (let k = 0; k < 40 && !won; k++) { say(B, { t: 'heist', a: 'brechet', c: 'play' }); matches++; for (let r = 0; r < 8 && game.hs.matches.has(B.id); r++) say(B, { t: 'heist', a: 'brechet', c: 'roll' }); won = goal(B, 'br_preparatifs', 'br_cle'); }
ok(won, `gagner aux dés (deux manches sur trois) : il paie avec sa clé (${matches} partie(s))`);
// la triche
near(Cv, 'brechet', 18, 4); Cv.gold = 5000; game.giveOrDrop(Cv, 'des_pipes', 1); let cheats = 0, caught = 0;
for (let k = 0; k < 40 && !goal(Cv, 'br_preparatifs', 'br_cle'); k++) { Cv.heist.ban = 0; say(Cv, { t: 'heist', a: 'brechet', c: 'play' }); for (let r = 0; r < 8 && game.hs.matches.has(Cv.id); r++) { say(Cv, { t: 'heist', a: 'brechet', c: 'cheat' }); cheats++; if (Cv.heist.ban > game.time) caught++; } }
ok(goal(Cv, 'br_preparatifs', 'br_cle'), `tricher avec des dés pipés : ça marche… (${cheats} lancers, pris ${caught} fois)`);
// la poche
near(Dv, 'brechet', 18, 4); Dv.gold = 500; say(Dv, { t: 'heist', a: 'brechet', c: 'play' }); say(Dv, { t: 'heist', a: 'brechet', c: 'pocket' }); say(Dv, { t: 'heist', a: 'brechet', c: 'pocket_end', ok: 0 });
ok(!goal(Dv, 'br_preparatifs', 'br_cle') && Dv.heist.ban > game.time, 'la main dans sa poche, ratée : « Bas les pattes ! », il ne joue plus pendant une minute');
Dv.heist.ban = 0; say(Dv, { t: 'heist', a: 'brechet', c: 'play' }); say(Dv, { t: 'heist', a: 'brechet', c: 'pocket' }); say(Dv, { t: 'heist', a: 'brechet', c: 'pocket_end', ok: 1 });
ok(goal(Dv, 'br_preparatifs', 'br_cle'), 'une main légère pendant qu’il compte : la clé');

// ---------------- 5. en groupe, on se répartit les préparatifs
const E = await login('Edmée'), F = await login('Fulbert');
await accept(E); await accept(F);
say(E, { t: 'soc', a: 'invite', name: 'Fulbert' }); say(F, { t: 'soc', a: 'accept', name: 'Edmée' });
for (const g of guardsE()) g.hg.koUntil = game.time + 60;
door(E, ent); useSpot(E, 'uniformes');
near(F, 'lafleur'); F.gold = 1000; say(F, { t: 'heist', a: 'lafleur', c: 'bribe' });
near(F, 'brechet', 18, 4); say(F, { t: 'heist', a: 'brechet', c: 'provoke' }); useSpot(F, 'manteau'); game.hs.away = 0;
ok(['br_uniformes', 'br_plan', 'br_cle'].every((a) => goal(E, 'br_preparatifs', a) && goal(F, 'br_preparatifs', a)), 'Edmée vole les uniformes, Fulbert le plan et la clé : les trois comptent pour les deux');
for (const g of guardsE()) g.hg.koUntil = 0;

// ---------------- 6. la préparation, puis la demeure
near(A, 'silas', -20, 16); let n0 = A.c.msgs.length; say(A, { t: 'qt', q: 'br_preparatifs' });
ok(done(A, 'br_preparatifs') && A.quests.br_casse && A.quests.br_casse.s === 'active' && plays(A, n0, 'silas_preparation'), 'de retour chez Silas : la scène de la préparation, et le casse commence');
say(A, { t: 'cinema', a: 'done', id: 'silas_preparation' });
for (const p of [B, E, F]) { near(p, 'silas', -20, 16); say(p, { t: 'qt', q: 'br_preparatifs' }); say(p, { t: 'cinema', a: 'done', id: 'silas_preparation' }); }
const DV = H.doors.demeure;
n0 = A.c.msgs.length; door(A, DV); tick(12);
ok(W.rooms[A.room].name === 'Demeure d’Octave Valdorne' && goal(A, 'br_casse', 'br_entree') && plays(A, n0, 'br_reception'), 'la demeure de Valdorne : la scène de la réception');
say(A, { t: 'cinema', a: 'done', id: 'br_reception' });
// sans uniforme, dans la galerie : reconduit au salon, trois fois, puis l'alerte
const post = game.hs.guards.find((m) => m.hg.room === 'demeure' && m.hg.post);
const inGallery = (p) => { post.dir = 2; post.hg.look = null; post.hg.dir = 2; game.teleport(p, post.x + 40, post.y, {}); };
for (let k = 1; k <= 2; k++) { inGallery(A); tick(40); }
ok(A.heist.warn === 2 && A.x < H.gallery.x0, 'repéré dans la galerie : « Halte ! Les invités restent au salon. » — reconduit, deux fois');
inGallery(A); tick(40);
ok(A.heist.method === 'force' && game.hs.guards.filter((m) => m.hg.room === 'demeure').every((m) => m.hg.alert || m.state === 'dead'), 'la troisième fois : l’alerte — ce sera la manière forte');
game.teleport(A, H.hallBack.x, H.hallBack.y, {}); for (const m of game.hs.guards) if (m.hg.room === 'demeure') game.heistCalm(m); // A retourne au salon
// l'uniforme : personne ne regarde un garde
door(B, DV); tick(12); say(B, { t: 'cinema', a: 'done', id: 'br_reception' });
useSpot(B, 'vestiaire');
ok(B.heist.disguise && B.look.hat === 'morion' && B.look.topCol === 'navy', 'au vestiaire, l’uniforme de la garde (il se voit)');
inGallery(B); tick(40);
ok(!B.heist.warn, 'en uniforme, la galerie ne vous voit pas');
game.teleport(B, H.archDoorIn.x + 16, H.archDoorIn.y, {}); tick(12);
ok(goal(B, 'br_casse', 'br_archives') && B.heist.method === 'infiltration', 'les archives, en uniforme : infiltration');
// la diversion du capitaine Ferrant
door(E, DV); tick(12); say(E, { t: 'cinema', a: 'done', id: 'br_reception' });
near(E, 'ferrant', 18, 4); say(E, { t: 'heist', a: 'ferrant' });
ok(game.hs.guards.filter((m) => m.hg.room === 'demeure' && (m.hg.post || m.hg.hall)).every((m) => m.hg.distractUntil > game.time), 'la bagarre au salon : les gardes en faction accourent');
game.teleport(E, H.archDoorIn.x + 16, H.archDoorIn.y, {}); tick(12);
ok(goal(E, 'br_casse', 'br_archives') && E.heist.method === 'manipulation', 'pendant la bagarre, les archives : manipulation');
game.teleport(A, H.archDoorIn.x + 16, H.archDoorIn.y, {}); tick(12);
ok(goal(A, 'br_casse', 'br_archives') && A.heist.method === 'force', 'par la force : les archives aussi');

// ---------------- 7. la trahison et le choix
const arch = (p) => { game.teleport(p, S('coffre').x, S('coffre').y, {}); p.cds.hspot = 0; };
arch(A); A.heist.hasMap = 0; const keyA = game.countItem(A, 'cle_comptable'); game.removeItem(A, 'cle_comptable', keyA);
say(A, { t: 'heist', a: 'spot', i: S('coffre').id });
ok(!A.heistRun, 'sans la clé du comptable, le coffre reste fermé');
game.giveOrDrop(A, 'cle_comptable', 1); A.cds.hspot = 0;
n0 = A.c.msgs.length; say(A, { t: 'heist', a: 'spot', i: S('coffre').id });
ok(plays(A, n0, 'br_trahison') && game.hs.locked > game.time && H.gates.archives.every((i) => W.block[i]), 'le coffre : la scène de la trahison, et la porte des archives verrouillée');
say(A, { t: 'heist', a: 'choix', c: 'carte' });
ok(A.heist.choice === 'carte' && A.heist.hasMap && done(A, 'br_casse') && A.quests.br_poursuite.s === 'active' && plays(A, n0, 'br_fuite'), 'choix : récupérer la carte — puis la scène de La Mouche d’Or, et la poursuite');
say(A, { t: 'cinema', a: 'done', id: 'br_trahison' }); say(A, { t: 'cinema', a: 'done', id: 'br_fuite' });

// ---------------- 8. la poursuite : Silas court pour de vrai
const run = A.heistRun;
useSpot(A, 'fenetre'); ok(W.rooms[A.room].name === 'Les toits de Port-Lanterne', 'par la fenêtre, sur les toits');
const x0 = A.x; useSpot(A, 'saut', 0); ok(A.x > x0 + 48 && W.rooms[A.room].name === 'Les toits de Port-Lanterne', 'sauter par-dessus une ruelle');
tick(20 * 12); ok(run.mob && run.mob.x > H.silasStart.x + 40, 'Silas court sur les toits, saute les ruelles (parti avec 11 s d’avance : on a pris la carte)');
let guard = 0; for (let k = 0; k < 20 * 60 && !run.silasAboard; k++) game.tick();
ok(run.silasAboard, `Silas atteint La Mouche d’Or au bout de ${Math.round(game.time - run.t0)} s`);
useSpot(A, 'descente', 0);
ok(goal(A, 'br_poursuite', 'br_quais') && !run.devance, 'arrivé après lui : son équipage sera prêt');
void guard;
useSpot(A, 'passerelle'); tick(10);
const boss = game.hs.boss;
ok(done(A, 'br_poursuite') && A.quests.br_silas.s === 'active' && boss && game.hs.adds.filter((a) => a.state !== 'dead').length === 2, 'à bord : Silas et deux hommes de main déjà prêts');
// une autre course, devancée : B choisit de poursuivre tout de suite, et file
const C2 = await login('Corentin'); C2.heist = game.heistLoad({});
game.hs.locked = 0; for (const i of H.gates.archives) W.block[i] = 0;
arch(B); n0 = B.c.msgs.length; say(B, { t: 'heist', a: 'spot', i: S('coffre').id }); say(B, { t: 'heist', a: 'choix', c: 'poursuivre' });
const runB = B.heistRun; say(B, { t: 'cinema', a: 'done', id: 'br_trahison' }); say(B, { t: 'cinema', a: 'done', id: 'br_fuite' });
useSpot(B, 'fenetre'); tick(20 * 2); useSpot(B, 'descente', 1);
ok(runB.devance && B.heist.devance, 'par les ruelles, avant lui : devancé — son équipage n’est pas prêt');

// ---------------- 9. le combat : phases, barricades, canons, barils, chaloupe
say(A, { t: 'cinema', a: 'done', id: 'br_boss' });
boss.pauseUntil = 0; A.stats.maxHp = 1e8; A.hp = 1e8;
const seen = new Set(); let cannon = false, cutStop = false;
for (let k = 0; k < 20 * 400 && boss.state !== 'dead'; k++) {
  if (boss.phase >= 1) seen.add('phase1'); if (boss.phase >= 2) seen.add('phase2'); if (game.hs.bars[0]) seen.add('barricades'); if (boss.flee) seen.add('fuite'); if (boss.cut) seen.add('amarres');
  if (game.teles.some((t) => t.src === boss && Math.hypot(t.x - H.kegs[0].x, t.y - H.kegs[0].y) < 60 || H.kegs.some((q) => Math.hypot(t.x - q.x, t.y - q.y) < 8))) seen.add('barils');
  if (game.hs.bars[0] && !cannon) { const s = S('canon', 0); game.teleport(A, s.x, s.y, {}); A.cds.hspot = 0; say(A, { t: 'heist', a: 'spot', i: s.id }); cannon = !game.hs.bars[0]; }
  if (boss.cut && !cutStop) { const hp0 = boss.hp; game.teleport(A, boss.x - 14, boss.y, {}); for (let j = 0; j < 6 && boss.cut; j++) game.damageMob(boss, boss.maxHp * 0.02, A, false); cutStop = !boss.cut && boss.hp < hp0; }
  if (k % 10 === 0 && boss.pauseUntil < game.time && !boss.cut) { game.teleport(A, boss.x - 16, boss.y, {}); A.hp = 1e8; game.damageMob(boss, 60, A, false); }
  if (process.env.DIAG && k % 200 === 0) console.log('  t', Math.round(game.time), 'ph', boss.phase, 'hp', Math.round(boss.hp), boss.state, 'pause', Math.round(boss.pauseUntil - game.time), 'dash', !!boss.dash, 'tgt', boss.target === A.id, 'cine', !!A.cine);
  game.tick();
}
if (process.env.DIAG) console.log('combat', Math.round(game.time), boss.phase, boss.hp, [...seen]);
ok(boss.state === 'dead', 'Silas est vaincu');
ok(['phase1', 'phase2', 'barricades', 'barils', 'fuite'].every((k) => seen.has(k)), `toutes ses ruses sont jouées : ${[...seen].join(', ')}`);
ok(cannon, 'un coup de canon fait voler une barricade en éclats');
ok(!seen.has('amarres') || cutStop, 'il tranche les amarres de la chaloupe : on l’en empêche en le frappant');
ok(done(A, 'br_silas') && A.c.msgs.some((m) => m.t === 'cinema' && m.id === 'br_conclusion'), 'la scène du vrai choix');
const conc = A.c.msgs.filter((m) => m.t === 'cinema' && m.id === 'br_conclusion').pop();
ok(conc.opts && conc.opts.c === 0 && game.heistTrust(A) < BR.trustC, `manière forte, avance prise… Silas ne propose pas d’alliance (confiance ${game.heistTrust(A)})`);
say(A, { t: 'cinema', a: 'done', id: 'br_conclusion' });

// ---------------- 10. les fins
say(A, { t: 'heist', a: 'fin', c: 'complice' });
ok(!A.heist.ended, 'faire équipe : refusé sans sa confiance');
g0 = A.gold; say(A, { t: 'heist', a: 'fin', c: 'garder' });
ok(done(A, 'br_fin_garder') && A.gold >= g0 + 2500 && A.ach.casse_siecle && game.countItem(A, 'carte_sept_courants') === 1 && game.countItem(A, 'liste_valdorne') === 1, 'tout garder : doublons, titre « Le Casse du Siècle », la carte (une seule) et la liste');
ok(!npcVisible(NPCS.silas, A.quests, A.level), 'Silas a disparu de la Sirène Borgne');
say(A, { t: 'heist', a: 'fin', c: 'denoncer' }); ok(!A.quests.br_fin_denoncer, 'un seul choix possible');
// la dénonciation : on rend les documents à Valdorne
const mk = (p) => { for (const q of ['br_preparatifs', 'br_casse', 'br_poursuite', 'br_silas']) p.quests[q] = { s: 'done', p: [] }; };
const G1 = await login('Gaspardine'); mk(G1); G1.heist.choice = 'poursuivre'; G1.heist.method = 'manipulation';
const rep0 = { port: G1.rep.port || 0, lib: G1.rep.lib || 0, rade: G1.rep.rade || 0 };
say(G1, { t: 'heist', a: 'fin', c: 'denoncer' });
ok(G1.quests.br_fin_denoncer.s === 'active', 'dénoncer Silas : il faut porter les documents à Valdorne');
game.teleport(G1, W.doors[DV].ix, W.doors[DV].iy, {}); near(G1, 'valdorne'); say(G1, { t: 'talk', npc: 'valdorne' }); say(G1, { t: 'qt', q: 'br_fin_denoncer' });
ok(done(G1, 'br_fin_denoncer') && game.countItem(G1, 'rapiere_valdorne') === 1, 'Valdorne paie : la rapière de Valdorne');
ok((G1.rep.port || 0) > rep0.port && (G1.rep.lib || 0) < rep0.lib && (G1.rep.rade || 0) < rep0.rade && G1.mem.has('br_denonce'), 'estime des marchands de Port-Lanterne ; les pirates de Libertalia et de la Rade s’en souviennent');
ok(npcVisible(NPCS.silas_geole, G1.quests, G1.level) && !npcVisible(NPCS.silas, G1.quests, G1.level), 'Silas finit à la Geôle');
// les pirates de la liste deviennent des ennemis : hors des zones sûres, ils vous tendent des embuscades
{
  let spot = null;
  for (let ty = 40; ty < 300 && !spot; ty += 3) for (let tx = 40; tx < 300 && !spot; tx += 3) { const i = ty * MAP_W + tx, x = tx * 16 + 8, y = ty * 16 + 10; if (!SAFE.has(W.zones[i]) && W.roomGrid[i] < 0 && W.zones[i] !== 0 && canStand(W, x, y) && canStand(W, x + 120, y, true) && canStand(W, x - 120, y, true) && canStand(W, x, y + 100, true) && canStand(W, x, y - 100, true)) spot = { x, y }; }
  game.teleport(G1, spot.x, spot.y, {}); G1.cine = null; tick(2);
  G1.heist.vengeAt = game.time - 1; for (const m of game.mobs) if (m.type !== 'vengeur_liste' && Math.hypot(m.x - spot.x, m.y - spot.y) < 400) m.state = 'dead';
  const hp0 = G1.hp; tick(12);
  const V = game.mobs.filter((m) => m.type === 'vengeur_liste' && m.state !== 'dead' && m.vengeFor === G1.id);
  ok(V.length >= 2 && V.every((m) => m.target === G1.id), `dénoncé : ${V.length} capitaines de la liste tombent sur ${G1.name} hors des zones sûres`);
  tick(60); ok(G1.hp < hp0 || G1.dead, 'et ils frappent pour de bon');
  G1.hp = G1.stats.maxHp; G1.dead = false;
  ok(G1.heist.vengeAt > game.time + 800, 'la suivante, pas avant un quart d’heure');
  game.teleport(G1, W.doors[DV].ix, W.doors[DV].iy, {}); tick(12);
  ok(V.every((m) => m.state === 'dead') && !game.mobs.some((m) => m.type === 'vengeur_liste' && m.state !== 'dead'), 'la cible à l’abri : ils repartent (aucun reste dans le monde)');
}
// la complicité : il faut sa confiance
const H1 = await login('Hortense'); mk(H1); H1.heist.gotU = 1; H1.heist.method = 'infiltration'; H1.heist.choice = 'poursuivre';
ok(game.heistTrust(H1) >= BR.trustC, `discret de bout en bout : la confiance de Silas (${game.heistTrust(H1)})`);
g0 = H1.gold; say(H1, { t: 'heist', a: 'fin', c: 'complice' });
ok(done(H1, 'br_fin_complice') && H1.ach.complice_virevent && H1.mem.has('br_route') && H1.gold >= g0 + 1500, 'faire équipe : le partage, le titre « Complice de Virevent », la route des Sept Courants');
const I1 = await login('Isidore'); mk(I1); I1.heist.gotU = 1; I1.heist.method = 'infiltration'; I1.heist.choice = 'detruire';
ok(game.heistTrust(I1) < BR.trustC, 'détruire son registre : Silas ne le pardonne pas');

// ---------------- 11. la route des Sept Courants et la contrebande
const S7 = H.sept, ring = (S7.r0 + S7.r1) / 2;
const o = { x: S7.cx + ring, y: S7.cy, vx: 0, vy: 0 };
ok(game.heistCurrent(o, 0.1, [I1]) && o.vx > 0, 'sans la route, les courants repoussent le navire');
const o2 = { x: S7.cx + ring, y: S7.cy, vx: 0, vy: 0 };
ok(!game.heistCurrent(o2, 0.1, [H1]) && o2.vx === 0, 'avec la route, on passe');
ok(W.zones[Math.floor(S7.cy / 16) * W.W + Math.floor(S7.cx / 16)] === 33 && !W.islands.some((i) => S7.cx / 16 >= i.x0 && S7.cx / 16 <= i.x1 && S7.cy / 16 >= i.y0 && S7.cy / 16 <= i.y1), 'l’île aux Sept Courants : sur aucune carte (hors du relevé des îles)');
near(H1, 'silas'); H1.gold = 2000; say(H1, { t: 'heist', a: 'caisses', n: 9 });
ok(game.countItem(H1, 'caisse_contrebande') === BR.crates && H1.gold === 2000 - BR.crates * BR.crateBuy, `Silas vend ses caisses : ${BR.crates} par jour, ${BR.crateBuy} doublons pièce`);
say(H1, { t: 'heist', a: 'caisses', n: 1 }); ok(game.countItem(H1, 'caisse_contrebande') === BR.crates, 'pas une de plus aujourd’hui');
near(H1, 'corail'); g0 = H1.gold; say(H1, { t: 'heist', a: 'livrer' });
ok(H1.gold === g0 + BR.crates * BR.crateSell && !game.countItem(H1, 'caisse_contrebande'), `Madame Corail les paie ${BR.crateSell} doublons pièce`);

// ---------------- 12. la sauvegarde
game.logout(H1); await wait(20);
const H2 = await login('Hortense');
ok(H2.mem.has('br_route') && H2.heist.ended === 'complice' && H2.heist.method === 'infiltration' && done(H2, 'br_fin_complice'), 'reconnexion : la route, le choix, la manière, tout est gardé');
ok(questState('br_preparatifs', H2.quests, H2.level) === 'done', 'et la quête reste faite');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK');
process.exit(0);
