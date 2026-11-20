import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, canStand, canSail, Z } from '../shared/world.js';
import { DAY_LENGTH, isFullMoon, dayFrac, isNight } from '../shared/constants.js';
import { displayLook, computeStats } from '../shared/formulas.js';
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world;
const mk = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 13, name, pass: 'abcd' }); await new Promise((r) => setTimeout(r, 20)); const p = game.sessions.get(c).player; p.c = c; return p; };
const A = await mk('Anouk'), B = await mk('Basile');
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const tick = (n) => { for (let i = 0; i < n; i++) game.tick(); };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); p.moveBudget = 0; };
const evs = []; const ev0 = game.ev.bind(game); game.ev = (x, y, e) => { evs.push(e); ev0(x, y, e); };
const last = (p, t) => [...p.c.msgs].reverse().find((m) => m.t === t);
for (const p of [A, B]) { p.level = 30; game.recalc(p); p.hp = p.stats.maxHp; }
// ---------- le soleil et la lune
const night = game.mobs.filter((m) => m.def.night && !m.summoned);
const buried = night.filter((m) => m.buried).length, awake = night.filter((m) => m.state !== 'dead').length;
ok(!game.night && buried > awake * 3 && awake > 0, `le jour : ${buried} morts sous terre, ${awake} résistent au soleil`);
// la nuit tombe (pleine lune)
let wt = game.worldTime; while (!(isNight(dayFrac(wt)) && isFullMoon(wt))) wt += 5; game.worldTime = wt - 2;
put(A, W.spawnPoint.x + 900, W.spawnPoint.y); // hors de la ville
let k = 0; while (zoneAt(W, A.x, A.y) === Z.SEA || !canStand(W, A.x, A.y) || [1, 8, 14, 18].includes(zoneAt(W, A.x, A.y))) { put(A, W.spawnPoint.x - 300 - k * 20, W.spawnPoint.y + 160); k++; if (k > 40) break; }
A.invulnUntil = game.time + 9999;
evs.length = 0; tick(60 + 20 * 12);
const risen = night.filter((m) => m.state !== 'dead').length;
ok(game.night && risen > awake * 3, `la nuit : ${risen} morts debout`);
const horde = game.mobs.filter((m) => m.horde && m.state !== 'dead');
ok(horde.length >= 3 && A.c.msgs.some((m) => m.t === 'chat' && /pleine lune/.test(m.m || '')), `pleine lune : la Horde (${horde.length}) chasse Anouk`);
// le jour se lève
game.worldTime = wt; while (isNight(dayFrac(game.worldTime))) game.worldTime += 5; game.worldTime -= 2;
evs.length = 0; tick(60 + 20 * 8);
ok(!game.night && evs.some((e) => e[0] === 'burn') && game.mobs.filter((m) => m.horde && m.state !== 'dead').length === 0, `l’aube : ${evs.filter((e) => e[0] === 'burn').length} morts brûlent au soleil, la Horde a disparu`);
// ---------- navires maudits
const ship = game.mobs.find((m) => m.type === 'brick_noye');
ok(ship && canSail(W, ship.x, ship.y), 'un Brick des Noyés navigue');
const [sx0, sy0] = [ship.x, ship.y];
game.addItem(A, 'sloop', 1); A.boat = 'sloop'; A.lookVer++;
let spot = null; for (let r = 230; r < 400 && !spot; r += 20) for (let a = 0; a < 6.28 && !spot; a += 0.3) { const x = ship.x + Math.cos(a) * r, y = ship.y + Math.sin(a) * r; if (canSail(W, x, y)) spot = [x, y]; }
put(A, spot[0], spot[1]); A.invulnUntil = game.time + 9999;
evs.length = 0; tick(200);
ok(Math.hypot(ship.x - sx0, ship.y - sy0) > 20 && ship.target === A.id, `le brick se déplace et prend Anouk pour cible (${Math.round(Math.hypot(ship.x - sx0, ship.y - sy0))} px)`);
ok(evs.some((e) => e[0] === 'proj' && e[7] === 'cball' && e[8] === ship.id), 'il tire des boulets');
const g0 = game.drops.size; game.damageMob(ship, 99999, A, false);
ok(ship.state === 'dead' && game.drops.size > g0 && A.cnt.ships === 1, `coulé : ${game.drops.size - g0} débris flottent`);
A.boat = null;
// ---------- passeur
const isa = game.npcPos.get('passeur'); put(A, isa.x, isa.y + 10); A.lastHurt = -99;
game.addItem(A, 'billet_rade', 1); game.useSlot(A, A.inv.findIndex((s) => s && s.id === 'billet_rade'));
ok(A.zone === Z.RADE && game.countItem(A, 'billet_rade') === 0 && A.ach.rade, 'billet du passeur : débarqué à la Rade (haut fait)');
// ---------- quête de Vif-Argent : le prisonnier, puis le quai
A.quests.traversee = { s: 'done', p: [] };
const talkTo = (p, id) => { const n = game.npcPos.get(id); put(p, n.x, n.y + 14); game.onTalk(p, id); };
const accept = (p, q) => { const n = game.npcPos.get(game.constructor.name && (globalThis.QQ || {})[q] || ''); };
const { QUESTS } = await import('../shared/data/quests.js');
const doQuest = (p, q) => { const Q = QUESTS[q]; talkTo(p, Q.giver); game.acceptQuest(p, q); };
doQuest(A, 'rumeur_rade'); talkTo(A, 'mama_lune'); game.turnIn(A, 'rumeur_rade');
doQuest(A, 'prisonnier'); talkTo(A, 'vif_argent'); game.turnIn(A, 'prisonnier');
ok(A.quests.prisonnier && A.quests.prisonnier.s === 'done', 'Vif-Argent rencontré dans sa cellule');
doQuest(A, 'trousseau'); game.addItem(A, 'rhum', 6); talkTo(A, 'geolier'); talkTo(A, 'vif_argent'); game.turnIn(A, 'trousseau');
ok(A.quests.trousseau.s === 'done' && game.countItem(A, 'rhum') === 0, 'six bouteilles pour le geôlier');
doQuest(A, 'evasion');
const nq = game.npcPos.get('vif_quai');
put(A, game.npcPos.get('vif_argent').x, game.npcPos.get('vif_argent').y + 14);
ok(!game.nearNpc(A, 'vif_argent'), 'après l’évasion, la cellule est vide');
talkTo(A, 'vif_quai'); game.turnIn(A, 'evasion');
ok(A.quests.evasion.s === 'done', 'Vif-Argent retrouvé sur le quai');
// ---------- le Fort des Deux Clés : deux dalles, deux frères
const seal = W.seals.find((s) => s.id === 'freres'), fd = W.doors[seal.door];
put(A, fd.ox, fd.oy + 6); A.cds.door = 0; game.onDoor(A, fd.id, false);
ok(A.room === -1, 'le fort est scellé');
put(A, seal.plates[0].x, seal.plates[0].y); put(B, seal.plates[1].x, seal.plates[1].y); tick(6);
ok(game.seals.freres > game.time, 'deux dalles, deux pirates : le fort s’ouvre');
for (const p of [A, B]) { put(p, fd.ox, fd.oy + 6); p.cds.door = 0; game.onDoor(p, fd.id, false); }
ok(A.room === seal.room && B.room === seal.room, 'les deux pirates entrent dans l’arène');
for (const p of [A, B]) { talkTo(p, 'kerbrat'); game.acceptQuest(p, 'freres_cote'); const d2 = W.doors[seal.door]; game.teleport(p, d2.ix, d2.iy); p.invulnUntil = game.time + 9999; }
const fer = game.mobs.find((m) => m.type === 'frere_fer'), rou = game.mobs.find((m) => m.type === 'frere_rouille');
// collés l'un à l'autre : invulnérables
fer.state = 'chase'; fer.target = A.id; rou.state = 'chase'; rou.target = A.id; rou.x = fer.x + 30; rou.y = fer.y; tick(3);
let h0 = fer.hp; game.damageMob(fer, 500, A, false);
ok(fer.linked && fer.hp === h0, 'côte à côte : Fer est invulnérable');
// séparés
const r = W.rooms[seal.room];
fer.x = (r.x0 + 2) * 16 + 8; fer.y = (r.y0 + 3) * 16 + 10; rou.x = (r.x0 + r.w - 3) * 16 + 8; rou.y = (r.y0 + 3) * 16 + 10;
put(A, fer.x + 30, fer.y); put(B, rou.x - 30, rou.y); fer.target = A.id; rou.target = B.id; tick(3);
h0 = fer.hp; game.damageMob(fer, 500, A, false);
ok(!fer.linked && fer.hp < h0, 'séparés : Fer encaisse');
// un seul abattu : il se relève
game.damageMob(fer, 99999, A, false);
ok(fer.state === 'dead' && !(A.quests.freres_cote.p[0] > 0), 'Fer tombe, mais la quête ne compte pas encore');
tick(20 * 9);
ok(fer.state !== 'dead' && fer.hp < fer.maxHp, 'Rouille relève son frère au bout de 8 s');
// les deux presque en même temps
fer.x = (r.x0 + 2) * 16 + 8; fer.y = (r.y0 + 3) * 16 + 10; rou.x = (r.x0 + r.w - 3) * 16 + 8; rou.y = (r.y0 + 3) * 16 + 10; tick(2);
game.damageMob(fer, 99999, A, false); tick(20); game.damageMob(rou, 99999, B, false); tick(3);
ok(A.quests.freres_cote.p[0] === 1 && A.quests.freres_cote.p[1] === 1 && B.quests.freres_cote.p[1] === 1, 'les deux frères abattus : objectifs remplis pour les deux pirates');
// ---------- tenues
game.addItem(A, 'habit_royal', 1); const st0 = computeStats(30, A.eq).def;
game.equip(A, A.inv.findIndex((s) => s && s.id === 'habit_royal'));
const L = displayLook(A.base || {}, A.eq);
ok(A.eq.outfit === 'habit_royal' && L.hat === 'plume' && L.cape === 'red' && A.stats.def > st0 - 1 && A.ach.elegance, `tenue : allure (${L.top}/${L.hat}/${L.cape}) + défense ${A.stats.def}, haut fait`);
// couture à la Rade
const mann = W.props.find((p2) => p2.type === 'mannequin'); put(A, mann.x, mann.y + 20);
const tm0 = game.countItem(A, 'tenue_mousse'); A.gold += 500;
const soie = game.npcPos.get('madame_soie'); put(A, soie.x, soie.y + 20); game.buy(A, 'madame_soie', 'tenue_mousse');
ok(game.countItem(A, 'tenue_mousse') === tm0 + 1, 'tenue de mousse achetée chez la couturière');
// ---------- les nouveaux boss se battent sans erreur
for (const type of ['bourreau', 'reine_sirenes', 'general_os', 'docteur_corbeau', 'brasier', 'comte_vespere']) {
  const m = game.mobs.find((q) => q.type === type && q.state !== 'dead');
  if (!m) { ok(false, type + ' absent'); continue; }
  game.teleport(A, m.x + 50, m.y + 4); A.hp = A.stats.maxHp; A.invulnUntil = game.time + 9999; A.dead = false;
  evs.length = 0; tick(60);
  game.damageMob(m, m.maxHp * 0.4, A, false); tick(220); game.damageMob(m, m.maxHp * 0.3, A, false); tick(260); game.damageMob(m, m.maxHp * 0.2, A, false); tick(200);
  const kinds = [...new Set(evs.map((e) => e[0]))].filter((x) => ['cine', 'phase', 'tele', 'teleL', 'dash', 'proj', 'cloud', 'pull', 'shout'].includes(x));
  ok(evs.some((e) => e[0] === 'phase') && evs.some((e) => e[0] === 'tele' || e[0] === 'teleL'), `${type} : phases ${evs.filter((e) => e[0] === 'phase').map((e) => e[2]).join(',')} — ${kinds.join(' ')}`);
  game.damageMob(m, 99999, A, false);
}
ok(A.cnt && game.mobs.filter((m) => m.def.ship).length >= 10, `${game.mobs.filter((m) => m.def.ship).length} navires maudits en mer`);
// sauvegarde
game.save(A); const sv = store.get('anouk');
ok(sv.zs && sv.zs.includes(Z.RADE) && sv.cnt.ships === 1 && sv.eq.outfit === 'habit_royal', 'sauvegarde : îles visitées, navires coulés, tenue');
console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
