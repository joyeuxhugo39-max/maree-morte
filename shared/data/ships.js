// 1.1 : les navires deviennent de vrais navires. On les arme à quai, dans un port ; ils restent dans le monde
// (ancrés, ou à la dérive si on les quitte voiles dehors) ; on monte à bord à pied, par la passerelle ou
// l'échelle, et l'on marche sur le pont. Le navire se mène à plusieurs postes : la barre (le gouvernail),
// les drisses du grand mât (la voilure), le cabestan (l'ancre) et les canons de chaque bord. Lourd, il
// prend son élan lentement, vire large, dérive dans les virages, et le vent compte.
//
// Repère local d'un navire : x le long de la coque (vers la proue), y en travers (vers tribord).
// Monde : x = sx + cos(a)·lx − sin(a)·ly, y = sy + sin(a)·lx + cos(a)·ly (a, le cap).
import { TILE } from '../constants.js';
import { canStand } from '../world.js';

// L longueur, B largeur ; masts (x, demi-vergue, hauteur) ; postes : barre, cabestan, canons (x, des deux
// bords) ; ouvertures dans le bastingage (x, largeur) ; physique : tau (élan, s), turn (rad/s au plus),
// rud (vitesse de la barre, /s), lat (dérive, s), mass ; lanterns (x, y).
export const SHIPS = {
  radeau: { L: 46, B: 32, shape: 'raft', masts: [{ x: 2, s: 17, h: 20 }], helm: -17, cap: 16, guns: [], open: true,
    tau: 1.7, turn: 0.95, rud: 1.7, lat: 0.35, mass: 1, lanterns: [] },
  barque: { L: 62, B: 28, shape: 'boat', masts: [{ x: 6, s: 15, h: 24 }], helm: -25, cap: 23, guns: [], ops: [{ x: -8, w: 16 }],
    tau: 1.9, turn: 0.85, rud: 1.5, lat: 0.4, mass: 1.5, lanterns: [[-28, 0]] },
  sloop: { L: 104, B: 38, shape: 'ship', masts: [{ x: 8, s: 22, h: 42 }], helm: -40, cap: 38, guns: [-14], ops: [{ x: 22, w: 14 }],
    tau: 2.7, turn: 0.6, rud: 1.0, lat: 0.6, mass: 3, lanterns: [[-50, 0], [48, 0]] },
  brick: { L: 126, B: 44, shape: 'ship', masts: [{ x: 28, s: 24, h: 46 }, { x: -16, s: 26, h: 52 }], helm: -50, cap: 48, guns: [8, -34], ops: [{ x: -6, w: 12 }],
    tau: 3.1, turn: 0.5, rud: 0.9, lat: 0.7, mass: 4, lanterns: [[-61, 0], [58, 0]] },
  goelette: { L: 134, B: 44, shape: 'ship', masts: [{ x: 30, s: 22, h: 50, gaff: 1 }, { x: -16, s: 24, h: 54, gaff: 1 }], helm: -54, cap: 52, guns: [10, -36], ops: [{ x: -6, w: 12 }],
    tau: 3.0, turn: 0.52, rud: 0.9, lat: 0.7, mass: 4, lanterns: [[-65, 0], [62, 0]] },
  spectre: { L: 130, B: 42, shape: 'ship', masts: [{ x: 30, s: 22, h: 50 }, { x: -16, s: 24, h: 54 }], helm: -52, cap: 50, guns: [10, -34], ops: [{ x: -6, w: 12 }],
    tau: 2.6, turn: 0.6, rud: 1.0, lat: 0.6, mass: 3.5, lanterns: [[-63, 0], [60, 0]] },
  galion: { L: 176, B: 60, shape: 'ship', masts: [{ x: 50, s: 30, h: 58 }, { x: 6, s: 34, h: 66 }, { x: -40, s: 28, h: 58 }], helm: -70, cap: 68, guns: [30, -14, -54], ops: [{ x: 12, w: 14 }],
    castle: [-88, -58], fore: [60, 88], tau: 4.6, turn: 0.34, rud: 0.65, lat: 0.95, mass: 7, lanterns: [[-86, -16], [-86, 16], [82, 0]] },
  veuve: { L: 190, B: 64, shape: 'ship', masts: [{ x: 56, s: 32, h: 62 }, { x: 8, s: 36, h: 70 }, { x: -42, s: 30, h: 62 }], helm: -76, cap: 72, guns: [40, 20, -24, -50], ops: [{ x: -3, w: 12 }],
    castle: [-95, -62], fore: [64, 95], tau: 4.2, turn: 0.38, rud: 0.7, lat: 0.9, mass: 7.5, lanterns: [[-93, -18], [-93, 18], [88, 0]] },
};
export const RAIL = 3; // épaisseur du bastingage
// les navires ennemis (monstres) ont aussi un gabarit : le leur, selon leur voilure
export const MOB_SHIP = { black: ['sloop', 'noir'], red: ['brick', 'brick'], ghost: ['galion', 'fantome'] };
export const mobShipKind = (def) => (MOB_SHIP[def.ship && def.ship.sail] || MOB_SHIP.black)[0];
// un point (au sol) touche-t-il la coque d'un navire de cap a ?
export function hullHit(S, sx, sy, a, x, y, pad = 3) { const c = Math.cos(a), s = Math.sin(a), dx = x - sx, dy = y - sy, lx = c * dx + s * dy, ly = -s * dx + c * dy; return Math.abs(lx) < S.L / 2 + 2 && Math.abs(ly) < hullHalf(S, lx) + pad; }
export const KNOT = 12; // pixels par seconde dans un nœud (pour l'affichage)
export const shipOf = (kind) => SHIPS[kind] || SHIPS.barque;

// demi-largeur de la coque à l'abscisse locale x : poupe presque carrée, ventre plein, proue effilée
export function hullHalf(S, x) {
  const t = (x + S.L / 2) / S.L;
  if (t < 0 || t > 1) return 0;
  if (S.shape === 'raft') return S.B / 2 * (t < 0.06 || t > 0.94 ? 0.86 : 1);
  const m = S.B / 2;
  if (t < 0.5) return m * (0.74 + 0.26 * Math.sin(t / 0.5 * Math.PI / 2));
  return m * Math.pow(Math.max(0, 1 - Math.pow((t - 0.5) / 0.5, 2)), 0.62);
}
export const insideHull = (S, lx, ly, pad = 0) => Math.abs(ly) <= hullHalf(S, lx) + pad;
export const toWorld = (sh, lx, ly) => { const c = Math.cos(sh.a), s = Math.sin(sh.a); return [sh.x + c * lx - s * ly, sh.y + s * lx + c * ly]; };
export const toLocal = (sh, x, y) => { const c = Math.cos(sh.a), s = Math.sin(sh.a), dx = x - sh.x, dy = y - sh.y; return [c * dx + s * dy, -s * dx + c * dy]; };

// les postes, en coordonnées locales : où l'on se tient pour les tenir
export function stations(S) {
  if (S._st) return S._st;
  const main = S.masts.reduce((b, m) => (m.s > b.s ? m : b), S.masts[0]);
  const st = [{ k: 'helm', x: S.helm + 5, y: 0, at: [S.helm, 0] }, { k: 'sails', x: main.x - 9, y: 0, at: [main.x, 0] }, { k: 'cap', x: S.cap - 8, y: 0, at: [S.cap, 0] }];
  S.guns.forEach((gx, i) => { for (const side of [-1, 1]) { const hw = hullHalf(S, gx); st.push({ k: 'gun', i: i * 2 + (side > 0 ? 1 : 0), side, x: gx, y: side * (hw - 15), at: [gx, side * (hw - 7)] }); } });
  return (S._st = st);
}
// les obstacles du pont (mâts, barre, cabestan, canons)
function obstacles(S) {
  if (S._ob) return S._ob;
  const o = S.masts.map((m) => [m.x, 0, 3.5]);
  o.push([S.helm, 0, 4], [S.cap, 0, 4.5]);
  for (const s of stations(S)) if (s.k === 'gun') o.push([s.at[0], s.at[1], 4]);
  return (S._ob = o);
}
export function openingAt(S, lx) {
  if (S.open) return { x: lx, w: 99 };
  for (const op of S.ops || []) if (Math.abs(lx - op.x) <= op.w / 2) return op;
  return null;
}
// un pirate (rayon ~4) peut-il se tenir là sur le pont ?
export function deckOk(S, lx, ly) {
  if (lx < -S.L / 2 + 6 || lx > S.L / 2 - 9) return false;
  const hw = Math.min(hullHalf(S, lx - 4), hullHalf(S, lx + 4));
  if (Math.abs(ly) > hw - RAIL - 3) return false;
  for (const [ox, oy, r] of obstacles(S)) if (Math.hypot(lx - ox, ly - oy) < r + 3.5) return false;
  return true;
}
// marcher sur le pont : glisser le long du bastingage et des mâts
export function deckMove(S, lx, ly, dx, dy) {
  if (deckOk(S, lx + dx, ly + dy)) return [lx + dx, ly + dy];
  if (dx && deckOk(S, lx + dx, ly)) return [lx + dx, ly];
  if (dy && deckOk(S, lx, ly + dy)) return [lx, ly + dy];
  return [lx, ly];
}
// le point de pont le plus proche d'une position locale (pour monter à bord, ou après un choc)
export function nearestDeck(S, lx, ly) {
  if (deckOk(S, lx, ly)) return [lx, ly];
  for (let r = 2; r < S.B; r += 2) for (let k = 0; k < 16; k++) {
    const x = lx + Math.cos(k / 16 * Math.PI * 2) * r, y = ly + Math.sin(k / 16 * Math.PI * 2) * r;
    if (deckOk(S, x, y)) return [x, y];
  }
  return [0, 0];
}

// l'empreinte de la coque (des points sur son pourtour) et ses cercles (pour les chocs entre navires)
export function footprint(S) {
  if (S._fp) return S._fp;
  const pts = [[S.L / 2, 0], [-S.L / 2, hullHalf(S, -S.L / 2 + 1) * 0.9], [-S.L / 2, -hullHalf(S, -S.L / 2 + 1) * 0.9]];
  const n = Math.max(3, Math.round(S.L / 18));
  for (let k = 0; k <= n; k++) { const x = -S.L / 2 + 2 + (S.L - 8) * k / n, hw = hullHalf(S, x); if (hw > 1) pts.push([x, hw], [x, -hw]); }
  return (S._fp = pts);
}
export function circles(S) {
  if (S._ci) return S._ci;
  const n = Math.max(1, Math.ceil(S.L / S.B)), r = S.B / 2 + 1, out = [];
  for (let k = 0; k < n; k++) out.push([n === 1 ? 0 : -S.L / 2 + r + (S.L - 2 * r) * k / (n - 1), r * (k === n - 1 && n > 1 ? 0.8 : 1)]);
  return (S._ci = out);
}
const sailable = (world, x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return tx >= 0 && ty >= 0 && tx < world.W && ty < world.H && world.sail[ty * world.W + tx] === 1; };
export function hullClear(world, S, x, y, a) {
  const c = Math.cos(a), s = Math.sin(a);
  for (const [lx, ly] of footprint(S)) if (!sailable(world, x + c * lx - s * ly, y + s * lx + c * ly)) return false;
  return true;
}
// deux navires se chevauchent-ils ? (renvoie la poussée à appliquer au premier, ou null)
export function shipOverlap(A, SA, B, SB) {
  let best = null;
  for (const [ax, ar] of circles(SA)) {
    const pa = [A.x + Math.cos(A.a) * ax, A.y + Math.sin(A.a) * ax];
    for (const [bx, br] of circles(SB)) {
      const pb = [B.x + Math.cos(B.a) * bx, B.y + Math.sin(B.a) * bx], d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]), o = ar + br - d;
      if (o > 0 && (!best || o > best[2])) best = [(pa[0] - pb[0]) / (d || 1), (pa[1] - pb[1]) / (d || 1), o];
    }
  }
  return best;
}
export function shipFits(world, S, x, y, a, ships, selfId) {
  if (!hullClear(world, S, x, y, a)) return false;
  if (ships) for (const o of ships) if (o.id !== selfId && !o.sinkT && Math.hypot(o.x - x, o.y - y) < (S.L + shipOf(o.kind).L) / 2 + 4 && shipOverlap({ x, y, a }, S, o, shipOf(o.kind))) return false;
  return true;
}
// la passerelle : de l'ouverture d'un bord jusqu'à la terre ferme (un quai, une plage, des hauts-fonds)
export function gangway(world, S, sh, side) {
  const ops = S.open ? [{ x: 0, w: S.L * 0.7 }] : S.ops || [];
  let best = null;
  for (const op of ops) for (const ox of S.open ? [-S.L * 0.3, 0, S.L * 0.3] : [op.x]) {
    const hw = hullHalf(S, ox), n = [-Math.sin(sh.a) * side, Math.cos(sh.a) * side];
    const [rx, ry] = toWorld(sh, ox, side * hw);
    for (let g = 2; g <= 30; g += 2) {
      const x = rx + n[0] * g, y = ry + n[1] * g;
      if (canStand(world, x, y + 4)) { if (!best || g < best.gap) best = { gap: g, ox, side, x, y: y + 4 }; break; }
    }
  }
  return best;
}

// ------------------------------------------------------------------ les quais d'armement (une bitte d'amarrage par port)
export const BERTHS = [
  { key: 'port', place: 'port', name: 'Quai de Port-Lanterne', tx: 147, ty: 127 },
  { key: 'rade', place: 'rade', name: 'Ponton de la Rade', tx: 408, ty: 112 },
  { key: 'havre', place: 'havre', name: 'Jetée de Havre-des-Brumes', tx: 226, ty: 80 },
  { key: 'anse', place: 'anse', name: 'Ponton d’Anse-Tranquille', tx: 150, ty: 288 },
  { key: 'lib', place: 'lib', name: 'Darse de Libertalia', tx: 758, ty: 352 },
  { key: 'lib2', place: 'lib', name: 'Môle des Corsaires', tx: 729, ty: 347 },
];
export const berthPos = (b) => [b.tx * TILE + 8, b.ty * TILE + 8];
export function berthNear(x, y, r = 40) { for (const b of BERTHS) { const [bx, by] = berthPos(b); if (Math.hypot(bx - x, by - y) < r) return b; } return null; }
export function berthOfPlace(place) { return BERTHS.find((b) => b.place === place) || null; }
// trouver une place à quai : la coque sur l'eau libre, à l'écart des autres navires, la passerelle sur le quai
export function findBerth(world, S, b, ships) {
  // d'abord parallèle aux quais (les quatre caps droits), sinon n'importe quel cap
  return berthSearch(world, S, b, ships, [0, 4, 8, 12]) || berthSearch(world, S, b, ships, [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15]);
}
function berthSearch(world, S, b, ships, heads) {
  const [px, py] = berthPos(b);
  let best = null;
  for (let dy = -170; dy <= 170; dy += 6) for (let dx = -170; dx <= 170; dx += 6) {
    const x = px + dx, y = py + dy;
    if (dx * dx + dy * dy > 170 * 170 || !sailable(world, x, y)) continue;
    for (const k of heads) {
      const a = k / 16 * Math.PI * 2;
      if (!shipFits(world, S, x, y, a, ships)) continue;
      for (const side of [-1, 1]) {
        const g = gangway(world, S, { x, y, a }, side);
        if (!g || g.gap > 24) continue;
        const sc = g.gap + Math.hypot(g.x - px, g.y - py) * 0.3;
        if (!best || sc < best.sc) best = { sc, x, y, a, side };
      }
    }
  }
  return best;
}

// ------------------------------------------------------------------ le vent (le même pour tout l'archipel)
// il tourne lentement au fil des heures ; un navire file plus vite vent arrière, moitié moins face au vent
export function windAt(t) {
  return { a: 0.6 + 1.1 * Math.sin(t / 640) + 0.5 * Math.sin(t / 173 + 1.7), s: 0.85 + 0.15 * Math.sin(t / 290) };
}
export function windFactor(heading, windA) {
  const c = Math.cos(heading - windA);
  return 0.5 + 0.5 * Math.pow((1 + c) / 2, 0.8);
}
export const WIND_NAMES = ['d’est', 'de sud-est', 'du sud', 'de sud-ouest', 'd’ouest', 'de nord-ouest', 'du nord', 'de nord-est'];
// le vent « vient de » l'opposé de là où il souffle
export const windName = (a) => WIND_NAMES[((Math.round((a + Math.PI) / (Math.PI / 4)) % 8) + 8) % 8];
