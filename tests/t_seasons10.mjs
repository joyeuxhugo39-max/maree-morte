// 1.0 : saisons — pêche (tailles, records, concours), Grand Tour de Libertalia, podium et récompenses, navires légendaires
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt } from '../shared/world.js';
import { raceCourse, fishScore, FISH_KG } from '../shared/data/seasons.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 11, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); };
const A = await login('Pecheur'), B = await login('Cavaliere');
// pêche
for (let k = 0; k < 30; k++) game.fishCaught(A, k % 2 ? 'bar' : 'sardine');
game.fishCaught(A, 'espadon');
ok(A.fishRec.espadon >= 30 && A.fishRec.bar >= 0.6, `tailles des prises (espadon ${A.fishRec.espadon} kg)`);
ok(game.season.fish.pecheur.s === fishScore(A.fishRec) && game.season.records.espadon[0] === 'Pecheur', 'concours de pêche et record de la saison');
game.fishCaught(B, 'poisson_or'); ok(B.ach.peche_legende, 'un poisson d’or : Pêche miraculeuse');
game.save(A); ok(store.get('pecheur').fishRec.espadon === A.fishRec.espadon, 'records personnels sauvegardés');
// le Grand Tour
const C = raceCourse(W); ok(C.length === 6, 'six portes autour de Libertalia');
B.level = 20; game.recalc(B); game.addItem(B, 'cheval', 1); B.eq.mount = 'cheval'; B.riding = true; game.recalc(B);
const pf = game.npcPos.get('palefrenier'); put(B, pf.x, pf.y + 14); game.raceStart(B);
ok(B.race && B.race.i === 0 && !B.race.t0, 'Tobias donne le départ : rejoindre la première porte');
put(B, C[0].x, C[0].y); game.raceCheck(B); ok(B.race.started && B.race.i === 1, 'première porte : le chrono tourne');
put(B, C[2].x, C[2].y); game.raceCheck(B); ok(B.race.i === 1, 'pas de raccourci : la porte 3 avant la 2 ne compte pas');
for (let k = 1; k < C.length; k++) { game.time += 20; put(B, C[k].x, C[k].y); game.raceCheck(B); }
ok(B.race && B.race.i === C.length, 'toutes les portes franchies');
game.time += 15; put(B, C[0].x, C[0].y); game.raceCheck(B);
ok(!B.race && game.season.race.cavaliere && game.season.race.cavaliere.t > 100 && B.ach.grand_tour, `arrivée : ${game.season.race.cavaliere.t} s, Cavalier du Grand Tour`);
game.raceStart(B); put(B, C[0].x, C[0].y); game.raceCheck(B); B.riding = false; game.raceCheck(B); ok(!B.race, 'pied à terre : course annulée');
// la saison change : le podium est récompensé, même absent
const gB = B.gold; game.season.key = '2000-01'; game.seasonRoll();
ok(B.gold === gB + 5000 + 3000 && game.countItem(B, 'tricorne_saison') === 1 && B.ach.champion_saison, 'fin de saison : Cavalière première de la course, deuxième à la pêche');
ok(A.gold >= 5000 && game.season.last.fish[0][0] === 'Pecheur', 'Pêcheur premier au concours de pêche');
ok(Object.keys(game.season.fish).length === 0 && game.season.key !== '2000-01', 'la nouvelle saison repart à zéro');
// navires légendaires
const cal = game.npcPos.get('charpentier_lib'); put(A, cal.x, cal.y + 14); A.gold = 100000;
game.buy(A, 'charpentier_lib', 'veuve_ecarlate'); ok(game.countItem(A, 'veuve_ecarlate') === 0, 'la Veuve Écarlate ne se vend qu’aux Héros de Libertalia');
A.rep.lib = 2000; game.buy(A, 'charpentier_lib', 'veuve_ecarlate'); ok(game.countItem(A, 'veuve_ecarlate') === 1 && game.hullMax('veuve_ecarlate') === 520, 'Héros de Libertalia : la Veuve Écarlate, 4 canons, coque 520');
game.buy(A, 'charpentier_lib', 'veuve_ecarlate'); ok(game.countItem(A, 'veuve_ecarlate') === 1, 'un objet unique ne s’achète qu’une fois');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
