// 1.8 : la refonte de Port-Lanterne, de bout en bout.
//  1. le monde : les quartiers, les bâtiments, les gens, le quai continu, les accès, les points d'épreuve du festival et
//     du braquage, le quai d'amarrage, la mer navigable au départ du port ;
//  2. le calendrier des événements : déterministe, varié, avec ses heures, et la place laissée à la fête ;
//  3. l'apparition : 20 pirates qui arrivent ensemble, 20 qui reviennent de la mort, les anciennes sauvegardes ;
//  4. les événements interactifs : décharger le navire marchand, arrêter le voleur, les gens de passage ;
//  5. les nouveaux marchands, la charpentière (réparer, armer), et la sauvegarde (rien de nouveau n'y entre).
import { Game } from '../server/game.js';
import { PROTOCOL, TILE } from '../shared/constants.js';
import { canStand, zoneAt, Z } from '../shared/world.js';
import { NPCS } from '../shared/data/npcs.js';
import { ITEMS } from '../shared/data/items.js';
import { BERTHS, findBerth, shipOf, berthOfPlace } from '../shared/data/ships.js';
import { portEventAt, portKindOf, portFind, portNpcAt, PORT_KINDS, PORT_ROUTES, PORT_SPOTS, SHIP, THIEF, thiefAt, PORT_PERIOD } from '../shared/port-events.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, P = W.port, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name, data) => {
  if (data) store.set(name.toLowerCase(), data);
  const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} };
  game.addClient(c); game.onMessage(c, { t: 'login', v: PROTOCOL, name, pass: 'abcd' }); await wait(40);
  const s = game.sessions.get(c); const p = s && s.player; if (p) { p.c = c; p.tut = 99; } return p;
};
const say = (p, m) => game.onMessage(p.c, m);
const tick = (n) => { for (let i = 0; i < n; i++) game.tick(); };
const toasts = (p, n0) => p.c.msgs.slice(n0).filter((m) => m.t === 'toast').map((m) => m.msg).join(' | ');
game.fs.force = 'closed'; tick(12); // la fête fermée : tous les événements du port sont possibles

// ---------------------------------------------------------------- 1. le monde
const names = P.blocks.map((b) => b.name);
ok(P.blocks.length >= 11 && ['La Voilerie Grand-Largue', 'Le Cabinet du Cartographe', 'Le Comptoir de Zélie', 'Chantier naval de Port-Lanterne', 'Tonnellerie Cercle-de-Fer', 'La Corderie du Levant', 'Capitainerie de Port-Lanterne'].every((n) => names.includes(n)), `${P.blocks.length} bâtiments neufs, dont les échoppes, le chantier et la capitainerie`);
const pl = W.npcs.filter((n) => n.pl);
ok(pl.length === 12 && pl.every((n) => NPCS[n.id] && NPCS[n.id].name), `${pl.length} habitants nommés ajoutés (et définis)`);
const shopBad = pl.flatMap((n) => (NPCS[n.id].shop || []).filter((i) => !ITEMS[i]).map((i) => n.id + ':' + i));
ok(!shopBad.length, 'leurs boutiques ne vendent que des objets qui existent' + (shopBad.length ? ' — ' + shopBad.join(' ') : ''));
const sold = new Map(); for (const [id, N] of Object.entries(NPCS)) if (!pl.some((n) => n.id === id)) for (const i of N.shop || []) sold.set(i, (sold.get(i) || 0) + 1);
const fresh = pl.flatMap((n) => (NPCS[n.id].shop || []).filter((i) => !sold.has(i)));
ok(!fresh.length, 'aucun objet n’y est nouveau : tout se vendait déjà ailleurs, au même prix (pas d’économie nouvelle)' + (fresh.length ? ' — ' + fresh.join(' ') : ''));
const npcStand = pl.filter((n) => !NPCS[n.id].ev).filter((n) => !canStand(W, n.x, n.y));
ok(!npcStand.length, 'chaque nouvel habitant se tient sur une case praticable' + (npcStand.length ? ' — ' + npcStand.map((n) => n.id).join(' ') : ''));
let quayOk = 0; for (let x = 128; x <= 172; x++) if (canStand(W, x * TILE + 8, 119 * TILE + 8)) quayOk++;
ok(quayOk >= 40, `le quai de pierre est continu de la halle aux poissons au Levant (${quayOk}/45 cases praticables au milieu)`);
let deepEdge = 0; for (let x = 128; x <= 172; x++) if (x < 149 || x > 151) deepEdge += W.tiles[121 * W.W + x] === 0 ? 1 : 0;
ok(deepEdge === 42, 'sous le quai, un mur sur l’eau profonde (et la jetée du milieu passe toujours)');
const fsBad = W.fest.spots.filter((s) => s.room === -1 && !canStand(W, s.x, s.y)), hsBad = W.heist.spots.filter((s) => (s.room == null || s.room === -1) && !canStand(W, s.x, s.y));
ok(!fsBad.length && !hsBad.length, 'les points d’épreuve de la fête et du braquage restent praticables');
const inTownMobs = W.spawns.filter((m) => zoneAt(W, m.x, m.y) === Z.TOWN);
ok(!inTownMobs.length, `aucun mort n’apparaît dans les nouveaux quartiers (${W.spawns.filter((m) => m.moved).length} points d’apparition de la plage reculés vers l’ouest)`);
for (const kind of ['barque', 'sloop', 'brick', 'galion']) { const b = findBerth(W, shipOf(kind), BERTHS[0], []); ok(!!b, `un ${kind} trouve sa place au quai d’amarrage de Port-Lanterne`); }
// les trajets des événements, praticables de bout en bout
const routeBad = [];
for (const [k, pts] of Object.entries(PORT_ROUTES)) { if (!Array.isArray(pts[0])) continue; for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4); for (let j = 0; j <= n; j++) if (!canStand(W, x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n)) { routeBad.push(k); break; } } }
ok(!routeBad.length, 'les trajets du voleur, du colporteur, de l’équipage et des dockers sont praticables' + (routeBad.length ? ' — ' + [...new Set(routeBad)].join(' ') : ''));

// ---------------------------------------------------------------- 2. le calendrier
const cnt = {}; for (let c = 0; c < 600; c++) { const k = portKindOf(c); cnt[k] = (cnt[k] || 0) + 1; }
ok(Object.keys(PORT_KINDS).every((k) => cnt[k] > 10) && cnt.null > 120 && cnt.null < 330, `varié et pas systématique : ${Object.entries(cnt).map(([k, v]) => k + ' ' + v).join(', ')}`);
let same = 0; for (let c = 1; c < 600; c++) if (portKindOf(c) && portKindOf(c) === portKindOf(c - 1)) same++;
ok(same === 0, 'jamais deux fois de suite le même événement');
const fk = new Set(); for (let c = 0; c < 600; c++) fk.add(portKindOf(c, true));
ok(!fk.has('musique') && !fk.has('colporteur') && !fk.has('voleur') && fk.has('navire'), 'pendant la fête : ni musiciens, ni colporteur, ni voleur ; le port marchand continue');
let det = true; for (let t = 0; t < 30000; t += 37) { const a = portEventAt(t), b = portEventAt(t); if (JSON.stringify(a) !== JSON.stringify(b)) det = false; }
ok(det, 'le calendrier est déterministe (le serveur et chaque client voient le même événement au même moment)');
const tN = portFind('navire', 50000); ok(tN != null && portEventAt(tN + 1).k === 'navire' && !portNpcAt('negociante_pl', tN + 1) && !!portNpcAt('negociante_pl', tN + SHIP.arrive + 10), 'la négociante n’est sur le quai qu’une fois le navire amarré');

// ---------------------------------------------------------------- 3. l'apparition
const crowd = []; for (let k = 0; k < 20; k++) crowd.push(await login('Mousse' + k));
const pos = crowd.map((p) => [p.x, p.y]);
let minD = 1e9; for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) minD = Math.min(minD, Math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1]));
ok(crowd.every((p) => canStand(W, p.x, p.y)), '20 nouveaux pirates arrivent tous sur une case praticable');
ok(minD >= 16, `et jamais l’un sur l’autre (au plus près : ${Math.round(minD)} px)`);
const spots = new Set(crowd.map((p) => Math.round(p.x) + ',' + Math.round(p.y)));
ok(spots.size >= 18, `${spots.size} points d’arrivée différents pour 20 pirates`);
const lanes = (p) => { const x = Math.floor(p.x / TILE), y = Math.floor(p.y / TILE); return (x >= 148 && x <= 152 && y >= 100) || (y >= 96 && y <= 98 && (x <= 143 || x >= 157)); };
ok(!crowd.some(lanes), 'aucun n’apparaît au milieu des grandes rues (avenue du port, Grand-Rue, rue du Levant)');
for (const p of crowd) { p.hp = 0; p.dead = true; p.deathAt = game.time - 5; }
for (const p of crowd) say(p, { t: 'respawn' });
let minR = 1e9; for (let i = 0; i < crowd.length; i++) for (let j = i + 1; j < crowd.length; j++) minR = Math.min(minR, Math.hypot(crowd[i].x - crowd[j].x, crowd[i].y - crowd[j].y));
ok(crowd.every((p) => !p.dead && canStand(W, p.x, p.y) && zoneAt(W, p.x, p.y) === Z.TOWN), '20 pirates revenus de la mort en même temps : tous debout, en ville, sur une case praticable');
ok(minR >= 16, `et répartis autour de la Flamme (au plus près : ${Math.round(minR)} px)`);
for (const p of crowd) game.logout(p);
// les anciennes sauvegardes : au vieux point unique (une mort), dans un mur neuf, ou ailleurs (gardé)
const base = (x, y) => ({ name: 'x', look: {}, level: 3, xp: 0, gold: 50, hp: 40, inv: [], eq: {}, quests: {}, x, y, sv: 10 });
const old = W.spawnPoint;
const A = await login('Ancienne', base(old.x + 5, old.y - 2));
ok(A && W.spawnPoints.some((s) => s.x === A.x && s.y === A.y), 'une sauvegarde au vieux point d’arrivée repart d’un des nouveaux points');
const wall = P.blocks.find((b) => b.name === 'La Voilerie Grand-Largue');
const Bp = await login('Emmuree', base((wall.x + 2) * TILE + 8, (wall.y + 1) * TILE + 8));
ok(Bp && canStand(W, Bp.x, Bp.y) && !(Math.floor(Bp.x / TILE) >= wall.x && Math.floor(Bp.x / TILE) < wall.x + wall.w && Math.floor(Bp.y / TILE) >= wall.y && Math.floor(Bp.y / TILE) < wall.y + wall.h), 'une sauvegarde là où s’élève maintenant la voilerie ne laisse pas le pirate dans le mur');
const Cp = await login('Plagiste', base(140 * TILE + 8, 110 * TILE + 8));
ok(Cp && Cp.x === 140 * TILE + 8 && Cp.y === 110 * TILE + 8, 'une sauvegarde ailleurs (sur la plage de la fête) est gardée telle quelle');

// ---------------------------------------------------------------- 4. les événements interactifs
const D = await login('Docker'); D.level = 10; game.recalc(D);
const setT = (t) => { game.worldTime = t; };
setT(tN + SHIP.arrive + 10); tick(2);
const [px, py] = PORT_SPOTS.pile, [dx, dy] = PORT_SPOTS.depot;
let g0 = D.gold, n0 = D.c.msgs.length;
game.teleport(D, dx, dy, {}); say(D, { t: 'port', a: 'caisse' });
ok(!D.portCarry && /pile/.test(toasts(D, n0)), 'loin de la pile, pas de caisse (le serveur le dit)');
for (let k = 0; k < 3; k++) { game.teleport(D, px, py, {}); say(D, { t: 'port', a: 'caisse' }); const carry = !!D.portCarry; game.teleport(D, dx, dy, {}); say(D, { t: 'port', a: 'caisse' }); if (!carry) break; }
ok(D.gold === g0 + 36, `trois caisses portées de la pile au dépôt : +36 doublons (${D.gold - g0})`);
n0 = D.c.msgs.length; game.teleport(D, px, py, {}); say(D, { t: 'port', a: 'caisse' });
ok(!D.portCarry && /déjà porté 3/.test(toasts(D, n0)), 'une quatrième est refusée (trois par navire et par porteur)');
const E2 = await login('Porteuse'); game.teleport(E2, px, py, {}); say(E2, { t: 'port', a: 'caisse' });
ok(!!E2.portCarry, 'une autre pirate peut encore porter (le plafond est par porteur)');
setT(tN + PORT_KINDS.navire.dur + 5); tick(25);
ok(!E2.portCarry, 'le navire reparti, la caisse retourne sur la pile (sans gain)');
setT(tN + 60); tick(2); g0 = D.gold; game.teleport(D, dx, dy, {}); say(D, { t: 'port', a: 'caisse' });
ok(D.gold === g0, 'pas de gain sans caisse sur l’épaule (le client ne peut pas tricher)');
// le voleur
const tV = portFind('voleur', 60000); setT(tV + 1); tick(2);
const T1 = await login('Gardienne'), T2 = await login('Badaud');
const ahead = thiefAt(THIEF.start + 4.5); game.teleport(T1, ahead.x, ahead.y, {}); game.teleport(T2, 150 * TILE, 96 * TILE, {});
g0 = T1.gold; const b0 = T2.c.msgs.length;
for (let k = 0; k < 220 && !(game.portCur && game.portCur.caught); k++) { setT(game.worldTime + 0.05); game.tick(); }
const cu = game.portCur && game.portCur.caught;
ok(cu && cu.who === 'Gardienne' && T1.gold === g0 + 30, `le pirate qui barre la route au voleur l’arrête : +30 doublons (${cu ? cu.who : 'personne'})`);
ok(T2.c.msgs.slice(b0).some((m) => m.t === 'port' && m.a === 'voleur' && m.who === 'Gardienne'), 'les autres pirates en ville le voient arrêté au même endroit (un seul message)');
g0 = T2.gold; game.teleport(T2, T1.x, T1.y, {}); for (let k = 0; k < 40; k++) { setT(game.worldTime + 0.05); game.tick(); }
ok(T2.gold === g0, 'un voleur ne se prend qu’une fois');
// les gens de passage
const tA = portFind('annonce', 70000);
const near = (p, id) => { const n = game.npcPos.get(id); game.teleport(p, n.x, n.y + 14, {}); return game.nearNpc(p, id); };
setT(tA - 30); tick(2); ok(!near(T2, 'crieur_pl'), 'le crieur n’est pas là hors de son annonce');
setT(tA + 5); tick(2); ok(near(T2, 'crieur_pl'), 'pendant l’annonce, on peut lui parler');
const tC = portFind('colporteur', 80000); setT(tC + 3); tick(2); T2.gold = 500;
const cn = game.npcPos.get('colporteur_pl'), at0 = portNpcAt('colporteur_pl', game.worldTime);
ok(Math.hypot(cn.x - at0.x, cn.y - at0.y) < 2, 'le colporteur est, côté serveur, là où chaque client le voit');
game.teleport(T2, cn.x, cn.y + 12, {}); let i0 = T2.inv.filter(Boolean).length; say(T2, { t: 'buy', npc: 'colporteur_pl', item: 'collier_coquillages' });
ok(T2.inv.filter(Boolean).length === i0 + 1, 'on achète au colporteur pendant son passage');
setT(tC + PORT_KINDS.colporteur.dur + 30); tick(2); i0 = T2.inv.filter(Boolean).length; say(T2, { t: 'buy', npc: 'colporteur_pl', item: 'collier_coquillages' });
ok(T2.inv.filter(Boolean).length === i0, 'reparti, il ne vend plus rien');

// ---------------------------------------------------------------- 5. les marchands, la charpentière, la sauvegarde
const M = await login('Cliente'); M.gold = 200;
const fish = game.npcPos.get('poissonniere_pl'); game.teleport(M, fish.x, fish.y + 14, {}); i0 = M.inv.filter(Boolean).length;
say(M, { t: 'buy', npc: 'poissonniere_pl', item: 'sardine' });
ok(M.inv.filter(Boolean).length === i0 + 1, 'la poissonnière de la halle vend ses sardines');
const ch = game.npcPos.get('charpentiere_pl'); game.teleport(M, ch.x, ch.y + 14, {});
ok(game.berthFor(M) === berthOfPlace('port'), 'auprès de la charpentière du chantier, on arme son navire au quai de Port-Lanterne');
n0 = M.c.msgs.length; say(M, { t: 'repair' });
ok(!/chantier naval/.test(toasts(M, n0)), 'et elle répare les coques (le chantier est reconnu)');
const saved = game.saveData ? game.saveData(D) : null;
const saveKeys = saved ? Object.keys(saved) : Object.keys(store.get('docker') || {});
ok(!saveKeys.includes('portCarry') && !saveKeys.includes('portN'), 'la sauvegarde ne change pas de forme (rien du port n’y entre)');
// ---------------------------------------------------------------- 6. 1.9.1 : ni rue sous un bâtiment, ni PNJ dans l'eau
{
  const Wd = game.world, B = Wd.port.box, tl = (x, y) => Wd.tiles[y * Wd.W + x], wet = (x, y) => { const t = Wd.tiles[Math.floor(y / TILE) * Wd.W + Math.floor(x / TILE)]; return t === 0 || t === 1; };
  const blds = Wd.props.filter((q) => q.w && q.h && q.tx >= B.x0 && q.tx <= B.x1 && q.ty >= B.y0 && q.ty <= B.y1 && ['house', 'tavern', 'forge', 'home', 'cite'].includes(q.type));
  const under = []; for (const q of blds) for (let y = q.ty; y < q.ty + q.h; y++) for (let x = q.tx; x < q.tx + q.w; x++) if (tl(x, y) === 6 || tl(x, y) === 5) under.push([q.name || q.type, x, y]);
  ok(blds.length >= 15 && !under.length, `aucune rue ne passe sous les ${blds.length} bâtiments du port${under.length ? ' : ' + JSON.stringify(under.slice(0, 4)) : ''}`);
  const v1 = blds.find((q) => q.type === 'house' && q.tx === 150 && q.ty === 83);
  ok(v1 && [81, 82, 83, 84, 85, 86].every((y) => tl(148, y) === 6 && tl(149, y) === 6), 'la rue du nord longe la maison aux volets bleus (deux cases de pavé, x 148-149)');
  ok([[141, 103], [142, 101], [158, 103], [158, 105]].every(([x, y]) => tl(x, y) === 6), 'les allées des maisons du sud contournent les maisons au lieu de les traverser');
  const wetN = Wd.npcs.filter((n) => n.room < 0 && n.x >= B.x0 * TILE && n.x <= B.x1 * TILE && n.y >= B.y0 * TILE && n.y <= B.y1 * TILE && (wet(n.x, n.y) || wet(n.x, n.y - 3)));
  ok(!wetN.length, `aucun habitant du port n’a les pieds dans l’eau${wetN.length ? ' : ' + wetN.map((n) => n.id).join(', ') : ''}`);
  let wetE = 0; for (let wt = 0; wt < PORT_PERIOD * 30; wt += 3) for (const id of Object.keys(NPCS)) { const at = portNpcAt(id, wt, false); if (at && (wet(at.x, at.y) || wet(at.x, at.y - 3))) wetE++; }
  ok(!wetE, `ni les personnages des événements, à aucun moment (${wetE})`);
}
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
