// Lot 3 : l'audit des boss et des élites, en combat simulé. Un pirate du niveau du boss, avec le meilleur
// équipement accessible à ce niveau, se bat (sabre au contact, arme à feu quand elle est prête), deux fois :
// sans esquiver (le pire des cas), puis en esquivant les zones annoncées au sol, à la vitesse d'un vrai pirate.
// On mesure : le temps pour vaincre, les dégâts reçus, les phases atteintes, les capacités distinctes, et l'on
// vérifie qu'aucun boss ne reste invincible, ne tourne en rond ou ne frappe sans prévenir.
// Usage : node t_boss30.mjs [--tableau] [id]
import { Game } from '../server/game.js';
import { MOBS } from '../shared/data/mobs.js';
import { ITEMS, reqLevel } from '../shared/data/items.js';
import { canStand, roomIdAt, zoneAt } from '../shared/world.js';
import { SLOTS } from '../shared/constants.js';
const TABLE = process.argv.includes('--tableau'), ONLY = process.argv.slice(2).find((a) => !a.startsWith('--'));
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SPEED = 88; // px/s : un pirate qui court
import { NPCS } from '../shared/data/npcs.js';
// l'équipement d'un pirate ordinaire : ce que vendent les boutiques à son niveau (ni butin rare, ni légendaire)
const SOLD = new Set(Object.values(NPCS).flatMap((n) => n.shop || []));
function bestGear(level) {
  const out = {};
  for (const slot of SLOTS) {
    if (slot === 'outfit' || slot === 'mount') continue;
    let best = null;
    for (const [id, it] of Object.entries(ITEMS)) { if (it.slot !== slot || !SOLD.has(id) || it.quest || it.rep || it.unique || reqLevel(it) > level) continue; const sc = (it.rarity || 0) * 1e6 + reqLevel(it) * 1e3 + (it.value || 0) / 1e3; if (!best || sc > best[1]) best = [id, sc]; }
    if (best) out[slot] = best[0];
  }
  return out;
}
const BOSSES = Object.entries(MOBS).filter(([id, m]) => (m.boss || m.elite || m.title) && !m.sea && !m.ship && id !== 'frere_rouille').map(([id]) => id);

async function fight(id, dodge, n = 1) {
  const store = new Map();
  const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: () => {} }, log: () => {} });
  const W = game.world, def = MOBS[id];
  const P = [];
  for (let i = 0; i < n; i++) {
    const c = { send() {}, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 12, name: 'Duelliste' + (i + 1), pass: 'abcd' }); await wait(60);
    const p = game.sessions.get(c).player;
    p.level = Math.min(30, def.level); p.tut = 99; const gear = bestGear(p.level); for (const s of Object.keys(gear)) p.eq[s] = gear[s]; game.recalc(p); p.hp = p.stats.maxHp; p.en = p.stats.maxEn;
    P.push({ p, budget: 0, rollAt: 0, sideAt: 0, taken: 0 });
  }
  // le boss : à sa place dans le monde s'il y en a un, sinon là où il apparaît d'ordinaire
  let m = game.mobs.find((q) => q.type === id && q.state !== 'dead');
  let twin = null;
  if (!m) { const at = id === 'ame_anselme' ? [W.wreck.x * 16 + 60, W.wreck.y * 16 + 8] : null; if (!at) return { id, err: 'absent du monde' }; m = game.addMob(id, at[0], at[1], true); m.event = true; m.sunproof = true; }
  if (def.ai === 'frere') twin = game.mobs.find((q) => q !== m && q.type === def.twin);
  for (const q of game.mobs) if (q !== m && q !== twin && q.state !== 'dead' && Math.hypot(q.x - m.x, q.y - m.y) < 500) { q.state = 'dead'; q.deadUntil = Infinity; } // seuls face au boss
  const place = (p, x, y) => { if (!canStand(W, x, y) || roomIdAt(W, x, y) !== m.room) return false; p.x = x; p.y = y; p.room = m.room; p.zone = zoneAt(W, x, y); return true; };
  P.forEach(({ p }, i) => { const a0 = i / n * Math.PI * 2 + Math.PI; let done = false; for (let r = 34; r < 220 && !done; r += 6) for (const da of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) if (place(p, m.x + Math.cos(a0 + da) * r, m.y + Math.sin(a0 + da) * r)) { done = true; break; } });
  const byId = new Map(P.map((s) => [s.p.id, s]));
  // le relevé : capacités annoncées, cris, phases, dégâts
  const shouts = new Set(), styles = new Set(); let teles = 0, phases = 0;
  const danger = []; // zones annoncées encore actives
  const ev0 = game.ev.bind(game);
  const isBoss = (mid) => mid === m.id || (twin && mid === twin.id);
  game.ev = (x, y, e) => {
    if (e[0] === 'shout' && isBoss(e[1])) shouts.add(e[2]);
    if (e[0] === 'phase' && e[1] === m.id) phases = Math.max(phases, e[2]);
    if (e[0] === 'tele') { teles++; styles.add('c' + e[5]); danger.push({ k: 'c', x: e[1], y: e[2], r: e[3], at: game.time + e[4] }); }
    if (e[0] === 'pull') danger.push({ k: 'c', x: e[1], y: e[2], r: 72, at: game.time + e[5] + 0.3 }); // la marée qui attire : on lutte contre le courant
    if (e[0] === 'cloud') danger.push({ k: 'c', x: e[1], y: e[2], r: e[3], at: game.time + e[4] }); // les nuages restent : on les évite aussi
    if (e[0] === 'teleL') { teles++; styles.add('l' + e[7]); danger.push({ k: 'l', x0: e[1], y0: e[2], x1: e[3], y1: e[4], w: e[5], at: game.time + e[6] }); }
    if ((e[0] === 'wind' || e[0] === 'aim') && isBoss(e[1])) { // un coup armé : celui qu'il vise roule, ou fait un pas de côté
      const b = e[1] === m.id ? m : twin, s = byId.get(b.target);
      if (s && e[0] === 'wind' && e[3] > 0.2) s.rollAt = game.time + e[3] - 0.15;
      if (s && e[0] === 'aim') s.sideAt = game.time + e[3] + 0.05;
    }
    return ev0(x, y, e);
  };
  const dm0 = game.damageMob.bind(game); // ce que chaque pirate inflige (diagnostic, DIAG=1)
  game.damageMob = (mm, amount, src, ...rest) => { const s = src && byId.get(src.id); if (s && isBoss(mm.id)) { s.dealt = (s.dealt || 0) + amount; if (mm.shieldUntil > game.time || mm.linked) s.blocked = (s.blocked || 0) + 1; } return dm0(mm, amount, src, ...rest); };
  const dp0 = game.damagePlayer.bind(game);
  const bySrc = {};
  game.damagePlayer = (q, raw, src, crit, dot) => { const s = byId.get(q.id); if (s && !q.dead) { const h0 = q.hp; dp0(q, raw, src, crit, dot); s.taken += Math.max(0, h0 - q.hp); const k = (src && src.def ? (isBoss(src.id) ? 'boss' : src.type) : src ? 'autre' : 'milieu') + (dot ? '·' + dot : ''); bySrc[k] = (bySrc[k] || 0) + Math.max(0, h0 - q.hp); q.hp = q.stats.maxHp; q.dead = false; return; } return dp0(q, raw, src, crit, dot); };
  const segD = (px, py, z) => { const dx = z.x1 - z.x0, dy = z.y1 - z.y0, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - z.x0) * dx + (py - z.y0) * dy) / L)) : 0; return Math.hypot(px - (z.x0 + dx * t), py - (z.y0 + dy * t)); };
  const inDanger = (x, y) => danger.some((z) => z.at > game.time && (z.k === 'c' ? Math.hypot(x - z.x, y - z.y) < z.r + 8 : segD(x, y, z) < z.w / 2 + 8));
  const t0 = game.time, T = 20 * 240; let err = null, resets = 0; // retours au poste (le boss perd sa cible et revient, guéri)
  try {
    for (let step = 0; step < T; step++) {
      const alive = [m, twin].filter((q) => q && q.state !== 'dead');
      if (!alive.length) break;
      for (let i = danger.length - 1; i >= 0; i--) if (danger[i].at < game.time - 0.1) danger.splice(i, 1);
      P.forEach((s, i) => {
        const p = s.p;
        // seul : on use les deux frères ensemble ; à plusieurs : chacun le sien, pour les séparer
        const tgt = (n > 1 && alive.length > 1 ? alive[i % alive.length] : [...alive].sort((u, v) => v.hp / v.maxHp - u.hp / u.maxHp)[0]);
        s.budget = Math.min(SPEED * 0.9, s.budget + SPEED / 20);
        if (dodge && inDanger(p.x, p.y)) { // sortir de la zone annoncée, sans dépasser la vitesse d'un pirate
          let best = null; const out = Math.atan2(p.y - tgt.y, p.x - tgt.x); // d'abord vers l'extérieur, comme un vrai pirate
          for (let r = 12; r <= s.budget && !best; r += 6) for (let k = 0; k < 16; k++) { const a = out + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 8, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (canStand(W, x, y) && roomIdAt(W, x, y) === p.room && !inDanger(x, y)) { best = [x, y, r]; break; } }
          if (best) { p.x = best[0]; p.y = best[1]; s.budget -= best[2]; }
        } else { // revenir au contact, chacun à sa place autour du boss (à plusieurs, on s'écarte les uns des autres)
          let gx = tgt.x, gy = tgt.y;
          const other = alive.find((q) => q !== tgt);
          if (n > 1 && other && Math.hypot(other.x - tgt.x, other.y - tgt.y) < 190) { const d0 = Math.hypot(tgt.x - other.x, tgt.y - other.y) || 1; gx = tgt.x + (tgt.x - other.x) / d0 * 40; gy = tgt.y + (tgt.y - other.y) / d0 * 40; } // on entraîne son frère loin de l'autre
          else if (n > 1) { const a0 = i / n * Math.PI * 2; gx = tgt.x + Math.cos(a0) * 32; gy = tgt.y + Math.sin(a0) * 28; } // à la limite de l'allonge, écartés
          const d = Math.hypot(gx - p.x, gy - p.y);
          if (d > 6 && s.budget > 4) { const st = Math.min(d, s.budget), nx = p.x + (gx - p.x) / d * st, ny = p.y + (gy - p.y) / d * st; if (canStand(W, nx, ny) && (!dodge || !inDanger(nx, ny))) { p.x = nx; p.y = ny; s.budget -= st; } }
        }
        if (dodge && s.sideAt && game.time >= s.sideAt) { s.sideAt = 0; const a0 = Math.atan2(p.y - tgt.y, p.x - tgt.x) + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1); const nx = p.x + Math.cos(a0) * 26, ny = p.y + Math.sin(a0) * 26; if (canStand(W, nx, ny) && s.budget >= 20) { p.x = nx; p.y = ny; s.budget -= 26; } }
        if (dodge && s.rollAt && game.time >= s.rollAt) { s.rollAt = 0; game.onSkill(p, { s: 'roll', a: Math.atan2(p.y - tgt.y, p.x - tgt.x) }); }
        p.lastMoveAt = game.time; p.moveBudget = 0;
        const a = Math.atan2(tgt.y - 6 - (p.y - 8), tgt.x - p.x);
        game.onAttack(p, a);
        if (p.eq.gun && (p.cds.shot || 0) <= game.time) game.onSkill(p, { s: 'shot', a }); // au rythme réel de l'arme et de l'énergie
        if (p.air != null) p.air = Math.max(p.air, 20); // sous la mer : on ne mesure pas la noyade ici
      });
      const st0 = m.state; game.tick(); if (m.state === 'return' && st0 !== 'return') resets++;
    }
  } catch (e) { err = e.stack.split('\n').slice(0, 3).join(' | '); }
  const dur = game.time - t0, maxHp = P[0].p.stats.maxHp;
  const won = m.state === 'dead' && (!twin || twin.state === 'dead');
  const taken = P.reduce((a, s) => a + s.taken, 0) / n; // par pirate
  if (process.env.DIAG) console.log('   sources des dégâts (esquive ' + (dodge ? 'oui' : 'non') + ') :', Object.entries(bySrc).map(([k, v]) => `${k} ${Math.round(v)}`).join(', '));
  if (process.env.DIAG) console.log(id, n, 'pirates —', P.map((s) => `${s.p.name}: ${Math.round((s.dealt || 0) / dur)} dégâts/s${s.blocked ? ', ' + s.blocked + ' coups bloqués' : ''}`).join(' | '), '| PV du boss', m.maxHp);
  return { id, name: def.name, lvl: def.level, won, dur, phases, maxPh: (def.phases || []).length, shouts: shouts.size, styles: styles.size, teles, takenPct: taken / maxHp * 100, perMin: taken / maxHp * 100 / (dur / 60), err, resets, ai: def.ai || '-' };
}

const rows = [];
for (const id of BOSSES) { if (ONLY && id !== ONLY) continue; const a = await fight(id, false), b = await fight(id, true), g = await fight(id, true, 3); rows.push([a, b, g]); }
if (TABLE || ONLY) {
  console.log('boss                          niv  ia        vaincu  durée  phases  capacités  zones  PV perdus/min (sans esquive → en esquivant)  à trois : durée, PV perdus/min par pirate');
  for (const [a, b, g] of rows) console.log(`${(a.name || a.id).slice(0, 29).padEnd(30)}${String(a.lvl).padEnd(5)}${a.ai.padEnd(10)}${(b.won ? 'oui' : 'NON').padEnd(8)}${(Math.round(b.dur) + ' s').padEnd(7)}${(b.phases + '/' + b.maxPh).padEnd(8)}${String(b.shouts).padEnd(11)}${String(b.teles).padEnd(7)}${(Math.round(a.perMin) + ' % → ' + Math.round(b.perMin) + ' %').padEnd(48)}${g.won ? Math.round(g.dur) + ' s, ' + Math.round(g.perMin) + ' %' : 'NON'}${b.resets || g.resets ? `  [retours au poste : ${b.resets} solo, ${g.resets} à trois]` : ''}${a.err || b.err || g.err ? '  ERREUR ' + (a.err || b.err || g.err) : ''}`);
}
const errs = rows.filter(([a, b, g]) => a.err || b.err || g.err);
ok(!errs.length, `aucune erreur pendant les combats${errs.length ? ' — ' + errs.map(([a, b]) => a.id + ': ' + (a.err || b.err)).join(' ; ') : ''}`);
const lost = rows.filter(([, b]) => !b.won);
ok(!lost.length, `chaque boss se laisse vaincre par un pirate seul de son niveau (4 min au plus)${lost.length ? ' — non : ' + lost.map(([, b]) => b.id).join(', ') : ''}`);
const allPh = rows.filter(([, b]) => b.won && b.phases < b.maxPh);
ok(!allPh.length, `toutes les phases sont jouées${allPh.length ? ' — sautées : ' + allPh.map(([, b]) => `${b.id} ${b.phases}/${b.maxPh}`).join(', ') : ''}`);
const plain = rows.filter(([, b]) => MOBS[b.id].ai && b.teles === 0 && b.shouts < 2);
ok(!plain.length, `chaque boss à comportement montre ses capacités${plain.length ? ' — muets : ' + plain.map(([, b]) => b.id).join(', ') : ''}`);
const noAi = rows.filter(([a]) => !MOBS[a.id].ai);
ok(!noAi.length || noAi.every(([a]) => !MOBS[a.id].big), `aucun grand boss sans comportement propre${noAi.length ? ' (élites simples : ' + noAi.map(([a]) => a.id).join(', ') + ')' : ''}`);
// injuste : malgré une bonne esquive, on perd presque autant, et beaucoup (plus de 40 % de ses PV sur le combat)
const unfair = rows.filter(([a, b]) => b.won && b.teles > 0 && b.perMin > a.perMin * 0.85 && a.perMin > 60 && b.takenPct > 40);
ok(!unfair.length, `esquiver les zones annoncées protège vraiment${unfair.length ? ' — peu d’effet : ' + unfair.map(([a, b]) => `${a.id} ${Math.round(a.perMin)}→${Math.round(b.perMin)}`).join(', ') : ''}`);
const glost = rows.filter(([, , g]) => !g.won);
ok(!glost.length, `à trois aussi, chaque boss tombe (et les frères se laissent séparer)${glost.length ? ' — non : ' + glost.map(([, , g]) => g.id).join(', ') : ''}`);
// à plusieurs, le boss se renforce (+60 % de PV par pirate) : le combat dure à peu près autant, chacun encaisse moins
const slower = rows.filter(([, b, g]) => g.won && b.won && g.dur > b.dur * 1.7); // la Reine qui boit la marée varie beaucoup d'un combat à l'autre
ok(!slower.length, `à trois, le combat ne s’éternise pas (au plus 1,7 fois la durée en solo)${slower.length ? ' — non : ' + slower.map(([, b, g]) => `${b.id} ${Math.round(b.dur)}→${Math.round(g.dur)} s`).join(', ') : ''}`);
const reset = rows.filter(([, b, g]) => b.resets || g.resets);
ok(!reset.length, `aucun boss ne se remet à neuf tant qu’on se bat dans son repaire${reset.length ? ' — ' + reset.map(([, b, g]) => `${b.id} (${b.resets}/${g.resets})`).join(', ') : ''}`);
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
