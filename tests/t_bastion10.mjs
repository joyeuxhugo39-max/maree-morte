// 1.0 : le Bastion Englouti — leviers à deux, l'Écluse qui se remplit, le courant, la remise à zéro, l'Amiral
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, canStand } from '../shared/world.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, D = W.dungeon, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 13, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); };
const A = await login('Levier-Un'), B = await login('Levier-Deux');
for (const p of [A, B]) { p.level = 24; game.recalc(p); p.hp = p.stats.maxHp; }
const d = W.doors[D.door]; put(A, d.ox, d.oy + 2); game.time += 2; game.onDoor(A, d.id, false);
ok(game.inDungeon(A) && A.c.msgs.some((m) => m.t === 'dng'), 'Aldo entre dans le Bastion (porte de l’Île de la Quarantaine)');
const gateTile = D.gates[0][0], gx = (gateTile % W.W) * 16 + 8, gy = Math.floor(gateTile / W.W) * 16 + 10;
ok(!canStand(W, gx, gy), 'la première grille est fermée');
// un seul pirate : les deux leviers ne suffisent pas
const L = D.levers; put(A, L[0].x, L[0].y + 14); game.pullLever(A, 0); put(A, L[1].x, L[1].y - 14); game.time += 0.5; game.pullLever(A, 1);
ok(!game.dng.open[0], 'un seul pirate ne peut pas tirer les deux leviers');
put(B, L[1].x, L[1].y - 14); game.time += 3; game.pullLever(A, 0); game.time += 4; game.pullLever(B, 1);
ok(!game.dng.open[0], 'trop tard : il faut les tirer ensemble (2,5 s)');
put(A, L[0].x, L[0].y + 14); game.pullLever(A, 0); game.time += 1; game.pullLever(B, 1);
ok(game.dng.open[0] && canStand(W, gx, gy), 'deux pirates, ensemble : la grille se lève');
// l'Écluse
put(A, (D.chambers[1][0] + D.chambers[1][1]) / 2, (D.y0 + D.y1) / 2);
for (let k = 0; k < 4; k++) game.dungeonTick();
ok(game.dng.filling && game.dng.water > 0, 'l’Écluse commence à se remplir');
const hp0 = A.hp; for (let k = 0; k < 4 * 60; k++) game.dungeonTick();
ok(game.dng.water > 0.75 && A.hp < hp0, `l’eau monte (${Math.round(game.dng.water * 100)} %) : on boit la tasse`);
for (let k = 0; k < 4 * 20; k++) game.dungeonTick();
ok(!game.inDungeon(A) && !game.dng.open[0] && game.dng.water === 0, 'l’Écluse pleine : le courant rejette tout le monde dehors, le Bastion se referme');
// on recommence, plus vite : la deuxième grille vide l'Écluse (Aldo s'était noyé : on le relève)
for (const p of [A, B]) { p.dead = false; p.hp = p.stats.maxHp; }
put(A, d.ox, d.oy + 2); game.time += 2; game.onDoor(A, d.id, false); put(B, d.ox, d.oy + 2); game.onDoor(B, d.id, false);
put(A, L[0].x, L[0].y + 14); put(B, L[1].x, L[1].y - 14); game.pullLever(A, 0); game.pullLever(B, 1);
put(A, L[2].x, L[2].y - 14); put(B, L[3].x, L[3].y + 14); for (let k = 0; k < 20; k++) game.dungeonTick();
game.pullLever(A, 2); game.pullLever(B, 3);
ok(game.dng.open[1] && game.dng.water === 0, 'deuxième grille ouverte : l’Écluse se vide');
// l'Amiral
const amiral = game.mobs.find((m) => m.type === 'amiral_englouti');
ok(amiral && amiral.room === D.room && amiral.def.ai === 'amiral', 'l’Amiral Englouti attend au fond');
A.quests.freres_cote = { s: 'done', p: [] }; const k = game.npcPos.get('kerbrat'); put(A, k.x, k.y + 14); game.onMessage(A.c, { t: 'qa', q: 'bastion' });
put(A, amiral.x + 20, amiral.y); put(B, amiral.x - 20, amiral.y);
game.damageMob(amiral, 10, A); game.damageMob(amiral, 10, B);
ok(amiral.maxHp > 6500, `il se renforce pour deux (${amiral.maxHp} PV)`);
game.damageMob(amiral, 1e7, A);
ok(A.quests.bastion && A.quests.bastion.p[0] === 1, 'l’Amiral est vaincu : quête accomplie');
// remise à zéro quand plus personne
for (const p of [A, B]) put(p, d.ox, d.oy + 2);
game.time += 100; game.dungeonTick();
ok(!game.dng.open[0] && !game.dng.open[1], 'vide depuis 90 s : le Bastion se referme');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
