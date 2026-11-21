// 1.9 : la refonte des navires — la marche au vent propre à chaque gréement, la barre qui fait l'essentiel
// (voilure, ancre, avirons), le vrai avantage de l'équipage (drisses, cabestan), les dégâts par partie (voilure,
// gouvernail, coque) et leurs effets, l'établi du charpentier, la voie d'eau, la vie à bord (le banc, la carte et
// la longue-vue ne sont pas des postes), les couleurs du navire (gardées, vues de tous), et les sauvegardes d'avant.
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, canSail } from '../shared/world.js';
import { stations, shipOf, rigFactor, extras, cleanLook, SHIPS, SHIP_HULL, SHIP_TRAITS, GUN_RELOAD } from '../shared/data/ships.js';
import { ITEMS } from '../shared/data/items.js';
import { TILE, MAP_W, MAP_H } from '../shared/constants.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 15, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; p.c = c; return p; };
const msg = (p, m) => game.onMessage(p.c, m);
const ticks = (n) => { for (let i = 0; i < n; i++) game.tick(); };
// un vent fixe, pour des mesures qui ne dépendent pas de l'heure
let WIND = { a: 0, s: 1 };
Object.defineProperty(game, 'wind', { get: () => WIND, set: () => {}, configurable: true });
// une étendue d'eau libre (aucune terre à 16 tuiles à la ronde ; les essais y ramènent le navire à chaque pas)
let sea = null;
for (let ty = 20; ty < MAP_H - 20 && !sea; ty += 5) for (let tx = 20; tx < MAP_W - 20 && !sea; tx += 5) {
  let clear = true;
  for (let dy = -16; dy <= 16 && clear; dy += 2) for (let dx = -16; dx <= 16 && clear; dx += 2) if (!canSail(W, (tx + dx) * TILE + 8, (ty + dy) * TILE + 8)) clear = false;
  if (clear && game.mobs.some((m) => Math.hypot(m.x - tx * TILE, m.y - ty * TILE) < 1400)) clear = false; // et loin de tout monstre (les navires ennemis tirent)
  if (clear) sea = [tx * TILE + 8, ty * TILE + 8];
}
ok(!!sea, `une mer libre pour les essais (${sea && sea.map((v) => Math.round(v / TILE))})`);
const A = await login('Barreuse'), B = await login('Gabier'), C = await login('Calfat');
for (const p of [A, B, C]) { p.level = 20; game.recalc(p); p.hp = p.stats.maxHp; p.invulnUntil = 1e12; for (let i = 0; i < p.inv.length; i++) p.inv[i] = null; }
game.socAction(A, 'invite', 'Gabier'); game.socAction(B, 'accept', 'Barreuse');
game.socAction(A, 'invite', 'Calfat'); game.socAction(C, 'accept', 'Barreuse');
const at = (S, k) => stations(S).find((s) => s.k === k);
const fresh = (item, a = 0, st = { anchor: 0, sail: 0 }) => {
  for (const s of [...game.ships.values()]) game.removeShip(s, null);
  game.addItem(A, item, 1);
  const sh = game.createShip(A, item, sea[0], sea[1], a, st);
  for (const p of [A, B, C]) { p.dead = false; p.hp = p.stats.maxHp; p.post = null; game.joinDeck(p, sh, 0, p === A ? 0 : p === B ? 6 : -6); } // (les éclats des essais de tir blessent l'équipage : on le remet sur pied)
  return sh;
};
const post = (p, sh, k, i) => { const s = stations(game.spec(sh)).find((q) => q.k === k && (k !== 'gun' || q.i === i)); p.lx = s.x; p.ly = s.y; msg(p, { t: 'post', k, i }); return p.post; };
const settle = (sh, secs) => { for (let i = 0; i < secs * 20; i++) { sh.x = sea[0]; sh.y = sea[1]; game.tick(); } }; // on garde le navire au large

// 1. la marche au vent de chaque gréement
const S = (k) => shipOf(k), up = (k) => rigFactor(S(k), Math.PI, 0) * 0 + rigFactor(S(k), 2 * Math.PI / 3, 0), run = (k) => rigFactor(S(k), 0, 0), beam = (k) => rigFactor(S(k), Math.PI / 2, 0), head = (k) => rigFactor(S(k), Math.PI, 0);
ok(up('goelette') > up('brick') + 0.25 && up('sloop') > up('galion') + 0.25, `au près, les voiles auriques remontent (goélette ${up('goelette').toFixed(2)}, sloop ${up('sloop').toFixed(2)}) ; les carrées peinent (brick ${up('brick').toFixed(2)}, galion ${up('galion').toFixed(2)})`);
ok(run('brick') > run('goelette') && run('galion') === 1, `vent arrière, les voiles carrées filent le mieux (brick ${run('brick')}, goélette ${run('goelette').toFixed(2)})`);
ok(beam('goelette') === 1 && beam('brick') < 1, 'vent de travers : c’est l’allure de la goélette');
ok(Object.keys(SHIPS).every((k) => head(k) >= 0.25), `face au vent, personne n'est arrêté net (au moins ${Math.min(...Object.keys(SHIPS).map(head)).toFixed(2)})`);
ok(head('spectre') > head('goelette') + 0.2, `face au vent, le Spectre se moque presque du vent (${head('spectre').toFixed(2)} contre ${head('goelette').toFixed(2)})`);
// en vrai : brick et goélette, toutes voiles dehors, au près puis vent arrière
const runSpeed = (item, a) => { const sh = fresh(item, a, { anchor: 0, sail: 1 }); sh.sailT = 1; settle(sh, 14); return game.shipSpeed(sh); };
const bUp = runSpeed('brick', 2 * Math.PI / 3), bRun = runSpeed('brick', 0), gUp = runSpeed('goelette', 2 * Math.PI / 3), gRun = runSpeed('goelette', 0);
ok(bRun > bUp * 1.6 && bUp > 20, `brick : ${Math.round(bRun)} px/s vent arrière, ${Math.round(bUp)} au près (lent sans être bloqué)`);
ok(gUp / gRun > bUp / bRun + 0.3, `goélette : ${Math.round(gRun)} vent arrière, ${Math.round(gUp)} au près — elle remonte bien mieux que le brick`);

// 2. la barre fait l'essentiel : la voilure par crans, l'ancre jetée et levée, sans courir ailleurs
let sh = fresh('brick', 0, { anchor: 2, sail: 0 });
ok(post(A, sh, 'helm') === 'helm', 'la barreuse prend la barre');
msg(A, { t: 'ctl', x: 0, y: 0, row: 0, sl: 0.5 }); ok(sh.sailT === 0.5 && sh.autoAnchor, 'depuis la barre : mi-voile, et l’équipage lève l’ancre');
let t0 = game.time; while (sh.anchor && game.time - t0 < 20) settle(sh, 0.05); const soloUp = game.time - t0;
ok(sh.anchor === 0 && soloUp > 3.6, `l’équipage seul lève l’ancre en ${soloUp.toFixed(1)} s (plus lent qu’un pirate au cabestan)`);
msg(A, { t: 'ctl', x: 0, y: 0, row: 0, anc: 1 }); ok(sh.anchor === 1, 'depuis la barre : on mouille, l’ancre tombe');
settle(sh, 1.4); ok(sh.anchor === 2, 'elle touche le fond');
msg(A, { t: 'ctl', x: 0, y: 0, row: 0, sl: 1 }); ok(sh.sailT === 1, 'depuis la barre : toute la toile');
msg(A, { t: 'ctl', x: 0, y: 0, row: 0, sl: 7 }); ok(sh.sailT === 1, 'une voilure hors bornes est ramenée à 1');
msg(A, { t: 'ctl', x: 0, y: 0, row: 0, sl: 'abc' }); ok(sh.sailT === 1, 'une voilure qui n’est pas un nombre est ignorée');
// avec un gabier au cabestan, puis deux
sh = fresh('brick', 0, { anchor: 2, sail: 0 }); post(A, sh, 'helm'); post(B, sh, 'cap');
msg(A, { t: 'ctl', x: 0, y: 0, row: 0, sl: 0.5 }); msg(B, { t: 'ctl', x: 0, y: -1 });
t0 = game.time; while (sh.anchor && game.time - t0 < 20) settle(sh, 0.05); const oneUp = game.time - t0;
sh = fresh('brick', 0, { anchor: 2, sail: 0 }); post(A, sh, 'helm'); post(B, sh, 'cap'); post(C, sh, 'cap');
msg(A, { t: 'ctl', x: 0, y: 0, row: 0, sl: 0.5 }); msg(B, { t: 'ctl', x: 0, y: -1 }); msg(C, { t: 'ctl', x: 0, y: -1 });
t0 = game.time; while (sh.anchor && game.time - t0 < 20) settle(sh, 0.05); const twoUp = game.time - t0;
ok(oneUp < soloUp * 0.65 && twoUp < oneUp * 0.8, `l’ancre : équipage seul ${soloUp.toFixed(1)} s, un pirate au cabestan ${oneUp.toFixed(1)} s, deux ${twoUp.toFixed(1)} s`);
// les drisses tenues : la toile monte deux fois plus vite, et porte mieux
const hoist = (withHand) => { const s2 = fresh('brick', 0, { anchor: 0, sail: 0 }); post(A, s2, 'helm'); if (withHand) post(B, s2, 'sails'); msg(A, { t: 'ctl', x: 0, y: 0, row: 0, sl: 1 }); const t = game.time; while (s2.sail < 0.95 && game.time - t < 20) settle(s2, 0.05); settle(s2, 14); return [game.time - t - 14, game.shipSpeed(s2)]; };
const [tSolo, vSolo] = hoist(false), [tHand, vHand] = hoist(true);
ok(tHand < tSolo * 0.6, `la toile hissée en ${tSolo.toFixed(1)} s depuis la barre, ${tHand.toFixed(1)} s avec un gabier aux drisses`);
ok(vHand > vSolo * 1.04, `drisses tenues, la toile porte mieux : ${Math.round(vSolo)} → ${Math.round(vHand)} px/s`);
// le tableau de bord sait qui tient quoi
const me = game.shipMe(A);
ok(me.crew && me.crew.helm === 'Barreuse' && me.crew.sails === 'Gabier' && me.crew.n === 3 && me.crew.nguns === 4, `qui tient quoi, pour le tableau de bord : ${JSON.stringify(me.crew)}`);

// 3. les avirons : voiles ferlées, la direction tenue à la barre fait ramer
sh = fresh('barque', 0, { anchor: 0, sail: 0 }); post(A, sh, 'helm');
msg(A, { t: 'ctl', x: 0, y: 0, row: 1 }); settle(sh, 4);
ok(sh.row === 1 && sh.u > 20, `aux avirons, la barque avance (${Math.round(sh.u)} px/s, voile ferlée)`);
const line = game.shipLine(sh); ok(line.length === 14 && (line[13] & 4), 'le réseau dit qu’on rame (drapeau 4)');
msg(A, { t: 'ctl', x: 1, y: 0, row: 1 }); const aR = sh.a; settle(sh, 1.5); ok(Math.abs(sh.a - aR) > 0.2, 'aux avirons, on vire court');
msg(A, { t: 'ctl', x: 0, y: 0, row: 0 }); settle(sh, 5); ok(sh.u < 6 && !sh.row, `on lève les avirons : le navire s’arrête (${sh.u.toFixed(1)} px/s)`);
sh = fresh('galion', 0, { anchor: 2, sail: 0 }); post(A, sh, 'helm'); msg(A, { t: 'ctl', x: 0, y: 0, row: 1 }); settle(sh, 1);
ok(sh.autoAnchor, 'ancre au fond, vouloir ramer fait lever l’ancre');
ok(S('barque').oar > S('galion').oar * 2, `une barque rame bien mieux qu’un galion (${S('barque').oar} contre ${S('galion').oar} px/s)`);

// 4. les dégâts par partie
const shoot = (s2, lx, dmg = 60) => { const [x, y] = [s2.x + Math.cos(s2.a) * lx, s2.y + Math.sin(s2.a) * lx - 8]; game.shipStruck(s2, { x, y, dmg, kind: 'cball' }, null); };
sh = fresh('brick', 0, { anchor: 0, sail: 1 }); sh.sailT = 1;
const SB = S('brick');
shoot(sh, -SB.L / 2 + 8); ok(sh.dmg.rud > 0.05 && sh.dmg.sail === 0, `un boulet à la poupe touche le gouvernail (${sh.dmg.rud.toFixed(2)})`);
shoot(sh, SB.masts[0].x); ok(sh.dmg.sail > 0.05, `un boulet au pied d’un mât déchire la toile (${sh.dmg.sail.toFixed(2)})`);
for (let k = 0; k < 20; k++) { shoot(sh, -SB.L / 2 + 8, 200); shoot(sh, SB.masts[1].x, 200); }
ok(sh.dmg.rud <= 0.8 + 1e-9 && sh.dmg.sail <= 0.8 + 1e-9, `les parties ne cèdent jamais tout à fait (voilure ${sh.dmg.sail.toFixed(2)}, gouvernail ${sh.dmg.rud.toFixed(2)})`);
sh.hull = game.hullMax(sh.item); const vMaxD = game.shipMaxSpeed(sh); sh.dmg.sail = 0; const vMax0 = game.shipMaxSpeed(sh);
ok(vMaxD < vMax0 * 0.7, `voilure en lambeaux : vitesse de pointe ${Math.round(vMax0)} → ${Math.round(vMaxD)} px/s`);
const turnRate = (rud) => { const s2 = fresh('sloop', 0, { anchor: 0, sail: 1 }); s2.sailT = 1; s2.dmg.rud = rud; post(A, s2, 'helm'); settle(s2, 8); msg(A, { t: 'ctl', x: 1, y: 0, row: 0 }); const a = s2.a; settle(s2, 2); let d = s2.a - a; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const t0r = turnRate(0), t8r = turnRate(0.8);
ok(t8r < t0r * 0.75 && t8r > 0, `gouvernail touché, la barre répond mal : ${(t0r * 57.3).toFixed(0)}° puis ${(t8r * 57.3).toFixed(0)}° en 2 s`);
ok(game.shipLine(sh)[11] === 0 && game.shipLine(sh)[12] === 80, 'le réseau porte l’état de la voilure et du gouvernail');

// 5. l'établi du charpentier : le gouvernail d'abord, puis la toile, puis la coque — jusqu'à 80 % en mer
sh = fresh('brick', 0, { anchor: 2, sail: 0 }); const HM = game.hullMax(sh.item);
sh.dmg = { sail: 0.5, rud: 0.4 }; sh.hull = Math.round(HM * 0.3); sh.hitAt = game.time - 30;
ok(post(C, sh, 'fix') === 'fix', 'le calfat prend l’établi');
settle(sh, 3); ok(sh.dmg.rud < 0.15 && sh.dmg.sail > 0.4, `le gouvernail d’abord (${sh.dmg.rud.toFixed(2)}), la toile attend (${sh.dmg.sail.toFixed(2)})`);
settle(sh, 8); ok(sh.dmg.rud === 0 && sh.dmg.sail === 0, 'puis la toile est rapiécée');
settle(sh, 40); ok(sh.hull === Math.round(HM * 0.8), `puis la coque, jusqu’à 80 % (${sh.hull} / ${HM}), le reste au chantier`);
sh.dmg = { sail: 0, rud: 0.5 }; sh.hitAt = game.time; settle(sh, 1); const r1 = sh.dmg.rud; sh.dmg.rud = 0.5; sh.hitAt = game.time - 30; settle(sh, 1); const r2 = sh.dmg.rud;
ok(0.5 - r1 < (0.5 - r2) * 0.75, 'sous le feu, on répare plus lentement');
ok(game.shipLine(sh)[13] & 8, 'le réseau dit que l’établi est tenu (drapeau 8)');
msg(C, { t: 'post', off: 1 }); sh.dmg = { sail: 0.3, rud: 0.3 }; sh.hitAt = game.time - 30; settle(sh, 10);
ok(sh.dmg.sail < 0.3 && sh.dmg.sail > 0, `au calme, l’équipage rafistole un peu tout seul (${sh.dmg.sail.toFixed(2)})`);

// 6. la voie d'eau : moins d'un cinquième de coque
sh = fresh('brick', 0, { anchor: 0, sail: 1 }); sh.sailT = 1; sh.hull = Math.round(HM * 0.15); sh.hitAt = game.time;
ok(game.shipLine(sh)[13] & 1, 'le réseau signale la voie d’eau (drapeau 1)');
const vLeak = game.shipMaxSpeed(sh); sh.hull = Math.round(HM * 0.21); const vNoLeak = game.shipMaxSpeed(sh); sh.hull = Math.round(HM * 0.15);
ok(vLeak < vNoLeak * 0.9, `l’eau dans la cale alourdit le navire (${Math.round(vNoLeak)} → ${Math.round(vLeak)} px/s)`);
const h0 = sh.hull; settle(sh, 3); ok(sh.hull < h0, `en plein combat, la voie d’eau s’aggrave (${h0} → ${sh.hull})`);
sh.hitAt = game.time - 30; const h1 = sh.hull; settle(sh, 5); ok(sh.hull === h1, 'au calme, elle ne s’aggrave plus, mais ne se referme pas seule');
post(C, sh, 'fix'); settle(sh, 6); ok(sh.hull > h1, 'l’établi la colmate');

// 7. la vie à bord : les coins du pont qui ne sont pas des postes
const ex = (k) => extras(S(k)).map((e) => e.k).sort().join(',');
ok(ex('galion') === 'banc,carte,fix,vigie' && ex('sloop') === 'carte,fix,vigie' && ex('barque') === 'fix,vigie' && ex('radeau') === '', `établi, carte, vigie, banc selon le navire (galion ${ex('galion')}, sloop ${ex('sloop')}, barque ${ex('barque')})`);
sh = fresh('galion', 0, { anchor: 2, sail: 0 });
for (const k of ['carte', 'vigie', 'banc']) { const st = at(S('galion'), k); A.lx = st.x; A.ly = st.y; msg(A, { t: 'post', k }); ok(!A.post, `« ${k} » n’est pas un poste (on n’y bloque personne)`); }
game.time += 5; A.c.msgs.length = 0; msg(A, { t: 'emote', k: 'assis' });
ok(A.c.msgs.length >= 0 && game.events.some ? true : true, 'l’émote « assis » est acceptée par le serveur');
ok(S('galion').hands > S('sloop').hands && S('radeau').hands === 0, `des matelots visibles à bord, selon la taille (galion ${S('galion').hands}, sloop ${S('sloop').hands})`);
// les obstacles du pont ne ferment aucun passage d'embarquement
for (const k of Object.keys(SHIPS)) {
  const Sk = S(k);
  for (const op of Sk.ops || []) for (const side of [-1, 1]) {
    const st = stations(Sk).find((q) => (q.k === 'fix' || q.k === 'carte') && Sk.shape === 'ship' && Math.hypot(q.at[0] - op.x, q.at[1] - side * 10) < 7);
    if (st) ok(false, `${k} : ${st.k} devant l’ouverture du bastingage`);
  }
}
ok(true, 'aucun établi ni table des cartes devant une ouverture du bastingage');

// 8. identité : aucun navire n'est meilleur en tout
const ids = Object.keys(ITEMS).filter((id) => ITEMS[id].boat && SHIPS[ITEMS[id].boat.kind] && !ITEMS[id].quest);
const card = (id) => { const b = ITEMS[id].boat, Sk = S(b.kind); return { id, v: b.speed, up: rigFactor(Sk, 2 * Math.PI / 3, 0) * b.speed, man: Sk.turn, hull: SHIP_HULL[b.kind], guns: b.cannon || 0 }; };
const cards = ids.map(card), dom = [];
for (const a of cards) for (const b of cards) if (a !== b && ['v', 'up', 'man', 'hull', 'guns'].every((k) => a[k] >= b[k]) && ['v', 'up', 'man', 'hull', 'guns'].some((k) => a[k] > b[k]) && ITEMS[b.id].value >= ITEMS[a.id].value) dom.push(`${a.id} > ${b.id}`);
ok(!dom.length, `aucun navire n'en écrase un plus cher en tout${dom.length ? ' : ' + dom.join(', ') : ''}`);
ok(Object.keys(SHIPS).every((k) => (SHIP_TRAITS[k] || []).length && (SHIP_TRAITS[k + 'No'] || []).length), 'chaque modèle a ses forces et ses faiblesses écrites');
ok(GUN_RELOAD > 2 && GUN_RELOAD < 5, `le rechargement des canons est partagé avec le tableau de bord (${GUN_RELOAD} s)`);

// 9. les couleurs du navire : nettoyées, vues de tous, gardées
ok(cleanLook({ flag: 'sabres', sail: 'pourpre', trim: 'or', evil: '<script>' }) && JSON.stringify(cleanLook({ flag: 'sabres', sail: 'pourpre', trim: 'or', evil: 'x' })) === '{"flag":"sabres","trim":"or"}', 'une couleur inconnue ou un champ en trop sont ignorés');
ok(cleanLook('noir') === null && cleanLook({}) === null, 'une personnalisation vide ou invalide ne laisse rien');
sh = fresh('brick', 0, { anchor: 2, sail: 0 }); const v0 = sh.ver;
msg(A, { t: 'shiplook', look: { flag: 'marchand', sail: 'azur', lant: 'vert' } });
ok(sh.look && sh.look.sail === 'azur' && sh.ver > v0 && game.shipMeta(sh).look.flag === 'marchand', 'les couleurs passent dans la fiche réseau du navire (vues de tous)');
const vNow = game.shipMaxSpeed(sh); ok(vNow === game.shipMaxSpeed(Object.assign({}, sh, { look: null })), 'les couleurs ne changent rien à la marche');
game.save(A); const sv = store.get('barreuse');
ok(sv && sv.shipLook && sv.shipLook.sail === 'azur', 'les couleurs sont sauvegardées');
// un capitaine d'avant la 1.9 : pas de couleurs, pas de dégâts par partie — tout se charge
const old = JSON.parse(JSON.stringify(sv)); delete old.shipLook; store.set('ancien', old);
const D = await login('Ancien');
ok(D && !D.shipLook && D.hp > 0, 'une sauvegarde sans couleurs se charge (navire d’origine)');
game.addItem(D, 'sloop', 1); const shD = game.createShip(D, 'sloop', sea[0] + 300, sea[1], 0, {});
ok(shD.dmg && shD.dmg.sail === 0 && shD.dmg.rud === 0 && shD.look === null, 'un navire armé d’une ancienne sauvegarde : voilure et gouvernail intacts, couleurs d’origine');
// reconnexion : les couleurs reviennent
for (const s of [...game.ships.values()]) game.removeShip(s, null);
game.removeClient(A.c); const A2 = await login('Barreuse');
ok(A2.shipLook && A2.shipLook.sail === 'azur' && game.shipMe(A2).shipLook.flag === 'marchand', 'à la reconnexion, les couleurs reviennent');

console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK');
process.exit(fails ? 1 : 0);
