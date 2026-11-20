// 1.0 : propriétés — deux au plus, revente, catégories, visite, coffre selon la catégorie, pièges, coffre-fort
import fs from 'fs/promises';
import { Game } from '../server/game.js';
import { FileStorage } from '../server/db.js';
import { PROPERTY, RESALE } from '../shared/data/craft.js';
import { zoneAt, roomIdAt } from '../shared/world.js';
const DIR = '.tmp/data_p10';
await fs.rm(DIR, { recursive: true, force: true });
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const st = new FileStorage(DIR); let game = new Game({ storage: st, log: () => {} });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (g, name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; g.addClient(c); g.onMessage(c, { t: 'login', v: 13, name, pass: 'abcd' }); await wait(250); const p = g.sessions.get(c).player; p.c = c; return p; };
const W = game.world;
ok(W.plots.length === 39 && W.plots.slice(29).every((pl) => PROPERTY[pl.cat]), `39 propriétés, dont 10 nouvelles : ${[...new Set(W.plots.map((p) => p.cat))].join(', ')}`);
const at = (g, p, k) => { const d = g.world.doors[g.world.plots[k].door]; p.x = d.ox; p.y = d.oy + 10; p.room = -1; p.zone = zoneAt(g.world, p.x, p.y); };
let A = await login(game, 'Bérangère'); A.gold = 100000; A.level = 30;
const manoir = W.plots.find((pl) => pl.cat === 'manoir').k, phare = W.plots.find((pl) => pl.cat === 'phare').k, ville = 0;
at(game, A, manoir); game.homeAction(A, 'info', manoir);
const deed = A.c.msgs.find((m) => m.t === 'deed'); ok(deed && deed.cat === 'manoir' && deed.price === PROPERTY.manoir.price && deed.risk > 0, `titre de propriété avant achat : ${deed && deed.name}, ${deed && deed.price} doublons, risque ${deed && deed.risk} %`);
game.homeAction(A, 'visit', manoir); ok(A.room === W.plots[manoir].room, 'visite libre du manoir avant achat');
at(game, A, manoir); game.homeAction(A, 'buy', manoir); ok(game.homes.get(manoir) && game.homes.get(manoir).key === A.key && A.gold === 100000 - PROPERTY.manoir.price, 'manoir acheté à son prix');
at(game, A, phare); game.homeAction(A, 'buy', phare); ok(game.homesOf(A.key).length === 2 && A.ach.notable, 'deuxième propriété : le phare (haut fait « Notable »)');
at(game, A, ville); game.homeAction(A, 'buy', ville); ok(!game.homes.has(ville) && A.c.msgs.some((m) => m.t === 'toast' && /déjà 2 propriétés/.test(m.msg || m.m || '')), 'une troisième : refusée (deux au plus)');
// coffre : la capacité dépend de la catégorie et des coffres supplémentaires
const H = game.homes.get(manoir); const r = W.rooms[W.plots[manoir].room];
A.x = (r.x0 + 3) * 16 + 8; A.y = (r.y0 + 3) * 16 + 8; A.room = W.plots[manoir].room;
ok(game.homeCap(H) === PROPERTY.manoir.store, `coffre du manoir : ${game.homeCap(H)} places`);
game.addItem(A, 'coffre_base', 1); const sl = A.inv.findIndex((s) => s && s.id === 'coffre_base'); game.place(A, sl, r.x0 + 6, r.y0 + 2);
ok(game.homeCap(H) === PROPERTY.manoir.store + 16, `un coffre supplémentaire : ${game.homeCap(H)} places`);
// pièges et coffre-fort, objets irremplaçables
game.addItem(A, 'piege_loup', 1); game.place(A, A.inv.findIndex((s) => s && s.id === 'piege_loup'), r.x0 + (r.w >> 1), r.y0 + r.h - 3);
game.addItem(A, 'coffre_fort', 1); game.place(A, A.inv.findIndex((s) => s && s.id === 'coffre_fort'), r.x0 + 8, r.y0 + 2);
ok(game.homeTraps(manoir).length === 1 && game.homeVault(manoir), 'piège à loup et coffre-fort installés');
for (let j = 0; j < 12; j++) H.storage[j] = { id: 'rhum_vieux', n: 5 };
H.storage[20] = { id: 'trophee_kraken', n: 1 }; H.storage[21] = { id: 'trophee_barbe', n: 1 };
const B = await login(game, 'Corentin'); B.gold = 50; game.addItem(B, 'crochets', 10); B.level = 30; game.recalc(B); B.hp = B.stats.maxHp;
let entered = 0, trapped = 0, stolen = [];
for (let k = 0; k < 40; k++) {
  at(game, B, manoir); B.cds.pick = 0; B.robbed = {}; H.burgledAt = 0; B.burgle = null; B.grabbedUntil = 0; B.hp = B.stats.maxHp; B.dead = false;
  const hp0 = B.hp; game.pickLock(B, manoir, true);
  if (B.room === W.plots[manoir].room) { entered++; if (B.hp < hp0) trapped++; const chest = [...game.structs.values()].find((s) => s.home === manoir && s.type === 'coffre'); const before = H.storage.map((c) => c && c.id + c.n).join(); game.burgleChest(B, chest); if (H.storage.map((c) => c && c.id + c.n).join() !== before) stolen.push(1); }
  if (!game.countItem(B, 'crochets')) game.addItem(B, 'crochets', 10);
}
ok(entered > 0 && game.burgleChance(H) < 0.75, `manoir gardé (piège, catégorie) : ${Math.round(game.burgleChance(H) * 100)} % de chances, ${entered} entrées sur 40 essais`);
ok(trapped > 0, `le piège a mordu ${trapped} fois`);
ok(H.storage.slice(0, 12).every((c) => c && c.n === 5) && H.storage[20] && H.storage[21], 'coffre-fort et trophées : rien de volé dans les places protégées ni d’irremplaçable');
// revente
for (let j = 0; j < H.storage.length; j++) H.storage[j] = null;
const g0 = A.gold; at(game, A, manoir); game.homeAction(A, 'sell', manoir);
ok(!game.homes.has(manoir) && A.gold - g0 === Math.floor(PROPERTY.manoir.price * RESALE) && game.countItem(A, 'coffre_fort') === 1, `manoir revendu : +${A.gold - g0} doublons (${Math.round(RESALE * 100)} %), mobilier rendu`);
// persistance : deux propriétés, sauvegarde, rechargement
at(game, A, ville); game.homeAction(A, 'buy', ville);
game.homes.get(ville).storage[3] = { id: 'rhum', n: 7 };
await Promise.resolve(game.saveAll()); await st.flush();
game = new Game({ storage: st, log: () => {} }); await wait(500);
ok(game.homesOf('bérangère').length === 2 && game.homes.get(ville).storage[3] && game.homes.get(ville).storage[3].n === 7 && game.homes.get(phare), 'après redémarrage : les deux propriétés et leur contenu');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK');
process.exit(0);
