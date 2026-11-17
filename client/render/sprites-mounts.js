// Montures (0.8) : chevaux, âne, destrier squelette, autruche, tortue géante et crabe géant.
// Chaque feuille : 4 directions (bas, gauche, droite, haut) x 4 pas, en deux couches :
// « dos » (dessinée sous le cavalier) et « avant » (la tête, par-dessus, quand la bête nous fait face).
// seat[dir] : où poser les pieds du cavalier (par rapport à l'ancre de la bête) et combien couper de ses jambes.
import { PB, mix, shade } from './pixel.js';

const FWm = 36, FHm = 32, AXm = 18, AYm = 30;
const OUT = 0x140c12;
const ramp = (a, b, c, d, e) => [a, b, c, d, e];
const SPECIES = {
  ane: { kind: 'horse', scale: 0.86, coat: ramp(0x2e2622, 0x4a3e36, 0x6e6058, 0x8e8076, 0xb0a296), mane: 0x2a201c, muzzle: 0xcfc4b6, ears: 1.9, saddle: [0x5a3a22, 0x7a5232], blanket: [0x3a6a3a, 0x5a8a4a], tail: 'tuft', cross: 1 },
  cheval: { kind: 'horse', scale: 1, coat: ramp(0x3a1e10, 0x5c321a, 0x80482a, 0xa0603a, 0xc0804e), mane: 0x24140c, muzzle: 0x3a2418, ears: 1, saddle: [0x4a2c16, 0x6e4422], blanket: [0x7a1a1a, 0xb03030], tail: 'long', sock: 0xe8e0d0 },
  pursang: { kind: 'horse', scale: 1.04, slim: 1, coat: ramp(0x0c0a10, 0x18141e, 0x262030, 0x3a3248, 0x5a4e6e), mane: 0x06060a, muzzle: 0x1a1620, ears: 1, saddle: [0x2a1a10, 0x4a2c18], blanket: [0x5a0e1a, 0x9a1a2a], gold: 0xf2c14a, tail: 'long' },
  squelette: { kind: 'horse', scale: 1.04, slim: 1, bone: 1, coat: ramp(0x3c3628, 0x6c644e, 0x9e9478, 0xcec4a6, 0xf2ecd8), mane: 0x4aff7a, muzzle: 0xcec4a6, ears: 1, saddle: [0x1a1418, 0x2e2428], blanket: [0x1e3a24, 0x2e6a3a], tail: 'flame', eye: 0x7aff8a },
  autruche: { kind: 'ostrich' },
  tortue: { kind: 'turtle' },
  crabe: { kind: 'crab' },
};

// une patte : de la hanche (x0, y0) au sabot (x1, y1), avec un sabot sombre
function leg(pb, x0, y0, x1, y1, c, hoof, w = 2) {
  pb.line(x0, y0, x1, y1, c, w);
  if (hoof !== undefined) { pb.set(x1, y1, hoof); if (w > 1) pb.set(x1 + 1, y1, hoof); }
}
const phaseOf = (f) => [0, 1, 0, -1][f & 3];

// ---------------------------------------------------------------- chevaux (et âne, et squelette)
function horseSide(S, f) { // tourné vers la droite
  const back = new PB(FWm, FHm), front = null, C = S.coat, s = S.scale || 1;
  const L = Math.round(9 * s * (S.slim ? 1.08 : 1)), by = AYm - L, bx = AXm - 1;
  const ph = phaseOf(f), lift = (k) => (k ? Math.max(0, k) * 2 : 0);
  // pattes du fond (plus sombres), puis celles de devant
  const legsAt = [[bx - 7 * s, -ph], [bx + 6 * s, ph], [bx - 5 * s, ph], [bx + 8 * s, -ph]];
  for (let k = 0; k < 4; k++) {
    const [x, p] = legsAt[k], far = k < 2;
    const col = S.bone ? C[far ? 1 : 3] : C[far ? 1 : 2];
    const hx = Math.round(x + p * 2), hy = AYm - lift(p) + (far ? -1 : 0);
    leg(back, Math.round(x), by + 1, hx, hy, col, S.bone ? C[0] : (S.sock && !far && k === 3 ? S.sock : 0x18100c), S.bone ? 1 : 2);
    if (S.sock && !far) { back.set(hx, hy - 1, S.sock); back.set(hx + 1, hy - 1, S.sock); }
  }
  // queue
  const tx = Math.round(bx - 10 * s), ty = by - 6;
  if (S.tail === 'flame') { for (let k = 0; k < 7; k++) back.set(tx - (k >> 1), ty + k, k % 2 ? 0x3aff6a : 0xb0ffb8); }
  else for (let k = 0; k < (S.tail === 'tuft' ? 6 : 8); k++) { back.set(tx - (k > 2 ? 1 : 0) - (k > 5 ? 1 : 0), ty + k, S.mane); if (S.tail !== 'tuft' || k > 3) back.set(tx - (k > 2 ? 1 : 0) + 1, ty + k, k > 5 ? S.mane : shade(S.mane, 1.4)); }
  // corps
  const rx = 10 * s, ry = 4.6 * s, cy = by - 4.5 * s;
  if (S.bone) { // cage thoracique : des côtes et du vide
    back.ellipse(bx, cy, rx, ry, C[1]);
    for (let x = Math.round(bx - rx + 2); x <= bx + rx - 3; x += 2) for (let y = Math.round(cy - ry + 2); y <= cy + ry - 1; y++) back.set(x, y, C[3]);
    for (let x = Math.round(bx - rx + 1); x <= bx + rx - 1; x++) { back.set(x, Math.round(cy - ry), C[4]); back.set(x, Math.round(cy - ry + 1), C[2]); }
    back.set(bx - 2, cy + 1, 0x3aff6a);
  } else {
    back.blob(bx, cy, rx, ry, C, {});
    if (S.cross) for (let x = Math.round(bx - rx + 3); x <= bx + rx - 3; x++) back.set(x, Math.round(cy - ry + 1), C[1]);
  }
  // encolure, crinière et tête
  const nx0 = Math.round(bx + rx - 3), ny0 = Math.round(cy - 1), hx = Math.round(bx + rx + 3 * s), hy = Math.round(cy - 8 * s);
  for (let k = 0; k <= 6; k++) {
    const t = k / 6, x = Math.round(nx0 + (hx - 1 - nx0) * t), y = Math.round(ny0 + (hy + 1 - ny0) * t);
    for (let w = -1; w <= 1; w++) back.set(x + w, y, S.bone ? (w ? C[1] : C[3]) : C[w < 0 ? 2 : w > 0 ? 3 : 2]);
    back.set(x - 2, y, S.bone ? (k % 2 ? S.mane : 0) || S.mane : S.mane); // crinière
    if (S.bone && k % 2) back.set(x - 2, y - 1, 0xb0ffb8);
  }
  // tête
  back.ellipse(hx + 1, hy, 3.2 * s, 2 * s, S.bone ? C[3] : C[3]);
  for (let x = hx + 2; x <= hx + 4 + Math.round(s); x++) back.set(x, hy + 1, S.muzzle);
  back.set(hx + 4 + Math.round(s), hy + 1, S.bone ? C[1] : shade(S.muzzle, 0.7));
  back.set(hx, hy - 1, S.eye || 0x0a0606); if (S.eye) back.set(hx - 1, hy - 1, mix(S.eye, 0xffffff, 0.5));
  // oreilles
  const eh = Math.round(2 * (S.ears || 1));
  for (let k = 0; k < eh; k++) back.set(hx - 1, hy - 2 - k, k === eh - 1 ? C[1] : C[2]);
  // selle et couverture
  const sx = Math.round(bx - 3 * s), sy = Math.round(cy - ry);
  for (let x = sx - 3; x <= sx + 4; x++) for (let y = sy; y <= sy + 3; y++) back.set(x, y, y === sy + 3 ? S.blanket[0] : S.blanket[1]);
  if (S.gold) for (let x = sx - 3; x <= sx + 4; x++) back.set(x, sy + 3, S.gold);
  for (let x = sx - 2; x <= sx + 2; x++) { back.set(x, sy - 1, S.saddle[1]); back.set(x, sy, S.saddle[0]); }
  back.set(sx - 3, sy - 2, S.saddle[1]); back.set(sx + 3, sy - 2, S.saddle[1]);
  back.set(sx, sy + 4, 0x2a2a30); back.set(sx, sy + 5, 0x8a8a96); // étrier
  return { back, front, seat: { x: sx - AXm, y: sy + 8 - AYm } };
}
function horseFront(S, f, facing) { // facing : 0 face (bas), 3 dos (haut)
  const back = new PB(FWm, FHm), front = new PB(FWm, FHm), C = S.coat, s = S.scale || 1;
  const L = Math.round(8 * s), by = AYm - L, cx = AXm;
  const ph = phaseOf(f);
  const w = Math.round(6 * s);
  // pattes : celles du fond plus courtes et plus sombres
  for (const [dx, p, far] of [[-w + 2, ph, 1], [w - 2, -ph, 1], [-w + 1, -ph, 0], [w - 1, ph, 0]]) {
    const top = by + (far ? 0 : 2), bot = AYm - (far ? 2 : 0) - Math.max(0, p) * 2;
    leg(back, cx + dx, top, cx + dx, bot, S.bone ? C[far ? 1 : 3] : C[far ? 1 : 2], S.bone ? C[0] : 0x18100c, S.bone ? 1 : 2);
  }
  // corps vu de face ou de dos
  const ry = 5.5 * s, cy = by - 3;
  if (S.bone) { back.ellipse(cx, cy, w + 1, ry, C[1]); for (let y = Math.round(cy - ry + 2); y < cy + ry; y += 2) back.hl(cx - w, y, w * 2 + 1, C[3]); }
  else back.blob(cx, cy, w + 1, ry, C, {});
  // couverture et selle, de part et d'autre
  for (let y = Math.round(cy - ry + 1); y <= cy + 1; y++) { back.set(cx - w - 1, y, S.blanket[1]); back.set(cx + w + 1, y, S.blanket[1]); }
  for (let x = cx - 3; x <= cx + 3; x++) back.set(x, Math.round(cy - ry), S.saddle[1]);
  if (facing === 3) { // de dos : la queue, la croupe, et la tête au loin
    if (S.tail === 'flame') for (let k = 0; k < 8; k++) back.set(cx + (k % 3) - 1, Math.round(cy + 1 + k), k % 2 ? 0x3aff6a : 0xb0ffb8);
    else for (let k = 0; k < 8; k++) { back.set(cx, Math.round(cy + 1 + k), S.mane); back.set(cx + (k > 4 ? 1 : 0), Math.round(cy + 1 + k), shade(S.mane, 1.3)); }
    const hy = Math.round(cy - ry - 6 * s);
    for (let y = hy + 2; y <= cy - ry; y++) for (let x = cx - 1; x <= cx + 1; x++) back.set(x, y, x === cx ? S.mane : C[2]);
    back.ellipse(cx, hy, 2.4 * s, 2.4 * s, C[2]);
    const eh = Math.round(2 * (S.ears || 1));
    for (let k = 0; k < eh; k++) { back.set(cx - 2, hy - 2 - k, C[2]); back.set(cx + 2, hy - 2 - k, C[2]); }
    return { back, front: null, seat: { x: 0, y: Math.round(cy - ry) + 9 - AYm } };
  }
  // de face : l'encolure et la tête passent devant le cavalier
  const hy = Math.round(cy + 2); // la tête, plus bas : on voit le buste du cavalier
  for (let y = Math.round(cy - ry + 2); y <= hy; y++) for (let x = cx - 2; x <= cx + 2; x++) front.set(x, y, x === cx - 2 || x === cx + 2 ? C[1] : S.bone ? C[3] : C[2]);
  for (let y = Math.round(cy - ry + 1); y <= cy - ry + 3; y++) front.set(cx, y, S.mane);
  front.ellipse(cx, hy + 1, 2.6 * s, 3.4 * s, S.bone ? C[3] : C[3]);
  for (let x = cx - 1; x <= cx + 1; x++) { front.set(x, hy + 4, S.muzzle); front.set(x, hy + 5, shade(S.muzzle, 0.8)); }
  front.set(cx - 1, hy + 5, 0x0a0606); front.set(cx + 1, hy + 5, 0x0a0606);
  front.set(cx - 2, hy, S.eye || 0x0a0606); front.set(cx + 2, hy, S.eye || 0x0a0606);
  if (!S.bone) front.set(cx, hy - 1, mix(C[4], 0xffffff, 0.4)); // liste blanche
  const eh = Math.round(2 * (S.ears || 1));
  for (let k = 0; k < eh; k++) { front.set(cx - 2, Math.round(cy - ry + 1 - k), C[2]); front.set(cx + 2, Math.round(cy - ry + 1 - k), C[2]); }
  return { back, front, seat: { x: 0, y: Math.round(cy - ry) + 9 - AYm } };
}

// ---------------------------------------------------------------- autruche (deux pattes, long cou)
const OST = { feather: [0x0e0c10, 0x1c1820, 0x2c2632, 0x403848, 0x585064], plume: 0xf2eee6, skin: 0xd8a89a, skin2: 0xa87868, beak: 0xe8b860 };
function ostrichSide(f) {
  const back = new PB(FWm, FHm), ph = phaseOf(f), bx = AXm - 1, by = AYm - 12;
  for (const [p, far] of [[-ph, 1], [ph, 0]]) leg(back, bx + (far ? 1 : 0), by + 3, bx + p * 3 + (far ? 1 : 0), AYm - Math.max(0, p) * 2, far ? OST.skin2 : OST.skin, 0x6a4a40, 2);
  back.blob(bx, by - 1, 8, 5, OST.feather, {});
  for (let k = 0; k < 5; k++) { back.set(bx - 8 - (k >> 1), by - 3 + k, OST.plume); back.set(bx - 7 - (k >> 1), by - 4 + k, mix(OST.plume, 0xc8c0b0, 0.4)); }
  for (let k = 0; k < 4; k++) back.set(bx - 3 + k, by + 2, OST.plume); // aile
  for (let k = 0; k <= 10; k++) { const x = bx + 6 + Math.round(Math.sin(k / 10 * 1.2) * 3), y = by - 3 - k; back.set(x, y, OST.skin); back.set(x + 1, y, OST.skin2); }
  const hx = bx + 9, hy = by - 14;
  back.ellipse(hx, hy, 2.2, 1.8, OST.skin); back.set(hx + 1, hy - 1, 0x0a0606);
  back.set(hx + 2, hy + 1, OST.beak); back.set(hx + 3, hy + 1, OST.beak); back.set(hx + 4, hy + 1, shade(OST.beak, 0.8));
  for (let k = 0; k < 3; k++) back.set(hx - 1 - k, hy - 1, OST.feather[2]);
  return { back, front: null, seat: { x: -1, y: by - 5 + 8 - AYm } };
}
function ostrichFront(f, facing) {
  const back = new PB(FWm, FHm), front = new PB(FWm, FHm), ph = phaseOf(f), cx = AXm, by = AYm - 12;
  for (const [dx, p] of [[-2, ph], [2, -ph]]) leg(back, cx + dx, by + 3, cx + dx, AYm - Math.max(0, p) * 2, OST.skin, 0x6a4a40, 2);
  back.blob(cx, by - 1, 7, 5.5, OST.feather, {});
  for (const dx of [-7, 7]) for (let k = 0; k < 4; k++) back.set(cx + dx + (dx < 0 ? k >> 1 : -(k >> 1)), by - 2 + k, OST.plume);
  const L = facing === 3 ? back : front;
  if (facing === 3) for (let k = 0; k < 5; k++) back.set(cx - 2 + k, by + 3, OST.plume);
  for (let k = 0; k <= 9; k++) { L.set(cx, by - 5 - k, OST.skin); L.set(cx + 1, by - 5 - k, OST.skin2); }
  L.ellipse(cx, by - 16, 2.2, 2, OST.skin);
  if (facing !== 3) { L.set(cx - 1, by - 16, 0x0a0606); L.set(cx + 1, by - 16, 0x0a0606); L.set(cx, by - 14, OST.beak); }
  return { back, front: facing === 3 ? null : front, seat: { x: 0, y: by - 6 + 8 - AYm } };
}

// ---------------------------------------------------------------- tortue géante
const TUR = { shell: [0x1e2a12, 0x34461c, 0x4e6428, 0x6a8236, 0x8aa04a], rim: 0xb89a5a, skin: [0x3a4a2a, 0x56683a, 0x74884e, 0x96a868] };
function turtleSide(f) {
  const back = new PB(FWm, FHm), ph = phaseOf(f), bx = AXm, by = AYm - 6;
  for (const [x, p, far] of [[bx - 8, -ph, 1], [bx + 7, ph, 1], [bx - 6, ph, 0], [bx + 9, -ph, 0]]) {
    back.rect(Math.round(x + p), by + 1, 3, 4 - (far ? 1 : 0), TUR.skin[far ? 1 : 2]); back.set(Math.round(x + p), by + 4, TUR.skin[0]);
  }
  back.ellipse(bx + 13 + Math.max(0, ph), by - 2, 3, 2.4, TUR.skin[2]); back.set(bx + 14 + Math.max(0, ph), by - 3, 0x0a0606); // tête
  back.blob(bx, by - 4, 12, 6, TUR.shell, {});
  for (const [x, y] of [[-6, -6], [0, -8], [6, -6], [-3, -3], [3, -3]]) { back.ellipse(bx + x, by + y, 2.4, 1.6, TUR.shell[1]); back.ellipse(bx + x, by + y - 0.5, 1.6, 1, TUR.shell[3]); }
  for (let x = bx - 11; x <= bx + 11; x++) back.set(x, by + 1, TUR.rim);
  back.set(bx - 13, by - 1, TUR.skin[1]); back.set(bx - 14, by, TUR.skin[1]); // queue
  return { back, front: null, seat: { x: 0, y: by - 9 + 8 - AYm } };
}
function turtleFront(f, facing) {
  const back = new PB(FWm, FHm), front = new PB(FWm, FHm), ph = phaseOf(f), cx = AXm, by = AYm - 5;
  for (const [dx, p] of [[-11, ph], [9, -ph]]) back.rect(cx + dx, by - 1 + Math.max(0, p), 3, 4, TUR.skin[2]);
  back.blob(cx, by - 5, 12, 7, TUR.shell, {});
  for (const [x, y] of [[-5, -8], [0, -10], [5, -8], [-3, -5], [3, -5]]) back.ellipse(cx + x, by + y, 2.2, 1.4, TUR.shell[1]);
  for (let x = cx - 11; x <= cx + 11; x++) back.set(x, by + 1, TUR.rim);
  if (facing === 3) { back.set(cx, by + 2, TUR.skin[1]); back.set(cx, by + 3, TUR.skin[1]); return { back, front: null, seat: { x: 0, y: by - 10 + 8 - AYm } }; }
  front.ellipse(cx, by + 1, 3, 2.6, TUR.skin[2]); front.set(cx - 1, by, 0x0a0606); front.set(cx + 1, by, 0x0a0606); front.hl(cx - 1, by + 2, 3, TUR.skin[0]);
  return { back, front, seat: { x: 0, y: by - 10 + 8 - AYm } };
}

// ---------------------------------------------------------------- crabe géant
const CRB = [0x4a0e0a, 0x7a1e14, 0xb03220, 0xd8582e, 0xf2905a];
function crabSprite(f, dir) {
  const back = new PB(FWm, FHm), front = new PB(FWm, FHm), ph = phaseOf(f), cx = AXm, by = AYm - 7;
  const side = dir === 1 || dir === 2;
  // six pattes articulées
  for (let k = 0; k < 3; k++) for (const sgn of [-1, 1]) {
    const x0 = cx + sgn * (5 + k * 2), y0 = by - 1 + k, kx = x0 + sgn * 4, ky = y0 - 2 + ((k + (sgn > 0 ? 1 : 0)) % 2 ? ph : -ph), fx = kx + sgn * 2, fy = AYm - (k === 1 ? 1 : 0);
    back.line(x0, y0, kx, ky, CRB[1], 1); back.line(kx, ky, fx, fy, CRB[2], 1);
  }
  back.blob(cx, by - 3, 11, 6, CRB, {});
  for (const dx of [-5, -1, 3]) back.set(cx + dx, by - 5, CRB[4]);
  // pinces
  const L = dir === 3 ? back : front;
  for (const sgn of [-1, 1]) {
    if (side && sgn === (dir === 1 ? 1 : -1)) continue;
    const px = cx + sgn * (side ? 0 : 11) + (side ? (dir === 2 ? 12 : -12) : 0), py = by + (dir === 3 ? -6 : 1) + (f % 2);
    L.ellipse(px, py, 3.4, 2.6, CRB[3]); L.set(px + sgn * 2, py - 2, CRB[4]); L.set(px, py + 2, CRB[1]);
    L.set(px + (side ? (dir === 2 ? 3 : -3) : sgn * 3), py, 0x2a0806);
  }
  if (dir !== 3) for (const dx of side ? [dir === 2 ? 6 : -6] : [-3, 3]) { L.set(cx + dx, by - 10, 0x101010); L.set(cx + dx, by - 9, CRB[2]); L.set(cx + dx, by - 8, CRB[2]); }
  return { back, front: dir === 3 ? null : front, seat: { x: 0, y: by - 9 + 8 - AYm } };
}

// ---------------------------------------------------------------- feuilles
const cache = new Map();
export const MOUNT_FRAME = { fw: FWm, fh: FHm, ax: AXm, ay: AYm };
export function mountSheet(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const S = SPECIES[kind] || SPECIES.cheval;
  const backCv = document.createElement('canvas'), frontCv = document.createElement('canvas');
  backCv.width = frontCv.width = FWm * 4; backCv.height = frontCv.height = FHm * 4;
  const bx = backCv.getContext('2d'), fx = frontCv.getContext('2d');
  const seat = [];
  for (let dir = 0; dir < 4; dir++) for (let f = 0; f < 4; f++) {
    let r;
    const sideDir = dir === 1 || dir === 2;
    if (S.kind === 'horse') r = sideDir ? horseSide(S, f) : horseFront(S, f, dir);
    else if (S.kind === 'ostrich') r = sideDir ? ostrichSide(f) : ostrichFront(f, dir);
    else if (S.kind === 'turtle') r = sideDir ? turtleSide(f) : turtleFront(f, dir);
    else r = crabSprite(f, dir === 1 ? 1 : dir);
    let b = r.back, fr = r.front;
    if (dir === 1 && S.kind !== 'crab') { b = b.mirror(); if (fr) fr = fr.mirror(); r.seat = { x: -r.seat.x, y: r.seat.y }; }
    b.outline(OUT); if (fr) fr.outline(OUT);
    bx.drawImage(b.toCanvas(), f * FWm, dir * FHm);
    if (fr) fx.drawImage(fr.toCanvas(), f * FWm, dir * FHm);
    if (f === 0) seat[dir] = { x: r.seat.x, y: r.seat.y, cut: S.kind === 'turtle' || S.kind === 'crab' ? 9 : 8 };
  }
  const sh = { back: backCv, front: frontCv, seat, fw: FWm, fh: FHm, ax: AXm, ay: AYm };
  cache.set(kind, sh);
  return sh;
}
// icône d'inventaire : la bête de profil, réduite dans 16x16
export function mountIcon(pb, kind) {
  const S = SPECIES[kind] || SPECIES.cheval;
  const r = S.kind === 'horse' ? horseSide(S, 0) : S.kind === 'ostrich' ? ostrichSide(0) : S.kind === 'turtle' ? turtleSide(0) : crabSprite(0, 0);
  const src = r.back;
  // cadrage : la boîte des pixels peints, réduite au plus proche dans 16x16
  let x0 = FWm, y0 = FHm, x1 = 0, y1 = 0;
  for (let y = 0; y < FHm; y++) for (let x = 0; x < FWm; x++) if (src.get(x, y) !== -1 || (r.front && r.front.get(x, y) !== -1)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.max(w, h) / 15;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const sx = Math.floor(x0 + (x - (16 - w / k) / 2) * k), sy = Math.floor(y0 + (y - (16 - h / k) / 2) * k);
    if (sx < x0 || sy < y0 || sx > x1 || sy > y1) continue;
    let c = r.front ? r.front.get(sx, sy) : -1; if (c === -1) c = src.get(sx, sy);
    if (c !== -1) pb.set(x, y, c);
  }
}
