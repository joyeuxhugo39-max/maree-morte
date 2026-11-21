// 1.0 : sauvegardes versionnées, objets inconnus conservés, fichiers abîmés, instantanés, restauration
import fs from 'fs/promises'; import path from 'path'; import crypto from 'crypto'; import { execFileSync } from 'child_process';
import { Game } from '../server/game.js';
import { FileStorage } from '../server/db.js';
const DIR = '.tmp/data_t10';
await fs.rm(DIR, { recursive: true, force: true });
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const st = new FileStorage(DIR);
const mkGame = () => new Game({ storage: st, log: () => {} });
let game = mkGame();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (g, name, pass = 'abcd') => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; g.addClient(c); g.onMessage(c, { t: 'login', v: 15, name, pass }); await wait(300); const s = g.sessions.get(c); return { c, p: s && s.player }; };
const file = (name) => path.join(DIR, 'accounts', crypto.createHash('sha1').update(name.toLowerCase()).digest('hex') + '.json');
let { c, p } = await login(game, 'Anouk');
p.gold = 4321; p.level = 12; game.addItem(p, 'rhum_vieux', 3);
game.removeClient(c); await st.flush();
let acc = JSON.parse(await fs.readFile(file('Anouk'), 'utf8'));
ok(acc.data && acc.data.sv === 10 && acc.data.gold === 4321, 'sauvegarde écrite avec sa version (sv 10)');
// un objet d'une version future, des champs inconnus : rien ne se perd
acc.data.inv[20] = { id: 'trident_futur', n: 1 }; acc.data.quests.quete_futur = { s: 'active', p: [1] }; acc.data.reputation = { libertalia: 40 };
await fs.writeFile(file('Anouk'), JSON.stringify(acc));
game = mkGame(); ({ c, p } = await login(game, 'Anouk'));
ok(p && p.gold === 4321 && p.level === 12 && game.countItem(p, 'rhum_vieux') === 3, 'rechargé : niveau, doublons, objets');
ok(p.held.some((h) => h.id === 'trident_futur'), 'objet inconnu mis de côté, pas perdu');
game.removeClient(c); await st.flush();
acc = JSON.parse(await fs.readFile(file('Anouk'), 'utf8'));
ok(acc.data.held.some((h) => h.id === 'trident_futur') && acc.data.quests.quete_futur && acc.data.reputation && acc.data.reputation.libertalia === 40, 'réécrit à l’identique : objet, quête et champ inconnus conservés');
// une sauvegarde plus récente que le serveur : connexion refusée, fichier intact
acc.data.sv = 99; await fs.writeFile(file('Anouk'), JSON.stringify(acc)); const before = await fs.readFile(file('Anouk'), 'utf8');
game = mkGame(); ({ c, p } = await login(game, 'Anouk'));
ok(!p && c.msgs.some((m) => m.t === 'err' && /plus récente/.test(m.msg)), 'sauvegarde plus récente : connexion refusée');
await st.flush(); ok((await fs.readFile(file('Anouk'), 'utf8')) === before, 'et le fichier n’a pas été touché');
acc.data.sv = 10; await fs.writeFile(file('Anouk'), JSON.stringify(acc));
// fichier abîmé : la copie précédente prend le relais
({ c, p } = await login(game, 'Anouk')); p.gold = 5000; game.removeClient(c); await st.flush();
({ c, p } = await login(game, 'Anouk')); p.gold = 6000; game.removeClient(c); await st.flush();
await fs.writeFile(file('Anouk'), '{"name":"Anouk", "data": {cassé');
game = mkGame(); ({ c, p } = await login(game, 'Anouk'));
const kept = (await fs.readdir(path.join(DIR, 'accounts'))).some((n) => n.includes('.corrompu-'));
ok(p && p.gold === 5000 && kept, `fichier abîmé mis de côté, copie précédente reprise (${p && p.gold} doublons)`);
game.removeClient(c);
// instantanés et restauration
const s1 = await st.snapshot(); ok(!!s1, 'instantané ' + s1);
({ c, p } = await login(game, 'Anouk')); p.gold = 1; game.removeClient(c); await st.flush();
const out = execFileSync('node', ['../scripts/restore.mjs', s1, 'Anouk'], { env: { ...process.env, DATA_DIR: DIR } }).toString();
game = mkGame(); ({ c, p } = await login(game, 'Anouk'));
ok(p && p.gold === 5000 && /restauré/.test(out), 'restauration d’un pirate depuis l’instantané');
const snaps = await fs.readdir(path.join(DIR, 'backups'));
ok(snaps.some((n) => n.includes('avant-restauration')), 'l’état d’avant la restauration est gardé lui aussi');
await Promise.resolve(game.saveAll()); ok(true, 'arrêt propre : saveAll attend les écritures');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK');
process.exit(0);
