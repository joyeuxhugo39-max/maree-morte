// 1.0 : réputation des lieux et taxes, carnet d'airs, invasions rares et annoncées
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, SAFE } from '../shared/world.js';
import { ITEMS } from '../shared/data/items.js';
import { NPCS } from '../shared/data/npcs.js';
import { placeOf, repLevel, sellPrice } from '../shared/data/places.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 12, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); };
const A = await login('Esteban');
// lieux
ok(placeOf(W, W.spawnPoint.x, W.spawnPoint.y) === 'port' && placeOf(W, W.libertalia.x * 16, W.libertalia.y * 16) === 'lib', 'chaque ville est reconnue');
const shopId = Object.keys(NPCS).find((k) => NPCS[k].shop && game.npcPos.get(k) && placeOf(W, game.npcPos.get(k).x, game.npcPos.get(k).y) === 'lib');
const np = game.npcPos.get(shopId); put(A, np.x, np.y + 12);
const item = NPCS[shopId].shop.find((k) => ITEMS[k].value >= 100) || NPCS[shopId].shop[0];
A.gold = 100000; let g0 = A.gold; game.buy(A, shopId, item);
ok(g0 - A.gold === ITEMS[item].value, `prix plein sans réputation (${ITEMS[item].name} : ${ITEMS[item].value})`);
A.rep.lib = 1000; g0 = A.gold; game.buy(A, shopId, item);
ok(g0 - A.gold === Math.ceil(ITEMS[item].value * 0.9), `Honoré à Libertalia : 10 % de remise (${g0 - A.gold})`);
const slot = A.inv.findIndex((s) => s && s.id === item); A.rep.lib = 0; g0 = A.gold; game.sell(A, slot);
ok(A.gold - g0 === sellPrice(ITEMS[item].value, 'lib', 0) && A.gold - g0 < Math.floor(ITEMS[item].value * 0.35), `taxe de Libertalia sur la vente (12 %) : ${A.gold - g0} au lieu de ${Math.floor(ITEMS[item].value * 0.35)}`);
// la réputation se gagne
const before = A.rep.port || 0;
const mob = game.mobs.find((m) => m.room < 0 && m.def.level >= 1 && !m.def.sea && placeOf(W, m.x, m.y) === 'port' && m.state !== 'dead');
A.level = 1; put(A, mob.x + 20, mob.y); game.damageMob(mob, 99999, A);
ok((A.rep.port || 0) > before, `abattre un mort près de Port-Lanterne : réputation ${before} → ${A.rep.port}`);
A.rep.port = 45; A.c.msgs.length = 0; game.addRep(A, 'port', 10);
ok(repLevel(A.rep.port) === 1 && A.c.msgs.some((m) => m.t === 'toast' && /Connu/.test(m.msg)), 'passer « Connu » : prévenu');
// carnet d'airs
ok(A.songs.has('day') && !A.songs.has('cite'), 'carnet : seul l’air de Port-Lanterne au départ');
game.onMessage(A.c, { t: 'song', k: 'cite' }); game.onMessage(A.c, { t: 'song', k: 'nimporte' });
ok(A.songs.has('cite') && !A.songs.has('nimporte'), 'un air entendu est noté ; un air inconnu est refusé');
game.save(A); ok(store.get('esteban').songs.includes('cite') && store.get('esteban').rep.port > 0, 'réputation et carnet sauvegardés');
// invasion
game.eventTick(); ok(game.nextEventAt - game.time >= 7200, 'la prochaine invasion est dans deux heures au moins');
const r = game.startWorldEvent('rade', false);
ok(r.ok && game.wevt && !SAFE.has(zoneAt(W, game.wevt.x, game.wevt.y)) && A.c.msgs.some((m) => m.t === 'wevt' && m.place === 'rade'), `invasion annoncée vers la Rade (débarquement hors de la ville)`);
ok(game.startWorldEvent('port', false).err, 'une seule invasion à la fois');
put(A, game.wevt.x + 10, game.wevt.y); A.level = 10; game.recalc(A); A.dead = false;
game.time = game.wevt.startAt + 0.1; game.eventTick();
ok(game.wevt.wave === 1 && game.wevt.mobs.length >= 8, `vague 1 : ${game.wevt.mobs.length} morts débarquent`);
const kill = () => { for (const m of game.wevt.mobs) if (m.state !== 'dead') game.damageMob(m, 999999, A); };
kill(); game.time += 1; game.eventTick(); kill(); game.time += 1; game.eventTick();
ok(game.wevt.wave === 3 && game.wevt.mobs.some((m) => m.captain && m.state !== 'dead'), 'vague 3 : le capitaine débarque');
const gold0 = A.gold, rep0 = A.rep.rade || 0; kill(); game.time += 1; game.eventTick();
ok(!game.wevt && A.gold > gold0 && (A.rep.rade || 0) >= rep0 + 60 && A.ach.defenseur, 'victoire : or, réputation de la Rade, haut fait');
ok(game.mobs.every((m) => !m.event || m.state === 'dead'), 'plus aucun envahisseur');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
