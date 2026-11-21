// 1.0 : jeux de taverne — bras de fer vérifié par le serveur, concours de rhum, Trente-et-un, chansons à boire
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt } from '../shared/world.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 15, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); };
const A = await login('Gaspard'), B = await login('Hortense');
const n = game.npcPos.get('rosalie'); put(A, n.x, n.y + 16); put(B, n.x + 20, n.y + 20);
const act = (p, a, o = {}) => { game.time += 0.3; game.onMessage(p.c, { t: 'tav', a, ...o }); };
const last = (p) => p.c.msgs.filter((m) => m.t === 'tav').at(-1);
// bras de fer : des appuis parfaits (calculés comme le client) gagnent
A.gold = 1000; act(A, 'arm', { bet: 100 });
const g = A.game, taps = []; let t = 0.3;
while (taps.length < 5 && t < 11) { const x = (Math.sin(t * g.speed + g.phase) + 1) / 2; if (x >= g.z0 + 0.03 && x <= g.z1 - 0.03 && (!taps.length || t > taps.at(-1) + 0.3)) taps.push(+t.toFixed(3)); t += 0.01; }
game.time = g.t0 + taps.at(-1) + 0.1; act(A, 'armEnd', { taps });
ok(last(A).done && last(A).hits === 5 && A.gold === 1100, `bras de fer : 5 coups justes, gagné (+100)`);
act(A, 'arm', { bet: 100 }); game.time = A.game.t0 + 0.5; act(A, 'armEnd', { taps: [1, 2, 3, 4, 5] });
ok(last(A).hits === 0 && A.gold === 1000, 'appuis annoncés plus vite que le temps écoulé : refusés (perdu)');
// concours de rhum
A.gold = 1000; act(A, 'rum', { bet: 100 }); ok(A.gold === 900 && A.game.kind === 'rum', 'concours de rhum : la mise est sur le comptoir');
let guard = 0; while (A.game && guard++ < 60) act(A, 'drink');
const r = last(A); ok(r.done && (r.win ? A.gold === 1000 + 100 + (0) : A.gold === 900), `quelqu’un roule sous la table (${r.win ? 'le tavernier' : 'Gaspard'}, ${r.me} verres contre ${r.them})`);
act(A, 'rum', { bet: 100 }); act(A, 'rumStop'); ok(A.gold === (r.win ? 1100 : 900) - 50, 'abandonner rend la moitié de la mise');
// Trente-et-un
A.gold = 1000; act(A, 'cards', { bet: 50 }); ok(A.game.me.length === 3 && A.game.them.length === 1, 'Trente-et-un : trois cartes pour vous, une pour le tavernier');
act(A, 'stand'); const c = last(A); const sum = (h) => h.reduce((s, v) => s + v, 0);
ok(c.done && sum(c.them) >= 27 && A.gold === 1000 + c.gain, `le tavernier tire jusqu’à 27 (${sum(c.me)} contre ${sum(c.them)}, ${c.gain >= 0 ? '+' : ''}${c.gain})`);
// loin du comptoir
put(A, W.spawnPoint.x, W.spawnPoint.y); A.c.msgs.length = 0; act(A, 'cards', { bet: 50 });
ok(!A.game && A.c.msgs.some((m) => m.t === 'toast' && /comptoir/.test(m.msg)), 'on ne joue qu’au comptoir d’une taverne');
// chanson à boire : toute la salle
put(A, n.x, n.y + 16); act(A, 'sing'); for (let i = 0; i < 30; i++) { game.time += 0.5; game.tick(); }
ok(A.c.msgs.filter((m) => m.t === 'tav' && m.g === 'song').length === 4 && B.c.msgs.filter((m) => m.t === 'tav' && m.g === 'song').length === 4, 'chanson à boire : Hortense reprend les quatre couplets');
ok(A.buffs && A.buffs.chant && B.buffs && B.buffs.chant && A.stats.atk > 0, 'l’entrain : +10 % d’attaque pour les chanteurs');
act(B, 'sing'); ok(B.c.msgs.some((m) => m.t === 'toast' && /déjà/.test(m.msg)), 'une chanson à la fois par salle');
game.save(A); ok(store.get('gaspard').cnt.song === 1, 'les compteurs de taverne sont sauvegardés');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
