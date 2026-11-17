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

// ------------------------------------------------------------------ 0.8.1 : l'habillage pirate des panneaux
// parchemin vieilli (tuile de 48 px, répétée sans couture) : grain, nuages d'encre pâlie, fibres
export function parchURL() {
  return url('parch', () => {
    const N = 48, pb = new PB(N, N);
    const P = [0xcdb07a, 0xd9be8a, 0xe3cb98, 0xebd6a6, 0xf2e1b6];
    const h = (x, y, s) => { x = ((x % N) + N) % N; y = ((y % N) + N) % N; let k = Math.imul((x * 73856093) ^ (y * 19349663) ^ (s * 83492791), 0x9e3779b1); k ^= k >>> 15; k = Math.imul(k, 0x85ebca6b); k ^= k >>> 13; return (k >>> 0) / 4294967296; };
    const vn = (x, y, cell, s) => {
      const n = N / cell, gx = Math.floor(x / cell), gy = Math.floor(y / cell), fx = x / cell - gx, fy = y / cell - gy;
      const a = h(gx % n, gy % n, s), b = h((gx + 1) % n, gy % n, s), c = h(gx % n, (gy + 1) % n, s), d = h((gx + 1) % n, (gy + 1) % n, s);
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = vn(x, y, 16, 1) * 0.5 + vn(x, y, 8, 2) * 0.32 + h(x, y, 3) * 0.18;
      let k = Math.floor(v * 4.8);
      if (h(x, y, 5) > 0.986) k -= 1;
      if (h(x >> 1, y, 7) > 0.993) k += 1;
      pb.set(x, y, P[Math.max(0, Math.min(4, k))]);
    }
    return pb;
  }, 2);
}
// cadre de bois veiné, ferrures de laiton rivetées aux coins (neuf tranches : coins 8x8, bords répétés)
export function frameURL() {
  return url('frame', () => {
    const S = 24, pb = new PB(S, S);
    const W = [0x1e120a, 0x3a2414, 0x553420, 0x6a4428, 0x845632, 0xa06c40];
    const B = [0x4a2e0c, 0x7a521a, 0xb0802c, 0xdcb04a, 0xf6dc8c];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dl = x, dr = S - 1 - x, dt = y, db = S - 1 - y;
      const corner = (dl < 8 || dr < 8) && (dt < 8 || db < 8);
      if (corner) {
        const cx = dl < 8 ? dl : dr, cy = dt < 8 ? dt : db; // distance aux bords extérieurs
        if (cx + cy < 2) continue; // coin arrondi
        let c = B[2];
        if (cx === 0 || cy === 0 || cx + cy === 2) c = 0x120a06;
        else if (cx === 7 || cy === 7) c = 0x120a06;
        else if (cx === 1 || cy === 1) c = B[3 + ((dl < 8) === (dt < 8) ? 1 : 0)];
        else if (cx === 6 || cy === 6) c = B[1];
        else if ((cx - 3.5) ** 2 + (cy - 3.5) ** 2 < 2.2) c = (cx + cy) < 7 ? B[4] : B[1]; // le rivet
        pb.set(x, y, c);
        continue;
      }
      const t = Math.min(dl, dr, dt, db); // profondeur dans la bande
      if (t >= 8) continue; // le centre reste vide
      const along = dt < 8 || db < 8 ? x : y; // le fil du bois suit le bord
      let c;
      if (t === 0) c = 0x120a06;
      else if (t === 1) c = W[5];
      else if (t === 6) c = B[2];
      else if (t === 7) c = 0x1a0e06;
      else {
        let k = 3 - (t === 5 ? 1 : 0) + (((along * 5 + t * 3) % 8) < 2 ? 1 : 0) - (((along * 3 + t * 7) % 8) === 0 ? 1 : 0);
        c = W[Math.max(1, Math.min(5, k))];
      }
      pb.set(x, y, c);
    }
    return pb;
  }, 2);
}
// fleuron d'encre sous les titres : volutes et rose des vents
export function flourishURL() {
  return url('orn', () => {
    const pb = new PB(64, 9), I = 0x5a2a12, G = 0xc9a24c;
    for (let x = 4; x < 60; x++) { const d = Math.abs(x - 32); if (d < 6) continue; pb.set(x, 4, I); if (d > 20) pb.set(x, 4 - (x % 2 ? 0 : 0), I); }
    for (const s of [-1, 1]) {
      for (const [dx, dy] of [[10, -1], [11, -2], [12, -2], [13, -1], [12, 0], [11, 0], [19, 1], [20, 2], [21, 2], [22, 1], [21, 0]]) pb.set(32 + s * dx, 4 + dy, I);
      pb.set(32 + s * 27, 3, I); pb.set(32 + s * 27, 5, I); pb.set(32 + s * 28, 4, I);
    }
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; for (let r = 1; r <= 4; r++) pb.set(Math.round(32 + Math.cos(a) * r), Math.round(4 + Math.sin(a) * r), r < 3 ? G : I); }
    pb.set(32, 4, 0xa01c14); pb.set(31, 3, I); pb.set(33, 3, I); pb.set(31, 5, I); pb.set(33, 5, I);
    return pb;
  }, 2);
}
// pavillon noir : crâne et tibias à l'encre, devant les titres
export function jollyURL() {
  return url('jolly', () => {
    const pb = new PB(14, 14), I = 0x3a160a, L = 0xf2e1b6;
    pb.line(1, 1, 12, 12, I, 2); pb.line(12, 1, 1, 12, I, 2);
    for (const [x, y] of [[0, 1], [1, 0], [13, 1], [12, 0], [0, 12], [1, 13], [13, 12], [12, 13]]) pb.set(x, y, I);
    pb.disc(7, 6, 4.2, I); pb.rect(5, 9, 5, 3, I);
    pb.set(5, 6, L); pb.set(6, 6, L); pb.set(8, 6, L); pb.set(9, 6, L); pb.set(5, 5, L); pb.set(9, 5, L);
    pb.set(7, 8, L); pb.set(6, 11, L); pb.set(8, 11, L);
    return pb;
  }, 2);
}
// tout poser d'un coup, dès le chargement (l'écran d'accueil en profite)
export function applyTheme() {
  const r = document.documentElement.style;
  r.setProperty('--parch-img', `url(${parchURL()})`);
  r.setProperty('--frame-img', `url(${frameURL()})`);
  r.setProperty('--orn-img', `url(${flourishURL()})`);
  r.setProperty('--jolly-img', `url(${jollyURL()})`);
  r.setProperty('--plank-img', `url(${plankURL()})`);
  r.setProperty('--slot', `url(${slotFrameURL('brass')})`);
  r.setProperty('--slot-gold', `url(${slotFrameURL('gold')})`);
}
