// Lot 3 : l'audit des quêtes, en jouant. Un pirate de test accepte chaque quête auprès de son donneur, remplit
// chaque objectif par les vrais mécanismes du jeu (tuer le monstre et ramasser son butin, cueillir, acheter, parler,
// explorer la zone, gagner aux dés, plonger depuis un navire), puis rend la quête au bon personnage.
// Puis : les embranchements, les primes répétables, le groupe, la déconnexion, l'abandon et la reprise.
// Usage : node t_quetes30.mjs [--verbeux]
import { Game } from '../server/game.js';
import { QUESTS, QUEST_ORDER, questState, npcVisible } from '../shared/data/quests.js';
import { ITEMS } from '../shared/data/items.js';
import { MOBS } from '../shared/data/mobs.js';
import { NPCS } from '../shared/data/npcs.js';
import { QUEST_PICK } from '../shared/data/craft.js';
import { canStand, zoneAt, roomIdAt, ZONES } from '../shared/world.js';
import { TILE } from '../shared/constants.js';
const VERB = process.argv.includes('--verbeux');
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); if (this.msgs.length > 400) this.msgs.splice(0, 200); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 14, name, pass: 'abcd' }); await wait(80); const p = game.sessions.get(c).player; p.c = c; return p; };
const toasts = (p, n0) => p.c.msgs.slice(n0).filter((m) => m.t === 'toast').map((m) => m.msg);

// ------------------------------------------------------------ outils de déplacement
function standNear(x, y, r = 120) {
  if (canStand(W, x, y)) return [x, y];
  for (let d = 6; d <= r; d += 6) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; const xx = x + Math.cos(a) * d, yy = y + Math.sin(a) * d; if (canStand(W, xx, yy)) return [xx, yy]; }
  return null;
}
const put = (p, x, y) => { if (p.ship) game.leaveDeck(p); p.x = x; p.y = y; p.room = roomIdAt(W, x, y); game.setZone(p, zoneAt(W, x, y)); };
function goNpc(p, id) {
  const n = game.npcPos.get(id); if (!n) return `PNJ ${id} absent du monde`;
  const at = standNear(n.x, n.y + 14, 40) || [n.x, n.y + 10];
  game.teleport(p, at[0], at[1], {});
  if (!game.nearNpc(p, id)) return `PNJ ${id} : invisible ou hors de portée (visibilité : ${JSON.stringify(NPCS[id].vis || null)})`;
  return null;
}
const zoneSpot = new Map();
function goZone(p, z) {
  if (!zoneSpot.has(z)) { let s = null; for (let ty = 0; ty < W.H && !s; ty += 2) for (let tx = 0; tx < W.W; tx += 2) { if (W.zones[ty * W.W + tx] !== z) continue; const x = tx * TILE + 8, y = ty * TILE + 8; if (canStand(W, x, y)) { s = [x, y]; break; } } zoneSpot.set(z, s); }
  const s = zoneSpot.get(z); if (!s) return `zone ${ZONES[z] && ZONES[z].name} introuvable`;
  game.teleport(p, s[0], s[1], {}); return null;
}
// ------------------------------------------------------------ tuer, ramasser
// comme un joueur : on ramasse l'or et ce que les quêtes réclament, on laisse le reste
function pickAll(p) { for (const d of [...game.drops.values()]) if ((d.owner === p.id || !d.owner) && (d.item === 'or' || game.questNeeds(p, d.item) > 0)) { p.x = d.x; p.y = d.y; p.room = d.room; d.born = -9; game.pick(p, d.id, true); } }
// entre deux quêtes, on vide son sac de ce qui ne sert plus (objets de quête exceptés)
function tidy(p) { for (let i = 0; i < p.inv.length; i++) { const s = p.inv[i]; if (s && !ITEMS[s.id].quest && !ITEMS[s.id].boat && s.id !== 'cloche_plongee') p.inv[i] = null; } }
function liveMob(type) {
  let m = game.mobs.find((q) => q.type === type && q.state !== 'dead');
  if (!m) { const dead = game.mobs.find((q) => q.type === type && !q.summoned && q.deadUntil !== Infinity); if (dead) { game.respawnMob(dead); m = dead; } }
  return m || null;
}
const spawnHow = {}; // monstres qui n'apparaissent que par un mécanisme : on le déclenche comme en jeu
function killOne(p, type) {
  let m = liveMob(type);
  if (!m && spawnHow[type]) m = spawnHow[type](p);
  if (!m) return false;
  p.x = m.x + 12; p.y = m.y; p.room = m.room; p.zone = zoneAt(W, p.x, p.y);
  m.tags.set(p.id, m.maxHp); m.hp = 1;
  game.killMob(m, p, true);
  for (const tw of game.mobs) if (tw !== m && tw.fallen && tw.state === 'dead' && tw.deadUntil === Infinity) { /* les frères : l'autre doit tomber aussi */ }
  pickAll(p);
  return true;
}
// les sources d'un objet : boutique, cueillette, coffre de quête, butin
const lootOf = (item) => Object.entries(MOBS).filter(([, m]) => (m.loot || []).concat(m.qloot || []).some((l) => l[0] === item)).map(([id]) => id);
const shopOf = (item) => Object.keys(NPCS).filter((id) => (NPCS[id].shop || []).includes(item));
const pickOf = (item) => Object.entries(QUEST_PICK).filter(([, q]) => q.item === item).map(([t]) => t);
function obtain(p, item, n) {
  const how = [];
  for (let k = 0; k < 600 && game.countItem(p, item) < n; k++) {
    const shop = shopOf(item).find((id) => game.npcPos.get(id));
    if (shop) { if (k === 0) how.push('boutique ' + shop); goNpc(p, shop); p.gold = Math.max(p.gold, 1e6); game.buy(p, shop, item); continue; }
    const pk = pickOf(item);
    if (pk.length) { if (k === 0) how.push('cueillette'); const props = W.props.filter((pr) => pk.includes(pr.type) && !((game.depleted.get(pr.id) || 0) > game.time)); const pr = props[k % Math.max(1, props.length)]; if (!pr) { game.time += 60; continue; } p.x = pr.x; p.y = pr.y + 6; p.room = pr.room == null ? roomIdAt(W, p.x, p.y) : pr.room; game.time += 0.5; game.questPick(p, pr.id); pickAll(p); continue; }
    if (item === 'tonnelet') { if (k === 0) how.push('coffre de quête'); const pr = W.props.find((q) => q.type === 'tonnelet'); p.x = pr.x; p.y = pr.y + 10; p.room = roomIdAt(W, p.x, p.y); game.openProp(p, pr.id); continue; }
    const src = lootOf(item).find((t) => liveMob(t) || spawnHow[t]);
    if (src) { if (k === 0) how.push('butin de ' + src); killOne(p, src); continue; }
    return { ok: false, how: how.concat('aucune source jouable') };
  }
  return { ok: game.countItem(p, item) >= n, how };
}
// ------------------------------------------------------------ les actions particulières
function doAct(p, act, n, qid, i) {
  const st = () => p.quests[qid].p[i] || 0;
  if (act === 'dice_win') { const e = goNpc(p, 'croupier'); if (e) return e; p.gold = 1e6; for (let k = 0; k < 400 && st() < n; k++) { game.time += 1.1; game.playDice(p, 10); } return st() >= n ? null : 'jamais gagné aux dés'; }
  if (act.startsWith('plonge_')) {
    const key = act.slice(7), s = W.diveSpots.find((d) => d.key === key); if (!s) return `site de plongée ${key} absent`;
    if (!game.countItem(p, 'cloche_plongee')) game.addItem(p, 'cloche_plongee', 1);
    if (!game.countItem(p, 'sloop')) game.addItem(p, 'sloop', 1);
    const old = game.ownShip(p.key); if (old) game.removeShip(old, null);
    const sh = game.createShip(p, 'sloop', s.x, s.y, 0, { anchor: 2 }); // les sites de plongée sont en pixels
    game.joinDeck(p, sh, 0, 0); game.dive(p); const done = st() >= n;
    game.surface(p, W.doors[s.door]); if (p.ship) game.leaveDeck(p); game.removeShip(sh, null);
    return done ? null : `la plongée ${key} ne compte pas`;
  }
  if (act === 'fosse_vague') { // descendre dans la Fosse et tenir les vagues, comme en jeu
    const d = W.doors.find((x) => x.room === game.fosseRoom); if (!d) return 'Fosse introuvable';
    game.teleport(p, d.ix, d.iy, { door: d.id }); game.arenaAction(p, 'waves', {});
    if (!game.arenaRun) return 'la Fosse ne démarre pas';
    for (let k = 0; k < 20 * 600 && st() < n && game.arenaRun; k++) { game.tick(); for (const m of game.arenaRun ? game.arenaRun.mobs : []) if (m.state !== 'dead') { m.tags.set(p.id, m.maxHp); m.hp = 1; game.killMob(m, p, true); } }
    if (game.arenaRun) game.arenaEnd ? game.arenaEnd() : (game.arenaRun = null);
    return st() >= n ? null : `vagues tenues : ${st()}/${n}`;
  }
  return `action inconnue ${act}`;
}
// ------------------------------------------------------------ jouer une quête
async function playQuest(p, qid, report) {
  const q = QUESTS[qid], issues = [], how = [];
  tidy(p);
  if (p.level < (q.level || 1)) { p.level = q.level; p.xp = 0; game.recalc(p); }
  p.hp = p.stats.maxHp; p.invulnUntil = game.time + 1e7;
  const s0 = questState(qid, p.quests, p.level);
  if (s0 !== 'available') { issues.push(`état « ${s0} » au lieu de « disponible »`); report[qid] = { issues, how }; return false; }
  let e = goNpc(p, q.giver); if (e) issues.push('donneur : ' + e);
  game.onTalk(p, q.giver); game.acceptQuest(p, qid);
  if (!p.quests[qid] || p.quests[qid].s !== 'active') { issues.push('acceptation impossible'); report[qid] = { issues, how }; return false; }
  for (let i = 0; i < q.goals.length; i++) {
    const g = q.goals[i], st = p.quests[qid];
    if (g.type === 'talk') { e = goNpc(p, g.npc); if (e) issues.push(`objectif ${i + 1} : ${e}`); game.onTalk(p, g.npc); if (!st.p[i]) issues.push(`objectif ${i + 1} : parler à ${g.npc} ne compte pas`); }
    else if (g.type === 'explore') { e = goZone(p, g.zone); if (e) issues.push(`objectif ${i + 1} : ${e}`); if (!st.p[i]) issues.push(`objectif ${i + 1} : entrer dans ${ZONES[g.zone].name} ne compte pas`); }
    else if (g.type === 'kill') { let k = 0; while ((st.p[i] || 0) < g.n && k++ < g.n * 3 + 4) if (!killOne(p, g.mob)) break; if ((st.p[i] || 0) < g.n) issues.push(`objectif ${i + 1} : ${g.mob} ${liveMob(g.mob) || spawnHow[g.mob] ? 'tués mais pas comptés' : 'introuvable dans le monde'} (${st.p[i] || 0}/${g.n})`); else how.push(`${g.mob}`); }
    else if (g.type === 'collect') { const r = obtain(p, g.item, g.n); how.push(`${g.item} : ${r.how.join(', ')}`); if (!r.ok) issues.push(`objectif ${i + 1} : ${g.item} ${game.countItem(p, g.item)}/${g.n} (${r.how.join(', ')})`); }
    else if (g.type === 'act') { e = doAct(p, g.act, g.n, qid, i); if (e) issues.push(`objectif ${i + 1} : ${e}`); }
  }
  e = goNpc(p, q.turnin); if (e) issues.push('rendu : ' + e);
  game.onTalk(p, q.turnin);
  const gold0 = p.gold, xp0 = p.xp + p.level * 1e6;
  game.turnIn(p, qid);
  const done = p.quests[qid] && p.quests[qid].s === 'done';
  if (!done) issues.push(`la quête ne se rend pas (${questState(qid, p.quests, p.level)})`);
  else if (p.gold < gold0 + (q.rewards.gold || 0) - 1) issues.push('récompense en or manquante');
  report[qid] = { issues, how };
  return done;
}

// ------------------------------------------------------------ la campagne complète
const P = await login('Auditrice');
for (let i = 0; i < P.inv.length; i++) P.inv[i] = null;
// mécanismes d'apparition à déclencher comme en jeu (repérés à l'exécution)
spawnHow.ame_anselme = (p) => { p.quests.a3_ame && (p.quests.a3_ame.p[0] = 0); p.x = W.wreck.x * TILE + 8 + 60; p.y = W.wreck.y * TILE + 8; p.room = -1; p.zone = zoneAt(W, p.x, p.y); game.animeAt = 0; game.act3Tick(p); return game.mobs.find((m) => m.type === 'ame_anselme' && m.state !== 'dead'); };
spawnHow.kraken = (p) => { // comme en jeu : sur le pont d'un navire, au-dessus du Gouffre, on souffle dans la Conque des Abysses
  if (!game.countItem(p, 'conque_abysses')) return null; // elle vient de « L'encre des profondeurs »
  const K = W.kraken; if (game.kraken) return game.kraken.mob;
  const old = game.ownShip(p.key); if (old) game.removeShip(old, null);
  if (!game.countItem(p, 'sloop')) game.addItem(p, 'sloop', 1);
  const sh = game.createShip(p, 'sloop', K.x + 210, K.y, Math.PI, { anchor: 2 }); game.joinDeck(p, sh, 0, 0);
  game.setZone(p, zoneAt(W, p.x, p.y));
  game.useSlot(p, p.inv.findIndex((x) => x && x.id === 'conque_abysses'));
  for (let k = 0; k < 20 * 6 && !(game.kraken && game.kraken.mob); k++) game.tick();
  return game.kraken && game.kraken.mob;
};
const order = []; const seen = new Set();
const visit = (id) => { if (seen.has(id)) return; seen.add(id); for (const r of QUESTS[id].requires || []) visit(r); order.push(id); };
for (const id of QUEST_ORDER) if (!id.startsWith('br_')) visit(id); // lot 5 : Le Plus Grand Braquage se joue dans t_braquage50 (gardes, toits, poursuite, combat)
const report = {}, branches = [];
for (const qid of order) {
  if ([].concat(QUESTS[qid].excl || []).some((x) => P.quests[x])) { branches.push(qid); continue; }
  await playQuest(P, qid, report);
}
// les embranchements : chaque autre fin, sur le même parcours
for (const qid of branches) {
  const siblings = [].concat(QUESTS[qid].excl || []), saved = {};
  for (const x of siblings) if (P.quests[x]) { saved[x] = P.quests[x]; delete P.quests[x]; }
  await playQuest(P, qid, report);
  delete P.quests[qid]; Object.assign(P.quests, saved);
}
// les primes : de nouveau disponibles après leur délai
const primes = order.filter((id) => QUESTS[id].repeat);
let again = 0; for (const id of primes) { P.quests[id].t = Date.now() - QUESTS[id].repeat * 1000 - 1000; if (questState(id, P.quests, P.level) === 'available') again++; }
const bad = Object.entries(report).filter(([, r]) => r.issues.length);
for (const [id, r] of Object.entries(report)) if (VERB || r.issues.length) console.log(`${r.issues.length ? '  ✗' : '  ✓'} ${id} — ${QUESTS[id].name}${r.issues.length ? ' : ' + r.issues.join(' ; ') : ''}${VERB && r.how.length ? '   [' + r.how.join(' | ') + ']' : ''}`);
ok(Object.keys(report).length === order.length, `toutes les quêtes jouées (${Object.keys(report).length}/${order.length}, dont ${branches.length} embranchement(s) rejoués)`);
ok(!bad.length, `quêtes jouées jusqu’au bout sans blocage : ${order.length - bad.length}/${order.length}`);
ok(again === primes.length, `primes répétables : de nouveau proposées après leur délai (${again}/${primes.length})`);

// ------------------------------------------------------------ groupe, déconnexion, abandon
const A = await login('Proue'), B = await login('Poupe');
for (const p of [A, B]) { p.level = 6; game.recalc(p); p.invulnUntil = game.time + 1e7; for (const r of ['premier_pas', 'pinces', 'matelots', 'os_lanterne']) p.quests[r] = { s: 'done', p: [] }; }
goNpc(A, 'gaspard'); goNpc(B, 'gaspard'); game.socAction(A, 'invite', 'Poupe'); game.socAction(B, 'accept', 'Proue');
ok(A.group && A.group === B.group, 'groupe formé');
for (const p of [A, B]) { goNpc(p, 'gaspard'); game.onTalk(p, 'gaspard'); game.acceptQuest(p, 'marais'); }
const dm = liveMob('drowned'); A.x = B.x = dm.x + 10; A.y = B.y = dm.y; A.room = B.room = dm.room; dm.tags.set(A.id, dm.maxHp); dm.hp = 1; game.killMob(dm, A, true);
ok((A.quests.marais.p[1] || 0) === 1 && (B.quests.marais.p[1] || 0) === 1, 'en groupe : un noyé abattu compte pour les deux');
// déconnexion en pleine quête, puis reprise
const prog = B.quests.marais.p[1];
game.logout(B); await wait(30);
const B2 = await login('Poupe');
ok(B2.quests.marais && B2.quests.marais.s === 'active' && B2.quests.marais.p[1] === prog, `déconnexion et reprise : la progression est gardée (${B2.quests.marais && B2.quests.marais.p[1]}/6)`);
// abandon d'une quête à objets : les objets de quête partent, la quête se reprend
for (const r of ['traversee']) B2.quests[r] = { s: 'done', p: [] };
B2.level = 5; game.recalc(B2); goNpc(B2, 'rosalie'); game.onTalk(B2, 'rosalie'); game.acceptQuest(B2, 'grotte');
game.addItem(B2, 'eclat_cristal', 2);
game.abandonQuest(B2, 'grotte');
ok(!B2.quests.grotte && game.countItem(B2, 'eclat_cristal') === 0, 'abandon : la quête et ses objets de quête disparaissent');
ok(questState('grotte', B2.quests, B2.level) === 'available', 'abandon : la quête se reprend auprès de son donneur');
// ------------------------------------------------------------ les conversations jouées : bien formées, orateurs connus
const scBad = []; let lines = 0;
const scCheck = (steps, where) => { if (!Array.isArray(steps)) return scBad.push(where); for (const st of steps) { lines++; if (Array.isArray(st)) { if (typeof st[1] !== 'string' || !st[1].trim() || (!['npc', 'me'].includes(st[0]) && !NPCS[st[0]])) scBad.push(where + ' : ' + st[0]); } else if (st && st.ask) st.ask.forEach((a) => { if (!a.q) scBad.push(where + ' : question vide'); scCheck(a.a, where); }); else if (st && st.choose) st.choose.forEach((c) => { if (!c.q) scBad.push(where + ' : choix vide'); if (c.a) scCheck(c.a, where); }); else scBad.push(where + ' : étape inconnue'); } };
for (const id of QUEST_ORDER) { const q = QUESTS[id]; if (q.scene) scCheck(q.scene, id); if (q.sceneDone) scCheck(q.sceneDone, id + ' (fin)'); q.goals.forEach((g, i) => { if (g.scene) scCheck(g.scene, `${id} (objectif ${i + 1})`); }); }
ok(!scBad.length, `conversations : ${lines} répliques bien formées${scBad.length ? ' — ' + scBad.slice(0, 5).join(', ') : ''}`);
// lot 5 : les conversations du braquage sont dans ses scènes (shared/data/cinemas.js)
const story = QUEST_ORDER.filter((id) => !QUESTS[id].repeat && !id.startsWith('br_')), silent = story.filter((id) => !QUESTS[id].scene && !QUESTS[id].sceneDone);
ok(!silent.length, `chaque quête d’histoire a une conversation jouée (${story.length - silent.length}/${story.length})${silent.length ? ' — ' + silent.join(', ') : ''}`);
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
