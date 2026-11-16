// Rendu du monde : eau, sol, décors triés en profondeur, entités, effets,
// éclairage jour/nuit, brume, faune et étiquettes.
import { TILE, MAP_W, MAP_H, OVER_H, T, darkness, dayFrac, weatherAt } from '../../shared/constants.js';
import { PROPS, Z, SAFE, tileAt, zoneAt } from '../../shared/world.js';
import { boatSprites } from './sprites-boats.js';
import { ITEMS } from '../../shared/data/items.js';
import { MOBS } from '../../shared/data/mobs.js';
import { NPCS } from '../../shared/data/npcs.js';
import { Terrain, makeWaterLayers, CHUNK_PX } from './terrain.js';
import { buildEnvSprites, buildStructSprites } from './sprites-env.js';
import { STRUCTS, CLAIM_R, PLANTER_GROW } from '../../shared/data/craft.js';
import { humanSheet, mobSheet, whiteSheet, weaponSprite, parrotSheet, catSheet, FW, FH } from './sprites-chars.js';
import { iconCanvas } from './sprites-items.js';
import { heldWeapon } from './weapons.js';
import { textCanvas, textWidth } from './font.js';
import { PB } from './pixel.js';
import { hash2 } from '../../shared/rng.js';
import { extend06, petSheets, drawTentacle } from './sprites-06.js';

const TAU = Math.PI * 2;
const TREES = new Set(['tree', 'jtree', 'palm', 'deadtree']);
// couleur des zones d'alerte selon l'attaque : canon, cendre, os, onde, bond, geyser, Kraken, vague, tentacule
const TELE_COL = { 0: [230, 40, 30], 1: [255, 150, 40], 2: [230, 40, 30], 3: [255, 130, 50], 4: [225, 225, 195], 5: [255, 215, 70], 6: [200, 110, 255], 7: [90, 180, 255], 8: [200, 40, 110], 9: [120, 220, 255], 10: [210, 60, 130] };
const isSea = (e) => e.k === 'a' || (e.k === 'm' && MOBS[e.type] && MOBS[e.type].sea);
const rnd = Math.random;

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function radial(size, stops) {
  const c = makeCanvas(size, size), x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return c;
}
function bandedMask(size = 96) {
  const c = makeCanvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const dx = (i + 0.5) / size * 2 - 1, dy = (j + 0.5) / size * 2 - 1, r = Math.sqrt(dx * dx + dy * dy);
    let a = Math.max(0, 1 - r); a = a * a * (3 - 2 * a);
    a = Math.round(a * 6) / 6;
    const k = (j * size + i) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = Math.round(a * 255);
  }
  x.putImageData(img, 0, 0);
  return c;
}
function flameFrames(blue = false, big = false) {
  const frames = [];
  const W = big ? 12 : 8, H = big ? 18 : 12;
  const cols = blue ? [0x2a6ad0, 0x5ab0ff, 0xb8ecff, 0xffffff] : [0xc8301e, 0xf06a1e, 0xffb43a, 0xfff2b0];
  for (let f = 0; f < 4; f++) {
    const pb = new PB(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = y / (H - 1); // 0 haut, 1 bas
      const wob = Math.sin((y + f * 2.3) * 1.1) * (1 - t) * 1.2;
      const half = (W / 2 - 0.5) * Math.pow(t, 0.7) * (0.75 + 0.25 * Math.sin(f * 1.7 + y));
      const dx = Math.abs(x + 0.5 - W / 2 - wob);
      if (dx > half + 0.3) continue;
      const core = dx / (half + 0.5);
      let k = core < 0.35 && t > 0.35 ? 3 : core < 0.6 ? 2 : core < 0.85 ? 1 : 0;
      if (t < 0.2) k = Math.min(k, 1);
      pb.set(x, y, cols[k]);
    }
    frames.push(pb.toCanvas());
  }
  return frames;
}
function fogTexture(size = 192) {
  const c = makeCanvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
  const P = 6;
  const g = (a, b) => hash2(((a % P) + P) % P, ((b % P) + P) % P, 999);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const fx = i / size * P, fy = j / size * P, xi = Math.floor(fx), yi = Math.floor(fy), u = fx - xi, v = fy - yi;
    const s = (t) => t * t * (3 - 2 * t);
    const A = g(xi, yi), B = g(xi + 1, yi), C = g(xi, yi + 1), D = g(xi + 1, yi + 1);
    const n = A + (B - A) * s(u) + (C - A) * s(v) + (A - B - C + D) * s(u) * s(v);
    const a = Math.max(0, n - 0.35) / 0.65;
    const k = (j * size + i) * 4; d[k] = 200; d[k + 1] = 225; d[k + 2] = 210; d[k + 3] = Math.round(Math.pow(a, 1.4) * 150);
  }
  x.putImageData(img, 0, 0);
  return c;
}

export class Renderer {
  constructor(canvas, world) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.terrain = new Terrain(world);
    this.water = makeWaterLayers();
    this.env = buildEnvSprites();
    this.structSpr = buildStructSprites(this.env);
    extend06(this.env, this.structSpr); this.pets = petSheets(); this.tentacle = drawTentacle;
    this.boats = boatSprites();
    this.room = null;
    this.parrot = parrotSheet();
    this.flames = flameFrames(false); this.bigFlames = flameFrames(true, true);
    this.mask = bandedMask(96);
    this.glows = {
      warm: radial(64, [[0, 'rgba(255,170,70,0.55)'], [0.5, 'rgba(255,120,40,0.18)'], [1, 'rgba(255,100,30,0)']]),
      cold: radial(64, [[0, 'rgba(170,220,255,0.6)'], [0.5, 'rgba(100,170,255,0.18)'], [1, 'rgba(80,140,255,0)']]),
      green: radial(64, [[0, 'rgba(140,255,150,0.55)'], [0.5, 'rgba(80,255,140,0.16)'], [1, 'rgba(60,255,120,0)']]),
      purple: radial(64, [[0, 'rgba(210,150,255,0.55)'], [1, 'rgba(160,80,255,0)']]),
      white: radial(64, [[0, 'rgba(255,255,240,0.8)'], [0.4, 'rgba(255,240,200,0.3)'], [1, 'rgba(255,230,180,0)']]),
      red: radial(64, [[0, 'rgba(255,90,60,0.6)'], [1, 'rgba(255,40,20,0)']]),
    };
    this.cloud = radial(128, [[0, 'rgba(10,20,40,0.55)'], [0.6, 'rgba(10,20,40,0.25)'], [1, 'rgba(10,20,40,0)']]);
    this.fog = fogTexture();
    this.light = makeCanvas(16, 16); this.lctx = this.light.getContext('2d');
    this.W = 480; this.H = 270; this.scale = 3;
    this.cam = { x: world.spawnPoint.x, y: world.spawnPoint.y };
    this.camX = 0; this.camY = 0;
    this.shakeT = 0; this.shakeA = 0;
    this.parts = []; this.texts = []; this.fx = []; this.projs = new Map(); this.bombs = []; this.teles = []; this.critters = []; this.glints = []; this.bubbles = [];
    this.fogA = 0; this.drunk = 0; this.lteles = []; this.inks = []; this.abyss = null; this.redSails = new Map();
    this.rain = []; this.splashes = []; this.decals = []; this.flash = 0; this.nextBolt = 0; this.bolt = null; this.onThunder = null;
    this.cats = { orange: catSheet('orange'), black: catSheet('black'), white: catSheet('white') };
    this.shakeOn = true;
    this.indexProps();
  }
  indexProps() {
    this.buckets = new Map();
    this.lights = [];
    this.smokers = [];
    for (const p of this.world.props) {
      const key = Math.floor(p.x / CHUNK_PX) + Math.floor(p.y / CHUNK_PX) * 100;
      if (!this.buckets.has(key)) this.buckets.set(key, []);
      this.buckets.get(key).push(p);
      if (p.type === 'comptoir') p.v = p.tx % 3;
      if (p.type === 'grotte') { const d = this.world.doors.find((q) => q.secret && (q.ox >> 4) === p.tx && (q.oy >> 4) === p.ty + 1); p.door = d ? d.id : null; }
      const list = this.env[p.type];
      const s = list ? list[p.v % list.length] : null;
      p.spr = s;
      p.ground = !!(PROPS[p.type] && PROPS[p.type].ground);
      if (!s) continue;
      const ox = p.x - s.ax, oy = p.y - s.ay;
      if (s.light) this.lights.push({ x: ox + s.light[0], y: oy + s.light[1], r: 58, c: 'warm', flicker: 1 });
      if (s.flame) this.lights.push({ x: ox + s.flame[0], y: oy + s.flame[1], r: s.blue ? 130 : 66, c: s.blue ? 'cold' : 'warm', flicker: 1, flame: s.blue ? 'big' : 'small', fx: ox + s.flame[0], fy: oy + s.flame[1] });
      if (s.windows) for (const w of s.windows) this.lights.push({ x: ox + w.x + w.w / 2, y: oy + w.y + w.h + 6, r: 34, c: 'warm', win: { x: ox + w.x, y: oy + w.y, w: w.w, h: w.h } });
      if (s.smoke) this.smokers.push({ x: ox + s.smoke.x, y: oy + s.smoke.y, t: 0 });
      if (s.glow) for (const [gx, gy] of s.glow) this.lights.push({ x: ox + gx, y: oy + gy, r: s.glowR || (p.type === 'wreck' ? 60 : 26), c: s.glowCol || (p.type === 'idol' || p.type === 'wreck' || p.type === 'crypt' ? 'green' : 'cold'), soft: 1 });
      if (s.lights) for (const [lx, ly] of s.lights) this.lights.push({ x: ox + lx, y: oy + ly, r: 40, c: 'warm', flicker: 1 });
      if (p.type === 'forge') this.lights.push({ x: ox + s.w - 28, y: oy + s.h - 8, r: 60, c: 'warm', flicker: 1 });
      if (p.type === 'lighthouse') { this.lighthouse = { x: ox + s.light[0], y: oy + s.light[1] }; }
    }
  }
  resize(w, h) {
    this.lastW = w; this.lastH = h;
    this.baseScale = this.zoom > 0 ? this.zoom : Math.max(1, Math.round(Math.min(w, h) / 400));
    const scale = this.baseScale + (this.boost || 0);
    this.scale = scale;
    this.W = Math.ceil(w / scale); this.H = Math.ceil(h / scale);
    this.cv.width = this.W; this.cv.height = this.H;
    this.cv.style.width = this.W * scale + 'px'; this.cv.style.height = this.H * scale + 'px';
    this.light.width = this.W; this.light.height = this.H;
    this.ctx.imageSmoothingEnabled = false;
  }
  toWorld(sx, sy) { return { x: sx / this.scale + this.camX, y: sy / this.scale + this.camY }; }
  shake(a, t = 0.25) { if (!this.shakeOn) return; this.shakeA = Math.max(this.shakeA, a); this.shakeT = Math.max(this.shakeT, t); }

  // ---------------------------------------------------------------- effets
  burst(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + (rnd() - 0.5) * (o.spread ?? 1.2) : rnd() * TAU;
      const sp = (o.speed || 40) * (0.4 + rnd() * 0.8);
      const life = (o.life || 0.5) * (0.6 + rnd() * 0.6);
      this.parts.push({ x, y, z: o.z ?? 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: (o.up ?? 40) * (0.5 + rnd()), g: o.g ?? 160, life, max: life, col: Array.isArray(o.col) ? o.col[(rnd() * o.col.length) | 0] : (o.col || '#fff'), size: o.size || 1, kind: o.kind || 'p', drag: o.drag ?? 2 });
    }
  }
  smoke(x, y, n = 6, col = 'rgba(200,200,200,0.5)', o = {}) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + (rnd() - 0.5) * (o.spread || 8), y: y + (rnd() - 0.5) * 4, z: o.z ?? 4, vx: (rnd() - 0.5) * 14 + (o.wind || 0), vy: (rnd() - 0.5) * 6, vz: 10 + rnd() * 14, g: -4, life: o.life || 0.9, max: o.life || 0.9, col, size: o.size || 3, kind: 'smoke', drag: 1.5 });
  }
  text(x, y, s, col = '#ffffff', big = false) { this.texts.push({ x: x + (rnd() - 0.5) * 6, y, s: String(s), col, life: big ? 1.1 : 0.85, max: big ? 1.1 : 0.85, big }); }
  addFx(f) { f.t0 = performance.now() / 1000; this.fx.push(f); }

  // ---------------------------------------------------------------- rendu
  render(G, now, dt) {
    const ctx = this.ctx, W = this.W, H = this.H;
    const f = dayFrac(G.worldTime || 0), dark = darkness(f);
    // caméra
    const tgt = G.camTarget;
    this.cam.x += (tgt.x - this.cam.x) * Math.min(1, dt * 7);
    this.cam.y += (tgt.y - this.cam.y) * Math.min(1, dt * 7);
    if (G.snapCam) { this.cam.x = tgt.x; this.cam.y = tgt.y; G.snapCam = false; }
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { this.shakeT -= dt; sx = (rnd() - 0.5) * this.shakeA * 2; sy = (rnd() - 0.5) * this.shakeA * 2; if (this.shakeT <= 0) this.shakeA = 0; }
    // pièce intérieure ou grotte : la caméra reste dans la pièce
    const room = G.player && G.room >= 0 ? this.world.rooms[G.room] : null;
    this.room = room;
    // dans une petite pièce, on se rapproche un peu
    const boost = room && this.lastW ? Math.max(0, Math.min(1, Math.floor(Math.min(this.lastW / ((room.w + 2) * TILE), this.lastH / ((room.h + 3) * TILE))) - this.baseScale)) : 0;
    if (boost !== (this.boost || 0)) { this.boost = boost; this.resize(this.lastW, this.lastH); return; }
    let minX = 0, maxX = MAP_W * TILE - W, minY = 0, maxY = OVER_H * TILE - H, rx0 = 0, ry0 = 0, rx1 = 0, ry1 = 0;
    if (room) {
      rx0 = (room.x0 - 1) * TILE; rx1 = (room.x0 + room.w + 1) * TILE; ry0 = (room.y0 - 2) * TILE; ry1 = (room.y0 + room.h + 1) * TILE;
      if (rx1 - rx0 <= W) minX = maxX = Math.round((rx0 + rx1) / 2 - W / 2); else { minX = rx0; maxX = rx1 - W; }
      if (ry1 - ry0 <= H) minY = maxY = Math.round((ry0 + ry1) / 2 - H / 2); else { minY = ry0; maxY = ry1 - H; }
    }
    if (maxX < minX) minX = maxX = Math.round((minX + maxX) / 2);
    if (maxY < minY) minY = maxY = Math.round((minY + maxY) / 2);
    const camX = Math.round(Math.max(minX, Math.min(maxX, this.cam.x - W / 2)) + sx);
    const camY = Math.round(Math.max(minY, Math.min(maxY, this.cam.y - H / 2)) + sy);
    this.camX = camX; this.camY = camY;
    ctx.save();
    if (this.drunk > 0) { const a = Math.sin(now * 1.7) * 0.025 * this.drunk; ctx.translate(W / 2, H / 2); ctx.rotate(a); ctx.translate(-W / 2, -H / 2); }

    if (room) {
      ctx.fillStyle = '#07050b'; ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.save(); ctx.beginPath(); ctx.rect(rx0 - camX, ry0 - camY, rx1 - rx0, ry1 - ry0); ctx.clip();
    } else this.drawWater(ctx, camX, camY, now, dark);
    // sol
    const c0x = Math.floor(camX / CHUNK_PX), c1x = Math.floor((camX + W) / CHUNK_PX);
    const c0y = Math.floor(camY / CHUNK_PX), c1y = Math.floor((camY + H) / CHUNK_PX);
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) ctx.drawImage(this.terrain.get(cx, cy), cx * CHUNK_PX - camX, cy * CHUNK_PX - camY);
    this.prefetch(c0x, c1x, c0y, c1y);
    if (!room) this.drawGlints(ctx, camX, camY, now, dark, dt);

    // collecte des objets visibles
    const props = [];
    for (let cy = c0y - 1; cy <= c1y + 1; cy++) for (let cx = c0x - 1; cx <= c1x + 1; cx++) {
      const b = this.buckets.get(cx + cy * 100);
      if (b) for (const p of b) if (p.spr && p.x - p.spr.ax < camX + W && p.x - p.spr.ax + p.spr.w > camX && p.y - p.spr.ay < camY + H && p.y - p.spr.ay + p.spr.h + 4 > camY) props.push(p);
    }
    // planchers et tapis des bases
    if (G.floors) for (const f of G.floors.values()) {
      const x = f.tx * TILE - camX, y = f.ty * TILE - camY;
      if (x < -16 || y < -16 || x > W || y > H) continue;
      ctx.drawImage(this.structSpr[f.type][0].cv, x, y);
    }
    // décors au sol
    const depl = (p) => G.depleted && (G.depleted.get(p.id) || 0) > now;
    for (const p of props) if (p.ground && !depl(p)) ctx.drawImage(p.spr.cv, Math.round(p.x - p.spr.ax - camX), Math.round(p.y - p.spr.ay - camY));
    this.drawGroundMarks(ctx, G, camX, camY, now);
    this.drawSeaFx(ctx, G, camX, camY, now);
    // objets tombés au sol
    for (const e of G.ents.values()) if (e.k === 'd') this.drawDrop(ctx, e, camX, camY, now, G);
    // télégraphes
    for (let i = this.teles.length - 1; i >= 0; i--) {
      const t = this.teles[i], k = (now - t.t0) / t.dur;
      if (k >= 1) { this.teles.splice(i, 1); continue; }
      const x = t.x - camX, y = t.y - camY, C = TELE_COL[t.style] || TELE_COL[0];
      ctx.fillStyle = `rgba(${C[0]},${C[1]},${C[2]},${0.15 + 0.25 * k})`;
      ctx.beginPath(); ctx.ellipse(x, y, t.r * k, t.r * k * 0.7, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(${Math.min(255, C[0] + 30)},${Math.min(255, C[1] + 40)},${Math.min(255, C[2] + 30)},${0.6 + 0.4 * Math.sin(now * 20)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y, t.r, t.r * 0.7, 0, 0, TAU); ctx.stroke();
    }
    for (let i = this.lteles.length - 1; i >= 0; i--) {
      const t = this.lteles[i], k = (now - t.t0) / t.dur;
      if (k >= 1) { this.lteles.splice(i, 1); continue; }
      const C = TELE_COL[t.style] || TELE_COL[0], L = Math.hypot(t.x1 - t.x0, t.y1 - t.y0);
      ctx.save(); ctx.translate(t.x0 - camX, t.y0 - camY); ctx.rotate(Math.atan2(t.y1 - t.y0, t.x1 - t.x0));
      ctx.fillStyle = `rgba(${C[0]},${C[1]},${C[2]},${0.12 + 0.14 * k})`; ctx.fillRect(0, -t.w / 2, L, t.w);
      ctx.fillStyle = `rgba(${C[0]},${C[1]},${C[2]},${0.2 + 0.3 * k})`; ctx.fillRect(0, -t.w / 2, L * k, t.w);
      ctx.strokeStyle = `rgba(${Math.min(255, C[0] + 30)},${Math.min(255, C[1] + 40)},${Math.min(255, C[2] + 30)},${0.6 + 0.4 * Math.sin(now * 20)})`; ctx.lineWidth = 1;
      ctx.strokeRect(0.5, -t.w / 2 + 0.5, L - 1, t.w - 1);
      ctx.restore();
    }

    // tri en profondeur
    const draw = [];
    for (const p of props) if (!p.ground) draw.push({ y: p.y, p });
    if (G.structs) for (const st of G.structs.values()) { const x = st.tx * TILE + 8; if (x > camX - 40 && x < camX + W + 40 && st.ty * TILE > camY - 40 && st.ty * TILE < camY + H + 40) draw.push({ y: st.ty * TILE + 15, st }); }
    for (const e of G.ents.values()) if (e.k !== 'd' && e.x > camX - 60 && e.x < camX + W + 60 && e.y > camY - 30 && e.y < camY + H + 60) draw.push({ y: e.y, e });
    for (const n of G.npcs) if (n.x > camX - 40 && n.x < camX + W + 40 && n.y > camY - 30 && n.y < camY + H + 40) draw.push({ y: n.y, n });
    if (G.player) draw.push({ y: G.player.y, e: G.player });
    if (G.player && G.player.petObj && !G.player.petObj.hidden) draw.push({ y: G.player.petObj.y, pet: G.player.petObj });
    for (const e of G.ents.values()) if (e.k === 'p' && e.petObj && !e.petObj.hidden) draw.push({ y: e.petObj.y, pet: e.petObj });
    for (const f of G.folk || []) if (f.x > camX - 30 && f.x < camX + W + 30 && f.y > camY - 30 && f.y < camY + H + 40) draw.push({ y: f.y, e: f });
    for (const c of G.cats || []) if (c.x > camX - 20 && c.x < camX + W + 20 && c.y > camY - 20 && c.y < camY + H + 20) draw.push({ y: c.y, c });
    draw.sort((a, b) => a.y - b.y);
    // ombres
    ctx.fillStyle = 'rgba(20,12,34,0.28)';
    for (const d of draw) {
      if (d.st) continue;
      if (d.p) {
        const s = d.p.spr;
        if (d.p.type === 'ship' || d.p.type === 'wreck' || d.p.type === 'lighthouse' || d.p.type === 'boat') continue;
        const w = Math.min(28, s.w * 0.34);
        ctx.beginPath(); ctx.ellipse(d.p.x - camX + (TREES.has(d.p.type) ? 3 : 0), d.p.y - camY - 1, w, Math.max(2, Math.min(7, w * 0.3)), 0, 0, TAU); ctx.fill();
      } else if (d.c || d.pet) {
        const c = d.c || d.pet;
        if (c.kind !== 'perroquet') { ctx.beginPath(); ctx.ellipse(c.x - camX, c.y - camY - 1, 4, 1.5, 0, 0, TAU); ctx.fill(); }
      } else {
        const o = d.e || d.n;
        if (o.k === 'd' || (o.dyingT && now - o.dyingT > 0.4) || isSea(o)) continue;
        if (o === G.player ? G.player.boat : (o.flags & 16)) continue;
        if (this.inWater(o.x, o.y)) continue;
        const big = o.sheet && o.sheet.fw > FW ? 2 : 1;
        ctx.beginPath(); ctx.ellipse(o.x - camX, o.y - camY - 1, 6 * big, 2.5 * big, 0, 0, TAU); ctx.fill();
      }
    }
    const me = G.player;
    for (const d of draw) {
      if (d.p) this.drawProp(ctx, d.p, camX, camY, now, me, G);
      else if (d.st) this.drawStruct(ctx, d.st, camX, camY, now);
      else if (d.c) this.drawCat(ctx, d.c, camX, camY, now);
      else if (d.pet) this.drawPet(ctx, d.pet, camX, camY, now);
      else if (d.n) this.drawNpc(ctx, d.n, camX, camY, now, G);
      else this.drawEntity(ctx, d.e, camX, camY, now, G);
    }

    this.drawFishing(ctx, G, camX, camY, now);
    this.drawFx(ctx, camX, camY, now, dt);
    this.drawProjectiles(ctx, camX, camY, now, dt);
    this.drawParticles(ctx, camX, camY, dt);
    if (!room) {
      this.updateCritters(G, camX, camY, now, dt, dark);
      this.drawCritters(ctx, camX, camY, now, dark, false);
      this.drawAtmosphere(ctx, G, camX, camY, now, dt, dark);
    } else this.critters.length = 0;
    this.drawLighting(ctx, G, camX, camY, now, dark, f);
    if (!room) { this.drawCritters(ctx, camX, camY, now, dark, true); this.drawWeather(ctx, G, now, dt, dark); }
    else { this.weather = { rain: 0, storm: 0, kind: 0 }; this.rain.length = 0; }
    this.drawLabels(ctx, G, draw, camX, camY, now);
    this.drawTexts(ctx, camX, camY, dt);
    if (room) ctx.restore();
    else this.drawObjective(ctx, G, camX, camY, now);
    ctx.restore();
    this.drawBossBar(ctx, G);
  }
  prefetch(c0x, c1x, c0y, c1y) {
    for (let cy = c0y - 1; cy <= c1y + 1; cy++) for (let cx = c0x - 1; cx <= c1x + 1; cx++) {
      if (cx < 0 || cy < 0 || cx * CHUNK_PX >= MAP_W * TILE || cy * CHUNK_PX >= MAP_H * TILE) continue;
      if (!this.terrain.has(cx, cy)) { this.terrain.get(cx, cy); return; }
    }
  }
  inWater(x, y) { const t = tileAt(this.world, x, y - 2); return t === T.WATER || t === T.SWAMP; }

  drawWater(ctx, camX, camY, now, dark) {
    const S = this.water.S;
    if (!this.patBase) { this.patBase = ctx.createPattern(this.water.base, 'repeat'); this.patCrest = ctx.createPattern(this.water.crest, 'repeat'); this.patGlint = ctx.createPattern(this.water.glint, 'repeat'); }
    const W = this.W, H = this.H;
    const tile = (pat, ox, oy, a) => {
      ctx.save(); ctx.globalAlpha = a;
      const x = -(((camX + ox) % S) + S) % S, y = -(((camY + oy) % S) + S) % S;
      ctx.translate(Math.round(x), Math.round(y)); ctx.fillStyle = pat; ctx.fillRect(0, 0, W + S, H + S); ctx.restore();
    };
    tile(this.patBase, now * 2, now * 1, 1);
    tile(this.patCrest, -now * 6, now * 2.5, 0.9);
    tile(this.patCrest, now * 4 + 40, -now * 1.5 + 64, 0.5);
    tile(this.patGlint, -now * 3 + 20, now * 4, 0.5 + 0.3 * Math.sin(now * 2) * (1 - dark));
  }
  drawGlints(ctx, camX, camY, now, dark, dt) {
    if (dark < 0.8 && this.glints.length < 14 && rnd() < 0.5) {
      const x = camX + rnd() * this.W, y = camY + rnd() * this.H;
      if (tileAt(this.world, x, y) === T.DEEP) this.glints.push({ x, y, t: 0 });
    }
    for (let k = 0; k < 3; k++) {
      const x = camX + rnd() * this.W, y = camY + rnd() * this.H;
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
      if (this.world.tiles[ty * MAP_W + tx] === T.WATER && this.world.waterDist[ty * MAP_W + tx] === 1 && this.glints.length < 40) this.glints.push({ x, y, t: 0, surf: 1 });
    }
    ctx.fillStyle = '#e8fbff';
    for (let i = this.glints.length - 1; i >= 0; i--) {
      const g = this.glints[i]; g.t += dt;
      if (g.t > 0.9) { this.glints.splice(i, 1); continue; }
      const x = Math.round(g.x - camX), y = Math.round(g.y - camY), k = Math.sin(g.t / 0.9 * Math.PI);
      ctx.globalAlpha = k * (1 - dark * 0.8) * (g.surf ? 0.7 : 1);
      if (g.surf) { ctx.fillRect(x - 1, y, 3, 1); if (k > 0.6) ctx.fillRect(x - 2, y + 1, 5, 1); continue; }
      ctx.fillRect(x, y, 1, 1);
      if (k > 0.5) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    }
    ctx.globalAlpha = 1;
  }
  drawProp(ctx, p, camX, camY, now, me, G) {
    let s = p.spr;
    if (G.depleted && (G.depleted.get(p.id) || 0) > now) {
      if (TREES.has(p.type)) { const st = this.structSpr.stump[0]; ctx.drawImage(st.cv, Math.round(p.x - st.ax - camX), Math.round(p.y - st.ay - camY)); }
      else if (p.type === 'rock') { const pe = this.env.pebble[p.v % 4]; ctx.drawImage(pe.cv, Math.round(p.x - pe.ax - camX), Math.round(p.y - pe.ay - camY)); }
      return;
    }
    if (p.type === 'chest' && G.chests && G.chests[p.id] > Date.now()) s = this.env.chestOpen[p.chest || 0];
    if (p.type === 'grotte' && p.door != null && !(G.found && G.found.has(p.door))) s = this.env.grotte[(p.v % 3) + 3];
    if (p.type === 'sceau' && G.sealUntil > now) s = this.env.sceau[1];
    const indoor = p.ty >= OVER_H;
    let x = Math.round(p.x - s.ax - camX), y = Math.round(p.y - s.ay - camY);
    if (p.type === 'ship') y += Math.round(Math.sin(now * 1.1) * 1.2);
    if (p.type === 'boat' && !indoor) y += Math.round(Math.sin(now * 1.6 + 1) * 1);
    let alpha = 1;
    if (me && TREES.has(p.type) && me.y < p.y - 2 && me.y > p.y - s.h + 6 && Math.abs(me.x - p.x) < s.w * 0.45) alpha = 0.5;
    if (me && (p.type === 'tavern' || p.type === 'house' || p.type === 'forge') && me.y < p.y - 40 && me.y > p.y - s.h && Math.abs(me.x - p.x) < s.w / 2) alpha = 0.6;
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (TREES.has(p.type) && p.type !== 'deadtree') {
      // léger balancement des cimes
      const sway = Math.sin(now * 1.3 + p.x * 0.05) * 0.8;
      const cut = Math.round(s.h * 0.55);
      ctx.drawImage(s.cv, 0, cut, s.w, s.h - cut, x, y + cut, s.w, s.h - cut);
      ctx.drawImage(s.cv, 0, 0, s.w, cut, x + Math.round(sway), y, s.w, cut);
    } else ctx.drawImage(s.cv, x, y);
    if (alpha < 1) ctx.globalAlpha = 1;
    if (p.type === 'home' && G.homes) { // la pancarte au-dessus de la porte : le nom du propriétaire
      const h = G.homes.get(p.plot);
      const t = textCanvas(h ? h.name : 'À VENDRE', h ? '#2b1606' : '#7a1410', null);
      const w = t.width + 7, sx = Math.round(p.x - camX - w / 2), sy = Math.round(p.y - camY - 37 + Math.sin(now * 1.4 + p.x) * 0.6);
      ctx.fillStyle = '#120a06'; ctx.fillRect(sx - 1, sy - 1, w + 2, 11);
      ctx.fillStyle = h ? '#b88a52' : '#e8dcc0'; ctx.fillRect(sx, sy, w, 9);
      ctx.fillStyle = h ? '#d8ac6e' : '#fff8e8'; ctx.fillRect(sx, sy, w, 1);
      ctx.fillStyle = h ? '#7a5228' : '#b8a888'; ctx.fillRect(sx, sy + 8, w, 1);
      ctx.fillStyle = '#3a3a46'; ctx.fillRect(sx + 2, sy - 4, 1, 3); ctx.fillRect(sx + w - 3, sy - 4, 1, 3);
      ctx.drawImage(t, sx + 4, sy + 1);
      if (h && h.lock) { ctx.fillStyle = '#f2c14a'; ctx.fillRect(sx + w + 1, sy + 3, 4, 4); ctx.fillStyle = '#8a8a9c'; ctx.fillRect(sx + w + 2, sy + 1, 2, 2); }
    }
    if ((p.type === 'ship' || p.type === 'wreck' || p.type === 'boat') && !indoor) {
      // écume autour de la coque
      const wl = p.y - camY - (p.type === 'boat' ? 4 : 4);
      ctx.fillStyle = 'rgba(230,250,250,0.55)';
      const w = s.w * (p.type === 'boat' ? 0.45 : 0.42);
      for (let i = -w; i < w; i += 3) { const yy = wl + Math.round(Math.sin(now * 3 + i * 0.3) * 1); ctx.fillRect(Math.round(p.x - camX + i), yy, 2, 1); }
    }
    const flame = (s.flame && !s.blue) ? this.flames : s.blue ? this.bigFlames : null;
    if (flame) {
      const fr = flame[Math.floor(now * 10 + p.x) % 4];
      ctx.drawImage(fr, Math.round(p.x - s.ax + s.flame[0] - fr.width / 2 - camX), Math.round(p.y - s.ay + s.flame[1] - fr.height + 3 - camY));
      if (rnd() < 0.06) this.burst(p.x - s.ax + s.flame[0], p.y - 1, 1, { z: s.ay - s.flame[1] + 6, col: s.blue ? ['#bfe8ff', '#ffffff'] : ['#ffd24a', '#ff8a2a'], up: 20, g: -10, speed: 6, life: 0.7 });
    }
  }
  drawNpc(ctx, n, camX, camY, now, G) {
    if (n.board) return;
    if (n.parrot) {
      const fr = this.parrot[Math.floor(now * 2 + n.x) % 8 < 1 ? 2 : (Math.floor(now * 1.5) % 5 === 0 ? 1 : 0)];
      ctx.drawImage(fr, Math.round(n.x - 7 - camX), Math.round(n.y - 30 - camY));
      return;
    }
    const sh = humanSheet(n.look);
    const f = 0;
    const bob = Math.floor(now * 1.6 + n.x) % 2;
    ctx.drawImage(sh.cv, f * FW, n.dir * FH, FW, FH - (bob ? 0 : 0), Math.round(n.x - sh.ax - camX), Math.round(n.y - sh.ay - camY) + (bob ? 0 : 0), FW, FH);
  }
  sheetOf(e) {
    if (isSea(e)) return null;
    if (e.k === 'p' || e.k === 'f') { if (!e.sheet || e.sheetKey !== e.lookKey) { e.sheet = humanSheet(e.look); e.sheetKey = e.lookKey; } return e.sheet; }
    if (!e.sheet) e.sheet = mobSheet(e.type);
    return e.sheet;
  }
  drawBoat(ctx, e, kind, sh, camX, camY, now) {
    const set = this.boats[kind] || this.boats.barque;
    const dir = e.dir & 3;
    const fr = set[dir][e.moving ? Math.floor(now * 3) % 2 : 0];
    const bob = Math.round(Math.sin(now * 2.2 + (e.id || 0)) * 0.8);
    const x0 = Math.round(e.x - fr.ax - camX), y0 = Math.round(e.y - fr.ay - camY) + bob;
    ctx.fillStyle = 'rgba(8,24,44,0.28)';
    ctx.beginPath(); ctx.ellipse(Math.round(e.x - camX), Math.round(e.y - camY) + 1, fr.cv.width * 0.42, fr.cv.height * 0.32, 0, 0, TAU); ctx.fill();
    ctx.drawImage(fr.cv, x0, y0);
    if (fr.sail) ctx.drawImage(fr.sail.cv, x0 + fr.sail.x, y0 + fr.sail.y);
    if (!(e.dyingT && now - e.dyingT > 0.4)) ctx.drawImage(sh.cv, 0, dir * sh.fh, sh.fw, 21, x0 + fr.seat[0] - sh.ax, y0 + fr.seat[1] - 19, sh.fw, 21);
    // remous et sillage
    const len = (dir === 1 || dir === 2 ? fr.cv.width : fr.cv.height) * 0.42;
    const bx = [0, 1, -1, 0][dir], by = [-1, 0, 0, 1][dir];
    ctx.strokeStyle = 'rgba(230,250,250,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(Math.round(e.x - camX), Math.round(e.y - camY), fr.cv.width * 0.46 + Math.sin(now * 3) * 0.8, fr.cv.height * 0.3, 0, 0, TAU); ctx.stroke();
    if (e.moving && rnd() < 0.7) this.burst(e.x + bx * len, e.y - 2 + by * len, 1, { z: 1, col: ['#ffffff', '#d8f6ff'], up: 8, speed: 10, life: 0.6, g: 30 });
  }
  // ------------------------------------------------------------ 0.6 : navires alliés, Kraken, tentacules, animaux
  redSail(cv) {
    let c = this.redSails.get(cv);
    if (!c) { c = makeCanvas(cv.width, cv.height); const x = c.getContext('2d'); x.drawImage(cv, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(190,28,36,0.62)'; x.fillRect(0, 0, c.width, c.height); this.redSails.set(cv, c); }
    return c;
  }
  drawAlly(ctx, e, camX, camY, now, G) {
    const dir = e.dir & 3, fr = this.boats.sloop[dir][0];
    const sink = e.sinkT ? Math.min(1, (now - e.sinkT) / 2.0) : 0;
    const X = Math.round(e.x - camX), Y = Math.round(e.y - camY), bob = Math.round(Math.sin(now * 2.2 + e.id) * 0.8);
    const red = (e.name || '').includes('Mouette');
    if (!e.capSheet) e.capSheet = humanSheet((red ? NPCS.morgane : NPCS.elouan).look);
    ctx.save();
    if (sink > 0) { // le navire se cabre et s'enfonce ; rien ne dépasse sous la ligne d'eau
      ctx.beginPath(); ctx.rect(X - 70, Y - 100, 140, 104); ctx.clip();
      ctx.translate(X, Y); ctx.rotate(sink * 0.55 * (dir === 1 ? -1 : 1)); ctx.translate(-X, -Y + sink * sink * 40);
    } else { ctx.fillStyle = 'rgba(8,24,44,0.28)'; ctx.beginPath(); ctx.ellipse(X, Y + 1, fr.cv.width * 0.42, fr.cv.height * 0.32, 0, 0, TAU); ctx.fill(); }
    const x0 = X - fr.ax, y0 = Y - fr.ay + bob;
    ctx.drawImage(fr.cv, x0, y0);
    if (fr.sail) ctx.drawImage(red ? this.redSail(fr.sail.cv) : fr.sail.cv, x0 + fr.sail.x, y0 + fr.sail.y);
    const sh = e.capSheet;
    if (sink < 0.5) ctx.drawImage(sh.cv, 0, dir * sh.fh, sh.fw, 21, x0 + fr.seat[0] - sh.ax, y0 + fr.seat[1] - 19, sh.fw, 21);
    ctx.restore();
    if (sink > 0) {
      const grow = Math.min(1, sink * 3.5);
      this.tentacle(ctx, X - 24, Y + 3, { t: now, seed: 1.3, len: 50 * grow, curl: 1.3, lean: 0.9, leanA: 0, thick: 6 });
      this.tentacle(ctx, X + 22, Y + 5, { t: now + 1, seed: 4.1, len: 46 * grow, curl: 1.2, lean: 0.9, leanA: Math.PI, thick: 6 });
      this.tentacle(ctx, X + 2, Y + 9, { t: now + 2, seed: 6.7, len: 40 * grow, curl: 1.5, lean: 0.4, leanA: -1.2, thick: 5 });
      if (rnd() < 0.9) this.burst(e.x + (rnd() - 0.5) * 56, e.y + (rnd() - 0.5) * 14, 2, { z: 2, col: ['#ffffff', '#d8f6ff', '#9fd8ff'], up: 46, speed: 24, life: 0.7, g: 80 });
    } else {
      ctx.strokeStyle = 'rgba(230,250,250,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(X, Y, fr.cv.width * 0.46 + Math.sin(now * 3) * 0.8, fr.cv.height * 0.3, 0, 0, TAU); ctx.stroke();
      if (e.moving && rnd() < 0.7) { const len = (dir === 1 || dir === 2 ? fr.cv.width : fr.cv.height) * 0.42; this.burst(e.x + [0, 1, -1, 0][dir] * len, e.y - 2 + [-1, 0, 0, 1][dir] * len, 1, { z: 1, col: ['#ffffff', '#d8f6ff'], up: 8, speed: 10, life: 0.6, g: 30 }); }
    }
  }
  drawKraken(ctx, e, camX, camY, now, G) {
    const rage = ((e.flags >> 5) & 3) >= 2, s = this.env.kraken[rage ? 1 : 0];
    let k = 1; // part du corps hors de l'eau
    if (e.downT && (!e.upT || e.downT > e.upT)) k = Math.max(0, 1 - (now - e.downT) / (e.dyingT ? 3.4 : 0.7));
    else if (e.upT) k = Math.min(1, (now - e.upT) / (e.firstRise ? 1.5 : 0.6));
    else if (e.flags & 8) k = 0;
    const X = Math.round(e.x - camX), Y = Math.round(e.y - camY);
    const ek = 1 - (1 - k) * (1 - k), hgt = Math.round(s.ay * ek);
    const shakeX = e.dyingT ? Math.round(Math.sin(now * 46) * 2 * k) : (now - (e.phaseT || -9) < 1.4 ? Math.round(Math.sin(now * 50) * 1.5) : 0);
    const bob = Math.round(Math.sin(now * 1.3) * 1.5);
    // l'eau sombre sous la bête
    ctx.fillStyle = 'rgba(6,10,30,0.42)'; ctx.beginPath(); ctx.ellipse(X, Y + 4, 54, 20, 0, 0, TAU); ctx.fill();
    if (hgt > 2) {
      ctx.drawImage(s.cv, 0, 0, s.w, hgt, X - s.ax + shakeX, Y - hgt + bob, s.w, hgt);
      if (now - (e.hitT || -9) < 0.09 || (e.dyingT && Math.floor(now * 10) % 3 === 0)) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(s.cv, 0, 0, s.w, hgt, X - s.ax + shakeX, Y - hgt + bob, s.w, hgt); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      // paupières : il cligne
      if (ek > 0.9 && Math.floor(now * 0.9 + 0.3) % 5 === 0 && (now * 0.9 + 0.3) % 1 < 0.14) { ctx.fillStyle = rage ? '#5a0e18' : '#341030'; ctx.fillRect(X - 30 + shakeX, Y - 22 + bob, 20, 14); ctx.fillRect(X + 10 + shakeX, Y - 22 + bob, 20, 14); }
    }
    // écume au ras de l'eau, bouillons quand il bouge
    ctx.strokeStyle = 'rgba(235,250,255,0.7)'; ctx.lineWidth = 1;
    for (let q = 0; q < 2; q++) { ctx.beginPath(); ctx.ellipse(X, Y + 1 + q * 2, (40 + q * 9) * Math.max(0.3, ek) + Math.sin(now * 3 + q) * 1.5, (9 + q * 3) * Math.max(0.3, ek), 0, 0, TAU); ctx.stroke(); }
    if ((k > 0 && k < 1) || rnd() < 0.2) this.burst(e.x + (rnd() - 0.5) * 80, e.y + (rnd() - 0.5) * 16, k < 1 ? 4 : 1, { z: 2, col: ['#ffffff', '#d8f6ff', '#9fd8ff'], up: k < 1 ? 70 : 24, speed: 26, life: 0.6, g: 160 });
  }
  drawTentacleMob(ctx, e, camX, camY, now, G) {
    const X = Math.round(e.x - camX), Y = Math.round(e.y - camY);
    let rise = e.riseT ? Math.min(1, (now - e.riseT) / 0.9) : 1;
    if (e.dyingT) rise = Math.max(0, 1 - (now - e.dyingT) / 0.8);
    let kr = null; for (const q of G.ents.values()) if (q.type === 'kraken') kr = q;
    const rage = kr && ((kr.flags >> 5) & 3) >= 2;
    if (kr && (kr.flags & 8) && !e.dyingT) rise *= 0.35; // la bête a plongé : les tentacules se tapissent
    let lean = 0, leanA = 0, flat = 0, curl = 0.35;
    if (e.slam) {
      const t = now - e.slam.t0, d = e.slam.dur; leanA = e.slam.a;
      if (t < d) lean = -0.55 * (t / d);
      else if (t < d + 0.1) flat = (t - d) / 0.1;
      else if (t < d + 0.5) flat = 1;
      else if (t < d + 0.95) flat = 1 - (t - d - 0.5) / 0.45;
      else e.slam = null;
    }
    if (e.grabId != null) { const q = e.grabId === G.myId ? G.player : G.ents.get(e.grabId); if (q) { leanA = Math.atan2(q.y - e.y, q.x - e.x); flat = 0.82; curl = 1.5; } }
    ctx.strokeStyle = 'rgba(235,250,255,0.65)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(X, Y + 1, 9 + Math.sin(now * 4 + e.id) * 1, 3.5, 0, 0, TAU); ctx.stroke();
    if (rise <= 0.02) return;
    this.tentacle(ctx, X, Y, { t: now, seed: e.id * 1.7, len: 50 * rise, lean, leanA, flat, rage, curl, thick: 6.5 });
    if (now - (e.hitT || -9) < 0.09) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; this.tentacle(ctx, X, Y, { t: now, seed: e.id * 1.7, len: 50 * rise, lean, leanA, flat, rage: 1, curl, thick: 6.5 }); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  }
  drawPet(ctx, q, camX, camY, now) {
    const set = this.pets[q.kind];
    if (!set) return;
    const fly = q.kind === 'perroquet';
    const fr = set[fly ? Math.floor(now * 9) % 2 : q.moving ? Math.floor(now * 9) % 2 : 2 + (Math.floor(now * 0.7 + q.seed) % 7 === 0 ? 1 : 0)];
    const x = Math.round(q.x - camX), y = Math.round(q.y - camY) - (fly ? 20 + Math.round(Math.sin(now * 3 + q.seed) * 2) : q.kind === 'kraken' && q.moving ? Math.round(Math.abs(Math.sin(now * 9)) * 3) : 0);
    ctx.save();
    if (q.dir === 1) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(fr, -(fr.width >> 1), y - fr.height + 1); }
    else ctx.drawImage(fr, x - (fr.width >> 1), y - fr.height + 1);
    ctx.restore();
  }
  // encre, tourbillon, abysses : ce qui se passe à la surface de l'eau
  drawSeaFx(ctx, G, camX, camY, now) {
    const tw = this.world.twin;
    if (tw && !this.room) for (const pl of tw.plates) { // dalles des Jumeaux : elles s'éveillent sous les pas
      let on = G.sealUntil > now;
      if (!on && G.player && Math.hypot(G.player.x - pl.x, G.player.y - pl.y) < 11) on = true;
      if (!on) for (const e of G.ents.values()) if (e.k === 'p' && Math.hypot(e.x - pl.x, e.y - pl.y) < 11) { on = true; break; }
      if (!on) continue;
      const x = Math.round(pl.x - camX), y = Math.round(pl.y - camY);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + 0.25 * Math.sin(now * 5);
      ctx.drawImage(this.glows.cold, x - 16, y - 14, 32, 28);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (rnd() < 0.25) this.burst(pl.x + (rnd() - 0.5) * 12, pl.y + 2, 1, { z: 2, col: ['#bfe8ff', '#ffffff'], up: 30, speed: 4, life: 0.9, g: -14 });
    }
    for (let i = this.inks.length - 1; i >= 0; i--) {
      const t = this.inks[i], k = (now - t.t0) / t.dur;
      if (k >= 1) { this.inks.splice(i, 1); continue; }
      const a = Math.min(1, k * 8) * Math.min(1, (1 - k) * 3), r = t.r * (0.5 + 0.5 * Math.min(1, k * 5));
      ctx.fillStyle = `rgba(6,4,14,${0.62 * a})`;
      for (let q = 0; q < 5; q++) { const an = q * 1.26 + t.x, rr = r * (q ? 0.55 : 1); ctx.beginPath(); ctx.ellipse(t.x - camX + (q ? Math.cos(an) * r * 0.5 : 0), t.y - camY + (q ? Math.sin(an) * r * 0.35 : 0), rr + Math.sin(now * 2 + q) * 2, rr * 0.7, 0, 0, TAU); ctx.fill(); }
    }
    const P = G.pull;
    if (P && now < P.until) { // le tourbillon : des spirales d'écume qui tournent vers la gueule
      const a = Math.min(1, (now - P.t0) * 2) * Math.min(1, (P.until - now) * 2);
      ctx.lineWidth = 1;
      for (let q = 0; q < 7; q++) {
        const rr = P.r * (1 - ((now * 0.22 + q / 7) % 1)), a0 = now * 2.4 + q * 0.9 + rr * 0.03;
        ctx.strokeStyle = `rgba(225,248,255,${0.55 * a * (rr / P.r + 0.2)})`;
        ctx.beginPath(); ctx.ellipse(P.x - camX, P.y - camY, rr, rr * 0.8, 0, a0, a0 + 2.2); ctx.stroke();
      }
      ctx.fillStyle = `rgba(4,8,26,${0.5 * a})`; ctx.beginPath(); ctx.ellipse(P.x - camX, P.y - camY, 62, 48, 0, 0, TAU); ctx.fill();
    }
    const A = this.abyss;
    if (A) { // quelque chose monte du fond
      const k = (now - A.t0) / A.dur;
      if (k >= 1) this.abyss = null;
      else {
        const a = Math.min(1, k * 3) * Math.min(1, (1 - k) * 3), r = (A.big ? 80 : 54) * (0.4 + 0.6 * Math.min(1, k * 1.5));
        ctx.fillStyle = `rgba(4,6,22,${0.6 * a})`; ctx.beginPath(); ctx.ellipse(A.x - camX, A.y - camY, r, r * 0.6, 0, 0, TAU); ctx.fill();
        if (rnd() < 0.7) this.burst(A.x + (rnd() - 0.5) * r * 1.6, A.y + (rnd() - 0.5) * r * 0.9, 1, { z: 1, col: ['#ffffff', '#d8f6ff'], up: 20, speed: 6, life: 0.6, g: -10 });
      }
    }
  }
  drawEntity(ctx, e, camX, camY, now, G) {
    if (e.k === 'a') return this.drawAlly(ctx, e, camX, camY, now, G);
    if (e.type === 'kraken') return this.drawKraken(ctx, e, camX, camY, now, G);
    if (e.type === 'tentacule') return this.drawTentacleMob(ctx, e, camX, camY, now, G);
    const sh = this.sheetOf(e);
    if (!sh) return;
    const boat = e === G.player ? (G.player.boat && ITEMS[G.player.boat] && ITEMS[G.player.boat].boat ? ITEMS[G.player.boat].boat.kind : null) : ((e.flags & 16) && e.bt ? e.bt : null);
    if (boat && e.k === 'p') return this.drawBoat(ctx, e, boat, sh, camX, camY, now);
    let dir = e.dir & 3, frame = 0;
    const atk = now - (e.atkT || -9);
    if (atk < 0.28) dir = dirFromAngle(e.atkA);
    else if (e.moving) frame = Math.floor((e.walk || 0) * (e.k === 'm' ? 6 : 9)) % 4;
    if (e.type === 'crab' && e.moving) frame = Math.floor(now * 12) % 4;
    let sit = 0;
    if (e.danceUntil && now < e.danceUntil) {
      dir = [0, 2, 3, 1][Math.floor(now * 6) % 4]; frame = Math.floor(now * 10) % 4;
      if (rnd() < 0.06) this.burst(e.x, e.y, 1, { z: 26, col: ['#ffd23a', '#ff93b8', '#9fd8ff'], up: 26, speed: 12, life: 0.9, g: -12, size: 2 });
    } else if (e.sitUntil && now < e.sitUntil && !e.moving) { sit = 4; frame = 0; }
    let x = Math.round(e.x - sh.ax - camX), y = Math.round(e.y - sh.ay - camY) + sit;
    const dying = e.dyingT ? now - e.dyingT : -1;
    if (dying > 0.75) return;
    if (e.k === 'm') {
      const ph = (e.flags >> 5) & 3;
      if (ph && dying < 0) { // un boss enragé : le sol rougeoie sous lui
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.2 * Math.sin(now * 7);
        ctx.drawImage(ph >= 2 ? this.glows.red : this.glows.warm, Math.round(e.x - camX) - 22, Math.round(e.y - camY) - 12, 44, 22);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (rnd() < 0.12 * ph) this.burst(e.x + (rnd() - 0.5) * 16, e.y - 2, 1, { z: 4, col: ph >= 2 ? ['#ff5a2a', '#ffb03a'] : ['#ffb03a', '#ffe58a'], up: 36, speed: 6, life: 0.7, g: -14 });
      }
      if (e.leap) { const lk = (now - e.leap.t0) / e.leap.dur; if (lk < 1) y -= Math.round(Math.sin(lk * Math.PI) * 30); else { e.leap = null; this.shake(3, 0.2); this.smoke(e.x, e.y, 8, 'rgba(200,180,150,0.55)', { size: 3 }); } }
      if (e.dashT && now > e.dashT && now < e.dashT + 0.7 && e.moving && rnd() < 0.8) this.smoke(e.x, e.y, 1, 'rgba(220,200,160,0.5)', { size: 2, life: 0.4 });
    }
    const water = this.inWater(e.x, e.y);
    const cut = Math.max(sit, water ? (sh.fw > FW ? 8 : 5) : 0);
    ctx.save();
    if (dying >= 0) { ctx.globalAlpha = Math.max(0, 1 - dying / 0.75); y += Math.round(dying * 10); }
    if (e.ghost) ctx.globalAlpha *= 0.5;
    if (e.flags & 4 && e.k === 'p' && Math.floor(now * 16) % 2 === 0 && !(e.rollT && now - e.rollT < 0.3)) ctx.globalAlpha *= 0.55;
    const roll = e.rollT ? now - e.rollT : 9;
    const meta = sh.meta[dir][frame];
    const wpBehind = dir === 3;
    if (roll < 0.24) {
      const a = (roll / 0.24) * TAU * (Math.cos(e.rollA || 0) < 0 ? -1 : 1);
      ctx.translate(x + sh.fw / 2, y + sh.fh * 0.62); ctx.rotate(a); ctx.translate(-(x + sh.fw / 2), -(y + sh.fh * 0.62));
      ctx.drawImage(sh.cv, 0, dir * sh.fh, sh.fw, sh.fh, x, y + 3, sh.fw, sh.fh);
      ctx.restore();
      return;
    }
    if (wpBehind) this.drawWeapon(ctx, e, sh, meta, x, y, now, dir);
    // pas de la marche : petit rebond déjà dans la feuille
    const hw = now - (e.hitT || -9) < 0.09;
    const src = hw ? whiteSheet(sh) : sh.cv;
    ctx.drawImage(src, frame * sh.fw, dir * sh.fh, sh.fw, sh.fh - cut, x, y, sh.fw, sh.fh - cut);
    if (e.windT && now - e.windT < e.windDur) {
      const k = (now - e.windT) / e.windDur;
      ctx.globalAlpha = 0.25 + 0.35 * k;
      ctx.drawImage(whiteSheet(sh), frame * sh.fw, dir * sh.fh, sh.fw, sh.fh - cut, x, y, sh.fw, sh.fh - cut);
      ctx.globalAlpha = dying >= 0 ? Math.max(0, 1 - dying / 0.75) : 1;
    }
    if (!wpBehind) this.drawWeapon(ctx, e, sh, meta, x, y, now, dir);
    ctx.restore();
    if (e.k === 'm' && (e.flags & 16)) { // carapace : presque rien ne passe
      const cx = Math.round(e.x - camX), cy = Math.round(e.y - camY) - Math.round(sh.fh * 0.3);
      ctx.strokeStyle = `rgba(255,225,120,${0.7 + 0.3 * Math.sin(now * 12)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, sh.fw * 0.48, sh.fh * 0.42, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,225,120,0.14)'; ctx.beginPath(); ctx.ellipse(cx, cy, sh.fw * 0.48, sh.fh * 0.42, 0, 0, TAU); ctx.fill();
    }
    if (water) {
      ctx.strokeStyle = 'rgba(220,250,255,0.6)';
      ctx.lineWidth = 1;
      const r = 6 + Math.sin(now * 5 + e.x) * 1 + (e.type === 'boss' ? 6 : 0);
      ctx.beginPath(); ctx.ellipse(e.x - camX, e.y - camY - cut + 1, r, r * 0.35, 0, 0, TAU); ctx.stroke();
      if (e.moving && rnd() < 0.15) this.burst(e.x, e.y, 1, { z: 2, col: ['#bfefff', '#ffffff'], up: 30, speed: 14, life: 0.35 });
    } else if (e.moving && rnd() < 0.06) {
      const t = tileAt(this.world, e.x, e.y);
      if (t === T.SAND || t === T.DIRT || t === T.MUD) this.burst(e.x, e.y, 1, { z: 1, col: t === T.SAND ? ['#f2dca6', '#d8b77b'] : ['#9c744a', '#b48b5c'], up: 12, speed: 10, life: 0.4, g: 60 });
    }
  }
  drawWeapon(ctx, e, sh, meta, x, y, now, dir) {
    let spr = null, kind = null;
    if (e.k === 'p') {
      const w = e.weapon && ITEMS[e.weapon];
      if (w) spr = w.form ? heldWeapon(w.form, e.weapon) : weaponSprite('saber', w.wtint || 'steel');
      kind = 'p';
    } else if (e.type && MOBS[e.type] && MOBS[e.type].weapon) {
      const [k, t] = MOBS[e.type].weapon; spr = weaponSprite(k, t);
    } else if (e.type === 'skelgun') spr = weaponSprite('musket', 'steel');
    const atk = now - (e.atkT || -9);
    const shooting = (e.atkKind === 1 && atk < 0.4) || (e.type === 'skelgun' && e.windT && now - e.windT < e.windDur + 0.2);
    if (shooting) {
      if (e.k === 'p') { const g = e.gun && ITEMS[e.gun]; spr = g && g.form ? heldWeapon(g.form, e.gun) : weaponSprite('pistol', 'steel'); }
      else spr = weaponSprite('musket', 'steel');
    }
    if (!spr) return;
    const hx = x + meta.hand[0], hy = y + meta.hand[1];
    let ang;
    if (shooting) ang = e.type === 'skelgun' && e.windT ? (e.windA ?? e.atkA) : e.atkA;
    else if (atk < 0.22 && e.atkKind !== 1) {
      const k = atk / 0.18, ease = 1 - Math.pow(1 - Math.min(1, k), 3);
      const side = Math.cos(e.atkA) >= 0 ? 1 : -1;
      if (spr.thrust) { // estocade : la pointe file droit devant
        ang = e.atkA; const d = Math.sin(Math.min(1, k) * Math.PI) * 8;
        ctx.save(); ctx.translate(Math.cos(ang) * d, Math.sin(ang) * d);
        this.blitWeapon(ctx, spr, hx, hy, ang); ctx.restore(); return;
      }
      ang = e.atkA - side * 1.35 + side * 2.7 * ease;
      if (e.atkKind === 2) ang = e.atkA - side * 1.6 + side * 3.2 * ease;
    } else if (e.windT && now - e.windT < e.windDur) ang = (e.windA ?? 0) - 2.2;
    else ang = [1.95, Math.PI - 0.85, 0.85, -2.0][dir];
    this.blitWeapon(ctx, spr, hx, hy, ang);
  }
  blitWeapon(ctx, spr, hx, hy, ang) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    if (Math.cos(ang) < 0) ctx.scale(1, -1);
    ctx.drawImage(spr.cv, -spr.gx, -spr.gy);
    ctx.restore();
    if (spr.glow) { // lueur des armes enchantées
      const g = this.glows[spr.glow] || this.glows.cold, L = (spr.w - spr.gx) * 0.65;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + 0.15 * Math.sin(performance.now() / 260);
      ctx.drawImage(g, hx + Math.cos(ang) * L - 9, hy + Math.sin(ang) * L - 9, 18, 18);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
  }
  drawDrop(ctx, e, camX, camY, now, G) {
    const it = e.item === 'or' ? null : ITEMS[e.item];
    const bob = Math.sin(now * 3 + e.id) * 1.5;
    const age = now - (e.born || now);
    const pop = age < 0.4 ? Math.sin(age / 0.4 * Math.PI) * 10 : 0;
    const x = Math.round(e.x - camX), y = Math.round(e.y - camY - 6 - bob - pop);
    const locked = e.own && e.own !== G.myId && e.ownUntil > now;
    ctx.fillStyle = 'rgba(20,12,34,0.3)';
    ctx.beginPath(); ctx.ellipse(x, Math.round(e.y - camY), 5, 2, 0, 0, TAU); ctx.fill();
    if (locked) ctx.globalAlpha = 0.45;
    if (!it) {
      ctx.drawImage(iconCanvas('coins'), x - 8, y - 10);
    } else {
      const rar = it.rarity || 0;
      if (rar > 0) {
        const g = rar === 3 ? this.glows.warm : rar === 2 ? this.glows.purple : this.glows.cold;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (locked ? 0.3 : 0.7) * (0.7 + 0.3 * Math.sin(now * 4));
        ctx.drawImage(g, x - 14, y - 16, 28, 28);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = locked ? 0.45 : 1;
      }
      ctx.drawImage(iconCanvas(it.icon, it.tint), x - 8, y - 10);
    }
    ctx.globalAlpha = 1;
    if (Math.floor(now * 2 + e.id) % 5 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y - 10, 1, 1); ctx.fillRect(x + 3, y - 9, 3, 1); ctx.fillRect(x + 4, y - 8, 1, 1); }
  }
  drawFx(ctx, camX, camY, now, dt) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i], t = now - f.t0;
      if (t > f.dur) { this.fx.splice(i, 1); continue; }
      const k = t / f.dur;
      const o = f.follow && f.follow();
      const x = (o ? o.x : f.x) - camX, y = (o ? o.y : f.y) - camY;
      if (f.kind === 'thrust') {
        const r = f.r || 30, d0 = 6 + r * 0.25 * k, d1 = 8 + r * Math.min(1, k * 1.8);
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + Math.cos(f.a) * d0, y - 9 + Math.sin(f.a) * d0); ctx.lineTo(x + Math.cos(f.a) * d1, y - 9 + Math.sin(f.a) * d1); ctx.stroke();
        ctx.strokeStyle = `rgba(150,210,255,${0.6 * (1 - k)})`; ctx.lineWidth = 1;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + Math.cos(f.a + s * 0.12) * d0, y - 9 + Math.sin(f.a + s * 0.12) * d0); ctx.lineTo(x + Math.cos(f.a + s * 0.05) * d1 * 0.8, y - 9 + Math.sin(f.a + s * 0.05) * d1 * 0.8); ctx.stroke(); }
        ctx.lineCap = 'butt';
      } else if (f.kind === 'slash') {
        const span = f.span || 1.25;
        const r = f.r || 19, a0 = f.a - span + 2 * span * Math.max(0, k - 0.15), a1 = f.a - span + 2 * span * Math.min(1, k * 1.6);
        if (a1 > a0) {
          ctx.lineCap = 'butt';
          ctx.strokeStyle = `rgba(255,255,255,${0.95 * (1 - k)})`; ctx.lineWidth = f.big ? 4 : 3;
          ctx.beginPath(); ctx.ellipse(x, y - 9, r, r * 0.8, 0, a0, a1); ctx.stroke();
          ctx.strokeStyle = `rgba(150,210,255,${0.7 * (1 - k)})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(x, y - 9, r - 4, (r - 4) * 0.8, 0, a0, a1); ctx.stroke();
        }
      } else if (f.kind === 'whirl') {
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; ctx.lineWidth = 3;
        const a = k * TAU * 1.3;
        ctx.beginPath(); ctx.ellipse(x, y - 8, 30, 22, 0, a, a + 4.2); ctx.stroke();
        ctx.strokeStyle = `rgba(160,220,255,${0.6 * (1 - k)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, y - 8, 24, 17, 0, a + 1, a + 5); ctx.stroke();
      } else if (f.kind === 'ring') {
        ctx.strokeStyle = f.col.replace('A', (1 - k).toFixed(2)); ctx.lineWidth = f.w || 2;
        ctx.beginPath(); ctx.ellipse(x, y - (f.dy || 0), f.r * k + 2, (f.r * k + 2) * 0.65, 0, 0, TAU); ctx.stroke();
      } else if (f.kind === 'boom') {
        const r = f.r * (0.3 + 0.7 * Math.min(1, k * 2.2));
        const cols = ['rgba(255,250,220,A)', 'rgba(255,190,70,A)', 'rgba(230,90,30,A)', 'rgba(70,50,50,A)'];
        for (let j = 0; j < 4; j++) {
          ctx.fillStyle = cols[j].replace('A', Math.max(0, (1 - k) * (1 - j * 0.15)).toFixed(2));
          const rr = r * (1 - j * 0.22) * (j === 3 ? 1.1 : 1);
          if (j === 0 && k > 0.35) continue;
          ctx.beginPath(); ctx.ellipse(x, y - 6 - k * 10, rr, rr * 0.75, 0, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = `rgba(255,230,180,${0.6 * (1 - k)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, y, f.r * k * 1.3, f.r * k * 0.8, 0, 0, TAU); ctx.stroke();
      } else if (f.kind === 'pillar') {
        const h = 60 * Math.min(1, k * 3), w = 10 * (1 - k);
        const g = ctx.createLinearGradient(0, y - h, 0, y);
        g.addColorStop(0, 'rgba(255,230,120,0)'); g.addColorStop(1, `rgba(255,230,120,${0.7 * (1 - k)})`);
        ctx.fillStyle = g; ctx.fillRect(x - w, y - h, w * 2, h);
      } else if (f.kind === 'flash') {
        ctx.fillStyle = `rgba(255,240,200,${0.9 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(x, y, f.r * (1 - k * 0.5), 0, TAU); ctx.fill();
      } else if (f.kind === 'aim') {
        ctx.strokeStyle = `rgba(255,60,40,${0.15 + 0.45 * k})`; ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + Math.cos(f.a) * 120, y - 9 + Math.sin(f.a) * 120); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(255,230,120,${k})`;
        ctx.fillRect(Math.round(x + Math.cos(f.a) * 14), Math.round(y - 9 + Math.sin(f.a) * 14), 2, 2);
      } else if (f.kind === 'bubble') {
        const s = textCanvas(f.text, '#2b1d14', null, 1);
        const bw = s.width + 6, bh = s.height + 5, bx = Math.round(x - bw / 2), by = Math.round(y - (f.h || 34) - bh);
        ctx.globalAlpha = Math.min(1, (1 - k) * 4);
        ctx.fillStyle = '#f6ecd2'; ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = '#2b1d14';
        ctx.fillRect(bx, by - 1, bw, 1); ctx.fillRect(bx, by + bh, bw, 1); ctx.fillRect(bx - 1, by, 1, bh); ctx.fillRect(bx + bw, by, 1, bh);
        ctx.fillStyle = '#f6ecd2'; ctx.fillRect(Math.round(x) - 1, by + bh, 3, 2); ctx.fillStyle = '#2b1d14'; ctx.fillRect(Math.round(x), by + bh + 2, 1, 1);
        ctx.drawImage(s, bx + 3, by + 2);
        ctx.globalAlpha = 1;
      }
    }
  }
  drawProjectiles(ctx, camX, camY, now, dt) {
    for (const [id, p] of this.projs) {
      p.t += dt;
      const step = p.speed * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.left -= step;
      if (p.left <= 0) { this.projs.delete(id); continue; }
      const x = p.x - camX, y = p.y - camY;
      const dx = p.vx / p.speed, dy = p.vy / p.speed;
      if (p.kind === 'flame') {
        const s = 2 + Math.round(Math.sin(p.t * 40) + p.t * 6);
        ctx.fillStyle = p.t < 0.12 ? '#fff2b0' : '#ffb43a'; ctx.fillRect(Math.round(x) - (s >> 1), Math.round(y) - (s >> 1), s, s);
        ctx.fillStyle = '#ff6a1e'; ctx.fillRect(Math.round(x - dx * 3), Math.round(y - dy * 3), 2, 2);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(this.glows.warm, x - 8, y - 8, 16, 16); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        if (rnd() < 0.5) this.burst(p.x, p.y + 9, 1, { z: 9, col: ['#ffd24a', '#ff8a2a', '#ff5a1a'], up: 10, speed: 8, life: 0.35, g: -20 });
        continue;
      }
      if (p.kind === 'bone') {
        const a = p.t * 14, c = Math.cos(a) * 3, s = Math.sin(a) * 3;
        ctx.strokeStyle = '#1c1426'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - c, y - s); ctx.lineTo(x + c, y + s); ctx.stroke();
        ctx.strokeStyle = '#f4ecd8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - c, y - s); ctx.lineTo(x + c, y + s); ctx.stroke();
        continue;
      }
      if (p.kind === 'bolt' || p.kind === 'slug') {
        const L = p.kind === 'bolt' ? 7 : 11;
        ctx.strokeStyle = p.kind === 'bolt' ? '#dff6ff' : '#fffbe0'; ctx.lineWidth = p.kind === 'bolt' ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(Math.round(x), Math.round(y)); ctx.lineTo(Math.round(x - dx * L), Math.round(y - dy * L)); ctx.stroke();
        ctx.strokeStyle = p.kind === 'bolt' ? 'rgba(90,170,255,0.55)' : 'rgba(255,220,140,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(x - dx * L), Math.round(y - dy * L)); ctx.lineTo(Math.round(x - dx * (L + 10)), Math.round(y - dy * (L + 10))); ctx.stroke();
        if (p.kind === 'bolt') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(this.glows.cold, x - 9, y - 9, 18, 18); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
        continue;
      }
      if (p.kind === 'harpoon') {
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(Math.round(x), Math.round(y)); ctx.lineTo(Math.round(x - dx * 10), Math.round(y - dy * 10)); ctx.stroke();
        ctx.fillStyle = '#c8ccd8'; ctx.fillRect(Math.round(x + dx * 1) - 1, Math.round(y + dy * 1) - 1, 3, 3);
        ctx.strokeStyle = 'rgba(220,200,160,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(x - dx * 10), Math.round(y - dy * 10)); ctx.quadraticCurveTo(x - dx * 18 + dy * 4, y - dy * 18 - dx * 4, x - dx * 26, y - dy * 26); ctx.stroke();
        continue;
      }
      if (p.kind === 'grenade') {
        const h = Math.sin(Math.min(1, p.t / 0.6) * Math.PI) * 6;
        ctx.fillStyle = 'rgba(20,12,34,0.3)'; ctx.fillRect(Math.round(x) - 2, Math.round(y) + 8, 4, 1);
        ctx.fillStyle = '#1a1418'; ctx.fillRect(Math.round(x) - 2, Math.round(y - h) - 2, 5, 5);
        ctx.fillStyle = '#5a5262'; ctx.fillRect(Math.round(x) - 1, Math.round(y - h) - 2, 2, 1);
        ctx.fillStyle = Math.floor(p.t * 20) % 2 ? '#ffe14a' : '#ff8a2a'; ctx.fillRect(Math.round(x) + 2, Math.round(y - h) - 4, 1, 1);
        if (rnd() < 0.5) this.smoke(p.x, p.y + 9 - h, 1, 'rgba(200,200,200,0.35)', { z: 9, size: 2, life: 0.5 });
        continue;
      }
      if (p.kind === 'cball') {
        ctx.fillStyle = '#100c10'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
        ctx.fillStyle = '#5a5a6a'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 1, 1);
        if (rnd() < 0.6) this.smoke(p.x, p.y + 9, 1, 'rgba(200,200,200,0.4)', { z: 9, size: 2, life: 0.6 });
      } else if (p.kind === 'ball') {
        ctx.fillStyle = '#1a1418'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        ctx.fillStyle = '#ff6a4a'; ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 1);
        if (rnd() < 0.5) this.smoke(p.x, p.y + 9, 1, 'rgba(180,180,180,0.35)', { z: 9, size: 2, life: 0.5 });
      } else {
        const L = p.kind === 'pellet' ? 2 : 4;
        ctx.strokeStyle = p.kind === 'pellet' ? '#ffe0a0' : '#fff6c8'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(x), Math.round(y)); ctx.lineTo(Math.round(x - p.vx / p.speed * L), Math.round(y - p.vy / p.speed * L)); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,200,120,0.4)';
        ctx.beginPath(); ctx.moveTo(Math.round(x - p.vx / p.speed * L), Math.round(y - p.vy / p.speed * L)); ctx.lineTo(Math.round(x - p.vx / p.speed * (L + 6)), Math.round(y - p.vy / p.speed * (L + 6))); ctx.stroke();
      }
    }
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i], k = (now - b.t0) / b.dur;
      if (k >= 1) { this.bombs.splice(i, 1); continue; }
      const gx = b.x0 + (b.x1 - b.x0) * k, gy = b.y0 + (b.y1 - b.y0) * k + 10;
      const h = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 34;
      ctx.fillStyle = 'rgba(20,12,34,0.3)'; ctx.beginPath(); ctx.ellipse(gx - camX, gy - camY, 3, 1.5, 0, 0, TAU); ctx.fill();
      const x = Math.round(gx - camX), y = Math.round(gy - camY - h - 4);
      ctx.save(); ctx.translate(x, y); ctx.rotate(k * 14); ctx.drawImage(iconCanvas('sk_bomb'), -8, -9); ctx.restore();
      if (rnd() < 0.6) this.burst(gx, gy, 1, { z: h + 10, col: ['#ffe14a', '#ff8a2a', '#fff'], up: 10, speed: 12, life: 0.3, g: 40 });
    }
  }
  drawParticles(ctx, camX, camY, dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vz -= p.g * dt; p.z += p.vz * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; }
      const k = p.life / p.max;
      const x = Math.round(p.x - camX), y = Math.round(p.y - p.z - camY);
      if (p.kind === 'smoke') {
        ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(1, k * 1.5);
        const s = Math.round(p.size * (1.6 - k));
        ctx.fillRect(x - s, y - s, s * 2, s * 2);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = p.col;
        if (k < 0.3) ctx.globalAlpha = k / 0.3;
        ctx.fillRect(x, y, p.size, p.size);
        ctx.globalAlpha = 1;
      }
    }
    if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900);
  }
  drawTexts(ctx, camX, camY, dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) { this.texts.splice(i, 1); continue; }
      const k = 1 - t.life / t.max;
      const c = textCanvas(t.s, t.col, '#1c1426', t.big ? 2 : 1);
      const rise = (1 - Math.pow(1 - k, 2)) * 16 + (t.big ? 4 : 0);
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      const pop = k < 0.12 ? 1 + (0.12 - k) * 3 : 1;
      ctx.drawImage(c, Math.round(t.x - camX - c.width * pop / 2), Math.round(t.y - camY - 28 - rise), Math.round(c.width * pop), Math.round(c.height * pop));
      ctx.globalAlpha = 1;
    }
  }
  updateCritters(G, camX, camY, now, dt, dark) {
    const W = this.W, H = this.H;
    if (this.critters.length < 14 && rnd() < 0.08) {
      const x = camX + rnd() * W, y = camY + rnd() * H;
      const z = zoneAt(this.world, x, y), t = tileAt(this.world, x, y);
      let kind = null;
      if (dark < 0.4) {
        if ((t === T.GRASS || t === T.JUNGLE) && z !== Z.SWAMP && rnd() < 0.6) kind = 'butterfly';
        else if (t === T.DEEP || t === T.WATER || z === Z.BEACH) kind = rnd() < 0.5 ? 'gull' : null;
      } else if (dark > 0.5) {
        if (z === Z.SWAMP || z === Z.WRECK) kind = 'wisp';
        else if (t === T.GRASS || t === T.JUNGLE || t === T.MARSH) kind = 'firefly';
      }
      if (z === Z.SWAMP && rnd() < 0.3) kind = 'wisp';
      if (kind) this.critters.push({ kind, x, y, vx: (rnd() - 0.5) * 20, vy: (rnd() - 0.5) * 10, t: 0, life: 6 + rnd() * 8, seed: rnd() * 100, col: ['#ffe14a', '#ff93b8', '#9fd8ff', '#ffffff'][(rnd() * 4) | 0] });
    }
    for (let i = this.critters.length - 1; i >= 0; i--) {
      const c = this.critters[i];
      c.t += dt;
      if (c.t > c.life || c.x < camX - 80 || c.x > camX + W + 80 || c.y < camY - 80 || c.y > camY + H + 80) { this.critters.splice(i, 1); continue; }
      if (c.kind === 'gull') { c.x += (c.vx > 0 ? 34 : -34) * dt; c.y += Math.sin(c.t * 0.8 + c.seed) * 6 * dt; }
      else if (c.kind === 'butterfly') { c.x += (Math.sin(c.t * 1.3 + c.seed) * 18) * dt; c.y += (Math.cos(c.t * 1.1 + c.seed) * 12) * dt; }
      else { c.x += Math.sin(c.t * 0.7 + c.seed) * 8 * dt; c.y += Math.cos(c.t * 0.5 + c.seed) * 6 * dt; }
    }
  }
  drawCritters(ctx, camX, camY, now, dark, glowPass) {
    for (const c of this.critters) {
      const x = Math.round(c.x - camX), y = Math.round(c.y - camY);
      const fade = Math.min(1, c.t, c.life - c.t);
      if (!glowPass && c.kind === 'butterfly') {
        const flap = Math.floor(now * 12 + c.seed) % 2;
        ctx.globalAlpha = fade; ctx.fillStyle = c.col;
        const yy = y - 10 + Math.round(Math.sin(now * 3 + c.seed) * 2);
        if (flap) { ctx.fillRect(x - 2, yy, 2, 2); ctx.fillRect(x + 1, yy, 2, 2); } else { ctx.fillRect(x - 1, yy, 1, 2); ctx.fillRect(x + 1, yy, 1, 2); }
        ctx.fillStyle = '#2a1a2a'; ctx.fillRect(x, yy, 1, 2);
        ctx.globalAlpha = 1;
      } else if (!glowPass && c.kind === 'gull') {
        const flap = Math.floor(now * 5 + c.seed) % 2;
        ctx.globalAlpha = fade * 0.25; ctx.fillStyle = '#102030';
        ctx.fillRect(x - 2, y + 18, 5, 1);
        ctx.globalAlpha = fade; ctx.fillStyle = '#f4f4f0';
        const yy = y - 22;
        if (flap) { ctx.fillRect(x - 3, yy - 1, 2, 1); ctx.fillRect(x + 2, yy - 1, 2, 1); ctx.fillRect(x - 1, yy, 3, 1); }
        else { ctx.fillRect(x - 3, yy + 1, 2, 1); ctx.fillRect(x + 2, yy + 1, 2, 1); ctx.fillRect(x - 1, yy, 3, 1); }
        ctx.fillStyle = '#e8a030'; ctx.fillRect(x + (c.vx > 0 ? 2 : -2), yy, 1, 1);
        ctx.globalAlpha = 1;
      } else if (glowPass && (c.kind === 'firefly' || c.kind === 'wisp')) {
        const wisp = c.kind === 'wisp';
        const pulse = 0.5 + 0.5 * Math.sin(now * (wisp ? 2 : 4) + c.seed);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * pulse * (wisp ? 0.9 : 0.8);
        const g = wisp ? this.glows.green : this.glows.warm, s = wisp ? 26 : 12;
        ctx.drawImage(g, x - s / 2, y - 12 - s / 2, s, s);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = wisp ? '#d8fff0' : '#fff6a0';
        ctx.fillRect(x, y - 12, 1, 1);
        if (wisp) { ctx.fillRect(x - 1, y - 12, 3, 1); ctx.fillRect(x, y - 13, 1, 3); }
        ctx.globalAlpha = 1;
      }
    }
  }
  drawAtmosphere(ctx, G, camX, camY, now, dt, dark) {
    const W = this.W, H = this.H;
    // ombres de nuages
    if (dark < 0.9) {
      ctx.globalAlpha = 0.16 * (1 - dark);
      for (let i = 0; i < 5; i++) {
        const span = MAP_W * TILE + 600;
        const x = ((hash2(i, 1, 5) * span + now * (6 + i)) % span) - 300, y = hash2(i, 2, 5) * MAP_H * TILE;
        const s = 200 + hash2(i, 3, 5) * 220;
        if (x + s < camX || x - s > camX + W || y + s < camY || y - s > camY + H) continue;
        ctx.drawImage(this.cloud, x - s - camX, y - s * 0.6 - camY, s * 2, s * 1.2);
      }
      ctx.globalAlpha = 1;
    }
    // brume du marais
    const z = zoneAt(this.world, camX + W / 2, camY + H / 2);
    const target = (z === Z.SWAMP || z === Z.WRECK) ? 0.55 + dark * 0.2 : dark * 0.12;
    this.fogA += (target - this.fogA) * Math.min(1, dt * 0.8);
    if (this.fogA > 0.02) {
      if (!this.patFog) this.patFog = ctx.createPattern(this.fog, 'repeat');
      const S = this.fog.width;
      for (const [sp, a] of [[7, 1], [-4, 0.6]]) {
        ctx.save(); ctx.globalAlpha = this.fogA * a;
        const ox = -(((camX * 0.9 + now * sp) % S) + S) % S, oy = -(((camY * 0.9 + now * sp * 0.3) % S) + S) % S;
        ctx.translate(Math.round(ox), Math.round(oy)); ctx.fillStyle = this.patFog; ctx.fillRect(0, 0, W + S, H + S);
        ctx.restore();
      }
    }
    // fumée des cheminées
    for (const s of this.smokers) {
      if (s.x < camX - 40 || s.x > camX + W + 40 || s.y < camY - 60 || s.y > camY + H + 40) continue;
      s.t -= dt;
      if (s.t <= 0) { s.t = 0.35 + rnd() * 0.3; this.parts.push({ x: s.x + rnd() * 3, y: s.y + 40, z: 40, vx: 6 + rnd() * 4, vy: -2, vz: 12, g: -2, life: 2.4, max: 2.4, col: 'rgba(210,210,215,0.55)', size: 2, kind: 'smoke', drag: 0.4 }); }
    }
    // bulles du marais
    if (z === Z.SWAMP && rnd() < 0.15) {
      const x = camX + rnd() * W, y = camY + rnd() * H;
      if (tileAt(this.world, x, y) === T.SWAMP) this.burst(x, y, 2, { z: 0, col: ['#7a9a5a', '#a8c080'], up: 14, speed: 3, life: 0.5, g: 30 });
    }
  }
  drawLighting(ctx, G, camX, camY, now, dark, f) {
    const W = this.W, H = this.H, room = this.room, cave = room && room.kind === 'cave';
    // teinte du crépuscule et de l'aube
    const dusk = room ? 0 : f > 0.5 && f < 0.66 ? Math.sin((f - 0.5) / 0.16 * Math.PI) : f > 0.87 && f < 0.99 ? Math.sin((f - 0.87) / 0.12 * Math.PI) * 0.7 : 0;
    if (dusk > 0) { ctx.fillStyle = `rgba(255,120,60,${0.16 * dusk})`; ctx.fillRect(0, 0, W, H); }
    const z = G.player ? zoneAt(this.world, G.player.x, G.player.y) : Z.TOWN;
    const gloom = room ? (cave ? 1 : 0.6) : (z === Z.SWAMP || z === Z.WRECK) ? 0.2 : 0;
    const wx = this.weather || { rain: 0, storm: 0 };
    const a = room ? (cave ? 0.74 : 0.36) : Math.min(0.82, dark * 0.72 + gloom * (1 - dark * 0.55) + wx.rain * 0.12 * (1 - dark * 0.5) + wx.storm * 0.14 * (1 - dark * 0.5));
    if (a < 0.02) return;
    const L = this.lctx;
    L.globalCompositeOperation = 'source-over';
    L.clearRect(0, 0, W, H);
    L.fillStyle = `rgba(6,12,34,${a})`;
    L.fillRect(0, 0, W, H);
    L.globalCompositeOperation = 'destination-out';
    const cut = (x, y, r, k = 1) => { L.globalAlpha = k; L.drawImage(this.mask, x - r - camX, y - r - camY, r * 2, r * 2); };
    const vis = [];
    for (const l of this.lights) {
      if (l.x < camX - 140 || l.x > camX + W + 140 || l.y < camY - 140 || l.y > camY + H + 140) continue;
      if (l.win && (dark < 0.25 || room)) continue;
      const fl = l.flicker ? 1 + Math.sin(now * 9 + l.x) * 0.04 + Math.sin(now * 23 + l.y) * 0.03 : 1;
      cut(l.x, l.y, l.r * fl, l.soft ? 0.7 : 1);
      vis.push([l, fl]);
    }
    if (G.player) cut(G.player.x, G.player.y - 10, cave ? 112 : 62, cave ? 1 : 0.8);
    if (room) for (const d of this.world.doors) if (d.room === room.id) { cut(d.ex, d.ey, 52, 0.9); vis.push([{ x: d.ex, y: d.ey + 4, r: 44, c: dark > 0.5 ? 'cold' : 'white', soft: 1 }, 1]); }
    if (G.structs) for (const st of G.structs.values()) {
      const def = STRUCTS[st.type];
      if (!def.light) continue;
      const x = st.tx * TILE + 8, y = st.ty * TILE + 4;
      if (x < camX - 120 || x > camX + W + 120 || y < camY - 120 || y > camY + H + 120) continue;
      const fl = 1 + Math.sin(now * 9 + x) * 0.05;
      cut(x, y, def.light * fl, 1);
      vis.push([{ x, y, r: def.light, c: 'warm', flicker: 1 }, fl]);
    }
    for (const e of G.ents.values()) if (e.k === 'p') cut(e.x, e.y - 10, 44, 0.6);
    for (const p of this.projs.values()) cut(p.x, p.y, 16, 0.8);
    for (const fx of this.fx) if (fx.kind === 'boom' || fx.kind === 'flash') cut(fx.x, fx.y, (fx.r || 30) * 2.2, Math.max(0, 1 - (now - fx.t0) / fx.dur));
    // faisceau du phare
    const LH = room ? null : this.lighthouse;
    if (LH && dark > 0.2) {
      const ang = now * 0.55;
      L.globalAlpha = 0.55 * dark;
      L.fillStyle = '#000';
      L.beginPath();
      L.moveTo(LH.x - camX, LH.y - camY);
      L.arc(LH.x - camX, LH.y - camY, 420, ang - 0.13, ang + 0.13);
      L.closePath(); L.fill();
      cut(LH.x, LH.y, 46, 1);
    }
    L.globalAlpha = 1;
    L.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.light, 0, 0);
    // halos colorés
    ctx.globalCompositeOperation = 'lighter';
    for (const [l, fl] of vis) {
      const g = this.glows[l.c] || this.glows.warm;
      ctx.globalAlpha = (l.win ? 0.5 : 0.8) * (room ? (l.soft ? 0.7 : 0.9) : Math.min(1, dark * 1.4 + gloom));
      const r = l.r * fl * (l.win ? 0.8 : 0.9);
      ctx.drawImage(g, l.x - r - camX, l.y - r - camY, r * 2, r * 2);
    }
    if (LH && dark > 0.2) {
      const ang = now * 0.55;
      ctx.globalAlpha = 0.14 * dark;
      ctx.fillStyle = '#fff4c0';
      ctx.beginPath(); ctx.moveTo(LH.x - camX, LH.y - camY); ctx.arc(LH.x - camX, LH.y - camY, 420, ang - 0.1, ang + 0.1); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.9 * dark; ctx.drawImage(this.glows.white, LH.x - 30 - camX, LH.y - 30 - camY, 60, 60);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // fenêtres allumées
    if (dark > 0.25 && !room) {
      ctx.fillStyle = `rgba(255,214,110,${Math.min(1, (dark - 0.25) * 2)})`;
      for (const [l] of vis) if (l.win) ctx.fillRect(Math.round(l.win.x - camX), Math.round(l.win.y - camY), l.win.w, l.win.h);
    }
    // yeux luisants des morts
    if (a > 0.15) {
      for (const e of G.ents.values()) {
        if (e.k !== 'm' || !e.sheet || e.dyingT) continue;
        const sh = e.sheet, dir = (now - (e.atkT || -9) < 0.28) ? dirFromAngle(e.atkA) : e.dir & 3;
        const fr = e.moving ? Math.floor((e.walk || 0) * 6) % 4 : 0;
        const m = sh.meta[dir] && sh.meta[dir][fr];
        if (!m) continue;
        const x0 = Math.round(e.x - sh.ax - camX), y0 = Math.round(e.y - sh.ay - camY);
        const col = MOB_EYE[e.type] || '#ffe14a';
        for (const [ex, ey] of m.eyes) {
          ctx.fillStyle = col; ctx.fillRect(x0 + ex, y0 + ey, sh.fw > FW ? 2 : 1, sh.fw > FW ? 3 : 2);
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * a;
          ctx.drawImage(e.type === 'drowned' ? this.glows.cold : e.type === 'ghoul' ? this.glows.purple : e.type === 'boss' ? this.glows.green : this.glows.red, x0 + ex - 5, y0 + ey - 5, 11, 11);
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        }
      }
    }
  }
  drawLabels(ctx, G, draw, camX, camY, now) {
    for (const d of draw) {
      const o = d.e || d.n;
      if (!o || d.p || d.st) continue;
      const x = Math.round(o.x - camX);
      if (d.n) {
        const n = d.n;
        const top = Math.round(n.y - camY - (n.parrot ? 34 : 30));
        const name = textCanvas(n.name, '#ffe7a0');
        ctx.drawImage(name, x - (name.width >> 1), top - 6);
        const mk = G.npcMarker && G.aide !== 'aucune' ? G.npcMarker(n.id) : null;
        if (mk) {
          const by = top - 16 + Math.round(Math.sin(now * 4) * 1.5);
          const c = textCanvas(mk, mk === '!' ? '#ffd23a' : (G.npcReady && G.npcReady(n.id) ? '#ffd23a' : '#b8b0a0'), '#1c1426', 2);
          ctx.drawImage(c, x - (c.width >> 1), by);
        }
        continue;
      }
      const e = o;
      if (e.dyingT) continue;
      if (e.k === 'a') { // navire allié : son nom et celui de son capitaine
        if (e.sinkT) continue;
        const n1 = textCanvas(e.name || '', '#ffd23a'), n2 = textCanvas(e.cap || '', '#e8dcc0');
        ctx.drawImage(n1, x - (n1.width >> 1), Math.round(e.y - camY) - 70); ctx.drawImage(n2, x - (n2.width >> 1), Math.round(e.y - camY) - 62);
        continue;
      }
      if (e.type === 'kraken') continue;
      if (e.type === 'tentacule') { if (e.hp < 100) this.hpBar(ctx, x, Math.round(e.y - camY) - 58, 18, e.hp / 100, '#e04a3a'); continue; }
      const sh = e.sheet;
      const top = Math.round(e.y - camY - (sh ? sh.ay : 26) + (e.type === 'boss' ? 4 : 2) + (e.k === 'p' && (e === G.player ? G.player.boat : (e.flags & 16)) ? 5 : 0));
      if (e.k === 'p') {
        const me = e === G.player;
        const pvp = !me && G.player && G.zone >= 0 && !SAFE.has(G.zone) && !SAFE.has(zoneAt(this.world, e.x, e.y));
        const name = textCanvas(e.name || '?', me ? '#ffe7a0' : pvp ? '#ff9a8a' : '#ffffff');
        const lv = textCanvas(String(e.lvl || 1), '#c8b8ff');
        if (!me || G.showMyName) { ctx.drawImage(name, x - (name.width >> 1) + 3, top - 9); ctx.drawImage(lv, x - (name.width >> 1) - lv.width + 2, top - 9); }
        if (e.title && (!me || G.showMyName)) { const tt = textCanvas(e.title, '#f2c14a'); ctx.globalAlpha = 0.9; ctx.drawImage(tt, x - (tt.width >> 1), top - 16); ctx.globalAlpha = 1; }
        if (!me && (e.hp < 100 || pvp)) this.hpBar(ctx, x, top - 2, 16, e.hp / 100, pvp ? '#e0a040' : '#5cd65c');
        if (e.flags & 8) { ctx.fillStyle = '#ffd23a'; ctx.fillRect(x - 1, top - 14, 2, 2); }
        if (e.thief) { const tv = textCanvas('VOLEUR', '#ff5a4a'); ctx.drawImage(tv, x - (tv.width >> 1), top - (e.title && (!me || G.showMyName) ? 23 : 16)); }
      } else if (e.k === 'm') {
        const def = MOBS[e.type];
        const hover = G.mouseWorld && Math.abs(G.mouseWorld.x - e.x) < 12 && Math.abs(G.mouseWorld.y - (e.y - 10)) < 14;
        if (e.hp < 100 || hover) this.hpBar(ctx, x, top - 2, e.type === 'boss' ? 30 : 16, e.hp / 100, '#e04a3a');
        if (def && def.elite && !hover) {
          const t = textCanvas(def.name, '#ffb040');
          ctx.drawImage(t, x - (t.width >> 1), top - 10);
        }
        if (hover && def) {
          const t = textCanvas(`${def.name} ${def.level}`, G.player && def.level > G.player.lvl + 2 ? '#ff8a7a' : '#ffffff');
          ctx.drawImage(t, x - (t.width >> 1), top - 10);
        }
      }
    }
    this.drawBuildPreview(ctx, G, camX, camY, now);
    // invite d'interaction
    const it = G.interactTarget;
    if (it && it.verb) { const v = textCanvas(it.verb, '#e8dcc0'); ctx.drawImage(v, Math.round(it.x - camX - v.width / 2), Math.round(it.y - camY - (it.h || 30) - 22 + Math.sin(now * 5))); }
    if (it) {
      const x = Math.round(it.x - camX), y = Math.round(it.y - camY - (it.h || 30) - 14 + Math.sin(now * 5) * 1);
      ctx.fillStyle = '#1c1426'; ctx.fillRect(x - 5, y - 1, 11, 10);
      ctx.fillStyle = '#f2c14a'; ctx.fillRect(x - 4, y, 9, 8);
      const k = textCanvas('E', '#2b1606', null);
      ctx.drawImage(k, x - 2, y + 1);
    }
  }
  drawStruct(ctx, st, camX, camY, now) {
    const list = this.structSpr[st.type];
    if (!list) return;
    let spr = list[0];
    if (st.type === 'pavillon') spr = list[Math.floor(now * 3) % 2];
    if (st.type === 'jardiniere') spr = list[(st.age0 || 0) + (now - (st.seen || now)) >= PLANTER_GROW ? 1 : 0];
    const bx = st.tx * TILE + 8, by = st.ty * TILE + 15;
    const x = Math.round(bx - spr.ax - camX), y = Math.round(by - spr.ay - camY);
    if (st.type !== 'mur_bois' && st.type !== 'mur_pierre' && st.type !== 'palissade' && st.type !== 'porte') {
      ctx.fillStyle = 'rgba(20,12,34,0.25)'; ctx.beginPath(); ctx.ellipse(bx - camX, by - camY - 1, Math.min(9, spr.w * 0.4), 2.5, 0, 0, TAU); ctx.fill();
    }
    ctx.drawImage(spr.cv, x, y);
    const pk = STRUCTS[st.type].pet;
    if (pk && this.pets[pk] && !(st.mine && this.petOut === pk)) { // l'animal dort dans son panier, sauf s'il suit son maître
      const set = this.pets[pk], fr = set[pk === 'perroquet' ? 3 : 2 + (Math.floor(now * 0.6 + st.tx) % 6 === 0 ? 1 : 0)];
      ctx.drawImage(fr, Math.round(bx - camX) - (fr.width >> 1), Math.round(by - camY) - fr.height - 1);
    }
    if (spr.flame) { const fr = this.flames[Math.floor(now * 10 + st.tx) % 4]; ctx.drawImage(fr, Math.round(bx - spr.ax + spr.flame[0] - fr.width / 2 - camX), Math.round(by - spr.ay + spr.flame[1] - fr.height + 3 - camY)); }
    if (st.type === 'forge_base' && Math.random() < 0.08) this.burst(bx, by, 1, { z: 8, col: ['#ffd24a', '#ff8a2a'], up: 20, speed: 8, life: 0.6, g: -10 });
    if (st.type === 'feu_camp' && Math.random() < 0.1) this.burst(bx, by - 2, 1, { z: 8, col: ['#ffd24a', '#ff8a2a'], up: 24, speed: 6, life: 0.7, g: -12 });
  }
  drawBuildPreview(ctx, G, camX, camY, now) {
    const b = G.build;
    if (!b || !G.mouseWorld) return;
    const mine = G.bases && G.bases.find((x) => x.mine);
    const cx = mine ? mine.tx : Math.floor(G.mouseWorld.x / TILE), cy = mine ? mine.ty : Math.floor(G.mouseWorld.y / TILE);
    if (mine || (b.item && b.item.place === 'pavillon')) {
      ctx.strokeStyle = 'rgba(255,215,90,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.ellipse(cx * TILE + 8 - camX, cy * TILE + 8 - camY, (CLAIM_R + 0.5) * TILE, (CLAIM_R + 0.5) * TILE, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    const tx = Math.floor(G.mouseWorld.x / TILE), ty = Math.floor(G.mouseWorld.y / TILE);
    ctx.strokeStyle = b.valid ? 'rgba(120,255,140,0.9)' : 'rgba(255,90,70,0.9)';
    ctx.strokeRect(tx * TILE - camX + 0.5, ty * TILE - camY + 0.5, 15, 15);
    if (!b.item) return;
    const list = this.structSpr[b.item.place];
    if (!list) return;
    const spr = list[0], def = STRUCTS[b.item.place];
    ctx.globalAlpha = 0.55 + Math.sin(now * 6) * 0.1;
    if (def.floor) ctx.drawImage(spr.cv, tx * TILE - camX, ty * TILE - camY);
    else ctx.drawImage(spr.cv, Math.round(tx * TILE + 8 - spr.ax - camX), Math.round(ty * TILE + 15 - spr.ay - camY));
    ctx.globalAlpha = 1;
  }
  drawGroundMarks(ctx, G, camX, camY, now) {
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i], t = now - d.t0;
      if (t > 9) { this.decals.splice(i, 1); continue; }
      const s = this.env[d.kind] && this.env[d.kind][d.v || 0];
      if (!s) continue;
      ctx.globalAlpha = Math.min(1, (9 - t) / 2) * 0.85;
      ctx.drawImage(s.cv, Math.round(d.x - s.ax - camX), Math.round(d.y - s.ay - camY));
    }
    ctx.globalAlpha = 1;
    if (G.treasure) {
      const x = Math.round(G.treasure.x - camX), y = Math.round(G.treasure.y - camY - 3), p = Math.sin(now * 4) > 0 ? 1 : 0;
      ctx.fillStyle = '#1c1426';
      for (let i = -5; i <= 5; i++) { ctx.fillRect(x + i - 1, y + i - 1, 4, 3); ctx.fillRect(x + i - 1, y - i - 1, 4, 3); }
      ctx.fillStyle = p ? '#ff4a3a' : '#d82a2a';
      for (let i = -4; i <= 4; i++) { ctx.fillRect(x + i, y + i, 2, 1); ctx.fillRect(x + i, y - i, 2, 1); }
      if (rnd() < 0.05) this.burst(G.treasure.x, G.treasure.y, 2, { col: ['#ffd23a', '#fff'], up: 30, speed: 10, life: 0.6 });
    }
    if (G.evt && G.evt.state === 'on') {
      const r = 60 + Math.sin(now * 3) * 4;
      ctx.strokeStyle = `rgba(255,70,50,${0.35 + 0.25 * Math.sin(now * 5)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(G.evt.x - camX, G.evt.y - camY, r, r * 0.6, 0, 0, TAU); ctx.stroke();
    }
  }
  drawCat(ctx, c, camX, camY, now) {
    const fr = this.cats[c.col][c.moving ? Math.floor(now * 8) % 2 : 2 + (Math.floor(now * 0.7 + c.x) % 9 === 0 ? 1 : 0)];
    const x = Math.round(c.x - camX), y = Math.round(c.y - camY);
    ctx.save();
    if (c.dir === 1) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(fr, -7, y - 10); }
    else ctx.drawImage(fr, x - 7, y - 10);
    ctx.restore();
  }
  drawFishing(ctx, G, camX, camY, now) {
    const list = G.player ? [G.player, ...G.ents.values()] : [...G.ents.values()];
    for (const e of list) {
      const f = e && e.fish;
      if (!f) continue;
      const right = f.x >= e.x;
      const hx = e.x + (right ? 6 : -6) - camX, hy = e.y - 13 - camY;
      const tx = hx + (right ? 9 : -9), ty = hy - 9;
      const bite = f.bite && now - f.bite < 1.0;
      const bx = f.x - camX, by = f.y - camY + (bite ? 2 + Math.sin(now * 30) : Math.sin(now * 3 + e.id) * 1);
      ctx.strokeStyle = '#6a4426'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(hx), Math.round(hy)); ctx.lineTo(Math.round(tx), Math.round(ty)); ctx.stroke();
      ctx.strokeStyle = 'rgba(240,240,240,0.65)';
      ctx.beginPath(); ctx.moveTo(Math.round(tx), Math.round(ty)); ctx.quadraticCurveTo((tx + bx) / 2, Math.max(ty, by) + 8, Math.round(bx), Math.round(by)); ctx.stroke();
      ctx.fillStyle = '#e03a2a'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 3, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 3, 1);
      ctx.strokeStyle = 'rgba(220,250,255,0.5)';
      const r = 3 + (now * 3 % 3);
      ctx.beginPath(); ctx.ellipse(Math.round(bx), Math.round(by) + 1, r, r * 0.4, 0, 0, TAU); ctx.stroke();
      if (bite && e === G.player) { const c = textCanvas('!', '#ffd23a', '#1c1426', 2); ctx.drawImage(c, Math.round(e.x - camX - c.width / 2), Math.round(e.y - camY - 42)); }
    }
  }
  drawWeather(ctx, G, now, dt, dark) {
    const w = weatherAt(G.worldTime || 0); this.weather = w;
    const W = this.W, H = this.H;
    if (w.rain > 0.01) {
      const n = Math.floor(170 * w.rain + 70 * w.storm);
      ctx.fillStyle = `rgba(60,80,110,${0.14 * w.rain + 0.08 * w.storm})`; ctx.fillRect(0, 0, W, H);
      while (this.rain.length < n) this.rain.push({ x: rnd() * (W + 80) - 40, y: rnd() * H, l: 6 + rnd() * 6, s: 300 + rnd() * 150 });
      if (this.rain.length > n) this.rain.length = n;
      const wind = 0.3 + w.storm * 0.45;
      ctx.strokeStyle = dark > 0.5 ? 'rgba(170,190,225,0.42)' : 'rgba(215,228,245,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of this.rain) {
        d.y += d.s * dt; d.x -= d.s * wind * dt;
        if (d.y > H + 8) { d.y = -8 - rnd() * 20; d.x = rnd() * (W + 80); if (rnd() < 0.5) this.splashes.push({ x: rnd() * W, y: rnd() * H, t: 0 }); }
        if (d.x < -40) d.x += W + 80;
        ctx.moveTo(Math.round(d.x), Math.round(d.y)); ctx.lineTo(Math.round(d.x + d.l * wind), Math.round(d.y - d.l));
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(220,235,250,0.5)';
      for (let i = this.splashes.length - 1; i >= 0; i--) {
        const sp = this.splashes[i]; sp.t += dt;
        if (sp.t > 0.25) { this.splashes.splice(i, 1); continue; }
        const r = Math.round(1 + sp.t * 10);
        ctx.fillRect(Math.round(sp.x) - r, Math.round(sp.y), 1, 1); ctx.fillRect(Math.round(sp.x) + r, Math.round(sp.y), 1, 1); ctx.fillRect(Math.round(sp.x), Math.round(sp.y) - 1, 1, 1);
      }
      if (this.splashes.length > 80) this.splashes.splice(0, this.splashes.length - 80);
    } else { this.rain.length = 0; this.splashes.length = 0; }
    if (w.storm > 0.35 && now > this.nextBolt) {
      this.nextBolt = now + 5 + rnd() * 10;
      this.flash = 1;
      const pts = []; let bx = rnd() * W, by = 0;
      while (by < H * 0.55) { pts.push([bx, by]); bx += (rnd() - 0.5) * 22; by += 6 + rnd() * 12; }
      this.bolt = { pts, t: now };
      if (this.onThunder) this.onThunder(rnd());
    }
    if (this.bolt && now - this.bolt.t < 0.18) {
      ctx.strokeStyle = '#f4f8ff'; ctx.lineWidth = 2;
      ctx.beginPath(); this.bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)))); ctx.stroke();
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(225,235,255,${this.flash * 0.5})`; ctx.fillRect(0, 0, W, H); this.flash -= dt * 4.5; }
  }
  drawObjective(ctx, G, camX, camY, now) {
    const o = G.objective, p = G.player;
    if (!o || !p || G.aide === 'aucune' || G.build) return;
    const discreet = G.aide !== 'complet';
    const W = this.W, H = this.H;
    const sx = o.x - camX, sy = o.y - camY;
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < 36) return;
    const m = 20;
    if (sx > m && sy > m && sx < W - m && sy < H - m) {
      if (o.npc) return;
      const bx = Math.round(sx), by = Math.round(sy - (o.h || 18) - Math.abs(Math.sin(now * 4)) * 3);
      ctx.fillStyle = '#1c1426'; ctx.fillRect(bx - 4, by - 1, 9, 3); ctx.fillRect(bx - 3, by + 2, 7, 2); ctx.fillRect(bx - 1, by + 4, 3, 2);
      ctx.fillStyle = o.col || '#ffd23a'; ctx.fillRect(bx - 3, by, 7, 1); ctx.fillRect(bx - 2, by + 2, 5, 1); ctx.fillRect(bx, by + 4, 1, 1);
      return;
    }
    const cx = W / 2, cy = H / 2, ang = Math.atan2(sy - cy, sx - cx);
    const hw = W / 2 - m, hh = H / 2 - m - 14;
    const k = Math.min(hw / Math.max(1e-6, Math.abs(Math.cos(ang))), hh / Math.max(1e-6, Math.abs(Math.sin(ang))));
    const ax = cx + Math.cos(ang) * k, ay = cy + Math.sin(ang) * k;
    const pulse = (1 + Math.sin(now * 5) * 0.12) * (discreet ? 0.6 : 1);
    if (discreet) ctx.globalAlpha = 0.65;
    ctx.save(); ctx.translate(Math.round(ax), Math.round(ay)); ctx.rotate(ang); ctx.scale(pulse, pulse);
    ctx.fillStyle = '#1c1426'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = o.col || '#ffd23a'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-4, -6); ctx.lineTo(-1, 0); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    const label = textCanvas(discreet ? `${Math.round(d / TILE)} M` : `${o.label} ${Math.round(d / TILE)} M`, o.col === '#ff6a5a' ? '#ffc0b0' : '#ffe7a0');
    let lx = ax - Math.cos(ang) * 18 - label.width / 2, ly = ay - Math.sin(ang) * 14 - label.height / 2;
    lx = Math.max(4, Math.min(W - label.width - 4, lx)); ly = Math.max(4, Math.min(H - label.height - 4, ly));
    ctx.drawImage(label, Math.round(lx), Math.round(ly));
    ctx.globalAlpha = 1;
  }
  hpBar(ctx, x, y, w, k, col) {
    const x0 = x - (w >> 1);
    ctx.fillStyle = '#1c1426'; ctx.fillRect(x0 - 1, y - 1, w + 2, 4);
    ctx.fillStyle = '#4a1c1c'; ctx.fillRect(x0, y, w, 2);
    ctx.fillStyle = col; ctx.fillRect(x0, y, Math.max(0, Math.round(w * Math.max(0, Math.min(1, k)))), 2);
  }
  drawBossBar(ctx, G) {
    let boss = null;
    for (const e of G.ents.values()) if (e.k === 'm' && e.type === 'kraken' && !e.dyingT) boss = e;
    if (!boss) for (const e of G.ents.values()) if (e.k === 'm' && e.type === 'boss' && !e.dyingT) boss = e;
    if (!boss) for (const e of G.ents.values()) if (e.k === 'm' && !e.dyingT && MOBS[e.type] && MOBS[e.type].elite && (!boss || e.hp < boss.hp)) boss = e;
    if (!boss || !G.player || document.body.classList.contains('cine') || Math.hypot(boss.x - G.player.x, boss.y - G.player.y) > (boss.type === 'kraken' ? 560 : 320)) return;
    const def = MOBS[boss.type], W = this.W, w = Math.min(boss.type === 'kraken' ? 280 : 220, W - 120), x = Math.round((W - w) / 2), y = 28;
    const name = textCanvas(def.name.toUpperCase(), '#ffd0a0', '#1c1426', 1);
    ctx.drawImage(name, Math.round(W / 2 - name.width / 2), y - 11);
    ctx.fillStyle = '#1c1426'; ctx.fillRect(x - 2, y - 2, w + 4, 8);
    ctx.fillStyle = '#3a0c0c'; ctx.fillRect(x, y, w, 4);
    const ph = (boss.flags >> 5) & 3;
    ctx.fillStyle = ph >= 2 ? '#ff5a1e' : ph === 1 ? '#e8662a' : '#d83a2a'; ctx.fillRect(x, y, Math.round(w * boss.hp / 100), 4);
    ctx.fillStyle = '#ffb08a'; ctx.fillRect(x, y, Math.round(w * boss.hp / 100), 1);
    // encoches : les seuils où le boss change de phase
    for (const f of def.phases || []) { ctx.fillStyle = '#1c1426'; ctx.fillRect(x + Math.round(w * f) - 1, y - 2, 2, 8); ctx.fillStyle = '#ffd23a'; ctx.fillRect(x + Math.round(w * f) - 1, y - 3, 2, 1); }
    if (def.title) { const tt = textCanvas(def.title, '#c8b8a0', '#1c1426', 1); ctx.globalAlpha = 0.9; ctx.drawImage(tt, Math.round(W / 2 - tt.width / 2), y + 8); ctx.globalAlpha = 1; }
  }
}
const MOB_EYE = { roi_squelette: '#b8ff6a', zsailor: '#ffe14a', buccaneer: '#ff5a3a', ghoul: '#d28aff', drowned: '#c8fff4', skelgun: '#ff4a3a', boss: '#9dff6a', crab: '#ffe14a', crabroi: '#ffe14a', goule_alpha: '#ff3a3a', capitaine_noye: '#c8fff4' };
export function dirFromAngle(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return Math.abs(c) > Math.abs(s) ? (c < 0 ? 1 : 2) : (s < 0 ? 3 : 0);
}
