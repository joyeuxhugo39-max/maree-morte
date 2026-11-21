// 1.0 : discussions, amis, blocage, groupes, équipages, échanges sécurisés
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt } from '../shared/world.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 15, name, pass: 'abcd' }); await wait(60); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(W, x, y); p.room = roomIdAt(W, x, y); };
const said = (p, txt) => p.c.msgs.some((m) => m.t === 'chat' && String(m.m).includes(txt));
const sp = W.spawnPoint;
const A = await login('Albane'), B = await login('Bastien'), C = await login('Cyrielle');
put(A, sp.x, sp.y); put(B, sp.x + 30, sp.y); put(C, sp.x + 3000, sp.y);
const chat = (p, m, ch) => { game.time += 1; game.onMessage(p.c, { t: 'chat', m, ch }); };
chat(A, 'ohé du port', 'local'); ok(said(B, 'ohé du port') && !said(C, 'ohé du port'), 'canal local : entendu à portée de voix seulement');
chat(A, 'à tout l’archipel', 'global'); ok(said(C, 'à tout l’archipel'), 'canal global : entendu partout');
chat(A, '/mp Cyrielle rendez-vous à la Rade'); ok(said(C, 'rendez-vous à la Rade') && !said(B, 'rendez-vous à la Rade'), 'message privé');
chat(C, '/r bien reçu'); ok(said(A, 'bien reçu'), '/r répond au dernier message privé');
chat(B, '/bloquer Albane'); chat(A, 'tu m’entends ?', 'global'); ok(!said(B, 'tu m’entends'), 'bloqué : on n’entend plus ce pirate');
chat(B, '/debloquer Albane');
chat(A, 'quel nègre', 'global'); ok(said(C, 'quel *****') && !said(C, 'nègre'), 'les injures haineuses sont masquées');
// groupe
game.socAction(A, 'invite', 'Bastien'); ok(B.c.msgs.some((m) => m.t === 'ask' && m.kind === 'groupe'), 'invitation dans un groupe');
game.socAction(B, 'accept', 'Albane'); ok(A.group && A.group === B.group, 'Bastien rejoint le groupe d’Albane');
A.quests.pinces = { s: 'active', p: [0] }; B.quests.pinces = { s: 'active', p: [0] };
const crab = game.mobs.find((m) => m.type === 'crab' && m.state !== 'dead' && m.room === -1);
put(A, crab.x - 20, crab.y); put(B, crab.x + 30, crab.y); A.level = 1; B.level = 1; const xa = A.xp, xb = B.xp;
crab.hp = 1; game.damageMob(crab, 999, A, false, 0, 0);
ok(A.xp > xa && B.xp > xb && B.quests.pinces.p[0] === 1, `le groupe partage l’expérience et l’objectif (Albane +${A.xp - xa}, Bastien +${B.xp - xb} XP)`);
game.time += 1; game.socialTick(); ok(A.c.msgs.some((m) => m.t === 'grp' && m.m.length === 2), 'cadres du groupe : PV des deux membres');
// équipage
A.gold = 5000; game.crewAction(A, 'create', { name: 'Les Mouettes Noires', tag: 'MN' });
ok(A.crew && game.crews.get(A.crew).tag === 'MN' && A.gold === 4000, 'équipage fondé (1000 doublons)');
game.crewAction(A, 'invite', { name: 'Cyrielle' }); game.crewAction(C, 'accept', {});
ok(C.crew === A.crew && game.entMeta(C, 'p').cw === 'MN', 'Cyrielle rejoint l’équipage ; son sigle s’affiche');
C.c.msgs.length = 0; chat(A, '/e cap au sud'); ok(said(C, 'cap au sud') && !said(B, 'cap au sud'), 'canal d’équipage');
game.crewAction(A, 'flag', { c1: '#8e1a26', c2: '#ffd24a', sym: 'sabres' }); ok(game.crews.get(A.crew).flag.sym === 'sabres', 'pavillon personnalisé');
game.crewAction(A, 'promote', { name: 'Cyrielle' }); ok(game.crews.get(A.crew).members.cyrielle === 'officier', 'promotion en officier');
// échange sécurisé
for (const p of [A, B]) for (let k = 0; k < p.inv.length; k++) p.inv[k] = null;
A.gold = 500; B.gold = 0; game.addItem(A, 'rhum', 10); game.addItem(B, 'sabre_givre', 1);
put(A, sp.x, sp.y); put(B, sp.x + 40, sp.y);
game.tradeAction(A, 'ask', { name: 'Bastien' }); game.tradeAction(B, 'accept', {});
const sa = A.inv.findIndex((s) => s && s.id === 'rhum'), sb = B.inv.findIndex((s) => s && s.id === 'sabre_givre');
game.tradeAction(A, 'offer', { slot: sa, n: 4 }); game.tradeAction(A, 'gold', { gold: 300 }); game.tradeAction(B, 'offer', { slot: sb });
game.tradeAction(A, 'ready', {}); game.tradeAction(B, 'ready', {}); game.tradeAction(A, 'gold', { gold: 200 });
const tr = game.trades.get(A.id); ok(tr && !tr.ready[A.id] !== undefined && tr.ready[B.id] !== tr.rev, 'une modification annule les validations');
game.tradeAction(A, 'ready', {}); game.tradeAction(B, 'ready', {}); game.tradeAction(A, 'confirm', {});
ok(game.countItem(A, 'sabre_givre') === 0, 'une seule confirmation : rien ne bouge');
game.tradeAction(B, 'confirm', {});
ok(game.countItem(A, 'sabre_givre') === 1 && game.countItem(A, 'rhum') === 6 && game.countItem(B, 'rhum') === 4 && A.gold === 300 && B.gold === 200 && !game.trades.has(A.id), 'échange conclu : sabre contre 4 rhums et 200 doublons');
ok(A.tradeLog.length === 1 && B.tradeLog[0].with === 'Albane', 'historique des échanges');
// triche : vendre pendant l'échange ce qu'on a proposé
game.tradeAction(A, 'ask', { name: 'Bastien' }); game.tradeAction(B, 'accept', {});
const s2 = A.inv.findIndex((s) => s && s.id === 'rhum'); game.tradeAction(A, 'offer', { slot: s2, n: 6 });
for (const p of [A, B]) game.tradeAction(p, 'ready', {});
A.inv[s2] = null; // le rhum a disparu (vendu, lâché...)
for (const p of [A, B]) game.tradeAction(p, 'confirm', {});
ok(game.countItem(B, 'rhum') === 4 && !game.trades.has(A.id), 'objet disparu entre-temps : échange annulé, rien de dupliqué');
// déconnexion en plein échange
game.addItem(A, 'rhum', 3); game.tradeAction(A, 'ask', { name: 'Bastien' }); game.tradeAction(B, 'accept', {});
game.tradeAction(A, 'offer', { slot: A.inv.findIndex((s) => s && s.id === 'rhum'), n: 3 }); game.removeClient(A.c);
ok(!game.trades.has(B.id) && game.countItem(B, 'rhum') === 4 && B.c.msgs.some((m) => m.t === 'trade' && m.closed), 'départ en plein échange : annulé proprement');
// sauvegarde des amis et blocages
chat(B, '/ami Albane'); chat(B, '/bloquer Cyrielle'); game.save(B);
const sv = store.get('bastien'); ok(sv.friends.includes('albane') && sv.blocked.includes('cyrielle'), 'amis et blocages sauvegardés');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
