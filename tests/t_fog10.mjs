// 1.0 : brume — on voit autour de soi, la sauvegarde la garde, les anciennes sauvegardes retrouvent leurs îles
import { Game } from '../server/game.js';
import { Z } from '../shared/world.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 12, name, pass: 'abcd' }); await wait(80); const p = game.sessions.get(c).player; p.c = c; return p; };
const cellsOf = (p) => { let n = 0; for (const b of p.seen) for (let k = 0; k < 8; k++) if (b & (1 << k)) n++; return n; };
const seenIsland = (p, isl) => { for (let y = isl.y0; y <= isl.y1; y++) for (let x = isl.x0; x <= isl.x1; x++) if (W.islandOf[y * W.W + x] === isl.id) { const c = Math.floor(y / 8) * game.seenW + Math.floor(x / 8); if (p.seen[c >> 3] & (1 << (c & 7))) return true; } return false; };
const lib = W.islands[W.islandOf[(W.libertalia.y + 3) * W.W + W.libertalia.x] - 1];
let A = await login('Nouveau');
ok(cellsOf(A) > 0 && cellsOf(A) < 40 && !seenIsland(A, lib), `nouveau pirate : ${cellsOf(A)} carrés visibles autour du port, Libertalia dans la brume`);
game.teleport(A, W.libertalia.x * 16, (W.libertalia.y + 3) * 16); A.c.msgs.length = 0; game.markSeen(A);
ok(seenIsland(A, lib) && A.c.msgs.some((m) => m.t === 'seen'), 'à Libertalia : la brume se lève, le client est prévenu');
game.save(A); const sv = store.get('nouveau'); ok(typeof sv.seen === 'string' && sv.seen.length > 100, 'la brume levée est sauvegardée');
game.removeClient(A.c); A = await login('Nouveau'); ok(seenIsland(A, lib), 'et retrouvée à la connexion suivante');
// une sauvegarde d'avant la 1.0 : les îles déjà parcourues sont dévoilées d'emblée
store.set('ancien', { name: 'Ancien', level: 20, gold: 10, zs: [Z.VOLCAN, Z.RADE], ach: { citoyen: 1 }, x: W.spawnPoint.x, y: W.spawnPoint.y });
const B = await login('Ancien');
const volc = W.islands.find((i) => i.zones.includes(Z.VOLCAN)), rade = W.islands.find((i) => i.zones.includes(Z.RADE));
ok(seenIsland(B, volc) && seenIsland(B, rade) && seenIsland(B, lib), 'ancienne sauvegarde : le volcan, la Rade et Libertalia déjà sortis de la brume');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
