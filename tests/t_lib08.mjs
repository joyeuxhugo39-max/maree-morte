// 0.8 : Libertalia — accès, portes, PNJ, quêtes, dés, voyage, boss
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, canStand, Z } from '../shared/world.js';
import { NPCS } from '../shared/data/npcs.js';
import { QUESTS } from '../shared/data/quests.js';
import { TILE } from '../shared/constants.js';
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world;
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const mk = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 11, name, pass: 'abcd' }); await new Promise((r) => setTimeout(r, 20)); const p = game.sessions.get(c).player; p.conn = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); p.moveBudget = 0; };
const npc = (id) => W.npcs.find((n) => n.id === id);
// ---------- la ville est ouverte : on va de la place à chaque porte de bâtiment et vers chaque région de l'île
const L = W.libertalia, start = [L.x, L.y + 2];
const seen = new Uint8Array(W.W * W.OVER_H), q = [start]; seen[start[1] * W.W + start[0]] = 1;
while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W.W || ny >= W.OVER_H) continue; const i = ny * W.W + nx; if (seen[i] || !canStand(W, nx * TILE + 8, ny * TILE + 10)) continue; seen[i] = 1; q.push([nx, ny]); } }
const reach = (tx, ty, r = 2) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (seen[(ty + dy) * W.W + tx + dx]) return true; return false; };
const libDoors = W.doors.filter((d) => !d.secret && d.ox / TILE > 700 && d.oy / TILE > 190 && d.oy / TILE < 345);
const shut = libDoors.filter((d) => !reach(Math.floor(d.ox / TILE), Math.floor(d.oy / TILE)));
ok(libDoors.length >= 25 && !shut.length, `${libDoors.length} portes de la cité accessibles depuis la place${shut.length ? ' — fermées : ' + shut.map((d) => d.name).join(', ') : ''}`);
for (const [name, x, y] of [['les Cannaies', 800, 118], ['la mangrove', 716, 300], ['la jungle', 884, 296], ['le fort des Hauts', 726, 162], ['la Baie', 878, 150], ['le port', 800, 344]]) ok(reach(x, y, 4), `on sort de la cité vers ${name}`);
const walls = W.props.filter((p) => p.type === 'rempart').length, towers = W.props.filter((p) => p.type === 'tour').length, gates = W.props.filter((p) => p.type === 'porte_cite').length;
ok(walls > 200 && towers >= 12 && gates === 2, `rempart : ${walls} segments, ${towers} tours, ${gates} arches au nord`);
// ---------- les 31 habitants sont placés, sur un sol praticable
const libIds = ['reine', 'capitaine_brisemer', 'dame_corail', 'capitaine_fendlame', 'palefrenier', 'armurier', 'tailleur_lib', 'apothicaire', 'tav_rhum', 'tav_sirene', 'tav_kraken', 'tav_cale', 'croupier', 'joueur_lib', 'madame_rubis', 'perle', 'celeste', 'le_borgne', 'charpentier_lib', 'capitaine_port', 'maitre_fosse', 'passeur_lib', 'marchande_fruits', 'poissonnier_lib', 'marchand_curios', 'marchand_rhum', 'crieur', 'primes_lib', 'garde_porte', 'mendiant', 'musicien'];
const missing = libIds.filter((id) => !npc(id)), stuck = libIds.filter((id) => npc(id) && !NPCS[id].board && !canStand(W, npc(id).x, npc(id).y));
ok(!missing.length && !stuck.length, `31 habitants de Libertalia${missing.length ? ' — absents : ' + missing.join(', ') : ''}${stuck.length ? ' — coincés : ' + stuck.join(', ') : ''}`);
// ---------- les monstres de l'île
for (const t of ['epouvantail', 'coupe_jarret', 'contrebandier', 'naufrageur', 'garde_maudit', 'goule_ecarlate', 'reine_mangrove', 'capitaine_naufrageur', 'roi_sans_couronne']) ok(game.mobs.some((m) => m.type === t), `monstre présent : ${t}`);
const inCity = game.mobs.filter((m) => m.room === -1 && zoneAt(W, m.sx, m.sy) === Z.LIBERTALIA);
ok(!inCity.length, `aucun monstre dans l'enceinte (${inCity.length})`);
const boss = game.mobs.find((m) => m.type === 'roi_sans_couronne'); ok(boss && boss.room >= 0 && W.rooms[boss.room].name.includes('Roi sans Couronne'), 'le Roi sans Couronne attend dans sa crypte');
// ---------- voyage : billet pour Libertalia
const A = await mk('Ysolde'); A.level = 30; game.recalc(A); A.hp = A.stats.maxHp; A.gold = 50000;
put(A, W.spawnPoint.x, W.spawnPoint.y); game.addItem(A, 'billet_libertalia', 1); game.useSlot(A, A.inv.findIndex((s) => s && s.id === 'billet_libertalia'));
ok(zoneAt(W, A.x, A.y) === Z.LIBERTALIA || Math.hypot(A.x - W.docks.libertalia.x, A.y - W.docks.libertalia.y) < 60, `billet : débarqué au port de Libertalia (${Math.round(A.x / TILE)}, ${Math.round(A.y / TILE)})`);
ok(A.ach && A.ach.citoyen, 'haut fait « Cité Libre » en entrant');
// ---------- la grande quête : portes, audience, conversations
const at = (id) => { const n = npck(id); put(A, n.x, n.y + 14); };
const npck = (id) => { const n = npc(id); if (!n) throw new Error('PNJ ' + id); return n; };
const accept = (qid) => { at(QUESTS[qid].giver); game.acceptQuest(A, qid); return A.quests[qid] && A.quests[qid].s === 'active'; };
const turn = (qid) => { at(QUESTS[qid].turnin); game.turnIn(A, qid); return A.quests[qid] && A.quests[qid].s === 'done'; };
const talk = (id) => { at(id); game.onTalk(A, id); };
ok(accept('lib_portes'), 'quête « Les portes de Libertalia » acceptée auprès du garde');
talk('reine'); ok(turn('lib_portes'), 'présenté à la Reine');
ok(accept('lib_audience'), 'audience : le Conseil des Capitaines');
for (const c of ['capitaine_brisemer', 'dame_corail', 'capitaine_fendlame']) talk(c);
ok(turn('lib_audience'), 'les trois capitaines ont entendu parler de vous');
ok(accept('lib_baie') && accept('lib_mangrove') && accept('lib_hauts'), 'trois missions des capitaines');
for (const [qid, kills, items] of [['lib_baie', [['naufrageur', 10]], [['lanterne_naufrageur', 5]]], ['lib_mangrove', [['contrebandier', 8]], [['tonnelet_contrebande', 6]]], ['lib_hauts', [['garde_maudit', 10]], []]]) {
  for (const [t, n] of kills) for (let k = 0; k < n; k++) game.questKill(A, t);
  for (const [it, n] of items) game.addItem(A, it, n);
  ok(turn(qid), `mission rendue : ${QUESTS[qid].name}`);
}
ok(accept('lib_murmures'), 'enquête au Velours');
for (const id of ['madame_rubis', 'perle', 'celeste', 'le_borgne']) talk(id);
ok(turn('lib_murmures'), 'le traître est démasqué');
ok(accept('lib_crypte'), 'dernière mission : la crypte');
game.questKill(A, 'roi_sans_couronne'); game.addItem(A, 'couronne_brisee', 1);
ok(turn('lib_crypte') && game.countItem(A, 'sceau_reine') === 1 && A.ach.libertalia, 'Corsaire de la Reine : sceau et haut fait');
// ---------- les dés de Fortuné
ok(accept('lib_dette'), 'Lucien Sans-le-Sou parie sur vous');
at('croupier'); const c = A.conn; let wins = 0, games = 0, g0 = A.gold;
for (let k = 0; k < 60 && wins < 3; k++) { game.time += 1.1; c.msgs.length = 0; game.playDice(A, 100); const r = c.msgs.find((m) => m.t === 'dice'); if (r) { games++; if (r.gain > 0) wins++; } }
ok(games > 0 && A.quests.lib_dette.p[0] >= Math.min(3, wins) && wins >= 3, `dés : ${games} parties, ${wins} gagnées, ${A.gold - g0} doublons`);
ok(turn('lib_dette'), 'dette réglée : carte au trésor');
put(A, W.spawnPoint.x, W.spawnPoint.y); game.time += 2; c.msgs.length = 0; const gold1 = A.gold; game.playDice(A, 100); ok(A.gold === gold1 && !c.msgs.some((m) => m.t === 'dice'), 'on ne joue qu’à la table de Fortuné');
// ---------- boutiques
at('le_borgne'); const g2 = A.gold; game.onMessage(A.conn, { t: 'buy', npc: 'le_borgne', item: 'destrier_squelette' });
ok(game.countItem(A, 'destrier_squelette') === 1 && A.gold < g2, 'marché noir : un destrier squelette');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK');
process.exit(0);
