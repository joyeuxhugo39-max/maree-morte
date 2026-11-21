// Monde vivant, lot 6 : les sons du lieu. Par-dessus la nappe de mer et de vent qui existait, de petits sons localisés,
// tirés au hasard, rares et jamais en boucle : oiseaux le jour dans les bois et les prés, mouettes sur les côtes,
// grillons la nuit dans l'herbe, grenouilles dans les marais, bois qui grince près des quais et des navires, feu qui
// crépite près des braseros et des torches, gouttes dans les grottes, une cloche lointaine à l'aube sur le port.
// Sous la pluie, les oiseaux et les grillons se taisent (les grenouilles, non). Les lieux morts restent silencieux.
// Tout est synthétisé (client/audio.js) : aucun fichier sonore.
import { TILE, T, dayFrac, weatherAt } from '../shared/constants.js';
import { zoneAt, Z } from '../shared/world.js';
import { phaseOf } from './townsfolk.js';

const BIRDS = new Set([Z.PLAINS, Z.JUNGLE, Z.COLLINES, Z.BAIE, Z.HAUTS, Z.CANNAIES, Z.CRANE, Z.ILOT, Z.SIRENES, Z.ANSE, Z.HAVRE, Z.ECARLATE, Z.RADE]);
const BUSH = new Set([Z.JUNGLE, Z.ECARLATE, Z.MANGROVE]); // la jungle : des oiseaux plus exotiques
const CRICKETS = new Set([Z.PLAINS, Z.COLLINES, Z.BAIE, Z.HAUTS, Z.CANNAIES, Z.JUNGLE, Z.ECARLATE, Z.ANSE, Z.HAVRE, Z.RADE, Z.TOWN, Z.SIRENES, Z.ILOT]);
const FROGS = new Set([Z.SWAMP, Z.MANGROVE]);
const SILENT = new Set([Z.PENDUS, Z.DAMNES, Z.OSSEMENTS, Z.RUINS, Z.QUARANTAINE, Z.VOLCAN]); // des lieux où rien ne chante

export class Ambience {
  constructor(G) { this.G = G; this.at = {}; this.scanAt = 0; this.near = { water: 0, plank: 0, fire: 0 }; }
  due(k, now, min, max) { if (now < (this.at[k] || 0)) return false; this.at[k] = now + min + Math.random() * (max - min); return true; }
  scan() { // ce qu'il y a autour du joueur (une fois par seconde)
    const G = this.G, W = G.world, p = G.player, tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    let water = 0, plank = 0;
    for (let dy = -6; dy <= 6; dy += 2) for (let dx = -8; dx <= 8; dx += 2) { const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W.W || y >= W.H) continue; const t = W.tiles[y * W.W + x]; if (t === T.WATER || t === T.DEEP) water++; else if (t === T.PLANK) plank++; }
    let fire = 1e9; for (const l of G.renderer.lights || []) if (l.flame && l.c === 'warm' && !(l.fest && !G.festOn)) { const d = Math.hypot(l.x - p.x, l.y - p.y); if (d < fire) fire = d; }
    this.near = { water, plank, fire };
  }
  update(now) {
    const G = this.G, S = G.sfx, p = G.player;
    if (!S || !S.ctx || S.muted || !p || (G.cinema && G.cinema.locked && G.cinema.locked())) return;
    if (now > this.scanAt) { this.scanAt = now + 1; this.scan(); }
    const W = G.world, room = G.room >= 0 ? W.rooms[G.room] : null, wt = G.worldTime || 0, ph = phaseOf(dayFrac(wt)), w = weatherAt(wt), rain = w ? w.rain : 0;
    const v = (k) => k * (S.vol ?? 1); // le volume des effets
    if (room) { // les intérieurs : seulement les grottes et la forge ont leur bruit propre
      if (room.kind === 'cave' && this.due('drip', now, 2.5, 8)) { const f = 1500 + Math.random() * 900; S.tone(f, 0.14, { type: 'sine', vol: v(0.018), slide: 0.55 }); }
      if (room.kind === 'forge' && this.due('clink', now, 2.2, 5.5)) { S.tone(1900 + Math.random() * 300, 0.08, { type: 'square', vol: v(0.008) }); S.tone(2900, 0.05, { type: 'triangle', vol: v(0.006), delay: 0.01 }); }
      return;
    }
    const z = zoneAt(W, p.x, p.y), N = this.near, coast = N.water > 6;
    if (SILENT.has(z)) { // le silence, et parfois un corbeau dans la forêt des Pendus
      if (z === Z.PENDUS && ph === 'jour' && this.due('crow', now, 25, 60)) for (let k = 0; k < 2; k++) S.hiss(0.18, { f: 900, q: 3, vol: v(0.035), slide: 0.7, delay: k * 0.32 });
      return;
    }
    const day = ph === 'jour' || ph === 'aube';
    // les oiseaux : un appel bref, une petite phrase, jamais deux fois la même
    if (day && rain < 0.3 && BIRDS.has(z) && this.due('bird', now, 4, 13)) {
      const base = BUSH.has(z) ? 1300 + Math.random() * 900 : 2600 + Math.random() * 1500, n = 2 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) S.tone(base * (1 + (Math.random() - 0.5) * 0.25), 0.05 + Math.random() * 0.05, { type: BUSH.has(z) ? 'triangle' : 'sine', vol: v(0.011), slide: Math.random() < 0.5 ? 1.3 : 0.78, delay: k * (0.08 + Math.random() * 0.06) });
    }
    // les mouettes, près de l'eau, le jour
    if (day && coast && rain < 0.6 && this.due('gull', now, 9, 24)) for (let k = 0; k < 1 + Math.floor(Math.random() * 3); k++) S.tone(1050 + Math.random() * 250, 0.3, { type: 'triangle', vol: v(0.009), slide: 0.62, delay: k * 0.38 });
    // les grillons, la nuit, dans l'herbe (de petites salves, pas une boucle)
    if (!day && rain < 0.2 && CRICKETS.has(z) && this.due('cricket', now, 1.2, 3.6)) { const f = 4100 + Math.random() * 700; for (let k = 0; k < 3; k++) S.tone(f, 0.018, { type: 'square', vol: v(0.0035), delay: k * 0.055 }); }
    // les grenouilles du marais, surtout le soir et la nuit, même sous la pluie
    if (FROGS.has(z) && (!day || Math.random() < 0.3) && this.due('frog', now, 2.5, 7)) { const f = 150 + Math.random() * 60; S.tone(f, 0.11, { type: 'square', vol: v(0.008), slide: 0.7 }); S.tone(f * 1.1, 0.09, { type: 'square', vol: v(0.006), slide: 0.72, delay: 0.16 }); }
    // le bois qui grince : près des quais et des navires amarrés
    if ((N.plank > 3 || p.ship) && coast && this.due('creak', now, 5, 14)) S.hiss(0.45 + Math.random() * 0.3, { f: 300 + Math.random() * 160, q: 9, vol: v(0.05), slide: 0.75 });
    // le feu qui crépite, tout près d'une torche, d'un brasero, d'un feu de camp
    if (N.fire < 70 && this.due('crackle', now, 0.25, 0.9)) S.hiss(0.025, { f: 2600 + Math.random() * 2000, q: 1.5, vol: v(0.04 * (1 - N.fire / 70)), type: 'highpass' });
    // une cloche lointaine, à l'aube, sur le port
    if (ph === 'aube' && z === Z.TOWN && this.due('bell', now, 70, 160)) { S.tone(660, 1.8, { type: 'triangle', vol: v(0.012), attack: 0.01 }); S.tone(990, 1.4, { type: 'sine', vol: v(0.006), attack: 0.01 }); }
  }
}
