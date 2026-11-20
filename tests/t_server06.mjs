import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, canStand, canSail, Z } from '../shared/world.js';
import { HOME_PRICE } from '../shared/data/craft.js';
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world;
const mk = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 13, name, pass: 'abcd' }); await new Promise((r) => setTimeout(r, 20)); const p = game.sessions.get(c).player; p.c = c; return p; };
const A = await mk('Alice'), B = await mk('Barbe');
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const tick = (n) => { for (let i = 0; i < n; i++) game.tick(); };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); p.moveBudget = 0; };
const last = (p, t) => [...p.c.msgs].reverse().find((m) => m.t === t);
const evs = []; const ev0 = game.ev.bind(game); game.ev = (x, y, e) => { evs.push(e); ev0(x, y, e); };
for (const p of [A, B]) { p.level = 12; game.recalc(p); p.hp = p.stats.maxHp; }
// ---------- maisons
const pl = W.plots[0], d = W.doors[pl.door];
put(A, d.ox, d.oy + 4);
game.onDoor(A, d.id, false);
ok(A.room === -1, 'maison à vendre : porte fermée');
A.gold = HOME_PRICE + 50; game.homeAction(A, 'buy', 0);
ok(game.homes.get(0) && game.homes.get(0).name === 'Alice' && A.gold === 50 && A.ach.proprietaire, 'achat de la maison n° 1');
ok(last(A, 'homes').list.length === 1, 'liste des maisons diffusée');
A.cds.door = 0; game.onDoor(A, d.id, false);
ok(A.room === pl.room, 'la propriétaire entre chez elle');
const r = W.rooms[pl.room];
game.addItem(A, 'coffre_base', 1); game.addItem(A, 'table_bois', 1); game.addItem(A, 'lit', 1); game.addItem(A, 'chaton', 1); game.addItem(A, 'chien', 1);
const slot = (p, id) => p.inv.findIndex((s) => s && s.id === id);
game.place(A, slot(A, 'coffre_base'), r.x0 + 1, r.y0 + 1);
game.place(A, slot(A, 'table_bois'), r.x0 + 3, r.y0 + 1);
game.place(A, slot(A, 'lit'), r.x0 + 5, r.y0 + 1);
game.place(A, slot(A, 'chien'), r.x0 + 7, r.y0 + 2);
ok(game.homes.get(0).count === 5, `meubles posés (${game.homes.get(0).count}, dont le coffre offert)`);
game.addItem(A, 'table_bois', 1); game.place(A, slot(A, 'table_bois'), r.x0 + (r.w >> 1), r.y0 + r.h - 1);
ok(game.homes.get(0).count === 5, 'entrée gardée libre');
put(A, (r.x0 + 1) * 16 + 8, (r.y0 + 2) * 16 + 10);
game.structInteract(A, r.x0 + 1, r.y0 + 1);
ok(last(A, 'stor'), 'coffre de la maison ouvert');
game.addItem(A, 'rhum', 6); game.chestAction(A, 'put', slot(A, 'rhum'));
ok(game.homes.get(0).storage.some((s) => s && s.id === 'rhum'), 'rhum rangé dans le coffre de la maison');
game.useSlot(A, slot(A, 'chaton')); ok(A.pet === 'chat', 'le chaton suit sa maîtresse');
game.addItem(A, 'serrure_renforcee', 1); game.useSlot(A, slot(A, 'serrure_renforcee')); ok(game.homes.get(0).lock === 1, 'serrure renforcée posée');
// ---------- cambriolage
put(B, d.ox, d.oy + 4);
B.cds.door = 0; game.onDoor(B, d.id, false); ok(B.room === -1, 'maison d’Alice fermée à clé pour Barbe');
game.pickLock(B, 0, true); ok(last(B, 'toast') && /crochets/.test(last(B, 'toast').m || last(B, 'toast').text || JSON.stringify(last(B, 'toast'))), 'sans crochets : refus');
game.addItem(B, 'crochets', 30);
let tries = 0; while (B.room === -1 && tries++ < 40) { B.cds.pick = 0; game.pickLock(B, 0, true); }
ok(B.room === pl.room && B.burgle, `porte crochetée après ${tries} essai(s)`);
put(B, (r.x0 + 1) * 16 + 8, (r.y0 + 2) * 16 + 10);
const rhum0 = game.countItem(B, 'rhum'); game.structInteract(B, r.x0 + 1, r.y0 + 1);
ok(game.countItem(B, 'rhum') === rhum0 + 3 && B.ach.cambrioleur, `butin : ${game.countItem(B, 'rhum') - rhum0} rhum volé (moitié de 6)`);
game.structInteract(B, r.x0 + 1, r.y0 + 1); ok(game.countItem(B, 'rhum') === rhum0 + 3, 'une seule fouille');
game.time += 41; tick(6); ok(B.room === -1 && !B.burgle, 'le voleur est expulsé après 40 s');
B.cds.pick = 0; game.pickLock(B, 0, true); ok(B.room === -1, 'maison protégée après un cambriolage');
// persistance (mode non persistant : la maison suit le joueur)
game.save(A); const sv = store.get('alice'); const hm = Array.isArray(sv.home) ? sv.home[0] : sv.home; ok(hm && hm.s.length === 5 && hm.storage.some(Boolean), 'maison sauvegardée avec le joueur');
// ---------- sceau des Jumeaux
const tw = W.twin, td = W.doors[tw.door];
put(A, td.ox, td.oy + 6); A.cds.door = 0; game.onDoor(A, td.id, false); ok(A.room === -1, 'sanctuaire scellé');
put(A, tw.plates[0].x, tw.plates[0].y); tick(6); ok(game.seals.jumeaux < game.time, 'une seule dalle : rien');
put(B, tw.plates[1].x, tw.plates[1].y); tick(6); ok(game.seals.jumeaux > game.time && A.ach.jumeaux && B.ach.jumeaux, 'deux dalles, deux pirates : le sceau s’ouvre');
put(A, td.ox, td.oy + 6); A.cds.door = 0; game.onDoor(A, td.id, false); ok(A.room === tw.room, 'entrée dans le sanctuaire');
const twin = W.props.filter((q) => q.twin); ok(twin.length === 2, 'deux coffres jumeaux');
put(A, twin[0].x, twin[0].y + 14); game.openProp(A, twin[0].id); ok(game.countItem(A, twin[0].cache) === 1, `coffre jumeau : ${twin[0].cache}`);
// ---------- boss à phases
const boss = game.mobs.find((m) => m.type === 'crabroi');
put(A, boss.x + 60, boss.y); put(B, 2000, 1800);
for (const m of game.mobs) if (m !== boss && Math.hypot(m.x - A.x, m.y - A.y) < 400) { m.state = 'dead'; m.deadUntil = 1e9; }
evs.length = 0; tick(4);
ok(evs.some((e) => e[0] === 'cine' && e[1] === 'boss'), 'cinématique d’entrée du Crabe-Roi');
tick(60); A.hp = A.stats.maxHp;
game.damageMob(boss, boss.maxHp * 0.55, A, false); evs.length = 0; tick(3);
ok(evs.some((e) => e[0] === 'phase' && e[2] === 1), 'phase 2 à 50 % de vie');
A.invulnUntil = game.time + 99; tick(400);
ok(evs.some((e) => e[0] === 'shield') && evs.some((e) => e[0] === 'dash') && evs.some((e) => e[0] === 'teleL'), 'carapace, charge et bande d’alerte');
game.damageMob(boss, 99999, A, false);
ok(evs.some((e) => e[0] === 'cine' && e[1] === 'bossdown'), 'cinématique de mort');
// tous les boss : quelques secondes de combat sans erreur
for (const type of ['boss', 'roi_squelette', 'goule_alpha', 'capitaine_noye']) {
  let m = game.mobs.find((q) => q.type === type && q.state !== 'dead');
  if (!m) { m = game.addMob(type, A.x + 50, A.y, true); }
  put(A, m.x + 50, m.y + 4); A.hp = A.stats.maxHp; A.invulnUntil = game.time + 999; A.dead = false;
  evs.length = 0; tick(60);
  game.damageMob(m, m.maxHp * 0.45, A, false); tick(200); game.damageMob(m, m.maxHp * 0.3, A, false); tick(400);
  const kinds = [...new Set(evs.map((e) => e[0]))].filter((k) => ['cine', 'phase', 'tele', 'teleL', 'dash', 'leap', 'howl', 'shield', 'proj'].includes(k));
  ok(evs.some((e) => e[0] === 'phase'), `${type} : phases ${evs.filter((e) => e[0] === 'phase').map((e) => e[2]).join(',')} — ${kinds.join(' ')}`);
  game.damageMob(m, 99999, A, false);
}
// ---------- Kraken
const K = W.kraken;
game.addItem(A, 'sloop', 1); game.addItem(A, 'conque_abysses', 1);
put(A, K.x + 150, K.y); A.boat = 'sloop'; A.zone = zoneAt(W, A.x, A.y); A.invulnUntil = 0;
ok(A.zone === Z.GOUFFRE && canSail(W, A.x, A.y), 'à bord, au-dessus du Gouffre');
A.c.msgs.length = 0; evs.length = 0;
game.useSlot(A, slot(A, 'conque_abysses'));
ok(game.kraken && last(A, 'cine') && last(A, 'cine').id === 'kraken' && game.allies.length === 1, 'la conque appelle le Kraken : cinématique + Goéland');
tick(70); ok(game.allies.length === 1 && game.allies[0].sink, 'le Goéland coule');
tick(40); ok(game.kraken.mob && game.kraken.mob.maxHp === 3500, 'le Kraken émerge (3500 PV en solo)');
tick(80); ok(game.kraken.tents.length === 4 && game.allies.some((a) => a.name === 'La Mouette Écarlate'), 'quatre tentacules + la Mouette Écarlate');
const snap = last(A, 's'); ok(A.c.msgs.some((m) => m.t === 's' && m.n && m.n.some((e) => e.k === 'a')), 'navire allié dans les instantanés');
const km = game.kraken.mob; A.invulnUntil = game.time + 9999;
tick(300); ok(evs.some((e) => e[0] === 'ink') && evs.some((e) => e[0] === 'slam'), 'encre + frappes de tentacules');
ok(km.hp < km.maxHp, `la Mouette canonne le Kraken (${km.maxHp - km.hp} dégâts)`);
game.damageMob(km, km.hp - km.maxHp * 0.6, A, false); tick(400);
ok(evs.some((e) => e[0] === 'phase' && e[1] === km.id && e[2] === 1) && evs.some((e) => e[0] === 'pull'), 'phase 2 : tourbillon');
put(A, game.kraken.tents[0].x + 20, game.kraken.tents[0].y); A.boat = 'sloop'; tick(300);
ok(evs.some((e) => e[0] === 'grab'), 'une tentacule saisit le navire');
game.damageMob(km, km.hp - km.maxHp * 0.3, A, false); tick(700);
ok(evs.some((e) => e[0] === 'dive') && evs.some((e) => e[0] === 'emerge') && evs.some((e) => e[0] === 'teleL' && e[7] === 9), 'phase 3 : plongée, vague');
km.under = 0; game.damageMob(km, 99999, A, false);
ok(!game.kraken && A.ach.kraken && evs.some((e) => e[0] === 'cine' && e[1] === 'krakendown'), 'Kraken vaincu : haut fait + cinématique');
tick(5); ok(!game.mobs.some((m) => m.def.sea && m.state !== 'dead'), 'tentacules retirées');
ok([...game.drops.values()].some((dr) => dr.item === 'tentacule_fumee'), 'butin du Kraken au sol');
console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
