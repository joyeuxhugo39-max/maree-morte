// 1.0 : l'Arène de la Fosse — vagues, mise à terre, classement de la semaine, duels à mise et paris
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt } from '../shared/world.js';
import { weekKey } from '../server/arena.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 13, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); };
const F = W.rooms[game.fosseRoom], fx = (F.x0 + F.w / 2) * 16, fy = (F.y0 + 4) * 16;
const A = await login('Aldo'), B = await login('Brune'), C = await login('Cassis');
for (const p of [A, B, C]) { p.level = 15; game.recalc(p); p.hp = p.stats.maxHp; put(p, fx, fy); }
ok(weekKey(Date.UTC(2026, 10, 17)) === '2026-S47', 'semaine ISO');
// vagues en groupe
game.socAction(A, 'invite', 'Brune'); game.socAction(B, 'accept', 'Aldo');
game.arenaAction(A, 'waves', {});
ok(game.arenaRun && game.arenaRun.team.size === 2 && A.arena && B.arena && !C.arena, 'Aldo et Brune (groupés) descendent dans la Fosse');
game.time += 5; game.arenaTick();
ok(game.arenaRun.wave === 1 && game.arenaRun.mobs.length >= 2, `vague 1 : ${game.arenaRun.mobs.length} adversaires`);
for (let w = 0; w < 5; w++) { for (const m of game.arenaRun.mobs) if (m.state !== 'dead') game.damageMob(m, 9e6, A); game.arenaTick(); game.time += 6; game.arenaTick(); }
ok(game.arenaRun.wave === 6, `cinq vagues tenues (vague ${game.arenaRun.wave} en cours)`);
const gA = A.gold; A.hp = 1; game.damagePlayer(A, 9999, null);
ok(!A.dead && !A.arena && A.room === game.fosseRoom && A.st.deaths === 0, 'Aldo mis à terre : pas de mort, direction les gradins');
B.hp = 1; game.damagePlayer(B, 9999, null); game.arenaTick();
ok(!game.arenaRun && A.gold > gA, `fin du combat : Aldo payé (+${A.gold - gA})`);
ok(game.fosseBoard.top.aldo && game.fosseBoard.top.aldo.w === 5, 'classement de la semaine : 5 vagues pour Aldo');
game.onMessage(C.c, { t: 'arena', a: 'board' }); const bm = C.c.msgs.filter((m) => m.t === 'arena' && m.board).at(-1);
ok(bm && bm.board[0][0] === 'Aldo', 'Cassis consulte le classement');
// duel à mise, Cassis parie
game.socAction(B, 'leave', ''); A.gold = 1000; B.gold = 1000; C.gold = 500; game.time += 1;
game.arenaAction(A, 'duel', { name: 'Brune', bet: 300 });
ok(B.c.msgs.some((m) => m.t === 'ask' && m.kind === 'duel' && m.bet === 300), 'défi en duel, mise 300');
game.arenaAction(B, 'accept', {});
ok(game.duel && A.gold === 700 && B.gold === 700 && C.c.msgs.some((m) => m.t === 'ask' && m.kind === 'pari'), 'mises encaissées, les gradins sont invités à parier');
game.arenaAction(C, 'bet', { on: 1, n: 200 });
ok(C.gold === 300 && game.duel.pot[1] === 200, 'Cassis parie 200 sur Brune');
ok(!game.canPvp(A, B), 'pendant les paris, on ne se bat pas encore');
game.time = game.duel.startAt + 0.1;
ok(game.canPvp(A, B) && !game.canPvp(A, C), 'le duel commence : eux deux seulement');
A.hp = 1; A.invulnUntil = 0; game.damagePlayer(A, 9999, B);
ok(!game.duel && !A.dead && B.gold === 700 + Math.round(600 * 0.95) && A.infamy === 0, `Brune gagne : +${Math.round(600 * 0.95)} (la maison garde 5 %), pas d’infamie`);
ok(C.gold === 300 + Math.floor(200 * 0.95), `le pari de Cassis paie (+${Math.floor(200 * 0.95)})`);
ok(B.ach.duelliste, 'haut fait Fine lame');
// nouvelle semaine : le champion est sacré
game.fosseBoard.week = '2000-S01'; game.boardRoll();
ok(game.fosseBoard.champ === 'aldo' && A.ach.champion_fosse && game.fosseBoard.last[0][1] === 'Aldo', 'nouvelle semaine : Aldo sacré Champion de la Fosse');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
