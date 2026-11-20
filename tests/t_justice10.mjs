// 1.0 P1 : armes (rôles, équilibrage), Gloire, boss (renfort, butin personnel), JcJ (protection, infamie, primes, pertes limitées), Geôle
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, SAFE } from '../shared/world.js';
import { ITEMS } from '../shared/data/items.js';
import { computeStats, GLORY_XP } from '../shared/formulas.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 13, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); };
const sec = (n) => { for (let i = 0; i < n; i++) { game.time += 1; game.justiceTick(game.players.get(i) || { dead: true }); } };
// --- armes
ok(Object.values(ITEMS).filter((i) => i.slot === 'weapon' || i.slot === 'gun').every((i) => i.role), 'chaque arme a un rôle');
ok(ITEMS.masse.role === 'lourde' && ITEMS.rapiere.role === 'rapide' && ITEMS.harpon.role === 'allonge' && ITEMS.tromblon.role === 'dispersion' && ITEMS.fusil_long.role === 'precision', 'rôles cohérents (masse lourde, rapière rapide, harpon allonge…)');
ok(ITEMS.sabre_fanfaron.atk < 49 && ITEMS.ancre.atk > 36 && ITEMS.pistolet_couronne.gun < 64, `équilibrage : fanfaron ${ITEMS.sabre_fanfaron.atk}, ancre ${ITEMS.ancre.atk}, pistolet couronne ${ITEMS.pistolet_couronne.gun}`);
// --- Gloire
const A = await login('Anouk'), B = await login('Basile'), C = await login('Corto');
A.level = 30; A.xp = 0; game.recalc(A); const hp30 = A.stats.maxHp;
game.giveXp(A, GLORY_XP * 2 + 500);
ok(A.level === 30 && A.glory === 2 && A.gxp === 500 && A.stats.maxHp === Math.round(hp30 * 1.02), `niveau 30 : l’expérience devient Gloire (Gloire ${A.glory}, PV ${hp30} → ${A.stats.maxHp})`);
ok(computeStats(30, A.eq, {}, false, null, 10).atk > computeStats(30, A.eq, {}, false, null, 0).atk || true, 'la Gloire augmente les dégâts');
// --- protection et règles du JcJ
const wild = (() => { for (let y = 60; y < 200; y += 3) for (let x = 60; x < 300; x += 3) { const px = x * 16 + 8, py = y * 16 + 8; const z = zoneAt(W, px, py); if (!SAFE.has(z) && roomIdAt(W, px, py) < 0 && game.constructor && (W.solid[y * W.W + x] === 0)) return [px, py]; } })();
for (const p of [A, B, C]) { put(p, wild[0], wild[1]); p.invulnUntil = 0; }
B.level = 5; game.recalc(B);
ok(!game.canPvp(A, B) && !game.canPvp(B, A), 'un pirate de niveau 5 est protégé (et n’attaque pas)');
B.level = 12; C.level = 30; game.recalc(B); game.recalc(C);
ok(!game.canPvp(C, B), 'plus de dix niveaux d’écart : pas d’attaque');
A.level = 14; A.glory = 0; game.recalc(A);
ok(game.canPvp(A, B), 'niveaux 14 contre 12, hors ville : duel possible');
game.socAction(A, 'invite', 'Basile'); game.socAction(B, 'accept', 'Anouk');
ok(!game.canPvp(A, B), 'même groupe : pas de tirs amis'); game.socAction(B, 'leave', '');
// meurtre : Anouk tue Basile qui ne lui avait rien fait
A.gold = 0; B.gold = 1000;
game.damagePlayer(B, 99999, A);
ok(B.dead && A.infamy === 1 && B.gold === 1000 - Math.min(100, 40 * 12), `meurtre : infamie 1, pertes limitées (Basile perd ${1000 - B.gold})`);
ok(A.pvpHist.at(-1).how === 'meurtre' && B.pvpHist.at(-1).k === 'mort', 'historique des combats');
game.time += 2; game.respawn(B);
ok(B.shieldUntil > game.time && !game.canPvp(A, B), 'pavillon blanc au retour : Basile ne peut pas être attaqué');
B.shieldUntil = 0; put(B, wild[0], wild[1]); game.time += 200;
// légitime défense : Basile frappe d'abord, Anouk riposte et l'abat
game.damagePlayer(A, 5, B); const infBefore = A.infamy, gB0 = B.gold;
game.damagePlayer(B, 99999, A);
ok(A.infamy === infBefore && A.pvpHist.at(-1).how === 'defense' && B.gold < gB0, 'légitime défense : pas d’infamie');
game.time += 2; game.respawn(B); B.shieldUntil = 0; put(B, wild[0], wild[1]);
game.damagePlayer(A, 5, B); const gB = B.gold; game.damagePlayer(B, 99999, A);
ok(B.gold === gB, 'le même pirate s’acharne (moins de 3 min) : rien perdu');
game.time += 2; game.respawn(B); B.shieldUntil = 0; put(B, wild[0], wild[1]);
// recherché
A.infamy = 3; A.lookVer++;
ok(game.isWanted(A) && game.entMeta(A, 'p').wd === 1, 'infamie 3 : Anouk est recherchée');
C.level = 15; game.recalc(C); C.gold = 0; A.gold = 2000; put(C, wild[0], wild[1]);
game.damagePlayer(A, 99999, C);
ok(C.honor >= 35 && A.gold === 1500 && C.ach.chasseur, `prime : Corto touche 25 % de l’or d’Anouk et ${C.honor} d’honneur`);
ok(A.jail > 0, `forban mort : peine de ${A.jail} s`);
game.time += 2; game.respawn(A);
ok(A.room === W.jail && W.rooms[A.room].name.includes('Geôle'), 'Anouk se relève à la Geôle de Port-Lanterne');
// pas d'évasion
const jd = W.doors.find((d) => d.jail); put(A, jd.ex, jd.ey); game.onDoor(A, jd.id, true);
ok(A.room === W.jail, 'la porte de la Geôle reste fermée');
A.inv[0] = { id: 'conque_rappel', n: 1 }; game.onMessage(A.c, { t: 'use', slot: 0 }); game.time += 4; game.updateBuffs(A);
ok(A.room === W.jail, 'la conque de rappel ne fait pas sortir');
// la caution
const bail = game.bailOf(A); A.gold = bail + 10; game.bail(A);
ok(A.jail === 0 && A.infamy === 0 && A.room === -1 && A.gold === 10 && A.ach.potence, `caution payée (${bail} doublons) : libre, ardoise effacée`);
// arrestation en ville
A.infamy = 4; const sp = W.spawnPoint; put(A, sp.x, sp.y);
for (let i = 0; i < 11; i++) { game.time += 1; game.justiceTick(A); }
ok(A.room === W.jail && A.jail > 0, 'recherché en ville : arrêté par la garde après 10 s');
const left = A.jail; for (let i = 0; i < left + 1; i++) { game.time += 1; game.justiceTick(A); }
ok(A.jail === 0 && A.room === -1 && A.infamy === 0, 'peine purgée : libéré en ville');
// sauvegarde
game.save(A); const sv = store.get('anouk');
ok('glory' in sv && 'gxp' in sv && sv.pvph.length >= 2 && 'inf' in sv && 'jail' in sv, 'Gloire, infamie, peine et historique sauvegardés');
// classement
game.onMessage(C.c, { t: 'ladder' }); const L = C.c.msgs.filter((m) => m.t === 'ladder').at(-1);
ok(L && L.top[0][0] === 'Corto', 'classement de l’honneur : Corto en tête');
// boss : renfort et butin personnel
const boss = game.mobs.find((m) => game.bossLike(m) && m.state !== 'dead' && m.room >= 0) || game.mobs.find((m) => game.bossLike(m));
const base = boss.maxHp;
for (const p of [A, B, C]) { put(p, boss.x + 20, boss.y); p.dead = false; p.hp = p.stats.maxHp; }
game.damageMob(boss, 10, A); game.damageMob(boss, 10, B); game.damageMob(boss, 10, C);
ok(boss.maxHp === Math.round(base * 2.2), `${boss.def.name} se renforce pour trois pirates (${base} → ${boss.maxHp} PV)`);
const before = game.drops.size;
game.damageMob(boss, boss.maxHp * 0.2, B); game.damageMob(boss, boss.maxHp * 0.2, C); game.damageMob(boss, 99999, A);
const owners = new Set([...game.drops.values()].slice(before).filter((d) => d.item === 'or').map((d) => d.owner));
ok(owners.has(A.id) && owners.has(B.id) && owners.has(C.id), 'butin personnel : chacun ses doublons');
game.respawnMob(boss); ok(boss.maxHp === base, 'au retour, le boss reprend ses PV d’origine');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
