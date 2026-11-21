// Lot 2 : outils développeur — refus des joueurs ordinaires, déverrouillage par secret serveur, essais limités,
// jeton signé (falsifié, expiré, révoqué), personnage laboratoire séparé, commandes validées et journalisées.
import fs from 'fs/promises';
import crypto from 'crypto';
import { Game } from '../server/game.js';
import { FileStorage } from '../server/db.js';
import { installDev, labKey } from '../server/dev.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const DIR = '.tmp/data_dev20';
await fs.rm(DIR, { recursive: true, force: true });
const storage = new FileStorage(DIR);
const journal = []; const audit0 = storage.audit.bind(storage); storage.audit = (e) => { journal.push(e); audit0(e); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SECRET = crypto.randomBytes(18).toString('hex');
const sent = []; // tout ce que le serveur envoie, à tout le monde : le secret ne doit jamais y figurer
const mkConn = (ip) => { const c = { ip, msgs: [], send(m) { this.msgs.push(m); sent.push(JSON.stringify(m)); }, close() {} }; return c; };

// --- 1. sans configuration, ou dans le navigateur (pas d'installDev) : refus net
{
  const g0 = new Game({ storage: { auth: async () => ({ ok: true, data: null }), save() {} }, log: () => {} });
  const c = mkConn('1.2.3.4'); g0.addClient(c); g0.onMessage(c, { t: 'dev', a: 'hello' });
  ok(c.msgs.some((m) => m.t === 'dev' && m.a === 'refus' && m.msg === 'Accès refusé.'), 'moteur sans outils (pages publiques) : « Accès refusé. »');
  installDev(g0, { env: {} }); const c2 = mkConn('1.2.3.4'); g0.addClient(c2); g0.onMessage(c2, { t: 'dev', a: 'hello' }); await wait(20);
  ok(c2.msgs.some((m) => m.a === 'refus'), 'serveur sans DEV_ACCOUNTS ni DEV_SECRET : refus');
  const g1 = new Game({ storage: { auth: async () => ({ ok: true, data: null }), save() {} }, log: () => {} });
  const D1 = installDev(g1, { env: { DEV_ACCOUNTS: 'capitaine', DEV_SECRET: 'court' } });
  ok(!D1.on, 'un secret de moins de 16 caractères désactive les outils');
}

// --- 2. le vrai serveur
const game = new Game({ storage, log: () => {} });
const D = installDev(game, { env: { DEV_ACCOUNTS: 'Capitaine, Second', DEV_SECRET: SECRET, DEV_TTL_MIN: '30' } });
await D.ready;
const login = async (name, ip) => { const c = mkConn(ip); game.addClient(c); game.onMessage(c, { t: 'login', v: 15, name, pass: 'motdepasse' }); await wait(250); const p = game.sessions.get(c).player; return { c, p: () => game.sessions.get(c).player }; };
const dev = async (u, m) => { const n = u.c.msgs.length; game.onMessage(u.c, Object.assign({ t: 'dev' }, m)); await wait(m.a === 'cmd' && /^lab/.test(m.c || '') ? 400 : 40); return u.c.msgs.slice(n).filter((x) => x.t === 'dev'); };
const last = (L) => L[L.length - 1] || {};
const M = await login('Mousse', '5.5.5.5');
const C = await login('Capitaine', '1.1.1.1');
const S2 = await login('Second', '9.9.9.9');
ok(!!M.p() && !!C.p() && !!S2.p(), 'trois pirates connectés');
// le joueur ordinaire
ok(last(await dev(M, { a: 'hello' })).a === 'refus', 'joueur ordinaire : « hello » refusé (aucune invite)');
ok(last(await dev(M, { a: 'unlock', s: SECRET })).a === 'refus', 'joueur ordinaire avec le BON secret : refusé (compte non autorisé)');
ok(last(await dev(M, { a: 'cmd', tok: 'v1.abc.def', c: 'doublons 999999' })).a === 'refus' && M.p().gold < 999999, 'joueur ordinaire, jeton inventé : commande refusée');
ok(last(await dev(M, { a: 'panel', tok: '' })).a === 'refus', 'joueur ordinaire : le panneau n’est pas envoyé');
// essais limités (compte « Second », depuis son adresse)
for (let i = 0; i < 5; i++) await dev(S2, { a: 'unlock', s: 'mauvais-secret-' + i });
const lk = last(await dev(S2, { a: 'unlock', s: SECRET }));
ok(lk.a === 'refus' && /Trop d’essais/.test(lk.msg), `cinq essais ratés : même le bon secret attend (${lk.msg})`);
// le développeur
ok(last(await dev(C, { a: 'hello' })).a === 'ask', 'compte autorisé : le serveur demande le secret');
ok(last(await dev(C, { a: 'unlock', s: 'pas-le-bon' })).a === 'refus', 'compte autorisé, mauvais secret : refusé');
const un = last(await dev(C, { a: 'unlock', s: SECRET }));
ok(un.a === 'ok' && /^v1\./.test(un.tok) && un.until > Date.now(), 'bon secret : jeton signé à durée limitée');
const tok = un.tok;
const cmd = async (u, c, extra = {}) => { if (!extra.burst) D.burst.clear(); return last(await dev(u, Object.assign({ a: 'cmd', tok, c }, extra))); }; // la rafale est testée à part
// le jeton ne sert qu'à son compte
ok(last(await dev(M, { a: 'cmd', tok, c: 'doublons 1' })).a === 'refus', 'jeton volé, utilisé par un autre compte : refusé');
const bad = tok.slice(0, -2) + (tok.slice(-2) === 'AA' ? 'BB' : 'AA');
ok(last(await dev(C, { a: 'cmd', tok: bad, c: 'stats' })).a === 'refus', 'jeton modifié : refusé');
// le personnage principal n'est jamais modifié
const main0 = { level: C.p().level, gold: C.p().gold, key: C.p().key };
let r = await cmd(C, 'niveau 25');
ok(!r.ok && /laboratoire/.test(r.err) && C.p().level === main0.level, 'sur le vrai personnage : « niveau » refusé, rien ne change');
r = await cmd(C, 'aide'); ok(r.ok && /Laboratoire/.test(r.out), 'aide : la liste des commandes');
r = await cmd(C, 'chercher sabre'); ok(r.ok && /objet/.test(r.out), 'recherche globale');
// entrer au laboratoire
r = await cmd(C, 'lab 1');
const L = C.p();
ok(r.ok && L.lab && L.key === labKey('capitaine', 1) && L.name === 'Capitaine [labo]', `lab 1 : un autre personnage (${L && L.name}, clé ${L && L.key})`);
ok(![...game.players.values()].some((q) => q.key === 'capitaine'), 'le vrai personnage est sorti du monde (sauvegardé)');
const saved = await storage.loadData('capitaine');
ok(saved && saved.level === main0.level && saved.gold === main0.gold, 'sa sauvegarde est intacte');
// les commandes
r = await cmd(C, 'niveau 25'); ok(r.ok && L.level === 25, 'niveau 25');
r = await cmd(C, 'niveau 99'); ok(!r.ok && L.level === 25, 'niveau 99 : refusé (borné)');
r = await cmd(C, 'doublons 123456'); ok(r.ok && L.gold === 123456, 'doublons');
r = await cmd(C, 'doublons -999999999'); ok(!r.ok && L.gold === 123456, 'doublons négatifs : refusé');
r = await cmd(C, 'objet rhum 5'); ok(r.ok && game.countItem(L, 'rhum') >= 5, 'objet rhum ×5');
r = await cmd(C, 'objet rhum 5000'); ok(!r.ok, 'objet ×5000 : refusé (999 au plus)');
r = await cmd(C, 'objet licorne-dor'); ok(!r.ok && /inconnu/.test(r.err), 'objet inexistant : refusé');
const weapon = 'lame_corail'; // niveau 17 : s'équipe directement au niveau 25
r = await cmd(C, 'equiper ' + weapon); ok(r.ok && L.eq.weapon === weapon, `équiper directement (${weapon})`);
r = await cmd(C, 'invincible 30'); ok(r.ok && L.invulnUntil > game.time, 'invincible 30 s');
r = await cmd(C, 'normal'); ok(r.ok && !(L.invulnUntil > game.time) && L.hp === L.stats.maxHp, 'normal : valeurs restaurées');
r = await cmd(C, 'quete info premier_pas', {}); ok(r.ok && /Objectifs/.test(r.out), 'quete info');
r = await cmd(C, 'quete terminer premier_pas'); ok(r.ok && L.quests.premier_pas && L.quests.premier_pas.s === 'done', 'quete terminer (avec récompenses)');
r = await cmd(C, 'quete reset premier_pas'); ok(r.ok && !L.quests.premier_pas, 'quete reset');
const deep = 'a3_ame'; // une quête au bout d'une longue chaîne (Acte III)
r = await cmd(C, 'quete preparer ' + deep); ok(r.ok && /disponible|en cours|prête/.test(r.out), `quete preparer ${deep} : sa chaîne de prérequis est faite (${r.out || r.err})`);
r = await cmd(C, 'quete objectif ' + deep + ' 1'); ok(r.ok && L.quests[deep] && L.quests[deep].p[0] >= 1, 'quete objectif 1');
r = await cmd(C, 'tp port'); ok(r.ok && Math.hypot(L.x - game.world.spawnPoint.x, L.y - game.world.spawnPoint.y) < 40, 'tp port');
r = await cmd(C, 'tp lieu-volcan'); ok(r.ok && /Volcan/.test(r.out), `tp vers le volcan (${r.out || r.err})`);
r = await cmd(C, 'tp 99999 3'); ok(!r.ok, 'tp hors carte : refusé');
r = await cmd(C, 'tp port');
r = await cmd(C, 'monstre zsailor 3'); const mine = game.mobs.filter((m) => m.dev === 'capitaine' && m.state !== 'dead');
ok(r.ok && mine.length === 3, 'monstre ×3 près de soi');
r = await cmd(C, 'monstre zsailor 50'); ok(!r.ok, 'monstre ×50 : refusé (20 au plus)');
r = await cmd(C, 'boss zsailor'); ok(!r.ok && /ni un boss/.test(r.err), 'boss : seulement des boss ou élites');
r = await cmd(C, 'nettoyer'); ok(r.ok && game.mobs.filter((m) => m.dev === 'capitaine' && m.state !== 'dead').length === 0, 'nettoyer');
r = await cmd(C, 'temps nuit'); ok(!r.ok && r.need === 'confirm', 'temps : un vrai pirate est en ligne, confirmation demandée');
const wt0 = game.worldTime; r = await cmd(C, 'temps nuit', { confirm: 1 }); ok(r.ok && game.worldTime > wt0 && game.night !== undefined, `temps nuit confirmé (${r.out})`);
r = await cmd(C, 'meteo orage 10', { confirm: 1 }); const { weatherAt, WX } = await import('../shared/constants.js');
ok(r.ok && weatherAt(game.worldTime).kind === 2, 'meteo orage');
r = await cmd(C, 'meteo auto'); ok(r.ok && WX.force === null, 'meteo auto');
r = await cmd(C, 'navire sloop'); ok(r.ok && game.ownShip(L.key) && game.ownShip(L.key).item === 'sloop', 'navire : un sloop armé au quai le plus proche');
r = await cmd(C, 'cine liste premier'); ok(r.ok && /q:/.test(r.out), 'cine liste');
const nC = C.c.msgs.length; r = await cmd(C, 'cine boss:boss'); ok(r.ok && C.c.msgs.slice(nC).some((m) => m.a === 'cine' && m.c && m.c.type === 'boss'), 'cine : la cinématique part vers le client');
{ // lot 4 : une scène mise en scène se lance depuis le serveur, dans son lieu, sur le personnage laboratoire
  const n0 = C.c.msgs.length; r = await cmd(C, 'cine film:silas_rencontre');
  const Lp = C.p ? C.p() : L;
  ok(r.ok && C.c.msgs.slice(n0).some((m) => m.t === 'cinema' && m.a === 'play' && m.id === 'silas_rencontre') && game.world.rooms[Lp.room] && game.world.rooms[Lp.room].name === 'La Sirène Borgne', 'cine film : conduit à la Sirène Borgne, la scène part vers le client');
  game.cinemaMsg(Lp, { a: 'done', id: 'silas_rencontre' });
  r = await cmd(C, 'cine oublier tout'); ok(r.ok && !Lp.mem.has('vu:silas_rencontre'), 'cine oublier : la scène se rejouera');
}
// le laboratoire reste à l'écart des vrais pirates
const mp = M.p(); mp.x = L.x + 20; mp.y = L.y; mp.room = L.room; mp.zone = L.zone;
game.tradeAction(L, 'ask', { name: 'Mousse' }); ok(!game.trades.has(L.id), 'labo → vrai pirate : pas d’échange');
const hp0 = mp.hp; game.damagePlayer(mp, 50, L); ok(mp.hp === hp0, 'labo → vrai pirate : aucun dégât');
const slot = L.inv.findIndex((s) => s && s.id === 'rhum'); game.dropSlot(L, slot, 1); ok(game.countItem(L, 'rhum') >= 5, 'labo : rien ne se lâche au sol');
game.spawnDrop(L.x, L.y, 'rhum', 1, L.id); const dr = [...game.drops.values()].pop(); ok(dr.lab, 'butin du labo marqué');
dr.born = -9; game.pick(mp, dr.id); ok(game.drops.has(dr.id), 'un vrai pirate ne ramasse pas le butin du labo');
// sortir : le vrai personnage revient tel qu'il était
const labGold = L.gold, labLevel = L.level;
r = await cmd(C, 'lab sortir');
ok(r.ok && C.p().key === 'capitaine' && !C.p().lab && C.p().level === main0.level && C.p().gold === main0.gold, 'lab sortir : le vrai personnage, inchangé');
await storage.flush(); const labSave = await storage.loadData(labKey('capitaine', 1));
ok(labSave && labSave.level === labLevel && labSave.level >= 25 && labSave.gold === labGold, `le laboratoire a sa propre sauvegarde (niveau ${labSave && labSave.level}, ${labSave && labSave.gold} doublons)`);
// réinitialiser (confirmation), y compris depuis l'accueil
r = await cmd(C, 'lab reset 1'); ok(!r.ok && r.need === 'confirm', 'lab reset : confirmation demandée');
r = await cmd(C, 'lab reset 1', { confirm: 1 }); ok(r.ok && (await storage.loadData(labKey('capitaine', 1))) === null, 'lab reset confirmé : laboratoire vide');
r = await cmd(C, 'lab 2'); ok(r.ok && C.p().key === labKey('capitaine', 2), 'lab 2 : un deuxième emplacement');
r = await cmd(C, 'lab scenario legende'); ok(r.ok && C.p().level === 30 && C.p().glory === 20 && C.p().eq.weapon, `scénario « légende » (${(r.out || r.err).slice(0, 80)}…)`);
r = await cmd(C, 'lab sortir');
const pre = mkConn('1.1.1.1'); game.addClient(pre);
game.onMessage(pre, { t: 'dev', a: 'labreset', tok, slot: 2 }); await wait(60);
ok(last(pre.msgs).need === 'confirm', 'à l’accueil (pas encore connecté) : confirmation demandée');
game.onMessage(pre, { t: 'dev', a: 'labreset', tok, slot: 2, confirm: 1 }); await wait(200);
ok(last(pre.msgs).ok && (await storage.loadData(labKey('capitaine', 2))) === null, 'à l’accueil : laboratoire 2 réinitialisé avec le jeton');
const pre2 = mkConn('7.7.7.7'); game.addClient(pre2); game.onMessage(pre2, { t: 'dev', a: 'labreset', tok: 'faux', slot: 1, confirm: 1 }); await wait(40);
ok(last(pre2.msgs).a === 'refus', 'à l’accueil, sans jeton valable : refus');
// le journal
await wait(50);
const dj = journal.filter((e) => e.kind === 'dev');
ok(dj.length > 20 && dj.every((e) => e.who && e.char && e.cmd && e.at && typeof e.ok === 'boolean') && dj.some((e) => !e.ok && e.err), `journal : ${dj.length} commandes avec auteur, personnage, date, résultat ou erreur`);
ok(journal.some((e) => e.kind === 'dev-refus') && journal.some((e) => e.kind === 'dev-ouverture'), 'journal : refus et ouvertures consignés');
r = await cmd(C, 'historique 5'); ok(r.ok && r.out.split('\n').length === 5, 'historique');
// rafale de commandes
let burst = null; D.burst.clear(); for (let i = 0; i < 35; i++) { const x = await cmd(C, 'stats', { burst: 1 }); if (!x.ok && /Trop de commandes/.test(x.err || '')) { burst = x; break; } }
ok(!!burst, 'trop de commandes à la fois : freinées');
await wait(10);
// déconnexion : le jeton est révoqué ; révocation générale
D.burst.clear();
const bye = await dev(C, { a: 'cmd', tok, c: 'deconnexion' }); ok(bye.some((x) => x.a === 'res' && x.ok) && bye.some((x) => x.a === 'bye'), 'deconnexion : session fermée');
ok(last(await dev(C, { a: 'cmd', tok, c: 'stats' })).a === 'refus', 'après déconnexion : le jeton ne vaut plus rien');
const t2 = last(await dev(C, { a: 'unlock', s: SECRET })).tok;
D.revokeAll();
ok(last(await dev(C, { a: 'cmd', tok: t2, c: 'stats' })).a === 'refus', 'révocation générale : tous les jetons tombent');
// jeton expiré
const t3 = last(await dev(C, { a: 'unlock', s: SECRET })).tok; const now0 = Date.now;
Date.now = () => now0() + 31 * 60000; const ex = last(await dev(C, { a: 'cmd', tok: t3, c: 'stats' })); Date.now = now0;
ok(ex.a === 'refus', 'jeton de 30 min, 31 min plus tard : refusé');
// le secret n'a jamais été envoyé à qui que ce soit
ok(!sent.some((s) => s.includes(SECRET)), 'le secret n’apparaît dans aucun message envoyé aux clients');
await storage.flush();
const files = await fs.readdir(DIR + '/accounts');
ok(files.length >= 5, `les sauvegardes du laboratoire sont des fichiers à part (${files.length} fichiers)`);
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
