import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, canStand, Z } from '../shared/world.js';
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world;
const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} };
game.addClient(c); game.onMessage(c, { t: 'login', v: 14, name: 'Testeur', pass: 'abcd' });
await new Promise((r) => setTimeout(r, 20));
const p = game.sessions.get(c).player; p.level = 30; game.recalc(p); p.hp = p.stats.maxHp;
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const tick = (n) => { for (let i = 0; i < n; i++) game.tick(); };
const place = (x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); };
// une cible : un crabe isolé, placé devant le joueur
let spot = null;
for (let y = 104; y < 124 && !spot; y++) for (let x = 100; x < 130 && !spot; x++) { const px = x * 16 + 8, py = y * 16 + 10; if (zoneAt(W, px, py) === Z.BEACH && canStand(W, px, py) && canStand(W, px + 20, py)) spot = [px, py]; }
place(spot[0], spot[1]);
for (const m of game.mobs) if (Math.hypot(m.x - p.x, m.y - p.y) < 300 && !m.boss) { m.state = 'dead'; m.deadUntil = 1e9; }
const mob = game.addMob('drowned', spot[0] + 20, spot[1] + 6, true);
mob.x = spot[0] + 18; mob.y = spot[1] + 6; mob.hp = mob.maxHp = 5000; mob.room = p.room;
const equip = (id) => { game.addItem(p, id, 1); game.equip(p, p.inv.findIndex((s) => s && s.id === id)); };
p.level = 30; game.recalc(p); p.hp = p.stats.maxHp;
// saignement
equip('crochet'); game.time += 2;
let hp0 = mob.hp; game.onAttack(p, 0.3); const direct = hp0 - mob.hp;
tick(80);
ok(mob.hp < hp0 - direct, `crochet : coup ${direct}, puis saignement ${Math.round(hp0 - direct - mob.hp)}`);
// vol de vie
equip('trident'); game.time += 2; p.hp = 50; hp0 = mob.hp;
game.onAttack(p, 0.3);
ok(p.hp > 50, `trident : vol de vie (PV 50 -> ${Math.round(p.hp)})`);
// portée longue de la lance : la cible à 38 px
mob.x = p.x + 36; mob.y = p.y + 4; game.time += 2; hp0 = mob.hp; game.onAttack(p, 0.1);
ok(mob.hp < hp0, 'trident touche à 36 px');
equip('poignard'); mob.x = p.x + 36; game.time += 2; hp0 = mob.hp; game.onAttack(p, 0.1);
ok(mob.hp === hp0, 'poignard ne touche pas à 36 px');
mob.x = p.x + 18; mob.y = p.y + 6;
// rafale de la poivrière
equip('poivriere'); p.en = 200; game.time += 5;
const before = game.projs.length;
game.onSkill(p, { s: 'shot', a: 0.3 });
const n0 = game.projs.length - before; tick(8);
ok(n0 === 1, 'poivrière : 1er coup immédiat');
const events = []; const ev0 = game.ev.bind(game); game.ev = (x, y, e) => { if (e[0] === 'proj') events.push(e); ev0(x, y, e); };
game.time += 3; p.cds.shot = 0; p.en = 200; game.onSkill(p, { s: 'shot', a: 0.3 }); tick(12);
ok(events.length === 3, `poivrière : rafale de ${events.length} balles`);
// brûlure du crache-feu
equip('crache_feu'); game.time += 3; p.cds.shot = 0; p.en = 200; hp0 = mob.hp;
game.onSkill(p, { s: 'shot', a: Math.atan2(mob.y - 8 - (p.y - 9), mob.x - p.x) }); tick(6);
const afterHit = mob.hp; tick(60);
ok(mob.dots === undefined || mob.hp < afterHit, `crache-feu : brûlure ${Math.round(afterHit - mob.hp)} après l'impact`);
// explosion du mortier
equip('mortier_main'); game.time += 4; p.cds.shot = 0; p.en = 200;
const booms = []; game.ev = (x, y, e) => { if (e[0] === 'boom') booms.push(e); ev0(x, y, e); };
game.onSkill(p, { s: 'shot', a: Math.atan2(mob.y - 8 - (p.y - 9), mob.x - p.x) }); tick(30);
ok(booms.length === 1, `mortier : explosion (${booms.length})`);
// harpon perforant
equip('fusil_harpon'); const sh = game.projs.length; game.time += 4; p.cds.shot = 0; p.en = 200;
game.onSkill(p, { s: 'shot', a: 0 }); const pr = game.projs[game.projs.length - 1];
ok(pr && pr.pierce === 3 && pr.kind === 'harpoon', 'fusil-harpon : perce 3');
// cachette
const cache = W.props.find((q) => q.cache === 'crochet');
place(cache.x, cache.y + 14);
const has0 = game.countItem(p, 'crochet');
game.openProp(p, cache.id);
ok(game.countItem(p, 'crochet') === has0 + 1 && p.caches['i:crochet'], 'cachette du phare : crochet reçu');
game.openProp(p, cache.id);
ok(game.countItem(p, 'crochet') === has0 + 1, 'la cachette ne donne l’arme qu’une fois');
game.save(p); ok(store.get('testeur').caches['i:crochet'] === 1, 'cachettes sauvegardées');
// quête avec arme en récompense
p.quests.premier_pas = { s: 'done', p: [] }; p.quests.pinces = { s: 'done', p: [] };
const isa = game.npcPos.get('isa'); place(isa.x, isa.y + 20);
game.acceptQuest(p, 'acier_duel');
game.addItem(p, 'lame_rouillee', 4); game.addItem(p, 'dent_zombie', 6);
game.turnIn(p, 'acier_duel');
ok(game.countItem(p, 'rapiere') >= 1 && game.countItem(p, 'lame_rouillee') === 0, 'quête « Acier de duelliste » : rapière reçue, lames reprises');
// 0.8 : les armes s'achètent
const ysa = game.npcPos.get('ysaline'); place(ysa.x, ysa.y + 20); p.gold += 5000;
game.buy(p, 'ysaline', 'harpon');
ok(game.countItem(p, 'harpon') >= 1, 'harpon acheté au chantier de Havre');
console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
