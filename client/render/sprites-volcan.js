// Le Volcan de Cendrelune : une montagne peinte pixel par pixel à partir d'un relief.
// Le relief (un cône creusé d'un cratère, strié d'arêtes et de coulées) est vu de trois quarts :
// chaque point du sol monte de sa hauteur, et on le peint de l'avant vers l'arrière
// en ne gardant que ce qui dépasse déjà (tampon de hauteur par colonne).
// La montagne est ensuite découpée : le pied, presque plat, devient un décor au sol ; le reste en
// bandes d'est en ouest, chacune triée avec les personnages selon la rangée de sol où elle commence.
import { valueNoise, hash2 } from '../../shared/rng.js';

const ROCK = [0x0e0a0c, 0x181214, 0x241b1d, 0x312527, 0x403133, 0x523f40, 0x684f4e, 0x82645f];
const ASH = [0x1c181c, 0x2c262a, 0x3c3438, 0x4e4447, 0x685c5c];
const LAVA = [0x5a1206, 0xa02a0c, 0xd84a14, 0xff7a1a, 0xffb042, 0xffe48a, 0xfff8d0];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const mix = (a, b, t) => {
  const r = (a >> 16) + (((b >> 16) - (a >> 16)) * t), g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t), l = (a & 255) + (((b & 255) - (a & 255)) * t);
  return ((r & 255) << 16) | ((g & 255) << 8) | (l & 255);
};
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
const abgr = (c) => (0xff000000 | ((c & 255) << 16) | (c & 0xff00) | ((c >> 16) & 255)) >>> 0;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// formes du cône, partagées avec le moteur (ordre d'affichage, transparence)
export const VOLC = { EC: 0.2, EL: 0.12, DEPTH: 44, HF: 20, BH: 24, PAD: 10 };

// Générateur : rend la main (yield) régulièrement, pour peindre la montagne sans jamais figer le jeu.
export function* volcanoGen(V) {
  const { EC, EL, DEPTH, HF, BH, PAD } = VOLC; // rebord du cratère, lac de lave, profondeur, hauteur du pied, bandes
  const RX = Math.round(V.rx), RY = Math.round(V.ry), HM = V.h;
  const OY = Math.round(RY + EC * RY + HM + PAD); // ligne du centre du pied, dans le dessin
  const W = RX * 2 + PAD * 2, H = OY + RY + 1;
  const GW = RX * 2 + 1, GH = RY * 2 + 1;
  // ---- 1. le relief, sur une grille au sol (un point par pixel)
  const hf = new Float32Array(GW * GH).fill(-1), lava = new Float32Array(GW * GH);
  const ph = [hash2(1, 2, 3) * 6.28, hash2(2, 3, 4) * 6.28, hash2(3, 4, 5) * 6.28, hash2(4, 5, 6) * 6.28, hash2(5, 6, 7) * 6.28];
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      const gx = i - RX, gy = j - RY, ex = gx / RX, ey = gy / RY, e = Math.sqrt(ex * ex + ey * ey);
      if (e > 1) continue;
      const th = Math.atan2(ey, ex);
      let h;
      if (e >= EC) {
        const u = (1 - e) / (1 - EC);
        h = HM * Math.pow(u, 1.35);
        // arêtes vives et ravines qui descendent du sommet, plus creusées vers le bas
        const r1 = 1 - Math.abs(Math.sin(th * 8 + ph[0] + Math.sin(e * 6 + ph[3]) * 0.6));
        const r2 = 1 - Math.abs(Math.sin(th * 19 + ph[1] - e * 7));
        const ridge = r1 * 0.65 + r2 * 0.35 - 0.5;
        h *= 1 + 0.15 * ridge * (0.2 + 0.8 * (1 - u)) + 0.035 * Math.sin(th * 3 + ph[3]);
        h += (valueNoise(gx / 9, gy / 6, 51) - 0.5) * 6 * (1 - u * 0.5);
      } else if (e >= EL) {
        const u = (e - EL) / (EC - EL);
        h = HM - DEPTH * (1 - u * u) + Math.sin(th * 9 + ph[4]) * 3;
      } else h = HM - DEPTH;
      // coulées : des chenaux de lave qui serpentent du rebord jusqu'au pied (et y rejoignent celles de l'île)
      let lv = e < EL ? 1 : 0;
      const k0 = j * GW + i;
      if (e > EC - 0.01) for (const a of V.flows) {
        const wig = (Math.sin(e * 11 + a * 5) * 0.05 + Math.sin(e * 23 + a * 3) * 0.02) * Math.min(1, (1 - e) * 5);
        const w = 0.028 + 0.05 * e, d = angDiff(th, a + wig);
        if (d < w) { const k = 1 - d / w; lv = Math.max(lv, k); h -= 6 * k; }
        else if (d < w * 2.4) lava[k0] = Math.min(lava[k0], -(1 - (d - w) / (w * 1.4))); // la roche rougit près de la lave
      }
      if (lv > 0) lava[k0] = lv;
      hf[k0] = Math.max(0, h * (e > 0.92 ? (1 - e) / 0.08 : 1)); // le pied rejoint doucement le sol
    }
    if ((j & 7) === 7) yield;
  }
  const H0 = (i, j) => { if (i < 0 || j < 0 || i >= GW || j >= GH) return 0; const v = hf[j * GW + i]; return v < 0 ? 0 : v; };
  // ---- 2. le dessin, de l'avant (sud) vers l'arrière (nord)
  const px = new Uint32Array(W * H), lay = new Uint8Array(W * H); // couleur, et couche de chaque pixel (1 = pied, 2+ = bandes)
  const ybuf = new Int32Array(W).fill(H);
  const L = [-0.55, 0.35, 0.76]; // lumière : de gauche, un peu de face, et d'en haut
  for (let j = GH - 1; j >= 0; j--) {
    const band = 2 + Math.floor(j / BH);
    for (let i = 0; i < GW; i++) {
      const h = hf[j * GW + i];
      if (h < 0) continue;
      const sx = i + PAD, ground = OY + (j - RY), sy = Math.round(ground - h);
      if (sy >= ybuf[sx] || sy < 0) continue;
      const gx = i - RX, gy = j - RY, ex = gx / RX, ey = gy / RY, e = Math.sqrt(ex * ex + ey * ey);
      const foot = h < HF;
      const bay = BAYER[(sx & 3) + (sy & 3) * 4] / 16;
      if (foot && e > 0.965 && bay < (e - 0.965) / 0.035) continue; // le pied se fond dans la cendre
      const dx = (H0(i + 1, j) - H0(i - 1, j)) / 2, dy = (H0(i, j + 1) - H0(i, j - 1)) / 2;
      const n = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      let b = (-dx * L[0] - dy * L[1] + L[2]) * n; // éclairage de la pente
      b = clamp(b * 1.05 - 0.02, 0, 1);
      const lv = lava[j * GW + i];
      const dith = bay - 0.5;
      let top, face;
      if (lv > 0) { // lave : croûtes sombres sur un fond incandescent
        const crust = valueNoise(gx / 7, gy / 5 + h / 30, 61);
        let k = 2 + lv * 3 + (crust - 0.5) * 3 + dith * 0.9;
        if (e < EL) { const c2 = valueNoise(gx / 11, gy / 7, 62); k = c2 > 0.64 ? 1 + dith : 3.4 + (c2 - 0.3) * 4 + dith; if (Math.abs(c2 - 0.64) < 0.03) k = 5.5; }
        top = LAVA[clamp(Math.round(k), 0, 6)];
        face = LAVA[clamp(Math.round(k) - 1, 0, 6)];
      } else {
        // roche : plus claire vers le haut, cendre vers le pied, strates horizontales
        const k = b * 6.4 + dith * 1.1 + (e < EC + 0.06 ? 0.7 : 0) - 0.4;
        top = ROCK[clamp(Math.round(k), 0, 7)];
        if (e > 0.7) top = mix(top, ASH[clamp(Math.round(b * 3 + dith), 0, 4)], Math.min(1, (e - 0.7) / 0.24));
        if (hash2(gx, gy, 71) > 0.9991 && e > 0.3 && e < 0.86) top = 0xff7a2a; // braise
        if (lv < 0) top = mix(top, 0xa83214, -lv * 0.6);
        if (e < EC + 0.035 && e >= EC - 0.01) top = mix(top, 0xb06a4a, 0.35); // rebord du cratère
        if (e < EC && e >= EL) top = mix(top, 0x9a2a10, 0.35 + (EC - e) / (EC - EL) * 0.45); // parois du cratère, éclairées par la lave
        face = mix(top, 0x0a0608, 0.24);
      }
      const L8 = foot ? 1 : band;
      let p = sy * W + sx;
      px[p] = abgr(top); lay[p] = L8;
      // la face qui descend jusqu'à la rangée de devant : la même pente, assombrie en tramé vers le bas
      const bot = Math.min(ybuf[sx], ground + 1), ct = abgr(top), cf = abgr(face);
      for (let y = sy + 1, d = 1; y < bot; y++, d++) { p += W; px[p] = BAYER[(sx & 3) + (y & 3) * 4] < d * 4 ? cf : ct; lay[p] = L8; }
      ybuf[sx] = sy;
    }
    if ((j & 7) === 0) yield;
  }
  // contour : une ligne sombre au-dessus de la silhouette
  for (let x = 0; x < W; x++) if (ybuf[x] < H && ybuf[x] > 0) { const q = (ybuf[x] - 1) * W + x; px[q] = abgr(0x0a0608); lay[q] = lay[q + W]; }
  yield;
  // ---- 3. découpe en couches : chaque couche dans son propre petit dessin
  const NL = 3 + Math.floor((GH - 1) / BH);
  const x0 = new Int32Array(NL).fill(W), y0 = new Int32Array(NL).fill(H), x1 = new Int32Array(NL).fill(-1), y1 = new Int32Array(NL).fill(-1);
  for (let y = 0, q = 0; y < H; y++) {
    for (let x = 0; x < W; x++, q++) {
      const l = lay[q];
      if (!l) continue;
      if (x < x0[l]) x0[l] = x; if (x > x1[l]) x1[l] = x; if (y < y0[l]) y0[l] = y; if (y > y1[l]) y1[l] = y;
    }
    if ((y & 127) === 127) yield;
  }
  const lays = [];
  for (let l = 1; l < NL; l++) {
    if (x1[l] < 0) continue;
    const w = x1[l] - x0[l] + 1, hh = y1[l] - y0[l] + 1;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(w, hh);
    lays[l] = { cv, ctx, img, u32: new Uint32Array(img.data.buffer), x0: x0[l], y0: y0[l], w, h: hh, l };
    if (l % 4 === 0) yield;
  }
  yield;
  for (let y = 0, q = 0; y < H; y++) {
    for (let x = 0; x < W; x++, q++) {
      const l = lay[q];
      if (!l) continue;
      const o = lays[l];
      o.u32[(y - o.y0) * o.w + (x - o.x0)] = px[q];
    }
    if ((y & 127) === 127) yield;
  }
  // ancrages : le pied au sud de l'ellipse, chaque bande sur la rangée de sol où elle commence (son bord nord)
  const foot = lays[1] ? { cv: lays[1].cv, w: lays[1].w, h: lays[1].h, ax: RX + PAD - lays[1].x0, ay: OY + RY - lays[1].y0, dy: RY } : null;
  const bands = [];
  for (let l = 2; l < NL; l++) {
    const o = lays[l];
    if (!o) continue;
    const key = (l - 2) * BH - RY; // rangée de sol (par rapport au centre) du bord nord de la bande
    bands.push({ cv: o.cv, w: o.w, h: o.h, ax: RX + PAD - o.x0, ay: OY + key - o.y0, dy: key });
  }
  for (const o of lays) if (o) { o.ctx.putImageData(o.img, 0, 0); o.ctx = o.img = o.u32 = null; yield; }
  // ---- 4. ce que le moteur a besoin de connaître (positions dans le dessin entier, coin haut gauche = centre - (ax, ay))
  const craterY = Math.round(OY - (HM - DEPTH)), craterX = RX + PAD;
  const lights = [{ x: craterX, y: craterY, r: 150 }];
  for (const a of V.flows) for (let e = 0.3; e < 0.99; e += 0.075) { // une lueur continue le long de chaque coulée
    const wig = (Math.sin(e * 11 + a * 5) * 0.05 + Math.sin(e * 23 + a * 3) * 0.02) * Math.min(1, (1 - e) * 5);
    const i = Math.round(RX + Math.cos(a + wig) * e * RX), j = Math.round(RY + Math.sin(a + wig) * e * RY);
    if (Math.sin(a) < -0.2 && e < 0.6) continue; // coulées cachées derrière le cône
    lights.push({ x: i + PAD, y: Math.round(OY + (j - RY) - H0(i, j)), r: 44 });
  }
  return { foot, bands, w: W, h: H, ax: RX + PAD, ay: OY, lay, BH, RY, crater: { x: craterX, y: craterY, rx: Math.round(EL * RX), ry: Math.round(EL * RY) }, lights };
}
// bouffées du panache : des boules tramées, éclairées d'en haut à gauche (cendre, ou rougies par l'éruption)
export function makePuffs() {
  const tints = { dark: [0x1a1416, 0x2a2224, 0x3c3336, 0x544a4c, 0x6e6466], red: [0x2a0e0a, 0x4a1810, 0x7a2a16, 0xb24a1e, 0xe8782a], pale: [0x4a4244, 0x645a5c, 0x7e7476, 0x9a9092, 0xb8afb0] };
  const out = {};
  for (const [name, pal] of Object.entries(tints)) {
    out[name] = [];
    for (let r = 2; r <= 22; r++) {
      const S = r * 2 + 1, cv = document.createElement('canvas'); cv.width = cv.height = S;
      const ctx = cv.getContext('2d'), img = ctx.createImageData(S, S), u = new Uint32Array(img.data.buffer);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = (x - r) / r, dy = (y - r) / r, d = Math.sqrt(dx * dx + dy * dy);
        // bord bosselé, pour que la bouffée ne soit pas un disque parfait
        const lump = 0.86 + 0.14 * Math.sin(Math.atan2(dy, dx) * 5 + r);
        const bay = BAYER[(x & 3) + (y & 3) * 4] / 16;
        if (d > lump || (d > lump * 0.78 && bay < (d - lump * 0.78) / (lump * 0.22))) continue;
        const lit = -dx * 0.55 - dy * 0.75; // lumière d'en haut à gauche
        const k = clamp(Math.round(2 + lit * 1.6 - d * 0.6 + (bay - 0.5) * 0.8), 0, 4);
        u[y * S + x] = abgr(pal[k]);
      }
      ctx.putImageData(img, 0, 0);
      out[name].push(cv);
    }
  }
  return out;
}
// éclaboussures de lave laissées par les bombes : une version incandescente, une version refroidie
export function makeSplats() {
  const out = [];
  for (let v = 0; v < 3; v++) {
    const w = 28, h = 18, mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const cold = mk(), hot = mk(), cc = cold.getContext('2d'), hc = hot.getContext('2d');
    const ci = cc.createImageData(w, h), hi = hc.createImageData(w, h), cu = new Uint32Array(ci.data.buffer), hu = new Uint32Array(hi.data.buffer);
    const dot = (x, y, t) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const bay = BAYER[(x & 3) + (y & 3) * 4] / 16, crack = Math.abs(valueNoise(x / 3 + v * 9, y / 2, 131) - 0.5) < 0.07;
      cu[y * w + x] = abgr(crack && t < 0.8 ? 0x8a2a10 : [0x2c1c1c, 0x1c1214, 0x140c0e][clamp(Math.round(t * 2 + bay - 0.5), 0, 2)]);
      hu[y * w + x] = abgr(LAVA[clamp(Math.round(5.6 - t * 4.2 + (bay - 0.5)), 1, 6)]);
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - w / 2 + 0.5) / 9, dy = (y - h / 2 + 0.5) / 5.5, d = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
      const edge = 0.78 + 0.16 * Math.sin(a * 3 + v * 2.1) + 0.08 * Math.sin(a * 7 + v);
      if (d < edge) dot(x, y, d / edge);
    }
    for (let k = 0; k < 7; k++) { // gouttes projetées autour
      const a = hash2(k, v, 133) * Math.PI * 2, r = 1.15 + hash2(k, v, 134) * 0.35;
      const x = Math.round(w / 2 + Math.cos(a) * 9 * r), y = Math.round(h / 2 + Math.sin(a) * 5.5 * r);
      dot(x, y, 0.7); if (k % 2) dot(x + 1, y, 0.8);
    }
    cc.putImageData(ci, 0, 0); hc.putImageData(hi, 0, 0);
    out.push({ cv: cold, hot, w, h, ax: w / 2, ay: h / 2 });
  }
  return out;
}
// version d'un seul tenant (outils, tests)
export function volcanoSprite(V) { const g = volcanoGen(V); let r; while (!(r = g.next()).done); return r.value; }
