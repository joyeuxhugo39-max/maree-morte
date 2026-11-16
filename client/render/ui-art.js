// Petits éléments d'interface en pixel art (cadres, bois, icônes de touches),
// rendus une fois en images et utilisés par le CSS de la barre d'action.
import { PB } from './pixel.js';

const cache = new Map();
const url = (key, fn, scale = 3) => { if (!cache.has(key)) { const pb = fn(); cache.set(key, pb.toCanvas(scale).toDataURL()); } return cache.get(key); };
const OUT = 0x120a06;

// emplacement 16x16 : anneau de laiton riveté autour d'un creux de bois sombre
export function slotFrameURL(kind = 'brass') {
  return url('slot' + kind, () => {
    const pb = new PB(16, 16);
    const B = kind === 'gold' ? [0x6a3e0e, 0xa86e1c, 0xe0a832, 0xffd864, 0xfff2b0] : kind === 'iron' ? [0x1c1c24, 0x3a3a46, 0x5c5c6c, 0x8a8a9c, 0xc0c0d0] : [0x4a2e0c, 0x7a521a, 0xb0802c, 0xdcb04a, 0xf6dc8c];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      const ring = x === 1 || y === 1 || x === 14 || y === 14;
      if ((x === 0 || x === 15) && (y === 0 || y === 15)) continue;
      if (edge) { pb.set(x, y, OUT); continue; }
      if (ring) { pb.set(x, y, (x === 1 || y === 1) && x !== 14 && y !== 14 ? B[3] : B[1]); continue; }
      // creux : ombre en haut à gauche, fond chaud au centre
      const dx = (x - 7.5) / 6, dy = (y - 7.5) / 6, d = Math.sqrt(dx * dx + dy * dy);
      let c = d < 0.55 ? 0x2c1c10 : d < 0.85 ? 0x23160c : 0x1a1008;
      if (x === 2 || y === 2) c = 0x0e0804;
      else if (x === 13 || y === 13) c = 0x34220f;
      pb.set(x, y, c);
    }
    for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) { pb.set(x, y, B[4]); }
    pb.set(1, 14, B[2]); pb.set(14, 14, B[1]); pb.set(14, 1, B[2]);
    return pb;
  });
}
// planches de bois pour le fond de la barre
export function plankURL() {
  return url('plank', () => {
    const pb = new PB(32, 16);
    const W = [0x24160c, 0x34200f, 0x45291a, 0x553422, 0x63402a];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      const row = y < 8 ? 0 : 1, v = y % 8;
      let k = 2 + (((x * 7 + row * 13) % 11) < 3 ? 1 : 0) - (((x * 5 + y * 3 + row) % 17) < 2 ? 1 : 0);
      if (v === 0) k = 4; else if (v === 7) k = 0;
      const seam = row === 0 ? 20 : 8;
      if (x === seam) k = 0; else if (x === seam + 1) k = 3;
      pb.set(x, y, W[Math.max(0, Math.min(4, k))]);
    }
    for (const [x, y] of [[3, 3], [24, 11], [13, 11]]) { pb.set(x, y, 0x8a7a60); pb.set(x + 1, y + 1, 0x2a1a10); }
    return pb;
  });
}
// souris : bouton gauche ou droit en surbrillance
export function mouseURL(btn = 'L') {
  return url('mouse' + btn, () => {
    const pb = new PB(7, 9);
    pb.ellipse(3.5, 5, 3.5, 4.5, 0xd8cbb0);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 7; x++) if (pb.get(x, y) !== -1 && ((btn === 'L' && x < 3) || (btn === 'R' && x > 3))) pb.set(x, y, 0xf2c14a);
    pb.vl(3, 0, 4, 0x5a4a3a); pb.hl(0, 4, 7, 0x8a7a60);
    pb.outline(0x120a06);
    return pb;
  }, 1);
}
// petit cadenas (compétence pas encore apprise)
export function lockURL() {
  return url('lock', () => {
    const pb = new PB(7, 8);
    pb.rect(1, 0, 5, 1, 0xa0a0b0); pb.vl(1, 0, 3, 0xa0a0b0); pb.vl(5, 0, 3, 0x707080);
    pb.rect(0, 3, 7, 5, 0xe2bc54); pb.hl(0, 3, 7, 0xfce6a0); pb.hl(0, 7, 7, 0x8c601e); pb.set(3, 5, 0x3a2410);
    return pb;
  }, 1);
}
