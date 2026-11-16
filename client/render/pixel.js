// Petit moteur de dessin pixel par pixel : formes ombrées, contours automatiques.
// Couleurs = entiers 0xRRGGBB, -1 = transparent.

export const hex = (s) => parseInt(s.replace('#', ''), 16);
export function rgb(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
export function toHex(c) { return '#' + (c & 0xffffff).toString(16).padStart(6, '0'); }
export function mix(a, b, t) {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  return (Math.round(r1 + (r2 - r1) * t) << 16) | (Math.round(g1 + (g2 - g1) * t) << 8) | Math.round(b1 + (b2 - b1) * t);
}
export function shade(c, f) {
  let [r, g, b] = rgb(c);
  if (f < 1) { r *= f; g *= f; b *= f; } else { const k = f - 1; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return (Math.min(255, Math.round(r)) << 16) | (Math.min(255, Math.round(g)) << 8) | Math.min(255, Math.round(b));
}
export function rampOf(c, n = 5) { // rampe sombre -> claire autour d'une couleur
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(t < 0.5 ? mix(mix(c, 0x1a1030, 0.15), c, 0.35 + t * 1.3) : shade(c, 1 + (t - 0.5) * 0.7));
  }
  out[0] = mix(shade(c, 0.45), 0x1a1030, 0.25);
  return out;
}

const OUT = 0x1c1426;
let _seed = 1;
function rnd(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class PB {
  constructor(w, h) { this.w = w; this.h = h; this.p = new Int32Array(w * h).fill(-1); this.seed = _seed++; }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (c !== -1 && c !== undefined && this.in(x, y)) this.p[y * this.w + x] = c; }
  clear(x, y) { x = Math.floor(x); y = Math.floor(y); if (this.in(x, y)) this.p[y * this.w + x] = -1; }
  get(x, y) { x = Math.floor(x); y = Math.floor(y); return this.in(x, y) ? this.p[y * this.w + x] : -1; }
  has(x, y) { return this.get(x, y) !== -1; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
  hl(x, y, w, c) { for (let i = 0; i < w; i++) this.set(x + i, y, c); }
  vl(x, y, h, c) { for (let j = 0; j < h; j++) this.set(x, y + j, c); }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(x, y, c);
    }
    return this;
  }
  disc(cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); }
  line(x0, y0, x1, y1, c, w = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (w <= 1) this.set(x, y, c); else this.disc(x, y, w / 2, c);
    }
  }
  // sphère ombrée (lumière en haut à gauche)
  blob(cx, cy, rx, ry, ramp, o = {}) {
    const L = o.light || [-0.5, -0.72, 0.48];
    const noise = o.noise || 0, bias = o.bias || 0, seed = o.seed || this.seed;
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d2 = nx * nx + ny * ny;
      if (d2 > 1) continue;
      if (o.ragged && d2 > 0.72 && rnd(x, y, seed) < o.ragged) continue;
      const nz = Math.sqrt(1 - d2);
      let b = nx * L[0] + ny * L[1] + nz * L[2];
      b = (b + 0.25) / 1.2 + bias;
      if (noise) b += (rnd(x >> (o.grain || 0), y >> (o.grain || 0), seed) - 0.5) * noise;
      const k = Math.max(0, Math.min(ramp.length - 1, Math.floor(b * ramp.length)));
      this.set(x, y, ramp[k]);
    }
    return this;
  }
  // cylindre vertical (troncs, tonneaux, tours)
  cyl(x, y, w, h, ramp, o = {}) {
    for (let i = 0; i < w; i++) {
      const u = (i + 0.5) / w; // 0..1
      let b = 1 - Math.abs(u - 0.32) * 1.7;
      for (let j = 0; j < h; j++) {
        let bb = b + (o.noise ? (rnd(x + i, (y + j) >> 1, this.seed) - 0.5) * o.noise : 0);
        if (o.vgrad) bb -= (j / h) * o.vgrad;
        const k = Math.max(0, Math.min(ramp.length - 1, Math.floor(bb * ramp.length)));
        this.set(x + i, y + j, ramp[k]);
      }
    }
    return this;
  }
  // contour : couleur fixe ou 'auto' (version très sombre du pixel voisin)
  outline(c = 'auto', o = {}) {
    const add = [];
    const dirs = o.diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.p[y * this.w + x] !== -1) continue;
      for (const [dx, dy] of dirs) {
        if (o.noBottom && dy === -1) continue;
        const n = this.get(x + dx, y + dy);
        if (n !== -1) { add.push(x, y, c === 'auto' ? mix(shade(n, 0.32), OUT, 0.45) : c); break; }
      }
    }
    for (let i = 0; i < add.length; i += 3) this.p[add[i + 1] * this.w + add[i]] = add[i + 2];
    return this;
  }
  // assombrit les pixels du bord intérieur (relief)
  innerShade(f = 0.8, side = 'br') {
    const out = new Int32Array(this.p);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.p[y * this.w + x];
      if (c === -1) continue;
      if (side === 'br' && (this.get(x + 1, y) === -1 || this.get(x, y + 1) === -1)) out[y * this.w + x] = shade(c, f);
    }
    this.p = out;
    return this;
  }
  map(fn) { for (let i = 0; i < this.p.length; i++) if (this.p[i] !== -1) this.p[i] = fn(this.p[i], i % this.w, (i / this.w) | 0); return this; }
  paste(src, ox, oy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.p[y * src.w + x]; if (c !== -1) this.set(ox + x, oy + y, c); } return this; }
  rotated(a, cx, cy) {
    const m = new PB(this.w, this.h), c = Math.cos(-a), sn = Math.sin(-a);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const sx = Math.floor(cx + dx * c - dy * sn), sy = Math.floor(cy + dx * sn + dy * c);
      const v = this.get(sx, sy);
      if (v !== -1) m.p[y * this.w + x] = v;
    }
    return m;
  }
  mirror() { const m = new PB(this.w, this.h); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) m.p[y * this.w + (this.w - 1 - x)] = this.p[y * this.w + x]; return m; }
  toCanvas(scale = 1) {
    const cv = document.createElement('canvas');
    cv.width = this.w * scale; cv.height = this.h * scale;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(this.w, this.h);
    const d = new Uint32Array(img.data.buffer);
    for (let i = 0; i < this.p.length; i++) {
      const c = this.p[i];
      d[i] = c === -1 ? 0 : (0xff000000 | ((c & 255) << 16) | (c & 0xff00) | ((c >> 16) & 255)) >>> 0;
    }
    if (scale === 1) { ctx.putImageData(img, 0, 0); return cv; }
    const tmp = document.createElement('canvas'); tmp.width = this.w; tmp.height = this.h;
    tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, cv.width, cv.height);
    return cv;
  }
}

export { rnd };

// silhouette blanche (flash d'impact) d'un canvas
export function whiteOf(cv) {
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  const x = c.getContext('2d');
  x.drawImage(cv, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#fff8f0'; x.fillRect(0, 0, c.width, c.height);
  return c;
}
