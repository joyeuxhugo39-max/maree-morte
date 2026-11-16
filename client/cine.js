// Cinématiques : bandes noires, cartons de titre, caméra dirigée, répliques.
// Un script = { dur, lock (secondes sans commandes), skippable, cam(t) -> {x, y} | null, steps: [{ at, fn }] }.
import { MOBS } from '../shared/data/mobs.js';

const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

export function playCine(G, script, now) {
  if (G.cine) endCine(G);
  G.cine = Object.assign({ t0: now, lock: 0, steps: [], cam: null, done: 0 }, script);
}
export function endCine(G) {
  if (!G.cine) return;
  G.cine = null;
  G.ui.cine(false);
}
export function cineLocked(G, now) { return !!G.cine && now - G.cine.t0 < G.cine.lock; }
// à appeler à chaque image : joue les étapes dues, renvoie la cible de caméra imposée (ou null)
export function updateCine(G, now) {
  const c = G.cine;
  if (!c) return null;
  const t = now - c.t0;
  while (c.done < c.steps.length && c.steps[c.done].at <= t) { const s = c.steps[c.done++]; try { s.fn(); } catch (e) { console.error(e); } }
  if (t >= c.dur) { endCine(G); return null; }
  return c.cam ? c.cam(t) : null;
}

const me = (G) => ({ x: G.player.x, y: G.player.y - 12 });

// entrée en scène d'un boss : la caméra glisse vers lui, son nom s'affiche, il rugit
export function bossIntro(G, e, type, now) {
  const def = MOBS[type], R = G.renderer;
  if (!def || !e) return;
  playCine(G, {
    dur: 2.7, lock: 2.3,
    cam: (t) => lerp(me(G), { x: e.x, y: e.y - 16 }, 0.72 * ease(t / 0.5) * (1 - ease((t - 2.15) / 0.5))),
    steps: [
      { at: 0, fn: () => { G.ui.cine(true); G.sfx.play('horn', 0.7); } },
      { at: 0.45, fn: () => {
        G.ui.cineTitle(def.name, def.title || '');
        e.roarT = performance.now() / 1000;
        R.shake(4, 0.6); G.sfx.play('roar');
        R.addFx({ kind: 'ring', x: e.x, y: e.y - 10, r: 80, dur: 0.9, col: 'rgba(255,120,60,A)', w: 3 });
        R.addFx({ kind: 'ring', x: e.x, y: e.y - 10, r: 50, dur: 0.6, col: 'rgba(255,220,160,A)', w: 2 });
      } },
      { at: 2.25, fn: () => G.ui.cine(false) },
    ],
  }, now);
}
// mort d'un boss : éclair, nom et « VAINCU », pluie d'or
export function bossDown(G, type, x, y, now) {
  const def = MOBS[type], R = G.renderer;
  if (!def) return;
  playCine(G, {
    dur: 3.6, lock: 0,
    cam: (t) => lerp(me(G), { x, y: y - 14 }, 0.6 * ease(t / 0.4) * (1 - ease((t - 1.7) / 0.6))),
    steps: [
      { at: 0, fn: () => { G.ui.cine(true); R.shake(7, 0.7); R.addFx({ kind: 'flash', x, y: y - 16, r: 110, dur: 0.8 }); G.sfx.play('boom', 0.7); } },
      { at: 0.5, fn: () => {
        G.ui.cineTitle(def.name, 'Vaincu', 'down'); G.sfx.play('victory');
        R.burst(x, y - 10, 60, { z: 10, col: ['#ffd23a', '#fff2a0', '#ffffff', '#ff8a2a'], up: 120, speed: 80, life: 1.4 });
        for (let k = 0; k < 3; k++) R.addFx({ kind: 'ring', x, y: y - 8, r: 50 + k * 34, dur: 0.7 + k * 0.25, col: 'rgba(255,220,100,A)', w: 2 });
      } },
      { at: 3.1, fn: () => G.ui.cine(false) },
    ],
  }, now);
}
// l'appel de la conque : le Goéland est happé, puis le Kraken se dresse
export function krakenIntro(G, m, now) {
  const R = G.renderer;
  const S = { x: m.sx, y: m.sy - 14 }, K = { x: m.x, y: m.y - 30 };
  playCine(G, {
    dur: 8.3, lock: 7.6, skippable: true,
    cam: (t) => {
      const P = me(G);
      if (t < 1.1) return lerp(P, S, ease(t / 1.1));
      if (t < 4.2) return S;
      if (t < 5.0) return lerp(S, K, ease((t - 4.2) / 0.8));
      if (t < 7.4) return K;
      return lerp(K, P, ease((t - 7.4) / 0.8));
    },
    steps: [
      { at: 0, fn: () => { G.ui.cine(true); G.sfx.play('conch'); G.ui.cineSub('La conque résonne jusqu’au fond du Gouffre…'); } },
      { at: 1.2, fn: () => { R.abyss = { x: m.sx, y: m.sy, t0: performance.now() / 1000, dur: 4.2 }; G.sfx.play('rumble'); } },
      { at: 1.5, fn: () => G.ui.cineSub('Elouan : « Le voilà ! Tenez-vous prêts ! »') },
      { at: 3.0, fn: () => { G.ui.cineSub('Elouan : « Il nous tient ! Abandonnez le navire ! »'); R.shake(5, 1.4); G.sfx.play('crack'); } },
      { at: 4.5, fn: () => { G.ui.cineSub(''); R.abyss = { x: m.x, y: m.y, t0: performance.now() / 1000, dur: 2.2, big: 1 }; } },
      { at: 5.3, fn: () => G.ui.cineTitle('Le Kraken', 'Terreur des Abysses') },
      { at: 7.4, fn: () => G.ui.cineTitle(null) },
      { at: 7.8, fn: () => G.ui.cine(false) },
    ],
  }, now);
}
export function krakenDown(G, x, y, now) {
  const R = G.renderer;
  const K = { x, y: y - 30 };
  playCine(G, {
    dur: 5.6, lock: 0,
    cam: (t) => lerp(me(G), K, 0.85 * ease(t / 0.6) * (1 - ease((t - 4.4) / 0.9))),
    steps: [
      { at: 0, fn: () => { G.ui.cine(true); R.shake(8, 2.6); G.sfx.play('roar', 1.2); R.addFx({ kind: 'flash', x, y: y - 30, r: 150, dur: 0.9 }); } },
      { at: 1.3, fn: () => { G.ui.cineTitle('Le Kraken', 'Renvoyé aux abysses', 'down'); G.sfx.play('victory'); } },
      { at: 2.0, fn: () => { R.abyss = { x, y, t0: performance.now() / 1000, dur: 3.4, big: 1 }; G.sfx.play('splash'); } },
      { at: 5.1, fn: () => G.ui.cine(false) },
    ],
  }, now);
}
