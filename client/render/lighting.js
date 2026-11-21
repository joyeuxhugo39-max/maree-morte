// Finition : la lumière. Une carte de lumière en couleur, à la taille de l'écran, remplie de la lumière
// ambiante (le soleil blanc et chaud du jour, l'or du couchant, le bleu de la lune la nuit, la pénombre des
// grottes, la teinte de chaque lieu) ; les sources y ajoutent leur couleur (lanternes et feux orangés,
// magies froides, feux-follets verts, cristaux violets) ; puis l'image est MULTIPLIÉE par cette carte. Les
// lanternes éclairent donc vraiment ce qui les entoure, au lieu de percer un voile noir. Par-dessus : un halo
// doux sur les sources seulement, les fenêtres allumées, les yeux des morts, et un léger vignettage.
import { STRUCTS } from '../../shared/data/craft.js';
import { Z, SAFE, zoneAt } from '../../shared/world.js';
import { isFullMoon } from '../../shared/constants.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
const lum = (c) => (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
const css = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

// la palette de la lumière : chaque famille de source a sa couleur
export const LIGHT_COL = {
  warm: [255, 168, 88], fire: [255, 128, 52], cold: [96, 164, 255], green: [96, 255, 150], purple: [184, 120, 255],
  white: [255, 236, 200], red: [255, 74, 54], moon: [150, 172, 255], lava: [255, 104, 40],
};
// l'ambiance : le jour, l'or du soir et de l'aube, la nuit (bleue ; rouge les nuits de pleine lune)
const DAY = [255, 250, 240], DUSK = [255, 168, 112], DAWN = [240, 184, 204], NIGHT = [70, 82, 134], NIGHT_TOWN = [84, 88, 136], BLOOD = [116, 62, 88];
const ZONE_TINT = {
  [Z.SWAMP]: [0.84, 0.94, 0.82], [Z.WRECK]: [0.86, 0.92, 0.88], [Z.DAMNES]: [0.8, 0.76, 0.96], [Z.VOLCAN]: [1, 0.9, 0.82],
  [Z.BRUMES]: [0.86, 0.9, 1], [Z.PENDUS]: [0.86, 0.86, 0.9], [Z.QUARANTAINE]: [0.9, 0.94, 0.86], [Z.OSSEMENTS]: [0.92, 0.9, 0.86], [Z.GOUFFRE]: [0.84, 0.88, 0.98],
};

export const lighting = {
  lightSprite(c) {
    this._ls = this._ls || {};
    const key = c.join(',');
    if (this._ls[key]) return this._ls[key];
    const s = 128, cv = mk(s, s), x = cv.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    // une chute douce, sans paliers : pleine au cœur, presque rien au bord
    for (const [o, a] of [[0, 1], [0.12, 0.92], [0.3, 0.62], [0.5, 0.33], [0.7, 0.13], [0.86, 0.04], [1, 0]]) g.addColorStop(o, `rgba(${c[0]},${c[1]},${c[2]},${a})`);
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    return (this._ls[key] = cv);
  },
  // l'ambiance du moment et du lieu
  ambient(G, f, dark, room) {
    const wx = this.weather || { rain: 0, storm: 0 };
    if (room) {
      if (room.kind === 'cave') return { col: [60, 54, 88], vign: 0.4 };
      if (room.kind === 'underwater') return { col: [74, 132, 156], vign: 0.3 };
      return { col: mix([218, 200, 180], [150, 128, 116], dark), vign: 0.26 }; // un intérieur : la pénombre chaude
    }
    const z = G.player ? zoneAt(this.world, G.player.x, G.player.y) : Z.TOWN;
    // l'or du soir (vers 0,58) et le rose de l'aube (vers 0,94)
    const dusk = f > 0.5 && f < 0.68 ? Math.sin((f - 0.5) / 0.18 * Math.PI) : 0, dawn = f > 0.86 && f < 1 ? Math.sin((f - 0.86) / 0.14 * Math.PI) : 0;
    let col = mix(DAY, dusk > dawn ? DUSK : DAWN, Math.max(dusk, dawn) * 0.85);
    const night = isFullMoon(G.worldTime || 0) ? BLOOD : SAFE.has(z) ? NIGHT_TOWN : NIGHT;
    col = mix(col, night, dark);
    if (ZONE_TINT[z]) col = mul(col, ZONE_TINT[z]);
    if (wx.rain) col = mul(col, mix([1, 1, 1], [0.86, 0.89, 0.95], wx.rain * (1 - dark * 0.5)));
    if (wx.storm) col = mul(col, mix([1, 1, 1], [0.76, 0.79, 0.9], wx.storm));
    return { col, vign: 0.14 + 0.2 * dark, glow: room ? 0 : Math.max(dusk * (1 - dark * 0.7), dawn * 0.8), dawn: dawn > dusk };
  },
  drawLighting(ctx, G, camX, camY, now, dark, f) {
    const W = this.W, H = this.H, room = this.room, cave = room && (room.kind === 'cave' || room.kind === 'underwater');
    const { col, vign, glow, dawn } = this.ambient(G, f, dark, room);
    const lk = Math.max(0, Math.min(1, (1 - lum(col)) * 1.35)); // la force des lumières : rien en plein jour, tout la nuit
    this.lightK = lk;
    if (this.light.width !== W || this.light.height !== H) { this.light.width = W; this.light.height = H; }
    const L = this.lctx;
    L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1;
    L.fillStyle = css(col); L.fillRect(0, 0, W, H);
    const vis = [];
    if (lk > 0.02) {
      L.globalCompositeOperation = 'lighter';
      const add = (x, y, r, c, k = 1) => {
        if (x < camX - r || x > camX + W + r || y < camY - r || y > camY + H + r || k <= 0) return;
        L.globalAlpha = Math.min(1, k * lk);
        L.drawImage(this.lightSprite(c), x - r - camX, y - r - camY, r * 2, r * 2);
      };
      for (const l of this.lights) {
        if (l.x < camX - 160 || l.x > camX + W + 160 || l.y < camY - 160 || l.y > camY + H + 160) continue;
        if (l.win && (dark < 0.25 || room)) continue;
        if (l.fest && !G.festOn) continue; // lot 6
        const fl = l.flicker ? 1 + Math.sin(now * 9 + l.x) * 0.04 + Math.sin(now * 23 + l.y) * 0.03 : 1;
        const c = LIGHT_COL[l.c] || LIGHT_COL.warm;
        add(l.x, l.y, l.r * (l.soft ? 1.15 : 1.55) * fl, c, l.win ? 0.62 : l.soft ? 0.5 : 1);
        vis.push([l, fl]);
      }
      // le pirate porte un peu de lumière (une torche dans les grottes)
      if (G.player) add(G.player.x, G.player.y - 10, cave ? 120 : 92, cave ? LIGHT_COL.warm : LIGHT_COL.moon, cave ? 0.75 : 0.36);
      if (room) for (const d of this.world.doors) if (d.room === room.id) { add(d.ex, d.ey, 70, dark > 0.5 ? LIGHT_COL.moon : LIGHT_COL.white, 0.6); vis.push([{ x: d.ex, y: d.ey + 4, r: 34, c: dark > 0.5 ? 'cold' : 'white', soft: 1 }, 1]); }
      if (G.structs) for (const st of G.structs.values()) {
        const def = STRUCTS[st.type];
        if (!def.light) continue;
        const x = st.tx * 16 + 8, y = st.ty * 16 + 4, fl = 1 + Math.sin(now * 9 + x) * 0.05;
        add(x, y, def.light * 1.25 * fl, LIGHT_COL.warm, 0.95);
        vis.push([{ x, y, r: def.light, c: 'warm', flicker: 1 }, fl]);
      }
      for (const e of G.ents.values()) if (e.k === 'p') add(e.x, e.y - 10, 48, LIGHT_COL.moon, 0.2);
      if (!room) for (const fo of G.folk || []) if (fo.lantern && !fo.hidden) { add(fo.x + 5, fo.y - 12, 66, LIGHT_COL.warm, 0.9); vis.push([{ x: fo.x + 5, y: fo.y - 12, r: 40, c: 'warm', flicker: 1 }, 1]); }
      if (!room && dark > 0.2) for (const g of this.garlands) if (g.x1 > camX - 60 && g.x0 < camX + W + 60 && g.y1 > camY - 60 && g.y0 < camY + H + 60) add((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2 + 6, (g.x1 - g.x0) * 0.6, LIGHT_COL.warm, 0.45);
      for (const p of this.projs.values()) add(p.x, p.y, 22, LIGHT_COL.white, 0.5);
      if (!room) for (const [lx, ly] of this.shipLights(G)) { const fl = 1 + Math.sin(now * 9 + lx) * 0.05; add(lx, ly, 74 * fl, LIGHT_COL.warm, 0.95); vis.push([{ x: lx, y: ly, r: 34, c: 'warm', flicker: 1 }, fl]); }
      // le phare : un faisceau qui tourne
      const LH = room ? null : this.lighthouse;
      if (LH && dark > 0.2) {
        const ang = now * 0.55, X = LH.x - camX, Y = LH.y - camY;
        const gr = L.createRadialGradient(X, Y, 10, X, Y, 430); gr.addColorStop(0, 'rgba(255,236,190,0.75)'); gr.addColorStop(1, 'rgba(255,236,190,0)');
        L.globalAlpha = lk * 0.85; L.fillStyle = gr; L.beginPath(); L.moveTo(X, Y); L.arc(X, Y, 430, ang - 0.12, ang + 0.12); L.closePath(); L.fill();
        add(LH.x, LH.y, 70, LIGHT_COL.white, 1);
      }
    }
    // les explosions et les éclairs illuminent tout, même en plein jour
    L.globalCompositeOperation = 'lighter';
    for (const fx of this.fx) if (fx.kind === 'boom' || fx.kind === 'flash') { const k = Math.max(0, 1 - (now - fx.t0) / fx.dur), r = (fx.r || 30) * 2.6; L.globalAlpha = k * 0.9; L.drawImage(this.lightSprite(LIGHT_COL.fire), fx.x - r - camX, fx.y - r - camY, r * 2, r * 2); }
    L.globalAlpha = 1; L.globalCompositeOperation = 'source-over';
    // la scène, multipliée par la lumière
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.light, 0, 0);
    ctx.restore();
    // halos : un éclat doux sur chaque source (pas de disque sur le sol : la carte de lumière s'en charge)
    if (lk > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      for (const [l, fl] of vis) {
        if (l.win) continue;
        const r = Math.max(8, Math.min(26, l.r * 0.32)) * fl;
        ctx.globalAlpha = (l.soft ? 0.32 : 0.55) * lk;
        ctx.drawImage(this.lightSprite(LIGHT_COL[l.c] || LIGHT_COL.warm), l.x - r - camX, l.y - r - camY, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    // le faisceau du phare, visible dans l'air humide
    const LH = room ? null : this.lighthouse;
    if (LH && dark > 0.2) {
      const ang = now * 0.55, X = LH.x - camX, Y = LH.y - camY;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.1 * dark; ctx.fillStyle = '#fff4c0';
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, 420, ang - 0.08, ang + 0.08); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.8 * dark; ctx.drawImage(this.lightSprite(LIGHT_COL.white), X - 22, Y - 22, 44, 44);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    if (!room && dark > 0.2) this.drawGarlands(ctx, camX, camY, now, dark, true);
    // fenêtres allumées : la vitre chaude, et un peu de lumière qui déborde
    if (dark > 0.25 && !room) {
      const k = Math.min(1, (dark - 0.25) * 2);
      for (const [l] of vis) if (l.win) {
        const x = Math.round(l.win.x - camX), y = Math.round(l.win.y - camY);
        ctx.fillStyle = `rgba(255,200,104,${k})`; ctx.fillRect(x, y, l.win.w, l.win.h);
        ctx.fillStyle = `rgba(255,236,170,${k * 0.8})`; ctx.fillRect(x + 1, y + 1, Math.max(1, l.win.w - 2), Math.max(1, Math.floor(l.win.h / 2) - 1));
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * k;
        const r = Math.max(l.win.w, l.win.h) * 1.4; ctx.drawImage(this.lightSprite(LIGHT_COL.warm), x + l.win.w / 2 - r, y + l.win.h / 2 - r, r * 2, r * 2);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
    }
    // les yeux luisants des morts, dans le noir
    if (lk > 0.15) this.drawEyes(ctx, G, camX, camY, now, lk);
    // l'heure dorée : le soleil bas embrase le haut de l'écran (rose à l'aube), et l'ombre bleuit en bas
    if (glow > 0.03) {
      if (!this._sky || this._skyW !== W || this._skyH !== H) {
        this._skyW = W; this._skyH = H; this._sky = {};
        for (const k of ['dusk', 'dawn']) {
          const c = mk(W, H), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, W * 0.35, H);
          if (k === 'dusk') { g.addColorStop(0, 'rgba(255,150,70,1)'); g.addColorStop(0.45, 'rgba(255,120,90,0.45)'); g.addColorStop(1, 'rgba(90,60,150,0.6)'); }
          else { g.addColorStop(0, 'rgba(255,190,200,1)'); g.addColorStop(0.5, 'rgba(230,170,210,0.4)'); g.addColorStop(1, 'rgba(120,120,190,0.55)'); }
          x.fillStyle = g; x.fillRect(0, 0, W, H); this._sky[k] = c;
        }
      }
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = glow * 0.75; ctx.drawImage(this._sky[dawn ? 'dawn' : 'dusk'], 0, 0); ctx.restore();
    }
    // le vignettage : un peu d'ombre aux bords, pour la profondeur
    if (vign > 0) {
      if (!this._vig || this._vigW !== W || this._vigH !== H) {
        this._vigW = W; this._vigH = H; this._vig = mk(W, H);
        const x = this._vig.getContext('2d'), g = x.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.32, W / 2, H * 0.5, Math.hypot(W, H) * 0.62);
        g.addColorStop(0, 'rgba(12,8,24,0)'); g.addColorStop(0.6, 'rgba(12,8,24,0.45)'); g.addColorStop(1, 'rgba(12,8,24,1)');
        x.fillStyle = g; x.fillRect(0, 0, W, H);
      }
      ctx.globalAlpha = vign; ctx.drawImage(this._vig, 0, 0); ctx.globalAlpha = 1;
    }
  },
};
