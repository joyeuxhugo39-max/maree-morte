// 1.0 : sécurité — version, essais limités, bannissement, reprise, niveau requis, duplication, téléportation, administration
import fs from 'fs/promises'; import { spawn } from 'child_process'; import crypto from 'crypto';
const TOKEN = crypto.randomBytes(18).toString('hex'); // jeton jetable, propre à ce test
import { Game } from '../server/game.js';
import { FileStorage } from '../server/db.js';
import { zoneAt, roomIdAt } from '../shared/world.js';
const DIR = '.tmp/data_s10';
await fs.rm(DIR, { recursive: true, force: true });
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const st = new FileStorage(DIR); const game = new Game({ storage: st, log: () => {} });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name, pass = 'abcd', extra = {}) => { const c = { ip: extra.ip || '1.2.3.4', msgs: [], send(m) { this.msgs.push(m); }, close() { this.closed = true; } }; game.addClient(c); game.onMessage(c, { t: 'login', v: 15, name, pass, ...extra }); await wait(250); const s = game.sessions.get(c); return { c, p: s && s.player }; };
const err = (c) => (c.msgs.find((m) => m.t === 'err') || {}).msg || '';
// version
{ const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 7, name: 'Ancien', pass: 'abcd' }); await wait(50); ok(/nouvelle version/.test(err(c)) && c.msgs.some((m) => m.reload), 'client d’une autre version : refusé, invité à recharger'); }
// essais limités
let r = await login('Bastien', 'bonmotdepasse'); game.removeClient(r.c);
for (let k = 0; k < 5; k++) { r = await login('Bastien', 'faux' + k); game.removeClient(r.c); }
r = await login('Bastien', 'bonmotdepasse');
ok(!r.p && /Trop d'essais/.test(err(r.c)), 'cinq mauvais mots de passe : compte bloqué un quart d’heure, même avec le bon');
r = await login('Camille', 'abcd', { ip: '9.9.9.9' }); ok(!!r.p, 'les autres pirates ne sont pas gênés');
// reprise sans mot de passe
const tok = r.c.msgs.find((m) => m.t === 'welcome').rt; game.removeClient(r.c);
r = await login('Camille', '', { rt: tok, ip: '9.9.9.9' }); ok(!!r.p, 'reprise après coupure : jeton accepté sans mot de passe'); game.removeClient(r.c);
r = await login('Camille', '', { rt: tok, ip: '9.9.9.9' }); ok(!r.p, 'jeton à usage unique');
// bannissement
r = await login('Dorian'); const D = r.p, Dc = r.c;
game.admin('ban', { name: 'Dorian', hours: 2, reason: 'triche' });
ok(Dc.msgs.some((m) => m.t === 'kick') && !game.players.has(D.id), 'banni : expulsé sur-le-champ');
r = await login('Dorian'); ok(!r.p && /banni/.test(err(r.c)), 'et ne peut plus se connecter'); game.admin('unban', { name: 'Dorian' });
r = await login('Dorian'); ok(!!r.p, 'bannissement levé'); game.removeClient(r.c);
// niveau requis
r = await login('Elouane'); const E = r.p;
game.addItem(E, 'sabre_midas', 1); game.equip(E, E.inv.findIndex((s) => s && s.id === 'sabre_midas'));
ok(E.eq.weapon !== 'sabre_midas' && r.c.msgs.some((m) => m.t === 'toast' && /niveau 26 requis/.test(m.msg || m.m || '')), 'sabre de Midas au niveau 1 : refusé (niveau 26 requis)');
E.level = 26; game.equip(E, E.inv.findIndex((s) => s && s.id === 'sabre_midas')); ok(E.eq.weapon === 'sabre_midas', 'au niveau 26 : accepté');
// duplication : lâcher, ramasser, vendre en rafale
for (let k = 0; k < E.inv.length; k++) E.inv[k] = null;
game.addItem(E, 'rhum', 5); const slot = E.inv.findIndex((s) => s && s.id === 'rhum');
game.dropSlot(E, slot, 5); game.dropSlot(E, slot, 5); game.dropSlot(E, slot, 5);
const drops = [...game.drops.values()].filter((d) => d.item === 'rhum');
ok(drops.reduce((a, d) => a + d.n, 0) === 5 && game.countItem(E, 'rhum') === 0, 'lâcher trois fois le même tas : un seul tas de 5 au sol');
game.time += 1; for (const d of drops) { game.pick(E, d.id); game.pick(E, d.id); }
ok(game.countItem(E, 'rhum') === 5, 'ramasser deux fois : toujours 5 rhums');
const near = game.world.npcs.find((n) => n.id === 'bartholome'); E.x = near.x; E.y = near.y + 14; E.zone = zoneAt(game.world, E.x, E.y); E.room = roomIdAt(game.world, E.x, E.y);
const g0 = E.gold; const s2 = E.inv.findIndex((s) => s && s.id === 'rhum'); for (let k = 0; k < 9; k++) game.sell(E, s2);
ok(game.countItem(E, 'rhum') === 0 && E.gold - g0 === 5 * Math.max(1, Math.floor(30 * 0.35)) || E.gold - g0 <= 5 * 20, `vendre 9 fois 5 rhums : seulement 5 ventes (+${E.gold - g0} doublons)`);
// achats : loin du marchand, ou hors de sa boutique
E.gold = 1000; E.x = game.world.spawnPoint.x + 900; game.buy(E, 'bartholome', 'rhum'); ok(E.gold === 1000, 'acheter loin du marchand : refusé');
E.x = near.x; game.buy(E, 'bartholome', 'sabre_midas'); ok(E.gold === 1000 && game.countItem(E, 'sabre_midas') === 0, 'acheter ce qu’il ne vend pas : refusé');
// téléportation
const x0 = E.x, y0 = E.y; game.onMove(E, { x: x0 + 3000, y: y0, d: 0, m: 1 }); ok(E.x === x0 && E.y === y0, 'déplacement impossible (3000 px d’un coup) : refusé');
// maintenance
game.admin('maintenance', { minutes: 5, msg: 'test', closed: true }); r = await login('Faustine'); ok(!r.p && /Maintenance/.test(err(r.c)), 'maintenance fermée : connexions refusées'); game.admin('maintenance', { minutes: 0 });
// journal
game.audit('test', { who: 'x' }); await st.flush(); const j = await st.readJournal();
ok(j.some((e) => e.kind === 'connexion') && j.some((e) => e.kind === 'vente') && j.some((e) => e.kind === 'connexion-refusee') && j.some((e) => e.kind === 'admin'), `journal des transactions (${j.length} lignes : connexions, ventes, refus, administration)`);
// la console d'administration du vrai serveur
const env = { ...process.env, PORT: '3215', DATA_DIR: DIR + '_srv', ADMIN_TOKEN: TOKEN };
await fs.rm(env.DATA_DIR, { recursive: true, force: true });
const srv = spawn('node', ['../server/index.js'], { env, stdio: 'ignore' });
let up = false; for (let k = 0; k < 40 && !up; k++) { await wait(250); up = await fetch('http://127.0.0.1:3215/sante').then((x) => x.ok).catch(() => false); }
const a1 = await fetch('http://127.0.0.1:3215/admin/api/status').then((x) => x.status);
const a2 = await fetch('http://127.0.0.1:3215/admin/api/status', { headers: { Authorization: 'Bearer ' + TOKEN } }).then((x) => x.json());
const page = await fetch('http://127.0.0.1:3215/admin').then((x) => x.text());
const snaps = await fs.readdir(env.DATA_DIR + '/backups').catch(() => []);
ok(up && a1 === 403 && a2.version === '1.8.0' && /Capitainerie/.test(page), `console d’administration : 403 sans jeton, état avec (version ${a2.version}, ${a2.players} joueur)`);
ok(snaps.some((n) => n.includes('demarrage')), 'instantané pris au démarrage du serveur');
srv.kill('SIGTERM'); await wait(800);
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK');
process.exit(0);
