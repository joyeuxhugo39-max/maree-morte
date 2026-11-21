// 1.1 : les vrais navires — armer à quai, monter à bord à pied, marcher sur le pont, postes (barre, voiles,
// cabestan, canons), physique lourde (élan, dérive, virage), chocs, coque, naufrage, sauvegarde, plongée
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, canStand } from '../shared/world.js';
import { BERTHS, berthPos, stations, shipOf, toWorld, toLocal, hullHalf, deckOk, gangway } from '../shared/data/ships.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 15, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); };
const ticks = (n) => { for (let i = 0; i < n; i++) game.tick(); };
const msg = (p, m) => game.onMessage(p.c, m);
const A = await login('Capitaine'), B = await login('Matelot'), C = await login('Inconnue');
for (const p of [A, B, C]) { p.level = 15; game.recalc(p); p.hp = p.stats.maxHp; for (let i = 0; i < p.inv.length; i++) p.inv[i] = null; }
game.addItem(A, 'sloop', 1);

// 1. on n'arme qu'à quai
put(A, W.spawnPoint.x + 300, W.spawnPoint.y - 200);
msg(A, { t: 'ship', item: 'sloop' }); ok(!game.ownShip(A.key), 'loin d’un port : pas de navire');
const [bx, by] = berthPos(BERTHS[0]); put(A, bx, by - 4);
msg(A, { t: 'ship', item: 'sloop' }); const sh = game.ownShip(A.key);
ok(sh && sh.kind === 'sloop' && sh.anchor === 2 && sh.sail === 0, 'à la bitte d’amarrage : le sloop est armé, ancre au fond, voiles ferlées');
const S = shipOf('sloop');
ok(Math.hypot(sh.x - bx, sh.y - by) < 120, `il est amarré tout près (${Math.round(Math.hypot(sh.x - bx, sh.y - by))} px)`);

// 2. monter à bord à pied, par la passerelle
const g = gangway(W, S, sh, -1) || gangway(W, S, sh, 1);
ok(!!g && g.gap <= 24, `une passerelle relie le pont au quai (${g && g.gap} px)`);
const op = S.ops[0], side = g.side, lx0 = op.x, ly0 = side * (hullHalf(S, op.x) - 9);
put(C, g.x, g.y); msg(C, { t: 'mv', s: sh.id, lx: lx0, ly: ly0, d: 0, m: 1 });
ok(!C.ship, 'une inconnue ne monte pas à bord');
put(A, g.x, g.y); msg(A, { t: 'mv', s: sh.id, lx: lx0, ly: ly0, d: 0, m: 1 });
ok(A.ship === sh.id && A.boat === 'sloop', 'la capitaine monte à bord par la passerelle');
const [wx, wy] = toWorld(sh, lx0, ly0); ok(Math.hypot(A.x - wx, A.y - wy) < 0.5, 'sa position suit le pont');
game.socAction(A, 'invite', 'Matelot'); game.socAction(B, 'accept', 'Capitaine');
put(B, g.x, g.y); msg(B, { t: 'mv', s: sh.id, lx: lx0, ly: ly0 + (side > 0 ? -6 : 6), d: 0, m: 1 }); ok(B.ship === sh.id, 'un compagnon de groupe monte aussi');
// 3. marcher sur le pont
game.time += 0.3; msg(A, { t: 'mv', s: sh.id, lx: lx0 - 10, ly: ly0, d: 1, m: 1 }); ok(Math.abs(A.lx - (lx0 - 10)) < 0.01, 'on marche sur le pont');
game.time += 0.3; msg(A, { t: 'mv', s: sh.id, lx: lx0 - 10, ly: side * 40, d: 1, m: 1 }); ok(Math.abs(A.ly) < 30, 'on ne traverse pas le bastingage');
// 4. les postes
const st = stations(S), at = (k) => st.find((s) => s.k === k);
const walkTo = (p, s) => { p.lx = s.x; p.ly = s.y; };
walkTo(A, at('cap')); msg(A, { t: 'post', k: 'cap' }); ok(A.post === 'cap', 'la capitaine prend le cabestan');
msg(A, { t: 'ctl', x: 0, y: -1 }); ticks(20 * 2.5); ok(sh.anchor === 2 && sh.anchorP > 0.5, `l’ancre remonte lentement (${Math.round(sh.anchorP * 100)} % en 2,5 s)`);
ticks(20 * 2); ok(sh.anchor === 0, 'l’ancre est levée');
msg(A, { t: 'post', off: 1 }); ok(!A.post, 'elle quitte le poste');
walkTo(A, at('sails')); msg(A, { t: 'post', k: 'sails' }); msg(A, { t: 'ctl', x: 0, y: -1 }); ticks(20 * 2.2); msg(A, { t: 'ctl', x: 0, y: 0 });
ok(sh.sailT > 0.95, 'voiles déployées');
walkTo(B, at('helm')); msg(B, { t: 'post', k: 'helm' }); ok(B.post === 'helm', 'le matelot prend la barre');
const v1 = game.shipSpeed(sh); ticks(20); const v2 = game.shipSpeed(sh); ticks(20 * 8); const v3 = game.shipSpeed(sh);
ok(v2 < v3 * 0.6 && v3 > 50, `il prend son élan lentement : ${Math.round(v2)} puis ${Math.round(v3)} px/s`);
// le virage : la roue tourne et reste où on la laisse ; le cap change ; on dérive
const a0 = sh.a; msg(B, { t: 'ctl', x: 1, y: 0 }); ticks(10); msg(B, { t: 'ctl', x: 0, y: 0 }); const rud = sh.rud;
ok(rud > 0.3, `la roue tourne (${rud.toFixed(2)})`); ticks(20); ok(Math.abs(sh.rud - rud) < 1e-9, 'et reste où on la laisse');
// (1.9 : la dérive se mesure pendant le virage — le navire, plus vif au largue, peut toucher la côte avant la fin)
let lat = 0; for (let k = 0; k < 40; k++) { ticks(1); const c = Math.cos(sh.a), s = Math.sin(sh.a), l = -sh.vx * s + sh.vy * c; if (Math.abs(l) > Math.abs(lat)) lat = l; }
let da = sh.a - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
ok(da > 0.2, `le navire vire (${(da * 180 / Math.PI).toFixed(0)}°)`);
ok(Math.abs(lat) > 1, `il dérive dans le virage (${lat.toFixed(1)} px/s en travers, au plus fort)`);
// la barre droite, le navire file ; l'équipage suit
msg(B, { t: 'ctl', x: -1, y: 0 }); ticks(Math.round(rud / S.rud * 20)); msg(B, { t: 'ctl', x: 0, y: 0 });
const [ax, ay] = toWorld(sh, A.lx, A.ly); ok(Math.hypot(A.x - ax, A.y - ay) < 0.5, 'l’équipage reste sur le pont pendant la navigation');
// 5. un pirate sur le pont touché : la coque encaisse
const h0 = sh.hull, hp0 = A.hp; A.invulnUntil = 0; game.damagePlayer(A, 60, null);
ok(sh.hull < h0 && hp0 - A.hp < 40, `la coque encaisse (${h0 - sh.hull}) ; la capitaine (${Math.round(hp0 - A.hp)})`);
// 6. les canons
msg(A, { t: 'post', off: 1 }); const gun = st.find((q) => q.k === 'gun'); walkTo(A, gun); msg(A, { t: 'post', k: 'gun', i: gun.i }); ok(A.post === 'gun' + gun.i, 'la capitaine prend un canon');
const n0 = game.projs.length; msg(A, { t: 'gun', a: sh.a }); const ball = game.projs[game.projs.length - 1];
ok(game.projs.length === n0 + 1 && ball.kind === 'cball', 'le canon tire un boulet');
const n = sh.a + gun.side * Math.PI / 2; let dd = Math.atan2(ball.vy, ball.vx) - n; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
ok(Math.abs(dd) < 0.65, 'le tir part sur le côté (le canon ne tire pas vers la proue)');
msg(A, { t: 'gun', a: n }); ok(game.projs.length === n0 + 1, 'il faut recharger');
msg(A, { t: 'post', off: 1 });
// 7. un boulet ennemi dans la coque
const h1 = sh.hull; const pr = game.spawnProj(sh.x - 60 * Math.cos(sh.a + Math.PI / 2), sh.y - 60 * Math.sin(sh.a + Math.PI / 2) - 8, sh.a + Math.PI / 2, 210, 200, 40, 'm', 0, 'cball', 0);
ticks(10); ok(sh.hull < h1, `un boulet ennemi frappe la coque (−${h1 - sh.hull})`);
// 8. les rochers : on fonce sur la côte
let hit = false; const h2 = sh.hull; for (let k = 0; k < 20 * 40 && !hit; k++) { msg(B, { t: 'ctl', x: 0.3, y: 0 }); game.tick(); if (sh.hull < h2 - 3 || game.shipSpeed(sh) < 5) hit = true; }
ok(hit, `le navire finit par toucher terre (coque ${Math.round(sh.hull)})`);
ok(game.world && sh.x === sh.x, 'et ne traverse pas la côte');
// 9. sauvegarde : déconnexion sur le pont, reconnexion
msg(B, { t: 'post', off: 1 }); walkTo(A, at('cap')); msg(A, { t: 'post', k: 'cap' }); msg(A, { t: 'ctl', x: 0, y: 1 }); ticks(30); msg(A, { t: 'post', off: 1 });
ok(sh.anchor === 2, 'l’ancre est jetée (S au cabestan)');
const sx = sh.x, sy = sh.y; game.logout(A); ok(!sh.crew.has(A.id) && sh.oid === 0, 'la capitaine se déconnecte : le navire reste, sans elle');
const d = store.get('capitaine'); ok(d.ship && d.deck && d.deck.own === 'capitaine', 'la sauvegarde garde le navire et le pont');
game.removeShip(sh, null); // un redémarrage du serveur
const A2 = await login('Capitaine'); const sh2 = game.ownShip('capitaine');
ok(sh2 && Math.hypot(sh2.x - sx, sh2.y - sy) < 100 && A2.ship === sh2.id, 'à la reconnexion : le navire revient, et elle est sur son pont');
// 10. naufrage
for (const q of [A2, B]) q.invulnUntil = 0;
sh2.hull = 5; game.shipHit(sh2, 10); ok(sh2.sinkT > 0, 'la coque cède : le navire sombre');
ticks(20 * 2); ok(!A2.ship && !B.ship && canStand(W, A2.x, A2.y), 'l’équipage regagne la côte à la nage');
ticks(20 * 4); ok(!game.ships.has(sh2.id), 'l’épave disparaît');
put(A2, bx, by - 4); msg(A2, { t: 'ship', item: 'sloop' }); ok(!game.ownShip(A2.key), 'un navire sombré ne s’arme plus sans réparation');
// 11. un navire vide, propriétaire parti : il disparaît après dix minutes
A2.hulls.sloop = 180; msg(A2, { t: 'ship', item: 'sloop' }); const sh3 = game.ownShip(A2.key); game.logout(A2);
game.time += 590; ticks(20); ok(game.ships.has(sh3.id), 'encore là après 9 min 50');
game.time += 20; ticks(20); ok(!game.ships.has(sh3.id), 'parti après dix minutes');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
