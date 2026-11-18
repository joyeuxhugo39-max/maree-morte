// 1.0 : les fonds marins — la cloche, l'air, les poches d'air, la noyade, la remontée, les coffres engloutis, Ys
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, canSail } from '../shared/world.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 11, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); };
let SH = null; const aboardAt = (p, x, y) => { if (p.ship) game.leaveDeck(p); if (SH) game.ships.delete(SH.id); put(p, x, y); SH = game.createShip(p, 'sloop', x, y, 0, { anchor: 2 }); game.joinDeck(p, SH, 0, 6); }; // 1.1 : sur le pont d'un vrai navire
const sec = (p, n) => { for (let i = 0; i < n; i++) { game.time += 1; game.seaTick(p); } };
const A = await login('Plongeuse');
A.level = 26; game.recalc(A); A.hp = A.stats.maxHp; for (let i = 0; i < A.inv.length; i++) A.inv[i] = null;
ok(W.diveSpots.length === 3 && W.diveSpots.every((s) => canSail(W, s.x, s.y)), 'trois sites de plongée, en pleine mer');
const S = W.diveSpots.find((s) => s.key === 'leviathan');
game.addItem(A, 'sloop', 1); aboardAt(A, S.x, S.y);
game.dive(A); ok(!game.seaRoom(A), 'sans cloche, on ne plonge pas');
game.addItem(A, 'cloche_plongee', 1); A.quests.plongee = { s: 'active', p: [0, 0, 0] };
aboardAt(A, S.x + 200, S.y); game.dive(A); ok(!game.seaRoom(A), 'loin des bulles, on ne plonge pas');
aboardAt(A, S.x, S.y); game.dive(A);
ok(game.seaRoom(A) && !A.ship && A.diveBoat === SH.id && SH.anchor >= 1 && A.air === 45, 'la cloche descend : les fonds du Léviathan, 45 s d’air');
ok(A.quests.plongee.p[0] === 1, 'objectif de quête : plongée sur le Léviathan');
// l'air
const far = (() => { const r = W.rooms[A.room]; for (let y = r.y0 + 1; y < r.y0 + r.h - 2; y++) for (let x = r.x0 + 1; x < r.x0 + r.w - 1; x++) { const px = x * 16 + 8, py = y * 16 + 8; if (W.solid[y * W.W + x] === 0 && W.airPockets.every((a) => Math.hypot(a.x - px, a.y - py) > 60)) return [px, py]; } })();
put(A, far[0], far[1]); sec(A, 20); ok(A.air === 25, 'l’air s’épuise (25 s après 20 s)');
const pk = W.airPockets.find((a) => a.room === A.room); put(A, pk.x, pk.y); sec(A, 2); ok(A.air > 25, `une poche d’air le rend (${A.air} s)`);
put(A, far[0], far[1]); const hp0 = A.hp; sec(A, 60); ok(A.air === 0 && A.hp < hp0, 'à bout d’air, on se noie');
A.hp = A.stats.maxHp; A.dead = false; if (!game.seaRoom(A)) { aboardAt(A, S.x, S.y); game.time += 2; game.dive(A); }
// le casque de scaphandrier
game.addItem(A, 'scaphandre', 1); A.eq.hat = 'scaphandre'; game.recalc(A); ok(game.airMax(A) === 90, 'le casque de scaphandrier double l’air (90 s)');
// un coffre englouti
const chest = W.chests.find((c) => c.sunken && roomIdAt(W, c.x, c.y) === A.room); put(A, chest.x, chest.y + 16); const g0 = A.gold;
game.openProp(A, chest.id); ok(A.gold > g0, `un coffre englouti : +${A.gold - g0} doublons`);
// remonter
const d = W.doors[S.door]; put(A, d.ex, d.ey); game.time += 2; game.onDoor(A, d.id, true);
ok(A.room === -1 && A.ship === SH.id && canSail(W, A.x, A.y), 'la corde de l’ancre : on remonte sur le pont de son navire');
// Ys et son roi
const Y = W.diveSpots.find((s) => s.key === 'ys'); aboardAt(A, Y.x, Y.y); game.time += 2; game.dive(A);
const roi = game.mobs.find((m) => m.type === 'roi_ys');
ok(game.seaRoom(A) && roi && roi.room === A.room, 'Ys-la-Noyée : Gradlon siège au fond de la cité');
game.save(A); ok(store.get('plongeuse').cnt.dives === 5, 'les sites visités sont retenus');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
