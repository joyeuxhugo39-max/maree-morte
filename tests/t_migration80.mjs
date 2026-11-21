// Lot 8 : de vraies sauvegardes d'anciennes versions (0.7.1, 0.8.1, 1.1.1, 1.5.0), fabriquées par le code de ces versions
// (tests/fixtures/save-*.json), rechargées par la version actuelle. Rien ne doit se perdre : niveau, expérience, or, sac,
// équipement, quêtes faites et en cours, souvenirs. La sauvegarde réécrite porte la version actuelle, et se recharge
// à l'identique. Le fichier d'origine n'est jamais modifié (on travaille sur une copie).
import fs from 'node:fs';
import { Game } from '../server/game.js';
import { PROTOCOL, SAVE_VERSION } from '../shared/constants.js';
import { QUESTS } from '../shared/data/quests.js';
import { ITEMS } from '../shared/data/items.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DIR = new URL('./fixtures/', import.meta.url);
const files = fs.readdirSync(DIR).filter((f) => /^save-.*\.json$/.test(f)).sort();
ok(files.length >= 4, `${files.length} sauvegardes d'anciennes versions`);

for (const f of files) {
  const raw = fs.readFileSync(new URL(f, DIR), 'utf8'), fx = JSON.parse(raw), E = fx.expect, from = fx.from;
  const store = new Map([['k', JSON.parse(JSON.stringify(fx.data))]]); // une copie : l'original ne bouge pas
  let lastSave = null;
  const game = new Game({ storage: { auth: async () => ({ ok: true, data: store.get('k') }), save: (k, d) => { lastSave = JSON.parse(JSON.stringify(d)); store.set('k', lastSave); } }, log: () => {} });
  const login = async () => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: PROTOCOL, name: 'Vieillemain', pass: 'abcd1234' }); await wait(60); const s = game.sessions.get(c); return s && s.player; };
  const p = await login();
  ok(!!p, `${from} : la sauvegarde se charge`);
  if (!p) continue;
  ok(p.level === E.level && p.xp === E.xp, `${from} : niveau ${p.level} et expérience conservés`);
  ok(p.gold >= E.gold, `${from} : or conservé (${E.gold} → ${p.gold}${p.gold > E.gold ? ', plus des remboursements d’anciens objets' : ''})`);
  const has = (id) => (p.inv || []).some((s) => s && s.id === id) || Object.values(p.eq || {}).some((s) => s && (s.id || s) === id);
  const lost = E.inv.filter(([id]) => ITEMS[id] && !has(id));
  ok(!lost.length, `${from} : aucun objet perdu dans le sac${lost.length ? ' — PERDUS : ' + lost.map((x) => x[0]).join(', ') : ''}`);
  const eqLost = Object.entries(E.eq).filter(([sl, s]) => s && ITEMS[s.id || s] && !(p.eq[sl] && (p.eq[sl].id || p.eq[sl]) === (s.id || s)));
  ok(!eqLost.length, `${from} : équipement conservé (${Object.keys(E.eq).length} emplacements)${eqLost.length ? ' — CHANGÉS : ' + eqLost.map((x) => x[0]).join(', ') : ''}`);
  const qd = E.done.filter((q) => QUESTS[q]), qa = E.act.filter((q) => QUESTS[q]);
  ok(qd.every((q) => p.quests[q] && p.quests[q].s === 'done'), `${from} : ${qd.length} quêtes faites restent faites`);
  ok(qa.every((q) => p.quests[q] && p.quests[q].s === 'active'), `${from} : ${qa.length} quêtes en cours restent en cours`);
  ok(!p.mem || !fx.data.mem || fx.data.mem.every((k) => p.mem.has(k)), `${from} : les souvenirs des PNJ sont gardés`);
  ok((p.tut | 0) >= 99, `${from} : le tutoriel n’est pas reproposé à un ancien pirate`);
  ok(p.fest && p.fest.tok === 0 && p.heist, `${from} : festival et braquage partent d’un état vierge, sans rien écraser`);
  // réécrite par la version actuelle, puis rechargée : à l'identique
  game.logout(p); await wait(30);
  ok(lastSave && lastSave.sv === SAVE_VERSION, `${from} : réécrite avec la version de sauvegarde ${SAVE_VERSION}`);
  const p2 = await login();
  ok(p2 && p2.level === p.level && p2.gold === p.gold && JSON.stringify(p2.inv) === JSON.stringify(p.inv) && JSON.stringify(Object.keys(p2.quests).sort()) === JSON.stringify(Object.keys(p.quests).sort()), `${from} : rechargée après migration, rien ne change`);
  ok(fs.readFileSync(new URL(f, DIR), 'utf8') === raw, `${from} : le fichier d'origine n'a pas été touché`);
  if (p2) game.logout(p2);
}
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(fails ? 1 : 0);
