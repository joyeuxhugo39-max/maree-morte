// Test de charge du serveur : node scripts/charge.mjs <pirates> <secondes>   (ex. node scripts/charge.mjs 50 20)
// N pirates simulés se promènent, frappent et roulent ; on mesure la durée du tour (budget : 50 ms) et le débit réseau.
import { Game } from '../server/game.js';
import { canStand } from '../shared/world.js';
const N = +process.argv[2] || 10, SECS = +process.argv[3] || 20;
const game = new Game({ storage: { auth: async () => ({ ok: true, data: null }), save: () => {} }, log: () => {} });
const W = game.world; const bots = []; let bytes = 0, msgs = 0;
// des points de départ variés : villes, plages, mer
const spots = [W.spawnPoint, { x: W.libertalia.x * 16, y: (W.libertalia.y + 3) * 16 }, { x: W.rade.x * 16, y: (W.rade.y + 4) * 16 }, { x: W.anse.x * 16, y: (W.anse.y + 3) * 16 }, { x: 100 * 16, y: 116 * 16 }, { x: 470 * 16, y: 360 * 16 }];
for (let i = 0; i < N; i++) {
  const c = { send(m) { msgs++; bytes += JSON.stringify(m).length; }, close() {} };
  game.addClient(c); game.onMessage(c, { t: 'login', v: 10, name: 'Bot' + i, pass: 'abcd' });
  bots.push({ c, i });
}
await new Promise((r) => setTimeout(r, 300));
for (const b of bots) { b.p = game.sessions.get(b.c).player; const s = spots[b.i % spots.length]; b.p.x = s.x + (b.i % 7) * 10; b.p.y = s.y; b.p.level = 20; game.recalc(b.p); b.p.hp = b.p.stats.maxHp; b.p.invulnUntil = 1e12; b.a = Math.random() * 6.28; }
const ticks = SECS * 20; let worst = 0, total = 0; bytes = 0; msgs = 0;
for (let k = 0; k < ticks; k++) {
  for (const b of bots) {
    const p = b.p; if (k % 2 === 0) { // 10 messages de déplacement par seconde, comme un vrai client
      b.a += (Math.random() - 0.5) * 0.4; const nx = p.x + Math.cos(b.a) * 8, ny = p.y + Math.sin(b.a) * 8;
      if (canStand(W, nx, ny)) game.onMessage(b.c, { t: 'mv', x: nx, y: ny, d: 0, m: 1 }); else b.a += 2;
    }
    if (k % 15 === b.i % 15) game.onMessage(b.c, { t: 'atk', a: b.a });
    if (k % 40 === b.i % 40) game.onMessage(b.c, { t: 'sk', s: 'roll', a: b.a });
  }
  const t0 = performance.now(); game.tick(); const ms = performance.now() - t0; total += ms; worst = Math.max(worst, ms);
}
const kbps = bytes / SECS / 1024 / N;
console.log(`${String(N).padStart(2)} pirates : tour moyen ${(total / ticks).toFixed(2)} ms (budget 50 ms), pire ${worst.toFixed(1)} ms, réseau ${kbps.toFixed(1)} Ko/s par pirate, ${Math.round(msgs / SECS / N)} messages/s par pirate, mémoire ${Math.round(process.memoryUsage().heapUsed / 1048576)} Mo`);
process.exit(0);
