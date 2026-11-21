// Lot 6 : ce qui doit être calculé À L'IDENTIQUE par le serveur (qui arbitre) et par le client (qui dessine) :
// les cibles du concours de canonniers, les tonneaux et la bôme du parcours du gabier. Tout dépend d'une graine et
// du temps écoulé : rien ne voyage sur le réseau, et personne ne peut tricher en déplaçant une cible.
import { mulberry32 } from './rng.js';
import { CANON, CANON_PATTERNS, TARGETS } from './data/festival.js';

// ------------------------------------------------------------ le concours de canonniers
// lane : le couloir d'eau du canon (en pixels du monde). Les cibles le traversent d'un bord à l'autre.
export function canonTargets(variant, seed, lane) {
  const rnd = mulberry32(seed >>> 0), P = CANON_PATTERNS[variant] || CANON_PATTERNS[0], out = [];
  const W = lane.x1 - lane.x0;
  const add = (kind, t0) => {
    const T = TARGETS[kind], dir = rnd() < 0.5 ? 1 : -1, sp = T.sp * (0.85 + rnd() * 0.3);
    const y = lane.y0 + 10 + rnd() * (lane.y1 - lane.y0 - 20);
    out.push({ i: out.length, kind, t0, dur: (W + 24) / sp, dir, x0: dir > 0 ? lane.x0 - 12 : lane.x1 + 12, y, sp, r: T.r, pts: T.pts, ph: rnd() * 6.28 });
  };
  if (variant === 2) for (const t0 of [0.5, 14, 28]) add('galion', t0); // le galion de carton passe, lentement, trois fois
  let t = 0.4;
  while (t < CANON.round - 1) { add(P.kinds[Math.floor(rnd() * P.kinds.length)], t); t += 1.6 + rnd() * 1.4; }
  if (rnd() < 0.09) add('mouette_or', 8 + rnd() * (CANON.round - 16)); // un secret : la mouette d'or
  return out;
}
export function targetAt(tg, t) {
  const a = t - tg.t0;
  if (a < 0 || a > tg.dur) return null;
  const x = tg.x0 + tg.dir * tg.sp * a;
  const wob = tg.kind === 'mouette' || tg.kind === 'mouette_or' ? Math.sin(a * 2.4 + tg.ph) * 9 : tg.kind === 'galion' ? Math.sin(a * 0.8 + tg.ph) * 2 : Math.sin(a * 1.3 + tg.ph) * 2.5;
  return { x, y: tg.y + wob };
}
// le boulet tombe en (x, y) au temps t de la manche : la première cible touchée (pas déjà coulée), ou -1
export function canonHit(targets, hits, x, y, t) {
  let best = -1, bd = 1e9;
  for (const tg of targets) {
    if (hits.has(tg.i)) continue;
    const p = targetAt(tg, t); if (!p) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= CANON.hitR + tg.r && d < bd) { bd = d; best = tg.i; }
  }
  return best;
}

// ------------------------------------------------------------ le parcours du gabier : les tonneaux et la bôme
export const BARREL_R = 12, BARREL_SP = 64, BARREL_P = [3.0, 3.6, 3.25];
// G : world.fest.gabier ; t : l'horloge des obstacles (le temps du serveur, en secondes)
export function gabBarrels(G, t) {
  const B = G.barrels, L = B.x0 - B.x1, travel = L / BARREL_SP, out = [];
  const ys = [B.lanes[0] - 8, B.lanes[1], B.lanes[2] + 8]; // trois couloirs qui se chevauchent : aucune rangée n'est sûre
  ys.forEach((y, j) => {
    const P = BARREL_P[j], ph = j * 1.1;
    for (let k = 0; k * P < travel + P; k++) {
      const age = ((t - ph) % P + P) % P + k * P;
      if (age > travel) continue;
      out.push({ x: B.x0 - age * BARREL_SP, y, a: age * BARREL_SP / BARREL_R });
    }
  });
  return out;
}
export function gabBoom(G, t) {
  const b = G.boom, th = 1.2 * Math.sin((t / 3.4) * Math.PI * 2);
  return { x0: b.x, y0: b.y, x1: b.x + Math.cos(th) * b.len * 0.35, y1: b.y + Math.sin(th) * b.len, th };
}
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
  const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
}

// ------------------------------------------------------------ un chemin de mer (A* sur une grille grossière) : pour les rivaux de la course
// water(tx, ty) dit si une case est navigable ; clear : la distance à la côte à garder (en cases)
export function seaPath(water, a, b, clear = 3, step = 2, box = null) {
  const ok = (tx, ty) => { for (let dy = -clear; dy <= clear; dy += clear) for (let dx = -clear; dx <= clear; dx += clear) if (!water(tx + dx, ty + dy)) return false; return true; };
  const snap = (v) => Math.round(v / step) * step;
  const S = [snap(a[0]), snap(a[1])], E = [snap(b[0]), snap(b[1])];
  const key = (x, y) => x * 4096 + y, B = box || [Math.min(S[0], E[0]) - 80, Math.min(S[1], E[1]) - 80, Math.max(S[0], E[0]) + 80, Math.max(S[1], E[1]) + 80];
  const open = [[0, S[0], S[1]]], g = new Map([[key(S[0], S[1]), 0]]), from = new Map();
  const h = (x, y) => Math.hypot(x - E[0], y - E[1]);
  let found = false, guard = 0;
  while (open.length && guard++ < 60000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, x, y] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (Math.abs(x - E[0]) <= step && Math.abs(y - E[1]) <= step) { E[0] = x; E[1] = y; found = true; break; }
    const gc = g.get(key(x, y));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx * step, ny = y + dy * step;
      if (nx < B[0] || ny < B[1] || nx > B[2] || ny > B[3] || !ok(nx, ny)) continue;
      const ng = gc + Math.hypot(dx, dy) * step, k = key(nx, ny);
      if (ng < (g.get(k) ?? 1e9)) { g.set(k, ng); from.set(k, [x, y]); open.push([ng + h(nx, ny), nx, ny]); }
    }
  }
  if (!found) return [a, b];
  const pts = [[E[0], E[1]]]; let c = [E[0], E[1]];
  while (from.has(key(c[0], c[1]))) { c = from.get(key(c[0], c[1])); pts.push(c); }
  pts.reverse();
  // on tend le chemin : on saute les points tant que la ligne droite reste en eau libre
  const line = (p, q) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]); for (let s = 0; s <= L; s += 0.7) { const x = p[0] + (q[0] - p[0]) * s / L, y = p[1] + (q[1] - p[1]) * s / L; if (!ok(Math.round(x), Math.round(y))) return false; } return true; };
  const out = [a]; let i = 0;
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !line(out[out.length - 1], pts[j])) j--; out.push(pts[j]); i = j; }
  out.push(b);
  return out;
}
