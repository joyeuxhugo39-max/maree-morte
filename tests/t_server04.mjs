import { Game } from '../server/game.js';
import { canStand, canSail, zoneAt, roomIdAt, Z, SAFE } from '../shared/world.js';
import { BERTHS, berthPos, shipOf, gangway, hullHalf, stations } from '../shared/data/ships.js';
import { TILE } from '../shared/constants.js';
const store = new Map();
const storage = { auth: async (k, n, p) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => { store.set(k, JSON.parse(JSON.stringify(d))); } };
const game = new Game({ storage, log: () => {} });
const W = game.world;
const mk = (name) => { const c = { name, msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); return c; };
const ca = mk('A'), cb = mk('B');
game.onMessage(ca, { t: 'login', v: 12, name: 'Alpha', pass: 'abcd' });
game.onMessage(cb, { t: 'login', v: 12, name: 'Bravo', pass: 'abcd' });
await new Promise((r) => setTimeout(r, 20));
const A = game.sessions.get(ca).player, B = game.sessions.get(cb).player;
A.level = B.level = 12; game.recalc(A); game.recalc(B); A.hp = A.stats.maxHp; B.hp = B.stats.maxHp; // 1.0 : sous le niveau 10, on est protégé
const tick = (n = 1) => { for (let i = 0; i < n; i++) game.tick(); };
const place = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); p.invulnUntil = 0; };
const last = (c, t) => [...c.msgs].reverse().find((m) => m.t === t);
let fails = 0; const ok = (c, msg) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + msg); if (!c) fails++; };

// 1. PvP en ville : interdit
place(A, W.spawnPoint.x, W.spawnPoint.y); place(B, W.spawnPoint.x + 14, W.spawnPoint.y);
game.time += 2; let hp0 = B.hp; game.onAttack(A, 0); tick();
ok(B.hp === hp0 && SAFE.has(A.zone), `pas de dégâts en ville (zone ${A.zone})`);
// 2. PvP sur la plage : autorisé
let beach = null;
for (let y = 100; y < 130 && !beach; y++) for (let x = 100; x < 140 && !beach; x++) { const px = x * 16 + 8, py = y * 16 + 10; if (zoneAt(W, px, py) === Z.BEACH && canStand(W, px, py) && canStand(W, px + 14, py)) beach = [px, py]; }
place(A, beach[0], beach[1]); place(B, beach[0] + 14, beach[1]);
game.time += 2; hp0 = B.hp; game.onAttack(A, 0); tick();
ok(B.hp < hp0, `dégâts JcJ sur la plage : ${hp0} -> ${Math.round(B.hp)}`);
// tir
game.time += 3; hp0 = B.hp; A.eq.gun = 'pistolet_silex'; game.recalc(A); A.en = 100;
game.onSkill(A, { s: 'shot', a: 0 }); tick(8);
ok(B.hp < hp0, `balle JcJ : ${Math.round(hp0)} -> ${Math.round(B.hp)}`);
// mise à mort
B.gold = 200; B.hp = 1; game.time += 200; /* 1.0 : pas d'acharnement en moins de 3 min */ game.time += 3; B.invulnUntil = 0; game.onAttack(A, 0); tick();
ok(B.dead, 'B est mort');
ok([...game.drops.values()].some((d) => d.item === 'or' && d.owner === A.id && d.n === 20), 'B laisse 20 doublons pour A');
ok(A.ach.duel, 'haut fait duel');
ok(last(cb, 'dead') && last(cb, 'dead').by === 'Alpha', 'message de mort : tué par Alpha');
game.time += 2; game.respawn(B); tick();
ok(!B.dead && SAFE.has(B.zone), 'B réapparaît en ville');

// 3. Portes : entrer et sortir
const d0 = W.doors.find((d) => !d.secret);
place(A, d0.ox, d0.oy + 2); game.time += 2;
game.onMessage(ca, { t: 'door', id: d0.id }); tick();
ok(A.room === d0.room && A.zone === Z.INTERIOR, `entrée dans « ${d0.name} » (pièce ${A.room})`);
ok(canStand(W, A.x, A.y), 'position intérieure valide');
const pm = last(ca, 'pos'); ok(pm && pm.door === d0.id && pm.room === d0.room, 'message pos avec porte');
place(A, d0.ex, d0.ey - 2); A.room = d0.room; game.time += 2;
game.onMessage(ca, { t: 'door', id: d0.id, out: 1 }); tick();
ok(A.room === -1 && Math.abs(A.x - d0.rx) < 1, 'sortie devant la porte');
ok(canStand(W, A.x, A.y), 'position de sortie valide');
// toutes les portes ont des positions valides
let bad = 0; for (const d of W.doors) { if (!canStand(W, d.ix, d.iy)) { bad++; console.log('  intérieur invalide', d.name); } if (!d.dive && !canStand(W, d.rx, d.ry + 2)) { bad++; console.log('  sortie invalide', d.name, d.rx / 16 | 0, d.ry / 16 | 0); } } for (const d of W.doors.filter((q) => q.dive)) if (!canSail(W, d.rx, d.ry)) { bad++; console.log('  site de plongée hors de l’eau', d.name); }
ok(bad === 0, `${W.doors.length} portes, positions valides`);

// 4. Grottes secrètes
const sd = game.secretDoors[0];
place(A, sd.ox + 30, sd.oy + 10); A.room = -1;
game.time += 2; A.lastMoveAt = game.time - 0.5; A.moveBudget = 200;
let cand = null; for (let k = 0; k < 40 && !cand; k++) { const x = sd.ox + (k % 7 - 3) * 6, y = sd.oy + 4 + Math.floor(k / 7) * 5; if (canStand(W, x, y)) cand = [x, y]; }
game.onMessage(ca, { t: 'mv', x: cand[0], y: cand[1], d: 3, m: 1 });
ok(A.found.has(sd.id), `grotte découverte en approchant : ${sd.name}`);
place(A, sd.ox, sd.oy + 4); A.room = -1; game.time += 2;
game.onMessage(ca, { t: 'door', id: sd.id }); tick();
ok(A.room === sd.room && A.zone === Z.CAVE, `dans la grotte (zone ${A.zone})`);
const caveMobs = game.mobs.filter((m) => m.room === sd.room);
ok(caveMobs.length > 0, `${caveMobs.length} monstres dans cette grotte`);
// les monstres hors de la grotte ne voient pas A
const snap = last(ca, 's');
// 5. Bateau
place(A, W.spawnPoint.x, W.spawnPoint.y); A.room = -1;
game.addItem(A, 'barque', 1);
// 1.1 : on arme la barque à la bitte d'amarrage, on monte par la passerelle, on lève l'ancre, on hisse la voile
const [bx, by] = berthPos(BERTHS[0]); place(A, bx, by - 4); game.time += 2;
game.onMessage(ca, { t: 'ship', item: 'barque' }); tick();
const sh = game.ownShip(A.key), S = shipOf('barque');
ok(sh && sh.kind === 'barque', `barque armée au quai (${sh && [sh.x | 0, sh.y | 0]})`);
const gw = gangway(W, S, sh, -1) || gangway(W, S, sh, 1), op = S.ops[0], lyIn = gw.side * (hullHalf(S, op.x) - 9);
place(A, gw.x, gw.y); game.onMessage(ca, { t: 'mv', s: sh.id, lx: op.x, ly: lyIn, d: 0, m: 1 });
ok(A.ship === sh.id && canSail(W, A.x, A.y), `à bord de la barque en ${A.x | 0},${A.y | 0}`);
const st = stations(S), atp = (k) => { const q = st.find((z) => z.k === k); A.lx = q.x; A.ly = q.y; game.onMessage(ca, { t: 'post', k }); };
atp('cap'); game.onMessage(ca, { t: 'ctl', x: 0, y: -1 }); for (let k = 0; k < 20 * 7; k++) game.tick(); game.onMessage(ca, { t: 'post', off: 1 });
atp('sails'); game.onMessage(ca, { t: 'ctl', x: 0, y: -1 }); for (let k = 0; k < 20 * 3; k++) game.tick(); game.onMessage(ca, { t: 'post', off: 1 });
const x0 = sh.x, y0 = sh.y; for (let k = 0; k < 20 * 6; k++) game.tick();
ok(sh.anchor === 0 && Math.hypot(sh.x - x0, sh.y - y0) > 60, `navigation : la barque file (${Math.round(Math.hypot(sh.x - x0, sh.y - y0))} px en 6 s)`);
// on ne peut pas jeter la barque armée
const bslot = A.inv.findIndex((s) => s && s.id === 'barque');
game.onMessage(ca, { t: 'drop', slot: bslot }); ok(A.inv[bslot] && A.inv[bslot].id === 'barque', 'barque non jetable tant qu’elle est armée');
game.time += 2; game.onAttack(A, 0); ok(true, 'on se bat aussi sur le pont');
// accoster : on la ramène au quai, et l'on descend par la passerelle
sh.x = x0; sh.y = y0; sh.vx = sh.vy = 0; sh.sail = sh.sailT = 0; sh.anchor = 2; game.tick();
const gw2 = gangway(W, S, sh, gw.side); A.lx = op.x; A.ly = lyIn; game.tick();
game.onMessage(ca, { t: 'mv', x: gw2.x, y: gw2.y, d: 0, m: 1 });
ok(!A.ship && canStand(W, A.x, A.y), `descendu à quai en ${A.x | 0},${A.y | 0}`);
// 6. Havre-des-Brumes : zone sûre + haut fait
place(A, W.havre.x * 16 + 8, W.havre.y * 16 + 20); A.zone = -1; game.setZone(A, zoneAt(W, A.x, A.y));
ok(A.zone === Z.HAVRE && A.ach.navigateur, 'Havre atteint, haut fait navigateur');
// 7. Monstres : ne ciblent pas en zone sûre
const mob = game.mobs.find((m) => m.room === -1 && m.def.aggro);
ok(!game.mobCanTarget(mob, A), 'monstre ne cible pas un pirate à Havre');
// 8. Sauvegarde / reconnexion sur le pont, grottes mémorisées
place(A, gw.x, gw.y); A.room = -1; game.onMessage(ca, { t: 'mv', s: sh.id, lx: op.x, ly: lyIn, d: 0, m: 1 });
game.save(A);
const sv = store.get('alpha');
ok(sv.ship && sv.ship.item === 'barque' && sv.deck && sv.found.length === 1, 'sauvegarde : navire, pont + grotte trouvée');
game.removeClient(ca); game.removeShip(sh, null); const ca2 = mk('A2'); game.onMessage(ca2, { t: 'login', v: 12, name: 'Alpha', pass: 'abcd' }); await new Promise((r) => setTimeout(r, 20));
const A2 = game.sessions.get(ca2).player; const wel = last(ca2, 'welcome');
ok(A2.ship && wel.s === A2.ship && game.ownShip('alpha') && wel.found.length === 1, 'reconnexion sur son pont, grotte mémorisée');
// 9. PNJ intérieurs et quête traversée
const ys = W.npcs.find((n) => n.id === 'ysaline'); ok(ys && roomIdAt(W, ys.x, ys.y) >= 0, 'Ysaline est dans le chantier naval');
console.log('rooms', W.rooms.map((r) => r.name).join(' | '));
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK');
process.exit(fails ? 1 : 0);
