// Rendu du sol par blocs de 16x16 tuiles, pixel par pixel, avec frontières
// organiques (bruit), écume, rebords d'herbe, pavés, planches et falaises.
import { TILE, MAP_W, MAP_H, T } from '../../shared/constants.js';
import { valueNoise, hash2 } from '../../shared/rng.js';
import { Z } from '../../shared/world.js';
import { mix, shade } from './pixel.js';

export const CHUNK_T = 16;
export const CHUNK_PX = CHUNK_T * TILE;
const M = 4;
const SZ = CHUNK_PX + M * 2;

export const PAL = {
  [T.SAND]: [0xc29b62, 0xd8b77b, 0xe8cd8f, 0xf2dca6, 0xfbecc4],
  [T.GRASS]: [0x2c6339, 0x3c8143, 0x4f9c49, 0x67b451, 0x8acd62],
  [T.JUNGLE]: [0x17402f, 0x225638, 0x2c6c3f, 0x3a8445, 0x54a04e],
  [T.DIRT]: [0x6a4830, 0x845d3d, 0x9c744a, 0xb48b5c, 0xcaa472],
  [T.COBBLE]: [0x56514f, 0x78726c, 0x8f8880, 0xa69e93, 0xc0b8ab],
  [T.PLANK]: [0x452815, 0x683f23, 0x83552f, 0x9d6b3b, 0xb8874d],
  [T.SWAMP]: [0x101c1a, 0x162722, 0x1d3329, 0x2a4632, 0x4d6e48],
  [T.MARSH]: [0x3b412b, 0x4a5233, 0x59633b, 0x687444, 0x7f8a52],
  [T.ROCK]: [0x3d3b4a, 0x545264, 0x6b697c, 0x858397, 0xa3a1b3],
  [T.MUD]: [0x352820, 0x45352a, 0x554233, 0x67513f, 0x7b6550],
  [T.WATER]: [0x1c5f8e, 0x2a86b0, 0x58c2cc, 0x8fe0de, 0xf0fffb],
  [T.STONEF]: [0x2e2a2c, 0x45403f, 0x5a5452, 0x6e6863, 0x857e76],
  [T.CAVE]: [0x262130, 0x332c3e, 0x403849, 0x4e4558, 0x645a70],
  [T.CWALL]: [0x15121b, 0x262130, 0x383145, 0x4e465c, 0x6a6078],
};
export const MINI_COL = {
  [T.DEEP]: 0x1b4f7c, [T.WATER]: 0x2f8fb6, [T.SAND]: 0xe4c98d, [T.GRASS]: 0x4f9c49, [T.JUNGLE]: 0x2c6c3f,
  [T.DIRT]: 0xa07a4e, [T.COBBLE]: 0xa69e93, [T.PLANK]: 0x83552f, [T.SWAMP]: 0x34442a, [T.MARSH]: 0x4b5d3a,
  [T.ROCK]: 0x6b697c, [T.MUD]: 0x554233, [T.VOID]: 0x07050b, [T.FLOOR]: 0x6b4527, [T.STONEF]: 0x5a5452,
  [T.CAVE]: 0x2c2733, [T.CWALL]: 0x15121b, [T.IWALL]: 0x2a1c14, [T.EXIT]: 0x6b4527,
};
// styles des murs intérieurs : soubassement lambrissé, cimaise, haut de mur, corniche
const WALLS = {
  tavern: { up: 'planks', U: [0x2e1c10, 0x45291a, 0x583621, 0x6b4328, 0x825430], N: [0x1e120a, 0x2e1c10, 0x3e2616, 0x52331e, 0x6a4428], F: [0x2e1c10, 0x45291a, 0x583621, 0x6b4328, 0x7e5232] },
  auberge: { up: 'plaster', U: [0x8a7c64, 0xa89878, 0xbcae90, 0xcfc2a6, 0xded3bc], N: [0x1a2a22, 0x223a2e, 0x2c4a3a, 0x3a5e4a, 0x4e765e], F: [0x3a2416, 0x55361f, 0x6b4527, 0x80552f, 0x96663a] },
  house: { up: 'plaster', U: [0x9a8c70, 0xb8a888, 0xcbbd9e, 0xdcd0b4, 0xeae0c8], N: [0x24160c, 0x3a2414, 0x553620, 0x6f482a, 0x8a5c36], F: [0x4a2e1a, 0x66402a, 0x7c5034, 0x92623e, 0xa87448] },
  forge: { up: 'bricks', U: [0x2a2426, 0x3e3436, 0x524648, 0x66585a, 0x7c6e6e], N: [0x1e1a1c, 0x2c2628, 0x3a3234, 0x4a4042, 0x5c5052], F: [0x2e2a2c, 0x45403f, 0x5a5452, 0x6e6863, 0x857e76] },
  chantier: { up: 'planks', U: [0x4a3220, 0x66462c, 0x7e5838, 0x966a44, 0xae7e52], N: [0x2a1a0e, 0x3e2816, 0x553820, 0x6b482a, 0x845a36], F: [0x5a3a22, 0x74502e, 0x8a6038, 0xa07244, 0xb88652] },
};
const isFloor = (t) => t === T.FLOOR || t === T.STONEF;

const RAISED = new Uint8Array(16);
RAISED[T.GRASS] = 1; RAISED[T.JUNGLE] = 1; RAISED[T.MARSH] = 1; RAISED[T.ROCK] = 1;
const WATERY = new Uint8Array(16);
WATERY[T.DEEP] = 1; WATERY[T.WATER] = 1;

const RING = [];
for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > 0 && d <= 4.3) RING.push([dx, dy, d]);
}
RING.sort((a, b) => a[2] - b[2]);
const RING3 = RING.filter((r) => r[2] <= 3.2);

const TUFT = [[-2, -2, 4], [-1, -1, 3], [0, -3, 4], [0, -2, 3], [0, -1, 2], [1, -1, 3], [2, -2, 4], [-1, 0, 0], [0, 0, 0], [1, 0, 0]];
const FLOWER_COLS = [0xffffff, 0xffe066, 0xff93b8, 0xbfa8ff, 0xff7a5c, 0x8fe3ff];

export class Terrain {
  constructor(world) {
    this.w = world;
    this.cache = new Map();
  }
  tileT(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return T.DEEP;
    return this.w.tiles[ty * MAP_W + tx];
  }
  sample(wx, wy) {
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const base = this.tileT(tx, ty);
    if (base === T.PLANK) return base;
    if (base >= T.VOID) { // intérieurs nets ; grottes aux bords organiques
      if (base !== T.CAVE && base !== T.CWALL) return base;
      const kx = (valueNoise(wx * 0.11, wy * 0.11, 505) - 0.5) * 13 + (valueNoise(wx * 0.4, wy * 0.4, 506) - 0.5) * 3;
      const ky = (valueNoise(wx * 0.11, wy * 0.11, 507) - 0.5) * 13 + (valueNoise(wx * 0.4, wy * 0.4, 508) - 0.5) * 3;
      const tc = this.tileT(Math.floor((wx + kx) / TILE), Math.floor((wy + ky) / TILE));
      return tc === T.CAVE || tc === T.CWALL ? tc : base;
    }
    const jx = (valueNoise(wx * 0.07, wy * 0.07, 501) - 0.5) * 17 + (valueNoise(wx * 0.3, wy * 0.3, 502) - 0.5) * 3.5;
    const jy = (valueNoise(wx * 0.07, wy * 0.07, 503) - 0.5) * 17 + (valueNoise(wx * 0.3, wy * 0.3, 504) - 0.5) * 3.5;
    const t2 = this.tileT(Math.floor((wx + jx) / TILE), Math.floor((wy + jy) / TILE));
    if (t2 === T.PLANK || t2 >= T.VOID) return base;
    if (base === T.COBBLE || t2 === T.COBBLE) {
      const t3 = this.tileT(Math.floor((wx + jx * 0.4) / TILE), Math.floor((wy + jy * 0.4) / TILE));
      return t3 === T.PLANK || t3 >= T.VOID ? base : t3;
    }
    return t2;
  }
  wdist(wx, wy) {
    const fx = wx / TILE - 0.5, fy = wy / TILE - 0.5;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
    const g = (x, y) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) ? 8 : Math.min(8, this.w.waterDist[y * MAP_W + x]);
    const a = g(x0, y0), b = g(x0 + 1, y0), c = g(x0, y0 + 1), d = g(x0 + 1, y0 + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  get(cx, cy) {
    const k = cx + cy * 1000;
    let c = this.cache.get(k);
    if (!c) { c = this.render(cx, cy); this.cache.set(k, c); }
    return c;
  }
  has(cx, cy) { return this.cache.has(cx + cy * 1000); }

  render(cx, cy) {
    const W = this.w;
    const ox = cx * CHUNK_PX - M, oy = cy * CHUNK_PX - M;
    const tm = new Uint8Array(SZ * SZ);
    for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) tm[y * SZ + x] = this.sample(ox + x, oy + y);
    const at = (lx, ly) => {
      if (lx < -M || ly < -M || lx >= CHUNK_PX + M || ly >= CHUNK_PX + M) return this.sample(ox + M + lx, oy + M + ly);
      return tm[(ly + M) * SZ + lx + M];
    };
    const cv = document.createElement('canvas');
    cv.width = CHUNK_PX; cv.height = CHUNK_PX;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(CHUNK_PX, CHUNK_PX);
    const d = new Uint32Array(img.data.buffer);
    const put = (x, y, c, a = 255) => {
      if (x < 0 || y < 0 || x >= CHUNK_PX || y >= CHUNK_PX) return;
      d[y * CHUNK_PX + x] = ((a << 24) | ((c & 255) << 16) | (c & 0xff00) | ((c >> 16) & 255)) >>> 0;
    };
    const bx = cx * CHUNK_PX, by = cy * CHUNK_PX;

    for (let ly = 0; ly < CHUNK_PX; ly++) for (let lx = 0; lx < CHUNK_PX; lx++) {
      const wx = bx + lx, wy = by + ly;
      const t = at(lx, ly);
      let col = 0, a = 255;
      switch (t) {
        case T.DEEP: case T.WATER: {
          const wd = this.wdist(wx, wy);
          let near = 9, nearT = 0;
          if (wd < 2.2) {
            for (const [dx, dy, dd] of RING) {
              const n = at(lx + dx, ly + dy);
              if (!WATERY[n]) { near = dd; nearT = n; break; }
            }
          }
          if (near <= 2.3 && nearT !== T.PLANK) {
            const fh = hash2(wx >> 1, wy >> 1, 77);
            if (near <= 1.2 || fh > 0.4) { col = near <= 1.2 ? 0xf4fffc : 0xcff4ef; a = 240; }
            else { col = 0x86dcdc; a = 225; }
          } else if (near <= 4.3 && nearT !== T.PLANK) {
            col = (hash2(wx, wy, 78) > 0.93) ? 0xbdf0ea : 0x72d0d4; a = 205;
          } else {
            const s = Math.max(0, 1 - (wd - 0.7) / 3.6);
            if (s <= 0) a = 0;
            else {
              col = mix(0x2b88b0, 0x5cc6cf, s);
              a = Math.round(Math.min(1, s * 1.15) * 205 * (t === T.DEEP ? 0.62 : 1));
            }
          }
          // ombre portée des quais / ponts
          if (at(lx, ly - 1) === T.PLANK || at(lx, ly - 2) === T.PLANK || at(lx, ly - 3) === T.PLANK || at(lx - 2, ly - 2) === T.PLANK) {
            col = 0x0c2f4a; a = 150;
          }
          break;
        }
        case T.SAND: {
          const P = PAL[T.SAND];
          const n = valueNoise(wx / 23, wy / 23, 41) * 0.7 + valueNoise(wx / 5, wy / 5, 42) * 0.3;
          let k = n < 0.36 ? 1 : n < 0.62 ? 2 : 3;
          const h = hash2(wx, wy, 43);
          if (h > 0.986) k = 4; else if (h < 0.012) k = 0;
          const rip = (wy + Math.floor(valueNoise(wx / 11, wy / 30, 44) * 8)) % 8;
          if (rip === 0 && k > 1 && valueNoise(wx / 40, wy / 40, 45) > 0.5) k -= 1;
          col = P[k];
          const tx = wx >> 4, ty = wy >> 4;
          if (W.waterDist[ty * MAP_W + tx] === 0 && this.nearWaterTile(tx, ty)) {
            for (const [dx, dy, dd] of RING3) {
              if (WATERY[at(lx + dx, ly + dy)]) { col = dd < 2 ? mix(P[1], 0x8a7048, 0.35) : mix(col, P[1], 0.6); break; }
            }
          }
          if (RAISED[at(lx, ly - 1)] || RAISED[at(lx, ly - 2)]) col = shade(col, 0.82);
          break;
        }
        case T.GRASS: case T.JUNGLE: case T.MARSH: {
          let P = PAL[t];
          const n = valueNoise(wx / 19, wy / 19, 51 + t) * 0.6 + valueNoise(wx / 6, wy / 6, 52 + t) * 0.4;
          let k = n < 0.3 ? 1 : n < 0.68 ? 2 : 3;
          if ((Math.abs(n - 0.3) < 0.025 || Math.abs(n - 0.68) < 0.025) && ((wx + wy) & 1)) k = 2;
          if (t === T.JUNGLE && hash2(wx, wy, 55) > 0.985) { col = 0x5c4a2a; break; }
          if (t === T.MARSH && valueNoise(wx / 11, wy / 11, 56) > 0.72) P = PAL[T.MUD];
          const b1 = at(lx, ly + 1), b2 = at(lx, ly + 2), u1 = at(lx, ly - 1);
          if (!RAISED[b1]) k = 0;
          else if (!RAISED[b2]) k = 1;
          else if (!RAISED[u1]) k = 4;
          else if (!RAISED[at(lx - 1, ly)] || !RAISED[at(lx + 1, ly)]) k = Math.max(1, k - 1);
          else if (b1 !== t && b1 !== T.ROCK && ((wx ^ wy) & 1)) P = PAL[b1];
          col = P[k];
          break;
        }
        case T.ROCK: {
          const P = PAL[T.ROCK];
          let below = 0;
          while (below < 11 && at(lx, ly + below + 1) === T.ROCK) below++;
          const z = W.zones[(wy >> 4) * MAP_W + (wx >> 4)];
          if (below < 10) {
            const fromTop = 10 - below;
            let k = 1 + (((wx + Math.floor(valueNoise(wx / 3, wy / 9, 61) * 3)) % 4 === 0) ? -1 : 0) + (valueNoise(wx / 4, wy / 6, 62) > 0.64 ? 1 : 0);
            if (fromTop === 1) k = 4; else if (fromTop === 2) k = 2;
            if (below === 0) k = 0;
            col = P[Math.max(0, Math.min(4, k))];
            if (below === 0 || below === 1) col = mix(col, 0x1a1424, 0.3);
          } else {
            const n = valueNoise(wx / 7, wy / 7, 63);
            let k = n < 0.35 ? 2 : 3;
            if (hash2(wx, wy, 64) > 0.975) k = 4;
            if (Math.abs(valueNoise(wx / 9, wy / 9, 65) - 0.5) < 0.018) k = 1;
            if (at(lx, ly - 1) !== T.ROCK) k = 4;
            else if (at(lx - 1, ly) !== T.ROCK || at(lx + 1, ly) !== T.ROCK) k = 1;
            col = P[k];
            if ((z === Z.JUNGLE || z === Z.RUINS) && valueNoise(wx / 8, wy / 8, 66) > 0.56 && k > 1) col = mix(col, 0x3d7a3f, 0.7);
            else if (z === Z.PLAINS && valueNoise(wx / 8, wy / 8, 67) > 0.62 && k > 1) col = mix(col, 0x5a9a48, 0.55);
          }
          break;
        }
        case T.DIRT: case T.MUD: {
          const P = PAL[t];
          const n = valueNoise(wx / 11, wy / 11, 71) * 0.6 + valueNoise(wx / 3, wy / 3, 72) * 0.4;
          let k = n < 0.4 ? 1 : n < 0.62 ? 2 : 3;
          const h = hash2(wx, wy, 73);
          if (h > 0.975) k = 4; else if (h < 0.02) k = 0;
          if (t === T.MUD && valueNoise(wx / 8, wy / 8, 74) > 0.66) k = h > 0.9 ? 4 : 3;
          col = P[k];
          if (RAISED[at(lx, ly - 1)] || RAISED[at(lx, ly - 2)]) col = shade(col, 0.8);
          break;
        }
        case T.COBBLE: {
          const P = PAL[T.COBBLE];
          const S = 7, gx = Math.floor(wx / S), gy = Math.floor(wy / S);
          let d1 = 1e9, d2 = 1e9, fx = 0, fy = 0, cid = 0;
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
            const ccx = gx + i, ccy = gy + j;
            const px = ccx * S + 1 + hash2(ccx, ccy, 81) * (S - 2), py = ccy * S + 1 + hash2(ccx, ccy, 82) * (S - 2);
            const dx = wx + 0.5 - px, dy = wy + 0.5 - py, dd = dx * dx + dy * dy;
            if (dd < d1) { d2 = d1; d1 = dd; fx = dx; fy = dy; cid = hash2(ccx, ccy, 83); } else if (dd < d2) d2 = dd;
          }
          const edge = Math.sqrt(d2) - Math.sqrt(d1);
          let k;
          if (edge < 1.0) k = 0;
          else {
            k = cid < 0.3 ? 1 : cid < 0.75 ? 2 : 3;
            const s = fx + fy;
            if (s < -2 && edge > 1.6) k = Math.min(4, k + 1); else if (s > 2.2) k = Math.max(1, k - 1);
          }
          col = P[k];
          const z = W.zones[(wy >> 4) * MAP_W + (wx >> 4)];
          if (z === Z.RUINS && valueNoise(wx / 8, wy / 8, 84) > 0.52 && k > 0) col = mix(col, 0x4d7d3a, 0.55);
          else if (cid > 0.92 && k > 0) col = mix(col, 0xa07a5a, 0.35);
          if (RAISED[at(lx, ly - 1)] || RAISED[at(lx, ly - 2)]) col = shade(col, 0.8);
          break;
        }
        case T.PLANK: {
          const P = PAL[T.PLANK];
          const vert = W.plankDir[(wy >> 4) * MAP_W + (wx >> 4)];
          const u = vert ? wx : wy, v = vert ? wy : wx;
          const bi = Math.floor(u / 5), bu = u - bi * 5;
          const off = Math.floor(hash2(bi, 0, 91) * 26);
          const seg = Math.floor((v + off) / 26), sv = (v + off) - seg * 26;
          let k = 2 + (hash2(bi, seg, 92) > 0.6 ? 1 : 0) - (hash2(bi, seg, 93) > 0.85 ? 1 : 0);
          if (bu === 4) k = 0; else if (bu === 0) k = Math.min(4, k + 1);
          if (sv === 0) k = 0;
          if (bu === 2 && hash2(Math.floor(v / 3), bi, 94) > 0.82) k = Math.max(1, k - 1);
          col = P[k];
          if ((sv === 2 || sv === 24) && (bu === 1 || bu === 3)) col = 0x3a2a22;
          const b1 = at(lx, ly + 1), b2 = at(lx, ly + 2);
          if (b1 !== T.PLANK && b1 !== T.COBBLE) col = P[0];
          else if (b2 !== T.PLANK && b2 !== T.COBBLE) col = mix(P[1], 0x2a1a10, 0.3);
          break;
        }
        case T.SWAMP: {
          const P = PAL[T.SWAMP];
          const n = valueNoise(wx / 13, wy / 13, 101) * 0.7 + valueNoise(wx / 4, wy / 4, 102) * 0.3;
          let k = n < 0.5 ? 1 : 2;
          if (valueNoise(wx / 10, wy / 10, 103) > 0.7) k = 3;
          const sheen = (wy + Math.floor(valueNoise(wx / 14, wy / 5, 105) * 6)) % 11;
          if (sheen === 0 && valueNoise(wx / 20, wy / 20, 106) > 0.45) k = 3;
          if (hash2(wx, wy, 104) > 0.994) k = 4;
          for (let r = 1; r <= 2; r++) {
            if (at(lx, ly - r) !== T.SWAMP || at(lx - r, ly) !== T.SWAMP || at(lx + r, ly) !== T.SWAMP) { k = r === 1 ? 0 : Math.min(k, 1); break; }
          }
          col = P[k];
          break;
        }
        case T.VOID: col = 0x07050b; break;
        case T.FLOOR: case T.STONEF: case T.EXIT: {
          const tx = wx >> 4, ty = wy >> 4, rid = W.roomGrid[ty * MAP_W + tx], room = rid >= 0 ? W.rooms[rid] : null;
          const kind = room ? room.kind : 'house';
          if (kind === 'cave') { col = this.caveFloor(wx, wy, lx, ly, at, room); col = mix(col, 0x9aa8b0, 0.12 + (wy & 15) / 16 * 0.3); break; }
          const S = WALLS[kind] || WALLS.house;
          const stone = t === T.STONEF || (t === T.EXIT && kind === 'forge');
          col = stone ? this.flagstone(wx, wy, PAL[T.STONEF]) : this.planks(wx, wy, S.F);
          if (t === T.EXIT) {
            const u = wx & 15, v = wy & 15;
            if (u >= 3 && u <= 12 && v >= 2 && v <= 11) col = (u === 3 || u === 12 || v === 2 || v === 11) ? 0x3a1a12 : ((u + v) % 4 < 2 ? 0x7a3a2a : 0x5a2a1e);
            col = mix(col, 0xfff0c0, 0.08 + v / 16 * 0.25);
            break;
          }
          // ombre portée des murs
          let sh = 1;
          const fy = wy & 15, fx = wx & 15;
          if (this.tileT(tx, ty - 1) === T.IWALL && fy < 5) sh *= [0.55, 0.66, 0.76, 0.86, 0.94][fy];
          if (this.tileT(tx - 1, ty) === T.IWALL && fx < 3) sh *= [0.7, 0.82, 0.92][fx];
          if (this.tileT(tx + 1, ty) === T.IWALL && fx > 12) sh *= [0.92, 0.84, 0.76][fx - 13];
          if (sh < 1) col = shade(col, sh);
          break;
        }
        case T.IWALL: {
          const tx = wx >> 4, ty = wy >> 4;
          const below1 = this.tileT(tx, ty + 1), below2 = this.tileT(tx, ty + 2);
          let d = 0, rid = -1;
          if (isFloor(below1)) { d = (ty + 1) * TILE - wy; rid = W.roomGrid[(ty + 1) * MAP_W + tx]; }
          else if (below1 === T.IWALL && isFloor(below2)) { d = (ty + 2) * TILE - wy; rid = W.roomGrid[(ty + 2) * MAP_W + tx]; }
          if (d > 0) col = this.wallFace(wx, wy, d, rid >= 0 ? W.rooms[rid] : null, tx);
          else {
            col = hash2(wx >> 1, wy >> 1, 181) > 0.85 ? 0x22170f : 0x1a1210;
            const up1 = this.tileT(tx, ty - 1), fy = wy & 15;
            if (isFloor(up1) || up1 === T.EXIT) col = fy === 0 ? 0x7a5636 : fy === 1 ? 0x5a3e28 : fy < 4 ? 0x3e2a1a : col;
            const fx = wx & 15;
            if ((isFloor(this.tileT(tx - 1, ty)) && fx === 0) || (isFloor(this.tileT(tx + 1, ty)) && fx === 15)) col = 0x4a3422;
          }
          break;
        }
        case T.CAVE: {
          const rid = W.roomGrid[(wy >> 4) * MAP_W + (wx >> 4)];
          col = this.caveFloor(wx, wy, lx, ly, at, rid >= 0 ? W.rooms[rid] : null);
          break;
        }
        case T.CWALL: {
          const P = PAL[T.CWALL];
          let below = 0;
          while (below < 14 && at(lx, ly + below + 1) === T.CWALL) below++;
          const fl = at(lx, ly + below + 1);
          if (below < 13 && (fl === T.CAVE || fl === T.EXIT)) {
            let k = 2 + (valueNoise(wx / 3, wy / 8, 161) > 0.55 ? 1 : 0) - ((wx + Math.floor(valueNoise(wx / 4, wy / 10, 162) * 4)) % 5 === 0 ? 1 : 0);
            if (below >= 11) k = 4; else if (below >= 9) k = 3;
            if (below <= 1) k = 0;
            col = P[Math.max(0, Math.min(4, k))];
          } else {
            col = hash2(wx >> 1, wy >> 1, 163) > 0.82 ? 0x17131c : 0x0e0b12;
            if (at(lx, ly - 1) === T.CAVE) col = P[2]; else if (at(lx, ly - 2) === T.CAVE) col = P[1];
            else if (at(lx - 1, ly) === T.CAVE || at(lx + 1, ly) === T.CAVE) col = P[1];
          }
          break;
        }
        default: col = 0xff00ff;
      }
      if (a > 0) put(lx, ly, col, a);
    }

    // Détails : touffes d'herbe, fleurs, cailloux
    const CELL = 6;
    const g0x = Math.floor(bx / CELL) - 1, g1x = Math.floor((bx + CHUNK_PX) / CELL) + 1;
    const g0y = Math.floor(by / CELL) - 1, g1y = Math.floor((by + CHUNK_PX) / CELL) + 1;
    for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) {
      const h = hash2(gx, gy, 111);
      if (h > 0.3) continue;
      const fx = gx * CELL + Math.floor(hash2(gx, gy, 112) * 5), fy = gy * CELL + Math.floor(hash2(gx, gy, 113) * 5);
      const lx = fx - bx, ly = fy - by;
      const t = at(lx, ly);
      if (t === T.GRASS || t === T.JUNGLE || t === T.MARSH) {
        if (!RAISED[at(lx, ly + 2)] || !RAISED[at(lx, ly - 4)]) continue;
        const P = PAL[t];
        if (h < (t === T.JUNGLE ? 0.24 : 0.17)) {
          for (const [dx, dy, k] of TUFT) if (at(lx + dx, ly + dy) === t) put(lx + dx, ly + dy, P[k]);
        } else if (t === T.GRASS && h < 0.205) {
          const c = FLOWER_COLS[Math.floor(hash2(gx, gy, 114) * FLOWER_COLS.length)];
          put(lx, ly + 2, P[0]); put(lx + 1, ly + 1, P[0]);
          put(lx, ly - 1, c); put(lx - 1, ly, c); put(lx + 1, ly, c); put(lx, ly + 1, c);
          put(lx, ly, hash2(gx, gy, 115) > 0.5 ? 0xffc93d : 0xf08a3a);
        } else if (t === T.MARSH && h < 0.2) {
          put(lx, ly, 0x9a7fc0); put(lx, ly + 1, P[0]);
        }
      } else if ((t === T.DIRT || t === T.SAND) && h < 0.05) {
        const P = PAL[t];
        if (at(lx + 1, ly) !== t || at(lx, ly + 1) !== t) continue;
        put(lx, ly, P[4]); put(lx + 1, ly, P[3]); put(lx, ly + 1, P[0]); put(lx + 1, ly + 1, P[0]);
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
  planks(wx, wy, P) {
    const row = Math.floor(wy / 6), rv = wy - row * 6;
    const off = Math.floor(hash2(row, 7, 131) * 40);
    const seg = Math.floor((wx + off) / 40), sv = (wx + off) - seg * 40;
    let k = 2 + (hash2(row, seg, 132) > 0.6 ? 1 : 0) - (hash2(row, seg, 133) > 0.85 ? 1 : 0);
    if (rv === 5) k = 0; else if (rv === 0) k = Math.min(4, k + 1);
    if (sv === 0) k = 0;
    if (hash2(wx >> 1, wy, 134) > 0.97) k = Math.max(0, k - 1);
    if ((sv === 3 || sv === 37) && (rv === 2 || rv === 3)) return 0x2a1a10;
    return P[k];
  }
  flagstone(wx, wy, P) {
    const row = Math.floor(wy / 8), off = (row % 2) * 5, c = Math.floor((wx + off) / 10);
    const u = (wx + off) - c * 10, v = wy - row * 8, id = hash2(c, row, 141);
    let k = id < 0.3 ? 1 : id < 0.75 ? 2 : 3;
    if (u === 0 || v === 0) k = 0; else if (u === 1 || v === 1) k = Math.min(4, k + 1);
    if (hash2(wx, wy, 142) > 0.96) k = Math.max(1, k - 1);
    return P[k];
  }
  caveFloor(wx, wy, lx, ly, at, room) {
    const P = PAL[T.CAVE];
    const n = valueNoise(wx / 9, wy / 9, 151) * 0.6 + valueNoise(wx / 3, wy / 3, 152) * 0.4;
    let k = n < 0.38 ? 1 : n < 0.62 ? 2 : 3;
    const h = hash2(wx, wy, 153);
    if (h > 0.985) k = 4; else if (h < 0.015) k = 0;
    let col = P[k];
    if (valueNoise(wx / 14, wy / 14, 154) > 0.72) col = mix(col, 0x1c2a3a, 0.5);
    const name = room ? room.name : '';
    if (name.includes('Cristal')) col = mix(col, 0x1a2a52, 0.28);
    else if (name.includes('Crâne')) { col = mix(col, 0x2e2c1c, 0.22); if (h > 0.992) col = 0xb4ab8c; }
    else col = mix(col, 0x3a2a1a, 0.18);
    for (const [dx, dy, dd] of RING3) if (at(lx + dx, ly + dy) === T.CWALL) { col = shade(col, 0.55 + dd * 0.13); break; }
    return col;
  }
  wallFace(wx, wy, d, room, tx) {
    const S = WALLS[room ? room.kind : 'house'] || WALLS.house, N = S.N, U = S.U;
    if (d <= 2) return N[0];
    if (d <= 11) { const px = wx % 12; if (d === 11) return N[4]; if (d === 3) return N[1]; return px === 0 ? N[0] : px === 1 ? N[3] : N[2]; }
    if (d <= 13) return d === 13 ? 0xb07a48 : 0x6f482a;
    if (d >= 30) return d === 30 ? 0x3a2414 : 0x1a100a;
    // décor accroché au mur (fenêtre, tableau, carte) sur certaines colonnes
    const fy = room ? room.y0 : 0, h = hash2(tx, fy, 175);
    const u = wx & 15;
    if (room && h > 0.7 && tx > room.x0 && tx < room.x0 + room.w - 1 && d >= 16 && d <= 27 && u >= 3 && u <= 12) {
      const kind = Math.floor(hash2(tx, fy, 176) * 3);
      const fr = u === 3 || u === 12 || d === 16 || d === 27;
      if (kind === 0) { // fenêtre
        if (fr) return 0x4a2e18;
        if (u === 7 || u === 8 || d === 21 || d === 22) return 0x5e3c20;
        return d > 23 ? 0x2a4a6a : 0x3a6a8a;
      }
      if (kind === 1) { // tableau : navire en mer
        if (fr) return 0xc8901e;
        if (d < 21) return 0x2a5a8a;
        if (u >= 6 && u <= 9 && d >= 21 && d <= 24) return d === 21 ? 0x3a2414 : 0xe8dec0;
        return 0x7aaed0;
      }
      if (fr) return 0x8a6a3a; // carte au trésor
      if ((u === 9 && d === 20) || (u === 10 && d === 21) || (u === 10 && d === 20) || (u === 9 && d === 21)) return 0xc0302a;
      return ((u + d) % 5 === 0) ? 0xb89a68 : 0xd8c49a;
    }
    if (S.up === 'planks') {
      const bx = Math.floor(wx / 7), uu = wx - bx * 7;
      if (uu === 0) return U[0];
      if (uu === 1) return U[3];
      let k = 2 + (hash2(bx, 0, 171) > 0.6 ? 1 : 0) - (hash2(bx, 1, 172) > 0.8 ? 1 : 0);
      if (d > 26) k = Math.max(0, k - 1);
      return U[k];
    }
    if (S.up === 'bricks') {
      const row = Math.floor(d / 4), off = row % 2 ? 4 : 0;
      if (d % 4 === 0 || (wx + off) % 9 === 0) return U[0];
      const id = hash2(Math.floor((wx + off) / 9), row, 177);
      let k = id < 0.4 ? 2 : id < 0.8 ? 3 : 1;
      if (d > 24) k = Math.max(1, k - 1);
      return U[k];
    }
    const n = valueNoise(wx / 6, wy / 6, 173);
    let k = n < 0.3 ? 2 : n < 0.75 ? 3 : 4;
    if (d > 26) k -= 1;
    if (hash2(wx, wy, 174) > 0.985) k = 1;
    return U[Math.max(0, k)];
  }
  nearWaterTile(tx, ty) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (WATERY[this.tileT(tx + dx, ty + dy)]) return true;
    return false;
  }
}

// Motifs d'eau animée (sous les blocs de terrain)
function periodicNoise(x, y, P, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const g = (a, b) => hash2(((a % P) + P) % P, ((b % P) + P) % P, seed);
  const A = g(xi, yi), B = g(xi + 1, yi), C = g(xi, yi + 1), D = g(xi + 1, yi + 1);
  const su = s(u), sv = s(v);
  return A + (B - A) * su + (C - A) * sv + (A - B - C + D) * su * sv;
}
export function makeWaterLayers() {
  const S = 128;
  const mk = () => { const c = document.createElement('canvas'); c.width = S; c.height = S; return c; };
  const base = mk(), crest = mk(), glint = mk();
  {
    const x = base.getContext('2d'), img = x.createImageData(S, S), d = new Uint32Array(img.data.buffer);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const n = periodicNoise(i / 16, j / 16, 8, 3) * 0.7 + periodicNoise(i / 8, j / 8, 16, 4) * 0.3;
      const c = n < 0.4 ? 0x174a76 : n < 0.62 ? 0x1b5585 : 0x206193;
      d[j * S + i] = (0xff000000 | ((c & 255) << 16) | (c & 0xff00) | ((c >> 16) & 255)) >>> 0;
    }
    x.putImageData(img, 0, 0);
  }
  const drawCrests = (cv, n, seed, cA, cB) => {
    const x = cv.getContext('2d');
    for (let k = 0; k < n; k++) {
      const px = Math.floor(hash2(k, 1, seed) * S), py = Math.floor(hash2(k, 2, seed) * S);
      const len = 3 + Math.floor(hash2(k, 3, seed) * 5);
      x.fillStyle = hash2(k, 4, seed) > 0.3 ? cA : cB;
      for (let i = 0; i < len; i++) {
        const yy = (i === 0 || i === len - 1) ? py + 1 : py;
        x.fillRect((px + i) % S, yy % S, 1, 1);
      }
    }
  };
  drawCrests(crest, 46, 9, '#3f86b8', '#5aa2cc');
  drawCrests(glint, 14, 21, '#9fd6ee', '#e8fbff');
  return { base, crest, glint, S };
}
