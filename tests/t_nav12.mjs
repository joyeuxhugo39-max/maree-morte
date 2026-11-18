// Lot 1 : la navigation sans blocage — monter et descendre avec E, partir depuis la barre seule (l'équipage
// lève l'ancre et hisse la voile), marcher fait quitter un poste, dégager un navire coincé, rentrer au port
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, canStand } from '../shared/world.js';
import { BERTHS, berthPos, stations, shipOf, toWorld, hullHalf, hullClear } from '../shared/data/ships.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 12, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); };
const ticks = (n) => { for (let i = 0; i < n; i++) game.tick(); };
const msg = (p, m) => game.onMessage(p.c, m);
const A = await login('Mousse');
A.level = 12; game.recalc(A); A.hp = A.stats.maxHp; for (let i = 0; i < A.inv.length; i++) A.inv[i] = null; game.addItem(A, 'sloop', 1);
const [bx, by] = berthPos(BERTHS[0]); put(A, bx, by - 4);
msg(A, { t: 'ship', item: 'sloop' }); const sh = game.ownShip(A.key), S = shipOf('sloop');
ok(!!sh, 'le sloop est armé à quai');
// E pour monter : depuis le quai, sans chercher l'ouverture
msg(A, { t: 'ship', a: 'board', id: sh.id }); ok(A.ship === sh.id, 'E au bord du quai : on monte à bord');
// à la barre seule : Z → l'équipage lève l'ancre puis la voile se déploie, le navire part
const st = stations(S), at = (k) => st.find((s) => s.k === k);
A.lx = at('helm').x; A.ly = at('helm').y; msg(A, { t: 'post', k: 'helm' }); ok(A.post === 'helm', 'à la barre');
msg(A, { t: 'ctl', x: 0, y: -1 }); ticks(20 * 4.5); msg(A, { t: 'ctl', x: 0, y: 0 });
ok(sh.anchor === 0, `l’équipage a levé l’ancre depuis la barre (${sh.anchor})`);
ok(sh.sailT > 0.4, `la voile se hisse depuis la barre (${sh.sailT.toFixed(2)})`);
// la voilure d'un cran (Espace) : toute la toile
msg(A, { t: 'ctl', x: 0, y: 0, sl: 1 }); ticks(20 * 6); ok(sh.sailT === 1 && game.shipSpeed(sh) > 30, `toute la toile : le navire file (${Math.round(game.shipSpeed(sh))} px/s)`);
// cargue + ancre (simple), puis marcher fait quitter le poste
msg(A, { t: 'ctl', x: 0, y: 0, sl: 0 }); ticks(20 * 3);
game.time += 0.4; msg(A, { t: 'mv', s: sh.id, lx: A.lx + 4, ly: A.ly + 2, d: 0, m: 1 }); ok(!A.post, 'marcher sur le pont fait quitter la barre (plus de joueur figé)');
// échoué contre la côte → « Dégager »
let blocked = false; sh.sailT = sh.sail = 1; sh.anchor = 0; sh.rud = 0.4;
for (let k = 0; k < 20 * 60 && !blocked; k++) { game.tick(); if (game.time - (sh.blockedAt || -99) < 0.1 && game.shipSpeed(sh) < 4) blocked = true; }
ok(blocked, 'le navire finit contre la côte');
const x0 = sh.x, y0 = sh.y; msg(A, { t: 'ship', a: 'unstick' });
ok(Math.hypot(sh.x - x0, sh.y - y0) > 5 && hullClear(W, S, sh.x, sh.y, sh.a), `« Dégager » : le navire glisse vers l’eau libre (${Math.round(Math.hypot(sh.x - x0, sh.y - y0))} px)`);
const x1 = sh.x; msg(A, { t: 'ship', a: 'unstick' }); ok(sh.x === x1, 'une seule fois toutes les vingt secondes');
// « Rentrer au port » : interrompu si l'on est touché, sinon le navire est amarré au quai le plus proche
sh.sail = sh.sailT = 0; sh.vx = sh.vy = 0; game.time += 10; A.lastHurt = -99;
msg(A, { t: 'ship', a: 'home' }); ok(!!A.homing, 'retour au port : l’équipage se met à l’ouvrage');
ticks(20 * 2); A.invulnUntil = 0; game.damagePlayer(A, 5, null, false, 'w'); ticks(2); ok(!A.homing, 'un coup l’interrompt');
game.time += 6; A.lastHurt = -99; msg(A, { t: 'ship', a: 'home' }); ticks(20 * 9);
ok(!A.homing && sh.anchor === 2 && A.ship === sh.id, 'le navire est rentré, ancre au fond, l’équipage à bord');
const near = BERTHS.some((b) => Math.hypot(b.tx * 16 - sh.x, b.ty * 16 - sh.y) < 260); ok(near, 'il est amarré à un quai d’armement');
// E pour descendre : vers le quai
msg(A, { t: 'ship', a: 'land' }); ok(!A.ship && canStand(W, A.x, A.y), `E sur le pont, près du quai : on descend à terre (${Math.round(A.x)},${Math.round(A.y)})`);
// en pleine mer, pas de terre à portée : refus clair, on reste à bord
msg(A, { t: 'ship', a: 'board', id: sh.id }); const keep = [sh.x, sh.y]; sh.x = 152 * 16; sh.y = 150 * 16; game.tick();
const n0 = A.c.msgs.length; msg(A, { t: 'ship', a: 'land' }); ok(A.ship === sh.id && A.c.msgs.slice(n0).some((m) => m.t === 'toast' && /terre ferme/.test(m.msg)), 'en pleine mer : « pas de terre ferme à portée », on reste à bord');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
