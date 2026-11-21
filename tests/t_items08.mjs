// 0.8 : montures, voyages, potions, armes à effets
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, canStand, Z, blocksShot } from '../shared/world.js';
import { ITEMS } from '../shared/data/items.js';
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world;
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const mk = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 15, name, pass: 'abcd' }); await new Promise((r) => setTimeout(r, 20)); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); p.moveBudget = 0; };
const evs = []; const ev0 = game.ev.bind(game); game.ev = (x, y, e) => { evs.push(e); ev0(x, y, e); };
const tick = (s) => { for (let i = 0; i < Math.round(s * 20); i++) game.tick(); };
const A = await mk('Anouk'); A.level = 30; game.recalc(A); A.hp = A.stats.maxHp; A.gold = 100000;
const eq = (id) => { for (let k = 0; k < A.inv.length; k++) if (A.inv[k] && ITEMS[A.inv[k].id].slot) A.inv[k] = null; game.addItem(A, id, 1); game.equip(A, A.inv.findIndex((s) => s && s.id === id)); if (A.eq[ITEMS[id].slot] !== id) console.log('   (équipement refusé : ' + id + ')'); };
// une prairie calme, hors de la ville
const clearAround = (m) => { for (let dx = -90; dx <= 90; dx += 4) for (const dy of [-12, -4, 4, 12]) if (blocksShot(W, m.x + dx, m.y + dy) || !canStand(W, m.x + dx, m.y + dy)) return false; return true; };
const mob = (type) => game.mobs.find((m) => m.type === type && m.state !== 'dead' && m.room === -1 && clearAround(m)) || game.mobs.find((m) => m.type === type && m.state !== 'dead' && m.room === -1);
const crab = mob('zsailor'); put(A, crab.sx + 30, crab.sy);
// ---------- monture
const walk = A.stats.speed;
game.toggleRide(A); ok(!A.riding, 'sans monture : refus');
eq('cheval'); A.lastHurt = -99; game.toggleRide(A);
ok(A.riding && A.stats.speed === Math.round(walk * 1.6), `à cheval : vitesse ${walk} → ${A.stats.speed}`);
const meta = game.entMeta(A, 'p'); ok(meta.rd === 'cheval', 'les autres voient le cheval');
game.onAttack(A, 0); ok(!A.riding, 'on descend de cheval pour frapper');
A.cds.slash = 0; game.toggleRide(A); game.onDoor(A, W.doors[0].id, false); ok(!A.riding, 'on descend pour entrer dans une maison');
eq('tortue_geante'); A.lastHurt = -99; const d0 = A.stats.def; game.toggleRide(A); ok(A.riding && A.stats.def === d0 + 14, `tortue : défense ${d0} → ${A.stats.def}`); game.dismount(A);
// ---------- potions
const atk0 = A.stats.atk; game.addItem(A, 'potion_force', 1); game.useSlot(A, A.inv.findIndex((s) => s && s.id === 'potion_force'));
ok(A.stats.atk === Math.round(atk0 * 1.2) || Math.abs(A.stats.atk - atk0 * 1.2) <= 1, `potion du taureau : attaque ${atk0} → ${A.stats.atk}`);
game.time += 61; game.updateBuffs(A); ok(A.stats.atk === atk0, 'l’effet s’épuise au bout d’une minute');
A.dots = [{ kind: 'p', left: 50, dps: 10, src: 0 }]; game.addItem(A, 'antidote', 1); A.cds.food = 0; game.useSlot(A, A.inv.findIndex((s) => s && s.id === 'antidote'));
ok(!A.dots.length, 'l’antidote soigne le poison');
// ---------- conque de rappel
game.addItem(A, 'conque_rappel', 1); game.useSlot(A, A.inv.findIndex((s) => s && s.id === 'conque_rappel'));
ok(A.recallAt > 0, 'la conque résonne');
game.damagePlayer(A, 5, null); ok(!A.recallAt, 'un coup l’interrompt');
A.invulnUntil = 0; game.useSlot(A, A.inv.findIndex((s) => s && s.id === 'conque_rappel')); game.time += 3.1; game.updateBuffs(A);
ok(Math.hypot(A.x - W.spawnPoint.x, A.y - W.spawnPoint.y) < 40 && game.countItem(A, 'conque_rappel') === 0, `rappel réussi : de retour en ville (à ${Math.round(Math.hypot(A.x - W.spawnPoint.x, A.y - W.spawnPoint.y))} px, conques : ${game.countItem(A, 'conque_rappel')}, rappel ${A.recallAt})`);
// ---------- fumigène
put(A, crab.sx + 30, crab.sy); crab.state = 'chase'; crab.target = A.id;
game.addItem(A, 'fumigene', 1); game.useSlot(A, A.inv.findIndex((s) => s && s.id === 'fumigene'));
ok(crab.target !== A.id && !game.mobCanTarget(crab, A), 'fumigène : les morts perdent votre trace');
game.time += 7; ok(game.mobCanTarget(crab, A), 'six secondes plus tard, ils vous voient de nouveau');
// ---------- armes de mêlée
const fresh = (type = "zsailor") => { const m = mob(type); m.sunproof = 1; m.buried = false; m.maxHp = 999999; m.hp = m.maxHp; m.state = 'idle'; m.slowUntil = m.stunUntil = m.fearUntil = m.curseUntil = m.frostUntil = 0; m.dots = []; put(A, m.x - 18, m.y); A.cds.slash = 0; return m; };
const hit = (id, m) => { eq(id); A.cds.slash = 0; game.onAttack(A, Math.atan2(m.y - 6 - (A.y - 8), m.x - A.x)); };
let m = fresh(); hit('fouet', m); ok(m.slowUntil > game.time && m.slowMul < 0.7, 'fouet : la cible ralentit');
m = fresh(); hit('sabre_givre', m); ok(m.frostUntil > game.time, 'sabre de givre : la cible gèle');
m = fresh(); for (let k = 0; k < 3; k++) hit('dague_venin', m); ok((m.dots || []).filter((d) => d.kind === 'p').length === 3, 'dague du serpent : trois doses de poison cumulées');
m = fresh(); let stunned = false; for (let k = 0; k < 30 && !stunned; k++) { m.hp = m.maxHp; put(A, m.x - 18, m.y); hit('marteau_pont', m); stunned = m.stunUntil > game.time; } ok(stunned, 'marteau de pont : étourdit');
m = fresh(); let feared = false; for (let k = 0; k < 30 && !feared; k++) { m.hp = m.maxHp; put(A, m.x - 18, m.y); hit('baton_vaudou', m); feared = m.fearUntil > game.time; } ok(feared && m.curseUntil > game.time, 'bâton du houngan : maudit et fait fuir');
m = fresh('zsailor'); const others = game.mobs.filter((q) => q !== m && q.state !== 'dead' && q.room === -1).slice(0, 2);
for (const [k, q] of others.entries()) { q.sunproof = 1; q.x = m.x + 20 + k * 20; q.y = m.y + 10; q.maxHp = 999999; q.hp = q.maxHp; }
evs.length = 0; hit('trident_orage', m); ok(evs.filter((e) => e[0] === 'zap').length >= 1, `trident de l’orage : la foudre saute (${evs.filter((e) => e[0] === 'zap').length} arcs)`);
m = fresh(); m.hp = Math.round(m.maxHp * 0.2); eq('lame_executrice'); A.stats.crit = 0; const hp0 = m.hp; evs.length = 0; A.cds.slash = 0; game.onAttack(A, Math.atan2(m.y - 6 - (A.y - 8), m.x - A.x));
const dmgE = evs.find((e) => e[0] === 'dmg' && e[1] === m.id); ok(dmgE && dmgE[2] >= A.stats.atk * 0.9 * 1.8 - 2, `lame de l’exécuteur : ${dmgE && dmgE[2]} dégâts sur une cible affaiblie (attaque ${A.stats.atk})`);
// ---------- tirs
const shoot = (id, m) => { eq(id); A.cds.shot = 0; A.en = 999; game.onSkill(A, { s: 'shot', a: Math.atan2(m.y - 8 - (A.y - 9), m.x - A.x) }); };
m = fresh(); put(A, m.x - 60, m.y); evs.length = 0; shoot('lance_grappin', m); tick(0.5);
ok(Math.hypot(m.x - A.x, m.y - A.y) < 40, `lance-grappin : le mort est ramené (${Math.round(Math.hypot(m.x - A.x, m.y - A.y))} px)`);
m = fresh(); put(A, m.x - 70, m.y); evs.length = 0; shoot('boomerang', m); tick(2.5);
const pv = evs.filter((e) => e[0] === 'pv').length, pd = evs.some((e) => e[0] === 'pd');
ok(pv >= 1 && pd, `boomerang : il revient dans la main (${pv} virages)`);
m = fresh(); const m2 = others[0]; m2.x = m.x + 40; m2.y = m.y + 30; m2.hp = m2.maxHp; put(A, m.x - 60, m.y); evs.length = 0; shoot('pistolet_ricochet', m); tick(1);
ok(evs.some((e) => e[0] === 'pv'), 'pistolet à ricochet : la balle rebondit');
const vaudouOk = () => evs.some((e) => e[0] === 'pv') && evs.some((e) => e[0] === 'dmg' && game.mobs.some((q) => q.id === e[1]));
for (let tr = 0; tr < 3 && (tr === 0 || !vaudouOk()); tr++) { m = fresh(); put(A, m.x - 80, m.y - 40); evs.length = 0; eq('mousquet_vaudou'); A.cds.shot = 0; A.en = 999; game.onSkill(A, { s: 'shot', a: 0 }); tick(1.5); } // trois tirs au plus : un obstacle tiré au hasard peut arrêter la balle
ok(vaudouOk(), 'mousquet vaudou : la balle tourne et trouve sa cible');
// la balle doit d'abord toucher (un monstre tiré au hasard peut être derrière un obstacle) : trois tirs au plus
for (let tr = 0; tr < 3 && !evs.some((e) => e[0] === 'zap'); tr++) { m = fresh(); put(A, m.x - 50, m.y); evs.length = 0; shoot('pistolet_tonnerre', m); for (const [k, q] of others.entries()) { q.x = m.x + 18 + k * 18; q.y = m.y + 8; q.room = m.room; q.state = 'idle'; q.hp = q.maxHp = 99999; q.under = false; q.buried = false; } tick(0.6); }
ok(evs.some((e) => e[0] === 'zap'), 'pistolet-tonnerre : éclairs en chaîne');
// ---------- sabre de Midas : de l'or
m = fresh(); eq('sabre_midas'); let gold = false; for (let k = 0; k < 150 && !gold; k++) { m.hp = m.maxHp * 10; A.cds.slash = 0; game.time += 1; put(A, m.x - 18, m.y); game.onAttack(A, Math.atan2(m.y - 6 - (A.y - 8), m.x - A.x)); gold = [...game.drops.values()].some((d) => d.item === 'or' && d.owner === A.id); }
ok(gold, 'sabre de Midas : il fait tomber de l’or');
// ---------- tout s'affiche : chaque nouvel objet a un prix et une description
const neu = ['fouet', 'dague_venin', 'marteau_pont', 'sabre_givre', 'lance_cavalerie', 'baton_vaudou', 'trident_orage', 'lame_executrice', 'sabre_midas', 'sarbacane', 'boomerang', 'lance_grappin', 'tromblon_sel', 'pistolet_ricochet', 'pistolet_givre', 'pistolet_tonnerre', 'mousquet_vaudou', 'ane', 'cheval', 'tortue_geante', 'crabe_geant', 'autruche', 'pur_sang', 'destrier_squelette', 'radeau', 'goelette', 'galion', 'conque_rappel', 'longue_vue', 'fumigene'];
ok(neu.every((id) => ITEMS[id] && ITEMS[id].value > 0 && ITEMS[id].desc), `${neu.length} nouveaux objets complets`);
console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUT EST OK');
process.exit(fails ? 1 : 0);
